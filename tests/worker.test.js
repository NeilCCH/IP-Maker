// 後台測試：node tests/worker.test.js
// 1) Google 憑證驗證（自行產生金鑰簽章）2) 用 wrangler dev 在本機實際跑後台，走完 申請 → 審核 → 停用 流程
const { spawn } = require('child_process');
const path = require('path');
const { webcrypto: crypto } = require('crypto');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASS', name]); console.log('  ✓', name); }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('  ✗', name, '\n     ', e.message); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function makeToken(privateKey, kid, payload) {
  const h = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, Buffer.from(`${h}.${p}`));
  return `${h}.${p}.${b64url(sig)}`;
}

function startWorker(port, vars) {
  const args = ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', path.join(require('os').tmpdir(), `bs-worker-${port}-${Date.now()}`)];
  for (const [k, v] of Object.entries(vars)) args.push('--var', `${k}:${v}`);
  const proc = spawn('npx', args, { cwd: ROOT, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('wrangler dev 啟動逾時\n' + log.slice(-2000))), 90000);
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/api/config`);
        if (r.ok) { clearInterval(iv); clearTimeout(t); res({ proc, base: `http://127.0.0.1:${port}`, log: () => log }); }
      } catch { /* 尚未啟動 */ }
    }, 1000);
  });
}

