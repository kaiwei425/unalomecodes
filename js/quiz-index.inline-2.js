/* =====================
   CONFIG（可改）
===================== */
// 祈福建議仍使用既有 Worker（包含守護神資料與建議）
const ADVICE_BASE = 'https://proud-boat-794c.kaiwei425.workers.dev';
const API_BASE = ADVICE_BASE; // 供舊有分享/守護神資料 API 使用
// 本站 API（新優惠券系統、商品結帳）
const SITE_BASE   = (function(){ try{ return location.origin; }catch(e){ return 'https://unalomecodes.com'; }})();
// 分享結果仍使用既有外部網域
const SHARE_PAGE = 'https://unalomecodes.pages.dev/share';
// 內部神祇頁面改為新網址
const DEITY_PAGE = SITE_BASE + '/deity';
const BRAND_NAME = '守護指引';
const BRAND_LOGO = '/img/logo.png';
// Coupon service endpoint
const COUPON_API = (function(){ try{ return SITE_BASE + '/api/coupons'; }catch(e){ return '/api/coupons'; }})();

/* =====================
   基礎資料（取自 worker.js）
===================== */
const GODS = ['FM','GA','CD','KP','HP','XZ','WE','HM','RH','JL','ZD','ZF'];
const DOW = {
  Sun:{label:'星期日', color:'紅色',  tip:'象徵力量與榮耀，讓你在人群中展現自信與光彩', weight:['JL','GA','WE']},
  Mon:{label:'星期一', color:'黃色',  tip:'象徵智慧與理解力，幫助你以柔克剛',                   weight:['CD','XZ','KP']},
  Tue:{label:'星期二', color:'粉紅色',tip:'象徵勇氣與愛，推動你主動改變',                         weight:['HM','HP','WE']},
  Wed:{label:'星期三', color:'綠色',  tip:'象徵成長與和諧，讓你在變動中穩定前行',                 weight:['KP','XZ','FM']},
  Thu:{label:'星期四', color:'橘色',  tip:'象徵智慧與學習，帶來貴人與新知',                       weight:['FM','CD','RH']},
  Fri:{label:'星期五', color:'藍色',  tip:'象徵愛與藝術，讓你更具包容與親和力',                   weight:['ZF','KP','XZ']},
  Sat:{label:'星期六', color:'紫色',  tip:'象徵守護與洞察，幫你轉危為安',                         weight:['RH','WE','CD']}
};
const DOW_EN = {
  Sun:{label:'Sunday', color:'Red',   tip:'Confidence and shine—step forward and lead clearly.'},
  Mon:{label:'Monday', color:'Yellow',tip:'Understanding and wisdom—soft strength wins.'},
  Tue:{label:'Tuesday', color:'Pink', tip:'Courage and love—move first with heart.'},
  Wed:{label:'Wednesday', color:'Green', tip:'Growth and harmony—steady progress in change.'},
  Thu:{label:'Thursday', color:'Orange', tip:'Learning and insight—new knowledge finds you.'},
  Fri:{label:'Friday', color:'Blue',  tip:'Love and art—warmth and connection expand.'},
  Sat:{label:'Saturday', color:'Purple', tip:'Protection and clarity—turn risks into calm.'}
};
const ZODIAC = {
  Aries:{name:'牡羊座 ♈️', element:'火'},
  Taurus:{name:'金牛座 ♉️', element:'土'},
  Gemini:{name:'雙子座 ♊️', element:'風'},
  Cancer:{name:'巨蟹座 ♋️', element:'水'},
  Leo:{name:'獅子座 ♌️', element:'火'},
  Virgo:{name:'處女座 ♍️', element:'土'},
  Libra:{name:'天秤座 ♎️', element:'風'},
  Scorpio:{name:'天蠍座 ♏️', element:'水'},
  Sagittarius:{name:'射手座 ♐️', element:'火'},
  Capricorn:{name:'魔羯座 ♑️', element:'土'},
  Aquarius:{name:'水瓶座 ♒️', element:'風'},
  Pisces:{name:'雙魚座 ♓️', element:'水'}
};
const ZODIAC_EN = {
  Aries:{name:'Aries ♈️', element:'Fire'},
  Taurus:{name:'Taurus ♉️', element:'Earth'},
  Gemini:{name:'Gemini ♊️', element:'Air'},
  Cancer:{name:'Cancer ♋️', element:'Water'},
  Leo:{name:'Leo ♌️', element:'Fire'},
  Virgo:{name:'Virgo ♍️', element:'Earth'},
  Libra:{name:'Libra ♎️', element:'Air'},
  Scorpio:{name:'Scorpio ♏️', element:'Water'},
  Sagittarius:{name:'Sagittarius ♐️', element:'Fire'},
  Capricorn:{name:'Capricorn ♑️', element:'Earth'},
  Aquarius:{name:'Aquarius ♒️', element:'Air'},
  Pisces:{name:'Pisces ♓️', element:'Water'}
};
const QUESTIONS = {
  1:{ text:'你的職業最接近哪一種？',
      opts:{ A:'創業／自雇', B:'管理／行政（上班族）', C:'設計／藝術／內容創作',
             D:'銷售／行銷／公關', E:'工程／技術／金融數據', F:'服務／醫療／教育／身心工作',
             G:'自由職／兼職／轉職中', H:'公務員' } },
  2:{ text:'當你想改變生活時，你最想先獲得什麼？',
      opts:{A:'卡關的地方能夠有進展',B:'財富穩定與富足',C:'找到更深的目標與指引',D:'安全感與守護',E:'學會放下與看清自己'}},
  3:{ text:'如果只給你一項祝福，你最期待哪一種？',
      opts:{A:'開啟更多道路與選擇',B:'好運與資源自己來',C:'人緣桃花相助',D:'強力保護遠離干擾',E:'看清方向專注當下不內耗'}},
  4:{ text:'你覺得自己最常反覆遇到的課題是？',
      opts:{A:'機會與阻礙交錯',B:'財運忽上忽下',C:'感情或人際反覆',D:'容易被他人能量影響',E:'內在糾結於得失'}},
  5:{ text:'朋友最可能怎麼形容你？',
      opts:{A:'衝勁十足有主見',B:'親切有魅力會做人',C:'聰明冷靜有判斷',D:'穩重可靠給人安全感',E:'有遠見善規劃'}},
  6:{ text:'當事情不順利時，你通常怎麼回應？',
      opts:{A:'調整方法再試一次',B:'停下來並好好觀察一切',C:'找人商量或以信念穩心',D:'退一步先穩住自己',E:'正面迎戰勇敢行動'}},
  7:{ text:'你理想中的人生狀態是？',
      opts:{A:'不斷接受新挑戰讓自己進步',B:'財富自由生活富足',C:'擁有穩定而深刻的人際關係',D:'內心平穩被保護的踏實感',E:'方向清楚並且專注前行'}}
};
const QUESTIONS_EN = {
  1:{ text:'Which role best describes you?',
      opts:{ A:'Founder / Self-employed', B:'Management / Admin', C:'Design / Art / Content',
             D:'Sales / Marketing / PR', E:'Engineering / Tech / Finance & Data', F:'Service / Healthcare / Education / Wellness',
             G:'Freelance / Part-time / Transition', H:'Public sector' } },
  2:{ text:'When you want to change your life, what do you want first?',
      opts:{A:'Breakthrough on a stuck area',B:'Stable wealth and abundance',C:'Clear direction and guidance',D:'Safety and protection',E:'Let go and see yourself clearly'}},
  3:{ text:'If you could receive only one blessing, which would it be?',
      opts:{A:'More paths and options open up',B:'Luck and resources arrive',C:'People luck and support',D:'Strong protection from interference',E:'Clear focus without inner noise'}},
  4:{ text:'Which pattern do you keep encountering?',
      opts:{A:'Opportunities and obstacles alternate',B:'Wealth fluctuates up and down',C:'Relationships repeat the same loops',D:'Easily affected by others\' energy',E:'Stuck between gain and loss'}},
  5:{ text:'How would friends describe you?',
      opts:{A:'Driven and decisive',B:'Warm, charming, good with people',C:'Sharp, calm, and analytical',D:'Steady and reliable',E:'Visionary and strategic'}},
  6:{ text:'When things go wrong, how do you respond?',
      opts:{A:'Adjust and try again',B:'Pause and observe',C:'Seek advice or anchor in belief',D:'Step back and stabilize first',E:'Face it head-on'}},
  7:{ text:'Your ideal life state is?',
      opts:{A:'Keep taking on new challenges',B:'Financial freedom and abundance',C:'Stable, deep relationships',D:'Inner calm and protection',E:'Clear direction and focus'}}
};
const DEITY_KEYWORDS = {
  FM:{ zh:['平衡','秩序','貴人'], en:['balance','order','support'] },
  GA:{ zh:['突破','專注','行動'], en:['breakthrough','focus','momentum'] },
  CD:{ zh:['穩定','清明','回心'], en:['stability','clarity','grounding'] },
  KP:{ zh:['人緣','果斷','魅力'], en:['charisma','decisiveness','people luck'] },
  HP:{ zh:['守護','界線','安全'], en:['protection','boundaries','safety'] },
  XZ:{ zh:['機會','財流','回饋'], en:['opportunity','money flow','reciprocity'] },
  WE:{ zh:['洞察','專注','判斷'], en:['insight','focus','discernment'] },
  HM:{ zh:['勇氣','行動','忠誠'], en:['courage','action','loyalty'] },
  RH:{ zh:['轉運','節奏','定心'], en:['shift','rhythm','calm'] },
  JL:{ zh:['正氣','保護','原則'], en:['integrity','protection','principles'] },
  ZD:{ zh:['韌性','穩健','累積'], en:['resilience','steadiness','accumulation'] },
  ZF:{ zh:['招財','溫度','人緣'], en:['abundance','warmth','rapport'] }
};
const ANSWER_INSIGHTS = {
  zh: {
    1:{ A:'想要掌握主導權與突破現況', B:'需要更清楚的秩序與管理節奏', C:'需要被理解的創意輸出', D:'想要把影響力放大', E:'需要精準與可控的流程', F:'在意陪伴與照顧能量', G:'正處在轉換與不確定', H:'追求穩定與可預期' },
    2:{ A:'想先打開卡關的路徑', B:'希望財務能穩定擴張', C:'需要更清楚的方向感', D:'渴望安全與被守護', E:'想放下雜念看清自己' },
    3:{ A:'需要新的出口與選項', B:'想讓資源與好運到來', C:'渴望人脈與支持', D:'需要屏蔽外在干擾', E:'希望內在更專注' },
    4:{ A:'被機會與阻礙拉扯', B:'財運波動難以掌握', C:'人際反覆消耗', D:'容易受他人能量影響', E:'在取捨之間糾結' },
    5:{ A:'需要更強的行動推進', B:'在乎互動與人緣', C:'需要清晰判斷', D:'需要穩定與可靠感', E:'想把遠景落地' },
    6:{ A:'正在修正方法與步伐', B:'需要觀察與冷靜', C:'需要外在支持', D:'先穩住自己的節奏', E:'需要勇氣與正面行動' },
    7:{ A:'渴望成長與突破', B:'想建立長期富足', C:'想讓關係更穩固', D:'需要內心的安定', E:'想保持清晰方向' }
  },
  en: {
    1:{ A:'taking control and breaking through', B:'needing structure and management rhythm', C:'seeking creative expression that’s understood', D:'wanting more influence and reach', E:'needing precision and controllability', F:'valuing care and support energy', G:'in transition and uncertainty', H:'seeking stability and predictability' },
    2:{ A:'opening a stuck path', B:'building stable and expanding wealth', C:'finding clear direction', D:'feeling safe and protected', E:'clearing noise and seeing yourself' },
    3:{ A:'more exits and options', B:'resources and luck arriving', C:'people support and connections', D:'shielding from interference', E:'clear focus and inner quiet' },
    4:{ A:'pulled between chances and obstacles', B:'wealth that fluctuates', C:'relationship loops repeating', D:'absorbing others’ energy too easily', E:'stuck between gain and loss' },
    5:{ A:'needing stronger forward drive', B:'valuing rapport and relationships', C:'needing clear judgment', D:'seeking steady reliability', E:'wanting a vision that lands' },
    6:{ A:'adjusting methods and pace', B:'needing observation and calm', C:'looking for external support', D:'stabilizing before moving', E:'needing courage and direct action' },
    7:{ A:'growth and breakthroughs', B:'long-term abundance', C:'stable, deep relationships', D:'inner calm and safety', E:'clear direction and focus' }
  }
};
// 問題選項對應加權（每題每選項對應神祇）
const MAP = {
  1:{ // 職業
    A:['FM','GA','JL','RH'], B:['FM','KP','WE','ZD'], C:['CD','WE','XZ','ZF'],
    D:['GA','KP','XZ','ZF'], E:['WE','HM','FM','JL'], F:['HP','XZ','KP','WE'],
    G:['RH','FM','JL','WE'], H:['CD','KP','ZD','FM']
  },
  2:{ A:['FM','WE','KP','JL'], B:['ZD','XZ','ZF','KP'], C:['FM','JL','CD','WE'], D:['HP','RH','WE','FM'], E:['CD','WE','FM','HP'] },
  3:{ A:['JL','FM','KP','WE'], B:['XZ','ZD','RH','FM'], C:['KP','GA','XZ','ZF'], D:['HP','RH','FM','WE'], E:['WE','CD','FM','JL'] },
  4:{ A:['FM','WE','JL','KP'], B:['ZD','XZ','RH','KP'], C:['KP','GA','XZ','ZF'], D:['HP','RH','FM','WE'], E:['WE','CD','FM','JL'] },
  5:{ A:['GA','FM','JL','HM'], B:['KP','XZ','ZF','WE'], C:['WE','CD','FM','JL'], D:['FM','HP','KP','ZD'], E:['WE','JL','FM','CD'] },
  6:{ A:['FM','WE','KP','JL'], B:['WE','CD','FM','JL'], C:['KP','XZ','ZF','WE'], D:['HP','FM','RH','WE'], E:['GA','HM','FM','JL'] },
  7:{ A:['FM','JL','WE','HM'], B:['XZ','ZD','ZF','KP'], C:['KP','GA','XZ','ZF'], D:['HP','FM','RH','WE'], E:['WE','CD','FM','JL'] }
};

