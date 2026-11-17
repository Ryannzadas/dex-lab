import type { AiBuildRequest, AiBuildResponse } from "../src/lib/ai-build-types.js";
import { AI_OUTPUT_JSON_SCHEMA, AiOutputSchema, RequestSchema, SYSTEM_PROMPT, sanitize, userMessage } from "./_build-ai.js";
import { getRedis } from "./_redis.js";

/**
 * POST /api/ajustar-build — a IA explica ou ajusta a build de um Pokémon.
 * Usa o plano gratuito do Groq (modelo aberto gpt-oss-120b). A chave fica só na Vercel (GROQ_API_KEY).
 * Como o site é público, há limite de perguntas por pessoa e por dia, além do limite da própria conta do Groq.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.IA_MODELO ?? "openai/gpt-oss-120b";
const PER_PERSON = Number(process.env.IA_LIMITE_POR_PESSOA ?? 10);
const PER_DAY = Number(process.env.IA_LIMITE_DIARIO ?? 500);

// Contadores: no Redis (exatos, entre todas as instâncias) ou, sem ele, em memória (aproximados).
const perPerson = new Map<string, { day: string; n: number }>();
let perDay = { day: "", n: 0 };

type Quota = { ok: true; used: number; refund: () => Promise<void> } | { ok: false; erro: string };

async function takeQuota(ip: string): Promise<Quota> {
  const day = today();
  const redis = getRedis();
  if (redis) {
    const personKey = `dexlab:ia:${day}:${ip}`;
    const totalKey = `dexlab:ia:${day}:total`;
    const [n, total] = await Promise.all([redis.incr(personKey), redis.incr(totalKey)]);
    if (n === 1) await redis.expire(personKey, 2 * 86400);
    if (total === 1) await redis.expire(totalKey, 2 * 86400);
    const refund = async () => {
      await Promise.all([redis.decr(personKey), redis.decr(totalKey)]);
    };
    if (total > PER_DAY) {
      await refund();
      return { ok: false, erro: "O assistente atingiu o limite de hoje. Tente de novo amanhã." };
    }
    if (n > PER_PERSON) {
      await refund();
      return { ok: false, erro: `Você já fez ${PER_PERSON} perguntas hoje. Volte amanhã.` };
    }
    return { ok: true, used: n - 1, refund };
  }

  if (perDay.day !== day) perDay = { day, n: 0 };
  if (perDay.n >= PER_DAY) return { ok: false, erro: "O assistente atingiu o limite de hoje. Tente de novo amanhã." };
  const mine = perPerson.get(ip);
  const used = mine && mine.day === day ? mine.n : 0;
  if (used >= PER_PERSON) return { ok: false, erro: `Você já fez ${PER_PERSON} perguntas hoje. Volte amanhã.` };
  perPerson.set(ip, { day, n: used + 1 });
  perDay.n += 1;
  if (perPerson.size > 5000) perPerson.clear();
  return {
    ok: true,
    used,
    refund: async () => {
      perPerson.set(ip, { day, n: used });
      perDay.n -= 1;
    },
  };
}

function reply(body: AiBuildResponse, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

const today = () => new Date().toISOString().slice(0, 10);

type GroqResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string };
};

export async function POST(request: Request): Promise<Response> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return reply({ ok: false, erro: "O assistente ainda não foi configurado neste site." }, 503);

  // Só aceita chamadas do próprio site.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return reply({ ok: false, erro: "Origem não permitida." }, 403);
  }

  const raw = await request.text();
  if (raw.length > 40_000) return reply({ ok: false, erro: "Pedido grande demais." }, 413);
  let req: AiBuildRequest;
  try {
    req = RequestSchema.parse(JSON.parse(raw)) as AiBuildRequest;
  } catch {
    return reply({ ok: false, erro: "Pedido inválido." }, 400);
  }

  // Limites de uso.
  const ip = (request.headers.get("x-forwarded-for") ?? "anon").split(",")[0].trim();
  const quota = await takeQuota(ip).catch((): Quota => ({ ok: false, erro: "O assistente está indisponível no momento." }));
  if (!quota.ok) return reply({ ok: false, erro: quota.erro }, 429);
  const { used } = quota;
  const refund = () => {
    quota.refund().catch(() => {});
  };

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage(req) },
        ],
        // Saída estruturada estrita: a resposta sempre segue o formato da build.
        response_format: { type: "json_schema", json_schema: { name: "build", strict: true, schema: AI_OUTPUT_JSON_SCHEMA } },
        reasoning_effort: "medium",
        include_reasoning: false,
        max_completion_tokens: 6000,
      }),
    });

    if (!res.ok) {
      refund();
      const detail = (await res.json().catch(() => null)) as GroqResponse | null;
      console.error("Groq", res.status, detail?.error?.message);
      if (res.status === 429) return reply({ ok: false, erro: "Muita gente usando agora. Tente em alguns segundos." }, 429);
      if (res.status === 401 || res.status === 403) return reply({ ok: false, erro: "O assistente está indisponível no momento." }, 503);
      return reply({ ok: false, erro: "O assistente está indisponível no momento." }, 502);
    }

    const data = (await res.json()) as GroqResponse;
    const content = data.choices?.[0]?.message?.content;
    let out;
    try {
      out = AiOutputSchema.parse(JSON.parse(content ?? ""));
    } catch {
      refund();
      console.error("Resposta fora do formato", data.choices?.[0]?.finish_reason);
      return reply({ ok: false, erro: "A resposta veio incompleta. Tente de novo." }, 502);
    }

    const { patch, avisos } = sanitize(req, out);
    return reply({ ok: true, resposta: out.resposta, alterou: out.alterou_build, patch, avisos, restantes: PER_PERSON - used - 1 });
  } catch (error) {
    refund();
    console.error(error);
    const timeout = error instanceof DOMException && error.name === "TimeoutError";
    return reply({ ok: false, erro: timeout ? "A IA demorou demais para responder. Tente de novo." : "Algo deu errado. Tente de novo." }, 504);
  }
}
