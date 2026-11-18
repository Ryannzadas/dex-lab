import { useCallback, useEffect, useId, useRef, useState } from "react";
import { isBlankTeam, mergeSync, type SyncData, type SyncTeam } from "@/lib/sync-merge";
import type { TeamsApi } from "@/lib/team";
import { Avatar, ProfileDialog } from "./profile-dialog";
import { SignInDialog } from "./sign-in-dialog";

/** O que o botão de conta precisa saber do serviço de login (hoje, Firebase). */
export type CloudAuth = {
  ready: boolean;
  user: {
    uid: string;
    /** Nome para mostrar (cai no e-mail se não tiver nome). */
    name: string;
    /** Nome como está salvo na conta (pode ser vazio). */
    displayName: string;
    email: string | null;
    photo: string | null;
    googlePhoto: string | null;
    hasPassword: boolean;
    hasGoogle: boolean;
    createdAt: string | null;
    emailVerified: boolean;
  } | null;
  getToken: () => Promise<string | null>;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (changes: { name?: string; photo?: string | null }) => Promise<void>;
  sendVerification: () => Promise<void>;
  /** Busca a conta de novo (ex.: depois de confirmar o e-mail em outra aba). Devolve se o e-mail está confirmado. */
  reloadUser: () => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<void>;
  /** Confirma a identidade (senha, ou Google se a conta não tiver senha), roda `beforeDelete` e exclui a conta. */
  deleteAccount: (password: string | undefined, beforeDelete: () => Promise<void>) => Promise<void>;
  signOut: () => Promise<void>;
};

type Status = "sincronizando" | "ok" | "erro";

const STATUS_LABEL: Record<Status, string> = {
  sincronizando: "Sincronizando os times…",
  ok: "Times sincronizados",
  erro: "Não deu para sincronizar agora. O app tenta de novo sozinho.",
};

/** O que vai para a nuvem: os times (menos o "Time 1" vazio automático) e as exclusões. */
function payloadOf(api: TeamsApi): SyncData {
  return { teams: (api.teams as SyncTeam[]).filter((t) => !isBlankTeam(t)), deleted: api.deleted };
}
const sig = (d: SyncData) => JSON.stringify(d);

/**
 * Botão de conta na barra de cima + sincronização dos times entre aparelhos.
 * Sem login, nada muda: os times ficam só neste aparelho.
 */
