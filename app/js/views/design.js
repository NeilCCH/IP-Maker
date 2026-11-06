// 第二步：選喜歡的樣子——同一份品牌資料，三種風格的實際素材並排比較
import { DESIGNS } from '../data/designs.js';
import { derive, avoidSummary } from '../brand.js';
import { prepare } from '../export.js';
import { proposalBoard } from '../draw.js';
import { store, commit, save } from '../store.js';
import { esc, toast } from '../util.js';
import { icon } from './common.js';
import { PLATFORM_BY_ID } from '../platforms.js';

const S = () => store.state;

export function render(root) {
  const s = S();
  const D = derive(s);
  const rules = avoidSummary(D);
  root.innerHTML = `
  <div class="page-head"><p class="eyebrow">第二步</p><h1 tabindex="-1">選喜歡的樣子</h1>
  <p class="lead">同一份品牌資料，套用三種不同風格。直接看圖比較——版面、字級、圖示、留白和卡片都不同，不只是換顏色。之後隨時可以回來換，不會影響你填的內容。</p></div>
  <div class="card applied">
    <p><b>三款都已套用你的設定</b></p>
    <ul class="tags">
      <li>配色：${esc(D.palette.name)}${D.palette.auto ? '（系統建議）' : ''}</li>
      <li>照片：${D.photoMode === 'none' ? (s.photo ? '不放照片' : '未上傳，使用文字標誌') : D.photoMode === 'hero' ? '醒目呈現' : '適度呈現'}</li>
      ${rules.map((r) => `<li>${esc(r)}</li>`).join('')}
    </ul>
    ${D.nameIsPlaceholder ? `<p class="hint warn-text">還沒有品牌名稱或姓名，圖上暫時顯示「你的品牌」。<a href="#/profile" data-action="goto-q" data-q="name">去填寫 →</a></p>` : ''}
  </div>
  <div class="proposals">
  ${DESIGNS.map((d, i) => {
    const on = s.selectedDesignId === d.id;
    return `<article class="card proposal ${on ? 'is-selected' : ''}">
      <canvas data-board="${d.id}" width="900" height="1240" role="img" aria-label="${esc(d.name)}風格提案：歡迎圖卡、圖文選單、頭像與貼文"></canvas>
      <div class="proposal-body">
        <h2>${String(i + 1).padStart(2, '0')} ${esc(d.name)}</h2>
        <p class="tagline">${esc(d.tag)}</p>
        <p>${esc(d.description)}</p>
        <details><summary>這款的設計規則</summary><ul>${d.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>
        <button type="button" class="btn ${on ? 'selected' : 'primary'}" data-action="design-pick" data-id="${d.id}" aria-pressed="${on}">${on ? `${icon('shield', 'ic sm')} 已選用` : '選用這個風格'}</button>
      </div>
    </article>`;
  }).join('')}
  </div>
  <div class="card">
    <label class="field"><span>想調整的地方（選填）</span><textarea data-design-notes rows="3" maxlength="3000" placeholder="例如：標題再大一點、少一點線條…">${esc(s.designNotes)}</textarea></label>
    <p class="hint">這段文字會保存並帶入提示詞，交給外部 AI 或設計夥伴處理。目前系統不會自動理解文字並改圖。</p>
  </div>
  <div class="actions-row"><a class="btn ghost" href="#/profile">← 回第一步修改</a><a class="btn primary" href="#/results/${s.meta.target}/preview">下一步：查看 ${esc(PLATFORM_BY_ID[s.meta.target].name)} 成果 →</a></div>`;
  paintBoards(root);
}

async function paintBoards(root) {
  for (const d of DESIGNS) {
    const cv = root.querySelector(`canvas[data-board="${d.id}"]`);
    if (!cv) continue;
    const D = await prepare(S(), d.id);
    proposalBoard(cv.getContext('2d'), cv.width, cv.height, D, S().platforms.lineOA);
    await new Promise((r) => setTimeout(r, 0));
  }
}

export function onAction(act, el) {
  if (act === 'design-pick') {
    S().selectedDesignId = el.dataset.id;
    commit();
    toast(`已選用「${DESIGNS.find((d) => d.id === el.dataset.id).name}」，所有素材都會套用`);
    return true;
  }
  if (act === 'goto-q') {
    S().meta.qIndex = Math.max(0, ['traits', 'audience', 'expertise', 'services', 'tone', 'style', 'palette', 'photo', 'avoid', 'naming', 'name', 'display', 'contact'].indexOf(el.dataset.q));
    save();
    return false; // 讓連結照常跳轉
  }
  return false;
}

export function onInput(el) {
  if (el.dataset.designNotes === undefined) return false;
  S().designNotes = el.value.slice(0, 3000);
  save();
  return true;
}
