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

    function downloadTextFile(filename, content) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    let redSet = new Set();
    let redRForbiddenSet = new Set();

    let lastRedContent = '';
    let lastOtherContent = '';
    let lastStatsText = '';
    let hasAnalysis = false;

    const redFileInput = document.getElementById('redFile');
    const redSummary = document.getElementById('redSummary');
    const statusDiv = document.getElementById('status');

    const SETTINGS_KEY = 'GENv12_settings';
    const RESULTS_KEY  = 'GENv12_results';

    function setStatus(text, type = 'ok') {
      statusDiv.textContent = text;
      statusDiv.className = 'msg';
      if (type === 'ok') statusDiv.classList.add('status-ok');
      else if (type === 'warn') statusDiv.classList.add('status-warn');
      else if (type === 'error') statusDiv.classList.add('status-error');
    }

    // ========= 設定儲存 / 載入 (Step 1~5，localStorage) =========
    function saveSettings() {
      const data = {
        redBig:   document.getElementById('redBigAmount').value,
        redSmall: document.getElementById('redSmallAmount').value,
        big:      document.getElementById('bigAmount').value,
        small:    document.getElementById('smallAmount').value,
        roll:     document.getElementById('rollRatio').value,
        spread:   document.getElementById('spreadRatio').value,
        mult:     document.getElementById('lineMultiplier').value
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
        setStatus(I18n.t('gen.settingsSaved'), 'ok');
      } catch (e) {
        console.error(e);
        setStatus(I18n.t('gen.settingsSaveFail'), 'error');
      }
    }

    function loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);

        if (data.redBig   !== undefined) document.getElementById('redBigAmount').value   = data.redBig;
        if (data.redSmall !== undefined) document.getElementById('redSmallAmount').value = data.redSmall;
        if (data.big      !== undefined) document.getElementById('bigAmount').value      = data.big;
        if (data.small    !== undefined) document.getElementById('smallAmount').value    = data.small;
        if (data.roll     !== undefined) document.getElementById('rollRatio').value      = data.roll;
        if (data.spread   !== undefined) document.getElementById('spreadRatio').value    = data.spread;
        if (data.mult     !== undefined) document.getElementById('lineMultiplier').value = data.mult;
      } catch (e) {
        console.error(e);
      }
    }

    // ========= 結果暫存 / 載入（sessionStorage，關掉瀏覽器就清空） =========
    function saveResults() {
      if (!hasAnalysis) return;
      const data = {
        redContent:   lastRedContent,
        otherContent: lastOtherContent,
        stats:        lastStatsText,
        ts:           Date.now()
      };
      try {
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
    }

    function loadResults() {
      try {
        const raw = sessionStorage.getItem(RESULTS_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data) return;

        lastRedContent   = data.redContent   || '';
        lastOtherContent = data.otherContent || '';
        lastStatsText    = data.stats        || '';
        hasAnalysis      = !!(lastRedContent || lastOtherContent);

        if (hasAnalysis) {
          setStatus(
            (lastStatsText || I18n.t('gen.resultsLoaded')) +
            '\n' + I18n.t('gen.resultsSessionNote'),
            'ok'
          );
        }
      } catch (e) {
        console.error(e);
      }
    }

    function getPermutations(numStr) {
      const chars = numStr.split('');
      const results = new Set();
      function backtrack(path, used) {
        if (path.length === chars.length) { results.add(path.join('')); return; }
        for (let i = 0; i < chars.length; i++) {
          if (used[i]) continue;
          used[i] = true; path.push(chars[i]);
          backtrack(path, used);
          path.pop(); used[i] = false;
        }
      }
      backtrack([], Array(chars.length).fill(false));
      return Array.from(results);
    }

    function canBeR(num) {
      const uniqueDigits = new Set(num.split(''));
      return uniqueDigits.size >= 2;
    }

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function randomPartition(sum, parts) {
      if (sum <= 0) return Array(parts).fill(0);
      const cuts = [];
      for (let i = 0; i < parts - 1; i++) cuts.push(Math.floor(Math.random() * (sum + 1)));
      cuts.sort((a, b) => a - b);
      const result = [];
      let prev = 0;
      for (let i = 0; i < parts - 1; i++) { result.push(cuts[i] - prev); prev = cuts[i]; }
      result.push(sum - prev);
      return result;
    }

    function generateNonZeroZeroParts(totalBig, totalSmall, partsCount) {
      let bigParts = [];
      let smallParts = [];
      let ok = false;

      for (let attempt = 0; attempt < 20; attempt++) {
        bigParts = randomPartition(totalBig, partsCount);
        smallParts = randomPartition(totalSmall, partsCount);
        ok = true;
        for (let j = 0; j < partsCount; j++) {
          if (bigParts[j] === 0 && smallParts[j] === 0) { ok = false; break; }
        }
        if (ok) return { bigParts, smallParts };
      }

      for (let j = 0; j < partsCount; j++) {
        if (bigParts[j] === 0 && smallParts[j] === 0) {
          let borrowed = false;
          for (let k = 0; k < partsCount; k++) {
            if (k === j) continue;
            if (bigParts[k] > 0) { bigParts[k] -= 1; bigParts[j] += 1; borrowed = true; break; }
          }
          if (!borrowed) {
            for (let k = 0; k < partsCount; k++) {
              if (k === j) continue;
              if (smallParts[k] > 0) { smallParts[k] -= 1; smallParts[j] += 1; break; }
            }
          }
        }
      }
      return { bigParts, smallParts };
    }

    redFileInput.addEventListener('change', function () {
      const file = redFileInput.files[0];
      // 重置紅字集合
      redSet = new Set();
      redRForbiddenSet = new Set();
      redSummary.textContent = '';
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const text = e.target.result || '';
        const lines = text.split(/\r?\n/);

        let totalLines = 0;              // 檔案總行數（含無效行）
        let effectiveLines = 0;          // 有成功抓到「開頭數字」的行數
        let ignoredNoLeadingDigits = 0;  // 不是「數字開頭」的行數（含前面有空白）

        lines.forEach(line => {
          // 不 trimStart，保留行首空白，讓「前面有空白」的行被視為無效
          const raw = line.replace(/\r$/, '');
          if (raw === '') return; // 空行直接略過，不算在 totalLines

          totalLines++;

          // 只抓「行首連續的 1～4 位數字」
          const m = raw.match(/^(\d{1,4})/);
          if (!m) {
            ignoredNoLeadingDigits++;
            return;
          }

          const digits = m[1];
          const num = digits.padStart(4, '0');
          redSet.add(num);
          effectiveLines++;
        });

        // 根據紅字家族，標記「禁止成為 r 基底」的排列
        redSet.forEach(rn => {
          if (canBeR(rn)) {
            const perms = getPermutations(rn);
            perms.forEach(p => {
              if (!redSet.has(p)) {
                redRForbiddenSet.add(p);
              }
            });
          }
        });

        let msg = I18n.t('gen.redSummary', {
          unique: redSet.size,
          total: totalLines,
          effective: effectiveLines
        });

        if (ignoredNoLeadingDigits > 0) {
          msg += I18n.t('gen.redSummaryIgnored', { count: ignoredNoLeadingDigits });
        }

        msg += I18n.t('gen.redSummaryForbidden', { count: redRForbiddenSet.size });

        redSummary.textContent = msg;
      };

      reader.onerror = function () {
        redSummary.textContent = I18n.t('gen.readFail');
      };

      reader.readAsText(file, 'utf-8');
    });

    function runAnalysis() {
      const redBig = parseFloat(document.getElementById('redBigAmount').value || '0') || 0;
      const redSmall = parseFloat(document.getElementById('redSmallAmount').value || '0') || 0;

      const big = parseFloat(document.getElementById('bigAmount').value || '0') || 0;
      const small = parseFloat(document.getElementById('smallAmount').value || '0') || 0;
      let rollRatio = parseFloat(document.getElementById('rollRatio').value || '0') || 0;
      let spreadRatio = parseFloat(document.getElementById('spreadRatio').value || '0') || 0;
      let lineMultiplier = parseFloat(document.getElementById('lineMultiplier').value || '1') || 1;

      if (rollRatio < 0) rollRatio = 0;
      if (rollRatio > 100) rollRatio = 100;
      if (spreadRatio < 0) spreadRatio = 0;
      if (spreadRatio > 100) spreadRatio = 100;
      if (lineMultiplier < 1) lineMultiplier = 1;

      const bigIsInt = Number.isInteger(big);
      const smallIsInt = Number.isInteger(small);

      if (!redFileInput.files[0]) {
        if (!confirm(I18n.t('gen.confirmNoRed'))) {
          setStatus(I18n.t('gen.cancelled'), 'warn');
          return;
        }
      }

      const nonRedNumbers = [];
      const familyMap = {};

      for (let i = 0; i < 10000; i++) {
        const num = i.toString().padStart(4, '0');
        if (redSet.has(num)) continue;

        nonRedNumbers.push(num);
        const key = num.split('').sort().join('');
        if (!familyMap[key]) familyMap[key] = { members: [] };
        familyMap[key].members.push(num);
      }

      const candidateFamilies = [];
      for (const key in familyMap) {
        const members = familyMap[key].members;
        if (!members || members.length === 0) continue;

        const sample = members[0];
        if (!canBeR(sample)) continue;
        if (redRForbiddenSet.has(sample)) continue;

        candidateFamilies.push({ key, members });
      }

      let chosenFamilyKeys = new Set();
      if (rollRatio > 0 && candidateFamilies.length > 0) {
        shuffle(candidateFamilies);
        const totalFamilies = candidateFamilies.length;
        const targetFamilies = Math.floor(totalFamilies * (rollRatio / 100));
        const chosen = candidateFamilies.slice(0, targetFamilies);
        chosen.forEach(f => chosenFamilyKeys.add(f.key));
      }

      const baselineMap = {};
      candidateFamilies.forEach(f => {
        if (!chosenFamilyKeys.has(f.key)) return;
        const members = f.members;
        const rndIndex = Math.floor(Math.random() * members.length);
        baselineMap[f.key] = members[rndIndex];
      });

      const entries = [];
      nonRedNumbers.forEach(num => {
        const key = num.split('').sort().join('');
        if (chosenFamilyKeys.has(key)) {
          if (baselineMap[key] === num) entries.push({ num: num + 'r', isR: true, big, small });
        } else {
          entries.push({ num, isR: false, big, small });
        }
      });

      const baseLines = entries.length;

      let redLinesText = [];
      let redLinesCount = 0;
      if (redSet.size > 0) {
        const sortedReds = Array.from(redSet).sort();
        redLinesText = sortedReds.map(num => `${num} ${redBig} ${redSmall}`);
        redLinesCount = redLinesText.length;
      }

      if (!bigIsInt || !smallIsInt) {
        const linesText = entries.map(e => `${e.num} ${e.big} ${e.small}`);

        lastRedContent = redLinesText.join('\n');
        lastOtherContent = linesText.join('\n');
        hasAnalysis = true;

        let msg = I18n.t('gen.nonIntWarn', {
          redLines: redLinesCount,
          baseLines: baseLines
        });
        lastStatsText = msg;
        setStatus(msg, 'warn');
        return;
      }

      const eligibleIndices = [];
      for (let i = 0; i < entries.length; i++) eligibleIndices.push(i);

      let spreadCount = 0;
      let selectedSpreadIndices = [];
      if (spreadRatio > 0 && eligibleIndices.length > 0) {
        shuffle(eligibleIndices);
        spreadCount = Math.floor(eligibleIndices.length * (spreadRatio / 100));
        selectedSpreadIndices = eligibleIndices.slice(0, spreadCount);
      }

      let targetLinesRaw = Math.round(baseLines * lineMultiplier);
      const minLines = baseLines + spreadCount;
      if (targetLinesRaw < minLines) targetLinesRaw = minLines;

      const additionalNeeded = targetLinesRaw - baseLines;
      const parts = new Array(entries.length).fill(1);

      let currentExtra = 0;
      selectedSpreadIndices.forEach(idx => { parts[idx] = 2; currentExtra += 1; });

      let remainingExtra = additionalNeeded - currentExtra;
      if (remainingExtra < 0) remainingExtra = 0;

      const spreadN = selectedSpreadIndices.length;
      while (remainingExtra > 0 && spreadN > 0) {
        const idx = selectedSpreadIndices[Math.floor(Math.random() * spreadN)];
        parts[idx] += 1;
        remainingExtra -= 1;
      }

      const linesText = [];
      let zeroZeroLines = 0;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const p = parts[i];

        if (p === 1) {
          if (entry.big === 0 && entry.small === 0) zeroZeroLines++;
          linesText.push(`${entry.num} ${entry.big} ${entry.small}`);
        } else {
          const { bigParts, smallParts } = generateNonZeroZeroParts(entry.big, entry.small, p);
          for (let j = 0; j < p; j++) {
            const bVal = bigParts[j];
            const sVal = smallParts[j];
            if (bVal === 0 && sVal === 0) zeroZeroLines++;
            linesText.push(`${entry.num} ${bVal} ${sVal}`);
          }
        }
      }

      const finalLines = linesText.length;

      lastRedContent = redLinesText.join('\n');
      lastOtherContent = linesText.join('\n');
      hasAnalysis = true;

      let msg = I18n.t('gen.analysisDone', {
        redLines: redLinesCount,
        baseLines: baseLines,
        spreadCount: spreadCount,
        mult: lineMultiplier,
        finalLines: finalLines,
        zeroZero: zeroZeroLines
      });

      lastStatsText = msg;
      setStatus(msg, 'ok');
    }

    // 綁定按鈕 & 載入設定/結果
    document.getElementById('saveBtn').addEventListener('click', saveSettings);

    document.getElementById('analyzeBtn').addEventListener('click', function () {
      // Generate 之前先存 1~5 的設定
      saveSettings();
      runAnalysis();
      // 產生完成後，把結果暫存到當前 session
      saveResults();
    });

    document.getElementById('downloadBtn').addEventListener('click', function () {
      if (!hasAnalysis) {
        setStatus(I18n.t('gen.noAnalysis'), 'warn');
        return;
      }

      if (lastRedContent && lastRedContent.trim().length > 0) {
        downloadTextFile('red_numbers.txt', lastRedContent);
      }
      if (lastOtherContent && lastOtherContent.trim().length > 0) {
        downloadTextFile('other_numbers.txt', lastOtherContent);
      }

      setStatus(lastStatsText + I18n.t('gen.downloaded'), 'ok');
      saveResults();
    });

    window.addEventListener('DOMContentLoaded', function () {
      loadSettings();
      loadResults();
    });
