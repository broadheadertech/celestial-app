/**
 * Password hashing for the Convex default runtime.
 *
 * Current format:  pbkdf2$<iterations>$<saltB64>$<hashB64>   (PBKDF2-HMAC-SHA256, 16-byte salt, 32-byte key)
 * Still accepted:  <saltHex>:<sha256Hex(salt + password)>     (single salted SHA-256)
 *                  <int><length>                              (legacy non-crypto hash)
 * Anything that isn't current should be re-hashed after a successful verification (see needsRehash).
 *
 * 600,000 iterations (OWASP's PBKDF2-SHA256 recommendation) measured ~87 ms per hash on the
 * Convex runtime, comfortably inside the mutation time limit.
 */

export const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_PREFIX = "pbkdf2$";
const SALT_BYTES = 16;
const KEY_BITS = 256;
// Guards against a corrupt/crafted stored hash making verification absurdly slow.
const MAX_ITERATIONS = 5_000_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Constant-time comparison (time depends only on the lengths). */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  return timingSafeEqual(enc.encode(a), enc.encode(b));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

function legacyHashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString() + password.length.toString();
}

function parsePbkdf2(stored: string): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return null;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) return null;
  const salt = base64ToBytes(parts[2]);
  const hash = base64ToBytes(parts[3]);
  if (!salt || !hash || salt.length === 0 || hash.length === 0) return null;
  return { iterations, salt, hash };
}

/** Verifies a password against any supported stored format. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    const parsed = parsePbkdf2(storedHash);
    if (!parsed) return false;
    const computed = await pbkdf2(password, parsed.salt, parsed.iterations);
    return timingSafeEqual(computed, parsed.hash);
  }
  if (storedHash.includes(":")) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    return timingSafeEqualString(await sha256Hex(salt + password), hash);
  }
  return timingSafeEqualString(legacyHashPassword(password), storedHash);
}

/** True when a (successfully verified) stored hash should be upgraded to the current format. */
export function needsRehash(storedHash: string): boolean {
  const parsed = storedHash.startsWith(PBKDF2_PREFIX) ? parsePbkdf2(storedHash) : null;
  return !parsed || parsed.iterations < PBKDF2_ITERATIONS;
}

/**
 * Does the same work as verifying a current-format hash, so a request for an unknown account
 * takes about as long as one for a real account with a wrong password.
 */
export async function dummyVerify(password: string): Promise<void> {
  await pbkdf2(password, new Uint8Array(SALT_BYTES), PBKDF2_ITERATIONS);
}
