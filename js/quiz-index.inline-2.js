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
    'cta-shop': '看你的專屬配戴精選',
    'cta-temple': '去拜更有感的寺廟建議',
    'cta-deity': '看完整神祇介紹',
    'cta-retake': '重新測驗一次',
    'cta-coupon': '點我領取專屬優惠',
    'cta-copy-coupon': '複製優惠碼',
    'cta-save-coupon': '存到我的優惠券',
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
    'result-hook-1': '從「{goal}」到「{blessing}」，你現在最需要的是 {deity} 的節奏。',
    'result-hook-2': '你在「{challenge}」上反覆遇到課題，{deity} 會先讓你穩住方向。',
    'result-hook-3': '你的生活關鍵字是「{desc}」與「{response}」，{deity} 正好補上這段。',
    'result-hook-4': '選擇「{ideal}」作為理想狀態，代表你需要更清楚的節奏，{deity} 會帶來對位。',
    'result-hook-5': '星座是 {zodiac}、生日星期是 {day}，{deity} 會放大你的優勢並補齊盲點。',
    'result-hook-6': '從「{job}」的角色出發，{deity} 會讓你更容易穩定推進。'
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
    'cta-shop': 'See your curated picks',
    'cta-temple': 'Visit a matching temple',
    'cta-deity': 'Full deity profile',
    'cta-retake': 'Retake the quiz',
    'cta-coupon': 'Get your personal offer',
    'cta-copy-coupon': 'Copy coupon',
    'cta-save-coupon': 'Save to my coupons',
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
    'result-hook-1': 'From “{goal}” to “{blessing}”, you’re aligning most with {deity} right now.',
    'result-hook-2': 'You keep meeting “{challenge}”, so {deity} helps you steady the direction first.',
    'result-hook-3': 'Your keywords are “{desc}” and “{response}”—{deity} fills the missing piece.',
    'result-hook-4': 'Choosing “{ideal}” as your ideal state shows what you need now, and {deity} matches that rhythm.',
    'result-hook-5': 'With {zodiac} and a {day} birthday, {deity} amplifies your strengths and balances blind spots.',
    'result-hook-6': 'Based on your role in “{job}”, {deity} helps you move with steadier momentum.'
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

function buildPersonalHook(ctx, lang){
  const dict = I18N[lang] || I18N.zh;
  const templates = [1,2,3,4,5,6].map(i => dict['result-hook-' + i]).filter(Boolean);
  const seed = stableHash(encodeState(state) + ':' + lang);
  const chosen = templates[seed % templates.length] || templates[0] || '';
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

function buildEvidence(code, lang, deityNameText){
  const items = [];
  const dayInfo = getDayInfo(state.dow, lang);
  if ((DOW[state.dow]?.weight || []).includes(code)){
    const text = lang === 'en'
      ? `Your birth weekday (${dayInfo.label || ''}) directly boosts ${deityNameText}.`
      : `出生星期（${dayInfo.label || ''}）直接加強了 ${deityNameText}。`;
    items.push({ weight: 1, text });
  }
  for (let i=1;i<=7;i++){
    const pick = (i === 1) ? state.job : state['p'+i];
    if (!pick) continue;
    const weight = scoreForQuestion(code, i, pick);
    if (!weight) continue;
    const qText = getQuestionText(i, lang);
    const optText = getOptionLabel(i, pick, lang);
    const text = lang === 'en'
      ? `Because you chose “${optText}” for “${qText}”.`
      : `因為你在「${qText}」選了「${optText}」。`;
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
function showLineEntry(profile){
  if (!lineEntry) return;
  if (!profile || !profile.guardian || forceQuiz){
    lineEntry.style.display = 'none';
    setQuizVisible(true);
    renderStep();
    return;
  }
  const code = String(profile.guardian.code || '').toUpperCase();
  const name = profile.guardian.name || (code ? deityName(code) : '守護神');
  if (lineGuardianBadge){
    lineGuardianBadge.innerHTML = `<img src="${badgeIcon}" alt="守護神"><div class="guardian-meta"><strong>守護神：${name}</strong><button type="button" class="fortune-btn" data-fortune-btn>領取日籤</button></div>`;
    lineGuardianBadge.style.display = 'flex';
  }
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
    const code = decideWinner(state);
    const score = compileScore(state);
    const ranked = Object.entries(score).sort((a,b)=> (b[1]-a[1]) || a[0].localeCompare(b[0]));
    const secondaryCode = (ranked.find(([g])=> g !== code) || [code])[0];

    const primaryDeity = (typeof window.getDeityById === 'function') ? window.getDeityById(code) : null;
    const primaryName = deityName(code, lang);
    const secondaryName = deityName(secondaryCode, lang);

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

    const hookCtx = {
      goal: getOptionLabel(2, state.p2, lang),
      blessing: getOptionLabel(3, state.p3, lang),
      challenge: getOptionLabel(4, state.p4, lang),
      desc: getOptionLabel(5, state.p5, lang),
      response: getOptionLabel(6, state.p6, lang),
      ideal: getOptionLabel(7, state.p7, lang),
      job: getOptionLabel(1, state.job, lang),
      zodiac: zName,
      day: dayInfo.label || '',
      deity: primaryName
    };

    const resultTitle = document.getElementById('resultTitle');
    const resultHook = document.getElementById('resultHook');
    const resultSummary = document.getElementById('resultSummary');

    if (resultTitle) resultTitle.textContent = lang === 'en' ? `Primary Deity: ${primaryName}` : `主守護神：${primaryName}`;
    if (resultHook) resultHook.textContent = buildPersonalHook(hookCtx, lang);
    if (resultSummary){
      const why = dayInfo.tip || (lang === 'en' ? 'Your answers point to this deity.' : '你的選擇指向這位守護神。');
      resultSummary.textContent = `${t('result-why-title', lang)}：${why}`;
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
      const evidenceItems = buildEvidence(code, lang, primaryName);
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

    const ctaShop = document.getElementById('ctaShopBtn');
    const ctaTemple = document.getElementById('ctaTempleBtn');
    const deityLink = document.getElementById('deityLink');
    const shopUrl = (primaryDeity && primaryDeity.links && primaryDeity.links.shop_url) || `/shop?deity=${encodeURIComponent(code)}`;
    const templeUrl = (primaryDeity && primaryDeity.links && primaryDeity.links.templemap_url) || '/templemap';
    const deityUrl = (primaryDeity && primaryDeity.links && primaryDeity.links.deity_profile_url) || `${DEITY_PAGE}?code=${encodeURIComponent(code)}`;

    if (ctaShop) ctaShop.href = shopUrl;
    if (ctaTemple) ctaTemple.href = templeUrl;
    if (deityLink) deityLink.href = deityUrl;

    if (ctaShop && !ctaShop._bound){
      ctaShop._bound = true;
      ctaShop.addEventListener('click', () => fireTrack('quiz_cta_shop_click', { primary: code }));
    }
    if (ctaTemple && !ctaTemple._bound){
      ctaTemple._bound = true;
      ctaTemple.addEventListener('click', () => fireTrack('quiz_cta_temple_click', { primary: code }));
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
