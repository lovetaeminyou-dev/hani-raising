const $ = (s) => document.querySelector(s);


/* =========================
   메시지
========================= */

function showMessage(el, text, error = false) {
  if (!el) return;

  el.textContent = text;
  el.style.color = error ? "#df5c70" : "#168fbf";
}


/* =========================
   API
========================= */

async function api(path, options = {}) {

  const res = await fetch(path, {
    ...options,

    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });


  const data =
    res.status === 204
      ? {}
      : await res.json();


  if (!res.ok) {

    throw new Error(
      data.detail ||
      data.error ||
      "요청에 실패했습니다."
    );

  }


  return data;
}


/* =========================
   🐰 하니 성장
========================= */

function updateHaniSize(c) {

  const avatar =
    document.querySelector(".avatar");

  if (!avatar) return;


  const bodySize =
    Number(c.bodySize) || 1;


  /*
    몸집 단계에 따라 크기 증가

    1단계 = 기본
    2단계 = 조금 큼
    5단계 = 꽤 큼
    10단계 = 크게
    20단계 = 매우 크게
  */

  const scale =
    Math.min(
      2.2,
      1 + (bodySize - 1) * 0.06
    );


  avatar.style.fontSize =
    `${Math.min(
      58,
      34 + bodySize * 1.2
    )}px`;


  avatar.style.transform =
    `scale(${scale})`;


  avatar.style.transformOrigin =
    "center bottom";


  avatar.style.transition =
    "transform .5s ease, font-size .5s ease";
}


/* =========================
   캐릭터 렌더링
========================= */

function render(c) {

  if (!c) return;


  if ($("#generation")) {
    $("#generation").textContent =
      `토끼콩 · ${c.generation}세대`;
  }


  if ($("#characterName")) {
    $("#characterName").textContent =
      c.characterName;
  }


  if ($("#level")) {
    $("#level").textContent =
      c.level;
  }


  if ($("#points")) {
    $("#points").textContent =
      `${c.points.toLocaleString()}P`;
  }


  if ($("#stamina")) {
    $("#stamina").textContent =
      c.stamina;
  }


  if ($("#fullness")) {
    $("#fullness").textContent =
      c.fullness;
  }


  if ($("#bodySize")) {
    $("#bodySize").textContent =
      c.bodySize;
  }


  if ($("#todayActions")) {
    $("#todayActions").textContent =
      c.todayActions;
  }


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


  if ($("#levelProgress")) {

    $("#levelProgress").style.width =
      `${progress}%`;

  }


  if ($("#nextLevel")) {

    $("#nextLevel").textContent =
      `${Math.max(
        0,
        c.level * 1000 - c.points
      ).toLocaleString()}P`;

  }


  /* 🐰 성장 */

  updateHaniSize(c);
}


/* =========================
   화면 전환
========================= */

function showHome() {

  const home =
    $("#homePage");

  const game =
    $("#gamePage");


  if (home) {
    home.classList.remove("hidden");
  }


  if (game) {
    game.classList.add("hidden");
  }


  document
    .querySelectorAll(".bottom-nav button")
    .forEach(btn => {

      btn.classList.toggle(
        "active",
        btn.dataset.page === "home"
      );

    });
}


function showGames() {

  const home =
    $("#homePage");

  const game =
    $("#gamePage");


  if (home) {
    home.classList.add("hidden");
  }


  if (game) {
    game.classList.remove("hidden");
  }


  document
    .querySelectorAll(".bottom-nav button")
    .forEach(btn => {

      btn.classList.toggle(
        "active",
        btn.dataset.page === "game"
      );

    });


  renderGameList();
}


/* =========================
   게임 목록
========================= */

