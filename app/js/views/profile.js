// 第一步：說說你自己——一次一題、清楚標示單／多選、常駐自由回答、自動保存
import { QUESTIONS, selectionLabel, Q_BY_ID } from '../data/questions.js';
import { PALETTES, AUTO_PALETTE, HUE_NAMES } from '../data/palettes.js';
import { detectConflicts, parseReport, nameProposals, sloganProposals, derive, positioningOf } from '../brand.js';
import { syncEntries } from '../model.js';
import { store, commit, save } from '../store.js';
import { esc, toast, debounce } from '../util.js';
import { welcomeCard, loadImage } from '../draw.js';
import { icon } from './common.js';

const S = () => store.state;
const answers = (id) => S().answers[id];

function isAnswered(q) {
  const s = S();
  if (q.type === 'name') return !!s.identity.brandName.trim();
  if (q.type === 'contact') return Object.values(s.identity.contact).some((v) => v.trim());
  return s.answers[q.id]?.length > 0 || !!(s.freeform[q.id] || '').trim();
}

function optionButtons(q) {
  const a = answers(q.id);
  return `<div class="opts">${q.options
    .map((o) => {
      const on = a.includes(o);
      const ex = q.examples?.[o];
      return `<button type="button" class="opt" data-action="opt" data-v="${esc(o)}" aria-pressed="${on}">${on ? icon('shield', 'ic tick') : ''}<span>${esc(o)}</span>${ex ? `<small>${esc(ex)}</small>` : ''}</button>`;
    })
    .join('')}</div>`;
}

function orderBlock(q) {
  const a = answers(q.id);
  const custom = a.filter((v) => !q.options.includes(v));
  return `<div class="opts order">${[...q.options, ...custom]
    .map((o) => {
      const i = a.indexOf(o);
      return `<button type="button" class="opt" data-action="opt" data-v="${esc(o)}" aria-pressed="${i >= 0}">${i >= 0 ? `<span class="num">${i + 1}</span>` : ''}<span>${esc(o)}</span></button>`;
    })
    .join('')}</div>
  <div class="inline-add"><label class="field grow"><span>新增自訂服務（最多 8 個字）</span><input id="svcCustom" maxlength="8" placeholder="例如：稅務講座"></label><button type="button" class="btn" data-action="svc-add">加入</button></div>
  ${a.length ? `<ol class="order-list" aria-label="目前排列順序">${a.map((v, i) => `<li><span class="num">${i + 1}</span><span class="grow">${esc(v)}</span><button type="button" class="icon-btn" data-action="svc-move" data-i="${i}" data-d="-1" aria-label="${esc(v)} 往前" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="icon-btn" data-action="svc-move" data-i="${i}" data-d="1" aria-label="${esc(v)} 往後" ${i === a.length - 1 ? 'disabled' : ''}>↓</button></li>`).join('')}</ol>` : ''}`;
}

function paletteBlock() {
  const D = derive(S());
  const sel = answers('palette')[0];
  const card = (p) => {
    const bad = p.hues ? p.hues.filter((h) => D.avoidHues.has(h)) : [];
    const on = sel === p.id;
    return `<button type="button" class="pal" data-action="pal" data-v="${p.id}" aria-pressed="${on}">
      <span class="sw">${p.primary ? [p.primary, p.accent, p.bg].map((c) => `<i style="background:${c}"></i>`).join('') : '<i class="auto"></i>'}</span>
      <b>${esc(p.name)}</b><small>${esc(p.traits)}</small>
      ${bad.length ? `<em class="warn">與你的禁忌衝突：${bad.map((h) => HUE_NAMES[h]).join('、')}</em>` : ''}
      ${on ? '<span class="sel">已選</span>' : ''}</button>`;
  };
  const autoNote = !sel || sel === 'auto' ? `<p class="hint">目前系統建議：<b>${esc(D.palette.name)}</b></p>` : '';
  return `<div class="pals">${PALETTES.map(card).join('')}${card(AUTO_PALETTE)}</div>${autoNote}`;
}

