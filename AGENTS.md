# AGENTS.md — 給協作 AI（Codex 等）的專案說明

## 這是什麼
「品牌工作室」：給保險業務同仁使用的個人品牌 PWA。回答問卷後，用同一份品牌資料產出 LINE 官方帳號、個人網頁等平台的素材，以及給其他 AI 工具使用的提示詞。

- 線上網址：https://ip-maker.neocch.workers.dev（需 Google 登入並經管理者審核）
- 部署：Cloudflare Workers，推送到 `claude/sleepy-fermi-ibeizt` 分支會自動部署到正式站
- 需求規格：`docs/handoff-spec.md`；現況對照：`docs/gap-analysis.md`；總覽：`README.md`

## 架構
- `app/`：前端。原生 HTML／CSS／ES modules，**沒有框架、沒有 build**。素材用 Canvas 繪製，預覽與下載共用同一份繪圖程式。
  - `js/model.js` 資料模型（schemaVersion 2）、舊資料遷移、輸入檢查
  - `js/brand.js` 由問卷推導配色、語氣、禁忌；`js/data/questions.js` 題庫
  - `js/draw.js` 繪圖；`js/line.js`、`js/entries.js` LINE 圖文選單與入口內容
  - `js/website.js` 個人網頁產生器；`js/brandguide.js` 品牌規範與 AI 提示詞
  - `js/views/` 各畫面；`sw.js` 離線快取；`gate/` 登入與申請頁（公開）
- `worker/`：後台。Google 登入驗證、使用申請、管理者審核、門禁。資料存在 Durable Object（SQLite）。
- `tests/`：`e2e.test.js`（前端 41 項）、`worker.test.js`（後台 20 項）、`check_zip.py`

## 一定要遵守的規則
1. **不要直接推送到 `claude/sleepy-fermi-ibeizt`**（那是正式站）。請開自己的分支，完成後開 Pull Request。（專案主要的 Claude Code 工作階段由擁有者指定在此分支開發，不在此限。）
2. 介面與文件使用**台灣繁體中文**。使用者不是工程師，文字要白話。
3. **不虛構**：不替使用者編造經歷、證照、案例、數據；沒有資料時用【待填】。不顯示未完成的功能為已完成。
4. **所有問卷題目都要能一個人完成**，不可要求找別人協助。
5. 免費資源優先；任何付費依賴要先說明。
6. 憑證與權杖不可出現在前端程式、localStorage、下載檔或提示詞中。`ALLOW_TEST_LOGIN` 只供本機測試，不可寫進 `wrangler.jsonc`。
7. 使用者輸入的文字放進 HTML 前一律經過 `esc()`；不可把自由文字當成 HTML 或指令執行。
8. 不要為了換技術而重寫；不引入框架或 build 流程，除非先說明理由並取得同意。
9. 新增 JS 檔要加進 `app/sw.js` 的 `FILES`，並調高 `VERSION`（測試會檢查清單）。
10. 未開放的平台由 `app/js/platforms.js` 的 `READY_PLATFORMS` 控制，不要刪除保留中的功能。

## 測試（合併前必須全部通過）
```bash
npm install
```
```bash
node tests/e2e.test.js
```
```bash
node tests/worker.test.js
```
需要 Node 22、Playwright（Chromium）、Python 3 與 Pillow。

## 審計紀錄
- `docs/audit/codex-audit.md`：2026-11-14 Codex 獨立審計（F01–F09）。九項皆已修正並補上回歸測試，見 `tests/e2e.test.js` 的「審計修正」區段。

## 已知限制（不是待修的錯誤，但歡迎提出改進建議）
- 問卷資料只存在使用者裝置（localStorage），不跨裝置同步。
- 門禁擋的是「下載 APP」；已經快取過 APP 的裝置，離線時仍可開啟本機的 APP（APP 每次上線會重新檢查登入狀態）。
- LINE 八格／雙頁選單的 `upload-richmenu.sh` 已通過本機模擬測試（含失敗清除），尚未在真實官方帳號驗證。
- 素材是規則式版型，不是 AI 生圖；圖片字型依裝置而定。
- 尚未在真實 iOS／Android 完成安裝、離線、更新的完整驗證。
