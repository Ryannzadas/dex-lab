import { useEffect, useId, useState } from "react";
import { buildSuggestedMember, type BuildStyle } from "@/lib/auto-build";
import { CATEGORY_PT, COMMON_ITEMS, TERA_TYPES } from "@/lib/moves";
import { EV_MAX, EV_TOTAL, finalStats, IV_MAX, NATURES, SHORT_STAT } from "@/lib/natures";
import { artworkUrl, displayName, getHoldableItems, pokemonName, type Pokemon, type StatKey } from "@/lib/pokeapi";
import type { Member } from "@/lib/team";
import type { Game } from "@/lib/games";
import { TYPE_INFO } from "@/lib/types";
import { useLearnset, useMoveInfos } from "@/lib/use-moves";
import { ArrowIcon, Card, ComboInput, CustomSelect, TypeBadge, type SelectOption } from "./ui";

type Props = {
  member: Member;
  pokemon: Pokemon;
  onChange: (patch: Partial<Member>) => void;
  onRemove: () => void;
  onOpenSummary: () => void;
  /** Jogo do time: define golpes e quais campos existem (Tera, habilidade, natureza…). */
  game: Game | null;
};

const field =
  "w-full rounded-xl border border-line bg-surface-solid px-3 py-2 text-sm outline-none transition-colors focus:border-ink";
const label = "mb-1 block text-xs font-semibold text-muted";