function client(base) {
  let cookie = '';
  const call = async (p, { method = 'GET', body, headers = {}, html = false } = {}) => {
    const r = await fetch(base + p, {
      method, redirect: 'manual',
      headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(html ? { accept: 'text/html' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0].replace(/^__Host-/, '__Host-');
    if (sc && /Max-Age=0/.test(sc)) cookie = '';
    let data = null;
    if ((r.headers.get('content-type') || '').includes('json')) data = await r.json();
    return { status: r.status, data, location: r.headers.get('location'), cookieHeader: sc };
  };
  const api = (p, body, extra = {}) => call(p, { method: 'POST', body: body || {}, headers: { 'x-brand-studio': '1', ...extra } });
  return { call, api, getCookie: () => cookie };
}

(async () => {
  console.log('Google 登入憑證驗證');
  // 在測試中，用 Function 載入 ES module（jwt.js 不依賴 Cloudflare 執行環境）
  const { verifyIdToken } = await import(path.join(ROOT, 'worker', 'jwt.js'));
  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1' };
  const keys = async () => [jwk];
  const now = Date.now();
  const good = { iss: 'https://accounts.google.com', aud: 'cid', exp: Math.floor(now / 1000) + 600, email: 'A@Example.com', email_verified: true, name: '王' };
  await test('有效憑證通過，email 轉小寫', async () => {
    const r = await verifyIdToken(await makeToken(privateKey, 'k1', good), 'cid', keys, now);
    assert(r.email === 'a@example.com', r.email);
  });
  for (const [name, patch, kid] of [
    ['對象（aud）不符', { aud: 'other' }], ['已過期', { exp: Math.floor(now / 1000) - 10 }], ['發行者不符', { iss: 'https://evil.example' }],
    ['email 未驗證', { email_verified: false }], ['未知金鑰', {}, 'k2'],
  ])
    await test(`拒絕：${name}`, async () => {
      let ok = false;
      try { await verifyIdToken(await makeToken(privateKey, kid || 'k1', { ...good, ...patch }), 'cid', keys, now); ok = true; } catch { /* 預期失敗 */ }
      assert(!ok, '應該被拒絕');
    });
  await test('拒絕：簽章被竄改', async () => {
    const t = await makeToken(privateKey, 'k1', good);
    const [h, , s] = t.split('.');
    const forged = `${h}.${b64url(JSON.stringify({ ...good, email: 'boss@example.com' }))}.${s}`;
    let ok = false;
    try { await verifyIdToken(forged, 'cid', keys, now); ok = true; } catch { /* 預期失敗 */ }
    assert(!ok, '竄改內容仍通過');
  });

  const workers = [];
  try {
    console.log('門禁未啟用（尚未設定 Google）');
    const open = await startWorker(8791, { GOOGLE_CLIENT_ID: '' }); // 設定檔已填入用戶端 ID，這裡模擬留白的情況
    workers.push(open);
    await test('未設定 Google 時網站維持公開', async () => {
      const r = await fetch(open.base + '/', { headers: { accept: 'text/html' }, redirect: 'manual' });
      assert(r.status === 200, `首頁 ${r.status}`);
      const me = await (await fetch(open.base + '/api/me')).json();
      assert(me.authEnabled === false, JSON.stringify(me));
    });

    console.log('門禁啟用：申請 → 審核 → 停用');
    const w = await startWorker(8792, { GOOGLE_CLIENT_ID: 'test-client', ALLOW_TEST_LOGIN: 'yes' });
    workers.push(w);
    const user = client(w.base);
    const boss = client(w.base);

    await test('未登入：APP 頁面導向申請頁、程式檔拒絕、公開頁可開', async () => {
      const home = await user.call('/', { html: true });
      assert(home.status === 302 && home.location.endsWith('/gate/'), `首頁 ${home.status} ${home.location}`);
      assert((await user.call('/js/main.js')).status === 401, 'main.js 未被擋');
      assert((await user.call('/index.html', { html: true })).status === 302, 'index.html 未被擋');
      assert((await user.call('/gate/')).status === 200, '申請頁打不開');
      assert((await user.call('/css/app.css')).status === 200, '樣式打不開');
    });
    await test('寫入 API 需同網域標頭（防跨站）', async () => {
      const r = await user.call('/api/login', { method: 'POST', body: { credential: 'test:u@x.com' } });
      assert(r.status === 403, `沒有標頭仍可登入 ${r.status}`);
      const r2 = await user.api('/api/login', { credential: 'test:u@x.com' }, { origin: 'https://evil.example' });
      assert(r2.status === 403, `其他網域仍可登入 ${r2.status}`);
    });
    await test('登入後為「未填申請」，Cookie 為 HttpOnly + Secure', async () => {
      const r = await user.api('/api/login', { credential: 'test:User@X.com' });
      assert(r.status === 200 && r.data.status === 'none' && r.data.email === 'user@x.com', JSON.stringify(r.data));
      assert(/HttpOnly/.test(r.cookieHeader) && /Secure/.test(r.cookieHeader) && /SameSite=Lax/.test(r.cookieHeader), r.cookieHeader);
      assert((await user.call('/', { html: true })).status === 302, '未審核仍可進入');
    });
    await test('申請：缺欄位被拒；送出後為待審核；HTML 字元被移除', async () => {
      const bad = await user.api('/api/apply', { unit: '台北', division: '', title: '經理', name: '王' });
      assert(bad.status === 400 && /事業部/.test(bad.data.error), JSON.stringify(bad.data));
      const ok = await user.api('/api/apply', { unit: '台北通訊處', division: '第一事業部', title: '業務經理', name: '王<b>小明</b>' });
      assert(ok.data.status === 'pending' && ok.data.profile.name === '王b小明/b', JSON.stringify(ok.data));
    });
    await test('非管理者不能看名單或審核', async () => {
      assert((await user.api('/api/admin/users')).status === 403, '非管理者可看名單');
      assert((await user.api('/api/admin/decide', { email: 'user@x.com', status: 'approved' })).status === 403, '非管理者可自己核准');
    });
    await test('管理者（neo0935@gmail.com）自動通過並可審核', async () => {
      const r = await boss.api('/api/login', { credential: 'test:neo0935@gmail.com' });
      assert(r.data.status === 'approved' && r.data.isAdmin === true, JSON.stringify(r.data));
      const list = (await boss.api('/api/admin/users')).data.users;
      const u = list.find((x) => x.email === 'user@x.com');
      assert(u && u.status === 'pending' && u.unit === '台北通訊處' && u.division === '第一事業部', JSON.stringify(u));
      assert(list[0].status === 'pending', '待審核未排在最前面');
      const d = await boss.api('/api/admin/decide', { email: 'user@x.com', status: 'approved' });
      assert(d.status === 200, JSON.stringify(d.data));
    });
    await test('通過後可使用 APP', async () => {
      assert((await user.call('/api/me')).data.status === 'approved', '狀態不是已通過');
      const home = await user.call('/', { html: true });
      assert(home.status === 200, `首頁 ${home.status}`);
      assert((await user.call('/js/main.js')).status === 200, 'main.js 打不開');
    });
    await test('不能停用管理者', async () => {
      const r = await boss.api('/api/admin/decide', { email: 'neo0935@gmail.com', status: 'rejected' });
      assert(r.status === 400, `管理者被停用 ${r.status}`);
    });
    await test('停用後立即失效（登入狀態被清除）', async () => {
      await boss.api('/api/admin/decide', { email: 'user@x.com', status: 'rejected' });
      const me = (await user.call('/api/me')).data;
      assert(me.status === 'anonymous', JSON.stringify(me));
      assert((await user.call('/', { html: true })).status === 302, '停用後仍可進入');
    });
    await test('登出後無法再使用', async () => {
      await boss.api('/api/logout');
      assert((await boss.call('/api/me')).data.status === 'anonymous', '登出後仍登入');
    });

    await test('申請頁畫面：登入後填表 → 審核中 → 核准後進入 APP', async () => {
      const b = await chromium.launch();
      const ctx = await b.newContext();
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('https://accounts.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
      await page.goto(w.base + '/');
      assert(page.url().endsWith('/gate/'), `未導向申請頁 ${page.url()}`);
      await page.waitForSelector('#gbtn');
      // 以測試憑證登入（正式環境由 Google 按鈕完成）
      await page.evaluate(() => fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-brand-studio': '1' }, body: JSON.stringify({ credential: 'test:newbie@x.com' }) }));
      await page.reload();
      await page.waitForSelector('#applyForm');
      assert((await page.inputValue('input[readonly]')) === 'newbie@x.com', 'email 未帶入');
      await page.click('button[type="submit"]');
      assert(await page.isVisible('#formError'), '空白送出沒有錯誤提示');
      await page.fill('[name="unit"]', '台中通訊處');
      await page.fill('[name="division"]', '第二事業部');
      await page.fill('[name="title"]', '業務專員');
      await page.fill('[name="name"]', '陳小華');
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=申請審核中');
      const admin = client(w.base);
      await admin.api('/api/login', { credential: 'test:neo0935@gmail.com' });
      await admin.api('/api/admin/decide', { email: 'newbie@x.com', status: 'approved' });
      await page.click('[data-act="refresh"]');
      await page.waitForURL(w.base + '/');
      await page.waitForSelector('#userChip:not([hidden])');
      assert((await page.textContent('#userName')) === '陳小華', '頂部沒有顯示登入者');
      assert(await page.isHidden('#adminLink'), '一般使用者看到管理連結');
      // 管理者畫面
      const p2 = await (await b.newContext()).newPage();
      await p2.goto(w.base + '/gate/');
      await p2.evaluate(() => fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-brand-studio': '1' }, body: JSON.stringify({ credential: 'test:neo0935@gmail.com' }) }));
      await p2.goto(w.base + '/#/admin');
      await p2.waitForSelector('#adminLink:not([hidden])');
      await p2.click('[data-action="admin-filter"][data-v="approved"]');
      await p2.waitForSelector('text=陳小華');
      await b.close();
      assert(!errors.length, errors.join(' | '));
    });

    console.log('LINE 代設（對本機的模擬 LINE 伺服器，不接觸真實帳號）');
    await test('未設定加密金鑰時，代設功能停用', async () => {
      const c = client(w.base);
      await c.api('/api/login', { credential: 'test:neo0935@gmail.com' });
      const st = await c.api('/api/line/status');
      assert(st.data.enabled === false, JSON.stringify(st.data));
      assert((await c.api('/api/line/connect', { token: 'x'.repeat(80), secret: 'a'.repeat(32) })).status === 503, '未啟用仍可連接');
    });

    // ---- 模擬 LINE 伺服器 ----
    const http = require('http');
    const nodeCrypto = require('crypto');
    const GOOD = 'good' + 'x'.repeat(80);
    const SECRET = '0123456789abcdef0123456789abcdef';
    const mock = { calls: [], menus: new Map(), aliases: new Map(), def: '', seq: 0, endpoint: '', replies: [], failContentAt: 0, contentCount: 0 };
    const mockSrv = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (d) => chunks.push(d));
      req.on('end', async () => {
        const raw = Buffer.concat(chunks);
        const u = req.url; const m = req.method;
        mock.calls.push(`${m} ${u}`);
        const send = (code, obj = {}) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
        if (req.headers.authorization !== `Bearer ${GOOD}`) return send(401, { message: 'invalid token' });
        let body = {};
        try { body = JSON.parse(raw.toString() || '{}'); } catch { /* 圖片內容 */ }
        if (m === 'GET' && u === '/v2/bot/info') return send(200, { userId: 'Ubot1', basicId: '@test764', displayName: '測試官方帳號' });
        if (m === 'PUT' && u === '/v2/bot/channel/webhook/endpoint') { mock.endpoint = body.endpoint; return send(200); }
        if (m === 'POST' && u === '/v2/bot/channel/webhook/test') {
          const payload = JSON.stringify({ destination: 'Ubot1', events: [] });
          const sig = nodeCrypto.createHmac('sha256', SECRET).update(payload).digest('base64');
          const r = await fetch(mock.endpoint.replace(/^https?:\/\/[^/]+/, mock.workerBase), { method: 'POST', headers: { 'x-line-signature': sig, 'content-type': 'application/json' }, body: payload });
          return send(200, { success: r.status === 200, statusCode: r.status });
        }
        if (m === 'GET' && u === '/v2/bot/user/all/richmenu') return mock.def ? send(200, { richMenuId: mock.def }) : send(404, { message: 'no default' });
        if (m === 'POST' && u === '/v2/bot/richmenu/validate') return send(200);
        if (m === 'POST' && u === '/v2/bot/richmenu') { const id = `richmenu-${++mock.seq}`; mock.menus.set(id, body); return send(200, { richMenuId: id }); }
        let mm;
        if (m === 'POST' && (mm = u.match(/^\/v2\/bot\/richmenu\/(richmenu-\d+)\/content$/))) { mock.contentCount++; if (mock.failContentAt === mock.contentCount) return send(400, { message: 'image too large' }); return send(200); }
        if (m === 'POST' && u === '/v2/bot/richmenu/alias') { mock.aliases.set(body.richMenuAliasId, body.richMenuId); return send(200); }
        if (m === 'DELETE' && (mm = u.match(/^\/v2\/bot\/richmenu\/alias\/(.+)$/))) { mock.aliases.delete(mm[1]); return send(200); }
        if (m === 'DELETE' && (mm = u.match(/^\/v2\/bot\/richmenu\/(richmenu-\d+)$/))) { mock.menus.delete(mm[1]); return send(200); }
        if (m === 'POST' && (mm = u.match(/^\/v2\/bot\/user\/all\/richmenu\/(richmenu-\d+)$/))) { if (!mock.menus.has(mm[1])) return send(404); mock.def = mm[1]; return send(200); }
        if (m === 'DELETE' && u === '/v2/bot/user/all/richmenu') { mock.def = ''; return send(200); }
        if (m === 'POST' && u === '/v2/bot/message/reply') { mock.replies.push(body); return send(200); }
        send(404, { message: 'mock: unknown' });
      });
    }).listen(8795, '127.0.0.1');
    const lw = await startWorker(8794, { GOOGLE_CLIENT_ID: 'test-client', ALLOW_TEST_LOGIN: 'yes', TOKEN_KEY: 'local-test-key-0123456789abcdef', LINE_API_BASE: 'http://127.0.0.1:8795', LINE_DATA_BASE: 'http://127.0.0.1:8795' });
    workers.push(lw);
    mock.workerBase = lw.base;
    const me = client(lw.base);
    await me.api('/api/login', { credential: 'test:neo0935@gmail.com' });
    const img = Buffer.alloc(2000, 7).toString('base64');
    const menuBody = (rel, p, pages) => ({ size: { width: 2500, height: 1686 }, selected: true, name: 't', chatBarText: '我的服務', areas: [
      { bounds: { x: 0, y: 200, width: 2500, height: 1486 }, action: { type: 'message', label: '認識我', text: '認識我' } },
      ...(pages === 2 ? [0, 1].map((t) => ({ bounds: { x: t * 1250, y: 0, width: 1250, height: 200 }, action: { type: 'richmenuswitch', label: `頁${t + 1}`, richMenuAliasId: `bs-${rel}-p${t + 1}`, data: `page=${t + 1}` } })) : []),
    ] });
    const applyBody = (rel, pages = 2) => ({ rel, pages: Array.from({ length: pages }, (_, p) => ({ body: menuBody(rel, p, pages), image: img, mime: 'image/png' })), replies: [{ keyword: '認識我', reply: '我是測試顧問' }], greeting: '歡迎加入' });
    const hookPost = (payload, secret = SECRET, hookUrl = mock.endpoint) => {
      const text = JSON.stringify(payload);
      return fetch(hookUrl.replace(/^https?:\/\/[^/]+/, lw.base), { method: 'POST', headers: { 'x-line-signature': nodeCrypto.createHmac('sha256', secret).update(text).digest('base64'), 'content-type': 'application/json' }, body: text });
    };

    await test('連接：金鑰錯誤被拒；正確時取得帳號資訊並通過 Webhook 測試；回應不含金鑰', async () => {
      assert((await me.api('/api/line/status')).data.enabled === true, '功能未啟用');
      assert((await me.api('/api/line/connect', { token: 'bad' + 'y'.repeat(80), secret: SECRET })).status === 400, '錯誤的 token 被接受');
      assert((await me.api('/api/line/connect', { token: GOOD, secret: 'short' })).status === 400, '格式錯誤的 secret 被接受');
      const r = await me.api('/api/line/connect', { token: GOOD, secret: SECRET });
      assert(r.status === 200 && r.data.connected && r.data.basicId === '@test764' && r.data.webhookOk === true, JSON.stringify(r.data));
      assert(/\/api\/line\/webhook\/[A-Za-z0-9_-]{20,}$/.test(mock.endpoint), `Webhook 網址 ${mock.endpoint}`);
      const all = JSON.stringify(r.data) + JSON.stringify((await me.api('/api/line/status')).data);
      assert(!all.includes(GOOD) && !all.includes(SECRET) && !/token_enc|secret_enc/.test(all), '回應洩漏金鑰');
    });
    await test('套用雙頁選單：全部建好才切換預設；建立這次專用的切頁代號', async () => {
      const r = await me.api('/api/line/apply', applyBody('rel1'));
      assert(r.status === 200 && r.data.pages === 2 && r.data.replies === 1, JSON.stringify(r.data));
      assert(mock.def === 'richmenu-1' && mock.aliases.get('bs-rel1-p1') === 'richmenu-1' && mock.aliases.get('bs-rel1-p2') === 'richmenu-2', '選單或代號不正確');
      const iDef = mock.calls.lastIndexOf('POST /v2/bot/user/all/richmenu/richmenu-1');
      assert(iDef === mock.calls.length - 1, '切換預設不是最後一步');
    });
    await test('套用失敗（第二頁圖片上傳失敗）：清除半成品，原選單不變', async () => {
      mock.contentCount = 0; mock.failContentAt = 2;
      const r = await me.api('/api/line/apply', applyBody('rel2'));
      mock.failContentAt = 0;
      assert(r.status === 502 && /原本的選單沒有被更動/.test(r.data.error), JSON.stringify(r.data));
      assert(mock.def === 'richmenu-1' && mock.menus.size === 2 && !mock.aliases.has('bs-rel2-p1'), `半成品未清除 ${[...mock.menus.keys()]}`);
    });
    await test('惡意或格式錯誤的選單設定被拒絕（不送到 LINE）', async () => {
      const n = mock.calls.length;
      const bad1 = applyBody('rel3'); bad1.pages[0].body.areas[0].action = { type: 'uri', label: 'x', uri: 'javascript:alert(1)' };
      const bad2 = applyBody('rel3'); bad2.pages[0].body.areas[1].action.richMenuAliasId = 'someone-elses-alias';
      const bad3 = applyBody('REL!');
      for (const b of [bad1, bad2, bad3]) assert((await me.api('/api/line/apply', b)).status === 400, '格式錯誤的設定被接受');
      assert(mock.calls.length === n, '錯誤設定仍呼叫了 LINE');
    });
    await test('Webhook：簽章正確才處理；關鍵字回覆、加好友歡迎詞、其他訊息不回', async () => {
      mock.replies = [];
      assert((await hookPost({ destination: 'Ubot1', events: [{ type: 'message', replyToken: 'r1', message: { type: 'text', text: ' 認識我 ' } }] })).status === 200, '正確簽章被拒');
      assert((await hookPost({ destination: 'Ubot1', events: [{ type: 'follow', replyToken: 'r2' }] })).status === 200, 'follow 失敗');
      await hookPost({ destination: 'Ubot1', events: [{ type: 'message', replyToken: 'r3', message: { type: 'text', text: '我想問別的' } }] });
      assert(mock.replies.length === 2 && mock.replies[0].messages[0].text === '我是測試顧問' && mock.replies[1].messages[0].text === '歡迎加入', JSON.stringify(mock.replies));
      assert((await hookPost({ destination: 'Ubot1', events: [] }, 'f'.repeat(32))).status === 401, '錯誤簽章被接受');
      assert((await hookPost({ destination: 'Uother', events: [] })).status === 400, '其他帳號的訊息被接受');
      assert((await hookPost({ events: [] }, SECRET, lw.base + '/api/line/webhook/' + 'z'.repeat(32))).status === 404, '不存在的 Webhook 有回應');
    });
    await test('再次套用後可回復上一版；更早的選單會被清除', async () => {
      const r2 = await me.api('/api/line/apply', applyBody('rel4', 1));
      assert(r2.status === 200 && mock.def === 'richmenu-5', `${r2.status} ${mock.def}`);
      assert(mock.menus.has('richmenu-1'), '上一版選單被提早刪除');
      const rb = await me.api('/api/line/rollback');
      assert(rb.status === 200 && mock.def === 'richmenu-1' && !mock.menus.has('richmenu-5'), `${rb.status} ${mock.def} ${[...mock.menus.keys()]}`);
    });
    await test('畫面操作：貼上金鑰連接 → 確認內容 → 套用，LINE 端收到新選單與回覆設定', async () => {
      await me.api('/api/line/disconnect');
      const b = await chromium.launch();
      const page = await (await b.newContext()).newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => d.accept());
      await page.route('https://accounts.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
      await page.goto(lw.base + '/gate/');
      await page.evaluate(() => fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-brand-studio': '1' }, body: JSON.stringify({ credential: 'test:neo0935@gmail.com' }) }));
      await page.goto(lw.base + '/');
      await page.evaluate(async () => { const m = await import('/js/model.js'); localStorage.setItem('brand-studio-v2', JSON.stringify(m.sampleHengYuan())); });
      await page.goto(lw.base + '/#/results/lineOA/guide');
      await page.reload();
      await page.waitForSelector('#lineSecret');
      assert((await page.getAttribute('#lineToken', 'type')) === 'password', '金鑰欄位不是密碼欄位');
      await page.fill('#lineSecret', SECRET);
      await page.fill('#lineToken', GOOD);
      await page.click('[data-action="line-connect"]');
      await page.waitForSelector('#lineConnect .st-done');
      assert((await page.textContent('#lineConnect')).includes('測試官方帳號'), '沒有顯示已連接的帳號');
      const stored = await page.evaluate(() => JSON.stringify(localStorage));
      assert(!stored.includes(GOOD) && !stored.includes(SECRET), '金鑰被存進裝置');
      const before = mock.def;
      await page.click('[data-action="line-apply"]');
      await page.waitForSelector('#lineConnect .parse .ok', { timeout: 60000 });
      assert(mock.def && mock.def !== before, `預設選單沒有更新：${mock.def}`);
      const menu = mock.menus.get(mock.def);
      assert(menu.areas.length === 8 && menu.areas[0].action.type === 'message', `選單內容不正確：${menu.areas.length}`);
      mock.replies = [];
      await hookPost({ destination: 'Ubot1', events: [{ type: 'message', replyToken: 'u1', message: { type: 'text', text: menu.areas[0].action.text } }] });
      assert(mock.replies.length === 1 && mock.replies[0].messages[0].text.length > 5, '點選單第一格沒有得到回覆');
      await b.close();
      assert(!errors.length, errors.join(' | '));
    });
    await test('權限：未通過審核不能使用；別人不能連接同一個官方帳號；解除連接後 Webhook 失效', async () => {
      const other = client(lw.base);
      await other.api('/api/login', { credential: 'test:other@x.com' });
      assert((await other.api('/api/line/status')).status === 403, '未審核者可使用');
      await other.api('/api/apply', { unit: 'a', division: 'b', title: 'c', name: 'd' });
      await me.api('/api/admin/decide', { email: 'other@x.com', status: 'approved' });
      const dup = await other.api('/api/line/connect', { token: GOOD, secret: SECRET });
      assert(dup.status === 400 && /另一個使用者/.test(dup.data.error), JSON.stringify(dup.data));
      const hookUrl = mock.endpoint;
      assert((await me.api('/api/line/disconnect')).data.connected === false, '解除連接失敗');
      assert((await hookPost({ destination: 'Ubot1', events: [] }, SECRET, hookUrl)).status === 404, '解除連接後 Webhook 仍有效');
      assert((await me.api('/api/line/apply', applyBody('rel5'))).status === 400, '未連接仍可套用');
    });
    mockSrv.close();

    console.log('正式設定（沒有測試登入）');
    const prod = await startWorker(8793, { GOOGLE_CLIENT_ID: 'test-client' });
    workers.push(prod);
    await test('沒有開啟測試登入時，假憑證一律被拒', async () => {
      const r = await client(prod.base).api('/api/login', { credential: 'test:neo0935@gmail.com' });
      assert(r.status === 401, `假憑證可登入 ${r.status}`);
    });
  } catch (e) {
    results.push(['FAIL', '啟動後台', e.message]);
    console.log('  ✗ 啟動後台', e.message);
  } finally {
    for (const w of workers) { try { process.kill(-w.proc.pid, 'SIGTERM'); } catch { w.proc.kill('SIGTERM'); } }
  }
  const fail = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n${results.length - fail.length} / ${results.length} 通過`);
  process.exit(fail.length ? 1 : 0);
})();
