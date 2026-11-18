import { createRemoteJWKSet, jwtVerify } from "jose";

export const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;

// Chaves públicas do Google que assinam os tokens do Firebase (o jose guarda e renova sozinho).
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Confere o token do Firebase (assinatura, projeto, emissor, validade) e devolve o id da conta. */
export async function userIdOf(request: Request): Promise<string | null> {
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
