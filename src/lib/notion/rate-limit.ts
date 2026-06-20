import "@/lib/server-guard";
import PQueue from "p-queue";

/**
 * Cola global para respetar el límite de Notion (~3 req/s) + retry con backoff.
 * Anti-patrón A7 evitado: toda llamada al SDK pasa por `nq()`.
 */
const queue = new PQueue({ intervalCap: 3, interval: 1000 });

// Errores de red transitorios (no llevan status HTTP): premature close, resets,
// timeouts, DNS… Frecuentes en egress de contenedores (MTU/IPv6). Se reintentan.
const NETWORK_ERROR_RE =
  /premature close|invalid response body|terminated|fetch failed|socket hang up|other side closed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR|network/i;

function isNetworkError(err: { status?: number; message?: string; cause?: unknown }): boolean {
  if (err.status) return false; // tiene status HTTP → no es error de red puro
  const causeMsg =
    err.cause && typeof err.cause === "object" && "message" in err.cause
      ? String((err.cause as { message?: unknown }).message ?? "")
      : "";
  const causeCode =
    err.cause && typeof err.cause === "object" && "code" in err.cause
      ? String((err.cause as { code?: unknown }).code ?? "")
      : "";
  return NETWORK_ERROR_RE.test(`${err.message ?? ""} ${causeMsg} ${causeCode}`);
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: unknown) {
      const err = e as { status?: number; headers?: Record<string, string>; message?: string; cause?: unknown };
      const status = err.status ?? 0;
      const retriable = status === 429 || (status >= 500 && status < 600) || isNetworkError(err);
      if (!retriable || attempt >= retries) throw e;
      const retryAfter = Number(err.headers?.["retry-after"]) || 0;
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(500 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, backoff));
      attempt += 1;
    }
  }
}

/** Encola una llamada al SDK de Notion (rate-limit + retry). */
export function nq<T>(fn: () => Promise<T>): Promise<T> {
  return queue.add(() => withRetry(fn), { throwOnTimeout: true }) as Promise<T>;
}
