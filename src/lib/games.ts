/**
 * Jogos para os quais dá pra montar um time.
 * - Oficiais: Pokédex, golpes e regras vêm da PokéAPI (grupo de versões e Pokédex regionais).
 * - Hacks: a PokéAPI não tem os dados; usamos só o que se sabe (gerações incluídas e regras
 *   modernas) e avisamos em vez de bloquear.
 */

export type FormKind = "alola" | "galar" | "hisui" | "paldea" | "mega" | "primal" | "gmax";

export type Game = {
  id: string;
  label: string;
  short: string;
  gen: number;
  region: string;
  kind: "official" | "hack";
  /** Grupo de versões da PokéAPI (golpes e Pokédex). Hacks usam o mais recente. */
  versionGroup: string;
  /** Pokédex regionais da PokéAPI que definem quem existe no jogo. */
  pokedexes: string[];
  /** Formas especiais que existem no jogo. */
  forms: FormKind[];
  tera: boolean;
  /** Duas cores de capa (as das versões do jogo). */
  colors: [string, string];
  /** Pokémon que estampa o card do jogo (id da arte oficial). */
  mascot: number;
  /** Hacks: até qual geração o jogo tem Pokémon. */
  maxGen?: number;
  note?: string;
};

export const GAMES: Game[] = [
  { id: "red-blue", label: "Red / Blue", short: "RB", gen: 1, region: "Kanto", kind: "official", versionGroup: "red-blue", pokedexes: ["kanto"], forms: [], tera: false, colors: ["#e3350d", "#3b6cc9"], mascot: 6 },
  { id: "yellow", label: "Yellow", short: "Y", gen: 1, region: "Kanto", kind: "official", versionGroup: "yellow", pokedexes: ["kanto"], forms: [], tera: false, colors: ["#f5c518", "#e8a400"], mascot: 25 },
  { id: "gold-silver", label: "Gold / Silver", short: "GS", gen: 2, region: "Johto", kind: "official", versionGroup: "gold-silver", pokedexes: ["original-johto"], forms: [], tera: false, colors: ["#c9a227", "#a7b3c2"], mascot: 250 },
  { id: "crystal", label: "Crystal", short: "C", gen: 2, region: "Johto", kind: "official", versionGroup: "crystal", pokedexes: ["original-johto"], forms: [], tera: false, colors: ["#4fc3d9", "#2a8fb0"], mascot: 245 },
  { id: "ruby-sapphire", label: "Ruby / Sapphire", short: "RS", gen: 3, region: "Hoenn", kind: "official", versionGroup: "ruby-sapphire", pokedexes: ["hoenn"], forms: [], tera: false, colors: ["#c0222f", "#2449b0"], mascot: 383 },
  { id: "emerald", label: "Emerald", short: "E", gen: 3, region: "Hoenn", kind: "official", versionGroup: "emerald", pokedexes: ["hoenn"], forms: [], tera: false, colors: ["#1f9d55", "#0f6e3a"], mascot: 384 },
  { id: "firered-leafgreen", label: "FireRed / LeafGreen", short: "FRLG", gen: 3, region: "Kanto", kind: "official", versionGroup: "firered-leafgreen", pokedexes: ["kanto"], forms: [], tera: false, colors: ["#e8571e", "#4caf50"], mascot: 6 },
  { id: "diamond-pearl", label: "Diamond / Pearl", short: "DP", gen: 4, region: "Sinnoh", kind: "official", versionGroup: "diamond-pearl", pokedexes: ["original-sinnoh"], forms: [], tera: false, colors: ["#5aa9d6", "#d68fb0"], mascot: 483 },
  { id: "platinum", label: "Platinum", short: "Pt", gen: 4, region: "Sinnoh", kind: "official", versionGroup: "platinum", pokedexes: ["extended-sinnoh"], forms: [], tera: false, colors: ["#8c8c99", "#55555f"], mascot: 487 },
  { id: "heartgold-soulsilver", label: "HeartGold / SoulSilver", short: "HGSS", gen: 4, region: "Johto", kind: "official", versionGroup: "heartgold-soulsilver", pokedexes: ["updated-johto"], forms: [], tera: false, colors: ["#d4a82a", "#9fb0c4"], mascot: 249 },
  { id: "black-white", label: "Black / White", short: "BW", gen: 5, region: "Unova", kind: "official", versionGroup: "black-white", pokedexes: ["original-unova"], forms: [], tera: false, colors: ["#2b2b2b", "#d9d9d9"], mascot: 643 },
  { id: "black-2-white-2", label: "Black 2 / White 2", short: "B2W2", gen: 5, region: "Unova", kind: "official", versionGroup: "black-2-white-2", pokedexes: ["updated-unova"], forms: [], tera: false, colors: ["#3a3f4a", "#c9d4dd"], mascot: 646 },
  { id: "x-y", label: "X / Y", short: "XY", gen: 6, region: "Kalos", kind: "official", versionGroup: "x-y", pokedexes: ["kalos-central", "kalos-coastal", "kalos-mountain"], forms: ["mega"], tera: false, colors: ["#1d6ec9", "#c4283a"], mascot: 716 },
  { id: "omega-ruby-alpha-sapphire", label: "Omega Ruby / Alpha Sapphire", short: "ORAS", gen: 6, region: "Hoenn", kind: "official", versionGroup: "omega-ruby-alpha-sapphire", pokedexes: ["updated-hoenn"], forms: ["mega", "primal"], tera: false, colors: ["#b8202d", "#1f4fb3"], mascot: 382 },
  { id: "sun-moon", label: "Sun / Moon", short: "SM", gen: 7, region: "Alola", kind: "official", versionGroup: "sun-moon", pokedexes: ["original-alola"], forms: ["alola", "mega"], tera: false, colors: ["#f59b1a", "#5b4ec2"], mascot: 791 },
  { id: "ultra-sun-ultra-moon", label: "Ultra Sun / Ultra Moon", short: "USUM", gen: 7, region: "Alola", kind: "official", versionGroup: "ultra-sun-ultra-moon", pokedexes: ["updated-alola"], forms: ["alola", "mega", "primal"], tera: false, colors: ["#f2711c", "#3d4fbd"], mascot: 800 },
  { id: "lets-go", label: "Let's Go Pikachu / Eevee", short: "LGPE", gen: 7, region: "Kanto", kind: "official", versionGroup: "lets-go-pikachu-lets-go-eevee", pokedexes: ["letsgo-kanto"], forms: ["alola", "mega"], tera: false, colors: ["#f5c518", "#a1693a"], mascot: 133 },
  { id: "sword-shield", label: "Sword / Shield", short: "SwSh", gen: 8, region: "Galar", kind: "official", versionGroup: "sword-shield", pokedexes: ["galar", "isle-of-armor", "crown-tundra"], forms: ["alola", "galar", "gmax"], tera: false, colors: ["#00a1e9", "#bf004f"], mascot: 888 },
  { id: "brilliant-diamond-shining-pearl", label: "Brilliant Diamond / Shining Pearl", short: "BDSP", gen: 8, region: "Sinnoh", kind: "official", versionGroup: "brilliant-diamond-shining-pearl", pokedexes: ["original-sinnoh"], forms: [], tera: false, colors: ["#4b8fd6", "#d687b3"], mascot: 484 },
  { id: "legends-arceus", label: "Legends: Arceus", short: "PLA", gen: 8, region: "Hisui", kind: "official", versionGroup: "legends-arceus", pokedexes: ["hisui"], forms: ["hisui"], tera: false, colors: ["#d9b26c", "#3f6b5a"], mascot: 493 },
  { id: "scarlet-violet", label: "Scarlet / Violet", short: "SV", gen: 9, region: "Paldea", kind: "official", versionGroup: "scarlet-violet", pokedexes: ["paldea", "kitakami", "blueberry"], forms: ["alola", "galar", "hisui", "paldea"], tera: true, colors: ["#e3350d", "#7b3fbf"], mascot: 1007 },
  { id: "legends-za", label: "Legends: Z-A", short: "PLZA", gen: 9, region: "Kalos", kind: "official", versionGroup: "legends-za", pokedexes: ["lumiose-city", "hyperspace"], forms: ["mega", "alola", "galar", "hisui", "paldea"], tera: false, colors: ["#1fbf8f", "#2a2a2a"], mascot: 718 },
  {
    id: "radical-red",
    label: "Radical Red",
    short: "RR",
    gen: 9,
    region: "Kanto",
    kind: "hack",
    versionGroup: "scarlet-violet",
    pokedexes: [],
    forms: ["alola", "galar", "hisui", "paldea", "mega", "primal"],
    tera: false,
    colors: ["#b3121b", "#1a1a1a"],
    mascot: 6,
    maxGen: 9,
    note: "Hack do FireRed com Pokémon da 1ª à 9ª geração.",
  },
  {
    id: "unbound",
    label: "Unbound",
    short: "UB",
    gen: 8,
    region: "Borrius",
    kind: "hack",
    versionGroup: "scarlet-violet",
    pokedexes: [],
    forms: ["alola", "galar", "mega", "gmax"],
    tera: false,
    colors: ["#2f2a6b", "#c9a227"],
    mascot: 890,
    maxGen: 8,
    note: "Hack do FireRed com Pokémon da 1ª à 8ª geração.",
  },
  {
    id: "quetzal",
    label: "Quetzal",
    short: "QZ",
    gen: 9,
    region: "Hoenn",
    kind: "hack",
    versionGroup: "scarlet-violet",
    pokedexes: [],
    forms: ["alola", "galar", "hisui", "paldea", "mega", "primal"],
    tera: false,
    colors: ["#1a8f6b", "#e0b437"],
    mascot: 384,
    maxGen: 9,
    note: "Hack do Emerald com Pokémon da 1ª à 9ª geração.",
  },
];

