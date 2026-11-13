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

// ---------- AI 工具提示詞：把品牌元素帶到其他 AI 工具 ----------
function brief(state, D) {
  const p = D.palette;
  const ff = (id) => (state.freeform[id] || '').trim();
  return [
    `- 品牌／名稱：${v(D.brandName || D.personName)}（對外呈現：${v(D.displayName)}）`,
    `- 我是誰：${v(D.whoami)}`,
    `- 標語：${v(D.slogan)}`,
    `- 定位與專長：${v(D.positioning)}；${list(D.expertise)}`,
    `- 服務對象：${list(D.audience)}${D.audiencePain ? `（${D.audiencePain}）` : ''}`,
    `- 三個品牌關鍵字：${list(D.keywords)}`,
    `- 語氣：${D.tone}${D.toneOrder ? `，${D.toneOrder}` : ''}`,
    `- 色彩：底色 ${p.bg}（約 60%）、主色 ${p.primary}（約 30%）、輔助色 ${p.accent}（約 10%）、文字色 ${p.ink}`,
    `- 字型感覺：${D.font}`,
    `- 視覺風格：${D.design.name}（${D.design.tag}）`,
    `- 圖像風格：${list(D.imagery)}`,
    `- 不要：${list([...avoidSummary(D), ff('avoid')].filter(Boolean))}`,
    `- 識別方式：${list(D.signature)}`,
  ].join('\n');
}

const RULES = `規則：
- 使用台灣繁體中文。
- 不得虛構我的經歷、證照、得獎、客戶案例或數據；需要時先問我。
- 不使用保證報酬、恐嚇式或制式保險廣告用語。`;

const topicLine = (t, fallback) => (t && t.trim() ? t.trim() : `【請在這裡寫下這次要做的內容，例如：${fallback}】`);

