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

  async function loadAccountData(){
    if (!statusEl) return;
    statusEl.textContent = '載入資料中…';
    try{
      const ordersRes = await fetch('/api/me/orders', { credentials:'include' });
      if (ordersRes.status === 401){
        statusEl.textContent = '請先登入以查看訂單。';
        return;
      }
      if (!ordersRes.ok){
        statusEl.textContent = '讀取資料失敗，請稍後再試。';
        return;
      }
      const ordersData = await ordersRes.json().catch(()=>({}));
      if (ordersData.ok === false){
        statusEl.textContent = ordersData.error || '讀取訂單失敗';
        return;
      }
      statusEl.textContent = '以下為您的訂單。';
      if (gridEl) gridEl.style.display = 'grid';
      renderOrders(physicalEl, Array.isArray(ordersData.orders?.physical) ? ordersData.orders.physical : [], '尚無實體商品訂單');
      renderOrders(serviceEl, Array.isArray(ordersData.orders?.service) ? ordersData.orders.service : [], '尚無服務型商品訂單');
    }catch(_){
      statusEl.textContent = '讀取資料失敗，請稍後再試。';
    }
  }

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = '需要登入模組載入失敗。';
      return;
    }
    if (window.authState.isLoggedIn && window.authState.isLoggedIn()){
      loadAccountData();
    }else{
      statusEl.textContent = '請先登入以查看訂單。';
    }
  }

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadAccountData();
      }else{
        if (gridEl) gridEl.style.display = 'none';
        if (statusEl) statusEl.textContent = '請先登入以查看訂單。';
      }
    });
  }

  ensureLogin();
})();
