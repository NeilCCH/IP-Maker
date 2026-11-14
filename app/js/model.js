// 品牌資料模型（schemaVersion 2）：品牌核心與各平台配置分開管理。
// 支援：舊版展示版進度（oa-brand-studio-v1）、舊版「共用品牌資料.json」(schemaVersion 1) 匯入遷移。
import { QUESTIONS, SERVICE_CATALOG, EXTRA_ANSWER_IDS, ALL_WORDS } from './data/questions.js';
import { PALETTES } from './data/palettes.js';
import { DESIGN_BY_ID } from './data/designs.js';
import { str, strArr, safeURL } from './util.js';
import { defaultType, ENTRY_TYPES } from './entries.js';

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'brand-studio-v2';
export const LEGACY_KEY = 'oa-brand-studio-v1';
export const PLATFORM_IDS = ['facebook', 'website', 'instagram', 'lineOA', 'threads'];

const DEFAULT_SERVICE_ORDER = ['認識我', '保單健檢', '退休規劃', '家庭保障', '實用資訊', '預約諮詢', '常見問題', '留言給我', '企業風險', '醫療長照', '資產傳承', '理賠協助'];
const EXTRA_ENTRIES = [
  { label: '活動資訊', description: '近期活動與講座資訊' },
  { label: '需求填寫', description: '填寫表單留下需求' },
  { label: '聯絡方式', description: '聯絡方式與服務時間' },
  { label: '服務協助', description: '常見問題與服務申請' },
];

const freshPlatform = () => ({ overrides: {}, checklist: {}, prompt: { extra: '', draft: '', basis: '' } });

export function fresh() {
  const now = new Date().toISOString();
  const s = {
    schemaVersion: SCHEMA_VERSION,
    app: 'brand-studio',
    meta: { createdAt: now, updatedAt: now, qIndex: 0, started: false, target: 'lineOA', lastBackupAt: '', aiTopics: {} },
    answers: Object.fromEntries([...QUESTIONS.map((q) => q.id), ...EXTRA_ANSWER_IDS].map((id) => [id, []])),
    freeform: Object.fromEntries(QUESTIONS.map((q) => [q.id, ''])),
    resolutions: {},
    identity: { brandName: '', personName: '', jobTitle: '', slogan: '', positioning: '', whoami: '', contact: { line: '', phone: '', email: '', area: '' } },
    customColors: { primary: '', accent: '', bg: '' },
    photo: '',
    namingSeed: 0,
    selectedDesignId: 'tech',
    designNotes: '',
    platforms: Object.fromEntries(PLATFORM_IDS.map((id) => [id, freshPlatform()])),
  };
  Object.assign(s.platforms.lineOA, { pages: 1, count: 8, activePage: 0, pageNames: ['我的服務', '更多資源'], entries: [], entriesCustom: false });
  s.platforms.website.publishedUrl = '';
  s.platforms.lineOA.oaUrl = '';
  s.platforms.lineOA.forms = { form: '', edit: '', sheet: '' };
  syncEntries(s);
  return s;
}

/** 依「服務順序」產生 16 個入口；使用者手動改過入口後不會自動覆寫 */
export function entriesFromServices(state) {
  const chosen = state.answers.services.length ? state.answers.services : DEFAULT_SERVICE_ORDER;
  const catalog = Object.fromEntries(SERVICE_CATALOG.map((s) => [s.label, s.description]));
  const list = chosen.map((label) => ({ label, description: catalog[label] || '自訂服務：請補充說明', url: '' }));
  for (const label of DEFAULT_SERVICE_ORDER) if (!list.some((e) => e.label === label)) list.push({ label, description: catalog[label], url: '' });
  for (const e of EXTRA_ENTRIES) if (!list.some((x) => x.label === e.label)) list.push({ ...e, url: '' });
  return list.slice(0, 16).map((e) => ({ ...e, type: defaultType(e.label), reply: '' }));
}

export function syncEntries(state) {
  const line = state.platforms.lineOA;
  if (!line.entriesCustom) line.entries = entriesFromServices(state);
}

/** 服務順序已變，但入口曾手動修改 → 需要使用者決定是否套用 */
export function entriesOutOfSync(state) {
  const line = state.platforms.lineOA;
  if (!line.entriesCustom || !state.answers.services.length) return false;
  const want = entriesFromServices(state).slice(0, 8).map((e) => e.label).join('|');
  const have = line.entries.slice(0, 8).map((e) => e.label).join('|');
  return want !== have;
}

// ---------- 驗證與遷移 ----------

