(function(){
  const MENU_ITEMS = [
    { id:'daily', label:'每日運勢', badge:true },
    { id:'history', label:'近期日籤' },
    { id:'result', label:'查看測驗結果' },
    { id:'retake', label:'重新測驗' },
    { id:'intro', label:'守護神介紹' },
    { id:'recommend', label:'推薦商品' }
  ];
  const HISTORY_CACHE_TTL_MS = 30000;
  const historyCache = {
    ts: 0,
    data: null,
    promise: null
  };
  let activeHistoryDialog = null;
  let historyEscapeBound = false;
  const historyPayloadMap = new WeakMap();

  function buildMenuHTML(opts){
    const actionAttr = (opts && opts.actionAttr) || 'data-guardian-action';
    return MENU_ITEMS.map(item=>{
      const badgeHtml = item.badge
        ? ` <span class="guardian-menu-badge" data-guardian-menu-badge aria-hidden="true">1</span>`
        : '';
      return `<button type="button" ${actionAttr}="${item.id}">${item.label}${badgeHtml}</button>`;
    }).join('');
  }

  function showDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.showModal === 'function'){
      if (!dlg.open) dlg.showModal();
      return;
    }
    dlg.setAttribute('open','open');
  }
  function closeDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.close === 'function' && dlg.open){
      dlg.close();
      return;
    }
    dlg.removeAttribute('open');
  }

  async function fetchFortuneHistory(){
    const res = await fetch('/api/fortune?history=1', { credentials:'include', cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      const err = new Error((data && data.error) || 'fetch_failed');
      err.data = data;
      throw err;
    }
    return data.history || [];
  }

  function setHistoryError(errorEl, message){
    if (!errorEl) return;
    errorEl.textContent = message || '分享失敗，請稍後再試。';
    errorEl.style.display = '';
  }
  function clearHistoryError(errorEl){
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  function getHistoryStatus(item){
    if (!item || !item.fortune) return '尚未領取';
    if (item.done) return '✔︎ 已完成';
    return '未完成';
  }

  function getHistoryPreview(summary){
    if (!summary) return '';
    const clean = String(summary).trim();
    if (!clean) return '';
    const short = clean.length > 24 ? clean.slice(0, 24) + '…' : clean;
    return `<div class="fortune-history-preview">${short}</div>`;
  }

  const PHUM_LABEL = {
    BORIWAN:'Boriwan',
    AYU:'Ayu',
    DECH:'Dech',
    SRI:'Sri',
    MULA:'Mula',
    UTSAHA:'Utsaha',
    MONTRI:'Montri',
    KALAKINI:'Kalakini'
  };
  function fnv1aHash(str){
    let hash = 2166136261;
    const text = String(str || '');
    for (let i=0;i<text.length;i++){
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }
  function getTaskDoneKey(dateKey, task){
    const hash = fnv1aHash(String(task || '').trim());
    return `FORTUNE_TASK_DONE:${dateKey}:${hash}`;
  }
  function isTaskDone(dateKey, task){
    if (!dateKey || !task) return false;
    try{
      return localStorage.getItem(getTaskDoneKey(dateKey, task)) === '1';
    }catch(_){
      return false;
    }
  }
  function resolveHistoryDateKey(item){
    if (!item) return '';
    if (item.dateKey) return String(item.dateKey || '');
    const fortune = item.fortune || {};
    if (fortune.dateKey) return String(fortune.dateKey || '');
    if (fortune.date) return String(fortune.date || '').replace(/\s+/g,'');
    return '';
  }
  function renderHistory(listEl, history){
    if (!listEl) return;
    listEl.textContent = '';
    if (!Array.isArray(history) || !history.length){
      const empty = document.createElement('div');
      empty.className = 'fortune-history-empty';
      empty.textContent = '尚未領取任何日籤。';
      listEl.appendChild(empty);
      return;
    }
    history.forEach(item=>{
      const fortune = item && item.fortune ? item.fortune : null;
      const dateKey = resolveHistoryDateKey(item);
      const phum = fortune && fortune.core ? fortune.core.phum : '';
      const phumLabel = phum ? (PHUM_LABEL[phum] ? `${phum} · ${PHUM_LABEL[phum]}` : phum) : '—';
      const task = fortune && fortune.action ? String(fortune.action.task || '').trim() : '';
      const done = task ? isTaskDone(dateKey, task) : false;
      const status = !fortune ? '— 尚未領取' : (done ? '✔︎ 已完成' : '☐ 未完成');
      const card = document.createElement('details');
      card.className = 'fortune-history-card';
      card.dataset.dateKey = dateKey || '';
      card.dataset.phum = phum || '';
      card.dataset.status = status || '';
      card.dataset.task = task || '';
      card.dataset.summary = fortune && fortune.summary ? String(fortune.summary) : '';
      card.dataset.advice = fortune && fortune.advice ? String(fortune.advice) : '';
      card.dataset.ritual = fortune && fortune.ritual ? String(fortune.ritual) : '';
      card.dataset.mantra = '';

      const summary = document.createElement('summary');
      summary.className = 'fortune-history-summary';
      const left = document.createElement('div');
      left.className = 'fortune-history-left';
      const dateEl = document.createElement('div');
      dateEl.className = 'fortune-history-date';
      dateEl.textContent = dateKey || '—';
      const phumEl = document.createElement('div');
      phumEl.className = 'fortune-history-phum';
      phumEl.textContent = phumLabel;
      left.append(dateEl, phumEl);
      const badge = document.createElement('span');
      badge.className = 'fortune-history-badge';
      badge.textContent = status;
      if (status.includes('已完成')) badge.classList.add('is-done');
      else if (status.includes('未完成')) badge.classList.add('is-pending');
      else badge.classList.add('is-missing');
      summary.append(left, badge);

      const body = document.createElement('div');
      body.className = 'fortune-history-body';
      if (task){
        const taskEl = document.createElement('div');
        taskEl.className = 'fortune-history-task';
        taskEl.textContent = task;
        body.appendChild(taskEl);
      }
      if (fortune){
        const summaryRow = document.createElement('div');
        summaryRow.className = 'fortune-history-row';
        summaryRow.textContent = `摘要：${fortune.summary || '—'}`;
        const adviceRow = document.createElement('div');
        adviceRow.className = 'fortune-history-row';
        adviceRow.textContent = `建議：${fortune.advice || '—'}`;
        const ritualRow = document.createElement('div');
        ritualRow.className = 'fortune-history-row';
        ritualRow.textContent = `守護神語：${fortune.ritual || '—'}`;
        body.append(summaryRow, adviceRow, ritualRow);
        if (fortune.action && fortune.action.why){
          const whyRow = document.createElement('div');
          whyRow.className = 'fortune-history-row';
          whyRow.textContent = `行動理由：${fortune.action.why}`;
          body.appendChild(whyRow);
        }
        const actions = document.createElement('div');
        actions.className = 'fortune-history-actions';
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'fortune-history-view';
        viewBtn.dataset.historyView = '1';
        viewBtn.textContent = '查看日籤';
        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'fortune-history-share';
        shareBtn.dataset.share = '1';
        shareBtn.textContent = '分享 PNG';
        actions.append(viewBtn, shareBtn);
        body.appendChild(actions);
      }else{
        const emptyRow = document.createElement('div');
        emptyRow.className = 'fortune-history-row';
        emptyRow.textContent = '尚未領取';
        body.appendChild(emptyRow);
      }

      card.append(summary, body);
      listEl.appendChild(card);

      if (fortune){
        historyPayloadMap.set(card, {
          dateKey,
          fortune,
          meta: item.meta || null,
          version: item.version,
          source: item.source,
          createdAt: item.createdAt
        });
      }
    });
  }

  function resolveBrandLogoURL(){
    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink && iconLink.getAttribute('href')){
      try{
        return new URL(iconLink.getAttribute('href'), location.origin).href;
      }catch(_){}
    }
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon && appleIcon.getAttribute('href')){
      try{
        return new URL(appleIcon.getAttribute('href'), location.origin).href;
      }catch(_){}
    }
    const logoImg = document.querySelector('img[alt*="Unalome" i], img[id*="logo" i], img[class*="logo" i]');
    if (logoImg && logoImg.getAttribute('src')){
      try{
        return new URL(logoImg.getAttribute('src'), location.origin).href;
      }catch(_){}
    }
    return new URL('/favicon.ico', location.origin).href;
  }

  function buildShareCard(data){
    const wrapper = document.createElement('div');
    wrapper.className = 'fortune-share-card';
    const brandbar = document.createElement('div');
    brandbar.className = 'share-brandbar';
    const brandLeft = document.createElement('div');
    brandLeft.className = 'share-brandleft';
    const brandImg = document.createElement('img');
    brandImg.src = resolveBrandLogoURL();
    brandImg.crossOrigin = 'anonymous';
    brandImg.alt = 'Unalome Codes';
    const brandText = document.createElement('div');
    brandText.className = 'share-brandtext';
    const brandName = document.createElement('div');
    brandName.className = 'share-brandname';
    brandName.textContent = 'Unalome Codes';
    const brandSite = document.createElement('div');
    brandSite.className = 'share-brandsite';
    brandSite.textContent = 'unalomecodes.com';
    brandText.append(brandName, brandSite);
    brandLeft.append(brandImg, brandText);
    brandbar.appendChild(brandLeft);
    const body = document.createElement('div');
    body.className = 'fortune-share-body';
    const head = document.createElement('div');
    head.className = 'fortune-share-head';
    const dateEl = document.createElement('div');
    dateEl.className = 'fortune-share-date';
    dateEl.textContent = data.dateKey || '—';
    const phumEl = document.createElement('div');
    phumEl.className = 'fortune-share-phum';
    phumEl.textContent = data.phum || '—';
    const statusEl = document.createElement('div');
    statusEl.className = 'fortune-share-status';
    statusEl.textContent = data.status || '';
    head.append(dateEl, phumEl, statusEl);
    body.appendChild(head);
    if (data.task){
      const taskEl = document.createElement('div');
      taskEl.className = 'fortune-share-task';
      taskEl.textContent = data.task;
      body.appendChild(taskEl);
    }
    const summary = data.summary ? `摘要：${data.summary}` : '';
    const advice = data.advice ? `建議：${data.advice}` : '';
    const ritual = data.ritual ? `守護神語：${data.ritual}` : '';
    const mantra = data.mantra ? `咒語：${data.mantra}` : '';
    [summary, advice, ritual, mantra].forEach(text=>{
      if (!text) return;
      const row = document.createElement('div');
      row.className = 'fortune-share-row share-line clamp-4';
      row.textContent = text;
      body.appendChild(row);
    });
    wrapper.append(brandbar, body);
    return wrapper;
  }

  function loadHtml2Canvas(){
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject)=>{
      const src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      const existing = document.querySelector('script[data-html2canvas="1"]');
      if (existing){
        existing.addEventListener('load', ()=> resolve(window.html2canvas));
        existing.addEventListener('error', ()=> reject(new Error('html2canvas_load_failed')));
        return;
      }
      const timer = setTimeout(()=>{
        reject(new Error('html2canvas_timeout'));
      }, 8000);
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.html2canvas = '1';
      script.referrerPolicy = 'no-referrer';
      script.onload = ()=> {
        clearTimeout(timer);
        resolve(window.html2canvas);
      };
      script.onerror = ()=> {
        clearTimeout(timer);
        reject(new Error('html2canvas_load_failed'));
      };
      document.head.appendChild(script);
    });
  }

  async function exportHistoryCardPNG(cardEl, opts){
    if (!cardEl) return;
    const errorEl = opts && opts.errorEl;
    const data = {
      dateKey: cardEl.dataset.dateKey || '',
      phum: cardEl.dataset.phum || '',
      status: cardEl.dataset.status || '',
      task: cardEl.dataset.task || '',
      summary: cardEl.dataset.summary || '',
      advice: cardEl.dataset.advice || '',
      ritual: cardEl.dataset.ritual || '',
      mantra: cardEl.dataset.mantra || ''
    };
    const tmp = document.createElement('div');
    tmp.className = 'fortune-share-wrap';
    const shareCard = buildShareCard(data);
    tmp.appendChild(shareCard);
    document.body.appendChild(tmp);
    try{
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(shareCard, {
        backgroundColor:'#ffffff',
        scale:2,
        useCORS:true,
        allowTaint:false,
        imageTimeout:15000
      });
      let blob = null;
      if (canvas.toBlob){
        blob = await new Promise(resolve=> canvas.toBlob(resolve, 'image/png'));
      }
      if (!blob){
        const dataUrl = canvas.toDataURL('image/png');
        try{
          blob = await fetch(dataUrl).then(res=>res.blob());
        }catch(_){
          blob = null;
        }
      }
      if (!blob){
        setHistoryError(errorEl, '分享失敗：目前瀏覽器無法產生圖片，請改用 Chrome 或更新 Safari。');
        return;
      }
      const filename = `unalomecodes_fortune_${data.dateKey || 'today'}_${data.phum || 'unknown'}.png`;
      const file = new File([blob], filename, { type:'image/png' });
      if (navigator.canShare && navigator.share && navigator.canShare({ files:[file] })){
        await navigator.share({ files:[file], title:'Unalome Codes 日籤', text:'我的近期日籤（Unalome Codes）' });
      }else{
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(()=> URL.revokeObjectURL(url), 1000);
      }
      clearHistoryError(errorEl);
    }catch(err){
      const reason = err && err.message ? err.message : 'unknown_error';
      if (reason === 'html2canvas_timeout' || reason === 'html2canvas_load_failed'){
        setHistoryError(errorEl, '分享失敗：目前瀏覽器無法載入產圖工具，請改用 Chrome 或更新 Safari。');
      }else{
        setHistoryError(errorEl, '分享失敗：目前瀏覽器無法產生圖片，請稍後再試。');
      }
    }finally{
      tmp.remove();
    }
  }

  function bindHistoryDialog(opts){
    const dialog = opts && opts.dialog;
    const listEl = opts && opts.listEl;
    const errorEl = opts && opts.errorEl;
    if (!dialog || dialog.dataset.guardianHistoryBound) return;
    dialog.dataset.guardianHistoryBound = '1';
    const handleClose = ()=>{
      clearHistoryError(errorEl);
      closeDialog(dialog);
      if (activeHistoryDialog === dialog) activeHistoryDialog = null;
    };
    dialog.addEventListener('click', (ev)=>{
      const target = ev.target;
      if (!target) return;
      const closeBtn = target.closest ? target.closest('[data-guardian-history-close]') : null;
      const shareBtn = target.closest ? target.closest('[data-share="1"]') : null;
      const viewBtn = target.closest ? target.closest('[data-history-view="1"]') : null;
      if (target === dialog || closeBtn){
        ev.preventDefault();
        ev.stopPropagation();
        handleClose();
        return;
      }
      if (shareBtn){
        ev.preventDefault();
        ev.stopPropagation();
        const cardEl = shareBtn.closest('.fortune-history-card');
        if (!cardEl) return;
        exportHistoryCardPNG(cardEl, { errorEl });
        return;
      }
      if (viewBtn){
        ev.preventDefault();
        ev.stopPropagation();
        const cardEl = viewBtn.closest('.fortune-history-card');
        if (!cardEl) return;
        const payload = historyPayloadMap.get(cardEl);
        if (!payload) return;
        window.__FORTUNE_HISTORY_SELECTED__ = payload;
        openFortuneViewer(payload);
      }
    });
    dialog.addEventListener('cancel', (ev)=>{
      ev.preventDefault();
      handleClose();
    });
    if (!historyEscapeBound){
      historyEscapeBound = true;
      document.addEventListener('keydown', (ev)=>{
        if (ev.key !== 'Escape') return;
        const dlg = activeHistoryDialog;
        if (!dlg) return;
        if (typeof dlg.open === 'boolean'){
          if (!dlg.open) return;
        }else if (!dlg.hasAttribute('open')){
          return;
        }
        handleClose();
      });
    }
    if (listEl && !listEl.dataset.historyListBound){
      listEl.dataset.historyListBound = '1';
    }
  }

  async function openHistoryDialog(opts){
    const dialog = opts && opts.dialog;
    const listEl = opts && opts.listEl;
    const errorEl = opts && opts.errorEl;
    if (!dialog || !listEl) return;
    bindHistoryDialog({ dialog, listEl, errorEl });
    clearHistoryError(errorEl);
    activeHistoryDialog = dialog;
    showDialog(dialog);
    const now = Date.now();
    if (historyCache.data && (now - historyCache.ts) < HISTORY_CACHE_TTL_MS){
      renderHistory(listEl, historyCache.data);
      return;
    }
    if (historyCache.promise){
      listEl.innerHTML = '<div class="fortune-history-loading">載入中…</div>';
      try{
        const cached = await historyCache.promise;
        renderHistory(listEl, cached);
      }catch(_){
        if (historyCache.data){
          renderHistory(listEl, historyCache.data);
        }else{
          listEl.innerHTML = '';
          if (errorEl){
            errorEl.textContent = '目前無法載入近期日籤，請稍後再試';
            errorEl.style.display = '';
          }
        }
      }
      return;
    }
    listEl.innerHTML = '<div class="fortune-history-loading">載入中…</div>';
    historyCache.promise = fetchFortuneHistory();
    try{
      const history = await historyCache.promise;
      historyCache.data = history;
      historyCache.ts = Date.now();
      renderHistory(listEl, history);
    }catch(_){
      if (historyCache.data){
        renderHistory(listEl, historyCache.data);
      }else{
        listEl.innerHTML = '';
        if (errorEl){
          errorEl.textContent = '目前無法載入近期日籤，請稍後再試';
          errorEl.style.display = '';
        }
      }
    }finally{
      historyCache.promise = null;
    }
  }

  function persistLastQuizResult(opts){
    const guardian = opts && opts.guardian;
    const quiz = opts && opts.quiz;
    if (!guardian) return;
    const code = String(guardian.code || guardian.id || '').trim().toUpperCase();
    if (!code) return;
    const name = String(guardian.name || '').trim();
    const rawTs = guardian.ts || (quiz && quiz.ts) || Date.now();
    const ts = typeof rawTs === 'number' ? rawTs : (Date.parse(rawTs) || Date.now());
    try{
      const guardianPayload = JSON.stringify({ code, name, ts });
      localStorage.setItem('__lastQuizGuardian__', guardianPayload);
      localStorage.setItem('__lastQuizGuardianBackup__', guardianPayload);
    }catch(_){}
    if (quiz){
      try{
        const quizPayload = JSON.stringify(quiz);
        localStorage.setItem('__lastQuizProfile__', quizPayload);
        localStorage.setItem('__lastQuizProfileBackup__', quizPayload);
      }catch(_){}
    }
  }

  function getCurrentGuardianCode(opts){
    const badgeEl = opts && opts.badgeEl;
    if (!badgeEl || !badgeEl.dataset) return '';
    const code = String(badgeEl.dataset.guardianCode || '').trim().toUpperCase();
    return code;
  }

  function buildResultUrl(opts){
    const code = getCurrentGuardianCode(opts);
    if (code) return `/quiz/?guardian=${encodeURIComponent(code)}&src=menu`;
    return '/quiz/';
  }

  function openFortuneViewer(payload){
    if (!payload) return false;
    if (window.FortuneViewer && typeof window.FortuneViewer.open === 'function'){
      return window.FortuneViewer.open(payload);
    }
    if (window.dispatchEvent){
      try{
        const ev = new CustomEvent('fortune:open', { detail: payload });
        window.dispatchEvent(ev);
        return true;
      }catch(_){}
    }
    return false;
  }

  window.GuardianMenu = {
    buildMenuHTML,
    openHistoryDialog,
    closeDialog,
    bindHistoryDialog,
    persistLastQuizResult,
    getCurrentGuardianCode,
    buildResultUrl,
    openFortuneViewer,
    MENU_ITEMS
  };
})();
