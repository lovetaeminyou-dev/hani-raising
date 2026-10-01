const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const match = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin, saltHex) {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map(x => parseInt(x, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );

  return `${bytesToHex(salt)}:${bytesToHex(bits)}`;
}

async function verifyPin(pin, stored) {
  const [salt] = stored.split(":");
  const candidate = await hashPin(pin, salt);
  return candidate === stored;
}

async function sessionUser(request, env) {
  const token = getCookie(request, "hani_session");
  if (!token) return null;
  const row = await env.DB.prepare(`
    SELECT u.id, u.nickname, c.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN characters c ON c.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first();
  return row || null;
}

function publicCharacter(row) {
  if (!row) return null;
  return {
    nickname: row.nickname,
    characterName: row.name,
    generation: row.generation,
    level: row.level,
    points: row.points,
    stamina: row.stamina,
    fullness: row.fullness,
    bodySize: row.body_size,
    todayActions: row.today_actions,
    todayFishing: row.today_fishing
  };
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!env.DB) return json({ error: "D1 DB binding이 없습니다. wrangler.jsonc를 확인하세요." }, 500);

  if (request.method === "POST" && path === "/api/register") {
    const body = await request.json();
    const nickname = String(body.nickname || "").trim();
    const pin = String(body.pin || "").trim();
    const characterName = String(body.characterName || "").trim();

    if (!nickname || !characterName || !/^\d{4,6}$/.test(pin)) {
      return json({ error: "닉네임/하니 이름과 4~6자리 숫자 PIN을 입력해주세요." }, 400);
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE nickname = ?").bind(nickname).first();
    if (existing) return json({ error: "이미 사용 중인 닉네임입니다." }, 409);

    const pinHash = await hashPin(pin);
    const result = await env.DB.prepare(
      "INSERT INTO users (nickname, pin_hash) VALUES (?, ?)"
    ).bind(nickname, pinHash).run();

    const userId = result.meta.last_row_id;
    await env.DB.prepare(
      "INSERT INTO characters (user_id, name) VALUES (?, ?)"
    ).bind(userId, characterName).run();

    return await loginUser(userId, env);
  }

  if (request.method === "POST" && path === "/api/login") {
    const body = await request.json();
    const nickname = String(body.nickname || "").trim();
    const pin = String(body.pin || "").trim();
    const user = await env.DB.prepare("SELECT id, pin_hash FROM users WHERE nickname = ?").bind(nickname).first();

    if (!user || !(await verifyPin(pin, user.pin_hash))) {
      return json({ error: "닉네임 또는 PIN이 맞지 않습니다." }, 401);
    }
    return await loginUser(user.id, env);
  }

  if (request.method === "POST" && path === "/api/logout") {
    const token = getCookie(request, "hani_session");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return new Response(null, { status: 204, headers: { "Set-Cookie": cookie("hani_session", "", 0) } });
  }

  const user = await sessionUser(request, env);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  if (request.method === "GET" && path === "/api/me") {
    return json({ character: publicCharacter(user) });
  }

  if (request.method === "POST" && path === "/api/action") {
    const body = await request.json();
    const action = body.action;
    const costs = {
      work: { points: 500, stamina: -8, fullness: -7 },
      cook: { points: 0, stamina: -5, fullness: 50 },
      rest: { points: 0, stamina: 40, fullness: -4 },
      fish: { points: 200, stamina: -3, fullness: -2 }
    };
    const c = costs[action];
    if (!c) return json({ error: "알 수 없는 행동입니다." }, 400);

    if (user.today_actions >= 20 && action !== "fish") {
      return json({ error: "오늘의 생활 행동 횟수를 모두 사용했습니다." }, 400);
    }

    if (action === "work" && user.stamina < 8) return json({ error: "체력이 부족합니다." }, 400);
    if (action === "cook" && user.stamina < 5) return json({ error: "체력이 부족합니다." }, 400);
    if (action === "rest" && user.stamina >= 100) return json({ error: "체력이 이미 가득합니다." }, 400);
    if (action === "fish" && user.stamina < 3) return json({ error: "체력이 부족합니다." }, 400);

    let points = user.points + c.points;
    let stamina = Math.max(0, Math.min(100, user.stamina + c.stamina));
    let fullness = Math.max(0, Math.min(100, user.fullness + c.fullness));
    let actions = user.today_actions + (action === "fish" ? 0 : 1);
    let fishing = user.today_fishing + (action === "fish" ? 1 : 0);

    // 1차 버전: 1레벨당 1000P를 기준으로 레벨을 계산.
    const level = Math.max(1, Math.floor(points / 1000) + 1);
    const bodySize = Math.max(1, Math.floor(level / 5) + 1);

    await env.DB.prepare(`
      UPDATE characters
      SET points=?, stamina=?, fullness=?, today_actions=?, today_fishing=?,
          level=?, body_size=?, updated_at=datetime('now')
      WHERE user_id=?
    `).bind(points, stamina, fullness, actions, fishing, level, bodySize, user.id).run();

    const fresh = await sessionUser(request, env);
    return json({ ok: true, message: actionMessage(action, c.points), character: publicCharacter(fresh) });
  }

  return json({ error: "Not found" }, 404);
}

function actionMessage(action, points) {
  if (action === "work") return `일하기 완료! +${points}P`;
  if (action === "cook") return "요리 완료! 포만감이 올라갔어요.";
  if (action === "rest") return "쉬기 완료! 체력이 회복됐어요.";
  if (action === "fish") return `낚시 성공! +${points}P`;
  return "완료!";
}

async function loginUser(userId, env) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))")
    .bind(token, userId).run();
  const row = await env.DB.prepare(`
    SELECT u.nickname, c.* FROM users u JOIN characters c ON c.user_id=u.id WHERE u.id=?
  `).bind(userId).first();

  return new Response(JSON.stringify({ ok: true, character: publicCharacter(row) }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Set-Cookie": cookie("hani_session", token, 60 * 60 * 24 * 7)
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (error) {
        return json({ error: "서버 오류가 발생했습니다.", detail: String(error?.message || error) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
