/**
 * Junta os times salvos de dois lugares (este aparelho e a nuvem) sem perder nada.
 * Usado no navegador e na função /api/times, então não depende de nada do navegador.
 *
 * Regras:
 * - Cada time tem um id; se o mesmo time existe nos dois lados, vale a versão com `updatedAt` mais recente.
 * - Time excluído vira uma "lápide" (id → quando foi excluído). Ele só volta se for editado depois disso.
 * - Lápides com mais de 90 dias são descartadas.
 */

export type SyncTeam = { id: string; name: string; members: unknown[]; updatedAt: number; game: string | null };
export type SyncData = { teams: SyncTeam[]; deleted: Record<string, number> };

export const MAX_SYNC_TEAMS = 30;
const TOMBSTONE_MS = 90 * 24 * 60 * 60 * 1000;

export function mergeSync(a: SyncData, b: SyncData, now = Date.now()): SyncData {
  const deleted: Record<string, number> = {};
  for (const src of [a.deleted, b.deleted]) {
    for (const [id, at] of Object.entries(src ?? {})) {
      if (typeof at === "number" && now - at < TOMBSTONE_MS) deleted[id] = Math.max(deleted[id] ?? 0, at);
    }
  }

  const byId = new Map<string, SyncTeam>();
  for (const t of [...(a.teams ?? []), ...(b.teams ?? [])]) {
    if (!t || typeof t.id !== "string") continue;
    const cur = byId.get(t.id);
    if (!cur || (t.updatedAt ?? 0) > (cur.updatedAt ?? 0)) byId.set(t.id, t);
  }

  // Ordem: a de `a` primeiro (a lista que o jogador já vê), depois os times novos de `b`.
  const order = [...(a.teams ?? []), ...(b.teams ?? [])].map((t) => t?.id).filter((id, i, arr) => id && arr.indexOf(id) === i);
  let teams = order.map((id) => byId.get(id as string)!).filter((t) => !(deleted[t.id] && deleted[t.id] >= t.updatedAt));
  for (const t of teams) delete deleted[t.id];

  // Acima do limite, ficam os mexidos mais recentemente (mantendo a ordem).
  if (teams.length > MAX_SYNC_TEAMS) {
    const keep = new Set([...teams].sort((x, y) => y.updatedAt - x.updatedAt).slice(0, MAX_SYNC_TEAMS).map((t) => t.id));
    teams = teams.filter((t) => keep.has(t.id));
  }
  return { teams, deleted };
}

/** Time vazio criado automaticamente ("Time 1" sem ninguém): não vale levar para a nuvem nem para outro aparelho. */
export function isBlankTeam(t: SyncTeam) {
  return t.members.length === 0 && t.game === null && /^Time \d+$/.test(t.name);
}
