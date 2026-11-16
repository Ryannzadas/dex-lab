import { NATURES } from "./natures";
import type { PokemonRef, StatKey } from "./pokeapi";
import { newMember, MAX_TEAM, type Member } from "./team";
import { TYPES } from "./types";

/**
 * Converte times de e para o formato de texto do Pokémon Showdown:
 *
 *   Apelido (Charizard-Mega-X) @ Life Orb
 *   Ability: Tough Claws
 *   Level: 50
 *   Shiny: Yes
 *   Tera Type: Fire
 *   EVs: 252 Atk / 4 SpD / 252 Spe
 *   Jolly Nature
 *   IVs: 0 SpA
 *   - Flare Blitz
 */

const SD_STAT: Record<StatKey, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};
const STAT_ORDER: StatKey[] = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

/** "mr-mime" → "Mr-Mime", "charizard-mega-x" → "Charizard-Mega-X" (nomes de espécie do Showdown). */
function toSdName(apiName: string) {
  return apiName
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("-");
}

/** "flamethrower" → "Flamethrower", "will-o-wisp" → "Will O Wisp" (o Showdown aceita assim no import). */
function toSdWords(apiName: string) {
  return apiName
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Normaliza nomes do Showdown para o formato da PokéAPI: "King's Shield" → "kings-shield". */
export function toApiName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // acentos (Flabébé)
    .replace(/[’'.:%]/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function exportShowdown(members: Member[], names: Record<number, string>): string {
  return members
    .map((m) => {
      const species = toSdName(names[m.id] ?? String(m.id));
      const lines: string[] = [];
      let head = m.nickname ? `${m.nickname} (${species})` : species;
      if (m.item.trim()) head += ` @ ${m.item.trim()}`;
      lines.push(head);
      if (m.ability) lines.push(`Ability: ${toSdWords(m.ability)}`);
      if (m.level !== 100) lines.push(`Level: ${m.level}`);
      if (m.shiny) lines.push("Shiny: Yes");
      if (m.tera) lines.push(`Tera Type: ${m.tera.charAt(0).toUpperCase() + m.tera.slice(1)}`);
      const evs = STAT_ORDER.filter((k) => (m.evs[k] ?? 0) > 0).map((k) => `${m.evs[k]} ${SD_STAT[k]}`);
      if (evs.length) lines.push(`EVs: ${evs.join(" / ")}`);
      const nature = NATURES.find((n) => n.id === m.nature);
      if (nature) lines.push(`${nature.en} Nature`);
      const ivs = STAT_ORDER.filter((k) => m.ivs[k] !== undefined && m.ivs[k] !== 31).map((k) => `${m.ivs[k]} ${SD_STAT[k]}`);
      if (ivs.length) lines.push(`IVs: ${ivs.join(" / ")}`);
      m.moves.filter(Boolean).forEach((mv) => lines.push(`- ${toSdWords(mv)}`));
      return lines.join("\n");
    })
    .join("\n\n");
}

export type ImportResult = { members: Member[]; warnings: string[] };

/** Lê o texto do Showdown. Pokémon que não forem encontrados viram aviso, não erro. */
export function importShowdown(text: string, list: PokemonRef[]): ImportResult {
  const byName = new Map(list.map((p) => [p.name, p.id]));
  const warnings: string[] = [];
  const members: Member[] = [];

  const blocks = text
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length > 0);

  for (const lines of blocks) {
    // Cabeçalho: "Apelido (Espécie) (M) @ Item" ou "Espécie @ Item".
    const [headRaw, ...rest] = lines;
    if (headRaw.startsWith("===")) continue; // títulos de pasta do Showdown
    const [left, item = ""] = headRaw.split(" @ ");
    const noGender = left.replace(/\s*\((M|F)\)\s*$/, "").trim();
    const paren = noGender.match(/^(.*)\(([^()]+)\)\s*$/);
    const nickname = paren ? paren[1].trim() : "";
    const speciesText = paren ? paren[2].trim() : noGender;

    const apiName = toApiName(speciesText);
    // Tenta o nome exato e algumas variações comuns (formas com gênero, nomes com "-").
    const id = byName.get(apiName) ?? byName.get(`${apiName}-male`) ?? byName.get(apiName.replace(/-(m|f)$/, ""));
    if (!id) {
      warnings.push(`Não encontrei "${speciesText}".`);
      continue;
    }
    if (members.some((m) => m.id === id)) {
      warnings.push(`"${speciesText}" apareceu duas vezes; fiquei só com o primeiro.`);
      continue;
    }
    if (members.length >= MAX_TEAM) {
      warnings.push("O time tem mais de 6 Pokémon; só os 6 primeiros entraram.");
      break;
    }

    const m = newMember(id);
    m.level = 100; // no Showdown, sem "Level:" significa nível 100
    m.nickname = nickname.slice(0, 12);
    m.item = item.trim().slice(0, 40);

    for (const line of rest) {
      const [key, ...vals] = line.split(":");
      const value = vals.join(":").trim();
      if (line.startsWith("-")) {
        const move = toApiName(line.replace(/^-\s*/, "").replace(/\[.*?\]/g, ""));
        if (move && m.moves.length < 4 && !m.moves.includes(move)) m.moves.push(move);
      } else if (/nature$/i.test(line)) {
        const n = NATURES.find((x) => x.en.toLowerCase() === line.replace(/\s*nature$/i, "").trim().toLowerCase());
        if (n) m.nature = n.id;
      } else if (key === "Ability") m.ability = toApiName(value);
      else if (key === "Level") m.level = Math.min(100, Math.max(1, Number(value) || 100));
      else if (key === "Shiny") m.shiny = /^yes$/i.test(value);
      else if (key === "Tera Type") {
        const t = value.toLowerCase();
        if ((TYPES as readonly string[]).includes(t) || t === "stellar") m.tera = t;
      } else if (key === "EVs" || key === "IVs") {
        const target: Partial<Record<StatKey, number>> = {};
        for (const part of value.split("/")) {
          const [num, stat] = part.trim().split(/\s+/);
          const k = STAT_ORDER.find((s) => SD_STAT[s].toLowerCase() === stat?.toLowerCase());
          if (k) target[k] = Math.max(0, Math.min(key === "EVs" ? 252 : 31, Number(num) || 0));
        }
        if (key === "EVs") m.evs = target;
        else m.ivs = target;
      }
    }
    members.push(m);
  }

  if (members.length === 0 && warnings.length === 0) warnings.push("Não achei nenhum Pokémon no texto colado.");
  return { members, warnings };
}
