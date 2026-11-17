import { useId, useState } from "react";
import type { AiBuild, AiBuildRequest, AiBuildResponse, AiStatKey } from "@/lib/ai-build-types";
import { bossesForGame } from "@/lib/bosses";
import type { Game } from "@/lib/games";
import { pokemonName, typesInGen, type LearnedMove, type Pokemon } from "@/lib/pokeapi";
import { fullLearnable } from "@/lib/smart-build";
import type { Member } from "@/lib/team";

const STATS: AiStatKey[] = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
const EXAMPLES = ["Explica essa build", "Deixa ele mais rápido", "Sem golpes de recuo", "Quero aguentar a Elite 4"];

/** Pergunta livre ao Claude sobre a build do membro aberto; aplica o ajuste com opção de desfazer. */
export function ClaudeBuild({
  member,
  pokemon,
  game,
  learned,
  teammates,
  onChange,
}: {
  member: Member;
  pokemon: Pokemon;
  game: Game | null;
  learned: LearnedMove[];
  teammates: Pokemon[];
  onChange: (patch: Partial<Member>) => void;
}) {
  const id = useId();
  const [pedido, setPedido] = useState("");
  const [style, setStyle] = useState<"casual" | "competitiva">("casual");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiBuildResponse | null>(null);
  const [undo, setUndo] = useState<Partial<Member> | null>(null);
  const gen = game?.gen ?? 9;

  const ask = async (text: string) => {
    const q = text.trim();
    if (q.length < 2 || loading) return;
    setLoading(true);
    setResult(null);
    try {
      // Golpes que ele pode ter: os próprios (com a forma de aprender) e os das pré-evoluções.
      const how = new Map<string, string>();
      for (const m of learned) {
        const label = m.method === "level" ? (m.level <= 1 ? "início" : `Nv ${m.level}`) : m.method === "machine" ? "TM" : m.method === "tutor" ? "tutor" : "ovo";
        if (!how.has(m.name) || label === "início") how.set(m.name, label);
      }
      const all = await fullLearnable(pokemon, learned, game?.versionGroup ?? null).catch(() => new Set<string>());
      for (const name of all) if (!how.has(name)) how.set(name, "pré-evolução");

      const stat = (k: AiStatKey) => pokemon.stats.find((s) => s.key === k)?.value ?? 0;
      const current: AiBuild = {
        moves: member.moves.filter(Boolean),
        item: member.item,
        nature: member.nature,
        ability: member.ability,
        tera: member.tera,
        evs: Object.fromEntries(STATS.map((k) => [k, member.evs[k] ?? 0])) as Record<AiStatKey, number>,
      };
      const body: AiBuildRequest = {
        pedido: q.slice(0, 400),
        pokemon: {
          name: pokemonName(pokemon.name),
          types: typesInGen(pokemon, gen),
          stats: Object.fromEntries(STATS.map((k) => [k, stat(k)])) as Record<AiStatKey, number>,
          abilities: pokemon.abilities,
        },
        game: game ? { label: game.label, gen: game.gen, kind: game.kind, tera: game.tera } : null,
        level: member.level,
        style,
        current,
        learnable: [...how].map(([moveId, h]) => ({ id: moveId, how: h })).slice(0, 700),
        bosses: game ? bossesForGame(game.id).map((b) => ({ name: b.name, types: b.types, levelCap: b.levelCap })) : [],
        teammates: teammates.map((p) => ({ name: pokemonName(p.name), types: typesInGen(p, gen) })),
      };

      const res = await fetch("/api/ajustar-build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as AiBuildResponse | null;
      const answer: AiBuildResponse = data ?? { ok: false, erro: "O assistente só funciona no site publicado (sem conexão com o servidor)." };
      if (answer.ok && answer.alterou && Object.keys(answer.patch).length) {
        setUndo({ moves: member.moves, item: member.item, nature: member.nature, ability: member.ability, tera: member.tera, evs: member.evs });
        onChange(answer.patch as Partial<Member>);
      } else {
        setUndo(null);
      }
      setResult(answer);
    } catch {
      setResult({ ok: false, erro: "Sem conexão com o assistente. Tente de novo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-line bg-surface-solid/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold">
          Pedir ao Claude
        </label>
        <div role="group" aria-label="Estilo da build" className="flex gap-1 text-[11px]">
          {(["casual", "competitiva"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={style === s}
              onClick={() => setStyle(s)}
              className={`rounded-lg border px-2 py-0.5 font-semibold transition-colors ${style === s ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink"}`}
            >
              {s === "casual" ? "Campanha" : "Competitivo"}
            </button>
          ))}
        </div>
      </div>
      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(pedido);
        }}
      >
        <input
          id={id}
          value={pedido}
          maxLength={400}
          onChange={(e) => setPedido(e.target.value)}
          placeholder={`Ex.: "deixa o ${pokemonName(pokemon.name)} mais rápido"`}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface-solid px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button type="submit" disabled={loading || pedido.trim().length < 2} className="pill shrink-0 justify-center disabled:opacity-45">
          {loading ? "Pensando…" : "Perguntar"}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setPedido(ex);
              void ask(ex);
            }}
            className="rounded-lg border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-45"
          >
            {ex}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {result && !result.ok && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{result.erro}</p>}
        {result?.ok && (
          <div className="mt-3 border-t border-line pt-3 text-sm leading-relaxed">
            <p className="whitespace-pre-line">{result.resposta}</p>
            {result.avisos.length > 0 && (
              <ul className="mt-2 grid gap-1 text-xs text-amber-700 dark:text-amber-400">
                {result.avisos.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              {result.alterou && undo && (
                <button
                  type="button"
                  className="font-semibold text-ink underline underline-offset-2"
                  onClick={() => {
                    onChange(undo);
                    setUndo(null);
                  }}
                >
                  Desfazer o ajuste
                </button>
              )}
              <span>
                Respostas do Claude (Anthropic) · {result.restantes} pergunta{result.restantes === 1 ? "" : "s"} restante{result.restantes === 1 ? "" : "s"} hoje
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
