// 繪圖引擎：所有預覽與下載素材都由這裡畫出，確保「預覽 = 下載」且遵守同一套風格規則。
import { layout, pageEntries } from './line.js';

export const FONT = '"PingFang TC","Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei","Heiti TC","WenQuanYi Zen Hei",system-ui,sans-serif';
const font = (w, px) => `${w} ${Math.round(px)}px ${FONT}`;

// ---------- 圖示（24×24 線條，與介面共用） ----------
export const ICON_PATHS = {
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  chart: 'M4 20v-5M9 20v-9M14 20v-6M19 20V8M3.5 10.5l5-4.5 5 3 6.5-5.5',
  building: 'M4 21V4h10v17M14 9h6v12M7 8h4M7 12h4M7 16h4M3 21h18',
  house: 'M3 11.5L12 4l9 7.5M5.5 10v10.5h13V10M10 20.5v-5.5h4v5.5',
  doc: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  calendar: 'M4 6h16v15H4zM8 3v5M16 3v5M4 10h16M9 15.5l2 2 4-4',
  headset: 'M4.5 15v-3a7.5 7.5 0 0 1 15 0v3M4 13h3v6H4zM17 13h3v6h-3zM19.5 19c0 1.5-2 2.5-5 2.5',
  chat: 'M4 5h16v11H9.5L5 20v-4H4zM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01',
  shield: 'M12 3l7.5 3v5.5c0 4.7-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.8-7.5-9.5V6zM9 12l2 2 4-4',
  heart: 'M12 20s-7.5-4.7-7.5-10.5A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5C19.5 15.3 12 20 12 20z',
  tree: 'M12 21v-6M12 15l-3.5-2.5M12 15l3.5-2.5M12 3a5.5 5.5 0 0 1 5.5 5.5c0 2.8-2.5 5-5.5 5s-5.5-2.2-5.5-5A5.5 5.5 0 0 1 12 3z',
  clip: 'M9 3.5h6v3H9zM7 5H5v16h14V5h-2M8.5 12h7M8.5 16h5',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.6M12 16.8v.01',
  star: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
  book: 'M3.5 5.5c3-1 5.5-1 8.5 1 3-2 5.5-2 8.5-1v13c-3-1-5.5-1-8.5 1-3-2-5.5-2-8.5-1zM12 6.5v13',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
};
const ICON_RULES = [
  [/認識|關於|自我|介紹/, 'person'], [/退休/, 'chart'], [/企業|公司|經營/, 'building'], [/家庭/, 'house'],
  [/保單|保障|健檢/, 'shield'], [/資訊|文章|清單|知識/, 'doc'], [/預約|時段|日曆/, 'calendar'], [/協助|服務申請|客服/, 'headset'],
  [/留言|聯絡|聊/, 'chat'], [/醫療|長照|健康/, 'heart'], [/傳承|資產/, 'tree'], [/理賠/, 'clip'], [/問題|問答|FAQ/i, 'question'],
  [/活動|講座/, 'star'], [/需求|表單|填寫/, 'doc'], [/網站|網頁|連結/, 'link'],
];
const FALLBACK_ICONS = ['book', 'chart', 'building', 'house', 'doc', 'calendar', 'headset', 'chat'];
export function iconFor(label, i = 0) {
  for (const [re, name] of ICON_RULES) if (re.test(label || '')) return name;
  return FALLBACK_ICONS[i % FALLBACK_ICONS.length];
}

const pathCache = {};
export function drawIcon(ctx, name, cx, cy, size, color, lw = 1.5) {
  const p = (pathCache[name] ||= new Path2D(ICON_PATHS[name] || ICON_PATHS.doc));
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(p);
  ctx.restore();
}

// ---------- 基本工具 ----------
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 以字元換行（中文適用），超過行數以 … 結尾 */
export function wrap(ctx, text, maxW, maxLines = 99) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of [...para]) {
      if (line && ctx.measureText(line + ch).width > maxW) {
        // 標點不放行首：掛在上一行尾
        if (/[，。、；：！？）」』,.!?]/.test(ch)) { out.push(line + ch); line = ''; continue; }
        out.push(line);
        line = '';
      }
      line += ch;
    }
    out.push(line);
  }
  if (out.length > maxLines) {
    const cut = out.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    cut[maxLines - 1] = last + '…';
    return cut;
  }
  return out;
}

