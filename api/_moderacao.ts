import type { Redis } from "@upstash/redis";

/**
 * Decisões da moderação (painel /admin), lidas pela vitrine, desafio e perfis:
 * - ocultos: times escondidos à mão (id público);
 * - liberados: times que o dono do app revisou e liberou (não somem mais com denúncias);
 * - bloqueados: contas que não podem ter perfil público nem participar.
 */
export const MOD = {
  hidden: "dexlab:mod:ocultos",
  cleared: "dexlab:mod:liberados",
  blocked: "dexlab:mod:bloqueados",
  resolved: "dexlab:mod:resolvidas",
};

/** Times com tantas denúncias de pessoas diferentes saem sozinhos, até alguém revisar. */
export const HIDE_AFTER_REPORTS = 3;

export type Moderation = { hidden: Set<string>; cleared: Set<string>; blocked: Set<string> };

export async function loadModeration(redis: Redis): Promise<Moderation> {
  const [hidden, cleared, blocked] = await Promise.all([redis.smembers(MOD.hidden), redis.smembers(MOD.cleared), redis.smembers(MOD.blocked)]);
  return { hidden: new Set(hidden), cleared: new Set(cleared), blocked: new Set(blocked) };
}

export function isHidden(mod: Moderation, id: string, reports: number) {
  if (mod.hidden.has(id)) return true;
  if (mod.cleared.has(id)) return false;
  return reports >= HIDE_AFTER_REPORTS;
}

export async function isBlocked(redis: Redis, uid: string) {
  return (await redis.sismember(MOD.blocked, uid)) === 1;
}
