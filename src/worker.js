const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin, saltHex) {
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map(x => parseInt(x, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return `${bytesToHex(salt)}:${bytesToHex(bits)}`;
}

async function verifyPin(pin, stored) {
  const [salt] = stored.split(":");
  return (await hashPin(pin, salt)) === stored;
}

async function sessionUser(request, env) {
  const token = getCookie(request, "hani_session");
  if (!token) return null;
  return await env.DB.prepare(
    `SELECT u.id, u.nickname, c.* FROM sessions s 
     JOIN users u ON u.id=s.user_id 
     JOIN characters c ON c.user_id=u.id 
     WHERE s.token=? AND s.expires_at>datetime('now')`
  ).bind(token).first();
}

function publicCharacter(row) {
  if (!row) return null;
  
  // 레벨별 진화 단계 및 칭호 계산
  const level = row.level || 1;
  let stage = 1;
  let title = "초보 하니";

  if (level >= 10) { stage = 4; title = "⚡ 전설의 각성 하니"; }
  else if (level >= 6) { stage = 3; title = "🪽 날개 달린 하니"; }
  else if (level >= 3) { stage = 2; title = "🐾 두 발로 선 하니"; }
  else { stage = 1; title = "🐰 앙증맞은 아기 하니"; }

  return {
    nickname: row.nickname,
    characterName: row.name,
    generation: row.generation,
    level: row.level,
    points: row.points,
    stamina: row.stamina,
    fullness: row.fullness,
    bodySize: row.body_size,
    evolutionStage: stage,
    title: title,
    todayActions: row.today_actions,
    todayFishing: row.today_fishing
  };
}

async function handleApi(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (!env.DB) return json({ error: "D1 DB binding이 없습니다." }, 500);

  if (request.method === "POST" && path === "/api/register") {
    const b = await request.json(), nickname = String(b.nickname || "").trim(), pin = String(b.pin || "").trim(), characterName = String(b.characterName || "").trim();
    if (!nickname || !characterName || !/^\d{4,6}$/.test(pin)) return json({ error: "닉네임/하니 이름과 4~6자리 숫자 PIN을 입력해주세요." }, 400);
    if (await env.DB.prepare("SELECT id FROM users WHERE nickname=?").bind(nickname).first()) return json({ error: "이미 사용 중인 닉네임입니다." }, 409);
    const r = await env.DB.prepare("INSERT INTO users(nickname,pin_hash) VALUES(?,?)").bind(nickname, await hashPin(pin)).run();
    const id = r.meta.last_row_id;
    await env.DB.prepare("INSERT INTO characters(user_id,name) VALUES(?,?)").bind(id, characterName).run();
    return loginUser(id, env);
  }

  if (request.method === "POST" && path === "/api/login") {
    const b = await request.json(), nickname = String(b.nickname || "").trim(), pin = String(b.pin || "").trim();
    const u = await env.DB.prepare("SELECT id,pin_hash FROM users WHERE nickname=?").bind(nickname).first();
    if (!u || !(await verifyPin(pin, u.pin_hash))) return json({ error: "닉네임 또는 PIN이 맞지 않습니다." }, 401);
    return loginUser(u.id, env);
  }

  if (request.method === "POST" && path === "/api/logout") {
    const token = getCookie(request, "hani_session");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run();
    return new Response(null, { status: 204, headers: { "Set-Cookie": cookie("hani_session", "", 0) } });
  }

  const user = await sessionUser(request, env);
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);

  if (request.method === "GET" && path === "/api/me") return json({ character: publicCharacter(user) });

  // TOP 5 랭킹 조회
  if (request.method === "GET" && path === "/api/rankings") {
    const top5 = await env.DB.prepare(`
      SELECT u.nickname, c.name as characterName, c.level, c.points, c.body_size as bodySize
      FROM characters c JOIN users u ON u.id = c.user_id
      ORDER BY c.points DESC, c.level DESC LIMIT 5
    `).all();

    const rankings = (top5.results || []).map((r, i) => {
      const lvl = r.level || 1;
      let stage = 1, title = "초보 하니";
      if (lvl >= 10) { stage = 4; title = "⚡ 전설의 각성 하니"; }
      else if (lvl >= 6) { stage = 3; title = "🪽 날개 달린 하니"; }
      else if (lvl >= 3) { stage = 2; title = "🐾 두 발로 선 하니"; }
      return { rank: i + 1, ...r, stage, title };
    });

    return json({ rankings });
  }

  // 배틀룸 목록 조회
  if (request.method === "GET" && path === "/api/rooms") {
    const rooms = await env.DB.prepare(`
      SELECT r.*, u.nickname as host_name 
      FROM rooms r JOIN users u ON u.id = r.host_id 
      WHERE r.status='waiting' ORDER BY r.id DESC
    `).all();
    return json({ rooms: rooms.results || [] });
  }

  // 배틀룸 생성
  if (request.method === "POST" && path === "/api/rooms/create") {
    const b = await request.json();
    const title = String(b.title || "즐거운 내기 한판").trim();
    const gameType = String(b.gameType || "사천성");
    const betPoints = Math.max(50, Number(b.betPoints || 100));

    if (user.points < betPoints) return json({ error: "베팅할 포인트가 부족합니다!" }, 400);

    const r = await env.DB.prepare("INSERT INTO rooms(host_id, title, game_type, bet_points) VALUES(?,?,?,?)")
      .bind(user.id, title, gameType, betPoints).run();

    return json({ ok: true, roomId: r.meta.last_row_id });
  }

  // 생활 행동
  if (request.method === "POST" && path === "/api/action") {
    const b = await request.json(), action = b.action;
    const costs = { work: { points: 500, stamina: -8, fullness: -7 }, cook: { points: 0, stamina: -5, fullness: 50 }, rest: { points: 0, stamina: 40, fullness: -4 }, fish: { points: 200, stamina: -3, fullness: -2 } };
    const c = costs[action];
    if (!c) return json({ error: "알 수 없는 행동입니다." }, 400);

    if (user.today_actions >= 20 && action !== "fish") return json({ error: "오늘의 생활 행동 횟수를 모두 사용했습니다." }, 400);
    if (action === "work" && user.stamina < 8) return json({ error: "체력이 부족합니다." }, 400);
    if (action === "cook" && user.stamina < 5) return json({ error: "체력이 부족합니다." }, 400);
    if (action === "rest" && user.stamina >= 100) return json({ error: "체력이 이미 가득합니다." }, 400);
    if (action === "fish" && user.stamina < 3) return json({ error: "체력이 부족합니다." }, 400);

    const points = user.points + c.points;
    const stamina = Math.max(0, Math.min(100, user.stamina + c.stamina));
    const fullness = Math.max(0, Math.min(100, user.fullness + c.fullness));
    const actions = user.today_actions + (action === "fish" ? 0 : 1), fishing = user.today_fishing + (action === "fish" ? 1 : 0);
    const level = Math.max(1, Math.floor(points / 1000) + 1), bodySize = Math.max(1, Math.floor((level - 1) / 3) + 1);

    await env.DB.prepare(`UPDATE characters SET points=?,stamina=?,fullness=?,today_actions=?,today_fishing=?,level=?,body_size=?,updated_at=datetime('now') WHERE user_id=?`)
      .bind(points, stamina, fullness, actions, fishing, level, bodySize, user.id).run();

    return json({ ok: true, message: actionMessage(action, c.points), character: publicCharacter(await sessionUser(request, env)) });
  }

  // 게임 보상
  if (request.method === "POST" && path === "/api/game/reward") {
    const b = await request.json(), game = String(b.game || ""), points = Number(b.points || 0);
    const allowed = { 홀짝: 100, 사과게임: 150, 지뢰찾기: 250, 블록게임: 120, 테트리스: 300, 테트리스대전: 300, 오목: 300, 사천성대전: 500, 하니도쿠: 350 };
    if (!(game in allowed) || points !== allowed[game]) return json({ error: "잘못된 게임 보상입니다." }, 400);

    const day = await env.DB.prepare("SELECT COUNT(*) AS n FROM game_logs WHERE user_id=? AND created_at>=date('now', '+9 hours')").bind(user.id).first();
    if (Number(day?.n || 0) >= 30) return json({ error: "오늘 게임 보상 횟수를 모두 사용했습니다." }, 429);

    await env.DB.prepare("INSERT INTO game_logs(user_id,game,points) VALUES(?,?,?)").bind(user.id, game, points).run();
    const newPoints = user.points + points;
    const level = Math.max(1, Math.floor(newPoints / 1000) + 1), bodySize = Math.max(1, Math.floor((level - 1) / 3) + 1);

    await env.DB.prepare("UPDATE characters SET points=?,level=?,body_size=?,updated_at=datetime('now') WHERE user_id=?").bind(newPoints, level, bodySize, user.id).run();
    return json({ ok: true, character: publicCharacter(await sessionUser(request, env)) });
  }

  return json({ error: "Not found" }, 404);
}

function actionMessage(a, p) {
  if (a === "work") return `일하기 완료! +${p}P`;
  if (a === "cook") return "요리 완료! 포만감이 올라갔어요.";
  if (a === "rest") return "쉬기 완료! 체력이 회복됐어요.";
  if (a === "fish") return `낚시 성공! +${p}P`;
  return "완료!";
}

async function loginUser(userId, env) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,datetime('now','+7 days'))").bind(token, userId).run();
  const row = await env.DB.prepare("SELECT u.nickname,c.* FROM users u JOIN characters c ON c.user_id=u.id WHERE u.id=?").bind(userId).first();
  return new Response(JSON.stringify({ ok: true, character: publicCharacter(row) }), {
    headers: { "content-type": "application/json; charset=utf-8", "Set-Cookie": cookie("hani_session", token, 60 * 60 * 24 * 7) }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (e) {
        return json({ error: "서버 오류가 발생했습니다.", detail: String(e?.message || e) }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
