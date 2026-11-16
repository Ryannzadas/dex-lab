import { useEffect, useState } from "react";
import { availability, gameById, getGameSpecies, type Availability, type Game } from "./games";

export type GameContext = {
  game: Game | null;
  /** Geração das regras (tipos e tabela). Sem jogo: a atual. */
  gen: number;
  /** Espécies do jogo (null enquanto carrega, ou para hacks e time livre). */
  species: Set<number> | null;
  check: (speciesId: number, name: string) => Availability;
};

/** Jogo do time aberto, com a lista de quem existe nele já carregada. */
export function useGame(gameId: string | null): GameContext {
  const game = gameById(gameId);
  const [loaded, setLoaded] = useState<{ id: string; species: Set<number> } | null>(null);

  useEffect(() => {
    if (!game || game.kind !== "official") return;
    let alive = true;
    getGameSpecies(game)
      .then((species) => alive && setLoaded({ id: game.id, species }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [game]);

  const species = game && loaded?.id === game.id ? loaded.species : null;
  return {
    game,
    gen: game?.gen ?? 9,
    species,
    check: (speciesId, name) => availability(game, speciesId, name, species),
  };
}