export function gameById(id: string | null | undefined) {
  return GAMES.find((g) => g.id === id) ?? null;
}

/** Faixa de números da Pokédex nacional de cada geração (para os hacks). */
const GEN_LAST_ID = [0, 151, 251, 386, 493, 649, 721, 809, 905, 1025];

export function genOfSpecies(id: number) {
  return GEN_LAST_ID.findIndex((last, i) => i > 0 && id <= last);
}

/** Tipo de forma pelo sufixo do nome ("vulpix-alola" → "alola"). */
export function formKindOf(name: string): FormKind | null {
  const m = name.match(/-(alola|galar|hisui|paldea|mega|primal|gmax)(?:-|$)/);
  return (m?.[1] as FormKind) ?? null;
}

const dexCache = new Map<string, Promise<Set<number>>>();

/** Números das espécies que estão nas Pokédex do jogo (fica guardado por 30 dias). */
export function getGameSpecies(game: Game): Promise<Set<number>> {
  const hit = dexCache.get(game.id);
  if (hit) return hit;
  const key = `dexlab:jogo:${game.id}:v1`;
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? "null") as { at: number; ids: number[] } | null;
    if (cached && Date.now() - cached.at < 30 * 24 * 60 * 60 * 1000) {
      const set = Promise.resolve(new Set(cached.ids));
      dexCache.set(game.id, set);
      return set;
    }
  } catch {
    // cache ilegível
  }
  const promise = Promise.all(
    game.pokedexes.map((dex) =>
      fetch(`https://pokeapi.co/api/v2/pokedex/${dex}`)
        .then((r) => {
          if (!r.ok) throw new Error(`PokéAPI ${r.status}`);
          return r.json() as Promise<{ pokemon_entries: { pokemon_species: { url: string } }[] }>;
        })
        .then((d) => d.pokemon_entries.map((e) => Number(e.pokemon_species.url.replace(/\/$/, "").split("/").pop()))),
    ),
  ).then((lists) => {
    const ids = [...new Set(lists.flat())];
    try {
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), ids }));
    } catch {
      // sem espaço
    }
    return new Set(ids);
  });
  promise.catch(() => dexCache.delete(game.id));
  dexCache.set(game.id, promise);
  return promise;
}

export type Availability = "ok" | "blocked" | "warn";

/**
 * Esse Pokémon (espécie + forma) existe no jogo?
 * Oficial: precisa estar na Pokédex do jogo e a forma precisa existir nele → senão "blocked".
 * Hack: só avisa ("warn") se for de uma geração que o hack não tem ou de uma forma incerta.
 */
export function availability(game: Game | null, speciesId: number, name: string, species: Set<number> | null): Availability {
  if (!game) return "ok";
  const form = formKindOf(name);
  if (game.kind === "hack") {
    if (game.maxGen && genOfSpecies(speciesId) > game.maxGen) return "warn";
    if (form && !game.forms.includes(form)) return "warn";
    return "ok";
  }
  if (form && !game.forms.includes(form)) return "blocked";
  if (!species) return "ok"; // ainda carregando: não bloqueia por engano
  return species.has(speciesId) ? "ok" : "blocked";
}
