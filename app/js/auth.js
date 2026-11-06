// 帳號與權限（前端）：真正的門禁在伺服器（worker/index.js），這裡負責顯示登入者、登出與管理 API。
// 沒有後台（本機測試）或離線時，不阻擋使用。

let me = null;
export const currentUser = () => me;

async function post(path, body) {
  const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-brand-studio': '1' }, body: JSON.stringify(body || {}) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || '發生錯誤，請稍後再試');
  return data;
}

async function clearAppCache() {
  try {
    if ('caches' in window) for (const k of await caches.keys()) await caches.delete(k);
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) || []) await r.unregister();
  } catch { /* 清不掉也不影響登出 */ }
}

/** 回傳登入者資料；未啟用門禁、離線或本機測試回傳 null */
export async function checkAccess() {
  try {
    const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    const data = await r.json();
    if (data.authEnabled === false || data.status === 'open') return null;
    if (data.status !== 'approved') {
      // 未登入、審核中或已被停用：清掉本機快取的 APP，回到申請頁
      await clearAppCache();
      location.replace('/gate/');
      return null;
    }
    me = data;
    return me;
  } catch {
    return null;
  }
}

export async function logout() {
  await post('/api/logout').catch(() => {});
  await clearAppCache();
  location.replace('/gate/');
}

export const adminUsers = () => post('/api/admin/users');
export const adminDecide = (email, status) => post('/api/admin/decide', { email, status });
