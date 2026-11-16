import { animated, useTrail } from "@react-spring/web";
import { useCallback, useEffect, useState } from "react";
import { Blobs } from "@/components/blobs";
import { CompareTab } from "@/components/compare";
import { SummaryView } from "@/components/summary";
import { TeamTab } from "@/components/team";
import { TeamManager } from "@/components/team-manager";
import { Pokedex } from "@/components/pokedex";
import { ArrowIcon } from "@/components/ui";
import { useIdList, usePrefersReducedMotion, useTheme } from "@/lib/state";
import { useTeams } from "@/lib/team";
import type { TypeName } from "@/lib/types";
import { usePokemons } from "@/lib/use-pokemon";

type Tab = "time" | "comparar" | "pokedex";

function readTab(): Tab {
  const aba = new URLSearchParams(window.location.search).get("aba");
  return aba === "comparar" || aba === "pokedex" ? aba : "time";
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
  const team = useTeams();
  const compare = useIdList("comparar", 4);
  const teamData = usePokemons(team.ids);
  const compareData = usePokemons(compare.ids);
  const theme = useTheme();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab !== "time") url.searchParams.set("aba", tab);
    else url.searchParams.delete("aba");
    // Filtros da Pokédex só fazem sentido na aba dela.
    if (tab !== "pokedex") ["regiao", "tipo", "formas"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, "", url);
  }, [tab]);

  // O resumo vive no link (?pokemon=6), então o botão "voltar" do navegador fecha ele.
  useEffect(() => {
    const onPop = () => {
      setSummaryId(readSummary());
      setFormId(readForm());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openSummary = useCallback((speciesId: number, form?: number) => {
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
      <Toolbar tab={summaryId !== null ? null : tab} setTab={goToTab} dark={theme.dark} toggleTheme={theme.toggle} />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {summaryId !== null ? (
          <SummaryView
            key={`${summaryId}-${formId}`}
            speciesId={summaryId}
            initialFormId={formId}
            onClose={closeSummary}
            onOpen={openSummary}
            onAddToTeam={team.add}
            onCompare={compare.add}
            teamIds={team.ids}
            compareIds={compare.ids}
            onTypes={setSummaryTypes}
          />
        ) : (
          <>
            <Hero />
            <div role="tabpanel" id={`painel-${tab}`} aria-labelledby={`aba-${tab}`} className="scroll-mt-24">
              {tab === "time" ? (
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
                />
                </div>
              ) : tab === "pokedex" ? (
                <Pokedex
                  onOpen={openSummary}
                  onAddToTeam={team.add}
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

/** Barra de ícones flutuante (estilo react-spring.dev). */
function Toolbar({
  tab,
  setTab,
  dark,
  toggleTheme,
}: {
  tab: Tab | null;
  setTab: (t: Tab) => void;
  dark: boolean;
  toggleTheme: () => void;
}) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
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
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <a
          href="./"
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1 shadow-sm backdrop-blur-xl sm:pr-3.5"
          aria-label="Dex Lab, início"
        >
          <img src="/favicon.svg" alt="" width={36} height={36} className="size-9" />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">Dex Lab</span>
        </a>

        <nav className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-sm backdrop-blur-xl">
          <div role="tablist" aria-label="Ferramentas" className="flex gap-1">
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
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
                }`}
              >
                {t.icon}
                {/* No celular só a aba aberta mostra o nome, para as três caberem. */}
                <span className={tab === t.id ? "" : "hidden sm:inline"}>{t.label}</span>
              </button>
            ))}
          </div>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
            className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-line/60 hover:text-ink"
          >
            {dark ? (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

const HEADLINE = ["Monte", "um", "time", "sem", "ponto", "fraco."];

/** Título grande com as palavras entrando em cascata, com mola (estilo gsap.com). */
function Hero() {
  const reduce = usePrefersReducedMotion();
  const trail = useTrail(HEADLINE.length, {
    from: { opacity: 0, transform: "translateY(60%) rotate(4deg)" },
    to: { opacity: 1, transform: "translateY(0%) rotate(0deg)" },
    config: { tension: 260, friction: 20 },
    immediate: reduce,
  });

  const start = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector('[role="tabpanel"]')?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="pt-14 pb-10 sm:pt-20 sm:pb-14">
      <h1
        aria-label={HEADLINE.join(" ")}
        className="font-display text-[3.2rem] leading-[0.92] font-extrabold tracking-[-0.045em] sm:text-7xl lg:text-[6.5rem]"
      >
        {trail.map((style, i) => (
          <span key={i} aria-hidden="true" className="inline-block overflow-hidden pr-[0.22em] pb-[0.08em] align-top">
            <animated.span style={style} className={`inline-block ${i === 2 ? "italic" : ""}`}>
              {HEADLINE[i]}
            </animated.span>
          </span>
        ))}
      </h1>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
        <p className="braces max-w-md text-lg leading-snug">
          Escolha até seis Pokémon e veja fraquezas, cobertura de tipos e o que falta no time. Compare status lado a lado ou explore a Pokédex inteira.
        </p>
        <a href="#painel" className="pill" onClick={start}>
          Começar
          <span className="pill-icon">
            <ArrowIcon direction="down" />
          </span>
        </a>
      </div>
    </section>
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
