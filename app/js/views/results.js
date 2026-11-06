// 第三步：連接並完成——五平台固定入口，每個都有 預覽→修改→下載→提示詞→設定引導
import { PLATFORMS, PLATFORM_BY_ID, assetsFor, statusOf, isReady } from '../platforms.js';
import { TEXT_FIELDS, textValue, lengthNote } from '../copy.js';
import { derive } from '../brand.js';
import { buildPrompt } from '../prompt.js';
import { layout, pageEntries, entryStatus, richMenuConfig, RM_W, RM_H } from '../line.js';
import { entriesOutOfSync, entriesFromServices } from '../model.js';
import { websiteHTML } from '../website.js';
import { prepare, assetBlob, platformZip, textsTxt, guideDynamic, replyList } from '../export.js';
import { ENTRY_TYPES, TYPE_NAME, replyValue, generateReply, formScript, formManual, formEntries, parseFormResult, LINE_REPLY_MAX } from '../entries.js';
import { store, commit, save } from '../store.js';
import { esc, toast, download, copyText, hash, safeURL, charLen, today } from '../util.js';
import { icon, badge, paintAssets, assetFigure } from './common.js';

const S = () => store.state;
const TABS = [
  ['preview', '預覽'], ['edit', '修改'], ['download', '下載'], ['prompt', '提示詞'], ['guide', '設定引導'],
];

function overview(current) {
  return `<div class="overview" role="list">${PLATFORMS.map((P) => {
    if (!isReady(P.id)) return `<div role="listitem" class="ov is-building" aria-disabled="true">${icon(P.icon)}<b>${esc(P.name)}</b><span class="ov-counts"><span class="st st-none">建置中</span></span></div>`;
    const st = statusOf(P.id, S());
    const n = (k) => st.filter((x) => x.status === k).length;
    return `<a role="listitem" class="ov ${P.id === current ? 'is-current' : ''}" href="#/results/${P.id}/${P.id === current ? 'guide' : 'preview'}">
      ${icon(P.icon)}<b>${esc(P.name)}</b>
      <span class="ov-counts"><span class="st st-done">已完成 ${n('done')}</span><span class="st st-todo">待本人操作 ${n('todo')}</span><span class="st st-none">尚未串接 ${n('none')}</span></span></a>`;
  }).join('')}</div>`;
}

// ---------- 預覽 ----------
function lineMock(D) {
  const L = S().platforms.lineOA;
  const p = L.activePage;
  return `<div class="phone-col"><div class="phone" aria-label="LINE 聊天室模擬（LINE 原生介面為示意，只有頭像、訊息與選單可自訂）">
    <div class="phone-top"><span>‹</span><b>${esc(D.displayName)}</b><span>☰</span></div>
    <div class="phone-chat">
      <div class="msg"><canvas class="avatar-s" data-asset="lineOA:avatar" width="640" height="640" aria-hidden="true"></canvas><canvas class="bubble-img" data-asset="lineOA:welcome" width="1040" height="1040" role="img" aria-label="歡迎圖卡"></canvas></div>
      <div class="msg"><canvas class="avatar-s" data-asset="lineOA:avatar" width="640" height="640" aria-hidden="true"></canvas><p class="bubble">${esc(textValue(S(), D, 'lineOA', 'greeting'))}</p></div>
    </div>
    <div class="phone-menu"><canvas id="rmPreview" data-asset="lineOA:richmenu${p + 1}" width="${RM_W}" height="${RM_H}" role="img" aria-label="圖文選單第 ${p + 1} 頁，可點擊測試"></canvas></div>
    <div class="phone-bar">選單 ▾ 我的服務</div>
  </div>
  <p class="hint">點選單上的格子可看該入口的功能${L.pages === 2 ? '；點上方切頁區可切換頁面' : ''}。LINE 聊天室外框是示意，實際外觀由 LINE 決定。</p>
  ${L.pages === 2 ? `<div class="row">${[0, 1].map((i) => `<button type="button" class="chip" data-action="line-page" data-v="${i}" aria-pressed="${L.activePage === i}">${esc(L.pageNames[i])}</button>`).join('')}</div>` : ''}</div>`;
}

function textCards(pid, D) {
  return `<div class="text-cards">${TEXT_FIELDS[pid].map((f) => `<div class="text-card"><p class="label">${esc(f.label)}</p><p class="pre">${esc(textValue(S(), D, pid, f.key))}</p></div>`).join('')}</div>`;
}

