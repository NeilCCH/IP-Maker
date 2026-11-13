import { PLATFORMS, isReady, isTarget, targetName, AI_TARGET } from '../platforms.js';
import { store, commit } from '../store.js';
import { esc } from '../util.js';
import { icon } from './common.js';

const S = () => store.state;

export function render(root) {
  const s = S();
  const started = s.meta.started;
  const target = isTarget(s.meta.target) ? s.meta.target : PLATFORMS.find((p) => isReady(p.id)).id;
  root.innerHTML = `
  <section class="home">
    <p class="eyebrow">個人品牌工作台</p>
    <h1 tabindex="-1">讓專業，擁有自己的樣子</h1>
    <p class="lead">回答幾個簡單的問題，系統會用同一份品牌資料，幫你做好社群平台的品牌素材。不需要懂設計或技術。</p>
    <h2 class="pick-title">先選擇要建立的項目</h2>
    <div class="platform-pick" role="radiogroup" aria-label="要建立的項目">
      ${[...PLATFORMS, AI_TARGET].map((p) => {
        if (p.id === AI_TARGET.id) {
          const on = target === p.id;
          return `<button type="button" class="pick" role="radio" aria-checked="${on}" data-action="pick-platform" data-id="${p.id}">${icon(p.icon)}<b>${esc(p.name)}</b><small>${esc(p.summary)}</small><span class="st ${on ? 'st-done' : 'st-none'}">${on ? '已選擇' : '可建立'}</span></button>`;
        }
        if (!isReady(p.id))
          return `<div class="pick is-building" aria-disabled="true">${icon(p.icon)}<b>${esc(p.name)}</b><small>${esc(p.summary)}</small><span class="st st-none">建置中</span></div>`;
        const on = p.id === target;
        return `<button type="button" class="pick" role="radio" aria-checked="${on}" data-action="pick-platform" data-id="${p.id}">${icon(p.icon)}<b>${esc(p.name)}</b><small>${esc(p.summary)}</small><span class="st ${on ? 'st-done' : 'st-none'}">${on ? '已選擇' : '可建立'}</span></button>`;
      }).join('')}
    </div>
    <p class="hint">其他平台建置中，完成後會陸續開放。你填的品牌資料之後可以直接沿用，不必重填。</p>
    <a class="btn primary big" href="#/profile">${started ? '繼續建立' : '開始建立'}我的 ${esc(targetName(target))} →</a>
    ${started ? '<p class="hint">你的進度已保存在這台裝置。</p>' : ''}
    <ol class="three-steps">
      <li class="card"><span class="step-no">1</span><h2>說說你自己</h2><p>一題一題選，也可以直接打字。約 10 分鐘。</p></li>
      <li class="card"><span class="step-no">2</span><h2>選喜歡的樣子</h2><p>看三種風格的實際素材，選一個最像你的。</p></li>
      <li class="card"><span class="step-no">3</span><h2>連接並完成</h2><p>下載素材、複製文案，照步驟完成設定。</p></li>
    </ol>
    <p class="note">${icon('shield', 'ic sm')} 免費使用・資料只存在這台裝置・不會代你登入或發文</p>
  </section>`;
}

export function onAction(act, el) {
  if (act !== 'pick-platform') return false;
  S().meta.target = el.dataset.id;
  commit();
  return true;
}
