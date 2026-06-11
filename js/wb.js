const PRICE_BIG = 1.6;
const PRICE_SMALL = 0.7;

// ===== 接收 main 傳來的帳號 =====
let CURRENT_ACCOUNT = "default";

window.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "SET_ACCOUNT") return;
  CURRENT_ACCOUNT = e.data.account || "default";
  console.log("WB account set to:", CURRENT_ACCOUNT);

  restoreLastConfig(); // ✅ 帳號確定後才拉資料
});


/* R排列數用不到了，但先保留 */
function getRMultiplierFromNumber(numStr) {
  if (!numStr) return 1;
  const s = String(numStr).padStart(4, "0").slice(-4);
  const freq = {};
  for (const ch of s) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const counts = Object.values(freq);

  function fact(n) {
    if (n <= 1) return 1;
    if (n === 2) return 2;
    if (n === 3) return 6;
    if (n === 4) return 24;
    return 1;
  }
  let denom = 1;
  counts.forEach(c => denom *= fact(c));
  const total = fact(4) / denom;
  return total || 1;
}

// 展開 R → 所有不重複排列
function permR(code) {
  const s = String(code).padStart(4, "0").slice(-4);
  const chars = s.split("").sort();
  const used = new Array(chars.length).fill(false);
  const res = new Set();

  (function dfs(path) {
    if (path.length === chars.length) {
      res.add(path.join(""));
      return;
    }
    for (let i = 0; i < chars.length; i++) {
      if (used[i]) continue;
      if (i > 0 && chars[i] === chars[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      path.push(chars[i]);
      dfs(path);
      path.pop();
      used[i] = false;
    }
  })([]);

  return Array.from(res);
}

/* 說明展開/收合 */
function toggleNote(id, btnEl) {
  const note = document.getElementById(id);
  if (!note) return;
  if (note.classList.contains('hidden')) {
    note.classList.remove('hidden');
    btnEl.textContent = I18n.t('toggle.close');
  } else {
    note.classList.add('hidden');
    btnEl.textContent = I18n.t('toggle.open');
  }
}

/* 全域變數 & DOM */
const webTableBody = document.querySelector('#web-table tbody');
const binTableBody = document.querySelector('#bin-table tbody');

makeTableDraggable(webTableBody, saveLastConfig);
makeTableDraggable(binTableBody, saveLastConfig);

const redFileInput = document.getElementById('red-file');
const otherFileInput = document.getElementById('other-file');
const otherWeekInput = document.getElementById('other-week');

const allocateBtn = document.getElementById('allocate-btn');
const downloadAllRarBtn = document.getElementById('download-all-rar-btn');
const summaryArea = document.getElementById('summary-area');

let redFileContent = '';
let otherFileContent = '';
let lastOutputs = null;

/* ✅ WB 分配結果暫存（sessionStorage）
   設定（Web / Bin）已改為存 Google Sheet（v25） */
const STORAGE_KEY = "wbv24_last_config"; // 已停用（保留不刪）
const RESULT_KEY  = "wbv24_last_outputs";      // 新增：分配結果用 sessionStorage

/* 星期必填 */
function validateWeekRequired() {
  const week = otherWeekInput.value.trim();
  if (week === "") {
    alert(I18n.t("wb.errWeek"));
    return false;
  }
  return true;
}

/* 其他字 TXT 必須上傳 */
function validateOtherFileRequired() {
  if (!otherFileContent || otherFileContent.trim() === "") {
    alert(I18n.t("wb.errOtherFile"));
    return false;
  }
  return true;
}

/* 工具函式 */
function rand() { return Math.random(); }

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function bigSmallDash(b, s) {
  b = b || 0;
  s = s || 0;
  if (b > 0 && s > 0) return `${b}-${s}`;
  if (b > 0 && s == 0) return `${b}-`;
  if (b == 0 && s > 0) return `-${s}`;
  return `-`;
}

function formatKeyLine(r) {
  return `${r.num} ${bigSmallDash(r.big, r.small)}`;
}

function padLeft(str, width) {
  str = String(str);
  if (str.length >= width) return str;
  return " ".repeat(width - str.length) + str;
}

function formatAraLine(r, araIdOverride) {
  const dateStr = r.date || "";
  let araId = araIdOverride || r.araId || "";
  const b = r.big || 0;
  const s = r.small || 0;

  const bigField   = b > 0 ? padLeft(b, 4) : "    ";
  const smallField = s > 0 ? padLeft(s, 3) : "   ";

  if (araId.length < 4) {
    araId = araId + " ".repeat(4 - araId.length);
  }
  return `${dateStr}+${r.num}+${bigField}+${smallField}+${araId}*1|N`;
}

/* TG Cnt 解析 & 分組 */
function parseTgCntRange(tgCntRaw) {
  const s = (tgCntRaw || "").trim();
  if (!s || s === "0") return null;

  const mRange = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (mRange) {
    const minG = parseInt(mRange[1], 10);
    const maxG = parseInt(mRange[2], 10);
    if (minG >= 1 && maxG >= minG) return [minG, maxG];
    throw new Error("TG Cnt 範圍不合法，需 >=1 且 max>=min");
  }
  const mNum = s.match(/^\d+$/);
  if (mNum) {
    const v = parseInt(s, 10);
    if (v >= 1) return [v, v];
  }
  throw new Error("TG Cnt 格式必須是單一數字(如 8) 或範圍(如 7-10)");
}

function parseTgLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length >= 4) {
    return {
      prefix: parts[0] + " " + parts[1],
      code: parts[2],
      marker: parts[3]
    };
  }
  const m = line.trim().match(/^(\S+\s+\S+)\s+(\S+)\s+(\S+)\s*$/);
  if (m) return { prefix: m[1], code: m[2], marker: m[3] };
  return null;
}

