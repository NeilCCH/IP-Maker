// 規則式文案：依語氣、客群、專長產生；未提供的資格、經歷、案例一律用【待填】，不虛構。
import { PH } from './brand.js';
import { charLen } from './util.js';

const TOPICS = [
  { re: /退休/, tag: '退休規劃', items: [
    { title: '退休前，先算清楚這 3 個數字', points: ['每月基本生活開銷', '預計退休年齡與準備年數', '目前已有的退休收入來源'] },
    { title: '退休金準備：先分清楚必要與想要', points: ['必要：生活、醫療、居住', '想要：旅行、興趣、陪伴家人', '兩者分開準備，比較不會顧此失彼'] },
  ] },
  { re: /企業|風險/, tag: '企業風險', items: [
    { title: '老闆的個人風險，也是公司的風險', points: ['關鍵人物突然無法工作時，誰接手？', '公司與家庭資金有沒有分開？', '合夥人之間的約定是否清楚？'] },
    { title: '公司與家庭的保障，要分開看', points: ['先列出公司層面的風險', '再列出家庭層面的需求', '兩邊互相影響的地方特別標記'] },
  ] },
  { re: /保單/, tag: '保單整理', items: [
    { title: '保單整理前，先準備這 3 樣東西', points: ['所有保單或保單號碼', '家人的基本資料與需求', '目前每年的保費總額'] },
    { title: '同樣的保障買了兩次？3 個檢查方式', points: ['列出每張保單的保障項目', '標出重複或空缺的地方', '依家庭階段調整優先順序'] },
  ] },
  { re: /傳承/, tag: '資產傳承', items: [{ title: '傳承規劃，先從盤點開始', points: ['列出主要資產類型', '想照顧的人與順序', '需要專業協助確認的法律與稅務細節'] }] },
  { re: /醫療|長照/, tag: '醫療長照', items: [{ title: '長照準備：先了解費用從哪裡來', points: ['可能的照顧方式與差異', '目前已有的保障與資源', '家人之間的分工討論'] }] },
  { re: /理賠|服務/, tag: '理賠服務', items: [{ title: '申請理賠前，先確認這幾件事', points: ['事故或就醫的相關證明', '保單上的保障範圍', '不確定時先詢問，再送件'] }] },
  { re: /教育/, tag: '教育金規劃', items: [{ title: '孩子的教育金，先想清楚這 3 件事', points: ['預計需要的時間點', '大概需要的金額範圍', '目前已有的準備'] }] },
  { re: /外幣|投資/, tag: '外幣保單', items: [{ title: '選外幣或投資型保單前，先問自己 3 個問題', points: ['這筆錢多久內不會用到？', '能接受多少匯率或市場波動？', '真正想解決的需求是什麼？'] }] },
  { re: /財富/, tag: '財富規劃', items: [{ title: '財富規劃，先從這 3 步開始', points: ['整理目前的資產與負債', '分清楚短期與長期目標', '需要時請專業人士協助確認細節'] }] },
];
const GENERIC = { tag: '保險規劃', items: [{ title: '做規劃前，先釐清 3 個問題', points: ['現在最在意的是什麼？', '已經有哪些準備？', '希望多久之後達到什麼狀態？'] }] };

export function topicsFor(D) {
  const text = D.expertise.join(' ');
  const hit = TOPICS.filter((t) => t.re.test(text));
  return hit.length ? hit : [GENERIC];
}
export const postIdeas = (D) => topicsFor(D).flatMap((t) => t.items.map((i) => ({ ...i, tag: t.tag })));

const who = (D) => (D.audience.length ? D.audience.join('、') : '想把規劃理清楚的你');
const exp = (D) => (D.expertise.length ? D.expertise.join('、') : '保險規劃');
const name = (D) => (D.nameIsPlaceholder ? PH('品牌名稱或姓名') : D.titleName);

