// LINE 圖文選單：版面座標是唯一來源，PNG、點擊區設定檔、對照圖都用同一套計算。
// 規格依 LINE Messaging API（richmenu 2500×1686、areas ≤20、action label ≤20 字），實作前應再查核官方最新文件。
import { safeURL } from './util.js';
import { TYPE_NAME, LINE_URI_MAX } from './entries.js';

export const RM_W = 2500;
export const RM_H = 1686;
export const TAB_H = 200;

export const pageEntries = (line, p) => line.entries.slice(p * 8, p * 8 + line.count);

/** 某頁的服務格與切頁區座標 */
export function layout(line, p) {
  const tab = line.pages === 2 ? TAB_H : 0;
  const cols = line.count === 6 ? 3 : 4;
  const rows = 2;
  const cells = pageEntries(line, p).map((entry, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = Math.round((c * RM_W) / cols), x2 = Math.round(((c + 1) * RM_W) / cols);
    const y = tab + Math.round((r * (RM_H - tab)) / rows), y2 = tab + Math.round(((r + 1) * (RM_H - tab)) / rows);
    return { index: p * 8 + i, entry, x, y, w: x2 - x, h: y2 - y };
  });
  const tabs = tab ? [0, 1].map((t) => ({ page: t, x: t * (RM_W / 2), y: 0, w: RM_W / 2, h: tab, name: line.pageNames[t] })) : [];
  return { cols, rows, tab, cells, tabs };
}

/** 每次發佈用一組新的切頁代號，不覆蓋舊選單正在使用的 alias（失敗時舊選單不受影響） */
export const releaseId = () => Date.now().toString(36);
export const aliasId = (p, rel = 'r1') => `bs-${String(rel).replace(/[^a-z0-9]/g, '').slice(0, 12) || 'r1'}-p${p + 1}`;

const usesUrl = (e) => e.type === 'form' || e.type === 'link';
const validUri = (e) => { const u = safeURL(e.url); return u && u.length <= LINE_URI_MAX ? u : null; };

/** 表單／連結且網址有效 → 開啟網址；其他 → 送出入口名稱文字（對應後台自動回應的關鍵字） */
export function entryAction(e) {
  const label = (e.label || '服務').slice(0, 20);
  const uri = usesUrl(e) ? validUri(e) : null;
  return uri ? { type: 'uri', label, uri } : { type: 'message', label, text: (e.label || '我想留言').slice(0, 300) };
}

/** 每個入口目前的狀態：連結 / 文字回覆（需在後台設定關鍵字回應） */
export function entryStatus(e) {
  const kw = (e.label || '').slice(0, 20);
  if (usesUrl(e)) {
    if (e.url && !safeURL(e.url)) return { kind: 'invalid', text: '網址格式不正確（只接受 https:// 開頭）' };
    if (e.url && safeURL(e.url).length > LINE_URI_MAX) return { kind: 'invalid', text: `網址太長（LINE 上限 ${LINE_URI_MAX} 字元）` };
    if (safeURL(e.url)) return { kind: 'link', text: `${TYPE_NAME[e.type]}：點擊開啟網址` };
    return { kind: 'pending', text: `待設定：還沒有${e.type === 'form' ? '表單' : ''}網址，目前點擊會送出「${kw}」` };
  }
  return { kind: 'reply', text: `${TYPE_NAME[e.type] || '文字回覆'}：點擊會送出「${kw}」，需在後台把關鍵字「${kw}」設定為自動回應` };
}

export function richMenuBody(line, p, brandName, rel = 'r1') {
  const L = layout(line, p);
  const areas = L.cells.map((c) => ({ bounds: { x: c.x, y: c.y, width: c.w, height: c.h }, action: entryAction(c.entry) }));
  for (const t of L.tabs)
    areas.push({ bounds: { x: t.x, y: t.y, width: t.w, height: t.h }, action: { type: 'richmenuswitch', label: (t.name || `第${t.page + 1}頁`).slice(0, 20), richMenuAliasId: aliasId(t.page, rel), data: `page=${t.page + 1}` } });
  return {
    size: { width: RM_W, height: RM_H },
    selected: true,
    name: `${(brandName || 'brand').slice(0, 200)}-p${p + 1}`.slice(0, 300),
    chatBarText: '我的服務',
    areas,
  };
}

export function richMenuConfig(line, brandName, rel = 'r1') {
  return {
    notice: '設定範本，尚未建立到任何 LINE 帳號。未設定網址的入口會送出入口名稱文字，需在官方帳號後台另外設定關鍵字自動回應。雙頁切換需使用 Messaging API 建立 alias。',
    pages: Array.from({ length: line.pages }, (_, p) => ({ alias: aliasId(p, rel), image: `richmenu-page-${p + 1}.png`, body: richMenuBody(line, p, brandName, rel) })),
  };
}

