import { lazy, Suspense, useEffect, useState } from "react";
import { Footer } from "@/App";
import { CLOUD_ENABLED, useCloudSession, type CloudSession } from "@/lib/cloud-session";
import { artworkUrl } from "@/lib/pokeapi";
import { useTheme } from "@/lib/state";
import { useTeams } from "@/lib/team";

const CloudRoot = lazy(() => import("./cloud-root"));

type Item = {
  chave: string;
  id: string;
  onde: "vitrine" | "desafio";
  motivos: Record<string, number>;
  total: number;
  ultima: string;
  escondido: boolean;
  detalhes: { uid: string; handle: string; name: string; bio?: string; team: string; members: number[] } | null;
};
type Blocked = { uid: string; handle: string; name: string; em: string };
type State = { status: "carregando" | "proibido" | "erro" } | { status: "ok"; denuncias: Item[]; bloqueados: Blocked[] };

async function fetchAdmin(session: NonNullable<CloudSession>): Promise<State> {
  try {
    const res = await fetch("/api/admin", { headers: { authorization: `Bearer ${await session.getToken()}` }, cache: "no-store" });
    if (res.status === 403) return { status: "proibido" };
    if (!res.ok) return { status: "erro" };
    return { status: "ok", ...((await res.json()) as { denuncias: Item[]; bloqueados: Blocked[] }) };
  } catch {
    return { status: "erro" };
  }
}

const MOTIVO: Record<string, string> = { ofensivo: "ofensivo", spam: "spam", outro: "outro" };