/** Editor completo de um membro do time (inspirado no montador da Firma League, com menus customizados e sugestão de builds). */
export function MemberEditor({ member, pokemon, onChange, onRemove, onOpenSummary, game }: Props) {
  const uid = useId();
  const { moves: learnset, fallback: learnsetFallback } = useLearnset(pokemon, game?.versionGroup ?? null);
  const gen = game?.gen ?? 9;
  // Habilidades e naturezas surgiram na 3ª geração; itens segurados, na 2ª; Tera só no Scarlet/Violet.
  const hasAbilities = gen >= 3;
  const hasItems = gen >= 2;
  const hasTera = !game || game.tera;
  const moveInfos = useMoveInfos(member.moves);
  const display = member.nickname || pokemonName(pokemon.name);
  const [holdableItems, setHoldableItems] = useState<string[]>(COMMON_ITEMS);
  const [appliedBuild, setAppliedBuild] = useState<BuildStyle | null>(null);

  useEffect(() => {
    if (!hasItems) return;
    let alive = true;
    getHoldableItems()
      .then((list) => {
        if (alive && list.length > 0) setHoldableItems([...new Set([...COMMON_ITEMS, ...list])]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [hasItems]);

  const applySuggestedBuild = (style: BuildStyle) => {
    const patch = buildSuggestedMember({ pokemon, learnset, game, style });
    onChange(patch);
    setAppliedBuild(style);
    window.setTimeout(() => setAppliedBuild((cur) => (cur === style ? null : cur)), 2000);
  };

  const setMove = (slot: number, name: string) => {
    const moves = [...member.moves];
    while (moves.length < 4) moves.push("");
    moves[slot] = name;
    // Guarda as posições (golpe 3 pode ficar escolhido com o 2 vazio), sem vazios no fim.
    while (moves.length && !moves[moves.length - 1]) moves.pop();
    onChange({ moves });
  };
  const moveSlots = [0, 1, 2, 3].map((i) => member.moves[i] ?? "");

  const abilityOptions: SelectOption[] = [
    { value: "", label: "Escolher…" },
    ...(member.ability && !pokemon.abilities.some((a) => a.name === member.ability)
      ? [{ value: member.ability, label: displayName(member.ability), hint: "fora deste Pokémon" }]
      : []),
    ...pokemon.abilities.map((a) => ({
      value: a.name,
      label: displayName(a.name),
      hint: a.hidden ? "oculta" : undefined,
    })),
  ];

  const natureOptions: SelectOption[] = NATURES.map((n) => ({
    value: n.id,
    label: `${n.pt} (${n.en})`,
    hint: n.up && n.down ? `+${SHORT_STAT[n.up]} −${SHORT_STAT[n.down]}` : "neutra",
  }));

  const teraOptions: SelectOption[] = [
    { value: "", label: `Padrão (${TYPE_INFO[pokemon.types[0]].pt})`, dot: TYPE_INFO[pokemon.types[0]].color },
    ...TERA_TYPES.map((t) => ({
      value: t,
      label: t === "stellar" ? "Estelar" : TYPE_INFO[t].pt,
      dot: t === "stellar" ? "linear-gradient(135deg, #fb7185, #fbbf24, #38bdf8)" : TYPE_INFO[t].color,
    })),
  ];

  return (
    <Card className="relative z-20 mt-4">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="grid size-24 shrink-0 place-items-center rounded-2xl border border-line"
          style={{ background: `radial-gradient(circle at 50% 40%, ${TYPE_INFO[pokemon.types[0]].color}40, transparent 70%)` }}
        >
          <img src={artworkUrl(pokemon.id, member.shiny)} alt="" width={88} height={88} className="size-22" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted">Editando · Nv {member.level}</p>
          <h3 className="truncate font-display text-2xl font-bold tracking-tight">
            {display}
            {member.shiny && (
              <span className="ml-2 text-amber-500" aria-label="shiny">
                ✦
              </span>
            )}
          </h3>
          {member.nickname && <p className="text-sm text-muted">{pokemonName(pokemon.name)}</p>}
          <div className="mt-1.5 flex gap-1.5">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} size="sm" />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenSummary} className="pill border-line">
            Resumo
            <span className="pill-icon">
              <ArrowIcon direction="up-right" />
            </span>
          </button>
          <button type="button" onClick={onRemove} className="pill border-line">
            Remover
            <span className="pill-icon">
              <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Sugestão rápida de build: Campanha (Casual) ou Competitiva */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-solid/60 px-4 py-3">
        <div>
          <p className="text-xs font-bold">Preencher sugestão de build</p>
          <p className="text-xs text-muted">
            Escolhe golpes, natureza, habilidade, item e EVs automaticamente para {display}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={learnset.length === 0}
            onClick={() => applySuggestedBuild("casual")}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
              appliedBuild === "casual"
                ? "border-ink bg-ink text-bg"
                : "border-line bg-surface-solid text-ink hover:border-ink"
            }`}
          >
            <span aria-hidden="true">✦</span>
            <span>{appliedBuild === "casual" ? "Build casual aplicada!" : "Build casual (campanha)"}</span>
          </button>
          <button
            type="button"
            disabled={learnset.length === 0}
            onClick={() => applySuggestedBuild("competitiva")}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
              appliedBuild === "competitiva"
                ? "border-ink bg-ink text-bg"
                : "border-line bg-surface-solid text-ink hover:border-ink"
            }`}
          >
            <span aria-hidden="true">⚡</span>
            <span>{appliedBuild === "competitiva" ? "Build competitiva aplicada!" : "Build competitiva"}</span>
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor={`${uid}-nick`} className={label}>
            Apelido
          </label>
          <input
            id={`${uid}-nick`}
            className={field}
            value={member.nickname}
            maxLength={12}
            placeholder={pokemonName(pokemon.name)}
            onChange={(e) => onChange({ nickname: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-level`} className={label}>
            Nível
          </label>
          <input
            id={`${uid}-level`}
            type="number"
            min={1}
            max={100}
            className={field}
            value={member.level}
            onChange={(e) => onChange({ level: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </div>
        {hasAbilities && (
          <div>
            <label htmlFor={`${uid}-ability`} className={label}>
              Habilidade
            </label>
            <CustomSelect
              id={`${uid}-ability`}
              value={member.ability ?? ""}
              onChange={(val) => onChange({ ability: val || null })}
              options={abilityOptions}
              placeholder="Escolher…"
            />
          </div>
        )}
        {hasItems && (
          <div>
            <label htmlFor={`${uid}-item`} className={label}>
              Item segurado
            </label>
            <ComboInput
              id={`${uid}-item`}
              value={member.item}
              onChange={(val) => onChange({ item: val })}
              suggestions={holdableItems}
              placeholder="Ex.: Leftovers"
            />
          </div>
        )}
        {hasAbilities && (
          <div>
            <label htmlFor={`${uid}-nature`} className={label}>
              Natureza
            </label>
            <CustomSelect
              id={`${uid}-nature`}
              value={member.nature}
              onChange={(val) => onChange({ nature: val })}
              options={natureOptions}
              searchable
              searchPlaceholder="Buscar natureza ou status (ex.: +Vel)…"
            />
          </div>
        )}
        {hasTera && (
          <div>
            <label htmlFor={`${uid}-tera`} className={label}>
              Tipo Tera
            </label>
            <CustomSelect
              id={`${uid}-tera`}
              value={member.tera ?? ""}
              onChange={(val) => onChange({ tera: val || null })}
              options={teraOptions}
            />
          </div>
        )}
      </div>

      <fieldset className="mt-6 min-w-0">
        <legend className={label}>
          Golpes (até 4, só os que ele aprende{game ? ` em ${game.label}` : ""})
        </legend>
        {game?.kind === "hack" && (
          <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
            Golpes do Scarlet/Violet como referência: o hack pode ter mudado o que cada Pokémon aprende.
          </p>
        )}
        {game?.kind === "official" && learnsetFallback && (
          <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
            A PokéAPI não tem os golpes deste Pokémon em {game.label}; mostrando os do jogo mais recente.
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {moveSlots.map((move, i) => {
            const info = move ? moveInfos[move] : undefined;
            const taken = moveSlots.filter((m, j) => m && j !== i);
            const moveOptions: SelectOption[] = [
              { value: "", label: `Sem golpe (${i + 1})` },
              ...(move && learnset.length > 0 && !learnset.includes(move)
                ? [{ value: move, label: displayName(move), hint: "fora do jogo" }]
                : []),
              ...learnset
                .filter((m) => !taken.includes(m))
                .map((m) => ({
                  value: m,
                  label: displayName(m),
                })),
            ];
            return (
              <div key={i}>
                <CustomSelect
                  ariaLabel={`Golpe ${i + 1}`}
                  value={move}
                  onChange={(val) => setMove(i, val)}
                  options={moveOptions}
                  disabled={learnset.length === 0}
                  placeholder={learnset.length ? `Golpe ${i + 1}` : "Carregando golpes…"}
                  searchable
                  searchPlaceholder={`Buscar golpe ${i + 1}…`}
                />
                {info && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {info.type && <TypeBadge type={info.type} size="sm" />}
                    <span>{CATEGORY_PT[info.category]}</span>
                    {info.power !== null && <span className="font-mono">Poder {info.power}</span>}
                    {info.accuracy !== null && <span className="font-mono">Prec. {info.accuracy}%</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={member.shiny} onChange={(e) => onChange({ shiny: e.target.checked })} className="size-4 accent-amber-500" />
        <span className="text-amber-500">✦</span> Shiny
      </label>

      <Advanced member={member} pokemon={pokemon} onChange={onChange} />
    </Card>
  );
}

const STAT_KEYS: StatKey[] = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

const EV_PRESETS: { label: string; hint: string; evs: Record<StatKey, number> }[] = [
  {
    label: "Atacante Físico",
    hint: "252 Atq / 252 Vel",
    evs: { hp: 4, attack: 252, defense: 0, "special-attack": 0, "special-defense": 0, speed: 252 },
  },
  {
    label: "Atacante Especial",
    hint: "252 At.Esp / 252 Vel",
    evs: { hp: 4, attack: 0, defense: 0, "special-attack": 252, "special-defense": 0, speed: 252 },
  },
  {
    label: "Físico Parrudo",
    hint: "252 HP / 252 Atq",
    evs: { hp: 252, attack: 252, defense: 0, "special-attack": 0, "special-defense": 0, speed: 4 },
  },
  {
    label: "Especial Parrudo",
    hint: "252 HP / 252 At.Esp",
    evs: { hp: 252, attack: 0, defense: 0, "special-attack": 252, "special-defense": 0, speed: 4 },
  },
  {
    label: "Muralha Física",
    hint: "252 HP / 252 Def",
    evs: { hp: 252, attack: 0, defense: 252, "special-attack": 0, "special-defense": 4, speed: 0 },
  },
  {
    label: "Muralha Especial",
    hint: "252 HP / 252 Def.Esp",
    evs: { hp: 252, attack: 0, defense: 4, "special-attack": 0, "special-defense": 252, speed: 0 },
  },
];

/** EVs, IVs, presets em 1 clique e os status finais calculados com nível e natureza. */
function Advanced({ member, pokemon, onChange }: { member: Member; pokemon: Pokemon; onChange: (patch: Partial<Member>) => void }) {
  const totalEv = STAT_KEYS.reduce((a, k) => a + (member.evs[k] ?? 0), 0);
  const stats = finalStats(pokemon.stats, member.level, member.nature, member.evs, member.ivs);
  const nature = NATURES.find((n) => n.id === member.nature);
  const base = Object.fromEntries(pokemon.stats.map((s) => [s.key, s.value])) as Record<StatKey, number>;

  const setEv = (k: StatKey, v: number) => {
    const others = totalEv - (member.evs[k] ?? 0);
    const value = Math.max(0, Math.min(EV_MAX, v, EV_TOTAL - others));
    onChange({ evs: { ...member.evs, [k]: value } });
  };
  const setIv = (k: StatKey, v: number) => onChange({ ivs: { ...member.ivs, [k]: Math.max(0, Math.min(IV_MAX, v)) } });

  const num =
    "w-12 rounded-lg border border-line bg-surface-solid px-1.5 py-1 text-right font-mono text-xs outline-none focus:border-ink sm:w-16 sm:px-2";

  return (
    <details className="group mt-5 rounded-2xl border border-line bg-surface-solid/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
        <span>Modo avançado: EVs, IVs e status finais</span>
        <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="scroll-x overflow-x-auto px-4 pb-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Distribuição rápida:</span>
          {EV_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              title={p.hint}
              onClick={() => onChange({ evs: p.evs })}
              className="rounded-lg border border-line bg-surface-solid px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-ink hover:text-ink"
            >
              {p.label}
            </button>
          ))}
          {totalEv > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  evs: { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 },
                })
              }
              className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-red-500 hover:text-red-600"
            >
              Zerar
            </button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="py-1 text-left font-medium">
                Status
              </th>
              <th scope="col" className="font-medium">
                Base
              </th>
              <th scope="col" className="font-medium">
                EV
              </th>
              <th scope="col" className="font-medium">
                IV
              </th>
              <th scope="col" className="text-right font-medium">
                Final<span className="hidden sm:inline"> (Nv {member.level})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {STAT_KEYS.map((k) => (
              <tr key={k} className="border-t border-line">
                <th scope="row" className="py-1.5 text-left font-medium">
                  {SHORT_STAT[k]}
                  {nature?.up === k && (
                    <span className="ml-1 text-red-500" title="Natureza aumenta">
                      ▲
                    </span>
                  )}
                  {nature?.down === k && (
                    <span className="ml-1 text-sky-500" title="Natureza diminui">
                      ▼
                    </span>
                  )}
                </th>
                <td className="text-center font-mono text-xs text-muted">{base[k]}</td>
                <td className="text-center">
                  <input
                    type="number"
                    min={0}
                    max={EV_MAX}
                    step={4}
                    aria-label={`EV de ${SHORT_STAT[k]}`}
                    className={num}
                    value={member.evs[k] ?? 0}
                    onChange={(e) => setEv(k, Number(e.target.value) || 0)}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="number"
                    min={0}
                    max={IV_MAX}
                    aria-label={`IV de ${SHORT_STAT[k]}`}
                    className={num}
                    value={member.ivs[k] ?? IV_MAX}
                    onChange={(e) => setIv(k, Number(e.target.value) || 0)}
                  />
                </td>
                <td className="text-right font-mono font-bold">{stats[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`mt-3 text-xs ${totalEv >= EV_TOTAL ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted"}`}>
          EVs usados: {totalEv}/{EV_TOTAL}
          {totalEv >= EV_TOTAL && " · limite atingido"}
        </p>
      </div>
    </details>
  );
}
