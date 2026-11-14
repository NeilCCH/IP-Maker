// LINE 官方帳號代設：連接（保存加密金鑰）、套用圖文選單、Webhook 自動回覆、回復、解除連接
// 端點依 LINE Messaging API 官方文件（2026-11 查核）：/v2/bot/info、/v2/bot/channel/webhook/endpoint、
// /v2/bot/richmenu*、/v2/bot/user/all/richmenu、/v2/bot/message/reply；Webhook 以 x-line-signature（HMAC-SHA256）驗證。
// 金鑰只存在後台（AES-GCM 加密），不回傳給前端。LINE_API_BASE／LINE_DATA_BASE 只供本機測試替換，正式環境不可設定。

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const lineEnabled = (env) => String(env.TOKEN_KEY || '').length >= 16;
const apiBase = (env) => env.LINE_API_BASE || 'https://api.line.me';
const dataBase = (env) => env.LINE_DATA_BASE || 'https://api-data.line.me';

async function aesKey(env) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(String(env.TOKEN_KEY)));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(env, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), enc.encode(text));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function unseal(env, sealed) {
  const [iv, ct] = String(sealed).split('.');
  return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(env), unb64(ct)));
}

function randomId(n = 24) {
  return b64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function lineFetch(env, token, method, path, { body, raw, type, data = false } = {}) {
  const r = await fetch((data ? dataBase(env) : apiBase(env)) + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}), ...(raw ? { 'content-type': type } : {}) },
    body: body ? JSON.stringify(body) : raw,
  });
  let out = null;
  try { out = await r.json(); } catch { /* 部分端點沒有內容 */ }
  return { ok: r.ok, status: r.status, data: out || {} };
}

const fail = (message, status = 400, extra = {}) => ({ status, body: { error: message, ...extra } });
const ok = (body) => ({ status: 200, body });

function publicStatus(env, row) {
  if (!lineEnabled(env)) return { enabled: false, connected: false };
  if (!row) return { enabled: true, connected: false };
  const replies = JSON.parse(row.replies || '[]');
  return {
    enabled: true, connected: true,
    displayName: row.display_name || '', basicId: row.basic_id || '',
    connectedAt: row.connected_at || '', appliedAt: row.applied_at || '',
    webhookOk: row.webhook_ok === 1, replyCount: replies.length, hasGreeting: !!row.greeting,
    canRollback: !!row.applied_at,
  };
}

// ---------- 輸入檢查 ----------
function cleanMenuBody(b, rel, pageCount) {
  if (!b || typeof b !== 'object' || b.size?.width !== 2500 || b.size?.height !== 1686) return null;
  if (!Array.isArray(b.areas) || !b.areas.length || b.areas.length > 20) return null;
  const areas = [];
  for (const a of b.areas) {
    const { x, y, width, height } = a?.bounds || {};
    if (![x, y, width, height].every((v) => Number.isInteger(v) && v >= 0) || x + width > 2500 || y + height > 1686) return null;
    const act = a.action || {};
    const label = String(act.label || '').slice(0, 20);
    let action;
    if (act.type === 'message') action = { type: 'message', label, text: String(act.text || '').slice(0, 300) };
    else if (act.type === 'uri' && /^https:\/\/[^\s]{1,990}$/.test(String(act.uri || ''))) action = { type: 'uri', label, uri: String(act.uri) };
    else if (act.type === 'richmenuswitch' && pageCount === 2 && /^bs-[a-z0-9]{1,12}-p[12]$/.test(String(act.richMenuAliasId || '')) && String(act.richMenuAliasId).startsWith(`bs-${rel}-`))
      action = { type: 'richmenuswitch', label, richMenuAliasId: act.richMenuAliasId, data: String(act.data || '').slice(0, 300) };
    else return null;
    if (action.type === 'message' && !action.text) return null;
    areas.push({ bounds: { x, y, width, height }, action });
  }
  return { size: { width: 2500, height: 1686 }, selected: true, name: String(b.name || 'brand').slice(0, 300), chatBarText: String(b.chatBarText || '我的服務').slice(0, 14), areas };
}

