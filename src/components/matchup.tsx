import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CustomSelect, type SelectOption } from "@/components/ui";
import { finalStats } from "@/lib/natures";
import { artworkUrl, pokemonName, type Pokemon } from "@/lib/pokeapi";
import type { Member, TeamsApi } from "@/lib/team";
import { multiplier, TYPE_INFO, type TypeName } from "@/lib/types";
import { usePokemons } from "@/lib/use-pokemon";

/** Time de outra pessoa, como vem da vitrine, do desafio ou do perfil público. */
export type OtherTeam = { name: string; handle?: string; members: Member[] };

type Side = { member: Member; pokemon: Pokemon };

/** Melhor golpe do próprio tipo (STAB) de `attacker` contra `defender`. */
function bestStab(attacker: Pokemon, defender: Pokemon) {
  return Math.max(...attacker.types.map((t) => multiplier(t, defender.types as TypeName[])));
}

function speedOf(side: Side) {
  const m = side.member;
  return finalStats(side.pokemon.stats, m.level || 50, m.nature || "hardy", m.evs ?? {}, m.ivs ?? {}).speed;
}

const label = (side: Side) => side.member.nickname || pokemonName(side.pokemon.name);

const CELL: Record<string, string> = {
  "4": "bg-emerald-500 text-white",
  "2": "bg-emerald-500/70 text-white",
  "1": "bg-line/60 text-muted",
  "0.5": "bg-rose-500/35 text-ink",
  "0.25": "bg-rose-500/55 text-ink",
  "0": "bg-ink/80 text-bg",
};
const fmt = (n: number) => (n === 0.5 ? "½" : n === 0.25 ? "¼" : `${n}`);

/** Janela "Comparar com meu time": quem acerta quem com STAB e quem é mais rápido. */
export function MatchupDialog({ mine, other, onClose }: { mine: TeamsApi; other: OtherTeam; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const options = useMemo<SelectOption[]>(
    () => mine.teams.filter((t) => t.members.length > 0).map((t) => ({ value: t.id, label: t.name, hint: `${t.members.length}/6` })),
    [mine.teams],
  );
  const [chosen, setChosen] = useState(() => (mine.active.members.length ? mine.active.id : (options[0]?.value ?? "")));
  const myTeam = mine.teams.find((t) => t.id === chosen);

  const myIds = useMemo(() => myTeam?.members.map((m) => m.id) ?? [], [myTeam]);
  const theirIds = useMemo(() => other.members.map((m) => m.id), [other.members]);
  const myData = usePokemons(myIds);
  const theirData = usePokemons(theirIds);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const pair = (members: Member[], list: Pokemon[]): Side[] =>
    members.flatMap((member) => {
      const pokemon = list.find((p) => p.id === member.id);
      return pokemon ? [{ member, pokemon }] : [];
    });
  const me = pair(myTeam?.members ?? [], myData.list);
  const them = pair(other.members, theirData.list);
  const loading = myData.pending.length > 0 || theirData.pending.length > 0;

  // Quantos deles eu acerto super efetivo (com pelo menos um Pokémon) e vice-versa.
  const iHit = them.filter((t) => me.some((m) => bestStab(m.pokemon, t.pokemon) >= 2)).length;
  const theyHit = me.filter((m) => them.some((t) => bestStab(t.pokemon, m.pokemon) >= 2)).length;
  const speed = [...me.map((s) => ({ s, mine: true })), ...them.map((s) => ({ s, mine: false }))]
    .map((x) => ({ ...x, value: speedOf(x.s) }))
    .sort((a, b) => b.value - a.value);
  const fastest = speed[0];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-3xl border border-line bg-surface-solid p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[min(92dvh,56rem)] overflow-y-auto overscroll-contain p-5 [scrollbar-width:thin] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{"{ confronto }"}</p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold tracking-tight">
              Seu time × {other.name}
            </h2>
            {other.handle && <p className="text-sm text-muted">de @{other.handle}</p>}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Fechar"
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {options.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-muted">Monte um time na aba Time para comparar.</p>
        ) : (
          <>
            <CustomSelect value={chosen} onChange={setChosen} options={options} ariaLabel="Qual dos seus times" className="mt-5 sm:w-72" />

            {loading ? (
              <p className="py-12 text-center text-muted">Carregando os Pokémon…</p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Score label="Deles que você acerta super efetivo" value={iHit} total={them.length} good />
                  <Score label="Seus que eles acertam super efetivo" value={theyHit} total={me.length} />
                </div>
                {fastest && (
                  <p className="mt-3 text-sm text-muted">
                    Mais rápido do confronto: <b className="text-ink">{label(fastest.s)}</b> ({fastest.mine ? "seu" : "deles"}, {fastest.value} de Velocidade).
                  </p>
                )}

                <h3 className="mt-7 mb-1 font-semibold">Quem acerta quem</h3>
                <p className="mb-3 text-xs text-muted">Melhor golpe do próprio tipo (STAB) de cada linha contra cada coluna. Verde: super efetivo; vermelho: resistido.</p>
                <Matrix rows={me} cols={them} rowLabel="Seu" />
                <div className="mt-5">
                  <Matrix rows={them} cols={me} rowLabel="Deles" />
                </div>

                <h3 className="mt-7 mb-3 font-semibold">Velocidade</h3>
                <ol className="grid gap-1.5">
                  {speed.map(({ s, mine: isMine, value }, i) => (
                    <li key={`${isMine}-${i}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-1.5 text-sm">
                      <span className="w-6 font-mono text-xs text-muted">{i + 1}</span>
                      <img src={artworkUrl(s.member.id, s.member.shiny)} alt="" width={32} height={32} className="size-8 object-contain" />
                      <span className="min-w-0 flex-1 truncate font-medium">{label(s)}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${isMine ? "bg-ink text-bg" : "border border-line text-muted"}`}>
                        {isMine ? "seu" : "deles"}
                      </span>
                      <span className="w-10 text-right font-mono">{value}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted">Com o nível, natureza e EVs de cada um, sem itens nem efeitos de campo.</p>
              </>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

function Score({ label, value, total, good }: { label: string; value: number; total: number; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-line p-3.5">
      <p className={`font-display text-3xl font-bold ${good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {value}
        <span className="text-lg text-muted">/{total}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function Matrix({ rows, cols, rowLabel }: { rows: Side[]; cols: Side[]; rowLabel: string }) {
  return (
    <div className="overflow-x-auto [scrollbar-width:thin]">
      <table className="w-full min-w-[22rem] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="w-14 text-left font-mono text-[10px] font-normal whitespace-nowrap text-muted uppercase">{rowLabel} ↓</th>
            {cols.map((c, i) => (
              <th key={i} className="font-normal" title={label(c)}>
                <img src={artworkUrl(c.member.id, c.member.shiny)} alt={label(c)} width={36} height={36} className="mx-auto size-9 object-contain" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row" title={label(r)} className="font-normal">
                <img src={artworkUrl(r.member.id, r.member.shiny)} alt={label(r)} width={36} height={36} className="size-9 object-contain" />
              </th>
              {cols.map((c, j) => {
                const m = bestStab(r.pokemon, c.pokemon);
                return (
                  <td
                    key={j}
                    className={`h-9 rounded-lg font-mono font-semibold ${CELL[String(m)] ?? CELL["1"]}`}
                    title={`${label(r)} contra ${label(c)}: ${fmt(m)}× (${r.pokemon.types.map((t) => TYPE_INFO[t].pt).join("/")})`}
                  >
                    {fmt(m)}×
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
