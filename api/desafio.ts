import { challengeForIndex, challengeOfWeek, checkTeam, type CheckMon } from "../src/lib/desafios.js";
import type { SyncData } from "../src/lib/sync-merge.js";
import { json, PROJECT_ID, tokenOf } from "./_auth.js";
import { isOffensive } from "./_filtro.js";
import { isBlocked, isHidden, loadModeration, type Moderation } from "./_moderacao.js";
import { getRedis } from "./_redis.js";

/**
 * /api/desafio — desafio da semana.
 * GET: o desafio e os times inscritos (com curtidas). GET ?minhas=1 (login): o que eu curti e minha inscrição.
 * POST { acao: "participar", time } (login, e-mail confirmado, perfil público): confere a regra e guarda uma cópia do time.
 * POST { acao: "sair" }, { acao: "curtir", id }, { acao: "denunciar", id, motivo }.
 * Quando a semana fecha, o time com mais curtidas (pelo menos 1) vira campeão: ganha um selo
 * no perfil e entra no histórico. Isso é calculado na primeira visita depois do fechamento.
 */

type Profile = { handle: string; name: string; photo: string | null };
type Team = Omit<SyncData["teams"][number], "members"> & { members: { id: number; nickname?: string; shiny?: boolean }[] };
type Stored = { handle: string; name: string; photo: string | null; team: { name: string; game: string | null; members: Team["members"] }; em: number };

const KEEP = 60 * 24 * 60 * 60; // as chaves de cada semana somem depois de 60 dias
const K = {
  entries: (week: string) => `dexlab:desafio:${week}:entradas`,
  likes: (week: string, id: string) => `dexlab:desafio:${week}:curtidas:${id}`,
  liked: (week: string, uid: string) => `dexlab:desafio:${week}:curti:${uid}`,
  reporters: (week: string, id: string) => `dexlab:desafio:${week}:denuncias:${id}`,
  reports: "dexlab:denuncias",
  profile: (uid: string) => `dexlab:perfil:uid:${uid}`,
  champion: (week: string) => `dexlab:desafio:${week}:campeao`,
  champions: "dexlab:campeoes",
  titles: (uid: string) => `dexlab:titulos:${uid}`,
  times: (uid: string) => `dexlab:times:fb:${uid}`,
};

const parse = <T>(raw: unknown): T | null => (typeof raw === "string" ? (JSON.parse(raw) as T) : ((raw as T) ?? null));