/** 單行文字自動縮小到放得下 */
function fit(ctx, text, weight, size, min, maxW) {
  let s = size;
  ctx.font = font(weight, s);
  while (s > min && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = font(weight, s);
  }
  return s;
}

function textBlock(ctx, text, { x, y, maxW, size, weight = 400, color, lineH = 1.5, maxLines = 99, align = 'left' }) {
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const lines = wrap(ctx, text, maxW, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lineH));
  return y + lines.length * size * lineH;
}

const imgCache = new Map();
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
  imgCache.set(src, p);
  return p;
}

function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

// ---------- 風格背景與元件 ----------
function background(ctx, W, H, D, { panelTone = false } = {}) {
  const { primary, accent, bg } = D.palette;
  const k = W / 1080;
  const d = D.design.id;
  if (d === 'tech') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const step = Math.round(Math.min(W, H) / 16);
    ctx.strokeStyle = alpha(accent, D.avoid.has('glow') ? 0.08 : 0.1);
    ctx.lineWidth = Math.max(1, 1.2 * k);
    ctx.beginPath();
    for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // 幾何轉角線
    ctx.strokeStyle = alpha(primary, 0.35);
    ctx.lineWidth = 3 * k;
    const m = 40 * k, L = 90 * k;
    ctx.beginPath();
    ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
    ctx.moveTo(W - m, H - m - L); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m - L, H - m);
    ctx.stroke();
    if (!D.avoid.has('glow')) {
      // 適量科技層次：淡色節點連線（不發光）
      ctx.strokeStyle = alpha(accent, 0.25);
      ctx.fillStyle = alpha(accent, 0.55);
      ctx.lineWidth = 1.5 * k;
      const u = Math.min(W, H);
      const pts = [[0, 0], [0.13, 0.07], [0.06, 0.15], [0.2, 0.2]].map(([a, b]) => [W - 0.32 * u + a * u, 0.06 * u + b * u]);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5 * k, 0, Math.PI * 2); ctx.fill(); });
    }
  } else if (d === 'minimal') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = panelTone ? '#ffffff' : bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = alpha('#ffffff', 0.7);
    ctx.beginPath(); ctx.arc(W * 0.95, H * 0.05, W * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = alpha(accent, 0.08);
    ctx.beginPath(); ctx.arc(W * 0.02, H * 0.98, W * 0.28, 0, Math.PI * 2); ctx.fill();
  }
}

function monogramChar(D) {
  const n = D.brandName || D.personName;
  return n ? [...n][0] : '品';
}

/** 頭像標誌：有照片且允許顯示時用照片，否則用文字標誌（不虛構人像） */
function mark(ctx, D, cx, cy, r) {
  const { primary, accent, bg } = D.palette;
  ctx.save();
  if (D.photoImg && D.photoMode !== 'none') {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    drawCover(ctx, D.photoImg, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = D.design.id === 'minimal' ? primary : accent;
    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (D.design.id === 'tech') {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, primary); g.addColorStop(1, accent);
    ctx.fillStyle = g;
  } else ctx.fillStyle = D.design.id === 'minimal' ? primary : bg;
  ctx.fill();
  if (D.design.id === 'friendly') { ctx.strokeStyle = alpha(primary, 0.25); ctx.lineWidth = r * 0.04; ctx.stroke(); }
  ctx.fillStyle = D.design.id === 'friendly' ? primary : '#ffffff';
  ctx.font = font(700, r * 1.05);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(monogramChar(D), cx, cy + r * 0.04);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

const space = (D) => (D.avoid.has('crowded') ? 1.18 : 1);

// ---------- 各素材 ----------
export function avatar(ctx, W, H, D) {
  const { primary, accent } = D.palette;
  if (D.photoImg && D.photoMode !== 'none') {
    drawCover(ctx, D.photoImg, 0, 0, W, H);
    return;
  }
  background(ctx, W, H, D);
  const r = W * 0.36;
  mark(ctx, D, W / 2, H / 2, r);
  if (D.design.id === 'tech') {
    ctx.strokeStyle = alpha(accent, 0.6); ctx.lineWidth = W * 0.006;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r * 1.12, -0.4, Math.PI * 1.1); ctx.stroke();
  } else if (D.design.id === 'minimal') {
    ctx.fillStyle = accent; ctx.fillRect(W / 2 - r * 0.3, H / 2 + r * 1.12, r * 0.6, W * 0.012);
  } else {
    ctx.strokeStyle = alpha(primary, 0.15); ctx.lineWidth = W * 0.02;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r * 1.15, 0, Math.PI * 2); ctx.stroke();
  }
}

