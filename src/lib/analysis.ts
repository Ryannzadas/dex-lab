import type { Pokemon } from "./pokeapi";
import { effectiveness, multiplier, TYPES, type TypeName } from "./types";

export type DefenseRow = {
  attack: TypeName;
  /** Multiplicador contra cada membro, na ordem do time. */
  values: number[];
  weak: number;
  resist: number;
  immune: number;
  /** Mais gente fraca do que protegida: ponto fraco do time. */
  problem: boolean;
};

export function defenseTable(team: Pokemon[]): DefenseRow[] {
  return TYPES.map((attack) => {
    const values = team.map((p) => multiplier(attack, p.types));
    const weak = values.filter((v) => v > 1).length;
    const resist = values.filter((v) => v > 0 && v < 1).length;
    const immune = values.filter((v) => v === 0).length;
    return { attack, values, weak, resist, immune, problem: weak >= 2 && weak > resist + immune };
  });
}

/** Tipos que algum golpe do mesmo tipo do time (STAB) acerta como super efetivo. */
export function offensiveCoverage(team: Pokemon[]) {
  const attackTypes = new Set(team.flatMap((p) => p.types));
  const covered = TYPES.filter((def) => [...attackTypes].some((atk) => effectiveness(atk, def) > 1));
  const uncovered = TYPES.filter((def) => !covered.includes(def));
  return { covered, uncovered };
}

export type Suggestion = { type: TypeName; resists: TypeName[]; covers: TypeName[]; score: number };

/**
 * Que tipo um próximo membro deveria ter?
 * Pontua cada tipo pelos pontos fracos do time que ele resiste
 * e pelos tipos sem cobertura que ele acerta super efetivo.
 */
export function suggestTypes(team: Pokemon[], limit = 3): Suggestion[] {
  if (team.length === 0) return [];
  const problems = defenseTable(team)
    .filter((r) => r.problem || r.weak > r.resist + r.immune)
    .map((r) => r.attack);
  const { uncovered } = offensiveCoverage(team);
  const owned = new Set(team.flatMap((p) => p.types));

  return TYPES.map((type) => {
    const resists = problems.filter((atk) => effectiveness(atk, type) < 1);
    const covers = uncovered.filter((def) => effectiveness(type, def) > 1);
    // Tipo repetido vale menos: diversidade ajuda.
    const score = resists.length * 2 + covers.length - (owned.has(type) ? 2 : 0);
    return { type, resists, covers, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
