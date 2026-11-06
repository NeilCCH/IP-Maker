// 第一步「說說你自己」題庫。每題都有常駐的自由回答欄。
// type: single 單選 / multi 多選（max 為上限）/ palette 色卡 / order 排序 / photo / name / display / contact

export const SERVICE_CATALOG = [
  { label: '認識我', description: '個人介紹與服務理念（經歷、資格請本人填寫）' },
  { label: '保單健檢', description: '保單整理與檢視，協助看懂現有保障' },
  { label: '退休規劃', description: '退休生活與現金流規劃說明、需求填寫' },
  { label: '企業風險', description: '企業與經營風險檢視、諮詢需求' },
  { label: '家庭保障', description: '家庭保障整理、需求填寫' },
  { label: '醫療長照', description: '醫療與長照保障說明' },
  { label: '資產傳承', description: '傳承規劃的基本觀念與諮詢' },
  { label: '理賠協助', description: '理賠流程與文件準備說明' },
  { label: '實用資訊', description: '文章分類與實用清單' },
  { label: '預約諮詢', description: '留下預約需求；時段由本人人工確認' },
  { label: '常見問題', description: '常見服務問答' },
  { label: '留言給我', description: '請直接在聊天室輸入訊息，由本人回覆' },
];

export const QUESTIONS = [
  {
    id: 'traits', type: 'multi', max: 2, short: '個人特質',
    title: '希望客戶第一眼怎麼形容你？',
    options: ['專業可靠', '親切好聊', '沉穩安心', '年輕有活力', '細膩有溫度', '思路清楚有效率'],
  },
  {
    id: 'audience', type: 'multi', max: 2, short: '主要客群',
    title: '你最想服務哪一類客戶？',
    options: ['年輕人與社會新鮮人', '新婚與新手爸媽', '成熟家庭', '退休與準退休者', '企業主與自營業者', '不限定'],
  },
  {
    id: 'expertise', type: 'multi', max: 2, short: '服務專長',
    title: '你最擅長協助客戶什麼？',
    options: ['保單整理', '退休生活與現金流', '資產傳承', '企業與家庭風險', '醫療與長照保障', '理賠與日常服務'],
  },
  {
    id: 'services', type: 'order', max: 16, short: '服務順序',
    title: '你的服務入口，想依什麼順序排列？',
    hint: '依序點選，數字就是排列順序；再點一次可取消。前 8 項會放在 LINE 選單第一頁。',
    options: SERVICE_CATALOG.map((s) => s.label),
  },
  {
    id: 'tone', type: 'single', short: '文字語氣',
    title: '跟客戶說話時，你希望是什麼語氣？',
    options: ['專業直接', '穩重親切', '簡短俐落', '交由系統建議'],
    examples: {
      專業直接: '您好，我是〇〇，協助您把保障與退休安排說清楚。',
      穩重親切: '謝謝您加入，有想釐清的安排，都歡迎慢慢聊。',
      簡短俐落: '您好，請從下方選單選擇服務，或直接留言。',
      交由系統建議: '依你的個人特質自動搭配。',
    },
    hint: '補充欄可以直接寫下你想用的歡迎詞，系統會優先使用。',
  },
  {
    id: 'style', type: 'single', short: '視覺風格',
    title: '整體看起來，你想要哪種感覺？',
    options: ['專業科技', '簡潔俐落', '沉穩精緻', '親切自然', '交由系統搭配'],
    examples: {
      專業科技: '細線、格網、幾何層次',
      簡潔俐落: '大量留白、大字重點',
      沉穩精緻: '節制配色、細緻排版',
      親切自然: '圓角、柔和色塊',
      交由系統搭配: '依特質與客群建議',
    },
  },
  {
    id: 'palette', type: 'palette', short: '配色',
    title: '哪一組顏色最像你？',
    hint: '每組都附特質說明。與你的「避免事項」衝突的色卡會標示出來。',
  },
  {
    id: 'photo', type: 'photo', short: '照片',
    title: '你的照片要怎麼出現？',
    options: ['醒目呈現', '適度呈現', '不放照片', '交由系統建議'],
    hint: '照片只存在這台裝置，不會上傳。未上傳照片時，所有素材都不會出現虛構的人像。',
  },
  {
    id: 'avoid', type: 'multi', max: 9, short: '避免事項',
    title: '有哪些設計是你不喜歡的？',
    hint: '可複選。這些禁忌會套用到三種風格提案、所有素材與提示詞。',
    options: ['過度金色', '米白復古配色', '古典襯線字體', '山景風景意象', '卡通可愛', '過多科技光效', '文字擁擠', '制式保險廣告感', '沒有特別限制'],
  },
  {
    id: 'naming', type: 'single', short: '命名方向',
    title: '如果要取一個個人品牌名稱，希望給人什麼感覺？',
    options: ['穩健安心', '理性前瞻', '人生從容', '交由系統搭配'],
    hint: '下一題會依這個方向與你的專長提出名稱提案。已有名稱也可以直接到下一題填寫。',
  },
  {
    id: 'name', type: 'name', short: '品牌名稱',
    title: '你的個人品牌叫什麼？',
    hint: '可以輸入既有名稱，或從系統提案中挑選。提案未查核同名或商標權利，正式使用前請自行確認。',
  },
  {
    id: 'display', type: 'display', short: '名稱呈現',
    title: '在各平台上，名稱要怎麼呈現？',
    options: ['姓名', '姓名加定位', '個人品牌名稱', '交由系統建議'],
  },
  {
    id: 'contact', type: 'contact', short: '聯絡資料',
    title: '要放哪些聯絡方式？（都可以先留白）',
    hint: '沒填的欄位會在素材中標示「待填」，系統不會自己編造。',
  },
];

export const Q_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

export function selectionLabel(q) {
  if (q.type === 'single' || q.type === 'photo' || q.type === 'display') return '單選';
  if (q.type === 'palette') return '單選・可交由系統';
  if (q.type === 'order') return '多選・依點選順序排列';
  if (q.type === 'multi') return q.max >= q.options.length - 1 ? '可複選' : `多選・最多 ${q.max} 項`;
  if (q.type === 'name') return '輸入或選擇提案';
  return '選填';
}
