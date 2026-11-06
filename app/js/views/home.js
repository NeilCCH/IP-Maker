import { PLATFORMS } from '../platforms.js';
import { store } from '../store.js';
import { esc } from '../util.js';
import { icon } from './common.js';

export function render(root) {
  const started = store.state.meta.started;
  root.innerHTML = `
  <section class="home">
    <p class="eyebrow">個人品牌工作台</p>
    <h1 tabindex="-1">讓專業，擁有自己的樣子</h1>
    <p class="lead">回答幾個簡單的問題，系統會用同一份品牌資料，幫你做好五個平台的品牌素材。不需要懂設計或技術。</p>
    <a class="btn primary big" href="#/profile">${started ? '繼續建立我的品牌' : '開始建立我的品牌'} →</a>
    ${started ? '<p class="hint">你的進度已保存在這台裝置。</p>' : ''}
    <ol class="three-steps">
      <li class="card"><span class="step-no">1</span><h2>說說你自己</h2><p>一題一題選，也可以直接打字。約 10 分鐘。</p></li>
      <li class="card"><span class="step-no">2</span><h2>選喜歡的樣子</h2><p>看三種風格的實際素材，選一個最像你的。</p></li>
      <li class="card"><span class="step-no">3</span><h2>連接並完成</h2><p>下載素材、複製文案，照步驟設定到各平台。</p></li>
    </ol>
    <ul class="platform-row" aria-label="包含的五個平台">
      ${PLATFORMS.map((p) => `<li>${icon(p.icon)}<b>${esc(p.name)}</b><small>${esc(p.summary)}</small></li>`).join('')}
    </ul>
    <p class="note">${icon('shield', 'ic sm')} 免費使用・資料只存在這台裝置・不會代你發文或登入任何帳號</p>
  </section>`;
}
