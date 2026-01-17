(function(){
  const statusEl = document.getElementById('accountStatus');
  const gridEl = document.getElementById('accountGrid');
  const physicalEl = document.getElementById('accountPhysical');
  const serviceEl = document.getElementById('accountService');

  function renderOrders(listEl, items, emptyText){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
    listEl.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'empty-msg';
    empty.textContent = emptyText;
    listEl.appendChild(empty);
      return;
    }
    items.forEach(order=>{
      const div = document.createElement('div');
      div.className = 'order-item';
      const status = escapeHtml(order.status || '處理中');
      const amount = typeof order.amount === 'number' ? order.amount : Number(order.total || 0);
      const orderId = String(order.id || order.orderId || '').trim();
      div.setAttribute('data-order-id', orderId);
      div.innerHTML = `
        <div class="order-id">${escapeHtml(orderId)}<span class="qna-unread" data-qna-unread="1">0</span></div>
        <div class="order-meta">狀態：
          <span class="badge-status">${status}</span>
        </div>
        <div class="order-meta">建立時間：${escapeHtml(order.createdAt || '')}</div>
        <div class="order-meta">金額：NT$ ${Number(amount||0).toLocaleString('zh-TW')}</div>
        <div class="order-meta">聯絡人：${escapeHtml(order?.buyer?.name || '—')}（${escapeHtml(order?.buyer?.phone || '')}）</div>
        <div class="order-qna" data-qna="1">
          <button type="button" class="qna-toggle" data-qna-toggle="1">訂單問與答</button>
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

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
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
      const badge = card.querySelector('[data-qna-unread]');
      if (!badge) return;
      const count = Number(map[orderId] || 0) || 0;
      if (count > 0){
        badge.textContent = String(count);
        badge.classList.add('show');
      }else{
        badge.textContent = '0';
        badge.classList.remove('show');
      }
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
      try{
        const map = await fetchUnreadMap();
        applyUnreadMap(map);
      }catch(_){}
    }catch(_){
      statusEl.textContent = '讀取資料失敗，請稍後再試。';
    }
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
