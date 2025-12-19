(function(){
  const statusEl = document.getElementById('accountStatus');
  const gridEl = document.getElementById('accountGrid');
  const physicalEl = document.getElementById('accountPhysical');
  const serviceEl = document.getElementById('accountService');

  function renderOrders(listEl, items, emptyText){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
      listEl.innerHTML = `<div class="empty-msg">${emptyText}</div>`;
      return;
    }
    items.forEach(order=>{
      const div = document.createElement('div');
      div.className = 'order-item';
      const status = escapeHtml(order.status || '處理中');
      const amount = typeof order.amount === 'number' ? order.amount : Number(order.total || 0);
      div.innerHTML = `
        <div class="order-id">${escapeHtml(order.id || order.orderId || '')}</div>
        <div class="order-meta">狀態：
          <span class="badge-status">${status}</span>
        </div>
        <div class="order-meta">建立時間：${escapeHtml(order.createdAt || '')}</div>
        <div class="order-meta">金額：NT$ ${Number(amount||0).toLocaleString('zh-TW')}</div>
        <div class="order-meta">聯絡人：${escapeHtml(order?.buyer?.name || '—')}（${escapeHtml(order?.buyer?.phone || '')}）</div>
      `;
      listEl.appendChild(div);
    });
  }

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  async function loadOrders(){
    if (!statusEl) return;
    statusEl.textContent = '載入訂單中…';
    try{
      const res = await fetch('/api/me/orders', { credentials:'include' });
      if (!res.ok){
        if (res.status === 401){
          statusEl.textContent = '請先登入以查看訂單。';
        }else{
          statusEl.textContent = '讀取訂單失敗，請稍後再試。';
        }
        return;
      }
      const data = await res.json().catch(()=>({}));
      if (!data || data.ok === false){
        statusEl.textContent = (data && data.error) || '讀取訂單失敗';
        return;
      }
      statusEl.textContent = '以下為您最近的訂單。';
      if (gridEl) gridEl.style.display = 'grid';
      renderOrders(physicalEl, data.orders && Array.isArray(data.orders.physical) ? data.orders.physical : [], '尚無實體商品訂單');
      renderOrders(serviceEl, data.orders && Array.isArray(data.orders.service) ? data.orders.service : [], '尚無服務型商品訂單');
    }catch(_){
      statusEl.textContent = '讀取訂單失敗，請稍後再試。';
    }
  }

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = '需要登入模組載入失敗。';
      return;
    }
    if (window.authState.isLoggedIn()){
      loadOrders();
    }else{
      statusEl.textContent = '請先登入以查看訂單。';
      window.authState.requireLogin('請先登入即可查看訂單與會員資訊。').catch(()=>{});
    }
  }

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadOrders();
      }else{
        if (gridEl) gridEl.style.display = 'none';
        if (statusEl) statusEl.textContent = '請先登入以查看訂單。';
      }
    });
  }

  ensureLogin();
})();
