import { z } from "zod";
import type { AiBuild, AiBuildRequest, AiStatKey } from "../src/lib/ai-build-types.js";

/** Lógica pura do assistente de builds (sem rede), separada para poder testar. */

export const STAT_KEYS: AiStatKey[] = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

export const NATURE_IDS = [
  "hardy", "lonely", "brave", "adamant", "naughty", "bold", "docile", "relaxed", "impish", "lax", "timid", "hasty", "serious",
  "jolly", "naive", "modest", "mild", "quiet", "bashful", "rash", "calm", "gentle", "sassy", "careful", "quirky",
];

const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock",
  "ghost", "dragon", "dark", "steel", "fairy",
];

/** Validação do que chega do navegador (tamanhos limitados para não gastar à toa). */
export const RequestSchema = z.object({
  pedido: z.string().trim().min(2).max(400),
  pokemon: z.object({
    name: z.string().max(60),
    types: z.array(z.string().max(20)).max(2),
    stats: z.record(z.string(), z.number()),
    abilities: z.array(z.object({ name: z.string().max(40), hidden: z.boolean() })).max(4),
  }),
  game: z.object({ label: z.string().max(60), gen: z.number().int().min(1).max(9), kind: z.enum(["official", "hack"]), tera: z.boolean() }).nullable(),
  level: z.number().int().min(1).max(100),
  style: z.enum(["casual", "competitiva"]),
  current: z.object({
    moves: z.array(z.string().max(40)).max(4),
    item: z.string().max(40),
    nature: z.string().max(20),
    ability: z.string().max(40).nullable(),
    tera: z.string().max(20).nullable(),
    evs: z.record(z.string(), z.number()),
  }),
  learnable: z.array(z.object({ id: z.string().max(40), how: z.string().max(20) })).max(700),
  bosses: z.array(z.object({ name: z.string().max(40), types: z.array(z.string().max(20)).max(4), levelCap: z.number() })).max(20),
  teammates: z.array(z.object({ name: z.string().max(60), types: z.array(z.string().max(20)).max(2) })).max(5),
});

/** Formato da resposta do Claude (saída estruturada). */
export const AiOutputSchema = z.object({
  resposta: z.string().describe("Resposta ao jogador em português do Brasil, curta, explicando o que mudou e por quê."),
  alterou_build: z.boolean().describe("true se a build abaixo é diferente da atual."),
  build: z.object({
    moves: z.array(z.string()).describe("Até 4 ids de golpes, exatamente como na lista learnable."),
    item: z.string(),
    nature: z.string(),
    ability: z.string().nullable(),
    tera: z.string().nullable(),
    evs: z.object({
      hp: z.number().int(),
      attack: z.number().int(),
      defense: z.number().int(),
      "special-attack": z.number().int(),
      "special-defense": z.number().int(),
      speed: z.number().int(),
    }),
  }),
});
export type AiOutput = z.infer<typeof AiOutputSchema>;

export const SYSTEM_PROMPT = `You are the build assistant inside Dex Lab, a Pokémon team builder. The player is building a team for a specific game and asks you, in Brazilian Portuguese, to explain or adjust the build of one Pokémon.

You receive a JSON object with: the Pokémon (types, base stats, abilities), the game and its generation, the player's level, the style ("casual" = beating the story/campaign, "competitiva" = competitive battles), the current build, the exact list of moves this Pokémon can have in this game ("learnable", with how each is learned), the game's gym leaders and League ("bosses", with their types and level caps), the rest of the team, and the player's request ("pedido").

Rules for the build:
- Use only move ids that appear in "learnable", spelled exactly as given. If what the player wants needs a move that is not in the list, say so in the answer instead of inventing it.
- Follow the rules of the game's generation: no abilities or natures before generation 3 (ability null, nature "hardy"); no held items before generation 2 (item ""); hidden abilities only from generation 5; a Tera type only if game.tera is true or there is no game, otherwise null. Before generation 4, physical or special depends on the move's type. Use the type chart of that generation.
- EVs: each stat from 0 to 252, total at most 510, using the given stat keys. Natures are lowercase English ids (e.g. "adamant"). Abilities are lowercase ids from the Pokémon's ability list. Items are their English names as written in the games (e.g. "Leftovers", "Choice Band").
- In casual style, prefer moves the Pokémon can already have at the current level or by TM/tutor, and items that are easy to get during the story. Think about the bosses of this game and what the rest of the team does not cover.
- If the player only asks a question or wants an explanation, keep the current build unchanged and set alterou_build to false.

Rules for "resposta":
- Brazilian Portuguese, friendly and direct, at most about 120 words. Plain text, no markdown headings or tables.
- Keep move, item and ability names in English, as they appear in the games (the player prefers it).
- When you change something, say what changed and why, in concrete terms (for example which gym leader or Elite Four member it helps against). Do not repeat the whole build.`;