function renderGameList() {

  const gamePage =
    $("#gamePage");

  if (!gamePage) return;


  gamePage.innerHTML = `

    <main class="game-view">

      <div class="game-title">

        <h2>🎮 하니 게임방</h2>

        <p>
          게임하고 하니력을 올려보세요!
        </p>

      </div>


      <div class="game-grid">


        <button
          class="game-card"
          data-game="홀짝">

          <span class="game-icon">
            🪙
          </span>

          <strong>
            홀짝
          </strong>

          <span>
            간단한 홀짝 게임
          </span>

        </button>


        <button
          class="game-card"
          data-game="사과게임">

          <span class="game-icon">
            🍎
          </span>

          <strong>
            사과게임
          </strong>

          <span>
            사과를 모아보세요
          </span>

        </button>


        <button
          class="game-card"
          data-game="지뢰찾기">

          <span class="game-icon">
            💣
          </span>

          <strong>
            지뢰찾기
          </strong>

          <span>
            지뢰를 피해라!
          </span>

        </button>


        <button
          class="game-card"
          data-game="블록게임">

          <span class="game-icon">
            🧱
          </span>

          <strong>
            블록게임
          </strong>

          <span>
            블록을 맞춰보세요
          </span>

        </button>


        <button
          class="game-card"
          data-game="테트리스">

          <span class="game-icon">
            🟦
          </span>

          <strong>
            싱글 테트리스
          </strong>

          <span>
            블록을 쌓아보세요
          </span>

        </button>


        <button
          class="game-card"
          data-game="오목">

          <span class="game-icon">
            ⚫
          </span>

          <strong>
            오목
          </strong>

          <span>
            하니와 오목 한판!
          </span>

        </button>


        <button
          class="game-card"
          data-game="테트리스대전">

          <span class="game-icon">
            ⚔️
          </span>

          <strong>
            테트리스 대전
          </strong>

          <span>
            친구와 대결
          </span>

        </button>


        <button
          class="game-card"
          data-game="사천성대전">

          <span class="game-icon">
            🀄
          </span>

          <strong>
            사천성 대전
          </strong>

          <span>
            같은 그림을 찾아라
          </span>

        </button>


        <button
          class="game-card"
          data-game="하니도쿠">

          <span class="game-icon">
            🔢
          </span>

          <strong>
            하니도쿠
          </strong>

          <span>
            숫자 퍼즐
          </span>

        </button>


      </div>


      <p
        id="gameMessage"
        class="game-message">
      </p>

    </main>
  `;


  document
    .querySelectorAll(".game-card")
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () => {

          const game =
            btn.dataset.game;


          if (game === "홀짝") {

            startOddEvenGame();

            return;
          }


          const message =
            $("#gameMessage");


          if (message) {

            message.textContent =
              `🎮 ${game}은 준비 중이에요!`;

          }

        }
      );

    });
}


/* =========================
   🪙 홀짝 게임
========================= */

function startOddEvenGame() {

  const gamePage =
    $("#gamePage");

  if (!gamePage) return;


  gamePage.innerHTML = `

    <main class="game-view">


      <div class="game-title">

        <h2>
          🪙 홀짝 게임
        </h2>

        <p>
          숫자가 홀수인지 짝수인지 맞혀보세요!
        </p>

      </div>


      <div class="odd-even-card">


        <div
          class="odd-even-number"
          id="oddEvenNumber">

          ❓

        </div>


        <p id="oddEvenMessage">

          홀 또는 짝을 선택하세요!

        </p>


        <div class="odd-even-buttons">


          <button
            class="odd-even-btn"
            data-answer="odd">

            홀

          </button>


          <button
            class="odd-even-btn"
            data-answer="even">

            짝

          </button>


        </div>


        <button
          id="backToGames"
          class="game-back">

          ← 게임 목록

        </button>


      </div>

    </main>
  `;


  document
    .querySelectorAll(".odd-even-btn")
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () => {

          playOddEven(
            btn.dataset.answer
          );

        }
      );

    });


  $("#backToGames")
    ?.addEventListener(
      "click",
      () => {

        showGames();

      }
    );
}


/* =========================
   홀짝 플레이
========================= */

