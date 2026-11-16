import { useMemo, useState } from "react";
import { bossesForGame, evaluateBoss, type BossEval } from "@/lib/bosses";
import { GAMES } from "@/lib/games";
import { artworkUrl, pokemonName, spriteUrl, typesInGen, type Pokemon } from "@/lib/pokeapi";
import type { Member } from "@/lib/team";
import type { TypeName } from "@/lib/types";
import type { GameContext } from "@/lib/use-game";
import { useMoveInfos } from "@/lib/use-moves";
import { Card, CustomSelect, SectionHeading, TypeBadge, type SelectOption } from "./ui";

type FilterKind = "todos" | "gym" | "elite";

const VERDICT_STYLE: Record<BossEval["verdict"], { label: string; cls: string }> = {
  tranquilo: {
    label: "Tranquilo",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  atencao: {
    label: "Atenção",
    cls: "bg-amber-400/20 text-amber-800 dark:text-amber-200 border-amber-400/40",
  },
  perigo: {
    label: "Perigo",
    cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  },
};

/**
 * Teste do time contra os Líderes de Ginásio, Provas, Elite 4 e Campeão do jogo:
 * - Mostra quem do seu time tem vantagem e quem corre perigo contra cada chefe;
 * - Tem botão de Level Cap em cada chefe para ajustar o nível do time inteiro em 1 clique.
 */
export function BossCheck({
  team,
  members,
  game,
  onSetAllLevels,
}: {
  team: Pokemon[];
  members: Member[];
  game: GameContext;
  onSetAllLevels: (level: number) => void;
}) {
  const [fallbackGameId, setFallbackGameId] = useState<string>("firered-leafgreen");
  const [filter, setFilter] = useState<FilterKind>("todos");
  const [appliedCap, setAppliedCap] = useState<string | null>(null);

  const activeGameId = game.game?.id ?? fallbackGameId;
  const activeGame = GAMES.find((g) => g.id === activeGameId) ?? GAMES[0];
  const bosses = useMemo(() => bossesForGame(activeGameId), [activeGameId]);

  const moveInfos = useMoveInfos(members.flatMap((m) => m.moves).filter(Boolean));

  const evaluations = useMemo(() => {
    const memberTypes: Record<number, TypeName[]> = {};
    const memberAttackTypes: Record<number, TypeName[]> = {};

    for (const p of team) {
      memberTypes[p.id] = typesInGen(p, game.gen);
      const m = members.find((x) => x.id === p.id);
      const atk = (m?.moves ?? [])
        .map((name) => moveInfos[name])
        .filter((info) => info && info.category !== "status" && info.type)
        .map((info) => info!.type as TypeName);
      memberAttackTypes[p.id] = [...new Set(atk)];
    }

    return bosses
      .filter((b) => filter === "todos" || b.kind === filter)
      .map((boss) =>
        evaluateBoss({
          boss,
          team,
          memberTypes,
          memberAttackTypes,
          gen: game.gen,
        }),
      );
  }, [bosses, filter, team, members, moveInfos, game.gen]);

  const gameOptions: SelectOption[] = useMemo(
    () =>
      GAMES.map((g) => ({
        value: g.id,
        label: g.label,
        hint: g.region,
        group: g.kind === "hack" ? "ROM hacks" : `${g.gen}ª geração`,
        dot: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`,
      })),
    [],
  );

  const applyCap = (bossId: string, cap: number) => {
    onSetAllLevels(cap);
    setAppliedCap(bossId);
    window.setTimeout(() => setAppliedCap((cur) => (cur === bossId ? null : cur)), 1800);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          kicker={`Chefes e Level Caps · ${activeGame.label}`}
          title="Ginásios e Liga Pokémon"
        >
          Veja como seu time se sai contra cada líder e a Elite 4. Clique no botão de <strong>Nv</strong> de um chefe para colocar todo o time no Level Cap dele.
        </SectionHeading>

        <div className="flex flex-wrap items-center gap-2">
          {!game.game && (
            <CustomSelect
              ariaLabel="Escolher jogo para testar os ginásios"
              value={fallbackGameId}
              onChange={setFallbackGameId}
              options={gameOptions}
              searchable
              searchPlaceholder="Buscar jogo ou região…"
              className="w-56"
            />
          )}

          <div role="tablist" aria-label="Filtrar chefes" className="flex gap-1 rounded-2xl border border-line p-1">
            {(
              [
                { id: "todos", label: "Todos" },
                { id: "gym", label: "Ginásios" },
                { id: "elite", label: "Liga / E4" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                  filter === t.id ? "bg-ink text-bg" : "text-muted hover:bg-line/60 hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {evaluations.map(({ boss, strong, weak, verdict }) => {
          const v = VERDICT_STYLE[verdict];
          const isCapApplied = appliedCap === boss.id;
          return (
            <li
              key={boss.id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-surface-solid p-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={artworkUrl(boss.ace)}
                      alt=""
                      width={52}
                      height={52}
                      loading="lazy"
                      className="size-13 shrink-0 object-contain drop-shadow-sm"
                    />
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">{boss.role}</p>
                      <h3 className="font-display text-lg font-bold tracking-tight">{boss.name}</h3>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${v.cls}`}>
                    {v.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {boss.types.map((t) => (
                      <TypeBadge key={t} type={t} size="sm" />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => applyCap(boss.id, boss.levelCap)}
                    title={`Colocar todo o time no Nv ${boss.levelCap}`}
                    className={`rounded-lg border px-2 py-0.5 font-mono text-xs font-semibold transition-colors ${
                      isCapApplied
                        ? "border-ink bg-ink text-bg"
                        : "border-line bg-bg/60 text-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {isCapApplied ? `Time no Nv ${boss.levelCap}!` : `Cap Nv ${boss.levelCap}`}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5 border-t border-line pt-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Vantagem</span>
                  {strong.length === 0 ? (
                    <span className="text-muted">Ninguém livre de risco</span>
                  ) : (
                    <span className="flex items-center -space-x-1">
                      {strong.map((p) => {
                        const label = members.find((m) => m.id === p.id)?.nickname || pokemonName(p.name);
                        return (
                          <img
                            key={p.id}
                            src={spriteUrl(p.id)}
                            alt={label}
                            title={label}
                            width={28}
                            height={28}
                            loading="lazy"
                            className="size-7 object-contain"
                          />
                        );
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-red-600 dark:text-red-400">Em risco</span>
                  {weak.length === 0 ? (
                    <span className="text-muted">Ninguém fraco</span>
                  ) : (
                    <span className="flex items-center -space-x-1">
                      {weak.map((p) => {
                        const label = members.find((m) => m.id === p.id)?.nickname || pokemonName(p.name);
                        return (
                          <img
                            key={p.id}
                            src={spriteUrl(p.id)}
                            alt={label}
                            title={label}
                            width={28}
                            height={28}
                            loading="lazy"
                            className="size-7 object-contain"
                          />
                        );
                      })}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
