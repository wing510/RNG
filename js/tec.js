// ====== Toggle summary boxes ======
    function toggleSummary(id, btnEl) {
      const box = document.getElementById(id);
      if (!box) return;
      if (box.classList.contains('hidden')) {
        box.classList.remove('hidden');
        btnEl.textContent = I18n.t('toggle.close');
      } else {
        box.classList.add('hidden');
        btnEl.textContent = I18n.t('toggle.open');
      }
    }

    // ----- 全域儲存 -----
    const beforeMap = new Map();   // number -> { beforeB, beforeS }
    const afterMap = new Map();    // number -> { afterB, afterS }
    const beforeDetail = new Map(); // number -> Map(sourceId -> {B,S})
    const afterDetail = new Map();  // number -> Map(sourceId -> {B,S})
    const rollSourceBefore = new Map(); // number -> Set(rollLabel from TXT)
    let compareRows = [];

    // ====== 共用小工具 ======

    function expandRollDigits(digits) {
      const res = new Set();
      if (!/^\d{4}$/.test(digits)) return [];
      const arr = digits.split("");
           const used = [false,false,false,false];
      const path = [];

      function backtrack() {
        if (path.length === arr.length) {
          res.add(path.join(""));
          return;
        }
        for (let i = 0; i < arr.length; i++) {
          if (used[i]) continue;
          used[i] = true;
          path.push(arr[i]);
          backtrack();
          path.pop();
          used[i] = false;
        }
      }
      backtrack();
      return Array.from(res).sort();
    }

    function normalizeFourDigit(numStr) {
      if (numStr == null) return null;
      let s = String(numStr).trim();
      s = s.replace(/\s+/g, "");
      if (!/^\d+$/.test(s)) return null;
      if (s.length > 4) return null;
      return s.padStart(4, "0");
    }

    // TXT token -> { numbers[], rollLabel(原始字串或 null) }
    function parseTokenToNumbersAndRoll(token) {
      if (!token) return { numbers: [], rollLabel: null };
      let s = String(token).trim();

      // 4 digits + r / R
      let m = s.match(/^(\d{4})[rR]$/);
      if (m) {
        const digits = m[1];
        const nums = expandRollDigits(digits);
        return { numbers: nums, rollLabel: s }; // e.g. "4542r"
      }

      const pure = normalizeFourDigit(s);
      if (pure) return { numbers: [pure], rollLabel: null };

      return { numbers: [], rollLabel: null };
    }

    // Excel cell -> numbers[]（不記錄 roll）
    function expandExcelNumberCell(val) {
      if (val == null) return [];
      let s = String(val).trim();
      if (!s) return [];

      // 0009 (R)
      let m = s.match(/^(\d{4})\s*\(R\)$/i);
      if (m) {
        const digits = m[1];
        return expandRollDigits(digits);
      }

      // 0009r / 0009R
      m = s.match(/^(\d{4})[rR]$/);
      if (m) {
        const digits = m[1];
        return expandRollDigits(digits);
      }

      const num = normalizeFourDigit(s);
      if (num) return [num];

      return [];
    }

    function recordRollSource(map, num, label) {
      if (!label) return;
      let set = map.get(num);
      if (!set) {
        set = new Set();
        map.set(num, set);
      }
      set.add(label);
    }

    function parseDashBigSmall(token) {
      if (typeof token !== "string") return { b: 0, s: 0, ok: false };
      const t = token.trim();
      if (!t.includes("-")) return { b: 0, s: 0, ok: false };
      const parts = t.split("-");
      if (parts.length !== 2) return { b: 0, s: 0, ok: false };

      const bStr = parts[0];
      const sStr = parts[1];
      let b = 0, s = 0;

      if (bStr !== "") {
        if (!/^\d+$/.test(bStr)) return { b: 0, s: 0, ok: false };
        b = parseInt(bStr, 10) || 0;
      }
      if (sStr !== "") {
        if (!/^\d+$/.test(sStr)) return { b: 0, s: 0, ok: false };
        s = parseInt(sStr, 10) || 0;
      }
      return { b, s, ok: true };
    }

    function addBefore(number, b, s, sourceId) {
      if (!number) return;
      const key = number;
      const cur = beforeMap.get(key) || { beforeB: 0, beforeS: 0 };
      cur.beforeB += b || 0;
      cur.beforeS += s || 0;
      beforeMap.set(key, cur);

      if (sourceId) {
        let srcMap = beforeDetail.get(key);
        if (!srcMap) {
          srcMap = new Map();
          beforeDetail.set(key, srcMap);
        }
        const src = srcMap.get(sourceId) || { B: 0, S: 0 };
        src.B += b || 0;
        src.S += s || 0;
        srcMap.set(sourceId, src);
      }
    }

    function addAfter(number, b, s, sourceId) {
      if (!number) return;
      const key = number;
      const cur = afterMap.get(key) || { afterB: 0, afterS: 0 };
      cur.afterB += b || 0;
      cur.afterS += s || 0;
      afterMap.set(key, cur);

      if (sourceId) {
        let srcMap = afterDetail.get(key);
        if (!srcMap) {
          srcMap = new Map();
          afterDetail.set(key, srcMap);
        }
        const src = srcMap.get(sourceId) || { B: 0, S: 0 };
        src.B += b || 0;
        src.S += s || 0;
        srcMap.set(sourceId, src);
      }
    }

    // ====== Step1：解析 TXT（Before） ======

    // ARA：每一行獨立
    function parseAraText(content, sourceIdBase) {
      const lines = content.split(/\r?\n/);
      let countLines = 0, countNums = 0;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const parts = line.split("+");
        if (parts.length < 4) continue;
        const token = parts[1] || "";
        const { numbers, rollLabel } = parseTokenToNumbersAndRoll(token);
        if (numbers.length === 0) continue;
        const bigField = parts[2] || "";
        const smallField = parts[3] || "";
        const bigMatch = bigField.match(/(\d+)/);
        const smallMatch = smallField.match(/(\d+)/);
        const b = bigMatch ? parseInt(bigMatch[1], 10) : 0;
        const s = smallMatch ? parseInt(smallMatch[1], 10) : 0;

        for (const numStr of numbers) {
          addBefore(numStr, b, s, sourceIdBase);
          if (rollLabel) recordRollSource(rollSourceBefore, numStr, rollLabel);
          countNums++;
        }
        countLines++;
      }
      return { countLines, countNums };
    }

    // KEY：一行一組，rollLabel 只記自己那一個
    function parseKeyText(content, sourceIdBase) {
      const lines = content.split(/\r?\n/);
      let countLines = 0, countNums = 0;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const tokens = line.split(/\s+/);
        if (tokens.length < 2) continue;
        const numToken = tokens[0];
        const { numbers, rollLabel } = parseTokenToNumbersAndRoll(numToken);
        if (numbers.length === 0) continue;
        const dash = tokens[tokens.length - 1];
        const { b, s, ok } = parseDashBigSmall(dash);
        if (!ok) continue;
        for (const numStr of numbers) {
          addBefore(numStr, b, s, sourceIdBase);
          if (rollLabel) recordRollSource(rollSourceBefore, numStr, rollLabel);
          countNums++;
        }
        countLines++;
      }
      return { countLines, countNums };
    }

    // TG：同一組裡，每個 token 自己決定自己的 rollLabel
    function parseTgText(content, sourceIdBase) {
      const lines = content.split(/\r?\n/);
      let countLines = 0, countNums = 0;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const tokens = line.split(/\s+/);
        if (tokens.length < 4) continue;

        const startIdx = 2; // 前兩個是 week / TGID
        let groupUnits = []; // 每組：[{num, rollLabel}, ...]

        for (let i = startIdx; i < tokens.length; i++) {
          const t = tokens[i];
          const dashCheck = parseDashBigSmall(t);
          if (dashCheck.ok) {
            const { b, s } = dashCheck;
            // 這組 groupUnits 才真正寫入 B/S & roll
            for (const u of groupUnits) {
              addBefore(u.num, b, s, sourceIdBase);
              if (u.rollLabel) recordRollSource(rollSourceBefore, u.num, u.rollLabel);
              countNums++;
            }
            groupUnits = [];
          } else {
            const { numbers, rollLabel } = parseTokenToNumbersAndRoll(t);
            if (numbers.length > 0) {
              for (const n of numbers) {
                groupUnits.push({ num: n, rollLabel });
              }
            } else {
              // 其他 token 略過（如 TGID、week 已在前面）
            }
          }
        }
        if (line) countLines++;
      }
      return { countLines, countNums };
    }

    function guessFileType(fileName, content) {
      const lower = fileName.toLowerCase();
      if (lower.includes("_ara") || lower.endsWith(".ara")) return "ara";
      if (lower.includes("_key")) return "key";
      if (lower.includes("_tg")) return "tg";
      if (lower.includes("download_all")) return "all";

      if (content.includes("*1|N") && content.includes("+")) return "ara";
      if (/\b\d{4}\s+-?\d*-?\d*\b/.test(content)) return "key";
      if (/\b\d+\s+\S+\s+\d{4}\b/.test(content)) return "tg";
      return "unknown";
    }

    function parseDownloadAll(content, sourceIdBase) {
      const lines = content.split(/\r?\n/);
      let mode = null;
      let buffer = [];
      let countLines = 0, countNums = 0;

      function flushCurrent(mode, bufferLines, blockName) {
        if (!mode || bufferLines.length === 0) return;
        const text = bufferLines.join("\n");
        let r = { countLines: 0, countNums: 0 };
        const srcId = `${sourceIdBase} :: ${blockName}`;
        if (mode === "ara") {
          r = parseAraText(text, srcId);
        } else if (mode === "keyin") {
          r = parseKeyText(text, srcId);
        } else if (mode === "tg") {
          r = parseTgText(text, srcId);
        }
        countLines += r.countLines;
        countNums += r.countNums;
      }

      let currentBlockName = "";

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line) continue;

        const mType = line.match(/^type:(\w+)\s*(.*)$/i);
        const mEnd = line.match(/^endtype:(\w+)\s*(.*)$/i);

        if (mEnd) {
          flushCurrent(mode, buffer, currentBlockName);
          mode = null;
          buffer = [];
          currentBlockName = "";
          continue;
        }

        if (mType) {
          flushCurrent(mode, buffer, currentBlockName);
          mode = mType[1].toLowerCase();
          currentBlockName = mType[2] || "";
          buffer = [];
          continue;
        }

        if (mode && line.startsWith("line:")) continue;
        if (mode) buffer.push(line);
      }

      flushCurrent(mode, buffer, currentBlockName);
      return { countLines, countNums };
    }

    function parseWbFiles() {
      beforeMap.clear();
      beforeDetail.clear();
      rollSourceBefore.clear();

      const input = document.getElementById("wbFiles");
      const summaryEl = document.getElementById("wbSummary");
      summaryEl.textContent = I18n.t("tec.parsing");

      const files = Array.from(input.files || []);
      if (files.length === 0) {
        summaryEl.textContent = I18n.t("tec.noFiles");
        updateCompareButton();
        return;
      }

      let finished = 0;
      let totalLines = 0;
      let totalNums = 0;
      let detailLines = [];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target.result || "";
          const type = guessFileType(file.name, text);
          let r = { countLines: 0, countNums: 0 };
          const srcBase = file.name;

          if (type === "ara") {
            r = parseAraText(text, srcBase);
          } else if (type === "key") {
            r = parseKeyText(text, srcBase);
          } else if (type === "tg") {
            r = parseTgText(text, srcBase);
          } else if (type === "all") {
            r = parseDownloadAll(text, srcBase);
          }

          totalLines += r.countLines;
          totalNums += r.countNums;
          detailLines.push(`${file.name} → lines:${r.countLines}, numbers:${r.countNums}`);

          finished++;
          if (finished === files.length) {
            const distinct = beforeMap.size;
            summaryEl.textContent = I18n.t("tec.wbSummary", {
              count: files.length,
              details: detailLines.join("\n"),
              lines: totalLines,
              nums: totalNums,
              distinct
            });
            updateCompareButton();
          }
        };
        reader.readAsText(file, "utf-8");
      });
    }

    // ====== Step2：Excel 偵測規則 ======

    function isNumHeaderText(h) {
      const s = (h || "").toString().trim().toLowerCase();
      if (!s) return false;
      return (
        s.includes("number") ||
        s === "num" ||
        s === "no" ||
        s === "no." ||
        s.includes("號碼") ||
        s.includes("數字")
      );
    }

    function isBigHeaderText(h) {
      const s = (h || "").toString().trim().toLowerCase();
      if (!s) return false;
      return (
        s.includes("big") ||
        s === "b" ||
        s.includes("大")
      );
    }

    function isSmallHeaderText(h) {
      const s = (h || "").toString().trim().toLowerCase();
      if (!s) return false;
      return (
        s.includes("small") ||
        s.includes("sml") ||
        s === "s" ||
        s.includes("小")
      );
    }

    function rowLooksLikeTotal(row) {
      const joined = (row || []).map(c => (c || "").toString().toLowerCase()).join("");
      if (!joined) return false;
      return joined.includes("total") || joined.includes("合計") || joined.includes("總計");
    }

    function findNumberWithOutBlock(rows) {
      const maxCheckRows = Math.min(40, rows.length);
      const numCandidates = [];
      const outCells = [];

      for (let r = 0; r < maxCheckRows; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const v = (row[c] || "").toString().trim().toLowerCase();
          if (!v) continue;
          if (isNumHeaderText(v)) {
            numCandidates.push({ row: r, col: c });
          }
          if (v === "out") {
            outCells.push({ row: r, col: c });
          }
        }
      }
      if (numCandidates.length === 0 || outCells.length === 0) return null;

      function locateBigSmall(baseRow, startCol) {
        const maxRight = startCol + 8;
        for (let tryRow = baseRow; tryRow <= baseRow + 1 && tryRow < rows.length; tryRow++) {
          const row = rows[tryRow] || [];
          let bigCol = -1, smlCol = -1;
          for (let c = startCol; c <= maxRight && c < row.length; c++) {
            const v = row[c];
            if (bigCol === -1 && isBigHeaderText(v)) bigCol = c;
            else if (bigCol !== -1 && smlCol === -1 && isSmallHeaderText(v)) {
              smlCol = c;
              break;
            }
          }
          if (bigCol !== -1 && smlCol !== -1) {
            return { rowIndex: tryRow, bigCol, smlCol };
          }
        }
        return null;
      }

      let best = null;
      let bestScore = Infinity;

      for (const out of outCells) {
        const bs = locateBigSmall(out.row, out.col);
        if (!bs) continue;

        let chosenNum = null;
        let chosenScore = Infinity;
        for (const cand of numCandidates) {
          const dr = Math.abs(cand.row - out.row);
          const dc = Math.abs(cand.col - out.col);
          const score = dr * 10 + dc;
          if (score < chosenScore) {
            chosenScore = score;
            chosenNum = cand;
          }
        }
        if (!chosenNum) continue;

        const startRow = Math.max(out.row, chosenNum.row, bs.rowIndex);
        const score = chosenScore;
        if (score < bestScore) {
          bestScore = score;
          best = {
            startRow,
            mappings: [
              { numCol: chosenNum.col, bigCol: bs.bigCol, smlCol: bs.smlCol }
            ]
          };
        }
      }
      return best;
    }

    function findMultiBlockRowMapping(rows) {
      const maxCheckRows = Math.min(80, rows.length);
      for (let r = 0; r < maxCheckRows; r++) {
        const row = rows[r] || [];
        const mappings = [];
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (!isNumHeaderText(v)) continue;

          let bigCol = -1, smlCol = -1;
          for (let j = c + 1; j < c + 6 && j < row.length; j++) {
            if (bigCol === -1 && isBigHeaderText(row[j])) {
              bigCol = j;
            } else if (bigCol !== -1 && smlCol === -1 && isSmallHeaderText(row[j])) {
              smlCol = j;
              break;
            }
          }
          if (bigCol !== -1 && smlCol !== -1) {
            mappings.push({ numCol: c, bigCol, smlCol });
          }
        }
        if (mappings.length > 0) {
          return { startRow: r, mappings };
        }
      }
      return null;
    }

    function findSimpleHeaderMapping(rows) {
      const maxCheckRows = Math.min(80, rows.length);
      for (let r = 0; r < maxCheckRows; r++) {
        const row = rows[r] || [];
        let colNum = -1, colBig = -1, colSmall = -1;
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (colNum === -1 && isNumHeaderText(v)) colNum = c;
          else if (colBig === -1 && isBigHeaderText(v)) colBig = c;
          else if (colSmall === -1 && isSmallHeaderText(v)) colSmall = c;
        }
        if (colNum !== -1 && colBig !== -1 && colSmall !== -1) {
          return {
            startRow: r,
            mappings: [{ numCol: colNum, bigCol: colBig, smlCol: colSmall }]
          };
        }
      }
      return null;
    }

    function find4DHeaderIndex(rows) {
      const maxCheckRows = Math.min(80, rows.length);
      for (let r = 0; r < maxCheckRows; r++) {
        const row = rows[r] || [];
        const joined = row.map(c => (c || "").toString().toLowerCase()).join("");
        if (!joined) continue;
        if (joined.includes("4d")) {
          return r;
        }
      }
      return -1;
    }

    function isInOutStructure(rows, startIdx) {
      let hasIn = false;
      let hasOut = false;
      let bigSmallHeaderRows = 0;
      const start = Math.max(0, startIdx - 5);
      const end = Math.min(rows.length - 1, startIdx + 20);

      for (let r = start; r <= end; r++) {
        const row = rows[r] || [];
        const joined = row.map(c => (c || "").toString().toLowerCase()).join("");
        if (joined.includes("in")) hasIn = true;
        if (joined.includes("out")) hasOut = true;

        let hasBig = false, hasSmall = false;
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (isBigHeaderText(v)) hasBig = true;
          if (isSmallHeaderText(v)) hasSmall = true;
        }
        if (hasBig && hasSmall) bigSmallHeaderRows++;
      }
      return (hasIn && hasOut) || bigSmallHeaderRows >= 2;
    }

    function detectExcelMappings(rows) {
      const outRes = findNumberWithOutBlock(rows);
      if (outRes && outRes.mappings && outRes.mappings.length > 0) return outRes;

      const multiRes = findMultiBlockRowMapping(rows);
      if (multiRes && multiRes.mappings && multiRes.mappings.length > 0) return multiRes;

      const simpleRes = findSimpleHeaderMapping(rows);
      if (simpleRes && simpleRes.mappings && simpleRes.mappings.length > 0) return simpleRes;

      const idx4d = find4DHeaderIndex(rows);
      if (idx4d !== -1) {
        const inOut = isInOutStructure(rows, idx4d);
        const numCol = 0;
        const bigCol = inOut ? 7 : 1;
        const smlCol = inOut ? 8 : 2;
        return {
          startRow: idx4d,
          mappings: [{ numCol, bigCol, smlCol }]
        };
      }

      return null;
    }

    function extractExcelByMappings(rows, startRow, mappings, sourceId) {
      let rowCount = 0;
      let numCount = 0;
      for (let r = startRow + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        if (rowLooksLikeTotal(row)) break;

        const nonEmpty = row.some(c => c != null && String(c).trim() !== "");
        if (!nonEmpty) continue;

        let usedThisRow = false;

        for (const m of mappings) {
          const rawNumCell = row[m.numCol];
          if (rawNumCell == null || rawNumCell === "") continue;

          const numbers = expandExcelNumberCell(rawNumCell);
          if (numbers.length === 0) continue;

          let b = parseFloat(row[m.bigCol]);
          let s = parseFloat(row[m.smlCol]);
          if (isNaN(b)) b = 0;
          if (isNaN(s)) s = 0;

          for (const n of numbers) {
            addAfter(n, b, s, sourceId);
            numCount++;
          }
          usedThisRow = true;
        }
        if (usedThisRow) rowCount++;
      }
      return { rowCount, numCount };
    }

    function parseExcelFiles() {
      afterMap.clear();
      afterDetail.clear();

      const input = document.getElementById("excelFiles");
      const summaryEl = document.getElementById("excelSummary");
      summaryEl.textContent = I18n.t("tec.parsing");

      const files = Array.from(input.files || []);
      if (files.length === 0) {
        summaryEl.textContent = I18n.t("tec.noFiles");
        const warnEl = document.getElementById("excelParseWarn");
        warnEl.textContent = "";
        warnEl.classList.add("hidden");
        updateCompareButton();
        return;
      }

      let finished = 0;
      let totalRows = 0;
      let totalNums = 0;
      let detailLines = [];
      let failedFiles = [];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const data = new Uint8Array(e.target.result);
          let workbook;
          try {
            workbook = XLSX.read(data, { type: "array" });
          } catch (err) {
            detailLines.push(I18n.t("tec.excelReadFail", { name: file.name }));
            finished++;
            if (finished === files.length) finalize();
            return;
          }

          let fileRowCount = 0;
          let fileNumCount = 0;
          let sheetUsed = 0;

          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
            if (!rows || rows.length === 0) continue;

            const mappingInfo = detectExcelMappings(rows);
            if (!mappingInfo) continue;

            const { startRow, mappings } = mappingInfo;
            const srcId = `${file.name} :: ${sheetName}`;
            const r = extractExcelByMappings(rows, startRow, mappings, srcId);
            if (r.rowCount > 0 || r.numCount > 0) {
              sheetUsed++;
              fileRowCount += r.rowCount;
              fileNumCount += r.numCount;
            }
          }

          totalRows += fileRowCount;
          totalNums += fileNumCount;

          if (sheetUsed === 0) {
            failedFiles.push(file.name);
            detailLines.push(I18n.t("tec.excelNoStructure", { name: file.name }));
          } else {
            detailLines.push(I18n.t("tec.excelSheetOk", {
              name: file.name,
              sheets: sheetUsed,
              rows: fileRowCount,
              nums: fileNumCount
            }));
          }

          finished++;
          if (finished === files.length) finalize();
        };
        reader.readAsArrayBuffer(file);
      });

      function finalize() {
        const input = document.getElementById("excelFiles");
        const distinct = afterMap.size;
        summaryEl.textContent = I18n.t("tec.excelSummary", {
          count: (input.files || []).length,
          details: detailLines.join("\n"),
          rows: totalRows,
          nums: totalNums,
          distinct
        });

        const warnEl = document.getElementById("excelParseWarn");
        if (failedFiles.length > 0) {
          const names = failedFiles.join(", ");
          warnEl.textContent = I18n.t("tec.excelWarnHeaders", { names });
          warnEl.classList.remove("hidden");
        } else {
          warnEl.textContent = "";
          warnEl.classList.add("hidden");
        }

        updateCompareButton();
      }
    }

    // ====== Step3：Compare & Render ======

    function updateCompareButton() {
      const btn = document.getElementById("btnCompare");
      const hasBefore = beforeMap.size > 0;
      const hasAfter = afterMap.size > 0;
      btn.disabled = !(hasBefore && hasAfter);
    }

    function runCompare() {
      compareRows = [];

      const allNumbers = new Set([
        ...beforeMap.keys(),
        ...afterMap.keys()
      ]);

      let sameCount = 0;
      let diffCount = 0;

      allNumbers.forEach(num => {
        const before = beforeMap.get(num) || { beforeB: 0, beforeS: 0 };
        const after = afterMap.get(num) || { afterB: 0, afterS: 0 };
        const row = {
          number: num,
          beforeB: before.beforeB || 0,
          beforeS: before.beforeS || 0,
          afterB: after.afterB || 0,
          afterS: after.afterS || 0
        };
        row.diffB = row.afterB - row.beforeB;
        row.diffS = row.afterS - row.beforeS;
        row.isSame = (row.diffB === 0 && row.diffS === 0);
        row.beforeSources = beforeDetail.get(num) || new Map();
        row.afterSources = afterDetail.get(num) || new Map();

        const rb = rollSourceBefore.get(num);
        row.txtRollLabel = rb ? Array.from(rb).join("; ") : "";

        if (row.isSame) sameCount++; else diffCount++;
        compareRows.push(row);
      });

      compareRows.sort((a, b) => a.number.localeCompare(b.number));

      const summaryEl = document.getElementById("compareSummary");
      summaryEl.textContent = I18n.t("tec.compareSummary", {
        total: compareRows.length,
        same: sameCount,
        diff: diffCount
      });

      // TXT / Excel 總結
      let txtB = 0, txtS = 0;
      beforeMap.forEach(v => {
        txtB += v.beforeB || 0;
        txtS += v.beforeS || 0;
      });
      let exlB = 0, exlS = 0;
      afterMap.forEach(v => {
        exlB += v.afterB || 0;
        exlS += v.afterS || 0;
      });

      const txtNum = beforeMap.size;
      const exlNum = afterMap.size;

      const totalsEl = document.getElementById("sideTotals");
      totalsEl.textContent = I18n.t("tec.sideTotals", {
        txtNum,
        txtB,
        txtS,
        exlNum,
        exlB,
        exlS
      });

      document.getElementById("btnDownloadCsv").disabled = compareRows.length === 0;
      renderTable();
    }

    function renderTable() {
      const tbody = document.querySelector("#resultTable tbody");
      tbody.innerHTML = "";

      // 讀取三種模式
      const filterEl = document.querySelector('input[name="filterMode"]:checked');
      const filter = filterEl ? filterEl.value : "all";

      let showCount = 0;
      let diffCount = 0;

      for (const row of compareRows) {
        // Filter: diff only
        if (filter === "diff" && row.isSame) {
          continue;
        }

        // Filter: Excel less than TXT
        if (filter === "excelLess") {
          const excelLess =
            row.afterB < row.beforeB ||
            row.afterS < row.beforeS;
          if (!excelLess) continue;
        }

        const tr = document.createElement("tr");
        tr.className = row.isSame ? "same-row" : "diff-row";

        const tdNum = document.createElement("td");
        tdNum.textContent = row.number;
        tdNum.className = "num-cell";
        tr.appendChild(tdNum);

        const tdExlB = document.createElement("td");
        tdExlB.textContent = row.afterB.toString();
        tr.appendChild(tdExlB);

        const tdExlS = document.createElement("td");
        tdExlS.textContent = row.afterS.toString();
        tr.appendChild(tdExlS);

        const tdTxtRoll = document.createElement("td");
        tdTxtRoll.textContent = row.txtRollLabel || "";
        tr.appendChild(tdTxtRoll);

        const tdTxtB = document.createElement("td");
        tdTxtB.textContent = row.beforeB.toString();
        tr.appendChild(tdTxtB);

        const tdTxtS = document.createElement("td");
        tdTxtS.textContent = row.beforeS.toString();
        tr.appendChild(tdTxtS);

        const tdDB = document.createElement("td");
        tdDB.textContent = row.diffB.toString();
        if (row.diffB !== 0) tdDB.classList.add("highlight");
        tr.appendChild(tdDB);

        const tdDS = document.createElement("td");
        tdDS.textContent = row.diffS.toString();
        if (row.diffS !== 0) tdDS.classList.add("highlight");
        tr.appendChild(tdDS);

        const tdSrc = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "🔍";
        btn.className = "src-btn";
        btn.title = I18n.t("tec.viewSources");
        btn.onclick = () => showSources(row);
        tdSrc.appendChild(btn);
        tr.appendChild(tdSrc);

        tbody.appendChild(tr);
        showCount++;
        if (!row.isSame) diffCount++;
      }

      const statsEl = document.getElementById("resultStats");
      statsEl.textContent = I18n.t("tec.statsShown", { shown: showCount, diff: diffCount });
    }

    function formatSources(map) {
      if (!map || map.size === 0) return I18n.t("tec.srcNone");
      let out = "";
      map.forEach((val, key) => {
        out += I18n.t("tec.srcLine", { key, b: val.B, s: val.S }) + "\n";
      });
      return out.trimEnd();
    }

    function showSources(row) {
      const num = row.number;
      const beforeSrc = row.beforeSources;
      const afterSrc = row.afterSources;

      const msg = I18n.t("tec.srcTitle", {
        num,
        roll: row.txtRollLabel || "(none)",
        before: formatSources(beforeSrc),
        after: formatSources(afterSrc)
      });

      alert(msg);
    }

    function downloadCsv() {
      if (!compareRows || compareRows.length === 0) return;

      const filterEl = document.querySelector('input[name="filterMode"]:checked');
      const filter = filterEl ? filterEl.value : "all";

      const header = [
        "Number",
        "exl_Big",
        "exl_Small",
        "txt_Roll",
        "txt_Big",
        "txt_Small",
        "diff_B",
        "diff_S"
      ];
      const lines = [header.join(",")];

      for (const row of compareRows) {
        // 與 renderTable 相同過濾條件
        if (filter === "diff" && row.isSame) continue;

        if (filter === "excelLess") {
          const excelLess =
            row.afterB < row.beforeB ||
            row.afterS < row.beforeS;
          if (!excelLess) continue;
        }

        const arr = [
          row.number,
          row.afterB,
          row.afterS,
          row.txtRollLabel || "",
          row.beforeB,
          row.beforeS,
          row.diffB,
          row.diffS
        ];
        lines.push(arr.join(","));
      }

      const csvContent = lines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "TXT_vs_Excel_Compare_v2.3.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    //------------------------------------------------------
    // 排序功能：點表頭即可排序（升冪 / 降冪 自動切換）＋ 顯示 ▲ / ▼
    //------------------------------------------------------
    let sortState = {}; // 每欄的排序狀態

    function sortTable(colIndex) {
      const table = document.getElementById("resultTable");
      const tbody = table.querySelector("tbody");
      let rows = Array.from(tbody.querySelectorAll("tr"));

      // 建立排序方向（第一次 ASC，再來 DESC）
      sortState[colIndex] = !sortState[colIndex];
      const asc = sortState[colIndex];

      rows.sort((a, b) => {
        const A = a.children[colIndex].innerText.trim();
        const B = b.children[colIndex].innerText.trim();

        // 數字欄位：以數字排序
        const numA = parseFloat(A);
        const numB = parseFloat(B);
        const isNumber = !isNaN(numA) && !isNaN(numB);

        if (isNumber) {
          return asc ? numA - numB : numB - numA;
        }

        // 字串欄位：字典排序
        return asc ? A.localeCompare(B) : B.localeCompare(A);
      });

      // 重新放回表格
      rows.forEach(r => tbody.appendChild(r));

      // 更新欄位上的 ▲ / ▼ 顯示
      updateSortIndicators();
    }

    function updateSortIndicators() {
      const ths = document.querySelectorAll("#resultTable thead th");
      ths.forEach((th, idx) => {
        const arrowSpan = th.querySelector(".sort-arrow");
        if (!arrowSpan) return;
        const state = sortState[idx];
        if (state === undefined) {
          arrowSpan.textContent = "";
        } else {
          arrowSpan.textContent = state ? "▲" : "▼";
        }
      });
    }

    // 檔案選擇時自動解析
    document.getElementById("wbFiles").addEventListener("change", parseWbFiles);
    document.getElementById("excelFiles").addEventListener("change", parseExcelFiles);