function combineTgSlice(lines, startIdx, count, badLines) {
  const slice = lines.slice(startIdx, startIdx + count);
  const parsed = [];
  for (const raw of slice) {
    const p = parseTgLine(raw);
    if (p) parsed.push(p);
    else badLines.push(raw);
  }
  if (parsed.length === 0) return null;

  const prefix = parsed[0].prefix;
  const groups = [];
  const seen = new Map();

  for (const item of parsed) {
    const { code, marker } = item;
    if (!seen.has(marker)) {
      seen.set(marker, groups.length);
      groups.push({ marker, codes: [] });
    }
    groups[seen.get(marker)].codes.push(code);
  }

  const out = [prefix];
  for (const g of groups) {
    out.push(g.codes.join(" "));
    out.push(g.marker);
  }
  return out.join(" ").trim();
}

function groupTgLines(lines, tgCntRaw) {
  let range;
  try {
    range = parseTgCntRange(tgCntRaw);
  } catch (e) {
    alert(e.message || e);
    return lines;
  }
  if (!range) return lines;

  const [minG, maxG] = range;
  let i = 0;
  const results = [];
  const badLines = [];

  while (i < lines.length) {
    const remaining = lines.length - i;
    let groupSize;

    if (remaining < minG) {
      groupSize = remaining;
    } else {
      groupSize = Math.min(
        remaining,
        Math.floor(rand() * (maxG - minG + 1)) + minG
      );
    }
    const combined = combineTgSlice(lines, i, groupSize, badLines);
    if (combined) results.push(combined);
    i += groupSize;
  }

  if (badLines.length) {
    console.warn("TG grouping bad lines:", badLines);
  }
  return results;
}

/* 建立 Web / Bin 列 */
function createWebRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="drag-handle-cell"><span class="drag-handle" draggable="true" title="${I18n.t('wb.dragSort')}">☰</span></td>
    <td><input type="text" class="web-co-name"></td>
    <td><input type="text" class="web-ara-id"></td>
    <td><input type="text" class="web-tg-id"></td>
    <td>
      <select class="web-tg-format">
        <option value="dateFirst">${I18n.t('wb.tgFmtWeekId')}</option>
        <option value="tgFirst">${I18n.t('wb.tgFmtIdWeek')}</option>
      </select>
    </td>
    <td class="uniform-cell">
      <input type="text" class="web-tg-cnt">
    </td>
    <td class="uniform-cell">
      <div class="kta-row">
        <input type="number" class="kta kta-key" placeholder="Key" step="1" min="0" max="100">
        <input type="number" class="kta kta-tg"  placeholder="TG"  step="1" min="0" max="100">
        <input type="number" class="kta kta-ara" placeholder="ARA" step="1" min="0" max="100">
      </div>
    </td>
    <td class="uniform-cell">
      <input type="number" class="web-red" step="1" min="0" max="100">
    </td>
    <td class="uniform-cell">
      <input type="number" class="web-other" step="1" min="0" max="100">
    </td>
    <td><button class="btn btn-danger btn-delete-row">${I18n.t('wb.del')}</button></td>
  `;
  tr.querySelector(".btn-delete-row").onclick = () => tr.remove();
  return tr;
}

function createBinRow() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="drag-handle-cell"><span class="drag-handle" draggable="true" title="${I18n.t('wb.dragSort')}">☰</span></td>
    <td class="bin-uniform"><input type="text" class="bin-co-name"></td>
    <td class="bin-uniform"><input type="text" class="bin-ara-id"></td>
    <td class="bin-uniform"><input type="number" class="bin-other-percent" step="1" min="0" max="100"></td>
    <td class="delete-cell"><button class="btn btn-danger btn-delete-row">${I18n.t('wb.del')}</button></td>
  `;
  tr.querySelector(".btn-delete-row").onclick = () => tr.remove();
  return tr;
}

/* 讓表格支援拖曳排序（僅拖曳把手） */
function makeTableDraggable(tbody, onReorder) {
  let draggingRow = null;
  let didMove = false;

  tbody.addEventListener("dragstart", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) {
      e.preventDefault();
      return;
    }
    const tr = handle.closest("tr");
    if (!tr) return;
    draggingRow = tr;
    didMove = false;
    tr.classList.add("dragging-row");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    }
  });

  tbody.addEventListener("dragover", (e) => {
    if (!draggingRow) return;
    e.preventDefault();
    const tr = e.target.closest("tr");
    if (!tr || tr === draggingRow) return;

    const rect = tr.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const middle = rect.height / 2;

    const nextRef = offset < middle ? tr : tr.nextSibling;
    if (draggingRow.nextSibling !== nextRef && draggingRow !== nextRef) {
      tbody.insertBefore(draggingRow, nextRef);
      didMove = true;
    }
  });

  tbody.addEventListener("dragend", () => {
    if (draggingRow) {
      draggingRow.classList.remove("dragging-row");
      draggingRow = null;
    }
    if (didMove && typeof onReorder === "function") {
      onReorder();
    }
    didMove = false;
  });

  tbody.addEventListener("drop", (e) => {
    e.preventDefault();
  });
}


/* ===============================
   WB v25：設定改存 Google Sheet
   =============================== */

/** 🔴 請換成你的 Apps Script Web App URL */
const GS_ENDPOINT = "https://script.google.com/macros/s/AKfycbynAmFVY909NSpzLxzOx4hM-gSSPna5z0djYsvwisqlueYWCe5lMzWc2nf5zL095Ic-/exec";

async function saveLastConfig() {
  const cfg = getCurrentConfig();

  // ✅ 取得登入帳號
  const payload = {
    project: "WB",
    version: "v25",
    account: CURRENT_ACCOUNT,
    settings: {
      web: cfg.web,
      bin: cfg.bin
    }
  };

  try {
await fetch(GS_ENDPOINT, {
  method: "POST",
  body: JSON.stringify(payload)
});

  } catch (e) {
    console.warn("WB：儲存設定到 Google Sheet 失敗", e);
  }
}

