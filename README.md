# 品牌實驗室｜個人品牌工作台

給保險業務同仁使用的個人品牌 PWA。回答幾個簡單問題，用**同一份品牌資料**產出五個平台的品牌素材：Facebook、個人網頁、Instagram、LINE 官方帳號、Threads。

- 需求規格：[`docs/handoff-spec.md`](docs/handoff-spec.md)
- 現況與規格差距：[`docs/gap-analysis.md`](docs/gap-analysis.md)
- 舊展示版原始碼（僅供參考，不再部署）：`legacy/demo-v3/`

## 使用方式（初學者三步）

1. **說說你自己**：13 題，一次一題。每題都有常駐的自由回答欄，可以只選選項、選項加文字，或直接打字。自動保存。
2. **選喜歡的樣子**：同一份資料、三種風格（專業科技／簡約現代／親和專業）的實際素材並排比較。
3. **連接並完成**：五個平台都有「預覽 → 修改 → 下載 → 提示詞 → 設定引導」，並清楚顯示「已完成／待本人操作／尚未串接」。

備份、匯入、全部素材包、範例資料都放在「進階工具」。

## 技術架構

原生 HTML／CSS／JavaScript（ES modules），沒有框架，也不需要 build。所有素材用 Canvas 即時繪製，**預覽與下載使用同一份繪圖程式**。

```
app/                    ← 部署這個資料夾
  index.html  sw.js  manifest.webmanifest  _headers
  css/app.css
  js/
    main.js             路由、事件委派、PWA 安裝與更新
    model.js            品牌資料模型 schemaVersion 2、舊版遷移、檢查、儲存
    brand.js            推導設計結果：配色、禁忌、照片、名稱；自由回答解析與衝突偵測；命名提案
    copy.js             規則式文案（不虛構資格與案例，未提供時用【待填】）
    draw.js             繪圖引擎（三種風格、全部素材）
    line.js             LINE 圖文選單座標、設定檔、Messaging API 上傳指令
    platforms.js        五平台素材、設定引導、完成狀態
    prompt.js           各平台提示詞
    website.js          可部署的個人網頁 index.html
    export.js / zip.js  素材輸出與 ZIP 打包（無外部套件）
    data/               題庫、配色、三種風格
    views/              各畫面
tests/
  e2e.test.js           端對端驗收測試（22 項）
  check_zip.py          素材包完整性與尺寸檢查
```

### 資料模型重點

- `identity`、`answers`、`freeform`（每題原文）、`selectedDesignId` 為共用品牌核心；`platforms.{facebook,website,instagram,lineOA,threads}` 存平台專屬內容。
- 平台文字預設由共用資料自動產生；使用者手動改過的欄位存在 `overrides`，共用資料更新時**不會被覆蓋**。
- LINE 入口依「服務順序」產生；手動改過後若服務順序變動，會詢問是否套用。
- 匯入支援：v2 進度檔、舊展示版 localStorage／匯出檔、舊版「共用品牌資料.json」。匯入失敗不會動到現有進度。

## 開發與測試

```bash
cd app && python3 -m http.server 8080
```

```bash
node tests/e2e.test.js
```

測試涵蓋：問答三種回答方式與上限、重啟還原、衝突確認、錯誤與舊版匯入、三款風格差異、風格切換保留內容、五平台五個分頁、手動內容不被覆蓋、提示詞內容、LINE 六／八格與單／雙頁座標、隱藏入口保留、五平台 ZIP 完整性與尺寸、HTML 跳脫、素材不含憑證、375px 手機不破版、照片套用與「不放照片」、PWA 快取清單、離線開啟。

**每次發佈新版**：修改 `app/sw.js` 的 `VERSION`，否則已安裝的使用者會繼續使用舊快取。新增 JS 檔時要加進 `sw.js` 的 `FILES`（測試會檢查）。

## 部署（免費）

目前部署在 **Cloudflare Workers**（免費方案），repo 根目錄的 `wrangler.jsonc` 指定只發佈 `app` 資料夾。

1. Cloudflare 後台 → Workers 和 Pages → 建立 → 匯入 GitHub repo `NeilCCH/IP-Maker`（已完成，Worker 名稱 `ip-maker`）。
2. 到 `ip-maker` →「設定」→「網域和路由」→ 啟用 `workers.dev`，就會得到 `ip-maker.<帳號子網域>.workers.dev` 網址。
3. 之後每次推送到部署分支，Cloudflare 會自動重新部署。

`app/_headers` 已設定 `sw.js` 與 `index.html` 不快取，確保更新能被偵測到。

> 舊展示版的 ChatGPT Sites 設定（`.openai/hosting.json`）沒有搬進來，也沒有改動原站點。

## 目前限制

- 資料只存在使用者的瀏覽器，不跨裝置同步；請用「進階工具」匯出備份。
- 素材是規則式版型，不是 AI 生圖；需要 AI 生圖時使用各平台提示詞。
- 不會代使用者登入、發文或設定任何平台。LINE 八格／雙頁選單提供 `upload-richmenu.sh` 給主持人在電腦執行（權杖只從環境變數讀取），**尚未在真實官方帳號驗證**。
- 圖片字型依裝置而定（iPhone 為蘋方、Windows 為微軟正黑體），不同裝置下載的圖片字形會略有差異。
- 各平台素材尺寸為常見建議值，平台可能調整，上傳時以後台提示為準。