/* =====================
   計算邏輯（取自 worker.js）
===================== */
const JOB_KEYS   = ['A','B','C','D','E','F','G','H'];
const DOW_KEYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ZODIAC_KEYS= ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

function stableHash(str){
  let h = 2166136261>>>0;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h>>>0;
}
function taipeiDateKey(ts){
  const t = typeof ts === 'number' ? ts : Date.now();
  const d = new Date(t + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
async function checkQuizDailyLimit(showAlert){
  try{
    const res = await fetch('/api/me/profile', { credentials:'include', cache:'no-store' });
    if (!res.ok) return true;
    const data = await res.json().catch(()=>null);
    const profile = data && data.profile ? data.profile : null;
    const lastTs = profile && profile.quiz && profile.quiz.ts ? Date.parse(profile.quiz.ts) : 0;
    if (!lastTs) return true;
    const lastKey = taipeiDateKey(lastTs);
    const todayKey = taipeiDateKey(Date.now());
    if (lastKey === todayKey){
      if (showAlert){
        alert('今天已完成測驗，請於台灣時間午夜 12 點後再重新測驗。');
      }
      return false;
    }
  }catch(_){}
  return true;
}
function encodeState(st){
  return [st.dow||'', st.zod||'', st.job||'', st.p2||'', st.p3||'', st.p4||'', st.p5||'', st.p6||'', st.p7||''].join('|');
}
const BALANCE_TOP_N = 8;
const BALANCE_WEIGHTS = (function(){
  const weights = Object.fromEntries(GODS.map(g=>[g,0]));
  Object.values(DOW).forEach(info=>{
    (info.weight || []).forEach(g=>{ if (g in weights) weights[g] += 1; });
  });
  Object.values(MAP).forEach(opts=>{
    Object.values(opts).forEach(arr=>{
      let w = 4;
      for (const g of arr){
        if (g in weights) weights[g] += w;
        w--;
        if (w <= 0) break;
      }
    });
  });
  return weights;
})();
function pickBalancedDeity(ranked, seedStr){
  const top = ranked.slice(0, BALANCE_TOP_N);
  let total = 0;
  const weights = top.map(([g])=>{
    const base = BALANCE_WEIGHTS[g] || 1;
    const w = 1 / base;
    total += w;
    return w;
  });
  const r = (stableHash(seedStr) % 1000000) / 1000000;
  let acc = 0;
  for (let i=0;i<top.length;i++){
    acc += weights[i] / total;
    if (r <= acc) return top[i][0];
  }
  return top[top.length - 1][0];
}
function compileScore(st){
  const score = Object.fromEntries(GODS.map(g=>[g,0]));
  // 星期加權
  const dw = DOW[st.dow]?.weight || [];
  for (const g of dw){ score[g] += 1; }
  // 題目加權
  for (let i=1;i<=7;i++){
    const pick = st['p'+i];
    const arr = MAP[i]?.[pick] || [];
    let w = 4;
    for (const g of arr){ score[g] += w; w--; if (w<=0) break; }
  }
  return score;
}
function decideWinner(st){
  const score = compileScore(st);
  const ranked = Object.entries(score).sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0]));
  const seed = encodeState(st);
  return pickBalancedDeity(ranked, seed);
}
function calcAffinityPercent(st, winner){
  const score = compileScore(st);
  let max=-Infinity, second=-Infinity;
  for (const v of Object.values(score)){
    if (v>max){ second=max; max=v; } else if (v>second){ second=v; }
  }
  const gap = Math.max(0, max - (second===-Infinity?0:second));
  const base = 86 + Math.min(8, gap*4);
  const tweak = stableHash(winner + ':' + encodeState(st)) % 5;
  const pct = Math.max(83, Math.min(99, base + tweak));
  return pct;
}
function affinityBrief(n, lang){
  const p = Number(n)||0;
  const isEn = lang === 'en';
  if (p>=95) return isEn ? 'Exceptional match' : '極強連結';
  if (p>=92) return isEn ? 'Strong resonance' : '高度共鳴';
  if (p>=88) return isEn ? 'Steady alignment' : '穩定合拍';
  if (p>=85) return isEn ? 'Getting closer' : '正在靠近';
  return isEn ? 'Awakening link' : '有縁待啟動';
}
// 神祇代碼→中文名（與 deity.html 同步）
function deityName(code, lang){
  if (typeof window.getDeityById === 'function'){
    const d = window.getDeityById(code);
    if (d && d.name){
      const name = lang === 'en' ? d.name.en : d.name.zh;
      return name || d.name.zh || d.name.en || '守護神';
    }
  }
  const map = {FM:'四面神',GA:'象神',CD:'崇迪佛',KP:'坤平',HP:'魂魄勇',XZ:'徐祝老人',WE:'五眼四耳',HM:'猴神哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神'};
  return map[code] || '守護神';
}

