import type { CheckMon } from "./desafios";
import { pokemonName, type Pokemon } from "./pokeapi";

/** Envia uma ação da vitrine ou do desafio (curtir, copiar, denunciar, participar...). */
export async function post(body: object, token?: string | null, path = "/api/vitrine") {
  const res = await fetch(path, {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { erro?: string; curtido?: boolean; curtidas?: number };
  if (!res.ok) throw new Error(data.erro ?? "Não deu agora. Tente de novo.");
  return data;
}

/** Dados de um Pokémon carregado no formato que as regras do desafio usam. */
export function checkMonOf(p: Pokemon): CheckMon {
  return {
    name: pokemonName(p.name),
    speciesId: Number(p.speciesUrl.replace(/\/$/, "").split("/").pop()) || p.id,
    types: p.types,
    bst: p.stats.reduce((n, s) => n + s.value, 0),
  };
}