/** 品牌主視覺卡（LINE 歡迎圖卡、提案板共用） */
export function welcomeCard(ctx, W, H, D) {
  const { primary, accent, ink } = D.palette;
  const k = W / 1040, sp = space(D);
  background(ctx, W, H, D);
  const d = D.design.id;
  const hero = D.photoMode === 'hero';
  if (d === 'minimal') {
    const x = 90 * k;
    ctx.fillStyle = primary; ctx.fillRect(x - 40 * k, 150 * k, 10 * k, 520 * k);
    if (D.photoImg && D.photoMode !== 'none') mark(ctx, D, W - 210 * k, 230 * k, (hero ? 140 : 90) * k);
    ctx.textAlign = 'left';
    const s = fit(ctx, D.titleName, 700, 150 * k, 60 * k, W - 2 * x - (hero ? 300 * k : 0));
    ctx.fillStyle = primary; ctx.fillText(D.titleName, x, 330 * k);
    let y = textBlock(ctx, D.positioning, { x, y: 330 * k + s * 0.7 * sp, maxW: W - 2 * x, size: 44 * k, weight: 500, color: ink, maxLines: 2 });
    ctx.fillStyle = '#d7dee8'; ctx.fillRect(x, y + 20 * k * sp, W - 2 * x, 3 * k);
    if (D.slogan) textBlock(ctx, D.slogan, { x, y: y + 110 * k * sp, maxW: W - 2 * x, size: 52 * k, weight: 700, color: ink, maxLines: 2 });
    textBlock(ctx, '從下方選單開始，或直接留言', { x, y: H - 110 * k, maxW: W - 2 * x, size: 32 * k, color: '#5b6b80' });
    return;
  }
  // tech / friendly：置中卡片
  const px = 90 * k, py = 110 * k, pw = W - 2 * px, ph = H - 2 * py;
  ctx.save();
  if (d === 'tech') {
    ctx.fillStyle = alpha('#ffffff', D.avoid.has('glow') ? 0.92 : 0.78);
    rr(ctx, px, py, pw, ph, 16 * k); ctx.fill();
    ctx.strokeStyle = alpha(primary, 0.28); ctx.lineWidth = 2.5 * k; ctx.stroke();
  } else {
    ctx.shadowColor = alpha(primary, 0.12); ctx.shadowBlur = 40 * k; ctx.shadowOffsetY = 12 * k;
    ctx.fillStyle = '#ffffff'; rr(ctx, px, py, pw, ph, 56 * k); ctx.fill();
  }
  ctx.restore();
  const cx = W / 2;
  const markR = (hero ? 120 : 64) * k;
  mark(ctx, D, cx, py + 80 * k + markR, markR);
  let y = py + 80 * k + markR * 2 + 120 * k * sp;
  ctx.textAlign = 'center';
  fit(ctx, D.titleName, 700, (hero ? 120 : 150) * k, 56 * k, pw - 100 * k);
  ctx.fillStyle = primary; ctx.fillText(D.titleName, cx, y);
  y = textBlock(ctx, D.positioning, { x: cx, y: y + 80 * k * sp, maxW: pw - 120 * k, size: 42 * k, weight: 500, color: ink, maxLines: 2, align: 'center' });
  ctx.fillStyle = accent; rr(ctx, cx - 70 * k, y + 4 * k * sp, 140 * k, 7 * k, 4 * k); ctx.fill();
  if (D.slogan) textBlock(ctx, D.slogan, { x: cx, y: y + 92 * k * sp, maxW: pw - 120 * k, size: 50 * k, weight: 700, color: ink, maxLines: 2, align: 'center' });
}