const LANG_KEY = 'uc_lang';
const I18N = {
  zh: {
    'result-kicker': '測驗結果',
    'result-affinity-title': '緣分值',
    'result-secondary-title': '副守護神',
    'result-stories-title': '真實故事',
    'result-actions-title': '接下來怎麼做',
    'result-amulet-title': '佛牌配戴建議',
    'result-why-title': '為什麼是祂',
    'result-evidence-title': '你這次最關鍵的線索',
    'result-card-title': '你的守護卡',
    'result-card-download': '下載卡片',
    'result-card-copy': '複製分享文案',
    'result-card-copied': '已複製',
    'result-card-share': '我的守護神是 {deity}（{keywords}）。{url}',
    'cta-shop': '看你的專屬配戴精選',
    'cta-temple': '去拜更有感的寺廟建議',
    'cta-deity': '看完整神祇介紹',
    'quiz-cta-shop-primary': '看你的專屬配戴精選',
    'quiz-cta-temple': '去拜更有感的寺廟建議',
    'quiz-cta-deity': '看完整神祇介紹',
    'cta-retake': '重新測驗一次',
    'cta-coupon': '點我領取專屬優惠',
    'cta-copy-coupon': '複製優惠碼',
    'cta-save-coupon': '存到我的優惠券',
    'line-entry-title': '已完成守護神測驗',
    'line-entry-desc': '系統已讀取你的守護神紀錄，可直接領取日籤或重新測驗。',
    'line-entry-retake': '重新測驗守護神',
    'line-entry-guardian-label': '守護神：',
    'line-entry-guardian-alt': '守護神',
    'line-entry-claim': '領取日籤',
    'member-title': '完成後你會獲得',
    'member-line-1': '你的守護神會顯示在會員中心旁邊，方便隨時查看。',
    'member-line-2': '每天台灣時間午夜 12 點可領取一次日籤。',
    'member-line-3': '日籤包含：守護神提醒、今日能量建議、生活小提示與加持方向。',
    'empty-stories': '目前還沒有故事分享。',
    'disclaimer': '自我覺察與文化體驗建議，不構成保證。',
    'action-today': '今天',
    'action-week': '本週',
    'action-wear': '配戴建議',
    'breakdown-total': '總分',
    'breakdown-base': '出生能量',
    'breakdown-role': '角色線索',
    'breakdown-intent': '意圖線索',
    'breakdown-action': '行動線索',
    'result-hook-1': '在「{intent}」這件事上，你需要 {deity} 帶來的「{k1}」與「{k2}」。',
    'result-hook-2': '你正面對「{blocker}」，{deity} 的「{k1}」能先穩住你，再用「{k2}」推進。',
    'result-hook-3': '你的關鍵風格是「{style}」，{deity} 的「{k1}」與「{k2}」正好對位。',
    'result-hook-4': '當你想要「{intent}」，{deity} 會用「{k1}」與「{k2}」把節奏拉回來。',
    'result-hook-5': '生日星期是 {day}、星座是 {zodiac}，此刻更需要「{k1}」與「{k2}」的守護。',
    'result-hook-6': '以「{job}」的角色出發，{deity} 的「{k1}」會成為你的支撐與方向。'
  },
  en: {
    'result-kicker': 'Result',
    'result-affinity-title': 'Affinity',
    'result-secondary-title': 'Secondary Deity',
    'result-stories-title': 'True Stories',
    'result-actions-title': 'What to do next',
    'result-amulet-title': 'Wearing Tips',
    'result-why-title': 'Why this deity',
    'result-evidence-title': 'Key signals',
    'result-card-title': 'Your protection card',
    'result-card-download': 'Download',
    'result-card-copy': 'Copy text',
    'result-card-copied': 'Copied',
    'result-card-share': 'My guardian is {deity} ({keywords}). {url}',
    'cta-shop': 'See your curated picks',
    'cta-temple': 'Visit a matching temple',
    'cta-deity': 'Full deity profile',
    'quiz-cta-shop-primary': 'See your curated picks',
    'quiz-cta-temple': 'Visit a matching temple',
    'quiz-cta-deity': 'Full deity profile',
    'cta-retake': 'Retake the quiz',
    'cta-coupon': 'Get your personal offer',
    'cta-copy-coupon': 'Copy coupon',
    'cta-save-coupon': 'Save to my coupons',
    'line-entry-title': 'Guardian quiz completed',
    'line-entry-desc': 'We found your guardian record. You can claim today’s fortune or retake the quiz.',
    'line-entry-retake': 'Retake guardian quiz',
    'line-entry-guardian-label': 'Guardian: ',
    'line-entry-guardian-alt': 'Guardian',
    'line-entry-claim': 'Claim daily fortune',
    'member-title': 'What you unlock',
    'member-line-1': 'Your guardian appears next to your member center for quick access.',
    'member-line-2': 'Claim one daily fortune every day at 12:00 AM (Taipei time).',
    'member-line-3': 'Daily fortune includes: guardian guidance, today’s energy focus, practical tips, and ritual direction.',
    'empty-stories': 'No stories yet.',
    'disclaimer': 'For reflection and cultural exploration, no guarantees.',
    'action-today': 'Today',
    'action-week': 'This week',
    'action-wear': 'Wearing tip',
    'breakdown-total': 'Total',
    'breakdown-base': 'Birth energy',
    'breakdown-role': 'Role signals',
    'breakdown-intent': 'Intent signals',
    'breakdown-action': 'Action signals',
    'result-hook-1': 'For “{intent}”, you need {deity} to bring “{k1}” and “{k2}” back into rhythm.',
    'result-hook-2': 'You’re facing “{blocker}”. {deity} steadies you with “{k1}” and moves you forward with “{k2}”.',
    'result-hook-3': 'Your style is “{style}”, and {deity} answers with “{k1}” and “{k2}”.',
    'result-hook-4': 'When you want “{intent}”, {deity} anchors you with “{k1}” and “{k2}”.',
    'result-hook-5': 'With a {day} birthday and {zodiac}, “{k1}” and “{k2}” are your best support now.',
    'result-hook-6': 'From your role as “{job}”, {deity} brings the “{k1}” you need most.'
  }
};

function applyLang(lang){
  const dict = I18N[lang] || I18N.zh;
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    const key = el.dataset.i18n;
    if (dict[key]) el.textContent = dict[key];
  });
  if (langToggle){
    langToggle.textContent = 'ZH/EN';
    langToggle.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切換英文');
    langToggle.dataset.lang = lang;
  }
  if (lastLineProfile) renderLineBadge(lastLineProfile);
}

function resolveLang(){
  let stored = '';
  try{ stored = localStorage.getItem(LANG_KEY) || ''; }catch(_){}
  if (stored === 'zh' || stored === 'en') return stored;
  const browser = (navigator.language || '').toLowerCase();
  return browser.startsWith('en') ? 'en' : 'zh';
}

function setLang(lang){
  try{ localStorage.setItem(LANG_KEY, lang); }catch(_){}
  applyLang(lang);
}

function getLang(){
  return (langToggle && langToggle.dataset.lang) || resolveLang();
}

function t(key, lang){
  const dict = I18N[lang] || I18N.zh;
  return dict[key] || I18N.zh[key] || '';
}

function formatTemplate(tpl, ctx){
  return String(tpl || '').replace(/\{(\w+)\}/g, function(_, key){
    return (ctx && ctx[key] != null) ? String(ctx[key]) : '';
  });
}

function getQuestionText(num, lang){
  const src = lang === 'en' ? QUESTIONS_EN : QUESTIONS;
  return (src[num] && src[num].text) || (QUESTIONS[num] && QUESTIONS[num].text) || '';
}

function getOptionLabel(num, key, lang){
  const src = lang === 'en' ? QUESTIONS_EN : QUESTIONS;
  return (src[num] && src[num].opts && src[num].opts[key]) || (QUESTIONS[num] && QUESTIONS[num].opts && QUESTIONS[num].opts[key]) || '';
}

function getDayInfo(key, lang){
  const src = lang === 'en' ? DOW_EN : DOW;
  return src[key] || DOW[key] || {};
}

function getZodiacInfo(key, lang){
  const src = lang === 'en' ? ZODIAC_EN : ZODIAC;
  return src[key] || ZODIAC[key] || {};
}

function getElementHint(element, lang){
  if (!element) return '';
  if (lang === 'en'){
    return ({ Fire:'Action & breakthroughs', Earth:'Stability & accumulation', Air:'Communication & connection', Water:'Intuition & feeling' })[element] || '';
  }
  return ({ 火:'行動與突破', 土:'穩定與累積', 風:'溝通與連結', 水:'直覺與感受' })[element] || '';
}

function getDeityKeywords(code, primaryDeity, lang){
  const key = String(code || '').toUpperCase();
  const fromObj = primaryDeity && primaryDeity.keywords ? primaryDeity.keywords : null;
  const direct = fromObj && (lang === 'en' ? fromObj.en : fromObj.zh);
  const fallbackPack = DEITY_KEYWORDS[key] || {};
  const fallback = lang === 'en' ? fallbackPack.en : fallbackPack.zh;
  const list = Array.isArray(direct) && direct.length ? direct : (Array.isArray(fallback) ? fallback : []);
  return list.filter(Boolean);
}

function pickKeywordPair(list, lang, seed){
  const fallback = lang === 'en' ? ['steady', 'clarity'] : ['穩定', '清明'];
  const pool = (list && list.length) ? list : fallback;
  const k1 = pool[seed % pool.length] || fallback[0];
  let k2 = pool[(seed + 1) % pool.length] || fallback[1] || k1;
  if (k2 === k1){
    k2 = pool[(seed + 2) % pool.length] || k1;
  }
  return [k1, k2];
}

