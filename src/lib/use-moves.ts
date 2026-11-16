import { useEffect, useMemo, useState } from "react";
import { getMove, type MoveInfo } from "./moves";
import { getPokemon, speciesIdOf, type Pokemon } from "./pokeapi";

/** Detalhes de vários golpes de uma vez (tipo, categoria, poder). */
export function useMoveInfos(names: string[]) {
  const key = [...new Set(names)].sort().join("|");
  const [infos, setInfos] = useState<Record<string, MoveInfo>>({});

  useEffect(() => {
    let alive = true;
    key
      .split("|")
      .filter(Boolean)
      .forEach((name) => {
        getMove(name)
          .then((info) => alive && setInfos((cur) => (cur[name] ? cur : { ...cur, [name]: info })))
          .catch(() => {});
      });
    return () => {
      alive = false;
    };
  }, [key]);

  return infos;
}

/**
 * Golpes que o Pokémon pode aprender (nomes únicos, em ordem alfabética).
 * Mega, Gigantamax e Primal usam a lista da forma normal, que é a completa.
 */
export function useLearnset(pokemon: Pokemon | null) {
  const usesBase = !!pokemon && /-(mega(-[xyz])?|gmax|primal)$/.test(pokemon.name);
  const [base, setBase] = useState<Pokemon | null>(null);

  useEffect(() => {
    if (!pokemon || !usesBase) return;
    let alive = true;
    getPokemon(speciesIdOf(pokemon))
      .then((p) => alive && setBase(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pokemon, usesBase]);

  return useMemo(() => {
    const source = usesBase ? base : pokemon;
    if (!source) return [];
    return [...new Set(source.moves.map((m) => m.name))].sort();
  }, [usesBase, base, pokemon]);
}
