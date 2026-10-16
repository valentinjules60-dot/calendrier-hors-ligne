const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 210000;
const ALLOWED_ORIGIN = "https://valentinjules60-dot.github.io";

function corsHeaders(origin) {
  const allowedOrigin = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function normalizeAccount(first, last) {
  return (first.trim() + " " + last.trim()).normalize("NFKC").toLocaleLowerCase("fr-FR");
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return toBase64Url(data);
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toBase64Url(new Uint8Array(digest));
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: Uint8Array.from(atob(salt.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return toBase64Url(new Uint8Array(bits));
}

async function createSession(db, userId) {
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  await db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).bind(await sha256(token), userId, expires.toISOString(), now.toISOString()).run();
  return token;
}

async function authenticate(request, db) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  if (!token || token.length > 256) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const row = await db.prepare(
    "SELECT user_id, token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?"
  ).bind(tokenHash, now).first();
  return row || null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (!path.startsWith("/api/")) return json({ error: "Not found" }, 404, origin);

    try {
      if (request.method === "POST" && path === "/api/register") {
        const body = await readJson(request);
        const first = typeof body?.first === "string" ? body.first.trim() : "";
        const last = typeof body?.last === "string" ? body.last.trim() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!first || !last || first.length > 80 || last.length > 80 || password.length < 8 || password.length > 256) {
          return json({ error: "Entre ton prénom, ton nom et un mot de passe d’au moins 8 caractères." }, 400, origin);
        }

        const accountKey = normalizeAccount(first, last);
        const saltBytes = new Uint8Array(16);
        crypto.getRandomValues(saltBytes);
        const salt = toBase64Url(saltBytes);
        const hash = await passwordHash(password, salt);
        const userId = randomToken(16);
        const now = new Date().toISOString();
        try {
          await env.DB.prepare(
            "INSERT INTO users (id, account_key, first_name, last_name, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).bind(userId, accountKey, first, last, salt, hash, now).run();
        } catch {
          return json({ error: "Ce compte existe déjà. Connecte-toi avec ce compte." }, 409, origin);
        }
        const token = await createSession(env.DB, userId);
        return json({ token, user: { first, last } }, 201, origin);
      }

      if (request.method === "POST" && path === "/api/login") {
        const body = await readJson(request);
        const first = typeof body?.first === "string" ? body.first.trim() : "";
        const last = typeof body?.last === "string" ? body.last.trim() : "";
        const password = typeof body?.password === "string" ? body.password : "";
        if (!first || !last || !password) return json({ error: "Identifiants incorrects." }, 401, origin);

        const user = await env.DB.prepare(
          "SELECT id, first_name, last_name, password_salt, password_hash FROM users WHERE account_key = ?"
        ).bind(normalizeAccount(first, last)).first();
        if (!user || await passwordHash(password, user.password_salt) !== user.password_hash) {
          return json({ error: "Identifiants incorrects." }, 401, origin);
        }
        const token = await createSession(env.DB, user.id);
        return json({ token, user: { first: user.first_name, last: user.last_name } }, 200, origin);
      }

      const session = await authenticate(request, env.DB);
      if (!session) return json({ error: "Session expirée. Reconnecte-toi." }, 401, origin);

      if (request.method === "POST" && path === "/api/logout") {
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(session.token_hash).run();
        return json({ ok: true }, 200, origin);
      }

      if (request.method === "GET" && path === "/api/appointments") {
        const result = await env.DB.prepare(
          "SELECT id, appointment_date AS date, name, time FROM appointments WHERE user_id = ? ORDER BY appointment_date, time"
        ).bind(session.user_id).all();
        return json({ appointments: result.results || [] }, 200, origin);
      }

      const appointmentMatch = path.match(/^\/api\/appointments\/([A-Za-z0-9_-]{1,100})$/);
      if (appointmentMatch && request.method === "PUT") {
        const body = await readJson(request);
        const date = typeof body?.date === "string" ? body.date : "";
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const time = typeof body?.time === "string" ? body.time : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name || name.length > 500 || time.length > 30) {
          return json({ error: "Rendez-vous invalide." }, 400, origin);
        }
        await env.DB.prepare(
          "INSERT INTO appointments (id, user_id, appointment_date, name, time, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, id) DO UPDATE SET appointment_date = excluded.appointment_date, name = excluded.name, time = excluded.time, updated_at = excluded.updated_at"
        ).bind(appointmentMatch[1], session.user_id, date, name, time, new Date().toISOString()).run();
        return json({ ok: true }, 200, origin);
      }

      if (appointmentMatch && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM appointments WHERE user_id = ? AND id = ?")
          .bind(session.user_id, appointmentMatch[1]).run();
        return json({ ok: true }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch {
      return json({ error: "Erreur du service. Réessaie dans un instant." }, 500, origin);
    }
  }
};