async function restoreLastConfig() {

  // ===== 顯示雲端讀取動畫 =====
const overlay = document.getElementById("cloud-overlay");
if (overlay) overlay.classList.remove("hidden");

  try {
const res = await fetch(
  `${GS_ENDPOINT}?project=WB&version=v25&account=${encodeURIComponent(CURRENT_ACCOUNT)}`
);

    const data = await res.json();

    if (!data || !data.settings) {
      return false;
    }

    const { web, bin } = data.settings;

    // 清空表格
    webTableBody.innerHTML = "";
    binTableBody.innerHTML = "";

    // 還原 Web 設定
    (web || []).forEach(w => {
      const tr = createWebRow();
      tr.querySelector(".web-co-name").value   = w.coName || "";
      tr.querySelector(".web-ara-id").value    = w.araId  || "";
      tr.querySelector(".web-tg-id").value     = w.tgId   || "";
      tr.querySelector(".web-tg-format").value = w.tgFormat || "dateFirst";
      tr.querySelector(".web-tg-cnt").value    = w.tgCnt || "";
      tr.querySelector(".kta-key").value       = w.keyVal || "";
      tr.querySelector(".kta-tg").value        = w.tgVal || "";
      tr.querySelector(".kta-ara").value       = w.araVal || "";
      tr.querySelector(".web-red").value       = w.redPercent || "";
      tr.querySelector(".web-other").value     = w.otherPercent || "";
      webTableBody.appendChild(tr);
    });

    // 還原 Bin 設定
    (bin || []).forEach(b => {
      const tr = createBinRow();
      tr.querySelector(".bin-co-name").value       = b.coName || "";
      tr.querySelector(".bin-ara-id").value        = b.araId || "";
      tr.querySelector(".bin-other-percent").value = b.otherPercent || "";
      binTableBody.appendChild(tr);
    });

    // 更新即時百分比顯示（如果有）
    if (typeof updatePercentLiveHint === "function") {
      updatePercentLiveHint();
    }

    return true;

  } catch (e) {
    console.warn("WB: Failed to load cloud settings", e);
    return false;

  } finally {
    // ===== 不管成功或失敗，一定關掉動畫 =====
   if (overlay) overlay.classList.add("hidden");
  }
}

/* ✅ 新增：WB 分配結果存到 sessionStorage（關掉瀏覽器就清掉） */
function saveAllocationResults() {
  if (!lastOutputs) return;
  const payload = {
    outputs: lastOutputs,
    summaryHtml: summaryArea.innerHTML || "",
    redFileContent: redFileContent || "",
    otherFileContent: otherFileContent || "",
    week: otherWeekInput.value || "",
    ts: Date.now()
  };
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("WB：儲存分配結果失敗", e);
  }
}

function restoreAllocationResults() {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.outputs) return;

    lastOutputs = data.outputs;
    summaryArea.innerHTML = data.summaryHtml || "";
    redFileContent   = data.redFileContent   || "";
    otherFileContent = data.otherFileContent || "";
    if (typeof data.week === "string" || typeof data.week === "number") {
      otherWeekInput.value = data.week;
    }
    if (lastOutputs) {
      downloadAllRarBtn.disabled = false;
    }
  } catch (e) {
    console.warn("WB：還原分配結果失敗", e);
  }
}

/* 上傳紅字 / 其他字 */
redFileInput.addEventListener("change", e => {
  const f = e.target.files[0];
  redFileContent = "";
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    redFileContent = reader.result || "";
  };
  reader.readAsText(f, "utf-8");
});

otherFileInput.addEventListener("change", e => {
  const f = e.target.files[0];
  otherFileContent = "";
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    otherFileContent = reader.result || "";
  };
  reader.readAsText(f, "utf-8");
});

/* 解析紅字 */
function parseRedNumbers(cfg) {
  const res = [];
  const txt = cfg.red.content || "";

  const overrideBig =
    cfg.red.big !== undefined && cfg.red.big !== "" ? Number(cfg.red.big) : null;
  const overrideSmall =
    cfg.red.small !== undefined && cfg.red.small !== "" ? Number(cfg.red.small) : null;

  txt.split(/\r?\n/).forEach(line => {
    const s = line.trim();
    if (!s) return;

    const parts = s.split(/\s+/);
    const numOnly = parts[0];

    if (!/^\d{4}$/.test(numOnly)) return;

    let originalBig = 0;
    let originalSmall = 0;

    if (parts.length >= 3) {
      const b = Number(parts[1]);
      const sm = Number(parts[2]);
      if (!Number.isNaN(b)) originalBig = b;
      if (!Number.isNaN(sm)) originalSmall = sm;
    }

    res.push({
      num: numOnly,
      baseNum: numOnly,
      displayNum: numOnly,
      big: overrideBig !== null ? overrideBig : originalBig,
      small: overrideSmall !== null ? overrideSmall : originalSmall,
      isRed: true,
      isRoll: false
    });
  });
  return res;
}

/* 解析其他字（含 r） */
function parseOtherNumbers(cfg) {
  const res = [];
  const txt = cfg.other.content || "";

  txt.split(/\r?\n/).forEach(line => {
    const s = line.trim();
    if (!s) return;

    const parts = s.split(/\s+/);
    if (parts.length < 3) return;

    let head = parts[0];
    let bigStr = parts[1];
    let smallStr = parts[2];

    let isRoll = false;
    let baseNum = "";

    if (/^\d{4}r$/i.test(head)) {
      isRoll = true;
      baseNum = head.slice(0, 4);
    } else if (/^\d{4}$/.test(head)) {
      baseNum = head;
    } else {
      return;
    }

    const big = Number(bigStr);
    const small = Number(smallStr);
    if (Number.isNaN(big) || Number.isNaN(small)) return;

    res.push({
      num: head,
      displayNum: head,
      baseNum,
      big,
      small,
      isRed: false,
      isRoll
    });
  });

  return res;
}