export function richMenu(ctx, W, H, D, line, p) {
  const { primary, accent, bg, ink } = D.palette;
  const L = layout(line, p);
  const d = D.design.id;
  ctx.fillStyle = d === 'friendly' ? bg : '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // 切頁區
  for (const t of L.tabs) {
    const active = t.page === p;
    if (d === 'friendly') {
      ctx.fillStyle = active ? primary : '#ffffff';
      rr(ctx, t.x + 30, t.y + 30, t.w - 60, t.h - 60, (t.h - 60) / 2); ctx.fill();
    } else {
      ctx.fillStyle = active ? (d === 'tech' ? bg : '#ffffff') : '#f6f8fb';
      ctx.fillRect(t.x, t.y, t.w, t.h);
      if (active) { ctx.fillStyle = d === 'tech' ? accent : primary; ctx.fillRect(t.x, t.h - 14, t.w, 14); }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fit(ctx, t.name || `第 ${t.page + 1} 頁`, active ? 700 : 500, 72, 40, t.w - 120);
    ctx.fillStyle = d === 'friendly' ? (active ? '#ffffff' : primary) : active ? primary : '#64748b';
    ctx.fillText(t.name || `第 ${t.page + 1} 頁`, t.x + t.w / 2, t.y + t.h / 2);
    ctx.textBaseline = 'alphabetic';
  }
  if (L.tab && d !== 'friendly') { ctx.fillStyle = '#d6e0ec'; ctx.fillRect(0, L.tab - 2, W, 2); }
  // 服務格
  L.cells.forEach((c, i) => {
    const label = c.entry.label || '待命名';
    const icon = iconFor(label, i);
    if (d === 'tech') {
      const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, bg);
      ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#d3e1ef'; ctx.lineWidth = 3; ctx.strokeRect(c.x + 1.5, c.y + 1.5, c.w - 3, c.h - 3);
      ctx.strokeStyle = alpha(accent, 0.55); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(c.x + c.w - 110, c.y + 30); ctx.lineTo(c.x + c.w - 30, c.y + 30); ctx.lineTo(c.x + c.w - 30, c.y + 110); ctx.stroke();
      drawIcon(ctx, icon, c.x + c.w / 2, c.y + c.h * 0.4, Math.min(c.w, c.h) * 0.36, primary, 1.4);
      ctx.textAlign = 'center';
      fit(ctx, label, 700, 76, 44, c.w - 70);
      ctx.fillStyle = ink; ctx.fillText(label, c.x + c.w / 2, c.y + c.h * 0.8);
    } else if (d === 'minimal') {
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(c.x + c.w, c.y + 40); ctx.lineTo(c.x + c.w, c.y + c.h - 40); ctx.moveTo(c.x + 40, c.y + c.h); ctx.lineTo(c.x + c.w - 40, c.y + c.h); ctx.stroke();
      const pad = Math.min(80, c.w * 0.12);
      drawIcon(ctx, icon, c.x + pad + 60, c.y + c.h * 0.32, 120, primary, 1.6);
      ctx.textAlign = 'left';
      fit(ctx, label, 700, 84, 44, c.w - pad * 2);
      ctx.fillStyle = ink; ctx.fillText(label, c.x + pad, c.y + c.h * 0.75);
      ctx.fillStyle = accent; ctx.fillRect(c.x + pad, c.y + c.h * 0.75 + 34, 70, 8);
    } else {
      const m = 26;
      ctx.fillStyle = '#ffffff'; rr(ctx, c.x + m, c.y + m, c.w - 2 * m, c.h - 2 * m, 56); ctx.fill();
      const r = Math.min(c.w, c.h) * 0.2;
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h * 0.4, r, 0, Math.PI * 2); ctx.fill();
      drawIcon(ctx, icon, c.x + c.w / 2, c.y + c.h * 0.4, r * 1.15, primary, 1.5);
      ctx.textAlign = 'center';
      fit(ctx, label, 600, 72, 42, c.w - 90);
      ctx.fillStyle = ink; ctx.fillText(label, c.x + c.w / 2, c.y + c.h * 0.8);
    }
  });
}

