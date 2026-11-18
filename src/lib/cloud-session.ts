import { useSyncExternalStore } from "react";

/**
 * Quem está logado, para partes do app fora do botão de conta (ex.: curtir na vitrine).
 * O login (Firebase) carrega à parte e avisa aqui quando a conta muda.
 */
export type CloudSession = { uid: string; getToken: () => Promise<string | null> } | null;

let current: CloudSession = null;
const listeners = new Set<() => void>();

export function setCloudSession(session: CloudSession) {
  if (session?.uid === current?.uid) return;
  current = session;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCloudSession(): CloudSession {
  return useSyncExternalStore(subscribe, () => current);
}
