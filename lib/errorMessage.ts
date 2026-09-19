/**
 * Readable message from a Convex mutation/query error. Convex wraps server errors as
 * "[CONVEX M(module:fn)] [Request ID: …] Server Error\nUncaught Error: <message>\n    at …";
 * this returns just "<message>", or `fallback` when there's nothing useful.
 */
export function errorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!raw) return fallback;
  const afterUncaught = raw.includes('Uncaught Error:') ? raw.split('Uncaught Error:').pop()! : raw;
  const firstLine = afterUncaught
    .split('\n')[0]
    .replace(/^\[CONVEX [^\]]*\]\s*/, '')
    .replace(/^\[Request ID: [^\]]*\]\s*/, '')
    .trim();
  return firstLine && firstLine !== 'Server Error' ? firstLine : fallback;
}
