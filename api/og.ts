import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import satori from "satori";
import { gameById } from "../src/lib/games.js";
import type { SyncData } from "../src/lib/sync-merge.js";
import { TYPE_INFO, type TypeName } from "../src/lib/types.js";
import { isOffensive } from "./_filtro.js";
import { isBlocked } from "./_moderacao.js";
import { getRedis } from "./_redis.js";

/**
 * /api/og — imagem de prévia (1200×630) para links compartilhados.
 * ?h=<nome>: perfil público. ?time=1,2,3&jogo=x: time compartilhado. Sem nada: o Dex Lab.
 */

type Node = { type: string; props: Record<string, unknown> };
type Mon = { id: number; name: string; types: string[] };
type Card = { kicker: string; title: string; subtitle: string; avatar: { photo: string | null; name: string } | null; mons: Mon[] };

const W = 1200;
const H = 630;
const INK = "#f4f1ec";
const MUTED = "#a8a29e";
const BG = "#100f0e";
const INNER = W - 128;

function h(type: string, style: Record<string, unknown>, ...children: (Node | string | null | false)[]): Node {
  const kids = children.filter((c): c is Node | string => c !== null && c !== false);
  return { type, props: { style: { display: "flex", ...style }, children: kids.length === 1 ? kids[0] : kids } };
}
function img(src: string, style: Record<string, unknown>): Node {
  return { type: "img", props: { src, width: style.width, height: style.height, style } };
}

const artwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const titleCase = (name: string) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

async function monOf(id: number): Promise<Mon> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const p = (await res.json()) as { name: string; types: { type: { name: string } }[] };
    return { id, name: titleCase(p.name), types: p.types.map((t) => t.type.name) };
  } catch {
    return { id, name: `#${id}`, types: [] };
  }
}

/** Fonte do site (Bricolage Grotesque), só com as letras usadas. Sem ela, a imagem sai com a fonte padrão. */
const fontCache = new Map<number, Promise<ArrayBuffer | null>>();
function font(weight: number, text: string) {
  let hit = fontCache.get(weight);
  if (!hit) {
    hit = fetchFont(weight, text);
    fontCache.set(weight, hit);
    void hit.then((f) => f || fontCache.delete(weight));
  }
  return hit;
}
async function fetchFont(weight: number, _text: string) {
  // Fontsource (jsDelivr) serve o arquivo .ttf direto; o Google Fonts fica de reserva.
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/fontsource/fonts/bricolage-grotesque@latest/latin-${weight}-normal.ttf`);
    if (res.ok) return await res.arrayBuffer();
  } catch {
    // tenta o Google
  }
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Foto do perfil, se for um formato que o gerador entende (PNG/JPEG). */
async function usablePhoto(photo: string | null, origin: string) {
  if (!photo) return null;
  const url = new URL(photo, origin).toString();
  if (url.includes("PokeAPI/sprites") || url.includes("googleusercontent.com")) return url;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return /image\/(png|jpe?g)/.test(res.headers.get("content-type") ?? "") ? url : null;
  } catch {
    return null;
  }
}

async function profileCard(handle: string, origin: string): Promise<Card | null> {
  const redis = getRedis();
  if (!redis || !/^[a-z0-9][a-z0-9_-]{2,19}$/.test(handle)) return null;
  const uid = await redis.get<string>(`dexlab:perfil:nome:${handle}`);
  if (!uid || (await isBlocked(redis, uid))) return null;
  const [rawProfile, rawTimes] = await redis.mget<unknown[]>(`dexlab:perfil:uid:${uid}`, `dexlab:times:fb:${uid}`);
  const parse = <T>(raw: unknown) => (typeof raw === "string" ? (JSON.parse(raw) as T) : (raw as T | null));
  const profile = parse<{ name: string; photo: string | null; bio: string; teams: string[] }>(rawProfile);
  if (!profile || isOffensive(profile.name, profile.bio)) return null;
  const times = parse<SyncData>(rawTimes);
  const publicTeams = profile.teams.map((id) => times?.teams.find((t) => t.id === id)).filter((t) => !!t && t.members.length > 0);
  const first = publicTeams[0] as { members: { id: number }[] } | undefined;
  const mons = await Promise.all((first?.members ?? []).slice(0, 6).map((m) => monOf(m.id)));
  return {
    kicker: `Treinador · @${handle}`,
    title: profile.name,
    subtitle: profile.bio || `${publicTeams.length} ${publicTeams.length === 1 ? "time público" : "times públicos"} no Dex Lab`,
    avatar: { photo: await usablePhoto(profile.photo, origin), name: profile.name },
    mons,
  };
}

async function teamCard(ids: number[], game: string | null): Promise<Card> {
  const mons = await Promise.all(ids.slice(0, 6).map(monOf));
  const names = mons.map((m) => m.name);
  const title = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} e mais ${names.length - 3}`;
  return {
    kicker: `Time${gameById(game) ? ` · ${gameById(game)!.label}` : ""}`,
    title,
    subtitle: "Veja fraquezas, cobertura e status desse time",
    avatar: null,
    mons,
  };
}

