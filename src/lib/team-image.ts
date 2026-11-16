import type { MoveInfo } from "./moves";
import { natureById } from "./natures";
import { artworkUrl, displayName, pokemonName, type Pokemon } from "./pokeapi";
import type { Member } from "./team";
import { TYPE_INFO, type TypeName } from "./types";

/**
 * Desenha um card do time (1200×675, bom para Discord e redes) num canvas.
 * As artes vêm do GitHub da PokéAPI, que libera CORS, então dá pra exportar o PNG.
 */

const W = 1200;
const H = 675;
const PAD = 40;

const FONT_DISPLAY = '"Bricolage Grotesque", system-ui, sans-serif';
const FONT_SANS = '"Instrument Sans", system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Corta o texto com "…" para caber na largura. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  ctx.font = `600 13px ${FONT_SANS}`;
  const w = ctx.measureText(label).width + 18;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, 22, 11);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 2;
  ctx.fillText(label, x + 9, y + 15.5);
  ctx.shadowBlur = 0;
  return w;
}

export async function drawTeamCard(opts: {
  teamName: string;
  members: Member[];
  pokemons: Record<number, Pokemon>;
  moves: Record<string, MoveInfo>;
}): Promise<HTMLCanvasElement> {
  const { teamName, members, pokemons, moves } = opts;

  // Garante as fontes do site antes de desenhar.
  await Promise.all([
    document.fonts.load(`800 40px ${FONT_DISPLAY}`),
    document.fonts.load(`600 14px ${FONT_SANS}`),
    document.fonts.load(`500 12px ${FONT_MONO}`),
  ]).catch(() => {});

  const images = await Promise.all(members.map((m) => loadImage(artworkUrl(m.id, m.shiny))));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fundo escuro com manchas nas cores do time.
  ctx.fillStyle = "#121010";
  ctx.fillRect(0, 0, W, H);
  const colors = [...new Set(members.flatMap((m) => pokemons[m.id]?.types ?? []))].map((t) => TYPE_INFO[t].color);
  const spots = [
    [W * 0.85, H * 0.1, 520],
    [W * 0.1, H * 0.9, 480],
    [W * 0.5, H * 1.1, 420],
  ] as const;
  spots.forEach(([x, y, r], i) => {
    const c = colors[i % Math.max(colors.length, 1)] ?? "#6d28d9";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${c}66`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // Cabeçalho.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 13px ${FONT_MONO}`;
  ctx.fillText("DEX LAB · TIME", PAD, PAD + 8);
  ctx.fillStyle = "#f5f3f0";
  ctx.font = `800 40px ${FONT_DISPLAY}`;
  ctx.fillText(fit(ctx, teamName, W - PAD * 2 - 200), PAD, PAD + 52);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 13px ${FONT_MONO}`;
  ctx.fillText(`${members.length}/6 POKÉMON`, W - PAD, PAD + 8);
  ctx.textAlign = "left";

  // Grade 3×2 de membros.
  const top = PAD + 80;
  const gap = 16;
  const cols = 3;
  const tileW = (W - PAD * 2 - gap * (cols - 1)) / cols;
  const tileH = (H - top - PAD - 30 - gap) / 2;

  members.forEach((m, i) => {
    const p = pokemons[m.id];
    if (!p) return;
    const x = PAD + (i % cols) * (tileW + gap);
    const y = top + Math.floor(i / cols) * (tileH + gap);
    const main = TYPE_INFO[p.types[0]].color;

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(ctx, x, y, tileW, tileH, 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Brilho atrás da arte, na cor do tipo.
    const art = 150;
    const ax = x + 14;
    const ay = y + (tileH - art) / 2;
    const glow = ctx.createRadialGradient(ax + art / 2, ay + art / 2, 0, ax + art / 2, ay + art / 2, art * 0.7);
    glow.addColorStop(0, `${main}55`);
    glow.addColorStop(1, `${main}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(ax - 20, ay - 20, art + 40, art + 40);
    const img = images[i];
    if (img) ctx.drawImage(img, ax, ay, art, art);

    // Texto à direita da arte.
    const tx = ax + art + 10;
    const tw = x + tileW - tx - 14;
    let ty = y + 34;
    ctx.fillStyle = "#f5f3f0";
    ctx.font = `800 21px ${FONT_DISPLAY}`;
    ctx.fillText(fit(ctx, `${m.nickname || pokemonName(p.name)}${m.shiny ? " ✦" : ""}`, tw), tx, ty);
    ty += 18;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `500 12px ${FONT_MONO}`;
    const sub = [m.nickname ? pokemonName(p.name) : null, `Nv ${m.level}`, natureById(m.nature).en].filter(Boolean).join(" · ");
    ctx.fillText(fit(ctx, sub, tw), tx, ty);
    ty += 12;

    let px = tx;
    for (const t of p.types) px += pill(ctx, px, ty, TYPE_INFO[t].pt, TYPE_INFO[t].color) + 6;
    ty += 40;

    if (m.item.trim()) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = `600 13px ${FONT_SANS}`;
      ctx.fillText(fit(ctx, `@ ${m.item.trim()}`, tw), tx, ty);
      ty += 20;
    }

    const list = m.moves.filter(Boolean);
    ctx.font = `500 13px ${FONT_SANS}`;
    if (list.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("Sem golpes escolhidos", tx, ty);
    }
    for (const mv of list.slice(0, 4)) {
      const info = moves[mv];
      const type: TypeName | null = info?.type ?? null;
      ctx.fillStyle = type ? TYPE_INFO[type].color : "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(tx + 4, ty - 4.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ece8e3";
      ctx.fillText(fit(ctx, displayName(mv), tw - 14), tx + 14, ty);
      ty += 19;
    }
  });

  // Rodapé com a marca.
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `500 12px ${FONT_MONO}`;
  ctx.fillText("dex-lab.vercel.app", PAD, H - PAD + 14);
  ctx.textAlign = "right";
  ctx.fillText("Desenvolvido por Hydra Labs · dados da PokéAPI", W - PAD, H - PAD + 14);
  ctx.textAlign = "left";

  return canvas;
}
