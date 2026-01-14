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
  const fortuneAdvice = document.getElementById('fortuneAdvice');
  const fortuneRitual = document.getElementById('fortuneRitual');
  const fortuneMeta = document.getElementById('fortuneMeta');
  const fortuneRitualLabel = document.getElementById('fortuneRitualLabel');
  const fortuneShareBtn = document.getElementById('fortuneShareBtn');
  const recommendDialog = document.getElementById('guardianRecommendDialog');
  const recommendClose = document.getElementById('guardianRecommendClose');
  const recommendName = document.getElementById('guardianRecommendName');
  const recommendList = document.getElementById('guardianRecommendList');
  const historyDialog = document.getElementById('fortuneHistoryDialog');
  const historyList = document.getElementById('fortuneHistoryList');
  const historyError = document.getElementById('fortuneHistoryError');
  let lastFortune = null;
  let lastGuardianName = '';
  let lastGuardianCode = '';
  let recommendRetry = 0;
  let currentRecommendItems = [];
  let midnightTimer = null;
  const FORTUNE_KEY = '__fortune_last_date__';
  const map = {FM:'四面神',GA:'象神',CD:'崇迪佛',KP:'坤平',HP:'魂魄勇',XZ:'徐祝老人',WE:'五眼四耳',HM:'猴神哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神'};
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
  function renderFortune(fortune){
    if (!fortune) return;
    lastFortune = fortune;
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
      lastGuardianName = gName || lastGuardianName;
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
      const fortune = data.fortune || null;
      renderFortune(fortune);
      if (fortune) markFortuneClaimed();
    }catch(err){
      setFortuneError(err && err.message ? err.message : '暫時無法取得日籤');
    }
  }
  function openFortuneDialog(){
    const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
      ? window.authState.isLoggedIn()
      : false;
    if (!loggedIn){
      if (window.authState && typeof window.authState.promptLogin === 'function'){
        window.authState.promptLogin('請先登入後再領取日籤。');
      }
      return;
    }
    showDialog(fortuneDialog);
    fetchFortune();
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
    window.authState.onProfile(()=>render());
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
  if (fortuneShareBtn){
    fortuneShareBtn.addEventListener('click', shareFortuneImage);
  }
})();
