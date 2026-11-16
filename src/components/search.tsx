import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buildEntries } from "@/lib/dex";
import type { Availability } from "@/lib/games";
import { artworkUrl, getPokemonList, pokemonName, spriteUrl, type PokemonRef } from "@/lib/pokeapi";

type Props = {
  onPick: (id: number) => void;
  disabled?: boolean;
  exclude?: number[];
  placeholder?: string;
  label: string;
  /** Regras do jogo do time: "blocked" não deixa escolher; "warn" só avisa. */
  check?: (speciesId: number, name: string) => Availability;
};

const MAX_RESULTS = 10;

/** Busca por nome ou número, com navegação por teclado (padrão combobox). */
export function PokemonSearch({ onPick, disabled, exclude = [], placeholder, label, check }: Props) {
  const [list, setList] = useState<PokemonRef[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();

  useEffect(() => {
    getPokemonList()
      .then(setList)
      .catch(() => setError(true));
  }, []);

  // Número da espécie de cada forma (ex.: Vulpix de Alola → 37), para checar o jogo.
  const speciesOf = useMemo(() => new Map((list ? buildEntries(list) : []).map((e) => [e.id, e.dexNumber])), [list]);
  const statusOf = (p: PokemonRef): Availability => (check ? check(speciesOf.get(p.id) ?? p.id, p.name) : "ok");

  const results = useMemo(() => {
    if (!list || !query.trim()) return [];
    const q = query.trim().toLowerCase().replace(/^#/, "");
    const asNumber = Number(q);
    if (Number.isInteger(asNumber) && asNumber > 0) {
      return list.filter((p) => p.id === asNumber && !exclude.includes(p.id));
    }
    // Todas as palavras precisam aparecer: "vulpix alola", "alola" ou "mega charizard".
    const words = q.split(/[\s-]+/).filter(Boolean);
    const first = words[0] ?? "";
    return list
      .filter((p) => !exclude.includes(p.id))
      .filter((p) => words.every((w) => p.name.includes(w)))
      .sort((a, b) => {
        const sa = a.name.startsWith(first);
        const sb = b.name.startsWith(first);
        if (sa !== sb) return sa ? -1 : 1;
        // Quem começa com a busca: ordem alfabética, que já deixa "vulpix" antes de "vulpix-alola".
        if (sa) return a.name.localeCompare(b.name);
        return a.id - b.id;
      })
      .slice(0, MAX_RESULTS);
  }, [list, query, exclude]);

  const pick = (p: PokemonRef) => {
    if (statusOf(p) === "blocked") return;
    onPick(p.id);
    setQuery("");
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0;

  return (
    <div className="relative">
      <label id={labelId} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-solid px-4 py-3 transition-colors focus-within:border-ink">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          disabled={disabled || error}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={error ? "Não deu pra carregar a lista. Recarregue a página." : (placeholder ?? "Buscar por nome ou número…")}
          className="w-full bg-transparent text-base outline-none placeholder:text-muted disabled:cursor-not-allowed"
          autoComplete="off"
          spellCheck={false}
        />
        {!list && !error && (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" aria-label="Carregando lista" />
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface-solid p-1.5 shadow-xl"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              aria-disabled={statusOf(p) === "blocked"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(p)}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${i === active ? "bg-line/70" : ""} ${
                statusOf(p) === "blocked" ? "cursor-not-allowed opacity-45" : "cursor-pointer"
              }`}
            >
              <img
                src={spriteUrl(p.id)}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                // Algumas formas não têm sprite pequeno: usa a arte oficial.
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = artworkUrl(p.id);
                    img.style.imageRendering = "auto";
                  }
                }}
                className="size-10 object-contain [image-rendering:pixelated]"
              />
              <span className="font-medium">{pokemonName(p.name)}</span>
              {statusOf(p) === "blocked" && <span className="text-xs text-muted">não está neste jogo</span>}
              {statusOf(p) === "warn" && (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-200">pode não existir no hack</span>
              )}
              <span className="ml-auto font-mono text-xs text-muted">
                {/* Formas têm id interno (acima de 10000) que não é número da Pokédex. */}
                {p.id > 10000 ? "forma" : `#${String(p.id).padStart(4, "0")}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
