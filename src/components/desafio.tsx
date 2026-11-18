import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, CustomSelect, type SelectOption } from "@/components/ui";
import { useCloudSession } from "@/lib/cloud-session";
import { checkMonOf, post } from "@/lib/community";
import { challengeOfWeek, checkTeam, timeLeft } from "@/lib/desafios";
import { getPokemonList, pokemonName, type Pokemon } from "@/lib/pokeapi";
import { teamLink, type Member, type TeamsApi } from "@/lib/team";
import { usePokemons } from "@/lib/use-pokemon";
import { ShowcaseCard, type ShowcaseEntry } from "./showcase-card";

type Entrada = ShowcaseEntry & { em: number };
type Data = { desafio: { titulo: string; descricao: string; termina: number }; entradas: Entrada[] };

/** Tela do desafio da semana dentro da vitrine: regra, inscrição e ranking. */
export function DesafioView({ loginAvailable, teams, onTitle }: { loginAvailable: boolean; teams: TeamsApi; onTitle: (title: string) => void }) {
  const session = useCloudSession();
  const local = challengeOfWeek();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/desafio", reload ? { cache: "no-store" } : undefined)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const d = (await res.json()) as Data;
        if (!alive) return;
        setData(d);
        onTitle(d.desafio.titulo);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [reload, onTitle]);

  useEffect(() => {
    getPokemonList()
      .then((list) => setNames(new Map(list.map((p) => [p.id, pokemonName(p.name)]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    session
      .getToken()
      .then((token) => fetch("/api/desafio?minhas=1", { headers: { authorization: `Bearer ${token}` } }))
      .then((res) => (res.ok ? (res.json() as Promise<{ curtidas: string[]; minha: string | null }>) : { curtidas: [], minha: null }))
      .then((d) => {
        if (!alive) return;
        setLiked(new Set(d.curtidas));
        setMine(d.minha);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session, reload]);

  const title = data?.desafio.titulo ?? local.challenge.title;
  const description = data?.desafio.descricao ?? local.challenge.description;
  const endsAt = data?.desafio.termina ?? local.endsAt;
  const entradas = data?.entradas ?? [];

  const like = async (entry: Entrada) => {
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
      setData((d) =>
        d && {
          ...d,
          entradas: d.entradas.map((e) => (e.id === entry.id ? { ...e, curtidas: count ?? Math.max(0, e.curtidas + (on ? 1 : -1)) } : e)),
        },
      );
    };
    apply(!was);
    try {
      const r = await post({ acao: "curtir", id: entry.id }, await session.getToken(), "/api/desafio");
      apply(!!r.curtido, r.curtidas);
    } catch (e) {
      apply(was);
      setNotice((e as Error).message);
    }
  };

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm backdrop-blur-xl sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-start">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">{"{ desafio da semana }"}</p>
            <h3 className="mt-2 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{title}</h3>
            <p className="mt-3 max-w-xl text-muted">{description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg border border-line px-2.5 py-1">
                termina em <b className="font-mono">{timeLeft(endsAt)}</b>
              </span>
              <span className="rounded-lg border border-line px-2.5 py-1">
                <b className="font-mono">{entradas.length}</b> {entradas.length === 1 ? "time inscrito" : "times inscritos"}
              </span>
            </div>
          </div>
          <JoinPanel
            loginAvailable={loginAvailable}
            signedIn={!!session}
            teams={teams}
            mine={mine}
            onDone={(message) => {
              setNotice(message);
              setReload((n) => n + 1);
            }}
          />
        </div>
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
        <p className="py-12 text-center text-muted">Não deu para carregar o desafio. Confira a internet e tente de novo.</p>
      ) : !data ? (
        <div className="grid gap-5 lg:grid-cols-2" aria-label="Carregando">
          {[0, 1].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-3xl border border-line bg-surface" />
          ))}
        </div>
      ) : entradas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-xl font-bold">Ninguém se inscreveu ainda</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Monte um time que cumpra a regra e seja o primeiro do ranking.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {entradas.map((e, i) => (
            <ShowcaseCard
              key={e.id}
              entry={e}
              rank={i + 1}
              names={names}
              liked={liked.has(e.id)}
              onLike={() => void like(e)}
              onUse={() => {
                window.location.href = teamLink(e.team);
              }}
              onReport={(motivo) => {
                void post({ acao: "denunciar", id: e.id, motivo }, null, "/api/desafio").catch(() => {});
                setData((d) => d && { ...d, entradas: d.entradas.filter((x) => x.id !== e.id) });
                setNotice("Obrigado. O time saiu da sua lista e vamos dar uma olhada.");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Escolher um dos meus times, ver se cumpre a regra e inscrever. */
function JoinPanel({
  loginAvailable,
  signedIn,
  teams,
  mine,
  onDone,
}: {
  loginAvailable: boolean;
  signedIn: boolean;
  teams: TeamsApi;
  mine: string | null;
  onDone: (message: string) => void;
}) {
  const session = useCloudSession();
  const options = useMemo<SelectOption[]>(
    () => teams.teams.filter((t) => t.members.length > 0).map((t) => ({ value: t.id, label: t.name, hint: `${t.members.length}/6` })),
    [teams.teams],
  );
  const [chosen, setChosen] = useState(() => (teams.active.members.length ? teams.active.id : (options[0]?.value ?? "")));
  const team = teams.teams.find((t) => t.id === chosen);
  const ids = useMemo(() => team?.members.map((m) => m.id) ?? [], [team]);
  const mons = usePokemons(ids);
  const problems = useMemo(() => {
    if (!team || mons.pending.length) return null;
    return checkTeam(challengeOfWeek().challenge, mons.list.map(checkMonOf));
  }, [team, mons.list, mons.pending.length]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-line bg-bg/50 p-4 text-sm">
        <p className="font-semibold">Quer participar?</p>
        <p className="mt-1 text-muted">
          {loginAvailable
            ? "Entre na sua conta (botão no canto de cima), crie seu perfil público e volte aqui."
            : "As inscrições estão indisponíveis agora."}
        </p>
      </div>
    );
  }

  const join = async () => {
    if (!team || !session) return;
    setBusy(true);
    setError(null);
    try {
      await post({ acao: "participar", time: team.id }, await session.getToken(), "/api/desafio");
      onDone(`"${team.name}" está no desafio. Boa sorte!`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!session || !window.confirm("Tirar seu time do desafio desta semana?")) return;
    setBusy(true);
    try {
      await post({ acao: "sair" }, await session.getToken(), "/api/desafio");
      onDone("Seu time saiu do desafio.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-bg/50 p-4 text-sm">
      <p className="font-semibold">{mine ? "Você está participando" : "Participar com um time"}</p>
      {options.length === 0 ? (
        <p className="mt-1 text-muted">Monte um time na aba Time primeiro.</p>
      ) : (
        <>
          <CustomSelect value={chosen} onChange={setChosen} options={options} ariaLabel="Escolher time" className="mt-3" />
          <TeamCheck members={team?.members ?? []} pending={mons.pending.length > 0} problems={problems} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !problems || problems.length > 0}
              onClick={() => void join()}
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-semibold text-bg transition hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Enviando…" : mine ? "Trocar meu time" : "Inscrever"} <ArrowIcon />
            </button>
            {mine && (
              <button type="button" disabled={busy} onClick={() => void leave()} className="text-muted underline-offset-2 hover:text-ink hover:underline">
                Sair do desafio
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TeamCheck({ members, pending, problems }: { members: Member[]; pending: boolean; problems: string[] | null }) {
  if (!members.length) return null;
  if (pending || !problems) return <p className="mt-2 text-muted">Conferindo a regra…</p>;
  if (problems.length === 0)
    return (
      <p className="mt-2 flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
        <span aria-hidden="true">✓</span> Esse time cumpre o desafio.
      </p>
    );
  return (
    <ul className="mt-2 grid gap-1 text-amber-700 dark:text-amber-300">
      {problems.map((p) => (
        <li key={p} className="flex gap-1.5">
          <span aria-hidden="true">•</span>
          {p}
        </li>
      ))}
    </ul>
  );
}

/** Aviso compacto na aba Time: o desafio da semana e se o time aberto cumpre a regra. */
export function DesafioBadge({ list, count, pending, onOpen }: { list: Pokemon[]; count: number; pending: boolean; onOpen: () => void }) {
  const { challenge, endsAt } = challengeOfWeek();
  const problems = pending ? null : checkTeam(challenge, list.map(checkMonOf));
  const ok = problems !== null && problems.length === 0;
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface px-4 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
          {"{ desafio da semana }"} · termina em {timeLeft(endsAt)}
        </p>
        <p className="mt-0.5 font-display text-lg font-bold">{challenge.title}</p>
        <p className={`text-sm ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-muted"}`}>
          {count === 0
            ? challenge.description
            : problems === null
              ? "Conferindo seu time…"
              : ok
                ? "✓ Seu time cumpre o desafio."
                : problems[0]}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-ink hover:bg-ink hover:text-bg"
      >
        {ok ? "Participar" : "Ver desafio"} <ArrowIcon />
      </button>
    </div>
  );
}
