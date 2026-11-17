import { Redis } from "@upstash/redis";

/**
 * Cliente do Upstash Redis. A integração da Vercel pode criar as variáveis com dois nomes
 * (UPSTASH_REDIS_REST_* ou KV_REST_API_*); aceitamos os dois. Sem elas, devolve null.
 */
let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
