import { useEffect, useRef, useState } from "react";
import { regionLabelOfId } from "@/lib/dex";
import { GAMES, gameById, type Game } from "@/lib/games";
import { artworkUrl, cryMp3Url, cryUrl, getPokemonList, pokemonName } from "@/lib/pokeapi";
import type { TeamsApi } from "@/lib/team";
import { ArrowIcon } from "./ui";

type Filter = "todos" | "hacks" | number;

/** Sorteia 6 Pokémon distintos da Pokédex nacional (1 a 1025) para quando ainda não há time salvo. */
function pickRandomTeamIds(count = 6): number[] {
  const picked = new Set<number>();
  while (picked.size < count) {
    picked.add(Math.floor(Math.random() * 1025) + 1);
  }
  return [...picked];
}

/**
 * Tela inicial: continuar o último time (leque de cards estilo Firma League / horizonx.so)
 * e escolher o jogo do próximo time numa grade de cards grandes (ideia do awwwards.com).
 */
export function Home({
  teams,
  onContinue,
  onNewTeam,
  onGo,
  onOpen,
}: {
  teams: TeamsApi;
  onContinue: (teamId: string) => void;
  onNewTeam: (game: Game | null) => void;
  onGo: (tab: "pokedex" | "comparar") => void;
  onOpen: (speciesId: number, formId?: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [randomIds, setRandomIds] = useState<number[]>(() => pickRandomTeamIds(6));
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
    <div className="grid grid-cols-1 gap-12 pt-8 pb-6 sm:gap-14 sm:pt-14">
      {/* Abertura */}
      <section className="grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Dex Lab · montador de times</p>
          <h1 className="mt-3 font-display text-[2.35rem] leading-[0.98] font-extrabold tracking-[-0.045em] sm:text-6xl sm:leading-[0.95] lg:text-7xl">
            Pra qual jogo é o time de hoje?
          </h1>
          <p className="braces mt-5 max-w-md text-base leading-snug sm:mt-6 sm:text-lg">
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

        <TeamArc
          ids={last?.members.map((m) => m.id) ?? randomIds}
          shiny={last?.members.map((m) => m.shiny) ?? []}
          nicks={last?.members.map((m) => m.nickname) ?? []}
          onOpen={onOpen}
          onReroll={!last ? () => setRandomIds(pickRandomTeamIds(6)) : undefined}
        />
      </section>

      {/* Escolher o jogo */}
      <section id="jogos" className="min-w-0 scroll-mt-24">
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

const SOUND_KEY = "dexlab:som";
const CRY_VOL = 0.18;
const audioCache = new Map<string, HTMLAudioElement>();

function readSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * Leque de cartas no estilo da Firma League:
 * - mostra região, #número, arte oficial (com rugido no hover) e nome;
 * - pré-carrega os sons ao entrar no leque, toca no hover (140ms) e faz fade-out suave (220ms) ao sair;
 * - clicar abre o sumário do Pokémon (no celular: 1º toque destaca e toca o som, 2º toque abre);
 * - botão "Som ligado / Som desligado" embaixo.
 */
function TeamArc({
  ids,
  shiny,
  nicks,
  onOpen,
  onReroll,
}: {
  ids: number[];
  shiny: boolean[];
  nicks: string[];
  onOpen: (speciesId: number, formId?: number) => void;
  onReroll?: () => void;
}) {
  const n = ids.length;
  const [soundOn, setSoundOn] = useState(readSoundEnabled);
  const [armedIdx, setArmedIdx] = useState<number | null>(null);
  const [names, setNames] = useState<Record<number, string>>({
    1: "bulbasaur",
    4: "charmander",
    7: "squirtle",
    25: "pikachu",
    133: "eevee",
    150: "mewtwo",
    151: "mew",
    250: "ho-oh",
    384: "rayquaza",
    483: "dialga",
    493: "arceus",
  });

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number>(0);
  const hoverTimerRef = useRef<number>(0);
  const lastPlayedRef = useRef<{ id: number; t: number }>({ id: 0, t: 0 });
  const pointerTypeRef = useRef<string>("mouse");
  const fanRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    getPokemonList()
      .then((list) => {
        const map: Record<number, string> = {};
        for (const p of list) map[p.id] = p.name;
        setNames((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
    return () => {
      window.clearTimeout(hoverTimerRef.current);
      cancelAnimationFrame(fadeRafRef.current);
      activeAudioRef.current?.pause();
    };
  }, []);

  // Desarma o card no celular ao tocar fora do leque.
  useEffect(() => {
    if (armedIdx === null) return;
    const onDocDown = (e: PointerEvent) => {
      if (!fanRef.current?.contains(e.target as Node)) setArmedIdx(null);
    };
    document.addEventListener("pointerdown", onDocDown);
    return () => document.removeEventListener("pointerdown", onDocDown);
  }, [armedIdx]);

  const getAudio = (id: number) => {
    const canOgg = typeof Audio !== "undefined" && new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== "";
    const slug = names[id];
    const src = !canOgg && slug ? cryMp3Url(slug) : cryUrl(id);
    let a = audioCache.get(src);
    if (!a) {
      a = new Audio(src);
      a.preload = "auto";
      const fallback = slug ? cryMp3Url(slug) : null;
      if (fallback && src !== fallback) {
        a.onerror = () => {
          if (a && a.src !== fallback) a.src = fallback;
        };
      }
      audioCache.set(src, a);
    }
    return a;
  };

  const stopCry = (immediate = false) => {
    const cur = activeAudioRef.current;
    if (!cur) return;
    cancelAnimationFrame(fadeRafRef.current);
    if (immediate || cur.paused) {
      cur.pause();
      activeAudioRef.current = null;
      return;
    }
    const startVol = cur.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 220);
      cur.volume = startVol * (1 - p);
      if (p < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        cur.pause();
        cur.volume = CRY_VOL;
        if (activeAudioRef.current === cur) activeAudioRef.current = null;
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  };

  const playNow = (id: number, force = false) => {
    if (!soundOn && !force) return;
    const now = performance.now();
    if (!force && lastPlayedRef.current.id === id && now - lastPlayedRef.current.t < 1500) return;
    lastPlayedRef.current = { id, t: now };
    stopCry(true);
    try {
      const a = getAudio(id);
      a.volume = CRY_VOL;
      try {
        a.currentTime = 0;
      } catch {
        // ignora se ainda não carregou metadados
      }
      activeAudioRef.current = a;
      const slug = names[id];
      const fallback = slug ? cryMp3Url(slug) : null;
      a.play().catch(() => {
        if (fallback && a.src !== fallback) {
          a.src = fallback;
          a.play().catch(() => {});
        }
      });
    } catch {
      // ignora
    }
  };

  const scheduleCry = (id: number) => {
    window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => playNow(id), 140);
  };

  const clearSchedule = () => window.clearTimeout(hoverTimerRef.current);

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // ignora
      }
      if (!next) stopCry(true);
      return next;
    });
  };

  const openMon = (id: number) => {
    // Se for uma forma (id > 1025), descobre a espécie base pelo nome.
    if (id <= 1025) {
      onOpen(id);
      return;
    }
    const slug = names[id];
    if (slug) {
      const baseSlug = slug.replace(/-(alola|galar(?:-[a-z]+)?|hisui|paldea(?:-[a-z-]+)?|mega(?:-[xyz])?|primal|gmax)$/, "");
      const baseEntry = Object.entries(names).find(([k, v]) => Number(k) <= 1025 && v === baseSlug);
      if (baseEntry) {
        onOpen(Number(baseEntry[0]), id);
        return;
      }
    }
    onOpen(id);
  };

  const center = (n - 1) / 2;

  return (
    <div className="relative flex flex-col items-center">
      <ul
        ref={fanRef}
        className={`legend-fan${armedIdx !== null ? " has-armed" : ""}`}
        aria-label="Pokémon em destaque"
        onPointerEnter={() => {
          if (soundOn) ids.forEach((id) => getAudio(id));
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") stopCry();
        }}
      >
        {ids.map((id, idx) => {
          const offset = idx - center;
          const absOffset = Math.abs(offset);
          const slug = names[id];
          const display = nicks[idx] || (slug ? pokemonName(slug) : `#${id}`);
          const dexNum = id <= 1025 ? id : Number(Object.entries(names).find(([k, v]) => Number(k) <= 1025 && slug?.startsWith(`${v}-`))?.[0] ?? id);
          const region = regionLabelOfId(dexNum);
          const isCenter = absOffset < 0.6;
          return (
            <li
              key={`${id}-${idx}`}
              className={`${armedIdx === idx ? "armed " : ""}${isCenter ? "is-center" : ""}`}
              style={
                {
                  "--i": offset,
                  "--abs-i": absOffset,
                  "--z": 12 - Math.round(absOffset * 2),
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className="legend-card"
                onPointerDown={(e) => {
                  pointerTypeRef.current = e.pointerType;
                  if (e.pointerType !== "mouse" && soundOn) getAudio(id);
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") scheduleCry(id);
                }}
                onPointerLeave={clearSchedule}
                onFocus={() => {
                  if (pointerTypeRef.current === "mouse") scheduleCry(id);
                }}
                onBlur={clearSchedule}
                onClick={(e) => {
                  if (pointerTypeRef.current !== "mouse") {
                    if (armedIdx !== idx) {
                      e.preventDefault();
                      setArmedIdx(idx);
                      lastPlayedRef.current = { id: 0, t: 0 };
                      playNow(id);
                    } else {
                      e.preventDefault();
                      openMon(id);
                    }
                  } else {
                    playNow(id);
                    openMon(id);
                  }
                }}
              >
                <span className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                  <span className="truncate font-extrabold tracking-[0.08em] text-muted uppercase">{region}</span>
                  <span className="hidden font-mono text-muted sm:inline">#{String(dexNum).padStart(4, "0")}</span>
                </span>
                <span className="legend-art relative">
                  <img
                    src={artworkUrl(id, shiny[idx])}
                    alt={display}
                    width={180}
                    height={180}
                    draggable={false}
                  />
                  {shiny[idx] && (
                    <span className="absolute top-0 right-0 text-xs text-amber-500" aria-hidden="true">
                      ✦
                    </span>
                  )}
                </span>
                <span className="block truncate text-center font-display text-xs font-bold sm:text-base">{display}</span>
                {armedIdx === idx && (
                  <span className="mt-0.5 block text-center font-mono text-[9px] font-semibold text-muted sm:hidden" aria-hidden="true">
                    Toque de novo p/ abrir
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          aria-pressed={soundOn}
          onClick={toggleSound}
          title={soundOn ? "Desligar os sons ao passar o mouse" : "Ligar os sons ao passar o mouse"}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted backdrop-blur transition-colors hover:border-ink hover:text-ink"
        >
          {soundOn ? (
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5ZM22 9l-6 6M16 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span>{soundOn ? "Som ligado" : "Som desligado"}</span>
        </button>

        {onReroll && (
          <button
            type="button"
            onClick={onReroll}
            title="Sortear outros 6 Pokémon"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted backdrop-blur transition-colors hover:border-ink hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 0 0-15.5-6.3L3 8M3 3v5h5M3 12a9 9 0 0 0 15.5 6.3L21 16m0 5v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Sortear outros</span>
          </button>
        )}
      </div>
    </div>
  );
}