function sanitizePlatform(src, base) {
  const out = structuredClone(base);
  if (!src || typeof src !== 'object') return out;
  if (src.overrides && typeof src.overrides === 'object')
    for (const [k, v] of Object.entries(src.overrides)) if (typeof v === 'string' && k.length < 40) out.overrides[k] = v.slice(0, 5000);
  if (src.checklist && typeof src.checklist === 'object')
    for (const [k, v] of Object.entries(src.checklist)) if (k.length < 40) out.checklist[k] = v === true;
  if (src.prompt && typeof src.prompt === 'object') {
    out.prompt.extra = str(src.prompt.extra, 3000);
    out.prompt.draft = str(src.prompt.draft, 40000);
    out.prompt.basis = str(src.prompt.basis, 40);
  }
  return out;
}

const TYPE_IDS = ENTRY_TYPES.map((t) => t.id);
function sanitizeEntry(e) {
  const label = str(e?.label, 20);
  const url = str(e?.url, 2000);
  // 舊資料沒有類型：有網址視為連結，否則依名稱給預設類型
  const type = TYPE_IDS.includes(e?.type) ? e.type : safeURL(url) ? 'link' : defaultType(label);
  return { label, description: str(e?.description, 1000), url, type, reply: str(e?.reply, 2000) };
}

export function sanitize(x) {
  const n = fresh();
  if (!x || typeof x !== 'object') return n;
  n.meta.createdAt = str(x.meta?.createdAt, 40) || n.meta.createdAt;
  n.meta.qIndex = Math.min(QUESTIONS.length - 1, Math.max(0, Math.floor(Number(x.meta?.qIndex)) || 0));
  n.meta.started = x.meta?.started === true;
  n.meta.target = PLATFORM_IDS.includes(x.meta?.target) || x.meta?.target === 'ai' ? x.meta.target : 'lineOA';
  n.meta.aiTopics = {};
  if (x.meta?.aiTopics && typeof x.meta.aiTopics === 'object')
    for (const [k, v] of Object.entries(x.meta.aiTopics)) if (k.length < 20 && typeof v === 'string') n.meta.aiTopics[k] = v.slice(0, 500);
  n.meta.lastBackupAt = Number.isFinite(Date.parse(x.meta?.lastBackupAt)) ? str(x.meta.lastBackupAt, 40) : '';
  for (const q of QUESTIONS) {
    let a = strArr(x.answers?.[q.id], q.max || 16, 40);
    if (q.type === 'words') a = a.filter((w) => ALL_WORDS.includes(w)); // 圈詞只接受詞庫裡的詞
    if (q.type === 'keywords') a = a.map((w) => w.slice(0, 12));
    n.answers[q.id] = a;
    n.freeform[q.id] = str(x.freeform?.[q.id], 3000);
  }
  n.answers.traits = strArr(x.answers?.traits, 3, 40);
  n.answers.toneOrder = strArr(x.answers?.toneOrder, 1, 20);
  const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');
  n.customColors = { primary: hex(x.customColors?.primary), accent: hex(x.customColors?.accent), bg: hex(x.customColors?.bg) };
  if (x.resolutions && typeof x.resolutions === 'object')
    for (const [k, v] of Object.entries(x.resolutions)) if (v === 'option' || v === 'text') n.resolutions[str(k, 60)] = v;
  const id = x.identity || {};
  n.identity = {
    brandName: str(id.brandName, 30), personName: str(id.personName, 30), jobTitle: str(id.jobTitle, 40),
    slogan: str(id.slogan, 60), positioning: str(id.positioning, 60), whoami: str(id.whoami, 80),
    contact: { line: str(id.contact?.line, 200), phone: str(id.contact?.phone, 40), email: str(id.contact?.email, 120), area: str(id.contact?.area, 60) },
  };
  n.photo = typeof x.photo === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x.photo) && x.photo.length < 3_000_000 ? x.photo : '';
  n.namingSeed = Math.max(0, Math.min(9999, Number(x.namingSeed) || 0));
  n.selectedDesignId = DESIGN_BY_ID[x.selectedDesignId] ? x.selectedDesignId : 'tech';
  n.designNotes = str(x.designNotes, 3000);
  for (const pid of PLATFORM_IDS) n.platforms[pid] = sanitizePlatform(x.platforms?.[pid], n.platforms[pid]);
  const L = x.platforms?.lineOA || {};
  const line = n.platforms.lineOA;
  line.pages = L.pages === 2 ? 2 : 1;
  line.count = L.count === 6 ? 6 : 8;
  line.activePage = L.activePage === 1 && line.pages === 2 ? 1 : 0;
  if (Array.isArray(L.pageNames)) line.pageNames = [str(L.pageNames[0], 12) || '我的服務', str(L.pageNames[1], 12) || '更多資源'];
  line.entriesCustom = L.entriesCustom === true;
  line.oaUrl = str(L.oaUrl, 300);
  const fm = L.forms || {};
  const gurl = (u) => (/^https:\/\/(docs\.google\.com|forms\.gle)\//.test(String(u || '')) ? str(u, 1000) : '');
  line.forms = { form: gurl(fm.form), edit: gurl(fm.edit), sheet: gurl(fm.sheet) };
  if (line.entriesCustom && Array.isArray(L.entries)) {
    const base = entriesFromServices(n);
    line.entries = base.map((b, i) => (L.entries[i] && typeof L.entries[i] === 'object' ? sanitizeEntry(L.entries[i]) : b));
  } else syncEntries(n);
  n.platforms.website.publishedUrl = str(x.platforms?.website?.publishedUrl, 300);
  return n;
}

