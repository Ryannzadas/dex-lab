import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, CustomSelect, SectionHeading, type SelectOption } from "@/components/ui";
import { useCloudSession } from "@/lib/cloud-session";
import { gameById, GAMES } from "@/lib/games";
import { artworkUrl, getPokemonList, pokemonName } from "@/lib/pokeapi";
import { teamLink, type Member } from "@/lib/team";
import { Avatar } from "./profile-dialog";

type Entry = {
  id: string;
  handle: string;
  name: string;
  photo: string | null;
  team: { name: string; game: string | null; members: Member[] };
  curtidas: number;
  copias: number;
  atualizado: number;
};
type Order = "alta" | "curtidos" | "recentes";

const ORDERS: { id: Order; label: string }[] = [
  { id: "alta", label: "Em alta" },
  { id: "curtidos", label: "Mais curtidos" },
  { id: "recentes", label: "Recentes" },
];

const REASONS = [
  { id: "ofensivo", label: "Ofensivo" },
  { id: "spam", label: "Spam" },
  { id: "outro", label: "Outro" },
] as const;

async function post(body: object, token?: string | null) {
  const res = await fetch("/api/vitrine", {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { erro?: string; curtido?: boolean; curtidas?: number };
  if (!res.ok) throw new Error(data.erro ?? "Não deu agora. Tente de novo.");
  return data;
}

/** Vitrine: times que as pessoas deixaram públicos no perfil. */
export function Vitrine({ loginAvailable }: { loginAvailable: boolean }) {
  const session = useCloudSession();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [game, setGame] = useState("");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<Order>("alta");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/vitrine")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { times: Entry[] };
        if (alive) setEntries(data.times);
      })
      .catch(() => alive && setFailed(true));
    getPokemonList()
      .then((list) => alive && setNames(new Map(list.map((p) => [p.id, pokemonName(p.name)]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // O que eu já curti (só com login).
  useEffect(() => {
    if (!session) return;
    let alive = true;
    session
      .getToken()
      .then((token) => fetch("/api/vitrine?minhas=1", { headers: { authorization: `Bearer ${token}` } }))
      .then((res) => (res.ok ? (res.json() as Promise<{ curtidas: string[] }>) : { curtidas: [] }))
      .then((data) => alive && setLiked(new Set(data.curtidas)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session]);

  const gameOptions = useMemo<SelectOption[]>(() => {
    const present = new Set((entries ?? []).map((e) => e.team.game ?? "livre"));
    return [
      { value: "", label: "Todos os jogos" },
      ...(present.has("livre") ? [{ value: "livre", label: "Time livre" }] : []),
      ...GAMES.filter((g) => present.has(g.id)).map((g) => ({ value: g.id, label: g.label, hint: g.region })),
    ];
  }, [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (entries ?? []).filter((e) => {
      if (game && (e.team.game ?? "livre") !== game) return false;
      if (!q) return true;
      return (
        e.team.name.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.handle.includes(q) ||
        e.team.members.some((m) => (names.get(m.id) ?? "").toLowerCase().includes(q) || m.nickname.toLowerCase().includes(q))
      );
    });
    const score = (e: Entry) => (order === "curtidos" ? e.curtidas : order === "recentes" ? e.atualizado : e.copias * 2 + e.curtidas);
    return list.sort((a, b) => score(b) - score(a) || b.atualizado - a.atualizado);
  }, [entries, game, query, order, names]);

  const toggleLike = async (entry: Entry) => {
    if (!session) {
      setNotice(loginAvailable ? "Entre na sua conta (botão no canto de cima) para curtir." : "Curtidas indisponíveis agora.");
      return;
    }
    const was = liked.has(entry.id);
    const apply = (on: boolean, count?: number) => {
      setLiked((s) => {
        const next = new Set(s);
        if (on) next.add(entry.id);
        else next.delete(entry.id);
        return next;
      });
      setEntries((list) =>
        (list ?? []).map((e) => (e.id === entry.id ? { ...e, curtidas: count ?? Math.max(0, e.curtidas + (on ? 1 : -1)) } : e)),
      );
    };
    apply(!was);
    try {
      const data = await post({ acao: "curtir", handle: entry.handle, id: entry.id }, await session.getToken());
      apply(!!data.curtido, data.curtidas);
    } catch (e) {
      apply(was);
      setNotice((e as Error).message);
    }
  };

  return (
    <section>
      <SectionHeading kicker="{ comunidade }" title="Vitrine">
        Times que outros treinadores deixaram públicos. Gostou de um? Use no seu Dex Lab e mude o que quiser. Para mostrar os seus, vá em
        Perfil e conta → Perfil público.
      </SectionHeading>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar Pokémon, time ou treinador"
            aria-label="Buscar na vitrine"
            className="w-full rounded-2xl border border-line bg-surface py-2.5 pr-3 pl-10 text-base outline-none backdrop-blur-xl transition focus:border-ink sm:text-sm"
          />
        </div>
        <CustomSelect value={game} onChange={setGame} options={gameOptions} ariaLabel="Filtrar por jogo" className="sm:w-56" />
      </div>

      <div role="radiogroup" aria-label="Ordenar" className="mb-6 flex flex-wrap gap-1.5">
        {ORDERS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={order === o.id}
            onClick={() => setOrder(o.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              order === o.id ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
        {entries && (
          <span className="ml-auto self-center rounded-lg border border-line px-2 py-0.5 font-mono text-xs text-muted">
            {visible.length} {visible.length === 1 ? "time" : "times"}
          </span>
        )}
      </div>

      {notice && (
        <p role="status" className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-muted hover:text-ink" aria-label="Fechar aviso">
            ✕
          </button>
        </p>
      )}

      {failed ? (
        <p className="py-12 text-center text-muted">Não deu para carregar a vitrine. Confira a internet e tente de novo.</p>
      ) : entries === null ? (
        <div className="grid gap-5 lg:grid-cols-2" aria-label="Carregando">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-3xl border border-line bg-surface" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-xl font-bold">{entries.length === 0 ? "A vitrine ainda está vazia" : "Nada com esse filtro"}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {entries.length === 0
              ? "Seja o primeiro: entre na sua conta, abra Perfil e conta → Perfil público e marque os times que quer mostrar."
              : "Tente outro jogo ou outro nome."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((e) => (
            <VitrineCard
              key={e.id}
              entry={e}
              names={names}
              liked={liked.has(e.id)}
              onLike={() => void toggleLike(e)}
              onReported={() => {
                setEntries((list) => (list ?? []).filter((x) => x.id !== e.id));
                setNotice("Obrigado. O time saiu da sua vitrine e vamos dar uma olhada.");
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function VitrineCard({
  entry,
  names,
  liked,
  onLike,
  onReported,
}: {
  entry: Entry;
  names: Map<number, string>;
  liked: boolean;
  onLike: () => void;
  onReported: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  const game = gameById(entry.team.game);

  const use = () => {
    void post({ acao: "copiar", handle: entry.handle, id: entry.id }).catch(() => {});
    window.location.href = teamLink(entry.team);
  };

  const report = (motivo: string) => {
    void post({ acao: "denunciar", handle: entry.handle, id: entry.id, motivo }).catch(() => {});
    onReported();
  };

  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-4 shadow-sm backdrop-blur-xl sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold">{entry.team.name}</h3>
          <p className="text-sm text-muted">{game ? game.label : "Time livre"}</p>
        </div>
        <button
          type="button"
          onClick={onLike}
          aria-pressed={liked}
          aria-label={`${liked ? "Descurtir" : "Curtir"} ${entry.team.name}. ${entry.curtidas} curtidas`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            liked ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-line hover:border-ink"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" strokeLinejoin="round" />
          </svg>
          <span className="font-mono">{entry.curtidas}</span>
        </button>
      </header>

      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {entry.team.members.map((m, i) => {
          const name = m.nickname || names.get(m.id) || `#${m.id}`;
          return (
            <li key={i} className="flex flex-col items-center rounded-2xl border border-line bg-bg/60 px-1 pt-2 pb-2">
              <img src={artworkUrl(m.id, m.shiny)} alt="" width={80} height={80} loading="lazy" className="aspect-square w-full max-w-20 object-contain" />
              <span className="mt-1 w-full truncate text-center text-xs font-medium" title={name}>
                {name}
              </span>
            </li>
          );
        })}
      </ul>

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
        <a href={`/u/${entry.handle}`} className="flex w-full min-w-0 items-center gap-2.5 rounded-full pr-2 transition hover:opacity-80 sm:w-auto sm:flex-1">
          <Avatar user={entry} size={32} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{entry.name}</span>
            <span className="block truncate font-mono text-xs text-muted">@{entry.handle}</span>
          </span>
        </a>
        {entry.copias > 0 && (
          <span className="font-mono text-xs text-muted" title="Quantas pessoas usaram este time">
            {entry.copias} {entry.copias === 1 ? "cópia" : "cópias"}
          </span>
        )}
        <button
          type="button"
          onClick={use}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
        >
          Usar este time <ArrowIcon />
        </button>
        <button
          type="button"
          onClick={() => setReporting((v) => !v)}
          aria-expanded={reporting}
          aria-label="Denunciar este time"
          title="Denunciar"
          className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 21V4M5 4h11l-2 4 2 4H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {reporting && (
          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-2xl bg-line/40 px-3 py-2 text-sm">
            <span className="mr-1 text-muted">Denunciar por:</span>
            {REASONS.map((r) => (
              <button key={r.id} type="button" onClick={() => report(r.id)} className="rounded-full border border-line px-3 py-1 font-medium transition hover:border-ink">
                {r.label}
              </button>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
}