function previewTab(pid, D) {
  const assets = assetsFor(pid, S());
  if (pid === 'lineOA') return `<div class="split">${lineMock(D)}<div><h3>素材</h3><div class="assets">${assets.filter((a) => !a.id.startsWith('clickmap')).map((a) => assetFigure(pid, a)).join('')}</div></div></div>`;
  if (pid === 'website') return `<div class="row"><button type="button" class="chip" data-action="web-width" data-v="390" aria-pressed="true">手機寬度</button><button type="button" class="chip" data-action="web-width" data-v="1024" aria-pressed="false">電腦寬度</button></div>
    <div class="web-frame"><iframe id="webPreview" title="個人網頁預覽" sandbox="" srcdoc="${esc(websiteHTML(S(), D))}"></iframe></div>
    <p class="hint">這是下載後的網頁實際樣子。黃色虛線框是【待填】欄位，上線前請換成真實資料。</p>
    <div class="assets">${assets.map((a) => assetFigure(pid, a)).join('')}</div>`;
  return `<div class="assets">${assets.map((a) => assetFigure(pid, a)).join('')}</div><h3>文字內容</h3>${textCards(pid, D)}`;
}

// ---------- 修改 ----------
function sharedNote() {
  return `<div class="card soft"><p><b>共用品牌資料</b>（名稱、配色、照片、語氣、禁忌）改一次，所有素材一起更新：</p>
  <div class="row"><a class="chip" href="#/profile" data-action="goto-q" data-q="name">品牌名稱與標語</a><a class="chip" href="#/profile" data-action="goto-q" data-q="palette">配色</a><a class="chip" href="#/profile" data-action="goto-q" data-q="photo">照片</a><a class="chip" href="#/profile" data-action="goto-q" data-q="tone">語氣</a><a class="chip" href="#/design">風格</a></div>
  <p class="hint">下面是這個平台專屬的文字。你改過的欄位會保留，不會因共用資料更新而被覆蓋；按「恢復自動產生」可改回系統版本。</p></div>`;
}

function textEditors(pid, D) {
  return TEXT_FIELDS[pid].map((f) => {
    const v = textValue(S(), D, pid, f.key);
    const edited = typeof S().platforms[pid].overrides[f.key] === 'string';
    const { n, over } = lengthNote(f, v);
    return `<div class="field text-edit"><label for="t-${pid}-${f.key}">${esc(f.label)}</label>
      <textarea id="t-${pid}-${f.key}" data-text="${pid}:${f.key}" rows="${f.max <= 150 ? 3 : 7}">${esc(v)}</textarea>
      <div class="field-foot"><span class="count ${over ? 'over' : ''}" data-count="${pid}:${f.key}">${n} / ${f.max} 字${over ? '・超過平台上限' : ''}</span>
      ${edited ? `<span class="st st-todo">已手動修改</span><button type="button" class="link-btn" data-action="reset-text" data-p="${pid}" data-k="${f.key}">恢復自動產生</button>` : '<span class="st st-none">系統產生</span>'}</div></div>`;
  }).join('');
}

