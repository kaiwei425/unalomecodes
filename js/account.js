(function(){
  const statusEl = document.getElementById('accountStatus');
  const gridEl = document.getElementById('accountGrid');
  const physicalEl = document.getElementById('accountPhysical');
  const serviceEl = document.getElementById('accountService');
  const wishlistEl = document.getElementById('accountWishlist');

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

  function renderWishlist(items){
    if (!wishlistEl) return;
    wishlistEl.innerHTML = '';
    if (!items.length){
      wishlistEl.innerHTML = '<div class="empty-msg">目前沒有收藏的商品。</div>';
      return;
    }
    items.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'order-item';
      div.innerHTML = `
        <div class="order-id">${escapeHtml(item.name || '')}</div>
        <div class="order-meta">價格：NT$ ${Number(item.price || item.basePrice || 0).toLocaleString('zh-TW')}</div>
        <div class="order-meta">神祇：${escapeHtml(item.deity || '—')}</div>
      `;
      wishlistEl.appendChild(div);
    });
  }

  async function loadAccountData(){
    if (!statusEl) return;
    statusEl.textContent = '載入資料中…';
    try{
      const [ordersRes, wishlistRes] = await Promise.all([
        fetch('/api/me/orders', { credentials:'include' }),
        fetch('/api/me/wishlist', { credentials:'include' })
      ]);
      if (ordersRes.status === 401 || wishlistRes.status === 401){
        statusEl.textContent = '請先登入以查看訂單與收藏。';
        return;
      }
      if (!ordersRes.ok || !wishlistRes.ok){
        statusEl.textContent = '讀取資料失敗，請稍後再試。';
        return;
      }
      const ordersData = await ordersRes.json().catch(()=>({}));
      const wishlistData = await wishlistRes.json().catch(()=>({}));
      if (ordersData.ok === false){
        statusEl.textContent = ordersData.error || '讀取訂單失敗';
        return;
      }
      if (wishlistData.ok === false){
        statusEl.textContent = wishlistData.error || '讀取收藏失敗';
        return;
      }
      statusEl.textContent = '以下為您的訂單與收藏。';
      if (gridEl) gridEl.style.display = 'grid';
      renderOrders(physicalEl, Array.isArray(ordersData.orders?.physical) ? ordersData.orders.physical : [], '尚無實體商品訂單');
      renderOrders(serviceEl, Array.isArray(ordersData.orders?.service) ? ordersData.orders.service : [], '尚無服務型商品訂單');
      renderWishlist(Array.isArray(wishlistData.items) ? wishlistData.items : []);
    }catch(_){
      statusEl.textContent = '讀取資料失敗，請稍後再試。';
    }
  }

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = '需要登入模組載入失敗。';
      return;
    }
    if (window.authState.isLoggedIn()){
      loadAccountData();
    }else{
      statusEl.textContent = '請先登入以查看訂單。';
      window.authState.requireLogin('請先登入即可查看訂單與會員資訊。').catch(()=>{});
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
