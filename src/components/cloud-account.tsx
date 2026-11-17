import { SignInButton, UserButton, useAuth, useClerk } from "@clerk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { isBlankTeam, mergeSync, type SyncData, type SyncTeam } from "@/lib/sync-merge";
import type { TeamsApi } from "@/lib/team";

type Status = "fora" | "sincronizando" | "ok" | "erro";

const STATUS_LABEL: Record<Status, string> = {
  fora: "",
  sincronizando: "Sincronizando os times…",
  ok: "Times sincronizados com a sua conta",
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
export function CloudAccount({ api }: { api: TeamsApi }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [status, setStatus] = useState<Exclude<Status, "fora">>("sincronizando");
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });
  const lastSent = useRef("");
  const ready = useRef(false);

  const call = useCallback(
    async (method: "GET" | "PUT" | "DELETE", body?: SyncData): Promise<SyncData> => {
      const token = await getToken();
      const res = await fetch("/api/times", {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`times ${res.status}`);
      return (await res.json()) as SyncData;
    },
    [getToken],
  );

  /** Junta o que veio da nuvem com o que está no aparelho agora e aplica, se mudou algo. */
  const absorb = useCallback((cloud: SyncData) => {
    const local = payloadOf(apiRef.current);
    const merged = mergeSync(local, cloud);
    lastSent.current = sig(cloud);
    if (sig(merged) !== sig(local)) apiRef.current.applySync(merged);
  }, []);

  // Ao entrar: manda os times deste aparelho, o servidor junta com os da nuvem e devolve tudo.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
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
  }, [isLoaded, isSignedIn, call, absorb]);

  // Cada mudança nos times sobe para a nuvem (com uma pequena espera para juntar edições seguidas).
  const current = sig(payloadOf(api));
  useEffect(() => {
    if (!isSignedIn || !ready.current || current === lastSent.current) return;
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
  }, [current, isSignedIn, call, absorb]);

  // Ao voltar para o app (trocou de aba ou de aparelho), busca as novidades.
  useEffect(() => {
    if (!isSignedIn) return;
    const pull = () => {
      if (document.visibilityState !== "visible" || !ready.current) return;
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
  }, [isSignedIn, call, absorb]);

  const eraseCloud = async () => {
    if (!window.confirm("Apagar os seus times da nuvem? Eles continuam neste aparelho, mas somem dos outros.")) return;
    try {
      await call("DELETE");
      ready.current = false;
      await signOut();
    } catch {
      setStatus("erro");
    }
  };

  if (!isLoaded) return <span className="grid size-8 place-items-center sm:size-9" aria-hidden="true" />;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          title="Entrar para sincronizar os times entre aparelhos"
          aria-label="Entrar com sua conta"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-line/60 hover:text-ink sm:text-sm"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Entrar</span>
        </button>
      </SignInButton>
    );
  }

  return (
    <span className="relative flex shrink-0 items-center px-1" title={STATUS_LABEL[status]}>
      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Action
            label="Apagar meus dados da nuvem"
            labelIcon={
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            onClick={() => void eraseCloud()}
          />
        </UserButton.MenuItems>
      </UserButton>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-0.5 bottom-0 size-2.5 rounded-full border-2 border-surface-solid ${
          status === "erro" ? "bg-red-500" : status === "sincronizando" ? "animate-pulse bg-amber-400" : "bg-emerald-500"
        }`}
      />
      <span className="sr-only" role="status">
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}
