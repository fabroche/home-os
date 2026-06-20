import "@/lib/server-guard";
import PQueue from "p-queue";

/**
 * Cola global para respetar el límite de Notion (~3 req/s) + retry con backoff.
 * Anti-patrón A7 evitado: toda llamada al SDK pasa por `nq()`.
 */
const queue = new PQueue({ intervalCap: 3, interval: 1000 });

export async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: unknown) {
      const err = e as { status?: number; headers?: Record<string, string> };
      const status = err.status ?? 0;
      const retriable = status === 429 || (status >= 500 && status < 600);
      if (!retriable || attempt >= retries) throw e;
      const retryAfter = Number(err.headers?.["retry-after"]) || 0;
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, backoff));
      attempt += 1;
    }
  }
}

/** Encola una llamada al SDK de Notion (rate-limit + retry). */
export function nq<T>(fn: () => Promise<T>): Promise<T> {
  return queue.add(() => withRetry(fn), { throwOnTimeout: true }) as Promise<T>;
}