function lineEditor() {
  const L = S().platforms.lineOA;
  const p = L.activePage;
  const sync = entriesOutOfSync(S());
  return `<div class="card">
    <h3>選單配置</h3>
    <div class="row"><span class="label">每頁格數</span>${[6, 8].map((v) => `<button type="button" class="chip" data-action="line-count" data-v="${v}" aria-pressed="${L.count === v}">${v} 格（${v === 6 ? 3 : 4} 欄 × 2 行）</button>`).join('')}</div>
    <div class="row"><span class="label">頁數</span>${[1, 2].map((v) => `<button type="button" class="chip" data-action="line-pages" data-v="${v}" aria-pressed="${L.pages === v}">${v} 頁${v === 2 ? `（共 ${L.count * 2} 個入口）` : ''}</button>`).join('')}</div>
    ${L.pages === 2 ? `<div class="grid2">${[0, 1].map((i) => `<label class="field"><span>第 ${i + 1} 頁名稱（切頁按鈕）</span><input data-pagename="${i}" maxlength="12" value="${esc(L.pageNames[i])}"></label>`).join('')}</div>` : ''}
    <p class="hint">${L.count === 6 && L.pages === 1 ? '單頁 6 格可以用官方後台的現成版型自己設定。' : '8 格或雙頁需要 Messaging API（設定引導會說明）。'}切換格數或頁數時，被隱藏的入口會保留，切回來就會出現。</p>
  </div>
  ${sync ? `<div class="conflict"><p>${icon('question')} 你在第一步調整了服務順序，但選單入口曾手動修改過。要套用新的順序嗎？（會重設入口名稱與說明）</p><div class="row"><button type="button" class="chip" data-action="entries-resync">套用新順序</button><button type="button" class="chip" data-action="entries-keep">保留目前入口</button></div></div>` : ''}
  <div class="card">
    <h3>服務入口</h3>
    ${L.pages === 2 ? `<div class="row">${[0, 1].map((i) => `<button type="button" class="chip" data-action="line-page" data-v="${i}" aria-pressed="${p === i}">編輯：${esc(L.pageNames[i])}</button>`).join('')}</div>` : ''}
    <p class="hint">每一格選一種功能。系統已先依入口名稱配好，回覆文字也寫好了，可以直接修改。</p>
    <div class="entries">${pageEntries(L, p).map((e, i) => entryEditor(e, p * 8 + i, i)).join('')}</div>
    <button type="button" class="link-btn" data-action="entries-reset">依第一步的服務順序重新產生入口</button>
  </div>`;
}

function entryBadge(e) {
  const st = entryStatus(e);
  const [cls, text] = st.kind === 'link' ? ['st-done', '已連結'] : st.kind === 'invalid' ? ['st-err', '網址有誤'] : st.kind === 'pending' ? ['st-todo', e.type === 'form' ? '待建表單' : '待貼網址'] : ['st-todo', '待設定回應'];
  return `<span class="st ${cls}">${text}</span>`;
}

function entryEditor(e, j, i) {
  const D = derive(S());
  const st = entryStatus(e);
  const reply = replyValue(D, e, S());
  const rl = [...reply].length;
  const usesReply = e.type === 'reply' || e.type === 'chat';
  return `<details class="entry" ${i === 0 ? 'open' : ''}><summary><span class="num">${i + 1}</span><b>${esc(e.label || '未命名')}</b><span class="type-tag">${esc(TYPE_NAME[e.type])}</span>${entryBadge(e)}</summary>
    <label class="field"><span>入口名稱（顯示在選單上，建議 4–5 字）</span><input data-entry="${j}:label" maxlength="20" value="${esc(e.label)}"></label>
    <div class="field"><span class="flabel">按下去之後</span><div class="type-pick" role="radiogroup" aria-label="${esc(e.label)} 的功能">${ENTRY_TYPES.map((t) => `<button type="button" class="chip" role="radio" data-action="entry-type" data-i="${j}" data-v="${t.id}" aria-checked="${e.type === t.id}" aria-pressed="${e.type === t.id}">${t.name}</button>`).join('')}</div>
      <p class="hint">${esc(ENTRY_TYPES.find((t) => t.id === e.type).hint)}</p></div>
    ${usesReply ? `<div class="field"><label for="r-${j}">客人會收到的文字</label><textarea id="r-${j}" data-entry="${j}:reply" rows="6" maxlength="2000">${esc(reply)}</textarea>
      <div class="field-foot"><span class="count ${rl > LINE_REPLY_MAX ? 'over' : ''}" data-reply-count="${j}">${rl} / ${LINE_REPLY_MAX} 字</span>${e.reply ? `<span class="st st-todo">已手動修改</span><button type="button" class="link-btn" data-action="entry-reply-reset" data-i="${j}">恢復自動產生</button>` : '<span class="st st-none">系統產生</span>'}</div></div>` : ''}
    ${e.type === 'form' || e.type === 'link' ? `<label class="field"><span>${e.type === 'form' ? '表單網址（建立表單後會自動填入，也可以手動貼上）' : '網址'}</span><input data-entry="${j}:url" type="url" inputmode="url" maxlength="2000" placeholder="https://" value="${esc(e.url)}"></label>
      ${e.type === 'form' && !e.url ? '<p class="hint">到「設定引導」的「建立需求表單」步驟，一次建好所有表單入口。</p>' : ''}` : ''}
    <p class="hint" data-entry-status="${j}">${esc(st.text)}</p></details>`;
}

