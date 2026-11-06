// 共用小工具：DOM、跳脫、下載、雜湊
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** 任何使用者文字放進 HTML 前都必須經過 esc，避免被當成 HTML 執行 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const str = (v, max) => String(v ?? '').slice(0, max);
export const strArr = (v, maxItems, maxLen = 60) =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, maxItems).map((x) => x.slice(0, maxLen)) : [];

export function safeURL(u) {
  if (!u) return null;
  try {
    const v = new URL(String(u).trim());
    return ['https:', 'http:'].includes(v.protocol) ? v.href : null;
  } catch {
    return null;
  }
}

/** 簡單穩定雜湊（用於偵測資料是否變更、產生可重現的命名提案） */
export function hash(s) {
  let h = 5381;
  const t = String(s);
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** 今天日期 YYYY-MM-DD，用於檔名 */
export const today = () => new Date().toISOString().slice(0, 10);

/** 下載檔名一律用英文、數字與「-」：部分瀏覽器遇到中文檔名會改成「download」 */
export function download(name, data, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  // 連結與網址延後移除，避免瀏覽器還沒讀到檔名就被清掉（檔名會變成「download」）
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 4000);
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已複製');
    return true;
  } catch {
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
    }
    toast('請手動複製已選取的文字');
    return false;
  }
}

export const canvasToBlob = (canvas, type = 'image/png', q) =>
  new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, q));

/** 計算中文字元長度（emoji、全形都算 1） */
export const charLen = (s) => [...String(s ?? '')].length;