function getPersonalHook(opts){
  const lang = opts && opts.lang ? opts.lang : 'zh';
  const primary = (opts && opts.primaryDeity) || {};
  const code = String(primary.code || primary.id || '').toUpperCase();
  const name = deityName(code, lang);
  const keywords = getDeityKeywords(code, primary, lang);
  const seed = stableHash(encodeState(state) + ':' + code + ':' + lang);
  const pair = pickKeywordPair(keywords, lang, seed);
  const dict = I18N[lang] || I18N.zh;
  const templates = [1,2,3,4,5,6].map(i => dict['result-hook-' + i]).filter(Boolean);
  const chosen = templates[seed % templates.length] || templates[0] || '';
  const ctx = {
    deity: name,
    intent: (opts && opts.topIntent) || '',
    blocker: (opts && opts.topBlocker) || '',
    style: (opts && opts.style) || '',
    day: (opts && opts.day) || '',
    zodiac: (opts && opts.zodiac) || '',
    job: (opts && opts.job) || '',
    k1: pair[0],
    k2: pair[1] || pair[0]
  };
  return formatTemplate(chosen, ctx);
}

function scoreForQuestion(code, num, pick){
  const arr = MAP[num]?.[pick] || [];
  const idx = arr.indexOf(code);
  if (idx === -1) return 0;
  return Math.max(0, 4 - idx);
}

function buildScoreBreakdown(code){
  const base = (DOW[state.dow]?.weight || []).includes(code) ? 1 : 0;
  const role = scoreForQuestion(code, 1, state.job);
  let intent = 0;
  let action = 0;
  for (let i=2;i<=4;i++){ intent += scoreForQuestion(code, i, state['p'+i]); }
  for (let i=5;i<=7;i++){ action += scoreForQuestion(code, i, state['p'+i]); }
  return { base, role, intent, action, total: base + role + intent + action };
}

function getChoiceInsight(num, pick, lang){
  const pack = ANSWER_INSIGHTS[lang] || ANSWER_INSIGHTS.zh;
  const table = pack[num] || {};
  return table[pick] || '';
}

function formatTrait(list, lang, seed){
  const pair = pickKeywordPair(list, lang, seed);
  const a = pair[0] || (lang === 'en' ? 'steady guidance' : '穩定指引');
  const b = pair[1] || '';
  if (!b || b === a) return a;
  return lang === 'en' ? `${a} and ${b}` : `${a}與${b}`;
}

function buildEvidence(opts){
  const lang = (opts && opts.lang) || 'zh';
  const answers = (opts && opts.answers) || {};
  const primary = (opts && opts.primaryDeity) || {};
  const code = String(primary.code || primary.id || '').toUpperCase();
  const keywords = getDeityKeywords(code, primary, lang);
  const items = [];
  const seedBase = stableHash(encodeState(state) + ':evidence:' + code + ':' + lang);

  if (answers.dow && (DOW[answers.dow]?.weight || []).includes(code)){
    const dayInfo = getDayInfo(answers.dow, lang);
    const optText = dayInfo.label || (lang === 'en' ? 'Birth weekday' : '出生星期');
    const insight = dayInfo.tip || (lang === 'en' ? 'your native rhythm' : '你的天生節奏');
    const trait = formatTrait(keywords, lang, seedBase);
    const text = lang === 'en'
      ? `You chose “${optText}” → it shows you're facing “${insight}” → so you need “${trait}”.`
      : `你選了「${optText}」→ 代表你正在面對「${insight}」→ 所以你需要「${trait}」。`;
    items.push({ weight: 1, text });
  }

  for (let i=1;i<=7;i++){
    const pick = (i === 1) ? answers.job : answers['p'+i];
    if (!pick) continue;
    const weight = scoreForQuestion(code, i, pick);
    if (!weight) continue;
    const qText = getQuestionText(i, lang);
    const optText = getOptionLabel(i, pick, lang) || qText;
    const insight = getChoiceInsight(i, pick, lang) || (lang === 'en' ? 'a clearer next step' : '更明確的下一步');
    const trait = formatTrait(keywords, lang, seedBase + i);
    const text = lang === 'en'
      ? `You chose “${optText}” → it shows you're facing “${insight}” → so you need “${trait}”.`
      : `你選了「${optText}」→ 代表你正在面對「${insight}」→ 所以你需要「${trait}」。`;
    items.push({ weight, text });
  }

  items.sort((a,b)=> b.weight - a.weight);
  return items.slice(0, 3).map(it => it.text);
}

function buildActionItems(deity, lang){
  const dayInfo = getDayInfo(state.dow, lang);
  const today = dayInfo.tip || (lang === 'en' ? 'Focus on one small step today.' : '今天先完成一件小事。');
  const weekFocus = getOptionLabel(6, state.p6, lang) || getOptionLabel(7, state.p7, lang);
  const week = weekFocus
    ? (lang === 'en' ? `Use “${weekFocus}” as your weekly rhythm and make one concrete move.` : `本週聚焦「${weekFocus}」，安排一件事落地。`)
    : (lang === 'en' ? 'Set one weekly rhythm and keep it simple.' : '本週設定一個固定節奏並持續。');
  const wear = (deity && deity.wear && (lang === 'en' ? deity.wear.en : deity.wear.zh)) || (deity && deity.wear && (deity.wear.zh || deity.wear.en)) || (lang === 'en' ? 'Wear your deity item when you need steady focus.' : '在需要穩定時配戴守護神聖物。');
  return [
    { title: t('action-today', lang), body: today },
    { title: t('action-week', lang), body: week },
    { title: t('action-wear', lang), body: wear }
  ];
}

function formatFriendlyDate(lang){
  const d = new Date();
  if (lang === 'en'){
    return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  }
  return d.toLocaleDateString('zh-TW', { year:'numeric', month:'short', day:'numeric' });
}

function pickPrimaryKeywords(primaryDeity, lang){
  if (!primaryDeity) return [];
  const kw = primaryDeity.keywords;
  let list = [];
  if (Array.isArray(kw)) list = kw;
  else if (kw && typeof kw === 'object'){
    list = (lang === 'en' ? kw.en : kw.zh) || kw.zh || kw.en || [];
  }
  if (!Array.isArray(list) || !list.length){
    list = getDeityKeywords(primaryDeity.code || primaryDeity.id, primaryDeity, lang);
  }
  return list.filter(Boolean).slice(0, 3);
}

function wrapTextLines(ctx, text, maxWidth, lang, maxLines){
  const raw = String(text || '').trim();
  if (!raw) return [''];
  const parts = lang === 'en' ? raw.split(/\s+/) : raw.split('');
  const lines = [];
  let line = '';
  for (let i=0;i<parts.length;i++){
    const word = parts[i];
    const next = lang === 'en' ? (line ? line + ' ' + word : word) : (line + word);
    if (ctx.measureText(next).width <= maxWidth || !line){
      line = next;
    }else{
      lines.push(line);
      line = word;
    }
    if (maxLines && lines.length >= maxLines) break;
  }
  if (line && (!maxLines || lines.length < maxLines)) lines.push(line);
  if (maxLines && lines.length > maxLines){
    lines.length = maxLines;
  }
  if (maxLines && lines.length === maxLines){
    const last = lines[lines.length - 1];
    if (last && last.length > 2) lines[lines.length - 1] = last.replace(/\s+$/, '') + '…';
  }
  return lines;
}

function renderGuardianCardPreview(data){
  const titleEl = document.getElementById('guardianCardTitle');
  const hookEl = document.getElementById('guardianCardHook');
  const dateEl = document.getElementById('guardianCardDate');
  const tagWrap = document.getElementById('guardianCardKeywords');
  if (titleEl) titleEl.textContent = data.name || '—';
  if (hookEl) hookEl.textContent = data.hook || '';
  if (dateEl) dateEl.textContent = data.date || '';
  if (tagWrap){
    tagWrap.innerHTML = (data.keywords || []).map(k => `<span class="tag">${k}</span>`).join('');
  }
}

function drawGuardianCardToCanvas(data){
  const width = 960;
  const height = 560;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#f6f4ef');
  bg.addColorStop(1, '#efe7dc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const radius = 22;
  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.strokeStyle = 'rgba(179,156,120,0.35)';
  roundRect(20, 20, width-40, height-40, radius);
  ctx.fill();
  ctx.stroke();

  const pad = 48;
  ctx.fillStyle = '#8a7b65';
  ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system';
  ctx.textBaseline = 'top';
  ctx.fillText(data.brand || 'unalomecodes', pad, pad);

  ctx.textAlign = 'right';
  ctx.fillText(data.date || '', width - pad, pad);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#1f2937';
  ctx.font = '700 32px ui-sans-serif, system-ui, -apple-system';
  ctx.fillText(data.name || '—', pad, pad + 36);

  const tagY = pad + 84;
  let x = pad;
  ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system';
  (data.keywords || []).forEach(function(tag){
    const text = String(tag || '');
    const w = ctx.measureText(text).width + 20;
    const h = 28;
    roundRect(x, tagY, w, h, 14);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(179,156,120,0.35)';
    ctx.stroke();
    ctx.fillStyle = '#7a6040';
    ctx.fillText(text, x + 10, tagY + 6);
    x += w + 10;
  });

  ctx.fillStyle = '#4b5563';
  ctx.font = '16px ui-sans-serif, system-ui, -apple-system';
  const lines = wrapTextLines(ctx, data.hook || '', width - pad*2, data.lang, 4);
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, tagY + 48 + i * 26);
  });

  ctx.fillStyle = '#b08a5a';
  ctx.font = '600 12px ui-sans-serif, system-ui, -apple-system';
  ctx.fillText('unalomecodes', pad, height - pad);

  return canvas;
}

