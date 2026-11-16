import { useEffect, useId, useState } from "react";
import { calcDamage, DEFENDER_PRESETS, type DefenderPreset } from "@/lib/damage";
import { artworkUrl, displayName, getPokemon, pokemonName, typesInGen, type Pokemon } from "@/lib/pokeapi";
import type { GameContext } from "@/lib/use-game";
import type { Member } from "@/lib/team";
import { isTypeName, TYPE_INFO } from "@/lib/types";
import { useMoveInfos } from "@/lib/use-moves";
import { PokemonSearch } from "./search";
import { Card, SectionHeading, TypeBadge } from "./ui";

const field =
  "w-full rounded-xl border border-line bg-surface-solid px-3 py-2 text-sm outline-none transition-colors focus:border-ink disabled:opacity-50";
const label = "mb-1 block text-xs font-semibold text-muted";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

/** Calculadora de dano: um golpe do seu time contra qualquer Pokémon. */
export function DamageCalc({ team, members, game }: { team: Pokemon[]; members: Member[]; game: GameContext }) {
  const uid = useId();
  const [attackerId, setAttackerId] = useState<number | null>(null);
  const attacker = team.find((p) => p.id === attackerId) ?? team[0];
  const member = members.find((m) => m.id === attacker?.id);

  const infos = useMoveInfos(member?.moves.filter(Boolean) ?? []);
  const damaging = (member?.moves.filter(Boolean) ?? []).filter((m) => infos[m] && infos[m].category !== "status" && infos[m].power);
  const [moveName, setMoveName] = useState("");
  const move = infos[damaging.includes(moveName) ? moveName : damaging[0]];

  const [defenderId, setDefenderId] = useState<number | null>(null);
  const [defender, setDefender] = useState<Pokemon | null>(null);
  const [preset, setPreset] = useState<DefenderPreset>("hp");
  const [tera, setTera] = useState(false);

  useEffect(() => {
    if (defenderId === null) return;
    let alive = true;
    getPokemon(defenderId)
      .then((p) => alive && setDefender(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [defenderId]);

  if (!attacker || !member) return null;

  // Tera só existe em jogos com Tera (ou no time sem jogo).
  const teraType = (!game.game || game.game.tera) && member.tera && isTypeName(member.tera) ? member.tera : null;
  const result =
    move && defender
      ? calcDamage({
          // Tipos da época do jogo (ex.: Fada não existia antes da 6ª geração).
          attacker: { ...attacker, types: typesInGen(attacker, game.gen) },
          attackerSpread: { level: member.level, nature: member.nature, evs: member.evs, ivs: member.ivs, item: member.item },
          attackerTera: tera ? teraType : null,
          move,
          defender: { ...defender, types: typesInGen(defender, game.gen) },
          defenderPreset: preset,
          defenderLevel: member.level,
          gen: game.gen,
        })
      : null;

  return (
    // Camada acima da tabela de fraquezas, para a lista da busca do alvo não ficar escondida.
    <Card className="relative z-10">
      <SectionHeading kicker="Dano" title="Calculadora de dano">
        Escolha um golpe do seu time e um alvo para ver quanto de vida ele tira. Considera nível, natureza, EVs, IVs, STAB, Tera,
        efetividade e itens como Life Orb, Choice Band/Specs e Expert Belt.
      </SectionHeading>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Atacante */}
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Atacante</p>
          <div className="grid gap-3">
            <div>
              <label htmlFor={`${uid}-atk`} className={label}>Membro do time</label>
              <select
                id={`${uid}-atk`}
                className={field}
                value={attacker.id}
                onChange={(e) => {
                  setAttackerId(Number(e.target.value));
                  setMoveName("");
                  setTera(false);
                }}
              >
                {team.map((p) => (
                  <option key={p.id} value={p.id}>
                    {members.find((m) => m.id === p.id)?.nickname || pokemonName(p.name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-move`} className={label}>Golpe</label>
              <select
                id={`${uid}-move`}
                className={field}
                value={move?.name ?? ""}
                onChange={(e) => setMoveName(e.target.value)}
                disabled={damaging.length === 0}
              >
                {damaging.length === 0 && <option value="">Escolha golpes de dano no editor</option>}
                {damaging.map((m) => (
                  <option key={m} value={m}>
                    {displayName(m)} · {infos[m].power}
                  </option>
                ))}
              </select>
            </div>
            <label className={`inline-flex items-center gap-2 text-sm ${teraType ? "cursor-pointer" : "opacity-50"}`}>
              <input type="checkbox" checked={tera && !!teraType} disabled={!teraType} onChange={(e) => setTera(e.target.checked)} className="size-4" />
              Terastalizado {teraType ? `(${TYPE_INFO[teraType].pt})` : "(sem Tipo Tera)"}
            </label>
          </div>
        </div>

        {/* Alvo */}
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Alvo</p>
          {defender ? (
            <div className="mb-3 flex items-center gap-3">
              <img src={artworkUrl(defender.id)} alt="" width={56} height={56} className="size-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold">{pokemonName(defender.name)}</p>
                <div className="mt-1 flex gap-1">
                  {defender.types.map((t) => (
                    <TypeBadge key={t} type={t} size="sm" />
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => (setDefender(null), setDefenderId(null))} className="rounded-xl border border-line px-3 py-1.5 text-sm hover:border-ink">
                Trocar
              </button>
            </div>
          ) : (
            <div className="mb-3">
              <PokemonSearch label="Escolher o Pokémon alvo" onPick={setDefenderId} placeholder="Buscar alvo…" />
            </div>
          )}
          <div>
            <label htmlFor={`${uid}-preset`} className={label}>Investimento do alvo</label>
            <select id={`${uid}-preset`} className={field} value={preset} onChange={(e) => setPreset(e.target.value as DefenderPreset)}>
              {(Object.keys(DEFENDER_PRESETS) as DefenderPreset[]).map((k) => (
                <option key={k} value={k}>
                  {DEFENDER_PRESETS[k].label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">Mesmo nível do atacante (Nv {member.level}), IVs 31.</p>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="mt-5" aria-live="polite">
        {!move ? (
          <p className="text-sm text-muted">Escolha golpes de dano para {member.nickname || pokemonName(attacker.name)} no editor do membro.</p>
        ) : !defender ? (
          <p className="text-sm text-muted">Escolha um alvo para calcular.</p>
        ) : result ? (
          <div className="rounded-2xl border border-line bg-surface-solid p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-display text-3xl font-extrabold tracking-tight">
                {pct(result.minPct)} – {pct(result.maxPct)}
              </p>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  result.verdict.startsWith("OHKO") ? "bg-red-600 text-white" : result.verdict.startsWith("Chance") ? "bg-amber-400 text-black" : "bg-line text-ink"
                }`}
              >
                {result.verdict}
              </span>
            </div>
            {/* Barra de vida: a parte escura é o dano mínimo; a listrada, a faixa até o máximo. */}
            <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-emerald-500/30" aria-hidden="true">
              <div className="absolute inset-y-0 left-0 bg-red-500" style={{ width: `${Math.min(100, result.minPct)}%` }} />
              <div
                className="absolute inset-y-0 bg-red-500/50"
                style={{ left: `${Math.min(100, result.minPct)}%`, width: `${Math.max(0, Math.min(100, result.maxPct) - Math.min(100, result.minPct))}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted">
              {displayName(move.name)} tira {result.min}–{result.max} de {result.hp} HP · efetividade{" "}
              {result.effectiveness === 0 ? "imune" : `${result.effectiveness.toLocaleString("pt-BR")}×`}
              {result.stab > 1 && ` · STAB ${result.stab.toLocaleString("pt-BR")}×`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Este golpe não causa dano direto.</p>
        )}
        <p className="mt-2 text-[11px] text-muted">Não considera habilidades, clima, campo, golpes críticos nem mudanças de status.</p>
      </div>
    </Card>
  );
}
