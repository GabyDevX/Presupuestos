import { Redis } from "@upstash/redis";
import type { Presupuesto } from "./types";

const KEY = "presupuesto:v1";

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// Solo para probar en local sin Redis: se pierde al reiniciar.
const memoria = globalThis as unknown as { __presupuesto?: Presupuesto };

export const hayRedis = redis !== null;

export async function leer(): Promise<Presupuesto | null> {
  if (redis) return (await redis.get<Presupuesto>(KEY)) ?? null;
  return memoria.__presupuesto ?? null;
}

export async function guardar(p: Presupuesto): Promise<void> {
  if (redis) await redis.set(KEY, p);
  else memoria.__presupuesto = p;
}
