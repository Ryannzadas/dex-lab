import type { SyncData } from "../src/lib/sync-merge.js";
import { json, PROJECT_ID, tokenOf } from "./_auth.js";
import { isOffensive } from "./_filtro.js";
import { getRedis } from "./_redis.js";

/**
 * /api/vitrine — times públicos de todos os perfis (os que cada pessoa marcou no perfil público).
 * GET: lista os times com curtidas e cópias. GET ?minhas=1 (com login): ids que a pessoa curtiu.
 * POST { acao: "curtir" | "copiar" | "denunciar", handle, id, motivo? } (id = id público do time na vitrine).
 * Times com 3 denúncias de lugares diferentes saem da vitrine sozinhos.
 */

type Profile = { handle: string; name: string; photo: string | null; bio: string; teams: string[]; since: number };
export type VitrineEntry = {
  id: string;
  handle: string;
  name: string;
  photo: string | null;
  team: { name: string; game: string | null; members: SyncData["teams"][number]["members"] };
  curtidas: number;
  copias: number;
  atualizado: number;
};

const HIDE_AFTER_REPORTS = 3;
const DAY = 24 * 60 * 60;
const K = {
  profile: (uid: string) => `dexlab:perfil:uid:${uid}`,
  handle: (handle: string) => `dexlab:perfil:nome:${handle}`,
  times: (uid: string) => `dexlab:times:fb:${uid}`,
  likes: (id: string) => `dexlab:vitrine:curtidas:${id}`,
  liked: (uid: string) => `dexlab:vitrine:curti:${uid}`,
  copies: "dexlab:vitrine:copias",
  copied: (who: string, id: string) => `dexlab:vitrine:copiou:${who}:${id}`,
  reporters: (id: string) => `dexlab:vitrine:denuncias:${id}`,
  reports: "dexlab:denuncias",
};

const parse = <T>(raw: unknown): T | null => (typeof raw === "string" ? (JSON.parse(raw) as T) : ((raw as T) ?? null));

/** Id público de um time na vitrine (não revela o id da conta). */
async function entryId(uid: string, teamId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${uid}:${teamId}`));
  return Array.from(new Uint8Array(digest).slice(0, 9), (b) => b.toString(16).padStart(2, "0")).join("");
}

const ipOf = (request: Request) => (request.headers.get("x-forwarded-for") ?? "anon").split(",")[0].trim();

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Vitrine não configurada." }, 503);

  if (new URL(request.url).searchParams.has("minhas")) {
    const token = await tokenOf(request);
    if (!token) return json({ erro: "Entre com sua conta." }, 401);
    return json({ curtidas: await redis.smembers(K.liked(token.uid)) });
  }

  // Todos os perfis publicados (poucos por enquanto; dá para trocar por um índice se crescer).
  const keys: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, batch]: [string | number, string[]] = await redis.scan(cursor, { match: "dexlab:perfil:uid:*", count: 500 });
    keys.push(...batch);
    cursor = next;
  } while (String(cursor) !== "0" && keys.length < 2000);
  if (keys.length === 0) return cached({ times: [] });

  const uids = keys.map((k) => k.slice("dexlab:perfil:uid:".length));
  const [profiles, allTimes] = await Promise.all([redis.mget<unknown[]>(...keys), redis.mget<unknown[]>(...uids.map(K.times))]);

  const found: { uid: string; teamId: string; profile: Profile; team: SyncData["teams"][number] }[] = [];
  uids.forEach((uid, i) => {
    const profile = parse<Profile>(profiles[i]);
    const times = parse<SyncData>(allTimes[i]);
    if (!profile || !times || isOffensive(profile.name, profile.bio, profile.handle)) return;
    const byId = new Map(times.teams.map((t) => [t.id, t]));
    for (const teamId of profile.teams) {
      const team = byId.get(teamId);
      if (team && team.members.length > 0 && !isOffensive(team.name)) found.push({ uid, teamId, profile, team });
    }
  });
  if (found.length === 0) return cached({ times: [] });

  const ids = await Promise.all(found.map((f) => entryId(f.uid, f.teamId)));
  const counts = redis.pipeline();
  ids.forEach((id) => {
    counts.scard(K.likes(id));
    counts.scard(K.reporters(id));
  });
  const [numbers, copies] = await Promise.all([counts.exec<number[]>(), redis.hmget<Record<string, number>>(K.copies, ...ids)]);

  const entries: VitrineEntry[] = [];
  found.forEach((f, i) => {
    if ((numbers[i * 2 + 1] ?? 0) >= HIDE_AFTER_REPORTS) return;
    entries.push({
      id: ids[i],
      handle: f.profile.handle,
      name: f.profile.name,
      photo: f.profile.photo,
      team: { name: f.team.name, game: f.team.game ?? null, members: f.team.members },
      curtidas: numbers[i * 2] ?? 0,
      copias: Number(copies?.[ids[i]] ?? 0),
      atualizado: f.team.updatedAt,
    });
  });
  return cached({ times: entries });
}

function cached(body: unknown) {
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=300" } });
}

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Vitrine não configurada." }, 503);

  let body: { acao?: unknown; handle?: unknown; id?: unknown; motivo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const handle = typeof body.handle === "string" ? body.handle.toLowerCase().slice(0, 20) : "";
  const wanted = typeof body.id === "string" ? body.id.slice(0, 32) : "";

  // Confere que o time existe e ainda está público nesse perfil.
  const owner = handle ? await redis.get<string>(K.handle(handle)) : null;
  const profile = owner ? parse<Profile>(await redis.get(K.profile(owner))) : null;
  const publicIds = owner && profile ? await Promise.all(profile.teams.map((t) => entryId(owner, t))) : [];
  const at = publicIds.indexOf(wanted);
  if (!owner || at < 0) return json({ erro: "Esse time não está mais na vitrine." }, 404);
  const id = wanted;
  const teamId = profile!.teams[at];

  if (body.acao === "curtir") {
    const token = await tokenOf(request);
    if (!token) return json({ erro: "Entre com sua conta para curtir." }, 401);
    if (token.uid === owner) return json({ erro: "Esse time é seu." }, 400);
    const already = (await redis.sismember(K.likes(id), token.uid)) === 1;
    if (already) await Promise.all([redis.srem(K.likes(id), token.uid), redis.srem(K.liked(token.uid), id)]);
    else await Promise.all([redis.sadd(K.likes(id), token.uid), redis.sadd(K.liked(token.uid), id)]);
    return json({ curtido: !already, curtidas: await redis.scard(K.likes(id)) });
  }

  if (body.acao === "copiar") {
    // Conta uma cópia por pessoa (conta ou endereço) por dia.
    const who = (await tokenOf(request))?.uid ?? ipOf(request);
    if (await redis.set(K.copied(who, id), 1, { nx: true, ex: DAY })) await redis.hincrby(K.copies, id, 1);
    return json({ ok: true });
  }

  if (body.acao === "denunciar") {
    const motivo = ["ofensivo", "spam", "outro"].includes(String(body.motivo)) ? String(body.motivo) : "outro";
    const who = (await tokenOf(request))?.uid ?? ipOf(request);
    const isNew = (await redis.sadd(K.reporters(id), who)) === 1;
    if (isNew) {
      await redis.lpush(K.reports, JSON.stringify({ id, handle, time: teamId, motivo, em: new Date().toISOString() }));
      await redis.ltrim(K.reports, 0, 499);
    }
    return json({ ok: true });
  }

  return json({ erro: "Ação desconhecida." }, 400);
}
