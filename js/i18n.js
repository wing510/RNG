(function (global) {
  const STORAGE_KEY = "rng_lang";

  const dict = {
    zh: {
      "lang.zh": "中文",
      "lang.en": "EN",
      "toggle.open": "ⓘ 開啟",
      "toggle.close": "ⓘ 關閉",
      "common.chip": "RNG Tools v2.3",

      "index.title": "RNG Tools v2.3",
      "index.username": "使用者名稱",
      "index.password": "密碼",
      "index.login": "登入",
      "index.logout": "登出",
      "index.menu": "選單",
      "index.menuNumber": "號碼產生",
      "index.menuSettings": "設定分配",
      "index.menuComparison": "比對工具",
      "index.userPrefix": "使用者：{name}",
      "index.errEmpty": "請輸入使用者名稱與密碼。",
      "index.errInvalid": "使用者名稱或密碼錯誤。",

      "gen.pageTitle": "0000-9999 RNG v2.3",
      "gen.title": "0000-9999 RNG",
      "gen.subtitle": "v2.3（Roll 家族選號｜分散比例｜行數倍數｜儲存設定｜產出結果暫存）",
      "gen.step1": "上傳紅字檔案（.txt）",
      "gen.step2": "設定「其他號碼」的大 & 小",
      "gen.step3": "設定 Roll 比例",
      "gen.step4": "設定分散比例",
      "gen.step5": "設定行數倍數",
      "gen.stepDone": "產生分析 & 下載 txt 檔",
      "gen.redBig": "紅字（大）",
      "gen.redSmall": "紅字（小）",
      "gen.redHint": "只套用在紅字檔案",
      "gen.othersBig": "其他（大）",
      "gen.othersSmall": "其他（小）",
      "gen.rollPct": "Roll (%)",
      "gen.rollHint": "以「可成 r 的家族數」為母數抽選",
      "gen.spreadPct": "分散 (%)",
      "gen.spreadHint": "一般號碼與 r 號碼都可能被分散",
      "gen.lineMult": "行數倍數",
      "gen.lineMultHint": "控制分散後的總行數接近倍數目標",
      "gen.saveSettings": "儲存設定",
      "gen.generate": "產生分析",
      "gen.download": "下載",
      "gen.note1": "說明：\n1. 每一行只看「行首連續的 1～4 位數字」：\n2. 不足 4 位會自動在左邊補 0：\n - 9 abc      → 0009\n - 58 1-2     → 0058\n - 123 xyz    → 0123\n - 56789 ...  → 5678  （只取前 4 碼）\n - 0009 (R)   → 0009\n - 0058r      → 0058\n\n3. 行首不能有空白或非數字：\n - 「 1234」（前面有空格）\n - 「ABCD 1234」\n - 這些行都會被忽略，不會當成紅字。\n\n4. 每一行只會抓「第一段」數字，後面內容都忽略。\n5. 編碼建議 UTF-8，換行可以是 Windows (CRLF) 或 Unix (LF)。\n6. 紅字大萬 / 小萬只套用於紅字檔案，與其他號碼分開計算。",
      "gen.note2": "說明：\n1. 只對「非紅字」的號碼套用。\n2. 例：大萬=2，小萬=4 時，一般號碼會是：0000 2 4\n3. 分散與倍數控制目前只支援 Big / Small 為整數。",
      "gen.note3": "Roll 選號規則（以「家族」為母數）：\n1. 0000-9999（扣紅字）依「數字組合」分家族，例如：\n   0015 / 0105 / 1500 / 5001... → 同一家族。\n2. 一個家族可成 r 條件：\n   - 家族內全部成員都不是紅字（有紅字就整組封印）\n   - 這組數字本身至少 2 種不同數字\n3. Roll 比例以「可成 r 的家族數」為母數取比例。\n4. 被選中的家族只輸出 1 個 baseline r，其餘排列不再出現。",
      "gen.note4": "分散邏輯：\n1. 依比例隨機選出要分散的行（一般 + r）。\n2. 被選中的行拆成多行，Big/Small 總和不變。\n3. 拆分後會盡量避免出現 Big=0 且 Small=0 的行。\n4. 未被選中則維持一行。",
      "gen.note5": "1. 基礎行數 = Roll 後、未分散前行數（不含紅字）。\n2. 倍數 1.4 → 目標 ≈ 基礎行數 × 1.4\n3. 分散比例決定選誰拆；倍數決定每行拆幾份。\n4. 若倍數過小，會以「可達最小值」為準。",
      "gen.settingsSaved": "設定已儲存，下次開啟頁面會自動套用。",
      "gen.settingsSaveFail": "儲存設定失敗（localStorage 可能被關閉）。",
      "gen.resultsLoaded": "已載入本次視窗先前產生的結果，可直接按「下載」。",
      "gen.resultsSessionNote": "（關閉瀏覽器或分頁後將會清除。）",
      "gen.readFail": "讀取檔案失敗，請再試一次。",
      "gen.redSummary": "已讀取紅字（不重複）：{unique} 組\n檔案總行數：{total}\n成功辨識為號碼的行數：{effective}",
      "gen.redSummaryIgnored": "\n有 {count} 行不是「以數字開頭」（或前面有空白），已忽略。",
      "gen.redSummaryForbidden": "\n禁止成為 r 基底的排列家族成員數量：{count}",
      "gen.confirmNoRed": "尚未上傳紅字檔，確定要直接產生 0000-9999 全部號碼？",
      "gen.cancelled": "已取消產生分析。",
      "gen.nonIntWarn": "Big / Small 不是整數，分散與倍數控制未啟用。\n紅字行數：{redLines} 行（檔名：red_numbers.txt）\n其他基礎行數（Roll 後未分散）：{baseLines} 行。\n其他檔案檔名：other_numbers.txt\n\n分析已完成，如要下載請按「下載」。",
      "gen.analysisDone": "分析已完成（尚未下載檔案）。\n紅字行數：{redLines} 行（檔名：red_numbers.txt）\n其他基礎行數（Roll 後未分散）：{baseLines}\n被選中分散的行數：{spreadCount}\n設定行數倍數：{mult}\n實際輸出行數（含分散後）：{finalLines}\n偵測到 Big=0 且 Small=0 的行數（理論上接近 0）：{zeroZero}\n其他檔案檔名：other_numbers.txt\n\n若不滿意，可再按一次「產生分析」重新亂數。\n確定可以後，再按「下載」下載目前這一版結果。",
      "gen.noAnalysis": "尚未產生分析，請先按「產生分析」。",
      "gen.downloaded": "\n已下載 red_numbers.txt 與 other_numbers.txt（若有紅字）。",

      "wb.pageTitle": "Web/Bin 設定與分配 v2.3",
      "wb.title": "Web/Bin 設定與分配",
      "wb.subtitle": "v2.3（拖曳排序｜儲存設定｜Summary 修正｜分配結果暫存）",
      "wb.cloudLoading": "正在讀取雲端設定…",
      "wb.step1": "Web 設定",
      "wb.step2": "Bin 設定",
      "wb.step3": "上傳紅字 & 其他字檔案",
      "wb.step4": "分配 & 下載",
      "wb.dragSort": "拖曳排序",
      "wb.coName": "公司名稱",
      "wb.araId": "ARA ID",
      "wb.tgId": "TG ID",
      "wb.tgFmt": "TG 格式",
      "wb.tgCnt": "TG 數量",
      "wb.ktaPct": "Key / TG / ARA (%)",
      "wb.redPct": "Red (%)",
      "wb.otherPct": "Other (%)",
      "wb.addWeb": "+ 新增 Web",
      "wb.addBin": "+ 新增 Bin",
      "wb.save": "儲存",
      "wb.percentWebRed": "Web Red%：",
      "wb.percentAllOther": "　Web + Bin Other%：",
      "wb.tgFmtWeekId": "星期 ID",
      "wb.tgFmtIdWeek": "ID 星期",
      "wb.del": "刪除",
      "wb.uploadRed": "上傳紅字檔案 (.txt)",
      "wb.uploadOther": "上傳其他號碼 (.txt)",
      "wb.uploadOtherHint": "包含一般號碼與 r 號碼",
      "wb.week": "星期（必填）",
      "wb.weekPlaceholder": "例如：3",
      "wb.weekHint": "按「分配」前一定要填寫",
      "wb.allocate": "分配",
      "wb.download": "下載",
      "wb.noteWeb": "・每一列 Web 的「Key + TG + ARA = 100」\n・全部 Web 的 Red% 總和 = 100\n・全部 Web + Bin 的 Other% 總和 = 100\n・TG 格式可選：星期 ID 號碼 大-小 / ID 星期 號碼 大-小\n・用來分配紅字與其他號碼",
      "wb.noteBin": "・全部 Web + Bin 的 Other% 總和 = 100\n・Bin 只有 ARA（沒有 Key / TG）\n・Other% 代表「其他號碼」分到 Bin 的比例",
      "wb.noteUpload": "紅字 TXT 格式\n0001 2 4\n1234 2 4\n\n其他 TXT 格式（含 r）\n5678 1 2\n8888r 1 0\n(r 會依規則只進 Web-Key 或 Web-TG)\n⚠️ 星期必填，按「分配」與「下載」前會檢查。",
      "wb.noteDownload": "Lines：本檔最終輸出行數（含 TG 自動分組後的結果）。\nRecords：原始筆數（r 不拆開）。\nNumber：展開 r 後去重的實際號碼數量。\nBig：展開 r 後累計的大總數。\nSmall：展開 r 後累計的小總數。\nAmount：金額＝Big×1.6 + Small×0.7。\nR Count：本檔原始資料中含 r 的筆數。\nR%：本檔 R Count 占所有檔案 R Count 的比例。\nTotal：各欄位加總；Number Total 為全部展開後號碼的去重總數。",
      "wb.errWeek": "請先填寫「星期」",
      "wb.errOtherFile": "請先上傳「其他字 TXT」",
      "wb.errKta": "第 {row} 列 Web 的 Key+TG+ARA 必須 = 100，目前為：{sum}",
      "wb.errRedPct": "全部 Web Red% 必須 = 100，目前為：{sum}",
      "wb.errOtherPct": "全部 Web + Bin Other% 必須 = 100，目前為：{sum}",
      "wb.errNoRWeb": "有 r 號碼，但沒有任何可接收 r 的 Web（需 Other% > 0 且 Key+TG > 0）",
      "wb.savedOk": "已檢查通過並儲存",
      "wb.allocateFirst": "請先分配",
      "wb.noWebKeyTg": "沒有可下載的 Web_KEY/TG 檔案",
      "wb.noFiles": "沒有任何檔案可供下載",
      "wb.downloadedWebAra": "已下載 Web_ARA 檔案 {count} 個",
      "wb.downloadedBin": "已下載 Bin 檔案 {count} 個",
      "wb.summaryFileName": "檔名",
      "wb.summaryLines": "行數",
      "wb.summaryRecords": "筆數",
      "wb.summaryNumber": "去重",
      "wb.summaryBig": "大",
      "wb.summarySmall": "小",
      "wb.summaryAmount": "金額",
      "wb.summaryRCount": "R 數",
      "wb.summaryRPct": "R%",
      "wb.summaryTotal": "合計",

      "tec.pageTitle": "TXT & Excel 比對 v2.3",
      "tec.title": "TXT vs Excel 比對",
      "tec.subtitle": "v2.3 - 篩選 & 排序",
      "tec.step1": "上傳全部 TXT 檔案（Before）",
      "tec.step2": "上傳全部 Excel 檔案（After）",
      "tec.excelWarn": "注意：Excel 需有標題列",
      "tec.step3": "比對 & 下載",
      "tec.compare": "比對",
      "tec.downloadCsv": "下載 CSV",
      "tec.stepResult": "比對結果",
      "tec.filterAll": "全部號碼",
      "tec.filterDiff": "僅差異",
      "tec.filterExcelLess": "僅 exl_B/S < txt_B/S",
      "tec.noteStep1": "說明：\n・支援 ARA / KEY / TG / download_all 等 TXT 格式\n・上傳後下方顯示各檔案解析統計\n・Before = TXT 端資料，作為比對基準",
      "tec.noteStep2": "說明：\n・Excel 需有標題列（number / big / small 等）\n・支援 .xlsx .xls .xlsm .xlsb\n・上傳後下方顯示各檔案解析統計\n・After = Excel 端資料",
      "tec.noteStep3": "說明：\n・需同時有 Before（TXT）與 After（Excel）才能比對\n・比對後可下載 CSV\n・下方顯示比對摘要統計",
      "tec.colSources": "來源",
      "tec.wbFileDetail": "{name} → 行數:{lines}, 號碼:{nums}",
      "tec.parsing": "解析中…",
      "tec.noFiles": "尚未選擇檔案。",
      "tec.wbSummary": "共處理 TXT 檔案數：{count}\n{details}\n\n有效行數：{lines}\n總號碼筆數（展開後）：{nums}\n不重複號碼數：{distinct}",
      "tec.excelReadFail": "{name} → 讀取失敗",
      "tec.excelNoStructure": "{name} → 找不到 number/big/small 結構",
      "tec.excelSheetOk": "{name} → 使用工作表:{sheets}, 列:{rows}, 號碼:{nums}",
      "tec.excelSummary": "共處理 Excel 檔案數：{count}\n{details}\n\n有效資料列數：{rows}\n總號碼筆數（展開後）：{nums}\n不重複號碼數：{distinct}",
      "tec.excelWarnHeaders": "請檢查 Excel（{names}）：找不到標題列",
      "tec.compareSummary": "總號碼數：{total}\n完全相同：{same}\n有差異：{diff}",
      "tec.sideTotals": "TXT 檔 號碼數：{txtNum}，大：{txtB}，小：{txtS}\nExcel 檔 號碼數：{exlNum}，大：{exlB}，小：{exlS}",
      "tec.viewSources": "查看來源",
      "tec.statsShown": "目前顯示列數：{shown}，其中有差異：{diff}",
      "tec.srcTitle": "Number: {num}\ntxt_Roll: {roll}\n\n[Before 來源]\n{before}\n[After 來源]\n{after}",
      "tec.srcNone": "  （無）",
      "tec.srcLine": "  {key}: B={b}, S={s}"
    },
    en: {
      "lang.zh": "中文",
      "lang.en": "EN",
      "toggle.open": "ⓘ Open",
      "toggle.close": "ⓘ Close",
      "common.chip": "RNG Tools v2.3",

      "index.title": "RNG Tools v2.3",
      "index.username": "Username",
      "index.password": "Password",
      "index.login": "Login",
      "index.logout": "Logout",
      "index.menu": "Menu",
      "index.menuNumber": "Number",
      "index.menuSettings": "Settings",
      "index.menuComparison": "Comparison",
      "index.userPrefix": "User: {name}",
      "index.errEmpty": "Please enter username and password.",
      "index.errInvalid": "Invalid username or password.",

      "gen.pageTitle": "0000-9999 RNG v2.3",
      "gen.title": "0000-9999 RNG",
      "gen.subtitle": "v2.3 (Roll families | Spread ratio | Line multiplier | Save settings | Session cache)",
      "gen.step1": "Upload RED File (.txt)",
      "gen.step2": "Set Big & Small for Others",
      "gen.step3": "Set Roll Ratio",
      "gen.step4": "Set Spread Ratio",
      "gen.step5": "Set Line Multiplier",
      "gen.stepDone": "Generate & Download",
      "gen.redBig": "Red (Big)",
      "gen.redSmall": "Red (Small)",
      "gen.redHint": "Only applies to red file",
      "gen.othersBig": "Others (Big)",
      "gen.othersSmall": "Others (Small)",
      "gen.rollPct": "Roll (%)",
      "gen.rollHint": "Base = count of r-eligible families",
      "gen.spreadPct": "Spread (%)",
      "gen.spreadHint": "Both normal and r numbers may be spread",
      "gen.lineMult": "Line Multiplier",
      "gen.lineMultHint": "Target total lines ≈ base × multiplier",
      "gen.saveSettings": "Save Settings",
      "gen.generate": "Generate",
      "gen.download": "Download",
      "gen.note1": "Notes:\n1. Each line uses only 1–4 leading digits.\n2. Left-padded to 4 digits:\n - 9 abc      → 0009\n - 58 1-2     → 0058\n - 123 xyz    → 0123\n - 56789 ...  → 5678 (first 4 only)\n - 0009 (R)   → 0009\n - 0058r      → 0058\n\n3. Lines must start with digits (no leading spaces):\n - \" 1234\", \"ABCD 1234\" are ignored.\n\n4. Only the first digit group is used.\n5. UTF-8 recommended; CRLF or LF line endings OK.\n6. Red Big/Small apply only to the red file.",
      "gen.note2": "Notes:\n1. Applies only to non-red numbers.\n2. Example: Big=2, Small=4 → 0000 2 4\n3. Spread/multiplier require integer Big/Small.",
      "gen.note3": "Roll rules (family-based):\n1. Group 0000–9999 (excl. red) by digit combination.\n2. A family is r-eligible if:\n   - No member is red\n   - At least 2 distinct digits\n3. Roll % uses r-eligible family count as base.\n4. Each selected family outputs one baseline r only.",
      "gen.note4": "Spread logic:\n1. Randomly pick lines to spread (normal + r).\n2. Split selected lines; total Big/Small unchanged.\n3. Avoid lines with Big=0 & Small=0.\n4. Unselected lines stay as one line.",
      "gen.note5": "1. Base lines = after Roll, before spread (excl. red).\n2. Multiplier 1.4 → target ≈ base × 1.4\n3. Spread ratio picks which lines; multiplier picks parts.\n4. If multiplier too small, minimum achievable is used.",
      "gen.settingsSaved": "Settings saved; will auto-apply next time.",
      "gen.settingsSaveFail": "Failed to save settings (localStorage may be disabled).",
      "gen.resultsLoaded": "Loaded previous results from this session. You can Download directly.",
      "gen.resultsSessionNote": "(Cleared when browser/tab is closed.)",
      "gen.readFail": "Failed to read file. Please try again.",
      "gen.redSummary": "Red numbers (unique): {unique}\nTotal lines: {total}\nRecognized as numbers: {effective}",
      "gen.redSummaryIgnored": "\n{count} line(s) ignored (not starting with digits or leading spaces).",
      "gen.redSummaryForbidden": "\nForbidden r-base permutations: {count}",
      "gen.confirmNoRed": "Red file not uploaded. Generate all numbers (0000–9999) anyway?",
      "gen.cancelled": "Generation cancelled.",
      "gen.nonIntWarn": "Big/Small are not integers; spread & multiplier disabled.\nRed lines: {redLines} (file: red_numbers.txt)\nOther base lines (after Roll): {baseLines}\nOther file: other_numbers.txt\n\nAnalysis done. Click Download when ready.",
      "gen.analysisDone": "Analysis completed (not downloaded).\nRed lines: {redLines} (file: red_numbers.txt)\nBase lines (after Roll): {baseLines}\nLines selected for spread: {spreadCount}\nLine multiplier: {mult}\nFinal output lines: {finalLines}\nBig=0 & Small=0 lines detected: {zeroZero}\nOther file: other_numbers.txt\n\nClick Generate again to re-randomize.\nClick Download when ready.",
      "gen.noAnalysis": "No analysis yet. Click Generate first.",
      "gen.downloaded": "\nDownloaded red_numbers.txt and other_numbers.txt (if red exists).",

      "wb.pageTitle": "Web/Bin Settings & Allocation v2.3",
      "wb.title": "Web/Bin Settings & Allocation",
      "wb.subtitle": "v2.3 (Drag sort | Save settings | Summary fix | Session cache)",
      "wb.cloudLoading": "Fetching cloud settings…",
      "wb.step1": "Web Settings",
      "wb.step2": "Bin Settings",
      "wb.step3": "Upload Red & Other Numbers",
      "wb.step4": "Allocate & Download",
      "wb.dragSort": "Drag to sort",
      "wb.coName": "Co. Name",
      "wb.araId": "ARA ID",
      "wb.tgId": "TG ID",
      "wb.tgFmt": "TG Fmt",
      "wb.tgCnt": "TG Cnt",
      "wb.ktaPct": "Key / TG / ARA (%)",
      "wb.redPct": "Red (%)",
      "wb.otherPct": "Other (%)",
      "wb.addWeb": "+ Add Web",
      "wb.addBin": "+ Add Bin",
      "wb.save": "Save",
      "wb.percentWebRed": "Web Red%: ",
      "wb.percentAllOther": "  Web + Bin Other%: ",
      "wb.tgFmtWeekId": "Week ID",
      "wb.tgFmtIdWeek": "ID Week",
      "wb.del": "Del",
      "wb.uploadRed": "Upload Red File (.txt)",
      "wb.uploadOther": "Upload Other Numbers (.txt)",
      "wb.uploadOtherHint": "Includes normal and R numbers",
      "wb.week": "Week (Required)",
      "wb.weekPlaceholder": "e.g. 3",
      "wb.weekHint": "Required before Allocate",
      "wb.allocate": "Allocate",
      "wb.download": "Download",
      "wb.noteWeb": "・Each Web row: Key + TG + ARA = 100\n・Total Web Red% = 100\n・Total Web + Bin Other% = 100\n・TG format: Week ID Num B-S or ID Week Num B-S\n・Used to allocate red numbers and others",
      "wb.noteBin": "・Total Web + Bin Other% = 100\n・Bin has ARA only (no Key/TG)\n・Other% defines how others go to Bin",
      "wb.noteUpload": "Red TXT format\n0001 2 4\n1234 2 4\n\nOther TXT format (incl. r)\n5678 1 2\n8888r 1 0\n(r goes to Web-Key or Web-TG by rules)\n⚠️ Week is required before Allocate/Download.",
      "wb.noteDownload": "Lines: Final output lines (incl. TG grouping).\nRecords: Original count (r not expanded).\nNumber: Unique numbers after r expansion.\nBig/Small: Totals after r expansion.\nAmount: Big×1.6 + Small×0.7.\nR Count: Records containing r.\nR%: This file's share of total R Count.\nTotal: Column sums; Number Total = unique across all files.",
      "wb.errWeek": "Fill in Week first.",
      "wb.errOtherFile": "Upload Other TXT first.",
      "wb.errKta": "Web row {row}: Key+TG+ARA must equal 100, current: {sum}",
      "wb.errRedPct": "Total Web Red% must be 100, current: {sum}",
      "wb.errOtherPct": "Total Web+Bin Other% must be 100, current: {sum}",
      "wb.errNoRWeb": "R numbers exist but no Web can receive r (need Other% > 0 and Key+TG > 0).",
      "wb.savedOk": "Checked & saved.",
      "wb.allocateFirst": "Allocate first.",
      "wb.noWebKeyTg": "No Web_KEY/TG files to download.",
      "wb.noFiles": "No files to download.",
      "wb.downloadedWebAra": "Downloaded {count} Web_ARA file(s).",
      "wb.downloadedBin": "Downloaded {count} Bin file(s).",
      "wb.summaryFileName": "File Name",
      "wb.summaryLines": "Lines",
      "wb.summaryRecords": "Records",
      "wb.summaryNumber": "Number",
      "wb.summaryBig": "Big",
      "wb.summarySmall": "Small",
      "wb.summaryAmount": "Amount",
      "wb.summaryRCount": "R Count",
      "wb.summaryRPct": "R%",
      "wb.summaryTotal": "Total",

      "tec.pageTitle": "TXT & Excel Compare v2.3",
      "tec.title": "TXT vs Excel Compare",
      "tec.subtitle": "v2.3 - Filter & Sort",
      "tec.step1": "Upload All TXT Files (Before)",
      "tec.step2": "Upload All Excel Files (After)",
      "tec.excelWarn": "Note: Excel needs headers",
      "tec.step3": "Compare & Download",
      "tec.compare": "Compare",
      "tec.downloadCsv": "Download CSV",
      "tec.stepResult": "Comparison Result",
      "tec.filterAll": "All Numbers",
      "tec.filterDiff": "Only Differences",
      "tec.filterExcelLess": "Only exl_B/S < txt_B/S",
      "tec.noteStep1": "Notes:\n・Supports ARA / KEY / TG / download_all TXT formats\n・Upload stats appear below\n・Before = TXT data used as baseline",
      "tec.noteStep2": "Notes:\n・Excel needs headers (number / big / small, etc.)\n・Supports .xlsx .xls .xlsm .xlsb\n・Upload stats appear below\n・After = Excel data",
      "tec.noteStep3": "Notes:\n・Both Before (TXT) and After (Excel) required to compare\n・Download CSV after compare\n・Compare summary appears below",
      "tec.colSources": "Sources",
      "tec.wbFileDetail": "{name} → lines:{lines}, numbers:{nums}",
      "tec.parsing": "Parsing…",
      "tec.noFiles": "No files selected.",
      "tec.wbSummary": "TXT files processed: {count}\n{details}\n\nBefore valid lines: {lines}\nBefore total numbers (expanded): {nums}\nBefore distinct numbers: {distinct}",
      "tec.excelReadFail": "{name} → Failed to read",
      "tec.excelNoStructure": "{name} → Missing N-B-S structure",
      "tec.excelSheetOk": "{name} → sheets:{sheets}, rows:{rows}, numbers:{nums}",
      "tec.excelSummary": "Excel files processed: {count}\n{details}\n\nAfter valid rows: {rows}\nAfter total numbers (expanded): {nums}\nAfter distinct numbers: {distinct}",
      "tec.excelWarnHeaders": "Check Excel ({names}): headers not found",
      "tec.compareSummary": "Total numbers: {total}\nIdentical: {same}\nWith differences: {diff}",
      "tec.sideTotals": "TXT Number: {txtNum}, B: {txtB}, S: {txtS}\nExcel Number: {exlNum}, B: {exlB}, S: {exlS}",
      "tec.viewSources": "View sources",
      "tec.statsShown": "Showing: {shown}, with differences: {diff}",
      "tec.srcTitle": "Number: {num}\ntxt_Roll: {roll}\n\n[Before sources]\n{before}\n[After sources]\n{after}",
      "tec.srcNone": "  (none)",
      "tec.srcLine": "  {key}: B={b}, S={s}"
    }
  };

  let currentLang = localStorage.getItem(STORAGE_KEY) || "zh";
  if (!dict[currentLang]) currentLang = "zh";

  const callbacks = [];

  function t(key, params) {
    let text = (dict[currentLang] && dict[currentLang][key]) ||
      (dict.zh && dict.zh[key]) ||
      key;
    if (params) {
      Object.keys(params).forEach(k => {
        text = text.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
      });
    }
    return text;
  }

  function getLang() {
    return currentLang;
  }

  function applyDocument(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(el => {
      el.textContent = t(el.getAttribute("data-i18n-html"));
    });
    const titleKey = scope.querySelector("[data-i18n-page-title]");
    if (titleKey) {
      document.title = t(titleKey.getAttribute("data-i18n-page-title"));
    }
    scope.querySelectorAll(".lang-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === currentLang);
    });
    document.documentElement.lang = currentLang === "zh" ? "zh-Hant" : "en";
  }

  function refreshToggleButtons(root) {
    const scope = root || document;
    scope.querySelectorAll(".toggle-btn").forEach(btn => {
      const noteId = btn.getAttribute("data-note");
      if (!noteId) return;
      const note = document.getElementById(noteId);
      btn.textContent = note && !note.classList.contains("hidden")
        ? t("toggle.close")
        : t("toggle.open");
    });
  }

  function setLang(lang, broadcast) {
    if (!dict[lang]) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* ignore */ }
    applyDocument();
    refreshToggleButtons();
    callbacks.forEach(fn => {
      try { fn(lang); } catch (e) { console.warn(e); }
    });
    if (broadcast !== false) {
      global.dispatchEvent(new CustomEvent("rng-lang-change", { detail: lang }));
      if (global.parent && global.parent !== global) {
        global.parent.postMessage({ type: "SET_LANG", lang }, "*");
      }
    }
  }

  function onChange(fn) {
    callbacks.push(fn);
  }

  function initLangSwitcher(root) {
    const scope = root || document;
    scope.querySelectorAll(".lang-btn").forEach(btn => {
      if (btn.dataset.i18nBound) return;
      btn.dataset.i18nBound = "1";
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
    applyDocument(scope);
    refreshToggleButtons(scope);
  }

  window.addEventListener("message", e => {
    if (!e.data || e.data.type !== "SET_LANG") return;
    setLang(e.data.lang, false);
  });

  const I18n = { t, getLang, setLang, onChange, applyDocument, initLangSwitcher, refreshToggleButtons };
  global.I18n = I18n;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initLangSwitcher());
  } else {
    initLangSwitcher();
  }
})(window);
