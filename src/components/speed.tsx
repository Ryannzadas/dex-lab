import { finalStats } from "@/lib/natures";
import { artworkUrl, pokemonName, type Pokemon } from "@/lib/pokeapi";
import type { Member } from "@/lib/team";
import { TYPE_INFO } from "@/lib/types";
import { Card, SectionHeading } from "./ui";

/**
 * Pokémon comuns no competitivo, com a velocidade base (dado oficial de cada espécie),
 * para servir de régua: "meu Pokémon passa ou não passa esse aqui?".
 */
const BENCHMARKS = [
  { id: 991, name: "Iron Bundle", base: 136 },
  { id: 887, name: "Dragapult", base: 142 },
  { id: 987, name: "Flutter Mane", base: 135 },
  { id: 908, name: "Meowscarada", base: 123 },
  { id: 641, name: "Tornadus", base: 111 },
  { id: 445, name: "Garchomp", base: 102 },
  { id: 892, name: "Urshifu", base: 97 },
  { id: 984, name: "Great Tusk", base: 87 },
  { id: 1000, name: "Gholdengo", base: 84 },
  { id: 149, name: "Dragonite", base: 80 },
  { id: 485, name: "Heatran", base: 77 },
  { id: 727, name: "Incineroar", base: 60 },
  { id: 983, name: "Kingambit", base: 50 },
  { id: 591, name: "Amoonguss", base: 30 },
];

/** Velocidade máxima comum: 252 EVs, IV 31 e natureza que aumenta Velocidade. */
function maxSpeed(base: number, level: number) {
  return Math.floor((Math.floor(((2 * base + 31 + 63) * level) / 100) + 5) * 1.1);
}

type Row = { key: string; label: string; sub: string; speed: number; art: number; color: string | null; mine: boolean };

export function SpeedTiers({ team, members }: { team: Pokemon[]; members: Member[] }) {
  // A régua usa o nível mais comum do time (normalmente 50 ou 100).
  const levels = members.map((m) => m.level);
  const level = levels.sort((a, b) => levels.filter((x) => x === b).length - levels.filter((x) => x === a).length)[0] ?? 50;

  const mine: Row[] = team.map((p) => {
    const m = members.find((x) => x.id === p.id);
    const stats = finalStats(p.stats, m?.level ?? 50, m?.nature ?? "hardy", m?.evs ?? {}, m?.ivs ?? {});
    const scarf = /choice\s*scarf/i.test(m?.item ?? "");
    const speed = Math.floor(stats.speed * (scarf ? 1.5 : 1));
    return {
      key: `m${p.id}`,
      label: m?.nickname || pokemonName(p.name),
      sub: `Nv ${m?.level ?? 50}${scarf ? " · Choice Scarf ×1,5" : ""}`,
      speed,
      art: p.id,
      color: TYPE_INFO[p.types[0]].color,
      mine: true,
    };
  });

  const refs: Row[] = BENCHMARKS.filter((b) => !team.some((p) => p.id === b.id)).map((b) => ({
    key: `b${b.id}`,
    label: b.name,
    sub: `máx. Nv ${level}`,
    speed: maxSpeed(b.base, level),
    art: b.id,
    color: null,
    mine: false,
  }));

  const rows = [...mine, ...refs].sort((a, b) => b.speed - a.speed || Number(b.mine) - Number(a.mine));
  const top = Math.max(...rows.map((r) => r.speed), 1);

  return (
    <Card>
      <SectionHeading kicker="Velocidade" title="Quem ataca primeiro">
        Velocidade final de cada membro (com nível, natureza, EVs, IVs e Choice Scarf) ao lado da velocidade máxima de Pokémon
        comuns no competitivo. Quem está acima ataca antes.
      </SectionHeading>
      <ol className="grid gap-1.5">
        {rows.map((r) => (
          <li
            key={r.key}
            className={`grid grid-cols-[2.25rem_minmax(0,1fr)_5.5rem_2.5rem] items-center gap-3 rounded-xl px-2 py-1 sm:grid-cols-[2.25rem_minmax(0,12rem)_1fr_3rem] ${
              r.mine ? "bg-surface-solid ring-1 ring-ink/80" : "opacity-70"
            }`}
          >
            <img src={artworkUrl(r.art)} alt="" width={36} height={36} loading="lazy" className="size-9" />
            <span className="min-w-0">
              <span className={`block truncate text-sm ${r.mine ? "font-bold" : "font-medium"}`}>{r.label}</span>
              <span className="block truncate font-mono text-[10px] text-muted">{r.sub}</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(r.speed / top) * 100}%`, background: r.mine ? (r.color ?? "currentColor") : "var(--muted)" }}
              />
            </span>
            <span className={`text-right font-mono text-sm ${r.mine ? "font-bold" : "text-muted"}`}>{r.speed}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">
        Não considera efeitos de batalha como Tailwind, Trick Room, paralisia ou mudanças de status.
      </p>
    </Card>
  );
}
