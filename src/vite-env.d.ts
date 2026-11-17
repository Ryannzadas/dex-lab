/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Configuração pública do app Web no Firebase (login com Google). Sem ela, o app funciona sem login. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
