// 第一步「說說你自己」題庫。每題都有常駐的自由回答欄。
// type: words 圈詞 / keywords 四個我與關鍵字 / single 單選 / multi 多選（max 為上限）/ palette 色卡 / order 排序 / photo / name / display / contact
// 「四個我」與「品牌 CIS 九宮格」的架構參考個人品牌課程學習單整理而成。

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

/** 「看見自己，也看見別人眼中的你」詞庫：4 類 × 12 詞 */
export const WORD_GROUPS = [
  { name: '個性特質', words: ['沉穩', '熱情', '細心', '樂觀', '幽默', '溫柔', '果斷', '直率', '內斂', '有活力', '冷靜', '隨和'] },
  { name: '做事風格', words: ['有條理', '有效率', '負責', '積極', '有創意', '追求完美', '務實', '有耐心', '行動力強', '彈性', '謹慎', '專注'] },
  { name: '與人相處', words: ['親切', '善於傾聽', '值得信任', '體貼', '真誠', '好溝通', '有同理心', '樂於分享', '照顧人', '有親和力', '會鼓勵人', '讓人安心'] },
  { name: '專業形象', words: ['專業', '可靠', '有遠見', '懂得多', '有說服力', '講解清楚', '有主見', '穩重', '有品味', '有質感', '有影響力', '細膩'] },
];
export const ALL_WORDS = WORD_GROUPS.flatMap((g) => g.words);

