import { useEffect, useState } from "react";
import { getPokemon, type Pokemon } from "./pokeapi";

/** Carrega os detalhes de uma lista de ids, mantendo a ordem. */
export function usePokemons(ids: number[]) {
  const [loaded, setLoaded] = useState<Record<number, Pokemon>>({});
  const [failed, setFailed] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    ids.forEach((id) => {
      if (loaded[id]) return;
      getPokemon(id)
        .then((p) => alive && setLoaded((cur) => ({ ...cur, [id]: p })))
        .catch(() => alive && setFailed((cur) => (cur.includes(id) ? cur : [...cur, id])));
    });
    return () => {
      alive = false;
    };
    // `loaded` fica de fora de propósito: só reage quando a lista de ids muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const list = ids.map((id) => loaded[id]).filter((p): p is Pokemon => !!p);
  const pending = ids.filter((id) => !loaded[id] && !failed.includes(id));
  return { list, pending, failed: ids.filter((id) => failed.includes(id)) };
}
