import { animated, useTransition } from "@react-spring/web";
import { useState } from "react";
import { coverageFromTypes, defenseTable, offensiveCoverage, suggestTypes, teraDefenseTypes } from "@/lib/analysis";
import { artworkUrl, pokemonName, speciesIdOf, typesInGen, type Pokemon } from "@/lib/pokeapi";
import type { Availability } from "@/lib/games";
import type { GameContext } from "@/lib/use-game";
import { usePrefersReducedMotion } from "@/lib/state";
import { MAX_TEAM, type Member } from "@/lib/team";
import { useMoveInfos } from "@/lib/use-moves";
import { TYPE_INFO, type TypeName } from "@/lib/types";
import { MemberEditor } from "./member-editor";
import { SpeedTiers } from "./speed";
import { DamageCalc } from "./damage-calc";
import { PokemonSearch } from "./search";
import { ArrowIcon, Card, SectionHeading, TypeBadge } from "./ui";

const MAX = MAX_TEAM;

type Props = {
  members: Member[];
  team: Pokemon[];
  pending: number[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onUpdate: (id: number, patch: Partial<Member>) => void;
  onOpen: (speciesId: number, formId?: number) => void;
  /** Jogo do time: bloqueia/avisa Pokémon fora do jogo e aplica as regras da época. */
  game: GameContext;
};

export function TeamTab({ members, team, pending, onAdd, onRemove, onClear, onUpdate, onOpen, game }: Props) {
  const ids = members.map((m) => m.id);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Sem seleção (ou o selecionado saiu do time): edita o primeiro.
  const currentId = selectedId !== null && ids.includes(selectedId) ? selectedId : (ids[0] ?? null);
  const current = members.find((m) => m.id === currentId) ?? null;
  const currentPokemon = team.find((p) => p.id === currentId) ?? null;

  const add = (id: number) => {
    onAdd(id);
    setSelectedId(id);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Camada acima dos cards de baixo, para a lista da busca não ficar escondida atrás deles. */}
      <Card className="relative z-20">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading kicker={`Time · ${ids.length}/${MAX}`} title="Escolha até seis">
            Busque pelo nome em inglês ou pelo número da Pokédex. Clique num membro para configurar.
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
          onPick={add}
          check={game.check}
          disabled={ids.length >= MAX}
          exclude={ids}
          placeholder={ids.length >= MAX ? "Time completo! Remova alguém para trocar." : undefined}
        />

        <Slots
          team={team}
          members={members}
          pending={pending}
          selectedId={currentId}
          onSelect={setSelectedId}
          onRemove={onRemove}
          game={game}
        />
      </Card>

      {current && currentPokemon && (
        <MemberEditor
          key={current.id}
          member={current}
          pokemon={currentPokemon}
          onChange={(patch) => onUpdate(current.id, patch)}
          onRemove={() => onRemove(current.id)}
          onOpenSummary={() => onOpen(speciesIdOf(currentPokemon), currentPokemon.id)}
          game={game.game}
        />
      )}

      {team.length > 0 ? <Analysis team={team} members={members} game={game} /> : <EmptyHint />}
    </div>
  );
}

