/**
 * Tipos, cores, nomes em português e a tabela de efetividade (geração 6 em diante).
 */

export const TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type TypeName = (typeof TYPES)[number];

export const TYPE_INFO: Record<TypeName, { pt: string; color: string }> = {
  normal: { pt: "Normal", color: "#a8a77a" },
  fire: { pt: "Fogo", color: "#ee8130" },
  water: { pt: "Água", color: "#6390f0" },
  electric: { pt: "Elétrico", color: "#f7d02c" },
  grass: { pt: "Planta", color: "#7ac74c" },
  ice: { pt: "Gelo", color: "#96d9d6" },
  fighting: { pt: "Lutador", color: "#c22e28" },
  poison: { pt: "Venenoso", color: "#a33ea1" },
  ground: { pt: "Terra", color: "#e2bf65" },
  flying: { pt: "Voador", color: "#a98ff3" },
  psychic: { pt: "Psíquico", color: "#f95587" },
  bug: { pt: "Inseto", color: "#a6b91a" },
  rock: { pt: "Pedra", color: "#b6a136" },
  ghost: { pt: "Fantasma", color: "#735797" },
  dragon: { pt: "Dragão", color: "#6f35fc" },
  dark: { pt: "Sombrio", color: "#705746" },
  steel: { pt: "Aço", color: "#b7b7ce" },
  fairy: { pt: "Fada", color: "#d685ad" },
};

/** Só os valores diferentes de 1: CHART[ataque][defesa]. */
const CHART: Partial<Record<TypeName, Partial<Record<TypeName, number>>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function effectiveness(attack: TypeName, defense: TypeName): number {
  return CHART[attack]?.[defense] ?? 1;
}

/** Multiplicador de um ataque contra um Pokémon de um ou dois tipos. */
export function multiplier(attack: TypeName, defenders: TypeName[]): number {
  return defenders.reduce((m, d) => m * effectiveness(attack, d), 1);
}

export function isTypeName(value: string): value is TypeName {
  return (TYPES as readonly string[]).includes(value);
}
