import { isLegendaryOrMythical } from "./legendaries.js";
import { TYPE_INFO, type TypeName } from "./types.js";

/**
 * Desafio da semana: uma regra para montar o time, que muda toda segunda-feira à meia-noite (Brasília).
 * Usado pelo app (confere enquanto você monta) e pelo servidor (valida ao participar).
 */

export type Rule =
  | { kind: "type"; type: TypeName }
  | { kind: "region"; from: number; to: number; region: string }
  | { kind: "noLegend" }
  | { kind: "maxBst"; value: number }
  | { kind: "uniqueTypes" };

export type Challenge = { id: string; title: string; description: string; rule: Rule };

/** O que precisa saber de cada Pokémon para conferir as regras. */
export type CheckMon = { name: string; speciesId: number; types: string[]; bst: number };

const type = (t: TypeName, extra: string): Challenge => ({
  id: `tipo-${t}`,
  title: `Só tipo ${TYPE_INFO[t].pt}`,
  description: `Os seis precisam ter o tipo ${TYPE_INFO[t].pt} (pode ser o segundo tipo). ${extra}`,
  rule: { kind: "type", type: t },
});

const region = (regionName: string, from: number, to: number): Challenge => ({
  id: `regiao-${regionName.toLowerCase()}`,
  title: `Só de ${regionName}`,
  description: `Os seis precisam ser da Pokédex de ${regionName} (números ${from} a ${to}). Formas regionais contam pela espécie.`,
  rule: { kind: "region", from, to, region: regionName },
});

/** Ordem de rotação, uma por semana. Acrescentar ou tirar desafios muda quais caem nas próximas semanas. */
export const CHALLENGES: Challenge[] = [
  type("ghost", "Cuidado com Sombra e Sombrio."),
  region("Hoenn", 252, 386),
  {
    id: "sem-lendarios",
    title: "Sem lendários",
    description: "Seis Pokémon e nenhum lendário ou mítico. Força bruta não vale, só estratégia.",
    rule: { kind: "noLegend" },
  },
  {
    id: "azaroes",
    title: "Time dos azarões",
    description: "Todo Pokémon com total de status de até 450. Mostre que dá para vencer com os fracos.",
    rule: { kind: "maxBst", value: 450 },
  },
  {
    id: "tipos-unicos",
    title: "Nenhum tipo repetido",
    description: "Nenhum tipo pode aparecer em dois Pokémon do time. Cobertura máxima.",
    rule: { kind: "uniqueTypes" },
  },
  type("dragon", "Atenção às fraquezas a Gelo e Fada."),
  region("Kanto", 1, 151),
  type("bug", "O tipo mais subestimado do jogo."),
  region("Sinnoh", 387, 493),
  type("fairy", "Aço e Veneno são o problema."),
];

const WEEK = 7 * 24 * 60 * 60 * 1000;
/** Segunda-feira, 5/1/2026, 00:00 em Brasília (03:00 UTC). */
const EPOCH = Date.UTC(2026, 0, 5, 3);

/** O desafio da semana de número `index` (semana 0 = a que começou em 5/1/2026). */
export function challengeForIndex(index: number) {
  const challenge = CHALLENGES[((index % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
  return { challenge, index, week: `s${index}`, startsAt: EPOCH + index * WEEK, endsAt: EPOCH + (index + 1) * WEEK };
}

export function challengeOfWeek(now = Date.now()) {
  return challengeForIndex(Math.floor((now - EPOCH) / WEEK));
}

/** Confere um time completo contra a regra. Devolve os problemas em português (vazio = cumpre). */
export function checkTeam(challenge: Challenge, mons: CheckMon[]): string[] {
  const problems: string[] = [];
  if (mons.length < 6) problems.push(`Faltam ${6 - mons.length} Pokémon: o desafio pede time completo.`);
  const rule = challenge.rule;
  if (rule.kind === "type") {
    const off = mons.filter((m) => !m.types.includes(rule.type));
    if (off.length) problems.push(`Sem o tipo ${TYPE_INFO[rule.type].pt}: ${off.map((m) => m.name).join(", ")}.`);
  } else if (rule.kind === "region") {
    const off = mons.filter((m) => m.speciesId < rule.from || m.speciesId > rule.to);
    if (off.length) problems.push(`Não são de ${rule.region}: ${off.map((m) => m.name).join(", ")}.`);
  } else if (rule.kind === "noLegend") {
    const off = mons.filter((m) => isLegendaryOrMythical(m.speciesId));
    if (off.length) problems.push(`Lendários ou míticos: ${off.map((m) => m.name).join(", ")}.`);
  } else if (rule.kind === "maxBst") {
    const off = mons.filter((m) => m.bst > rule.value);
    if (off.length) problems.push(`Status acima de ${rule.value}: ${off.map((m) => `${m.name} (${m.bst})`).join(", ")}.`);
  } else if (rule.kind === "uniqueTypes") {
    const seen = new Map<string, string>();
    const repeated = new Set<string>();
    for (const m of mons) {
      for (const t of m.types) {
        if (seen.has(t)) repeated.add(`${TYPE_INFO[t as TypeName]?.pt ?? t} (${seen.get(t)} e ${m.name})`);
        else seen.set(t, m.name);
      }
    }
    if (repeated.size) problems.push(`Tipos repetidos: ${[...repeated].join(", ")}.`);
  }
  return problems;
}

/** Quanto falta para o desafio acabar, em texto curto ("3 dias", "5 h"). */
export function timeLeft(endsAt: number, now = Date.now()) {
  const ms = Math.max(0, endsAt - now);
  const days = Math.floor(ms / (24 * 3600e3));
  if (days >= 1) return days === 1 ? "1 dia" : `${days} dias`;
  const hours = Math.max(1, Math.floor(ms / 3600e3));
  return `${hours} h`;
}