function Slots({
  team,
  members,
  pending,
  selectedId,
  onSelect,
  onRemove,
  game,
}: {
  team: Pokemon[];
  members: Member[];
  pending: number[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
  game: GameContext;
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
          <MemberCard
            pokemon={p}
            member={members.find((m) => m.id === p.id)}
            selected={p.id === selectedId}
            onSelect={() => onSelect(p.id)}
            onRemove={() => onRemove(p.id)}
            status={game.check(speciesIdOf(p), p.name)}
            types={typesInGen(p, game.gen)}
          />
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

function MemberCard({
  pokemon,
  member,
  selected,
  onSelect,
  onRemove,
  status,
  types,
}: {
  pokemon: Pokemon;
  member: Member | undefined;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  status: Availability;
  types: TypeName[];
}) {
  const main = TYPE_INFO[types[0]].color;
  const name = member?.nickname || pokemonName(pokemon.name);
  return (
    <div
      className={`relative flex aspect-[3/4] flex-col items-center justify-end overflow-hidden rounded-2xl border bg-surface-solid p-2 text-center transition-transform duration-300 hover:-translate-y-1 sm:p-3 ${
        selected ? "border-ink ring-2 ring-ink" : "border-line"
      }`}
      style={{ backgroundImage: `radial-gradient(120% 70% at 50% 25%, ${main}40, transparent 70%)` }}
    >
      <img
        src={artworkUrl(pokemon.id, member?.shiny)}
        alt=""
        width={160}
        height={160}
        loading="lazy"
        className="absolute top-[8%] left-1/2 w-[64%] -translate-x-1/2 drop-shadow-[0_8px_12px_rgb(0_0_0/0.18)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 sm:top-2 sm:w-[78%]"
      />
      {member?.shiny && (
        <span className="absolute top-2 left-2 text-amber-500" aria-hidden="true">
          ✦
        </span>
      )}
      <p className="relative w-full truncate font-display text-xs leading-tight font-bold sm:text-sm">{name}</p>
      <p className="relative font-mono text-[10px] text-muted">Nv {member?.level ?? 50}</p>
      {status !== "ok" && (
        <p
          className={`relative mt-0.5 rounded-full px-1.5 text-[10px] font-semibold ${
            status === "blocked" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-amber-400/20 text-amber-800 dark:text-amber-200"
          }`}
        >
          {status === "blocked" ? "fora do jogo" : "pode não existir"}
        </p>
      )}
      {/* Celular: bolinhas de cor; telas maiores: etiquetas com o nome do tipo. */}
      <div className="relative mt-1 flex justify-center gap-1 sm:hidden">
        {types.map((t) => (
          <span key={t} title={TYPE_INFO[t].pt} className="size-2.5 rounded-full" style={{ background: TYPE_INFO[t].color }} />
        ))}
        <span className="sr-only">{types.map((t) => TYPE_INFO[t].pt).join(" e ")}</span>
      </div>
      <div className="relative mt-1 hidden flex-wrap justify-center gap-1 sm:flex">
        {types.map((t) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Configurar ${name}`}
        className="absolute inset-0 rounded-2xl"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${name} do time`}
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

function Analysis({ team, members, game }: { team: Pokemon[]; members: Member[]; game: GameContext }) {
  const { gen } = game;
  // Tipos da época do jogo (ex.: Clefairy era Normal antes da 6ª geração).
  const typed = team.map((p) => ({ types: typesInGen(p, gen) }));
  // "Com Tera": cada membro com Tipo Tera passa a defender só com o tipo Tera (só em jogos com Tera).
  const [withTera, setWithTera] = useState(false);
  const teraAllowed = !game.game || game.game.tera;
  const teraOf = (p: Pokemon) => (teraAllowed ? (members.find((m) => m.id === p.id)?.tera ?? null) : null);
  const hasTera = team.some((p) => { const t = teraOf(p); return !!t && t !== "stellar"; });
  const useTera = withTera && hasTera;
  const rows = defenseTable(
    team.map((p, i) => ({ types: useTera ? teraDefenseTypes(typed[i].types, teraOf(p)) : typed[i].types })),
    gen,
  );
  const problems = rows.filter((r) => r.problem);
  const suggestions = suggestTypes(typed, 3, gen);

  // Cobertura: pelos golpes escolhidos quando houver golpes de dano; senão, pelos tipos do time.
  const infos = useMoveInfos(members.flatMap((m) => m.moves).filter(Boolean));
  const damagingTypes = members
    .flatMap((m) => m.moves)
    .map((name) => infos[name])
    .filter((i) => i && i.category !== "status" && i.type)
    .map((i) => i!.type as TypeName);
  const byMoves = damagingTypes.length > 0;
  const { covered, uncovered, total } = byMoves ? coverageFromTypes(damagingTypes, gen) : offensiveCoverage(typed, gen);
  const withoutMoves = team.filter((p) => !members.find((m) => m.id === p.id)?.moves.some(Boolean));

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionHeading kicker={useTera ? "Resumo · com Tera" : "Resumo"} title="Pontos fracos" />
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
          <SectionHeading kicker="Ataque" title={byMoves ? "Cobertura dos golpes" : "Cobertura"}>
            {byMoves
              ? "Tipos que os golpes de dano escolhidos acertam super efetivo."
              : "Tipos que os golpes do mesmo tipo do time acertam super efetivo. Escolha golpes para ver a cobertura real."}
          </SectionHeading>
          {withoutMoves.length > 0 && (
            <p className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Sem golpes: {withoutMoves.map((p) => members.find((m) => m.id === p.id)?.nickname || pokemonName(p.name)).join(", ")}
            </p>
          )}
          <p className="mb-2 text-sm font-medium">
            {covered.length}/{total} cobertos
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${(covered.length / total) * 100}%` }} />
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

      <SpeedTiers team={team} members={members} />

      <DamageCalc team={team} members={members} game={game} />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading kicker="Defesa" title="Tabela de fraquezas">
            Quanto dano cada tipo de ataque causa em cada membro. Vermelho é fraqueza, verde é resistência e preto é imunidade.
          </SectionHeading>
          {teraAllowed && (
          <div className="mb-5">
            <div role="group" aria-label="Tipos usados na defesa" className="flex gap-1 rounded-2xl border border-line p-1">
              {[
                { on: false, label: "Tipos normais" },
                { on: true, label: "Com Tera" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={useTera === o.on}
                  disabled={o.on && !hasTera}
                  onClick={() => setWithTera(o.on)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    useTera === o.on ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {!hasTera && <p className="mt-1 text-right text-[11px] text-muted">Escolha um Tipo Tera no editor</p>}
          </div>
          )}
        </div>
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
                    {useTera && teraOf(p) && teraOf(p) !== "stellar" && (
                      <span className="mt-0.5 block">
                        <TypeBadge type={teraOf(p) as TypeName} size="sm" />
                      </span>
                    )}
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
