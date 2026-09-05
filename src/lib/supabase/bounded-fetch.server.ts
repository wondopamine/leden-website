import "server-only";

// Public order creation performs several sequential database operations around
// Turnstile. Two seconds per Supabase request keeps the complete server path
// bounded inside the checkout client's 15-second create deadline while leaving
// enough room for a hosted free-tier cold path.
export const SUPABASE_REQUEST_TIMEOUT_MS = 2_000;
// Menu images are explicitly bounded to 5 MB and need a wider transfer window
// than small Auth/PostgREST requests, while still preventing an unbounded Route
// Handler on a stalled Storage upload.
export const SUPABASE_UPLOAD_TIMEOUT_MS = 10_000;

type FetchImplementation = typeof fetch;

function abortReason(signal: AbortSignal): Error | DOMException {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Supabase request aborted", "AbortError");
}

/**
 * Wrap every server-side Supabase HTTP request in a hard deadline.
 *
 * The explicit abort rejection matters for test doubles and transports that do
 * not cooperate with AbortSignal: callers still settle at the advertised
 * deadline instead of occupying a Route Handler until the platform kills it.
 */
export function createBoundedSupabaseFetch(
  timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS,
  fetchImplementation: FetchImplementation = globalThis.fetch,
): FetchImplementation {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new Error("Supabase request timeout must be a positive number.");
  }

  return async (input, init) => {
    const controller = new AbortController();
    const callerSignal = init?.signal;
    const forwardCallerAbort = () => controller.abort(callerSignal?.reason);

    if (callerSignal?.aborted) {
      forwardCallerAbort();
    } else {
      callerSignal?.addEventListener("abort", forwardCallerAbort, { once: true });
    }

    const timeout = setTimeout(() => {
      controller.abort(
        new DOMException("Supabase request timed out", "TimeoutError"),
      );
    }, timeoutMs);
    const aborted = new Promise<never>((_, reject) => {
      if (controller.signal.aborted) {
        reject(abortReason(controller.signal));
        return;
      }
      controller.signal.addEventListener(
        "abort",
        () => reject(abortReason(controller.signal)),
        { once: true },
      );
    });

    try {
      return await Promise.race([
        fetchImplementation(input, { ...init, signal: controller.signal }),
        aborted,
      ]);
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", forwardCallerAbort);
    }
  };
}
