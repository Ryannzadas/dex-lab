import { isLegendaryOrMythical } from "./dex";
import type { Availability } from "./games";
import type { PokemonRef } from "./pokeapi";
import { effectiveness, multiplier, typesOfGen, type TypeName } from "./types";
import { coverageFromTypes, defenseTable } from "./analysis";

/**
 * Curadoria de Pokémon fortes (totalmente evoluídos e favoritos de campanha/competitivo)
 * de todas as 9 gerações, separados entre iniciais, destaques de campanha e lendários.
 *
 * Quando o time tem um jogo escolhido, o motor filtra apenas quem existe na Pokédex
 * daquele jogo (`check(id, name) === "ok"`) e pontua cada um pelas fraquezas do time
 * que ele cobre na defesa e pelos tipos que ele acerta no ataque.
 */

export const STARTER_FINAL_IDS = new Set<number>([
  3, 6, 9, // Kanto
  154, 157, 160, // Johto
  254, 257, 260, // Hoenn
  389, 392, 395, // Sinnoh
  497, 500, 503, // Unova
  652, 655, 658, // Kalos
  724, 727, 730, // Alola
  812, 815, 818, // Galar
  908, 911, 914, // Paldea
]);

/**
 * Pokémon fortes de campanha (sem contar iniciais e lendários).
 * Tier 2 = estrelas clássicas de qualquer time (Gyarados, Gardevoir, Garchomp, Lucario, Excadrill…);
 * Tier 1 = ótimas opções de cobertura regional.
 */
export const TIER_2_STAPLES = new Set<number>([
  // Gen 1
  34, 59, 65, 68, 94, 103, 112, 121, 130, 131, 134, 135, 142, 143, 149,
  // Gen 2
  169, 181, 184, 196, 197, 212, 214, 227, 230, 242, 248,
  // Gen 3
  282, 286, 306, 310, 330, 350, 373, 376,
  // Gen 4
  398, 405, 407, 445, 448, 461, 462, 464, 468, 472, 473, 475, 479,
  // Gen 5
  530, 553, 555, 560, 598, 609, 612, 625, 635, 637,
  // Gen 6
  663, 681, 700, 701, 706, 715,
  // Gen 7
  748, 750, 768, 778, 784,
  // Gen 8
  823, 849, 858, 861, 887, 899, 900, 901, 903,
  // Gen 9
  923, 934, 936, 937, 959, 964, 979, 980, 983, 998, 1000, 1018,
]);

export const TIER_1_STAPLES = new Set<number>([
  // Gen 1
  18, 26, 31, 36, 38, 45, 51, 55, 62, 71, 73, 76, 80, 82, 85, 91, 106, 110, 115, 123, 125, 126, 127, 128, 136,
  // Gen 2
  164, 171, 178, 186, 195, 205, 208, 210, 217, 221, 229, 232, 233, 241,
  // Gen 3
  262, 272, 275, 277, 289, 295, 297, 302, 308, 319, 323, 324, 334, 342, 344, 348, 356, 359, 365,
  // Gen 4
  400, 419, 423, 424, 426, 429, 430, 437, 442, 450, 452, 454, 465, 466, 467, 469, 470, 471, 474, 476, 477, 478,
  // Gen 5
  508, 523, 526, 534, 537, 542, 545, 547, 549, 558, 561, 563, 565, 567, 571, 576, 579, 586, 589, 591, 593, 596, 604, 614, 620, 623, 628, 630, 632,
  // Gen 6
  660, 668, 671, 673, 675, 687, 689, 691, 693, 695, 697, 699, 707, 709, 713,
  // Gen 7
  733, 738, 740, 743, 745, 746, 752, 754, 758, 760, 763, 764, 770, 776, 777, 781,
  // Gen 8
  826, 834, 839, 842, 844, 847, 851, 853, 855, 862, 865, 867, 870, 873, 879, 880, 882, 884, 902, 904,
  // Gen 9
  920, 927, 930, 939, 941, 945, 947, 949, 952, 956, 966, 968, 970, 972, 975, 977, 987, 990, 991, 992, 994, 1005, 1006, 1013, 1019,
]);

