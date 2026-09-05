const REDACTED = "<redacted>";

export function redactLifecycleDiagnostics(value) {
  return String(value)
    .replace(
      /("?(?:trackingSecret|attemptId|customer_name|customer_phone|password)"?\s*[:=]\s*["'])[^"']*(["'])/gi,
      `$1${REDACTED}$2`,
    )
    .replace(/(https?:\/\/[^\s#]+)#[^\s"']+/gi, `$1#${REDACTED}`)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, REDACTED)
    .replace(/[A-Za-z0-9_-]{32,}/g, REDACTED)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
    .replace(/\b(?:\+?1)?\d{10}\b/g, REDACTED)
    .replace(/Synthetic EN customer|Client synthétique FR/gi, REDACTED);
}
