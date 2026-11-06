// 管理頁：審核使用申請（只有管理者可見；伺服器端也會再檢查權限）
import { currentUser, adminUsers, adminDecide } from '../auth.js';
import { esc, toast } from '../util.js';

const STATUS = { pending: ['待審核', 'st-todo'], approved: ['已通過', 'st-done'], rejected: ['未通過', 'st-err'], none: ['未填申請', 'st-none'] };
const FILTERS = [['pending', '待審核'], ['approved', '已通過'], ['rejected', '未通過'], ['all', '全部']];
let filter = 'pending';
let users = [];

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function list() {
  const shown = users.filter((u) => filter === 'all' || u.status === filter);
  if (!shown.length) return `<p class="hint">${filter === 'pending' ? '目前沒有待審核的申請。' : '沒有資料。'}</p>`;
  return `<ul class="user-list">${shown.map((u) => {
    const [label, cls] = STATUS[u.status] || STATUS.none;
    return `<li class="card"><div class="u-head"><b>${esc(u.name || u.google_name || '（未填姓名）')}</b><span class="st ${cls}">${label}</span></div>
      <dl class="kv"><dt>單位</dt><dd>${esc(u.unit || '—')}</dd><dt>事業部</dt><dd>${esc(u.division || '—')}</dd><dt>職稱</dt><dd>${esc(u.title || '—')}</dd><dt>Email</dt><dd>${esc(u.email)}</dd><dt>申請時間</dt><dd>${fmt(u.applied_at)}</dd>${u.decided_at ? `<dt>處理</dt><dd>${fmt(u.decided_at)}</dd>` : ''}</dl>
      <div class="row">${u.status !== 'approved' ? `<button type="button" class="btn primary sm" data-action="admin-decide" data-email="${esc(u.email)}" data-status="approved">同意使用</button>` : ''}
      ${u.status === 'pending' || u.status === 'none' ? `<button type="button" class="btn ghost sm" data-action="admin-decide" data-email="${esc(u.email)}" data-status="rejected">不同意</button>` : ''}
      ${u.status === 'approved' && !u.isAdmin ? `<button type="button" class="btn danger sm" data-action="admin-decide" data-email="${esc(u.email)}" data-status="rejected">停用帳號</button>` : ''}</div></li>`;
  }).join('')}</ul>`;
}

function paint(root) {
  const count = (s) => users.filter((u) => s === 'all' || u.status === s).length;
  const box = root.querySelector('#adminBody');
  if (!box) return;
  box.innerHTML = `<div class="row" role="tablist">${FILTERS.map(([id, label]) => `<button type="button" class="chip" role="tab" data-action="admin-filter" data-v="${id}" aria-pressed="${filter === id}" aria-selected="${filter === id}">${label}（${count(id)}）</button>`).join('')}</div>${list()}`;
}

async function load(root) {
  try {
    users = (await adminUsers()).users || [];
    paint(root);
  } catch (e) {
    root.querySelector('#adminBody').innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

export function render(root) {
  const me = currentUser();
  if (!me?.isAdmin) {
    root.innerHTML = '<div class="page-head"><h1 tabindex="-1">管理</h1><p class="lead">只有管理者可以使用這一頁。</p></div>';
    return;
  }
  root.innerHTML = `<div class="page-head"><p class="eyebrow">管理者</p><h1 tabindex="-1">使用申請審核</h1>
    <p class="lead">同仁用 Google 帳號登入並填寫申請後，會出現在「待審核」。按「同意使用」後，對方重新打開網站就能使用。</p></div>
    <div class="row"><button type="button" class="btn ghost sm" data-action="admin-reload">重新整理</button></div>
    <div id="adminBody"><p class="hint">載入中…</p></div>`;
  load(root);
}

export async function onAction(act, el) {
  const root = document.getElementById('main');
  if (act === 'admin-filter') { filter = el.dataset.v; paint(root); return true; }
  if (act === 'admin-reload') { load(root); return true; }
  if (act === 'admin-decide') {
    const s = el.dataset.status;
    if (s === 'rejected' && !confirm('確定不同意／停用這位使用者？對方會立即被登出。')) return true;
    el.disabled = true;
    try {
      await adminDecide(el.dataset.email, s);
      toast(s === 'approved' ? '已同意使用' : '已設為未通過');
      await load(root);
    } catch (e) {
      toast(e.message);
      el.disabled = false;
    }
    return true;
  }
  return false;
}
