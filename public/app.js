const $ = (s) => document.querySelector(s);

let currentCharacter = null;
let gameTimer = null;

function showMessage(el, text, error=false){
  if(!el)return;
  el.textContent=text;
  el.style.color=error?"#df5c70":"#168fbf";
}

async function api(path, options={}){
  const res=await fetch(path,{
    ...options,
    headers:{
      "content-type":"application/json",
      ...(options.headers||{})
    }
  });

  const data=res.status===204?{}:await res.json();

  if(!res.ok){
    throw new Error(data.detail||data.error||"요청에 실패했습니다.");
  }

  return data;
}

function updateHaniSize(c){
  const avatar=$(".avatar");
  if(!avatar)return;

  const size=Number(c.bodySize)||1;
  const scale=Math.min(2.15,1+(size-1)*0.065);

  avatar.style.fontSize=`${Math.min(60,34+size*1.25)}px`;
  avatar.style.transform=`scale(${scale})`;
}

function render(c){
  if(!c)return;

  currentCharacter=c;

  if($("#generation"))
    $("#generation").textContent=`토끼콩 · ${c.generation}세대`;

  if($("#characterName"))
    $("#characterName").textContent=c.characterName;

  if($("#level"))
    $("#level").textContent=c.level;

  if($("#points"))
    $("#points").textContent=`${c.points.toLocaleString()}P`;

  if($("#stamina"))
    $("#stamina").textContent=c.stamina;

  if($("#fullness"))
    $("#fullness").textContent=c.fullness;

  if($("#bodySize"))
    $("#bodySize").textContent=c.bodySize;

  if($("#todayActions"))
    $("#todayActions").textContent=c.todayActions;

  const base=(c.level-1)*1000;

  const progress=Math.max(
    0,
    Math.min(100,((c.points-base)/1000)*100)
  );

  if($("#levelProgress"))
    $("#levelProgress").style.width=`${progress}%`;

  if($("#nextLevel"))
    $("#nextLevel").textContent=
      `${Math.max(0,c.level*1000-c.points).toLocaleString()}P`;

  updateHaniSize(c);
}

async function refreshMe(){
  const data=await api("/api/me");
  render(data.character);
  return data.character;
}

function hideAllPages(){
  $("#homePage")?.classList.add("hidden");
  $("#gamePage")?.classList.add("hidden");
  $("#territoryPage")?.classList.add("hidden");
  $("#relationshipPage")?.classList.add("hidden");
  $("#recordPage")?.classList.add("hidden");
}

function setNav(page){
  document
    .querySelectorAll(".bottom-nav button")
    .forEach(b=>b.classList.toggle("active",b.dataset.page===page));
}

function showHome(){
  hideAllPages();
  $("#homePage")?.classList.remove("hidden");
  setNav("home");
}

function showGames(){
  hideAllPages();
  $("#gamePage")?.classList.remove("hidden");
  setNav("game");
  renderGameList();
}

function showSimplePage(page){
  hideAllPages();
  $(`#${page}Page`)?.classList.remove("hidden");
  setNav(page);
}

function backGames(){
  if(gameTimer){
    clearInterval(gameTimer);
    gameTimer=null;
  }

  showGames();
}

function gameHeader(title,desc){
  return `
    <main class="game-view">
      <div class="game-title">
        <h2>${title}</h2>
        <p>${desc}</p>
      </div>
      <div id="gameMount"></div>
    </main>
  `;
}

function renderGameList(){
  const gp=$("#gamePage");
  if(!gp)return;

  gp.innerHTML=`
    <main class="game-view">

      <div class="game-title">
        <h2>🎮 하니 게임방</h2>
        <p>게임하고 하니력을 올려보세요!</p>
      </div>

      <div class="game-grid">

        ${[
          ["홀짝","🪙","랜덤 숫자 맞히기"],
          ["사과게임","🍎","사과를 빠르게 모으기"],
          ["지뢰찾기","💣","지뢰를 피해라"],
          ["블록게임","🧱","같은 색 블록 터뜨리기"],
          ["테트리스","🟦","블록을 쌓아보세요"],
          ["오목","⚫","하니와 오목 한판"],
          ["테트리스대전","⚔️","하니 AI와 대결"],
          ["사천성대전","🀄","같은 패 2개를 연결하기"],
          ["하니도쿠","🔢","숫자 퍼즐"]
        ]
        .map(x=>`
          <button class="game-card" data-game="${x[0]}">
            <span class="game-icon">${x[1]}</span>
            <strong>${x[0]}</strong>
            <span>${x[2]}</span>
          </button>
        `)
        .join("")}

      </div>

      <p id="gameMessage" class="game-message"></p>

    </main>
  `;

  document
    .querySelectorAll(".game-card")
    .forEach(b=>{
      b.addEventListener(
        "click",
        ()=>launchGame(b.dataset.game)
      );
    });
}

