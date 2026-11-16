import type { Stat, StatKey } from "./pokeapi";

type BattleStat = Exclude<StatKey, "hp">;

/** As 25 naturezas com o nome em português e o status que sobe (+10%) e desce (−10%). */
export const NATURES: { id: string; pt: string; en: string; up?: BattleStat; down?: BattleStat }[] = [
  { id: "hardy", pt: "Firme", en: "Hardy" },
  { id: "lonely", pt: "Solitária", en: "Lonely", up: "attack", down: "defense" },
  { id: "brave", pt: "Corajosa", en: "Brave", up: "attack", down: "speed" },
  { id: "adamant", pt: "Rígida", en: "Adamant", up: "attack", down: "special-attack" },
  { id: "naughty", pt: "Travessa", en: "Naughty", up: "attack", down: "special-defense" },
  { id: "bold", pt: "Ousada", en: "Bold", up: "defense", down: "attack" },
  { id: "docile", pt: "Dócil", en: "Docile" },
  { id: "relaxed", pt: "Relaxada", en: "Relaxed", up: "defense", down: "speed" },
  { id: "impish", pt: "Marota", en: "Impish", up: "defense", down: "special-attack" },
  { id: "lax", pt: "Displicente", en: "Lax", up: "defense", down: "special-defense" },
  { id: "timid", pt: "Tímida", en: "Timid", up: "speed", down: "attack" },
  { id: "hasty", pt: "Apressada", en: "Hasty", up: "speed", down: "defense" },
  { id: "serious", pt: "Séria", en: "Serious" },
  { id: "jolly", pt: "Alegre", en: "Jolly", up: "speed", down: "special-attack" },
  { id: "naive", pt: "Ingênua", en: "Naive", up: "speed", down: "special-defense" },
  { id: "modest", pt: "Modesta", en: "Modest", up: "special-attack", down: "attack" },
  { id: "mild", pt: "Amena", en: "Mild", up: "special-attack", down: "defense" },
  { id: "quiet", pt: "Quieta", en: "Quiet", up: "special-attack", down: "speed" },
  { id: "bashful", pt: "Acanhada", en: "Bashful" },
  { id: "rash", pt: "Precipitada", en: "Rash", up: "special-attack", down: "special-defense" },
  { id: "calm", pt: "Calma", en: "Calm", up: "special-defense", down: "attack" },
  { id: "gentle", pt: "Gentil", en: "Gentle", up: "special-defense", down: "defense" },
  { id: "sassy", pt: "Atrevida", en: "Sassy", up: "special-defense", down: "speed" },
  { id: "careful", pt: "Cuidadosa", en: "Careful", up: "special-defense", down: "special-attack" },
  { id: "quirky", pt: "Peculiar", en: "Quirky" },
];

export const SHORT_STAT: Record<StatKey, string> = {
  hp: "HP",
  attack: "Atq",
  defense: "Def",
  "special-attack": "At.Esp",
  "special-defense": "Df.Esp",
  speed: "Vel",
};

export function natureById(id: string) {
  return NATURES.find((n) => n.id === id) ?? NATURES[0];
}

export const EV_MAX = 252;
export const EV_TOTAL = 510;
export const IV_MAX = 31;

/** Fórmula oficial de status (geração 3 em diante). */
export function finalStats(
  base: Stat[],
  level: number,
  natureId: string,
  evs: Partial<Record<StatKey, number>>,
  ivs: Partial<Record<StatKey, number>>,
): Record<StatKey, number> {
  const nature = natureById(natureId);
  const out = {} as Record<StatKey, number>;
  for (const { key, value } of base) {
    const iv = ivs[key] ?? IV_MAX;
    const ev = evs[key] ?? 0;
    const core = Math.floor(((2 * value + iv + Math.floor(ev / 4)) * level) / 100);
    if (key === "hp") {
      out[key] = value === 1 ? 1 : core + level + 10; // Shedinja sempre tem 1 de HP
    } else {
      const mult = nature.up === key ? 1.1 : nature.down === key ? 0.9 : 1;
      out[key] = Math.floor((core + 5) * mult);
    }
  }
  return out;
}
