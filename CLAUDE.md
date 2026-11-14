# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概要

「品牌工作室」：給保險業務同仁用的個人品牌 PWA。使用者回答 13 題問卷，系統用**同一份品牌資料**產出五個平台的素材（Facebook、個人網頁、Instagram、LINE 官方帳號、Threads）。介面、註解、commit 訊息、測試名稱都使用繁體中文，請延續。

- 需求規格：`docs/handoff-spec.md`；現況與規格差距：`docs/gap-analysis.md`
- `legacy/demo-v3/` 是舊展示版，只供參考，不部署，不要修改

## 指令

```bash
cd app && python3 -m http.server 8080   # 只跑前端（門禁不啟用）
npm install                             # 安裝 wrangler（後台測試與 wrangler dev 需要）
npm run dev                             # wrangler dev：前端 + worker 後台一起跑
npm test                                # 兩組測試都跑
node tests/e2e.test.js                  # 前端端對端測試（Playwright，自帶靜態伺服器）
node tests/worker.test.js               # 後台測試（會用 wrangler dev 在本機起 worker）
```

- 沒有 build、沒有 lint、沒有框架；原生 ES modules 直接部署。
- 測試是自寫的 `test(name, fn)` 腳本，不是 Jest/Mocha，**沒有只跑單一測試的參數**。要只跑某項，暫時把其他 `await test(...)` 註解掉，或複製該段到暫存腳本。
- e2e 測試需要 `python3`（`tests/check_zip.py` 驗證 ZIP 與 PNG 尺寸），並直接讀寫 localStorage 鍵 `brand-studio-v2`。

## 架構

**兩層：** `app/` 是 PWA 本體（靜態資源）；`worker/index.js` 是 Cloudflare Worker，負責 Google 登入、申請審核與門禁。`wrangler.jsonc` 設定 `run_worker_first: true`，所有請求都先經過 worker。

### 前端資料流（`app/js/`）

- `model.js` 定義品牌資料模型（`schemaVersion` 2）、舊版遷移、檢查與儲存；`store.js` 持有全域 state，`commit()` 後觸發重新渲染。
- 共用品牌核心：`identity`、`answers`、`freeform`（每題自由回答原文）、`selectedDesignId`。平台專屬內容在 `platforms.{facebook,website,instagram,lineOA,threads}`。
- **覆寫規則**：平台文字預設由共用資料推導；使用者手改過的欄位存在 `overrides`，共用資料更新時不能覆蓋它們。改推導邏輯時要保住這個行為（有測試檢查）。
- 推導鏈：`brand.js`（配色、禁忌、照片、名稱、自由回答解析與衝突偵測）→ `copy.js`（規則式文案，不虛構資格或案例，缺資料時用【待填】）→ `draw.js`（Canvas 繪圖，三種風格）。
- **預覽與下載用同一份繪圖程式**（`draw.js`），不要為下載另寫一套。
- `main.js` 用 hash 路由（`#/profile`、`#/design`、`#/results/<platform>/<tab>`、`#/advanced`、`#/admin`），每個 view 在 `views/` 匯出 `render(main, rest)`。
- `line.js` 處理 LINE 圖文選單（六／八格、單／雙頁）座標與 `upload-richmenu.sh`。權杖只從環境變數讀，絕不寫進素材或匯出檔（有測試檢查）。
- `zip.js` 自己實作 ZIP，沒有外部套件；整個前端不引入第三方函式庫。
- 品牌問卷資料只存在使用者裝置（localStorage），不上傳伺服器。

### Service worker（`app/sw.js`）

- **發佈新版時要改 `VERSION`**，否則已安裝的使用者會一直用舊快取。
- **新增或刪除 `app/` 下的檔案（`gate/` 除外）時，要同步更新 `FILES`**。e2e 測試會比對兩邊，不一致就失敗。
- `app/_headers` 設定 `sw.js` 與 `index.html` 不快取。

### 門禁（`worker/index.js`）

- `GOOGLE_CLIENT_ID` 留白時門禁不啟用，整站公開；目前已填入（它是公開 ID，不是密鑰）。
- 使用者資料存在 Durable Object `Registry`（SQLite），用 `idFromName('main')` 取得單一實例。
- 公開路徑：`/gate/`、`/css/`、`/icons/`、`/api/`。其他資源只給狀態為 `approved` 的使用者；未通過的頁面請求會被導到 `/gate/`。
- 寫入類 API 必須是 POST，帶標頭 `x-brand-studio: 1`，且同網域（防 CSRF）。
- 管理者由 `ADMIN_EMAILS` 決定，登入即自動通過，且不能被停用。
- `ALLOW_TEST_LOGIN=yes` 允許 `test:<email>` 假憑證，只給 `tests/worker.test.js` 透過 `--var` 使用。**絕不能**寫進 `wrangler.jsonc` 或 Cloudflare 後台。

## 部署

Cloudflare Workers（Worker 名稱 `ip-maker`）透過 GitHub App「Cloudflare Workers and Pages」在推送後自動部署。若推送後沒有新部署，先確認該 App 的 Repository access 有包含這個 repo。