function buildShareText(data){
  const kw = (data.keywords || []).join(data.lang === 'en' ? ', ' : '、') || (data.lang === 'en' ? 'guardian' : '守護神');
  return formatTemplate(t('result-card-share', data.lang), { deity: data.name || '', keywords: kw, url: data.url || '' });
}

function copyTextToClipboard(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject)=>{
    try{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    }catch(err){
      reject(err);
    }
  });
}

function downloadGuardianCard(){
  if (!lastGuardianCard) return;
  const canvas = drawGuardianCardToCanvas(lastGuardianCard);
  const fileName = `guardian-card-${lastGuardianCard.code || 'guardian'}.png`;
  if (canvas.toBlob){
    canvas.toBlob(function(blob){
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }else{
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  fireTrack('quiz_card_download', { primary: lastGuardianCard.code, intent: lastGuardianCard.intent });
}

function copyGuardianCardShare(){
  if (!lastGuardianCard) return;
  const text = buildShareText(lastGuardianCard);
  copyTextToClipboard(text).then(function(){
    if (guardianCardCopyBtn){
      const old = guardianCardCopyBtn.textContent;
      guardianCardCopyBtn.textContent = t('result-card-copied', lastGuardianCard.lang);
      setTimeout(()=> { guardianCardCopyBtn.textContent = old; }, 1200);
    }
  }).catch(function(){});
  fireTrack('quiz_share_copy', { primary: lastGuardianCard.code, intent: lastGuardianCard.intent });
}

/* =====================
   UI 狀態
===================== */
const state = { dow:'', zod:'', job:'', p2:'', p3:'', p4:'', p5:'', p6:'', p7:'' };
let currentStep = 0; // 0: dow, 1: zod, 2..8: questions 1-7
const TOTAL_STEPS = 2 + 7;
let currentQuestion = 1;
const resultLoading = document.getElementById('resultLoading');
const intro = document.getElementById('quizIntro');
const quizFlow = document.getElementById('quizFlow');
const resultBox = document.getElementById('resultBox');
const langToggle = document.getElementById('langToggle');
const guardianCardPreview = document.getElementById('guardianCardPreview');
const guardianCardDownloadBtn = document.getElementById('guardianCardDownloadBtn');
const guardianCardCopyBtn = document.getElementById('guardianCardCopyBtn');
const startBtn = document.getElementById('startQuizBtn');
const resumeBtn = document.getElementById('resumeQuizBtn');
const previewBtn = document.getElementById('previewBtn');
const previewPanel = document.getElementById('quizPreview');
const saveHint = document.getElementById('saveHint');
const backBtn = document.getElementById('backBtn');
const restartBtn = document.getElementById('restartBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const progressLabel = document.getElementById('progressLabel');
const progressFill = document.getElementById('progressFill');
const STORAGE_KEY = '__quiz_state_v2__';
let lastGuardianCard = null;

if (langToggle){
  langToggle.addEventListener('click', function(){
    const next = (langToggle.dataset.lang === 'en') ? 'zh' : 'en';
    setLang(next);
    if (resultBox && resultBox.style.display === 'block'){
      showResult({ rerender: true });
    }
  });
}
applyLang(resolveLang());

function fireTrack(event, payload){
  try{
    if (typeof window.track === 'function') window.track(event, payload);
    else if (typeof window.trackEvent === 'function') window.trackEvent(event, payload);
  }catch(_){}
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step: currentStep,
      state,
      ts: Date.now()
    }));
    if (saveHint) saveHint.style.display = '';
  }catch(_){}
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.state) return null;
    return data;
  }catch(_){
    return null;
  }
}

function clearState(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
}
function setResultLoading(on){
  if (!resultLoading) return;
  resultLoading.style.display = on ? 'flex' : 'none';
}
const lineEntry = document.getElementById('lineFortuneEntry');
const lineGuardianBadge = document.getElementById('lineGuardianBadge');
const lineRetakeBtn = document.getElementById('lineRetakeBtn');
let forceQuiz = false;
var lastLineProfile = null;
function isLineClient(){
  return !!(window.liff && window.liff.isInClient && window.liff.isInClient());
}
const badgeIcon = (function(){
  if (window.GUARDIAN_BADGE_ICON) return window.GUARDIAN_BADGE_ICON;
  return '/img/guardian-emblem.png';
})();
function setQuizVisible(show){
  const ids = ['stepDow','stepZod','quizBox'];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });
  if (quizFlow) quizFlow.hidden = !show;
  if (intro) intro.style.display = show ? 'none' : '';
  if (show && lineEntry) lineEntry.style.display = 'none';
}
function renderLineBadge(profile){
  if (!lineGuardianBadge || !profile || !profile.guardian) return;
  const lang = getLang();
  const code = String(profile.guardian.code || '').toUpperCase();
  const nameFromCode = code ? deityName(code, lang) : '';
  const name = nameFromCode || profile.guardian.name || (lang === 'en' ? 'Guardian' : '守護神');
  const label = t('line-entry-guardian-label', lang);
  const claim = t('line-entry-claim', lang);
  const alt = t('line-entry-guardian-alt', lang);
  lineGuardianBadge.innerHTML = `<img src="${badgeIcon}" alt="${alt}"><div class="guardian-meta"><strong>${label}${name}</strong><button type="button" class="fortune-btn" data-fortune-btn>${claim}</button></div>`;
  lineGuardianBadge.style.display = 'flex';
}
function showLineEntry(profile){
  if (!lineEntry) return;
  lastLineProfile = profile || null;
  if (!profile || !profile.guardian || forceQuiz){
    lineEntry.style.display = 'none';
    setQuizVisible(true);
    renderStep();
    return;
  }
  renderLineBadge(profile);
  lineEntry.style.display = '';
  if (intro) intro.style.display = 'none';
  setQuizVisible(false);
}
if (lineRetakeBtn){
  lineRetakeBtn.addEventListener('click', async ()=>{
    const ok = await checkQuizDailyLimit(true);
    if (!ok) return;
    forceQuiz = true;
    if (lineEntry) lineEntry.style.display = 'none';
    setQuizVisible(true);
    renderStep();
  });
}

const dowBox = document.getElementById('dowBox');
const zodiacBox = document.getElementById('zodiacBox');
const qTitle = document.getElementById('qTitle');
const optsEl  = document.getElementById('opts');

function updateProgress(){
  if (progressLabel) progressLabel.textContent = `步驟 ${currentStep + 1}/${TOTAL_STEPS}`;
  if (progressFill){
    const pct = Math.min(100, Math.max(0, ((currentStep + 1) / TOTAL_STEPS) * 100));
    progressFill.style.width = pct + '%';
  }
}

function updateNextState(){
  if (!nextStepBtn) return;
  let enabled = false;
  if (currentStep === 0) enabled = !!state.dow;
  else if (currentStep === 1) enabled = !!state.zod;
  else enabled = !!state['p' + (currentStep - 1)];
  nextStepBtn.disabled = !enabled;
}

function setBackState(){
  if (!backBtn) return;
  backBtn.disabled = currentStep === 0;
}

function setOptionActive(container, value){
  if (!container) return;
  const options = Array.from(container.querySelectorAll('[data-option]'));
  options.forEach((btn, idx)=>{
    const isActive = btn.dataset.option === value;
    btn.classList.toggle('is-selected', isActive);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    btn.tabIndex = isActive || (!value && idx === 0) ? 0 : -1;
  });
}

function bindOptionGroup(container, onSelect){
  if (!container) return;
  container.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('[data-option]');
    if (!btn) return;
    onSelect(btn.dataset.option);
  });
  container.addEventListener('keydown', (ev)=>{
    const keys = ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'];
    if (!keys.includes(ev.key)) return;
    ev.preventDefault();
    const items = Array.from(container.querySelectorAll('[data-option]'));
    if (!items.length) return;
    const currentIndex = items.findIndex(el=>el === document.activeElement);
    const dir = (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ? 1 : -1;
    const nextIndex = (currentIndex + dir + items.length) % items.length;
    items[nextIndex].focus();
  });
}

function renderDow(){
  if (!dowBox) return;
  dowBox.innerHTML = '';
  Object.entries(DOW).forEach(([k,v])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'option-card';
    b.textContent = v.label;
    b.dataset.option = k;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    dowBox.appendChild(b);
  });
  bindOptionGroup(dowBox, (val)=>{
    state.dow = val;
    setOptionActive(dowBox, val);
    updateNextState();
    saveState();
  });
  setOptionActive(dowBox, state.dow);
}

function renderZodiac(){
  if (!zodiacBox) return;
  zodiacBox.innerHTML = '';
  Object.entries(ZODIAC).forEach(([k,v])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'option-card';
    b.textContent = v.name;
    b.dataset.option = k;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    zodiacBox.appendChild(b);
  });
  bindOptionGroup(zodiacBox, (val)=>{
    state.zod = val;
    setOptionActive(zodiacBox, val);
    updateNextState();
    saveState();
  });
  setOptionActive(zodiacBox, state.zod);
}

function renderQ(qNum){
  currentQuestion = qNum;
  const q = QUESTIONS[qNum];
  qTitle.textContent = `第 ${qNum} 題（剩餘 ${Math.max(7-qNum,0)} 題）｜${q.text}`;
  optsEl.innerHTML='';
  const isJob = (qNum===1);
  Object.entries(q.opts).forEach(([k,label])=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-card';
    btn.textContent = label;
    btn.dataset.option = k;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    optsEl.appendChild(btn);
  });
  bindOptionGroup(optsEl, (val)=>{
    state['p'+qNum] = val;
    if (isJob) state.job = val;
    setOptionActive(optsEl, val);
    updateNextState();
    saveState();
  });
  setOptionActive(optsEl, state['p'+qNum] || '');
}