/** 點擊區對照圖：在選單上標出每個點擊範圍與動作，給手動設定時對照 */
export function clickMap(ctx, W, H, D, line, p) {
  richMenu(ctx, W, H, D, line, p);
  ctx.fillStyle = 'rgba(15,23,42,0.72)'; ctx.fillRect(0, 0, W, H);
  const L = layout(line, p);
  const draw = (x, y, w, h, n, title, sub, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 80, y + 80, 48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.font = font(700, 52); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x + 80, y + 82);
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
    fit(ctx, title, 700, 60, 32, w - 180); ctx.fillText(title, x + 150, y + 100);
    textBlock(ctx, sub, { x: x + 40, y: y + 190, maxW: w - 80, size: 38, color: '#e2e8f0', maxLines: Math.max(1, Math.floor((h - 220) / 57)) });
    ctx.font = font(400, 30); ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`x${x} y${y} w${w} h${h}`, x + 40, y + h - 40);
  };
  L.tabs.forEach((t) => draw(t.x, t.y, t.w, t.h, '頁', `切換到：${t.name}`, '', '#fbbf24'));
  L.cells.forEach((c, i) => {
    const url = /^https?:\/\//.test(c.entry.url || '');
    draw(c.x, c.y, c.w, c.h, String(i + 1), c.entry.label || '待命名', url ? `連結：${c.entry.url}` : `送出文字「${c.entry.label}」（待設定自動回應）`, url ? '#22d3ee' : '#f472b6');
  });
}

export function cover(ctx, W, H, D) {
  const { primary, accent, ink } = D.palette;
  background(ctx, W, H, D);
  const safeW = Math.min(W, H * 1.78);
  const sx = (W - safeW) / 2;
  const k = H / 624, sp = space(D);
  const hasPhoto = D.photoImg && D.photoMode !== 'none';
  const d = D.design.id;
  if (hasPhoto) mark(ctx, D, sx + safeW - 210 * k, H / 2, (D.photoMode === 'hero' ? 170 : 120) * k);
  const textW = safeW - (hasPhoto ? 480 * k : 160 * k);
  const left = d === 'minimal' || hasPhoto;
  const x = left ? sx + 90 * k : W / 2;
  ctx.textAlign = left ? 'left' : 'center';
  if (d === 'minimal') { ctx.fillStyle = primary; ctx.fillRect(sx + 50 * k, H * 0.25, 8 * k, H * 0.5); }
  fit(ctx, D.titleName, 700, 120 * k, 50 * k, textW);
  ctx.fillStyle = primary; ctx.fillText(D.titleName, x, H * 0.43);
  const y = textBlock(ctx, D.positioning, { x, y: H * 0.43 + 76 * k * sp, maxW: textW, size: 40 * k, weight: 500, color: ink, maxLines: 1, align: left ? 'left' : 'center' });
  if (D.slogan) textBlock(ctx, D.slogan, { x, y: y + 30 * k * sp, maxW: textW, size: 38 * k, color: '#475569', maxLines: 1, align: left ? 'left' : 'center' });
}

function header(ctx, W, D, k) {
  const { primary, ink } = D.palette;
  const hasPhoto = D.photoImg && D.photoMode !== 'none';
  mark(ctx, D, 110 * k, 120 * k, 44 * k);
  ctx.textAlign = 'left';
  fit(ctx, D.titleName, 700, 38 * k, 24 * k, W - 400 * k);
  ctx.fillStyle = primary; ctx.fillText(D.titleName, 175 * k, 116 * k);
  ctx.font = font(400, 26 * k); ctx.fillStyle = '#64748b';
  ctx.fillText(D.positioning, 175 * k, 152 * k, W - 300 * k);
  return hasPhoto;
}