const PALETTE_BY_LEGACY_NAME = { 專業科技: 'electric', 清新理性: 'ocean', 活力專業: 'coral', 溫暖自然: 'clay', 俐落現代: 'graphite', 明亮前瞻: 'violet', 柔和細膩: 'berry', 由程式搭配: 'auto' };
const legacyOpt = (v) => v.replace('由程式建議', '交由系統建議').replace('由程式搭配', '交由系統搭配').replace('社會新鮮人', '年輕人與社會新鮮人').replace('醫療與長照保障', '醫療與長照保障');

/** 舊展示版 localStorage／匯出進度（含 step、notes、brand、entries） */
export function fromLegacyV1(x) {
  const n = fresh();
  const a = x.answers || {};
  for (const id of ['traits', 'audience', 'expertise', 'photo', 'style', 'tone']) n.answers[id] = strArr(a[id], 6).map(legacyOpt);
  const avoid = strArr(a.avoid, 9).flatMap((v) => (v === '金色與米白' ? ['過度金色', '米白復古配色'] : v === '制式保險廣告' ? ['制式保險廣告感'] : [v]));
  n.answers.avoid = [...new Set(avoid)];
  const pal = PALETTE_BY_LEGACY_NAME[strArr(a.palette, 1)[0]];
  if (pal) n.answers.palette = [pal];
  const notes = x.notes || {};
  for (const id of ['traits', 'audience', 'expertise', 'palette', 'photo', 'style', 'tone', 'avoid']) n.freeform[id] = str(notes[id], 3000);
  // 舊版把「標語」放在品牌名稱題的補充欄，這裡拆回 identity.slogan
  n.identity.slogan = str(notes.name, 60);
  const extra = [notes.layout, notes.entries, notes.review].filter(Boolean).join('\n');
  if (extra) n.freeform.contact = str(extra, 3000);
  n.identity.brandName = str(x.brand, 30);
  if (typeof x.photo === 'string') n.photo = x.photo; // 格式與大小由 sanitize() 統一檢查
  n.selectedDesignId = DESIGN_BY_ID[x.designStyle] ? x.designStyle : 'tech';
  const line = n.platforms.lineOA;
  line.pages = x.pages === 2 ? 2 : 1;
  line.count = x.count === 6 ? 6 : 8;
  if (Array.isArray(x.pageNames)) line.pageNames = [str(x.pageNames[0], 12) || '我的服務', str(x.pageNames[1], 12) || '更多資源'];
  if (Array.isArray(x.entries) && x.entries.length) {
    line.entriesCustom = true;
    const base = entriesFromServices(n);
    line.entries = base.map((b, i) => (x.entries[i] ? sanitizeEntry(x.entries[i]) : b));
  }
  n.meta.started = true;
  return n;
}