function resetQuiz(toIntro){
  state.dow=''; state.zod=''; state.job=''; state.p2=''; state.p3=''; state.p4=''; state.p5=''; state.p6=''; state.p7='';
  currentStep = 0; currentQuestion = 1;
  clearState();
  setOptionActive(dowBox, '');
  setOptionActive(zodiacBox, '');
  if (resultBox) resultBox.style.display = 'none';
  if (toIntro){
    setQuizVisible(false);
    if (intro) intro.style.display = '';
  }else{
    setQuizVisible(true);
  }
  renderStep();
}

function renderStep(){
  const cards = document.querySelectorAll('.step-card');
  cards.forEach(c=> c.style.display='none');
  if (currentStep === 0){
    document.getElementById('stepDow').style.display='';
  }else if (currentStep === 1){
    document.getElementById('stepZod').style.display='';
  }else{
    document.getElementById('quizBox').style.display='';
    renderQ(currentStep-1);
  }
  updateProgress();
  updateNextState();
  setBackState();
}
function nextStep(){
  if (currentStep < TOTAL_STEPS-1){
    currentStep++;
    renderStep();
  }else{
    showResult();
  }
}

renderDow();
renderZodiac();
renderStep();

if (startBtn){
  startBtn.addEventListener('click', ()=>{
    resetQuiz(false);
    fireTrack('quiz_start');
  });
}
if (resumeBtn){
  resumeBtn.addEventListener('click', ()=>{
    setQuizVisible(true);
    renderStep();
    fireTrack('quiz_start', { resume: true });
  });
}
if (previewBtn && previewPanel){
  previewBtn.addEventListener('click', ()=>{
    previewPanel.open = true;
    previewPanel.scrollIntoView({ behavior:'smooth', block:'start' });
  });
}
if (backBtn){
  backBtn.addEventListener('click', ()=>{
    if (currentStep>0){ currentStep--; renderStep(); saveState(); }
  });
}
if (restartBtn){
  restartBtn.addEventListener('click', ()=>{
    if (confirm('確定要重新開始測驗嗎？')){
      resetQuiz(true);
    }
  });
}
if (nextStepBtn){
  nextStepBtn.addEventListener('click', ()=>{
    if (nextStepBtn.disabled) return;
    if (currentStep < TOTAL_STEPS-1){
      currentStep++;
      renderStep();
      saveState();
    }else{
      showResult();
    }
  });
}
document.addEventListener('keydown', (ev)=>{
  if (ev.key !== 'Enter') return;
  if (!quizFlow || quizFlow.hidden) return;
  if (document.activeElement && document.activeElement.closest('.option-card')) return;
  if (nextStepBtn && !nextStepBtn.disabled){
    nextStepBtn.click();
  }
});

const saved = loadState();
if (saved && saved.state){
  const hasProgress = Object.values(saved.state).some(val=>!!val);
  if (hasProgress){
    Object.assign(state, saved.state);
    if (typeof saved.step === 'number') currentStep = Math.min(Math.max(saved.step, 0), TOTAL_STEPS-1);
    renderStep();
    if (resumeBtn) resumeBtn.style.display = '';
    if (saveHint) saveHint.style.display = '';
  }
}
if (window.authState && typeof window.authState.onProfile === 'function'){
  window.authState.onProfile(profile=>{
    if (isLineClient() && profile && profile.guardian && profile.quiz){
      showLineEntry(profile);
    }else{
      if (!forceQuiz){
        if (lineEntry) lineEntry.style.display = 'none';
        setQuizVisible(true);
        renderStep();
      }
    }
  });
}

/* =====================
   結果
===================== */
function buildShareUrl({code, job, dow, zod, aff, img}){
  const deity = deityName(code);
  const dayName = (DOW[dow]?.label)||'';
  const zodiacName = (ZODIAC[zod]?.name)||'';
  const color = (DOW[dow]?.color)||'';
  const params = new URLSearchParams({
    t:'quiz', deity, zodiac:zodiacName, color, dow:dayName,
    job:(QUESTIONS[1].opts[job]||''), brand:BRAND_NAME, api:API_BASE, affinity:String(aff||''), img: (img||''),
    logo: BRAND_LOGO,
  });
  return `${SHARE_PAGE}?${params.toString()}`;
}
function generateCoupon(code){
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混字元
  function rand(n){ let s=''; for(let i=0;i<n;i++){ s += alpha[Math.floor(Math.random()*alpha.length)]; } return s; }
  const ts = new Date();
  const y = String(ts.getFullYear()).slice(-2);
  const m = String(ts.getMonth()+1).padStart(2,'0');
  const d = String(ts.getDate()).padStart(2,'0');
  // 代碼格式：UC-<神祇>-<YYMMDD>-<4>-<4>
  return `UC-${code}-${y}${m}${d}-${rand(4)}-${rand(4)}`;
}

async function ensureMemberLoginForCoupon(){
  try{
    const res = await fetch('/api/auth/me', { credentials:'include', cache:'no-store' });
    if (res.ok) return true;
  }catch(_){}
  alert('請先登入會員才能領取優惠券，將為你導向登入頁。');
  window.location.href = '/api/auth/google/login?redirect=/quiz';
  return false;
}
async function issueCoupon(deityCode, amount, quizPayload){
  const payload = { deity: String(deityCode||'').toUpperCase(), amount: Number(amount||200), quiz: quizPayload || undefined };
  const headers = { 'Content-Type':'application/json' };
  // 直接呼叫本站新優惠券系統（公共 quiz 發券端點）
  const res = await fetch(`${COUPON_API}/issue-quiz`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
    cache: 'no-store'
  });
  const j = await res.json().catch(()=>null);
  if (res.status === 401){
    const err = new Error('LOGIN_REQUIRED');
    err.code = 'LOGIN_REQUIRED';
    throw err;
  }
  if (res.status === 429 && j && j.error === 'daily_limit'){
    const err = new Error('DAILY_LIMIT');
    err.code = 'daily_limit';
    throw err;
  }
  if (!res.ok || !j || !j.code){
    const err = new Error((j && j.error) || `ISSUE_FAILED_${res.status}`);
    err.code = (j && j.error) || 'ISSUE_FAILED';
    err.status = res.status;
    throw err;
  }
  return j.code;
}

