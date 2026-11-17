import { initializeApp } from "@firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "@firebase/auth";
import { useEffect, useState } from "react";
import type { TeamsApi } from "@/lib/team";
import { CloudAccount, type CloudAuth } from "./cloud-account";

/**
 * Login com Google pelo Firebase, carregado à parte depois que o app abre.
 * Só o Firebase Auth é usado; os times ficam no servidor do próprio app (/api/times).
 */
const env = import.meta.env;
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
// Tela de login do Google no idioma do aparelho.
auth.languageCode = navigator.language;

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Fechou a janela: não é erro.
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    // Navegador bloqueou a janela (ou não permite janelas): entra pela página inteira.
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export default function CloudRoot({ api }: { api: TeamsApi }) {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: false, user: null });

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, (user) => setState({ ready: true, user }));
  }, []);

  const { user } = state;
  const cloud: CloudAuth = {
    ready: state.ready,
    user: user
      ? { uid: user.uid, name: user.displayName || user.email || "Sua conta", email: user.email, photo: user.photoURL }
      : null,
    getToken: async () => (auth.currentUser ? auth.currentUser.getIdToken() : null),
    signIn: signInWithGoogle,
    signOut: () => signOut(auth),
  };

  return <CloudAccount api={api} auth={cloud} />;
}
