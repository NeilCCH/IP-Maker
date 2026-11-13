// 品牌規範（brand.md）：把問卷與風格整理成一份給任何 AI 使用的品牌規範，並附上使用指示。
// 內容架構：品牌核心與標語、服務對象、三個關鍵詞、語氣規則、三個不要、
//           完整色票（色碼與使用比例）、字型層級（標題／內文／數字）、圖像風格要與不要、識別方式。
import { avoidSummary, isPH } from './brand.js';
import { greeting } from './copy.js';

const TODO = '【待補】';
const v = (x) => (x && String(x).trim() && !isPH(x) ? String(x).trim() : TODO);
const list = (a) => (a && a.length ? a.join('、') : TODO);

const FONT_RULES = {
  '現代黑體・俐落': ['現代黑體，粗體（700）', '現代黑體，一般粗細（400），行高 1.6–1.8', '無襯線字，使用等寬數字對齊', '思源黑體（Noto Sans TC）'],
  '粗黑體・有力量': ['粗黑體（800–900），字距略緊', '黑體，一般粗細（400）', '粗黑體，數字可放大強調', '思源黑體 Heavy（Noto Sans TC 900）'],
  '圓體・親切': ['圓體，中粗（600–700）', '黑體或圓體，一般粗細（400）', '圓體或黑體', 'jf 粉圓（open huninn）、思源黑體'],
  '細黑體・輕盈': ['細黑體（300），以大字級營造層次', '黑體，一般粗細（400）', '細黑體，大字級', '思源黑體 Light（Noto Sans TC 300）'],
  '明體・典雅': ['明體／宋體，中粗（600）', '黑體（易讀），一般粗細（400）', '黑體數字', '思源宋體（Noto Serif TC）＋思源黑體'],
  '手寫感・有溫度': ['手寫感字型，只用在短標題或重點（少量）', '黑體，一般粗細（400）', '黑體數字', '標題可選手寫風免費字型，內文用思源黑體'],
  '標題粗、內文細': ['黑體粗體（700–900）', '黑體細體（300–400）', '黑體粗體', '思源黑體（Noto Sans TC）'],
  '數字用等寬字・科技感': ['現代黑體，粗體（700）', '現代黑體（400）', '等寬字型，數字對齊整齊', '思源黑體＋等寬英數字（例如 JetBrains Mono、Roboto Mono）'],
};

const SIGNATURE_HOW = {
  固定頭像: '所有平台使用同一張頭像',
  名字文字標: '品牌名稱用固定字型與主色呈現',
  '品牌 Logo': '固定使用同一個 Logo（尚無 Logo 時不得自行虛構）',
  固定標語: '重要畫面固定放上品牌標語',
  固定主色: '每張圖都要出現主色',
  固定開場白: '文章與訊息使用固定開場白',
  固定結尾簽名: '文章結尾使用固定簽名',
  固定版型: '同類內容使用同一個版型',
  固定圖示符號: '固定使用同一套線條圖示',
};

/** 還沒填、需要 AI 訪問補齊的項目 */
export function missingItems(state, D) {
  const m = [];
  if (!D.whoami) m.push('我是誰（一句話介紹）');
  if (!D.slogan) m.push('品牌標語');
  if (!D.brandName && !D.personName) m.push('品牌名稱或姓名');
  if (!D.keywords.length) m.push('三個品牌關鍵字');
  if (!D.audience.length) m.push('服務對象');
  if (!D.audiencePain) m.push('服務對象的處境與煩惱');
  if (!state.answers.tone.length) m.push('語氣');
  if (!state.answers.avoid.length && !(state.freeform.avoid || '').trim()) m.push('三個不要');
  if (!state.answers.font.length) m.push('字型');
  if (!D.imagery.length) m.push('圖像風格');
  if (!D.signature.length) m.push('識別方式');
  return m;
}

