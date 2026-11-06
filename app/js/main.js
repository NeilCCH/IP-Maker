// 入口：路由、事件委派、PWA 安裝與更新
import { store, setRenderer, save } from './store.js';
import { toast } from './util.js';
import { cloudBackup, notifyBackup, backupStatus } from './backup.js';
import * as home from './views/home.js';
import * as profile from './views/profile.js';
import * as design from './views/design.js';
import * as results from './views/results.js';
import * as advanced from './views/advanced.js';
import * as admin from './views/admin.js';
import { checkAccess, logout, adminUsers } from './auth.js';

const VIEWS = { '': home, profile, design, results, advanced, admin };
const STEP_OF = { profile: 1, design: 2, results: 3 };
const main = document.getElementById('main');

function parse() {
  const [, name = '', ...rest] = (location.hash || '#/').split('/');
  return { name: VIEWS[name] ? name : '', rest };
}

let lastRoute = '';
function render() {
  const { name, rest } = parse();
  const key = name + rest.join('/');
  const scrollY = window.scrollY;
  VIEWS[name].render(main, rest);
  // 步驟列
  document.querySelectorAll('.stepper a').forEach((a) => {
    const n = +a.dataset.step;
    a.setAttribute('aria-current', STEP_OF[name] === n ? 'step' : 'false');
  });
  document.querySelector('.adv-link')?.setAttribute('aria-current', name === 'advanced' ? 'page' : 'false');
  document.getElementById('adminLink')?.setAttribute('aria-current', name === 'admin' ? 'page' : 'false');
  updateCloudBtn();
  if (key !== lastRoute) {
    // 換頁：移到頂端並把焦點放在標題（螢幕閱讀器）
    window.scrollTo(0, 0);
    main.querySelector('h1')?.focus({ preventScroll: true });
    lastRoute = key;
  } else window.scrollTo(0, scrollY);
}
setRenderer(render);

const current = () => VIEWS[parse().name];

document.addEventListener('click', async (e) => {
  const cv = e.target.closest('canvas');
  if (cv && current().onCanvasClick?.(cv, e)) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const act = el.dataset.action;
  if (act === 'close-dialog') return el.closest('dialog').close();
  if (act === 'install') return install();
  if (act === 'cloud-backup') return backupNow(el);
  if (act === 'logout') return confirm('確定登出？這台裝置上的品牌資料會保留。') && logout();
  if (act === 'apply-update') return applyUpdate();
  const handled = await current().onAction?.(act, el, e);
  if (handled && el.tagName === 'A') e.preventDefault();
});

document.addEventListener('input', (e) => current().onInput?.(e.target, e));
document.addEventListener('change', (e) => current().onChange?.(e.target, e));
window.addEventListener('hashchange', render);

// ---------- 備份到雲端 ----------
function updateCloudBtn() {
  const st = backupStatus(store.state);
  const btn = document.getElementById('cloudBtn');
  if (!btn) return;
  btn.querySelector('.dot').hidden = !st.due;
  btn.title = st.text;
  document.getElementById('cloudHint').textContent = st.text + (st.due ? '，建議現在備份' : '');
}

async function backupNow(btn) {
  btn.disabled = true;
  try {
    const result = await cloudBackup(store.state);
    if (result !== 'cancelled') {
      store.state.meta.lastBackupAt = new Date().toISOString();
      save();
      render();
    }
    notifyBackup(result);
  } catch {
    toast('備份失敗，請到「進階工具」用「匯出進度」');
  } finally {
    btn.disabled = false;
  }
}

// ---------- PWA ----------
let installEvent;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  document.getElementById('installBtn').hidden = false;
});
async function install() {
  if (!installEvent) return;
  await installEvent.prompt();
  installEvent = null;
  document.getElementById('installBtn').hidden = true;
}

let waitingWorker;
function showUpdate(w) {
  waitingWorker = w;
  document.getElementById('updateBar').hidden = false;
}
function applyUpdate() {
  save();
  waitingWorker?.postMessage('skipWaiting');
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w);
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

window.addEventListener('offline', () => toast('目前離線：仍可繼續編輯，資料會存在這台裝置'));

render();
save();

// 帳號：顯示登入者；管理者顯示「管理」與待審核數量
checkAccess().then(async (me) => {
  if (!me) return;
  document.getElementById('userName').textContent = me.profile?.name || me.email;
  document.getElementById('userChip').hidden = false;
  if (me.isAdmin) {
    document.getElementById('adminLink').hidden = false;
    try {
      const n = ((await adminUsers()).users || []).filter((u) => u.status === 'pending').length;
      const b = document.getElementById('adminBadge');
      b.textContent = n;
      b.hidden = !n;
    } catch { /* 取不到數量不影響使用 */ }
  }
  if (parse().name === 'admin') render();
});
if (store.migrated) toast('已從舊版展示版轉入你的進度');