export const QUESTIONS = [
  // ---------- 認識自己：四個我 ----------
  {
    id: 'selfWords', type: 'words', max: 6, section: '認識自己', short: '自己圈的詞',
    title: '先自己圈：哪些詞最像你？',
    hint: '憑直覺選 6 個。不用想太久，選你覺得「這就是我」的詞。',
  },
  {
    id: 'partnerWords', type: 'words', max: 6, section: '認識自己', short: '夥伴圈的詞', optional: true,
    title: '換夥伴圈：在別人眼中，你是什麼樣的人？',
    hint: '把手機交給同事、主管或家人，請他幫你選 6 個。暫時找不到人可以先跳過，之後再回來補。',
  },
  {
    id: 'keywords', type: 'keywords', max: 3, section: '認識自己', short: '品牌關鍵字',
    title: '整理四個我，選出 3 個品牌關鍵字',
    hint: '系統已經幫你把兩人圈的詞分好類。「開放我」是兩人都圈到的，最有說服力，建議優先從這裡選。',
  },
  // ---------- 我服務誰 ----------
  {
    id: 'audience', type: 'multi', max: 3, section: '我服務誰', short: '主要客群',
    title: '你最想服務哪一類客戶？',
    hint: '補充欄請寫下他們的年齡、處境，以及他們在煩惱什麼。',
    placeholder: '例如：50–60 歲、孩子剛獨立，擔心退休後錢不夠用，又怕醫療開銷…',
    options: ['年輕人與社會新鮮人', '新婚與新手爸媽', '成熟家庭', '退休與準退休者', '企業主與自營業者', '高資產族群', '醫師、律師等專業人士', '單身與頂客族', '不限定'],
  },
  {
    id: 'expertise', type: 'multi', max: 3, section: '我服務誰', short: '服務專長',
    title: '你最擅長協助客戶什麼？',
    options: ['保單整理', '退休生活與現金流', '資產傳承', '企業與家庭風險', '醫療與長照保障', '理賠與日常服務', '子女教育金', '外幣與投資型保單', '財富規劃觀念'],
  },
  {
    id: 'services', type: 'order', max: 16, section: '我服務誰', short: '服務順序',
    title: '你的服務入口，想依什麼順序排列？',
    hint: '依序點選，數字就是排列順序；再點一次可取消。前 8 項會放在 LINE 選單第一頁。',
    options: SERVICE_CATALOG.map((s) => s.label),
  },
  // ---------- 品牌語言：我怎麼說話 ----------
  {
    id: 'tone', type: 'single', section: '我怎麼說話', short: '我的語氣',
    title: '跟客戶說話時，你希望是什麼語氣？',
    options: ['專業直接', '穩重親切', '簡短俐落', '溫暖貼心', '熱情積極', '幽默輕鬆', '理性分析', '正式禮貌', '交由系統建議'],
    examples: {
      專業直接: '您好，我是〇〇，協助您把保障與退休安排說清楚。',
      穩重親切: '謝謝您加入，有想釐清的安排，都歡迎慢慢聊。',
      簡短俐落: '您好，請從下方選單選擇服務，或直接留言。',
      溫暖貼心: '謝謝您願意來到這裡，有任何擔心都可以跟我說。',
      熱情積極: '歡迎加入！一起把重要的事安排好吧！',
      幽默輕鬆: '嗨～保險不一定很嚴肅，有問題歡迎來聊聊。',
      理性分析: '先把現況整理清楚，再一起看最適合的選擇。',
      正式禮貌: '您好，感謝您加入，敬請從下方選單選擇所需服務。',
      交由系統建議: '依你的品牌關鍵字自動搭配。',
    },
    extra: { id: 'toneOrder', label: '說話的順序', options: ['先講重點', '先鋪陳再講重點', '看情況調整'] },
    hint: '像朋友聊天，還是像顧問分析？補充欄可以直接寫下你想用的歡迎詞，系統會優先使用。',
  },
  {
    id: 'avoid', type: 'multi', max: 9, section: '我怎麼說話', short: '三個不要',
    title: '你的三個「不要」：絕對不想出現的用詞、調性、視覺',
    hint: '可複選。補充欄請各寫一個：用詞（例如「保證獲利」）、調性（例如「推銷感」）、視覺（例如「卡通」）。',
    placeholder: '用詞：…\n調性：…\n視覺：…',
    options: ['過度金色', '米白復古配色', '古典襯線字體', '山景風景意象', '卡通可愛', '過多科技光效', '文字擁擠', '制式保險廣告感', '沒有特別限制'],
  },
  // ---------- 品牌視覺：我長什麼樣 ----------
  {
    id: 'style', type: 'single', section: '我長什麼樣', short: '視覺風格',
    title: '整體看起來，你想要哪種感覺？',
    options: ['專業科技', '簡潔俐落', '沉穩精緻', '親切自然', '溫暖人文', '活力明亮', '時尚質感', '清新療癒', '交由系統搭配'],
    examples: {
      專業科技: '細線、格網、幾何層次',
      簡潔俐落: '大量留白、大字重點',
      沉穩精緻: '節制配色、細緻排版',
      親切自然: '圓角、柔和色塊',
      溫暖人文: '暖色調、生活感',
      活力明亮: '明快配色、有精神',
      時尚質感: '深淺對比、俐落有型',
      清新療癒: '淡雅綠色、放鬆感',
      交由系統搭配: '依關鍵字與客群建議',
    },
  },
  {
    id: 'palette', type: 'palette', section: '我長什麼樣', short: '我的色彩',
    title: '哪一組顏色最像你？',
    hint: '每組都附特質說明。已經有自己的色碼，選「自訂色彩」填入主色、輔助色、底色。與禁忌衝突的色卡會標示出來。',
  },
  {
    id: 'font', type: 'single', section: '我長什麼樣', short: '我的字型',
    title: '標題和內文，你想要什麼感覺的字？',
    hint: '會寫進品牌規範與提示詞。目前 APP 產出的圖片使用裝置內建的現代黑體。',
    options: ['現代黑體・俐落', '粗黑體・有力量', '圓體・親切', '細黑體・輕盈', '明體・典雅', '手寫感・有溫度', '標題粗、內文細', '數字用等寬字・科技感', '交由系統建議'],
  },
  {
    id: 'imagery', type: 'multi', max: 3, section: '我長什麼樣', short: '圖像風格',
    title: '你的照片和圖片，想要什麼調性？',
    hint: '最多選 3 個。補充欄可以寫構圖偏好，或要不要用插圖。',
    options: ['明亮自然光', '專業形象照', '工作日常・生活感', '戶外運動・休閒', '簡潔幾何圖形', '數據圖表感', '手繪插圖', '只用圖示不放人物', '交由系統建議'],
  },
  {
    id: 'photo', type: 'photo', section: '我長什麼樣', short: '照片',
    title: '你的照片要怎麼出現？',
    options: ['醒目呈現', '適度呈現', '只放在頭像', '不放照片', '交由系統建議'],
    examples: {
      醒目呈現: '照片放大，是畫面主角',
      適度呈現: '照片和文字各占一部分',
      只放在頭像: '其他圖片只用文字',
      不放照片: '全部用文字標誌',
      交由系統建議: '有照片就適度呈現',
    },
    hint: '照片只存在這台裝置，不會上傳。未上傳照片時，所有素材都不會出現虛構的人像。',
  },
  {
    id: 'signature', type: 'multi', max: 3, section: '我長什麼樣', short: '識別方式',
    title: '別人怎麼一眼認出是你？',
    hint: '最多選 3 個固定出現的元素，每次發文、做圖都會保留。',
    options: ['固定頭像', '名字文字標', '品牌 Logo', '固定標語', '固定主色', '固定開場白', '固定結尾簽名', '固定版型', '固定圖示符號'],
  },
  // ---------- 名稱與核心 ----------
  {
    id: 'naming', type: 'single', section: '我是誰', short: '命名方向',
    title: '如果要取一個個人品牌名稱，希望給人什麼感覺？',
    options: ['穩健安心', '理性前瞻', '人生從容', '溫暖陪伴', '專業權威', '家庭守護', '傳承永續', '簡潔好記', '交由系統搭配'],
    hint: '下一題會依這個方向與你的專長提出名稱提案。已有名稱也可以直接到下一題填寫。',
  },
  {
    id: 'name', type: 'name', section: '我是誰', short: '品牌核心',
    title: '品牌核心：我是誰？我的一句話？',
    hint: '品牌名稱、一句話介紹自己、標語。提案未查核同名或商標權利，正式使用前請自行確認。',
  },
  {
    id: 'display', type: 'display', section: '我是誰', short: '名稱呈現',
    title: '在各平台上，名稱要怎麼呈現？',
    options: ['姓名', '姓名加定位', '姓名加職稱', '姓氏加稱謂', '個人品牌名稱', '品牌加姓名', '交由系統建議'],
    examples: {
      姓名: '王小明',
      姓名加定位: '王小明｜退休規劃',
      姓名加職稱: '王小明｜資深規劃顧問',
      姓氏加稱謂: '王顧問（取職稱最後兩字）',
      個人品牌名稱: '衡遠',
      品牌加姓名: '衡遠｜王小明',
      交由系統建議: '有品牌名稱就用品牌',
    },
  },
  {
    id: 'contact', type: 'contact', section: '我是誰', short: '聯絡資料',
    title: '要放哪些聯絡方式？（都可以先留白）',
    hint: '沒填的欄位會在素材中標示「待填」，系統不會自己編造。',
  },
];

