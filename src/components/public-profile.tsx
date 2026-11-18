import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Footer } from "@/App";
import { Blobs } from "@/components/blobs";
import { ArrowIcon } from "@/components/ui";
import { gameById } from "@/lib/games";
import { artworkUrl, getPokemonList, pokemonName } from "@/lib/pokeapi";
import { useTheme } from "@/lib/state";
import { CLOUD_ENABLED } from "@/lib/cloud-session";
import { useFollowing } from "@/lib/following";
import { teamLink, useTeams, type Member } from "@/lib/team";
import { MatchupDialog, type OtherTeam } from "./matchup";
import { Avatar } from "./profile-dialog";

type PublicTeam = { name: string; game: string | null; members: Member[] };
type PublicProfile = { handle: string; name: string; photo: string | null; bio: string; since: number; teams: PublicTeam[]; seguidores?: number; titulos?: { titulo: string; semana: string; termina: number }[] };

// Botão de conta (login), o mesmo do app; carrega à parte.
const CloudRoot = lazy(() => import("./cloud-root"));
type State = { status: "carregando" } | { status: "ok"; profile: PublicProfile } | { status: "nao-achou" } | { status: "erro" };

/** Página pública de um treinador: dex-lab.vercel.app/u/<nome>. */
export default function PublicProfilePage({ handle }: { handle: string }) {
  const theme = useTheme();
  const teams = useTeams(false);
  const [comparing, setComparing] = useState<OtherTeam | null>(null);
  const [state, setState] = useState<State>({ status: "carregando" });
  const [names, setNames] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let alive = true;
    fetch(`/api/perfil?h=${encodeURIComponent(handle)}`)
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) return setState({ status: "nao-achou" });
        if (!res.ok) return setState({ status: "erro" });
        setState({ status: "ok", profile: (await res.json()) as PublicProfile });
      })
      .catch(() => alive && setState({ status: "erro" }));
    getPokemonList()
      .then((list) => alive && setNames(new Map(list.map((p) => [p.id, pokemonName(p.name)]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [handle]);

  const profile = state.status === "ok" ? state.profile : null;
  useEffect(() => {
    document.title = profile ? `${profile.name} (@${profile.handle}) · Dex Lab` : "Perfil · Dex Lab";
  }, [profile]);

  const pokemonCount = useMemo(() => profile?.teams.reduce((n, t) => n + t.members.length, 0) ?? 0, [profile]);
  const since = profile ? new Date(profile.since).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "";

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Blobs types={[]} />
      <header className="safe-top relative z-10 px-4 pt-3 pb-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <a href="/" className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface p-1 pr-3.5 shadow-sm backdrop-blur-xl" aria-label="Dex Lab, ir para o início">
            <img src="/favicon.svg" alt="" width={36} height={36} className="size-8 sm:size-9" />
            <span className="font-display text-lg font-bold tracking-tight">Dex Lab</span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-xl transition hover:border-ink">
              Montar meu time <ArrowIcon />
            </a>
            {CLOUD_ENABLED && (
              <span className="flex rounded-2xl border border-line bg-surface p-1 shadow-sm backdrop-blur-xl">
                <Suspense fallback={<span className="size-8" aria-hidden="true" />}>
                  <CloudRoot api={teams} />
                </Suspense>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-14">
        {state.status === "carregando" && (
          <div className="flex animate-pulse items-center gap-5" aria-label="Carregando perfil">
            <span className="size-24 rounded-full bg-line" />
            <div className="grid gap-2">
              <span className="h-8 w-48 rounded-lg bg-line" />
              <span className="h-4 w-28 rounded bg-line" />
            </div>
          </div>
        )}

        {(state.status === "nao-achou" || state.status === "erro") && (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">{state.status === "nao-achou" ? "{ 404 }" : "{ ops }"}</p>
            <h1 className="mt-3 font-display text-3xl font-bold">
              {state.status === "nao-achou" ? `Ninguém usa @${handle} por aqui` : "Não deu para abrir o perfil"}
            </h1>
            <p className="mt-3 text-muted">
              {state.status === "nao-achou" ? "O link pode ter mudado ou o perfil saiu do ar." : "Confira a internet e tente de novo daqui a pouco."}
            </p>
            <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">
              Ir para o Dex Lab <ArrowIcon />
            </a>
          </div>
        )}

        {profile && (
          <>
            <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
              <Avatar user={profile} size={112} />
              <div className="min-w-0">
                <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Treinador · @{profile.handle}</p>
                <h1 className="mt-1.5 font-display text-4xl leading-none font-bold tracking-tight break-words sm:text-6xl">{profile.name}</h1>
                {profile.bio && <p className="mt-3 max-w-xl text-lg text-muted">{profile.bio}</p>}
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {[
                    [profile.teams.length, profile.teams.length === 1 ? "time" : "times"],
                    [pokemonCount, "Pokémon"],
                  ].map(([n, label]) => (
                    <span key={label} className="rounded-lg border border-line bg-surface px-2.5 py-1 backdrop-blur-xl">
                      <b className="font-mono">{n}</b> {label}
                    </span>
                  ))}
                  <span className="rounded-lg border border-line bg-surface px-2.5 py-1 text-muted backdrop-blur-xl">desde {since}</span>
                </div>
                {!!profile.titulos?.length && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Títulos">
                    {profile.titulos.map((t) => (
                      <li
                        key={t.semana}
                        className="rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300"
                        title={`Campeão do desafio da semana até ${new Date(t.termina - 1).toLocaleDateString("pt-BR")}`}
                      >
                        🏆 Campeão · {t.titulo}
                      </li>
                    ))}
                  </ul>
                )}
                <FollowButton handle={profile.handle} initial={profile.seguidores ?? 0} />
              </div>
            </section>

            <section className="mt-12" aria-label="Times">
              {profile.teams.length === 0 ? (
                <p className="text-muted">Nenhum time público por enquanto.</p>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {profile.teams.map((team, i) => (
                    <TeamCard key={i} team={team} names={names} onCompare={() => setComparing({ name: team.name, handle: profile.handle, members: team.members })} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {comparing && <MatchupDialog mine={teams} other={comparing} onClose={() => setComparing(null)} />}
      <Footer dark={theme.dark} />
    </div>
  );
}

function FollowButton({ handle, initial }: { handle: string; initial: number }) {
  const { following, signedIn, toggle } = useFollowing();
  const [count, setCount] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const on = following.has(handle);

  const click = async () => {
    if (!signedIn) {
      setMsg(CLOUD_ENABLED ? "Entre na sua conta (botão no canto de cima) para seguir." : "Indisponível agora.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      setCount((await toggle(handle)).seguidores);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void click()}
        disabled={busy}
        aria-pressed={on}
        className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          on ? "border border-line hover:border-ink" : "bg-ink text-bg hover:opacity-90"
        }`}
      >
        {on ? "Seguindo" : "Seguir"}
      </button>
      <span className="text-sm text-muted">
        <b className="font-mono text-ink">{count}</b> {count === 1 ? "seguidor" : "seguidores"}
      </span>
      {msg && <span className="w-full text-sm text-muted">{msg}</span>}
    </div>
  );
}

function TeamCard({ team, names, onCompare }: { team: PublicTeam; names: Map<number, string>; onCompare: () => void }) {
  const game = gameById(team.game);
  return (
    <article className="rounded-3xl border border-line bg-surface p-4 shadow-sm backdrop-blur-xl sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold">{team.name}</h2>
          <p className="text-sm text-muted">{game ? game.label : "Time livre"}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onCompare}
            className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold transition hover:border-ink"
          >
            Comparar
          </button>
          <a
            href={teamLink(team)}
            className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold transition hover:border-ink hover:bg-ink hover:text-bg"
          >
            Abrir <ArrowIcon direction="up-right" />
          </a>
        </div>
      </header>
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {team.members.map((m, i) => {
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
    </article>
  );
}
