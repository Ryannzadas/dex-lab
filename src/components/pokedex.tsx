import { useEffect, useMemo, useRef, useState } from "react";
import { buildEntries, getTypeIndex, REGIONS, type DexEntry, type RegionId } from "@/lib/dex";
import { artworkUrl, getPokemonList, pokemonName } from "@/lib/pokeapi";
import { TYPE_INFO, TYPES, type TypeName } from "@/lib/types";
import { Card, SectionHeading, TypeBadge } from "./ui";

const PAGE = 60;

type Props = {
  onOpen: (speciesId: number, formId?: number) => void;
  onAddToTeam: (id: number) => void;
  teamIds: number[];
  teamFull: boolean;
  onTypes: (types: TypeName[]) => void;
};

function readFilters() {
  const p = new URLSearchParams(window.location.search);
  const region = REGIONS.find((r) => r.id === p.get("regiao"))?.id ?? null;
  const types = (p.get("tipo") ?? "")
    .split(",")
    .filter((t): t is TypeName => (TYPES as readonly string[]).includes(t))
    .slice(0, 2);
  return { region, types, forms: p.get("formas") === "1" };
}

/** Pokédex com busca e filtros por região e tipo. Clicar num Pokémon abre o resumo. */
export function Pokedex({ onOpen, onAddToTeam, teamIds, teamFull, onTypes }: Props) {
  const [initial] = useState(readFilters);
  const [entries, setEntries] = useState<DexEntry[] | null>(null);
  const [typeIndex, setTypeIndex] = useState<Record<number, TypeName[]> | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionId | null>(initial.region);
  const [types, setTypes] = useState<TypeName[]>(initial.types);
  const [forms, setForms] = useState(initial.forms);
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPokemonList()
      .then((list) => setEntries(buildEntries(list)))
      .catch(() => setError(true));
    getTypeIndex()
      .then(setTypeIndex)
      .catch(() => setError(true));
  }, []);

  // Filtros no link, para dá pra compartilhar "Pokédex de Kanto, tipo Fogo".
  useEffect(() => {
    const url = new URL(window.location.href);
    if (region) url.searchParams.set("regiao", region);
    else url.searchParams.delete("regiao");
    if (types.length) url.searchParams.set("tipo", types.join(","));
    else url.searchParams.delete("tipo");
    if (forms) url.searchParams.set("formas", "1");
    else url.searchParams.delete("formas");
    window.history.replaceState(window.history.state, "", url);
  }, [region, types, forms]);

  // As manchas do fundo seguem os tipos escolhidos no filtro.
  useEffect(() => onTypes(types), [types, onTypes]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase().replace(/^#/, "");
    const asNumber = Number(q);
    const words = q.split(/[\s-]+/).filter(Boolean);
    return entries
      .filter((e) => forms || !e.isForm)
      .filter((e) => !region || e.region === region)
      .filter((e) => types.every((t) => typeIndex?.[e.id]?.includes(t)))
      .filter((e) => {
        if (!q) return true;
        if (Number.isInteger(asNumber) && asNumber > 0) return e.dexNumber === asNumber;
        return words.every((w) => e.name.includes(w));
      })
      .sort((a, b) => a.dexNumber - b.dexNumber || Number(a.isForm) - Number(b.isForm) || a.id - b.id);
  }, [entries, typeIndex, query, region, types, forms]);

  // Volta para o começo da lista quando o filtro muda.
  const filterKey = `${query}|${region}|${types.join()}|${forms}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setShown(PAGE);
  }

  // Carrega mais conforme a pessoa rola até o fim.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setShown((s) => s + PAGE), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const toggleType = (t: TypeName) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 2 ? [cur[1], t] : [...cur, t]));

  const chip = (active: boolean) =>
    `shrink-0 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink hover:text-ink"
    }`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="relative z-20">
        <SectionHeading kicker={entries ? `Pokédex · ${filtered.length} Pokémon` : "Pokédex"} title="Todos os Pokémon">
          Filtre por região e por tipo (até dois juntos). Clique num Pokémon para abrir o resumo.
        </SectionHeading>

        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-solid px-4 py-3 transition-colors focus-within:border-ink">
          <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Filtrar por nome ou número"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou número (ex.: Gengar, 94)"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <fieldset className="mt-5 min-w-0">
          <legend className="mb-2 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Região</legend>
          <div className="scroll-x flex gap-2 overflow-x-auto pb-1">
            <button type="button" aria-pressed={!region} className={chip(!region)} onClick={() => setRegion(null)}>
              Todas
            </button>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={region === r.id}
                className={chip(region === r.id)}
                onClick={() => setRegion(region === r.id ? null : r.id)}
              >
                {r.label} <span className="font-mono text-[11px] opacity-60">G{r.gen}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4 min-w-0">
          <legend className="mb-2 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
            Tipo {types.length > 0 && <span className="normal-case">· {types.map((t) => TYPE_INFO[t].pt).join(" + ")}</span>}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleType(t)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium text-white transition ${
                    on ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : types.length ? "opacity-45 hover:opacity-100" : "hover:brightness-110"
                  }`}
                  style={{ background: TYPE_INFO[t].color, textShadow: "0 1px 1px rgb(0 0 0 / 0.35)" }}
                >
                  {TYPE_INFO[t].pt}
                </button>
              );
            })}
            {types.length > 0 && (
              <button type="button" onClick={() => setTypes([])} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-ink">
                Limpar tipos
              </button>
            )}
          </div>
        </fieldset>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={forms} onChange={(e) => setForms(e.target.checked)} className="size-4 accent-current" />
          Mostrar formas regionais, Mega e Gigantamax
        </label>
      </Card>

      {error && (
        <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
          Não deu pra carregar a Pokédex. Confira a conexão e recarregue a página.
        </p>
      )}

      {!entries ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl border border-line bg-line/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-muted">
          <span className="braces text-lg">Nenhum Pokémon com esses filtros</span>
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.slice(0, shown).map((e) => (
              <DexCard
                key={e.id}
                entry={e}
                types={typeIndex?.[e.id] ?? null}
                inTeam={teamIds.includes(e.id)}
                teamFull={teamFull}
                onOpen={() => onOpen(e.dexNumber, e.isForm ? e.id : undefined)}
                onAdd={() => onAddToTeam(e.id)}
              />
            ))}
          </ul>
          {shown < filtered.length && <div ref={sentinel} className="h-10" aria-hidden="true" />}
        </>
      )}
    </div>
  );
}