function photoBlock(q) {
  const s = S();
  return `${optionButtons(q)}
  <div class="photo-row">
    ${s.photo ? `<img class="photo-thumb" src="${s.photo}" alt="已上傳的照片">` : `<div class="photo-thumb empty">${icon('person')}</div>`}
    <div class="grow">
      <label class="btn"><input id="photoFile" type="file" accept="image/png,image/jpeg,image/webp" hidden>${s.photo ? '換一張照片' : '上傳照片'}</label>
      ${s.photo ? '<button type="button" class="btn ghost" data-action="photo-remove">移除照片</button>' : ''}
      <p class="hint">建議正面、光線清楚的半身照。會自動縮小，只存在這台裝置。</p>
    </div>
  </div>`;
}

function nameBlock() {
  const s = S();
  const id = s.identity;
  return `<label class="field"><span>品牌名稱</span><input data-id-field="brandName" maxlength="30" value="${esc(id.brandName)}" placeholder="輸入既有名稱，或從下方提案選一個" autocomplete="off"></label>
  <div class="proposal-row"><span class="label">名稱提案</span>${nameProposals(s).map((n) => `<button type="button" class="chip" data-action="name-pick" data-v="${esc(n)}" aria-pressed="${id.brandName === n}">${esc(n)}</button>`).join('')}<button type="button" class="chip ghost" data-action="name-more">換一批</button></div>
  <label class="field"><span>品牌標語（選填）</span><input data-id-field="slogan" maxlength="30" value="${esc(id.slogan)}" placeholder="一句話說明你帶給客戶什麼"></label>
  <div class="proposal-row"><span class="label">標語提案</span>${sloganProposals(s).map((n) => `<button type="button" class="chip" data-action="slogan-pick" data-v="${esc(n)}" aria-pressed="${id.slogan === n}">${esc(n)}</button>`).join('')}</div>
  <label class="field"><span>定位文字（選填，留白則依專長自動產生）</span><input data-id-field="positioning" maxlength="30" value="${esc(id.positioning)}" placeholder="${esc(positioningOf({ ...s, identity: { ...id, positioning: '' } }))}"></label>`;
}

function displayBlock(q) {
  const id = S().identity;
  return `${optionButtons(q)}
  <div class="grid2">
    <label class="field"><span>你的姓名</span><input data-id-field="personName" maxlength="30" value="${esc(id.personName)}" autocomplete="name" placeholder="例如：王小明"></label>
    <label class="field"><span>職稱（選填）</span><input data-id-field="jobTitle" maxlength="40" value="${esc(id.jobTitle)}" placeholder="例如：資深保險規劃顧問"></label>
  </div>
  <p class="hint">目前呈現：<b data-live="displayName">${esc(derive(S()).displayName)}</b></p>`;
}

function contactBlock() {
  const c = S().identity.contact;
  const f = (k, label, type, ph, ac) => `<label class="field"><span>${label}</span><input data-contact="${k}" type="${type}" value="${esc(c[k])}" placeholder="${ph}" ${ac ? `autocomplete="${ac}"` : ''} inputmode="${type === 'tel' ? 'tel' : type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}"></label>`;
  return `<div class="grid2">${f('line', 'LINE 官方帳號網址', 'url', 'https://lin.ee/…', '')}${f('phone', '電話', 'tel', '0912-345-678', 'tel')}${f('email', 'Email', 'email', 'name@example.com', 'email')}${f('area', '服務地區', 'text', '例如：台北、新北', '')}</div>`;
}

function conflictBlock(qid) {
  const list = detectConflicts(S()).filter((c) => c.qid === qid);
  if (!list.length) return '';
  return list
    .map((c) => {
      const r = S().resolutions[c.id];
      return `<div class="conflict" role="status"><p>${icon('question')} ${esc(c.message)} 請選擇要以哪一個為準：</p>
      <div class="row"><button type="button" class="chip" data-action="resolve" data-id="${c.id}" data-v="option" aria-pressed="${r === 'option'}">${esc(c.optionLabel)}</button><button type="button" class="chip" data-action="resolve" data-id="${c.id}" data-v="text" aria-pressed="${r === 'text'}">${esc(c.textLabel)}</button></div></div>`;
    })
    .join('');
}

function parseBlock(qid) {
  const r = parseReport(S(), qid);
  if (!r) return '';
  return `<p class="parse">${r.applied.length ? `<span class="ok">已轉成設定：${r.applied.map(esc).join('；')}</span>` : ''}<span>原文已保存，會帶入品牌資料與提示詞。${r.applied.length ? '' : '這段文字無法自動轉成視覺設定，需要時可在後續步驟手動調整。'}</span></p>`;
}

