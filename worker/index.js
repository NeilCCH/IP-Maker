// 品牌工作室 後台：Google 登入、使用申請、管理者審核、APP 門禁
// 部署：Cloudflare Workers（wrangler.jsonc）。申請資料存在 Durable Object（SQLite），不需另外建立資料庫。
// 在 GOOGLE_CLIENT_ID 尚未設定前，門禁不啟用（維持公開使用），避免網站被整個鎖住。
import { DurableObject } from 'cloudflare:workers';
import { verifyIdToken } from './jwt.js';
import { lineApi, lineWebhook } from './line.js';

const SESSION_DAYS = 30;
const COOKIE = '__Host-bs_session';
const PUBLIC_PREFIXES = ['/gate/', '/css/', '/icons/', '/api/'];
const PUBLIC_FILES = ['/manifest.webmanifest', '/favicon.ico'];
const FIELD_LIMITS = { unit: 40, division: 40, title: 40, name: 30 };

// ---------- 工具 ----------
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  for (const part of c.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return '';
}

const adminEmails = (env) => String(env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const authEnabled = (env) => !!String(env.GOOGLE_CLIENT_ID || '').trim();

// ---------- 資料儲存（單一 Durable Object，SQLite） ----------
export class Registry extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY, google_name TEXT, unit TEXT, division TEXT, title TEXT, name TEXT,
      status TEXT NOT NULL DEFAULT 'none', applied_at TEXT, decided_at TEXT, decided_by TEXT, created_at TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS line_accounts (
      email TEXT PRIMARY KEY, hook TEXT UNIQUE, bot_user_id TEXT, basic_id TEXT, display_name TEXT,
      token_enc TEXT, secret_enc TEXT, webhook_ok INTEGER DEFAULT 0, replies TEXT, greeting TEXT,
      menus_current TEXT, menus_prev TEXT, prev_default TEXT, connected_at TEXT, applied_at TEXT)`);
  }

  user(email) {
    return this.sql.exec('SELECT * FROM users WHERE email = ?', email).toArray()[0] || null;
  }

  login(email, googleName, isAdmin) {
    const now = new Date().toISOString();
    const u = this.user(email);
    if (!u) this.sql.exec('INSERT INTO users (email, google_name, status, created_at) VALUES (?, ?, ?, ?)', email, googleName, isAdmin ? 'approved' : 'none', now);
    else {
      this.sql.exec('UPDATE users SET google_name = ? WHERE email = ?', googleName, email);
      if (isAdmin && u.status !== 'approved') this.sql.exec("UPDATE users SET status = 'approved', decided_at = ?, decided_by = 'system:admin' WHERE email = ?", now, email);
    }
    return this.user(email);
  }

  createSession(hash, email, expires) {
    this.sql.exec('DELETE FROM sessions WHERE expires < ?', Date.now());
    this.sql.exec('INSERT INTO sessions (hash, email, expires) VALUES (?, ?, ?)', hash, email, expires);
  }

  session(hash) {
    const s = this.sql.exec('SELECT * FROM sessions WHERE hash = ? AND expires > ?', hash, Date.now()).toArray()[0];
    return s ? this.user(s.email) : null;
  }

  logout(hash) {
    this.sql.exec('DELETE FROM sessions WHERE hash = ?', hash);
  }

  apply(email, f) {
    const u = this.user(email);
    if (!u) return null;
    // 已通過的人修改資料不需重審；其他狀態送出後一律變為待審核
    const status = u.status === 'approved' ? 'approved' : 'pending';
    this.sql.exec('UPDATE users SET unit = ?, division = ?, title = ?, name = ?, status = ?, applied_at = ? WHERE email = ?', f.unit, f.division, f.title, f.name, status, new Date().toISOString(), email);
    return this.user(email);
  }

  list() {
    return this.sql.exec("SELECT email, google_name, unit, division, title, name, status, applied_at, decided_at, decided_by FROM users ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'none' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END, applied_at DESC").toArray();
  }

  // ----- LINE 官方帳號連接資料（金鑰為加密後的字串） -----
  lineGet(email) { return this.sql.exec('SELECT * FROM line_accounts WHERE email = ?', email).toArray()[0] || null; }
  lineByHook(hook) { return this.sql.exec('SELECT * FROM line_accounts WHERE hook = ?', hook).toArray()[0] || null; }
  lineByBot(id) { return this.sql.exec('SELECT * FROM line_accounts WHERE bot_user_id = ?', id).toArray()[0] || null; }
  lineSave(email, fields) {
    const COLS = ['hook', 'bot_user_id', 'basic_id', 'display_name', 'token_enc', 'secret_enc', 'webhook_ok', 'replies', 'greeting', 'menus_current', 'menus_prev', 'prev_default', 'connected_at', 'applied_at'];
    if (!this.lineGet(email)) this.sql.exec('INSERT INTO line_accounts (email) VALUES (?)', email);
    for (const [k, v] of Object.entries(fields)) if (COLS.includes(k)) this.sql.exec(`UPDATE line_accounts SET ${k} = ? WHERE email = ?`, v, email);
  }
  lineDelete(email) { this.sql.exec('DELETE FROM line_accounts WHERE email = ?', email); }

  decide(email, status, by) {
    if (!this.user(email)) return null;
    this.sql.exec('UPDATE users SET status = ?, decided_at = ?, decided_by = ? WHERE email = ?', status, new Date().toISOString(), by, email);
    if (status !== 'approved') { this.sql.exec('DELETE FROM sessions WHERE email = ?', email); this.lineDelete(email); } // 撤銷時立即登出，並刪除保存的 LINE 金鑰
    return this.user(email);
  }
}

const registry = (env) => env.REGISTRY.get(env.REGISTRY.idFromName('main'));

const publicUser = (u, env) => (u ? {
  email: u.email, status: u.status, isAdmin: adminEmails(env).includes(u.email),
  profile: { unit: u.unit || '', division: u.division || '', title: u.title || '', name: u.name || u.google_name || '' },
} : null);

async function currentUser(req, env) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  return registry(env).session(await sha256Hex(token));
}

/** 寫入類 API：只接受同網域、帶指定標頭的請求（防止跨站偽造） */
function sameOrigin(req) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  return req.headers.get('x-brand-studio') === '1' && (!origin || origin === url.origin);
}

function cleanFields(body) {
  const out = {};
  for (const [k, max] of Object.entries(FIELD_LIMITS)) {
    const v = String(body?.[k] ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
    if (!v) return { error: `請填寫${{ unit: '單位', division: '事業部', title: '職稱', name: '姓名' }[k]}` };
    out[k] = v;
  }
  return { fields: out };
}

// ---------- API ----------
async function api(req, env, url) {
  const path = url.pathname;
  if (path === '/api/config') return json({ authEnabled: authEnabled(env), googleClientId: authEnabled(env) ? env.GOOGLE_CLIENT_ID : '' });
  // LINE Webhook：公開端點，由 LINE 的簽章驗證來源
  if (path.startsWith('/api/line/webhook/')) return req.method === 'POST' ? lineWebhook(req, env, path.slice('/api/line/webhook/'.length), registry(env)) : json({ error: 'not found' }, 404);
  if (!authEnabled(env)) return json({ authEnabled: false, status: 'open' });

  if (path === '/api/me') {
    const u = await currentUser(req, env);
    return json(u ? publicUser(u, env) : { status: 'anonymous' });
  }
  if (req.method !== 'POST' || !sameOrigin(req)) return json({ error: '不允許的請求' }, 403);
  const body = await req.json().catch(() => ({}));

  if (path === '/api/login') {
    let who;
    try {
      if (env.ALLOW_TEST_LOGIN === 'yes' && String(body.credential).startsWith('test:')) who = { email: String(body.credential).slice(5).toLowerCase(), name: '測試' };
      else who = await verifyIdToken(body.credential, env.GOOGLE_CLIENT_ID);
    } catch {
      return json({ error: 'Google 登入驗證失敗，請重新登入' }, 401);
    }
    const isAdmin = adminEmails(env).includes(who.email);
    const u = await registry(env).login(who.email, who.name, isAdmin);
    const token = randomToken();
    await registry(env).createSession(await sha256Hex(token), who.email, Date.now() + SESSION_DAYS * 86400000);
    return json(publicUser(u, env), 200, { 'set-cookie': `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}` });
  }
  if (path === '/api/logout') {
    const token = readCookie(req, COOKIE);
    if (token) await registry(env).logout(await sha256Hex(token));
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0` });
  }

  const me = await currentUser(req, env);
  if (!me) return json({ error: '請先登入' }, 401);

  if (path === '/api/apply') {
    const { fields, error } = cleanFields(body);
    if (error) return json({ error }, 400);
    return json(publicUser(await registry(env).apply(me.email, fields), env));
  }

  if (path.startsWith('/api/line/')) {
    if (me.status !== 'approved') return json({ error: '需要通過審核' }, 403);
    const r = await lineApi(path, body, me, env, registry(env), url.origin);
    return json(r.body, r.status);
  }

  if (!adminEmails(env).includes(me.email)) return json({ error: '只有管理者可以使用' }, 403);
  if (path === '/api/admin/users') return json({ users: (await registry(env).list()).map((u) => ({ ...u, isAdmin: adminEmails(env).includes(u.email) })) });
  if (path === '/api/admin/decide') {
    const status = ['approved', 'rejected', 'pending'].includes(body.status) ? body.status : null;
    const email = String(body.email || '').toLowerCase();
    if (!status || !email) return json({ error: '資料不完整' }, 400);
    if (adminEmails(env).includes(email) && status !== 'approved') return json({ error: '不能停用管理者' }, 400);
    const u = await registry(env).decide(email, status, me.email);
    return u ? json({ ok: true }) : json({ error: '找不到這位使用者' }, 404);
  }
  return json({ error: 'not found' }, 404);
}

// ---------- 門禁 ----------
function isPublic(path) {
  return PUBLIC_FILES.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p)) || path === '/gate';
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return api(req, env, url);
    if (!authEnabled(env) || isPublic(url.pathname)) return env.ASSETS.fetch(req);
    const u = await currentUser(req, env);
    if (u && u.status === 'approved') {
      const r = await env.ASSETS.fetch(req);
      const out = new Response(r.body, r);
      out.headers.set('cache-control', 'private, no-cache');
      return out;
    }
    const wantsPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
    if (wantsPage) return Response.redirect(`${url.origin}/gate/`, 302);
    return json({ error: '需要登入並通過審核' }, 401);
  },
};
