(function(){
  const API_BASE = window.__SHOP_ORIGIN || 'https://unalomecodes.com';
  const physicalBody = document.getElementById('physicalBody');
  const serviceBody = document.getElementById('serviceBody');
  const physicalStatus = document.getElementById('physicalStatus');
  const serviceStatus = document.getElementById('serviceStatus');
  const physicalEmpty = document.getElementById('physicalEmpty');
  const serviceEmpty = document.getElementById('serviceEmpty');
  const resultInput = document.getElementById('serviceResultFile');
  let busy = false;
  let serviceTargetId = '';
  let refreshTimer = null;

  async function authedFetch(url, init){
    const opts = Object.assign({}, init || {});
    opts.credentials = 'include';
    if (!opts.method) opts.method = 'GET';
    const target = /^https?:/i.test(url) ? url : API_BASE + url;
    const res = await fetch(target, opts);
    const data = await res.json().catch(()=>({}));
    if (!res.ok || data.ok === false){
      const err = new Error((data && data.error) || ('HTTP '+res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function setStatus(el, text){
    if (!el) return;
    el.textContent = text || '';
  }

  function showError(el, err){
    if (!el) return;
    if (err && (err.status === 403)) {
      el.textContent = '權限不足';
      return;
    }
    if (err && (err.status === 429)) {
      el.textContent = '操作過於頻繁，請稍後';
      return;
    }
    el.textContent = '載入失敗，請稍後再試';
  }

  function normalizeStatusText(val){
    return String(val || '').replace(/\s+/g,'').trim();
  }

  function getNextPhysicalStatus(status){
    const s = normalizeStatusText(status);
    if (!s) return '';
    if (s.includes('訂單待處理')) return '待出貨';
    if (s.includes('待出貨') || s.includes('已付款')) return '已寄件';
    return '';
  }

  function shouldShowPhysical(status){
    const s = normalizeStatusText(status);
    return s.includes('訂單待處理') || s.includes('待出貨') || s.includes('已付款');
  }

  function shouldShowService(status){
    const s = normalizeStatusText(status);
    return s.includes('已付款') || s.includes('待處理') || s.includes('進行中');
  }

  function clearTable(tbody){
    if (!tbody) return;
    tbody.innerHTML = '';
  }

  function renderPhysical(list){
    clearTable(physicalBody);
    const rows = list.filter(function(o){ return shouldShowPhysical(o.status); });
    if (!rows.length){
      if (physicalEmpty) physicalEmpty.style.display = 'block';
    } else if (physicalEmpty) {
      physicalEmpty.style.display = 'none';
    }
    rows.forEach(function(o){
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      tdId.textContent = o.id || '';
      const tdName = document.createElement('td');
      tdName.textContent = (o.buyer && (o.buyer.name || o.buyer.contact)) || o.recipientName || '';
      const tdStatus = document.createElement('td');
      tdStatus.textContent = o.status || '';
      const tdAction = document.createElement('td');
      const nextStatus = getNextPhysicalStatus(o.status);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn gold';
      if (nextStatus === '待出貨') {
        btn.textContent = '標記為待出貨';
      } else if (nextStatus === '已寄件') {
        btn.textContent = '標記為已寄件';
      } else {
        btn.textContent = '無可執行步驟';
      }
      if (!nextStatus) btn.disabled = true;
      const msg = document.createElement('div');
      msg.className = 'muted';
      msg.style.marginTop = '6px';
      msg.dataset.msgId = o.id;
      btn.addEventListener('click', async function(){
        if (!nextStatus || btn.disabled) return;
        btn.disabled = true;
        msg.textContent = '處理中...';
        try{
          await authedFetch('/api/order/status', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ id: o.id, status: nextStatus })
          });
          tr.remove();
          if (physicalBody && !physicalBody.children.length){
            if (physicalEmpty) physicalEmpty.style.display = 'block';
            setStatus(physicalStatus, '沒有可處理的訂單');
          }
          msg.textContent = '';
        }catch(err){
          showError(msg, err);
          btn.disabled = false;
        }
      });
      tdAction.appendChild(btn);
      tdAction.appendChild(msg);
      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      physicalBody.appendChild(tr);
    });
  }

  function renderService(list){
    clearTable(serviceBody);
    const rows = list.filter(function(o){ return shouldShowService(o.status); });
    if (!rows.length){
      if (serviceEmpty) serviceEmpty.style.display = 'block';
    } else if (serviceEmpty) {
      serviceEmpty.style.display = 'none';
    }
    rows.forEach(function(o){
      const tr = document.createElement('tr');
      const tdId = document.createElement('td');
      tdId.textContent = o.id || '';
      const tdName = document.createElement('td');
      tdName.textContent = (o.buyer && (o.buyer.name || o.buyer.contact)) || '';
      const tdDate = document.createElement('td');
      tdDate.textContent = o.requestDate || '—';
      const tdStatus = document.createElement('td');
      tdStatus.textContent = o.status || '';
      const tdAction = document.createElement('td');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn gold';
      btn.textContent = '上傳服務成果';
      const msg = document.createElement('div');
      msg.className = 'muted';
      msg.style.marginTop = '6px';
      btn.addEventListener('click', function(){
        serviceTargetId = o.id;
        if (resultInput) resultInput.click();
      });
      tdAction.appendChild(btn);
      tdAction.appendChild(msg);
      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdDate);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      serviceBody.appendChild(tr);
      tr.dataset.msgId = o.id;
    });
  }

  async function loadData(){
    if (busy) return;
    busy = true;
    setStatus(physicalStatus, '載入中...');
    setStatus(serviceStatus, '載入中...');
    try{
      const data = await authedFetch('/api/orders?limit=200', { cache:'no-store' });
      const orders = Array.isArray(data.orders) ? data.orders : (Array.isArray(data.items) ? data.items : []);
      renderPhysical(orders);
      setStatus(physicalStatus, orders.length ? '' : '沒有可處理的訂單');
    }catch(err){
      showError(physicalStatus, err);
    }
    try{
      const data = await authedFetch('/api/service/orders?limit=200', { cache:'no-store' });
      const orders = Array.isArray(data.items) ? data.items : [];
      renderService(orders);
      setStatus(serviceStatus, orders.length ? '' : '沒有可處理的服務訂單');
    }catch(err){
      showError(serviceStatus, err);
    }
    busy = false;
  }

  if (resultInput){
    resultInput.addEventListener('change', async function(){
      const file = resultInput.files && resultInput.files[0];
      if (!file || !serviceTargetId) return;
      const msg = serviceBody && serviceBody.querySelector('tr[data-msg-id="' + serviceTargetId + '"] .muted');
      if (msg) msg.textContent = '上傳中...';
      try{
        const form = new FormData();
        form.append('files[]', file);
        const upload = await authedFetch('/api/upload', { method:'POST', body: form });
        const url = upload.files && upload.files[0] && upload.files[0].url;
        if (!url) throw new Error('upload_failed');
        await authedFetch('/api/service/order/result-photo', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ id: serviceTargetId, photo: url })
        });
        if (msg) msg.textContent = '已完成';
        const btn = serviceBody.querySelector('tr[data-msg-id="' + serviceTargetId + '"] button');
        if (btn) btn.disabled = true;
      }catch(err){
        showError(msg, err);
      }finally{
        resultInput.value = '';
        serviceTargetId = '';
      }
    });
  }

  function startAutoRefresh(){
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadData, 60000);
  }

  loadData();
  startAutoRefresh();
})();