async function showResult(opts){
  const rerender = !!(opts && opts.rerender);
  // guard
  if (!state.dow || !state.zod || !state.job || !state.p2 || !state.p3 || !state.p4 || !state.p5 || !state.p6 || !state.p7){
    alert('請完整作答「星期、星座與 7 題」'); return;
  }
  setResultLoading(true);
  try{
    // logged-in: allow only once per Taiwan day
    if (!rerender){
      const allow = await checkQuizDailyLimit(true);
      if (!allow) return;
    }

    const lang = getLang();
    const langParam = lang === 'en' ? 'en' : 'zh';
    const code = decideWinner(state);
    const score = compileScore(state);
    const ranked = Object.entries(score).sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0]));
    const secondaryCode = (ranked.find(([g])=> g !== code) || [code])[0];

    const primaryDeity = (typeof window.getDeityById === 'function') ? window.getDeityById(code) : null;
    const primaryName = deityName(code, lang);
    const secondaryName = deityName(secondaryCode, lang);
    const primaryId = (primaryDeity && (primaryDeity.id || primaryDeity.code)) || code;

    const dayInfoZh = DOW[state.dow] || {};
    const dayInfo = getDayInfo(state.dow, lang);
    const zInfo = getZodiacInfo(state.zod, lang);
    const jobLabel = QUESTIONS[1].opts[state.job] || '—';
    const zNameZh = ZODIAC[state.zod]?.name || '—';
    const zName = zInfo.name || zNameZh;
    const color = dayInfoZh.color || '';

    const quizProfile = {
      dow: state.dow,
      dowLabel: dayInfoZh.label || '',
      zod: state.zod,
      zodLabel: zNameZh,
      job: state.job,
      jobLabel,
      color,
      traits: [],
      answers: { p2: state.p2, p3: state.p3, p4: state.p4, p5: state.p5, p6: state.p6, p7: state.p7 },
      ts: Date.now()
    };

    const storedName = deityName(code, 'zh');
    if (!rerender){
      try{ localStorage.setItem('__lastQuizGuardian__', JSON.stringify({ code, name: storedName, ts: Date.now() })); }catch(_){}
      try{ localStorage.setItem('__lastQuizProfile__', JSON.stringify(quizProfile)); }catch(_){}
      try{ localStorage.setItem('__lastQuizBindPending__', JSON.stringify({ ts: Date.now() })); }catch(_){}

      // 若已登入，同步到會員檔案
      try{
        await fetch('/api/me/profile', {
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ guardian:{ code, name: storedName, ts: Date.now() }, quiz: quizProfile })
        });
      }catch(_){}
    }

    const topIntent = getOptionLabel(2, state.p2, lang) || getQuestionText(2, lang);
    const topBlocker = getOptionLabel(4, state.p4, lang) || getQuestionText(4, lang);
    const style = getElementHint(zInfo.element, lang);
    const intentParam = topIntent || 'general';

    const resultTitle = document.getElementById('resultTitle');
    const resultHook = document.getElementById('resultHook');
    const resultSummary = document.getElementById('resultSummary');

    if (resultTitle) resultTitle.textContent = lang === 'en' ? `Primary Deity: ${primaryName}` : `主守護神：${primaryName}`;
    const personalHook = getPersonalHook({
      lang,
      primaryDeity: primaryDeity || { code, name:{ zh: storedName, en: primaryName } },
      topIntent,
      topBlocker,
      style,
      day: dayInfo.label || '',
      zodiac: zName,
      job: getOptionLabel(1, state.job, lang)
    });
    if (resultHook){
      resultHook.textContent = personalHook;
    }
    if (resultSummary){
      resultSummary.textContent = '';
      resultSummary.style.display = 'none';
    }

    const primarySlot = document.getElementById('primaryDeityProfile');
    if (primarySlot){
      const fallback = primaryDeity || { code, name:{ zh: storedName, en: primaryName }, desc:{ zh:'', en:'' }, wear:{} };
      const html = (typeof window.renderDeityProfile === 'function') ? window.renderDeityProfile(fallback, lang) : '';
      primarySlot.innerHTML = html || '';
    }

    const secondarySlot = document.getElementById('secondaryDeityCard');
    if (secondarySlot){
      const reasonParts = [getOptionLabel(2, state.p2, lang), getOptionLabel(5, state.p5, lang)].filter(Boolean);
      const reasonText = reasonParts.length
        ? (lang === 'en'
            ? `Also resonates with “${reasonParts.join('” and “')}”, giving ${secondaryName} a strong signal.`
            : `你在「${reasonParts.join('」與「')}」的選擇也與 ${secondaryName} 相呼應。`)
        : (lang === 'en' ? `${secondaryName} is your second-closest resonance right now.` : `${secondaryName} 是此刻的第二順位共鳴。`);
      secondarySlot.innerHTML = `
        <div class="secondary-body">
          <div class="secondary-name">${secondaryName}</div>
          <div class="secondary-reason">${reasonText}</div>
        </div>
      `;
    }

    const aff = calcAffinityPercent(state, code);
    const bar = document.getElementById('affBar');
    if (bar) bar.style.width = aff + '%';
    const affText = document.getElementById('affText');
    if (affText) affText.textContent = `${aff}% ｜ ${affinityBrief(aff, lang)}`;

    const breakdown = buildScoreBreakdown(code);
    const affBreakdown = document.getElementById('affBreakdown');
    if (affBreakdown){
      affBreakdown.innerHTML = `
        <div class="row"><span>${t('breakdown-total', lang)}</span><strong>${breakdown.total}</strong></div>
        <div class="row"><span>${t('breakdown-base', lang)}</span><span>+${breakdown.base}</span></div>
        <div class="row"><span>${t('breakdown-role', lang)}</span><span>+${breakdown.role}</span></div>
        <div class="row"><span>${t('breakdown-intent', lang)}</span><span>+${breakdown.intent}</span></div>
        <div class="row"><span>${t('breakdown-action', lang)}</span><span>+${breakdown.action}</span></div>
      `;
    }

    const evidenceList = document.getElementById('evidenceList');
    if (evidenceList){
      const evidenceItems = buildEvidence({
        answers: {
          dow: state.dow,
          job: state.job,
          p2: state.p2,
          p3: state.p3,
          p4: state.p4,
          p5: state.p5,
          p6: state.p6,
          p7: state.p7
        },
        primaryDeity: primaryDeity || { code, name:{ zh: storedName, en: primaryName } },
        lang
      });
      evidenceList.innerHTML = evidenceItems.length
        ? evidenceItems.map(item => `<li>${item}</li>`).join('')
        : `<li>${lang === 'en' ? 'Your selections consistently point to this deity.' : '你的選擇一致指向這位守護神。'}</li>`;
    }

    const actionList = document.getElementById('actionList');
    if (actionList){
      const actions = buildActionItems(primaryDeity || {}, lang);
      actionList.innerHTML = actions.map(item => `
        <div class="action-item">
          <h4>${item.title}</h4>
          <p>${item.body}</p>
        </div>
      `).join('');
    }

    const keywords = pickPrimaryKeywords(primaryDeity || { code: primaryId }, lang);
    const shareUrl = `${location.origin}/quiz/?code=${encodeURIComponent(primaryId)}&intent=${encodeURIComponent(intentParam)}&lang=${encodeURIComponent(langParam)}`;
    const cardData = {
      code: primaryId,
      name: primaryName,
      keywords,
      hook: personalHook,
      date: formatFriendlyDate(lang),
      brand: 'unalomecodes',
      lang,
      intent: intentParam,
      url: shareUrl
    };
    lastGuardianCard = cardData;
    if (guardianCardPreview){
      renderGuardianCardPreview(cardData);
    }
    if (guardianCardDownloadBtn && !guardianCardDownloadBtn._bound){
      guardianCardDownloadBtn._bound = true;
      guardianCardDownloadBtn.addEventListener('click', downloadGuardianCard);
    }
    if (guardianCardCopyBtn && !guardianCardCopyBtn._bound){
      guardianCardCopyBtn._bound = true;
      guardianCardCopyBtn.addEventListener('click', copyGuardianCardShare);
    }

    let storiesHtml = '';
    if (typeof window.renderDeityStories === 'function'){
      storiesHtml = await window.renderDeityStories(code, lang);
    }
    const storiesBox = document.getElementById('deityStories');
    if (storiesBox){
      storiesBox.innerHTML = storiesHtml;
    }
    const userStoriesWrap = document.getElementById('userStoriesWrap');
    if (userStoriesWrap && typeof window.renderUserStoriesSection === 'function'){
      userStoriesWrap.innerHTML = window.renderUserStoriesSection(code, lang, { collapsed:true });
      const list = userStoriesWrap.querySelector('.story-list');
      if (list) list.innerHTML = storiesHtml;
    }

    const ctaShop = document.getElementById('ctaShopPrimaryBtn');
    const ctaTemple = document.getElementById('ctaTempleBtn');
    const deityLink = document.getElementById('deityLink');
    const shopFallback = `/shop?deity=${encodeURIComponent(primaryId)}&intent=${encodeURIComponent(intentParam)}&lang=${encodeURIComponent(langParam)}`;
    const templeFallback = `/templemap?deity=${encodeURIComponent(primaryId)}&intent=${encodeURIComponent(intentParam)}&lang=${encodeURIComponent(langParam)}`;
    const deityFallback = `${DEITY_PAGE}?code=${encodeURIComponent(primaryId)}&lang=${encodeURIComponent(langParam)}`;
    const shopUrl = (primaryDeity && primaryDeity.links && primaryDeity.links.shop_url) || shopFallback;
    const templeUrl = (primaryDeity && primaryDeity.links && primaryDeity.links.templemap_url) || templeFallback;
    const deityUrl = (primaryDeity && primaryDeity.links && primaryDeity.links.deity_profile_url) || deityFallback;

    if (ctaShop) ctaShop.href = shopUrl;
    if (ctaTemple) ctaTemple.href = templeUrl;
    if (deityLink) deityLink.href = deityUrl;

    if (ctaShop && !ctaShop._bound){
      ctaShop._bound = true;
      ctaShop.addEventListener('click', () => fireTrack('quiz_cta_shop_click', { primary: primaryId, intent: intentParam }));
    }
    if (ctaTemple && !ctaTemple._bound){
      ctaTemple._bound = true;
      ctaTemple.addEventListener('click', () => fireTrack('quiz_cta_temple_click', { primary: primaryId, intent: intentParam }));
    }

    // 取得佛牌配戴建議（沿用 LINE Bot 的生成邏輯，由後端提供）
    try {
      const advUrl = `${ADVICE_BASE}/amulet/advice?code=${encodeURIComponent(code)}&job=${encodeURIComponent(state.job)}&dow=${encodeURIComponent(state.dow)}&zod=${encodeURIComponent(state.zod)}`;
      const advEl = document.getElementById('amuletAdvice');
      if (advEl){
        advEl.style.display = 'block';
        advEl.textContent = lang === 'en' ? 'Loading...' : '載入中…';
      }
      const r2 = await fetch(advUrl);
      if (r2.ok) {
        const j2 = await r2.json();
        if (j2?.text) {
          const cleaned = (j2.text || '').replace(/^👉.*$/gm, '').trim();
          if (advEl) advEl.textContent = cleaned || (lang === 'en' ? 'No advice available yet.' : '（暫時無法取得建議，稍後再試）');
        } else if (advEl) {
          advEl.textContent = lang === 'en' ? 'No advice available yet.' : '（暫時無法取得建議，稍後再試）';
        }
      } else if (advEl) {
        advEl.textContent = lang === 'en' ? 'No advice available yet.' : '（暫時無法取得建議，稍後再試）';
      }
    } catch (e) {
      const advEl = document.getElementById('amuletAdvice');
      if (advEl){
        advEl.style.display = 'block';
        advEl.textContent = lang === 'en' ? 'No advice available yet.' : '（暫時無法取得建議，稍後再試）';
      }
    }

    // 優惠碼：點擊產生並顯示（優先後端發券，失敗則本地臨時券）
    (function(){
      const btn = document.getElementById('getCouponBtn');
      const box = document.getElementById('couponWrap');
      const copyBtn = document.getElementById('copyCouponBtn');
      const saveBtn = document.getElementById('saveCouponBtn');
      const shopBtn = null;
      async function saveToAccount(codeStr){
        if (!codeStr) return;
        try{
          const res = await fetch('/api/me/coupons', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'include',
            body: JSON.stringify({ code: codeStr })
          });
          const data = await res.json().catch(()=>({}));
          if (res.status === 401){
            alert(lang === 'en' ? 'Please log in first. Redirecting to sign-in.' : '請先登入會員，再儲存到「我的優惠券」。\\n將為你導向登入頁。');
            window.location.href = '/api/auth/google/login?redirect=/quiz';
            return;
          }
          if (!res.ok || !data.ok){
            throw new Error(data.error || ('HTTP '+res.status));
          }
          alert(lang === 'en' ? 'Saved to My Coupons.' : '已存到「我的優惠券」，可在購物車直接套用。');
        }catch(err){
          alert((lang === 'en' ? 'Save failed: ' : '儲存失敗，請稍後再試：') + (err.message||err));
        }
      }

      if (btn && !btn._bound){
        btn._bound = true;
        btn.addEventListener('click', async ()=>{
          if (!(await ensureMemberLoginForCoupon())) return;
          const dateKey = taipeiDateKey(Date.now());
          const key = `coupon_${code}_${dateKey}`;
          const box = document.getElementById('couponWrap');
          let stored = null; try{ stored = JSON.parse(localStorage.getItem(key)||'null'); }catch(_){ stored = null; }
          // 僅沿用新系統（v2）正式券；舊資料一律重發
          let coupon = (stored && stored.version === 'v2' && stored.issued) ? stored.code : '';
          try{
            if (!coupon){
              // 單次向後端索取，若守護神代碼不符直接改用本地券碼，避免錯發
              const real = await issueCoupon(code, 200, quizProfile);
              if (!real || typeof real !== 'string') throw new Error('NO_CODE');
              const seg = (real.split('-')[1]||'').toUpperCase();
              if (seg && seg !== code){
                console.warn('quiz coupon deity mismatch', { expected: code, got: seg, real });
              }
              coupon = real;
              try{ localStorage.setItem(key, JSON.stringify({ code: coupon, issued: true, deity: code, version:'v2', dateKey })); }catch(_){ }
            }
            // 顯示正式券碼（不再顯示任何臨時券提示）
            if (box){
              box.style.display = 'block';
              box.textContent = lang === 'en'
                ? `Your coupon: ${coupon}
Valid only for ${primaryName} related items.
Enter this code at checkout.`
                : `您的優惠碼：${coupon}
此優惠僅適用於「${primaryName}」相關商品
請在結帳頁輸入此代碼即可折扣`;
            }
            if (shopBtn){
              const u = new URL(shopBtn.href, location.origin);
              u.searchParams.set('coupon', coupon);
              u.searchParams.set('deity', code);
              u.searchParams.set('amount', '200');
              shopBtn.href = u.toString();
            }
            if (copyBtn){
              copyBtn.style.display = 'inline-flex';
              copyBtn.dataset.code = coupon;
              if (!copyBtn._bound){
                copyBtn._bound = true;
                copyBtn.addEventListener('click', async ()=>{
                  const c = copyBtn.dataset.code || '';
                  try{
                    await navigator.clipboard.writeText(c);
                    const old = copyBtn.textContent;
                    copyBtn.textContent = lang === 'en' ? 'Copied' : '已複製';
                    setTimeout(()=> copyBtn.textContent = old, 1200);
                  }catch(e){
                    // fallback for older browsers
                    try{
                      const ta = document.createElement('textarea');
                      ta.value = c; document.body.appendChild(ta);
                      ta.select(); document.execCommand('copy');
                      document.body.removeChild(ta);
                    }catch(_){ }
                    const old = copyBtn.textContent;
                    copyBtn.textContent = lang === 'en' ? 'Copied' : '已複製';
                    setTimeout(()=> copyBtn.textContent = old, 1200);
                  }
                });
              }
            }
            if (saveBtn){
              saveBtn.style.display = 'inline-flex';
              saveBtn.dataset.code = coupon;
              if (!saveBtn._bound){
                saveBtn._bound = true;
                saveBtn.addEventListener('click', ()=> saveToAccount(saveBtn.dataset.code||'')); 
              }
            }
          }catch(err){
            if (err && err.code === 'LOGIN_REQUIRED'){
              alert(lang === 'en' ? 'Please log in to claim a coupon.' : '請先登入會員才能領取優惠券，將為你導向登入頁。');
              window.location.href = '/api/auth/google/login?redirect=/quiz';
              return;
            }
            if (err && err.code === 'daily_limit'){
              alert(lang === 'en' ? 'You already claimed a coupon today. Try again after midnight (Taipei time).' : '今天已領取過優惠券，請於台灣時間午夜 12 點後再領取。');
              return;
            }
            if (err && err.code === 'quiz_required'){
              alert(lang === 'en' ? 'Finish the quiz first to claim your coupon.' : '請先完成守護神測驗後再領取優惠券。');
              return;
            }
            alert(lang === 'en' ? 'Unable to issue a coupon right now. Please try again later.' : '目前系統暫時無法發放優惠券，請稍後再試或聯繫客服。');
          }
        });
      }
    })();

    if (quizFlow) quizFlow.hidden = true;
    if (intro) intro.style.display = 'none';
    if (resultBox) resultBox.style.display = 'block';
    if (lineEntry) lineEntry.style.display = 'none';
    if (!rerender){
      window.scrollTo({ top: 0, behavior:'smooth' });
      fireTrack('quiz_complete', { primary: code, secondary: secondaryCode });
      clearState();
    }
    applyLang(lang);

    // 重新測驗：回到初始狀態
    try{
      const reBtn = document.getElementById('retakeBtn');
      if (reBtn){
        reBtn.onclick = async (ev)=>{
          ev.preventDefault();
          const ok = await checkQuizDailyLimit(true);
          if (!ok) return;
          resetQuiz(true);
          if (resultBox) resultBox.style.display = 'none';
          if (intro) intro.style.display = '';
          window.scrollTo({ top: 0, behavior:'smooth' });
        };
      }
    }catch(_){}
  } finally {
    setResultLoading(false);
  }
}