export const Q_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const qIndexOf = (id) => Math.max(0, QUESTIONS.findIndex((q) => q.id === id));

/** 不在題目清單中、但仍需保存的答案（舊版欄位與附屬選項） */
export const EXTRA_ANSWER_IDS = ['traits', 'toneOrder'];

export function selectionLabel(q) {
  if (q.type === 'single' || q.type === 'photo' || q.type === 'display') return '單選';
  if (q.type === 'palette') return '單選・可自訂色碼';
  if (q.type === 'order') return '多選・依點選順序排列';
  if (q.type === 'words') return `圈 ${q.max} 個${q.optional ? '・可先跳過' : ''}`;
  if (q.type === 'keywords') return `選 ${q.max} 個關鍵字`;
  if (q.type === 'multi') return q.max >= q.options.length - 1 ? '可複選' : `多選・最多 ${q.max} 項`;
  if (q.type === 'name') return '輸入或選擇提案';
  return '選填';
}

/** 四個我：自己圈的詞與夥伴圈的詞交叉比對 */
export function johari(selfWords, partnerWords) {
  const s = new Set(selfWords), p = new Set(partnerWords);
  return {
    open: ALL_WORDS.filter((w) => s.has(w) && p.has(w)),
    blind: ALL_WORDS.filter((w) => p.has(w) && !s.has(w)),
    hidden: ALL_WORDS.filter((w) => s.has(w) && !p.has(w)),
    unknown: ALL_WORDS.filter((w) => !s.has(w) && !p.has(w)),
  };
}