export type RecommendedMon = {
  id: number;
  dexNumber: number;
  name: string;
  types: TypeName[];
  score: number;
  /** Tipos de ataque problemáticos para o time que este Pokémon resiste/imuniza. */
  resists: TypeName[];
  /** Tipos sem cobertura ofensiva no time que o STAB deste Pokémon acerta 2×. */
  covers: TypeName[];
  role: "inicial" | "destaque" | "lendário";
};

function baseTierScore(dexNumber: number, isLegend: boolean): { tier: number; role: RecommendedMon["role"] } | null {
  if (isLegend) return { tier: 3, role: "lendário" };
  if (STARTER_FINAL_IDS.has(dexNumber)) return { tier: 3.2, role: "inicial" };
  if (TIER_2_STAPLES.has(dexNumber)) return { tier: 3, role: "destaque" };
  if (TIER_1_STAPLES.has(dexNumber)) return { tier: 2, role: "destaque" };
  return null;
}

/**
 * Sugere os melhores Pokémon que existem no jogo atual para entrar no time.
 * - Com time vazio: mostra os melhores iniciais e destaques daquele jogo com variedade de tipos.
 * - Com 1 a 5 membros: prioriza quem cobre as fraquezas defensivas e ofensivas do time.
 */
export function recommendPokemonForTeam({
  list,
  typeIndex,
  teamTypes,
  teamIds,
  gen,
  check,
  includeLegendaries = false,
  filterRole = "todos",
  limit = 6,
}: {
  list: PokemonRef[];
  typeIndex: Record<number, TypeName[]>;
  teamTypes: { types: TypeName[] }[];
  teamIds: number[];
  gen: number;
  check: (speciesId: number, name: string) => Availability;
  includeLegendaries?: boolean;
  filterRole?: "todos" | "inicial" | "destaque" | "lendário";
  limit?: number;
}): RecommendedMon[] {
  const validGenTypes = new Set(typesOfGen(gen));
  const usedIds = new Set(teamIds);
  const ownedTypes = new Set(teamTypes.flatMap((t) => t.types));

  // Problemas defensivos e lacunas ofensivas atuais do time.
  const defRows = teamTypes.length > 0 ? defenseTable(teamTypes, gen) : [];
  const problemAttacks = defRows
    .filter((r) => r.problem || r.weak > r.resist + r.immune)
    .sort((a, b) => b.weak - (b.resist + b.immune) - (a.weak - (a.resist + a.immune)))
    .map((r) => r.attack);
  const majorWeaknesses = new Set(defRows.filter((r) => r.weak >= 2).map((r) => r.attack));
  const { uncovered } =
    teamTypes.length > 0
      ? coverageFromTypes(teamTypes.flatMap((t) => t.types), gen)
      : { uncovered: [] as TypeName[] };

  const candidates: RecommendedMon[] = [];

  for (const p of list) {
    // Só sugere espécies base (ou formas regionais) e que ainda não estão no time.
    if (p.id > 1025 || usedIds.has(p.id)) continue;
    const isLegend = isLegendaryOrMythical(p.id);
    if (isLegend && !includeLegendaries && filterRole !== "lendário") continue;

    const meta = baseTierScore(p.id, isLegend);
    if (!meta) continue;
    if (filterRole !== "todos" && meta.role !== filterRole) continue;

    const status = check(p.id, p.name);
    if (status === "blocked") continue;

    // Tipos do Pokémon filtrados pela geração do jogo (ex.: antes da Gen 6 não havia Fada).
    const rawTypes = typeIndex[p.id];
    if (!rawTypes || rawTypes.length === 0) continue;
    const types = rawTypes.filter((t) => validGenTypes.has(t));
    if (types.length === 0) continue;

    if (teamTypes.length === 0) {
      // Time vazio: pontua pelo tier e dá preferência a iniciais e destaques icônicos.
      candidates.push({
        id: p.id,
        dexNumber: p.id,
        name: p.name,
        types,
        score: meta.tier * 10 + (status === "ok" ? 2 : 0),
        resists: [],
        covers: [],
        role: meta.role,
      });
      continue;
    }

    // Com membros no time: calcula quantas fraquezas do time ele resiste e quantos tipos sem cobertura ele acerta.
    const resists = problemAttacks.filter((atk) => multiplier(atk, types, gen) < 1);
    const immunities = problemAttacks.filter((atk) => multiplier(atk, types, gen) === 0);
    const covers = uncovered.filter((def) => types.some((atk) => effectiveness(atk, def, gen) > 1));

    // Penaliza se o candidato também for fraco aos tipos que já machucam 2+ membros do time.
    let sharedWeakPenalty = 0;
    for (const atk of majorWeaknesses) {
      if (multiplier(atk, types, gen) > 1) sharedWeakPenalty += 2.5;
    }

    // Bônus por trazer tipos novos que ainda não existem no time.
    const newTypesCount = types.filter((t) => !ownedTypes.has(t)).length;

    const score =
      resists.length * 4 +
      immunities.length * 2 +
      covers.length * 2.2 +
      newTypesCount * 2.5 +
      meta.tier * 1.8 -
      sharedWeakPenalty;

    candidates.push({
      id: p.id,
      dexNumber: p.id,
      name: p.name,
      types,
      score,
      resists,
      covers,
      role: meta.role,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.dexNumber - b.dexNumber);

  // Escolhe os melhores garantindo diversidade de tipos primários para não sugerir 6 Pokémon do mesmo tipo.
  const picked: RecommendedMon[] = [];
  const primaryCount = new Map<TypeName, number>();
  for (const c of candidates) {
    if (picked.length >= limit) break;
    const prim = c.types[0];
    const count = primaryCount.get(prim) ?? 0;
    if (count >= 2 && candidates.length > limit * 2) continue;
    primaryCount.set(prim, count + 1);
    picked.push(c);
  }
  return picked.length >= limit ? picked : candidates.slice(0, limit);
}

/**
 * Sorteia até 6 Pokémon válidos para um desafio (Time Aleatório ou Monotype) no jogo escolhido.
 */
export function rollChallengeTeam({
  list,
  typeIndex,
  gen,
  check,
  monotype = null,
  onlyStrong = true,
  includeLegendaries = false,
  count = 6,
}: {
  list: PokemonRef[];
  typeIndex: Record<number, TypeName[]>;
  gen: number;
  check: (speciesId: number, name: string) => Availability;
  monotype?: TypeName | null;
  onlyStrong?: boolean;
  includeLegendaries?: boolean;
  count?: number;
}): PokemonRef[] {
  const validGenTypes = new Set(typesOfGen(gen));

  const filterPool = (strongOnly: boolean) =>
    list.filter((p) => {
      if (p.id > 1025) return false;
      const isLegend = isLegendaryOrMythical(p.id);
      if (isLegend && !includeLegendaries) return false;
      if (strongOnly && !baseTierScore(p.id, isLegend)) return false;
      if (check(p.id, p.name) === "blocked") return false;
      const rawTypes = typeIndex[p.id];
      if (!rawTypes || rawTypes.length === 0) return false;
      const types = rawTypes.filter((t) => validGenTypes.has(t));
      if (types.length === 0) return false;
      if (monotype && !types.includes(monotype)) return false;
      return true;
    });

  let pool = filterPool(onlyStrong);
  // Se um Monotype específico tiver menos de 6 Pokémon "fortes" naquele jogo, completa com qualquer espécie daquele tipo no jogo.
  if (pool.length < count && onlyStrong) {
    const broader = filterPool(false);
    const ids = new Set(pool.map((x) => x.id));
    pool = [...pool, ...broader.filter((x) => !ids.has(x.id))];
  }

  // Embaralha (Fisher-Yates) e, quando não for Monotype, tenta não repetir o mesmo tipo primário mais de 2 vezes.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (monotype) return shuffled.slice(0, count);

  const picked: PokemonRef[] = [];
  const typeCount = new Map<TypeName, number>();
  for (const p of shuffled) {
    if (picked.length >= count) break;
    const t0 = typeIndex[p.id]?.[0];
    if (t0 && (typeCount.get(t0) ?? 0) >= 2 && shuffled.length > count * 2) continue;
    if (t0) typeCount.set(t0, (typeCount.get(t0) ?? 0) + 1);
    picked.push(p);
  }
  return picked.length >= count ? picked : shuffled.slice(0, count);
}
