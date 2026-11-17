import { verifyToken } from "@clerk/backend";
import { mergeSync, type SyncData } from "../src/lib/sync-merge.js";
import { getRedis } from "./_redis.js";

/**
 * /api/times — times salvos na nuvem de quem entrou com a conta.
 * GET: devolve os times. PUT: junta os times enviados com os da nuvem e devolve o resultado.
 * DELETE: apaga tudo da nuvem. Só guarda os times, ligados ao id da conta.
 */

const MAX_BODY = 400_000;
const keyOf = (userId: string) => `dexlab:times:${userId}`;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Confere o token do Clerk e devolve o id da conta (ou null). */
async function userIdOf(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!token || !secretKey) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const claims = await verifyToken(token, {
      secretKey,
      // O token só vale se foi emitido para este site.
      authorizedParties: host ? [`https://${host}`, `http://${host}`] : undefined,
    });
    return typeof claims.sub === "string" ? claims.sub : null;
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
  if (!redis || !process.env.CLERK_SECRET_KEY) return json({ erro: "Sincronização não configurada." }, 503);

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