function editTab(pid, D) {
  return `${sharedNote()}${pid === 'lineOA' ? lineEditor() : ''}<div class="card"><h3>${esc(PLATFORM_BY_ID[pid].name)} 專屬文字</h3>${textEditors(pid, D)}</div>`;
}

// ---------- 下載 ----------
function downloadTab(pid) {
  const assets = assetsFor(pid, S());
  return `<div class="card dl-main"><div><h3>下載本平台素材包</h3><p class="hint">一次下載所有圖片、文案、提示詞與設定引導（ZIP）。</p></div><button type="button" class="btn primary" data-action="dl-zip" data-p="${pid}">${icon('doc', 'ic sm')} 下載素材包</button></div>
  <ul class="dl-list">
    ${assets.map((a) => `<li><span>${esc(a.label)}<small>${a.w}×${a.h}${a.note ? `・${esc(a.note)}` : ''}</small></span><button type="button" class="btn ghost" data-action="dl-asset" data-p="${pid}" data-a="${a.id}">下載圖片</button></li>`).join('')}
    <li><span>文案（TXT）<small>所有可複製的文字</small></span><button type="button" class="btn ghost" data-action="dl-text" data-p="${pid}">下載</button></li>
    ${pid === 'lineOA' ? `<li><span>點擊區設定檔（JSON）<small>給 Messaging API 或支援夥伴使用</small></span><button type="button" class="btn ghost" data-action="dl-config">下載</button></li>` : ''}
    ${pid === 'website' ? `<li><span>網頁檔 index.html<small>可直接上傳到免費主機</small></span><button type="button" class="btn ghost" data-action="dl-html">下載</button></li>` : ''}
  </ul>
  ${pid === 'lineOA' ? '<p class="hint">圖文選單圖片若超過 LINE 的 1MB 上限，會自動改存為 JPEG。</p>' : ''}`;
}

// ---------- 提示詞 ----------
function promptTab(pid, D) {
  const pr = S().platforms[pid].prompt;
  const gen = buildPrompt(S(), D, pid, pr.extra);
  const stale = pr.draft && pr.basis !== hash(gen);
  return `<div class="card"><p class="hint">提示詞已自動帶入：品牌資料、已選風格、配色、禁忌、你的每一則自由回答，以及 ${esc(PLATFORM_BY_ID[pid].name)} 的配置。可以貼到 Claude、ChatGPT、Gemini 或 Claude Code 繼續製作。</p>
    <label class="field"><span>這次的額外要求（選填）</span><textarea data-prompt-extra="${pid}" rows="2" maxlength="3000" placeholder="例如：幫我多做 3 種封面版本">${esc(pr.extra)}</textarea></label>
    ${stale ? `<div class="conflict"><p>${icon('question')} 品牌資料已更新，但你手動改過這份提示詞。要重新生成嗎？</p><div class="row"><button type="button" class="chip" data-action="prompt-regen" data-p="${pid}">重新生成（覆蓋我的修改）</button><button type="button" class="chip" data-action="prompt-keep" data-p="${pid}">保留我的版本</button></div></div>` : ''}
    <label class="field"><span>完整提示詞（可直接修改）${pr.draft ? '・<b>已手動修改</b>' : ''}</span><textarea id="promptOut" data-prompt-draft="${pid}" rows="16">${esc(pr.draft || gen)}</textarea></label>
    <div class="row"><button type="button" class="btn primary" data-action="prompt-copy">${icon('doc', 'ic sm')} 複製提示詞</button><button type="button" class="btn ghost" data-action="prompt-dl" data-p="${pid}">下載 TXT</button>${pr.draft ? `<button type="button" class="btn ghost" data-action="prompt-regen" data-p="${pid}">恢復自動產生</button>` : ''}</div>
    <p class="hint">這是規則式組合，不使用付費 AI。AI 生圖、實際部署需在外部工具完成，提示詞已要求對方分開標示完成範圍。</p></div>`;
}

