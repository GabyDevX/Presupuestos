import { Redis } from "@upstash/redis";
import type { Presupuesto } from "./types";

const K_IDS = "presupuestos:ids";
const K_DOC = (id: string) => `presupuesto:doc:${id}`;
const K_LEGACY = "presupuesto:v1"; // versión anterior: un único presupuesto

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// Solo para probar en local sin Redis: se pierde al reiniciar.
interface Memoria {
  ids: string[] | null;
  docs: Map<string, Presupuesto>;
  legacy: Presupuesto | null;
}
const g = globalThis as unknown as { __presupuestos?: Memoria };
const memoria = (): Memoria => (g.__presupuestos ??= { ids: null, docs: new Map(), legacy: null });

export const hayRedis = redis !== null;

/** Solo para tests. */
export function reiniciarMemoria() {
  g.__presupuestos = undefined;
}
/** Solo para tests: simula los datos de la versión anterior. */
export function sembrarLegacy(p: Presupuesto) {
  memoria().legacy = p;
}

/** null = todavía no se inicializó nada (primera vez o datos de la versión anterior). */
export async function leerIds(): Promise<string[] | null> {
  if (redis) return (await redis.get<string[]>(K_IDS)) ?? null;
  return memoria().ids;
}

export async function guardarIds(ids: string[]): Promise<void> {
  if (redis) await redis.set(K_IDS, ids);
  else memoria().ids = ids;
}

export async function leerDoc(id: string): Promise<Presupuesto | null> {
  if (redis) return (await redis.get<Presupuesto>(K_DOC(id))) ?? null;
  return memoria().docs.get(id) ?? null;
}

export async function guardarDoc(id: string, doc: Presupuesto): Promise<void> {
  if (redis) await redis.set(K_DOC(id), doc);
  else memoria().docs.set(id, doc);
}

export async function borrarDoc(id: string): Promise<void> {
  if (redis) await redis.del(K_DOC(id));
  else memoria().docs.delete(id);
}

export async function leerLegacy(): Promise<Presupuesto | null> {
  if (redis) return (await redis.get<Presupuesto>(K_LEGACY)) ?? null;
  return memoria().legacy;
}
