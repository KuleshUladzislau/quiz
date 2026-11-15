export const ADMIN_COOKIE = "quiz_admin";
export const PARTICIPANT_COOKIE = "quiz_pid";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isId(value) {
  return ID.test(value || "");
}

export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function safeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    mismatch |= (left[i] || 0) ^ (right[i] || 0);
  }
  return mismatch === 0;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function adminCookieValue() {
  return hmac(process.env.ADMIN_PASSWORD || "", `quiz-admin:${process.env.ADMIN_LOGIN || ""}`);
}

export async function adminStatus(request) {
  const login = process.env.ADMIN_LOGIN || "";
  const password = process.env.ADMIN_PASSWORD || "";
  if (!login || !password) return { ok: false, fromQuery: false };

  const url = new URL(request.url);
  const hasQuery = url.searchParams.has("login") || url.searchParams.has("password");
  if (hasQuery) {
    const qLogin = url.searchParams.get("login") || "";
    const qPassword = url.searchParams.get("password") || "";
    if (qLogin.length > 200 || qPassword.length > 200) return { ok: false, fromQuery: false };
    const ok = safeEqual(qLogin, login) && safeEqual(qPassword, password);
    return { ok, fromQuery: ok };
  }

  const got = request.cookies?.get?.(ADMIN_COOKIE)?.value || "";
  if (!got) return { ok: false, fromQuery: false };
  const expected = await adminCookieValue();
  return { ok: safeEqual(got, expected), fromQuery: false };
}
