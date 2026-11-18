import { gameById } from "../src/lib/games.js";
import { isOffensive } from "./_filtro.js";
import { isBlocked } from "./_moderacao.js";
import { getRedis } from "./_redis.js";

/**
 * /api/pagina — a mesma página do app, mas com título e prévia certos para quem compartilha:
 * /u/<nome> (perfil público) e /?time=... (time compartilhado). WhatsApp, Discord etc. não rodam
 * o JavaScript do app, então só enxergam estas tags.
 */

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const titleCase = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

async function namesOf(ids: number[]) {
  return Promise.all(
    ids.map((id) =>
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
        .then((r) => r.json() as Promise<{ name: string }>)
        .then((p) => titleCase(p.name))
        .catch(() => `#${id}`),
    ),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const html = await (await fetch(`${origin}/index.html`)).text();

  let title = "Dex Lab · montador de time e comparador";
  let description = "Monte seu time Pokémon, veja fraquezas e cobertura de tipos, compare status e explore a vitrine da comunidade.";
  let image = `${origin}/api/og`;
  let pageUrl = origin;

  const handle = url.searchParams.get("h")?.toLowerCase();
  const ids = (url.searchParams.get("time") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n < 20000)
    .slice(0, 6);

  if (handle && /^[a-z0-9][a-z0-9_-]{2,19}$/.test(handle)) {
    pageUrl = `${origin}/u/${handle}`;
    const redis = getRedis();
    const uid = redis ? await redis.get<string>(`dexlab:perfil:nome:${handle}`) : null;
    const raw = uid && !(await isBlocked(redis!, uid)) ? await redis!.get(`dexlab:perfil:uid:${uid}`) : null;
    const profile = (typeof raw === "string" ? JSON.parse(raw) : raw) as { name: string; bio: string; teams: string[] } | null;
    if (profile && !isOffensive(profile.name, profile.bio)) {
      title = `${profile.name} (@${handle}) · Dex Lab`;
      description = profile.bio || `Veja os times de ${profile.name} no Dex Lab.`;
      image = `${origin}/api/og?h=${handle}`;
    } else {
      title = "Perfil não encontrado · Dex Lab";
    }
  } else if (ids.length) {
    const game = gameById(url.searchParams.get("jogo"));
    const names = await namesOf(ids);
    title = `Time com ${names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}` : names[0]} · Dex Lab`;
    description = `${game ? `Time para ${game.label}. ` : ""}Abra no Dex Lab para ver fraquezas, cobertura, velocidade e dano.`;
    image = `${origin}/api/og?time=${ids.join(",")}${game ? `&jogo=${game.id}` : ""}`;
    pageUrl = `${origin}/t?${url.searchParams.toString()}`;
  }

  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Dex Lab" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${escape(pageUrl)}" />`,
    `<meta property="og:image" content="${escape(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");

  // Tira o título, a descrição e as tags de prévia padrão e põe as desta página.
  const page = html
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace(/<meta\s+(property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g, "")
    .replace("</head>", `    ${tags}\n  </head>`);

  return new Response(page, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=86400" },
  });
}
