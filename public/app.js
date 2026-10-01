const $ = (s) => document.querySelector(s);

function showMessage(el, text, error=false) {
  el.textContent = text;
  el.style.color = error ? "#df5c70" : "#168fbf";
}

async function api(path, options={}) {
  const res = await fetch(path, {
    ...options,
    headers: {"content-type":"application/json", ...(options.headers||{})}
  });
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

function render(c) {
  $("#generation").textContent = `토끼콩 · ${c.generation}세대`;
  $("#characterName").textContent = c.characterName;
  $("#level").textContent = c.level;
  $("#points").textContent = `${c.points.toLocaleString()}P`;
  $("#stamina").textContent = c.stamina;
  $("#fullness").textContent = c.fullness;
  $("#bodySize").textContent = c.bodySize;
  $("#todayActions").textContent = c.todayActions;

  const currentBase = (c.level - 1) * 1000;
  const progress = Math.max(0, Math.min(100, ((c.points - currentBase) / 1000) * 100));
  $("#levelProgress").style.width = `${progress}%`;
  $("#nextLevel").textContent = `${Math.max(0, c.level * 1000 - c.points).toLocaleString()}P`;
}

async function enter() {
  const data = await api("/api/me");
  $("#authView").classList.add("hidden");
  $("#mainView").classList.remove("hidden");
  render(data.character);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const register = btn.dataset.tab === "register";
    $("#loginForm").classList.toggle("hidden", register);
    $("#registerForm").classList.toggle("hidden", !register);
    $("#authMessage").textContent = "";
  });
});

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/login", {
      method:"POST",
      body:JSON.stringify({
        nickname:$("#loginNickname").value,
        pin:$("#loginPin").value
      })
    });
    render(data.character);
    $("#authView").classList.add("hidden");
    $("#mainView").classList.remove("hidden");
  } catch (err) {
    showMessage($("#authMessage"), err.message, true);
  }
});

$("#registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("/api/register", {
      method:"POST",
      body:JSON.stringify({
        nickname:$("#regNickname").value,
        pin:$("#regPin").value,
        characterName:$("#regCharacter").value
      })
    });
    render(data.character);
    $("#authView").classList.add("hidden");
    $("#mainView").classList.remove("hidden");
  } catch (err) {
    showMessage($("#authMessage"), err.message, true);
  }
});

document.querySelectorAll(".action").forEach(btn => {
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const data = await api("/api/action", {
        method:"POST",
        body:JSON.stringify({action:btn.dataset.action})
      });
      render(data.character);
      showMessage($("#actionMessage"), data.message);
    } catch (err) {
      showMessage($("#actionMessage"), err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
});

$("#logoutBtn").addEventListener("click", async () => {
  await api("/api/logout", {method:"POST"});
  location.reload();
});

enter().catch(() => {});
