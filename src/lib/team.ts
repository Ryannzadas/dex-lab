import { useCallback, useEffect, useState } from "react";
import type { StatKey } from "./pokeapi";

/**
 * O time com a configuração completa de cada membro.
 * - Fica salvo no navegador (tudo) e no link: `?time=6,9` com os ids e,
 *   se algum membro foi configurado, `&sets=` com o resto (JSON em base64).
 * - Times antigos (só ids) continuam abrindo.
 */

export type Member = {
  id: number;
  nickname: string;
  level: number;
  ability: string | null;
  item: string;
  nature: string;
  tera: string | null;
  shiny: boolean;
  moves: string[];
  evs: Partial<Record<StatKey, number>>;
  ivs: Partial<Record<StatKey, number>>;
};

export const MAX_TEAM = 6;
const STORAGE_KEY = "dexlab:time:v2";
const OLD_KEY = "dexlab:time";

export function newMember(id: number): Member {
  return { id, nickname: "", level: 50, ability: null, item: "", nature: "hardy", tera: null, shiny: false, moves: [], evs: {}, ivs: {} };
}

function isCustomized(m: Member) {
  const d = newMember(m.id);
  return JSON.stringify({ ...m, id: 0 }) !== JSON.stringify({ ...d, id: 0 });
}

function encode(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(text: string): unknown {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

/** Aceita só os campos conhecidos, com tipos certos (o link pode vir de qualquer lugar). */
function sanitize(raw: unknown, id: number): Member {
  const m = newMember(id);
  if (!raw || typeof raw !== "object") return m;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;
  const statMap = (v: unknown, max: number) => {
    const out: Partial<Record<StatKey, number>> = {};
    if (v && typeof v === "object") {
      for (const k of ["hp", "attack", "defense", "special-attack", "special-defense", "speed"] as StatKey[]) {
        const n = num((v as Record<string, unknown>)[k], 0, max);
        if (n !== undefined) out[k] = n;
      }
    }
    return out;
  };
  return {
    id,
    nickname: typeof r.nickname === "string" ? r.nickname.slice(0, 12) : "",
    level: num(r.level, 1, 100) ?? 50,
    ability: typeof r.ability === "string" ? r.ability : null,
    item: typeof r.item === "string" ? r.item.slice(0, 40) : "",
    nature: typeof r.nature === "string" ? r.nature : "hardy",
    tera: typeof r.tera === "string" ? r.tera : null,
    shiny: r.shiny === true,
    moves: Array.isArray(r.moves) ? r.moves.filter((x): x is string => typeof x === "string").slice(0, 4) : [],
    evs: statMap(r.evs, 252),
    ivs: statMap(r.ivs, 31),
  };
}

function readInitial(): Member[] {
  const params = new URLSearchParams(window.location.search);
  const idsRaw = params.get("time");
  if (idsRaw !== null) {
    const ids = idsRaw
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, MAX_TEAM);
    let sets: unknown[] = [];
    try {
      const s = params.get("sets");
      if (s) sets = (decode(s) as unknown[]) ?? [];
    } catch {
      // link com sets quebrado: abre só com os Pokémon
    }
    return ids.map((id, i) => sanitize(Array.isArray(sets) ? sets[i] : null, id));
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(saved)) {
      return saved
        .filter((m) => m && Number.isInteger(m.id) && m.id > 0)
        .slice(0, MAX_TEAM)
        .map((m) => sanitize(m, m.id));
    }
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "[]");
    if (Array.isArray(old)) return old.filter((n) => Number.isInteger(n) && n > 0).slice(0, MAX_TEAM).map(newMember);
  } catch {
    // storage ilegível
  }
  return [];
}

export function useTeam() {
  const [members, setMembers] = useState<Member[]>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch {
      // modo privado: segue só com o link
    }
    const url = new URL(window.location.href);
    if (members.length) {
      url.searchParams.set("time", members.map((m) => m.id).join(","));
      if (members.some(isCustomized)) {
        url.searchParams.set("sets", encode(members.map((m) => (isCustomized(m) ? { ...m, id: undefined } : 0))));
      } else url.searchParams.delete("sets");
    } else {
      url.searchParams.delete("time");
      url.searchParams.delete("sets");
    }
    window.history.replaceState(window.history.state, "", url);
  }, [members]);

  const add = useCallback(
    (id: number) =>
      setMembers((cur) => (cur.length >= MAX_TEAM || cur.some((m) => m.id === id) ? cur : [...cur, newMember(id)])),
    [],
  );
  const remove = useCallback((id: number) => setMembers((cur) => cur.filter((m) => m.id !== id)), []);
  const clear = useCallback(() => setMembers([]), []);
  const update = useCallback(
    (id: number, patch: Partial<Member>) => setMembers((cur) => cur.map((m) => (m.id === id ? { ...m, ...patch, id } : m))),
    [],
  );

  return { members, ids: members.map((m) => m.id), add, remove, clear, update, full: members.length >= MAX_TEAM };
}
