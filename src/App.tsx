import { useCallback, useEffect, useState } from "react";
import { Blobs } from "@/components/blobs";
import { CompareTab } from "@/components/compare";
import { SummaryView } from "@/components/summary";
import { TeamTab } from "@/components/team";
import { TeamManager } from "@/components/team-manager";
import { Home } from "@/components/home";
import { Pokedex } from "@/components/pokedex";

import { useIdList, useTheme, type ThemeMode } from "@/lib/state";
import { useTeams } from "@/lib/team";
import { useGame } from "@/lib/use-game";
import type { TypeName } from "@/lib/types";
import { usePokemons } from "@/lib/use-pokemon";

type Tab = "inicio" | "time" | "comparar" | "pokedex";

function readTab(): Tab {
  const params = new URLSearchParams(window.location.search);
  const aba = params.get("aba");
  if (aba === "comparar" || aba === "pokedex" || aba === "time") return aba;
  // Link de time compartilhado (antigo, sem aba): abre direto no time. Senão, a tela inicial.
  return params.has("time") && !aba ? "time" : "inicio";
}

function readSummary(): number | null {
  const n = Number(new URLSearchParams(window.location.search).get("pokemon"));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function readForm(): number | null {
  const n = Number(new URLSearchParams(window.location.search).get("forma"));
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default function App() {
  const [tab, setTab] = useState<Tab>(readTab);
  const [summaryId, setSummaryId] = useState<number | null>(readSummary);
  const [formId, setFormId] = useState<number | null>(readForm);
  const [summaryTypes, setSummaryTypes] = useState<TypeName[]>([]);
  const [dexTypes, setDexTypes] = useState<TypeName[]>([]);
  const team = useTeams(tab === "time");
  const compare = useIdList("comparar", 4, tab === "comparar");
  const teamData = usePokemons(team.ids);
  const gameCtx = useGame(team.active.game);
  const compareData = usePokemons(compare.ids);
  const theme = useTheme();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab !== "inicio") {
      url.searchParams.set("aba", tab);
      url.hash = "";
    } else {
      url.searchParams.delete("aba");
      ["time", "sets", "jogo", "comparar"].forEach((k) => url.searchParams.delete(k));
    }
    // Filtros da Pokédex só fazem sentido na aba dela.
    if (tab !== "pokedex") ["regiao", "tipo", "formas", "lendarios"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, "", url);
  }, [tab]);

  // O resumo e as abas vivem no link, então o botão "voltar" do navegador funciona entre eles.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const onPop = () => {
      const nextSummary = readSummary();
      setSummaryId(nextSummary);
      setFormId(readForm());
      setTab(readTab());
      if (nextSummary !== null) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openSummary = useCallback((speciesId: number, form?: number) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const url = new URL(window.location.href);
    url.searchParams.set("pokemon", String(speciesId));
    if (form && form !== speciesId) url.searchParams.set("forma", String(form));
    else url.searchParams.delete("forma");
    window.history.pushState({ summary: true }, "", url);
    setSummaryId(speciesId);
    setFormId(form && form !== speciesId ? form : null);
  }, []);

  const closeSummary = useCallback(() => {
    if (window.history.state?.summary) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("pokemon");
    url.searchParams.delete("forma");
    window.history.pushState(null, "", url);
    setSummaryId(null);
    setFormId(null);
  }, []);

  const goToTab = (t: Tab) => {
    if (summaryId !== null) closeSummary();
    setTab(t);
  };

  const activeTypes =
    summaryId !== null
      ? summaryTypes
      : tab === "pokedex"
        ? dexTypes
        : (tab === "time" ? teamData.list : compareData.list).flatMap((p) => p.types);

  return (
    <>
      <Blobs types={activeTypes} />
      <Toolbar tab={summaryId !== null ? null : tab} setTab={goToTab} themeMode={theme.mode} toggleTheme={theme.cycle} />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {summaryId !== null ? (
          <SummaryView
            key={`${summaryId}-${formId}`}
            speciesId={summaryId}
            initialFormId={formId}
            onClose={closeSummary}
            onOpen={openSummary}
            onAddToTeam={team.add}
            check={gameCtx.check}
            onCompare={compare.add}
            teamIds={team.ids}
            compareIds={compare.ids}
            onTypes={setSummaryTypes}
          />
        ) : (
          <>
            {tab !== "inicio" && <div className="h-8" aria-hidden="true" />}
            <div role="tabpanel" id={`painel-${tab}`} aria-labelledby={`aba-${tab}`} className="scroll-mt-24">
              {tab === "inicio" ? (
                <Home
                  teams={team}
                  onContinue={(id) => {
                    team.select(id);
                    goToTab("time");
                    window.scrollTo({ top: 0 });
                  }}
                  onNewTeam={(game) => {
                    team.create(game ? game.label : undefined, [], game?.id ?? null);
                    goToTab("time");
                    window.scrollTo({ top: 0 });
                  }}
                  onGo={(t) => {
                    goToTab(t);
                    window.scrollTo({ top: 0 });
                  }}
                  onOpen={openSummary}
                />
              ) : tab === "time" ? (
                <div className="grid grid-cols-1 gap-6">
                  <TeamManager api={team} loaded={teamData.list} />
                  <TeamTab
                  key={team.active.id}
                  members={team.members}
                  team={teamData.list}
                  pending={teamData.pending}
                  onAdd={team.add}
                  onRemove={team.remove}
                  onClear={team.clear}
                  onUpdate={team.update}
                  onOpen={openSummary}
                  game={gameCtx}
                />
                </div>
              ) : tab === "pokedex" ? (
                <Pokedex
                  onOpen={openSummary}
                  onAddToTeam={team.add}
            check={gameCtx.check}
                  teamIds={team.ids}
                  teamFull={team.full}
                  onTypes={setDexTypes}
                />
              ) : (
                <CompareTab
                  ids={compare.ids}
                  list={compareData.list}
                  pending={compareData.pending}
                  onAdd={compare.add}
                  onRemove={compare.remove}
                  onOpen={openSummary}
                />
              )}
              {tab !== "pokedex" && (tab === "time" ? teamData.failed : compareData.failed).length > 0 && (
                <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                  Alguns Pokémon não carregaram. Confira a conexão e recarregue a página.
                </p>
              )}
            </div>
          </>
        )}
      </main>

      <Footer dark={theme.dark} />
    </>
  );
}

