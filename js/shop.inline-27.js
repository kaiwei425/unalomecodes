(function(){
  const link = document.getElementById('privacyLinkShop');
  const dialog = document.getElementById('privacyDialogShop');
  const closeBtn = document.getElementById('privacyCloseShop');
  if (!dialog) return;
  function openPolicy(){
    if (typeof dialog.showModal === 'function'){
      dialog.showModal();
    }else{
      dialog.setAttribute('open','open');
    }
  }
  function closePolicy(){
    if (typeof dialog.close === 'function'){
      dialog.close();
    }else{
      dialog.removeAttribute('open');
    }
  }
  if (link){
    link.addEventListener('click', e=>{
      e.preventDefault();
      openPolicy();
    });
  }
  if (closeBtn){
    closeBtn.addEventListener('click', closePolicy);
}
})();

// 守護神徽章（顯示最近測驗結果）
(function(){
  const badge = document.getElementById('guardianBadge');
  const fortuneDialog = document.getElementById('fortuneDialog');
  const fortuneClose = document.getElementById('fortuneClose');
  const fortuneLoading = document.getElementById('fortuneLoading');
  const fortuneError = document.getElementById('fortuneError');
  const fortuneCard = document.getElementById('fortuneCard');
  const fortuneDate = document.getElementById('fortuneDate');
  const fortuneStars = document.getElementById('fortuneStars');
  const fortuneSummary = document.getElementById('fortuneSummary');
  const fortuneYam = fortuneDialog ? fortuneDialog.querySelector('[data-yam-container]') : null;
  const fortuneAdvice = document.getElementById('fortuneAdvice');
  const fortuneTaskWrap = document.getElementById('fortuneTaskWrapShop');
  const fortuneTaskText = document.getElementById('fortuneTaskTextShop');
  const fortuneTaskToggle = document.getElementById('fortuneTaskToggleShop');
  const fortuneTaskStreak = document.getElementById('fortuneTaskStreakShop');
  const fortuneTaskFeedback = document.getElementById('fortuneTaskFeedbackShop');
  const fortuneRitual = document.getElementById('fortuneRitual');
  const fortuneMeta = document.getElementById('fortuneMeta');
  const fortuneRitualLabel = document.getElementById('fortuneRitualLabel');
  const fortuneExplain = document.getElementById('fortuneExplainShop');
  const fortuneExplainToggle = document.getElementById('fortuneExplainToggleShop');
  const fortuneExplainBody = document.getElementById('fortuneExplainBodyShop');
  const fortuneExplainTitle = document.getElementById('fortuneExplainTitleShop');
  const fortuneExplainDesc = document.getElementById('fortuneExplainDescShop');
  const fortuneExplainHow = document.getElementById('fortuneExplainHowShop');
  let fortuneShareBtn = null;
  const recommendDialog = document.getElementById('guardianRecommendDialog');
  const recommendClose = document.getElementById('guardianRecommendClose');
  const recommendName = document.getElementById('guardianRecommendName');
  const recommendList = document.getElementById('guardianRecommendList');
  const historyDialog = document.getElementById('fortuneHistoryDialog');
  const historyList = document.getElementById('fortuneHistoryList');
  const historyError = document.getElementById('fortuneHistoryError');
  const SHOP_FORTUNE_PENDING = '__shopFortunePending__';
  let lastFortune = null;
  let lastFortunePayload = null;
  let lastGuardianName = '';
  let lastGuardianCode = '';
  let recommendRetry = 0;
  let currentRecommendItems = [];
  let midnightTimer = null;
  const FORTUNE_KEY = '__fortune_last_date__';
  const TASK_KEY_PREFIX = 'FORTUNE_TASK_DONE';
  const STREAK_COUNT_KEY = 'FORTUNE_STREAK_COUNT';
  const STREAK_LAST_KEY = 'FORTUNE_STREAK_LAST_DATE';
  const FORTUNE_CACHE_KEY = '__fortune_payload__';
  const map = {FM:'四面神',GA:'象神',CD:'崇迪佛',KP:'坤平',HP:'魂魄勇',XZ:'徐祝老人',WE:'五眼四耳',HM:'猴神哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神'};
  const PHUM_FEEDBACK = {
    AYU: { title:'續航回正', body:'Ayu 日重點在節奏與續航。你完成這個小任務，等於把能量拉回可持續狀態。' },
    DECH:{ title:'行動到位', body:'Dech 日主打行動與決斷。你完成這一步，能把卡關點推進。' },
    SRI:{ title:'順流啟動', body:'Sri 日偏向順流與收穫。這個小步驟會讓機會更容易到位。' },
    MULA:{ title:'根基穩固', body:'Mula 日重點在根基與秩序。你先完成這件事，整體會更穩。' },
    UTSAHA:{ title:'推進有力', body:'Utsaha 日強調推進與執行。這個任務能讓進度往前走。' },
    MONTRI:{ title:'協調順暢', body:'Montri 日聚焦協調與支援。你完成這一步，溝通會更順。' },
    BORIWAN:{ title:'節奏整理', body:'Boriwan 日著重安排與分配。完成這件事有助於聚焦。' },
    KALAKINI:{ title:'避險成功', body:'Kalakini 日重點是降低風險與誤判。你完成這步，等於先把地雷排掉。' }
  };
  const TAKSA_EXPLAIN = {
    AYU: {
      title: "為什麼今天是 Ayu（日）？",
      description: "Ayu（壽）日在泰國 Maha Taksa 命理中，代表的是身心節奏、續航力與穩定狀態。當你的出生日與今天的星期形成 Ayu 組合時，命理上不適合急推結果，而適合先把節奏調回正軌。",
      howToUse: "今天只要完成一件「讓你恢復節奏的小事」（例如整理環境、減少干擾），就是在順著運勢走。"
    },
    SRI: {
      title: "為什麼今天是 Sri（日）？",
      description: "Sri（日）代表財運、吸引力與順流。這一天適合讓好事自然發生，而不是用力推進。",
      howToUse: "今天適合曝光、分享、談錢或接受他人的善意。"
    },
    DECH: {
      title: "為什麼今天是 Dech（日）？",
      description: "Dech（日）象徵權力、行動與決斷力。這一天適合主動出擊。",
      howToUse: "今天適合做決定、談判或推動卡關的事情。"
    },
    KALAKINI: {
      title: "為什麼今天是 Kalakini（日）？",
      description: "Kalakini（日）代表阻礙與雜訊。不是倒楣，而是提醒你避開衝突。",
      howToUse: "今天不宜硬碰硬，適合保守行事或做轉運、清理型行動。"
    },
    BORIWAN: {
      title: "為什麼今天是 Boriwan（日）？",
      description: "Boriwan（日）代表整合、協調與資源調度。這一天適合安排與分配，讓事情更有秩序。",
      howToUse: "今天適合整理手邊資源、分配工作或調整行程。"
    },
    MULA: {
      title: "為什麼今天是 Mula（日）？",
      description: "Mula（日）象徵根基、土地與安全感。這一天適合把基礎打穩，而不是冒進。",
      howToUse: "今天適合補洞、整理基礎、處理需要長期堆疊的事。"
    },
    UTSAHA: {
      title: "為什麼今天是 Utsaha（日）？",
      description: "Utsaha（日）代表努力與推進。這一天適合用穩定的步驟把事情往前推。",
      howToUse: "今天適合把一件事情推到下一個可見的里程碑。"
    },
    MONTRI: {
      title: "為什麼今天是 Montri（日）？",
      description: "Montri（日）代表幫助、支持與貴人運。這一天適合合作、請求資源或建立信任。",
      howToUse: "今天適合聯絡重要的人、協調資源或請求協助。"
    }
  };
  const badgeIcon = (function(){
    if (window.GUARDIAN_BADGE_ICON) return window.GUARDIAN_BADGE_ICON;
    return '/img/guardian-emblem.png'; // 請將圖檔放在此路徑
  })();
  function getTaipeiDateKey(date){
    try{
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date || new Date());
      const mapParts = {};
      parts.forEach(part=>{
        if (part.type !== 'literal') mapParts[part.type] = part.value;
      });
      if (!mapParts.year || !mapParts.month || !mapParts.day) return '';
      return `${mapParts.year}-${mapParts.month}-${mapParts.day}`;
    }catch(_){
      return '';
    }
  }
  function fnv1aHash(str){
    let h = 2166136261;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function simpleHash(str){
    return fnv1aHash(String(str || '')).toString(16);
  }
  function normalizeDateKey(dateKey){
    if (!dateKey) return '';
    return String(dateKey).trim().replace(/\//g, '-');
  }
  function resolveDateKey(data, fortune){
    if (data && data.dateKey) return String(data.dateKey || '').replace(/\s+/g,'');
    if (fortune && fortune.dateKey) return String(fortune.dateKey || '').replace(/\s+/g,'');
    if (fortune && fortune.date) return String(fortune.date || '').replace(/\s+/g,'');
    return '';
  }
  function getTaskDoneKey(dateKey, task){
    if (!dateKey || !task) return '';
    return `${TASK_KEY_PREFIX}:${dateKey}:${simpleHash(task)}`;
  }
  function isTaskDone(dateKey, task){
    const key = getTaskDoneKey(dateKey, task);
    if (!key) return false;
    try{ return localStorage.getItem(key) === '1'; }catch(_){ return false; }
  }
  function setTaskDone(dateKey, task, done){
    const key = getTaskDoneKey(dateKey, task);
    if (!key) return;
    try{
      if (done) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    }catch(_){}
  }
  function toggleTaskDone(dateKey, task){
    const next = !isTaskDone(dateKey, task);
    setTaskDone(dateKey, task, next);
    return next;
  }
  function getYesterdayKey(dateKey){
    const key = normalizeDateKey(dateKey);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
    const [y,m,d] = key.split('-').map(n=> Number(n));
    const ts = Date.UTC(y, m - 1, d) - 86400000;
    return new Date(ts).toISOString().slice(0,10);
  }
  function getStreakState(){
    let count = 0;
    let last = '';
    try{
      count = Number(localStorage.getItem(STREAK_COUNT_KEY) || 0) || 0;
      last = String(localStorage.getItem(STREAK_LAST_KEY) || '');
    }catch(_){}
    return { count, last };
  }
  function setStreakState(count, last){
    try{
      localStorage.setItem(STREAK_COUNT_KEY, String(count));
      localStorage.setItem(STREAK_LAST_KEY, String(last || ''));
    }catch(_){}
  }
  function updateStreakOnComplete(dateKey){
    const key = normalizeDateKey(dateKey);
    if (!key) return 0;
    const { count, last } = getStreakState();
    if (last === key) return count;
    const yesterday = getYesterdayKey(key);
    const next = last === yesterday ? count + 1 : 1;
    setStreakState(next, key);
    return next;
  }
  function renderStreak(dateKey, done){
    if (!fortuneTaskStreak) return;
    if (!done){
      fortuneTaskStreak.style.display = 'none';
      return;
    }
    const { count } = getStreakState();
    if (!count){
      fortuneTaskStreak.style.display = 'none';
      return;
    }
    fortuneTaskStreak.textContent = `🔥 已連續完成 ${count} 天`;
    fortuneTaskStreak.style.display = '';
  }
  function isTodayKey(dateKey){
    const today = getTaipeiDateKey(new Date());
    if (!today) return false;
    return normalizeDateKey(dateKey) === today;
  }
  function getCurrentGuardianCode(){
    const g = readGuardian();
    if (g && (g.code || g.id)) return String(g.code || g.id || '').toUpperCase();
    const code = badge && badge.dataset ? badge.dataset.guardianCode : '';
    return String(code || '').toUpperCase();
  }
  function readFortuneCache(){
    try{
      const raw = localStorage.getItem(FORTUNE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const dateKey = String(parsed && parsed.dateKey || '');
      const today = getTaipeiDateKey(new Date());
      if (!dateKey || dateKey !== today) return null;
      const cachedCode = String(parsed && parsed.meta && parsed.meta.guardianCode || '').toUpperCase();
      const currentCode = getCurrentGuardianCode();
      if (cachedCode && currentCode && cachedCode !== currentCode) return null;
      if (!parsed || !parsed.fortune) return null;
      return parsed;
    }catch(_){
      return null;
    }
  }
  function writeFortuneCache(payload){
    if (!payload || !payload.fortune) return;
    try{
      localStorage.setItem(FORTUNE_CACHE_KEY, JSON.stringify(payload));
    }catch(_){}
  }
  function readFortuneKey(){
    try{
      return localStorage.getItem(FORTUNE_KEY) || '';
    }catch(_){
      return '';
    }
  }
  function writeFortuneKey(key){
    try{
      localStorage.setItem(FORTUNE_KEY, key);
    }catch(_){}
  }
  function shouldShowFortuneAlert(){
    const today = getTaipeiDateKey(new Date());
    if (!today) return false;
    const last = readFortuneKey();
    return last !== today;
  }
  function updateFortuneAlert(){
    if (!badge) return;
    const alertEl = badge.querySelector('[data-guardian-alert]');
    const menuBadge = badge.querySelector('.guardian-menu-badge');
    if (!alertEl) return;
    if (shouldShowFortuneAlert()){
      alertEl.textContent = '1';
      alertEl.style.display = 'flex';
      if (menuBadge){
        menuBadge.textContent = '1';
        menuBadge.style.display = 'flex';
      }
    }else{
      alertEl.style.display = 'none';
      if (menuBadge) menuBadge.style.display = 'none';
    }
  }
  function markFortuneClaimed(){
    const today = getTaipeiDateKey(new Date());
    if (!today) return;
    writeFortuneKey(today);
    updateFortuneAlert();
  }
  function getTaipeiNow(){
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  }
  function scheduleFortuneReset(){
    clearTimeout(midnightTimer);
    const nowTz = getTaipeiNow();
    const next = new Date(nowTz);
    next.setHours(24, 0, 0, 0);
    const delay = Math.max(1000, next - nowTz);
    midnightTimer = setTimeout(()=>{
      updateFortuneAlert();
      scheduleFortuneReset();
    }, delay + 200);
  }
  function getRecommendedItems(code){
    const name = map[code] || '';
    const items = Array.isArray(window.rawItems) ? window.rawItems : [];
    if (!name || !items.length) return [];
    return items.filter(p => p && String(p.deity||'').trim() === name);
  }
  function renderRecommendDialog(){
    if (!recommendDialog || !recommendList) return;
    const g = readGuardian();
    if (!g){
      if (recommendName) recommendName.textContent = '尚未完成測驗';
      recommendList.innerHTML = '<div class="guardian-recommend-empty">請先完成守護神測驗後再查看推薦商品。</div>';
      return;
    }
    const code = String(g.code||'').toUpperCase();
    const name = map[code] || '守護神';
    if (recommendName) recommendName.textContent = name;
    const ready = Array.isArray(window.rawItems) && window.rawItems.length;
    const items = getRecommendedItems(code);
    currentRecommendItems = items.slice(0, 6);
    if (!ready){
      recommendList.innerHTML = '<div class="guardian-recommend-empty">推薦商品載入中…</div>';
      if (recommendRetry < 8){
        recommendRetry += 1;
        setTimeout(renderRecommendDialog, 600);
      }
      return;
    }
    if (!currentRecommendItems.length){
      recommendList.innerHTML = '<div class="guardian-recommend-empty">暫無推薦商品</div>';
      return;
    }
    recommendList.innerHTML = currentRecommendItems.map((p, idx)=>(
      `<button type="button" class="guardian-recommend-item" data-recommend-item="${idx}">
        <span>${escapeHtml(p.name || '未命名商品')}</span>
        <em>查看</em>
      </button>`
    )).join('');
    recommendList.querySelectorAll('[data-recommend-item]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.getAttribute('data-recommend-item'));
        const item = currentRecommendItems[idx];
        if (item && typeof openDetail === 'function'){
          openDetail(item);
        }
      });
    });
  }
  function openRecommendDialog(){
    const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
      ? window.authState.isLoggedIn()
      : false;
    if (!loggedIn){
      if (window.authState && typeof window.authState.promptLogin === 'function'){
        window.authState.promptLogin('請先登入後再查看推薦商品。');
      }
      return;
    }
    if (!recommendDialog) return;
    recommendRetry = 0;
    showDialog(recommendDialog);
    renderRecommendDialog();
  }
  function showDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', 'open');
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
  function renderExplain(fortune){
    if (!fortuneExplain || !fortuneExplainToggle || !fortuneExplainBody) return;
    const phum = fortune && fortune.core ? fortune.core.phum : '';
    const explain = phum ? TAKSA_EXPLAIN[phum] : null;
    if (!explain){
      fortuneExplain.style.display = 'none';
      return;
    }
    fortuneExplain.style.display = '';
    fortuneExplainToggle.textContent = `📖 為什麼今天是 ${phum} 日？`;
    if (fortuneExplainTitle) fortuneExplainTitle.textContent = explain.title;
    if (fortuneExplainDesc) fortuneExplainDesc.textContent = explain.description;
    if (fortuneExplainHow) fortuneExplainHow.textContent = explain.howToUse;
    fortuneExplainBody.hidden = true;
    fortuneExplainToggle.setAttribute('aria-expanded', 'false');
  }
  function renderFortune(fortune, meta, data){
    if (!fortune) return;
    lastFortune = fortune;
    lastFortunePayload = data || lastFortunePayload;
    if (fortuneDate) fortuneDate.textContent = fortune.date || '';
    if (fortuneStars){
      const stars = fortune.stars || '';
      fortuneStars.textContent = stars;
      fortuneStars.style.display = stars ? '' : 'none';
    }
    if (fortuneSummary) fortuneSummary.textContent = fortune.summary || '';
    renderExplain(fortune);
    if (fortuneAdvice) fortuneAdvice.textContent = fortune.advice || '';
    if (fortuneYam && window.YamUbakongUI){
      window.YamUbakongUI.renderYamUbakong({ containerEl: fortuneYam, payload: data || {} });
    }else if (fortuneYam){
      fortuneYam.style.display = 'none';
      fortuneYam.innerHTML = '';
    }
    if (fortuneTaskWrap && fortuneTaskText && fortuneTaskToggle){
      const task = fortune && fortune.action ? String(fortune.action.task || '').trim() : '';
      if (!task){
        fortuneTaskWrap.style.display = 'none';
      }else{
        const dateKey = resolveDateKey(data, fortune);
        const done = isTaskDone(dateKey, task);
        fortuneTaskText.textContent = task;
        fortuneTaskWrap.style.display = '';
        fortuneTaskWrap.dataset.dateKey = dateKey;
        fortuneTaskWrap.dataset.task = task;
        const isHistory = dateKey && !isTodayKey(dateKey);
        fortuneTaskWrap.dataset.isHistory = isHistory ? '1' : '';
        fortuneTaskToggle.setAttribute('aria-pressed', done ? 'true' : 'false');
        fortuneTaskToggle.textContent = done ? '✅ 已完成（+1 功德）' : '☐ 我完成了';
        renderStreak(dateKey, done);
        if (done) renderTaskFeedback(fortune, data);
        else if (fortuneTaskFeedback){
          fortuneTaskFeedback.style.display = 'none';
          fortuneTaskFeedback.innerHTML = '';
        }
      }
    }
    if (fortuneRitual) fortuneRitual.textContent = fortune.ritual || '';
    if (fortuneMeta){
      const payloadMeta = meta || (data && data.meta) || fortune.meta || {};
      const tags = [];
      if (payloadMeta.guardianName) tags.push(payloadMeta.guardianName);
      if (payloadMeta.element) tags.push(payloadMeta.element);
      if (payloadMeta.focus) tags.push(payloadMeta.focus);
      fortuneMeta.innerHTML = tags.map(t=>`<span>${t}</span>`).join('');
    }
    if (fortuneRitualLabel){
      const gName = (meta && meta.guardianName) || (fortune.meta && fortune.meta.guardianName) || '';
      lastGuardianName = gName || lastGuardianName;
      fortuneRitualLabel.textContent = gName ? `守護神 ${gName} 想對你說` : '守護神想對你說';
    }
    ensureShareButton();
    if (fortuneLoading) fortuneLoading.style.display = 'none';
    if (fortuneError) fortuneError.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = '';
  }
  function renderTaskFeedback(fortune, data){
    if (!fortuneTaskFeedback) return;
    const phum = fortune && fortune.core ? fortune.core.phum : '';
    const base = PHUM_FEEDBACK[phum];
    if (!base){
      fortuneTaskFeedback.style.display = 'none';
      fortuneTaskFeedback.innerHTML = '';
      return;
    }
    let body = base.body;
    const signals = (data && data.meta && (data.meta.userSignals || data.meta.signals)) || null;
    const focus = signals && Array.isArray(signals.focus) ? signals.focus[0] : '';
    const job = signals && signals.job ? String(signals.job) : '';
    if (focus){
      body = `${body} 尤其在「${focus}」上，先做可控的小步驟會更順。`;
    }else if (job){
      body = `${body} 對${job}來說，先完成可驗證的小步驟會更有效。`;
    }
    fortuneTaskFeedback.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = base.title;
    const br = document.createElement('br');
    const span = document.createElement('span');
    span.textContent = body;
    fortuneTaskFeedback.append(strong, br, span);
    fortuneTaskFeedback.style.display = '';
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
      const fortune = data.fortune || null;
      renderFortune(fortune, data && data.meta ? data.meta : null, data || null);
      if (fortune) markFortuneClaimed();
      writeFortuneCache(data || null);
    }catch(err){
      setFortuneError(err && err.message ? err.message : '暫時無法取得日籤');
    }
  }
  async function openFortuneDialog(){
    const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
      ? window.authState.isLoggedIn()
      : false;
    if (!loggedIn){
      if (window.authState && typeof window.authState.promptLogin === 'function'){
        try{ sessionStorage.setItem(SHOP_FORTUNE_PENDING, '1'); }catch(_){}
        window.authState.promptLogin('請先登入後再領取日籤。');
      }
      return;
    }
    if (window.__fortuneClaimLock) return;
    window.__fortuneClaimLock = true;
    try{
      if (window.authState && typeof window.authState.syncPendingQuizToAccount === 'function'){
        const res = await window.authState.syncPendingQuizToAccount();
        if (res && res.ok === false){
          alert('同步失敗，請回到結果頁重新嘗試或重新測驗。');
          return;
        }
      }
      const cached = readFortuneCache();
      if (cached){
        renderFortune(cached.fortune, cached.meta || null, cached);
        markFortuneClaimed();
        showDialog(fortuneDialog);
        return;
      }
      showDialog(fortuneDialog);
      await fetchFortune();
    } finally {
      window.__fortuneClaimLock = false;
    }
  }
  function openMenu(){
    if (!badge) return;
    const menu = badge.querySelector('[data-guardian-menu]');
    if (!menu) return;
    menu.classList.add('guardian-menu--open');
    menu.setAttribute('aria-hidden', 'false');
    badge.setAttribute('aria-expanded', 'true');
  }
  function closeMenu(){
    if (!badge) return;
    const menu = badge.querySelector('[data-guardian-menu]');
    if (!menu) return;
    menu.classList.remove('guardian-menu--open');
    menu.setAttribute('aria-hidden', 'true');
    badge.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu(){
    if (!badge) return;
    const menu = badge.querySelector('[data-guardian-menu]');
    if (!menu) return;
    if (menu.classList.contains('guardian-menu--open')) closeMenu();
    else openMenu();
  }
  function openRecommended(){
    openRecommendDialog();
  }
  async function loadImageFromUrl(url){
    if (!url) return null;
    try{
      const res = await fetch(url, { mode:'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return await createImageBitmap(blob);
    }catch(_){ return null; }
  }
  function drawRoundRect(ctx, x, y, w, h, r){
    if (ctx.roundRect){
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
  }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = String(text || '').split('');
    let line = '';
    let offsetY = y;
    for (let i=0;i<words.length;i++){
      const test = line + words[i];
      if (ctx.measureText(test).width > maxWidth && line){
        ctx.fillText(line, x, offsetY);
        line = words[i];
        offsetY += lineHeight;
      }else{
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, offsetY);
    return offsetY;
  }
  async function buildFortuneShareImage(){
    if (!lastFortune) return null;
    const w = 1080;
    const h = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0b1022');
    grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(56,189,248,0.08)';
    ctx.beginPath();
    ctx.arc(200, 160, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(245,158,11,0.08)';
    ctx.beginPath();
    ctx.arc(900, 180, 240, 0, Math.PI * 2);
    ctx.fill();
    const pad = 80;
    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 3;
    drawRoundRect(ctx, pad, 150, w - pad * 2, h - 260, 36);
    ctx.fill();
    ctx.stroke();
    const brandImg = document.querySelector('.brand img');
    const preferredLogo = window.UNALOME_LOGO || '/logo.png';
    let logo = await loadImageFromUrl(preferredLogo);
    if (!logo && brandImg && brandImg.src){
      logo = await loadImageFromUrl(brandImg.src);
    }
    if (!logo){
      logo = await loadImageFromUrl('/img/guardian-emblem.png');
    }
    if (logo){
      ctx.drawImage(logo, pad + 40, 190, 88, 88);
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('unalomecodes', pad + 140, 240);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 42px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('今日專屬日籤', pad + 40, 320);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 24px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(lastFortune.date || '', pad + 40, 360);
    let summaryStart = lastGuardianName ? 460 : 440;
    if (lastGuardianName){
      ctx.fillStyle = '#cbd5f5';
      ctx.font = '600 24px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillText(`守護神：${lastGuardianName}`, pad + 40, 398);
    }
    const starLine = lastFortune.stars || '';
    if (starLine){
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillText(starLine, pad + 40, summaryStart);
      summaryStart += 52;
    }
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 32px system-ui, -apple-system, "Segoe UI", sans-serif';
    const summaryEnd = wrapText(ctx, lastFortune.summary || '', pad + 40, summaryStart, w - pad * 2 - 80, 44);
    let y = summaryEnd + 70;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('生活小建議', pad + 40, y);
    y += 50;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 28px system-ui, -apple-system, "Segoe UI", sans-serif';
    const adviceEnd = wrapText(ctx, lastFortune.advice || '', pad + 40, y, w - pad * 2 - 80, 40);
    y = adviceEnd + 70;
    const label = lastGuardianName ? `守護神 ${lastGuardianName} 想對你說` : '守護神想對你說';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(label, pad + 40, y);
    y += 50;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 28px system-ui, -apple-system, "Segoe UI", sans-serif';
    wrapText(ctx, lastFortune.ritual || '', pad + 40, y, w - pad * 2 - 80, 40);
    return new Promise(resolve=>{
      canvas.toBlob(b=> resolve(b), 'image/png');
    });
  }
  async function shareFortuneImage(){
    if (!lastFortune) return;
    if (fortuneShareBtn) {
      fortuneShareBtn.disabled = true;
      fortuneShareBtn.textContent = '產生中…';
    }
    try{
      const blob = await buildFortuneShareImage();
      if (!blob) throw new Error('圖片產生失敗');
      const fileName = `fortune-${(lastFortune.date || '').replace(/\//g,'-') || 'today'}.png`;
      const file = new File([blob], fileName, { type:'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ title:'我的今日日籤', files:[file] });
      }else{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=> URL.revokeObjectURL(url), 500);
      }
    }catch(err){
      alert(err && err.message ? err.message : '分享失敗，請稍後再試。');
    }finally{
      if (fortuneShareBtn) {
        fortuneShareBtn.disabled = false;
        fortuneShareBtn.textContent = '自動截圖分享';
      }
    }
  }
  function ensureShareButton(){
    if (!fortuneCard) return;
    if (!fortuneShareBtn){
      fortuneShareBtn = fortuneCard.querySelector('.fortune-share-btn');
    }
    if (!fortuneShareBtn){
      fortuneShareBtn = document.createElement('button');
      fortuneShareBtn.type = 'button';
      fortuneShareBtn.className = 'fortune-share-btn';
      fortuneShareBtn.textContent = '自動截圖分享';
      fortuneCard.appendChild(fortuneShareBtn);
      fortuneShareBtn.addEventListener('click', shareFortuneImage);
    }
  }
  function readGuardian(){
    try{
      const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
        ? window.authState.isLoggedIn()
        : false;
      if (loggedIn && window.authState && typeof window.authState.getProfile === 'function'){
        const p = window.authState.getProfile();
        if (p && p.guardian) return p.guardian;
        return null;
      }
      const raw = localStorage.getItem('__lastQuizGuardian__');
    if (raw){
      const obj = JSON.parse(raw);
      if (obj && obj.code) return obj;
    }
    return null;
  }catch(_){ return null; }
  }
  function readQuizProfile(){
    try{
      const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
        ? window.authState.isLoggedIn()
        : false;
      if (loggedIn && window.authState && typeof window.authState.getProfile === 'function'){
        const p = window.authState.getProfile();
        if (p && p.quiz) return p.quiz;
      }
      const raw = localStorage.getItem('__lastQuizProfile__');
      return raw ? JSON.parse(raw) : null;
    }catch(_){
      return null;
    }
  }
  function render(){
    if (!badge) return;
    const loggedIn = window.authState && typeof window.authState.isLoggedIn==='function' ? window.authState.isLoggedIn() : false;
    if (!loggedIn){
      badge.style.display = 'none';
      return;
    }
    const g = readGuardian();
    if (!g){
      badge.style.display = 'none';
      return;
    }
    const code = String(g.code||'').toUpperCase();
    const name = map[code] || '守護神';
    lastGuardianCode = code;
    lastGuardianName = name;
    badge.dataset.guardianCode = code;
    badge.dataset.guardianName = g.name || name || '';
    badge.dataset.quizReady = '1';
    badge.setAttribute('role', 'button');
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('aria-haspopup', 'menu');
    badge.setAttribute('aria-expanded', 'false');
    const menuHtml = window.GuardianMenu
      ? window.GuardianMenu.buildMenuHTML({ actionAttr:'data-guardian-action' })
      : `<button type="button" data-guardian-action="fortune">領取日籤 <span class="guardian-menu-badge" data-guardian-menu-badge aria-hidden="true">1</span></button>`;
    badge.innerHTML = `
      <span class="guardian-alert" data-guardian-alert aria-hidden="true">1</span>
      <img src="${badgeIcon}" alt="守護神">
      <div class="guardian-meta">
        <strong>守護神：${name}</strong>
        <span class="guardian-sub">點擊徽章開啟選單</span>
      </div>
      <div class="guardian-menu" data-guardian-menu role="menu" aria-hidden="true">
        ${menuHtml}
      </div>
    `;
    badge.style.display = 'flex';
    updateFortuneAlert();
    closeMenu();
    if (!badge.dataset.guardianMenuBound){
      badge.dataset.guardianMenuBound = '1';
      badge.addEventListener('click', e=>{
        const action = e.target.closest('[data-guardian-action]');
        if (action){
          const type = action.getAttribute('data-guardian-action');
          if (type === 'daily'){
            openFortuneDialog();
            closeMenu();
            return;
          }
          if (type === 'history'){
            const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
              ? window.authState.isLoggedIn()
              : false;
            if (!loggedIn){
              if (window.authState && typeof window.authState.promptLogin === 'function'){
                window.authState.promptLogin('請先登入後再查看近期日籤。');
              }
              return;
            }
            if (window.GuardianMenu && historyDialog){
              window.GuardianMenu.openHistoryDialog({
                dialog: historyDialog,
                listEl: historyList,
                errorEl: historyError
              });
            }
            closeMenu();
            return;
          }
          if (type === 'result'){
            if (window.GuardianMenu){
              window.GuardianMenu.persistLastQuizResult({
                guardian: readGuardian(),
                quiz: readQuizProfile()
              });
              window.location.href = window.GuardianMenu.buildResultUrl({ badgeEl: badge });
              closeMenu();
              return;
            }
            window.location.href = '/quiz/';
            closeMenu();
            return;
          }
          if (type === 'retake'){
            window.location.href = '/quiz/?retake=1';
            closeMenu();
            return;
          }
          if (type === 'recommend'){
            openRecommended();
            closeMenu();
            return;
          }
          if (type === 'intro'){
            if (code){
              window.location.href = `/deity?code=${encodeURIComponent(code)}`;
              closeMenu();
              return;
            }
            closeMenu();
            return;
          }
        }
        if (e.target.closest('[data-guardian-menu]')) return;
        toggleMenu();
      });
      badge.addEventListener('keydown', e=>{
        if (e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          toggleMenu();
        }
        if (e.key === 'Escape'){
          closeMenu();
        }
      });
      document.addEventListener('click', e=>{
        if (!badge.contains(e.target)) closeMenu();
      });
      window.addEventListener('blur', closeMenu);
    }
  }
  if (window.authState && typeof window.authState.onProfile === 'function'){
    window.authState.onProfile(()=>{
      render();
      try{
        const pending = sessionStorage.getItem(SHOP_FORTUNE_PENDING);
        const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
          ? window.authState.isLoggedIn()
          : false;
        if (pending && loggedIn){
          sessionStorage.removeItem(SHOP_FORTUNE_PENDING);
          openFortuneDialog();
        }
      }catch(_){}
    });
  }
  // 若剛登入後端尚未回傳 guardian，稍後再補一次
  setTimeout(render, 800);
  render();
  scheduleFortuneReset();
  if (fortuneClose){
    fortuneClose.addEventListener('click', ()=> closeDialog(fortuneDialog));
  }
  if (recommendClose){
    recommendClose.addEventListener('click', ()=> closeDialog(recommendDialog));
  }
  if (historyDialog && window.GuardianMenu){
    window.GuardianMenu.bindHistoryDialog({
      dialog: historyDialog,
      listEl: historyList,
      errorEl: historyError
    });
  }
  if (fortuneExplainToggle && fortuneExplainBody){
    fortuneExplainToggle.addEventListener('click', ()=>{
      const expanded = fortuneExplainToggle.getAttribute('aria-expanded') === 'true';
      fortuneExplainToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      fortuneExplainBody.hidden = expanded;
    });
  }
  if (fortuneDialog){
    fortuneDialog.addEventListener('click', (ev)=>{
      const toggleBtn = ev.target.closest('.fortune-task-toggle');
      if (!toggleBtn) return;
      const wrap = ev.target.closest('.fortune-task');
      const dateKey = wrap && wrap.dataset ? String(wrap.dataset.dateKey || '') : '';
      const task = wrap && wrap.dataset ? String(wrap.dataset.task || '') : '';
      if (!dateKey || !task) return;
      const next = toggleTaskDone(dateKey, task);
      toggleBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      toggleBtn.textContent = next ? '✅ 已完成（+1 功德）' : '☐ 我完成了';
      if (next && wrap && wrap.dataset && wrap.dataset.isHistory !== '1'){
        updateStreakOnComplete(dateKey);
      }
      renderStreak(dateKey, next);
      if (next){
        renderTaskFeedback(lastFortune, lastFortunePayload);
      }else if (fortuneTaskFeedback){
        fortuneTaskFeedback.style.display = 'none';
        fortuneTaskFeedback.innerHTML = '';
      }
    });
  }

  window.addEventListener('fortune:open', (ev)=>{
    const payload = ev && ev.detail ? ev.detail : null;
    if (!payload || !payload.fortune) return;
    renderFortune(payload.fortune, payload.meta || null, payload);
    showDialog(fortuneDialog);
  });
})();