function launchGame(game){

  if(game==="홀짝")
    return startOddEven();

  if(game==="사과게임")
    return startApple();

  if(game==="지뢰찾기")
    return startMines();

  if(game==="블록게임")
    return startBlocks();

  if(game==="테트리스")
    return startTetris(false);

  if(game==="테트리스대전")
    return startTetris(true);

  if(game==="오목")
    return startOmok();

  if(game==="사천성대전")
    return startMahjong();

  if(game==="하니도쿠")
    return startSudoku();
}

async function rewardGame(game,points){

  try{

    const data=await api(
      "/api/game/reward",
      {
        method:"POST",
        body:JSON.stringify({
          game,
          points
        })
      }
    );

    render(data.character);

    return true;

  }catch(e){

    const m=$("#gameResult");

    if(m)
      m.textContent=e.message;

    return false;
  }
}

function shell(title,desc,inner){

  const gp=$("#gamePage");

  gp.innerHTML=gameHeader(title,desc);

  $("#gameMount").innerHTML=`
    <div class="game-panel">
      ${inner}
    </div>
  `;
}


/* =========================
   홀짝
========================= */

function startOddEven(){

  shell(
    "🪙 홀짝",
    "맞히면 +100P",
    `
      <div class="big-number" id="oeNum">?</div>

      <div id="gameResult" class="result">
        홀 또는 짝을 선택하세요!
      </div>

      <div class="game-buttons">

        <button class="game-btn" id="oeOdd">
          홀
        </button>

        <button class="game-btn" id="oeEven">
          짝
        </button>

      </div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  $("#oeOdd").onclick=()=>playOE("odd");
  $("#oeEven").onclick=()=>playOE("even");
  $("#gameBack").onclick=backGames;
}

async function playOE(answer){

  const n=Math.floor(Math.random()*20)+1;
  const actual=n%2?"odd":"even";

  $("#oeNum").textContent=n;

  const ok=answer===actual;

  $("#gameResult").innerHTML=
    ok
      ? `🎉 정답! ${n}은 ${
          actual==="odd"?"홀수":"짝수"
        }예요.<br>
        <span class="score">+100P</span>`
      : `😢 ${n}은 ${
          actual==="odd"?"홀수":"짝수"
        }예요.`;

  if(오케이)
    await rewardGame("홀짝",100);
}


/* =========================
   사과게임
========================= */

function startApple(){

  const total=25;

  shell(
    "🍎 사과게임",
    "사과 10개를 15초 안에 눌러보세요! (성공 +150P)",
    `
      <div>
        <span class="status-pill">
          남은 시간 <b id="appleTime">15</b>초
        </span>

        <span class="status-pill">
          수집 <b id="appleCount">0</b>/10
        </span>
      </div>

      <div class="apple-grid" id="appleGrid"></div>

      <div id="gameResult" class="result"></div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  let count=0;
  let time=15;
  let done=false;

  const grid=$("#appleGrid");

  for(let i=0;i<total;i++){

    const b=document.createElement("button");

    b.className="apple";
    b.textContent=i<10?"🍎":"·";
    b.dataset.apple=i<10?"1":"0";

    grid.appendChild(b);
  }

  [...grid.children]
    .sort(()=>Math.random()-.5)
    .forEach(b=>grid.appendChild(b));

  grid
    .querySelectorAll(".apple")
    .forEach(b=>{

      b.onclick=async()=>{

        if(
          done ||
          b.classList.contains("done") ||
          b.dataset.apple!=="1"
        )return;

        b.classList.add("done");
        b.textContent="✓";

        count++;

        $("#appleCount").textContent=count;

        if(count===10){

          done=true;

          clearInterval(gameTimer);

          $("#gameResult").innerHTML=
            "🎉 성공! <span class='score'>+150P</span>";

          await rewardGame("사과게임",150);
        }
      };
    });

  gameTimer=setInterval(async()=>{

    time--;

    $("#appleTime").textContent=time;

    if(time<=0&&!done){

      done=true;

      clearInterval(gameTimer);

      $("#gameResult").textContent="시간 초과!";
    }

  },1000);

  $("#gameBack").onclick=backGames;
}


/* =========================
   지뢰찾기
========================= */

function startMines(){

  const size=8;
  const mines=10;

  shell(
    "💣 지뢰찾기",
    "지뢰를 모두 피하면 +250P",
    `
      <div class="status-pill">
        안전칸을 모두 열어보세요
      </div>

      <div class="mine-grid" id="mineGrid"></div>

      <div id="gameResult" class="result"></div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  const cells=
    Array.from(
      {length:size*size},
      (_,i)=>({
        i,
        m:false,
        o:false
      })
    );

  cells
    .sort(()=>Math.random()-.5)
    .slice(0,mines)
    .forEach(c=>c.m=true);

  const grid=$("#mineGrid");

  let safe=0;
  let lost=false;

  function adjacent(i){

    const r=Math.floor(i/size);
    const col=i%size;

    let n=0;

    for(let dr=-1;dr<=1;dr++){

      for(let dc=-1;dc<=1;dc++){

        if(!dr&&!dc)continue;

        const rr=r+dr;
        const cc=col+dc;

        if(
          rr>=0 &&
          rr<size &&
          cc>=0 &&
          cc<size &&
          cells[rr*size+cc].m
        ){
          n++;
        }
      }
    }

    return n;
  }

  cells.forEach(c=>{

    const b=document.createElement("button");

    b.className="mine";

    b.onclick=async()=>{

      if(lost||c.o)return;

      c.o=true;

      b.classList.add("open");

      if(c.m){

        lost=true;

        b.textContent="💣";

        $("#gameResult").textContent=
          "💥 지뢰를 밟았어요!";

        cells
          .filter(x=>x.m)
          .forEach(x=>{
            grid.children[x.i].textContent="💣";
          });

      }else{

        safe++;

        const n=adjacent(c.i);

        b.textContent=n||"·";

        if(safe===cells.length-mines){

          lost=true;

          $("#gameResult").innerHTML=
            "🎉 클리어! <span class='score'>+250P</span>";

          await rewardGame("지뢰찾기",250);
        }
      }
    };

    grid.appendChild(b);
  });

  $("#gameBack").onclick=backGames;
}


/* =========================
   블록게임
========================= */

function startBlocks(){

  const size=64;
  const target=10;

  shell(
    "🧱 블록게임",
    "파란 블록 10개를 찾아 누르면 +120P",
    `
      <div class="status-pill">
        남은 파란 블록
        <b id="blockLeft">${target}</b>
      </div>

      <div class="block-board" id="blockBoard"></div>

      <div id="gameResult" class="result"></div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  const board=$("#blockBoard");

  const active=new Set();

  while(active.size<target){
    active.add(
      Math.floor(Math.random()*size)
    );
  }

  let hit=0;

  for(let i=0;i<size;i++){

    const b=document.createElement("button");

    b.className="block-cell";

    b.onclick=async()=>{

      if(
        !active.has(i) ||
        b.classList.contains("on")
      )return;

      b.classList.add("on");

      hit++;

      $("#blockLeft").textContent=
        target-hit;

      if(hit===target){

        $("#gameResult").innerHTML=
          "🎉 전부 찾았어요! <span class='score'>+120P</span>";

        await rewardGame("블록게임",120);
      }
    };

    board.appendChild(b);
  }

  $("#gameBack").onclick=backGames;
}


/* =========================
   테트리스
========================= */

function startTetris(battle=false){

  const W=10;
  const H=16;

  shell(
    battle
      ?"⚔️ 테트리스 대전"
      :"🟦 싱글 테트리스",
    "줄을 3개 만들면 +300P",
    `
      <div class="status-pill">
        내 점수
        <b id="tScore">0</b>

        ${
          battle
            ?" · 하니 <b id='aiScore'>0</b>"
            :""
        }
      </div>

      <div class="tetris" id="tetris"></div>

      <div class="tetris-controls">

        <button class="game-btn alt" id="tLeft">
          ◀
        </button>

        <button class="game-btn" id="tDrop">
          ▼
        </button>

        <button class="game-btn alt" id="tRight">
          ▶
        </button>

      </div>

      <div id="gameResult" class="result"></div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  const board=
    Array.from(
      {length:H*W},
      ()=>false
    );

  let score=0;
  let lines=0;
  let aiScore=0;

  let x=4;
  let y=0;

  let ended=false;

  function draw(){

    const el=$("#tetris");

    el.innerHTML="";

    for(let i=0;i<H*W;i++){

      const b=document.createElement("div");

      b.className=
        "tcell"+(board[i]?" fill":"");

      el.appendChild(b);
    }
  }

  function lock(){

    for(let k=0;k<3;k++){

      const yy=y+k;

      if(yy<H){

        board[
          yy*W+
          Math.max(
            0,
            Math.min(
              W-1,
              x+(k%2)
            )
          )
        ]=true;
      }
    }

    score+=10;
    lines++;

    y=0;
    x=4;

    if(lines>=3){

      ended=true;

      score+=270;

      $("#tScore").textContent=score;

      $("#gameResult").innerHTML=
        `🎉 ${
          battle
            ?"대전 승리!"
            :"3줄 완성!"
        }
        <span class='score'>+300P</span>`;

      rewardGame(
        battle
          ?"테트리스대전"
          :"테트리스",
        300
      );

      return;
    }

    draw();
  }

  draw();

  $("#tLeft").onclick=()=>{

    if(!ended)
      x=Math.max(0,x-1);
  };

  $("#tRight").onclick=()=>{

    if(!ended)
      x=Math.min(W-1,x+1);
  };

  $("#tDrop").onclick=()=>{

    if(!ended)
      lock();
  };

  window.onkeydown=(e)=>{

    if(
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown"
      ].includes(e.key)
    ){

      e.preventDefault();

      if(e.key==="ArrowLeft")
        $("#tLeft").click();

      if(e.key==="ArrowRight")
        $("#tRight").click();

      if(e.key==="ArrowDown")
        $("#tDrop").click();
    }
  };

  if(battle){

    aiScore=
      Math.floor(Math.random()*180);

    $("#aiScore").textContent=aiScore;
  }

  $("#gameBack").onclick=()=>{

    window.onkeydown=null;

    backGames();
  };
}


/* =========================
   오목
========================= */

function startOmok(){

  const N=10;

  shell(
    "⚫ 오목",
    "하니와 번갈아 놓아요. 5개를 먼저 연결하면 +300P",
    `
      <div class="status-pill" id="omokStatus">
        내 차례
      </div>

      <div class="omok" id="omok"></div>

      <div id="gameResult" class="result"></div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  const board=Array(N*N).fill(0);

  const el=$("#omok");

  let over=false;

  function draw(){

    el.innerHTML="";

    board.forEach((v,i)=>{

      const b=document.createElement("button");

      b.className=
        v===1
          ?"black"
          :v===2
            ?"white"
            :"";

      b.onclick=()=>player(i);

      el.appendChild(b);
    });
  }

  function win(p){

    for(let i=0;i<board.length;i++){

      if(board[i]!==p)continue;

      const r=Math.floor(i/N);
      const c=i%N;

      for(
        const [dr,dc]
        of [
          [1,0],
          [0,1],
          [1,1],
          [1,-1]
        ]
      ){

        let n=1;

        for(let s=1;s<5;s++){

          const rr=r+dr*s;
          const cc=c+dc*s;

          if(
            rr>=0 &&
            rr<N &&
            cc>=0 &&
            cc<N &&
            board[rr*N+cc]===p
          ){
            n++;
          }else{
            break;
          }
        }

        for(let s=1;s<5;s++){

          const rr=r-dr*s;
          const cc=c-dc*s;

          if(
            rr>=0 &&
            rr<N &&
            cc>=0 &&
            cc<N &&
            board[rr*N+cc]===p
          ){
            n++;
          }else{
            break;
          }
        }

        if(n>=5)
          return true;
      }
    }

    return false;
  }

  async function player(i){

    if(over||board[i])
      return;

    board[i]=1;

    draw();

    if(win(1)){

      over=true;

      $("#omokStatus").textContent="승리!";

      $("#gameResult").innerHTML=
        "🎉 오목 승리! <span class='score'>+300P</span>";

      await rewardGame("오목",300);

      return;
    }

    $("#omokStatus").textContent=
      "하니 생각 중…";

    setTimeout(async()=>{

      if(over)return;

      const empty=
        board
          .map((v,j)=>v?null:j)
          .filter(v=>v!==null);

      if(!empty.length)return;

      const pick=
        empty[
          Math.floor(
            Math.random()*empty.length
          )
        ];

      board[pick]=2;

      draw();

      if(win(2)){

        over=true;

        $("#omokStatus").textContent=
          "하니 승리";

        $("#gameResult").textContent=
          "😢 하니가 이겼어요!";

      }else{

        $("#omokStatus").textContent=
          "내 차례";
      }

    },350);
  }

  draw();

  $("#gameBack").onclick=backGames;
}


/* =========================
   사천성
========================= */

function startMahjong(){

  const ROWS=6;
  const COLS=6;

  const icons=[
    "🐰","🍎","⭐","🍀",
    "🌸","🍒","🍋","🍉",
    "🐱","🐶","🦊","🐼",
    "🍩","🍔","🍓","🥝",
    "🌙","☀️"
  ];

  let tiles=
    [...icons,...icons]
      .sort(()=>Math.random()-.5);

  let selected=[];
  let matched=0;
  let locked=false;

  shell(
    "🀄 사천성 대전",
    "같은 패 두 개를 연결해서 없애세요. 전부 없애면 +500P",
    `
      <div class="status-pill">
        남은 패
        <b id="mahLeft">${tiles.length}</b>
      </div>

      <div class="mahjong-board" id="mahjong"></div>

      <div id="gameResult" class="result">
        같은 그림 두 개를 골라보세요.
      </div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  const boardEl=$("#mahjong");

  function draw(){

    boardEl.innerHTML="";

    tiles.forEach((v,i)=>{

      const b=document.createElement("button");

      b.className=
        "tile"+
        (v===null?" matched":"")+
        (selected.includes(i)?" selected":"");

      b.textContent=v||"";

      b.onclick=()=>pick(i);

      boardEl.appendChild(b);
    });
  }

  function inside(r,c){

    return(
      r>=0 &&
      r<ROWS &&
      c>=0 &&
      c<COLS
    );
  }


  /*
    사천성 연결 판정

    - 직선 연결
    - 1번 꺾기
    - 2번 꺾기
    - 보드 바깥 한 칸까지 통로로 허용

    그래서 가장자리의 같은 꽃도
    실제 사천성처럼 연결할 수 있습니다.
  */

  function canConnect(a,b){

    if(
      a===b ||
      tiles[a]===null ||
      tiles[b]===null ||
      tiles[a]!==tiles[b]
    ){
      return false;
    }

    const sr=Math.floor(a/COLS);
    const sc=a%COLS;

    const tr=Math.floor(b/COLS);
    const tc=b%COLS;

    const dirs=[
      [1,0],
      [-1,0],
      [0,1],
      [0,-1]
    ];

    const minR=-1;
    const maxR=ROWS;

    const minC=-1;
    const maxC=COLS;

    const queue=[];
    const seen=new Map();

    /*
      시작점에서 네 방향으로 출발
    */

    for(let d=0;d<4;d++){

      const nr=sr+dirs[d][0];
      const nc=sc+dirs[d][1];

      if(
        nr<minR ||
        nr>maxR ||
        nc<minC ||
        nc>maxC
      ){
        continue;
      }

      if(
        inside(nr,nc) &&
        !(nr===tr&&nc===tc) &&
        tiles[nr*COLS+nc]!==null
      ){
        continue;
      }

      queue.push([
        nr,
        nc,
        d,
        0
      ]);

      seen.set(
        `${nr},${nc},${d}`,
        0
      );
    }

    while(queue.length){

      const [
        r,
        c,
        dir,
        turns
      ]=queue.shift();

      if(
        r===tr &&
        c===tc
      ){
        return true;
      }

      for(let nd=0;nd<4;nd++){

        const nr=
          r+dirs[nd][0];

        const nc=
          c+dirs[nd][1];

        if(
          nr<minR ||
          nr>maxR ||
          nc<minC ||
          nc>maxC
        ){
          continue;
        }

        const nextTurns=
          turns+
          (nd===dir?0:1);

        if(nextTurns>2)
          continue;

        /*
          빈칸만 통과 가능.
          단, 도착 패는 통과 가능.
        */

        if(
          inside(nr,nc) &&
          !(nr===tr&&nc===tc) &&
          tiles[nr*COLS+nc]!==null
        ){
          continue;
        }

        const key=
          `${nr},${nc},${nd}`;

        const old=seen.get(key);

        if(
          old!==undefined &&
          old<=nextTurns
        ){
          continue;
        }

        seen.set(
          key,
          nextTurns
        );

        queue.push([
          nr,
          nc,
          nd,
          nextTurns
        ]);
      }
    }

    return false;
  }


  function clearPair(a,b){

    tiles[a]=null;
    tiles[b]=null;

    matched+=2;

    $("#mahLeft").textContent=
      String(tiles.length-matched);
  }


  async function pick(i){

    if(
      locked ||
      tiles[i]===null
    ){
      return;
    }

    if(
      selected.length===1 &&
      selected[0]===i
    ){
      return;
    }

    selected.push(i);

    draw();

    if(selected.length<2)
      return;

    const [a,b]=selected;

    selected=[];

    if(
      tiles[a]===tiles[b] &&
      canConnect(a,b)
    ){

      clearPair(a,b);

      draw();

      $("#gameResult").textContent=
        "연결 성공!";

      if(matched===tiles.length){

        locked=true;

        $("#gameResult").innerHTML=
          "🎉 사천성 클리어! <span class='score'>+500P</span>";

        await rewardGame(
          "사천성대전",
          500
        );
      }

    }else{

      locked=true;

      $("#gameResult").textContent=
        "연결할 수 없는 패예요.";

      draw();

      setTimeout(()=>{

        locked=false;

        draw();

        $("#gameResult").textContent=
          "같은 그림 두 개를 골라보세요.";

      },500);
    }
  }

  draw();

  $("#gameBack").onclick=backGames;
}


/* =========================
   하니도쿠
========================= */

function startSudoku(){

  const puzzle=[
    5,3,0,0,7,0,0,0,0,
    6,0,0,1,9,5,0,0,0,
    0,9,8,0,0,0,0,6,0,
    8,0,0,0,6,0,0,0,3,
    4,0,0,8,0,3,0,0,1,
    7,0,0,0,2,0,0,0,6,
    0,6,0,0,0,0,2,8,0,
    0,0,0,4,1,9,0,0,5,
    0,0,0,0,8,0,0,7,9
  ];

  const solution=[
    5,3,4,6,7,8,9,1,2,
    6,7,2,1,9,5,3,4,8,
    1,9,8,3,4,2,5,6,7,
    8,5,9,7,6,1,4,2,3,
    4,2,6,8,5,3,7,9,1,
    7,1,3,9,2,4,8,5,6,
    9,6,1,5,3,7,2,8,4,
    2,8,7,4,1,9,6,3,5,
    3,4,5,2,8,6,1,7,9
  ];

  shell(
    "🔢 하니도쿠",
    "빈칸을 눌러 숫자를 넣고 완성하면 +350P",
    `
      <div class="sudoku" id="sudoku"></div>

      <div id="gameResult" class="result"></div>

      <button class="game-back" id="gameBack">
        ← 게임 목록
      </button>
    `
  );

  const board=$("#sudoku");

  const values=[...puzzle];

  let selected=-1;

  function draw(){

    board.innerHTML="";

    values.forEach((v,i)=>{

      const b=document.createElement("button");

      b.textContent=v||"";

      if(puzzle[i])
        b.classList.add("given");

      if(i===selected)
        b.classList.add("selected");

      b.onclick=()=>{

        if(!puzzle[i]){

          selected=i;

          draw();
        }
      };

      board.appendChild(b);
    });
  }

  function handler(e){

    if(selected<0)
      return;

    const n=Number(e.key);

    if(
      n>=1 &&
      n<=9 &&
      !puzzle[selected]
    ){

      values[selected]=n;

      draw();

      if(
        values.every(
          (v,i)=>v===solution[i]
        )
      ){

        document.removeEventListener(
          "keydown",
          handler
        );

        $("#gameResult").innerHTML=
          "🎉 하니도쿠 완성! <span class='score'>+350P</span>";

        rewardGame(
          "하니도쿠",
          350
        );
      }
    }
  }

  document.addEventListener(
    "keydown",
    handler
  );

  draw();

  $("#gameBack").onclick=()=>{

    document.removeEventListener(
      "keydown",
      handler
    );

    backGames();
  };
}


/* =========================
   로그인 / 회원가입
========================= */

document
  .querySelectorAll(".tab")
  .forEach(btn=>{

    btn.addEventListener("click",()=>{

      document
        .querySelectorAll(".tab")
        .forEach(x=>x.classList.remove("active"));

      btn.classList.add("active");

      const reg=
        btn.dataset.tab==="register";

      $("#loginForm")
        .classList
        .toggle("hidden",reg);

      $("#registerForm")
        .classList
        .toggle("hidden",!reg);

      $("#authMessage").textContent="";
    });
  });


$("#loginForm")?.addEventListener(
  "submit",
  async e=>{

    e.preventDefault();

    try{

      const data=await api(
        "/api/login",
        {
          method:"POST",
          body:JSON.stringify({
            nickname:$("#loginNickname").value,
            pin:$("#loginPin").value
          })
        }
      );

      render(data.character);

      $("#authView").classList.add("hidden");

      $("#mainView").classList.remove("hidden");

      showHome();

    }catch(err){

      showMessage(
        $("#authMessage"),
        err.message,
        true
      );
    }
  }
);


$("#registerForm")?.addEventListener(
  "submit",
  async e=>{

    e.preventDefault();

    try{

      const data=await api(
        "/api/register",
        {
          method:"POST",
          body:JSON.stringify({
            nickname:$("#regNickname").value,
            pin:$("#regPin").value,
            characterName:$("#regCharacter").value
          })
        }
      );

      render(data.character);

      $("#authView").classList.add("hidden");

      $("#mainView").classList.remove("hidden");

      showHome();

    }catch(err){

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
  .forEach(btn=>{

    btn.addEventListener(
      "click",
      async()=>{

        btn.disabled=true;

        try{

          const data=await api(
            "/api/action",
            {
              method:"POST",
              body:JSON.stringify({
                action:btn.dataset.action
              })
            }
          );

          render(data.character);

          showMessage(
            $("#actionMessage"),
            data.message
          );

        }catch(err){

          showMessage(
            $("#actionMessage"),
            err.message,
            true
          );

        }finally{

          btn.disabled=false;
        }
      }
    );
  });


/* =========================
   로그아웃
========================= */

$("#logoutBtn")?.addEventListener(
  "click",
  async()=>{

    try{

      await api(
        "/api/logout",
        {
          method:"POST"
        }
      );

    }finally{

      location.reload();
    }
  }
);


/* =========================
   하단 메뉴
========================= */

document
  .querySelectorAll(".bottom-nav button")
  .forEach(btn=>{

    btn.addEventListener(
      "click",
      ()=>{

        const p=btn.dataset.page;

        if(p==="home")
          showHome();

        else if(p==="game")
          showGames();

        else
          showSimplePage(p);
      }
    );
  });


/* =========================
   자동 로그인
========================= */

async function enter(){

  try{

    const data=await api(
      "/api/me"
    );

    $("#authView")
      .classList
      .add("hidden");

    $("#mainView")
      .classList
      .remove("hidden");

    render(data.character);

    showHome();

  }catch{}
}

enter().catch(()=>{});
