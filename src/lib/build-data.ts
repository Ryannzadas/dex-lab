/**
 * Dados usados pelo gerador de builds:
 * - sets competitivos da Smogon, por geração (projeto pkmn, a mesma base usada pelo Pokémon Showdown);
 * - dados completos dos golpes do Showdown (recuo, recarga, dois turnos, quedas de atributo…).
 * Ficam em memória; o service worker guarda os arquivos para uso offline.
 */

export type SdSpread = Partial<Record<"hp" | "atk" | "def" | "spa" | "spd" | "spe", number>>;

export type SdSet = {
  moves: (string | string[])[];
  ability?: string | string[];
  item?: string | string[];
  nature?: string | string[];
  evs?: SdSpread | SdSpread[];
  ivs?: SdSpread | SdSpread[];
  teratypes?: string | string[];
};

/** { "Garchomp": { "ou": { "Swords Dance": SdSet, … }, … }, … } */
export type SdSets = Record<string, Record<string, Record<string, SdSet>>>;

export type SdMove = {
  name: string;
  basePower: number;
  accuracy: number | true;
  pp: number;
  type: string;
  category: "Physical" | "Special" | "Status";
  priority: number;
  flags: Record<string, number>;
  self?: { boosts?: Record<string, number>; volatileStatus?: string };
  recoil?: [number, number];
  drain?: [number, number];
  multihit?: number | [number, number];
  selfdestruct?: string;
  ohko?: unknown;
  damage?: string | number;
  boosts?: Record<string, number>;
  heal?: [number, number];
  isZ?: unknown;
  isMax?: unknown;
};

const setsCache = new Map<number, Promise<SdSets>>();
let movesCache: Promise<Record<string, SdMove>> | null = null;

export function getSmogonSets(gen: number): Promise<SdSets> {
  const g = Math.min(9, Math.max(1, gen));
  let p = setsCache.get(g);
  if (!p) {
    p = fetch(`https://pkmn.github.io/smogon/data/sets/gen${g}.json`).then((r) => {
      if (!r.ok) throw new Error(`sets gen${g}: ${r.status}`);
      return r.json() as Promise<SdSets>;
    });
    p.catch(() => setsCache.delete(g));
    setsCache.set(g, p);
  }
  return p;
}

export function getMoveData(): Promise<Record<string, SdMove>> {
  if (!movesCache) {
    movesCache = fetch("https://play.pokemonshowdown.com/data/moves.json").then((r) => {
      if (!r.ok) throw new Error(`moves: ${r.status}`);
      return r.json() as Promise<Record<string, SdMove>>;
    });
    movesCache.catch(() => {
      movesCache = null;
    });
  }
  return movesCache;
}

/** Id do Showdown a partir de qualquer nome: "u-turn" / "U-turn" → "uturn". */
export function sdId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
