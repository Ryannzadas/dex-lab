import { json, PROJECT_ID, userIdOf } from "./_auth.js";
import { getRedis } from "./_redis.js";

/**
 * /api/avatar — foto de perfil enviada pela pessoa (o Firebase Storage exige plano pago).
 * GET ?u=<id da conta>: devolve a imagem (pública, como a foto do Google).
 * PUT: guarda a imagem da própria conta (o app já manda 256×256 em WebP/JPEG). DELETE: apaga.
 */

const MAX_BYTES = 200_000;
const keyOf = (uid: string) => `dexlab:avatar:${uid}`;
type Stored = { t: string; d: string };

/** Confere pelos primeiros bytes que é mesmo uma imagem WebP, JPEG ou PNG. */
function imageType(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  return null;
}

export async function GET(request: Request) {
  const redis = getRedis();
  const uid = new URL(request.url).searchParams.get("u") ?? "";
  if (!redis || !/^[A-Za-z0-9]{10,128}$/.test(uid)) return new Response(null, { status: 404 });
  const stored = await redis.get<Stored>(keyOf(uid));
  if (!stored?.d) return new Response(null, { status: 404 });
  const bytes = Uint8Array.from(atob(stored.d), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-type": stored.t,
      // A URL muda (?v=) a cada foto nova, então dá para guardar de vez.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

async function own(request: Request): Promise<{ uid: string; redis: NonNullable<ReturnType<typeof getRedis>> } | Response> {
  const redis = getRedis();
  if (!redis || !PROJECT_ID) return json({ erro: "Fotos não configuradas." }, 503);
  const uid = await userIdOf(request);
  if (!uid) return json({ erro: "Entre com sua conta." }, 401);
  return { uid, redis };
}

export async function PUT(request: Request) {
  const ctx = await own(request);
  if (ctx instanceof Response) return ctx;
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_BYTES) return json({ erro: "Imagem grande demais." }, 413);
  const type = imageType(bytes);
  if (!type) return json({ erro: "Envie uma imagem WebP, JPEG ou PNG." }, 400);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  await ctx.redis.set(keyOf(ctx.uid), { t: type, d: btoa(binary) } satisfies Stored);
  return json({ url: `${new URL(request.url).origin}/api/avatar?u=${ctx.uid}&v=${Date.now()}` });
}

export async function DELETE(request: Request) {
  const ctx = await own(request);
  if (ctx instanceof Response) return ctx;
  await ctx.redis.del(keyOf(ctx.uid));
  return json({ ok: true });
}
