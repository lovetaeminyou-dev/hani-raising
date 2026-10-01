const $ = (s) => document.querySelector(s);

function showMessage(el, text, error=false) {
  el.textContent = text;
  el.style.color = error ? "#df5c70" : "#168fbf";
}

async function api(path, options={}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "content-type":"application/json",
      ...(options.headers||{})
    }
  });

  const data = res.status === 204 ? {} : await res.json();

  if (!res.ok) {
    throw new Error(
      data.detail || data.error || "요청에 실패했습니다."
    );
  }

  return data;
}


/* =========================
   하니 성장 표시
========================= */

function updateHaniSize(c) {
  const avatar = document.querySelector(".avatar");

  if (!avatar) return;

  /*
    bodySize가 커질수록 토끼가 커짐
    1 = 기본 크기
    5 = 조금 큼
    10 = 많이 큼
    20 이상 = 대형
  */

  const size = Math.min(
    2.6,
    0.9 + ((Number(c.bodySize) || 1) * 0.11)
  );

  avatar.style.transform = `scale(${size})`;
  avatar.style.transformOrigin = "center bottom";
  avatar.style.transition = "transform 0.5s ease";

  /*
    성장 단계에 따라 토끼 크기 느낌도 조금씩 변경
  */
  if (c.bodySize >= 20) {
    avatar.style.fontSize = "50px";
  } else if (c.bodySize >= 10) {
    avatar.style.fontSize = "44px";
  } else if (c.bodySize >= 5) {
    avatar.style.fontSize = "39px";
  } else {
    avatar.style.fontSize = "34px";
  }
}


/* =========================
   캐릭터 화면
========================= */

function render(c) {
  $("#generation").textContent =
    `토끼콩 · ${c.generation}세대`;

  $("#characterName").textContent =
    c.characterName;

  $("#level").textContent =
    c.level;

  $("#points").textContent =
    `${c.points.toLocaleString()}P`;

  $("#stamina").textContent =
    c.stamina;

  $("#fullness").textContent =
    c.fullness;

  $("#bodySize").textContent =
    c.bodySize;

  $("#todayActions").textContent =
    c.todayActions;


  /* 레벨 진행도 */

  const currentBase =
    (c.level - 1) * 1000;

  const progress =
    Math.max(
      0,
      Math.min(
        100,
        ((c.points - currentBase) / 1000) * 100
      )
    );

  $("#levelProgress").style.width =
    `${progress}%`;

  $("#nextLevel").textContent =
    `${Math.max(
      0,
      c.level * 1000 - c.points
    ).toLocaleString()}P`;


  /* 🐰 토끼 성장 */

  updateHaniSize(c);
}


/* =========================
   로그인 후 입장
========================= */

async function enter() {
  const data = await api("/api/me");

  $("#authView").classList.add("hidden");
  $("#mainView").classList.remove("hidden");

  render(data.character);
}


/* =========================
   로그인 / 처음 시작 탭
========================= */

document.querySelectorAll(".tab").forEach(btn => {

  btn.addEventListener("click", () => {

    document
      .querySelectorAll(".tab")
      .forEach(x =>
        x.classList.remove("active")
      );

    btn.classList.add("active");

    const register =
      btn.dataset.tab === "register";

    $("#loginForm")
      .classList.toggle("hidden", register);

    $("#registerForm")
      .classList.toggle("hidden", !register);

    $("#authMessage").textContent = "";
  });

});


/* =========================
   로그인
========================= */

$("#loginForm").addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    try {

      const data = await api(
        "/api/login",
        {
          method:"POST",

          body:JSON.stringify({
            nickname:
              $("#loginNickname").value,

            pin:
              $("#loginPin").value
          })
        }
      );

      render(data.character);

      $("#authView")
        .classList.add("hidden");

      $("#mainView")
        .classList.remove("hidden");

    } catch (err) {

      showMessage(
        $("#authMessage"),
        err.message,
        true
      );
    }
  }
);


/* =========================
   처음 하니 만들기
========================= */

$("#registerForm").addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    try {

      const data = await api(
        "/api/register",
        {
          method:"POST",

          body:JSON.stringify({
            nickname:
              $("#regNickname").value,

            pin:
              $("#regPin").value,

            characterName:
              $("#regCharacter").value
          })
        }
      );

      render(data.character);

      $("#authView")
        .classList.add("hidden");

      $("#mainView")
        .classList.remove("hidden");

    } catch (err) {

      showMessage(
        $("#authMessage"),
        err.message,
        true
      );
    }
  }
);


/* =========================
   생활 행동
========================= */

document.querySelectorAll(".action").forEach(btn => {

  btn.addEventListener("click", async () => {

    btn.disabled = true;

    try {

      const data = await api(
        "/api/action",
        {
          method:"POST",

          body:JSON.stringify({
            action:
              btn.dataset.action
          })
        }
      );

      render(data.character);

      showMessage(
        $("#actionMessage"),
        data.message
      );


      /* 🐰 행동 후 토끼 통통 */

      const avatar =
        document.querySelector(".avatar");

      if (avatar) {

        avatar.animate(
          [
            {
              transform:
                avatar.style.transform +
                " scale(1)"
            },

            {
              transform:
                avatar.style.transform +
                " scale(1.08)"
            },

            {
              transform:
                avatar.style.transform
            }
          ],
          {
            duration:450,
            easing:"ease-out"
          }
        );
      }

    } catch (err) {

      showMessage(
        $("#actionMessage"),
        err.message,
        true
      );

    } finally {

      btn.disabled = false;
    }
  });

});


/* =========================
   로그아웃
========================= */

$("#logoutBtn").addEventListener(
  "click",
  async () => {

    await api(
      "/api/logout",
      {
        method:"POST"
      }
    );

    location.reload();
  }
);


/* =========================
   시작
========================= */

enter().catch(() => {});
