import { animated, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";
import {
  displayName,
  getEvolution,
  pokemonName,
  speciesIdOf,
  spriteUrl,
  STAT_LABEL,
  type EvolutionStage,
  type Pokemon,
} from "@/lib/pokeapi";
import { usePrefersReducedMotion } from "@/lib/state";
import { TYPE_INFO } from "@/lib/types";
import { CryButton, ShinyArtwork } from "./media";
import { PokemonSearch } from "./search";
import { Card, SectionHeading, TypeBadge } from "./ui";

const MAX = 4;
const STAT_MAX = 255;

type Props = {
  ids: number[];
  list: Pokemon[];
  pending: number[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onOpen: (speciesId: number, formId?: number) => void;
};

export function CompareTab({ ids, list, pending, onAdd, onRemove, onOpen }: Props) {
  const best = bestPerStat(list);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <SectionHeading kicker={`Comparar · ${ids.length}/${MAX}`} title="Lado a lado">
          Coloque de dois a quatro Pokémon pra comparar status base, habilidades e evolução. O maior valor de cada status fica
          destacado.
        </SectionHeading>
        <PokemonSearch
          label="Adicionar Pokémon à comparação"
          onPick={onAdd}
          disabled={ids.length >= MAX}
          exclude={ids}
          placeholder={ids.length >= MAX ? "Comparação cheia! Remova alguém para trocar." : undefined}
        />
      </Card>

      {list.length === 0 && pending.length === 0 ? (
        <p className="py-6 text-center text-muted">
          <span className="braces text-lg">Adicione dois Pokémon pra começar a comparar</span>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((p) => (
            <Column key={p.id} pokemon={p} best={best} onRemove={() => onRemove(p.id)} onOpen={() => onOpen(speciesIdOf(p), p.id)} />
          ))}
          {pending.map((id) => (
            <div key={id} className="h-96 animate-pulse rounded-3xl border border-line bg-line/40" aria-label="Carregando" />
          ))}
        </div>
      )}
    </div>
  );
}

function bestPerStat(list: Pokemon[]) {
  const best: Record<string, number> = {};
  if (list.length < 2) return best;
  for (const p of list) {
    for (const s of p.stats) best[s.key] = Math.max(best[s.key] ?? 0, s.value);
    const total = p.stats.reduce((a, s) => a + s.value, 0);
    best.total = Math.max(best.total ?? 0, total);
  }
  return best;
}

function Column({
  pokemon,
  best,
  onRemove,
  onOpen,
}: {
  pokemon: Pokemon;
  best: Record<string, number>;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const total = pokemon.stats.reduce((a, s) => a + s.value, 0);
  const color = TYPE_INFO[pokemon.types[0]].color;

  return (
    <Card className="relative flex flex-col gap-5 p-5!">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${pokemonName(pokemon.name)} da comparação`}
        className="absolute top-4 right-4 grid size-8 place-items-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className="-mx-5 -mt-5 grid place-items-center rounded-t-3xl pt-6 pb-2"
        style={{ backgroundImage: `radial-gradient(70% 80% at 50% 40%, ${color}55, transparent 75%)` }}
      >
        <ShinyArtwork pokemon={pokemon} />
      </div>

      <div>
        <p className="font-mono text-xs text-muted">#{String(pokemon.id).padStart(4, "0")}</p>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-2xl font-bold tracking-tight">
            <button
              type="button"
              onClick={onOpen}
              className="text-left underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink"
              title="Ver resumo completo"
            >
              {pokemonName(pokemon.name)}
            </button>
          </h3>
          <CryButton pokemon={pokemon} />
        </div>
        <div className="mt-2 flex gap-1.5">
          {pokemon.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <dl className="grid gap-2">
        {pokemon.stats.map((s) => (
          <StatBar key={s.key} label={STAT_LABEL[s.key]} value={s.value} color={color} top={best[s.key] === s.value} />
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
          <dt className="text-sm font-semibold">Total</dt>
          <dd className={`font-mono text-sm ${best.total === total ? "font-bold" : "text-muted"}`}>
            {total}
            {best.total === total && " ★"}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Altura" value={`${(pokemon.height / 10).toLocaleString("pt-BR")} m`} />
        <Info label="Peso" value={`${(pokemon.weight / 10).toLocaleString("pt-BR")} kg`} />
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Habilidades</p>
        <ul className="flex flex-wrap gap-1.5">
          {pokemon.abilities.map((a) => (
            <li key={a.name} className="rounded-full border border-line px-2.5 py-0.5 text-xs">
              {displayName(a.name)}
              {a.hidden && <span className="text-muted"> · oculta</span>}
            </li>
          ))}
        </ul>
      </div>

      <Evolution pokemon={pokemon} />
    </Card>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function StatBar({ label, value, color, top }: { label: string; value: number; color: string; top: boolean }) {
  const reduce = usePrefersReducedMotion();
  const spring = useSpring({
    from: { width: "0%" },
    to: { width: `${Math.min(100, (value / STAT_MAX) * 100)}%` },
    config: { tension: 170, friction: 18 },
    immediate: reduce,
  });

  return (
    <div className="grid grid-cols-[5.5rem_2.25rem_1fr] items-center gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-right font-mono text-xs ${top ? "font-bold" : ""}`}>{value}</dd>
      <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <animated.div className="h-full rounded-full" style={{ ...spring, background: top ? color : `${color}99` }} />
      </div>
    </div>
  );
}

function Evolution({ pokemon }: { pokemon: Pokemon }) {
  const [stages, setStages] = useState<EvolutionStage[] | null>(null);

  useEffect(() => {
    let alive = true;
    getEvolution(pokemon)
      .then((s) => alive && setStages(s))
      .catch(() => alive && setStages([]));
    return () => {
      alive = false;
    };
  }, [pokemon]);

  if (stages === null) return <div className="h-16 animate-pulse rounded-2xl bg-line/40" aria-label="Carregando evolução" />;
  if (stages.length <= 1) return <p className="text-xs text-muted">Não evolui.</p>;

  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Evolução</p>
      <ol className="flex flex-wrap items-center gap-1">
        {stages.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1">
            {i > 0 && stages[i - 1].depth < s.depth && <span className="text-muted" aria-hidden="true">›</span>}
            {i > 0 && stages[i - 1].depth >= s.depth && <span className="text-muted" aria-hidden="true">/</span>}
            <span
              title={displayName(s.name)}
              className={`grid size-11 place-items-center rounded-xl ${s.id === pokemon.id ? "bg-line" : ""}`}
            >
              <img src={spriteUrl(s.id)} alt={displayName(s.name)} width={44} height={44} loading="lazy" className="size-11 [image-rendering:pixelated]" />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
