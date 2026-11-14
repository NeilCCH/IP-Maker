// 端對端驗收測試：node tests/e2e.test.js
// 需求：Playwright（環境已預裝）、python3（驗證 ZIP 與 PNG）
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', 'app');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(['PASS', name]); console.log('  ✓', name); }
  catch (e) { results.push(['FAIL', name, e.message]); console.log('  ✗', name, '\n     ', e.message); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-e2e-'));

(async () => {
  const srv = await serve();
  const BASE = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('brand-studio-v2')));
  const setState = (s) => page.evaluate((s) => localStorage.setItem('brand-studio-v2', JSON.stringify(s)), s);
  const mod = (p) => `${BASE}js/${p}`;
  // 換 hash 不會重新載入頁面，因此一律 reload，確保讀到測試寫入的 localStorage
  const go = async (h) => { await page.goto(BASE + h); await page.reload(); await page.waitForTimeout(400); };

  console.log('問答與品牌');
  await test('新使用者不會帶入「衡遠」內容', async () => {
    await go('#/');
    await page.evaluate(() => localStorage.clear());
    await go('#/profile');
    const s = JSON.stringify(await state());
    assert(!s.includes('衡遠') && !s.includes('衡量當下'), '預設資料含有衡遠');
    await go('#/results/lineOA/preview');
    assert(!(await page.content()).includes('衡遠'), '畫面含有衡遠');
  });

  const QI = await page.evaluate(async (u) => Object.fromEntries((await import(u)).QUESTIONS.map((q, i) => [q.id, i])), mod('data/questions.js'));
  const jumpTo = async (id) => { const st = await state(); st.meta.qIndex = QI[id]; await setState(st); await go('#/profile'); };

  await test('認識自己：自己圈 6 個詞，再選 3 個關鍵字；全程不需要別人', async () => {
    await go('#/profile');
    assert((await page.$$('[data-action="word"]')).length === 48, '詞庫不是 48 個詞');
    for (const w of ['沉穩', '果斷', '務實', '值得信任', '真誠', '有質感', '有遠見']) await page.click(`[data-action="word"][data-v="${w}"]`);
    let s = await state();
    assert(s.answers.selfWords.length === 6 && !s.answers.selfWords.includes('有遠見'), `圈詞上限錯誤：${s.answers.selfWords}`);
    await page.fill('[data-ff="selfWords"]', '其實我也很會照顧人');
    await page.click('[data-action="q-next"]');
    assert((await page.textContent('#qTitle')).includes('3 個品牌關鍵字'), '圈詞後下一題不是選關鍵字');
    const pick = await page.$$eval('.kw-pick [data-action="kw"]', (bs) => bs.map((b) => b.dataset.v));
    assert(pick.length === 6 && pick.includes('沉穩') && pick.includes('有質感'), `可選的詞不是自己圈的 6 個：${pick}`);
    for (const w of ['沉穩', '務實', '值得信任', '真誠']) await page.click(`.kw-pick [data-action="kw"][data-v="${w}"]`);
    s = await state();
    assert(JSON.stringify(s.answers.keywords) === JSON.stringify(['沉穩', '務實', '值得信任']), `關鍵字錯誤：${s.answers.keywords}`);
    await page.fill('[data-ff="keywords"]', '深海藍、青色；沉穩、清楚');
    const pal = await page.evaluate(async (u) => (await import(u)).derive(JSON.parse(localStorage.getItem('brand-studio-v2'))).palette.hues, mod('brand.js'));
    assert(pal.includes('blue') || pal.includes('cyan'), `顏色感覺沒有影響建議配色：${pal}`);
    const all = await page.evaluate(async (u) => JSON.stringify((await import(u)).QUESTIONS), mod('data/questions.js'));
    assert(!/夥伴|同事|請他|交給/.test(all), '題目仍要求找別人');
  });

  await test('可只選選項、選項加文字、純文字回答；多選上限有效', async () => {
    await jumpTo('audience');
    for (const v of ['成熟家庭', '高資產族群', '單身與頂客族', '新婚與新手爸媽']) await page.click(`[data-action="opt"][data-v="${v}"]`);
    let s = await state();
    assert(s.answers.audience.length === 3, `多選上限未生效：${s.answers.audience}`);
    assert((await page.$$('[data-action="opt"]')).length === 9, '客群不是 9 個選項');
    for (const v of ['成熟家庭', '高資產族群', '單身與頂客族']) await page.click(`[data-action="opt"][data-v="${v}"]`);
    await page.fill('[data-ff="audience"]', '科技業工程師');
    const D = await page.evaluate(async (u) => { const b = await import(u); const st = JSON.parse(localStorage.getItem('brand-studio-v2')); return b.derive(st).audience; }, mod('brand.js'));
    assert(D[0] === '科技業工程師', `純文字回答未成為答案：${D}`);
  });

  await test('重新整理後還原進度與題號', async () => {
    const before = await state();
    await page.reload();
    await page.waitForTimeout(300);
    const after = await state();
    assert(after.meta.qIndex === before.meta.qIndex && after.freeform.audience === '科技業工程師', '重啟後進度不一致');
    assert((await page.textContent('#qTitle')).includes('哪一類客戶'), '題號未還原');
  });

  await test('選項與自由文字衝突時請使用者確認，不默默丟棄', async () => {
    const s = await state();
    s.answers.palette = ['violet'];
    s.freeform.avoid = '不要紫色';
    s.meta.qIndex = QI.palette;
    await setState(s);
    await go('#/profile');
    assert(await page.isVisible('.conflict'), '未顯示衝突提示');
    await page.click('[data-action="resolve"][data-v="text"]');
    const pal = await page.evaluate(async (u) => (await import(u)).derive(JSON.parse(localStorage.getItem('brand-studio-v2'))).palette.id, mod('brand.js'));
    assert(pal !== 'violet', '以文字為準後仍使用紫色色卡');
    const st = await state();
    assert(st.answers.palette[0] === 'violet' && st.freeform.avoid === '不要紫色', '原選項或原文被丟棄');
  });

  await test('匯入錯誤檔案不破壞原進度；可匯入舊展示版進度', async () => {
    await go('#/advanced');
    const before = JSON.stringify(await state());
    const bad = path.join(TMP, 'bad.json');
    fs.writeFileSync(bad, '{"hello":1}');
    await page.setInputFiles('#importFile', bad);
    await page.waitForTimeout(300);
    assert(JSON.stringify(await state()) === before, '錯誤檔案改動了進度');
    fs.writeFileSync(bad, 'not json');
    await page.setInputFiles('#importFile', bad);
    await page.waitForTimeout(300);
    assert(JSON.stringify(await state()) === before, '壞掉的 JSON 改動了進度');
    const legacy = { step: 3, designStyle: 'friendly', answers: { traits: ['專業可靠'], avoid: ['金色與米白'], palette: ['清新理性'] }, notes: { name: '舊標語' }, brand: '舊品牌', pages: 2, count: 6, page: 0, pageNames: ['A頁', 'B頁'], photo: '', entries: [{ label: '舊入口', description: 'd', url: 'https://example.com' }] };
    const lf = path.join(TMP, 'legacy.json');
    fs.writeFileSync(lf, JSON.stringify(legacy));
    await page.setInputFiles('#importFile', lf);
    await page.waitForTimeout(400);
    const s = await state();
    assert(s.identity.brandName === '舊品牌' && s.identity.slogan === '舊標語', '舊版名稱或標語未轉入');
    assert(s.answers.avoid.includes('過度金色') && s.answers.avoid.includes('米白復古配色'), '舊版禁忌未轉換');
    assert(s.answers.palette[0] === 'ocean' && s.selectedDesignId === 'friendly', '舊版配色或風格未轉入');
    assert(s.platforms.lineOA.pages === 2 && s.platforms.lineOA.count === 6 && s.platforms.lineOA.entries[0].label === '舊入口', '舊版選單未轉入');
  });

  await test('舊版 localStorage 進度自動轉入', async () => {
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('oa-brand-studio-v1', JSON.stringify({ brand: '自動轉入', answers: {}, notes: {}, entries: [{ label: 'X' }] })); });
    await go('#/');
    const s = await state();
    assert(s && s.identity.brandName === '自動轉入', '舊版資料未自動轉入');
    assert(await page.evaluate(() => !!localStorage.getItem('oa-brand-studio-v1')), '舊版資料被刪除');
  });

  await test('九宮格新題：說話順序、自訂色碼、字型與禁忌衝突、我是誰', async () => {
    await jumpTo('tone');
    await page.click('[data-action="extra-opt"][data-v="先講重點"]');
    assert((await state()).answers.toneOrder[0] === '先講重點', '說話順序未保存');
    await jumpTo('palette');
    await page.click('[data-action="pal"][data-v="custom"]');
    await page.fill('[data-color-hex="primary"]', '#1E3A8A');
    let D = await page.evaluate(async (u) => (await import(u)).derive(JSON.parse(localStorage.getItem('brand-studio-v2'))), mod('brand.js'));
    assert(D.palette.id === 'custom' && D.palette.primary === '#1e3a8a' && /^#[0-9a-f]{6}$/.test(D.palette.bg), `自訂色彩未套用 ${JSON.stringify(D.palette)}`);
    await page.fill('[data-color-hex="primary"]', '#FDE68A');
    assert(await page.isVisible('.conflict'), '主色太淺沒有提醒');
    await page.click('[data-action="resolve"][data-id="custom-contrast"][data-v="text"]');
    D = await page.evaluate(async (u) => (await import(u)).derive(JSON.parse(localStorage.getItem('brand-studio-v2'))), mod('brand.js'));
    const c = await page.evaluate(async ([u, p]) => (await import(u)).contrast(p, '#ffffff'), [mod('brand.js'), D.palette.primary]);
    assert(c >= 4.5, `自動加深後對比不足 ${c}`);
    const st = await state();
    st.answers.avoid = ['古典襯線字體'];
    st.answers.font = ['明體・典雅'];
    st.meta.qIndex = QI.font;
    await setState(st);
    await go('#/profile');
    assert(await page.isVisible('[data-action="resolve"][data-id="font-serif"]'), '字型與禁忌衝突沒有提醒');
    await jumpTo('name');
    await page.click('[data-action="whoami-pick"]');
    assert((await state()).identity.whoami.length > 5, '我是誰提案未套用');
  });

  await test('品牌規範：內容完整、待補項目標示、可複製與下載', async () => {
    await page.evaluate(async (u) => { const m = await import(u); localStorage.setItem('brand-studio-v2', JSON.stringify(m.sampleHengYuan())); }, mod('model.js'));
    await go('#/results/lineOA/preview');
    assert(await page.isVisible('[data-action="guide-copy"]'), '沒有品牌規範區塊');
    const md = await page.evaluate(async ([g, b]) => { const G = await import(g); const B = await import(b); const st = JSON.parse(localStorage.getItem('brand-studio-v2')); return { md: G.brandMd(st, B.derive(st)), prompt: G.guidePrompt(st, B.derive(st)), miss: G.missingItems(st, B.derive(st)) }; }, [mod('brandguide.js'), mod('brand.js')]);
    for (const k of ['品牌核心', '我是誰', '服務對象', '三個品牌關鍵字', '最像我的 6 個詞', '語氣規則', '三個「不要」', '#155eef', '約 60%', '字型層級', '標題', '內文', '數字', '圖像風格', '識別方式', '衡量當下，規劃長遠'])
      assert(md.md.includes(k), `brand.md 缺少「${k}」`);
    assert(md.prompt.includes('一次只問一題') || md.prompt.includes('一次問我一題'), '提示詞沒有逐題訪問的指示');
    assert(md.prompt.includes('都要照這份規範'), '提示詞沒有之後照規範的指示');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="guide-dl"]')]);
    assert(dl.suggestedFilename() === 'brand.md', `下載檔名 ${dl.suggestedFilename()}`);
    // 空白資料：待補項目會列出，讓 AI 逐題訪問
    const empty = await page.evaluate(async ([g, b, m]) => { const G = await import(g); const B = await import(b); const M = await import(m); const st = M.fresh(); return G.guidePrompt(st, B.derive(st)); }, [mod('brandguide.js'), mod('brand.js'), mod('model.js')]);
    assert(empty.includes('【待補】') && empty.includes('一次只問一題'), '空白規範沒有待補標示');
  });

  console.log('風格與平台');
  await test('三款風格提案確實繪出且畫面不同', async () => {
    await page.evaluate(async (u) => { const m = await import(u); localStorage.setItem('brand-studio-v2', JSON.stringify(m.sampleHengYuan())); }, mod('model.js'));
    await go('#/design');
    await page.waitForTimeout(1500);
    const sigs = await page.$$eval('canvas[data-board]', (cs) => cs.map((c) => c.toDataURL().length + ':' + c.toDataURL().slice(5000, 5100)));
    assert(sigs.length === 3 && new Set(sigs).size === 3, '三款提案圖相同或缺少');
  });

  await test('切換風格不丟失內容，重啟後保留', async () => {
    const before = await state();
    await page.click('[data-action="design-pick"][data-id="minimal"]');
    await page.reload();
    await page.waitForTimeout(300);
    const after = await state();
    assert(after.selectedDesignId === 'minimal', '風格未保存');
    assert(JSON.stringify(after.platforms.lineOA.entries) === JSON.stringify(before.platforms.lineOA.entries) && after.identity.brandName === '衡遠', '切換風格改動了內容');
  });

  const READY = await page.evaluate(async (u) => (await import(u)).READY_PLATFORMS, mod('platforms.js'));
  const BUILDING = ['facebook', 'website', 'instagram', 'lineOA', 'threads'].filter((p) => !READY.includes(p));

  await test('首頁先選平台；建置中的平台不能點', async () => {
    await go('#/');
    const pickable = await page.$$eval('button.pick', (bs) => bs.map((b) => b.dataset.id));
    assert(JSON.stringify([...pickable].sort()) === JSON.stringify([...READY, 'ai'].sort()), `可選項目不符：${pickable}`);
    assert((await page.$$('.pick.is-building')).length === BUILDING.length, '建置中平台數量不符');
    assert(!(await page.$('.pick.is-building a, a.pick.is-building')), '建置中平台有連結');
    await page.click(`button.pick[data-id="${READY[0]}"]`);
    assert((await state()).meta.target === READY[0], '未記錄選擇的平台');
  });

  await test('已開放平台有 預覽／修改／下載／提示詞／設定引導；建置中平台無連結', async () => {
    for (const pid of READY)
      for (const tab of ['preview', 'edit', 'download', 'prompt', 'guide']) {
        await go(`#/results/${pid}/${tab}`);
        const ok = await page.$eval('.panel-body', (el) => el.textContent.trim().length > 20);
        assert(ok, `${pid}/${tab} 沒有內容`);
      }
    for (const pid of BUILDING) {
      await go(`#/results/${pid}/preview`);
      assert(!(await page.$(`.ptabs a[href*="/${pid}/"]`)), `${pid} 分頁仍有連結`);
      assert(!(await page.$(`.overview a[href*="/${pid}/"]`)), `${pid} 總覽仍有連結`);
    }
  });

  await test('平台專屬文字手動修改後，不被共用資料更新覆蓋', async () => {
    await go('#/results/lineOA/edit');
    await page.fill('[data-text="lineOA:greeting"]', '我自己寫的歡迎詞');
    const s = await state();
    s.identity.slogan = '新標語';
    await setState(s);
    await go('#/results/lineOA/edit');
    assert((await page.inputValue('[data-text="lineOA:greeting"]')) === '我自己寫的歡迎詞', '手動內容被覆蓋');
    assert(await page.isVisible('[data-action="reset-text"]'), '沒有恢復自動產生的選項');
  });

  await test('提示詞包含品牌、風格、禁忌、自由回答與平台配置', async () => {
    await go('#/results/lineOA/prompt');
    const t = await page.inputValue('#promptOut');
    for (const k of ['衡遠', '簡約現代', '不使用金色', '像訃聞', '圖文選單', '台灣繁體中文', '不得虛構']) assert(t.includes(k), `提示詞缺少「${k}」`);
  });

  await test('提示詞手動修改後，品牌資料更新會詢問是否重新生成', async () => {
    await page.fill('#promptOut', '我改過的提示詞');
    const s = await state();
    s.identity.slogan = '再換一個標語';
    await setState(s);
    await go('#/results/lineOA/prompt');
    assert((await page.inputValue('#promptOut')) === '我改過的提示詞', '手動提示詞被覆蓋');
    assert(await page.isVisible('[data-action="prompt-regen"]'), '未詢問是否重新生成');
  });

  await test('AI 工具提示詞：首頁可選，六種用途都帶入品牌元素，可填主題、複製與下載', async () => {
    await page.evaluate(async (u) => { const m = await import(u); localStorage.setItem('brand-studio-v2', JSON.stringify(m.sampleHengYuan())); }, mod('model.js'));
    await go('#/');
    await page.click('button.pick[data-id="ai"]');
    assert((await state()).meta.target === 'ai', '未記錄選擇 AI 工具提示詞');
    assert((await page.textContent('.home > .btn.big')).includes('AI 工具提示詞'), '開始按鈕沒有顯示選擇的項目');
    await go('#/design');
    assert((await page.getAttribute('.actions-row .btn.primary', 'href')) === '#/results/ai', '第二步的下一步沒有導向 AI 提示詞');
    await go('#/results');
    assert((await page.textContent('h1')).includes('AI 工具提示詞'), '第三步沒有顯示 AI 提示詞頁');
    const kinds = await page.$$eval('.subtabs a', (as) => as.map((a) => a.getAttribute('href').split('/').pop()));
    assert(kinds.length === 6, `用途數量 ${kinds.length}`);
    for (const k of kinds) {
      await go(`#/results/ai/${k}`);
      const t = await page.inputValue('#aiOut');
      assert(t.includes('#155eef'), `${k} 沒有帶入主色`);
      assert(/專業|有遠見|值得信任/.test(t), `${k} 沒有帶入關鍵字`);
      assert(t.includes('繁體中文'), `${k} 沒有語言規則`);
      assert(!t.includes('undefined') && !t.includes('[object'), `${k} 內容有錯誤字樣`);
    }
    await go('#/results/ai/image');
    await page.fill('[data-ai-topic="image"]', '退休講座海報');
    assert((await page.inputValue('#aiOut')).includes('退休講座海報'), '主題沒有放進提示詞');
    assert((await page.inputValue('#aiOut')).includes('虛構的人物臉孔'), '生圖提示詞沒有禁止虛構人像');
    await page.reload(); await page.waitForTimeout(300);
    assert((await page.inputValue('[data-ai-topic="image"]')) === '退休講座海報', '主題重新整理後不見');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="ai-dl"]')]);
    assert(dl.suggestedFilename() === 'ai-prompt-image.txt', dl.suggestedFilename());
    await go('#/results/lineOA/preview');
    assert(await page.isVisible('.ptabs a[href="#/results/ai"]'), 'LINE 頁沒有 AI 提示詞分頁');
  });

  await test('個人網頁：已開放，內容完整、列出待填項目、不載入外部資源', async () => {
    assert(READY.includes('website'), '個人網頁尚未開放');
    await page.evaluate(async (u) => { const m = await import(u); localStorage.setItem('brand-studio-v2', JSON.stringify(m.sampleHengYuan())); }, mod('model.js'));
    await go('#/results/website/preview');
    assert(await page.isVisible('iframe#webPreview[sandbox=""]'), '預覽沒有沙箱化');
    assert(await page.isVisible('.panel-body .conflict'), '沒有提醒待填項目');
    const r = await page.evaluate(async ([w, b]) => { const W = await import(w); const B = await import(b); const st = JSON.parse(localStorage.getItem('brand-studio-v2')); const D = B.derive(st); return { html: W.websiteHTML(st, D), todos: W.websiteTodos(st, D), services: W.siteServices(D).map((e) => e.label) }; }, [mod('website.js'), mod('brand.js')]);
    for (const k of ['我能協助的事', '合作方式', '關於我', '聯絡我', '衡量當下，規劃長遠', '專業', '#155eef', 'og:image']) assert(r.html.includes(k), `網頁缺少「${k}」`);
    assert(!/<script|https?:\/\/fonts\.|<link[^>]+stylesheet/i.test(r.html), '網頁載入了外部資源或程式');
    assert(r.todos.length >= 1 && r.todos.some((t) => /LINE/.test(t)), `待填項目不正確：${r.todos}`);
    assert(!r.services.some((l) => /認識|實用資訊|預約|留言|常見問題/.test(l)), `服務卡片混入功能入口：${r.services}`);
    await go('#/results/website/edit');
    await page.fill('[data-text="website:steps"]', '第一步\n第二步');
    const n = await page.evaluate(async ([w, b]) => { const W = await import(w); const B = await import(b); const st = JSON.parse(localStorage.getItem('brand-studio-v2')); return (W.websiteHTML(st, B.derive(st)).match(/class="step"/g) || []).length; }, [mod('website.js'), mod('brand.js')]);
    assert(n === 2, `合作方式步驟數 ${n}`);
  });

  console.log('LINE 官方帳號');
  await test('六／八格、單／雙頁座標正確；切頁區不占服務格', async () => {
    const out = await page.evaluate(async (u) => {
      const L = await import(u);
      const base = { entries: Array.from({ length: 16 }, (_, i) => ({ label: `入口${i + 1}`, description: '', url: i % 2 ? 'https://example.com' : '' })), pageNames: ['一', '二'] };
      const res = [];
      for (const pages of [1, 2]) for (const count of [6, 8]) for (let p = 0; p < pages; p++) {
        const body = L.richMenuBody({ ...base, pages, count }, p, 'x');
        res.push({ pages, count, p, areas: body.areas, size: body.size });
      }
      return res;
    }, mod('line.js'));
    for (const r of out) {
      const cells = r.areas.filter((a) => a.action.type !== 'richmenuswitch');
      const tabs = r.areas.filter((a) => a.action.type === 'richmenuswitch');
      assert(cells.length === r.count, `${r.pages}頁${r.count}格：服務格數 ${cells.length}`);
      assert(tabs.length === (r.pages === 2 ? 2 : 0), '切頁區數量錯誤');
      assert(r.areas.length <= 20, '超過 20 個點擊區');
      let area = 0;
      for (const a of r.areas) {
        const b = a.bounds;
        assert(b.x >= 0 && b.y >= 0 && b.x + b.width <= 2500 && b.y + b.height <= 1686, '點擊區超出圖片');
        if (r.pages === 2 && a.action.type !== 'richmenuswitch') assert(b.y >= 200, '服務格與切頁區重疊');
        assert(a.action.label.length <= 20, 'label 超過 20 字');
        area += b.width * b.height;
      }
      assert(area === 2500 * 1686, `點擊區沒有剛好鋪滿（${area}）`);
      if (r.pages === 2) assert(r.p === 0 ? cells[0].action.label === '入口1' : cells[0].action.label === '入口9', '第二頁入口錯誤');
    }
    assert(out.filter((r) => r.pages === 2 && r.count === 8).reduce((n, r) => n + r.areas.filter((a) => a.action.type !== 'richmenuswitch').length, 0) === 16, '雙頁八格不是 16 個入口');
  });

  await test('切換格數或頁數不刪除隱藏入口；未設定網址顯示待設定', async () => {
    await go('#/results/lineOA/edit');
    await page.$$eval('details.entry', (ds) => ds.forEach((d) => { d.open = true; }));
    await page.fill('[data-entry="7:label"]', '第八格');
    await page.click('[data-action="line-count"][data-v="6"]');
    await page.click('[data-action="line-count"][data-v="8"]');
    let s = await state();
    assert(s.platforms.lineOA.entries[7].label === '第八格', '隱藏入口被刪除');
    await page.click('[data-action="line-pages"][data-v="2"]');
    await page.click('[data-action="line-pages"][data-v="1"]');
    s = await state();
    assert(s.platforms.lineOA.entries.length === 16, '入口數量改變');
    assert((await page.textContent('.entries')).includes('待設定'), '未顯示待設定');
  });

  await test('入口內容：預設類型、回覆文字、表單程式、貼回網址', async () => {
    const r = await page.evaluate(async ([m, e, l, b]) => {
      const M = await import(m); const E = await import(e); const L = await import(l); const B = await import(b);
      const st = M.sampleHengYuan();
      const line = st.platforms.lineOA;
      const types = Object.fromEntries(line.entries.slice(0, 8).map((x) => [x.label, x.type]));
      const D = B.derive(st);
      const replies = line.entries.slice(0, 8).filter((x) => x.type === 'reply' || x.type === 'chat').map((x) => E.replyValue(D, x, st));
      const script = E.formScript(st, D);
      const forms = E.formEntries(line).map((x) => x.label);
      const before = L.entryAction(line.entries.find((x) => x.type === 'form'));
      const result = ['下午3:01:02\t資訊\tBRAND-STUDIO-RESULT', ...forms.map((f, i) => `${f}|https://docs.google.com/forms/d/e/ABC${i}/viewform?usp=pp_url&entry.1=${encodeURIComponent(f)}`), '@表單|https://docs.google.com/forms/d/e/ABC/viewform', '@回覆試算表|https://docs.google.com/spreadsheets/d/XYZ/edit', '惡意|javascript:alert(1)'].join('\n');
      const parsed = E.parseFormResult(result, line);
      const after = L.entryAction(line.entries.find((x) => x.type === 'form'));
      return { types, replies, script, forms, before, parsed, after, bad: E.parseFormResult('隨便的文字', line) };
    }, [mod('model.js'), mod('entries.js'), mod('line.js'), mod('brand.js')]);
    assert(r.types['預約諮詢'] === 'form' && r.types['留言給我'] === 'chat' && r.types['認識衡遠'] === 'reply', `預設類型錯誤 ${JSON.stringify(r.types)}`);
    assert(r.replies.length >= 4 && r.replies.every((t) => t.trim().length > 10), '回覆文字缺少');
    assert(r.replies.some((t) => t.includes('【待填')), '未知資料沒有用待填');
    assert(r.script.includes('FormApp.create') && r.script.includes('toPrefilledUrl') && r.script.includes('個人資料使用同意'), '表單程式內容不完整');
    for (const f of r.forms) assert(r.script.includes(f), `表單程式缺少入口 ${f}`);
    assert(!/token|Bearer|apiKey/i.test(r.script), '表單程式含憑證字樣');
    assert(r.before.type === 'message', '沒有網址的表單入口不應開啟網址');
    assert(r.parsed.matched.length === r.forms.length && r.parsed.sheet.includes('spreadsheets'), '貼回結果未對應到入口');
    assert(r.after.type === 'uri' && r.after.uri.startsWith('https://docs.google.com/forms/'), '貼回後選單動作未改為表單網址');
    assert(r.bad === null, '無效的貼上內容沒有被拒絕');
  });

  await test('設定引導：自動回應清單可逐筆複製；表單步驟可貼回套用', async () => {
    await page.evaluate(async (u) => { const m = await import(u); localStorage.setItem('brand-studio-v2', JSON.stringify(m.sampleHengYuan())); }, mod('model.js'));
    await go('#/results/lineOA/guide');
    const n = (await page.$$('.reply-list li')).length;
    assert(n >= 4, `自動回應清單只有 ${n} 筆`);
    assert(await page.isVisible('[data-action="copy-form-script"]'), '沒有複製表單程式按鈕');
    const forms = await page.evaluate(async (u) => { const E = await import(u); return E.formEntries(JSON.parse(localStorage.getItem('brand-studio-v2')).platforms.lineOA).map((x) => x.label); }, mod('entries.js'));
    await page.fill('#formResult', ['BRAND-STUDIO-RESULT', ...forms.map((f) => `${f}|https://docs.google.com/forms/d/e/T/viewform?entry.1=${encodeURIComponent(f)}`)].join('\n'));
    await page.click('[data-action="apply-forms"]');
    await page.waitForTimeout(300);
    const st = await state();
    const filled = st.platforms.lineOA.entries.filter((e) => e.type === 'form' && e.url.startsWith('https://docs.google.com/forms/')).length;
    assert(filled === forms.length, `只填入 ${filled}/${forms.length}`);
    await go('#/results/lineOA/edit');
    await page.click('[data-action="entry-type"][data-i="0"][data-v="link"]');
    assert((await state()).platforms.lineOA.entries[0].type === 'link', '切換入口功能失敗');
  });

  await test('備份到雲端：支援分享時送出備份檔；不支援時改為下載；記錄備份時間', async () => {
    await go('#/advanced');
    assert(await page.isVisible('#cloudBtn .dot'), '從未備份時沒有提醒紅點');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cloudBtn')]);
    assert(/^brand-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), `檔名錯誤 ${dl.suggestedFilename()}`);
    const f = path.join(TMP, 'cloud.json');
    await dl.saveAs(f);
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert(data.schemaVersion === 2 && data.identity, '備份檔內容不完整');
    await page.waitForTimeout(200);
    assert((await state()).meta.lastBackupAt, '沒有記錄備份時間');
    assert(!(await page.isVisible('#cloudBtn .dot')), '備份後紅點沒有消失');
    // 模擬手機的分享選單
    const c2 = await browser.newContext();
    await c2.addInitScript(() => {
      window.__shared = null;
      navigator.canShare = (d) => !!d?.files?.length;
      navigator.share = async (d) => { window.__shared = { name: d.files[0].name, size: d.files[0].size }; };
    });
    const p2 = await c2.newPage();
    await p2.goto(BASE + '#/advanced');
    await p2.waitForTimeout(300);
    await p2.click('#cloudBtn');
    await p2.waitForTimeout(300);
    const shared = await p2.evaluate(() => window.__shared);
    assert(shared && shared.size > 100 && shared.name.endsWith('.json'), '沒有透過分享送出備份檔');
    await c2.close();
  });

  console.log('產出與安裝');
  const zips = {};
  await test('五平台素材包 ZIP 可下載並通過完整性檢查', async () => {
    const s = await state();
    s.platforms.lineOA.pages = 2;
    s.identity.brandName = '<script>alert(1)</script>測試';
    s.freeform.style = '<img src=x onerror=alert(1)>';
    await setState(s);
    // 建置中的平台：介面未開放，但保留的產出功能仍要能正常運作
    for (const pid of BUILDING) {
      const b64 = await page.evaluate(async ([u, pid]) => {
        const ex = await import(u);
        const blob = await ex.platformZip(JSON.parse(localStorage.getItem('brand-studio-v2')), pid);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(bin);
      }, [mod('export.js'), pid]);
      const f = path.join(TMP, `${pid}.zip`);
      fs.writeFileSync(f, Buffer.from(b64, 'base64'));
      zips[pid] = f;
    }
    for (const pid of READY) {
      await go(`#/results/${pid}/download`);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="dl-zip"]')]);
      const f = path.join(TMP, `${pid}.zip`);
      await dl.saveAs(f);
      zips[pid] = f;
    }
    const report = execFileSync('python3', ['-I', path.join(__dirname, 'check_zip.py'), ...Object.values(zips)], { encoding: 'utf8' });
    console.log(report.split('\n').map((l) => '      ' + l).join('\n'));
    assert(!report.includes('ERROR'), '素材包檢查失敗');
  });

  await test('網頁與提示詞中的使用者文字不會被當成 HTML 執行', async () => {
    const html = execFileSync('python3', ['-I', '-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);n=[x for x in z.namelist() if x.endswith("index.html")][0];print(z.read(n).decode())', zips.website], { encoding: 'utf8' });
    assert(!html.includes('<script>alert') && html.includes('&lt;script&gt;'), '網頁未跳脫使用者文字');
    const webOk = await page.evaluate(async ([w, b]) => {
      const web = await import(w); const br = await import(b);
      const st = JSON.parse(localStorage.getItem('brand-studio-v2'));
      return !web.websiteHTML(st, br.derive(st)).includes('<img src=x');
    }, [mod('website.js'), mod('brand.js')]);
    assert(webOk, '網頁含未跳脫的 HTML');
  });

  await test('素材與匯出不含權杖或憑證欄位', async () => {
    const all = execFileSync('python3', ['-I', '-c', 'import zipfile,sys\nfor f in sys.argv[1:]:\n  z=zipfile.ZipFile(f)\n  for n in z.namelist():\n    if n.endswith((".json",".txt",".sh",".html")): print(z.read(n).decode())', ...Object.values(zips)], { encoding: 'utf8' });
    assert(!/Bearer [A-Za-z0-9]{20,}|channelSecret|access_token"\s*:/.test(all), '素材含有疑似憑證');
    assert(all.includes('LINE_CHANNEL_ACCESS_TOKEN:?'), '上傳指令未要求從環境變數讀取權杖');
  });

  await test('手機 375px：長名稱、長文字不破版（無水平捲動）', async () => {
    const s = await state();
    s.identity.brandName = '非常非常長的個人品牌名稱測試用三十字以內的名字呀';
    s.identity.slogan = '這是一句很長很長的標語用來測試換行與排版是否正常';
    s.platforms.lineOA.entries[0].label = '超長入口名稱二十字以內的測試名稱喔';
    await setState(s);
    const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
    m.on('pageerror', (e) => errors.push(e.message));
    for (const h of ['#/', '#/profile', '#/design', '#/results/lineOA/preview', '#/results/lineOA/edit', '#/results/website/preview', '#/results/facebook/download', '#/results/instagram/guide', '#/results/threads/prompt', '#/advanced']) {
      await m.goto(BASE + h);
      await m.waitForTimeout(500);
      const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 0, `${h} 水平溢出 ${over}px`);
    }
    await m.close();
  });

  await test('照片上傳後套用到素材；選「不放照片」則不出現', async () => {
    await go('#/profile');
    await page.evaluate((i) => { const s = JSON.parse(localStorage.getItem('brand-studio-v2')); s.meta.qIndex = i; localStorage.setItem('brand-studio-v2', JSON.stringify(s)); }, QI.photo);
    await go('#/profile');
    const png = path.join(TMP, 'face.png');
    execFileSync('python3', ['-I', '-c', 'from PIL import Image;Image.new("RGB",(800,1000),(200,30,30)).save(__import__("sys").argv[1])', png]);
    await page.setInputFiles('#photoFile', png);
    await page.waitForTimeout(600);
    await page.click('[data-action="opt"][data-v="醒目呈現"]');
    const red = async () => page.evaluate(async () => {
      const ex = await import('./js/export.js'); const pl = await import('./js/platforms.js');
      const st = JSON.parse(localStorage.getItem('brand-studio-v2'));
      const D = await ex.prepare(st); const a = pl.assetsFor('facebook', st).find((x) => x.id === 'avatar');
      const c = ex.renderAsset(a, D); const d = c.getContext('2d').getImageData(540, 540, 1, 1).data; return d[0] > 150 && d[1] < 80;
    });
    assert(await red(), '照片未套用到頭像');
    await page.click('[data-action="opt"][data-v="不放照片"]');
    assert(!(await red()), '選不放照片仍出現照片');
  });

  await test('PWA：manifest、圖示與 service worker 快取清單完整', async () => {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const listed = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]);
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(ROOT, path.join(d, e.name))]));
    const files = walk(ROOT).filter((f) => !['sw.js', '_headers'].includes(f) && !f.startsWith('gate/'));
    const missing = files.filter((f) => !listed.includes(f));
    assert(!missing.length, `sw.js 未快取：${missing.join(', ')}`);
    for (const f of listed) assert(fs.existsSync(path.join(ROOT, f)), `sw.js 列了不存在的檔案 ${f}`);
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
    for (const i of man.icons) assert(fs.existsSync(path.join(ROOT, i.src)), `缺少圖示 ${i.src}`);
  });

  await test('PWA：安裝 service worker 後可離線開啟', async () => {
    const c2 = await browser.newContext();
    const p2 = await c2.newPage();
    await p2.goto(BASE);
    await p2.evaluate(() => navigator.serviceWorker.ready);
    await p2.waitForTimeout(500);
    await c2.setOffline(true);
    await p2.reload();
    await p2.waitForTimeout(500);
    assert((await p2.textContent('h1')).includes('讓專業'), '離線無法開啟');
    await p2.goto(BASE + '#/results/lineOA/preview');
    await p2.waitForTimeout(800);
    assert(await p2.isVisible('.phone'), '離線時第三步無法使用');
    await c2.close();
  });

  await test('整個流程沒有 JavaScript 錯誤', async () => {
    assert(!errors.length, errors.join(' | '));
  });

  await browser.close();
  srv.close();
  const fail = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n${results.length - fail.length} / ${results.length} 通過`);
  process.exit(fail.length ? 1 : 0);
})();