export function CloudAccount({ api, auth }: { api: TeamsApi; auth: CloudAuth }) {
  const [status, setStatus] = useState<Status>("sincronizando");
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [editing, setEditing] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const menuId = useId();
  const boxRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef(api);
  const authRef = useRef(auth);
  useEffect(() => {
    apiRef.current = api;
    authRef.current = auth;
  });
  const lastSent = useRef("");
  const ready = useRef(false);
  const uid = auth.user?.uid ?? null;

  const call = useCallback(async (method: "GET" | "PUT" | "DELETE", body?: SyncData): Promise<SyncData> => {
    const token = await authRef.current.getToken();
    if (!token) throw new Error("sem login");
    const res = await fetch("/api/times", {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`times ${res.status}`);
    return (await res.json()) as SyncData;
  }, []);

  /** Junta o que veio da nuvem com o que está no aparelho agora e aplica, se mudou algo. */
  const absorb = useCallback((cloud: SyncData) => {
    const local = payloadOf(apiRef.current);
    const merged = mergeSync(local, cloud);
    lastSent.current = sig(cloud);
    if (sig(merged) !== sig(local)) apiRef.current.applySync(merged);
  }, []);

  // Ao entrar: manda os times deste aparelho, o servidor junta com os da nuvem e devolve tudo.
  useEffect(() => {
    if (!uid) {
      ready.current = false;
      return;
    }
    let alive = true;
    call("PUT", payloadOf(apiRef.current))
      .then((cloud) => {
        if (!alive) return;
        absorb(cloud);
        ready.current = true;
        setStatus("ok");
      })
      .catch(() => alive && setStatus("erro"));
    return () => {
      alive = false;
    };
  }, [uid, call, absorb]);

  // Cada mudança nos times sobe para a nuvem (com uma pequena espera para juntar edições seguidas).
  const current = sig(payloadOf(api));
  useEffect(() => {
    if (!uid || !ready.current || current === lastSent.current) return;
    const timer = window.setTimeout(() => {
      setStatus("sincronizando");
      call("PUT", JSON.parse(current) as SyncData)
        .then((cloud) => {
          absorb(cloud);
          setStatus("ok");
        })
        .catch(() => setStatus("erro"));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [current, uid, call, absorb]);

  // Ao voltar para o app (trocou de aba ou de aparelho), busca as novidades.
  useEffect(() => {
    if (!uid) return;
    const pull = () => {
      if (document.visibilityState !== "visible") return;
      // Confirmou o e-mail em outra aba? Atualiza a conta ao voltar.
      if (authRef.current.user && !authRef.current.user.emailVerified) void authRef.current.reloadUser().catch(() => {});
      if (!ready.current) return;
      call("GET")
        .then((cloud) => {
          absorb(cloud);
          setStatus("ok");
        })
        .catch(() => setStatus("erro"));
    };
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("focus", pull);
    return () => {
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener("focus", pull);
    };
  }, [uid, call, absorb]);

  // Fecha o menu ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    ready.current = false;
    await auth.signOut();
  };

  if (!auth.ready) return <span className="size-8 shrink-0 sm:size-9" aria-hidden="true" />;

  if (!auth.user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSigningIn(true)}
          title="Entrar para sincronizar os times entre aparelhos"
          aria-label="Entrar"
          aria-haspopup="dialog"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-line/60 hover:text-ink sm:text-sm"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Entrar</span>
        </button>
        {signingIn && <SignInDialog auth={auth} onClose={() => setSigningIn(false)} />}
      </>
    );
  }

  const { name, email } = auth.user;
  const dot = status === "erro" ? "bg-red-500" : status === "sincronizando" ? "animate-pulse bg-amber-400" : "bg-emerald-500";

  return (
    <span ref={boxRef} className="relative flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Sua conta (${name}). ${STATUS_LABEL[status]}${auth.user.emailVerified ? "" : " E-mail ainda não confirmado."}`}
        title={STATUS_LABEL[status]}
        className="relative grid size-8 place-items-center rounded-full sm:size-9"
      >
        <Avatar user={auth.user} size={28} />
        <span aria-hidden="true" className={`absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-surface-solid ${dot}`} />
        {!auth.user.emailVerified && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-amber-400 text-[9px] font-bold text-black">
            !
          </span>
        )}
      </button>

      {open && (
        <div id={menuId} className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-surface-solid p-2 text-sm shadow-xl">
          <div className="px-2 py-1.5">
            <p className="truncate font-semibold">{name}</p>
            {email && <p className="truncate text-xs text-muted">{email}</p>}
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted" role="status">
              <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
              {STATUS_LABEL[status]}
            </p>
          </div>
          {!auth.user.emailVerified && (
            <div className="mx-1 mt-1 rounded-xl bg-amber-400/15 px-2.5 py-2 text-xs">
              <p className="font-semibold">Confirme seu e-mail</p>
              <p className="mt-0.5 text-muted">{verifyMsg ?? "Mandamos um link para o seu e-mail. Olhe também o spam."}</p>
              <button
                type="button"
                onClick={() =>
                  void auth
                    .sendVerification()
                    .then(() => setVerifyMsg("Link reenviado. Depois de clicar nele, volte para cá."))
                    .catch(() => setVerifyMsg("Não deu para reenviar agora. Tente daqui a pouco."))
                }
                className="mt-1.5 font-semibold underline underline-offset-2"
              >
                Reenviar link
              </button>
            </div>
          )}
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
            className="block w-full rounded-xl px-2 py-2 text-left hover:bg-line/60"
          >
            Perfil e conta
          </button>
          <button type="button" onClick={() => void signOut()} className="block w-full rounded-xl px-2 py-2 text-left hover:bg-line/60">
            Sair
          </button>
        </div>
      )}

      {editing && (
        <ProfileDialog
          auth={auth}
          user={auth.user}
          teamIds={api.ids}
          teams={api.teams.filter((t) => t.members.length > 0).map((t) => ({ id: t.id, name: t.name, count: t.members.length }))}
          eraseCloudData={async () => {
            await call("DELETE");
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </span>
  );
}
