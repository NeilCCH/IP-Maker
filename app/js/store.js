// 全域狀態、儲存與重新繪製
import { load, persist } from './model.js';

const loaded = load();
export const store = { state: loaded.state, migrated: loaded.migrated };

let renderFn = () => {};
export const setRenderer = (f) => { renderFn = f; };

export function save() {
  const ok = persist(store.state);
  const el = document.getElementById('saveStatus');
  if (el) {
    el.textContent = ok ? '已自動儲存於此裝置' : '儲存失敗：空間不足，請到「進階工具」匯出備份';
    el.dataset.state = ok ? 'ok' : 'err';
  }
  return ok;
}

export function commit(rerender = true) {
  save();
  if (rerender) renderFn();
}

export function replaceState(s) {
  store.state = s;
  commit();
}
