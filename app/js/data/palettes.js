// 配色：每組都附顏色組合與風格特質；hues 用於比對使用者禁忌
export const PALETTES = [
  { id: 'electric', name: '冷白・電光藍・青藍', primary: '#155eef', accent: '#08b8d8', bg: '#edf5ff', ink: '#0f2747', traits: '精準、現代、清楚，適合專業科技感', hues: ['blue', 'cyan'] },
  { id: 'ocean', name: '白・海藍・水青', primary: '#176b87', accent: '#2fb3bd', bg: '#ecf9fb', ink: '#0d3340', traits: '清爽、有條理、親近，適合理性又好溝通', hues: ['blue', 'cyan', 'teal'] },
  { id: 'graphite', name: '冷白・石墨・亮藍', primary: '#334155', accent: '#3b74f0', bg: '#f1f5f9', ink: '#111827', traits: '簡潔、效率、克制，適合俐落直接', hues: ['gray', 'blue'] },
  { id: 'violet', name: '白・紫・青藍', primary: '#5b3fd0', accent: '#1aa6c4', bg: '#f4f0ff', ink: '#221a4d', traits: '創意、前瞻、有辨識度', hues: ['purple', 'cyan'] },
  { id: 'coral', name: '白・靛藍・珊瑚', primary: '#3f4bc9', accent: '#e0634b', bg: '#f1f2ff', ink: '#1b2050', traits: '積極、明快、有個性', hues: ['indigo', 'blue', 'orange', 'red'] },
  { id: 'forest', name: '白・松綠・薄荷', primary: '#1f6f5c', accent: '#3fb58f', bg: '#eef8f4', ink: '#123a31', traits: '穩定、自然、讓人安心', hues: ['green', 'teal'] },
  { id: 'clay', name: '白・陶土・杏橘', primary: '#8c5136', accent: '#cf7f45', bg: '#fff5ed', ink: '#3a2216', traits: '溫暖、有生活感', hues: ['brown', 'orange', 'cream'] },
  { id: 'berry', name: '白・莓紫・藕粉', primary: '#8e3f6c', accent: '#c06fa2', bg: '#fff1f8', ink: '#3b1830', traits: '溫和、細心、柔軟', hues: ['pink', 'purple'] },
];

export const AUTO_PALETTE = { id: 'auto', name: '交由系統建議', traits: '依你選的風格與禁忌，自動挑一組不衝突的配色' };

/** 使用者自由文字中的顏色字 → 色系代碼 */
export const HUE_WORDS = [
  [/金|香檳/, 'gold'],
  [/米白|米色|奶油/, 'cream'],
  [/紫/, 'purple'],
  [/粉|桃/, 'pink'],
  [/橘|橙/, 'orange'],
  [/紅/, 'red'],
  [/綠/, 'green'],
  [/咖啡|棕|褐|陶/, 'brown'],
  [/灰|石墨/, 'gray'],
  [/青|水藍|湖水/, 'cyan'],
  [/深藍|藏青|海軍藍/, 'navy'],
  [/(?<!深|水|海軍)藍/, 'blue'],
];

export const HUE_NAMES = { gold: '金色', cream: '米白', purple: '紫色', pink: '粉色', orange: '橘色', red: '紅色', green: '綠色', brown: '棕色', gray: '灰色', cyan: '青色', navy: '深藍', blue: '藍色', teal: '青綠', indigo: '靛藍' };
