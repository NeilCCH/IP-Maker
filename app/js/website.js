// 個人網頁：產出可直接部署的單一 index.html（所有使用者文字都經過跳脫）。
import { esc, safeURL } from './util.js';
import { textValue } from './copy.js';
import { isPH } from './brand.js';

const DESIGN_CSS = {
  tech: `.hero{background-image:linear-gradient(90deg,var(--grid) 1px,transparent 1px),linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(140deg,#fff,var(--bg));background-size:32px 32px,32px 32px,auto;text-align:center}
.hero .mark{margin:0 auto 20px}.card{border:1px solid var(--line);border-radius:8px;background:#fff}.card::before{content:"";display:block;width:28px;height:3px;background:var(--accent);margin-bottom:14px}`,
  minimal: `.hero{background:#fff;border-left:6px solid var(--primary);text-align:left}.hero .mark{margin:0 0 20px}
.cards{gap:0}.card{border-top:1px solid var(--line);border-radius:0;padding:24px 0;background:transparent}.about{border-top:1px solid var(--line)}`,
  friendly: `.hero{background:var(--bg);border-radius:0 0 48px 48px;text-align:center}.hero .mark{margin:0 auto 20px}
.card{border-radius:24px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.06)}.about{background:var(--bg);border-radius:32px}`,
};

function field(v) {
  return isPH(v) ? `<span class="todo">${esc(v)}</span>` : esc(v);
}

export function websiteHTML(state, D) {
  const t = (k) => textValue(state, D, 'website', k);
  const p = D.palette;
  const c = D.contact;
  const lineUrl = safeURL(c.line) || safeURL(state.platforms.lineOA.oaUrl);
  const contacts = [
    lineUrl ? `<a class="btn" href="${esc(lineUrl)}" rel="noopener">加入 LINE 官方帳號</a>` : '<span class="todo">【待填：LINE 官方帳號網址】</span>',
    c.phone ? `<a class="btn ghost" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">電話 ${esc(c.phone)}</a>` : '',
    c.email ? `<a class="btn ghost" href="mailto:${esc(c.email)}">Email</a>` : '',
  ].filter(Boolean).join('');
  const markHTML = D.photo && D.showPhoto
    ? `<img class="mark photo${D.photoMode === 'hero' ? ' big' : ''}" src="${D.photo}" alt="${esc(D.personName || D.titleName)} 的照片">`
    : `<div class="mark" aria-hidden="true">${esc([...(D.brandName || D.personName || '品')][0])}</div>`;
  const services = D.services.filter((e) => e.label && !/留言給我|常見問題/.test(e.label)).slice(0, 6);
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(D.titleName)}｜${esc(D.positioning)}</title>
<meta name="description" content="${esc(t('heroText'))}">
<meta property="og:title" content="${esc(D.titleName)}">
<meta property="og:description" content="${esc(t('heroText'))}">
<meta property="og:image" content="og.png">
<style>
:root{--primary:${p.primary};--accent:${p.accent};--bg:${p.bg};--ink:${p.ink};--line:#dbe4ee;--grid:${p.accent}1a}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
p,li{text-wrap:pretty}h1,h2{text-wrap:balance}
body{margin:0;font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.75}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
header.nav{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;max-width:960px;margin:0 auto}
header.nav b{color:var(--primary);font-size:18px}header.nav a{color:var(--ink);text-decoration:none;font-size:15px;margin-left:16px}
.hero{padding:64px 24px}.hero h1{font-size:clamp(34px,7vw,56px);line-height:1.2;margin:0 0 12px;color:var(--primary);letter-spacing:.02em}
.hero p.lead{font-size:18px;margin:0 0 8px}.hero p.slogan{font-size:20px;font-weight:700;margin:16px 0 28px}
.mark{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:var(--primary);color:#fff;font-size:34px;font-weight:700}
.mark.photo{object-fit:cover;object-position:50% 20%;border-radius:14px;width:120px;height:150px;background:none}.mark.big{width:200px;height:250px}
.btn{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:999px;background:var(--primary);color:#fff;text-decoration:none;font-weight:700;margin:6px}
.btn.ghost{background:#fff;color:var(--primary);border:1.5px solid var(--primary)}
section{padding:48px 0}h2{font-size:26px;margin:0 0 20px}
.cards{display:grid;gap:16px}.card{padding:22px}.card h3{margin:0 0 6px;font-size:19px;color:var(--primary)}.card p{margin:0;color:#475569}
.about{padding:32px}.about p{white-space:pre-line;margin:0}
.contact{text-align:center}.todo{display:inline-block;background:#fff7d6;color:#7a5a00;border:1px dashed #e0b400;border-radius:6px;padding:0 6px}
footer{padding:28px 20px;text-align:center;color:#64748b;font-size:14px;border-top:1px solid var(--line)}
@media(min-width:720px){.cards{grid-template-columns:1fr 1fr}.hero{padding:96px 64px}}
${DESIGN_CSS[D.design.id] || ''}
</style>
</head>
<body>
<header class="nav"><b>${esc(D.titleName)}</b><nav><a href="#services">服務</a><a href="#about">關於我</a><a href="#contact">聯絡</a></nav></header>
<main>
<div class="hero">${markHTML}<h1>${esc(t('heroTitle'))}</h1><p class="lead">${field(t('heroText'))}</p>${D.slogan ? `<p class="slogan">${esc(D.slogan)}</p>` : ''}<a class="btn" href="#contact">聯絡我</a></div>
<div class="wrap">
<section id="services"><h2>我能協助的事</h2><div class="cards">${services.map((e) => `<article class="card"><h3>${esc(e.label)}</h3><p>${esc(e.description)}</p>${safeURL(e.url) ? `<p><a href="${esc(safeURL(e.url))}" target="_blank" rel="noopener noreferrer">了解更多 →</a></p>` : ''}</article>`).join('')}</div></section>
<section id="about"><h2>關於我</h2><div class="about"><p>${t('about').split('\n').map(field).join('\n')}</p></div></section>
<section id="contact" class="contact"><h2>聯絡我</h2><p>${field(t('cta'))}</p><div>${contacts}</div>${c.area ? `<p>服務地區：${esc(c.area)}</p>` : ''}</section>
</div>
</main>
<footer>© ${esc(D.titleName)}｜個人品牌網站。本頁內容為個人服務說明，不構成任何保證。</footer>
</body>
</html>`;
}
