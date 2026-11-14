// 進階工具：備份、匯入、全部素材、品牌資料、範例、清除——收在這裡，避免干擾初學者
import { migrate, exportJSON, sampleHengYuan, fresh, SCHEMA_VERSION } from '../model.js';
import { allZip, brandKit, prepare } from '../export.js';
import { derive } from '../brand.js';
import { store, replaceState } from '../store.js';
import { download, toast, today } from '../util.js';
import { icon } from './common.js';
import { backupStatus } from '../backup.js';

const S = () => store.state;

export function render(root) {
  root.innerHTML = `
  <div class="page-head"><p class="eyebrow">進階工具</p><h1 tabindex="-1">備份、匯入與進階功能</h1><p class="lead">給想要備份資料、換裝置，或協助同仁設定的主持人與支援夥伴使用。</p></div>
  <div class="adv-grid">
    <section class="card"><h2>${icon('link', 'ic sm')} 備份到雲端</h2>
      <p>你的資料只存在這台裝置。建議每次修改後備份一次，存到 Google 雲端硬碟、iCloud 或 LINE Keep。</p>
      <p><b>${backupStatus(S()).text}</b></p>
      <button type="button" class="btn primary" data-action="cloud-backup">備份到雲端</button>
      <ol class="small-steps"><li>手機：按下後會跳出分享選單，選「雲端硬碟」「iCloud 雲碟」或「LINE Keep」。</li><li>電腦：會下載備份檔，把它拖進 Google 雲端硬碟。</li><li>還原：在右邊「進度備份」按「匯入進度」，手機上可以直接從雲端硬碟選檔案。</li></ol>
      <p class="hint">備份檔包含你的照片與所有回答，請存在只有自己能看的地方。</p></section>
    <section class="card"><h2>${icon('shield', 'ic sm')} 進度備份</h2>
      <p>資料只存在這台裝置的瀏覽器。換手機、清除瀏覽器資料前，請先匯出備份。</p>
      <div class="row"><button type="button" class="btn primary" data-action="export-json">匯出進度（JSON）</button>
      <label class="btn ghost file-btn"><input type="file" id="importFile" class="sr-only" accept="application/json,.json" aria-label="匯入進度檔">匯入進度</label></div>
      <p class="hint">可匯入：本 APP 的進度檔（版本 ${SCHEMA_VERSION}）、舊版展示版的「品牌設計進度.json」、舊版「共用品牌資料.json」。檔案有誤時不會動到目前進度。</p></section>
    <section class="card"><h2>${icon('doc', 'ic sm')} 全部素材包</h2>
      <p>已開放平台的圖片、文案、提示詞與設定引導，加上進度備份，一次打包成 ZIP。</p>
      <button type="button" class="btn primary" data-action="dl-all">下載全部素材包</button></section>
    <section class="card"><h2>${icon('link', 'ic sm')} 共用品牌資料</h2>
      <p>結構化的品牌核心（不含照片原檔、不含任何帳號憑證），可交給外部 AI 或日後新平台使用。</p>
      <button type="button" class="btn ghost" data-action="dl-kit">下載品牌資料（JSON）</button></section>
    <section class="card"><h2>${icon('star', 'ic sm')} 範例資料</h2>
      <p>載入「衡遠」測試範例（退休規劃・企業與家庭風險／專業科技風）。這只是範例，不是預設人格。</p>
      <button type="button" class="btn ghost" data-action="load-sample">載入範例（會取代目前進度）</button></section>
    <section class="card"><h2>${icon('chat', 'ic sm')} LINE 八格／雙頁選單（主持人用）</h2>
      <p>官方後台的現成版型最多 6 格，也不支援切頁。八格與雙頁需透過 Messaging API 建立。</p>
      <ol class="small-steps"><li>同仁在 LINE Developers 為自己的官方帳號啟用 Messaging API，取得 Channel access token。</li><li>下載該同仁的 LINE 素材包，裡面有 <code>upload-richmenu.sh</code>、選單圖與設定檔。</li><li>在電腦終端機設定環境變數後執行指令（權杖不會寫入任何檔案）。</li><li>用手機逐格點擊、測試切頁；指令會記錄原預設選單以便回復。</li></ol>
      <p class="hint">此指令依官方文件撰寫，尚未在真實官方帳號驗證，請先用測試帳號執行。由 APP 直接代設需要安全的後端服務，屬第二階段。</p></section>
    <section class="card danger-zone"><h2>清除此裝置的資料</h2>
      <p>會刪除這台裝置上的所有回答、照片與設定。建議先匯出備份。</p>
      <button type="button" class="btn danger" data-action="reset-all">清除全部資料</button></section>
  </div>
  <section class="card"><h2>關於資料與限制</h2><ul class="plain">
    <li>所有資料只存在這台裝置；APP 不會上傳照片或回答，也不會登入任何平台。</li>
    <li>素材由規則式版型即時繪製，不是 AI 生圖；需要 AI 生圖時，請使用各平台的「提示詞」。</li>
    <li>各平台素材尺寸為常見建議值，平台可能調整，上傳時以後台提示為準。</li>
    <li>名稱提案未查核同名或商標權利，正式使用前請自行確認。</li>
  </ul></section>`;
}

export async function onAction(act, el) {
  switch (act) {
    case 'export-json': download(`brand-backup-${today()}.json`, exportJSON(S()), 'application/json'); toast('已匯出進度'); return true;
    case 'dl-all':
      el.disabled = true; el.textContent = '打包中…';
      try { download(`brand-assets-all-${today()}.zip`, await allZip(S())); toast('已開始下載'); }
      catch (e) { console.error(e); toast('打包失敗，請再試一次'); }
      finally { el.disabled = false; el.textContent = '下載全部素材包'; }
      return true;
    case 'dl-kit': { const D = await prepare(S()); download('brand-kit.json', JSON.stringify(brandKit(S(), D), null, 2), 'application/json'); return true; }
    case 'load-sample': if (confirm('載入範例會取代目前進度。建議先匯出備份，確定要載入嗎？')) { replaceState(sampleHengYuan()); toast('已載入衡遠範例'); } return true;
    case 'reset-all': if (confirm('確定清除這台裝置上的所有品牌資料？此動作無法復原。')) { replaceState(fresh()); toast('已清除'); location.hash = '#/'; } return true;
    default: return false;
  }
}

export async function onChange(el) {
  if (el.id !== 'importFile') return false;
  const f = el.files[0];
  el.value = '';
  if (!f) return true;
  if (f.size > 5_000_000) return toast('檔案太大，不像是進度檔'), true;
  let next;
  try {
    next = migrate(JSON.parse(await f.text()));
  } catch (e) {
    toast(`無法匯入：${e.message && /[一-鿿]/.test(e.message) ? e.message : '檔案格式不正確'}。目前進度沒有變動。`);
    return true;
  }
  if (!confirm('匯入會取代目前進度，確定嗎？')) return true;
  replaceState(next);
  toast('進度已匯入');
  return true;
}
