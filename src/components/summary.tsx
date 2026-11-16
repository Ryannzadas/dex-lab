import { useEffect, useMemo, useState } from "react";
import {
  artworkUrl,
  displayName,
  getEvolutionChain,
  getPokemon,
  getSpecies,
  STAT_LABEL,
  type EvolutionStage,
  type LearnedMove,
  type MoveMethod,
  type Pokemon,
  type Species,
} from "@/lib/pokeapi";
import { multiplier, TYPE_INFO, TYPES, type TypeName } from "@/lib/types";
import { Info, StatBar } from "./compare";
import { CryButton, ShinyArtwork } from "./media";
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
  onCompare: (id: number) => void;
  teamIds: number[];
  compareIds: number[];
  onTypes: (types: TypeName[]) => void;
};

/** Resumo completo de um Pokémon, com abas para cada forma (Normal, Mega X, Alola…). */
export function SummaryView({ speciesId, initialFormId, onClose, onOpen, onAddToTeam, onCompare, teamIds, compareIds, onTypes }: Props) {
  const [species, setSpecies] = useState<Species | null>(null);
  const [formId, setFormId] = useState<number | null>(null);
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // O componente é recriado (key) a cada Pokémon, então o estado já começa vazio.
    let alive = true;
    getSpecies(speciesId)
      .then((s) => {
        if (!alive) return;
        setSpecies(s);
        const wanted = s.varieties.find((v) => v.id === initialFormId);
        setFormId(wanted?.id ?? s.varieties.find((v) => v.isDefault)?.id ?? speciesId);
      })
      .catch(() => alive && setError(true));
    window.scrollTo({ top: 0 });
    return () => {
      alive = false;
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

  return (
    <div className="grid grid-cols-1 gap-6 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="pill flex-row-reverse pr-4 pl-1.5">
          Voltar
          <span className="pill-icon rotate-180">
            <ArrowIcon />
          </span>
        </button>

        {species && species.varieties.length > 1 && (
          <div role="tablist" aria-label="Formas" className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1 backdrop-blur-xl">
            {species.varieties.map((v) => (
              <button
                key={v.id}
                role="tab"
                type="button"
                aria-selected={formId === v.id}
                onClick={() => setFormId(v.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  formId === v.id ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!species || !pokemon ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="h-[34rem] animate-pulse rounded-3xl border border-line bg-line/40" />
          <div className="h-[34rem] animate-pulse rounded-3xl border border-line bg-line/40" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
            <Header
              species={species}
              pokemon={pokemon}
              inTeam={teamIds.includes(pokemon.id)}
              teamFull={teamIds.length >= 6}
              inCompare={compareIds.includes(pokemon.id)}
              compareFull={compareIds.length >= 4}
              onAddToTeam={() => onAddToTeam(pokemon.id)}
              onCompare={() => onCompare(pokemon.id)}
            />
            <div className="grid grid-cols-1 content-start gap-6">
              <Stats pokemon={pokemon} />
              <Weaknesses types={pokemon.types} />
            </div>
          </div>
          <EvolutionCard species={species} current={speciesId} onOpen={onOpen} />
          <Moves pokemon={pokemon} fallback={battleFormUsesBaseMoves(species, formId) ? baseForm : null} />
        </>
      )}
    </div>
  );
}

function Header({
  species,
  pokemon,
  inTeam,
  teamFull,
  inCompare,
  compareFull,
  onAddToTeam,
  onCompare,
}: {
  species: Species;
  pokemon: Pokemon;
  inTeam: boolean;
  teamFull: boolean;
  inCompare: boolean;
  compareFull: boolean;
  onAddToTeam: () => void;
  onCompare: () => void;
}) {
  const color = TYPE_INFO[pokemon.types[0]].color;
  const second = TYPE_INFO[pokemon.types[1] ?? pokemon.types[0]].color;

  return (
    <Card className="relative overflow-hidden">
      <div
        className="-mx-5 -mt-5 grid place-items-center pt-8 pb-4 sm:-mx-6 sm:-mt-6"
        style={{ backgroundImage: `radial-gradient(60% 75% at 35% 45%, ${color}55, transparent 70%), radial-gradient(50% 60% at 70% 60%, ${second}40, transparent 70%)` }}
      >
        <ShinyArtwork key={pokemon.id} pokemon={pokemon} size={240} />
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            #{String(species.id).padStart(4, "0")}
            <span>· Geração {species.generation}</span>
            {species.badge && (
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-sans font-semibold text-amber-700 capitalize dark:text-amber-300">
                {species.badge}
              </span>
            )}
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{displayName(species.name)}</h1>
          {species.genus && <p className="mt-1 text-muted">{species.genus}</p>}
        </div>
        <CryButton key={pokemon.id} pokemon={pokemon} />
      </div>

      <div className="mt-3 flex gap-1.5">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onAddToTeam} disabled={inTeam || teamFull} className="pill">
          {inTeam ? "Já está no time" : teamFull ? "Time cheio" : "Adicionar ao time"}
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

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Info label="Altura" value={`${(pokemon.height / 10).toLocaleString("pt-BR")} m`} />
        <Info label="Peso" value={`${(pokemon.weight / 10).toLocaleString("pt-BR")} kg`} />
      </div>

      <div className="mt-5">
        <p className="mb-1.5 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Habilidades</p>
        <ul className="flex flex-wrap gap-1.5">
          {pokemon.abilities.map((a) => (
            <li key={a.name} className="rounded-full border border-line px-2.5 py-0.5 text-sm">
              {displayName(a.name)}
              {a.hidden && <span className="text-muted"> · oculta</span>}
            </li>
          ))}
        </ul>
      </div>

      {species.flavor && (
        <figure className="mt-5 border-t border-line pt-4">
          <blockquote className="braces text-[15px] leading-relaxed" lang="en">
            {species.flavor}
          </blockquote>
          <figcaption className="mt-2 text-xs text-muted">
            Pokédex de {species.flavorVersion} · texto original em inglês
            {/* A PokéAPI só tem descrição por espécie, então formas mostram a da forma normal. */}
            {species.varieties.some((v) => v.id === pokemon.id && !v.isDefault) && " · descrição da forma normal"}
          </figcaption>
        </figure>
      )}
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
        <div className="scroll-x -mx-2 flex items-center gap-2 overflow-x-auto px-2 pb-2">
          {columns.map((col, ci) => (
            <div key={ci} className="flex shrink-0 items-center gap-2">
              {ci > 0 && <span className="text-2xl text-muted" aria-hidden="true">→</span>}
              <div className="flex flex-col gap-2">
                {col.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => s.id !== current && onOpen(s.id)}
                    aria-current={s.id === current ? "page" : undefined}
                    className={`group flex w-32 flex-col items-center rounded-2xl border p-2 text-center transition ${
                      s.id === current ? "border-ink bg-surface-solid" : "border-line hover:-translate-y-0.5 hover:border-ink"
                    }`}
                  >
                    <img src={artworkUrl(s.id)} alt="" width={88} height={88} loading="lazy" className="size-22 transition-transform group-hover:scale-105" />
                    <span className="text-sm font-semibold">{displayName(s.name)}</span>
                    {s.how && <span className="mt-0.5 text-[11px] leading-tight text-muted">{s.how}</span>}
                  </button>
                ))}
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
                  <span className="w-11 shrink-0 font-mono text-xs text-muted">{m.level <= 1 ? "Nv 1" : `Nv ${m.level}`}</span>
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
