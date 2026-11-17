import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { AiBuildRequest, AiBuildResponse } from "../src/lib/ai-build-types.js";
import { AiOutputSchema, RequestSchema, SYSTEM_PROMPT, sanitize, userMessage } from "./_build-ai.js";

/**
 * POST /api/ajustar-build — o Claude explica ou ajusta a build de um Pokémon.
 * A chave fica só na Vercel (ANTHROPIC_API_KEY). Como o site é público, há limite
 * de perguntas por pessoa e por dia; o teto de gasto definitivo é o limite mensal
 * configurado no console da Anthropic.
 */

const MODEL = "claude-opus-5-5";
const PER_PERSON = Number(process.env.IA_LIMITE_POR_PESSOA ?? 10);
const PER_DAY = Number(process.env.IA_LIMITE_DIARIO ?? 200);

// Contadores em memória: valem enquanto a instância da função estiver viva (proteção contra abuso, não contabilidade exata).
const perPerson = new Map<string, { day: string; n: number }>();
let perDay = { day: "", n: 0 };

const client = new Anthropic();

function reply(body: AiBuildResponse, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

const today = () => new Date().toISOString().slice(0, 10);

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return reply({ ok: false, erro: "O assistente ainda não foi configurado neste site." }, 503);
  }

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
  const day = today();
  if (perDay.day !== day) perDay = { day, n: 0 };
  if (perDay.n >= PER_DAY) {
    return reply({ ok: false, erro: "O assistente atingiu o limite de hoje. Tente de novo amanhã." }, 429);
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "anon").split(",")[0].trim();
  const mine = perPerson.get(ip);
  const used = mine && mine.day === day ? mine.n : 0;
  if (used >= PER_PERSON) {
    return reply({ ok: false, erro: `Você já fez ${PER_PERSON} perguntas hoje. Volte amanhã.` }, 429);
  }
  perPerson.set(ip, { day, n: used + 1 });
  perDay.n += 1;
  if (perPerson.size > 5000) perPerson.clear();

  try {
    const message = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // Se o modelo recusar por engano (classificador de segurança), a API tenta outro modelo.
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: { effort: "medium", format: betaZodOutputFormat(AiOutputSchema) },
      messages: [{ role: "user", content: userMessage(req) }],
    });

    if (message.stop_reason === "refusal") {
      return reply({ ok: false, erro: "O assistente não conseguiu responder esse pedido. Tente escrever de outro jeito." }, 422);
    }
    const out = message.parsed_output;
    if (!out) return reply({ ok: false, erro: "A resposta veio incompleta. Tente de novo." }, 502);

    const { patch, avisos } = sanitize(req, out);
    return reply({ ok: true, resposta: out.resposta, alterou: out.alterou_build, patch, avisos, restantes: PER_PERSON - used - 1 });
  } catch (error) {
    // Pergunta que falhou não conta no limite da pessoa.
    perPerson.set(ip, { day, n: used });
    perDay.n -= 1;
    if (error instanceof Anthropic.RateLimitError) {
      return reply({ ok: false, erro: "Muita gente usando agora. Tente em alguns segundos." }, 429);
    }
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error("Chave da Anthropic inválida ou sem permissão", error.status);
      return reply({ ok: false, erro: "O assistente está indisponível no momento." }, 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Erro da API da Anthropic", error.status, error.message);
      return reply({ ok: false, erro: "O assistente está indisponível no momento." }, 502);
    }
    console.error(error);
    return reply({ ok: false, erro: "Algo deu errado. Tente de novo." }, 500);
  }
}
