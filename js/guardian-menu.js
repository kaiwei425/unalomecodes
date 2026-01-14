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

  function renderHistory(listEl, history){
    if (!listEl) return;
    if (!Array.isArray(history) || !history.length){
      listEl.innerHTML = '<div class="fortune-history-empty">尚未領取任何日籤。</div>';
      return;
    }
    listEl.innerHTML = history.map(item=>{
      const dateKey = item.dateKey || '';
      const fortune = item.fortune || null;
      const core = fortune && fortune.core && fortune.core.phum ? fortune.core.phum : '';
      const summary = fortune && fortune.summary ? fortune.summary : '';
      const status = getHistoryStatus(item);
      const headText = [dateKey, core || '—', status].filter(Boolean).join(' · ');
      if (!fortune){
        return `
          <details class="fortune-history-item">
            <summary>${headText}</summary>
            <div class="fortune-history-body">尚未領取</div>
          </details>
        `;
      }
      const actionTask = fortune.action && fortune.action.task ? fortune.action.task : '';
      const ritual = fortune.ritual || '';
      const advice = fortune.advice || '';
      const preview = getHistoryPreview(summary);
      return `
        <details class="fortune-history-item">
          <summary>${headText}</summary>
          <div class="fortune-history-body">
            <div class="fortune-history-row"><strong>摘要：</strong>${summary || '—'}</div>
            <div class="fortune-history-row"><strong>建議：</strong>${advice || '—'}</div>
            <div class="fortune-history-row"><strong>今日任務：</strong>${actionTask || '—'}</div>
            <div class="fortune-history-row"><strong>守護神語：</strong>${ritual || '—'}</div>
            ${preview}
          </div>
        </details>
      `;
    }).join('');
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
      if (ev.target === dialog || ev.target.closest('[data-guardian-history-close]')){
        handleClose();
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

  window.GuardianMenu = {
    buildMenuHTML,
    openHistoryDialog,
    closeDialog,
    bindHistoryDialog,
    persistLastQuizResult,
    getCurrentGuardianCode,
    buildResultUrl,
    MENU_ITEMS
  };
})();
