import { json, PROJECT_ID, tokenOf } from "./_auth.js";
import { getRedis } from "./_redis.js";

/**
 * /api/seguir — seguir treinadores (pelo perfil público).
 * GET (login): nomes (@) de quem eu sigo. POST { handle } (login): segue ou deixa de seguir.
 * DELETE (login): apaga tudo de "seguir" desta conta (usado ao excluir a conta).
 */

const K = {
  following: (uid: string) => `dexlab:segue:${uid}`,
  followers: (uid: string) => `dexlab:seguidores:${uid}`,
  handle: (handle: string) => `dexlab:perfil:nome:${handle}`,
  profile: (uid: string) => `dexlab:perfil:uid:${uid}`,
};
const MAX_FOLLOWING = 500;

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Indisponível." }, 503);
  const token = await tokenOf(request);
  if (!token) return json({ erro: "Entre com sua conta." }, 401);
  const uids = await redis.smembers(K.following(token.uid));
  if (!uids.length) return json({ handles: [] });
  const profiles = await redis.mget<unknown[]>(...uids.map(K.profile));
  const handles = profiles
    .map((raw) => (typeof raw === "string" ? JSON.parse(raw) : raw) as { handle?: string } | null)
    .flatMap((p) => (p?.handle ? [p.handle] : []));
  return json({ handles });
}

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Indisponível." }, 503);
  const token = await tokenOf(request);
  if (!token) return json({ erro: "Entre com sua conta para seguir." }, 401);
  let handle = "";
  try {
    const body = (await request.json()) as { handle?: unknown };
    handle = typeof body.handle === "string" ? body.handle.toLowerCase().slice(0, 20) : "";
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const target = handle ? await redis.get<string>(K.handle(handle)) : null;
  if (!target) return json({ erro: "Perfil não encontrado." }, 404);
  if (target === token.uid) return json({ erro: "Esse perfil é seu." }, 400);

  const already = (await redis.sismember(K.following(token.uid), target)) === 1;
  if (already) {
    await Promise.all([redis.srem(K.following(token.uid), target), redis.srem(K.followers(target), token.uid)]);
  } else {
    if ((await redis.scard(K.following(token.uid))) >= MAX_FOLLOWING) return json({ erro: "Você já segue gente demais." }, 400);
    await Promise.all([redis.sadd(K.following(token.uid), target), redis.sadd(K.followers(target), token.uid)]);
  }
  return json({ seguindo: !already, seguidores: await redis.scard(K.followers(target)) });
}

export async function DELETE(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Indisponível." }, 503);
  const token = await tokenOf(request);
  if (!token) return json({ erro: "Entre com sua conta." }, 401);
  const [following, followers] = await Promise.all([redis.smembers(K.following(token.uid)), redis.smembers(K.followers(token.uid))]);
  await Promise.all([
    ...following.map((uid) => redis.srem(K.followers(uid), token.uid)),
    ...followers.map((uid) => redis.srem(K.following(uid), token.uid)),
    redis.del(K.following(token.uid), K.followers(token.uid)),
  ]);
  return json({ ok: true });
}