export const AI_PROMPTS = [
  {
    id: 'guide', name: '品牌規範', tools: 'Claude、ChatGPT、Gemini 等聊天型 AI',
    desc: '最完整的一份。貼上後，AI 會記住你的品牌，之後請它做任何東西都照這份規範。還沒填的項目，AI 會一題一題問你。',
    build: (state, D) => guidePrompt(state, D),
  },
  {
    id: 'persona', name: '長期設定', tools: 'ChatGPT「自訂指令」、Claude「專案指示」、Gemini「Gem」',
    desc: '精簡版。貼到 AI 工具的長期設定裡，以後每次對話都自動套用，不用重貼。',
    build: (state, D) => `你是我的個人品牌助理。以下是我的品牌設定，每次回答與製作內容都要遵守。

${brief(state, D)}

${RULES}
- 我沒有特別說明時，文字用上面的語氣；需要視覺時，用上面的色彩、字型感覺與圖像風格。
- 內容與品牌設定衝突時，先提醒我再繼續。`,
  },
  {
    id: 'image', name: 'AI 生圖', tools: 'ChatGPT 生圖、Gemini 生圖、Midjourney、Canva AI', topic: '想畫什麼', example: '退休規劃講座的 IG 貼文主視覺，方形',
    desc: '把配色、風格和禁忌帶進生圖工具，產出符合品牌的圖片。',
    build: (state, D, t) => `請幫我生成一張圖片。

這次要畫的內容：${topicLine(t, '退休規劃講座的 IG 貼文主視覺，方形')}

品牌視覺規範：
- 視覺風格：${D.design.name}（${D.design.rules.join('；')}）
- 色彩：底色 ${D.palette.bg} 約 60%、主色 ${D.palette.primary} 約 30%、輔助色 ${D.palette.accent} 約 10%
- 圖像調性：${list(D.imagery)}
- 字型感覺：${D.font}
- 給人的感覺：${list(D.keywords)}${D.feeling ? `；${D.feeling}` : ''}

不要出現：
- ${[...avoidSummary(D), (state.freeform.avoid || '').trim()].filter(Boolean).join('\n- ') || '（沒有特別限制）'}
- 真人肖像或虛構的人物臉孔（${D.photoMode === 'none' ? '這個品牌不使用人物照片' : '本人照片我會另外提供，請預留位置'}）
- 圖片上的文字請盡量少；需要文字時用繁體中文，${D.brandName ? `品牌名稱是「${D.brandName}」` : '不要自行加上品牌名稱'}${D.slogan ? `，標語是「${D.slogan}」` : ''}，其他文字不要自己編。

請先用一兩句話說明你的構圖想法，再生成圖片。`,
  },
  {
    id: 'writing', name: '寫貼文文案', tools: 'Claude、ChatGPT、Gemini', topic: '想寫什麼', example: '一則 Threads 貼文，主題是退休前要先算清楚的三個數字',
    desc: '用你的語氣和關鍵字寫社群貼文、LINE 訊息或文章。',
    build: (state, D, t) => `請用我的品牌語氣幫我寫文案。

這次要寫的內容：${topicLine(t, '一則 Threads 貼文，主題是退休前要先算清楚的三個數字')}

我的品牌：
${brief(state, D)}

寫作要求：
- 語氣「${D.tone}」${D.toneOrder ? `，${D.toneOrder}` : ''}。開場範例：${greeting(D).replace(/\n/g, ' ')}
- 給我 3 個版本，各附一句說明差異。
- 需要我的真實經驗或數據的地方，用【待補】標出來，不要自己編。
${RULES}`,
  },
  {
    id: 'slides', name: '簡報與海報', tools: 'Gamma、Canva、Claude、ChatGPT', topic: '簡報或海報主題', example: '給準退休族的 20 分鐘講座簡報，約 10 頁',
    desc: '做簡報、講座海報或 DM 時，讓版面、配色和字型都符合品牌。',
    build: (state, D, t) => `請幫我規劃並製作簡報（或海報）。

主題：${topicLine(t, '給準退休族的 20 分鐘講座簡報，約 10 頁')}

版面規範：
- 視覺風格：${D.design.name}（${D.design.rules.join('；')}）
- 色彩：底色 ${D.palette.bg}、主色 ${D.palette.primary}、輔助色 ${D.palette.accent}、文字 ${D.palette.ink}；比例約 60／30／10
- 字型：${(FONT_RULES[D.font] || FONT_RULES['現代黑體・俐落']).slice(0, 3).map((r, i) => ['標題', '內文', '數字'][i] + '用' + r).join('；')}
- 每頁只放一個重點，留白要夠${D.signature.length ? `；固定出現：${D.signature.join('、')}` : ''}

我的品牌：
${brief(state, D)}

請先給我大綱（每頁標題與一句重點），我確認後再做完整內容。
${RULES}`,
  },
  {
    id: 'video', name: '短影音腳本', tools: 'Claude、ChatGPT、Gemini；剪輯時搭配剪映、CapCut', topic: '影片主題', example: '60 秒短影音，主題是保單整理的第一步',
    desc: '寫 Reels、Shorts 的腳本和字卡，口吻和畫面風格與品牌一致。',
    build: (state, D, t) => `請幫我寫短影音腳本。

主題：${topicLine(t, '60 秒短影音，主題是保單整理的第一步')}

我的品牌：
${brief(state, D)}

腳本要求：
- 用表格列出：秒數、畫面、口白、字卡文字。
- 前 3 秒要有吸引人的開場，但不用恐嚇或誇大。
- 口白用「${D.tone}」的語氣，像本人在說話。
- 字卡配色用主色 ${D.palette.primary} 與輔助色 ${D.palette.accent}，字型感覺「${D.font}」。
- 結尾放${D.slogan ? `標語「${D.slogan}」` : '一句行動呼籲'}。
- 另外給我 3 個標題和 5 個標籤。
${RULES}`,
  },
];

export const AI_PROMPT_BY_ID = Object.fromEntries(AI_PROMPTS.map((p) => [p.id, p]));
export const aiPromptText = (state, D, id) => {
  const P = AI_PROMPT_BY_ID[id] || AI_PROMPTS[0];
  return P.build(state, D, state.meta.aiTopics?.[P.id] || '');
};
