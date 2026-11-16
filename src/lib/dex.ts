import type { PokemonRef } from "./pokeapi";
import { isTypeName, TYPES, type TypeName } from "./types";

/** Regiões na ordem da Pokédex nacional, com a faixa de números de cada geração. */
export const REGIONS = [
  { id: "kanto", label: "Kanto", gen: 1, from: 1, to: 151 },
  { id: "johto", label: "Johto", gen: 2, from: 152, to: 251 },
  { id: "hoenn", label: "Hoenn", gen: 3, from: 252, to: 386 },
  { id: "sinnoh", label: "Sinnoh", gen: 4, from: 387, to: 493 },
  { id: "unova", label: "Unova", gen: 5, from: 494, to: 649 },
  { id: "kalos", label: "Kalos", gen: 6, from: 650, to: 721 },
  { id: "alola", label: "Alola", gen: 7, from: 722, to: 809 },
  { id: "galar", label: "Galar", gen: 8, from: 810, to: 905 },
  { id: "paldea", label: "Paldea", gen: 9, from: 906, to: 1025 },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export function regionOfId(id: number): RegionId | null {
  return REGIONS.find((r) => id >= r.from && id <= r.to)?.id ?? null;
}

export function regionLabelOfId(id: number): string {
  const base = id > 1025 ? 0 : id;
  return REGIONS.find((r) => base >= r.from && base <= r.to)?.label ?? "Especial";
}

/** IDs das espécies lendárias e míticas (Geração 1 a 9), como na Firma League. */
export const LEGENDARY_IDS = new Set([
  144, 145, 146, 150, 243, 244, 245, 249, 250, 377, 378, 379, 380, 381, 382, 383, 384,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 638, 639, 640, 641, 642, 643, 644, 645, 646,
  716, 717, 718, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800,
  888, 889, 890, 891, 892, 894, 895, 896, 897, 898, 905,
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024,
]);

export const MYTHICAL_IDS = new Set([
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649,
  719, 720, 721, 801, 802, 807, 808, 809, 893, 1025,
]);

export function isLegendaryOrMythical(dexNumber: number) {
  return LEGENDARY_IDS.has(dexNumber) || MYTHICAL_IDS.has(dexNumber);
}

export type DexEntry = {
  id: number;
  name: string;
  /** Número da Pokédex nacional (para formas, o da espécie base). */
  dexNumber: number;
  region: RegionId | null;
  isForm: boolean;
};

/**
 * Lista da Pokédex a partir da lista da busca. Formas recebem o número da espécie base
 * (achado pelo prefixo do nome) e a região do próprio sufixo quando é regional (Alola, Galar…).
 */
export function buildEntries(list: PokemonRef[]): DexEntry[] {
  const base = list.filter((p) => p.id <= 1025);
  const byName = new Map(base.map((p) => [p.name, p.id]));
  // Nomes mais longos primeiro para "mr-mime" ganhar de "mr" etc.
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);

  return list.map((p) => {
    if (p.id <= 1025) return { id: p.id, name: p.name, dexNumber: p.id, region: regionOfId(p.id), isForm: false };
    const baseName = names.find((n) => p.name.startsWith(`${n}-`));
    const dexNumber = baseName ? byName.get(baseName)! : p.id;
    const regional = p.name.match(/-(alola|galar|hisui|paldea)\b/)?.[1];
    const region: RegionId | null =
      regional === "alola" ? "alola" : regional === "galar" || regional === "hisui" ? "galar" : regional === "paldea" ? "paldea" : regionOfId(dexNumber);
    return { id: p.id, name: p.name, dexNumber, region, isForm: true };
  });
}

const TYPES_KEY = "dexlab:tipos:v1";
const WEEK = 7 * 24 * 60 * 60 * 1000;
let typesPromise: Promise<Record<number, TypeName[]>> | null = null;

/**
 * Tipos de todos os Pokémon de uma vez: 18 pedidos (um por tipo) em vez de mais de mil.
 * Fica guardado no navegador por 7 dias.
 */
export function getTypeIndex(): Promise<Record<number, TypeName[]>> {
  if (typesPromise) return typesPromise;
  try {
    const cached = JSON.parse(localStorage.getItem(TYPES_KEY) ?? "null") as { at: number; map: Record<number, TypeName[]> } | null;
    if (cached && Date.now() - cached.at < WEEK) return (typesPromise = Promise.resolve(cached.map));
  } catch {
    // cache ilegível: busca de novo
  }

  typesPromise = Promise.all(
    TYPES.map((t) =>
      fetch(`https://pokeapi.co/api/v2/type/${t}`)
        .then((res) => {
          if (!res.ok) throw new Error(`PokéAPI ${res.status}`);
          return res.json() as Promise<{ pokemon: { slot: number; pokemon: { url: string } }[] }>;
        })
        .then((data) => ({ type: t, entries: data.pokemon })),
    ),
  )
    .then((all) => {
      const slots: Record<number, [number, TypeName][]> = {};
      for (const { type, entries } of all) {
        for (const e of entries) {
          const id = Number(e.pokemon.url.replace(/\/$/, "").split("/").pop());
          (slots[id] ??= []).push([e.slot, type]);
        }
      }
      const map: Record<number, TypeName[]> = {};
      for (const [id, list] of Object.entries(slots)) {
        map[Number(id)] = list
          .sort((a, b) => a[0] - b[0])
          .map(([, t]) => t)
          .filter(isTypeName);
      }
      try {
        localStorage.setItem(TYPES_KEY, JSON.stringify({ at: Date.now(), map }));
      } catch {
        // sem espaço: segue sem cache
      }
      return map;
    })
    .catch((error) => {
      typesPromise = null;
      throw error;
    });
  return typesPromise;
}
