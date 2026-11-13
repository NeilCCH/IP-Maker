// 由品牌資料推導出「目前要套用的設計結果」：配色、禁忌、照片、名稱、語氣。
// 也負責自由回答解析與衝突偵測——能解析的轉成設定，不能的明確標示「僅保存」。
import { PALETTES, HUE_WORDS, HUE_NAMES } from './data/palettes.js';
import { DESIGN_BY_ID } from './data/designs.js';
import { hash } from './util.js';

/** 品牌關鍵字：從自己圈的詞選出的 3 個；舊資料沿用個人特質 */
export function keywordsOf(state) {
  const k = state.answers.keywords || [];
  return k.length ? k : (state.answers.traits || []);
}

// ---------- 色彩工具 ----------
const toRGB = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const x = toRGB(a), y = toRGB(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
function luminance(hex) {
  const c = toRGB(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** 自訂色彩 → 完整色票；缺的顏色由主色推算 */
export function customPalette(cc) {
  const primary = cc.primary;
  if (!primary) return null;
  return {
    id: 'custom', name: '自訂色彩', hues: [], traits: '使用你提供的色碼',
    primary, accent: cc.accent || mix(primary, '#08b8d8', 0.5), bg: cc.bg || mix(primary, '#ffffff', 0.92), ink: mix(primary, '#0b1220', 0.78),
  };
}

export const AVOID_FLAGS = {
  過度金色: 'gold', 米白復古配色: 'cream', 古典襯線字體: 'serif', 山景風景意象: 'landscape',
  卡通可愛: 'cartoon', 過多科技光效: 'glow', 文字擁擠: 'crowded', 制式保險廣告感: 'adcliche',
};
const AVOID_TEXT_RULES = [
  [/金|香檳/, 'gold', '避免金色'],
  [/米白|米色|復古/, 'cream', '避免米白復古配色'],
  [/古典|襯線|明體|書法/, 'serif', '避免古典襯線字體'],
  [/山|風景|夕陽/, 'landscape', '避免山景風景意象'],
  [/卡通|可愛|Q版/, 'cartoon', '避免卡通可愛'],
  [/光效|發光|霓虹|炫光/, 'glow', '減少科技光效'],
  [/擁擠|太多字|字太多/, 'crowded', '文字留白加大'],
  [/廣告|制式|老套|推銷/, 'adcliche', '避免制式保險廣告感'],
];

const EXPERTISE_SHORT = { 保單整理: '保單整理', 退休生活與現金流: '退休規劃', 資產傳承: '資產傳承', 企業與家庭風險: '企業與家庭風險', 醫療與長照保障: '醫療長照', 理賠與日常服務: '理賠服務', 子女教育金: '教育金規劃', 外幣與投資型保單: '外幣保單', 財富規劃觀念: '財富規劃' };

/** 9 種語氣歸成 3 個文案家族，用於貼文結尾等共用句型；歡迎詞則每種語氣各有一版 */
export const TONE_FAMILY = { 專業直接: '專業直接', 理性分析: '專業直接', 正式禮貌: '專業直接', 穩重親切: '穩重親切', 溫暖貼心: '穩重親切', 熱情積極: '穩重親切', 幽默輕鬆: '穩重親切', 簡短俐落: '簡短俐落' };

export const PH = (label) => `【待填：${label}】`;
export const isPH = (s) => /【待填：/.test(String(s));

function huesIn(text) {
  const out = new Set();
  for (const [re, hue] of HUE_WORDS) if (re.test(text)) out.add(hue);
  return [...out];
}

/** 若沒選任何選項但有寫文字，以文字作為答案（允許純文字回答） */
export function valuesOrText(state, qid, maxLen = 16) {
  const a = state.answers[qid] || [];
  if (a.length) return a.filter((v) => v !== '不限定' && v !== '沒有特別限制');
  const t = (state.freeform[qid] || '').trim();
  return t ? [t.split(/[，,、\n]/)[0].slice(0, maxLen)] : [];
}

function avoidInfo(state) {
  const flags = new Set();
  const applied = [];
  for (const v of state.answers.avoid) if (AVOID_FLAGS[v]) flags.add(AVOID_FLAGS[v]);
  const text = state.freeform.avoid || '';
  for (const [re, flag, label] of AVOID_TEXT_RULES)
    if (re.test(text) && !flags.has(flag)) {
      flags.add(flag);
      applied.push(label);
    }
  const hues = new Set(huesIn(text));
  if (flags.has('gold')) hues.add('gold');
  if (flags.has('cream')) hues.add('cream');
  return { flags, hues, applied };
}

const conflictsWith = (palette, avoidHues) => palette.hues.filter((h) => avoidHues.has(h));

function autoPalette(state, avoidHues) {
  const style = state.answers.style[0];
  const kw = keywordsOf(state).join(' ');
  // 「這 3 個詞讓我想到的顏色」優先
  const feel = huesIn((state.freeform.keywords || '').replace(/不要[^，。,\n]*/g, ''));
  const byFeel = PALETTES.find((p) => feel.length && feel.every((h) => p.hues.includes(h))) || PALETTES.find((p) => feel.some((h) => p.hues.includes(h)));
  let pick = byFeel?.id || { 專業科技: 'electric', 簡潔俐落: 'graphite', 沉穩精緻: 'ocean', 親切自然: 'forest', 溫暖人文: 'clay', 活力明亮: 'coral', 時尚質感: 'graphite', 清新療癒: 'forest' }[style];
  if (!pick) pick = /熱情|活力|積極|樂觀/.test(kw) ? 'coral' : /溫柔|體貼|親切|親和|照顧|溫度/.test(kw) ? 'forest' : /質感|品味/.test(kw) ? 'graphite' : /沉穩|穩重|安心/.test(kw) ? 'ocean' : 'electric';
  const ordered = [PALETTES.find((p) => p.id === pick), ...PALETTES];
  return ordered.find((p) => !conflictsWith(p, avoidHues).length) || PALETTES[0];
}

/** 偵測選項與自由文字的衝突。回傳 [{id, qid, message, optionLabel, textLabel}] */
export function detectConflicts(state) {
  const out = [];
  const { hues } = avoidInfo(state);
  const palId = state.answers.palette[0];
  const pal = PALETTES.find((p) => p.id === palId);
  if (pal) {
    const bad = conflictsWith(pal, hues);
    if (bad.length)
      out.push({ id: 'palette-avoid', qid: 'palette', message: `你選的色卡「${pal.name}」包含你想避免的${bad.map((h) => HUE_NAMES[h]).join('、')}。`, optionLabel: '保留這組色卡', textLabel: '改用不衝突的配色' });
    const want = huesIn((state.freeform.palette || '').replace(/不要[^，。,]*/g, ''));
    const missing = want.filter((h) => !pal.hues.includes(h) && !hues.has(h));
    if (missing.length)
      out.push({ id: 'palette-pref', qid: 'palette', message: `你的文字提到${missing.map((h) => HUE_NAMES[h]).join('、')}，但選的色卡沒有這個顏色。`, optionLabel: '以色卡為準', textLabel: '以文字為準（找相近配色）' });
  }
  if (state.answers.font?.[0] === '明體・典雅' && avoidInfo(state).flags.has('serif'))
    out.push({ id: 'font-serif', qid: 'font', message: '你選了「明體・典雅」，但避免事項有「古典襯線字體」。', optionLabel: '使用明體', textLabel: '改用現代黑體' });
  if (state.answers.palette[0] === 'custom' && state.customColors?.primary && contrast(state.customColors.primary, '#ffffff') < 3)
    out.push({ id: 'custom-contrast', qid: 'palette', message: '你的主色太淺，放在白底上的文字可能看不清楚。', optionLabel: '仍使用這個主色', textLabel: '自動加深主色' });
  const photoOpt = state.answers.photo[0];
  if (/不(要|放|想|露)[^，。]{0,4}(照片|臉|本人)|不露臉/.test(state.freeform.photo || '') && ['醒目呈現', '適度呈現'].includes(photoOpt))
    out.push({ id: 'photo-none', qid: 'photo', message: `你選了「${photoOpt}」，但文字寫到不想放照片。`, optionLabel: `照片${photoOpt}`, textLabel: '不放照片' });
  return out;
}

export const resolved = (state, id) => state.resolutions[id];

/** 每題的自由回答解析結果（給 UI 顯示「已轉成設定／僅保存」） */
export function parseReport(state, qid) {
  const text = (state.freeform[qid] || '').trim();
  if (!text) return null;
  const applied = [];
  if (qid === 'avoid') applied.push(...avoidInfo(state).applied, ...huesIn(text).map((h) => `避開${HUE_NAMES[h]}的配色`));
  if (qid === 'tone' && text.length >= 8) applied.push('作為 LINE 歡迎訊息與各平台開場語氣');
  if (['traits', 'audience', 'expertise'].includes(qid) && !state.answers[qid].length) applied.push('沒有選選項，直接以你的文字作為答案');
  if (qid === 'palette' && huesIn(text).length) applied.push('已比對色系');
  if (qid === 'photo' && /不(要|放|想|露)/.test(text)) applied.push('已比對照片偏好');
  return { applied: [...new Set(applied)], saved: true };
}

function resolvePalette(state, avoid) {
  const id = state.answers.palette[0];
  if (id === 'custom') {
    const c = customPalette(state.customColors || {});
    if (c && state.resolutions['custom-contrast'] === 'text') {
      let p = c.primary;
      for (let i = 0; i < 12 && contrast(p, '#ffffff') < 4.5; i++) p = mix(p, '#000000', 0.12);
      return { ...c, primary: p };
    }
    return c || { ...autoPalette(state, avoid.hues), auto: true };
  }
  const pal = PALETTES.find((p) => p.id === id);
  if (!pal) return { ...autoPalette(state, avoid.hues), auto: true };
  if (conflictsWith(pal, avoid.hues).length && resolved(state, 'palette-avoid') === 'text') return { ...autoPalette(state, avoid.hues), auto: true };
  if (resolved(state, 'palette-pref') === 'text') {
    const want = huesIn(state.freeform.palette || '');
    const alt = PALETTES.find((p) => want.some((h) => p.hues.includes(h)) && !conflictsWith(p, avoid.hues).length);
    if (alt) return { ...alt, auto: true };
  }
  return pal;
}

function resolvePhotoMode(state) {
  const opt = state.answers.photo[0];
  if (opt === '不放照片') return 'none';
  if (detectConflicts(state).some((c) => c.id === 'photo-none') && resolved(state, 'photo-none') === 'text') return 'none';
  if (!state.photo) return 'none';
  if (opt === '只放在頭像') return 'avatar';
  if (opt === '醒目呈現') return 'hero';
  return 'moderate';
}

function resolveTone(state) {
  const t = state.answers.tone[0];
  if (t && t !== '交由系統建議') return t;
  const tr = keywordsOf(state).join(' ');
  if (/幽默/.test(tr)) return '幽默輕鬆';
  if (/熱情|活力|積極|樂觀|會鼓勵/.test(tr)) return '熱情積極';
  if (/溫柔|體貼|同理|照顧|溫度/.test(tr)) return '溫暖貼心';
  if (/親切|親和|隨和|沉穩|穩重|安心|誠懇|真誠/.test(tr)) return '穩重親切';
  if (/有效率|有條理|果斷|直率|思路清楚/.test(tr)) return '簡短俐落';
  if (/講解清楚|懂得多|謹慎|冷靜/.test(tr)) return '理性分析';
  return '專業直接';
}

function resolveFont(state) {
  const f = state.answers.font?.[0];
  if (f === '明體・典雅' && state.resolutions['font-serif'] === 'text') return '現代黑體・俐落';
  return f && f !== '交由系統建議' ? f : '現代黑體・俐落';
}

export function positioningOf(state) {
  if (state.identity.positioning.trim()) return state.identity.positioning.trim();
  const ex = valuesOrText(state, 'expertise').map((e) => EXPERTISE_SHORT[e] || e);
  return ex.length ? ex.join('・') : '保險規劃服務';
}

/** 給素材與文案使用的完整推導資料 */
export function derive(state, designId = state.selectedDesignId) {
  const avoid = avoidInfo(state);
  const palette = resolvePalette(state, avoid);
  const id = state.identity;
  const brandName = id.brandName.trim();
  const personName = id.personName.trim();
  const positioning = positioningOf(state);
  const titleName = brandName || personName || '你的品牌';
  const display = state.answers.display[0] || '交由系統建議';
  const jobTitle = id.jobTitle.trim();
  const displayName =
    display === '姓名' ? personName || PH('姓名')
    : display === '姓名加定位' ? `${personName || PH('姓名')}｜${positioning}`
    : display === '姓名加職稱' ? `${personName || PH('姓名')}｜${jobTitle || PH('職稱')}`
    : display === '姓氏加稱謂' ? `${personName ? [...personName][0] : PH('姓氏')}${jobTitle ? [...jobTitle].slice(-2).join('') : PH('稱謂')}`
    : display === '個人品牌名稱' ? brandName || PH('品牌名稱')
    : display === '品牌加姓名' ? `${brandName || PH('品牌名稱')}｜${personName || PH('姓名')}`
    : brandName || personName || PH('品牌名稱');
  const design = DESIGN_BY_ID[designId] || DESIGN_BY_ID.tech;
  return {
    brandName, personName, titleName, displayName, positioning,
    nameIsPlaceholder: !brandName && !personName,
    jobTitle: id.jobTitle.trim(),
    slogan: id.slogan.trim(),
    traits: keywordsOf(state),
    keywords: keywordsOf(state),
    selfWords: state.answers.selfWords || [],
    whoami: (id.whoami || '').trim(),
    audiencePain: (state.freeform.audience || '').trim(),
    feeling: (state.freeform.keywords || '').trim(),
    toneOrder: (state.answers.toneOrder || [])[0] || '',
    font: resolveFont(state),
    imagery: (state.answers.imagery || []).filter((v) => v !== '交由系統建議'),
    signature: state.answers.signature || [],
    audience: valuesOrText(state, 'audience', 20),
    expertise: valuesOrText(state, 'expertise', 20),
    services: state.platforms.lineOA.entries,
    tone: resolveTone(state),
    toneFamily: TONE_FAMILY[resolveTone(state)] || '專業直接',
    toneText: (state.freeform.tone || '').trim().length >= 8 ? state.freeform.tone.trim() : '',
    palette,
    design,
    avoid: avoid.flags,
    avoidHues: avoid.hues,
    photo: state.photo,
    photoMode: resolvePhotoMode(state),
    showPhoto: ['hero', 'moderate'].includes(resolvePhotoMode(state)),
    contact: id.contact,
    freeform: state.freeform,
    designNotes: state.designNotes,
  };
}

export function avoidSummary(D) {
  const map = { gold: '不使用金色', cream: '不使用米白復古配色', serif: '只用現代無襯線字體', landscape: '不使用山景風景意象', cartoon: '不使用卡通可愛元素', glow: '不加光暈與發光效果', crowded: '加大留白、每塊只放重點', adcliche: '避免制式保險廣告用語與畫面' };
  return [...D.avoid].map((f) => map[f]).filter(Boolean);
}

// ---------- 命名與標語提案 ----------
const NAME_BANK = {
  穩健安心: ['恆安', '守和', '安序', '穩衡', '實安', '恆心', '和序', '守恆', '安澄', '穩行'],
  理性前瞻: ['衡遠', '明序', '遠見', '策遠', '明衡', '知遠', '序遠', '見度', '衡策', '明遠'],
  人生從容: ['從容', '悠然', '自在', '餘裕', '和光', '緩行', '安步', '好日', '從序', '寬心'],
  溫暖陪伴: ['伴行', '和心', '知心', '同行', '暖序', '安伴', '相伴', '暖心', '溫和', '心安'],
  專業權威: ['明鑑', '正衡', '卓見', '研衡', '精策', '實鑑', '明策', '衡正', '博見', '正策'],
  家庭守護: ['守家', '安家', '護家', '家安', '和家', '家恆', '佑安', '家和', '守安', '恆家'],
  傳承永續: ['承遠', '傳恆', '永序', '承安', '續遠', '承和', '恆傳', '長承', '延安', '承序'],
  簡潔好記: ['一衡', '安心', '明日', '三安', '穩穩', '安好', '日常', '簡安', '好安', '一心'],
};

export function nameProposals(state) {
  const dir = state.answers.naming[0];
  const pool = dir && NAME_BANK[dir] ? NAME_BANK[dir] : [...NAME_BANK.穩健安心, ...NAME_BANK.理性前瞻, ...NAME_BANK.人生從容];
  const seed = parseInt(hash(state.answers.expertise.join() + keywordsOf(state).join() + state.namingSeed), 36);
  const picks = [];
  for (let i = 0; picks.length < 3 && i < pool.length * 2; i++) {
    const n = pool[(seed + i * 7) % pool.length];
    if (!picks.includes(n)) picks.push(n);
  }
  return picks;
}

const SLOGAN_BANK = [
  [/退休/, ['把退休，提早想清楚', '讓退休生活有底氣']],
  [/企業|風險/, ['經營向前，風險先看清', '公司與家庭，分開看清楚']],
  [/保單/, ['看懂保障，再做決定', '把保單整理成一張清楚的地圖']],
  [/傳承/, ['把重要的，好好交棒']],
  [/醫療|長照/, ['先準備，照顧才從容']],
  [/理賠|服務/, ['需要的時候，有人陪你走']],
  [/教育/, ['孩子的未來，提早一步準備']],
  [/外幣|投資/, ['看懂再選擇，不跟風']],
  [/財富/, ['財富要規劃，也要安心']],
];
const SLOGAN_BY_DIR = { 穩健安心: '穩穩規劃，安心向前', 理性前瞻: '想清楚，再往前', 人生從容: '從容，來自提早準備', 溫暖陪伴: '重要的路，有人陪你走', 專業權威: '把專業，用在你最在意的事', 家庭守護: '守護家，從今天開始安排', 傳承永續: '把重要的，好好傳下去', 簡潔好記: '想清楚，就安心' };

export function sloganProposals(state) {
  const ex = state.answers.expertise.join(' ') + ' ' + (state.freeform.expertise || '');
  const out = [];
  for (const [re, list] of SLOGAN_BANK) if (re.test(ex)) out.push(...list);
  out.push(SLOGAN_BY_DIR[state.answers.naming[0]] || '想清楚，再往前');
  return [...new Set(out)].slice(0, 3);
}