const SITE: Card = {
  kicker: "Montador de times Pokémon",
  title: "Monte o time de hoje",
  subtitle: "Fraquezas, cobertura, velocidade, dano e uma vitrine da comunidade",
  avatar: null,
  mons: [445, 6, 448, 94, 25, 658].map((id) => ({ id, name: "", types: [] })),
};

function render(card: Card, origin: string): Node {
  const types = card.mons.flatMap((m) => m.types).filter((t): t is TypeName => t in TYPE_INFO);
  const c1 = TYPE_INFO[types[0] ?? "dragon"].color;
  const c2 = TYPE_INFO[types.find((t) => t !== types[0]) ?? "ghost"].color;
  const size = card.mons.length > 4 ? 150 : 170;

  return h(
    "div",
    {
      // O gerador soma o recuo ao tamanho, então a caixa tem o tamanho de dentro.
      width: INNER,
      height: H - 104,
      flexDirection: "column",
      justifyContent: "space-between",
      paddingTop: 52,
      paddingBottom: 52,
      paddingLeft: 64,
      paddingRight: 64,
      backgroundColor: BG,
      backgroundImage: `radial-gradient(circle at 12% 18%, ${c1}55, transparent 45%), radial-gradient(circle at 92% 88%, ${c2}55, transparent 45%)`,
      color: INK,
      fontFamily: "Bricolage",
    },
    h(
      "div",
      { width: INNER, alignItems: "center", justifyContent: "space-between" },
      h("div", { alignItems: "center", gap: 14 }, img(`${origin}/favicon.svg`, { width: 48, height: 48 }), h("div", { fontSize: 34, fontWeight: 700 }, "Dex Lab")),
      h("div", { fontSize: 24, color: MUTED }, "dex-lab.vercel.app"),
    ),
    h(
      "div",
      { width: INNER, alignItems: "center", gap: 36 },
      card.avatar &&
        (card.avatar.photo
          ? img(card.avatar.photo, { width: 150, height: 150, borderRadius: 999, objectFit: "cover", backgroundColor: "#ffffff14" })
          : h("div", { width: 150, height: 150, borderRadius: 999, backgroundColor: INK, color: BG, alignItems: "center", justifyContent: "center", fontSize: 72, fontWeight: 700 }, card.avatar.name.charAt(0).toUpperCase())),
      h(
        "div",
        { flexDirection: "column", width: card.avatar ? INNER - 186 : INNER },
        h("div", { fontSize: 24, color: MUTED, letterSpacing: 3, textTransform: "uppercase" }, card.kicker),
        h("div", { fontSize: card.title.length > 28 ? 58 : 76, fontWeight: 700, lineHeight: 1.02, marginTop: 8 }, card.title),
        h("div", { fontSize: 28, color: MUTED, marginTop: 12 }, card.subtitle.length > 90 ? `${card.subtitle.slice(0, 88)}…` : card.subtitle),
      ),
    ),
    h(
      "div",
      { width: INNER, gap: 18 },
      ...card.mons.map((m) =>
        h(
          "div",
          { width: size, height: size, borderRadius: 28, backgroundColor: "#ffffff10", border: "2px solid #ffffff1a", alignItems: "center", justifyContent: "center" },
          img(artwork(m.id), { width: size - 22, height: size - 22 }),
        ),
      ),
    ),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const handle = url.searchParams.get("h")?.toLowerCase();
  const ids = (url.searchParams.get("time") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n < 20000)
    .slice(0, 6);

  const card = (handle && (await profileCard(handle, origin).catch(() => null))) || (ids.length ? await teamCard(ids, url.searchParams.get("jogo")) : SITE);
  const text = `${card.kicker}${card.title}${card.subtitle}Dex Labdex-lab.vercel.app${card.avatar?.name.charAt(0) ?? ""}0123456789·…`;
  const [bold, regular] = await Promise.all([font(700, text), font(400, text)]);
  if (!bold || !regular) return new Response("Fonte indisponível", { status: 503, headers: { "cache-control": "no-store" } });

  const svg = await satori(render(card, origin) as unknown as ReactNode, {
    width: W,
    height: H,
    fonts: [
      { name: "Bricolage", data: bold, weight: 700, style: "normal" },
      { name: "Bricolage", data: regular, weight: 400, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      // Perfis mudam; times compartilhados (o link tem os Pokémon) não.
      "cache-control": handle ? "public, s-maxage=600, stale-while-revalidate=86400" : "public, s-maxage=604800, immutable",
    },
  });
}
