// 素材輸出：PNG、文字、提示詞、設定檔、網頁，打包為各平台 ZIP。
import { derive } from './brand.js';
import { loadImage } from './draw.js';
import { PLATFORMS, PLATFORM_BY_ID, assetsFor, statusOf, isReady } from './platforms.js';
import { TEXT_FIELDS, textValue } from './copy.js';
import { buildPrompt } from './prompt.js';
import { richMenuBody, richMenuConfig, apiScript } from './line.js';
import { websiteHTML } from './website.js';
import { makeZip } from './zip.js';
import { canvasToBlob } from './util.js';
import { replyValue, formScript, formManual, formEntries, TYPE_NAME } from './entries.js';
import { exportJSON } from './model.js';
import { brandMd, guidePrompt } from './brandguide.js';

export const RICHMENU_MAX_BYTES = 1024 * 1024;

export async function prepare(state, designId) {
  const D = derive(state, designId);
  D.photoImg = D.photoMode !== 'none' ? await loadImage(D.photo) : null;
  return D;
}

export function renderAsset(asset, D, canvas = document.createElement('canvas')) {
  canvas.width = asset.w;
  canvas.height = asset.h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, asset.w, asset.h);
  asset.render(ctx, asset.w, asset.h, D);
  return canvas;
}

/** 圖文選單需 ≤ 1MB：PNG 過大時改用 JPEG */
export async function assetBlob(asset, D, forceJpeg = false) {
  const c = renderAsset(asset, D);
  let blob = forceJpeg ? null : await canvasToBlob(c, 'image/png');
  let ext = 'png';
  if (asset.id.startsWith('richmenu') && (forceJpeg || blob.size > RICHMENU_MAX_BYTES)) {
    for (const q of [0.92, 0.85, 0.75]) {
      blob = await canvasToBlob(c, 'image/jpeg', q);
      ext = 'jpg';
      if (blob.size <= RICHMENU_MAX_BYTES) break;
    }
  }
  return { blob, ext };
}

const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 30) || '我的品牌';

export function textsTxt(state, D, pid) {
  return TEXT_FIELDS[pid].map((f) => `【${f.label}】\n${textValue(state, D, pid, f.key)}\n`).join('\n');
}

export function guideTxt(state, pid) {
  const P = PLATFORM_BY_ID[pid];
  const st = statusOf(pid, state);
  return [
    `${P.name} 設定引導`, '',
    ...P.guide.map((g, i) => `${i + 1}. ${g.title}\n${g.body || guideDynamic(state, g)}${g.link ? `\n官方頁面：${g.link}` : ''}\n`),
    '完成狀態', ...st.map((s) => `- [${s.status === 'done' ? 'v' : ' '}] ${s.label}：${s.text}`), '',
    `測試：${P.test.label}`,
  ].join('\n');
}

/** 自動回應清單：關鍵字（入口名稱）→ 回應內容 */
export function replyList(state, D) {
  const L = state.platforms.lineOA;
  const out = [];
  for (let p = 0; p < L.pages; p++)
    L.entries.slice(p * 8, p * 8 + L.count).forEach((e) => {
      if (e.label && (e.type === 'reply' || e.type === 'chat' || ((e.type === 'form' || e.type === 'link') && !e.url))) out.push({ keyword: e.label, reply: replyValue(D, e, state), type: e.type });
    });
  return out;
}

export function guideDynamic(state, g) {
  if (g.dynamic === 'forms') {
    const n = formEntries(state.platforms.lineOA).length;
    return n ? `有 ${n} 個入口使用需求表單。用素材包裡的 google-form-script.gs 在你自己的 Google 帳號建立表單（或照「表單題目.txt」手動建立），再把網址填回 APP。` : '目前沒有使用表單的入口，可以跳過這一步。';
  }
  if (g.dynamic === 'replies') {
    const D = derive(state);
    return ['後台 → 自動回應訊息 → 新增。關鍵字填下方左邊的文字，回應內容貼上右邊的文字：', '', ...replyList(state, D).map((r) => `【關鍵字】${r.keyword}\n【回應】${r.reply}\n`)].join('\n');
  }
  if (g.dynamic !== 'richmenu') return '';
  const L = state.platforms.lineOA;
  if (L.pages === 1 && L.count === 6)
    return '後台 → 圖文選單 → 建立 → 版型選「大型」的 6 格（3 欄 × 2 行）→ 上傳「圖文選單 第 1 頁」→ 依「點擊區對照圖」逐格設定動作（連結或文字）。';
  return `你選的是${L.pages === 2 ? '雙頁' : ''}${L.count} 格選單，官方後台的現成版型做不到${L.count === 8 ? '八格' : ''}${L.pages === 2 ? '與切頁' : ''}，需要用 Messaging API 上傳。\n方法：請主持人或支援夥伴在 LINE Developers 為你的官方帳號啟用 Messaging API，再用素材包裡的 upload-richmenu.sh 上傳（權杖只在執行時輸入，不會存檔）。\n若想先自己完成，可改選「單頁 6 格」用後台版型設定。`;
}

