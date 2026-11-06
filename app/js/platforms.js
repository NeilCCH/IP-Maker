// 五個平台的預設品牌包：素材、文字、設定引導、完成狀態。
// 尺寸為常見建議值，平台會調整規格——實際上傳時以各平台後台提示為準（見設定引導）。
import * as draw from './draw.js';
import { postIdeas } from './copy.js';

const firstIdea = (D) => postIdeas(D)[0];
const secondIdea = (D) => postIdeas(D)[1] || postIdeas(D)[0];

export const PLATFORMS = [
  {
    id: 'facebook', name: 'Facebook', icon: 'chat',
    summary: '頭像、封面、個人介紹、貼文版型、文案與提示詞',
    assets: [
      { id: 'avatar', label: '頭像', w: 1080, h: 1080, round: true, note: '顯示時會裁成圓形', render: (c, w, h, D) => draw.avatar(c, w, h, D) },
      { id: 'cover', label: '封面', w: 1640, h: 624, note: '手機會裁掉左右兩側，重要文字已放在中間安全區', safe: true, render: (c, w, h, D) => draw.cover(c, w, h, D) },
      { id: 'post1', label: '貼文版型 1', w: 1080, h: 1350, render: (c, w, h, D) => draw.post(c, w, h, D, firstIdea(D)) },
      { id: 'post2', label: '貼文版型 2', w: 1080, h: 1350, render: (c, w, h, D) => draw.post(c, w, h, D, secondIdea(D)) },
    ],
    checklist: [
      { id: 'assets', kind: 'system', label: '頭像、封面、貼文版型與文案已產出' },
      { id: 'avatar', kind: 'manual', label: '上傳頭像' },
      { id: 'cover', kind: 'manual', label: '上傳封面並確認手機版裁切' },
      { id: 'intro', kind: 'manual', label: '貼上個人簡介' },
      { id: 'firstPost', kind: 'manual', label: '發佈第一則貼文' },
      { id: 'api', kind: 'api', label: '自動發文／排程（需 Meta 授權，尚未串接）' },
    ],
    guide: [
      { title: '換頭像', body: '在 Facebook 個人檔案點頭像 →「選擇頭像」→ 上傳下載的「頭像」圖片。', check: 'avatar' },
      { title: '換封面', body: '點封面右下角「編輯封面相片」→ 上傳「封面」圖片。用手機檢查一次，文字應完整出現。', check: 'cover' },
      { title: '貼上個人簡介', body: '個人檔案 →「編輯個人檔案」→ 個人簡介，貼上「修改」頁的簡介文字。', check: 'intro' },
      { title: '發第一則貼文', body: '從「修改」頁複製貼文範本，把【待填】換成你的真實內容，搭配「貼文版型」圖片發佈。', check: 'firstPost' },
    ],
    test: { label: '用手機打開你的 Facebook 個人檔案，確認頭像、封面與簡介。' },
    task: '製作 Facebook 個人帳號的品牌素材：頭像、封面、個人簡介、3 則貼文文案與貼文圖片版型。',
  },
  {
    id: 'website', name: '個人網頁', icon: 'link',
    summary: '網頁版型、個人介紹、服務內容、聯絡入口；可直接部署的 HTML 檔',
    assets: [
      { id: 'og', label: '網頁分享縮圖', w: 1200, h: 630, note: '貼網址到 LINE、FB 時顯示的預覽圖', render: (c, w, h, D) => draw.cover(c, w, h, D) },
    ],
    checklist: [
      { id: 'assets', kind: 'system', label: '網頁檔（index.html）已產出，可直接部署' },
      { id: 'fill', kind: 'manual', label: '把網頁中的【待填】換成真實資料' },
      { id: 'deploy', kind: 'manual', label: '上傳到免費主機並取得網址' },
      { id: 'link', kind: 'manual', label: '把網址填回 APP，供 LINE／IG 入口使用' },
      { id: 'api', kind: 'api', label: '自動部署到每位同仁的網址（需後端，尚未串接）' },
    ],
    guide: [
      { title: '先補齊資料', body: '在「修改」頁把「關於我」中的【待填】換成你的真實年資、證照與經歷。沒有的就刪掉那一行，不要編造。', check: 'fill' },
      { title: '下載網頁素材包', body: '在「下載」頁按「下載本平台素材包」，解壓縮後會有一個資料夾，裡面有 index.html。' },
      { title: '免費上線（擇一）', body: '方法 A：打開 Netlify Drop，把整個資料夾拖進網頁，就會拿到網址（需免費註冊才能長期保留）。\n方法 B：Cloudflare Pages →「直接上傳」→ 選擇資料夾。\n兩者目前都有免費方案，若平台調整收費，會先在此說明。', link: 'https://app.netlify.com/drop', check: 'deploy' },
      { title: '把網址填回來', body: '在下方「我的網頁網址」貼上網址，LINE 選單與 IG 簡介就能連過去。', check: 'link' },
    ],
    test: { label: '用手機打開你的網頁網址，確認排版與聯絡按鈕。', urlField: 'publishedUrl' },
    task: '製作響應式個人品牌網頁（單頁）：首頁、關於我、服務項目、聯絡入口。需可直接部署為靜態網站。',
  },
  {
    id: 'instagram', name: 'Instagram', icon: 'star',
    summary: '頭像、自介、精選動態封面、貼文與短影音封面、文案及提示詞',
    assets: [
      { id: 'avatar', label: '頭像', w: 1080, h: 1080, round: true, note: '顯示時會裁成圓形', render: (c, w, h, D) => draw.avatar(c, w, h, D) },
      { id: 'post1', label: '貼文 1（4:5）', w: 1080, h: 1350, render: (c, w, h, D) => draw.post(c, w, h, D, firstIdea(D)) },
      { id: 'post2', label: '貼文 2（4:5）', w: 1080, h: 1350, render: (c, w, h, D) => draw.post(c, w, h, D, secondIdea(D)) },
      { id: 'reels', label: '短影音封面', w: 1080, h: 1920, note: '個人頁只顯示中間區塊，重點已放在中央', render: (c, w, h, D) => draw.reelsCover(c, w, h, D, firstIdea(D)) },
      ...[0, 1, 2, 3].map((i) => ({ id: `hl${i + 1}`, label: `精選動態封面 ${i + 1}`, w: 1080, h: 1920, round: true, note: '只會顯示中間圓形', render: (c, w, h, D) => draw.highlight(c, w, h, D, D.services[i]?.label || '服務', i) })),
    ],
    checklist: [
      { id: 'assets', kind: 'system', label: '頭像、貼文、短影音封面、精選封面與文案已產出' },
      { id: 'avatar', kind: 'manual', label: '上傳頭像' },
      { id: 'bio', kind: 'manual', label: '貼上個人簡介（150 字內）' },
      { id: 'highlights', kind: 'manual', label: '建立精選動態並套用封面' },
      { id: 'firstPost', kind: 'manual', label: '發佈第一則貼文' },
      { id: 'api', kind: 'api', label: '自動發文（需 Meta 商業帳號授權，尚未串接）' },
    ],
    guide: [
      { title: '換頭像與簡介', body: '個人檔案 →「編輯個人檔案」→ 換頭像、貼上簡介。簡介超過 150 字會被截斷，APP 會提醒字數。', check: 'avatar' },
      { title: '確認簡介', body: '把網頁或 LINE 官方帳號網址放進「連結」欄位。', check: 'bio' },
      { title: '精選動態', body: '精選動態要先有限時動態。發一則限時動態 → 個人頁「新增精選」→ 編輯封面 → 選精選動態封面圖。', check: 'highlights' },
      { title: '第一則貼文', body: '用「貼文」圖片搭配「修改」頁的文案發佈，先把【待填】換成真實內容。', check: 'firstPost' },
    ],
    test: { label: '用另一支手機或請同事搜尋你的帳號，確認頭像、簡介、精選動態。' },
    task: '製作 Instagram 品牌素材：頭像、個人簡介（150 字內）、4 個精選動態封面、2 則貼文（4:5）、1 個短影音封面與腳本。',
  },
  {
    id: 'lineOA', name: 'LINE 官方帳號', icon: 'chat',
    summary: '頭像、歡迎圖卡與訊息、圖文選單、入口功能、設定資料與指引',
    assets: [
      { id: 'avatar', label: '頭像', w: 640, h: 640, round: true, note: '官方帳號頭像，顯示時為圓形', render: (c, w, h, D) => draw.avatar(c, w, h, D) },
      { id: 'welcome', label: '歡迎圖卡', w: 1040, h: 1040, note: '可放在加入好友的歡迎訊息中', render: (c, w, h, D) => draw.welcomeCard(c, w, h, D) },
      // 圖文選單由 lineAssets() 依頁數動態產生
    ],
    checklist: [
      { id: 'assets', kind: 'system', label: '頭像、歡迎圖卡、選單圖、點擊區設定檔已產出' },
      { id: 'account', kind: 'manual', label: '建立 LINE 官方帳號（本人登入、同意條款）' },
      { id: 'profile', kind: 'manual', label: '上傳頭像、設定狀態消息' },
      { id: 'greeting', kind: 'manual', label: '設定加入好友歡迎訊息（文字＋歡迎圖卡）' },
      { id: 'richmenu', kind: 'manual', label: '上傳圖文選單並設定每格動作' },
      { id: 'replies', kind: 'manual', label: '為「送出文字」的入口設定自動回應' },
      { id: 'api', kind: 'api', label: 'Agent 代設八格／雙頁選單（需 Messaging API 與後端，尚未串接）' },
    ],
    guide: [
      { title: '建立官方帳號', body: '用你自己的 LINE 帳號登入 LINE 官方帳號管理後台，建立一般帳號。這一步需要本人登入與同意條款，系統無法代辦。', link: 'https://tw.linebiz.com/', check: 'account' },
      { title: '頭像與狀態消息', body: '後台 → 設定 → 帳號設定：上傳「頭像」，狀態消息貼上「修改」頁的文字（20 字內）。', check: 'profile' },
      { title: '歡迎訊息', body: '後台 → 聊天／訊息 →「加入好友的歡迎訊息」：貼上歡迎訊息文字，再加一則圖片訊息放「歡迎圖卡」。', check: 'greeting' },
      { title: '圖文選單', body: '', check: 'richmenu', dynamic: 'richmenu' },
      { title: '自動回應', body: '後台 → 自動回應訊息 → 新增：關鍵字填入口名稱（例如「認識我」），回應填該入口的說明。對照「下載」頁的點擊區對照圖逐一設定。', check: 'replies' },
    ],
    test: { label: '用自己的手機加入官方帳號好友，確認歡迎訊息，逐格點選單測試。', urlField: 'oaUrl' },
    task: '製作 LINE 官方帳號品牌素材：頭像、加入好友歡迎訊息與歡迎圖卡、圖文選單圖片（2500×1686）與點擊區設定。沿用 LINE 官方聊天框架，只設計可客製的部分。',
  },
  {
    id: 'threads', name: 'Threads', icon: 'doc',
    summary: '頭像、自介、文字風格、主題方向、貼文範本與提示詞',
    assets: [
      { id: 'avatar', label: '頭像', w: 1080, h: 1080, round: true, note: 'Threads 通常沿用 Instagram 頭像', render: (c, w, h, D) => draw.avatar(c, w, h, D) },
      { id: 'quote', label: '觀點圖卡', w: 1080, h: 1350, render: (c, w, h, D) => draw.quoteCard(c, w, h, D, D.slogan || firstIdea(D).title) },
      { id: 'post1', label: '清單圖卡', w: 1080, h: 1350, render: (c, w, h, D) => draw.post(c, w, h, D, firstIdea(D)) },
    ],
    checklist: [
      { id: 'assets', kind: 'system', label: '頭像、圖卡、文字風格、主題方向與貼文範本已產出' },
      { id: 'profile', kind: 'manual', label: '用 Instagram 帳號登入 Threads、確認頭像' },
      { id: 'bio', kind: 'manual', label: '貼上個人簡介' },
      { id: 'firstPost', kind: 'manual', label: '發佈第一則貼文' },
      { id: 'api', kind: 'api', label: '自動發文（需 Threads API 授權，尚未串接）' },
    ],
    guide: [
      { title: '登入與頭像', body: 'Threads 使用 Instagram 帳號登入，頭像可從 IG 匯入；若想用不同頭像，上傳下載的「頭像」。', check: 'profile' },
      { title: '個人簡介', body: '「編輯個人檔案」→ 貼上簡介。', check: 'bio' },
      { title: '固定經營', body: '照「主題方向」每週輪替。每則只講一個重點，先寫真實觀察，不要寫虛構案例。', check: 'firstPost' },
    ],
    test: { label: '發第一則貼文後，用另一個帳號查看排版。' },
    task: '製作 Threads 品牌經營包：個人簡介、文字風格指南、每週主題方向、3 則貼文範本（500 字內）與圖卡。',
  },
];

