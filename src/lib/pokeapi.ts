import { isTypeName, type TypeName } from "./types";

/**
 * Acesso à PokéAPI (https://pokeapi.co) com cache.
 * - A lista de nomes fica no localStorage por 7 dias (é grande e quase nunca muda).
 * - Os detalhes ficam em memória durante a visita.
 */

const API = "https://pokeapi.co/api/v2";
const LAST_ID = 1025; // última espécie da geração 9
const LIST_KEY = "dexlab:lista:v1";
const WEEK = 7 * 24 * 60 * 60 * 1000;

export type PokemonRef = { id: number; name: string };

export type Stat = { key: StatKey; value: number };
export type StatKey = "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed";

export type Pokemon = {
  id: number;
  name: string;
  types: TypeName[];
  stats: Stat[];
  abilities: { name: string; hidden: boolean }[];
  height: number; // decímetros
  weight: number; // hectogramas
  speciesUrl: string;
  /** Grito do Pokémon (arquivo .ogg). `latest` é o atual; `legacy`, o dos jogos antigos. */
  cry: string | null;
};

export type EvolutionStage = { id: number; name: string; depth: number };

export const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP",
  attack: "Ataque",
  defense: "Defesa",
  "special-attack": "At. Esp.",
  "special-defense": "Def. Esp.",
  speed: "Velocidade",
};

export function artworkUrl(id: number, shiny = false) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? "shiny/" : ""}${id}.png`;
}

export function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/** "mr-mime" → "Mr Mime". */
export function displayName(name: string) {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function idFromUrl(url: string) {
  return Number(url.replace(/\/$/, "").split("/").pop());
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokéAPI ${res.status}`);
  return res.json() as Promise<T>;
}

let listPromise: Promise<PokemonRef[]> | null = null;

/** Todas as espécies (só id e nome), para a busca. */
export function getPokemonList(): Promise<PokemonRef[]> {
  if (listPromise) return listPromise;

  try {
    const cached = JSON.parse(localStorage.getItem(LIST_KEY) ?? "null") as
      | { at: number; list: PokemonRef[] }
      | null;
    if (cached && Date.now() - cached.at < WEEK) return (listPromise = Promise.resolve(cached.list));
  } catch {
    // cache ilegível: busca de novo
  }

  listPromise = getJson<{ results: { name: string; url: string }[] }>(
    `${API}/pokemon-species?limit=${LAST_ID}`,
  )
    .then((data) => {
      const list = data.results.map((r) => ({ id: idFromUrl(r.url), name: r.name }));
      try {
        localStorage.setItem(LIST_KEY, JSON.stringify({ at: Date.now(), list }));
      } catch {
        // sem espaço ou modo privado: segue sem cache
      }
      return list;
    })
    .catch((error) => {
      listPromise = null;
      throw error;
    });
  return listPromise;
}

const pokemonCache = new Map<number, Promise<Pokemon>>();

type RawPokemon = {
  id: number;
  name: string;
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: StatKey } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  height: number;
  weight: number;
  species: { url: string };
  cries?: { latest: string | null; legacy: string | null };
};

export function getPokemon(id: number): Promise<Pokemon> {
  const hit = pokemonCache.get(id);
  if (hit) return hit;

  const promise = getJson<RawPokemon>(`${API}/pokemon/${id}`).then((p) => ({
    id: p.id,
    name: p.name,
    types: p.types.map((t) => t.type.name).filter(isTypeName),
    stats: p.stats.map((s) => ({ key: s.stat.name, value: s.base_stat })),
    abilities: p.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    height: p.height,
    weight: p.weight,
    speciesUrl: p.species.url,
    cry: p.cries?.latest ?? p.cries?.legacy ?? null,
  }));
  promise.catch(() => pokemonCache.delete(id));
  pokemonCache.set(id, promise);
  return promise;
}

type ChainLink = { species: { name: string; url: string }; evolves_to: ChainLink[] };

/** Cadeia de evolução achatada, com a profundidade de cada estágio. */
export async function getEvolution(pokemon: Pokemon): Promise<EvolutionStage[]> {
  const species = await getJson<{ evolution_chain: { url: string } | null }>(pokemon.speciesUrl);
  if (!species.evolution_chain) return [{ id: pokemon.id, name: pokemon.name, depth: 0 }];
  const chain = await getJson<{ chain: ChainLink }>(species.evolution_chain.url);

  const stages: EvolutionStage[] = [];
  const walk = (link: ChainLink, depth: number) => {
    stages.push({ id: idFromUrl(link.species.url), name: link.species.name, depth });
    link.evolves_to.forEach((next) => walk(next, depth + 1));
  };
  walk(chain.chain, 0);
  return stages;
}