/** 舊版「共用品牌資料.json」(schemaVersion 1) */
export function fromKitV1(k) {
  const n = fresh();
  n.identity.brandName = str(k.identity?.name, 30) === '你的品牌' ? '' : str(k.identity?.name, 30);
  n.identity.slogan = str(k.identity?.slogan, 60);
  for (const id of ['traits', 'audience', 'expertise']) n.answers[id] = strArr(k.identity?.[id], 2).map(legacyOpt);
  n.answers.avoid = strArr(k.visual?.avoid, 9).flatMap((v) => (v === '金色與米白' ? ['過度金色', '米白復古配色'] : [v]));
  n.answers.tone = strArr(k.voice?.tone, 1).map(legacyOpt);
  n.answers.style = strArr(k.visual?.style, 1).map(legacyOpt);
  n.answers.photo = strArr(k.visual?.photoPreference, 1).map(legacyOpt);
  if (typeof k.visual?.photo === 'string') n.photo = k.visual.photo; // 由 sanitize() 檢查
  const pal = PALETTE_BY_LEGACY_NAME[k.visual?.palette?.name];
  if (pal) n.answers.palette = [pal];
  if (DESIGN_BY_ID[k.visual?.designStyle?.id]) n.selectedDesignId = k.visual.designStyle.id;
  if (k.freeform && typeof k.freeform === 'object') for (const q of QUESTIONS) if (typeof k.freeform[q.id] === 'string' && q.id !== 'name') n.freeform[q.id] = str(k.freeform[q.id], 3000);
  n.meta.started = true;
  const lo = k.extensions?.lineOA;
  if (lo) return { ...n, platforms: { ...n.platforms, lineOA: { ...n.platforms.lineOA, ...lo, entriesCustom: true } } };
  return n;
}

/** 任一格式 → v2；無法辨識則丟出錯誤（呼叫端不得動到現有進度） */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('不是有效的進度檔');
  if (raw.schemaVersion === 2 && raw.answers && raw.platforms) return sanitize(raw);
  if (raw.schemaVersion > 2) throw new Error('這個檔案來自較新版本，請先更新 APP');
  // 所有舊格式轉換後，一律再經過 sanitize()，與 v2 使用同一套檢查
  if (raw.answers && Array.isArray(raw.entries)) return sanitize(fromLegacyV1(raw));
  if (raw.schemaVersion === 1 && raw.identity) return sanitize(fromKitV1(raw));
  throw new Error('不是品牌工作室的進度檔');
}

// ---------- 儲存 ----------

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { state: migrate(JSON.parse(raw)), migrated: false };
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { state: migrate(JSON.parse(legacy)), migrated: true };
  } catch {
    // 資料損壞：先另存一份原始內容，避免被新進度覆蓋後無法救回
    try {
      const bad = localStorage.getItem(STORAGE_KEY);
      if (bad) localStorage.setItem(`${STORAGE_KEY}-corrupt-${Date.now()}`, bad);
    } catch { /* 空間不足時放棄備份 */ }
  }
  return { state: fresh(), migrated: false };
}

export function persist(state) {
  state.meta.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(state) {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

// ---------- 範例資料（使用者本人「衡遠」，僅供測試，非預設人格） ----------
export function sampleHengYuan() {
  const n = fresh();
  Object.assign(n.answers, {
    selfWords: ['專業', '有遠見', '有條理', '有效率', '值得信任', '果斷'],
    keywords: ['專業', '有遠見', '值得信任'],
    toneOrder: ['先講重點'],
    font: ['現代黑體・俐落'],
    imagery: ['專業形象照', '簡潔幾何圖形', '數據圖表感'],
    signature: ['名字文字標', '固定主色', '固定標語'],
    audience: ['退休與準退休者', '企業主與自營業者'],
    expertise: ['退休生活與現金流', '企業與家庭風險'],
    services: ['認識我', '退休規劃', '企業風險', '家庭保障', '實用資訊', '預約諮詢', '常見問題', '留言給我'],
    tone: ['簡短俐落'],
    style: ['專業科技'],
    palette: ['electric'],
    photo: ['交由系統建議'],
    avoid: ['過度金色', '米白復古配色', '古典襯線字體', '山景風景意象', '卡通可愛', '文字擁擠', '制式保險廣告感'],
    naming: ['理性前瞻'],
    display: ['個人品牌名稱'],
  });
  n.freeform.avoid = '不要深藍＋米白＋香檳金＋山景＋古典字體的組合，像訃聞。';
  n.freeform.style = '最初選沉穩精緻，看到設計後改為專業科技感。';
  n.freeform.keywords = '冷白、電光藍、青藍；俐落、清楚、有層次。';
  n.freeform.audience = '55 歲上下準備退休、或經營中小企業的老闆；擔心退休後現金流不夠，也擔心公司風險影響家庭。';
  n.identity.whoami = '陪準退休族與企業主，把退休與風險想清楚的規劃顧問';
  n.identity.brandName = '衡遠';
  n.identity.slogan = '衡量當下，規劃長遠';
  n.identity.positioning = '退休規劃・企業與家庭風險';
  n.selectedDesignId = 'tech';
  n.meta.started = true;
  syncEntries(n);
  n.platforms.lineOA.entries[0].label = '認識衡遠';
  n.platforms.lineOA.entriesCustom = true;
  return n;
}

export const paletteIds = PALETTES.map((p) => p.id);
