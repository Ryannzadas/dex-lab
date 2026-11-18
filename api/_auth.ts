import { createRemoteJWKSet, jwtVerify } from "jose";

export const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID;

// Chaves públicas do Google que assinam os tokens do Firebase (o jose guarda e renova sozinho).
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Confere o token do Firebase (assinatura, projeto, emissor, validade) e devolve o id da conta. */
export async function userIdOf(request: Request): Promise<string | null> {
  return (await tokenOf(request))?.uid ?? null;
}

/** Como userIdOf, mas também diz se o e-mail da conta está confirmado. */
export async function tokenOf(request: Request): Promise<{ uid: string; emailVerified: boolean; email: string | null } | null> {
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
    return { uid: payload.sub, emailVerified: payload.email_verified === true, email: typeof payload.email === "string" ? payload.email.toLowerCase() : null };
  } catch {
    return null;
  }
}

/** Dono do app: e-mail confirmado que está na variável ADMIN_EMAIL (pode ter vários, separados por vírgula). */
export function isAdmin(token: { email: string | null; emailVerified: boolean } | null) {
  const admins = (process.env.ADMIN_EMAIL ?? "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  return !!token?.email && token.emailVerified && admins.includes(token.email);
}