export function greeting(D) {
  if (D.toneText) return D.toneText;
  const n = name(D), me = D.personName || PH('姓名');
  const byTone = {
    簡短俐落: `您好，歡迎來到${n}。\n請從下方選單選擇服務，或直接留言。`,
    穩重親切: `您好，謝謝您加入${n}。\n有想釐清的安排，都歡迎慢慢聊，我會親自回覆。`,
    溫暖貼心: `謝謝您加入${n}。\n有任何擔心或想法，都可以跟我說，我會用心回覆您。`,
    熱情積極: `歡迎加入${n}！\n一起把重要的事安排好吧！點下方選單看看，或直接留言給我。`,
    幽默輕鬆: `嗨～歡迎來到${n}！\n保險不一定很嚴肅，有問題隨時來聊聊。`,
    理性分析: `您好，我是${me}，專注${exp(D)}。\n我們先把現況整理清楚，再一起看適合的選擇。請從下方選單開始。`,
    正式禮貌: `您好，感謝您加入${n}。\n敬請從下方選單選擇所需服務，我將親自為您回覆。`,
  };
  return byTone[D.tone] || `您好，我是${me}，專注${exp(D)}。\n歡迎從下方選單留下需求，我會親自回覆。`;
}

function trimTo(s, n) {
  const chars = [...s];
  return chars.length <= n ? s : chars.slice(0, n - 1).join('') + '…';
}

function hashtags(D) {
  const tags = topicsFor(D).map((t) => '#' + t.tag);
  if (D.brandName) tags.push('#' + D.brandName);
  return [...new Set(tags)].join(' ');
}

function post(D, idea, platform) {
  const lines = [idea.title, '', ...idea.points.map((p, i) => `${i + 1}. ${p}`), '', PH('補一句你的實際經驗或觀察，不要寫虛構案例')];
  if (D.toneFamily === '穩重親切') lines.push('', '有想聊的地方，歡迎留言或私訊我。');
  else if (D.toneFamily === '簡短俐落') lines.push('', '需要協助，私訊我。');
  else lines.push('', '想進一步了解，歡迎預約時間討論。');
  if (platform === 'instagram') lines.push('', hashtags(D));
  return lines.join('\n');
}

