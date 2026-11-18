import type { SyncData } from "../src/lib/sync-merge.js";
import { adminEmails, isAdmin, json, PROJECT_ID, tokenOf } from "./_auth.js";
import { HIDE_AFTER_REPORTS, loadModeration, MOD } from "./_moderacao.js";
import { getRedis } from "./_redis.js";

/**
 * /api/admin — painel de moderação (só para os e-mails em ADMIN_EMAIL, confirmados).
 * GET ?eu=1 (login): só diz se esta conta é de moderação (para mostrar o atalho no menu).
 * GET: denúncias agrupadas por time, com o time, os motivos e a situação; contas bloqueadas.
 * POST { acao, chave?, id?, handle?, uid? }:
 *   "liberar" (volta para a vitrine e não some mais com denúncias), "ocultar" (esconde de vez),
 *   "ignorar" (tira da lista), "bloquear" (tira o perfil público e impede de voltar), "desbloquear".
 */

type Report = { id: string; handle?: string; time?: string; desafio?: string; motivo: string; em: string };
type Member = { id: number };
type Redis = NonNullable<ReturnType<typeof getRedis>>;

const parse = <T>(raw: unknown): T | null => (typeof raw === "string" ? (JSON.parse(raw) as T) : ((raw as T) ?? null));

async function hashId(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 9), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function guard(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return { error: json({ erro: "Indisponível." }, 503) };
  const token = await tokenOf(request);
  if (!token) return { error: json({ erro: "Entre com sua conta." }, 401) };
  if (!isAdmin(token)) return { error: json({ erro: "Só o dono do app pode ver esta página." }, 403) };
  return { redis };
}

/** Acha o dono e o time denunciado. */
async function detailsOf(redis: Redis, r: Report) {
  if (r.desafio) {
    const all = (await redis.hgetall<Record<string, unknown>>(`dexlab:desafio:${r.desafio}:entradas`)) ?? {};
    for (const [uid, raw] of Object.entries(all)) {
      if ((await hashId(`${r.desafio}:${uid}`)) !== r.id) continue;
      const e = parse<{ handle: string; name: string; team: { name: string; members: Member[] } }>(raw);
      return e ? { uid, handle: e.handle, name: e.name, team: e.team.name, members: e.team.members.map((m) => m.id) } : null;
    }
    return null;
  }
  const uid = r.handle ? await redis.get<string>(`dexlab:perfil:nome:${r.handle}`) : null;
  if (!uid) return null;
  const [rawProfile, rawTimes] = await redis.mget<unknown[]>(`dexlab:perfil:uid:${uid}`, `dexlab:times:fb:${uid}`);
  const profile = parse<{ handle: string; name: string; bio: string }>(rawProfile);
  const team = parse<SyncData>(rawTimes)?.teams.find((t) => t.id === r.time);
  return {
    uid,
    handle: profile?.handle ?? r.handle ?? "",
    name: profile?.name ?? "",
    bio: profile?.bio ?? "",
    team: team?.name ?? "(time apagado)",
    members: ((team?.members ?? []) as Member[]).map((m) => m.id),
  };
}

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.has("eu")) {
    const token = await tokenOf(request);
    if (!token) return json({ erro: "Entre com sua conta." }, 401);
    // Diagnóstico só da própria conta: o e-mail dela, se está confirmado e se a variável chegou ao servidor.
    return json({ admin: isAdmin(token), email: token.email, verificado: token.emailVerified, configurado: adminEmails().length > 0 });
  }
  const g = await guard(request);
  if (g.error) return g.error;
  const redis = g.redis;

  const [rawReports, mod, resolved] = await Promise.all([
    redis.lrange(K_REPORTS, 0, 299),
    loadModeration(redis),
    redis.hgetall<Record<string, number>>(MOD.resolved),
  ]);
  const groups = new Map<string, { chave: string; report: Report; motivos: Record<string, number>; total: number; ultima: string }>();
  for (const raw of rawReports) {
    const r = parse<Report>(raw);
    if (!r?.id) continue;
    const chave = `${r.desafio ? `desafio:${r.desafio}` : "vitrine"}:${r.id}`;
    const g2 = groups.get(chave) ?? { chave, report: r, motivos: {}, total: 0, ultima: r.em };
    g2.motivos[r.motivo] = (g2.motivos[r.motivo] ?? 0) + 1;
    g2.total += 1;
    if (r.em > g2.ultima) g2.ultima = r.em;
    groups.set(chave, g2);
  }

  // Some da lista o que já foi resolvido, a não ser que tenham chegado denúncias novas depois.
  const open = [...groups.values()].filter((g2) => g2.total > Number(resolved?.[g2.chave] ?? 0));
  const items = await Promise.all(
    open.map(async (g2) => {
      const reporters = await redis.scard(
        g2.report.desafio ? `dexlab:desafio:${g2.report.desafio}:denuncias:${g2.report.id}` : `dexlab:vitrine:denuncias:${g2.report.id}`,
      );
      const hidden = mod.hidden.has(g2.report.id) || (!mod.cleared.has(g2.report.id) && reporters >= HIDE_AFTER_REPORTS);
      return {
        chave: g2.chave,
        id: g2.report.id,
        onde: g2.report.desafio ? "desafio" : "vitrine",
        motivos: g2.motivos,
        total: g2.total,
        ultima: g2.ultima,
        escondido: hidden,
        detalhes: await detailsOf(redis, g2.report).catch(() => null),
      };
    }),
  );
  items.sort((a, b) => b.ultima.localeCompare(a.ultima));

  const blockedUids = [...mod.blocked];
  const blockedProfiles = blockedUids.length ? await redis.mget<unknown[]>(...blockedUids.map((u) => `dexlab:mod:bloqueado:${u}`)) : [];
  const bloqueados = blockedUids.map((uid, i) => ({ uid, ...(parse<{ handle: string; name: string; em: string }>(blockedProfiles[i]) ?? { handle: "", name: "", em: "" }) }));

  return json({ denuncias: items, bloqueados });
}