export const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

/** LINE 圖文選單相關素材依頁數動態產生 */
export function lineAssets(line) {
  const out = [];
  for (let p = 0; p < line.pages; p++) {
    out.push({ id: `richmenu${p + 1}`, file: `richmenu-page-${p + 1}`, label: `圖文選單 第 ${p + 1} 頁（上傳用）`, w: 2500, h: 1686, note: line.pages === 2 ? '上方為切頁區，不占服務格' : '', render: (c, w, h, D) => draw.richMenu(c, w, h, D, line, p) });
    out.push({ id: `clickmap${p + 1}`, file: `clickmap-page-${p + 1}`, label: `點擊區對照圖 第 ${p + 1} 頁`, w: 2500, h: 1686, note: '設定動作時對照用，不要上傳', render: (c, w, h, D) => draw.clickMap(c, w, h, D, line, p) });
  }
  return out;
}

export function assetsFor(pid, state) {
  const P = PLATFORM_BY_ID[pid];
  return pid === 'lineOA' ? [...P.assets, ...lineAssets(state.platforms.lineOA)] : P.assets;
}

/** 完成狀態：已完成（系統產出或本人確認）／待本人操作／尚未串接 */
export function statusOf(pid, state) {
  const P = PLATFORM_BY_ID[pid];
  const ck = state.platforms[pid].checklist;
  return P.checklist.map((it) => {
    if (it.kind === 'system') return { ...it, status: 'done', text: '已完成（系統產出）' };
    if (it.kind === 'api') return { ...it, status: 'none', text: '尚未串接' };
    return ck[it.id] ? { ...it, status: 'done', text: '已完成（本人確認）' } : { ...it, status: 'todo', text: '待本人操作' };
  });
}
