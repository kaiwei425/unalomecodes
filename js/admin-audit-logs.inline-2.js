(function(){
  // Manual tests:
  // 1) owner: open /admin/audit-logs -> loads entries
  // 2) owner: filter action -> only those actions show
  // 3) owner: load more -> appends
  // 4) fulfillment: no nav item; direct open -> shows "此頁僅限 owner"
  // 5) ADMIN_AUDIT_KV missing -> shows "尚未設定 ADMIN_AUDIT_KV"
  const API_BASE = window.__SHOP_ORIGIN || 'https://unalomecodes.com';
  const actionFilter = document.getElementById('actionFilter');
  const actorFilter = document.getElementById('actorFilter');
  const targetFilter = document.getElementById('targetFilter');
  const btnSearch = document.getElementById('btnSearch');
  const btnReset = document.getElementById('btnReset');
  const btnMore = document.getElementById('btnMore');
  const tbody = document.getElementById('tbody');
  const statusText = document.getElementById('statusText');
  const statusTextBottom = document.getElementById('statusTextBottom');

  let nextCursor = null;
  let isLoading = false;
  let items = [];

  function setStatus(text){
    if (statusText) statusText.textContent = text || '';
    if (statusTextBottom) statusTextBottom.textContent = text || '';
  }

  function truncateMeta(meta){
    try{
      const raw = JSON.stringify(meta || {});
      if (raw.length > 400) return raw.slice(0, 400) + '…(truncated)';
      return raw;
    }catch(_){
      return '';
    }
  }

  function matchesFilters(item){
    const actorQ = String(actorFilter && actorFilter.value || '').trim().toLowerCase();
    const targetQ = String(targetFilter && targetFilter.value || '').trim().toLowerCase();
    if (actorQ){
      const email = String(item.actorEmail || '').toLowerCase();
      const role = String(item.actorRole || '').toLowerCase();
      if (email.indexOf(actorQ) === -1 && role.indexOf(actorQ) === -1) return false;
    }
    if (targetQ){
      const tid = String(item.targetId || '').toLowerCase();
      const ttype = String(item.targetType || '').toLowerCase();
      if (tid.indexOf(targetQ) === -1 && ttype.indexOf(targetQ) === -1) return false;
    }
    return true;
  }

  function renderRows(list){
    if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach(function(item){
      const tr = document.createElement('tr');

      const tdTs = document.createElement('td');
      tdTs.textContent = item.ts || '';

      const tdAction = document.createElement('td');
      tdAction.textContent = item.action || '';

      const tdActor = document.createElement('td');
      const actorEmail = item.actorEmail || '';
      const actorRole = item.actorRole || '';
      tdActor.textContent = actorEmail ? (actorEmail + ' (' + actorRole + ')') : actorRole;

      const tdTarget = document.createElement('td');
      const ttype = item.targetType || '';
      const tid = item.targetId || '';
      tdTarget.textContent = ttype && tid ? (ttype + ' / ' + tid) : (ttype || tid || '');

      const tdMeta = document.createElement('td');
      tdMeta.textContent = truncateMeta(item.meta || {});

      tr.appendChild(tdTs);
      tr.appendChild(tdAction);
      tr.appendChild(tdActor);
      tr.appendChild(tdTarget);
      tr.appendChild(tdMeta);
      tbody.appendChild(tr);
    });
  }

  function applyClientFilters(){
    const filtered = items.filter(matchesFilters);
    renderRows(filtered);
    setStatus(filtered.length ? ('顯示 ' + filtered.length + ' 筆') : '無符合條件的資料');
  }

  async function fetchLogs(reset){
    if (isLoading) return;
    isLoading = true;
    if (btnMore) btnMore.disabled = true;
    if (reset){
      nextCursor = null;
      items = [];
      if (tbody) tbody.innerHTML = '';
    }
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (nextCursor) params.set('cursor', String(nextCursor));
    if (actionFilter && actionFilter.value) params.set('action', actionFilter.value);
    try{
      const res = await fetch(API_BASE + '/api/admin/audit-logs?' + params.toString(), {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false){
        if (data && data.error === 'forbidden_role'){
          setStatus('此頁僅限 owner');
        } else if (data && data.error === 'audit_kv_not_configured'){
          setStatus('尚未設定 ADMIN_AUDIT_KV');
        } else {
          setStatus('載入失敗，請稍後再試');
        }
        nextCursor = null;
        return;
      }
      const list = Array.isArray(data.items) ? data.items : [];
      items = items.concat(list);
      nextCursor = data.nextCursor;
      applyClientFilters();
      if (!nextCursor) {
        setStatus((items.length ? ('共 ' + items.length + ' 筆') : '尚無資料') + '｜已到最後');
      }
    }catch(_){
      setStatus('載入失敗，請稍後再試');
    }finally{
      isLoading = false;
      if (btnMore) btnMore.disabled = false;
      if (!nextCursor && btnMore) btnMore.disabled = true;
    }
  }

  if (btnSearch){
    btnSearch.addEventListener('click', function(){
      applyClientFilters();
    });
  }
  if (btnReset){
    btnReset.addEventListener('click', function(){
      if (actionFilter) actionFilter.value = '';
      if (actorFilter) actorFilter.value = '';
      if (targetFilter) targetFilter.value = '';
      fetchLogs(true);
    });
  }
  if (actionFilter){
    actionFilter.addEventListener('change', function(){
      fetchLogs(true);
    });
  }
  if (btnMore){
    btnMore.addEventListener('click', function(){
      fetchLogs(false);
    });
  }

  fetchLogs(true);
})();
