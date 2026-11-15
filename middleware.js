import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, adminStatus, cookieBase } from "./lib/auth";

function denied() {
  const html = `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="referrer" content="origin">
<title>Закрыто</title>
<style>
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #f3eee4; color: #1b1916; font: 16px/1.45 "Segoe UI", sans-serif; padding: 24px; }
  main { width: min(100%, 420px); }
  p.mark { margin: 0 0 12px; letter-spacing: .14em; text-transform: uppercase; font-size: 12px; color: #c2410c; font-weight: 700; }
  h1 { margin: 0 0 10px; font-size: 36px; letter-spacing: -.04em; line-height: 1.05; }
  p { margin: 0; color: #6e675e; }
  code { display: block; margin-top: 16px; padding: 14px 16px; border-radius: 16px; background: #fffdf9; border: 1px solid rgba(27,25,22,.1); color: #1b1916; word-break: break-all; }
</style>
<main>
  <p class="mark">Квиз</p>
  <h1>Страница закрыта</h1>
  <p>Откройте её ссылкой с логином и паролем из настроек.</p>
  <code>/results?login=…&password=…</code>
</main>
</html>`;
  return new NextResponse(html, {
    status: 401,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function middleware(request) {
  const status = await adminStatus(request);
  if (!status.ok) return denied();

  if (status.fromQuery) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("login");
    clean.searchParams.delete("password");
    const response = NextResponse.redirect(clean);
    response.cookies.set(ADMIN_COOKIE, await adminCookieValue(), {
      ...cookieBase(),
      maxAge: 60 * 60 * 24 * 14,
    });
    response.headers.set("cache-control", "no-store");
    response.headers.set("referrer-policy", "no-referrer");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-robots-tag", "noindex");
  return response;
}

export const config = {
  matcher: ["/results", "/results/:path*", "/questions", "/questions/:path*"],
};