const K_REPORTS = "dexlab:denuncias";

export async function POST(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  const redis = g.redis;
  let body: { acao?: string; chave?: string; id?: string; handle?: string; uid?: string; total?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const resolve = () => (body.chave ? redis.hset(MOD.resolved, { [body.chave]: Number(body.total) || 1 }) : Promise.resolve(0));

  switch (body.acao) {
    case "liberar":
      if (!body.id) break;
      await Promise.all([redis.sadd(MOD.cleared, body.id), redis.srem(MOD.hidden, body.id), resolve()]);
      return json({ ok: true });
    case "ocultar":
      if (!body.id) break;
      await Promise.all([redis.sadd(MOD.hidden, body.id), redis.srem(MOD.cleared, body.id), resolve()]);
      return json({ ok: true });
    case "ignorar":
      await resolve();
      return json({ ok: true });
    case "bloquear": {
      const uid = body.uid ?? (body.handle ? await redis.get<string>(`dexlab:perfil:nome:${body.handle.toLowerCase()}`) : null);
      if (!uid) return json({ erro: "Conta não encontrada." }, 404);
      const profile = parse<{ handle: string; name: string }>(await redis.get(`dexlab:perfil:uid:${uid}`));
      await redis.sadd(MOD.blocked, uid);
      await redis.set(`dexlab:mod:bloqueado:${uid}`, JSON.stringify({ handle: profile?.handle ?? body.handle ?? "", name: profile?.name ?? "", em: new Date().toISOString() }));
      // Tira o perfil público do ar (o nome fica livre) e a inscrição no desafio desta semana.
      if (profile?.handle) await redis.del(`dexlab:perfil:nome:${profile.handle}`);
      await redis.del(`dexlab:perfil:uid:${uid}`);
      const keys: string[] = [];
      let cursor: string | number = 0;
      do {
        const [next, batch]: [string | number, string[]] = await redis.scan(cursor, { match: "dexlab:desafio:*:entradas", count: 200 });
        keys.push(...batch);
        cursor = next;
      } while (String(cursor) !== "0");
      await Promise.all(keys.map((k) => redis.hdel(k, uid)));
      await resolve();
      return json({ ok: true });
    }
    case "desbloquear":
      if (!body.uid) break;
      await Promise.all([redis.srem(MOD.blocked, body.uid), redis.del(`dexlab:mod:bloqueado:${body.uid}`)]);
      return json({ ok: true });
  }
  return json({ erro: "Ação inválida." }, 400);
}
