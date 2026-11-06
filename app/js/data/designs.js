// 三種風格提案：差異在版面、字級層級、圖示處理、留白、卡片與裝飾，不只是換色。
export const DESIGNS = [
  {
    id: 'tech',
    name: '專業科技',
    tag: '精準・前瞻・有條理',
    description: '細格網與幾何線條，資訊排列整齊、有層次。',
    rules: ['現代無襯線字體，標題粗、內文細', '細格網背景與幾何轉角線', '圖示置中、細線條', '小圓角（8px 級距）', '透明層次面板，裝飾集中在角落'],
    radius: 0.012, align: 'center', iconFrame: 'none', grid: true, panel: true, cards: 'outline',
  },
  {
    id: 'minimal',
    name: '簡約現代',
    tag: '清楚・俐落・留白',
    description: '放大文字重點、減少裝飾，左對齊閱讀直接。',
    rules: ['現代無襯線字體，大字級對比', '大量白底與留白', '文字與圖示左對齊', '直角與細分隔線', '不使用漸層與光效，只用一條主色線'],
    radius: 0, align: 'left', iconFrame: 'none', grid: false, panel: false, cards: 'divider',
  },
  {
    id: 'friendly',
    name: '親和專業',
    tag: '親近・柔和・安心',
    description: '大圓角卡片與柔和色塊，讓服務顯得容易接近。',
    rules: ['現代無襯線字體，字重適中', '大圓角卡片（24px 級距）', '圖示放在圓形淺色底上', '柔和淺色塊分區', '不使用卡通人物或可愛插圖'],
    radius: 0.05, align: 'center', iconFrame: 'circle', grid: false, panel: false, cards: 'soft',
  },
];

export const DESIGN_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d]));