/** Mensagem do usuário: só os dados necessários, em JSON compacto. */
export function userMessage(req: AiBuildRequest) {
  return JSON.stringify(req);
}

/**
 * Confere a sugestão do Claude contra as regras do jogo e devolve só o que é válido.
 * Golpe fora da lista, EVs demais ou campos de outra geração são corrigidos e avisados.
 */
export function sanitize(req: AiBuildRequest, out: AiOutput): { patch: Partial<AiBuild>; avisos: string[] } {
  const avisos: string[] = [];
  const gen = req.game?.gen ?? 9;
  const teraAllowed = !req.game || req.game.tera;
  const learnable = new Set(req.learnable.map((m) => m.id));

  if (!out.alterou_build) return { patch: {}, avisos };

  const moves: string[] = [];
  for (const raw of out.build.moves) {
    const id = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (moves.includes(id)) continue;
    if (learnable.size && !learnable.has(id)) {
      avisos.push(`${raw} foi descartado: ${req.pokemon.name} não aprende esse golpe neste jogo.`);
      continue;
    }
    moves.push(id);
  }

  const evs = {} as Record<AiStatKey, number>;
  for (const k of STAT_KEYS) evs[k] = Math.max(0, Math.min(252, Math.round(out.build.evs[k] ?? 0)));
  let total = STAT_KEYS.reduce((s, k) => s + evs[k], 0);
  if (total > 510) {
    // Corta na mesma proporção em todos (múltiplos de 4, como nos jogos), sem favorecer nenhum atributo.
    avisos.push(`Os EVs somavam ${total}; reduzi todos na mesma proporção até o limite de 510.`);
    const scale = 510 / total;
    for (const k of STAT_KEYS) evs[k] = Math.floor((evs[k] * scale) / 4) * 4;
  }

  let nature = out.build.nature.trim().toLowerCase();
  if (gen < 3) nature = "hardy";
  else if (!NATURE_IDS.includes(nature)) {
    avisos.push(`Natureza "${out.build.nature}" não existe; mantive a atual.`);
    nature = req.current.nature;
  }

  let ability = out.build.ability?.trim().toLowerCase().replace(/[\s_]+/g, "-") ?? null;
  if (gen < 3) ability = null;
  else if (ability && !req.pokemon.abilities.some((a) => a.name === ability)) {
    avisos.push(`${out.build.ability} não é habilidade de ${req.pokemon.name}; mantive a atual.`);
    ability = req.current.ability;
  } else if (ability && gen < 5 && req.pokemon.abilities.some((a) => a.name === ability && a.hidden)) {
    avisos.push(`${out.build.ability} é habilidade oculta, que só existe a partir da 5ª geração; mantive a atual.`);
    ability = req.current.ability;
  }

  const item = gen < 2 ? "" : out.build.item.trim().slice(0, 40);

  let tera = out.build.tera?.trim().toLowerCase() ?? null;
  if (!teraAllowed) tera = null;
  else if (tera && tera !== "stellar" && !TYPES.includes(tera)) {
    avisos.push(`Tipo Tera "${out.build.tera}" não existe; mantive o atual.`);
    tera = req.current.tera;
  }

  return { patch: { moves: moves.length ? moves.slice(0, 4) : req.current.moves, item, nature, ability, tera, evs }, avisos };
}
