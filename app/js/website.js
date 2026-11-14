// 個人網頁：產出可直接部署的單一 index.html（不載入任何外部資源；所有使用者文字都經過跳脫）。
import { esc, safeURL } from './util.js';
import { textValue } from './copy.js';
import { isPH } from './brand.js';
import { ICON_PATHS, iconFor } from './draw.js';

const SANS = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Heiti TC",system-ui,sans-serif';
const FONT_CSS = {
  '現代黑體・俐落': { head: SANS, hw: 700, bw: 400 },
  '粗黑體・有力量': { head: SANS, hw: 900, bw: 400, tight: true },
  '圓體・親切': { head: `"Yuanti TC","jf-openhuninn","Noto Sans TC",${SANS}`, hw: 700, bw: 400 },
  '細黑體・輕盈': { head: SANS, hw: 300, bw: 400, big: true },
  '明體・典雅': { head: `"Songti TC","Noto Serif TC","PMingLiU",serif`, hw: 700, bw: 400 },
  '手寫感・有溫度': { head: `"Hannotate TC","Kaiti TC","DFKai-SB",${SANS}`, hw: 700, bw: 400 },
  '標題粗、內文細': { head: SANS, hw: 900, bw: 300 },
  '數字用等寬字・科技感': { head: SANS, hw: 700, bw: 400, mono: true },
};

const DESIGN_CSS = {
  tech: `.hero{background-image:linear-gradient(90deg,var(--grid) 1px,transparent 1px),linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(140deg,#fff,var(--bg));background-size:36px 36px,36px 36px,auto}
.card,.step{border:1px solid var(--line);border-radius:10px;background:#fff}.card .ico{color:var(--primary)}
.photo{border-radius:14px;box-shadow:18px 18px 0 -2px var(--bg),18px 18px 0 0 var(--accent)}
.kw span{border:1px solid var(--primary);border-radius:6px}.step b{color:var(--accent)}.cta{background:var(--ink)}`,
  minimal: `.hero{background:#fff}.hero-text{border-left:6px solid var(--primary);padding-left:24px}
.cards{gap:0 32px}.card{border-top:1px solid var(--line);border-radius:0;padding:26px 0;background:transparent}.card .ico{color:var(--ink)}
.photo{border-radius:0}.kw span{border-bottom:2px solid var(--primary);border-radius:0;padding:2px 0;margin-right:20px}
.step{border-top:3px solid var(--ink);padding:18px 0 0}.about{border-left:1px solid var(--line)}.cta{background:var(--primary)}`,
  friendly: `.hero{background:var(--bg);border-radius:0 0 56px 56px}
.card,.step{border-radius:24px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.07)}.card .ico{background:var(--bg);color:var(--primary);border-radius:50%;padding:10px;width:52px;height:52px}
.photo{border-radius:36px}.kw span{background:#fff;border-radius:99px}.steps-sec{background:var(--bg);border-radius:40px}
.about{background:var(--bg);border-radius:32px}.cta{background:var(--primary);border-radius:40px;margin:0 16px 32px}`,
};

const svg = (name) => `<svg class="ico" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name] || ICON_PATHS.doc}"/></svg>`;
const field = (v) => (isPH(v) ? `<span class="todo">${esc(v)}</span>` : esc(v));
const lines = (text) => String(text).split('\n').map((l) => l.trim()).filter(Boolean);

const META_ENTRY = /認識|關於|實用資訊|文章|預約|留言|常見問題|聯絡|需求填寫|活動|服務協助/;

/** 網頁上的服務卡片：只取真正的服務項目（排除選單用的功能入口） */
export function siteServices(D) {
  const real = D.services.filter((e) => e.label && !META_ENTRY.test(e.label));
  if (real.length) return real.slice(0, 6);
  return D.expertise.map((x) => ({ label: x, description: '歡迎聯絡我，了解我能怎麼協助你。', url: '', type: 'reply' }));
}

/** 上線前還沒填的地方（給 APP 提醒用） */
export function websiteTodos(state, D) {
  const html = websiteHTML(state, D);
  return [...new Set([...html.matchAll(/【待填：([^】]+)】/g)].map((m) => m[1]))];
}