// ---------- 設定引導 ----------
function guideTab(pid) {
  const P = PLATFORM_BY_ID[pid];
  const pl = S().platforms[pid];
  const st = statusOf(pid, S());
  const urlField = P.test.urlField;
  return `<div class="card"><h3>完成狀態</h3><ul class="status-list">${st.map((x) => `<li>${badge(x.status, x.text)}<span>${esc(x.label)}</span></li>`).join('')}</ul>
    <p class="hint">「已完成」只代表系統產出素材或你自己確認；APP 不會替你登入、發文或宣稱已串接。</p></div>
    <ol class="guide">${P.guide.map((g, i) => `<li class="card"><div class="g-head"><span class="step-no">${i + 1}</span><h3>${esc(g.title)}</h3></div>
      ${g.dynamic === 'forms' ? formsGuide() : g.dynamic === 'replies' ? repliesGuide() : `<p class="pre">${esc(g.body || guideDynamic(S(), g))}</p>`}
      ${g.link ? `<p><a href="${esc(g.link)}" target="_blank" rel="noopener noreferrer">打開官方頁面 ↗</a></p>` : ''}
      ${g.check ? `<label class="check"><input type="checkbox" data-check="${pid}:${g.check}" ${pl.checklist[g.check] ? 'checked' : ''}> 我已完成這一步</label>` : ''}</li>`).join('')}</ol>
    <div class="card"><h3>測試</h3><p>${esc(P.test.label)}</p>
      ${urlField ? `<label class="field"><span>${pid === 'website' ? '我的網頁網址' : '官方帳號加好友網址'}</span><input type="url" inputmode="url" data-url-field="${pid}:${urlField}" value="${esc(pl[urlField] || '')}" placeholder="https://"></label>
      ${safeURL(pl[urlField]) ? `<p><a class="btn ghost" href="${esc(safeURL(pl[urlField]))}" target="_blank" rel="noopener noreferrer">打開測試 ↗</a></p>` : '<p class="hint">完成上線後貼上網址，就能從這裡打開測試。</p>'}` : ''}</div>`;
}

function formsGuide() {
  const s = S();
  const L = s.platforms.lineOA;
  const list = formEntries(L);
  if (!list.length) return '<p>目前沒有入口使用「需求表單」，可以跳過這一步。想加的話，到「修改」頁把某一格改成需求表單。</p>';
  const done = list.filter((e) => e.url).length;
  return `<p>有 <b>${list.length}</b> 個入口使用需求表單：${list.map((e) => `<span class="tag">${esc(e.label)}${e.url ? ' ✓' : ''}</span>`).join(' ')}</p>
    <p>系統會在<b>你自己的</b> Google 帳號建立一份表單和回覆試算表，免費，資料只在你的帳號裡。</p>
    <ol class="small-steps">
      <li><button type="button" class="btn primary sm" data-action="copy-form-script">複製建立程式</button></li>
      <li>打開 <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener noreferrer">Google Apps Script 新專案 ↗</a>（用你的 Google 帳號登入）</li>
      <li>刪掉畫面上原本的文字，貼上剛才複製的程式，按上方的 <b>「執行」</b></li>
      <li>第一次會要求授權：Google 會提醒「尚未驗證」，因為這是你自己的程式。點 <b>「進階」→「前往」→「允許」</b></li>
      <li>執行完，畫面下方「執行記錄」會出現一段以 <code>BRAND-STUDIO-RESULT</code> 開頭的文字，<b>全部複製</b>，貼到下面</li>
    </ol>
    <label class="field"><span>貼上執行記錄</span><textarea id="formResult" rows="4" placeholder="BRAND-STUDIO-RESULT&#10;預約諮詢|https://docs.google.com/forms/..."></textarea></label>
    <button type="button" class="btn ghost" data-action="apply-forms">套用到選單入口</button>
    ${done ? `<p class="parse"><span class="ok">已填入 ${done} / ${list.length} 個表單網址</span></p>` : ''}
    ${L.forms.edit || L.forms.sheet ? `<p class="row">${L.forms.edit ? `<a class="btn ghost sm" href="${esc(L.forms.edit)}" target="_blank" rel="noopener noreferrer">編輯表單 ↗</a>` : ''}${L.forms.sheet ? `<a class="btn ghost sm" href="${esc(L.forms.sheet)}" target="_blank" rel="noopener noreferrer">看回覆試算表 ↗</a>` : ''}</p>` : ''}
    <details><summary>不想用程式？改用手動建立</summary><p class="pre">${esc(formManual(s, derive(s)))}</p><button type="button" class="btn ghost sm" data-action="copy-form-manual">複製題目清單</button></details>
    <p class="hint">建好表單後，選單圖片要重新上傳一次，新的網址才會生效。</p>`;
}

