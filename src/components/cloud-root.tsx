import { initializeApp } from "@firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "@firebase/auth";
import { useEffect, useState } from "react";
import type { TeamsApi } from "@/lib/team";
import { CloudAccount, type CloudAuth } from "./cloud-account";

/**
 * Login pelo Firebase (Google ou e-mail e senha), carregado à parte depois que o app abre.
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

async function signUpWithEmail(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  // Link de confirmação; depois de confirmar, o Firebase oferece voltar para o app.
  await sendEmailVerification(user, { url: window.location.origin }).catch(() => {});
  if (name) {
    await updateProfile(user, { displayName: name });
    // O onAuthStateChanged já disparou sem o nome; recarrega para o menu mostrar o nome.
    await user.reload();
  }
}

export default function CloudRoot({ api }: { api: TeamsApi }) {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: false, user: null });

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, (user) => setState({ ready: true, user }));
  }, []);

  const { user } = state;
  // O objeto do usuário é o mesmo depois de mudar nome/foto; um estado novo força a tela a atualizar.
  const refresh = () => setState({ ready: true, user: auth.currentUser });

  /** Confirma que é a própria pessoa antes de mexer em senha ou excluir a conta. */
  const reauth = async (password?: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error("sem login");
    if (current.providerData.some((p) => p.providerId === "password") && password !== undefined) {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email ?? "", password));
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await reauthenticateWithPopup(current, provider);
    }
  };

  const cloud: CloudAuth = {
    ready: state.ready,
    user: user
      ? {
          uid: user.uid,
          name: user.displayName || user.email || "Sua conta",
          displayName: user.displayName ?? "",
          email: user.email,
          photo: user.photoURL,
          googlePhoto: user.providerData.find((p) => p.providerId === "google.com")?.photoURL ?? null,
          hasPassword: user.providerData.some((p) => p.providerId === "password"),
          hasGoogle: user.providerData.some((p) => p.providerId === "google.com"),
          createdAt: user.metadata.creationTime ?? null,
          emailVerified: user.emailVerified,
        }
      : null,
    getToken: async () => (auth.currentUser ? auth.currentUser.getIdToken() : null),
    signInGoogle: signInWithGoogle,
    signInEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpEmail: async (name, email, password) => {
      await signUpWithEmail(name, email, password);
      refresh();
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
    updateProfile: async (changes) => {
      if (!auth.currentUser) return;
      await updateProfile(auth.currentUser, {
        ...(changes.name !== undefined ? { displayName: changes.name || null } : {}),
        ...(changes.photo !== undefined ? { photoURL: changes.photo } : {}),
      });
      refresh();
    },
    sendVerification: async () => {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser, { url: window.location.origin });
    },
    reloadUser: async () => {
      const current = auth.currentUser;
      if (!current) return false;
      await current.reload();
      // Token novo, para o servidor também saber que o e-mail foi confirmado.
      if (current.emailVerified) await current.getIdToken(true);
      refresh();
      return current.emailVerified;
    },
    changePassword: async (current, next) => {
      await reauth(current);
      if (auth.currentUser) await updatePassword(auth.currentUser, next);
    },
    deleteAccount: async (password, beforeDelete) => {
      await reauth(password);
      await beforeDelete();
      if (auth.currentUser) await deleteUser(auth.currentUser);
    },
  };

  return <CloudAccount api={api} auth={cloud} />;
}