export function websiteHTML(state, D) {
  const t = (k) => textValue(state, D, 'website', k);
  const p = D.palette;
  const c = D.contact;
  const F = FONT_CSS[D.font] || FONT_CSS['現代黑體・俐落'];
  const lineUrl = safeURL(c.line) || safeURL(state.platforms.lineOA.oaUrl);
  const booking = D.services.find((e) => /預約/.test(e.label) && safeURL(e.url));
  const mainCta = booking ? { href: safeURL(booking.url), label: '預約諮詢', ext: true } : lineUrl ? { href: lineUrl, label: '加入 LINE 聊聊', ext: true } : { href: '#contact', label: '聯絡我' };
  const ctaBtn = (cls = '') => `<a class="btn ${cls}" href="${esc(mainCta.href)}"${mainCta.ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${mainCta.label}</a>`;
  const contacts = [
    lineUrl ? `<a class="btn" href="${esc(lineUrl)}" target="_blank" rel="noopener noreferrer">加入 LINE 官方帳號</a>` : '<span class="todo">【待填：LINE 官方帳號網址】</span>',
    booking ? `<a class="btn ghost" href="${esc(safeURL(booking.url))}" target="_blank" rel="noopener noreferrer">填寫預約表單</a>` : '',
    c.phone ? `<a class="btn ghost" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">電話 ${esc(c.phone)}</a>` : '',
    c.email ? `<a class="btn ghost" href="mailto:${esc(c.email)}">寫信給我</a>` : '',
  ].filter(Boolean).join('');
  const hasPhoto = !!(D.photo && D.showPhoto);
  const mono = esc([...(D.brandName || D.personName || '品')][0]);
  const services = siteServices(D);
  const steps = lines(t('steps')).slice(0, 4);
  const favicon = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${p.primary}"/><text x="32" y="44" font-size="34" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${mono}</text></svg>`)}`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(D.titleName)}｜${esc(D.positioning)}</title>
<meta name="description" content="${esc(t('heroText'))}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(D.titleName)}｜${esc(D.positioning)}">
<meta property="og:description" content="${esc(t('heroText'))}">
<meta property="og:image" content="og.png">
<meta name="theme-color" content="${p.primary}">
<link rel="icon" href="${favicon}">
<style>
:root{--primary:${p.primary};--accent:${p.accent};--bg:${p.bg};--ink:${p.ink};--line:#dbe4ee;--muted:#526173;--grid:${p.accent}1a}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;font-family:${SANS};font-weight:${F.bw};color:var(--ink);background:#fff;line-height:1.8;font-size:17px}
p,li{text-wrap:pretty}.who,.slogan,.sub{text-wrap:balance}h1,h2,h3{text-wrap:balance;font-family:${F.head};font-weight:${F.hw};line-height:1.3${F.tight ? ';letter-spacing:-.01em' : ''}}
${F.mono ? '.num,.step b{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}' : ''}
a{color:var(--primary)}:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header.nav{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.nav-in{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:60px}
.nav-in b{color:var(--primary);font-size:19px;font-family:${F.head}}
.nav-in nav{display:flex;align-items:center;gap:4px}.nav-in nav a{color:var(--ink);text-decoration:none;font-size:15px;padding:10px 8px}
.nav-in nav a.btn{color:#fff;padding:0 16px;min-height:40px;margin-left:6px}
@media(max-width:560px){.nav-in nav a:not(.btn){display:none}}
.hero{padding:56px 0}.hero-in{display:grid;gap:36px;align-items:center}
.hero h1{font-size:clamp(${F.big ? 44 : 38}px,7vw,${F.big ? 72 : 60}px);margin:0 0 14px;color:var(--primary)}
.hero .who{font-size:clamp(19px,2.6vw,24px);font-weight:600;margin:0 0 10px;line-height:1.5}
.hero .lead{color:var(--muted);margin:0 0 18px}.hero .slogan{font-size:19px;font-weight:700;margin:0 0 26px}
.kw{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 26px;padding:0;list-style:none}.kw span{display:inline-block;padding:4px 14px;font-size:15px;font-weight:600;color:var(--primary)}
.photo{width:100%;max-width:380px;aspect-ratio:4/5;object-fit:cover;object-position:50% 18%;display:block;margin:0 auto}
.mono{width:132px;height:132px;border-radius:28px;display:grid;place-items:center;background:var(--primary);color:#fff;font-size:68px;font-weight:700;margin-bottom:24px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 28px;border-radius:999px;background:var(--primary);color:#fff;text-decoration:none;font-weight:700;margin:0 8px 8px 0;transition:transform .15s,opacity .15s}
.btn:hover{opacity:.9}.btn:active{transform:scale(.98)}.btn.ghost{background:#fff;color:var(--primary);border:1.5px solid var(--primary)}.btn.light{background:#fff;color:var(--ink)}
section{padding:64px 0}h2{font-size:clamp(26px,4vw,34px);margin:0 0 8px}.sub{color:var(--muted);margin:0 0 28px}
.cards{display:grid;gap:16px}.card{padding:24px}.card h3{margin:12px 0 6px;font-size:20px}.card p{margin:0;color:var(--muted);font-size:16px}.card a{display:inline-block;margin-top:10px;font-weight:600;text-decoration:none}
.steps{display:grid;gap:16px;list-style:none;padding:0;margin:0}.step{padding:22px}.step b{display:block;font-size:30px;line-height:1;margin-bottom:10px}.step p{margin:0}
.steps-sec>.wrap{padding-top:8px;padding-bottom:8px}
.about{padding:32px}.about p{white-space:pre-line;margin:0}
.aud{background:var(--bg);border-radius:16px;padding:20px 24px;margin-top:24px}.aud p{margin:0}.aud b{color:var(--primary)}
.cta{color:#fff;text-align:center;padding:56px 20px}.cta h2{color:#fff;margin-bottom:20px}.cta p{opacity:.9;margin:0 0 20px}
.contact{text-align:center}.contact .btn{margin:6px}
.todo{display:inline-block;background:#fff7d6;color:#7a5a00;border:1px dashed #e0b400;border-radius:6px;padding:0 6px;font-weight:400}
footer{padding:28px 20px;text-align:center;color:var(--muted);font-size:14px;border-top:1px solid var(--line)}
@media(min-width:760px){.hero{padding:88px 0}.hero-in.has-photo{grid-template-columns:1.15fr .85fr}.cards{grid-template-columns:repeat(${services.length === 4 || services.length === 2 ? 2 : 3},1fr)}.steps{grid-template-columns:repeat(${steps.length || 3},1fr)}section{padding:80px 0}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn{transition:none}}
${DESIGN_CSS[D.design.id] || ''}
</style>
</head>
<body>
<header class="nav"><div class="wrap nav-in"><b>${esc(D.titleName)}</b><nav aria-label="主選單"><a href="#services">服務</a><a href="#how">合作方式</a><a href="#about">關於我</a><a href="#contact">聯絡</a>${ctaBtn()}</nav></div></header>
<main>
<div class="hero"><div class="wrap hero-in${hasPhoto ? ' has-photo' : ''}">
  <div class="hero-text">${hasPhoto ? '' : `<div class="mono" aria-hidden="true">${mono}</div>`}
    <h1>${esc(t('heroTitle'))}</h1>
    ${D.whoami ? `<p class="who">${esc(D.whoami)}</p>` : ''}
    <p class="lead">${field(t('heroText'))}</p>
    ${D.keywords.length ? `<ul class="kw" aria-label="品牌關鍵字">${D.keywords.map((k) => `<li><span>${esc(k)}</span></li>`).join('')}</ul>` : ''}
    ${D.slogan ? `<p class="slogan">「${esc(D.slogan)}」</p>` : ''}
    ${ctaBtn()}<a class="btn ghost" href="#services">看看我能協助什麼</a>
  </div>
  ${hasPhoto ? `<img class="photo" src="${esc(D.photo)}" alt="${esc(D.personName || D.titleName)}">` : ''}
</div></div>
<section id="services"><div class="wrap"><h2>我能協助的事</h2><p class="sub">${esc(D.positioning)}</p>
  <div class="cards">${services.map((e, i) => `<article class="card">${svg(iconFor(e.label, i))}<h3>${esc(e.label)}</h3><p>${esc(e.description)}</p>${safeURL(e.url) ? `<a href="${esc(safeURL(e.url))}" target="_blank" rel="noopener noreferrer">${e.type === 'form' ? '填寫需求' : '了解更多'} →</a>` : ''}</article>`).join('')}</div>
  ${D.audience.length || D.audiencePain ? `<div class="aud"><p><b>我主要服務：</b>${esc(D.audience.join('、') || '想把規劃理清楚的你')}${D.audiencePain ? `<br>${esc(D.audiencePain)}` : ''}</p></div>` : ''}
</div></section>
<section id="how" class="steps-sec"><div class="wrap"><h2>合作方式</h2><p class="sub">不急著做決定，先把狀況弄清楚。</p>
  <ol class="steps">${steps.map((s, i) => `<li class="step"><b class="num">${String(i + 1).padStart(2, '0')}</b><p>${field(s)}</p></li>`).join('')}</ol>
</div></section>
<section id="about"><div class="wrap"><h2>關於我</h2><div class="about"><p>${lines(t('about')).map(field).join('\n')}</p></div></div></section>
<div class="cta"><h2>${esc(D.slogan || '把重要的事，提早想清楚')}</h2><p>${field(t('cta'))}</p>${ctaBtn('light')}</div>
<section id="contact" class="contact"><div class="wrap"><h2>聯絡我</h2><p class="sub">選一個方便的方式，由我本人回覆。</p><div>${contacts}</div>${c.area ? `<p>服務地區：${esc(c.area)}</p>` : ''}</div></section>
</main>
<footer>© ${new Date().getFullYear()} ${esc(D.titleName)}${D.personName && D.personName !== D.titleName ? `｜${esc(D.personName)}` : ''}。本頁為個人服務說明，不構成任何保證；實際保障內容以保單條款為準。</footer>
</body>
</html>`;
}
