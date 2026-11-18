import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useCloudSession, type CloudSession } from "./cloud-session";

/**
 * Quem eu sigo (por @), compartilhado entre a vitrine e o perfil público.
 * Carrega uma vez por conta; seguir/deixar de seguir atualiza na hora.
 */

let handles = new Set<string>();
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function load(session: CloudSession) {
  if (!session || loadedFor === session.uid) return;
  loadedFor = session.uid;
  try {
    const res = await fetch("/api/seguir", { headers: { authorization: `Bearer ${await session.getToken()}` } });
    if (!res.ok) throw new Error();
    handles = new Set(((await res.json()) as { handles: string[] }).handles);
    emit();
  } catch {
    loadedFor = null;
  }
}

export function useFollowing() {
  const session = useCloudSession();
  const set = useSyncExternalStore(subscribe, () => handles);

  useEffect(() => {
    if (session) void load(session);
    else if (loadedFor) {
      loadedFor = null;
      handles = new Set();
      emit();
    }
  }, [session]);

  /** Segue ou deixa de seguir. Devolve o novo número de seguidores do perfil. */
  const toggle = useCallback(
    async (handle: string): Promise<{ seguindo: boolean; seguidores: number }> => {
      if (!session) throw new Error("Entre na sua conta (botão no canto de cima) para seguir.");
      const res = await fetch("/api/seguir", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await session.getToken()}` },
        body: JSON.stringify({ handle }),
      });
      const data = (await res.json().catch(() => ({}))) as { seguindo?: boolean; seguidores?: number; erro?: string };
      if (!res.ok) throw new Error(data.erro ?? "Não deu agora. Tente de novo.");
      handles = new Set(handles);
      if (data.seguindo) handles.add(handle);
      else handles.delete(handle);
      emit();
      return { seguindo: !!data.seguindo, seguidores: data.seguidores ?? 0 };
    },
    [session],
  );

  return { following: set, signedIn: !!session, toggle };
}
