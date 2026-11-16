import { useCallback, useEffect, useState } from "react";

/**
 * Listas de ids (time e comparação) guardadas no link (?time=1,4,7) e no navegador.
 * O link tem prioridade, assim dá pra compartilhar um time mandando a URL.
 */

function readUrl(param: string): number[] | null {
  const raw = new URLSearchParams(window.location.search).get(param);
  if (raw === null) return null;
  return raw
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

function readStorage(key: string): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

export function useIdList(param: string, max: number) {
  const storageKey = `dexlab:${param}`;
  const [ids, setIds] = useState<number[]>(
    () => (readUrl(param) ?? readStorage(storageKey)).slice(0, max),
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // modo privado: segue só com o link
    }
    const url = new URL(window.location.href);
    if (ids.length) url.searchParams.set(param, ids.join(","));
    else url.searchParams.delete(param);
    window.history.replaceState(window.history.state, "", url);
  }, [ids, param, storageKey]);

  const add = useCallback(
    (id: number) => setIds((cur) => (cur.length >= max || cur.includes(id) ? cur : [...cur, id])),
    [max],
  );
  const remove = useCallback((id: number) => setIds((cur) => cur.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  return { ids, add, remove, clear, full: ids.length >= max };
}

export type ThemeMode = "claro" | "escuro" | "sistema";
const THEME_ORDER: ThemeMode[] = ["claro", "escuro", "sistema"];

function readMode(): ThemeMode {
  try {
    const t = localStorage.getItem("dexlab:tema");
    if (t === "claro" || t === "escuro" || t === "sistema") return t;
  } catch {
    // sem storage
  }
  return "sistema";
}

/**
 * Tema com três opções: claro, escuro ou "do sistema" (segue o aparelho e muda junto com ele).
 * O botão alterna na ordem claro → escuro → sistema.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const dark = mode === "escuro" || (mode === "sistema" && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const cycle = useCallback(() => {
    setMode((m) => {
      const next = THEME_ORDER[(THEME_ORDER.indexOf(m) + 1) % THEME_ORDER.length];
      try {
        localStorage.setItem("dexlab:tema", next);
      } catch {
        // sem storage: vale só nesta visita
      }
      return next;
    });
  }, []);

  return { dark, mode, cycle };
}

export function usePrefersReducedMotion() {
  const [reduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return reduce;
}
