import { animated, useTransition } from "@react-spring/web";
import { useState } from "react";
import { defenseTable, offensiveCoverage, suggestTypes } from "@/lib/analysis";
import { artworkUrl, pokemonName, speciesIdOf, type Pokemon } from "@/lib/pokeapi";
import { usePrefersReducedMotion } from "@/lib/state";
import { TYPE_INFO } from "@/lib/types";
import { PokemonSearch } from "./search";
import { ArrowIcon, Card, SectionHeading, TypeBadge } from "./ui";

const MAX = 6;

type Props = {
  ids: number[];
  team: Pokemon[];
  pending: number[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onOpen: (speciesId: number, formId?: number) => void;
};

export function TeamTab({ ids, team, pending, onAdd, onRemove, onClear, onOpen }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading kicker={`Time · ${ids.length}/${MAX}`} title="Escolha até seis">
            Busque pelo nome em inglês ou pelo número da Pokédex.
          </SectionHeading>
          <div className="flex gap-2">
            <ShareButton disabled={ids.length === 0} />
            {ids.length > 0 && (
              <button type="button" onClick={onClear} className="pill border-line">
                Limpar
                <span className="pill-icon">
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>

        <PokemonSearch
          label="Adicionar Pokémon ao time"
          onPick={onAdd}
          disabled={ids.length >= MAX}
          exclude={ids}
          placeholder={ids.length >= MAX ? "Time completo! Remova alguém para trocar." : undefined}
        />

        <Slots team={team} pending={pending} onRemove={onRemove} onOpen={onOpen} />
      </Card>

      {team.length > 0 ? <Analysis team={team} /> : <EmptyHint />}
    </div>
  );
}

function Slots({
  team,
  pending,
  onRemove,
  onOpen,
}: {
  team: Pokemon[];
  pending: number[];
  onRemove: (id: number) => void;
  onOpen: (speciesId: number, formId?: number) => void;
}) {
  const reduce = usePrefersReducedMotion();
  const transitions = useTransition(team, {
    keys: (p) => p.id,
    from: { opacity: 0, transform: "translateY(24px) scale(0.85)" },
    enter: { opacity: 1, transform: "translateY(0px) scale(1)" },
    leave: { opacity: 0, transform: "translateY(-12px) scale(0.9)" },
    config: { tension: 380, friction: 22 },
    immediate: reduce,
  });
  const empty = Math.max(0, MAX - team.length - pending.length);

  return (
    <ul className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
      {transitions((style, p) => (
        <animated.li style={style} className="group relative">
          <MemberCard pokemon={p} onRemove={() => onRemove(p.id)} onOpen={() => onOpen(speciesIdOf(p), p.id)} />
        </animated.li>
      ))}
      {pending.map((id) => (
        <li key={`p${id}`} className="aspect-[3/4] animate-pulse rounded-2xl border border-line bg-line/40" aria-label="Carregando" />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <li
          key={`e${i}`}
          className="grid aspect-[3/4] place-items-center rounded-2xl border-2 border-dashed border-line text-2xl text-muted/60"
          aria-hidden="true"
        >
          +
        </li>
      ))}
    </ul>
  );
}

function MemberCard({ pokemon, onRemove, onOpen }: { pokemon: Pokemon; onRemove: () => void; onOpen: () => void }) {
  const main = TYPE_INFO[pokemon.types[0]].color;
  return (
    <div
      className="relative flex aspect-[3/4] flex-col items-center justify-end overflow-hidden rounded-2xl border border-line bg-surface-solid p-2 text-center sm:p-3 transition-transform duration-300 hover:-translate-y-1"
      style={{ backgroundImage: `radial-gradient(120% 70% at 50% 25%, ${main}40, transparent 70%)` }}
    >
      <img
        src={artworkUrl(pokemon.id)}
        alt=""
        width={160}
        height={160}
        loading="lazy"
        className="absolute top-[8%] left-1/2 w-[64%] -translate-x-1/2 drop-shadow-[0_8px_12px_rgb(0_0_0/0.18)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 sm:top-2 sm:w-[78%]"
      />
      <p className="relative w-full truncate font-display text-xs leading-tight font-bold sm:text-sm">{pokemonName(pokemon.name)}</p>
      {/* Celular: bolinhas de cor; telas maiores: etiquetas com o nome do tipo. */}
      <div className="relative mt-1.5 flex justify-center gap-1 sm:hidden">
        {pokemon.types.map((t) => (
          <span key={t} title={TYPE_INFO[t].pt} className="size-2.5 rounded-full" style={{ background: TYPE_INFO[t].color }} />
        ))}
        <span className="sr-only">{pokemon.types.map((t) => TYPE_INFO[t].pt).join(" e ")}</span>
      </div>
      <div className="relative mt-1.5 hidden flex-wrap justify-center gap-1 sm:flex">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver resumo de ${pokemonName(pokemon.name)}`}
        className="absolute inset-0 rounded-2xl"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${pokemonName(pokemon.name)} do time`}
        className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-surface-solid/90 text-muted opacity-100 shadow transition hover:text-ink sm:top-2 sm:right-2 sm:size-7 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function ShareButton({ disabled }: { disabled: boolean }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // sem permissão: o link continua na barra de endereço
    }
  };
  return (
    <button type="button" onClick={share} disabled={disabled} className="pill" aria-live="polite">
      {copied ? "Link copiado!" : "Compartilhar"}
      <span className="pill-icon">
        <ArrowIcon direction="up-right" />
      </span>
    </button>
  );
}

function EmptyHint() {
  return (
    <p className="py-6 text-center text-muted">
      <span className="braces text-lg">Adicione o primeiro Pokémon e a análise aparece aqui</span>
    </p>
  );
}

function multLabel(v: number) {
  if (v === 0) return "0";
  if (v === 0.25) return "¼";
  if (v === 0.5) return "½";
  if (v === 1) return "";
  return `${v}×`;
}

function multClass(v: number) {
  if (v === 0) return "bg-ink text-bg";
  if (v >= 4) return "bg-red-600 text-white";
  if (v >= 2) return "bg-red-500/20 text-red-700 dark:text-red-300";
  if (v <= 0.25) return "bg-emerald-600 text-white";
  if (v < 1) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
  return "text-muted/50";
}

function Analysis({ team }: { team: Pokemon[] }) {
  const rows = defenseTable(team);
  const problems = rows.filter((r) => r.problem);
  const { covered, uncovered } = offensiveCoverage(team);
  const suggestions = suggestTypes(team);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionHeading kicker="Resumo" title="Pontos fracos" />
          {problems.length === 0 ? (
            <p className="text-sm text-muted">Nenhum tipo pega mais da metade do time desprotegida. Boa!</p>
          ) : (
            <ul className="grid gap-2">
              {problems.map((r) => (
                <li key={r.attack} className="flex items-center justify-between gap-3">
                  <TypeBadge type={r.attack} />
                  <span className="text-sm text-muted">
                    {r.weak} fraco{r.weak > 1 ? "s" : ""} · {r.resist + r.immune} protegido{r.resist + r.immune === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading kicker="Ataque" title="Cobertura">
            Tipos que os golpes do mesmo tipo do time acertam super efetivo.
          </SectionHeading>
          <p className="mb-2 text-sm font-medium">
            {covered.length}/18 cobertos
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${(covered.length / 18) * 100}%` }} />
          </div>
          {uncovered.length > 0 && (
            <>
              <p className="mt-4 mb-2 text-sm text-muted">Sem golpe super efetivo contra:</p>
              <div className="flex flex-wrap gap-1.5">
                {uncovered.map((t) => (
                  <TypeBadge key={t} type={t} size="sm" />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <SectionHeading kicker="Sugestão" title="Próximo membro">
            Tipos que mais ajudariam o time agora.
          </SectionHeading>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted">O time já está bem equilibrado.</p>
          ) : (
            <ol className="grid gap-3">
              {suggestions.map((s, i) => (
                <li key={s.type} className="flex items-start gap-3">
                  <span className="mt-0.5 font-mono text-xs text-muted">0{i + 1}</span>
                  <div>
                    <TypeBadge type={s.type} />
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {s.resists.length > 0 && <>Resiste a {s.resists.map((t) => TYPE_INFO[t].pt).join(", ")}. </>}
                      {s.covers.length > 0 && <>Acerta {s.covers.map((t) => TYPE_INFO[t].pt).join(", ")}.</>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeading kicker="Defesa" title="Tabela de fraquezas">
          Quanto dano cada tipo de ataque causa em cada membro. Vermelho é fraqueza, verde é resistência e preto é imunidade.
        </SectionHeading>
        <div className="scroll-x -mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-28 text-left text-xs font-medium text-muted">
                  Ataque
                </th>
                {team.map((p) => (
                  <th key={p.id} scope="col" className="font-normal">
                    <img src={artworkUrl(p.id)} alt={pokemonName(p.name)} title={pokemonName(p.name)} width={40} height={40} className="mx-auto size-10" loading="lazy" />
                  </th>
                ))}
                <th scope="col" className="text-xs font-medium text-muted">Fracos</th>
                <th scope="col" className="text-xs font-medium text-muted">Protegidos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.attack}>
                  <th scope="row" className="text-left font-normal">
                    <TypeBadge type={r.attack} size="sm" />
                  </th>
                  {r.values.map((v, i) => (
                    <td key={i} className={`h-8 rounded-lg text-center font-mono text-xs ${multClass(v)}`}>
                      {multLabel(v)}
                    </td>
                  ))}
                  <td className={`text-center font-mono text-xs ${r.problem ? "font-bold text-red-600 dark:text-red-400" : "text-muted"}`}>{r.weak}</td>
                  <td className="text-center font-mono text-xs text-muted">{r.resist + r.immune}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
