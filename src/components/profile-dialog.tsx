import { useEffect, useId, useMemo, useRef, useState } from "react";
import { messageFor } from "@/lib/auth-errors";
import { artworkUrl, getPokemonList, pokemonName, type PokemonRef } from "@/lib/pokeapi";
import type { CloudAuth } from "./cloud-account";


type User = NonNullable<CloudAuth["user"]>;
type PhotoTab = "pokemon" | "enviar";
type Feedback = { kind: "ok" | "erro"; text: string } | null;

/** Pokémon sugeridos quando a busca está vazia (depois dos do time). */
const POPULAR = [25, 6, 150, 448, 658, 94, 133, 445, 384, 1, 4, 7, 249, 197, 282, 773, 887, 1007];

const input =
  "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-muted/70 focus:border-ink sm:text-sm";
const primary = "shrink-0 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-50";
const secondary = "shrink-0 rounded-full border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-ink disabled:opacity-50";

/** Recorta a imagem no centro e reduz para 256×256 (WebP, ou JPEG se o navegador não fizer WebP). */
async function squareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await toBlob("image/jpeg");
  if (!blob) throw new Error("imagem");
  return blob;
}

const isUploaded = (url: string | null) => !!url && url.includes("/api/avatar?");

export function Avatar({ user, size }: { user: Pick<User, "name" | "photo">; size: number }) {
  const [broken, setBroken] = useState<string | null>(null);
  const pokemon = user.photo?.includes("PokeAPI/sprites");
  if (user.photo && broken !== user.photo) {
    return (
      <img
        src={user.photo}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(user.photo)}
        style={{ width: size, height: size, padding: pokemon ? Math.round(size * 0.08) : 0 }}
        className={`shrink-0 rounded-full object-cover ${pokemon ? "bg-line/70" : ""}`}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="grid shrink-0 place-items-center rounded-full bg-ink font-display font-bold text-bg"
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className="border-t border-line py-5">
      <h3 className={`mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase ${danger ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return feedback.kind === "erro" ? (
    <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {feedback.text}
    </p>
  ) : (
    <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
      {feedback.text}
    </p>
  );
}

/** Janela de perfil: nome, foto, senha e exclusão da conta. */
export function ProfileDialog({
  auth,
  user,
  teamIds,
  teams,
  eraseCloudData,
  onClose,
}: {
  auth: CloudAuth;
  user: User;
  teamIds: number[];
  /** Times deste aparelho que podem ir para o perfil público. */
  teams: { id: string; name: string; count: number }[];
  /** Apaga os times da nuvem (sem sair da conta). */
  eraseCloudData: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.displayName);
  const [nameMsg, setNameMsg] = useState<Feedback>(null);
  const [photoTab, setPhotoTab] = useState<PhotoTab>("pokemon");
  const [photoMsg, setPhotoMsg] = useState<Feedback>(null);
  const [query, setQuery] = useState("");
  const [shiny, setShiny] = useState(false);
  const [list, setList] = useState<PokemonRef[]>([]);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<Feedback>(null);
  const [dangerMsg, setDangerMsg] = useState<Feedback>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    getPokemonList()
      .then(setList)
      .catch(() => {});
  }, []);

  const choices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const byNumber = /^\d+$/.test(q) ? Number(q) : null;
      return list
        .filter((p) => (byNumber ? p.id === byNumber : pokemonName(p.name).toLowerCase().includes(q)))
        .slice(0, 24)
        .map((p) => ({ id: p.id, label: pokemonName(p.name) }));
    }
    const ids = [...new Set([...teamIds, ...POPULAR])].slice(0, 24);
    const names = new Map(list.map((p) => [p.id, p.name]));
    return ids.map((id) => ({ id, label: names.has(id) ? pokemonName(names.get(id)!) : `#${id}` }));
  }, [query, list, teamIds]);

  const run = async (key: string, task: () => Promise<void>, setMsg: (f: Feedback) => void) => {
    setBusy(key);
    setMsg(null);
    try {
      await task();
    } catch (e) {
      const code = (e as { code?: string }).code;
      const text = (e as Error).message.startsWith("app:")
        ? (e as Error).message.slice(4)
        : code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "Senha incorreta."
          : messageFor(e);
      setMsg({ kind: "erro", text });
    } finally {
      setBusy(null);
    }
  };

  const apiCall = async <T,>(path: string, method: "GET" | "PUT" | "DELETE", body?: Blob | string): Promise<T> => {
    const token = await auth.getToken();
    if (!token) throw new Error("app:Entre de novo para continuar.");
    const type = typeof body === "string" ? "application/json" : body?.type;
    const res = await fetch(path, { method, headers: { authorization: `Bearer ${token}`, ...(type ? { "content-type": type } : {}) }, body });
    const data = (await res.json().catch(() => null)) as (T & { erro?: string }) | null;
    if (!res.ok) throw new Error(`app:${data?.erro ?? "Não deu para salvar agora. Tente de novo."}`);
    return data as T;
  };
  const avatarApi = (method: "PUT" | "DELETE", body?: Blob) => apiCall<{ url?: string }>("/api/avatar", method, body);

  /** Troca a foto; se a antiga era uma enviada pela pessoa, apaga do servidor. */
  const setPhoto = (photo: string | null, done: string) =>
    run(
      "foto",
      async () => {
        const old = user.photo;
        await auth.updateProfile({ photo });
        if (isUploaded(old) && !isUploaded(photo)) void avatarApi("DELETE").catch(() => {});
        setPhotoMsg({ kind: "ok", text: done });
      },
      setPhotoMsg,
    );

  const upload = (file: File | undefined) => {
    if (!file) return;
    void run(
      "foto",
      async () => {
        if (!file.type.startsWith("image/")) throw new Error("app:Escolha um arquivo de imagem.");
        let blob: Blob;
        try {
          blob = await squareImage(file);
        } catch {
          throw new Error("app:Não deu para abrir essa imagem. Tente outra (JPG, PNG ou WebP).");
        }
        const { url } = await avatarApi("PUT", blob);
        if (!url) throw new Error("app:Não deu para salvar a foto.");
        await auth.updateProfile({ photo: url });
        setPhotoMsg({ kind: "ok", text: "Foto atualizada." });
      },
      setPhotoMsg,
    );
  };

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      "nome",
      async () => {
        await auth.updateProfile({ name: name.trim().slice(0, 40) });
        setNameMsg({ kind: "ok", text: "Nome salvo." });
      },
      setNameMsg,
    );
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      "senha",
      async () => {
        await auth.changePassword(currentPw, newPw);
        setCurrentPw("");
        setNewPw("");
        setPwMsg({ kind: "ok", text: "Senha trocada." });
      },
      setPwMsg,
    );
  };

  const eraseCloud = () => {
    if (!window.confirm("Apagar os seus times da nuvem? Eles continuam neste aparelho, mas somem dos outros.")) return;
    // Sai da conta logo depois; senão a sincronização mandaria os times deste aparelho de volta.
    void run(
      "nuvem",
      async () => {
        await eraseCloudData();
        await auth.signOut();
      },
      setDangerMsg,
    );
  };

  const deleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    void run(
      "excluir",
      () =>
        auth.deleteAccount(user.hasPassword ? deletePw : undefined, async () => {
          await eraseCloudData();
          await avatarApi("DELETE").catch(() => {});
          await apiCall("/api/perfil", "DELETE").catch(() => {});
        }),
      setDangerMsg,
    );
  };

  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : null;
  const ways = [user.hasGoogle && "Google", user.hasPassword && "e-mail e senha"].filter(Boolean).join(" e ");

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border border-line bg-surface-solid p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[min(92dvh,52rem)] overflow-y-auto overscroll-contain px-5 pt-5 [scrollbar-width:thin] sm:px-6 sm:pt-6">
        <div className="flex items-start gap-4 pb-5">
          <Avatar user={user} size={64} />
          <div className="min-w-0 flex-1 pt-1">
            <h2 id={titleId} className="truncate font-display text-xl font-bold">
              {user.name}
            </h2>
            {user.email && <p className="truncate text-sm text-muted">{user.email}</p>}
            <p className="mt-1 text-xs text-muted">
              {ways && <>Entra com {ways}</>}
              {ways && since && " · "}
              {since && <>desde {since}</>}
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

        <Section title="Nome">
          <form onSubmit={saveName} className="flex gap-2">
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
              aria-label="Seu nome"
              placeholder="Como quer ser chamado"
            />
            <button type="submit" disabled={busy !== null || name.trim() === user.displayName} className={primary}>
              {busy === "nome" ? "Salvando…" : "Salvar"}
            </button>
          </form>
          <Message feedback={nameMsg} />
        </Section>

        <Section title="Foto">
          <div role="tablist" aria-label="Tipo de foto" className="mb-3 inline-flex rounded-full border border-line p-1 text-sm">
            {(
              [
                ["pokemon", "Um Pokémon"],
                ["enviar", "Minha foto"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={photoTab === id}
                onClick={() => setPhotoTab(id)}
                className={`rounded-full px-3.5 py-1.5 font-medium transition ${photoTab === id ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {photoTab === "pokemon" ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  className={input}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome ou número"
                  aria-label="Buscar Pokémon"
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm text-muted">
                  <input type="checkbox" checked={shiny} onChange={(e) => setShiny(e.target.checked)} className="size-4 accent-current" />
                  Shiny
                </label>
              </div>
              {!query && teamIds.length > 0 && <p className="mt-2 text-xs text-muted">Primeiro os do seu time, depois alguns populares.</p>}
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {choices.map((p) => {
                  const url = artworkUrl(p.id, shiny);
                  const selected = user.photo === url;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void setPhoto(url, `Agora sua foto é ${p.label}.`)}
                      title={p.label}
                      aria-label={`Usar ${p.label}${shiny ? " shiny" : ""} como foto`}
                      aria-pressed={selected}
                      className={`aspect-square rounded-2xl border p-1.5 transition hover:border-ink disabled:opacity-60 ${selected ? "border-ink bg-line/70" : "border-line bg-bg"}`}
                    >
                      <img src={url} alt="" loading="lazy" width={64} height={64} className="size-full object-contain" />
                    </button>
                  );
                })}
                {query && choices.length === 0 && <p className="col-span-full py-3 text-sm text-muted">Nenhum Pokémon com esse nome.</p>}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
              <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className={primary}>
                {busy === "foto" ? "Enviando…" : "Escolher imagem"}
              </button>
              {user.googlePhoto && user.photo !== user.googlePhoto && (
                <button type="button" disabled={busy !== null} onClick={() => void setPhoto(user.googlePhoto, "Voltou a foto do Google.")} className={secondary}>
                  Usar a do Google
                </button>
              )}
              <p className="w-full text-xs text-muted">A imagem é cortada no centro em formato quadrado.</p>
            </div>
          )}

          {user.photo && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void setPhoto(null, "Foto removida.")}
              className="mt-3 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Remover foto
            </button>
          )}
          <Message feedback={photoMsg} />
        </Section>

        <Section title="Senha">
          {user.hasPassword ? (
            <form onSubmit={savePassword} className="grid gap-2">
              {/* Campo escondido para o gerenciador de senhas saber de qual conta é a senha. */}
              <input type="email" value={user.email ?? ""} autoComplete="username" readOnly hidden />
              <input
                className={input}
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                aria-label="Senha atual"
                placeholder="Senha atual"
              />
              <div className="flex gap-2">
                <input
                  className={input}
                  type="password"
                  required
                  minLength={6}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  aria-label="Nova senha"
                  placeholder="Nova senha (6+ caracteres)"
                />
                <button type="submit" disabled={busy !== null} className={primary}>
                  {busy === "senha" ? "Trocando…" : "Trocar"}
                </button>
              </div>
              <Message feedback={pwMsg} />
            </form>
          ) : (
            <p className="text-sm text-muted">Você entra com o Google, então a senha é a da sua conta Google.</p>
          )}
        </Section>

        <PublicProfileSection user={user} teams={teams} apiCall={apiCall} auth={auth} />

        <Section title="Dados e conta" danger>
          <div className="grid gap-2 text-sm">
            <button
              type="button"
              disabled={busy !== null}
              onClick={eraseCloud}
              className="rounded-xl px-3 py-2.5 text-left transition hover:bg-line/60 disabled:opacity-50"
            >
              <span className="font-semibold">Apagar meus times da nuvem</span>
              <span className="block text-xs text-muted">Continuam neste aparelho, mas somem dos outros. Você sai da conta.</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl px-3 py-2.5 text-left text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
              >
                <span className="font-semibold">Excluir minha conta</span>
                <span className="block text-xs opacity-80">Apaga a conta, a foto, o perfil público e os times da nuvem. Não dá para desfazer.</span>
              </button>
            ) : (
              <form onSubmit={deleteAccount} className="grid gap-2 rounded-2xl border border-red-500/40 bg-red-500/5 p-3">
                <p className="text-sm">
                  Tem certeza? A conta, a foto e os times da nuvem somem para sempre. Os times continuam só neste aparelho.
                  {!user.hasPassword && " O Google vai pedir para você confirmar quem é."}
                </p>
                {user.hasPassword && (
                  <>
                    <input type="email" value={user.email ?? ""} autoComplete="username" readOnly hidden />
                    <input
                      className={input}
                      type="password"
                      required
                      value={deletePw}
                      onChange={(e) => setDeletePw(e.target.value)}
                      autoComplete="current-password"
                      aria-label="Sua senha, para confirmar"
                      placeholder="Sua senha, para confirmar"
                    />
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={busy !== null} className="rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                    {busy === "excluir" ? "Excluindo…" : "Excluir para sempre"}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className={secondary}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
            <Message feedback={dangerMsg} />
          </div>
        </Section>
      </div>
    </dialog>
  );
}

type OwnProfile = { handle: string; name: string; photo: string | null; bio: string; teams: string[]; since: number };
type ApiCall = <T>(path: string, method: "GET" | "PUT" | "DELETE", body?: Blob | string) => Promise<T>;

/** "João Ryan" → "joao-ryan" (sugestão de nome para o link). */
function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

const publicName = (user: User) => user.displayName.trim().slice(0, 40) || "Treinador";
const publicPhoto = (user: User) => (user.photo?.startsWith("https://") ? user.photo : null);

function PublicProfileSection({
  user,
  teams,
  apiCall,
  auth,
}: {
  user: User;
  teams: { id: string; name: string; count: number }[];
  apiCall: ApiCall;
  auth: CloudAuth;
}) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Feedback>(null);
  const handleId = useId();
  const bioId = useId();
  const verified = user.emailVerified;
  const suggestion = slug(user.displayName || user.email?.split("@")[0] || "");
  const apiRef = useRef(apiCall);
  useEffect(() => {
    apiRef.current = apiCall;
  });

  // Carrega ao abrir (e de novo se o e-mail for confirmado com a janela aberta).
  useEffect(() => {
    if (!verified) return;
    let alive = true;
    apiRef
      .current<OwnProfile | null>("/api/perfil", "GET")
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setHandle(p?.handle ?? suggestion);
        setBio(p?.bio ?? "");
        setChosen(p?.teams ?? []);
        setLoaded(true);
      })
      .catch(() => alive && setMsg({ kind: "erro", text: "Não deu para carregar o perfil público agora." }));
    return () => {
      alive = false;
    };
  }, [verified, suggestion]);

  // Mudou nome ou foto da conta: o perfil público acompanha.
  const name = publicName(user);
  const photo = publicPhoto(user);
  useEffect(() => {
    if (!profile || (profile.name === name && profile.photo === photo)) return;
    apiRef
      .current<OwnProfile>("/api/perfil", "PUT", JSON.stringify({ ...profile, name, photo }))
      .then(setProfile)
      .catch(() => {});
  }, [profile, name, photo]);

  if (!verified) {
    const act = (task: () => Promise<void>) => {
      setBusy(true);
      setMsg(null);
      task().finally(() => setBusy(false));
    };
    return (
      <Section title="Perfil público">
        <p className="text-sm text-muted">
          Confirme seu e-mail para criar um perfil público com os seus times. O link de confirmação foi para {user.email}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(() =>
                auth
                  .sendVerification()
                  .then(() => setMsg({ kind: "ok", text: "Link reenviado. Olhe também o spam." }))
                  .catch(() => setMsg({ kind: "erro", text: "Não deu para reenviar agora. Tente daqui a pouco." })),
              )
            }
            className={secondary}
          >
            Reenviar link
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(() =>
                auth
                  .reloadUser()
                  .then((ok) => {
                    if (!ok) setMsg({ kind: "erro", text: "Ainda não aparece como confirmado. Clique no link do e-mail e tente de novo." });
                  })
                  .catch(() => setMsg({ kind: "erro", text: "Não deu para verificar agora." })),
              )
            }
            className={secondary}
          >
            Já confirmei
          </button>
        </div>
        <Message feedback={msg} />
      </Section>
    );
  }

  const url = profile ? `${window.location.origin}/u/${profile.handle}` : null;
  const dirty = !profile || profile.handle !== handle || profile.bio !== bio.trim() || profile.teams.join() !== chosen.join();
  const fail = (e: Error) => setMsg({ kind: "erro", text: e.message.replace(/^app:/, "") });

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    apiCall<OwnProfile>("/api/perfil", "PUT", JSON.stringify({ handle, bio, teams: chosen, name, photo }))
      .then((p) => {
        setMsg({ kind: "ok", text: profile ? "Perfil atualizado." : "Perfil no ar! Copie o link para mandar." });
        setProfile(p);
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const unpublish = () => {
    if (!window.confirm("Tirar o perfil do ar? O link para de funcionar e o nome fica livre para outra pessoa.")) return;
    setBusy(true);
    apiCall("/api/perfil", "DELETE")
      .then(() => {
        setProfile(null);
        setMsg({ kind: "ok", text: "Perfil tirado do ar." });
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };

  const copy = () => {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => setMsg({ kind: "ok", text: "Link copiado." }))
      .catch(() => setMsg({ kind: "ok", text: url }));
  };

  return (
    <Section title="Perfil público">
      {!loaded ? (
        !msg && <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <form onSubmit={publish} className="grid gap-3">
          <p className="text-sm text-muted">
            Uma página com seu nome, sua foto e os times que você escolher, para mandar para os amigos. Seu e-mail não aparece.
          </p>
          <div className="grid gap-1 text-sm font-medium">
            <label htmlFor={handleId}>Link</label>
            <div className="flex items-center rounded-xl border border-line bg-bg text-base transition focus-within:border-ink sm:text-sm">
              <span className="shrink-0 pl-3 text-muted select-none">/u/</span>
              <input
                id={handleId}
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20))}
                required
                minLength={3}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="seu-nome"
                className="w-full bg-transparent py-2.5 pr-3 pl-0.5 outline-none"
              />
            </div>
          </div>
          <div className="grid gap-1 text-sm font-medium">
            <label htmlFor={bioId}>
              Sobre você <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id={bioId}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              rows={2}
              placeholder="Ex.: fã de tipo Dragão, jogando Scarlet"
              className={`${input} resize-none`}
            />
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Times que aparecem</legend>
            {teams.length === 0 && <p className="text-sm text-muted">Monte um time primeiro.</p>}
            {teams.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm transition hover:border-ink">
                <input
                  type="checkbox"
                  checked={chosen.includes(t.id)}
                  onChange={(e) => setChosen((c) => (e.target.checked ? [...c, t.id] : c.filter((id) => id !== t.id)))}
                  className="size-4 accent-current"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                <span className="shrink-0 text-xs text-muted">{t.count} Pokémon</span>
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy || !dirty} className={primary}>
              {busy ? "Salvando…" : profile ? "Salvar" : "Publicar perfil"}
            </button>
            {url && (
              <>
                <button type="button" onClick={copy} className={secondary}>
                  Copiar link
                </button>
                <a href={url} target="_blank" rel="noopener" className={secondary}>
                  Ver perfil
                </a>
              </>
            )}
          </div>
          {profile && (
            <button
              type="button"
              disabled={busy}
              onClick={unpublish}
              className="justify-self-start text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Tirar do ar
            </button>
          )}
        </form>
      )}
      <Message feedback={msg} />
    </Section>
  );
}
