/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Chave pública do Clerk (criada pela integração da Vercel). Sem ela, o app funciona sem login. */
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
