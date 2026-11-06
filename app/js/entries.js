// LINE 選單入口內容：每一格「按下去有東西」
// 類型：reply 文字回覆／form 需求表單／link 連結／chat 留言給本人
import { PH } from './brand.js';
import { topicsFor, postIdeas } from './copy.js';
import { safeURL } from './util.js';

export const ENTRY_TYPES = [
  { id: 'reply', name: '文字回覆', hint: '客人按下去，收到你準備好的說明文字（需在後台設定自動回應）' },
  { id: 'form', name: '需求表單', hint: '打開你的 Google 表單，填寫結果自動進試算表' },
  { id: 'link', name: '連結', hint: '打開一個網址，例如你的個人網頁、Google 日曆預約頁' },
  { id: 'chat', name: '留言給我', hint: '請客人直接打字，由你本人回覆' },
];
export const TYPE_NAME = Object.fromEntries(ENTRY_TYPES.map((t) => [t.id, t.name]));

export const LINE_REPLY_MAX = 500; // 後台自動回應文字建議上限（實作時以後台提示為準）
export const LINE_URI_MAX = 1000; // Messaging API uri action 上限

export function defaultType(label) {
  if (/預約|需求填寫|保單健檢|需求表/.test(label)) return 'form';
  if (/留言/.test(label)) return 'chat';
  return 'reply';
}

const TOPIC_BY_LABEL = [
  [/退休/, /退休/], [/企業/, /企業|風險/], [/保單|保障|家庭/, /保單/], [/傳承|資產/, /傳承/], [/醫療|長照/, /醫療|長照/], [/理賠/, /理賠|服務/],
];

function topicFor(label) {
  for (const [re, topicRe] of TOPIC_BY_LABEL) if (re.test(label)) {
    const t = topicsFor({ expertise: [topicRe.source.replace(/[|\\]/g, ' ')] })[0];
    if (t && t.tag !== '保險規劃') return t.items[0];
  }
  return null;
}

const closing = (D, cta = '想進一步了解，可以點選單的「預約諮詢」，或直接留言給我。') =>
  D.toneFamily === '簡短俐落' ? '有需要，直接留言給我。' : cta;

/** 依入口名稱產生預設回覆文字（不虛構經歷與數據，未知處用【待填】） */
export function generateReply(D, entry, state) {
  const label = entry.label || '';
  const name = D.personName || PH('姓名');
  const who = D.audience.length ? D.audience.join('、') : '想把規劃理清楚的朋友';
  const web = safeURL(state?.platforms?.website?.publishedUrl);
  if (/認識|關於|介紹/.test(label))
    return [`我是${name}${D.jobTitle ? `，${D.jobTitle}` : ''}。`, `主要服務${who}，專注${D.expertise.join('、') || '保險規劃'}。`, PH('年資、證照或服務經歷——只寫真實資料'), D.slogan ? `「${D.slogan}」` : '', web ? `更多介紹：${web}` : ''].filter(Boolean).join('\n');
  if (/留言|聊/.test(label))
    return `請直接輸入想詢問的內容，我看到後會親自回覆。\n回覆時間：${PH('例如平日 9:00–21:00')}`;
  if (/常見問題|問答|FAQ/i.test(label))
    return ['常見問題', '', 'Q：第一次諮詢要準備什麼？', 'A：不用特別準備，先聊聊您的狀況即可；方便的話可以帶著現有保單。', '', 'Q：諮詢需要費用嗎？', `A：${PH('依你的實際做法填寫')}`, '', 'Q：多久會回覆？', `A：${PH('例如一個工作天內')}`].join('\n');
  if (/聯絡/.test(label)) {
    const c = D.contact;
    return ['聯絡方式', c.phone ? `電話：${c.phone}` : `電話：${PH('電話')}`, c.email ? `Email：${c.email}` : '', c.area ? `服務地區：${c.area}` : '', '也可以直接在這裡留言。'].filter(Boolean).join('\n');
  }
  if (/實用資訊|文章|資訊/.test(label)) {
    const ideas = postIdeas(D).slice(0, 3);
    return ['實用資訊', ...ideas.map((i, n) => `${n + 1}. ${i.title}`), '', '想看哪一個主題，直接留言告訴我，我整理後傳給您。'].join('\n');
  }
  if (/活動|講座/.test(label)) return `近期活動：${PH('活動名稱、日期、地點與報名方式')}\n有興趣的話，直接留言告訴我。`;
  if (/預約/.test(label)) return `想預約諮詢，請留下方便聯絡的時段，我會親自與您確認時間。\n（時段由本人人工確認）`;
  const idea = topicFor(label);
  if (idea) return [`${label}`, '', `我通常會先陪您整理：`, ...idea.points.map((p, i) => `${i + 1}. ${p}`), '', closing(D)].join('\n');
  return [`${label}`, entry.description || '', '', closing(D)].filter((l, i) => l || i === 2).join('\n');
}

export function replyValue(D, entry, state) {
  return entry.reply ? entry.reply : generateReply(D, entry, state);
}

/** 表單需要的入口（類型為 form） */
export const formEntries = (line) => line.entries.slice(0, line.pages * 8).filter((e, i) => (i % 8) < line.count && e.type === 'form' && e.label);