function repliesGuide() {
  const s = S();
  const rows = replyList(s, derive(s));
  if (!rows.length) return '<p>所有入口都是連結或表單，不需要設定自動回應。</p>';
  return `<p>LINE 官方帳號後台 →「自動回應訊息」→「建立」。每一筆：關鍵字貼左邊，回應內容貼右邊。共 <b>${rows.length}</b> 筆。</p>
    <p class="hint">也要確認後台「回應設定」裡的「自動回應訊息」是開啟的。</p>
    <ul class="reply-list">${rows.map((r, i) => `<li><div class="kw"><span class="label">關鍵字</span><b>${esc(r.keyword)}</b><button type="button" class="btn ghost sm" data-action="copy-kw" data-i="${i}">複製</button></div>
      <div class="rp"><span class="label">回應內容</span><p class="pre">${esc(r.reply)}</p><button type="button" class="btn ghost sm" data-action="copy-reply" data-i="${i}">複製</button></div></li>`).join('')}</ul>`;
}

// ---------- 主畫面 ----------
export function render(root, [pidArg, tabArg]) {
  const fallback = isReady(S().meta.target) ? S().meta.target : PLATFORMS.find((p) => isReady(p.id)).id;
  const pid = PLATFORM_BY_ID[pidArg] && isReady(pidArg) ? pidArg : fallback;
  const tab = TABS.some(([t]) => t === tabArg) ? tabArg : 'preview';
  const D = derive(S());
  const P = PLATFORM_BY_ID[pid];
  const content = { preview: previewTab, edit: editTab, download: downloadTab, prompt: promptTab, guide: guideTab }[tab](pid, D);
  root.innerHTML = `
  <div class="page-head"><p class="eyebrow">第三步</p><h1 tabindex="-1">連接並完成</h1>
  <p class="lead">照「預覽 → 修改 → 下載 → 提示詞 → 設定引導」的順序完成。標示「建置中」的平台，完成後會陸續開放。</p></div>
  ${overview(pid)}
  <nav class="ptabs" aria-label="平台">${PLATFORMS.map((x) => (isReady(x.id) ? `<a href="#/results/${x.id}/${tab}" aria-current="${x.id === pid ? 'page' : 'false'}">${icon(x.icon, 'ic sm')}${esc(x.name)}</a>` : `<span class="is-building" aria-disabled="true" title="建置中">${icon(x.icon, 'ic sm')}${esc(x.name)}<small>建置中</small></span>`)).join('')}</nav>
  <section class="panel" aria-labelledby="pTitle">
    <header class="panel-head"><h2 id="pTitle">${esc(P.name)}</h2><p>${esc(P.summary)}・風格：${esc(D.design.name)}</p></header>
    <nav class="subtabs" aria-label="${esc(P.name)} 操作">${TABS.map(([t, label], i) => `<a href="#/results/${pid}/${t}" aria-current="${t === tab ? 'page' : 'false'}"><span class="n">${i + 1}</span>${label}</a>`).join('')}</nav>
    <div class="panel-body">${content}</div>
  </section>`;
  paintAssets(root);
  if (pid === 'website' && tab === 'preview') setWebWidth(390);
}

