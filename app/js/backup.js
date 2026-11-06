// 備份到雲端：用手機內建的「分享」把備份檔存到 Google 雲端硬碟、iCloud、LINE Keep 等。
// 不需要任何帳號設定；不支援分享的裝置改為下載檔案，再由使用者上傳到雲端硬碟。
import { exportJSON } from './model.js';
import { download, toast, today } from './util.js';

export const REMIND_DAYS = 7;

export function backupFileName() {
  return `brand-backup-${today()}.json`;
}

export function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86_400_000) : null;
}

export function backupStatus(state) {
  const d = daysSince(state.meta.lastBackupAt);
  if (d === null) return { text: '尚未備份到雲端', due: !!state.meta.started };
  return { text: d === 0 ? '今天已備份' : `上次備份：${d} 天前`, due: d >= REMIND_DAYS };
}

/** 回傳 'shared'（已透過分享送出）、'downloaded'（已下載檔案）或 'cancelled' */
export async function cloudBackup(state) {
  const name = backupFileName();
  const data = exportJSON(state);
  for (const type of ['application/json', 'text/plain']) {
    const file = new File([data], name, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '品牌實驗室進度備份', text: '品牌實驗室進度備份檔，需要時可在 APP「進階工具 → 匯入進度」還原。' });
        return 'shared';
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancelled';
        // 分享失敗（例如不支援此檔案類型）→ 繼續嘗試下一種或改為下載
      }
    }
  }
  download(name, data, 'application/json');
  return 'downloaded';
}

export function backupMessage(result) {
  if (result === 'shared') return '已送出備份。請確認已存到 Google 雲端硬碟、iCloud 或 LINE Keep。';
  if (result === 'downloaded') return '已下載備份檔。請把它上傳到 Google 雲端硬碟保存。';
  return '';
}

export function notifyBackup(result) {
  const m = backupMessage(result);
  if (m) toast(m);
}
