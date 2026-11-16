import { useState } from "react";
import { GAMES, gameById, type Game } from "@/lib/games";
import { artworkUrl } from "@/lib/pokeapi";
import type { TeamsApi } from "@/lib/team";
import { ArrowIcon } from "./ui";

type Filter = "todos" | "hacks" | number;

/**
 * Tela inicial: continuar o último time (cards em arco, ideia do horizonx.so)
 * e escolher o jogo do próximo time numa grade de cards grandes (ideia do awwwards.com).
 */
export function Home({
  teams,
  onContinue,
  onNewTeam,
  onGo,
}: {
  teams: TeamsApi;
  onContinue: (teamId: string) => void;
  onNewTeam: (game: Game | null) => void;
  onGo: (tab: "pokedex" | "comparar") => void;
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const official = GAMES.filter((g) => g.kind === "official");
  const hacks = GAMES.filter((g) => g.kind === "hack");
  const gens = [...new Set(official.map((g) => g.gen))];
  const shown = filter === "todos" ? GAMES : filter === "hacks" ? hacks : official.filter((g) => g.gen === filter);

  // Último time mexido, para o "continuar".
  const last = [...teams.teams].sort((a, b) => b.updatedAt - a.updatedAt).find((t) => t.members.length > 0) ?? null;
  const lastGame = gameById(last?.game);

  const chip = (active: boolean) =>
    `shrink-0 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink hover:text-ink"
    }`;
  const count = (n: number) => (
    <span className="ml-1.5 rounded-md border border-current/30 px-1 font-mono text-[11px] opacity-70">{n}</span>
  );

  return (
    <div className="grid grid-cols-1 gap-14 pt-10 pb-6 sm:pt-14">
      {/* Abertura */}
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Dex Lab · montador de times</p>
          <h1 className="mt-3 font-display text-[2.9rem] leading-[0.95] font-extrabold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Pra qual jogo é o time de hoje?
          </h1>
          <p className="braces mt-6 max-w-md text-lg leading-snug">
            Escolha o jogo e o app só deixa entrar quem existe nele, com os golpes e as regras daquela época.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {last ? (
              <button type="button" className="pill" onClick={() => onContinue(last.id)}>
                Continuar “{last.name}”
                <span className="pill-icon">
                  <ArrowIcon />
                </span>
              </button>
            ) : (
              <button type="button" className="pill" onClick={() => onNewTeam(null)}>
                Montar um time livre
                <span className="pill-icon">
                  <ArrowIcon />
                </span>
              </button>
            )}
            <a href="#jogos" className="pill border-line">
              Escolher jogo
              <span className="pill-icon">
                <ArrowIcon direction="down" />
              </span>
            </a>
          </div>
          {last && (
            <p className="mt-3 text-sm text-muted">
              {last.members.length}/6 Pokémon · {lastGame ? lastGame.label : "time livre"}
            </p>
          )}
        </div>

        <TeamArc ids={last?.members.map((m) => m.id) ?? [1, 4, 7, 25, 133, 151]} shiny={last?.members.map((m) => m.shiny) ?? []} />
      </section>

      {/* Escolher o jogo */}
      <section id="jogos" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Novo time</p>
            <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Jogos <span className="align-middle text-base font-medium text-muted">{count(GAMES.length)}</span>
            </h2>
          </div>
          <button type="button" className="pill border-line" onClick={() => onNewTeam(null)}>
            Time livre, sem jogo
            <span className="pill-icon">
              <ArrowIcon />
            </span>
          </button>
        </div>

        <div className="scroll-x mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar jogos">
          <button type="button" aria-pressed={filter === "todos"} className={chip(filter === "todos")} onClick={() => setFilter("todos")}>
            Todos{count(GAMES.length)}
          </button>
          {gens.map((g) => (
            <button key={g} type="button" aria-pressed={filter === g} className={chip(filter === g)} onClick={() => setFilter(g)}>
              {g}ª geração{count(official.filter((x) => x.gen === g).length)}
            </button>
          ))}
          <button type="button" aria-pressed={filter === "hacks"} className={chip(filter === "hacks")} onClick={() => setFilter("hacks")}>
            ROM hacks{count(hacks.length)}
          </button>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-3">
          {shown.map((g) => (
            <li key={g.id}>
              <GameTile game={g} onPick={() => onNewTeam(g)} />
            </li>
          ))}
        </ul>
      </section>

      {/* Atalhos */}
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { tab: "pokedex" as const, title: "Pokédex", text: "Todos os Pokémon com filtros por região e tipo." },
          { tab: "comparar" as const, title: "Comparar", text: "Status, habilidades e evolução lado a lado." },
        ].map((s) => (
          <button
            key={s.tab}
            type="button"
            onClick={() => onGo(s.tab)}
            className="group flex items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-6 text-left backdrop-blur-xl transition hover:border-ink"
          >
            <span>
              <span className="block font-display text-2xl font-bold tracking-tight">{s.title}</span>
              <span className="mt-1 block text-sm text-muted">{s.text}</span>
            </span>
            <span className="pill-icon grid size-10 shrink-0 place-items-center rounded-full border border-current transition-transform group-hover:-rotate-45">
              <ArrowIcon />
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

/** Card grande do jogo: cores das versões, Pokémon símbolo e legenda embaixo. */
function GameTile({ game, onPick }: { game: Game; onPick: () => void }) {
  const [a, b] = game.colors;
  return (
    <button type="button" onClick={onPick} className="group block w-full text-left" aria-label={`Novo time para ${game.label}`}>
      <span
        className="relative block aspect-square overflow-hidden rounded-2xl border border-line sm:aspect-[4/3] sm:rounded-3xl"
        style={{ background: `radial-gradient(80% 80% at 30% 20%, ${a}, transparent 70%), radial-gradient(80% 80% at 80% 90%, ${b}, transparent 70%), #121010` }}
      >
        {/* Grade de "pixels" bem sutil, só de textura */}
        <span
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
          aria-hidden="true"
        />
        <img
          src={artworkUrl(game.mascot)}
          alt=""
          loading="lazy"
          width={260}
          height={260}
          className="absolute top-1/2 left-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_20px_30px_rgb(0_0_0/0.45)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
        />
        <span className="absolute top-4 left-4 rounded-lg bg-black/40 px-2 py-1 font-mono text-[11px] text-white backdrop-blur">
          {game.short}
        </span>
        {game.kind === "hack" && (
          <span className="absolute top-4 right-4 rounded-lg bg-amber-400 px-2 py-1 font-mono text-[11px] font-semibold text-black">
            modo hack
          </span>
        )}
        <span className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-white text-black opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowIcon direction="up-right" />
        </span>
      </span>
      <span className="mt-3 flex items-center gap-3">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
        >
          {game.gen}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-bold sm:text-base">{game.label}</span>
          <span className="block text-xs text-muted">
            {game.region} · {game.kind === "hack" ? `até a ${game.maxGen}ª geração` : `${game.gen}ª geração`}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Seis cards em arco com perspectiva (inspirado no hero do horizonx.so). Estático, sem carrossel. */
function TeamArc({ ids, shiny }: { ids: number[]; shiny: boolean[] }) {
  const n = ids.length;
  return (
    <div className="relative mx-auto h-64 w-full max-w-xl [perspective:1100px] sm:h-80" aria-hidden="true">
      {ids.map((id, i) => {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0,5 … 0,5
        return (
          <div
            key={`${id}-${i}`}
            className="absolute top-1/2 left-1/2 h-40 w-28 rounded-2xl border border-line bg-surface-solid shadow-xl transition-transform duration-500 hover:z-10 hover:!scale-110 sm:h-52 sm:w-36"
            style={{
              // Espalha em arco: as das pontas ficam mais longe, mais para trás e viradas para o centro.
              transform: `translate(-50%, -50%) translateX(${t * 330}%) translateZ(${-Math.abs(t) * 220}px) rotateY(${t * -55}deg)`,
              zIndex: 10 - Math.round(Math.abs(t) * 10),
            }}
          >
            <img
              src={artworkUrl(id, shiny[i])}
              alt=""
              width={140}
              height={140}
              className="absolute inset-x-0 top-1/2 mx-auto w-[86%] -translate-y-1/2 drop-shadow-[0_10px_14px_rgb(0_0_0/0.2)]"
            />
          </div>
        );
      })}
    </div>
  );
}