function setWebWidth(w) {
  const f = document.getElementById('webPreview');
  if (f) f.style.width = `min(100%, ${w}px)`;
  document.querySelectorAll('[data-action="web-width"]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === w)));
}


export async function onAction(act, el) {
  const s = S();
  const L = s.platforms.lineOA;
  switch (act) {
    case 'line-count': L.count = +el.dataset.v; commit(); return true;
    case 'line-pages': L.pages = +el.dataset.v; if (L.pages === 1) L.activePage = 0; commit(); return true;
    case 'line-page': L.activePage = +el.dataset.v; commit(); return true;
    case 'entries-resync': case 'entries-reset':
      if (act === 'entries-reset' && L.entriesCustom && !confirm('依服務順序重新產生入口？你手動修改的入口名稱、說明與連結會被取代。')) return true;
      L.entriesCustom = false; L.entries = entriesFromServices(s); commit(); toast('已依服務順序更新入口'); return true;
    case 'entries-keep': s.answers.services = L.entries.slice(0, 8).map((e) => e.label).filter(Boolean); commit(); return true;
    case 'reset-text': delete s.platforms[el.dataset.p].overrides[el.dataset.k]; commit(); toast('已恢復自動產生'); return true;
    case 'web-width': setWebWidth(+el.dataset.v); return true;
    case 'entry-type': {
      const e = L.entries[+el.dataset.i];
      e.type = el.dataset.v;
      L.entriesCustom = true;
      commit();
      return true;
    }
    case 'entry-reply-reset': L.entries[+el.dataset.i].reply = ''; commit(); toast('已恢復自動產生'); return true;
    case 'copy-form-script': copyText(formScript(s, derive(s))); return true;
    case 'copy-form-manual': copyText(formManual(s, derive(s))); return true;
    case 'copy-kw': copyText(replyList(s, derive(s))[+el.dataset.i].keyword); return true;
    case 'copy-reply': copyText(replyList(s, derive(s))[+el.dataset.i].reply); return true;
    case 'apply-forms': {
      const text = document.getElementById('formResult')?.value || '';
      const r = parseFormResult(text, L);
      if (!r) { toast('找不到 BRAND-STUDIO-RESULT，請複製完整的執行記錄'); return true; }
      if (!r.matched.length && !r.form) { toast('沒有找到可用的表單網址，請確認貼上的是完整執行記錄'); return true; }
      L.forms = { form: r.form || L.forms.form, edit: r.edit || L.forms.edit, sheet: r.sheet || L.forms.sheet };
      // 沒有對應預填網址的表單入口，使用表單主網址
      if (r.form) for (const e of formEntries(L)) if (!e.url) { e.url = r.form; r.matched.push(e.label); }
      L.entriesCustom = true;
      commit();
      toast(`已填入 ${r.matched.length} 個入口的表單網址${r.unmatched.length ? `；${r.unmatched.length} 個名稱對不上，請手動貼上` : ''}`);
      return true;
    }
    case 'goto-q':
      s.meta.qIndex = Math.max(0, ['traits', 'audience', 'expertise', 'services', 'tone', 'style', 'palette', 'photo', 'avoid', 'naming', 'name', 'display', 'contact'].indexOf(el.dataset.q));
      save();
      return false;
    case 'dl-asset': {
      const a = assetsFor(el.dataset.p, s).find((x) => x.id === el.dataset.a);
      busy(el, async () => {
        const D = await prepare(s);
        const { blob, ext } = await assetBlob(a, D);
        download(`${a.file || `${el.dataset.p}-${a.id}`}.${ext}`, blob);
      });
      return true;
    }
    case 'dl-zip':
      busy(el, async () => download(`${el.dataset.p.toLowerCase()}-assets-${today()}.zip`, await platformZip(s, el.dataset.p)));
      return true;
    case 'dl-text': download(`${el.dataset.p.toLowerCase()}-copy.txt`, textsTxt(s, derive(s), el.dataset.p), 'text/plain;charset=utf-8'); return true;
    case 'dl-config': download('line-richmenu-config.json', JSON.stringify(richMenuConfig(L, derive(s).titleName), null, 2), 'application/json'); return true;
    case 'dl-html': {
      const D = derive(s);
      download('index.html', websiteHTML(s, D), 'text/html;charset=utf-8');
      return true;
    }
    case 'prompt-copy': { const t = document.getElementById('promptOut'); copyText(t.value, t); return true; }
    case 'prompt-dl': download(`${el.dataset.p.toLowerCase()}-prompt.txt`, document.getElementById('promptOut').value, 'text/plain;charset=utf-8'); return true;
    case 'prompt-regen': Object.assign(s.platforms[el.dataset.p].prompt, { draft: '', basis: '' }); commit(); toast('已重新生成提示詞'); return true;
    case 'prompt-keep': { const pr = s.platforms[el.dataset.p].prompt; pr.basis = hash(buildPrompt(s, derive(s), el.dataset.p, pr.extra)); commit(); return true; }
    default: return false;
  }
}

async function busy(btn, fn) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = '準備中…';
  try {
    await fn();
    toast('已開始下載');
  } catch (e) {
    console.error(e);
    toast('下載失敗，請再試一次');
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

export function onInput(el) {
  const s = S();
  if (el.dataset.text) {
    const [pid, key] = el.dataset.text.split(':');
    const D = derive(s);
    const f = TEXT_FIELDS[pid].find((x) => x.key === key);
    if (el.value === f.gen(D)) delete s.platforms[pid].overrides[key];
    else s.platforms[pid].overrides[key] = el.value.slice(0, 5000);
    save();
    const c = document.querySelector(`[data-count="${pid}:${key}"]`);
    const n = charLen(el.value);
    if (c) { c.textContent = `${n} / ${f.max} 字${n > f.max ? '・超過平台上限' : ''}`; c.classList.toggle('over', n > f.max); }
    return true;
  }
  if (el.dataset.entry) {
    const [j, field] = el.dataset.entry.split(':');
    const L = s.platforms.lineOA;
    if (field === 'reply') {
      const e = L.entries[+j];
      e.reply = el.value === generateReply(derive(s), { ...e, reply: '' }, s) ? '' : el.value.slice(0, 2000);
      L.entriesCustom = true;
      save();
      const c = document.querySelector(`[data-reply-count="${j}"]`);
      const n = charLen(el.value);
      if (c) { c.textContent = `${n} / ${LINE_REPLY_MAX} 字`; c.classList.toggle('over', n > LINE_REPLY_MAX); }
      return true;
    }
    L.entries[+j][field] = el.value.slice(0, field === 'label' ? 20 : field === 'url' ? 2000 : 1000);
    L.entriesCustom = true;
    save();
    const h = document.querySelector(`[data-entry-status="${j}"]`);
    if (h) h.textContent = entryStatus(L.entries[+j]).text;
    if (field === 'label') { const sum = el.closest('details')?.querySelector('summary b'); if (sum) sum.textContent = el.value || '未命名'; }
    return true;
  }
  if (el.dataset.pagename !== undefined) {
    s.platforms.lineOA.pageNames[+el.dataset.pagename] = el.value.slice(0, 12);
    save();
    return true;
  }
  if (el.dataset.promptExtra) {
    const pr = s.platforms[el.dataset.promptExtra].prompt;
    pr.extra = el.value.slice(0, 3000);
    save();
    if (!pr.draft) {
      const out = document.getElementById('promptOut');
      if (out) out.value = buildPrompt(s, derive(s), el.dataset.promptExtra, pr.extra);
    }
    return true;
  }
  if (el.dataset.promptDraft) {
    const pid = el.dataset.promptDraft;
    const pr = s.platforms[pid].prompt;
    const gen = buildPrompt(s, derive(s), pid, pr.extra);
    if (el.value === gen) { pr.draft = ''; pr.basis = ''; } else { pr.draft = el.value.slice(0, 40000); pr.basis = hash(gen); }
    save();
    return true;
  }
  if (el.dataset.urlField) {
    const [pid, field] = el.dataset.urlField.split(':');
    s.platforms[pid][field] = el.value.trim().slice(0, 300);
    save();
    return true;
  }
  return false;
}

export function onChange(el) {
  if (el.dataset.check) {
    const [pid, id] = el.dataset.check.split(':');
    S().platforms[pid].checklist[id] = el.checked;
    commit();
    return true;
  }
  return false;
}

/** 點擊 LINE 選單預覽：切頁區切頁、服務格顯示功能 */
export function onCanvasClick(cv, ev) {
  if (cv.id !== 'rmPreview') return false;
  const L = S().platforms.lineOA;
  const r = cv.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * RM_W;
  const y = ((ev.clientY - r.top) / r.height) * RM_H;
  const lay = layout(L, L.activePage);
  const tab = lay.tabs.find((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h);
  if (tab) { L.activePage = tab.page; commit(); toast(`已切換到「${tab.name}」`); return true; }
  const cell = lay.cells.find((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
  if (cell) {
    const st = entryStatus(cell.entry);
    const e = cell.entry;
    const dlg = document.getElementById('detail');
    dlg.querySelector('h2').textContent = `${e.label || '未命名入口'}（${TYPE_NAME[e.type]}）`;
    const desc = dlg.querySelector('[data-d="desc"]');
    desc.classList.add('pre');
    desc.textContent = e.type === 'reply' || e.type === 'chat' ? `客人會收到：\n${replyValue(derive(S()), e, S())}` : e.description;
    dlg.querySelector('[data-d="status"]').textContent = st.text;
    const a = dlg.querySelector('a');
    a.hidden = st.kind !== 'link';
    a.href = safeURL(cell.entry.url) || '#';
    dlg.showModal();
  }
  return true;
}