/* 取得 Web / Bin 設定 */
function getCurrentConfig() {
  const web = [...webTableBody.querySelectorAll("tr")].map(tr => ({
    coName: tr.querySelector(".web-co-name").value.trim(),
    araId:  tr.querySelector(".web-ara-id").value.trim(),
    tgId:   tr.querySelector(".web-tg-id").value.trim(),
    tgFormat: tr.querySelector(".web-tg-format").value,
    tgCnt: tr.querySelector(".web-tg-cnt").value.trim(),
    keyVal:   tr.querySelector(".kta-key").value,
    tgVal:    tr.querySelector(".kta-tg").value,
    araVal:   tr.querySelector(".kta-ara").value,
    redPercent:   tr.querySelector(".web-red").value,
    otherPercent: tr.querySelector(".web-other").value
  }));

  const bin = [...binTableBody.querySelectorAll("tr")].map(tr => ({
    coName: tr.querySelector(".bin-co-name").value.trim(),
    araId:  tr.querySelector(".bin-ara-id").value.trim(),
    otherPercent: tr.querySelector(".bin-other-percent").value
  }));

  return {
    web,
    bin,
    red: {
      content: redFileContent
    },
    other: {
      content: otherFileContent,
      week: otherWeekInput.value
    }
  };
}

/* 檢查百分比（不再 throw，改回傳 false） */
function validatePercents(cfg) {
  const epsilon = 0.001;
  let sumRed = 0;
  let sumOther = 0;

  for (let idx = 0; idx < cfg.web.length; idx++) {
    const w = cfg.web[idx];
    const r = w.redPercent ? Number(w.redPercent) : 0;
    const o = w.otherPercent ? Number(w.otherPercent) : 0;
    sumRed += r;
    sumOther += o;

    const key = w.keyVal ? Number(w.keyVal) : 0;
    const tg  = w.tgVal  ? Number(w.tgVal)  : 0;
    const ara = w.araVal ? Number(w.araVal) : 0;
    const sumKTA = key + tg + ara;

    if (key || tg || ara) {
      if (Math.abs(sumKTA - 100) > epsilon) {
        alert(I18n.t("wb.errKta", { row: idx + 1, sum: sumKTA }));
        return false;
      }
    }
  }

  cfg.bin.forEach(b => {
    const o = b.otherPercent ? Number(b.otherPercent) : 0;
    sumOther += o;
  });

  if (Math.abs(sumRed - 100) > epsilon) {
    alert(I18n.t("wb.errRedPct", { sum: sumRed }));
    return false;
  }
  if (Math.abs(sumOther - 100) > epsilon) {
    alert(I18n.t("wb.errOtherPct", { sum: sumOther }));
    return false;
  }
  return true;
}

/* finalize：依 outputs 產生一次 fileContent（固定亂數 & TG 分組） */
function generateFileContents(outputs) {
  Object.keys(outputs).forEach(k => {
    const o = outputs[k];
    const list = o.list || [];
    if (!list.length) {
      o.fileContent = "";
      return;
    }

    let lines = [];

    if (o.type === "web-key") {
      const cloned = list.slice();
      shuffle(cloned);
      lines = cloned.map(r => formatKeyLine(r));
    }

    if (o.type === "web-tg") {
      const cloned = list.slice();
      shuffle(cloned);

      let rawLines = cloned.map(r => {
        const date = r.date || "";
        const bs = bigSmallDash(r.big, r.small);
        if (o.tgFormat === "tgFirst") {
          return `${o.tgId} ${date} ${r.num} ${bs}`.trim();
        }
        return `${date} ${o.tgId} ${r.num} ${bs}`.trim();
      });

      if (o.tgCnt && o.tgCnt.trim() && o.tgCnt.trim() !== "0") {
        rawLines = groupTgLines(rawLines, o.tgCnt);
      }
      lines = rawLines;
    }

    if (o.type === "web-ara" || o.type === "bin-ara") {
      const cloned = list.slice();
      shuffle(cloned);
      lines = cloned.map(r => formatAraLine(r, o.araId));
    }

    o.fileContent = (lines || []).join("\n");
  });
}