/** 貼文版型（FB／IG／Threads 共用；版面依風格不同） */
export function post(ctx, W, H, D, idea) {
  const { primary, accent, bg, ink } = D.palette;
  const k = W / 1080, sp = space(D);
  const d = D.design.id;
  background(ctx, W, H, D);
  header(ctx, W, D, k);
  const x = 90 * k, maxW = W - 180 * k;
  ctx.textAlign = 'left';
  ctx.fillStyle = primary;
  ctx.font = font(700, 30 * k);
  ctx.fillText('#' + idea.tag, x, 300 * k);
  let tSize = (d === 'minimal' ? 78 : 70) * k;
  for (let t = 0; t < 6; t++) {
    ctx.font = font(700, tSize);
    const ls = wrap(ctx, idea.title, maxW, 3);
    if (ls.length === 1 || [...ls[ls.length - 1]].length > 2) break;
    tSize -= 4 * k;
  }
  let y = textBlock(ctx, idea.title, { x, y: 390 * k, maxW, size: tSize, weight: 700, color: ink, lineH: 1.3, maxLines: 3 });
  y += 50 * k * sp;
  idea.points.forEach((pt, i) => {
    const h = 150 * k * sp;
    if (d === 'tech') {
      ctx.fillStyle = alpha('#ffffff', 0.85); rr(ctx, x, y, maxW, h - 24 * k, 10 * k); ctx.fill();
      ctx.strokeStyle = alpha(primary, 0.3); ctx.lineWidth = 2 * k; ctx.stroke();
      ctx.fillStyle = primary; ctx.font = font(700, 48 * k); ctx.textAlign = 'left'; ctx.fillText(String(i + 1).padStart(2, '0'), x + 30 * k, y + (h - 24 * k) / 2 + 17 * k);
    } else if (d === 'minimal') {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x, y, maxW, 3 * k);
      ctx.fillStyle = primary; ctx.font = font(700, 48 * k); ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x, y + 82 * k);
    } else {
      ctx.fillStyle = '#ffffff'; rr(ctx, x, y, maxW, h - 24 * k, 40 * k); ctx.fill();
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x + 70 * k, y + (h - 24 * k) / 2, 36 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = primary; ctx.font = font(700, 40 * k); ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + 70 * k, y + (h - 24 * k) / 2 + 14 * k);
    }
    textBlock(ctx, pt, { x: x + 130 * k, y: y + (d === 'minimal' ? 76 : (h - 24 * k) / 2 + 14 * k), maxW: maxW - 160 * k, size: 40 * k, weight: 500, color: ink, maxLines: 1 });
    y += h;
  });
  const fy = H - 90 * k;
  ctx.fillStyle = d === 'minimal' ? primary : accent; ctx.fillRect(x, fy - 60 * k, 80 * k, 6 * k);
  textBlock(ctx, D.slogan || D.titleName, { x, y: fy, maxW, size: 34 * k, weight: 500, color: '#475569', maxLines: 1 });
}