/** /admin — moderação da vitrine e do desafio (só para o dono do app). */
export default function AdminPage() {
  const theme = useTheme();
  const teams = useTeams(false);
  const session = useCloudSession();
  const [state, setState] = useState<State>({ status: "carregando" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Moderação · Dex Lab";
  }, []);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    void fetchAdmin(session).then((next) => alive && setState(next));
    return () => {
      alive = false;
    };
  }, [session, reload]);

  const act = async (key: string, body: object, done: string) => {
    if (!session) return;
    setBusy(key);
    setNotice(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await session.getToken()}` },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) throw new Error(data.erro ?? "Não deu.");
      setNotice(done);
      setReload((n) => n + 1);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="safe-top relative z-10 px-4 pt-3 pb-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <a href="/" className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface p-1 pr-3.5 shadow-sm backdrop-blur-xl">
            <img src="/favicon.svg" alt="" width={36} height={36} className="size-8 sm:size-9" />
            <span className="font-display text-lg font-bold tracking-tight">Dex Lab</span>
          </a>
          {CLOUD_ENABLED && (
            <span className="flex rounded-2xl border border-line bg-surface p-1 shadow-sm backdrop-blur-xl">
              <Suspense fallback={<span className="size-8" aria-hidden="true" />}>
                <CloudRoot api={teams} />
              </Suspense>
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">{"{ só pra você }"}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Moderação</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Denúncias da vitrine e do desafio. Um time com {3} denúncias de pessoas diferentes some sozinho até você decidir.
        </p>

        {notice && (
          <p role="status" className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
            {notice}
          </p>
        )}

        <div className="mt-8">
          {!session && <p className="text-muted">Entre com sua conta (botão no canto de cima).</p>}
          {session && state.status === "carregando" && <p className="text-muted">Carregando…</p>}
          {session && state.status === "proibido" && (
            <p className="text-muted">
              Esta conta não é de moderação. Confira se o e-mail dela está na variável <code className="font-mono">ADMIN_EMAIL</code> da Vercel e se
              ele foi confirmado.
            </p>
          )}
          {session && state.status === "erro" && <p className="text-muted">Não deu para carregar. Tente de novo.</p>}

          {session && state.status === "ok" && (
            <>
              <h2 className="mb-3 font-semibold">
                Denúncias abertas <span className="font-mono text-muted">({state.denuncias.length})</span>
              </h2>
              {state.denuncias.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Nada para revisar. 🎉</p>
              ) : (
                <ul className="grid gap-3">
                  {state.denuncias.map((d) => (
                    <li key={d.chave} className="rounded-2xl border border-line bg-surface p-4 backdrop-blur-xl">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted">
                            {d.onde === "desafio" ? "Desafio" : "Vitrine"} · {d.total} {d.total === 1 ? "denúncia" : "denúncias"} (
                            {Object.entries(d.motivos)
                              .map(([m, n]) => `${n} ${MOTIVO[m] ?? m}`)
                              .join(", ")}
                            ) · última em {new Date(d.ultima).toLocaleString("pt-BR")}
                          </p>
                          <p className="mt-1 font-semibold">{d.detalhes?.team ?? "(time não encontrado)"}</p>
                          {d.detalhes && (
                            <p className="text-sm text-muted">
                              <a href={`/u/${d.detalhes.handle}`} target="_blank" rel="noopener" className="underline-offset-2 hover:text-ink hover:underline">
                                {d.detalhes.name} · @{d.detalhes.handle}
                              </a>
                              {d.detalhes.bio && <> · “{d.detalhes.bio}”</>}
                            </p>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            d.escondido ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {d.escondido ? "escondido" : "aparecendo"}
                        </span>
                      </div>
                      {!!d.detalhes?.members.length && (
                        <div className="mt-2 flex gap-1">
                          {d.detalhes.members.map((id, i) => (
                            <img key={i} src={artworkUrl(id)} alt="" width={40} height={40} loading="lazy" className="size-10 object-contain" />
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <AdminButton disabled={!!busy} onClick={() => void act(d.chave, { acao: "liberar", chave: d.chave, id: d.id, total: d.total }, "Liberado.")}>
                          Liberar
                        </AdminButton>
                        <AdminButton disabled={!!busy} onClick={() => void act(d.chave, { acao: "ocultar", chave: d.chave, id: d.id, total: d.total }, "Escondido de vez.")}>
                          Esconder de vez
                        </AdminButton>
                        <AdminButton disabled={!!busy} onClick={() => void act(d.chave, { acao: "ignorar", chave: d.chave, total: d.total }, "Tirado da lista.")}>
                          Ignorar
                        </AdminButton>
                        {d.detalhes && (
                          <AdminButton
                            danger
                            disabled={!!busy}
                            onClick={() => {
                              if (!window.confirm(`Bloquear @${d.detalhes!.handle}? O perfil público sai do ar e a conta não pode mais publicar nem participar.`)) return;
                              void act(d.chave, { acao: "bloquear", chave: d.chave, uid: d.detalhes!.uid, total: d.total }, `@${d.detalhes!.handle} bloqueado.`);
                            }}
                          >
                            Bloquear conta
                          </AdminButton>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <h2 className="mt-10 mb-3 font-semibold">
                Contas bloqueadas <span className="font-mono text-muted">({state.bloqueados.length})</span>
              </h2>
              {state.bloqueados.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma.</p>
              ) : (
                <ul className="grid gap-2">
                  {state.bloqueados.map((b) => (
                    <li key={b.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
                      <span>
                        <b>{b.name || "(sem nome)"}</b> {b.handle && <span className="text-muted">@{b.handle}</span>}
                        {b.em && <span className="text-muted"> · desde {new Date(b.em).toLocaleDateString("pt-BR")}</span>}
                      </span>
                      <AdminButton disabled={!!busy} onClick={() => void act(b.uid, { acao: "desbloquear", uid: b.uid }, "Desbloqueado. A pessoa pode criar o perfil de novo.")}>
                        Desbloquear
                      </AdminButton>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
      <Footer dark={theme.dark} />
    </div>
  );
}

function AdminButton({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-1.5 font-semibold transition disabled:opacity-50 ${
        danger ? "border-rose-500/50 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" : "border-line hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
