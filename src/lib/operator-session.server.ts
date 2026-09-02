// Signed session for the single fixed operator account (OPERATOR_USER/OPERATOR_PASS).
// Server-only: never import this from route/component files.
export const SESSION_COOKIE = "operator_session";
const SESSION_TTL_SECONDS = 12 * 3600; // 12h

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = getEnv("OPERATOR_SESSION_SECRET");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(usuario: string): Promise<string> {
  const payload = JSON.stringify({
    sub: usuario,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const key = await hmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string): Promise<{ sub: string } | null> {
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  const key = await hmacKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signatureB64),
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as {
      sub?: unknown;
      exp?: unknown;
    };
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

// Constant-time-ish comparison to avoid leaking credential length/content via timing.
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i]! ^ bufB[i]!;
  return diff === 0;
}

export function checkOperatorCredentials(usuario: string, senha: string): boolean {
  const expectedUser = getEnv("OPERATOR_USER");
  const expectedPass = getEnv("OPERATOR_PASS");
  const userMatch = timingSafeEqual(usuario, expectedUser);
  const passMatch = timingSafeEqual(senha, expectedPass);
  if (!userMatch || !passMatch) {
    console.error("[operator-auth] credential mismatch", {
      userMatch,
      passMatch,
      receivedUserLen: usuario.length,
      expectedUserLen: expectedUser.length,
      receivedPassLen: senha.length,
      expectedPassLen: expectedPass.length,
    });
  }
  return userMatch && passMatch;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
  secure: process.env["NODE_ENV"] === "production",
};