export function highlight(ctx, W, H, D, label, i = 0) {
  const { primary, accent, bg } = D.palette;
  const d = D.design.id;
  ctx.fillStyle = d === 'minimal' ? '#ffffff' : d === 'tech' ? primary : bg;
  ctx.fillRect(0, 0, W, H);
  if (d === 'tech') {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, primary); g.addColorStop(1, accent);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const cx = W / 2, cy = H / 2, r = W * 0.3;
  if (d === 'friendly') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
  if (d === 'minimal') { ctx.strokeStyle = primary; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  if (d === 'tech') { ctx.strokeStyle = alpha('#ffffff', 0.6); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  drawIcon(ctx, iconFor(label, i), cx, cy - r * 0.18, r * 0.95, d === 'tech' ? '#ffffff' : primary, 1.3);
  ctx.textAlign = 'center';
  fit(ctx, label, 700, 64, 36, r * 1.5);
  ctx.fillStyle = d === 'tech' ? '#ffffff' : primary;
  ctx.fillText(label, cx, cy + r * 0.6);
}

export function reelsCover(ctx, W, H, D, idea) {
  const { primary, accent, ink } = D.palette;
  background(ctx, W, H, D);
  const k = W / 1080;
  // 個人頁格狀顯示約為中間 3:4，重點放在 y 240–1680
  const x = D.design.id === 'minimal' ? 100 * k : W / 2;
  const align = D.design.id === 'minimal' ? 'left' : 'center';
  ctx.fillStyle = primary;
  ctx.font = font(700, 40 * k); ctx.textAlign = align; ctx.fillText('#' + idea.tag, x, 640 * k);
  const y = textBlock(ctx, idea.title, { x, y: 790 * k, maxW: W - 200 * k, size: 92 * k, weight: 700, color: ink, lineH: 1.3, maxLines: 4, align });
  ctx.fillStyle = primary; ctx.fillRect(align === 'left' ? x : x - 60 * k, y + 10 * k, 120 * k, 8 * k);
  textBlock(ctx, D.titleName, { x, y: 1560 * k, maxW: W - 200 * k, size: 44 * k, weight: 700, color: primary, maxLines: 1, align });
}

export function quoteCard(ctx, W, H, D, text) {
  const { primary, accent, ink } = D.palette;
  const k = W / 1080;
  background(ctx, W, H, D);
  header(ctx, W, D, k);
  const x = 110 * k, maxW = W - 220 * k, size = 80 * k, lineH = 1.4;
  ctx.font = font(700, size);
  const lines = wrap(ctx, text, maxW, 5);
  const blockH = lines.length * size * lineH;
  const top = (H - blockH) / 2 + size * 0.4;
  ctx.fillStyle = D.design.id === 'tech' ? accent : primary;
  ctx.font = font(700, 200 * k); ctx.textAlign = 'left';
  ctx.fillText('「', x - 50 * k, top - size * 0.9);
  textBlock(ctx, text, { x, y: top + size * 0.4, maxW, size, weight: 700, color: ink, lineH, maxLines: 5 });
  const fy = H - 110 * k;
  ctx.fillStyle = D.design.id === 'minimal' ? primary : accent; ctx.fillRect(x, fy - 60 * k, 80 * k, 6 * k);
  textBlock(ctx, `${D.titleName}｜${D.positioning}`, { x, y: fy, maxW, size: 34 * k, weight: 500, color: '#475569', maxLines: 1 });
}

// ---------- 提案板：同一份品牌資料、套用某一風格的總覽圖 ----------
export function proposalBoard(ctx, W, H, D, line) {
  const k = W / 900;
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
  const sub = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const wc = sub(1040, 1040, (c, w, h) => welcomeCard(c, w, h, D));
  const rm = sub(2500, 1686, (c, w, h) => richMenu(c, w, h, D, line, 0));
  const ps = sub(1080, 1350, (c, w, h) => post(c, w, h, D, { tag: '範例', title: '貼文版型示意', points: ['重點一', '重點二', '重點三'] }));
  const av = sub(640, 640, (c, w, h) => avatar(c, w, h, D));
  const colW = 520 * k;
  ctx.drawImage(wc, 30 * k, 30 * k, colW, colW);
  ctx.drawImage(rm, 30 * k, 30 * k + colW + 16 * k, colW, colW * (1686 / 2500));
  const rx = 30 * k + colW + 24 * k, rw = W - rx - 30 * k;
  ctx.save(); ctx.beginPath(); ctx.arc(rx + rw / 2, 30 * k + rw / 2, rw / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(av, rx, 30 * k, rw, rw); ctx.restore();
  ctx.drawImage(ps, rx, 30 * k + rw + 24 * k, rw, rw * 1.25);
}

export const ENTRY_COUNT = (line) => line.pages * line.count;
export { pageEntries };
