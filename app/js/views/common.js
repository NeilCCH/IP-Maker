import { ICON_PATHS } from '../draw.js';
import { prepare, renderAsset } from '../export.js';
import { assetsFor } from '../platforms.js';
import { store } from '../store.js';
import { esc } from '../util.js';

export const icon = (name, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICON_PATHS[name] || ICON_PATHS.doc}"/></svg>`;

export const badge = (status, text) => `<span class="st st-${status}">${status === 'done' ? icon('shield', 'ic sm') : ''}${esc(text)}</span>`;

let paintToken = 0;
/** 把畫面上的 canvas[data-asset="平台:素材"] 依目前資料繪製；同一份程式用於下載 */
export async function paintAssets(root, designId) {
  const token = ++paintToken;
  const D = await prepare(store.state, designId);
  if (token !== paintToken) return;
  for (const cv of root.querySelectorAll('canvas[data-asset]')) {
    const [pid, aid] = cv.dataset.asset.split(':');
    const asset = assetsFor(pid, store.state).find((a) => a.id === aid);
    if (asset) renderAsset(asset, D, cv);
  }
}

export function assetFigure(pid, a) {
  return `<figure class="asset ${a.round ? 'round' : ''}" style="--ar:${a.w}/${a.h}">
    <div class="asset-frame"><canvas data-asset="${pid}:${a.id}" width="${a.w}" height="${a.h}" role="img" aria-label="${esc(a.label)}預覽"></canvas>${a.safe ? '<span class="safe-zone" aria-hidden="true"></span>' : ''}</div>
    <figcaption><b>${esc(a.label)}</b><span>${a.w}×${a.h}${a.note ? `・${esc(a.note)}` : ''}</span></figcaption>
  </figure>`;
}
