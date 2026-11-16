import type { MoveInfo } from "./moves";
import { finalStats } from "./natures";
import type { Pokemon, StatKey } from "./pokeapi";
import { multiplier, type TypeName } from "./types";

/**
 * Calculadora de dano com a fórmula oficial (geração 5 em diante):
 *   dano = ⌊⌊⌊2·Nv/5 + 2⌋ · Poder · A/D⌋ / 50⌋ + 2
 * e depois os modificadores: variação aleatória (85%–100%), STAB, efetividade e itens.
 * Não considera habilidades, clima, campo, críticos nem mudanças de status.
 */

export type Spread = {
  level: number;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  ivs: Partial<Record<StatKey, number>>;
};

/** Investimentos prontos para o alvo, já que não sabemos o time do oponente. */
export const DEFENDER_PRESETS = {
  zero: { label: "Sem investimento", evs: {}, nature: "hardy" },
  hp: { label: "252 HP", evs: { hp: 252 }, nature: "hardy" },
  bulky: { label: "252 HP / 252 defesa +", evs: { hp: 252, defense: 252, "special-defense": 252 }, nature: "bulky" },
} as const;
export type DefenderPreset = keyof typeof DEFENDER_PRESETS;

export type DamageResult = {
  min: number;
  max: number;
  hp: number;
  minPct: number;
  maxPct: number;
  effectiveness: number;
  stab: number;
  /** Texto curto: "OHKO garantido", "Chance de OHKO", "2HKO"… */
  verdict: string;
};

/** Modificador de 4096 avos, aplicado com arredondamento como nos jogos (pokeRound). */
function applyMod(value: number, mod: number) {
  const scaled = value * mod;
  const frac = scaled - Math.floor(scaled);
  return frac > 0.5 ? Math.ceil(scaled) : Math.floor(scaled);
}

export function calcDamage(opts: {
  attacker: Pokemon;
  attackerSpread: Spread & { item: string };
  /** Tipo Tera do atacante, se estiver terastalizado. */
  attackerTera: TypeName | null;
  move: MoveInfo;
  defender: Pokemon;
  defenderPreset: DefenderPreset;
  defenderLevel: number;
}): DamageResult | null {
  const { attacker, attackerSpread, attackerTera, move, defender, defenderPreset, defenderLevel } = opts;
  if (move.category === "status" || !move.power || !move.type) return null;

  const physical = move.category === "physical";
  const atkKey: StatKey = physical ? "attack" : "special-attack";
  const defKey: StatKey = physical ? "defense" : "special-defense";

  const a = finalStats(attacker.stats, attackerSpread.level, attackerSpread.nature, attackerSpread.evs, attackerSpread.ivs);

  // Alvo: natureza que aumenta a defesa usada pelo golpe no preset "bulky".
  const preset = DEFENDER_PRESETS[defenderPreset];
  const nature = preset.nature === "bulky" ? (physical ? "bold" : "calm") : preset.nature;
  const presetEvs: Partial<Record<StatKey, number>> =
    defenderPreset === "bulky" ? { hp: 252, [defKey]: 252 } : { ...preset.evs };
  const d = finalStats(defender.stats, defenderLevel, nature, presetEvs, {});

  let atk = a[atkKey];
  const item = attackerSpread.item.toLowerCase();
  if (physical && /choice\s*band/.test(item)) atk = Math.floor(atk * 1.5);
  if (!physical && /choice\s*specs/.test(item)) atk = Math.floor(atk * 1.5);

  const level = attackerSpread.level;
  const base = Math.floor(Math.floor((Math.floor((2 * level) / 5 + 2) * move.power * atk) / d[defKey]) / 50) + 2;

  // STAB: 1,5 com tipo original; Tera do mesmo tipo de um tipo original vira 2,0.
  const original = attacker.types.includes(move.type);
  const teraMatch = attackerTera === move.type;
  const stab = teraMatch && original ? 2 : teraMatch || original ? 1.5 : 1;
  const eff = multiplier(move.type, defender.types);

  const rolls: number[] = [];
  for (let r = 85; r <= 100; r++) {
    let dmg = Math.floor((base * r) / 100);
    dmg = applyMod(dmg, stab);
    dmg = Math.floor(dmg * eff);
    if (/life\s*orb/.test(item)) dmg = applyMod(dmg, 5324 / 4096);
    if (/expert\s*belt/.test(item) && eff > 1) dmg = applyMod(dmg, 4915 / 4096);
    rolls.push(eff === 0 ? 0 : Math.max(1, dmg));
  }

  const min = rolls[0];
  const max = rolls[rolls.length - 1];
  const hp = d.hp;
  const minPct = (min / hp) * 100;
  const maxPct = (max / hp) * 100;

  let verdict: string;
  if (eff === 0) verdict = "Sem efeito";
  else if (min >= hp) verdict = "OHKO garantido";
  else if (max >= hp) {
    const chance = Math.round((rolls.filter((x) => x >= hp).length / rolls.length) * 100);
    verdict = `Chance de OHKO (${chance}%)`;
  } else {
    const hits = Math.ceil(hp / min);
    const best = Math.ceil(hp / max);
    verdict = hits === best ? `${hits}HKO` : `${best}HKO ou ${hits}HKO`;
  }

  return { min, max, hp, minPct, maxPct, effectiveness: eff, stab, verdict };
}