/** 給主持人／夥伴在自己電腦執行的上傳指令。權杖只從環境變數讀取，不寫進檔案。
 *  流程：全部檢查 → 全部建立 → 全部上傳圖片 → 建立新的切頁代號 → 最後才切換預設選單。
 *  中途失敗會刪除這次建立的半成品，原本的選單與切頁代號完全不動。 */
export function apiScript(line, imageExt = 'png', rel = 'r1') {
  const mime = imageExt === 'jpg' ? 'image/jpeg' : 'image/png';
  const pages = Array.from({ length: line.pages }, (_, p) => p + 1);
  const two = line.pages === 2;
  return `#!/usr/bin/env bash
# 品牌工作室：LINE 圖文選單上傳指令（進階，主持人／支援夥伴使用）
# 狀態：依 Messaging API 文件撰寫並通過本機模擬測試，尚未在真實官方帳號驗證，請先用測試帳號執行。
# 用法：
#   1. 在 LINE Developers 取得此官方帳號的 Channel access token
#   2. 在終端機輸入： export LINE_CHANNEL_ACCESS_TOKEN='你的權杖'   （不要寫進任何檔案）
#   3. 在本資料夾執行： bash upload-richmenu.sh
# 安全設計：最後一步才切換預設選單；中途失敗會刪除這次建立的選單，原本的選單不受影響。
set -euo pipefail
: "\${LINE_CHANNEL_ACCESS_TOKEN:?請先 export LINE_CHANNEL_ACCESS_TOKEN}"
cd "$(dirname "$0")"
API=https://api.line.me/v2/bot
DATA=https://api-data.line.me/v2/bot
AUTH="Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN"
JSON='Content-Type: application/json'
CREATED_MENUS=""
CREATED_ALIASES=""
DONE=0

cleanup() {
  if [ "$DONE" = "1" ]; then return; fi
  echo "✗ 中途失敗：正在刪除這次建立的半成品，原本的選單沒有被更動。"
  for a in $CREATED_ALIASES; do curl -sS -X DELETE "$API/richmenu/alias/$a" -H "$AUTH" > /dev/null || true; done
  for m in $CREATED_MENUS; do curl -sS -X DELETE "$API/richmenu/$m" -H "$AUTH" > /dev/null || true; done
  echo "  已清除。修正問題後可以重新執行。"
}
trap cleanup EXIT

echo "→ 記錄目前的預設選單（回復用）"
curl -sS "$API/user/all/richmenu" -H "$AUTH" > rollback-default-richmenu.json || true

echo "→ 第 1 階段：檢查所有頁面設定"
${pages.map((n) => `curl -sS -f -X POST "$API/richmenu/validate" -H "$AUTH" -H "$JSON" -d @richmenu-page-${n}.json > /dev/null`).join('\n')}

echo "→ 第 2 階段：建立選單並上傳圖片"
${pages.map((n) => `ID${n}=$(curl -sS -f -X POST "$API/richmenu" -H "$AUTH" -H "$JSON" -d @richmenu-page-${n}.json | sed -E 's/.*"richMenuId"[[:space:]]*:[[:space:]]*"([^"]+)".*/\\1/')
case "$ID${n}" in richmenu-*) ;; *) echo "無法取得第 ${n} 頁的 richMenuId"; exit 1;; esac
CREATED_MENUS="$CREATED_MENUS $ID${n}"
echo "  第 ${n} 頁 richMenuId: $ID${n}"
curl -sS -f -X POST "$DATA/richmenu/$ID${n}/content" -H "$AUTH" -H "Content-Type: ${mime}" --data-binary @richmenu-page-${n}.${imageExt} > /dev/null`).join('\n')}
${two ? `
echo "→ 第 3 階段：建立這次發佈專用的切頁代號"
${pages.map((n) => `curl -sS -f -X POST "$API/richmenu/alias" -H "$AUTH" -H "$JSON" -d "{\\"richMenuAliasId\\":\\"${aliasId(n - 1, rel)}\\",\\"richMenuId\\":\\"$ID${n}\\"}" > /dev/null
CREATED_ALIASES="$CREATED_ALIASES ${aliasId(n - 1, rel)}"`).join('\n')}
` : ''}
echo "→ 最後階段：設為所有好友的預設選單"
curl -sS -f -X POST "$API/user/all/richmenu/$ID1" -H "$AUTH" > /dev/null
DONE=1
echo "完成。請用手機打開官方帳號聊天室，逐格點擊確認${two ? '，並測試上方切頁' : ''}。"
echo "回復方式：rollback-default-richmenu.json 記錄了原本的預設選單 ID，可用 POST $API/user/all/richmenu/{該ID} 設回；原本的選單與切頁代號都還在。"
echo "舊選單確認不再需要後，可到 LINE 後台或用 API 刪除。"
`;
}
