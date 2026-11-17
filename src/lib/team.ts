import { useCallback, useEffect, useState } from "react";
import type { StatKey } from "./pokeapi";

/**
 * Vários times salvos, cada um com a configuração completa de cada membro.
 * - Todos ficam no navegador; o time aberto também vai no link: `?time=6,9` com os ids e,
 *   se algum membro foi configurado, `&sets=` com o resto (JSON em base64).
 * - Abrir um link de time que a pessoa ainda não tem adiciona ele como um time novo.
 * - O formato antigo (um time só) é migrado para "Time 1".
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
export const MAX_TEAMS = 30;
const TEAMS_KEY = "dexlab:times:v3";
const V2_KEY = "dexlab:time:v2";
const OLD_KEY = "dexlab:time";

/** `game`: id de um jogo de lib/games.ts, ou null para time livre (sem jogo). */
export type SavedTeam = { id: string; name: string; members: Member[]; updatedAt: number; game: string | null };

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

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function cleanMembers(raw: unknown): Member[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: Member[] = [];
  for (const m of raw) {
    if (!m || !Number.isInteger(m.id) || m.id <= 0 || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(sanitize(m, m.id));
    if (out.length >= MAX_TEAM) break;
  }
  return out;
}

/** Time que veio no link (?time=…&sets=…), se houver. */
function readUrlTeam(): Member[] | null {
  const params = new URLSearchParams(window.location.search);
  const idsRaw = params.get("time");
  if (idsRaw === null) return null;
  const ids = [...new Set(idsRaw.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_TEAM);
  let sets: unknown[] = [];
  try {
    const s = params.get("sets");
    if (s) {
      const decoded = decode(s);
      if (Array.isArray(decoded)) sets = decoded;
    }
  } catch {
    // link com sets quebrado: abre só com os Pokémon
  }
  return ids.map((id, i) => sanitize(sets[i], id));
}

function readLegacy(): Member[] {
  try {
    const v2 = JSON.parse(localStorage.getItem(V2_KEY) ?? "null");
    if (Array.isArray(v2)) return cleanMembers(v2);
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null");
    if (Array.isArray(old)) return cleanMembers(old.map((id: unknown) => ({ id })));
  } catch {
    // storage ilegível
  }
  return [];
}

type TeamsState = { teams: SavedTeam[]; activeId: string };

function nextName(teams: SavedTeam[], base = "Time") {
  let n = teams.length + 1;
  while (teams.some((t) => t.name === `${base} ${n}`)) n++;
  return `${base} ${n}`;
}

const signature = (members: Member[]) => JSON.stringify(members);

function readInitial(): TeamsState {
  let teams: SavedTeam[] = [];
  let activeId = "";
  try {
    const saved = JSON.parse(localStorage.getItem(TEAMS_KEY) ?? "null");
    if (saved && Array.isArray(saved.teams)) {
      teams = (saved.teams as SavedTeam[])
        .filter((t) => t && typeof t.id === "string")
        .slice(0, MAX_TEAMS)
        .map((t) => ({
          id: t.id,
          name: typeof t.name === "string" && t.name.trim() ? t.name.slice(0, 40) : "Time",
          members: cleanMembers(t.members),
          updatedAt: Number(t.updatedAt) || Date.now(),
          game: typeof t.game === "string" ? t.game : null,
        }));
      activeId = typeof saved.activeId === "string" ? saved.activeId : "";
    }
  } catch {
    // storage ilegível: começa do zero
  }

  if (teams.length === 0) {
    teams = [{ id: makeId(), name: "Time 1", members: readLegacy(), updatedAt: Date.now(), game: null }];
  }

  // Link compartilhado: abre o time se já existir; senão, adiciona como time novo.
  const shared = readUrlTeam();
  const sharedGame = new URLSearchParams(window.location.search).get("jogo");
  if (shared && shared.length) {
    const same = teams.find((t) => signature(t.members) === signature(shared) && (t.game ?? null) === (sharedGame ?? null));
    if (same) activeId = same.id;
    else if (teams.length < MAX_TEAMS) {
      const team = { id: makeId(), name: nextName(teams, "Compartilhado"), members: shared, updatedAt: Date.now(), game: sharedGame };
      teams = [...teams, team];
      activeId = team.id;
    }
  }

  if (!teams.some((t) => t.id === activeId)) activeId = teams[0].id;
  return { teams, activeId };
}

export function useTeams(syncUrl = true) {
  const [state, setState] = useState<TeamsState>(readInitial);
  const active = state.teams.find((t) => t.id === state.activeId) ?? state.teams[0];
  const members = active.members;

  // Salva tudo no navegador e coloca o time aberto no link apenas quando a aba Time está ativa.
  useEffect(() => {
    try {
      localStorage.setItem(TEAMS_KEY, JSON.stringify(state));
    } catch {
      // modo privado: segue só com o link
    }
    const team = state.teams.find((t) => t.id === state.activeId) ?? state.teams[0];
    const url = new URL(window.location.href);
    if (syncUrl && team.members.length) {
      url.searchParams.set("time", team.members.map((m) => m.id).join(","));
      if (team.members.some(isCustomized)) {
        url.searchParams.set("sets", encode(team.members.map((m) => (isCustomized(m) ? { ...m, id: undefined } : 0))));
      } else url.searchParams.delete("sets");
    } else {
      url.searchParams.delete("time");
      url.searchParams.delete("sets");
    }
    if (syncUrl && team.game) url.searchParams.set("jogo", team.game);
    else url.searchParams.delete("jogo");
    window.history.replaceState(window.history.state, "", url);
  }, [state, syncUrl]);

  /** Muda os membros do time aberto. */
  const editMembers = useCallback((fn: (cur: Member[]) => Member[]) => {
    setState((s) => ({
      ...s,
      teams: s.teams.map((t) => (t.id === s.activeId ? { ...t, members: fn(t.members), updatedAt: Date.now() } : t)),
    }));
  }, []);

  const add = useCallback(
    (id: number) => editMembers((cur) => (cur.length >= MAX_TEAM || cur.some((m) => m.id === id) ? cur : [...cur, newMember(id)])),
    [editMembers],
  );
  const remove = useCallback((id: number) => editMembers((cur) => cur.filter((m) => m.id !== id)), [editMembers]);
  const clear = useCallback(() => editMembers(() => []), [editMembers]);
  const setMembers = useCallback((next: Member[]) => editMembers(() => cleanMembers(next)), [editMembers]);
  const update = useCallback(
    (id: number, patch: Partial<Member>) => editMembers((cur) => cur.map((m) => (m.id === id ? { ...m, ...patch, id } : m))),
    [editMembers],
  );

  const select = useCallback((id: string) => setState((s) => (s.teams.some((t) => t.id === id) ? { ...s, activeId: id } : s)), []);

  /** Cria um time (vazio ou com membros, como no import) e já abre ele. */
  const create = useCallback((name?: string, initial: Member[] = [], game: string | null = null) => {
    setState((s) => {
      if (s.teams.length >= MAX_TEAMS) return s;
      const team = { id: makeId(), name: name?.trim() || nextName(s.teams), members: cleanMembers(initial), updatedAt: Date.now(), game };
      return { teams: [...s.teams, team], activeId: team.id };
    });
  }, []);

  const duplicate = useCallback((id: string) => {
    setState((s) => {
      const src = s.teams.find((t) => t.id === id);
      if (!src || s.teams.length >= MAX_TEAMS) return s;
      const copy = { ...src, id: makeId(), name: `${src.name} (cópia)`.slice(0, 40), updatedAt: Date.now() };
      const at = s.teams.indexOf(src) + 1;
      return { teams: [...s.teams.slice(0, at), copy, ...s.teams.slice(at)], activeId: copy.id };
    });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const clean = name.trim().slice(0, 40);
    if (!clean) return;
    setState((s) => ({ ...s, teams: s.teams.map((t) => (t.id === id ? { ...t, name: clean } : t)) }));
  }, []);

  /** Exclui um time. Se era o último, fica um "Time 1" vazio no lugar. */
  const removeTeam = useCallback((id: string) => {
    setState((s) => {
      const rest = s.teams.filter((t) => t.id !== id);
      if (rest.length === 0) {
        const fresh = { id: makeId(), name: "Time 1", members: [], updatedAt: Date.now(), game: null };
        return { teams: [fresh], activeId: fresh.id };
      }
      const idx = s.teams.findIndex((t) => t.id === id);
      const activeId = s.activeId === id ? rest[Math.max(0, idx - 1)].id : s.activeId;
      return { teams: rest, activeId };
    });
  }, []);

  /** Troca o jogo do time (os membros ficam; os que não existem no jogo aparecem marcados). */
  const setGame = useCallback((id: string, game: string | null) => {
    setState((s) => ({ ...s, teams: s.teams.map((t) => (t.id === id ? { ...t, game, updatedAt: Date.now() } : t)) }));
  }, []);

  return {
    teams: state.teams,
    setGame,
    active,
    members,
    ids: members.map((m) => m.id),
    full: members.length >= MAX_TEAM,
    canCreate: state.teams.length < MAX_TEAMS,
    add,
    remove,
    clear,
    setMembers,
    update,
    select,
    create,
    duplicate,
    rename,
    removeTeam,
  };
}

export type TeamsApi = ReturnType<typeof useTeams>;