/* 分配核心 */
function allocateOnce() {
  const cfg = getCurrentConfig();
  if (!validatePercents(cfg)) return null;

  const redList   = parseRedNumbers(cfg);
  const otherList = parseOtherNumbers(cfg);
  const pool = [...redList, ...otherList];

  const dateVal = cfg.other.week || "";

  const webList = cfg.web.map((w, idx) => ({
    index: idx,
    coName: w.coName || `Web${idx+1}`,
    araId:  w.araId || "",
    tgId:   w.tgId || "",
    tgFormat: w.tgFormat,
    tgCnt: w.tgCnt,
    keyPct:  w.keyVal   ? Number(w.keyVal)   : 0,
    tgPct:   w.tgVal    ? Number(w.tgVal)    : 0,
    araPct:  w.araVal   ? Number(w.araVal)   : 0,
    redPct:  w.redPercent   ? Number(w.redPercent)   : 0,
    otherPct:w.otherPercent ? Number(w.otherPercent) : 0
  }));

  const binList = cfg.bin.map((b, idx) => ({
    index: idx,
    coName: b.coName || `Bin${idx+1}`,
    araId:  b.araId || "",
    otherPct: b.otherPercent ? Number(b.otherPercent) : 0
  }));

  const webRedWeights   = webList.map(w => Math.max(0, w.redPct));
  const webOtherWeights = webList.map(w => Math.max(0, w.otherPct));
  const binOtherWeights = binList.map(b => Math.max(0, b.otherPct));

  const outputs = {};

  function ensureWebKey(co, tg) {
    const key = `web-key::${co}::${tg}`;
    if (!outputs[key]) outputs[key] = { type: "web-key", coName: co, tgId: tg, list: [] };
    return outputs[key];
  }
  function ensureWebTg(co, tg, fmt, cnt) {
    const key = `web-tg::${co}::${tg}`;
    if (!outputs[key]) {
      outputs[key] = {
        type: "web-tg",
        coName: co,
        tgId: tg,
        tgFormat: fmt,
        tgCnt: cnt || "",
        list: []
      };
    }
    return outputs[key];
  }
  function ensureWebAra(co, ara) {
    const key = `web-ara::${co}::${ara}`;
    if (!outputs[key]) outputs[key] = { type: "web-ara", coName: co, araId: ara, list: [] };
    return outputs[key];
  }
  function ensureBinAra(co, ara) {
    const key = `bin-ara::${co}::${ara}`;
    if (!outputs[key]) outputs[key] = { type: "bin-ara", coName: co, araId: ara, list: [] };
    return outputs[key];
  }

  function pickIndex(weights) {
    const total = weights.reduce((s, x) => s + x, 0);
    if (total <= 0) return -1;
    let r = rand() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  /* Spread 分散：同一號碼的多列不可分到同一 Web / Bin */
  const spreadCountByKey = new Map();
  for (const item of pool) {
    if (item.isRed) continue;
    const bn = item.baseNum || item.num || item.displayNum;
    const key = item.isRoll ? `${bn}r` : bn;
    spreadCountByKey.set(key, (spreadCountByKey.get(key) || 0) + 1);
  }

  const usedTargetsBySpreadKey = new Map();

  function spreadKeyFor(obj) {
    const bn = obj.baseNum || obj.num || obj.displayNum;
    return obj.isRoll ? `${bn}r` : bn;
  }

  function isSpreadDuplicate(obj) {
    return (spreadCountByKey.get(spreadKeyFor(obj)) || 0) > 1;
  }

  function targetKey(kind, i) {
    return `${kind}:${i}`;
  }

  function getUsedTargets(key) {
    if (!usedTargetsBySpreadKey.has(key)) usedTargetsBySpreadKey.set(key, new Set());
    return usedTargetsBySpreadKey.get(key);
  }

  function markTarget(key, kind, i) {
    getUsedTargets(key).add(targetKey(kind, i));
  }

  function getAvoidSets(sk, avoidSpread) {
    if (!avoidSpread) return { avoidWeb: new Set(), avoidBin: new Set() };
    const used = getUsedTargets(sk);
    const avoidWeb = new Set();
    const avoidBin = new Set();
    used.forEach(tk => {
      const sep = tk.indexOf(":");
      const kind = tk.slice(0, sep);
      const idx = Number(tk.slice(sep + 1));
      if (kind === "web") avoidWeb.add(idx);
      else if (kind === "bin") avoidBin.add(idx);
    });
    return { avoidWeb, avoidBin };
  }

  function pickWebOrBinTarget(avoidWeb, avoidBin) {
    const webAvail = webList.map((w, i) =>
      avoidWeb.has(i) ? 0 : Math.max(0, webOtherWeights[i])
    );
    const binAvail = binList.map((b, i) =>
      avoidBin.has(i) ? 0 : Math.max(0, binOtherWeights[i])
    );

    let total = webAvail.reduce((s, x) => s + x, 0) + binAvail.reduce((s, x) => s + x, 0);

    if (total <= 0) {
      webAvail.splice(0, webAvail.length, ...webOtherWeights.map(w => Math.max(0, w)));
      binAvail.splice(0, binAvail.length, ...binOtherWeights.map(b => Math.max(0, b)));
      total = webAvail.reduce((s, x) => s + x, 0) + binAvail.reduce((s, x) => s + x, 0);
      if (total <= 0) return null;
    }

    let r = rand() * total;
    for (let i = 0; i < webList.length; i++) {
      if (webAvail[i] <= 0) continue;
      r -= webAvail[i];
      if (r <= 0) return { kind: "web", i };
    }
    for (let i = 0; i < binList.length; i++) {
      if (binAvail[i] <= 0) continue;
      r -= binAvail[i];
      if (r <= 0) return { kind: "bin", i };
    }
    return null;
  }

  function pickRollWebIndex(avoidWeb) {
    const candidateIdx = [];
    const candidateWeights = [];

    webList.forEach((w, i) => {
      const canTakeR = (webOtherWeights[i] > 0) && ((w.keyPct + w.tgPct) > 0);
      if (canTakeR && !avoidWeb.has(i)) {
        candidateIdx.push(i);
        candidateWeights.push(webOtherWeights[i]);
      }
    });

    if (!candidateIdx.length) {
      webList.forEach((w, i) => {
        const canTakeR = (webOtherWeights[i] > 0) && ((w.keyPct + w.tgPct) > 0);
        if (canTakeR) {
          candidateIdx.push(i);
          candidateWeights.push(webOtherWeights[i]);
        }
      });
    }

    if (!candidateIdx.length) return -1;

    const pickPos = pickIndex(candidateWeights);
    return candidateIdx[pickPos];
  }

  /* 分配 */
  for (const obj of pool) {
    const isRed  = obj.isRed;
    const isRoll = !!obj.isRoll;
    const num    = obj.displayNum;
    const big    = obj.big;
    const small  = obj.small;

    const baseNum = obj.baseNum || obj.num || obj.displayNum;

    /* 紅字 */
    if (isRed) {
      const idx = pickIndex(webRedWeights);
      const w = webList[idx];
      const t = w.keyPct + w.tgPct + w.araPct;

      if (t <= 0) {
        ensureWebAra(w.coName, w.araId).list.push({ num, baseNum, big, small, date: dateVal, isRoll });
        continue;
      }

      let r = rand() * t;
      if (r <= w.keyPct) {
        ensureWebKey(w.coName, w.tgId).list.push({ num, baseNum, big, small, isRoll });
      } else if (r <= w.keyPct + w.tgPct) {
        ensureWebTg(w.coName, w.tgId, w.tgFormat, w.tgCnt)
          .list.push({ num, baseNum, big, small, date: dateVal, isRoll });
      } else {
        ensureWebAra(w.coName, w.araId).list.push({ num, baseNum, big, small, date: dateVal, isRoll });
      }
      continue;
    }

    /* r 號碼 */
    if (isRoll) {
      const sk = spreadKeyFor(obj);
      const avoidSpread = isSpreadDuplicate(obj);
      const { avoidWeb } = getAvoidSets(sk, avoidSpread);

      const wIndex = pickRollWebIndex(avoidWeb);
      if (wIndex < 0) {
        alert(I18n.t("wb.errNoRWeb"));
        return null;
      }

      const w = webList[wIndex];
      if (avoidSpread) markTarget(sk, "web", wIndex);

      const t = w.keyPct + w.tgPct;
      let rVal = rand() * t;

      if (rVal <= w.keyPct) {
        ensureWebKey(w.coName, w.tgId).list.push({ num, baseNum, big, small, isRoll });
      } else {
        ensureWebTg(w.coName, w.tgId, w.tgFormat, w.tgCnt)
          .list.push({ num, baseNum, big, small, date: dateVal, isRoll });
      }
      continue;
    }

    /* 其他字 */
    const totalOther =
      webOtherWeights.reduce((s, x) => s + x, 0) +
      binOtherWeights.reduce((s, x) => s + x, 0);

    if (totalOther <= 0) continue;

    const sk = spreadKeyFor(obj);
    const avoidSpread = isSpreadDuplicate(obj);
    const { avoidWeb, avoidBin } = getAvoidSets(sk, avoidSpread);
    const target = pickWebOrBinTarget(avoidWeb, avoidBin);
    if (!target) continue;

    if (avoidSpread) markTarget(sk, target.kind, target.i);

    if (target.kind === "bin") {
      const bObj = binList[target.i];
      ensureBinAra(bObj.coName, bObj.araId)
        .list.push({ num, baseNum, big, small, date: dateVal, isRoll });
    } else {
      const w = webList[target.i];
      const t2 = w.keyPct + w.tgPct + w.araPct;
      if (t2 <= 0) {
        ensureWebAra(w.coName, w.araId).list.push({ num, baseNum, big, small, date: dateVal, isRoll });
        continue;
      }

      let r2 = rand() * t2;
      let acc2 = w.keyPct;
      if (r2 <= acc2) {
        ensureWebKey(w.coName, w.tgId).list.push({ num, baseNum, big, small, isRoll });
        continue;
      }
      acc2 += w.tgPct;
      if (r2 <= acc2) {
        ensureWebTg(w.coName, w.tgId, w.tgFormat, w.tgCnt)
          .list.push({ num, baseNum, big, small, date: dateVal, isRoll });
        continue;
      }
      ensureWebAra(w.coName, w.araId).list.push({ num, baseNum, big, small, date: dateVal, isRoll });
    }
  }

  // ✅ 在這裡就先把每個檔案的 fileContent 產生好（亂數 & TG 分組只做一次）
  generateFileContents(outputs);
  return outputs;
}

/* Summary：照你定義的 Unique / Big / Small / Amount */
function buildSummary(outputs) {
  const rows = [];

  let totalLines = 0;
  let totalRecords = 0;
  let totalBig = 0;
  let totalSmall = 0;
  let totalAmount = 0;
  let totalRCount = 0;

  const totalUniqueSet = new Set();

  Object.keys(outputs).sort().forEach(key => {
    const o = outputs[key];
    const arr = o.list || [];

    const records = arr.length;

    let lines = 0;
    const fileText = buildFileContent(o) || "";
    if (fileText.trim() !== "") {
      lines = fileText
        .replace(/\r/g, "")
        .split("\n")
        .filter(l => l.trim() !== "").length;
    }

    const expandedRecs = [];
    let rCount = 0;

    arr.forEach(x => {
      const numRaw = x.num || x.displayNum || x.baseNum || "";

      let baseDigits = x.baseNum || "";
      if (!baseDigits) {
        baseDigits = (numRaw.match(/\d{4}/) || ["0000"])[0];
      }
      const base = String(baseDigits).padStart(4, "0").slice(-4);

      const big = x.big || 0;
      const small = x.small || 0;

      if (x.isRoll) {
        rCount++;
        const perms = permR(base);
        perms.forEach(n => {
          expandedRecs.push({
            num: n,
            big,
            small,
            isRoll: true
          });
        });
      } else {
        expandedRecs.push({
          num: base,
          big,
          small,
          isRoll: false
        });
      }
    });

    const fileUniqueSet = new Set();
    let bigTotal = 0;
    let smallTotal = 0;

    expandedRecs.forEach(r => {
      if (r.num) {
        fileUniqueSet.add(r.num);
        totalUniqueSet.add(r.num);
      }
      bigTotal += r.big;
      smallTotal += r.small;
    });

    const unique = fileUniqueSet.size;
    const amount = bigTotal * PRICE_BIG + smallTotal * PRICE_SMALL;

    let fileName = "";
    if (o.type === "web-key") fileName = `${o.coName}_${o.tgId}_KEY`;
    if (o.type === "web-tg")  fileName = `${o.coName}_${o.tgId}_TG`;
    if (o.type === "web-ara") fileName = `${o.coName}_${o.araId}_ARA(Web)`;
    if (o.type === "bin-ara") fileName = `${o.coName}_${o.araId}_ARA(Bin)`;

    rows.push({
      fileName,
      lines,
      records,
      unique,
      bigTotal,
      smallTotal,
      amount,
      rCount
    });

    totalLines   += lines;
    totalRecords += records;
    totalBig     += bigTotal;
    totalSmall   += smallTotal;
    totalAmount  += amount;
    totalRCount  += rCount;
  });

  const totalRPct = totalRCount > 0 ? "100.00%" : "0.00%";

  const bodyHtml = rows.map(r => {
    const rPct = totalRCount > 0
      ? (r.rCount * 100 / totalRCount).toFixed(2) + "%"



      : "0.00%";

    return `
      <tr>
        <td>${r.fileName}</td>
        <td>${r.lines}</td>
        <td>${r.records}</td>
        <td>${r.unique}</td>
        <td>${r.bigTotal}</td>
        <td>${r.smallTotal}</td>
        <td>${r.amount.toFixed(1)}</td>
        <td>${r.rCount}</td>
        <td>${rPct}</td>
      </tr>
    `;
  }).join("");

  const totalRow = `
    <tr style="font-weight:bold; background:#eef2ff;">
      <td>${I18n.t("wb.summaryTotal")}</td>
      <td>${totalLines}</td>
      <td>${totalRecords}</td>
      <td>${totalUniqueSet.size}</td>
      <td>${totalBig}</td>
      <td>${totalSmall}</td>
      <td>${totalAmount.toFixed(1)}</td>
      <td>${totalRCount}</td>
      <td>${totalRPct}</td>
    </tr>
  `;

  return `
    <table>
      <thead>
        <tr>
          <th>${I18n.t("wb.summaryFileName")}</th>
          <th>${I18n.t("wb.summaryLines")}</th>
          <th>${I18n.t("wb.summaryRecords")}</th>
          <th>${I18n.t("wb.summaryNumber")}</th>
          <th>${I18n.t("wb.summaryBig")}</th>
          <th>${I18n.t("wb.summarySmall")}</th>
          <th>${I18n.t("wb.summaryAmount")}</th>
          <th>${I18n.t("wb.summaryRCount")}</th>
          <th>${I18n.t("wb.summaryRPct")}</th>
        </tr>
      </thead>
      <tbody>
        ${bodyHtml}
        ${totalRow}
      </tbody>
    </table>
  `;
}

/* buildFileContent：現在只回傳 allocate 時已生成好的 fileContent */
function buildFileContent(o) {
  return (o && typeof o.fileContent === "string") ? o.fileContent : "";
}

/* 下載單一 TXT */
function downloadTextFile(filename, content) {
  if (content == null) content = "";
  const crlfContent = content.replace(/\r?\n/g, "\r\n");
  const blob = new Blob([crlfContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* Download_All 內容 */
function buildAllInOne(outputs, redFileContent) {
  function normLines(text) {
    return text.replace(/\r/g, "").split("\n").filter(l => l.trim() !== "");
  }

  const sections = [];
  const keys = Object.keys(outputs || {});

  function pushSection(type, name, lines) {
    const lineCount = lines.length;
    let block =
      `type:${type} ${name}\n` +
      `line:${lineCount}\n` +
      lines.join("\n") + "\n" +
      `endtype:${type} ${name}`;
    sections.push(block);
  }

  keys
    .map(k => outputs[k])
    .filter(o => o.type === "web-ara" || o.type === "bin-ara")
    .sort((a,b)=> `${a.coName}_${a.araId}`.localeCompare(`${b.coName}_${b.araId}`, 'zh-Hant') )
    .forEach(o => {
      const fileContent = buildFileContent(o);
      if (!fileContent) return;
      const lines = normLines(fileContent);
      const name = `${o.coName}_${o.araId}_ARA`;
      pushSection("ara", name, lines);
    });

  keys
    .map(k => outputs[k])
    .filter(o => o.type === "web-tg")
    .sort((a,b)=> `${a.coName}_${a.tgId}`.localeCompare(`${b.coName}_${b.tgId}`, 'zh-Hant') )
    .forEach(o => {
      const fileContent = buildFileContent(o);
      if (!fileContent) return;
      const lines = normLines(fileContent);
      const name = `${o.coName}_${o.tgId}_TG`;
      pushSection("tg", name, lines);
    });

  keys
    .map(k => outputs[k])
    .filter(o => o.type === "web-key")
    .sort((a,b)=> `${a.coName}_${a.tgId}`.localeCompare(`${b.coName}_${b.tgId}`, 'zh-Hant') )
    .forEach(o => {
      const fileContent = buildFileContent(o);
      if (!fileContent) return;
      const lines = normLines(fileContent);
      const name = `${o.coName}_${o.tgId}_KEY`;
      pushSection("keyin", name, lines);
    });

  if (redFileContent && redFileContent.trim()) {
    let lines = redFileContent.replace(/\r/g, "").split("\n");
    while (lines.length && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    pushSection("redfont", "", lines);
  }
  return sections.join("\n");
}

/* 個別下載區 */
function downloadWebAra(outputs) {
  const keys = Object.keys(outputs);
  let count = 0;

  keys.forEach(k => {
    const o = outputs[k];
    if (o.type === "web-ara") {
      const fileContent = buildFileContent(o);
      if (!fileContent) return;

      const fileName = `${o.coName}_${o.araId}_ARA.ara`;
      downloadTextFile(fileName, fileContent);
      count++;
    }
  });

  alert(I18n.t("wb.downloadedWebAra", { count }));
}

async function downloadWebKeyTg(outputs) {
  const zip = new JSZip();
  let count = 0;
  const keys = Object.keys(outputs);

  for (const k of keys) {
    const o = outputs[k];
    if (o.type === "web-key" || o.type === "web-tg") {
      const fileContent = buildFileContent(o);
      if (!fileContent) continue;

      let fileName = "";
      if (o.type === "web-key") fileName = `${o.coName}_${o.tgId}_KEY.txt`;
      if (o.type === "web-tg")  fileName = `${o.coName}_${o.tgId}_TG.txt`;

      const crlfContent = fileContent.replace(/\r?\n/g, "\r\n");
      zip.file(fileName, crlfContent);
      count++;
    }
  }

  if (count === 0) {
    alert(I18n.t("wb.noWebKeyTg"));
    return;
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, "Web_KEY_TG.rar");
}

function downloadBin(outputs) {
  const keys = Object.keys(outputs);
  let count = 0;

  keys.forEach(k => {
    const o = outputs[k];
    if (o.type === "bin-ara") {
      const fileContent = buildFileContent(o);
      if (!fileContent) return;

      const fileName = `${o.coName}_${o.araId}_ARA.ara`;
      downloadTextFile(fileName, fileContent);
      count++;
    }
  });

  alert(I18n.t("wb.downloadedBin", { count }));
}

/* All.rar 下載（WebARA / WebKEYTG / Bin / download_all） */
async function downloadAllRar(outputs, redFileContent) {
  const zip = new JSZip();
  let fileCount = 0;

  Object.keys(outputs).forEach(k => {
    const o = outputs[k];
    if (o.type === "web-ara") {
      const txt = buildFileContent(o);
      if (!txt) return;
      const name = `${o.coName}_${o.araId}_ARA.ara`;
      zip.file(name, txt.replace(/\r?\n/g, "\r\n"));
      fileCount++;
    }
  });

  Object.keys(outputs).forEach(k => {
    const o = outputs[k];
    if (o.type === "web-key" || o.type === "web-tg") {
      const txt = buildFileContent(o);
      if (!txt) return;
      let name = "";
      if (o.type === "web-key") name = `${o.coName}_${o.tgId}_KEY.txt`;
      if (o.type === "web-tg")  name = `${o.coName}_${o.tgId}_TG.txt`;
      zip.file(name, txt.replace(/\r?\n/g, "\r\n"));
      fileCount++;
    }
  });

  Object.keys(outputs).forEach(k => {
    const o = outputs[k];
    if (o.type === "bin-ara") {
      const txt = buildFileContent(o);
      if (!txt) return;
      const name = `${o.coName}_${o.araId}_ARA.ara`;
      zip.file(name, txt.replace(/\r?\n/g, "\r\n"));
      fileCount++;
    }
  });

  const allTxt = buildAllInOne(outputs, redFileContent || "");
  zip.file("download_all.txt", allTxt.replace(/\r?\n/g, "\r\n"));
  fileCount++;

  if (fileCount === 0) {
    alert(I18n.t("wb.noFiles"));
    return;
  }

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const fileName = `${dd}${mm}${yyyy}.rar`;

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, fileName);
}

/* 按鈕事件 */
allocateBtn.onclick = () => {
  if (!validateWeekRequired()) return;
  if (!validateOtherFileRequired()) return;

  const o = allocateOnce();
  if (!o) return;

  saveLastConfig();

  lastOutputs = o;
  summaryArea.innerHTML = buildSummary(o);
  downloadAllRarBtn.disabled = false;

  // ✅ 分配完成後，立即暫存這一版結果（本次 session 有效）
  saveAllocationResults();
};

downloadAllRarBtn.onclick = () => {
  if (!lastOutputs) {
    alert(I18n.t("wb.allocateFirst"));
    return;
  }
  downloadAllRar(lastOutputs, redFileContent || "");
};

/* 預設 Web / Bin（無歷史設定才套用） */
function addWebPreset(coName, araId, tgId, tgFormat) {
  const tr = createWebRow();
  tr.querySelector(".web-co-name").value = coName;
  tr.querySelector(".web-ara-id").value = araId;
  tr.querySelector(".web-tg-id").value = tgId;
  tr.querySelector(".web-tg-format").value = tgFormat || "dateFirst";
  webTableBody.appendChild(tr);
}

function addBinPreset(coName, araId) {
  const tr = createBinRow();
  tr.querySelector(".bin-co-name").value = coName;
  tr.querySelector(".bin-ara-id").value = araId;
  binTableBody.appendChild(tr);
}

/* ✅ 頁面載入時，也把上一次分配結果（同一個 session）載回來 */
restoreAllocationResults();

document.getElementById("add-web-row-btn").onclick = () =>
  webTableBody.appendChild(createWebRow());

document.getElementById("add-bin-row-btn").onclick = () =>
  binTableBody.appendChild(createBinRow());

const saveWebConfigBtn = document.getElementById("save-web-config-btn");
const saveBinConfigBtn = document.getElementById("save-bin-config-btn");

if (saveWebConfigBtn) {
  saveWebConfigBtn.addEventListener("click", () => {
    // ✅ Save 就檢查：Web Red% =100、Web+Bin Other%=100（含每列 Key+TG+ARA=100）
    const cfg = getCurrentConfig();

    // 先更新一下旁邊即時顯示（如果你有加 live hint）
    if (typeof updatePercentLiveHint === "function") updatePercentLiveHint();

    if (!validatePercents(cfg)) return; // ❌ 不通過就不存

    saveLastConfig();
    alert(I18n.t("wb.savedOk"));
  });
}

if (saveBinConfigBtn) {
  saveBinConfigBtn.addEventListener("click", () => {
    // ✅ Save 就檢查：Web Red% =100、Web+Bin Other%=100（含每列 Key+TG+ARA=100）
    const cfg = getCurrentConfig();

    if (typeof updatePercentLiveHint === "function") updatePercentLiveHint();

    if (!validatePercents(cfg)) return; // ❌ 不通過就不存

    saveLastConfig();
    alert(I18n.t("wb.savedOk"));
  });
}

/* ===============================
   即時顯示百分比總和（不阻擋操作）
================================ */

function updatePercentLiveHint() {
  let sumWebRed = 0;
  let sumOther = 0;

  // Web
  document.querySelectorAll('#web-table tbody tr').forEach(tr => {
    const red = Number(tr.querySelector('.web-red')?.value || 0);
    const other = Number(tr.querySelector('.web-other')?.value || 0);
    sumWebRed += red;
    sumOther += other;
  });

  // Bin
  document.querySelectorAll('#bin-table tbody tr').forEach(tr => {
    const other = Number(tr.querySelector('.bin-other-percent')?.value || 0);
    sumOther += other;
  });

  const redEl = document.getElementById('sum-web-red');
  const otherEl = document.getElementById('sum-all-other');

  redEl.textContent = sumWebRed;
  otherEl.textContent = sumOther;

  // 顏色提示
  redEl.style.color   = (sumWebRed === 100) ? '#16a34a' : '#ef4444';
  otherEl.style.color = (sumOther === 100) ? '#16a34a' : '#ef4444';
}

/* 監聽所有百分比輸入框 */
document.addEventListener('input', (e) => {
  if (
    e.target.classList.contains('web-red') ||
    e.target.classList.contains('web-other') ||
    e.target.classList.contains('bin-other-percent')
  ) {
    updatePercentLiveHint();
  }
});

/* 初始載入時計算一次 */
setTimeout(updatePercentLiveHint, 0);

function refreshWbDynamicLabels() {
  document.querySelectorAll("#web-table .drag-handle, #bin-table .drag-handle").forEach(el => {
    el.title = I18n.t("wb.dragSort");
  });
  document.querySelectorAll("#web-table .btn-delete-row, #bin-table .btn-delete-row").forEach(btn => {
    btn.textContent = I18n.t("wb.del");
  });
  document.querySelectorAll("#web-table .web-tg-format").forEach(sel => {
    const val = sel.value;
    if (sel.options[0]) sel.options[0].textContent = I18n.t("wb.tgFmtWeekId");
    if (sel.options[1]) sel.options[1].textContent = I18n.t("wb.tgFmtIdWeek");
    sel.value = val;
  });
  if (lastOutputs) {
    summaryArea.innerHTML = buildSummary(lastOutputs);
  }
}

I18n.onChange(refreshWbDynamicLabels);
