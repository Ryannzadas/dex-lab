import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TYPE_INFO, type TypeName } from "@/lib/types";

export function TypeBadge({ type, size = "md" }: { type: TypeName; size?: "sm" | "md" }) {
  const info = TYPE_INFO[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.15)] ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{ background: info.color, textShadow: "0 1px 1px rgb(0 0 0 / 0.35)" }}
    >
      {info.pt}
    </span>
  );
}

export function ArrowIcon({ direction = "right" }: { direction?: "right" | "down" | "up-right" }) {
  const d = {
    right: "M5 12h14M13 6l6 6-6 6",
    down: "M12 5v14M6 13l6 6 6-6",
    "up-right": "M7 17 17 7M9 7h8v8",
  }[direction];
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-3xl border border-line bg-surface p-5 backdrop-blur-xl sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  /** Texto auxiliar à direita (ex.: "+Vel −Atq", "oculta", "Kanto"). */
  hint?: string;
  /** Nome do grupo (substitui o <optgroup> nativo por um cabeçalho no estilo do site). */
  group?: string;
  /** Bolinha ou gradiente de cor à esquerda da opção. */
  dot?: string;
};

/**
 * Menu suspenso customizado no visual do Dex Lab (substitui todos os <select> nativos).
 * Suporta grupos, bolinha de cor, dica lateral e busca interna opcional.
 */
export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Escolher…",
  disabled = false,
  searchable = false,
  searchPlaceholder = "Filtrar opções…",
  ariaLabel,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, searchable]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint && o.hint.toLowerCase().includes(q)) ||
        (o.group && o.group.toLowerCase().includes(q)),
    );
  }, [options, query]);

  // Agrupa mantendo a ordem em que os grupos aparecem.
  const groups = useMemo(() => {
    const out: { name: string | null; items: SelectOption[] }[] = [];
    for (const item of filtered) {
      const g = item.group ?? null;
      const last = out[out.length - 1];
      if (!last || last.name !== g) out.push({ name: g, items: [item] });
      else last.items.push(item);
    }
    return out;
  }, [filtered]);

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : "z-10"} ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => {
            const next = !o;
            if (next) setQuery("");
            return next;
          });
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-surface-solid px-3 py-2 text-left text-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-ink ring-2 ring-ink/15" : "border-line hover:border-ink/60 focus-visible:border-ink"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected?.dot && (
            <span
              className="size-3 shrink-0 rounded-full border border-black/15"
              style={{ background: selected.dot }}
              aria-hidden="true"
            />
          )}
          <span className={`truncate font-medium ${selected ? "text-ink" : "text-muted"}`}>
            {selected ? selected.label : placeholder}
          </span>
          {selected?.hint && (
            <span className="shrink-0 truncate font-mono text-[11px] text-muted">{selected.hint}</span>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180 text-ink" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 mt-1.5 w-full min-w-[14rem] overflow-hidden rounded-2xl border border-line bg-surface-solid/98 p-1.5 shadow-[0_18px_40px_rgb(0_0_0/0.24)] backdrop-blur-xl"
        >
          {searchable && (
            <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-line bg-bg/60 px-2.5 py-1.5">
              <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <div className="scroll-x max-h-64 overflow-y-auto pr-0.5">
            {groups.length === 0 ? (
              <p className="px-3 py-2.5 text-center text-xs text-muted">Nenhuma opção encontrada</p>
            ) : (
              groups.map((g, gi) => (
                <div key={g.name ?? `g-${gi}`} className={gi > 0 ? "mt-1 border-t border-line/70 pt-1" : ""}>
                  {g.name && (
                    <p className="px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                      {g.name}
                    </p>
                  )}
                  {g.items.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        role="option"
                        type="button"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-ink font-semibold text-bg"
                            : "text-ink hover:bg-line/60"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {opt.dot && (
                            <span
                              className="size-2.5 shrink-0 rounded-full border border-black/15"
                              style={{ background: opt.dot }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {opt.hint && (
                          <span className={`shrink-0 font-mono text-[11px] ${isSelected ? "text-bg/80" : "text-muted"}`}>
                            {opt.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Campo de texto com menu de sugestões no estilo do Dex Lab (substitui o <datalist> nativo).
 */
export function ComboInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  maxLength = 40,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  maxLength?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions;
    return list.slice(0, 40);
  }, [suggestions, value]);

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : "z-10"}`}>
      <div className="relative">
        <input
          id={id}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          autoComplete="off"
          className="w-full rounded-xl border border-line bg-surface-solid py-2 pr-8 pl-3 text-sm outline-none transition-colors focus:border-ink"
        />
        {value ? (
          <button
            type="button"
            aria-label="Limpar campo"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink"
          >
            ×
          </button>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen((o) => !o)}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center text-muted"
          >
            <svg viewBox="0 0 24 24" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {open && matches.length > 0 && (
        <div className="scroll-x absolute left-0 mt-1.5 max-h-56 w-full overflow-y-auto rounded-2xl border border-line bg-surface-solid/98 p-1.5 shadow-[0_18px_40px_rgb(0_0_0/0.24)] backdrop-blur-xl">
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors ${
                item.toLowerCase() === value.trim().toLowerCase()
                  ? "bg-ink font-semibold text-bg"
                  : "text-ink hover:bg-line/60"
              }`}
            >
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
