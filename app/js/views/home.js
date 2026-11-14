// 首頁：品牌問卷只做一次；做完後在第三步選擇要製作的項目，之後隨時可以回來做別的
import { PLATFORMS, isReady, AI_TARGET } from '../platforms.js';
import { QUESTIONS } from '../data/questions.js';
import { store } from '../store.js';
import { esc } from '../util.js';
import { icon } from './common.js';

export function render(root) {
  const s = store.state;
  const started = s.meta.started;
  const done = s.meta.profileDone === true;
  const cta = done
    ? '<a class="btn primary big" href="#/results">選擇要製作的項目 →</a><p class="hint">你的品牌資料已經建立。想修改答案，可以回到「① 說說你自己」。</p>'
    : `<a class="btn primary big" href="#/profile">${started ? '繼續建立我的品牌' : '開始建立我的品牌'} →</a>${started ? '<p class="hint">你的進度已保存在這台裝置。</p>' : ''}`;
  root.innerHTML = `
  <section class="home">
    <p class="eyebrow">個人品牌工作台</p>
    <h1 tabindex="-1">讓專業，擁有自己的樣子</h1>
    <p class="lead">先回答一次品牌問卷，之後想做哪個平台、哪種工具，都用同一份資料，不必重填。不需要懂設計或技術。</p>
    ${cta}
    <ol class="three-steps">
      <li class="card"><span class="step-no">1</span><h2>說說你自己</h2><p>${QUESTIONS.length} 題品牌問卷，只需要做一次。一題一題選，也可以直接打字。</p></li>
      <li class="card"><span class="step-no">2</span><h2>選喜歡的樣子</h2><p>看三種風格的實際素材，選一個最像你的。</p></li>
      <li class="card"><span class="step-no">3</span><h2>選擇要製作的項目</h2><p>做完一個，隨時可以回來做下一個。</p></li>
    </ol>
    <h2 class="pick-title">問卷完成後，可以製作這些項目</h2>
    <ul class="platform-row" aria-label="可以製作的項目">
      ${[...PLATFORMS, AI_TARGET].map((p) => `<li class="${p.id === AI_TARGET.id || isReady(p.id) ? '' : 'is-building'}">${icon(p.icon)}<b>${esc(p.name)}</b><small>${p.id === AI_TARGET.id || isReady(p.id) ? esc(p.summary) : '建置中，完成後開放'}</small></li>`).join('')}
    </ul>
    <p class="note">${icon('shield', 'ic sm')} 免費使用・資料只存在這台裝置・不會代你登入或發文</p>
  </section>`;
}
