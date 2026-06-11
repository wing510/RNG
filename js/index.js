const allowedUsers = [
  {
    userHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    passHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
  },
  {
    userHash: "04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb",
    passHash: "5c6f27572d264f85dd4305770593a184db43b386b1109a264170f577761ab16c"
  },
  {
    userHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    passHash: "5c6f27572d264f85dd4305770593a184db43b386b1109a264170f577761ab16c"
  }
];

const isFile = location.protocol === "file:";
const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const userDisplay = document.getElementById("userDisplay");
const frame = document.getElementById("toolFrame");

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function getCurrentUser() {
  return isFile ? "local-test" : sessionStorage.getItem("loggedInUser");
}

function sendUserToFrame() {
  const user = getCurrentUser();
  if (!user || !frame || !frame.contentWindow) return;
  frame.contentWindow.postMessage({ type: "SET_ACCOUNT", account: user }, "*");
}

function sendLangToFrame() {
  if (!frame || !frame.contentWindow || !window.I18n) return;
  frame.contentWindow.postMessage({ type: "SET_LANG", lang: I18n.getLang() }, "*");
}

function syncFrameContext() {
  sendUserToFrame();
  sendLangToFrame();
}

function showApp(user) {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  updateUserDisplay(user);
  syncFrameContext();
}

function updateUserDisplay(user) {
  if (!userDisplay) return;
  userDisplay.textContent = I18n.t("index.userPrefix", { name: user });
}

function showLogin() {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

const loginForm = document.getElementById("loginForm");
const errorDiv = document.getElementById("error");

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  errorDiv.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    errorDiv.textContent = I18n.t("index.errEmpty");
    return;
  }

  const usernameHash = await sha256(username);
  const passwordHash = await sha256(password);
  const user = allowedUsers.find(
    u => u.userHash === usernameHash && u.passHash === passwordHash
  );

  if (user) {
    sessionStorage.setItem("loggedInUser", username);
    showApp(username);
    loginForm.reset();
  } else {
    errorDiv.textContent = I18n.t("index.errInvalid");
  }
});

document.getElementById("logoutBtn").onclick = () => {
  if (!isFile) sessionStorage.removeItem("loggedInUser");
  showLogin();
};

document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    frame.src = btn.dataset.target;
    document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

frame.addEventListener("load", syncFrameContext);
window.addEventListener("load", () => setTimeout(syncFrameContext, 500));

window.addEventListener("message", e => {
  if (!e.data || e.data.type !== "SET_LANG") return;
  if (window.I18n) I18n.setLang(e.data.lang, false);
});

I18n.onChange(() => {
  const user = getCurrentUser();
  if (user && userDisplay && !appView.classList.contains("hidden")) {
    updateUserDisplay(user);
  }
  sendLangToFrame();
});

const savedUser = getCurrentUser();
if (savedUser) {
  showApp(savedUser);
} else {
  showLogin();
}