function playOddEven(answer) {

  const number =
    Math.floor(
      Math.random() * 20
    ) + 1;


  const isEven =
    number % 2 === 0;


  const result =
    isEven
      ? "even"
      : "odd";


  const correct =
    answer === result;


  const numberEl =
    $("#oddEvenNumber");


  const messageEl =
    $("#oddEvenMessage");


  if (numberEl) {

    numberEl.textContent =
      number;

  }


  if (!messageEl) return;


  if (correct) {

    messageEl.innerHTML =
      `
        🎉 <b>정답!</b><br>
        ${number}은(는)
        ${isEven ? "짝수" : "홀수"}예요!<br>
        <strong>+100P</strong>
      `;

  } else {

    messageEl.innerHTML =
      `
        😢 아쉬워요!<br>
        ${number}은(는)
        ${isEven ? "짝수" : "홀수"}예요.
      `;

  }
}


/* =========================
   로그인 후 입장
========================= */

async function enter() {

  try {

    const data =
      await api("/api/me");


    $("#authView")
      ?.classList.add("hidden");


    $("#mainView")
      ?.classList.remove("hidden");


    render(
      data.character
    );


    showHome();

  } catch {

    /*
      로그인되어 있지 않으면
      로그인 화면 유지
    */

  }
}


/* =========================
   로그인 / 처음 시작 탭
========================= */

document
  .querySelectorAll(".tab")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab")
          .forEach(x =>
            x.classList.remove("active")
          );


        btn.classList.add("active");


        const register =
          btn.dataset.tab === "register";


        $("#loginForm")
          ?.classList.toggle(
            "hidden",
            register
          );


        $("#registerForm")
          ?.classList.toggle(
            "hidden",
            !register
          );


        if ($("#authMessage")) {

          $("#authMessage")
            .textContent = "";

        }

      }
    );

  });


/* =========================
   로그인
========================= */

$("#loginForm")
  ?.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      try {

        const data =
          await api(
            "/api/login",
            {
              method: "POST",

              body: JSON.stringify({

                nickname:
                  $("#loginNickname").value,

                pin:
                  $("#loginPin").value

              })

            }
          );


        render(
          data.character
        );


        $("#authView")
          .classList.add("hidden");


        $("#mainView")
          .classList.remove("hidden");


        showHome();


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

$("#registerForm")
  ?.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      try {

        const data =
          await api(
            "/api/register",
            {
              method: "POST",

              body: JSON.stringify({

                nickname:
                  $("#regNickname").value,

                pin:
                  $("#regPin").value,

                characterName:
                  $("#regCharacter").value

              })

            }
          );


        render(
          data.character
        );


        $("#authView")
          .classList.add("hidden");


        $("#mainView")
          .classList.remove("hidden");


        showHome();


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

document
  .querySelectorAll(".action")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      async () => {

        btn.disabled = true;


        try {

          const data =
            await api(
              "/api/action",
              {
                method: "POST",

                body: JSON.stringify({
                  action:
                    btn.dataset.action
                })

              }
            );


          render(
            data.character
          );


          showMessage(
            $("#actionMessage"),
            data.message
          );


          /* 🐰 행동할 때 살짝 통통 */

          const avatar =
            document.querySelector(
              ".avatar"
            );


          if (avatar) {

            avatar.animate(
              [
                {
                  transform:
                    avatar.style.transform
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
                duration: 450,
                easing: "ease-out"
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

      }
    );

  });


/* =========================
   로그아웃
========================= */

$("#logoutBtn")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await api(
          "/api/logout",
          {
            method: "POST"
          }
        );

      } finally {

        location.reload();

      }

    }
  );


/* =========================
   하단 메뉴
========================= */

document
  .querySelectorAll(
    ".bottom-nav button"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        const page =
          btn.dataset.page;


        if (page === "home") {

          showHome();

          return;

        }


        if (page === "game") {

          showGames();

          return;

        }


        /*
          아직 제작하지 않은 메뉴
        */

        document
          .querySelectorAll(
            ".bottom-nav button"
          )
          .forEach(x =>
            x.classList.remove("active")
          );


        btn.classList.add("active");


        alert(
          "이 메뉴는 곧 열립니다 💙"
        );

      }
    );

  });


/* =========================
   시작
========================= */

enter().catch(() => {});