export function render(root) {
  const s = S();
  const i = s.meta.qIndex;
  const q = QUESTIONS[i];
  const body =
    q.type === 'palette' ? paletteBlock()
    : q.type === 'order' ? orderBlock(q)
    : q.type === 'photo' ? photoBlock(q)
    : q.type === 'name' ? nameBlock()
    : q.type === 'display' ? displayBlock(q)
    : q.type === 'contact' ? contactBlock()
    : optionButtons(q);
  const done = QUESTIONS.filter(isAnswered).length;
  root.innerHTML = `
  <div class="page-head"><p class="eyebrow">第一步</p><h1 tabindex="-1">說說你自己</h1><p class="lead">一次一題。可以只點選項、選項加文字，或不選直接打字。每一題都會自動保存，隨時可以回來改。</p></div>
  <div class="q-layout">
    <section class="card q-card" aria-labelledby="qTitle">
      <div class="q-progress"><span>第 ${i + 1} / ${QUESTIONS.length} 題・已回答 ${done} 題</span><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${i + 1}"><i style="width:${((i + 1) / QUESTIONS.length) * 100}%"></i></div></div>
      <p class="q-short">${esc(q.short)}</p>
      <h2 id="qTitle">${esc(q.title)}</h2>
      <p class="q-badge">${selectionLabel(q)}</p>
      ${q.hint ? `<p class="hint">${esc(q.hint)}</p>` : ''}
      ${body}
      ${conflictBlock(q.id)}
      <label class="field freeform"><span>自行補充／其他想法（選填，可不選上面的選項直接寫）</span><textarea data-ff="${q.id}" rows="3" maxlength="3000" placeholder="寫下你的想法、喜好，或希望避免的地方…">${esc(s.freeform[q.id])}</textarea></label>
      <div id="parseBox">${parseBlock(q.id)}</div>
      <div class="q-nav">
        <button type="button" class="btn ghost" data-action="q-prev" ${i === 0 ? 'disabled' : ''}>← 上一題</button>
        <button type="button" class="btn primary" data-action="q-next">${i === QUESTIONS.length - 1 ? '完成，選喜歡的樣子 →' : '下一題 →'}</button>
      </div>
    </section>
    <aside class="q-side">
      <div class="card mini-preview"><p class="label">即時預覽（目前風格）</p><canvas id="miniPreview" width="1040" height="1040" role="img" aria-label="品牌主視覺即時預覽"></canvas><p class="hint">這是 LINE 歡迎圖卡的樣子，下一步可比較三種風格。</p></div>
      <details class="card q-list" ${matchMedia('(min-width: 960px)').matches ? 'open' : ''}><summary>全部題目（點選可跳題）</summary><ol>${QUESTIONS.map((x, j) => `<li><button type="button" data-action="q-jump" data-i="${j}" aria-current="${j === i ? 'step' : 'false'}">${isAnswered(x) ? icon('shield', 'ic sm ok') : '<span class="dot"></span>'}${esc(x.short)}</button></li>`).join('')}</ol></details>
    </aside>
  </div>`;
  paintMini();
}

const paintMini = debounce(async () => {
  const cv = document.getElementById('miniPreview');
  if (!cv) return;
  const D = derive(S());
  D.photoImg = D.photoMode !== 'none' ? await loadImage(D.photo) : null;
  welcomeCard(cv.getContext('2d'), cv.width, cv.height, D);
}, 120);

function toggle(q, v) {
  const s = S();
  let a = s.answers[q.id];
  const exclusive = ['不限定', '沒有特別限制'];
  if (a.includes(v)) a = a.filter((x) => x !== v);
  else if (q.type === 'single' || q.type === 'photo' || q.type === 'display') a = [v];
  else {
    if (exclusive.includes(v)) a = [];
    a = a.filter((x) => !exclusive.includes(x));
    if (a.length >= q.max) {
      toast(`這題最多選 ${q.max} 項，可以先取消一項，或寫在下方補充欄`);
      return false;
    }
    a = [...a, v];
  }
  s.answers[q.id] = a;
  if (q.id === 'services') syncEntries(s);
  return true;
}

