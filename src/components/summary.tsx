import { animated, useSpring } from "@react-spring/web";
import { useEffect, useMemo, useState } from "react";
import {
  artworkUrl,
  displayName,
  getEvolutionChain,
  getPokemon,
  getSpecies,
  STAT_LABEL,
  translateToPt,
  type EvolutionStage,
  type LearnedMove,
  type MoveMethod,
  type Pokemon,
  type Species,
} from "@/lib/pokeapi";
import { multiplier, TYPE_INFO, TYPES, type TypeName } from "@/lib/types";
import type { Availability } from "@/lib/games";
import { usePrefersReducedMotion } from "@/lib/state";
import { StatBar } from "./compare";
import { CryButton } from "./media";
import { CATEGORY_PT } from "@/lib/moves";
import { useMoveInfos } from "@/lib/use-moves";
import { ArrowIcon, Card, TypeBadge } from "./ui";

type Props = {
  speciesId: number;
  /** Forma que abre selecionada (ex.: Vulpix de Alola). */
  initialFormId?: number | null;
  onClose: () => void;
  onOpen: (speciesId: number, formId?: number) => void;
  onAddToTeam: (id: number) => void;
  /** Jogo do time aberto: bloqueia adicionar quem não existe nele. */
  check?: (speciesId: number, name: string) => Availability;
  onCompare: (id: number) => void;
  teamIds: number[];
  compareIds: number[];
  onTypes: (types: TypeName[]) => void;
};

const DEX_LANG_KEY = "dexlab:dex-idioma";
type DexLang = "pt" | "en";

function readDexLang(): DexLang {
  try {
    return localStorage.getItem(DEX_LANG_KEY) === "en" ? "en" : "pt";
  } catch {
    return "pt";
  }
}

function useTranslated(text: string | null, lang: DexLang) {
  const [res, setRes] = useState<{ src: string; txt: string | null } | null>(null);
  useEffect(() => {
    if (lang !== "pt" || !text) return;
    let alive = true;
    translateToPt(text)
      .then((t) => alive && setRes({ src: text, txt: t }))
      .catch(() => alive && setRes({ src: text, txt: null }));
    return () => {
      alive = false;
    };
  }, [text, lang]);

  if (!text) return { text: null, lang: "pt-BR", loading: false, failed: false };
  if (lang === "en") return { text, lang: "en", loading: false, failed: false };
  if (!res || res.src !== text) return { text, lang: "en", loading: true, failed: false };
  if (res.txt) return { text: res.txt, lang: "pt-BR", loading: false, failed: false };
  return { text, lang: "en", loading: false, failed: true };
}

/**
 * Resumo completo de um Pokémon (estrutura inspirada na página de Pokémon da Firma League):
 * - Palco da arte à esquerda com botão Shiny (que se mantém ao trocar de forma/Mega) e seletor de formas embaixo;
 * - Resumo à direita com tipos, categoria, medidas, habilidades e descrição da Pokédex com tradução PT/EN;
 * - Status base e Fraquezas lado a lado logo abaixo;
 * - Evolução e Golpes.
 */
