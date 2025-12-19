(function(){
  const statusEl = document.getElementById('accountStatus');
  const wrapEl = document.getElementById('accountWrap');
  const physicalEl = document.getElementById('ordersPhysical');
  const serviceEl = document.getElementById('ordersService');
  const backBtn = document.getElementById('backBtn');

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function fmtDate(str){
    if (!str) return '';
    try{
      const d = new Date(str);
      return d.toLocaleString('zh-TW', { hour12:false });
    }catch(_){ return str; }
  }

  function renderOrders(listEl, items, emptyText){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
      listEl.innerHTML = `<div class="empty-msg">${escapeHtml(emptyText)}</div>`;
      return;
    }
    items.forEach(order=>{
      const div = document.createElement('div');
      div.className = 'order-item';
      const status = escapeHtml(order.status || '處理中');
      const amount = typeof order.amount === 'number' ? order.amount : Number(order.total || 0);
      const buyer = order.buyer || {};
      const svcLine = order.serviceName
        ? `${escapeHtml(order.serviceName)}${order.selectedOption && order.selectedOption.name ? '｜'+escapeHtml(order.selectedOption.name) : ''}`
        : '';
    const itemsLine = Array.isArray(order.items) && order.items.length
      ? order.items.map(it=>{
          const vn = it.variantName ? `（${escapeHtml(it.variantName)}）` : '';
          return {
            text: `${escapeHtml(it.productName||it.name||'商品')}${vn}×${Math.max(1, Number(it.qty||1))}`,
            image: it.image || it.cover || it.thumb || ''
          };
        })
      : [];
    const dateStr = fmtDate(order.createdAt || '');
    const itemCards = itemsLine.map(it=>{
      const img = it.image ? `<img src="${escapeHtml(it.image)}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;border:1px solid var(--line);">` : '';
      return `<div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px;margin-top:6px;background:#f8fafc;">
        ${img}
        <div style="font-size:13px;color:#334155;">${it.text}</div>
      </div>`;
    }).join('');
    div.innerHTML = `
      ${order.note ? `<div class="order-meta">備註：${escapeHtml(order.note)}</div>` : ''}
      <div class="order-id">${escapeHtml(order.id || order.orderId || '')}</div>
      <div class="order-meta">狀態：<span class="badge-status">${status}</span></div>
      <div class="order-meta">建立時間：${escapeHtml(dateStr)}</div>
      <div class="order-meta">金額：NT$ ${Number(amount||0).toLocaleString('zh-TW')}</div>
      <div class="order-meta">聯絡人：${escapeHtml(buyer.name || '—')}（${escapeHtml(buyer.phone || '')}）</div>
      <div class="order-meta">Email：${escapeHtml(buyer.email || '')}</div>
      ${svcLine ? `<div class="order-meta">服務：${svcLine}</div>` : ''}
      ${order.requestDate ? `<div class="order-meta">指定日期：${escapeHtml(order.requestDate)}</div>` : ''}
      ${itemCards}
    `;
      listEl.appendChild(div);
    });
  }

  async function loadOrders(){
    if (!statusEl) return;
    statusEl.textContent = '載入訂單中…';
    try{
      const res = await fetch('/api/me/orders', { credentials:'include' });
      if (res.status === 401){
        statusEl.textContent = '請先登入以查看訂單。';
        return;
      }
      if (!res.ok){
        statusEl.textContent = '讀取訂單失敗，請稍後再試。';
        return;
      }
      const data = await res.json().catch(()=>({}));
      if (data.ok === false){
        statusEl.textContent = data.error || '讀取訂單失敗';
        return;
      }
      statusEl.textContent = '以下為您的訂單。';
      if (wrapEl) wrapEl.style.display = 'grid';
      renderOrders(physicalEl, Array.isArray(data.orders?.physical) ? data.orders.physical : [], '尚無實體商品訂單');
      renderOrders(serviceEl, Array.isArray(data.orders?.service) ? data.orders.service : [], '尚無服務型商品訂單');
    }catch(_){
      statusEl.textContent = '讀取訂單失敗，請稍後再試。';
    }
  }

  function initBack(){
    if (!backBtn) return;
    backBtn.addEventListener('click', ()=>{
      if (window.history.length > 1) history.back();
      else window.location.href = '/shop.html';
    });
  }

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = '需要登入模組載入失敗。';
      return;
    }
    if (window.authState.isLoggedIn && window.authState.isLoggedIn()){
      loadOrders();
    }else{
      statusEl.textContent = '請先登入以查看訂單。';
    }
  }

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadOrders();
      }else{
        if (wrapEl) wrapEl.style.display = 'none';
        if (statusEl) statusEl.textContent = '請先登入以查看訂單。';
      }
    });
  }

  initBack();
  ensureLogin();
})();