async function entryId(week: string, uid: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${week}:${uid}`));
  return Array.from(new Uint8Array(digest).slice(0, 9), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Dados dos Pokémon para conferir a regra (guardados enquanto a função estiver viva).
const monCache = new Map<number, Promise<Omit<CheckMon, "name"> & { name: string }>>();
function monData(id: number) {
  let hit = monCache.get(id);
  if (!hit) {
    hit = fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`pokeapi ${r.status}`);
        return r.json() as Promise<{ name: string; species: { url: string }; types: { type: { name: string } }[]; stats: { base_stat: number }[] }>;
      })
      .then((p) => ({
        name: p.name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        speciesId: Number(p.species.url.replace(/\/$/, "").split("/").pop()),
        types: p.types.map((t) => t.type.name),
        bst: p.stats.reduce((n, s) => n + s.base_stat, 0),
      }));
    hit.catch(() => monCache.delete(id));
    monCache.set(id, hit);
  }
  return hit;
}

type Redis = NonNullable<ReturnType<typeof getRedis>>;
type Ranked = Stored & { id: string; uid: string; curtidas: number };
export type Champion = { semana: string; titulo: string; termina: number; handle: string; name: string; photo: string | null; team: Stored["team"]; curtidas: number };

/** Inscrições de uma semana, sem as escondidas, da mais curtida para a menos. */
async function ranked(redis: Redis, week: string, mod: Moderation): Promise<Ranked[]> {
  const all = (await redis.hgetall<Record<string, unknown>>(K.entries(week))) ?? {};
  const uids = Object.keys(all).filter((uid) => !mod.blocked.has(uid));
  const ids = await Promise.all(uids.map((uid) => entryId(week, uid)));
  const counts = redis.pipeline();
  ids.forEach((id) => {
    counts.scard(K.likes(week, id));
    counts.scard(K.reporters(week, id));
  });
  const numbers = ids.length ? await counts.exec<number[]>() : [];
  return uids
    .map((uid, i) => ({ uid, id: ids[i], stored: parse<Stored>(all[uid]), curtidas: numbers[i * 2] ?? 0, denuncias: numbers[i * 2 + 1] ?? 0 }))
    .filter((e) => e.stored && !isHidden(mod, e.id, e.denuncias) && !isOffensive(e.stored.team.name, e.stored.name, e.stored.handle))
    .map((e) => ({ ...e.stored!, id: e.id, uid: e.uid, curtidas: e.curtidas }))
    .sort((a, b) => b.curtidas - a.curtidas || a.em - b.em);
}

/** Fecha as últimas semanas que ainda não têm campeão (só uma função faz isso de cada vez). */
async function settleChampions(redis: Redis, currentIndex: number, mod: Moderation) {
  for (let index = currentIndex - 4; index < currentIndex; index++) {
    const past = challengeForIndex(index);
    if (index < 0 || (await redis.exists(K.champion(past.week)))) continue;
    if (!(await redis.set(`${K.champion(past.week)}:trava`, 1, { nx: true, ex: 60 }))) continue;
    const top = (await ranked(redis, past.week, mod))[0];
    if (!top || top.curtidas < 1) {
      await redis.set(K.champion(past.week), JSON.stringify({ vazio: true }));
      continue;
    }
    const champion: Champion & { uid: string } = {
      semana: past.week,
      titulo: past.challenge.title,
      termina: past.endsAt,
      uid: top.uid,
      handle: top.handle,
      name: top.name,
      photo: top.photo,
      team: top.team,
      curtidas: top.curtidas,
    };
    await redis.set(K.champion(past.week), JSON.stringify(champion));
    await redis.lpush(K.champions, JSON.stringify(champion));
    await redis.ltrim(K.champions, 0, 199);
    await redis.sadd(K.titles(top.uid), JSON.stringify({ titulo: past.challenge.title, semana: past.week, termina: past.endsAt }));
  }
}

/** Últimos campeões, sem quem saiu do app ou foi bloqueado. */
async function champions(redis: Redis, mod: Moderation): Promise<Champion[]> {
  const list = (await redis.lrange(K.champions, 0, 19))
    .map((raw) => parse<Champion & { uid: string }>(raw))
    .filter((c): c is Champion & { uid: string } => !!c && !mod.blocked.has(c.uid));
  if (!list.length) return [];
  const profiles = await redis.mget<unknown[]>(...list.map((c) => K.profile(c.uid)));
  return list.filter((_, i) => profiles[i]).map(({ uid: _uid, ...c }) => c as Champion);
}

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Desafio indisponível." }, 503);
  const { challenge, week, endsAt, index } = challengeOfWeek();
  const desafio = { id: challenge.id, titulo: challenge.title, descricao: challenge.description, semana: week, termina: endsAt };

  if (new URL(request.url).searchParams.has("minhas")) {
    const token = await tokenOf(request);
    if (!token) return json({ erro: "Entre com sua conta." }, 401);
    const [curtidas, minha] = await Promise.all([redis.smembers(K.liked(week, token.uid)), redis.hexists(K.entries(week), token.uid)]);
    return json({ curtidas, minha: minha ? await entryId(week, token.uid) : null });
  }

  const mod = await loadModeration(redis);
  await settleChampions(redis, index, mod).catch(() => {});
  const [list, campeoes] = await Promise.all([ranked(redis, week, mod), champions(redis, mod)]);
  const entradas = list.map(({ uid: _uid, ...e }) => e);
  return Response.json({ desafio, entradas, campeoes }, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=120" } });
}

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Desafio indisponível." }, 503);
  const { challenge, week } = challengeOfWeek();
  let body: { acao?: unknown; time?: unknown; id?: unknown; motivo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const token = await tokenOf(request);

  if (body.acao === "participar") {
    if (!token) return json({ erro: "Entre com sua conta para participar." }, 401);
    if (!token.emailVerified) return json({ erro: "Confirme seu e-mail para participar." }, 403);
    if (await isBlocked(redis, token.uid)) return json({ erro: "Sua conta não pode participar." }, 403);
    const profile = parse<Profile>(await redis.get(K.profile(token.uid)));
    if (!profile) return json({ erro: "Crie seu perfil público primeiro (Perfil e conta → Perfil público)." }, 403);
    const times = parse<SyncData>(await redis.get(K.times(token.uid)));
    const team = times?.teams.find((t) => t.id === body.time) as unknown as Team | undefined;
    if (!team) return json({ erro: "Esse time ainda não chegou na nuvem. Espere a sincronização e tente de novo." }, 404);
    if (isOffensive(team.name)) return json({ erro: "Tire os palavrões do nome do time." }, 400);

    if (!team.members.every((m) => Number.isInteger(m?.id) && m.id > 0)) return json({ erro: "Time inválido." }, 400);
    let mons: CheckMon[];
    try {
      mons = await Promise.all(team.members.map((m) => monData(m.id)));
    } catch {
      return json({ erro: "Não deu para conferir os Pokémon agora. Tente de novo daqui a pouco." }, 503);
    }
    const problems = checkTeam(challenge, mons);
    if (problems.length) return json({ erro: `Esse time não cumpre o desafio. ${problems.join(" ")}`, problemas: problems }, 400);

    const stored: Stored = {
      handle: profile.handle,
      name: profile.name,
      photo: profile.photo,
      team: { name: team.name, game: team.game ?? null, members: team.members },
      em: Date.now(),
    };
    await redis.hset(K.entries(week), { [token.uid]: JSON.stringify(stored) });
    await redis.expire(K.entries(week), KEEP);
    return json({ ok: true, id: await entryId(week, token.uid) });
  }

  if (body.acao === "sair") {
    if (!token) return json({ erro: "Entre com sua conta." }, 401);
    await redis.hdel(K.entries(week), token.uid);
    return json({ ok: true });
  }

  // Curtir e denunciar: acha a inscrição pelo id público.
  const wanted = typeof body.id === "string" ? body.id.slice(0, 32) : "";
  const uids = await redis.hkeys(K.entries(week));
  const ids = await Promise.all(uids.map((uid) => entryId(week, uid)));
  const owner = uids[ids.indexOf(wanted)];
  if (!owner) return json({ erro: "Esse time não está mais no desafio." }, 404);

  if (body.acao === "curtir") {
    if (!token) return json({ erro: "Entre com sua conta para curtir." }, 401);
    if (token.uid === owner) return json({ erro: "Esse time é seu." }, 400);
    const already = (await redis.sismember(K.likes(week, wanted), token.uid)) === 1;
    if (already) await Promise.all([redis.srem(K.likes(week, wanted), token.uid), redis.srem(K.liked(week, token.uid), wanted)]);
    else {
      await Promise.all([redis.sadd(K.likes(week, wanted), token.uid), redis.sadd(K.liked(week, token.uid), wanted)]);
      await Promise.all([redis.expire(K.likes(week, wanted), KEEP), redis.expire(K.liked(week, token.uid), KEEP)]);
    }
    return json({ curtido: !already, curtidas: await redis.scard(K.likes(week, wanted)) });
  }

  if (body.acao === "denunciar") {
    const motivo = ["ofensivo", "spam", "outro"].includes(String(body.motivo)) ? String(body.motivo) : "outro";
    const who = token?.uid ?? (request.headers.get("x-forwarded-for") ?? "anon").split(",")[0].trim();
    if ((await redis.sadd(K.reporters(week, wanted), who)) === 1) {
      await redis.expire(K.reporters(week, wanted), KEEP);
      await redis.lpush(K.reports, JSON.stringify({ desafio: week, id: wanted, motivo, em: new Date().toISOString() }));
      await redis.ltrim(K.reports, 0, 499);
    }
    return json({ ok: true });
  }

  return json({ erro: "Ação desconhecida." }, 400);
}
