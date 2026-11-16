import { effectiveness, multiplier, TYPES, typesOfGen, type TypeName } from "./types";

/**
 * Análise do time. Todas as funções aceitam `gen` para seguir as regras do jogo escolhido
 * (tipos que existiam e tabela de efetividade da época). Sem jogo, vale a geração atual.
 */

type Typed = { types: TypeName[] };

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

/** Aceita Pokémon ou só os tipos de defesa (por exemplo, já trocados pelo Tipo Tera). */
export function defenseTable(team: Typed[], gen = 9): DefenseRow[] {
  return typesOfGen(gen).map((attack) => {
    const values = team.map((p) => multiplier(attack, p.types, gen));
    const weak = values.filter((v) => v > 1).length;
    const resist = values.filter((v) => v > 0 && v < 1).length;
    const immune = values.filter((v) => v === 0).length;
    return { attack, values, weak, resist, immune, problem: weak >= 2 && weak > resist + immune };
  });
}

/**
 * Tipos de defesa depois de terastalizar: o Tipo Tera substitui os tipos originais.
 * Estelar e "sem Tera" mantêm os tipos de sempre.
 */
export function teraDefenseTypes(types: TypeName[], tera: string | null): TypeName[] {
  return tera && tera !== "stellar" && (TYPES as readonly string[]).includes(tera) ? [tera as TypeName] : types;
}

/** Tipos que algum golpe do mesmo tipo do time (STAB) acerta como super efetivo. */
export function offensiveCoverage(team: Typed[], gen = 9) {
  return coverageFromTypes(team.flatMap((p) => p.types), gen);
}

/** Quais tipos de defesa uma lista de tipos de ataque acerta como super efetivo. */
export function coverageFromTypes(attackTypes: TypeName[], gen = 9) {
  const unique = [...new Set(attackTypes)];
  const all = typesOfGen(gen);
  const covered = all.filter((def) => unique.some((atk) => effectiveness(atk, def, gen) > 1));
  const uncovered = all.filter((def) => !covered.includes(def));
  return { covered, uncovered, total: all.length };
}

export type Suggestion = { type: TypeName; resists: TypeName[]; covers: TypeName[]; score: number };

/**
 * Que tipo um próximo membro deveria ter?
 * Pontua cada tipo pelos pontos fracos do time que ele resiste
 * e pelos tipos sem cobertura que ele acerta super efetivo.
 */
export function suggestTypes(team: Typed[], limit = 3, gen = 9): Suggestion[] {
  if (team.length === 0) return [];
  const problems = defenseTable(team, gen)
    .filter((r) => r.problem || r.weak > r.resist + r.immune)
    .map((r) => r.attack);
  const { uncovered } = offensiveCoverage(team, gen);
  const owned = new Set(team.flatMap((p) => p.types));

  return typesOfGen(gen)
    .map((type) => {
      const resists = problems.filter((atk) => effectiveness(atk, type, gen) < 1);
      const covers = uncovered.filter((def) => effectiveness(type, def, gen) > 1);
      // Tipo repetido vale menos: diversidade ajuda.
      const score = resists.length * 2 + covers.length - (owned.has(type) ? 2 : 0);
      return { type, resists, covers, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
