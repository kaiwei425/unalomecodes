(function(){
  const badge = document.getElementById('guardianBadgeSvc');
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

  let lastFortune = null;
  let lastGuardianName = '';

  const GUARDIAN_NAME_ZH = {
    FM:'四面神',GA:'象神',CD:'崇迪佛',KP:'坤平',HP:'魂魄勇',XZ:'徐祝老人',WE:'五眼四耳',
    HM:'猴神哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神'
  };
  const GUARDIAN_NAME_EN = {
    FM:'Brahma (Four-Faced)',GA:'Ganesha',CD:'Somdej Buddha',KP:'Khun Paen',HP:'Hoon Payon',XZ:'Elder Xu Zhu',
    WE:'Five-Eyed Four-Eared',HM:'Hanuman',RH:'Rahu',JL:'Garuda',ZD:'Jatukam Rammathep',ZF:'Lakshmi'
  };

  const badgeIcon = (function(){
    if (window.GUARDIAN_BADGE_ICON) return window.GUARDIAN_BADGE_ICON;
    return '/img/guardian-emblem.png';
  })();

  function getLang(){
    try{
      if (window.UC_I18N && typeof window.UC_I18N.getLang === 'function') return window.UC_I18N.getLang();
    }catch(_){}
    return 'zh';
  }
  function tf(zh, en){
    return getLang() === 'en' ? (en || zh) : zh;
  }
  function tOr(key, fallback){
    try{
      if (window.UC_I18N && typeof window.UC_I18N.t === 'function'){
        const v = window.UC_I18N.t(key);
        if (v && v !== key) return String(v);
      }
    }catch(_){}
    return String(fallback || '');
  }
  function getGuardianName(code){
    const c = String(code || '').toUpperCase();
    return getLang() === 'en'
      ? (GUARDIAN_NAME_EN[c] || GUARDIAN_NAME_ZH[c] || tf('守護神', 'Guardian'))
      : (GUARDIAN_NAME_ZH[c] || tf('守護神', 'Guardian'));
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
      fortuneError.textContent = message || tf('暫時無法取得日籤，請稍後再試。', 'Unable to load your fortune right now. Please try again later.');
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
        tags.push(tf(`星座 ${zodiacLabel}`, `Zodiac ${zodiacLabel}`));
      }
      if (meta.moonPhase) tags.push(tf(`月相 ${meta.moonPhase}`, `Moon phase ${meta.moonPhase}`));
      if (meta.iching) tags.push(tf(`易經 ${meta.iching}`, `I Ching ${meta.iching}`));
      if (meta.todayDow) tags.push(tf(`今日星期${meta.todayDow}`, `Day ${meta.todayDow}`));
      if (meta.thaiDayColor) tags.push(tf(`泰國星期色 ${meta.thaiDayColor}`, `Thai day color ${meta.thaiDayColor}`));
      if (meta.buddhistYear) tags.push(tf(`佛曆 ${meta.buddhistYear}`, `B.E. ${meta.buddhistYear}`));
      fortuneMeta.textContent = '';
      tags.filter(Boolean).forEach(tag=>{
        const span = document.createElement('span');
        span.textContent = String(tag);
        fortuneMeta.appendChild(span);
      });
    }
    if (fortuneRitualLabel){
      const gName = (fortune.meta && fortune.meta.guardianName) || '';
      lastGuardianName = gName || lastGuardianName;
      fortuneRitualLabel.textContent = gName
        ? tf(`守護神 ${gName} 想對你說`, `Message from ${gName}`)
        : tOr('svc.guardian_says_default', tf('守護神想對你說', 'Message from your guardian'));
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
        if (data && data.needQuiz) throw new Error(tf('請先完成守護神測驗後再領取日籤。', 'Please complete the guardian quiz first.'));
        throw new Error((data && data.error) || tf('取得日籤失敗', 'Failed to load fortune'));
      }
      renderFortune(data.fortune || null);
    }catch(err){
      setFortuneError(err && err.message ? err.message : tf('暫時無法取得日籤', 'Unable to load fortune'));
    }
  }

  async function openFortuneDialog(){
    if (!fortuneDialog) return;
    const loggedIn = window.authState && typeof window.authState.isLoggedIn==='function' ? window.authState.isLoggedIn() : false;
    if (!loggedIn){
      if (window.authState && typeof window.authState.promptLogin === 'function'){
        window.authState.promptLogin(tf('請先登入後再領取日籤。', 'Please sign in to get your fortune.'));
      }
      return;
    }
    showDialog(fortuneDialog);
    await fetchFortune();
  }

  function drawRoundRect(ctx, x, y, w, h, r){
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = String(text || '').split('');
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i];
      const metrics = ctx.measureText(test);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, y);
    return y;
  }

  async function loadImageFromUrl(url){
    try{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      return await new Promise(resolve=>{
        img.onload = ()=> resolve(img);
        img.onerror = ()=> resolve(null);
        img.src = url;
      });
    }catch(_){ return null; }
  }

  async function buildFortuneShareImage(){
    const canvas = document.createElement('canvas');
    const w = 1080;
    const h = 1920;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0b1022';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(253,224,71,0.08)';
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
    ctx.font = '600 28px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    ctx.fillText('unalomecodes', pad + 140, 240);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 42px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    ctx.fillText(tf('今日專屬日籤', 'Your Daily Fortune'), pad + 40, 320);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 24px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    ctx.fillText((lastFortune && lastFortune.date) ? lastFortune.date : '', pad + 40, 360);

    let summaryStart = lastGuardianName ? 460 : 440;
    if (lastGuardianName){
      ctx.fillStyle = '#cbd5f5';
      ctx.font = '600 24px system-ui, -apple-system, \"Segoe UI\", sans-serif';
      ctx.fillText(tf(`守護神：${lastGuardianName}`, `Guardian: ${lastGuardianName}`), pad + 40, 398);
    }
    const starLine = (lastFortune && lastFortune.stars) ? lastFortune.stars : '';
    if (starLine){
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 28px system-ui, -apple-system, \"Segoe UI\", sans-serif';
      ctx.fillText(starLine, pad + 40, summaryStart);
      summaryStart += 52;
    }

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 32px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    const summaryEnd = wrapText(ctx, (lastFortune && lastFortune.summary) ? lastFortune.summary : '', pad + 40, summaryStart, w - pad * 2 - 80, 44);

    let y = summaryEnd + 70;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    ctx.fillText(tOr('svc.fortune_advice_label', tf('生活小建議','Quick advice')), pad + 40, y);

    y += 50;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 28px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    const adviceEnd = wrapText(ctx, (lastFortune && lastFortune.advice) ? lastFortune.advice : '', pad + 40, y, w - pad * 2 - 80, 40);

    y = adviceEnd + 70;
    const ritualLabel = lastGuardianName
      ? tf(`守護神 ${lastGuardianName} 想對你說`, `Message from ${lastGuardianName}`)
      : tOr('svc.guardian_says_default', tf('守護神想對你說','Message from your guardian'));
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    ctx.fillText(ritualLabel, pad + 40, y);
    y += 50;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 28px system-ui, -apple-system, \"Segoe UI\", sans-serif';
    wrapText(ctx, (lastFortune && lastFortune.ritual) ? lastFortune.ritual : '', pad + 40, y, w - pad * 2 - 80, 40);

    return new Promise(resolve=>{
      canvas.toBlob(b=> resolve(b), 'image/png');
    });
  }

  async function shareFortuneImage(){
    if (!lastFortune) return;
    if (fortuneShareBtn) {
      fortuneShareBtn.disabled = true;
      fortuneShareBtn.textContent = tf('產生中…', 'Generating…');
    }
    try{
      const blob = await buildFortuneShareImage();
      if (!blob) throw new Error(tf('圖片產生失敗', 'Image generation failed'));
      const fileName = `fortune-${String((lastFortune.date || '')).replace(/\\//g,'-') || 'today'}.png`;
      const file = new File([blob], fileName, { type:'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ title: tf('我的今日日籤', 'My daily fortune'), files:[file] });
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
      if (fortuneError){
        fortuneError.textContent = err && err.message ? err.message : tf('分享失敗，請稍後再試。', 'Share failed. Please try again later.');
        fortuneError.style.display = '';
      }
    }finally{
      if (fortuneShareBtn) {
        fortuneShareBtn.disabled = false;
        fortuneShareBtn.textContent = tOr('svc.share_button', tf('自動截圖分享', 'Auto screenshot share'));
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

  function renderBadge(){
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
    const name = getGuardianName(code);
    badge.textContent = '';

    const img = document.createElement('img');
    img.src = badgeIcon;
    img.alt = tf('守護神', 'Guardian');

    const meta = document.createElement('div');
    meta.className = 'guardian-meta';

    const strong = document.createElement('strong');
    strong.textContent = tf(`守護神：${name}`, `Guardian: ${name}`);

    const fortuneBtn = document.createElement('button');
    fortuneBtn.type = 'button';
    fortuneBtn.className = 'fortune-btn';
    fortuneBtn.dataset.fortuneBtn = '1';
    fortuneBtn.textContent = tf('領取日籤', 'Get fortune');

    meta.append(strong, fortuneBtn);
    badge.append(img, meta);
    badge.style.display = 'flex';

    fortuneBtn.addEventListener('click', openFortuneDialog);
  }

  if (window.authState && typeof window.authState.onProfile === 'function'){
    window.authState.onProfile(()=> renderBadge());
  }

  setTimeout(renderBadge, 800);
  renderBadge();

  try{
    window.addEventListener('uc_lang_change', function(){
      renderBadge();
      if (lastFortune) renderFortune(lastFortune);
    });
  }catch(_){}

  if (fortuneClose){
    fortuneClose.addEventListener('click', ()=> closeDialog(fortuneDialog));
  }
  if (fortuneShareBtn){
    fortuneShareBtn.addEventListener('click', shareFortuneImage);
  }
})();