export function onAction(act, el) {
  const s = S();
  const q = QUESTIONS[s.meta.qIndex];
  switch (act) {
    case 'opt': if (toggle(q, el.dataset.v)) commit(); break;
    case 'pal': s.answers.palette = s.answers.palette[0] === el.dataset.v ? [] : [el.dataset.v]; commit(); break;
    case 'svc-add': {
      const inp = document.getElementById('svcCustom');
      const v = inp.value.trim().slice(0, 8);
      if (!v) return toast('請先輸入服務名稱');
      if (s.answers.services.includes(v)) return toast('這個服務已經在清單中');
      if (s.answers.services.length >= 16) return toast('最多 16 個服務入口');
      s.answers.services.push(v);
      syncEntries(s);
      commit();
      break;
    }
    case 'svc-move': {
      const a = s.answers.services, i = +el.dataset.i, j = i + +el.dataset.d;
      if (j < 0 || j >= a.length) return;
      [a[i], a[j]] = [a[j], a[i]];
      syncEntries(s);
      commit();
      break;
    }
    case 'photo-remove': s.photo = ''; commit(); toast('照片已移除'); break;
    case 'name-pick': s.identity.brandName = el.dataset.v; commit(); break;
    case 'name-more': s.namingSeed = (s.namingSeed + 1) % 9999; commit(); break;
    case 'slogan-pick': s.identity.slogan = el.dataset.v; commit(); break;
    case 'resolve': s.resolutions[el.dataset.id] = el.dataset.v; commit(); toast('已記錄你的決定'); break;
    case 'q-prev': if (s.meta.qIndex > 0) { s.meta.qIndex--; commit(); focusTitle(); } break;
    case 'q-next':
      s.meta.started = true;
      if (s.meta.qIndex < QUESTIONS.length - 1) { s.meta.qIndex++; commit(); focusTitle(); }
      else { save(); location.hash = '#/design'; }
      break;
    case 'q-jump': s.meta.qIndex = +el.dataset.i; commit(); focusTitle(); break;
    default: return false;
  }
  return true;
}

function focusTitle() {
  document.getElementById('qTitle')?.scrollIntoView({ block: 'nearest' });
  document.querySelector('.q-card')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

export function onInput(el) {
  const s = S();
  if (el.dataset.ff) {
    s.freeform[el.dataset.ff] = el.value.slice(0, 3000);
    save();
    const box = document.getElementById('parseBox');
    if (box) box.innerHTML = parseBlock(el.dataset.ff);
    refreshConflicts(el.dataset.ff);
    paintMini();
    return true;
  }
  if (el.dataset.idField) {
    const max = { brandName: 30, slogan: 30, positioning: 30, personName: 30, jobTitle: 40 }[el.dataset.idField];
    s.identity[el.dataset.idField] = el.value.slice(0, max);
    save();
    const live = document.querySelector('[data-live="displayName"]');
    if (live) live.textContent = derive(s).displayName;
    document.querySelectorAll('[data-action="name-pick"],[data-action="slogan-pick"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === s.identity[b.dataset.action === 'name-pick' ? 'brandName' : 'slogan'])));
    paintMini();
    return true;
  }
  if (el.dataset.contact) {
    s.identity.contact[el.dataset.contact] = el.value.slice(0, 200);
    save();
    return true;
  }
  return false;
}

let conflictSig = '';
function refreshConflicts(qid) {
  const sig = JSON.stringify(detectConflicts(S()).map((c) => c.id));
  if (sig !== conflictSig) {
    conflictSig = sig;
    const card = document.querySelector('.q-card');
    card?.querySelectorAll('.conflict').forEach((n) => n.remove());
    const ff = card?.querySelector('.freeform');
    if (ff) ff.insertAdjacentHTML('beforebegin', conflictBlock(qid));
  }
}

export async function onChange(el) {
  if (el.id !== 'photoFile') return false;
  const f = el.files[0];
  if (!f) return true;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) return toast('請上傳 PNG、JPEG 或 WebP 照片'), true;
  if (f.size > 15_000_000) return toast('照片太大，請選擇 15MB 以下的照片'), true;
  try {
    const bm = await createImageBitmap(f);
    const scale = Math.min(1, 1200 / Math.max(bm.width, bm.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bm.width * scale);
    c.height = Math.round(bm.height * scale);
    c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
    bm.close();
    S().photo = c.toDataURL('image/jpeg', 0.85);
    if (!S().answers.photo.length) S().answers.photo = ['交由系統建議'];
    commit();
    toast('照片已更新');
  } catch {
    toast('照片無法讀取，請換一張');
  }
  return true;
}

export { Q_BY_ID };
