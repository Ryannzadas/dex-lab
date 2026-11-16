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

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("dexlab:tema", next ? "escuro" : "claro");
      } catch {
        // sem storage: vale só nesta visita
      }
      return next;
    });
  }, []);
  return { dark, toggle };
}

export function usePrefersReducedMotion() {
  const [reduce] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return reduce;
}
