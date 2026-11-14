// LINE 官方帳號代設（前端）：金鑰只送到自己的後台加密保存，不存在這台裝置，也不會出現在下載檔。
import { derive } from './brand.js';
import { prepare, assetBlob, replyList } from './export.js';
import { assetsFor } from './platforms.js';
import { richMenuBody, releaseId } from './line.js';
import { textValue } from './copy.js';

async function call(path, body) {
  const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-brand-studio': '1' }, body: JSON.stringify(body || {}) });
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('json')) throw new Error('目前無法連到後台，請確認網路後再試');
  const data = await r.json();
  if (data.authEnabled === false) throw new Error('需要先登入才能使用代設功能');
  if (!r.ok) throw new Error(data.error || '發生錯誤，請稍後再試');
  return data;
}

export const lineStatus = () => call('/api/line/status');
export const lineConnect = (token, secret) => call('/api/line/connect', { token, secret });
export const lineRollback = () => call('/api/line/rollback');
export const lineDisconnect = () => call('/api/line/disconnect');

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 這次會套用到官方帳號的內容（給使用者確認用） */
export function applySummary(state) {
  const D = derive(state);
  const L = state.platforms.lineOA;
  return { pages: L.pages, count: L.count, replies: replyList(state, D), greeting: textValue(state, D, 'lineOA', 'greeting') };
}

export async function lineApply(state) {
  const D = await prepare(state);
  const L = state.platforms.lineOA;
  const rel = releaseId();
  const assets = assetsFor('lineOA', state);
  const pages = [];
  for (let p = 0; p < L.pages; p++) {
    const { blob, ext } = await assetBlob(assets.find((a) => a.id === `richmenu${p + 1}`), D);
    pages.push({ body: richMenuBody(L, p, D.titleName, rel), image: await blobToBase64(blob), mime: ext === 'jpg' ? 'image/jpeg' : 'image/png' });
  }
  const sum = applySummary(state);
  return call('/api/line/apply', { rel, pages, replies: sum.replies.map((r) => ({ keyword: r.keyword, reply: r.reply })), greeting: sum.greeting });
}
