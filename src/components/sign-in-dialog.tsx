import { useEffect, useId, useRef, useState } from "react";
import { messageFor } from "@/lib/auth-errors";
import type { CloudAuth } from "./cloud-account";

type Mode = "entrar" | "criar" | "esqueci";

const TITLE: Record<Mode, string> = {
  entrar: "Entrar no Dex Lab",
  criar: "Criar conta",
  esqueci: "Recuperar senha",
};

const input =
  "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-muted/70 focus:border-ink sm:text-sm";

/** Janela de login: Google ou e-mail e senha, com criar conta e recuperar senha. */
export function SignInDialog({ auth, onClose }: { auth: CloudAuth; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const go = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim();
    if (mode === "esqueci") {
      void run(async () => {
        await auth.resetPassword(mail);
        setNotice(`Se existir uma conta com ${mail}, chega um e-mail com o link para criar uma senha nova. Olhe também o spam.`);
      });
    } else if (mode === "criar") {
      void run(() => auth.signUpEmail(name.trim(), mail, password));
    } else {
      void run(() => auth.signInEmail(mail, password));
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-line bg-surface-solid p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {TITLE[mode]}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "esqueci" ? "A gente manda um link para o seu e-mail." : "Seus times ficam salvos e aparecem em todos os seus aparelhos."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Fechar"
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {mode !== "esqueci" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(auth.signInGoogle)}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-bg px-4 py-2.5 text-sm font-semibold transition hover:border-ink disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continuar com Google
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              ou com e-mail
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        <form onSubmit={submit} className={`grid gap-3 ${mode === "esqueci" ? "mt-5" : ""}`}>
          {mode === "criar" && (
            <label className="grid gap-1 text-sm font-medium">
              <span>
                Nome <span className="font-normal text-muted">(opcional)</span>
              </span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Como quer ser chamado" />
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium">
            E-mail
            <input
              className={input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="voce@exemplo.com"
            />
          </label>
          {mode !== "esqueci" && (
            <div className="grid gap-1 text-sm font-medium">
              <span className="flex items-center justify-between">
                <label htmlFor={passwordId}>Senha</label>
                {mode === "entrar" && (
                  <button type="button" onClick={() => go("esqueci")} className="text-xs font-normal text-muted underline-offset-2 hover:text-ink hover:underline">
                    Esqueci minha senha
                  </button>
                )}
              </span>
              <input
                id={passwordId}
                className={input}
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "criar" ? "new-password" : "current-password"}
                placeholder={mode === "criar" ? "Pelo menos 6 caracteres" : ""}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Aguarde…" : mode === "criar" ? "Criar conta" : mode === "esqueci" ? "Enviar link" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "entrar" ? (
            <>
              Ainda não tem conta?{" "}
              <button type="button" onClick={() => go("criar")} className="font-semibold text-ink underline-offset-2 hover:underline">
                Criar conta
              </button>
            </>
          ) : (
            <button type="button" onClick={() => go("entrar")} className="font-semibold text-ink underline-offset-2 hover:underline">
              Voltar para entrar
            </button>
          )}
        </p>
      </div>
    </dialog>
  );
}