export function brandMd(state, D) {
  const p = D.palette;
  const font = FONT_RULES[D.font] || FONT_RULES['現代黑體・俐落'];
  const avoidVisual = avoidSummary(D);
  const ff = (id) => (state.freeform[id] || '').trim();
  const today = new Date().toISOString().slice(0, 10);
  return `# ${D.titleName} 品牌規範（brand.md）

> 由「品牌實驗室」整理，${today}。標示「${TODO}」的項目尚未決定。

## 1. 品牌核心
- 我是誰：${v(D.whoami)}
- 我的一句話（標語）：${v(D.slogan)}
- 品牌名稱：${v(D.brandName)}
- 本人姓名：${v(D.personName)}${D.jobTitle ? `（${D.jobTitle}）` : ''}
- 對外名稱呈現：${v(D.displayName)}
- 定位：${v(D.positioning)}

## 2. 服務對象
- 主要客群：${list(D.audience)}
- 他們的處境與煩惱：${v(D.audiencePain)}
- 我的專長：${list(D.expertise)}
- 服務項目（依優先順序）：${list(D.services.slice(0, 8).map((e) => e.label).filter(Boolean))}

## 3. 三個品牌關鍵字
${D.keywords.length ? D.keywords.map((k, i) => `${i + 1}. ${k}`).join('\n') : TODO}
- 這三個詞給人的顏色與感覺：${v(D.feeling)}

- 自己圈選、最像我的 6 個詞：${list(D.selfWords)}

## 4. 語氣規則
- 語氣：${D.tone}
- 說話順序：${v(D.toneOrder)}
- 開場範例：${greeting(D).replace(/\n/g, ' ')}
- 用詞原則：使用台灣繁體中文；說明清楚、不誇大；不保證報酬或理賠結果；不使用恐嚇式標題。
${ff('tone') ? `- 本人補充：${ff('tone')}\n` : ''}
## 5. 三個「不要」
- 不要的視覺：${list(avoidVisual)}
- 本人寫下的不要（用詞／調性／視覺）：${v(ff('avoid'))}

## 6. 色彩
| 用途 | 色碼 | 建議比例 |
|---|---|---|
| 底色（背景、卡片） | ${p.bg} | 約 60% |
| 主色（標題、按鈕、重點區塊） | ${p.primary} | 約 30% |
| 輔助色（重點、線條、小面積點綴） | ${p.accent} | 約 10% |
| 文字色 | ${p.ink} | 內文與標題 |

- 色票名稱：${p.name}${p.auto ? '（系統依關鍵字與禁忌建議）' : ''}
- 文字放在底色上要清楚易讀（對比至少 4.5:1）。

## 7. 字型層級
| 層級 | 規則 |
|---|---|
| 標題 | ${font[0]} |
| 內文 | ${font[1]} |
| 數字 | ${font[2]} |

- 字型感覺：${D.font}
- 免費字型建議：${font[3]}

## 8. 圖像風格
- 要：${list(D.imagery)}；視覺風格「${D.design.name}」（${D.design.rules.join('；')}）
- 照片：${{ none: '不放本人照片，用文字標誌', avatar: '只有頭像使用本人照片', hero: '本人照片醒目呈現', moderate: '本人照片適度呈現' }[D.photoMode]}
- 不要：${list([...avoidVisual, '虛構的人物肖像或假的客戶照片'])}
${ff('imagery') ? `- 本人補充：${ff('imagery')}\n` : ''}
## 9. 識別方式（別人怎麼認出我）
${D.signature.length ? D.signature.map((s) => `- ${s}：${SIGNATURE_HOW[s] || ''}`).join('\n') : `- ${TODO}`}
${D.slogan ? `- 固定標語：「${D.slogan}」\n` : ''}
## 10. 使用原則
- 不得虛構本人的經歷、證照、得獎、客戶案例或數據；沒有資料時先詢問。
- 不得宣稱已完成任何平台的登入、上架、串接或發送。
- 任何需要付費的工具或服務，先說明費用與免費替代方案。
`;
}

export function guidePrompt(state, D) {
  const miss = missingItems(state, D);
  return `這是我的個人品牌規範（brand.md），請先完整讀過並記住。

1. ${miss.length ? `規範裡標示「${TODO}」的項目（${miss.join('、')}），請一題一題訪問我，一次只問一題。問完後幫我整理成完整的品牌規範，用 Markdown 給我一份更新後的 brand.md。` : '請檢查這份規範有沒有矛盾或不清楚的地方，有的話一次問我一題；沒有的話，回覆「已了解品牌規範」。'}
2. 之後我請你做任何東西（貼文、圖片、網頁、簡報、LINE 訊息、影片腳本），都要照這份規範：品牌核心、語氣、色票與比例、字型層級、圖像風格的「要」與「不要」、識別方式。
3. 不得虛構我的經歷、資格、客戶案例或數據；需要時請先問我。
4. 使用台灣繁體中文。

---

${brandMd(state, D)}`;
}