function cleanApply(body) {
  const rel = String(body?.rel || '');
  if (!/^[a-z0-9]{1,12}$/.test(rel)) return { error: '資料格式不正確（發佈代號）' };
  const pagesIn = Array.isArray(body.pages) ? body.pages : [];
  if (pagesIn.length < 1 || pagesIn.length > 2) return { error: '選單頁數不正確' };
  const pages = [];
  for (const p of pagesIn) {
    const menu = cleanMenuBody(p.body, rel, pagesIn.length);
    if (!menu) return { error: '選單設定格式不正確' };
    const mime = p.mime === 'image/jpeg' ? 'image/jpeg' : p.mime === 'image/png' ? 'image/png' : null;
    let image;
    try { image = unb64(String(p.image || '')); } catch { image = null; }
    if (!mime || !image || image.length < 100) return { error: '選單圖片格式不正確' };
    if (image.length > 1024 * 1024) return { error: '選單圖片超過 1MB' };
    pages.push({ menu, mime, image });
  }
  const replies = (Array.isArray(body.replies) ? body.replies : []).slice(0, 40)
    .map((r) => ({ keyword: String(r?.keyword || '').trim().slice(0, 300), reply: String(r?.reply || '').trim().slice(0, 2000) }))
    .filter((r) => r.keyword && r.reply);
  return { rel, pages, replies, greeting: String(body.greeting || '').trim().slice(0, 2000) };
}

// ---------- 套用圖文選單 ----------
async function applyMenus(env, token, { rel, pages }) {
  const created = { ids: [], aliases: [] };
  const cleanup = async () => {
    for (const a of created.aliases) await lineFetch(env, token, 'DELETE', `/v2/bot/richmenu/alias/${a}`).catch(() => {});
    for (const id of created.ids) await lineFetch(env, token, 'DELETE', `/v2/bot/richmenu/${id}`).catch(() => {});
  };
  const stop = async (stage, r) => { await cleanup(); return { error: `${stage}失敗（LINE 回應 ${r.status}${r.data?.message ? `：${r.data.message}` : ''}）。原本的選單沒有被更動。` }; };

  const prev = await lineFetch(env, token, 'GET', '/v2/bot/user/all/richmenu');
  const prevDefault = prev.ok ? String(prev.data.richMenuId || '') : '';
  for (const p of pages) {
    const v = await lineFetch(env, token, 'POST', '/v2/bot/richmenu/validate', { body: p.menu });
    if (!v.ok) return stop('檢查選單設定', v);
  }
  for (const p of pages) {
    const c = await lineFetch(env, token, 'POST', '/v2/bot/richmenu', { body: p.menu });
    if (!c.ok || !c.data.richMenuId) return stop('建立選單', c);
    created.ids.push(c.data.richMenuId);
    const u = await lineFetch(env, token, 'POST', `/v2/bot/richmenu/${c.data.richMenuId}/content`, { raw: p.image, type: p.mime, data: true });
    if (!u.ok) return stop('上傳選單圖片', u);
  }
  if (pages.length === 2)
    for (let i = 0; i < 2; i++) {
      const alias = `bs-${rel}-p${i + 1}`;
      const a = await lineFetch(env, token, 'POST', '/v2/bot/richmenu/alias', { body: { richMenuAliasId: alias, richMenuId: created.ids[i] } });
      if (!a.ok) return stop('建立切頁代號', a);
      created.aliases.push(alias);
    }
  const d = await lineFetch(env, token, 'POST', `/v2/bot/user/all/richmenu/${created.ids[0]}`);
  if (!d.ok) return stop('切換預設選單', d);
  return { created, prevDefault };
}

async function removeGeneration(env, token, gen) {
  for (const a of gen?.aliases || []) await lineFetch(env, token, 'DELETE', `/v2/bot/richmenu/alias/${a}`).catch(() => {});
  for (const id of gen?.ids || []) await lineFetch(env, token, 'DELETE', `/v2/bot/richmenu/${id}`).catch(() => {});
}