const THEME_LABEL: Record<ThemeMode, string> = { claro: "claro", escuro: "escuro", sistema: "do sistema" };

/** Barra de ícones flutuante (estilo react-spring.dev). */
function Toolbar({
  tab,
  setTab,
  themeMode,
  toggleTheme,
}: {
  tab: Tab | null;
  setTab: (t: Tab) => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
}) {
  // Depois de rolar um pouco, o topo ganha fundo desfocado para não ficar por cima do texto.
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "inicio",
      label: "Início",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: "time",
      label: "Time",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="17" cy="9.5" r="2.4" />
          <path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6M15 14.6c2.4-.3 4.4 1 5.2 3.9" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "comparar",
      label: "Comparar",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 20V10M12 20V4M19 20v-7" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "pokedex",
      label: "Pokédex",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M4 9h16M9 14h6M9 17h4" strokeLinecap="round" />
          <circle cx="8" cy="6" r="1" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <header
      className={`sticky top-0 z-40 px-4 pt-4 pb-3 transition-[background-color,border-color,backdrop-filter] duration-300 sm:px-6 ${
        scrolled ? "border-b border-line bg-bg/70 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setTab("inicio")}
          className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface p-1 shadow-sm backdrop-blur-xl sm:pr-3.5"
          aria-label="Dex Lab, ir para o início"
        >
          <img src="/favicon.svg" alt="" width={36} height={36} className="size-8 sm:size-9" />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">Dex Lab</span>
        </button>

        <nav className="flex min-w-0 items-center gap-0.5 rounded-2xl border border-line bg-surface p-1 shadow-sm backdrop-blur-xl sm:gap-1">
          <div role="tablist" aria-label="Ferramentas" className="flex gap-0.5 sm:gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`aba-${t.id}`}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls={`painel-${t.id}`}
                aria-label={t.label}
                title={t.label}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
                  tab === t.id ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
                }`}
              >
                {t.icon}
                {/* No celular só a aba aberta mostra o nome, para todas caberem sem cortar. */}
                <span className={tab === t.id ? "truncate" : "hidden sm:inline"}>{t.label}</span>
              </button>
            ))}
          </div>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-line sm:mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Tema: ${THEME_LABEL[themeMode]}. Trocar tema`}
            title={`Tema: ${THEME_LABEL[themeMode]} (clique para trocar)`}
            className="grid size-8 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-line/60 hover:text-ink sm:size-9"
          >
            {themeMode === "claro" && (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
              </svg>
            )}
            {themeMode === "escuro" && (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" strokeLinejoin="round" />
              </svg>
            )}
            {themeMode === "sistema" && (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8M12 16v4" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer({ dark }: { dark: boolean }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-xl leading-relaxed">
          Projeto de fã, sem fins lucrativos. Dados e imagens da{" "}
          <a href="https://pokeapi.co" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
            PokéAPI
          </a>
          . Pokémon e seus personagens são marcas da Nintendo, Game Freak e Creatures. Não afiliado a eles.
        </p>
        <a
          href="https://hydra-labs-studio.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full opacity-85 transition-opacity hover:opacity-100"
        >
          <img
            src={dark ? "/hydra-labs-selo-escuro.svg" : "/hydra-labs-selo-claro.svg"}
            alt="Desenvolvido por Hydra Labs"
            width={196}
            height={28}
          />
        </a>
      </div>
    </footer>
  );
}
