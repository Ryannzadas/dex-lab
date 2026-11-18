import { useState } from "react";
import { ArrowIcon } from "@/components/ui";
import { gameById } from "@/lib/games";
import { artworkUrl } from "@/lib/pokeapi";
import type { Member } from "@/lib/team";
import { Avatar } from "./profile-dialog";

const REASONS = [
  { id: "ofensivo", label: "Ofensivo" },
  { id: "spam", label: "Spam" },
  { id: "outro", label: "Outro" },
] as const;

export type ShowcaseEntry = {
  id: string;
  handle: string;
  name: string;
  photo: string | null;
  team: { name: string; game: string | null; members: Member[] };
  curtidas: number;
  copias?: number;
};

/** Card de um time de outra pessoa (vitrine e desafio). */
export function ShowcaseCard({
  entry,
  names,
  liked,
  onLike,
  onUse,
  onCompare,
  onReport,
  rank,
}: {
  entry: ShowcaseEntry;
  names: Map<number, string>;
  liked: boolean;
  onLike: () => void;
  onUse: () => void;
  /** Abre a comparação com um time meu. */
  onCompare?: () => void;
  onReport: (motivo: string) => void;
  /** Posição no ranking do desafio (1, 2, 3...). */
  rank?: number;
}) {
  const [reporting, setReporting] = useState(false);
  const game = gameById(entry.team.game);

  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-4 shadow-sm backdrop-blur-xl sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {rank !== undefined && (
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-xl border font-mono text-sm font-bold ${
                rank === 1 ? "border-amber-400/60 bg-amber-400/15 text-amber-600 dark:text-amber-300" : "border-line text-muted"
              }`}
              aria-label={`${rank}º lugar`}
            >
              {rank}
            </span>
          )}
          <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold">{entry.team.name}</h3>
          <p className="text-sm text-muted">{game ? game.label : "Time livre"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLike}
          aria-pressed={liked}
          aria-label={`${liked ? "Descurtir" : "Curtir"} ${entry.team.name}. ${entry.curtidas} curtidas`}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            liked ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-line hover:border-ink"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" strokeLinejoin="round" />
          </svg>
          <span className="font-mono">{entry.curtidas}</span>
        </button>
      </header>

      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {entry.team.members.map((m, i) => {
          const name = m.nickname || names.get(m.id) || `#${m.id}`;
          return (
            <li key={i} className="flex flex-col items-center rounded-2xl border border-line bg-bg/60 px-1 pt-2 pb-2">
              <img src={artworkUrl(m.id, m.shiny)} alt="" width={80} height={80} loading="lazy" className="aspect-square w-full max-w-20 object-contain" />
              <span className="mt-1 w-full truncate text-center text-xs font-medium" title={name}>
                {name}
              </span>
            </li>
          );
        })}
      </ul>

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
        <a href={`/u/${entry.handle}`} className="flex w-full min-w-0 items-center gap-2.5 rounded-full pr-2 transition hover:opacity-80 sm:w-auto sm:flex-1">
          <Avatar user={entry} size={32} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{entry.name}</span>
            <span className="block truncate font-mono text-xs text-muted">@{entry.handle}</span>
          </span>
        </a>
        {!!entry.copias && (
          <span className="font-mono text-xs text-muted" title="Quantas pessoas usaram este time">
            {entry.copias} {entry.copias === 1 ? "cópia" : "cópias"}
          </span>
        )}
        {onCompare && (
          <button
            type="button"
            onClick={onCompare}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-ink"
          >
            Comparar
          </button>
        )}
        <button
          type="button"
          onClick={onUse}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition hover:opacity-90"
        >
          Usar este time <ArrowIcon />
        </button>
        <button
          type="button"
          onClick={() => setReporting((v) => !v)}
          aria-expanded={reporting}
          aria-label="Denunciar este time"
          title="Denunciar"
          className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-line/60 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 21V4M5 4h11l-2 4 2 4H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {reporting && (
          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-2xl bg-line/40 px-3 py-2 text-sm">
            <span className="mr-1 text-muted">Denunciar por:</span>
            {REASONS.map((r) => (
              <button key={r.id} type="button" onClick={() => onReport(r.id)} className="rounded-full border border-line px-3 py-1 font-medium transition hover:border-ink">
                {r.label}
              </button>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
}