(function(){
  const fortuneDialog = document.getElementById('fortuneDialogQuiz');
  const fortuneClose = document.getElementById('fortuneCloseQuiz');
  const fortuneLoading = document.getElementById('fortuneLoadingQuiz');
  const fortuneError = document.getElementById('fortuneErrorQuiz');
  const fortuneCard = document.getElementById('fortuneCardQuiz');
  const fortuneDate = document.getElementById('fortuneDateQuiz');
  const fortuneStars = document.getElementById('fortuneStarsQuiz');
  const fortuneSummary = document.getElementById('fortuneSummaryQuiz');
  const fortuneAdvice = document.getElementById('fortuneAdviceQuiz');
  const fortuneRitual = document.getElementById('fortuneRitualQuiz');
  const fortuneMeta = document.getElementById('fortuneMetaQuiz');
  const fortuneRitualLabel = document.getElementById('fortuneRitualLabelQuiz');

  function showDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open','open');
  }
  function closeDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }
  function setFortuneLoading(){
    if (fortuneLoading) fortuneLoading.style.display = '';
    if (fortuneError) fortuneError.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = 'none';
  }
  function setFortuneError(message){
    if (fortuneError){
      fortuneError.textContent = message || '暫時無法取得日籤，請稍後再試。';
      fortuneError.style.display = '';
    }
    if (fortuneLoading) fortuneLoading.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = 'none';
  }
  function renderFortune(fortune){
    if (!fortune) return;
    if (fortuneDate) fortuneDate.textContent = fortune.date || '';
    if (fortuneStars){
      const stars = fortune.stars || '';
      fortuneStars.textContent = stars;
      fortuneStars.style.display = stars ? '' : 'none';
    }
    if (fortuneSummary) fortuneSummary.textContent = fortune.summary || '';
    if (fortuneAdvice) fortuneAdvice.textContent = fortune.advice || '';
    if (fortuneRitual) fortuneRitual.textContent = fortune.ritual || '';
    if (fortuneMeta){
      const meta = fortune.meta || {};
      const tags = [];
      if (meta.userZodiac){
        const zodiacLabel = meta.userZodiacElement ? `${meta.userZodiac}（${meta.userZodiacElement}象）` : meta.userZodiac;
        tags.push(`星座 ${zodiacLabel}`);
      }
      if (meta.moonPhase) tags.push(`月相 ${meta.moonPhase}`);
      if (meta.iching) tags.push(`易經 ${meta.iching}`);
      if (meta.todayDow) tags.push(`今日星期${meta.todayDow}`);
      if (meta.thaiDayColor) tags.push(`泰國星期色 ${meta.thaiDayColor}`);
      if (meta.buddhistYear) tags.push(`佛曆 ${meta.buddhistYear}`);
      fortuneMeta.innerHTML = tags.map(t=>`<span>${t}</span>`).join('');
    }
    if (fortuneRitualLabel){
      const gName = (fortune.meta && fortune.meta.guardianName) || '';
      fortuneRitualLabel.textContent = gName ? `守護神 ${gName} 想對你說` : '守護神想對你說';
    }
    if (fortuneLoading) fortuneLoading.style.display = 'none';
    if (fortuneError) fortuneError.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = '';
  }
  async function fetchFortune(){
    setFortuneLoading();
    try{
      const res = await fetch('/api/fortune', { cache:'no-store', credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || data.ok === false){
        if (data && data.needQuiz) throw new Error('請先完成守護神測驗後再領取日籤。');
        throw new Error((data && data.error) || '取得日籤失敗');
      }
      renderFortune(data.fortune || null);
    }catch(err){
      setFortuneError(err && err.message ? err.message : '暫時無法取得日籤');
    }
  }
  async function openFortuneDialog(){
    const loggedIn = window.authState && typeof window.authState.isLoggedIn==='function' ? window.authState.isLoggedIn() : false;
    if (!loggedIn){
      if (window.authState && typeof window.authState.promptLogin === 'function'){
        window.authState.promptLogin('請先登入後再領取日籤。');
      }
      return;
    }
    showDialog(fortuneDialog);
    await fetchFortune();
  }
  document.addEventListener('click', ev=>{
    const btn = ev.target.closest('[data-fortune-btn]');
    if (!btn) return;
    ev.preventDefault();
    openFortuneDialog();
  });
  if (fortuneClose){
    fortuneClose.addEventListener('click', ()=> closeDialog(fortuneDialog));
  }
})();