// ---------- 已登入使用者的 API ----------
export async function lineApi(path, body, me, env, store, origin) {
  if (path === '/api/line/status') return ok(publicStatus(env, await store.lineGet(me.email)));
  if (!lineEnabled(env)) return fail('代設功能尚未啟用，請聯絡管理者', 503);

  if (path === '/api/line/connect') {
    const token = String(body.token || '').trim();
    const secret = String(body.secret || '').trim();
    if (token.length < 50 || token.length > 400 || /\s/.test(token)) return fail('Channel access token 格式不正確，請重新複製');
    if (!/^[0-9a-f]{32}$/i.test(secret)) return fail('Channel secret 格式不正確（應為 32 個英數字），請重新複製');
    const info = await lineFetch(env, token, 'GET', '/v2/bot/info');
    if (!info.ok || !info.data.userId) return fail('LINE 不接受這組 Channel access token，請確認是否複製完整、是否已過期');
    const taken = await store.lineByBot(info.data.userId);
    if (taken && taken.email !== me.email) return fail('這個官方帳號已經由另一個使用者連接');
    const old = await store.lineGet(me.email);
    const hook = old?.hook || randomId();
    await store.lineSave(me.email, {
      hook, bot_user_id: info.data.userId, basic_id: String(info.data.basicId || ''), display_name: String(info.data.displayName || '').slice(0, 100),
      token_enc: await seal(env, token), secret_enc: await seal(env, secret), connected_at: new Date().toISOString(), webhook_ok: 0,
    });
    // 設定 Webhook 網址，並請 LINE 送一筆測試（同時驗證 Channel secret 是否正確）
    const endpoint = `${origin}/api/line/webhook/${hook}`;
    const set = await lineFetch(env, token, 'PUT', '/v2/bot/channel/webhook/endpoint', { body: { endpoint } });
    let webhookOk = false;
    if (set.ok) {
      const t = await lineFetch(env, token, 'POST', '/v2/bot/channel/webhook/test', { body: { endpoint } });
      webhookOk = t.ok && t.data.success === true;
    }
    await store.lineSave(me.email, { webhook_ok: webhookOk ? 1 : 0 });
    return ok({ ...publicStatus(env, await store.lineGet(me.email)), webhookSet: set.ok });
  }

  const row = await store.lineGet(me.email);
  if (!row) return fail('尚未連接 LINE 官方帳號');
  const token = await unseal(env, row.token_enc);

  if (path === '/api/line/apply') {
    const input = cleanApply(body);
    if (input.error) return fail(input.error);
    const res = await applyMenus(env, token, input);
    if (res.error) return fail(res.error, 502);
    // 保留上一代（供回復），刪除更早一代由本系統建立的選單
    await removeGeneration(env, token, JSON.parse(row.menus_prev || 'null'));
    await store.lineSave(me.email, {
      menus_prev: row.menus_current || null, menus_current: JSON.stringify(res.created), prev_default: res.prevDefault,
      replies: JSON.stringify(input.replies), greeting: input.greeting, applied_at: new Date().toISOString(),
    });
    return ok({ ...publicStatus(env, await store.lineGet(me.email)), pages: input.pages.length, replies: input.replies.length });
  }

  if (path === '/api/line/rollback') {
    if (!row.applied_at) return fail('沒有可以回復的紀錄');
    const r = row.prev_default
      ? await lineFetch(env, token, 'POST', `/v2/bot/user/all/richmenu/${row.prev_default}`)
      : await lineFetch(env, token, 'DELETE', '/v2/bot/user/all/richmenu');
    if (!r.ok) return fail(`回復失敗（LINE 回應 ${r.status}）。原本的選單可能已被刪除，請到 LINE 後台確認。`, 502);
    await removeGeneration(env, token, JSON.parse(row.menus_current || 'null'));
    await store.lineSave(me.email, { menus_current: row.menus_prev || null, menus_prev: null, applied_at: '', prev_default: '' });
    return ok({ ...publicStatus(env, await store.lineGet(me.email)), restored: row.prev_default ? 'previous' : 'none' });
  }

  if (path === '/api/line/disconnect') {
    await store.lineDelete(me.email);
    return ok({ enabled: true, connected: false });
  }
  return fail('not found', 404);
}

// ---------- Webhook（公開端點，以簽章驗證） ----------
async function validSignature(secret, bodyText, signature) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  try { return await crypto.subtle.verify('HMAC', key, unb64(signature), enc.encode(bodyText)); } catch { return false; }
}

export async function lineWebhook(req, env, hook, store) {
  const text = await req.text();
  const row = lineEnabled(env) && /^[A-Za-z0-9_-]{20,64}$/.test(hook) ? await store.lineByHook(hook) : null;
  if (!row || text.length > 200000) return new Response('not found', { status: 404 });
  const secret = await unseal(env, row.secret_enc);
  if (!(await validSignature(secret, text, req.headers.get('x-line-signature')))) return new Response('bad signature', { status: 401 });
  let payload;
  try { payload = JSON.parse(text); } catch { return new Response('bad request', { status: 400 }); }
  if (payload.destination && payload.destination !== row.bot_user_id) return new Response('wrong destination', { status: 400 });
  const replies = JSON.parse(row.replies || '[]');
  const token = await unseal(env, row.token_enc);
  for (const ev of (Array.isArray(payload.events) ? payload.events : []).slice(0, 20)) {
    if (!ev.replyToken || ev.mode === 'standby') continue;
    let answer = '';
    if (ev.type === 'follow') answer = row.greeting || '';
    else if (ev.type === 'message' && ev.message?.type === 'text') {
      const said = String(ev.message.text || '').trim();
      answer = replies.find((r) => r.keyword === said)?.reply || ''; // 沒有對應的關鍵字就不回覆，留給本人回
    }
    if (answer) await lineFetch(env, token, 'POST', '/v2/bot/message/reply', { body: { replyToken: ev.replyToken, messages: [{ type: 'text', text: answer.slice(0, 5000) }] } }).catch(() => {});
  }
  return new Response('ok');
}