export async function platformFiles(state, pid, designId = state.selectedDesignId) {
  const D = await prepare(state, designId);
  const P = PLATFORM_BY_ID[pid];
  const files = [];
  const assets = assetsFor(pid, state);
  const out = {};
  for (const a of assets) out[a.id] = await assetBlob(a, D);
  // 任一頁選單需轉 JPEG 時，全部頁面統一格式，讓上傳指令一致
  const rmIds = assets.filter((a) => a.id.startsWith('richmenu')).map((a) => a.id);
  const useJpg = rmIds.some((id) => out[id].ext === 'jpg');
  if (useJpg) for (const id of rmIds) if (out[id].ext === 'png') out[id] = await assetBlob(assets.find((a) => a.id === id), D, true);
  for (const a of assets) files.push({ name: `${a.file || a.id}.${out[a.id].ext}`, data: out[a.id].blob });
  files.push({ name: '文案.txt', data: textsTxt(state, D, pid) });
  files.push({ name: '提示詞.txt', data: state.platforms[pid].prompt.draft || buildPrompt(state, D, pid, state.platforms[pid].prompt.extra) });
  files.push({ name: '設定引導.txt', data: guideTxt(state, pid) });
  files.push({ name: 'brand.md', data: brandMd(state, D) });
  if (pid === 'lineOA') {
    const L = state.platforms.lineOA;
    for (let p = 0; p < L.pages; p++) files.push({ name: `richmenu-page-${p + 1}.json`, data: JSON.stringify(richMenuBody(L, p, D.titleName), null, 2) });
    files.push({ name: 'line-richmenu-config.json', data: JSON.stringify(richMenuConfig(L, D.titleName), null, 2) });
    files.push({ name: 'upload-richmenu.sh', data: apiScript(L, useJpg ? 'jpg' : 'png') });
    files.push({ name: '歡迎訊息.txt', data: textValue(state, D, 'lineOA', 'greeting') });
    files.push({ name: '自動回應清單.txt', data: replyList(state, D).map((r) => `【關鍵字】${r.keyword}（${TYPE_NAME[r.type]}）\n${r.reply}\n`).join('\n') });
    if (formEntries(L).length) {
      files.push({ name: 'google-form-script.gs', data: formScript(state, D) });
      files.push({ name: '表單題目.txt', data: formManual(state, D) });
    }
  }
  if (pid === 'website') files.push({ name: 'index.html', data: websiteHTML(state, D) }); // og.png 已在素材中
  const folder = `${safeName(D.titleName)}-${P.name}`;
  return files.map((f) => ({ ...f, name: `${folder}/${f.name}` }));
}

export async function platformZip(state, pid) {
  return makeZip(await platformFiles(state, pid));
}

export async function allZip(state) {
  const files = [];
  for (const P of PLATFORMS) if (isReady(P.id)) files.push(...(await platformFiles(state, P.id)));
  files.push({ name: '品牌進度備份.json', data: exportJSON(state) });
  { const D = derive(state); files.push({ name: 'brand.md', data: brandMd(state, D) }, { name: '品牌規範提示詞.txt', data: guidePrompt(state, D) }); }
  files.push({ name: '讀我.txt', data: '這是你的個人品牌素材包。\n每個資料夾對應一個平台，裡面有圖片、文案、提示詞與設定引導。\n「品牌進度備份.json」可以在 APP 的「進階工具 → 匯入進度」還原。\n含有【待填】的地方，請換成你的真實資料再使用。' });
  return makeZip(files);
}

/** 共用品牌資料（給外部 AI 或後續平台使用；不含照片原檔與任何憑證） */
export function brandKit(state, D) {
  return {
    schemaVersion: 2, kind: 'brand-kit',
    identity: { name: D.brandName, personName: D.personName, displayName: D.displayName, positioning: D.positioning, slogan: D.slogan, traits: D.traits, audience: D.audience, expertise: D.expertise },
    visual: { design: { id: D.design.id, name: D.design.name, rules: D.design.rules }, palette: D.palette, photo: D.photoMode === 'none' ? '不使用' : '本人照片另行提供', avoid: [...D.avoid] },
    voice: { tone: D.tone, greeting: textValue(state, D, 'lineOA', 'greeting') },
    freeform: state.freeform,
    services: D.services.map(({ label, description, url }) => ({ label, description, url })),
    platforms: Object.fromEntries(PLATFORMS.map((P) => [P.id, Object.fromEntries(TEXT_FIELDS[P.id].map((f) => [f.key, textValue(state, D, P.id, f.key)]))])),
  };
}
