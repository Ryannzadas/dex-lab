import { createRemoteJWKSet, jwtVerify } from "jose";
import { mergeSync, type SyncData } from "../src/lib/sync-merge.js";
import { getRedis } from "./_redis.js";

/**
 * /api/times — times salvos na nuvem de quem entrou com a conta (login com Google pelo Firebase).
 * GET: devolve os times. PUT: junta os times enviados com os da nuvem e devolve o resultado.
 * DELETE: apaga tudo da nuvem. Só guarda os times, ligados ao id da conta.
 */

const MAX_BODY = 400_000;
const keyOf = (uid: string) => `dexlab:times:fb:${uid}`;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;

// Chaves públicas do Google que assinam os tokens do Firebase (o jose guarda e renova sozinho).
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Confere o token do Firebase (assinatura, projeto, emissor, validade) e devolve o id da conta. */
async function userIdOf(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !PROJECT_ID) return null;
  try {
    const { payload } = await jwtVerify(token, GOOGLE_KEYS, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const authTime = typeof payload.auth_time === "number" ? payload.auth_time : 0;
    if (typeof payload.sub !== "string" || !payload.sub || authTime > Date.now() / 1000 + 60) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

function readStored(raw: unknown): SyncData {
  const data = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<SyncData> | null;
  return { teams: Array.isArray(data?.teams) ? data.teams : [], deleted: data?.deleted && typeof data.deleted === "object" ? data.deleted : {} };
}

async function handle(request: Request): Promise<Response> {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Sincronização não configurada." }, 503);

  const userId = await userIdOf(request);
  if (!userId) return json({ erro: "Entre com sua conta para sincronizar." }, 401);
  const key = keyOf(userId);

  if (request.method === "GET") {
    return json(readStored(await redis.get(key)));
  }

  if (request.method === "DELETE") {
    await redis.del(key);
    return json({ ok: true });
  }

  // PUT
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ erro: "Dados grandes demais." }, 413);
  let incoming: SyncData;
  try {
    incoming = readStored(JSON.parse(raw));
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const merged = mergeSync(incoming, readStored(await redis.get(key)));
  await redis.set(key, JSON.stringify(merged));
  return json(merged);
}

export async function GET(request: Request) {
  return handle(request);
}
export async function PUT(request: Request) {
  return handle(request);
}
export async function DELETE(request: Request) {
  return handle(request);
}
