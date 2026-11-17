import { useEffect, useId, useState } from "react";
import { getTypeIndex } from "@/lib/dex";
import { artworkUrl, getPokemonList, pokemonName, spriteUrl, type Pokemon, type PokemonRef } from "@/lib/pokeapi";
import { rollChallengeTeam } from "@/lib/recommendations";
import { exportShowdown, importShowdown } from "@/lib/showdown";
import { newMember, type TeamsApi } from "@/lib/team";
import { drawTeamCard } from "@/lib/team-image";
import { TYPE_INFO, typesOfGen, type TypeName } from "@/lib/types";
import { useGame } from "@/lib/use-game";
import { useMoveInfos } from "@/lib/use-moves";
import { Card, CustomSelect, TypeBadge, type SelectOption } from "./ui";
import { GAMES, gameById } from "@/lib/games";

type Panel = null | "rename" | "import" | "export" | "delete" | "image" | "challenge";

const small =
  "inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-45";

/** "Meus times": troca, cria, renomeia, duplica, exclui, importa e exporta (formato Showdown). */
export function TeamManager({ api, loaded }: { api: TeamsApi; loaded: Pokemon[] }) {
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const { teams, active } = api;

  return (
    <Card className="relative z-30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Meus times · {teams.length}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={small} onClick={() => toggle("challenge")} aria-expanded={panel === "challenge"}>
            Sortear / Monotype
          </button>
          <button type="button" className={small} onClick={() => toggle("import")} aria-expanded={panel === "import"}>
            Importar do Showdown
          </button>
          <button type="button" className={small} onClick={() => toggle("export")} aria-expanded={panel === "export"} disabled={active.members.length === 0}>
            Exportar
          </button>
          <button type="button" className={small} onClick={() => toggle("image")} aria-expanded={panel === "image"} disabled={active.members.length === 0}>
            Imagem
          </button>
        </div>
      </div>

      {/* Times salvos: o aberto fica preenchido. */}
      <div role="tablist" aria-label="Times salvos" className="scroll-x mt-3 flex gap-2 overflow-x-auto pb-1">
        {teams.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === active.id}
            onClick={() => {
              api.select(t.id);
              setPanel(null);
            }}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              t.id === active.id ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{t.name}</span>
              {t.members.length > 0 && (
                <span className="flex items-center -space-x-1.5" aria-hidden="true">
                  {t.members.slice(0, 6).map((m, idx) => (
                    <img
                      key={`${m.id}-${idx}`}
                      src={spriteUrl(m.id)}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      className="size-6 object-contain drop-shadow-sm"
                    />
                  ))}
                </span>
              )}
            </span>
            <span className="font-mono text-[11px] opacity-70">{t.members.length}/6</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            api.create();
            setPanel(null);
          }}
          disabled={!api.canCreate}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-dashed border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-45"
        >
          + Novo time
        </button>
      </div>

      <GameSelect api={api} />

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={small} onClick={() => toggle("rename")} aria-expanded={panel === "rename"}>
          Renomear
        </button>
        <button type="button" className={small} onClick={() => api.duplicate(active.id)} disabled={!api.canCreate}>
          Duplicar
        </button>
        <button type="button" className={`${small} hover:border-red-500 hover:text-red-600`} onClick={() => toggle("delete")} aria-expanded={panel === "delete"}>
          Excluir
        </button>
      </div>

      {panel === "rename" && <RenamePanel key={active.id} name={active.name} onSave={(n) => (api.rename(active.id, n), setPanel(null))} onCancel={() => setPanel(null)} />}
      {panel === "delete" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm" role="alert">
          <span>
            Excluir <strong>{active.name}</strong>? Isso não dá pra desfazer.
          </span>
          <button
            type="button"
            className="rounded-xl bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
            onClick={() => {
              api.removeTeam(active.id);
              setPanel(null);
            }}
          >
            Sim, excluir
          </button>
          <button type="button" className={small} onClick={() => setPanel(null)}>
            Cancelar
          </button>
        </div>
      )}
      {panel === "export" && <ExportPanel api={api} loaded={loaded} />}
      {panel === "import" && <ImportPanel api={api} onDone={() => setPanel(null)} />}
      {panel === "image" && <ImagePanel key={active.id + active.updatedAt} api={api} loaded={loaded} />}
      {panel === "challenge" && <ChallengePanel key={active.id + (active.game ?? "")} api={api} onDone={() => setPanel(null)} />}
    </Card>
  );
}