/** 每個平台可編輯的文字欄位；max 為平台字數上限（實作時應再查核官方） */
export const TEXT_FIELDS = {
  facebook: [
    { key: 'intro', label: '個人簡介（建議 101 字內）', max: 101, gen: (D) => trimTo(`${D.positioning}｜陪${who(D)}把${exp(D)}想清楚。${D.slogan ? D.slogan : ''}`, 101) },
    { key: 'post1', label: '貼文範本 1：自我介紹', max: 2000, gen: (D) => [`大家好，我是${D.personName || PH('姓名')}${D.brandName ? `（${D.brandName}）` : ''}。`, '', `我主要協助${who(D)}，專注在${exp(D)}。`, PH('你的年資、證照或服務經歷——只寫真實資料'), '', D.slogan || PH('一句你的品牌標語'), '', '有任何想釐清的安排，歡迎留言或私訊。'].join('\n') },
    { key: 'post2', label: '貼文範本 2：實用清單', max: 2000, gen: (D) => post(D, postIdeas(D)[0], 'facebook') },
    { key: 'post3', label: '貼文範本 3：實用清單', max: 2000, gen: (D) => post(D, postIdeas(D)[1] || postIdeas(D)[0], 'facebook') },
  ],
  instagram: [
    { key: 'bio', label: '個人簡介（150 字內）', max: 150, gen: (D) => trimTo([D.positioning, `陪${who(D)}把規劃理清楚`, D.slogan, '↓ 預約諮詢／LINE 聯繫'].filter(Boolean).join('\n'), 150) },
    { key: 'caption1', label: '貼文文案 1', max: 2200, gen: (D) => post(D, postIdeas(D)[0], 'instagram') },
    { key: 'caption2', label: '貼文文案 2', max: 2200, gen: (D) => post(D, postIdeas(D)[1] || postIdeas(D)[0], 'instagram') },
    { key: 'reels', label: '短影音腳本大綱', max: 2000, gen: (D) => { const i = postIdeas(D)[0]; return [`開場（3 秒）：${i.title}`, ...i.points.map((p, n) => `重點 ${n + 1}：${p}`), `結尾：${D.slogan || PH('品牌標語')}，想了解歡迎私訊。`, '', '拍攝提醒：真人出鏡請用本人，畫面字卡用品牌色。'].join('\n'); } },
  ],
  threads: [
    { key: 'bio', label: '個人簡介（150 字內）', max: 150, gen: (D) => trimTo(`${D.positioning}。分享${topicsFor(D).map((t) => t.tag).join('、')}的實用觀點，用白話把規劃說清楚。`, 150) },
    { key: 'voice', label: '文字風格說明', max: 600, gen: (D) => ({ 簡短俐落: '短句、一則一個重點；少用形容詞，多用清單與數字（數字須有來源）。', 穩重親切: '像跟朋友聊天，先同理再給建議；結尾邀請留言交流。', 專業直接: '先講結論，再列理由；用詞準確，不誇大、不保證報酬。' })[D.toneFamily] + '\n避免：推銷話術、恐嚇式標題、保證收益或理賠結果。' },
    { key: 'topics', label: '主題方向（每週輪替）', max: 1200, gen: (D) => [...topicsFor(D).map((t) => `・${t.tag}：常見誤解與白話解釋`), '・工作日常：你怎麼陪客戶整理需求（不透露客戶資料）', '・觀點短評：看到一則新聞或現象，你的一句提醒', '・問答：把客戶常問的問題寫成一則'].join('\n') },
    { key: 'post1', label: '貼文範本 1', max: 500, gen: (D) => trimTo(`${postIdeas(D)[0].title}\n\n${postIdeas(D)[0].points.map((p) => '・' + p).join('\n')}\n\n你會先從哪一個開始？`, 500) },
    { key: 'post2', label: '貼文範本 2', max: 500, gen: (D) => trimTo(`很多人以為${topicsFor(D)[0].tag}要等到「有錢」或「有空」才開始。\n其實第一步只是把現況寫下來。\n${PH('補一句你的真實觀察')}`, 500) },
    { key: 'post3', label: '貼文範本 3', max: 500, gen: (D) => trimTo(`今天整理了一份「${postIdeas(D)[0].title.replace(/，.*/, '')}」的清單。\n想要的人留言，我整理後分享。`, 500) },
  ],
  lineOA: [
    { key: 'greeting', label: '加入好友歡迎訊息', max: 500, gen: greeting },
    { key: 'statusMessage', label: '狀態消息（20 字內）', max: 20, gen: (D) => trimTo(D.slogan || D.positioning, 20) },
  ],
  website: [
    { key: 'heroTitle', label: '首頁大標', max: 30, gen: (D) => D.titleName },
    { key: 'heroText', label: '首頁副標', max: 80, gen: (D) => `${D.positioning}。陪${who(D)}把規劃想清楚。` },
    { key: 'about', label: '關於我', max: 1200, gen: (D) => [`我是${D.personName || PH('姓名')}${D.jobTitle ? `，${D.jobTitle}` : ''}。`, `主要服務${who(D)}，專注${exp(D)}。`, D.traits.length ? `客戶常說我${D.traits.join('、')}。` : '', PH('年資、證照、服務經歷——請只填真實資料')].filter(Boolean).join('\n') },
    { key: 'cta', label: '聯絡區說明', max: 200, gen: (D) => (D.toneFamily === '簡短俐落' ? '有需要，直接聯繫我。' : '想聊聊你的規劃？選一個方便的方式聯繫我，我會親自回覆。') },
  ],
};

export function textValue(state, D, platform, key) {
  const o = state.platforms[platform].overrides[key];
  if (typeof o === 'string') return o;
  const f = TEXT_FIELDS[platform].find((x) => x.key === key);
  return f ? f.gen(D) : '';
}

export function lengthNote(field, value) {
  const n = charLen(value);
  return { n, over: n > field.max };
}
