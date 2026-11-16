import { isTypeName, type TypeName } from "./types";

/**
 * Acesso à PokéAPI (https://pokeapi.co) com cache.
 * - A lista de nomes fica no localStorage por 7 dias (é grande e quase nunca muda).
 * - Os detalhes ficam em memória durante a visita.
 */

const API = "https://pokeapi.co/api/v2";
const LAST_ID = 1025; // última espécie da geração 9
const LIST_KEY = "dexlab:lista:v2"; // v2: inclui as formas regionais e Mega
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
  moves: LearnedMove[];
  /** Jogo de onde vieram os golpes (ex.: "scarlet-violet"). */
  movesVersion: string | null;
  /** Golpes por grupo de versões, para montar time de um jogo específico. */
  movesByVersion: Record<string, LearnedMove[]>;
  /** Tipos antigos: `types` valia até a geração `upToGen` (ex.: Clefairy era Normal até a 5ª). */
  pastTypes: { upToGen: number; types: TypeName[] }[];
};

export type EvolutionStage = { id: number; name: string; depth: number; how: string | null };

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

export function cryUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
}

/** Grito em MP3 (Showdown), usado como alternativa no iPhone/Safari onde .ogg não toca. */
export function cryMp3Url(name: string) {
  const base = name.replace(FORM_SUFFIX, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `https://play.pokemonshowdown.com/audio/cries/${base}.mp3`;
}

/** "mr-mime" → "Mr Mime". */
export function displayName(name: string) {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Sufixos de formas que valem a pena na busca: regionais e transformações de batalha. */
const FORM_SUFFIX = /-(alola|galar(?:-[a-z]+)?|hisui|paldea(?:-[a-z-]+)?|mega(?:-[xyz])?|primal|gmax)$/;

/** "alola" → "Alola", "mega-x" → "Mega X", "gmax" → "Gigantamax". */
export function formLabel(suffix: string) {
  const known: Record<string, string> = { gmax: "Gigantamax", "mega-x": "Mega X", "mega-y": "Mega Y", "mega-z": "Mega Z" };
  return known[suffix] ?? displayName(suffix);
}

/** Sufixos padrão da PokéAPI que não precisam aparecer no nome ("mimikyu-disguised" → "Mimikyu"). */
const DEFAULT_FORM_SUFFIX =
  /-(disguised|normal|ordinary|incarnate|aria|standard|altered|land|red-striped|baile|midday|solo|average|50|single-strike|amped|ice|full-belly|male|plant|two-segment|zero|family-of-four|green-plumage|curly)$/;

/** Nome de um Pokémon com a forma entre parênteses: "vulpix-alola" → "Vulpix (Alola)". */
export function pokemonName(name: string) {
  const clean = name.replace(DEFAULT_FORM_SUFFIX, "");
  const m = clean.match(FORM_SUFFIX);
  if (!m) return displayName(clean);
  return `${displayName(clean.slice(0, m.index))} (${formLabel(m[1])})`;
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

/**
 * Todas as espécies + formas regionais, Mega, Primal e Gigantamax (só id e nome), para a busca.
 * Formas cosméticas (bonés, totens…) ficam de fora.
 */
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

  listPromise = getJson<{ results: { name: string; url: string }[] }>(`${API}/pokemon?limit=2000`)
    .then((data) => {
      const list = data.results
        .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
        .filter((p) => p.id <= LAST_ID || (FORM_SUFFIX.test(p.name) && !/-(cap|totem|starter)/.test(p.name)));
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

const pokemonCache = new Map<number | string, Promise<Pokemon>>();

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
  past_types?: { generation: { name: string }; types: { type: { name: string } }[] }[];
  moves: {
    move: { name: string };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: { name: string };
      version_group: { name: string };
    }[];
  }[];
};

export type MoveMethod = "level" | "machine" | "egg" | "tutor";
export type LearnedMove = { name: string; method: MoveMethod; level: number };

/** Jogos mais recentes primeiro: os golpes vêm do mais novo em que o Pokémon aparece. */
const VERSION_PRIORITY = [
  "scarlet-violet",
  "legends-arceus",
  "brilliant-diamond-shining-pearl",
  "sword-shield",
  "lets-go-pikachu-lets-go-eevee",
  "ultra-sun-ultra-moon",
  "sun-moon",
  "omega-ruby-alpha-sapphire",
  "x-y",
];

function pickMoves(raw: RawPokemon["moves"]): { version: string | null; moves: LearnedMove[] } {
  const groups = new Set(raw.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)));
  const version =
    VERSION_PRIORITY.find((v) => groups.has(v)) ??
    [...groups].sort(
      (a, b) =>
        raw.filter((m) => m.version_group_details.some((d) => d.version_group.name === b)).length -
        raw.filter((m) => m.version_group_details.some((d) => d.version_group.name === a)).length,
    )[0] ??
    null;
  if (!version) return { version: null, moves: [] };

  const methods: Record<string, MoveMethod> = { "level-up": "level", machine: "machine", egg: "egg", tutor: "tutor" };
  const moves: LearnedMove[] = [];
  const seen = new Set<string>();
  for (const m of raw) {
    for (const d of m.version_group_details) {
      const method = methods[d.move_learn_method.name];
      if (d.version_group.name !== version || !method) continue;
      const key = `${m.move.name}|${method}|${d.level_learned_at}`;
      if (seen.has(key)) continue; // a API às vezes repete a mesma entrada
      seen.add(key);
      moves.push({ name: m.move.name, method, level: d.level_learned_at });
    }
  }
  return { version, moves };
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

/** Todos os golpes separados por grupo de versões (sem repetições). */
function groupMoves(raw: RawPokemon["moves"]): Record<string, LearnedMove[]> {
  const methods: Record<string, MoveMethod> = { "level-up": "level", machine: "machine", egg: "egg", tutor: "tutor" };
  const out: Record<string, LearnedMove[]> = {};
  const seen = new Set<string>();
  for (const m of raw) {
    for (const d of m.version_group_details) {
      const method = methods[d.move_learn_method.name];
      if (!method) continue;
      const vg = d.version_group.name;
      const key = `${vg}|${m.move.name}|${method}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      (out[vg] ??= []).push({ name: m.move.name, method, level: d.level_learned_at });
    }
  }
  return out;
}

/** Tipos do Pokémon na geração do jogo (usa os tipos antigos quando mudaram depois). */
export function typesInGen(p: Pokemon, gen = 9): TypeName[] {
  const past = p.pastTypes.find((pt) => gen <= pt.upToGen);
  return past ? past.types : p.types;
}

/**
 * Golpes do Pokémon num grupo de versões. Se o jogo não tiver dados (ou não for informado),
 * cai para os golpes mais recentes e avisa com `fallback`.
 */
export function movesFor(p: Pokemon, versionGroup: string | null): { moves: LearnedMove[]; version: string | null; fallback: boolean } {
  if (versionGroup && p.movesByVersion[versionGroup]?.length) {
    return { moves: p.movesByVersion[versionGroup], version: versionGroup, fallback: false };
  }
  return { moves: p.moves, version: p.movesVersion, fallback: !!versionGroup };
}

export function getPokemon(id: number | string): Promise<Pokemon> {
  const hit = pokemonCache.get(id);
  if (hit) return hit;

  const promise = getJson<RawPokemon>(`${API}/pokemon/${id}`).then((p) => {
    const { version, moves } = pickMoves(p.moves);
    return {
      id: p.id,
      name: p.name,
      types: p.types.map((t) => t.type.name).filter(isTypeName),
      stats: p.stats.map((s) => ({ key: s.stat.name, value: s.base_stat })),
      abilities: p.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
      height: p.height,
      weight: p.weight,
      speciesUrl: p.species.url,
      cry: p.cries?.latest ?? p.cries?.legacy ?? null,
      moves,
      movesVersion: version,
      movesByVersion: groupMoves(p.moves),
      pastTypes: (p.past_types ?? [])
        .map((pt) => ({
          upToGen: ROMAN.indexOf(pt.generation.name.replace("generation-", "")) + 1,
          types: pt.types.map((x) => x.type.name).filter(isTypeName),
        }))
        .filter((pt) => pt.upToGen > 0 && pt.types.length > 0)
        .sort((a, b) => a.upToGen - b.upToGen),
    };
  });
  promise.catch(() => pokemonCache.delete(id));
  pokemonCache.set(id, promise);
  return promise;
}

/* ------------------------------------------------------------------ */
/* Espécie: categoria, descrição, formas e evolução                    */
/* ------------------------------------------------------------------ */

type RawSpecies = {
  id: number;
  name: string;
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string }; version: { name: string } }[];
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
  evolution_chain: { url: string } | null;
  is_legendary: boolean;
  is_mythical: boolean;
  generation: { name: string };
};

export type Variety = { id: number; name: string; label: string; isDefault: boolean };

export type Species = {
  id: number;
  name: string;
  genus: string | null;
  flavor: string | null;
  flavorVersion: string | null;
  varieties: Variety[];
  evolutionUrl: string | null;
  badge: "lendário" | "mítico" | null;
  generation: number;
};

const jsonCache = new Map<string, Promise<unknown>>();
function getCached<T>(url: string): Promise<T> {
  const hit = jsonCache.get(url);
  if (hit) return hit as Promise<T>;
  const promise = getJson<T>(url);
  promise.catch(() => jsonCache.delete(url));
  jsonCache.set(url, promise);
  return promise;
}

/** Nome amigável para cada forma: "charizard-mega-x" → "Mega X". */
function varietyLabel(species: string, name: string, isDefault: boolean) {
  if (isDefault) return "Normal";
  const rest = name.startsWith(`${species}-`) ? name.slice(species.length + 1) : name;
  const known: Record<string, string> = { mega: "Mega", primal: "Primal" };
  return known[rest] ?? formLabel(rest);
}

const GENERATIONS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"];

export async function getSpecies(id: number): Promise<Species> {
  const s = await getCached<RawSpecies>(`${API}/pokemon-species/${id}`);
  // A PokéAPI quase não tem textos em português; usamos o inglês mais recente.
  const flavors = s.flavor_text_entries.filter((f) => f.language.name === "en");
  const flavor = flavors.at(-1) ?? null;
  const varieties = s.varieties
    // Formas cosméticas de evento (bonés do Pikachu, totens) não mudam nada na prática.
    .filter((v) => v.is_default || !/-(cap|totem|starter)/.test(v.pokemon.name))
    .map((v) => ({
      id: idFromUrl(v.pokemon.url),
      name: v.pokemon.name,
      label: varietyLabel(s.name, v.pokemon.name, v.is_default),
      isDefault: v.is_default,
    }));

  return {
    id: s.id,
    name: s.name,
    genus: s.genera.find((g) => g.language.name === "en")?.genus ?? null,
    flavor: flavor ? flavor.flavor_text.replace(/[\f\n\r­]+/g, " ").replace(/\s+/g, " ").trim() : null,
    flavorVersion: flavor ? displayName(flavor.version.name) : null,
    varieties,
    evolutionUrl: s.evolution_chain?.url ?? null,
    badge: s.is_mythical ? "mítico" : s.is_legendary ? "lendário" : null,
    generation: GENERATIONS.indexOf(s.generation.name.replace("generation-", "")) + 1,
  };
}

type EvolutionDetail = {
  trigger: { name: string };
  min_level: number | null;
  item: { name: string } | null;
  held_item: { name: string } | null;
  min_happiness: number | null;
  min_affection: number | null;
  time_of_day: string;
  known_move: { name: string } | null;
  known_move_type: { name: string } | null;
  location: { name: string } | null;
};

type ChainLink = {
  species: { name: string; url: string };
  evolution_details: EvolutionDetail[];
  evolves_to: ChainLink[];
};

/** "Nv. 16", "Fire Stone", "Amizade (dia)", "Troca segurando Metal Coat"… */
function describeEvolution(details: EvolutionDetail[]): string | null {
  const d = details[0];
  if (!d) return null;
  const parts: string[] = [];
  if (d.trigger.name === "trade") parts.push("Troca");
  if (d.min_level) parts.push(`Nv. ${d.min_level}`);
  if (d.item) parts.push(displayName(d.item.name));
  if (d.held_item) parts.push(`segurando ${displayName(d.held_item.name)}`);
  if (d.min_happiness || d.min_affection) parts.push("Amizade");
  if (d.known_move) parts.push(`sabendo ${displayName(d.known_move.name)}`);
  if (d.known_move_type) parts.push(`golpe ${displayName(d.known_move_type.name)}`);
  if (d.location) parts.push(`em ${displayName(d.location.name)}`);
  if (d.time_of_day === "day") parts.push("(dia)");
  if (d.time_of_day === "night") parts.push("(noite)");
  if (parts.length === 0 && d.trigger.name === "level-up") parts.push("Subir de nível");
  if (parts.length === 0) parts.push("Condição especial");
  return parts.join(" ");
}

/** Cadeia de evolução achatada, com a profundidade e a condição de cada estágio. */
export async function getEvolutionChain(url: string | null, fallback: { id: number; name: string }): Promise<EvolutionStage[]> {
  if (!url) return [{ ...fallback, depth: 0, how: null }];
  const chain = await getCached<{ chain: ChainLink }>(url);
  const stages: EvolutionStage[] = [];
  const walk = (link: ChainLink, depth: number) => {
    stages.push({
      id: idFromUrl(link.species.url),
      name: link.species.name,
      depth,
      how: depth === 0 ? null : describeEvolution(link.evolution_details),
    });
    link.evolves_to.forEach((next) => walk(next, depth + 1));
  };
  walk(chain.chain, 0);
  return stages;
}

/** Atalho usado pelo comparador. */
export async function getEvolution(pokemon: Pokemon): Promise<EvolutionStage[]> {
  const species = await getCached<RawSpecies>(pokemon.speciesUrl);
  return getEvolutionChain(species.evolution_chain?.url ?? null, pokemon);
}

/** Id da espécie de um Pokémon (formas como Mega têm id próprio, acima de 10000). */
export function speciesIdOf(pokemon: Pokemon) {
  return idFromUrl(pokemon.speciesUrl);
}

/* ------------------------------------------------------------------ */
/* Tradução PT/EN da Pokédex e lista completa de itens (Firma League) */
/* ------------------------------------------------------------------ */

const PT_CACHE_PREFIX = "dexlab:pt:";
const ptMemCache = new Map<string, Promise<string>>();

async function translateViaGoogle(text: string): Promise<string> {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(text)}`,
  );
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as [[string][]];
  const out = data[0].map((r) => r[0]).join("").trim();
  if (!out) throw new Error("vazio");
  return out;
}

async function translateViaMyMemory(text: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`,
  );
  const data = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
  if (data.responseStatus !== 200 || !data.responseData?.translatedText) throw new Error("mymemory");
  return data.responseData.translatedText.trim();
}

/** Traduz descrição/categoria da Pokédex para português, guardando no cache local. */
export function translateToPt(raw: string): Promise<string> {
  const text = raw.trim();
  if (!text) return Promise.resolve("");
  const hit = ptMemCache.get(text);
  if (hit) return hit;

  try {
    const saved = localStorage.getItem(PT_CACHE_PREFIX + text);
    if (saved) return Promise.resolve(saved);
  } catch {
    // segue sem cache
  }

  const promise = translateViaGoogle(text)
    .catch(() => translateViaMyMemory(text))
    .then((translated) => {
      try {
        localStorage.setItem(PT_CACHE_PREFIX + text, translated);
      } catch {
        // sem espaço
      }
      return translated;
    });
  promise.catch(() => ptMemCache.delete(text));
  ptMemCache.set(text, promise);
  return promise;
}

const ITEMS_KEY = "dexlab:itens:v1";
let holdablePromise: Promise<string[]> | null = null;

/** Todos os itens seguráveis em batalha da PokéAPI (como na Firma League). */
export function getHoldableItems(): Promise<string[]> {
  if (holdablePromise) return holdablePromise;
  try {
    const cached = JSON.parse(localStorage.getItem(ITEMS_KEY) ?? "null") as { at: number; items: string[] } | null;
    if (cached && Date.now() - cached.at < WEEK * 4) return (holdablePromise = Promise.resolve(cached.items));
  } catch {
    // ignora
  }
  holdablePromise = Promise.all([
    getJson<{ items: { name: string }[] }>(`${API}/item-attribute/holdable-active`),
    getJson<{ items: { name: string }[] }>(`${API}/item-attribute/holdable-passive`).catch(() => ({ items: [] })),
  ])
    .then(([a, b]) => {
      const items = [...new Set([...a.items, ...b.items].map((i) => displayName(i.name)))].sort((x, y) =>
        x.localeCompare(y),
      );
      try {
        localStorage.setItem(ITEMS_KEY, JSON.stringify({ at: Date.now(), items }));
      } catch {
        // ignora
      }
      return items;
    })
    .catch((err) => {
      holdablePromise = null;
      throw err;
    });
  return holdablePromise;
}