function RenamePanel({ name, onSave, onCancel }: { name: string; onSave: (n: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name);
  const id = useId();
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value);
      }}
    >
      <div className="min-w-48 flex-1">
        <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">
          Nome do time
        </label>
        <input
          id={id}
          autoFocus
          maxLength={40}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-solid px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </div>
      <button type="submit" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-45" disabled={!value.trim()}>
        Salvar
      </button>
      <button type="button" className={small} onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}

function ExportPanel({ api, loaded }: { api: TeamsApi; loaded: Pokemon[] }) {
  const [copied, setCopied] = useState(false);
  const names = Object.fromEntries(loaded.map((p) => [p.id, p.name]));
  const ready = api.members.every((m) => names[m.id]);
  const text = ready ? exportShowdown(api.members, names) : "";
  const id = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // sem permissão: dá pra selecionar e copiar à mão
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {api.active.name} no formato do Showdown
        </label>
        <button type="button" className={small} onClick={copy} disabled={!ready} aria-live="polite">
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <textarea
        id={id}
        readOnly
        value={ready ? text : "Carregando os Pokémon…"}
        rows={Math.min(18, Math.max(6, text.split("\n").length))}
        onFocus={(e) => e.currentTarget.select()}
        className="scroll-x w-full rounded-2xl border border-line bg-surface-solid p-3 font-mono text-xs leading-relaxed outline-none focus:border-ink"
      />
      <p className="mt-1 text-xs text-muted">Cole no Teambuilder do Showdown em "Import from text".</p>
    </div>
  );
}

