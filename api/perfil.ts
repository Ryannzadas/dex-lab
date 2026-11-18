import type { SyncData } from "../src/lib/sync-merge.js";
import { json, PROJECT_ID, tokenOf } from "./_auth.js";
import { getRedis } from "./_redis.js";

/**
 * /api/perfil — perfil público (dex-lab.vercel.app/u/<nome>).
 * GET ?h=<nome>: perfil público com os times marcados (lidos na hora dos times sincronizados).
 * GET (com login): as configurações do próprio perfil. PUT: cria/atualiza (exige e-mail confirmado).
 * DELETE: tira o perfil do ar e libera o nome.
 */

export type PublicTeam = { name: string; game: string | null; members: SyncData["teams"][number]["members"] };
export type PublicProfile = { handle: string; name: string; photo: string | null; bio: string; since: number; teams: PublicTeam[] };
type Stored = { handle: string; name: string; photo: string | null; bio: string; teams: string[]; since: number };

export const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{2,19}$/;
const RESERVED = new Set(["admin", "api", "dexlab", "dex-lab", "hydra", "hydralabs", "hydra-labs", "suporte", "perfil", "u", "www"]);
const ownKey = (uid: string) => `dexlab:perfil:uid:${uid}`;
const handleKey = (handle: string) => `dexlab:perfil:nome:${handle}`;
const timesKey = (uid: string) => `dexlab:times:fb:${uid}`;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const parse = <T>(raw: unknown): T | null => (typeof raw === "string" ? (JSON.parse(raw) as T) : ((raw as T) ?? null));

export async function GET(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Perfis não configurados." }, 503);
  const handle = new URL(request.url).searchParams.get("h")?.toLowerCase();

  if (handle !== undefined) {
    if (!HANDLE_RE.test(handle)) return json({ erro: "Perfil não encontrado." }, 404);
    const uid = await redis.get<string>(handleKey(handle));
    const stored = uid ? parse<Stored>(await redis.get(ownKey(uid))) : null;
    if (!uid || !stored) return json({ erro: "Perfil não encontrado." }, 404);
    const times = parse<SyncData>(await redis.get(timesKey(uid)));
    const byId = new Map((times?.teams ?? []).map((t) => [t.id, t]));
    const teams: PublicTeam[] = stored.teams
      .map((id) => byId.get(id))
      .filter((t) => !!t && t.members.length > 0)
      .map((t) => ({ name: t!.name, game: t!.game ?? null, members: t!.members }));
    const body: PublicProfile = { handle: stored.handle, name: stored.name, photo: stored.photo, bio: stored.bio, since: stored.since, teams };
    return Response.json(body, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=300" } });
  }

  const token = await tokenOf(request);
  if (!token) return json({ erro: "Entre com sua conta." }, 401);
  return json(parse<Stored>(await redis.get(ownKey(token.uid))));
}

export async function PUT(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Perfis não configurados." }, 503);
  const token = await tokenOf(request);
  if (!token) return json({ erro: "Entre com sua conta." }, 401);
  if (!token.emailVerified) return json({ erro: "Confirme seu e-mail antes de publicar o perfil." }, 403);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 5000) return json({ erro: "Dados grandes demais." }, 413);
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }

  const handle = text(body.handle, 20).toLowerCase();
  if (!HANDLE_RE.test(handle)) return json({ erro: "O nome do link precisa ter de 3 a 20 letras, números, - ou _." }, 400);
  if (RESERVED.has(handle)) return json({ erro: "Esse nome é reservado. Escolha outro." }, 409);
  const photo = typeof body.photo === "string" && /^https:\/\//.test(body.photo) ? body.photo.slice(0, 500) : null;
  const teams = Array.isArray(body.teams) ? body.teams.filter((t): t is string => typeof t === "string").slice(0, 30) : [];

  const previous = parse<Stored>(await redis.get(ownKey(token.uid)));
  if (previous?.handle !== handle) {
    // Reserva o nome novo só se ninguém tiver pegado (ou se já for desta conta).
    const claimed = await redis.set(handleKey(handle), token.uid, { nx: true });
    if (!claimed && (await redis.get<string>(handleKey(handle))) !== token.uid) {
      return json({ erro: "Esse nome já está em uso. Escolha outro." }, 409);
    }
    if (previous?.handle) await redis.del(handleKey(previous.handle));
  }

  const stored: Stored = {
    handle,
    name: text(body.name, 40) || "Treinador",
    photo,
    bio: text(body.bio, 160),
    teams,
    since: previous?.since ?? Date.now(),
  };
  await redis.set(ownKey(token.uid), JSON.stringify(stored));
  return json(stored);
}

export async function DELETE(request: Request) {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Perfis não configurados." }, 503);
  const token = await tokenOf(request);
  if (!token) return json({ erro: "Entre com sua conta." }, 401);
  const previous = parse<Stored>(await redis.get(ownKey(token.uid)));
  if (previous?.handle) await redis.del(handleKey(previous.handle));
  await redis.del(ownKey(token.uid));
  return json({ ok: true });
}
