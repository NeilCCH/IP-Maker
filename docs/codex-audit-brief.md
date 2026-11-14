# 專案審計任務說明（給 Codex）

請先讀 `AGENTS.md` 與 `README.md`，再進行審計。

## 任務
對整個專案做一次**獨立審計**，找出錯誤、安全風險與品質問題。**這次只審計、不修改程式**：
把結果寫成 `docs/audit/codex-audit.md`，放在你自己的分支，並開 Pull Request。

## 審計範圍（依優先順序）
1. **後台安全（`worker/`）**
   - Google ID token 驗證是否完整（簽章、iss、aud、exp、email_verified、金鑰快取）
   - 登入狀態（Cookie 屬性、session 儲存與失效、登出、停用後是否立即失效）
   - 跨站請求防護（`x-brand-studio` 標頭與 Origin 檢查）是否足夠
   - 權限：非管理者能否讀到名單或自行核准；管理者能否被停用
   - 門禁是否有可繞過的路徑（公開路徑清單、資產路徑變形、大小寫、編碼、`run_worker_first`）
   - 輸入檢查與 Durable Object 的 SQL 使用
2. **前端安全（`app/`）**
   - XSS：所有 `innerHTML` 是否都經過 `esc()`；`website.js` 產出的 HTML；iframe 沙箱
   - 匯入進度檔（`model.js` 的 `migrate`／`sanitize`）能否被惡意檔案利用
   - `entries.js` 的表單網址解析、`safeURL` 是否可被繞過（例如 `javascript:`）
   - Service worker 快取策略與門禁的互動；登出與停用時快取是否清除
3. **正確性**
   - LINE 圖文選單座標、動作、alias 是否符合 LINE Messaging API 官方文件；`upload-richmenu.sh` 是否能正確執行
   - 各平台素材尺寸是否符合目前官方建議
   - 舊資料遷移是否會遺失資料
4. **無障礙與可用性**：對比、鍵盤操作、觸控目標、螢幕閱讀器標示、手機版面
5. **測試缺口**：哪些重要行為沒有被 `tests/` 涵蓋

## 報告格式
每一項發現請包含：
- 嚴重程度：嚴重／高／中／低／建議
- 位置：檔案路徑與行號
- 問題說明與重現方式（或攻擊情境）
- 建議的修正方向（不需要寫出完整程式）

報告最前面放一段給非工程師看的摘要：整體評價、最需要先處理的 3 件事。
不確定的地方請標示「待確認」，不要當成確定的問題。

## 注意
- 不要推送到 `claude/sleepy-fermi-ibeizt`（正式站分支）。
- 不要對線上網站 https://ip-maker.neocch.workers.dev 做攻擊性測試；後台請用 `node tests/worker.test.js` 的方式在本機啟動測試。
- 報告使用台灣繁體中文。