function ImportPanel({ api, onDone }: { api: TeamsApi; onDone: () => void }) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const id = useId();

  const run = async () => {
    setBusy(true);
    setWarnings([]);
    try {
      const list = await getPokemonList();
      const result = importShowdown(text, list);
      if (result.members.length === 0) {
        setWarnings(result.warnings);
        return;
      }
      api.create(name.trim() || "Importado", result.members);
      if (result.warnings.length) setWarnings(result.warnings);
      else onDone();
      setText("");
      setName("");
    } catch {
      setWarnings(["Não deu pra carregar a lista de Pokémon. Confira a conexão e tente de novo."]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 grid gap-3">
      <div>
        <label htmlFor={`${id}-text`} className="mb-1 block text-sm font-semibold">
          Cole o time do Showdown
        </label>
        <textarea
          id={`${id}-text`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"Charizard @ Life Orb\nAbility: Solar Power\nTera Type: Fire\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Flamethrower\n- Air Slash"}
          className="scroll-x w-full rounded-2xl border border-line bg-surface-solid p-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted/60 focus:border-ink"
        />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <label htmlFor={`${id}-name`} className="mb-1 block text-xs font-semibold text-muted">
            Nome do novo time (opcional)
          </label>
          <input
            id={`${id}-name`}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="Importado"
            className="w-full rounded-xl border border-line bg-surface-solid px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>
        <button
          type="button"
          onClick={run}
          disabled={!text.trim() || busy || !api.canCreate}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-45"
        >
          {busy ? "Importando…" : "Importar como novo time"}
        </button>
      </div>
      {warnings.length > 0 && (
        <ul className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200" role="status">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Gera o card do time como imagem: prévia, baixar PNG e copiar para colar no Discord. */
function ImagePanel({ api, loaded }: { api: TeamsApi; loaded: Pokemon[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const moveNames = api.members.flatMap((m) => m.moves).filter(Boolean);
  const moves = useMoveInfos(moveNames);
  const pokemons = Object.fromEntries(loaded.map((p) => [p.id, p]));
  const ready = api.members.every((m) => pokemons[m.id]) && moveNames.every((n) => moves[n]);
  const readyKey = ready ? Object.keys(moves).sort().join() : "";

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let objectUrl: string | null = null;
    drawTeamCard({ teamName: api.active.name, members: api.members, pokemons, moves })
      .then((canvas) => canvas.toBlob((b) => {
        if (!alive || !b) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      }, "image/png"))
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // Redesenha quando os dados ficam prontos; o painel é recriado (key) quando o time muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, readyKey]);

  const fileName = `${api.active.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "time"}-dex-lab.png`;

  const copy = async () => {
    try {
      if (!blob || !("ClipboardItem" in window)) throw new Error("sem suporte");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-black/80">
        {url ? (
          <img src={url} alt={`Card do time ${api.active.name}`} width={1200} height={675} className="block h-auto w-full" />
        ) : (
          <div className="grid aspect-[16/9] place-items-center text-sm text-white/60">Montando a imagem…</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={url ?? undefined}
          download={fileName}
          aria-disabled={!url}
          className={`rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg ${url ? "" : "pointer-events-none opacity-45"}`}
        >
          Baixar PNG
        </a>
        <button type="button" className={small} onClick={copy} disabled={!blob} aria-live="polite">
          {status === "copied" ? "Copiada!" : "Copiar imagem"}
        </button>
        {status === "error" && (
          <span className="text-xs text-muted">Este navegador não deixou copiar. Use "Baixar PNG".</span>
        )}
      </div>
    </div>
  );
}

/** Jogo do time aberto: define quem pode entrar, golpes e regras. */
function GameSelect({ api }: { api: TeamsApi }) {
  const id = useId();
  const game = gameById(api.active.game);
  const gens = [...new Set(GAMES.filter((g) => g.kind === "official").map((g) => g.gen))];
  const options: SelectOption[] = [
    { value: "", label: "Livre (sem jogo)", hint: "Nacional" },
    ...gens.flatMap((gen) =>
      GAMES.filter((g) => g.kind === "official" && g.gen === gen).map((g) => ({
        value: g.id,
        label: g.label,
        hint: g.region,
        group: `${gen}ª geração`,
        dot: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`,
      })),
    ),
    ...GAMES.filter((g) => g.kind === "hack").map((g) => ({
      value: g.id,
      label: g.label,
      hint: `até Gen ${g.maxGen}`,
      group: "ROM hacks",
      dot: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`,
    })),
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        Jogo do time
      </label>
      <CustomSelect
        id={id}
        value={api.active.game ?? ""}
        onChange={(val) => api.setGame(api.active.id, val || null)}
        options={options}
        searchable
        searchPlaceholder="Buscar jogo ou região…"
        className="w-64 sm:w-72"
      />
      {game && (
        <span className="text-xs text-muted">
          {game.kind === "hack"
            ? `Modo hack: ${game.note} Status, golpes e tipos podem ter mudado; o app só avisa.`
            : `Só entram Pokémon da Pokédex de ${game.region}${game.pokedexes.length > 1 ? " (com DLCs)" : ""}. Regras da ${game.gen}ª geração.`}
        </span>
      )}
    </div>
  );
}

/**
 * Gerador de Desafio: sorteia 6 Pokémon válidos para o jogo aberto,
 * seja um Time Aleatório variado ou um desafio Monotype (todos de 1 tipo só).
 */
function ChallengePanel({ api, onDone }: { api: TeamsApi; onDone: () => void }) {
  const gameCtx = useGame(api.active.game);
  const validTypes = typesOfGen(gameCtx.gen);
  const [monotype, setMonotype] = useState<TypeName | null>(null);
  const [onlyStrong, setOnlyStrong] = useState(true);
  const [includeLegendaries, setIncludeLegendaries] = useState(false);
  const [list, setList] = useState<PokemonRef[] | null>(null);
  const [typeIndex, setTypeIndex] = useState<Record<number, TypeName[]> | null>(null);
  const [rolled, setRolled] = useState<PokemonRef[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([getPokemonList(), getTypeIndex()])
      .then(([l, ti]) => {
        if (!alive) return;
        setList(l);
        setTypeIndex(ti);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const ready = !!list && !!typeIndex && (gameCtx.game?.kind !== "official" || !!gameCtx.species);

  const roll = (nextMono = monotype, nextStrong = onlyStrong, nextLegend = includeLegendaries) => {
    if (!list || !typeIndex) return;
    setRolled(
      rollChallengeTeam({
        list,
        typeIndex,
        gen: gameCtx.gen,
        check: gameCtx.check,
        monotype: nextMono,
        onlyStrong: nextStrong,
        includeLegendaries: nextLegend,
        count: 6,
      }),
    );
  };

  // Sorteia automaticamente assim que os dados terminam de carregar.
  useEffect(() => {
    if (ready && rolled.length === 0) roll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const gameLabel = gameCtx.game ? gameCtx.game.label : "Time livre";
  const suggestedTeamName = monotype
    ? `${gameCtx.game ? gameCtx.game.short : "Mono"} · ${TYPE_INFO[monotype].pt}`
    : `${gameCtx.game ? gameCtx.game.short : "Time"} · Sorteado`;

  return (
    <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-surface-solid/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Gerador de Desafio ({gameLabel})</p>
          <p className="text-xs text-muted">
            Sorteia até 6 Pokémon disponíveis neste jogo — variados ou de um único tipo (Monotype).
          </p>
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={() => roll()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-solid px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink disabled:opacity-45"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 0 0-15.5-6.3L3 8M3 3v5h5M3 12a9 9 0 0 0 15.5 6.3L21 16m0 5v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sortear de novo
        </button>
      </div>

      {/* Escolha do tipo: Todos (Time Aleatório) ou um dos tipos da geração (Monotype) */}
      <div>
        <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
          Formato: {monotype ? `Monotype ${TYPE_INFO[monotype].pt}` : "Time aleatório variado"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={monotype === null}
            onClick={() => {
              setMonotype(null);
              roll(null, onlyStrong, includeLegendaries);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              monotype === null ? "border-ink bg-ink text-bg" : "border-line bg-surface-solid text-muted hover:text-ink"
            }`}
          >
            Qualquer tipo
          </button>
          {validTypes.map((t) => {
            const on = monotype === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? null : t;
                  setMonotype(next);
                  roll(next, onlyStrong, includeLegendaries);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium text-white transition ${
                  on ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : monotype ? "opacity-45 hover:opacity-100" : "hover:brightness-110"
                }`}
                style={{ background: TYPE_INFO[t].color, textShadow: "0 1px 1px rgb(0 0 0 / 0.35)" }}
              >
                {TYPE_INFO[t].pt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={onlyStrong}
            onChange={(e) => {
              const v = e.target.checked;
              setOnlyStrong(v);
              roll(monotype, v, includeLegendaries);
            }}
            className="size-4 accent-current"
          />
          Priorizar evoluídos / fortes
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={includeLegendaries}
            onChange={(e) => {
              const v = e.target.checked;
              setIncludeLegendaries(v);
              roll(monotype, onlyStrong, v);
            }}
            className="size-4 accent-current"
          />
          Incluir lendários e míticos
        </label>
      </div>

      {!ready ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-line bg-line/40" />
          ))}
        </div>
      ) : rolled.length === 0 ? (
        <p className="text-sm text-muted">Nenhum Pokémon encontrado com esses filtros neste jogo.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {rolled.map((p) => {
            const pTypes = (typeIndex?.[p.id] ?? []).filter((t) => validTypes.includes(t));
            return (
              <li
                key={p.id}
                className="flex flex-col items-center rounded-2xl border border-line bg-surface-solid p-2.5 text-center"
              >
                <img src={artworkUrl(p.id)} alt="" width={84} height={84} loading="lazy" className="size-18 object-contain" />
                <span className="mt-1 w-full truncate font-display text-xs font-bold sm:text-sm">{pokemonName(p.name)}</span>
                <span className="mt-1 flex flex-wrap justify-center gap-1">
                  {pTypes.map((t) => (
                    <TypeBadge key={t} type={t} size="sm" />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={rolled.length === 0}
          onClick={() => {
            api.setMembers(rolled.map((p) => newMember(p.id)));
            onDone();
          }}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg disabled:opacity-45"
        >
          Usar neste time ({api.active.name})
        </button>
        <button
          type="button"
          disabled={rolled.length === 0 || !api.canCreate}
          onClick={() => {
            api.create(
              suggestedTeamName,
              rolled.map((p) => newMember(p.id)),
              api.active.game,
            );
            onDone();
          }}
          className={small}
        >
          Salvar como novo time
        </button>
        <button type="button" className={small} onClick={onDone}>
          Fechar
        </button>
      </div>
    </div>
  );
}
