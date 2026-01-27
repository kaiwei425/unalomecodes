(function(){
  const statusEl = document.getElementById('accountStatus');
  const wrapEl = document.getElementById('accountWrap');
  const physicalEl = document.getElementById('ordersPhysical');
  const serviceEl = document.getElementById('ordersService');
  const backBtn = document.getElementById('backBtn');
  const t = (window.UC_I18N && typeof window.UC_I18N.t === 'function')
    ? window.UC_I18N.t
    : function(k){ return k; };

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
  function formatTaipeiFromBkk(slotStart){
    const raw = String(slotStart || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{2}):(\d{2})/);
    if (!match) return '';
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const hh = Number(match[4]);
    const mm = Number(match[5]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(hh) || !Number.isFinite(mm)) return '';
    const utcMs = Date.UTC(y, m - 1, d, hh - 7, mm);
    const tpeMs = utcMs + 8 * 3600 * 1000;
    const dt = new Date(tpeMs);
    const yy = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const da = String(dt.getUTCDate()).padStart(2, '0');
    const th = String(dt.getUTCHours()).padStart(2, '0');
    const tm = String(dt.getUTCMinutes()).padStart(2, '0');
    return `${yy}-${mo}-${da} ${th}:${tm}`;
  }
  function isPhoneConsultOrder(order){
    if (!order) return false;
    if (order.consultStage) return true;
    const name = String(order.serviceName || '').toLowerCase();
    return /phone|電話|consult|占卜|算命/.test(name);
  }

  const qnaCache = new Map();

  function renderQnaList(listEl, items, orderId){
    if (!listEl) return;
    const safeItems = Array.isArray(items) ? items : [];
    qnaCache.set(orderId, safeItems);
    if (!safeItems.length){
      listEl.innerHTML = '<div class="empty-msg">' + escapeHtml(t('orders.qna_empty')) + '</div>';
      return;
    }
    listEl.innerHTML = safeItems.map(item=>{
      const role = item.role === 'admin' ? t('orders.qna_support') : t('orders.qna_you');
      const edited = item.edited ? t('orders.qna_edited') : '';
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
              <button type="button" data-qna-edit="1" data-id="${escapeHtml(item.id||'')}" data-order-id="${escapeHtml(orderId)}">${escapeHtml(t('orders.qna_edit'))}</button>
              <button type="button" data-qna-del="1" data-id="${escapeHtml(item.id||'')}" data-order-id="${escapeHtml(orderId)}">${escapeHtml(t('orders.qna_delete'))}</button>
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
      const status = escapeHtml(order.status || t('orders.processing'));
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
            text: `${escapeHtml(it.productName||it.name||t('orders.item_fallback'))}${vn}×${Math.max(1, Number(it.qty||1))}`,
            image: it.image || it.cover || it.thumb || ''
          };
        })
      : [];
    const dateStr = fmtDate(order.createdAt || '');
    const scheduleRaw = String(order.slotStart || order.requestDate || '').trim();
    const isPhoneOrder = isPhoneConsultOrder(order);
    const scheduleTpe = scheduleRaw && isPhoneOrder ? formatTaipeiFromBkk(scheduleRaw) : '';
    const scheduleLine = scheduleRaw
      ? (isPhoneOrder && scheduleTpe
        ? (escapeHtml(t('orders.schedule')) + '：' + escapeHtml(scheduleRaw) + '（' + escapeHtml(t('orders.tz_bkk')) + '） <span style="color:#dc2626;">' + escapeHtml(scheduleTpe) + '（' + escapeHtml(t('orders.tz_tpe')) + '）</span>')
        : (escapeHtml(t('orders.schedule')) + '：' + escapeHtml(scheduleRaw)))
      : '';
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
      <div class="order-meta">${escapeHtml(t('orders.status'))}：<span class="badge-status">${status}</span></div>
      <div class="order-meta">${escapeHtml(t('orders.created_at'))}：${escapeHtml(dateStr)}</div>
      <div class="order-meta">${escapeHtml(t('orders.amount'))}：NT$ ${Number(amount||0).toLocaleString('zh-TW')}</div>
      <div class="order-meta">${escapeHtml(t('orders.contact'))}：${escapeHtml(buyer.name || '—')}（${escapeHtml(buyer.phone || '')}）</div>
      <div class="order-meta">${escapeHtml(t('orders.email'))}：${escapeHtml(buyer.email || '')}</div>
      ${storeText ? `<div class="order-meta">${escapeHtml(t('orders.pickup_store'))}：${storeText}</div>` : ''}
      ${order.note ? `<div class="order-meta">${escapeHtml(t('orders.note'))}：${escapeHtml(order.note)}</div>` : ''}
      ${svcLine ? `<div class="order-meta">${escapeHtml(t('orders.service'))}：${svcLine}</div>` : ''}
      ${scheduleLine ? `<div class="order-meta">${scheduleLine}</div>` : ''}
      ${itemCards}
      <div class="order-qna" data-qna="1">
        <button type="button" class="qna-toggle" data-qna-toggle="1">${escapeHtml(t('orders.qna_title'))} <span class="qna-unread" data-qna-unread="1">0</span></button>
        <span class="qna-status" data-qna-status="1"></span>
        <div class="qna-body" data-qna-body="1">
          <div class="qna-list" data-qna-list="1"></div>
          <div class="qna-form">
            <textarea placeholder="${escapeHtml(t('orders.qna_placeholder'))}" data-qna-input="1"></textarea>
            <button type="button" data-qna-send="1">${escapeHtml(t('orders.qna_send'))}</button>
          </div>
        </div>
      </div>
    `;
      listEl.appendChild(div);
    });
  }

  async function loadOrders(){
    if (!statusEl) return;
    statusEl.textContent = t('account.loading_data');
    try{
      const res = await fetch('/api/me/orders', { credentials:'include' });
      if (res.status === 401){
        statusEl.textContent = t('account.need_login');
        return;
      }
      if (!res.ok){
        statusEl.textContent = t('account.load_failed');
        return;
      }
      const data = await res.json().catch(()=>({}));
      if (data.ok === false){
        statusEl.textContent = data.error || t('account.load_failed');
        return;
      }
      statusEl.textContent = t('account.orders_intro');
      if (wrapEl) wrapEl.style.display = 'grid';
      renderOrders(physicalEl, Array.isArray(data.orders?.physical) ? data.orders.physical : [], t('account.empty_physical'));
      renderOrders(serviceEl, Array.isArray(data.orders?.service) ? data.orders.service : [], t('account.empty_service'));
      try{
        const map = await fetchUnreadMap();
        applyUnreadMap(map);
      }catch(_){}
    }catch(_){
      statusEl.textContent = t('account.load_failed');
    }
  }

  function initBack(){
    if (!backBtn) return;
    backBtn.addEventListener('click', ()=>{
      if (window.history.length > 1) history.back();
      else window.location.href = '/shop';
    });
  }

  async function loadQnaInto(root){
    if (!root) return;
    const orderId = root.getAttribute('data-order-id') || '';
    const statusEl = root.querySelector('[data-qna-status]');
    const listEl = root.querySelector('[data-qna-list]');
    if (!orderId || !listEl) return;
    if (statusEl) statusEl.textContent = t('orders.qna_loading');
    try{
      const items = await fetchQna(orderId);
      renderQnaList(listEl, items, orderId);
      if (statusEl) statusEl.textContent = '';
    }catch(err){
      if (statusEl) statusEl.textContent = t('orders.qna_failed');
      if (listEl) listEl.innerHTML = `<div class="empty-msg">${escapeHtml(err.message || t('orders.qna_failed'))}</div>`;
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
        alert(t('orders.qna_input_required'));
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = t('orders.qna_sending');
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
        alert(err.message || t('orders.qna_send_failed'));
      }finally{
        sendBtn.disabled = false;
        sendBtn.textContent = t('orders.qna_send');
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
      const next = prompt(t('orders.qna_edit_prompt'), target.text || '');
      if (next == null) return;
      const text = String(next).trim();
      if (!text){
        alert(t('orders.qna_empty_not_allowed'));
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
        alert(err.message || t('orders.qna_update_failed'));
      }
      return;
    }
    const delBtn = e.target.closest && e.target.closest('[data-qna-del]');
    if (delBtn){
      const orderId = delBtn.getAttribute('data-order-id') || '';
      const msgId = delBtn.getAttribute('data-id') || '';
      if (!orderId || !msgId) return;
      const ok = confirm(t('orders.qna_delete_confirm'));
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
        alert(err.message || t('orders.qna_delete_failed'));
      }
    }
  });

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = t('account.login_module_missing');
      return;
    }
    if (window.authState.isLoggedIn && window.authState.isLoggedIn()){
      loadOrders();
    }else{
      statusEl.textContent = t('account.need_login');
    }
  }

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadOrders();
      }else{
        if (wrapEl) wrapEl.style.display = 'none';
        if (statusEl) statusEl.textContent = t('account.need_login');
      }
    });
  }

  initBack();
  ensureLogin();
})();
