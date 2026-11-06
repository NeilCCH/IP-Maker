// 登入與使用申請頁（公開頁面）：Google 登入 → 填寫申請 → 等待管理者審核
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = $('#gate');

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

async function post(path, body) {
  const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-brand-studio': '1' }, body: JSON.stringify(body || {}) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || '發生錯誤，請稍後再試');
  return data;
}

const head = (title, lead) => `<div class="page-head"><p class="eyebrow">個人品牌工作台</p><h1 tabindex="-1">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>`;

let clientId = '';

function renderLogin() {
  root.innerHTML = `${head('登入品牌實驗室', '這是團隊內部工具。第一次使用請先用 Google 帳號登入，填寫申請資料，經管理者審核通過後即可使用。')}
  <section class="card gate-card">
    <ol class="gate-steps"><li><b>用 Google 帳號登入</b><span>Gmail 帳號即可</span></li><li><b>填寫申請資料</b><span>單位、事業部、職稱、姓名</span></li><li><b>等待審核</b><span>管理者同意後就能使用</span></li></ol>
    <div id="gbtn" class="gbtn"></div>
    <p class="hint">登入只用來確認你的 email，不會讀取你的信件、雲端硬碟或聯絡人。</p>
  </section>`;
  const draw = () => {
    if (!window.google?.accounts?.id) return setTimeout(draw, 200);
    google.accounts.id.initialize({ client_id: clientId, callback: onCredential, ux_mode: 'popup', auto_select: false });
    google.accounts.id.renderButton($('#gbtn'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'zh-TW', width: 280 });
  };
  draw();
}

async function onCredential(resp) {
  try {
    show(await post('/api/login', { credential: resp.credential }));
  } catch (e) {
    toast(e.message);
  }
}

function renderApply(me, editing = false) {
  const p = me.profile || {};
  const f = (k, label, ph, ac) => `<label class="field"><span>${label} <em class="req">必填</em></span><input name="${k}" value="${esc(p[k])}" placeholder="${ph}" maxlength="${k === 'name' ? 30 : 40}" required ${ac ? `autocomplete="${ac}"` : ''}></label>`;
  root.innerHTML = `${head(editing ? '修改申請資料' : '填寫使用申請', '送出後由管理者審核，通過後就能開始使用。')}
  <form class="card gate-card" id="applyForm" novalidate>
    ${f('unit', '單位', '例如：台北通訊處')}
    ${f('division', '事業部', '例如：第一事業部')}
    ${f('title', '職稱', '例如：業務經理', 'organization-title')}
    ${f('name', '姓名', '例如：王小明', 'name')}
    <label class="field"><span>Email（登入帳號，無法修改）</span><input value="${esc(me.email)}" readonly aria-readonly="true"></label>
    <p class="error" id="formError" role="alert" hidden></p>
    <div class="actions-row"><button type="button" class="btn ghost" data-act="logout">換一個帳號</button><button type="submit" class="btn primary">送出申請</button></div>
    <p class="hint">這些資料只用於審核與團隊管理，只有管理者看得到。</p>
  </form>`;
  $('#applyForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = Object.fromEntries(new FormData(ev.target));
    const missing = Object.entries({ unit: '單位', division: '事業部', title: '職稱', name: '姓名' }).find(([k]) => !String(fd[k] || '').trim());
    const err = $('#formError');
    if (missing) {
      err.textContent = `請填寫「${missing[1]}」`;
      err.hidden = false;
      ev.target.querySelector(`[name="${missing[0]}"]`).focus();
      return;
    }
    try {
      show(await post('/api/apply', fd));
      toast('申請已送出');
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
}

function renderStatus(me) {
  const p = me.profile || {};
  const pending = me.status === 'pending';
  root.innerHTML = `${head(pending ? '申請審核中' : '申請未通過', pending ? '管理者審核通過後就能使用。審核完成後，重新打開網站即可。' : '如有疑問，請聯絡管理者。也可以修改資料後重新送出申請。')}
  <section class="card gate-card">
    <p><span class="st ${pending ? 'st-todo' : 'st-err'}">${pending ? '待審核' : '未通過'}</span></p>
    <dl class="kv"><dt>單位</dt><dd>${esc(p.unit)}</dd><dt>事業部</dt><dd>${esc(p.division)}</dd><dt>職稱</dt><dd>${esc(p.title)}</dd><dt>姓名</dt><dd>${esc(p.name)}</dd><dt>Email</dt><dd>${esc(me.email)}</dd></dl>
    <div class="actions-row"><button type="button" class="btn ghost" data-act="edit">修改申請資料</button><button type="button" class="btn primary" data-act="refresh">重新檢查審核狀態</button></div>
    <button type="button" class="link-btn" data-act="logout">登出</button>
  </section>`;
}

let current = null;
function show(me) {
  current = me;
  if (me.status === 'approved') return location.replace('/');
  if (me.status === 'anonymous') return renderLogin();
  if (me.status === 'none') return renderApply(me);
  return renderStatus(me);
}

root.addEventListener('click', async (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'logout') {
    await post('/api/logout').catch(() => {});
    window.google?.accounts?.id?.disableAutoSelect?.();
    show({ status: 'anonymous' });
  }
  if (act === 'edit') renderApply(current, true);
  if (act === 'refresh') {
    const me = await (await fetch('/api/me', { cache: 'no-store' })).json();
    show(me);
    if (me.status === 'pending') toast('仍在審核中');
  }
});

(async () => {
  try {
    const cfg = await (await fetch('/api/config', { cache: 'no-store' })).json();
    if (!cfg.authEnabled) return location.replace('/'); // 尚未啟用門禁：直接使用
    clientId = cfg.googleClientId;
    show(await (await fetch('/api/me', { cache: 'no-store' })).json());
  } catch {
    root.innerHTML = `${head('暫時無法連線', '請確認網路連線後重新整理。')}`;
  }
})();
