(function(){
  const statusEl = document.getElementById('accountStatus');
  const wrapEl = document.getElementById('accountWrap');
  const physicalEl = document.getElementById('ordersPhysical');
  const serviceEl = document.getElementById('ordersService');
  const backBtn = document.getElementById('backBtn');

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function sanitizeImageUrl(raw){
    try{
      const val = String(raw || '').trim();
      if (!val) return '';
      if (/^data:image\//i.test(val)) return val;
      const u = new URL(val, window.location.origin);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    }catch(_){}
    return '';
  }
  function fmtDate(str){
    if (!str) return '';
    try{
      const d = new Date(str);
      return d.toLocaleString('zh-TW', { hour12:false });
    }catch(_){ return str; }
  }
  function fmtTime(str){
    if (!str) return '';
    try{
      return new Date(str).toLocaleString('zh-TW', { hour12:false });
    }catch(_){ return str; }
  }

  const qnaCache = new Map();

  function renderQnaList(listEl, items, orderId){
    if (!listEl) return;
    const safeItems = Array.isArray(items) ? items : [];
    qnaCache.set(orderId, safeItems);
    if (!safeItems.length){
      listEl.innerHTML = '<div class="empty-msg">尚無留言，歡迎提出問題。</div>';
      return;
    }
    listEl.innerHTML = safeItems.map(item=>{
      const role = item.role === 'admin' ? '客服' : '你';
      const edited = item.edited ? '（已編輯）' : '';
      const allowEdit = item.role === 'user';
      return `
        <div class="qna-item ${item.role === 'admin' ? 'admin' : ''}">
          <div class="qna-meta">
            <div>${escapeHtml(role)} ${edited}</div>
            <div>${escapeHtml(fmtTime(item.updatedAt || item.ts || ''))}</div>
          </div>
          <div class="qna-text">${escapeHtml(item.text || '')}</div>
          ${allowEdit ? `
            <div class="qna-actions">
              <button type="button" data-qna-edit="1" data-id="${escapeHtml(item.id||'')}" data-order-id="${escapeHtml(orderId)}">編輯</button>
              <button type="button" data-qna-del="1" data-id="${escapeHtml(item.id||'')}" data-order-id="${escapeHtml(orderId)}">刪除</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  async function fetchQna(orderId){
    const res = await fetch(`/api/order/qna?orderId=${encodeURIComponent(orderId)}`, { credentials:'include' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    return Array.isArray(data.items) ? data.items : [];
  }

  async function postQna(orderId, text){
    const res = await fetch('/api/order/qna', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ orderId, text })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    return data.item || null;
  }

  async function patchQna(orderId, id, text){
    const res = await fetch('/api/order/qna', {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ orderId, id, text })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    return data.item || null;
  }

  async function deleteQna(orderId, id){
    const res = await fetch('/api/order/qna', {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ orderId, id })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    return true;
  }

  async function fetchUnreadMap(){
    const res = await fetch('/api/me/qna/unread?detail=1', { credentials:'include', cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false) return {};
    return data.orders || {};
  }

  function applyUnreadMap(map){
    const orders = document.querySelectorAll('.order-item[data-order-id]');
    orders.forEach(card=>{
      const orderId = card.getAttribute('data-order-id') || '';
      const count = Number(map[orderId] || 0) || 0;
      const badges = card.querySelectorAll('[data-qna-unread]');
      if (!badges.length) return;
      badges.forEach(badge=>{
        if (count > 0){
          badge.textContent = String(count);
          badge.classList.add('show');
        }else{
          badge.textContent = '0';
          badge.classList.remove('show');
        }
      });
    });
  }

  async function clearUnreadForOrder(orderId){
    if (!orderId) return;
    try{
      await fetch('/api/me/qna/unread', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({ action:'clear', orderId })
      });
    }catch(_){}
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
    const shipping = order.shipping || order.receiver || order.logistics || order.cvs || order.storeInfo || {};
    const storeTextRaw = [
      order.store,
      order.storeName,
      order.storeAddress,
      order?.buyer?.store,
      shipping.store,
      shipping.storeName,
      shipping.storeAddress,
      shipping.address
    ].find(Boolean);
    const storeText = storeTextRaw
      ? escapeHtml(storeTextRaw)
      : (()=> {
          const name = shipping.storeName || shipping.name || '';
          const sid  = shipping.storeId || shipping.id || '';
          const addr = shipping.storeAddress || shipping.address || '';
          const parts = [name, sid ? `(${sid})` : '', addr].filter(Boolean);
          return parts.length ? escapeHtml(parts.join(' ')) : '';
        })();
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
      const imgUrl = sanitizeImageUrl(it.image);
      const img = imgUrl ? `<img src="${escapeHtml(imgUrl)}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;border:1px solid var(--line);">` : '';
      return `<div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:8px;margin-top:6px;background:#f8fafc;">
        ${img}
        <div style="font-size:13px;color:#334155;">${it.text}</div>
      </div>`;
    }).join('');
    const orderId = String(order.id || order.orderId || '').trim();
    div.setAttribute('data-order-id', orderId);
    div.innerHTML = `
      <div class="order-id">${escapeHtml(orderId)}<span class="qna-unread" data-qna-unread="1">0</span></div>
      <div class="order-meta">狀態：<span class="badge-status">${status}</span></div>
      <div class="order-meta">建立時間：${escapeHtml(dateStr)}</div>
      <div class="order-meta">金額：NT$ ${Number(amount||0).toLocaleString('zh-TW')}</div>
      <div class="order-meta">聯絡人：${escapeHtml(buyer.name || '—')}（${escapeHtml(buyer.phone || '')}）</div>
      <div class="order-meta">Email：${escapeHtml(buyer.email || '')}</div>
      ${storeText ? `<div class="order-meta">取貨門市：${storeText}</div>` : ''}
      ${order.note ? `<div class="order-meta">備註：${escapeHtml(order.note)}</div>` : ''}
      ${svcLine ? `<div class="order-meta">服務：${svcLine}</div>` : ''}
      ${order.requestDate ? `<div class="order-meta">指定日期：${escapeHtml(order.requestDate)}</div>` : ''}
      ${itemCards}
      <div class="order-qna" data-qna="1">
        <button type="button" class="qna-toggle" data-qna-toggle="1">訂單問與答 <span class="qna-unread" data-qna-unread="1">0</span></button>
        <span class="qna-status" data-qna-status="1"></span>
        <div class="qna-body" data-qna-body="1">
          <div class="qna-list" data-qna-list="1"></div>
          <div class="qna-form">
            <textarea placeholder="輸入訊息..." data-qna-input="1"></textarea>
            <button type="button" data-qna-send="1">送出</button>
          </div>
        </div>
      </div>
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
      try{
        const map = await fetchUnreadMap();
        applyUnreadMap(map);
      }catch(_){}
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

  async function loadQnaInto(root){
    if (!root) return;
    const orderId = root.getAttribute('data-order-id') || '';
    const statusEl = root.querySelector('[data-qna-status]');
    const listEl = root.querySelector('[data-qna-list]');
    if (!orderId || !listEl) return;
    if (statusEl) statusEl.textContent = '載入中…';
    try{
      const items = await fetchQna(orderId);
      renderQnaList(listEl, items, orderId);
      if (statusEl) statusEl.textContent = '';
    }catch(err){
      if (statusEl) statusEl.textContent = '讀取失敗';
      if (listEl) listEl.innerHTML = `<div class="empty-msg">${escapeHtml(err.message || '讀取失敗')}</div>`;
    }
  }

  document.addEventListener('click', async (e)=>{
    const toggleBtn = e.target.closest && e.target.closest('[data-qna-toggle]');
    if (toggleBtn){
      const root = toggleBtn.closest('.order-item');
      if (!root) return;
      const body = root.querySelector('[data-qna-body]');
      if (!body) return;
      const isOpen = body.style.display === 'block';
      if (isOpen){
        body.style.display = 'none';
      }else{
        body.style.display = 'block';
        await loadQnaInto(root);
        const orderId = root.getAttribute('data-order-id') || '';
        await clearUnreadForOrder(orderId);
        try{
          const map = await fetchUnreadMap();
          applyUnreadMap(map);
        }catch(_){}
      }
      return;
    }
    const sendBtn = e.target.closest && e.target.closest('[data-qna-send]');
    if (sendBtn){
      const root = sendBtn.closest('.order-item');
      if (!root) return;
      const orderId = root.getAttribute('data-order-id') || '';
      const input = root.querySelector('[data-qna-input]');
      if (!orderId || !input) return;
      const text = input.value.trim();
      if (!text){
        alert('請先輸入訊息');
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = '送出中…';
      try{
        await postQna(orderId, text);
        input.value = '';
        await loadQnaInto(root);
        await clearUnreadForOrder(orderId);
        try{
          const map = await fetchUnreadMap();
          applyUnreadMap(map);
        }catch(_){}
      }catch(err){
        alert(err.message || '送出失敗');
      }finally{
        sendBtn.disabled = false;
        sendBtn.textContent = '送出';
      }
      return;
    }
    const editBtn = e.target.closest && e.target.closest('[data-qna-edit]');
    if (editBtn){
      const orderId = editBtn.getAttribute('data-order-id') || '';
      const msgId = editBtn.getAttribute('data-id') || '';
      if (!orderId || !msgId) return;
      const items = qnaCache.get(orderId) || [];
      const target = items.find(it => it && it.id === msgId);
      if (!target) return;
      const next = prompt('修改留言', target.text || '');
      if (next == null) return;
      const text = String(next).trim();
      if (!text){
        alert('留言內容不能空白');
        return;
      }
      try{
        await patchQna(orderId, msgId, text);
        const root = editBtn.closest('.order-item');
        await loadQnaInto(root);
        await clearUnreadForOrder(orderId);
        try{
          const map = await fetchUnreadMap();
          applyUnreadMap(map);
        }catch(_){}
      }catch(err){
        alert(err.message || '更新失敗');
      }
      return;
    }
    const delBtn = e.target.closest && e.target.closest('[data-qna-del]');
    if (delBtn){
      const orderId = delBtn.getAttribute('data-order-id') || '';
      const msgId = delBtn.getAttribute('data-id') || '';
      if (!orderId || !msgId) return;
      const ok = confirm('確定要刪除這則留言？');
      if (!ok) return;
      try{
        await deleteQna(orderId, msgId);
        const root = delBtn.closest('.order-item');
        await loadQnaInto(root);
        await clearUnreadForOrder(orderId);
        try{
          const map = await fetchUnreadMap();
          applyUnreadMap(map);
        }catch(_){}
      }catch(err){
        alert(err.message || '刪除失敗');
      }
    }
  });

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