function DexCard({
  entry,
  types,
  inTeam,
  teamFull,
  onOpen,
  onAdd,
}: {
  entry: DexEntry;
  types: TypeName[] | null;
  inTeam: boolean;
  teamFull: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const name = pokemonName(entry.name);
  const color = types ? TYPE_INFO[types[0]].color : "transparent";
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir resumo de ${name}`}
        className="flex aspect-[4/5] w-full flex-col items-center justify-end overflow-hidden rounded-3xl border border-line bg-surface p-3 text-center backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-ink"
        style={{ backgroundImage: `radial-gradient(90% 60% at 50% 35%, ${color}40, transparent 70%)` }}
      >
        <img
          src={artworkUrl(entry.id)}
          alt=""
          width={140}
          height={140}
          loading="lazy"
          decoding="async"
          className="mb-auto w-[78%] drop-shadow-[0_8px_12px_rgb(0_0_0/0.16)] transition-transform duration-500 group-hover:scale-110"
        />
        <span className="font-mono text-[11px] text-muted">#{String(entry.dexNumber).padStart(4, "0")}</span>
        <span className="w-full truncate font-display text-sm font-bold">{name}</span>
        <span className="mt-1.5 flex min-h-5 flex-wrap justify-center gap-1">
          {types ? types.map((t) => <TypeBadge key={t} type={t} size="sm" />) : <span className="h-4 w-14 animate-pulse rounded-full bg-line" />}
        </span>
      </button>
      <button
        type="button"
        onClick={onAdd}
        disabled={inTeam || teamFull}
        aria-label={inTeam ? `${name} já está no time` : `Adicionar ${name} ao time`}
        title={inTeam ? "Já está no time" : teamFull ? "Time cheio" : "Adicionar ao time"}
        className={`absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full border text-base font-semibold transition ${
          inTeam ? "border-ink bg-ink text-bg" : "border-line bg-surface-solid/90 text-muted hover:border-ink hover:text-ink disabled:opacity-40"
        }`}
      >
        {inTeam ? "✓" : "+"}
      </button>
    </li>
  );
}