/** 表單的「想諮詢的項目」選項 */
export function formChoices(state) {
  const labels = state.platforms.lineOA.entries.map((e) => e.label).filter((l) => l && !/留言|常見問題|實用資訊|聯絡|活動|認識|預約|需求填寫/.test(l));
  return [...new Set([...labels.slice(0, 10), '其他'])];
}

const jsStr = (s) => JSON.stringify(String(s));

/** Google Apps Script：在使用者自己的 Google 帳號建立表單與試算表，並輸出每個入口的預填網址 */
export function formScript(state, D) {
  const line = state.platforms.lineOA;
  const brand = D.brandName || D.personName || '我的品牌';
  const choices = formChoices(state);
  const entries = formEntries(line).map((e) => e.label);
  return `/**
 * 品牌實驗室：建立「${brand}｜需求表」
 * 會在「你自己的」Google 帳號建立一份 Google 表單和一份回覆試算表，不會傳資料給任何第三方。
 * 用法：到 script.google.com →「新專案」→ 刪掉原本內容、貼上全部 → 按上方「執行」。
 * 第一次執行會要求授權：這是你自己的程式，Google 會提醒「尚未驗證」，
 * 請點「進階」→「前往（專案名稱）」→「允許」。
 * 執行完，到下方「執行記錄」複製 BRAND-STUDIO-RESULT 開始的全部文字，貼回品牌實驗室。
 */
function createBrandForm() {
  var CHOICES = ${JSON.stringify(choices)};
  var ENTRIES = ${JSON.stringify(entries)};
  var form = FormApp.create(${jsStr(`${brand}｜需求表`)});
  form.setDescription(${jsStr(`謝謝您的詢問。填寫後由${D.personName || brand}本人親自聯繫您；預約時段需人工確認。`)});
  var topic = form.addMultipleChoiceItem().setTitle('想諮詢的項目').setRequired(true);
  topic.setChoiceValues(CHOICES.concat(ENTRIES.filter(function (e) { return CHOICES.indexOf(e) < 0; })));
  form.addTextItem().setTitle('怎麼稱呼您').setRequired(true);
  form.addTextItem().setTitle('聯絡電話或 LINE ID').setRequired(true);
  form.addMultipleChoiceItem().setTitle('方便聯絡的時段').setChoiceValues(['平日白天', '平日晚上', '週末', '都可以']).setRequired(true);
  form.addParagraphTextItem().setTitle('想先讓我知道的事（選填）');
  form.addCheckboxItem().setTitle('個人資料使用同意')
    .setChoiceValues(['我同意以上資料僅用於本次聯繫與規劃說明，不作其他用途']).setRequired(true);
  var sheet = SpreadsheetApp.create(${jsStr(`${brand}｜需求表回覆`)});
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  var out = ['BRAND-STUDIO-RESULT'];
  ENTRIES.forEach(function (label) {
    var url = form.createResponse().withItemResponse(topic.createResponse(label)).toPrefilledUrl();
    out.push(label + '|' + url);
  });
  out.push('@表單|' + form.getPublishedUrl());
  out.push('@表單管理|' + form.getEditUrl());
  out.push('@回覆試算表|' + sheet.getUrl());
  Logger.log(out.join('\\n'));
}
`;
}

/** 手動建立表單時的題目清單 */
export function formManual(state, D) {
  const brand = D.brandName || D.personName || '我的品牌';
  return [`表單名稱：${brand}｜需求表`, `說明：謝謝您的詢問。填寫後由本人親自聯繫您；預約時段需人工確認。`, '',
    `1. 想諮詢的項目（選擇題，必填）：${[...formChoices(state), ...formEntries(state.platforms.lineOA).map((e) => e.label)].filter((v, i, a) => a.indexOf(v) === i).join('／')}`,
    '2. 怎麼稱呼您（簡答，必填）', '3. 聯絡電話或 LINE ID（簡答，必填）', '4. 方便聯絡的時段（選擇題，必填）：平日白天／平日晚上／週末／都可以',
    '5. 想先讓我知道的事（段落，選填）', '6. 個人資料使用同意（核取方塊，必填）：我同意以上資料僅用於本次聯繫與規劃說明，不作其他用途', '',
    '建好後：右上角「傳送」→ 連結圖示 → 複製網址，貼到 APP 的「表單網址」欄位。', '回覆試算表：表單「回覆」分頁 →「連結至試算表」。'].join('\n');
}

/** 解析貼回來的執行結果；只接受 Google 表單網址 */
export function parseFormResult(text, line) {
  const res = { matched: [], unmatched: [], form: '', edit: '', sheet: '' };
  if (!/BRAND-STUDIO-RESULT/.test(text)) return null;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:.*?\t)?([^|]{1,40})\|(https:\/\/\S+)\s*$/);
    if (!m) continue;
    const [, label, url] = m;
    const ok = /^https:\/\/(docs\.google\.com\/(forms|spreadsheets)|forms\.gle)\//.test(url);
    if (!ok) continue;
    if (label === '@表單') res.form = url;
    else if (label === '@表單管理') res.edit = url;
    else if (label === '@回覆試算表') res.sheet = url;
    else {
      const e = line.entries.find((x) => x.label === label.trim());
      if (e && url.length <= LINE_URI_MAX) { e.url = url; e.type = 'form'; res.matched.push(label); }
      else res.unmatched.push(label);
    }
  }
  return res;
}