export function SummaryView({
  speciesId,
  initialFormId,
  onClose,
  onOpen,
  onAddToTeam,
  onCompare,
  teamIds,
  compareIds,
  onTypes,
  check,
}: Props) {
  const [species, setSpecies] = useState<Species | null>(null);
  const [formId, setFormId] = useState<number | null>(null);
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [shiny, setShiny] = useState(false);
  const [burst, setBurst] = useState(0);
  const [formAnim, setFormAnim] = useState<"mega-in" | "mega-out" | null>(null);
  const [error, setError] = useState(false);
  const reduce = usePrefersReducedMotion();

  const [spring, api] = useSpring(() => ({
    transform: "scale(1) rotateY(0deg)",
    opacity: 1,
    config: { tension: 300, friction: 16 },
  }));

  useEffect(() => {
    let alive = true;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const raf = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    getSpecies(speciesId)
      .then((s) => {
        if (!alive) return;
        setSpecies(s);
        const wanted = s.varieties.find((v) => v.id === initialFormId);
        setFormId(wanted?.id ?? s.varieties.find((v) => v.isDefault)?.id ?? speciesId);
        requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [speciesId, initialFormId]);

  // Forma padrão: Megas e Gigantamax usam os golpes dela.
  const [baseForm, setBaseForm] = useState<Pokemon | null>(null);
  useEffect(() => {
    if (!species) return;
    const base = species.varieties.find((v) => v.isDefault);
    if (!base) return;
    let alive = true;
    getPokemon(base.id)
      .then((p) => alive && setBaseForm(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [species]);

  useEffect(() => {
    if (formId === null) return;
    let alive = true;
    getPokemon(formId)
      .then((p) => {
        if (!alive) return;
        setPokemon(p);
        onTypes(p.types);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [formId, onTypes]);

  const toggleShiny = () => {
    setShiny((s) => !s);
    setBurst((b) => b + 1);
    api.start({
      from: { transform: "scale(0.75) rotateY(-90deg)", opacity: 0.4 },
      to: { transform: "scale(1) rotateY(0deg)", opacity: 1 },
      immediate: reduce,
    });
  };

  const selectForm = (nextId: number, isDefault: boolean) => {
    if (nextId === formId) return;
    setFormAnim(isDefault ? "mega-out" : "mega-in");
    setFormId(nextId);
  };

  if (error) {
    return (
      <Card className="mt-6 text-center">
        <p className="text-muted">Não deu pra carregar esse Pokémon. Confira a conexão e tente de novo.</p>
        <button type="button" onClick={onClose} className="pill mt-4">
          Voltar
          <span className="pill-icon">
            <ArrowIcon />
          </span>
        </button>
      </Card>
    );
  }

  const activeVariety = species?.varieties.find((v) => v.id === formId) ?? null;
  const loadingForm = species !== null && pokemon !== null && formId !== null && pokemon.id !== formId;
  const titleName =
    species && activeVariety && !activeVariety.isDefault
      ? `${displayName(species.name)} (${activeVariety.label === "Normal" ? "Base" : activeVariety.label})`
      : species
        ? displayName(species.name)
        : "…";

  return (
    <div className="grid grid-cols-1 gap-6 pt-8">
      {/* Topo estilo Firma League: Voltar, #número + nome grande e botões de Pokémon vizinhos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="pill flex-row-reverse pr-4 pl-1.5">
          Voltar
          <span className="pill-icon rotate-180">
            <ArrowIcon />
          </span>
        </button>

        <nav aria-label="Pokémon vizinhos" className="flex items-center gap-1.5">
          {speciesId > 1 && (
            <button
              type="button"
              onClick={() => onOpen(speciesId - 1)}
              aria-label={`Pokémon anterior (#${String(speciesId - 1).padStart(4, "0")})`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-muted backdrop-blur transition-colors hover:border-ink hover:text-ink"
            >
              <span aria-hidden="true">←</span> #{String(speciesId - 1).padStart(4, "0")}
            </button>
          )}
          {speciesId < 1025 && (
            <button
              type="button"
              onClick={() => onOpen(speciesId + 1)}
              aria-label={`Próximo Pokémon (#${String(speciesId + 1).padStart(4, "0")})`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold text-muted backdrop-blur transition-colors hover:border-ink hover:text-ink"
            >
              #{String(speciesId + 1).padStart(4, "0")} <span aria-hidden="true">→</span>
            </button>
          )}
        </nav>
      </div>

      <div>
        <p className="flex flex-wrap items-center gap-2 font-mono text-xs font-semibold text-muted">
          <span>#{String(speciesId).padStart(4, "0")}</span>
          {species && <span>· Geração {species.generation}</span>}
          {species?.badge && (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-sans text-xs font-semibold text-amber-700 capitalize dark:text-amber-300">
              {species.badge}
            </span>
          )}
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-0.035em] sm:text-5xl">{titleName}</h1>
      </div>

      {!species || !pokemon ? (
        <div className="grid gap-6 lg:grid-cols-[5fr_6fr]">
          <div className="h-[22rem] animate-pulse rounded-3xl border border-line bg-line/40" />
          <div className="h-[22rem] animate-pulse rounded-3xl border border-line bg-line/40" />
        </div>
      ) : (
        <>
          {/* Hero em duas colunas como na Firma League: palco da arte à esquerda + ficha de resumo à direita */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[5fr_6fr]">
            <ArtStage
              species={species}
              pokemon={pokemon}
              formId={formId ?? pokemon.id}
              shiny={shiny}
              burst={burst}
              spring={spring}
              formAnim={formAnim}
              loadingForm={loadingForm}
              activeLabel={activeVariety?.label ?? null}
              onClearAnim={() => setFormAnim(null)}
              onToggleShiny={toggleShiny}
              onSelectForm={selectForm}
            />

            <SummaryDetails
              species={species}
              pokemon={pokemon}
              inTeam={teamIds.includes(pokemon.id)}
              teamFull={teamIds.length >= 6}
              blocked={check?.(speciesId, pokemon.name) === "blocked"}
              inCompare={compareIds.includes(pokemon.id)}
              compareFull={compareIds.length >= 4}
              onAddToTeam={() => onAddToTeam(pokemon.id)}
              onCompare={() => onCompare(pokemon.id)}
            />
          </div>

          {/* Status base e Fraquezas lado a lado */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Stats pokemon={pokemon} />
            <Weaknesses types={pokemon.types} />
          </div>

          <EvolutionCard species={species} current={speciesId} onOpen={onOpen} />
          <Moves pokemon={pokemon} fallback={battleFormUsesBaseMoves(species, formId) ? baseForm : null} />
        </>
      )}
    </div>
  );
}

/**
 * Palco da arte oficial (estilo .mon-art da Firma League):
 * - Mantém o estado Shiny ao alternar entre Base, Mega X/Y, Primal, regional ou Gigantamax;
 * - Faz a animação de clarão (mega-in / mega-out) na troca de forma;
 * - Botão "✦ Shiny / Normal" e botão de grito no topo direito;
 * - Seletor de formas flutuante no canto inferior esquerdo.
 */
function ArtStage({
  species,
  pokemon,
  formId,
  shiny,
  burst,
  spring,
  formAnim,
  loadingForm,
  activeLabel,
  onClearAnim,
  onToggleShiny,
  onSelectForm,
}: {
  species: Species;
  pokemon: Pokemon;
  formId: number;
  shiny: boolean;
  burst: number;
  spring: { transform: any; opacity: any };
  formAnim: "mega-in" | "mega-out" | null;
  loadingForm: boolean;
  activeLabel: string | null;
  onClearAnim: () => void;
  onToggleShiny: () => void;
  onSelectForm: (id: number, isDefault: boolean) => void;
}) {
  const reduce = usePrefersReducedMotion();
  const color = TYPE_INFO[pokemon.types[0]].color;
  const second = TYPE_INFO[pokemon.types[1] ?? pokemon.types[0]].color;

  // Pré-carrega a versão shiny da forma atual para a troca ser instantânea.
  const preloadShiny = () => {
    const img = new Image();
    img.src = artworkUrl(formId, !shiny);
  };

  return (
    <Card className="relative isolate grid min-h-[21rem] place-items-center overflow-hidden p-6 sm:min-h-[24rem]">
      {/* Fundo colorido pelos tipos + faixa listrada sutil na base como no .mon-art da Firma League */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(65% 75% at 38% 42%, ${color}50, transparent 72%), radial-gradient(55% 65% at 72% 62%, ${second}38, transparent 72%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[30%]"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.035) 0 24px, transparent 24px 48px)",
        }}
        aria-hidden="true"
      />

      {loadingForm && activeLabel && (
        <span className="absolute top-4 left-4 z-10 rounded-full bg-surface-solid/90 px-3 py-1 font-mono text-xs font-semibold text-muted shadow-sm backdrop-blur">
          Carregando {activeLabel}…
        </span>
      )}

      {/* Topo direito: Som + botão Shiny/Normal (que se mantém entre formas) */}
      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
        <CryButton key={pokemon.id} pokemon={pokemon} />
        <button
          type="button"
          onClick={onToggleShiny}
          onPointerEnter={preloadShiny}
          onFocus={preloadShiny}
          aria-pressed={shiny}
          title={shiny ? "Mostrando versão shiny (clique para voltar ao normal)" : "Ver versão shiny"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm transition ${
            shiny
              ? "border-amber-400 bg-amber-400 text-stone-950 shadow-[0_0_20px_rgb(251_191_36/0.55)]"
              : "border-line bg-surface-solid/90 text-ink backdrop-blur hover:border-amber-400"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5l1.8 5.2 5.2 1.8-5.2 1.8L12 16.5l-1.8-5.2L5 9.5l5.2-1.8L12 2.5Z" />
            <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
          </svg>
          <span>{shiny ? "Shiny" : "Normal"}</span>
        </button>
      </div>

      {/* Arte oficial com clarão de Mega Evolução e giro de Shiny */}
      <div className="relative my-6 grid place-items-center" style={{ perspective: 600 }}>
        <animated.img
          key={`${formId}-${shiny ? "s" : "n"}`}
          src={artworkUrl(formId, shiny)}
          alt={`${displayName(species.name)}${activeLabel && activeLabel !== "Normal" ? ` ${activeLabel}` : ""}${shiny ? " shiny" : ""}`}
          width={320}
          height={320}
          style={spring}
          onAnimationEnd={onClearAnim}
          className={`w-[min(82%,300px)] drop-shadow-[0_18px_20px_rgb(0_0_0/0.24)] ${formAnim ?? ""}`}
        />

        {burst > 0 && shiny && !reduce && (
          <div key={burst} className="pointer-events-none absolute inset-0" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span
                key={i}
                className="sparkle absolute top-1/2 left-1/2 text-amber-400"
                style={{ "--a": `${i * 45}deg` } as React.CSSProperties}
              >
                ✦
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Seletor de formas flutuante no canto inferior esquerdo, igual ao .form-toggle da Firma League */}
      {species.varieties.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Forma"
          className="absolute bottom-3.5 left-3.5 z-10 flex max-w-[calc(100%-1.75rem)] flex-wrap gap-1 rounded-full border border-line bg-surface-solid/95 p-1 shadow-md backdrop-blur"
        >
          {species.varieties.map((v) => {
            const active = formId === v.id;
            const isGem = !v.isDefault && /^(Mega|Primal)/.test(v.label);
            const label = v.isDefault ? "Base" : v.label;
            return (
              <button
                key={v.id}
                role="radio"
                type="button"
                aria-checked={active}
                onClick={() => onSelectForm(v.id, v.isDefault)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  active ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
                }`}
              >
                {isGem && (
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 3h12l4 6-10 13L2 9Z" strokeLinejoin="round" />
                    <path d="M11 3 8 9l4 13 4-13-3-6M2 9h20" strokeLinejoin="round" />
                  </svg>
                )}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Ficha lateral de resumo (.mon-summary da Firma League). */
function SummaryDetails({
  species,
  pokemon,
  inTeam,
  teamFull,
  inCompare,
  compareFull,
  onAddToTeam,
  onCompare,
  blocked,
}: {
  species: Species;
  pokemon: Pokemon;
  inTeam: boolean;
  teamFull: boolean;
  inCompare: boolean;
  compareFull: boolean;
  onAddToTeam: () => void;
  blocked: boolean;
  onCompare: () => void;
}) {
  const [lang, setLangState] = useState<DexLang>(readDexLang);
  const setLang = (next: DexLang) => {
    setLangState(next);
    try {
      localStorage.setItem(DEX_LANG_KEY, next);
    } catch {
      // ignora
    }
  };
  const genus = useTranslated(species.genus, lang);
  const flavor = useTranslated(species.flavor, lang);
  const activeVariety = species.varieties.find((v) => v.id === pokemon.id);
  const isMega = !!activeVariety && !activeVariety.isDefault && /^Mega/.test(activeVariety.label);
  const isPrimal = !!activeVariety && !activeVariety.isDefault && /^Primal/.test(activeVariety.label);
  const isGmax = !!activeVariety && !activeVariety.isDefault && /^Gigantamax/.test(activeVariety.label);

  return (
    <Card className="grid content-start gap-4">
      <div>
        <div className="flex flex-wrap gap-1.5">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        {genus.text && (
          <p className={`mt-2 font-display text-lg italic text-muted ${genus.loading ? "opacity-50" : ""}`} lang={genus.lang}>
            {genus.text}
          </p>
        )}
      </div>

      {/* Medidas e Habilidades lado a lado como no .mon-measures da Firma League */}
      <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-surface-solid/60 p-4 sm:grid-cols-[auto_auto_1fr] sm:gap-6">
        <div>
          <dt className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Altura</dt>
          <dd className="mt-1 font-mono text-base font-bold">{(pokemon.height / 10).toLocaleString("pt-BR")} m</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Peso</dt>
          <dd className="mt-1 font-mono text-base font-bold">{(pokemon.weight / 10).toLocaleString("pt-BR")} kg</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Habilidades</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {pokemon.abilities.map((a) => (
              <span key={a.name} className="rounded-lg border border-line bg-surface-solid px-2.5 py-0.5 text-sm font-semibold">
                {displayName(a.name)}
                {a.hidden && <em className="not-italic font-normal text-muted"> (oculta)</em>}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {/* Caixa de descrição da Pokédex com seletor PT | EN embutido no canto superior direito */}
      {flavor.text && (
        <blockquote
          aria-busy={flavor.loading}
          className="relative rounded-2xl border border-line bg-surface-solid/60 p-4 text-[15px] leading-relaxed"
        >
          <span
            role="group"
            aria-label="Idioma da descrição"
            lang="pt-BR"
            className="float-right -mt-1 -mr-1 mb-1 ml-3 inline-flex rounded-lg border border-line bg-bg p-0.5 text-[11px] font-bold"
          >
            {(["pt", "en"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={lang === m}
                onClick={() => setLang(m)}
                className={`rounded-md px-2 py-0.5 uppercase transition-colors ${
                  lang === m ? "bg-surface-solid text-ink shadow-xs" : "text-muted hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </span>
          <span lang={flavor.lang} className={flavor.loading ? "opacity-45 transition-opacity" : " transition-opacity"}>
            {flavor.text}
          </span>
          <cite className="mt-2 block text-xs not-italic text-muted" lang="pt-BR">
            Pokédex de {species.flavorVersion}
            {lang === "pt" && !flavor.loading && (
              <>{flavor.failed ? " · tradução indisponível agora, mostrando o original" : " · tradução automática"}</>
            )}
            {lang === "en" && " · texto original em inglês"}
            {species.varieties.some((v) => v.id === pokemon.id && !v.isDefault) && " · descrição da forma base"}
          </cite>
        </blockquote>
      )}

      {(isMega || isPrimal || isGmax) && (
        <p className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface-solid/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
          <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 3h12l4 6-10 13L2 9Z" strokeLinejoin="round" />
            <path d="M11 3 8 9l4 13 4-13-3-6M2 9h20" strokeLinejoin="round" />
          </svg>
          <span>
            {isPrimal
              ? "Forma Primal: Reversão Primal ativada na batalha segurando o Orb correspondente."
              : isGmax
                ? "Forma Gigantamax: transformação temporária de batalha em Dynamax."
                : "Mega Evolução: precisa da Mega Stone correspondente na batalha. No máximo 1 Mega por batalha."}
          </span>
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-2.5">
        <button type="button" onClick={onAddToTeam} disabled={inTeam || teamFull || blocked} className="pill">
          {inTeam ? "Já está no time" : blocked ? "Não está no jogo do time" : teamFull ? "Time cheio" : "Adicionar ao time"}
          <span className="pill-icon">
            <ArrowIcon direction="up-right" />
          </span>
        </button>
        <button type="button" onClick={onCompare} disabled={inCompare || compareFull} className="pill border-line">
          {inCompare ? "Já na comparação" : compareFull ? "Comparação cheia" : "Comparar"}
          <span className="pill-icon">
            <ArrowIcon direction="up-right" />
          </span>
        </button>
      </div>
    </Card>
  );
}

function Stats({ pokemon }: { pokemon: Pokemon }) {
  const color = TYPE_INFO[pokemon.types[0]].color;
  const total = pokemon.stats.reduce((a, s) => a + s.value, 0);
  const max = Math.max(...pokemon.stats.map((s) => s.value));
  return (
    <Card>
      <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Status base</p>
      <dl className="grid gap-2.5">
        {pokemon.stats.map((s) => (
          <StatBar key={`${pokemon.id}-${s.key}`} label={STAT_LABEL[s.key]} value={s.value} color={color} top={s.value === max} />
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
          <dt className="text-sm font-semibold">Total</dt>
          <dd className="font-mono text-sm font-bold">{total}</dd>
        </div>
      </dl>
    </Card>
  );
}

function Weaknesses({ types }: { types: TypeName[] }) {
  const groups = useMemo(() => {
    const by = new Map<number, TypeName[]>();
    for (const atk of TYPES) {
      const m = multiplier(atk, types);
      if (m === 1) continue;
      by.set(m, [...(by.get(m) ?? []), atk]);
    }
    return [
      { label: "Fraco (4×)", m: 4, tone: "text-red-600 dark:text-red-400" },
      { label: "Fraco (2×)", m: 2, tone: "text-red-600 dark:text-red-400" },
      { label: "Resiste (½×)", m: 0.5, tone: "text-emerald-700 dark:text-emerald-400" },
      { label: "Resiste (¼×)", m: 0.25, tone: "text-emerald-700 dark:text-emerald-400" },
      { label: "Imune (0×)", m: 0, tone: "text-ink" },
    ]
      .map((g) => ({ ...g, list: by.get(g.m) ?? [] }))
      .filter((g) => g.list.length > 0);
  }, [types]);

  return (
    <Card>
      <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Fraquezas e resistências</p>
      <dl className="grid gap-3">
        {groups.map((g) => (
          <div key={g.label} className="grid gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:items-center">
            <dt className={`text-sm font-semibold ${g.tone}`}>{g.label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {g.list.map((t) => (
                <TypeBadge key={t} type={t} size="sm" />
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function EvolutionCard({ species, current, onOpen }: { species: Species; current: number; onOpen: (id: number) => void }) {
  const [stages, setStages] = useState<EvolutionStage[] | null>(null);

  useEffect(() => {
    let alive = true;
    getEvolutionChain(species.evolutionUrl, { id: species.id, name: species.name })
      .then((s) => alive && setStages(s))
      .catch(() => alive && setStages([]));
    return () => {
      alive = false;
    };
  }, [species]);

  if (stages === null) return <div className="h-40 animate-pulse rounded-3xl border border-line bg-line/40" />;

  // Agrupa por profundidade: ramificações (como a Eevee) ficam empilhadas na mesma coluna.
  const columns = [...new Set(stages.map((s) => s.depth))].map((d) => stages.filter((s) => s.depth === d));

  return (
    <Card>
      <p className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Evolução</p>
      {stages.length <= 1 ? (
        <p className="text-sm text-muted">Este Pokémon não evolui.</p>
      ) : (
        <div className="scroll-x -mx-2 flex flex-col items-center gap-3 overflow-x-auto px-2 pb-2 sm:flex-row">
          {columns.map((col, ci) => (
            <div key={ci} className="flex shrink-0 flex-col items-center gap-3 sm:flex-row">
              {ci > 0 && (
                <span className="rotate-90 text-xl text-muted sm:rotate-0" aria-hidden="true">
                  →
                </span>
              )}
              <div className="flex flex-wrap justify-center gap-2.5 sm:flex-col">
                {col.map((s) => {
                  const isCurrent = s.id === current;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
                      {s.how && (
                        <span className="max-w-36 text-center font-mono text-[11px] font-semibold leading-tight text-muted">
                          {s.how}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => !isCurrent && onOpen(s.id)}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`group flex w-32 flex-col items-center rounded-2xl border p-2.5 text-center transition ${
                          isCurrent
                            ? "border-ink bg-ink text-bg shadow-md"
                            : "border-line bg-surface-solid/70 hover:-translate-y-0.5 hover:border-ink"
                        }`}
                      >
                        <img
                          src={artworkUrl(s.id)}
                          alt=""
                          width={88}
                          height={88}
                          loading="lazy"
                          className="size-20 transition-transform group-hover:scale-105"
                        />
                        <span className="mt-1 text-sm font-bold">{displayName(s.name)}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const METHOD_TABS: { id: MoveMethod; label: string }[] = [
  { id: "level", label: "Por nível" },
  { id: "machine", label: "Por TM" },
  { id: "egg", label: "Ovo" },
  { id: "tutor", label: "Tutor" },
];

/** Mega, Gigantamax e Primal são transformações de batalha: aprendem os mesmos golpes da forma normal. */
function battleFormUsesBaseMoves(species: Species, formId: number | null) {
  const v = species.varieties.find((x) => x.id === formId);
  return !!v && !v.isDefault && /^(Mega|Gigantamax|Primal)/.test(v.label);
}

function Moves({ pokemon: form, fallback }: { pokemon: Pokemon; fallback: Pokemon | null }) {
  const pokemon = fallback ?? form;
  const counts = Object.fromEntries(METHOD_TABS.map((t) => [t.id, pokemon.moves.filter((m) => m.method === t.id).length])) as Record<
    MoveMethod,
    number
  >;
  const [tab, setTab] = useState<MoveMethod>("level");
  const active = counts[tab] > 0 ? tab : (METHOD_TABS.find((t) => counts[t.id] > 0)?.id ?? "level");

  const list: LearnedMove[] = pokemon.moves
    .filter((m) => m.method === active)
    .sort((a, b) => (active === "level" ? a.level - b.level : 0) || a.name.localeCompare(b.name));
  // Detalhes (tipo, categoria, poder) só dos golpes da aba aberta.
  const infos = useMoveInfos(list.map((m) => m.name));

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Golpes</p>
          {pokemon.movesVersion && (
            <p className="mt-1 text-sm text-muted">
              Jogo de referência: {displayName(pokemon.movesVersion)}
              {fallback && " · mesmos golpes da forma normal"}
            </p>
          )}
        </div>
        <div role="tablist" aria-label="Como aprende" className="flex flex-wrap gap-1 rounded-2xl border border-line p-1">
          {METHOD_TABS.filter((t) => counts[t.id] > 0).map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                active === t.id ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
              }`}
            >
              {t.label} <span className="font-mono text-xs opacity-70">{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted">Sem golpes registrados para esta forma.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {list.map((m) => {
            const info = infos[m.name];
            return (
              <li
                key={`${m.name}-${m.level}`}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm"
              >
                {active === "level" && (
                  <span className="w-11 shrink-0 font-mono text-xs text-muted">{m.level === 0 ? "Evo" : m.level <= 1 ? "Nv 1" : `Nv ${m.level}`}</span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{displayName(m.name)}</span>
                {info ? (
                  <span className="flex shrink-0 items-center gap-2">
                    {info.type && <TypeBadge type={info.type} size="sm" />}
                    <span className="w-14 text-xs text-muted">{CATEGORY_PT[info.category]}</span>
                    <span className="w-9 text-right font-mono text-xs" title="Poder">
                      {info.power ?? "—"}
                    </span>
                  </span>
                ) : (
                  <span className="h-4 w-32 shrink-0 animate-pulse rounded-full bg-line" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Nomes dos golpes em inglês, como na PokéAPI. A última coluna é o poder.</p>
    </Card>
  );
}
