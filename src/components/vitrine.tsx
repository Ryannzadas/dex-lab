import { useEffect, useMemo, useState } from "react";
import { CustomSelect, SectionHeading, type SelectOption } from "@/components/ui";
import { useCloudSession } from "@/lib/cloud-session";
import { GAMES } from "@/lib/games";
import { getPokemonList, pokemonName } from "@/lib/pokeapi";
import { challengeOfWeek } from "@/lib/desafios";
import { teamLink, type Member, type TeamsApi } from "@/lib/team";
import { post } from "@/lib/community";
import { DesafioView } from "./desafio";
import { ShowcaseCard } from "./showcase-card";

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



type View = "todos" | "desafio";

function readView(): View {
  return new URLSearchParams(window.location.search).get("ver") === "desafio" ? "desafio" : "todos";
}

/** Vitrine: times públicos da comunidade e o desafio da semana. */
export function Vitrine({ loginAvailable, teams }: { loginAvailable: boolean; teams: TeamsApi }) {
  const [view, setView] = useState<View>(readView);
  const [desafioTitle, setDesafioTitle] = useState(() => challengeOfWeek().challenge.title);

  const choose = (next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "desafio") url.searchParams.set("ver", "desafio");
    else url.searchParams.delete("ver");
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <section>
      <SectionHeading kicker="{ comunidade }" title="Vitrine">
        {view === "todos"
          ? "Times que outros treinadores deixaram públicos. Gostou de um? Use no seu Dex Lab e mude o que quiser. Para mostrar os seus, vá em Perfil e conta → Perfil público."
          : "Toda semana, uma regra nova. Monte um time que cumpra, inscreva e veja quem leva mais curtidas até segunda."}
      </SectionHeading>
      <div role="tablist" aria-label="O que ver" className="mb-6 inline-flex max-w-full rounded-2xl border border-line bg-surface p-1 backdrop-blur-xl">
        {(
          [
            ["todos", "Todos os times"],
            ["desafio", `Desafio: ${desafioTitle}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => choose(id)}
            className={`truncate rounded-xl px-3.5 py-2 text-sm font-medium transition ${view === id ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "todos" ? (
        <AllTeams loginAvailable={loginAvailable} />
      ) : (
        <DesafioView loginAvailable={loginAvailable} teams={teams} onTitle={setDesafioTitle} />
      )}
    </section>
  );
}

function AllTeams({ loginAvailable }: { loginAvailable: boolean }) {
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
    <div>

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
            <ShowcaseCard
              key={e.id}
              entry={e}
              names={names}
              liked={liked.has(e.id)}
              onLike={() => void toggleLike(e)}
              onUse={() => {
                void post({ acao: "copiar", handle: e.handle, id: e.id }).catch(() => {});
                window.location.href = teamLink(e.team);
              }}
              onReport={(motivo) => {
                void post({ acao: "denunciar", handle: e.handle, id: e.id, motivo }).catch(() => {});
                setEntries((list) => (list ?? []).filter((x) => x.id !== e.id));
                setNotice("Obrigado. O time saiu da sua vitrine e vamos dar uma olhada.");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
