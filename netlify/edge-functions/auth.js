const COOKIE_NAME = "site_auth";
const LOGIN_PATH = "/login";
const LOGIN_FILE_PATH = "/login.html";
const LOGIN_POST_PATH = "/auth/login";
const LOGOUT_PATH = "/auth/logout";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export default async function authGate(request, context) {
  const url = new URL(request.url);
  const password = getEnv("SITE_PASSWORD");
  const secret = getEnv("AUTH_SECRET");

  if (!password || !secret) {
    return new Response("Missing required env vars: SITE_PASSWORD and AUTH_SECRET.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }

  if (url.pathname === LOGIN_POST_PATH && request.method === "POST") {
    return handleLogin(request, context, password, secret);
  }

  if (url.pathname === LOGOUT_PATH) {
    return handleLogout(request, context);
  }

  const authenticated = await hasValidSession(context.cookies.get(COOKIE_NAME), secret);

  if (url.pathname === LOGIN_PATH || url.pathname === LOGIN_FILE_PATH) {
    if (authenticated) {
      return Response.redirect(new URL("/", request.url), 302);
    }

    if (url.pathname === LOGIN_PATH) {
      return new URL(LOGIN_FILE_PATH, request.url);
    }

    return context.next();
  }

  if (authenticated) {
    return context.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("redirect", `${url.pathname}${url.search}`);
  return Response.redirect(loginUrl, 302);
}

export const config = {
  path: "/*"
};

async function handleLogin(request, context, password, secret) {
  const form = await request.formData();
  const submittedPassword = String(form.get("password") || "");
  const redirectPath = sanitizeRedirect(String(form.get("redirect") || "/"));

  if (submittedPassword !== password) {
    const failureUrl = new URL(LOGIN_PATH, request.url);
    failureUrl.searchParams.set("error", "1");
    failureUrl.searchParams.set("redirect", redirectPath);
    return Response.redirect(failureUrl, 302);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession(expiresAt, secret);
  const response = Response.redirect(new URL(redirectPath, request.url), 302);

  context.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });

  return response;
}

function handleLogout(request, context) {
  const response = Response.redirect(new URL(LOGIN_PATH, request.url), 302);

  context.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: 0
  });

  return response;
}

async function hasValidSession(cookieValue, secret) {
  if (!cookieValue) {
    return false;
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [expiresAt, signature] = parts;
  const expires = Number(expiresAt);

  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = await signValue(expiresAt, secret);
  return timingSafeEqual(signature, expectedSignature);
}

async function signSession(expiresAt, secret) {
  const expiresAtText = String(expiresAt);
  const signature = await signValue(expiresAtText, secret);
  return `${expiresAtText}.${signature}`;
}

async function signValue(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(signature);
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

function sanitizeRedirect(value) {
  return value.startsWith("/") ? value : "/";
}

function getEnv(name) {
  if (typeof Netlify !== "undefined" && Netlify.env) {
    return Netlify.env.get(name);
  }

  return undefined;
}
