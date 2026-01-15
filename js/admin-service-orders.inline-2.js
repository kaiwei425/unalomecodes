(function(){
  const API_BASE = window.__SHOP_ORIGIN || 'https://unalomecodes.com';
  async function authedFetch(url, init){
    const opts = Object.assign({}, init||{});
    opts.credentials = 'include';
    if (!opts.method) opts.method = 'GET';
    const target = /^https?:/i.test(url) ? url : API_BASE + url;
    const res = await fetch(target, opts);
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    return data;
  }
  const bodyEl = document.getElementById('ordersBody');
  const filterInput = document.getElementById('filter');
  const btnReload = document.getElementById('btnReload');
  const btnExport = document.getElementById('btnExport');
  const statusTabs = document.getElementById('statusTabs');
  let orders = [];
  let activeStatus = 'pending';
  const STATUSES = ['待處理','已確認付款，祈福進行中','祈福完成','祈福成果已通知'];
  let ADMIN_ROLE = '';
  let IS_FULFILLMENT = false;

  function fmtCurrency(val){
    return 'NT$ ' + Number(val||0).toLocaleString('zh-TW');
  }
  function formatItems(order){
    const list = Array.isArray(order.items) ? order.items : [];
    if (list.length){
      return list.map(it => `${it.name || order.serviceName || ''}｜${fmtCurrency(it.total || 0)}`).join('<br>');
    }
    return `${order.serviceName || ''}｜${fmtCurrency(order.amount || 0)}`;
  }
  function formatSelections(order){
    const options = Array.isArray(order.selectedOptions) ? order.selectedOptions : (order.selectedOption ? [order.selectedOption] : []);
    if (options.length){
      return options.map(opt => `${opt.name || ''}${opt.price ? `（+${fmtCurrency(opt.price)}）` : ''}`).join('、');
    }
    return '標準服務';
  }
  function getProofUrl(order){
    return order?.transfer?.receiptUrl || order?.transfer?.proofUrl || order?.transferReceiptUrl || '';
  }
  function getRitualPhotoUrl(order){
    return order?.ritualPhotoUrl || order?.transfer?.ritualPhotoUrl || order?.ritual_photo || order?.ritualPhoto || '';
  }
  function normalizeResultUrl(raw){
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^https?:\/\//i.test(val) || val.startsWith('data:')) return val;
    if (val.startsWith('/api/')) return val;
    return '/api/proof/' + encodeURIComponent(val);
  }
  function getResultPhoto(order){
    if (!order) return '';
    const direct = order.resultPhotoUrl || order.resultPhoto || order.result_photo_url || order.resultPhotoURL || '';
    const directUrl = normalizeResultUrl(direct);
    if (directUrl) return directUrl;
    const list = Array.isArray(order.results) ? order.results : [];
    for (const item of list){
      if (!item) continue;
      const url = item.url || item.image || item.imageUrl || '';
      const normalized = normalizeResultUrl(url);
      if (normalized) return normalized;
    }
    return '';
  }
  function getTransferLast5(order){
    return (order && (order.transfer && order.transfer.last5 || order.transferLast5 || '')) || '';
  }
  function getOrderTotal(order){
    if (!order) return 0;
    const transfer = order.transfer || {};
    const direct = Number(transfer.amount || order.amount || order.totalAmount || order.total || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const list = Array.isArray(order.items) ? order.items : [];
    let sum = 0;
    list.forEach(it=>{
      const line = Number(it && (it.total ?? it.amount));
      if (Number.isFinite(line) && line > 0){
        sum += line;
        return;
      }
      const price = Number(it && (it.price ?? it.basePrice ?? 0));
      const qty = Number(it && (it.qty ?? it.quantity ?? 1));
      if (Number.isFinite(price) && price > 0){
        sum += price * (Number.isFinite(qty) && qty > 0 ? qty : 1);
      }
    });
    return sum;
  }
  function fmt(ts){
    if (!ts) return '';
    try{
      return new Date(ts).toLocaleString('zh-TW', { timeZone:'Asia/Bangkok', hour12:false });
    }catch(_){ return ts; }
  }
  function escapeHtml(str){
    return String(str||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function resolveAdminRole(){
    if (ADMIN_ROLE) return ADMIN_ROLE;
    try{
      if (window.AUTH && typeof window.AUTH.getState === 'function'){
        const state = window.AUTH.getState();
        const role = state && state.admin && state.admin.role ? String(state.admin.role).trim().toLowerCase() : '';
        if (role){
          ADMIN_ROLE = role;
          IS_FULFILLMENT = role === 'fulfillment';
          return ADMIN_ROLE;
        }
      }
    }catch(_){}
    try{
      const data = await authedFetch('/api/auth/admin/me', { cache:'no-store' });
      if (data && data.ok){
        ADMIN_ROLE = String(data.role || '').trim().toLowerCase();
        IS_FULFILLMENT = ADMIN_ROLE === 'fulfillment';
      }
    }catch(_){}
    return ADMIN_ROLE;
  }

  function applyFulfillmentUi(){
    if (!IS_FULFILLMENT) return;
    if (btnExport){
      btnExport.style.display = 'none';
      btnExport.disabled = true;
    }
    const exportNeedles = ['匯出','export'];
    const riskyNeedles = ['釋放','release','cron','解鎖','批次','delete','刪除'];
    const nodes = Array.from(document.querySelectorAll('a,button'));
    nodes.forEach(el=>{
      const text = String(el.textContent || '').toLowerCase();
      const href = String(el.getAttribute('href') || '').toLowerCase();
      const dataUrl = String(el.getAttribute('data-url') || '').toLowerCase();
      const dataHref = String(el.getAttribute('data-href') || '').toLowerCase();
      const dataApi = String(el.getAttribute('data-api') || '').toLowerCase();
      const dataEndpoint = String(el.getAttribute('data-endpoint') || '').toLowerCase();
      const hasExportHref = href.includes('/api/service/orders/export');
      const hasReleaseEndpoint = href.includes('/api/admin/cron/release-holds')
        || dataUrl.includes('/api/admin/cron/release-holds')
        || dataHref.includes('/api/admin/cron/release-holds')
        || dataApi.includes('/api/admin/cron/release-holds')
        || dataEndpoint.includes('/api/admin/cron/release-holds');
      const hasExportText = exportNeedles.some(n=> text.includes(n));
      const hasRiskText = riskyNeedles.some(n=> text.includes(n));
      if (hasExportHref || hasReleaseEndpoint || hasExportText || hasRiskText){
        el.style.display = 'none';
        if ('disabled' in el) el.disabled = true;
      }
    });
  }

  const qnaDialog = document.getElementById('svcQnaDialog');
  const qnaTitle = document.getElementById('svcQnaTitle');
  const qnaList = document.getElementById('svcQnaList');
  const qnaInput = document.getElementById('svcQnaInput');
  const qnaSend = document.getElementById('svcQnaSend');
  const qnaClose = document.getElementById('svcQnaClose');
  let qnaOrderId = '';
  let qnaItems = [];

  function renderQna(items){
    if (!qnaList) return;
    const list = Array.isArray(items) ? items : [];
    qnaItems = list;
    if (!list.length){
      qnaList.innerHTML = '<div class="muted">尚無留言。</div>';
      return;
    }
    qnaList.innerHTML = list.map(item=>{
      const role = item.role === 'admin' ? '客服' : '顧客';
      const edited = item.edited ? '（已編輯）' : '';
      const ts = item.updatedAt || item.ts || '';
      return `
        <div class="qna-item ${item.role === 'admin' ? 'admin' : ''}">
          <div class="qna-meta">
            <div>${escapeHtml(role)} ${edited}</div>
            <div>${escapeHtml(ts ? new Date(ts).toLocaleString('zh-TW',{hour12:false}) : '')}</div>
          </div>
          <div class="qna-text">${escapeHtml(item.text || '')}</div>
          <div class="qna-actions">
            <button type="button" data-qna-edit="1" data-id="${escapeHtml(item.id||'')}">編輯</button>
            <button type="button" data-qna-del="1" data-id="${escapeHtml(item.id||'')}">刪除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadQna(orderId){
    if (!orderId) return;
    const data = await authedFetch(`/api/order/qna?orderId=${encodeURIComponent(orderId)}`, { cache:'no-store' });
    renderQna(data.items || []);
  }

  async function sendQna(text){
    if (!qnaOrderId) return;
    await authedFetch('/api/order/qna', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ orderId: qnaOrderId, text })
    });
  }

  async function editQna(id, text){
    if (!qnaOrderId) return;
    await authedFetch('/api/order/qna', {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ orderId: qnaOrderId, id, text })
    });
  }

  async function deleteQna(id){
    if (!qnaOrderId) return;
    await authedFetch('/api/order/qna', {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ orderId: qnaOrderId, id })
    });
  }

  function statusMatches(order, key){
    const raw = String(order && order.status || '').trim();
    if (!raw) return false;
    if (key === 'pending') return raw.includes('待處理') || raw.includes('待確認');
    if (key === 'paid') return raw.includes('祈福進行中');
    if (key === 'done') return raw.includes('祈福完成') || raw.includes('成果已通知');
    return true;
  }
  function matchesQuery(order, q){
    if (!q) return true;
    return [order.id, order.serviceName, order.buyer && order.buyer.phone].join(' ').toLowerCase().includes(q);
  }
  function updateStatusCounts(q){
    const query = (q || '').trim().toLowerCase();
    const base = orders.filter(o => matchesQuery(o, query));
    const counts = { pending: 0, paid: 0, done: 0 };
    base.forEach(o=>{
      if (statusMatches(o, 'pending')) counts.pending += 1;
      else if (statusMatches(o, 'paid')) counts.paid += 1;
      else if (statusMatches(o, 'done')) counts.done += 1;
    });
    document.querySelectorAll('.tab-count[data-status-count]').forEach(el=>{
      const key = el.getAttribute('data-status-count');
      el.textContent = String(counts[key] != null ? counts[key] : 0);
    });
  }
  function syncStatusTabs(){
    if (!statusTabs) return;
    statusTabs.querySelectorAll('[data-status]').forEach(btn=>{
      const val = btn.getAttribute('data-status') || '';
      btn.classList.toggle('active', val === activeStatus);
    });
  }
  function render(){
    const q = (filterInput.value||'').toLowerCase();
    updateStatusCounts(q);
    const view = orders
      .filter(o => matchesQuery(o, q))
      .filter(o => statusMatches(o, activeStatus));
    if (!view.length){
      bodyEl.innerHTML = '<div class="muted">沒有符合的訂單。</div>';
      return;
    }
    bodyEl.innerHTML = view.map(o=>{
      const transferLast5 = getTransferLast5(o);
      const transferDisplay = IS_FULFILLMENT
        ? '—'
        : (transferLast5 ? `<strong style="letter-spacing:1px;">${transferLast5}</strong>` : '—');
      const totalAmount = getOrderTotal(o);
      const totalAmountDisplay = IS_FULFILLMENT ? '—' : fmtCurrency(totalAmount);
      const contactPhone = IS_FULFILLMENT ? '' : escapeHtml(o.buyer && o.buyer.phone || '');
      const contactEmail = IS_FULFILLMENT ? '' : escapeHtml(o.buyer && o.buyer.email || '');
      const nameEn = IS_FULFILLMENT ? '' : (o.buyer && o.buyer.nameEn ? `<div class="muted">英文：${escapeHtml(o.buyer.nameEn)}</div>` : '');
      const requestDate = escapeHtml(o.requestDate || '—');
      const birthText = IS_FULFILLMENT ? '—' : escapeHtml((o.buyer && o.buyer.birth) || '—');
      const statusDisabled = IS_FULFILLMENT ? 'disabled' : '';
      const applyHidden = IS_FULFILLMENT ? 'style="display:none"' : '';
      const proofHidden = IS_FULFILLMENT ? 'style="display:none"' : '';
      const deleteHidden = IS_FULFILLMENT ? 'style="display:none"' : '';
      return `
        <div class="order-card" data-id="${o.id}">
          <div class="order-header">
            <div>
              <div class="order-id">${o.id}</div>
              <div class="order-time">${fmt(o.createdAt)}</div>
            </div>
            <div class="pill">${o.status || '待處理'}</div>
          </div>
          <div class="grid-two">
            <div class="section">
              <strong>服務</strong>
              <div>${escapeHtml(o.serviceName||'')}</div>
              <div class="muted">選項：${formatSelections(o)}</div>
              <div class="muted">內容：${formatItems(o)}</div>
              <div class="muted">備註：${escapeHtml(o.note||'—')}</div>
              <div class="muted">匯款末五碼：${transferDisplay}</div>
              <div class="muted">總金額：${totalAmountDisplay}</div>
            </div>
            <div class="section">
              <strong>聯絡人</strong>
              <div>${escapeHtml(o.buyer && o.buyer.name || '')}</div>
              ${nameEn}
              ${contactPhone ? `<div class="muted">${contactPhone}</div>` : ''}
              ${contactEmail ? `<div class="muted">${contactEmail}</div>` : ''}
              <div class="muted">生日：${birthText}</div>
              <div class="muted">指定日期：${requestDate}</div>
            </div>
          </div>
          <div class="section">
            <strong>狀態</strong>
            <select data-id="${o.id}" class="statusSel" ${statusDisabled}>
              ${STATUSES.map(st => `<option value="${st}" ${st === o.status ? 'selected':''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class="actions">
            <button class="btn primary" data-act="apply" data-id="${o.id}" ${applyHidden}>套用</button>
            <button class="btn" data-act="view" data-id="${o.id}">明細</button>
            <button class="btn" data-act="qna" data-id="${o.id}">問與答</button>
            <button class="btn" data-act="photo" data-id="${o.id}">顧客照片</button>
            <button class="btn" data-act="result-view" data-id="${o.id}">查看成果</button>
            <button class="btn" data-act="result-upload" data-id="${o.id}">上傳成果</button>
            <button class="btn" data-act="proof" data-id="${o.id}" ${proofHidden}>匯款憑證</button>
            <button class="btn danger" data-act="delete" data-id="${o.id}" ${deleteHidden}>刪除</button>
          </div>
        </div>
      `;
    }).join('');
    if (IS_FULFILLMENT) applyFulfillmentUi();
  }
  async function loadOrders(){
    bodyEl.innerHTML = '<div class="muted">載入中…</div>';
    try{
      const data = await authedFetch('/api/service/orders');
      orders = Array.isArray(data.items) ? data.items : [];
      syncStatusTabs();
      render();
      clearQnaUnread();
    }catch(err){
      bodyEl.innerHTML = `<div class="muted">載入失敗：${err.message}</div>`;
    }
  }

  async function clearQnaUnread(){
    try{
      await authedFetch('/api/admin/qna/unread', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'clear' })
      });
    }catch(_){}
  }
  bodyEl.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id');
    if (act === 'apply'){
      const row = btn.closest('.order-card');
      const sel = row ? row.querySelector('select.statusSel') : null;
      if (!sel) return;
      const status = sel.value;
      btn.disabled = true;
      btn.textContent = '更新中…';
      try{
        await authedFetch('/api/service/order/status', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id, status })
        });
        const target = orders.find(o=> o.id === id);
        if (target) target.status = status;
        render();
      }catch(err){
        alert('更新失敗：' + err.message);
      }finally{
        btn.disabled = false;
        btn.textContent = '套用';
      }
      return;
    }
    if (act === 'view'){
      const order = orders.find(o=> o.id === id);
      if (order) openDetail(order);
      return;
    }
    if (act === 'qna'){
      qnaOrderId = id || '';
      if (qnaTitle) qnaTitle.textContent = `訂單問與答｜${qnaOrderId}`;
      if (qnaInput) qnaInput.value = '';
      if (qnaList) qnaList.innerHTML = '<div class="muted">載入中…</div>';
      try{
        await loadQna(qnaOrderId);
      }catch(err){
        if (qnaList) qnaList.innerHTML = `<div class="muted">讀取失敗：${escapeHtml(err.message || 'error')}</div>`;
      }
      if (qnaDialog && typeof qnaDialog.showModal === 'function') qnaDialog.showModal();
      else if (qnaDialog) qnaDialog.setAttribute('open','');
      return;
    }
    if (act === 'photo'){
      const order = orders.find(o=> o.id === id);
      if (!order){
        alert('找不到訂單資訊');
        return;
      }
      const url = getRitualPhotoUrl(order);
      if (!url){
        alert('此訂單沒有提供祈福照片');
        return;
      }
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (act === 'result-view'){
      const order = orders.find(o=> o.id === id);
      if (!order){
        alert('找不到訂單資訊');
        return;
      }
      const url = getResultPhoto(order);
      if (!url){
        alert('尚未上傳祈福成果');
        return;
      }
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (act === 'result-upload'){
      const input = document.getElementById('resultPhotoInput');
      if (!input) return;
      input.dataset.targetId = id;
      input.value = '';
      input.click();
      return;
    }
    if (act === 'proof'){
      const order = orders.find(o=> o.id === id);
      if (!order){
        alert('找不到訂單資訊');
        return;
      }
      const url = getProofUrl(order);
      if (!url){
        alert('此訂單尚未上傳匯款憑證');
        return;
      }
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (act === 'delete'){
      const confirmText = prompt('請輸入「刪除」以確認刪除訂單 '+ id);
      if (confirmText !== '刪除') return;
      btn.disabled = true;
      btn.textContent = '刪除中…';
      try{
        await authedFetch('/api/service/order/status', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id, action:'delete', confirm: confirmText })
        });
        orders = orders.filter(o=> o.id !== id);
        render();
      }catch(err){
        alert('刪除失敗：' + err.message);
      }finally{
        btn.disabled = false;
        btn.textContent = '刪除';
      }
      return;
    }
  });
  const detailDialog = document.getElementById('svcOrderDetail');
  const detailBody = document.getElementById('svcOrderDetailBody');
  const detailClose = document.getElementById('svcOrderDetailClose');
  function openDetail(order){
    if (!detailDialog || !detailBody) return;
    const transfer = order.transfer || {};
    const receipt = transfer.receiptUrl || transfer.proofUrl || order.transferReceiptUrl || '';
    const ritualPhoto = getRitualPhotoUrl(order);
    const resultPhoto = getResultPhoto(order);
    const items = Array.isArray(order.items) ? order.items : [];
    const itemHtml = items.length ? items.map(it=> `<div>${escapeHtml(it.name||'')}｜${fmtCurrency(it.total||0)}</div>`).join('') : `<div>${escapeHtml(order.serviceName||'')}</div>`;
    const birth = (order.buyer && (order.buyer.birth || order.buyer.birthday)) || '—';
    const reqDate = order.requestDate || '—';
    if (IS_FULFILLMENT){
      detailBody.innerHTML = `
        <div><span class="muted">訂單編號</span><br><strong>${escapeHtml(order.id||'')}</strong></div>
        <div><span class="muted">服務內容</span>${itemHtml}</div>
        <div><span class="muted">聯絡人</span><br>${escapeHtml(order.buyer && order.buyer.name || '')}</div>
        <div><span class="muted">指定日期</span><br>${escapeHtml(reqDate)}</div>
        <div><span class="muted">備註</span><br>${escapeHtml(order.note || '—')}</div>
        ${ritualPhoto ? `<div><span class="muted">顧客照片</span><br><a href="${escapeHtml(ritualPhoto)}" target="_blank" rel="noopener" style="color:#38bdf8;">開新視窗查看</a><img src="${escapeHtml(ritualPhoto)}" alt="顧客照片" class="proof-img"></div>` : '<div><span class="muted">顧客照片</span><br>未提供</div>'}
        ${resultPhoto ? `<div><span class="muted">祈福成果</span><br><a href="${escapeHtml(resultPhoto)}" target="_blank" rel="noopener" style="color:#38bdf8;">開新視窗查看</a><img src="${escapeHtml(resultPhoto)}" alt="祈福成果" class="proof-img"></div>` : '<div><span class="muted">祈福成果</span><br>未上傳</div>'}
      `;
    }else{
      detailBody.innerHTML = `
        <div><span class="muted">訂單編號</span><br><strong>${escapeHtml(order.id||'')}</strong></div>
        <div><span class="muted">服務內容</span>${itemHtml}</div>
        <div><span class="muted">聯絡人</span><br>${escapeHtml(order.buyer && order.buyer.name || '')}｜${escapeHtml(order.buyer && order.buyer.phone || '')}<br>${escapeHtml(order.buyer && order.buyer.email || '')}${order.buyer && order.buyer.nameEn ? `<br>英文：${escapeHtml(order.buyer.nameEn)}` : ''}<br>生日：${escapeHtml(birth)}｜指定日期：${escapeHtml(reqDate)}</div>
        <div><span class="muted">匯款金額</span><br>${fmtCurrency(transfer.amount || order.amount || 0)}</div>
        <div><span class="muted">匯款資訊</span><br>銀行：${escapeHtml(transfer.bank || '—')}<br>帳號：${escapeHtml(transfer.account || '—')}<br>末五碼：${escapeHtml(transfer.last5 || order.transferLast5 || '—')}</div>
        <div><span class="muted">備註 / 匯款說明</span><br>${escapeHtml(transfer.memo || order.transferMemo || order.note || '—')}</div>
        ${receipt ? `<div><span class="muted">匯款憑證</span><br><a href="${escapeHtml(receipt)}" target="_blank" rel="noopener" style="color:#38bdf8;">開新視窗查看</a><img src="${escapeHtml(receipt)}" alt="匯款憑證" class="proof-img"></div>` : '<div><span class="muted">匯款憑證</span><br>尚未提供</div>'}
        ${ritualPhoto ? `<div><span class="muted">顧客照片</span><br><a href="${escapeHtml(ritualPhoto)}" target="_blank" rel="noopener" style="color:#38bdf8;">開新視窗查看</a><img src="${escapeHtml(ritualPhoto)}" alt="顧客照片" class="proof-img"></div>` : '<div><span class="muted">顧客照片</span><br>未提供</div>'}
        ${resultPhoto ? `<div><span class="muted">祈福成果</span><br><a href="${escapeHtml(resultPhoto)}" target="_blank" rel="noopener" style="color:#38bdf8;">開新視窗查看</a><img src="${escapeHtml(resultPhoto)}" alt="祈福成果" class="proof-img"></div>` : '<div><span class="muted">祈福成果</span><br>未上傳</div>'}
      `;
    }
    detailDialog.showModal();
  }
  if (detailClose){
    detailClose.addEventListener('click', ()=> detailDialog.close());
  }
  if (qnaClose && qnaDialog){
    qnaClose.addEventListener('click', ()=> qnaDialog.close());
  }
  if (qnaSend){
    qnaSend.addEventListener('click', async ()=>{
      if (!qnaOrderId) return;
      const text = (qnaInput && qnaInput.value || '').trim();
      if (!text){ alert('請先輸入回覆內容'); return; }
      qnaSend.disabled = true;
      qnaSend.textContent = '送出中…';
      try{
        await sendQna(text);
        if (qnaInput) qnaInput.value = '';
        await loadQna(qnaOrderId);
      }catch(err){
        alert('送出失敗：' + (err.message || err));
      }finally{
        qnaSend.disabled = false;
        qnaSend.textContent = '送出回覆';
      }
    });
  }
  if (qnaList){
    qnaList.addEventListener('click', async (e)=>{
      const editBtn = e.target.closest && e.target.closest('[data-qna-edit]');
      const delBtn = e.target.closest && e.target.closest('[data-qna-del]');
      if (!editBtn && !delBtn) return;
      const id = (editBtn || delBtn).getAttribute('data-id') || '';
      if (!id) return;
      if (editBtn){
        const msgId = editBtn.getAttribute('data-id') || '';
        const target = qnaItems.find(it => it && it.id === msgId);
        const currentText = target ? (target.text || '') : '';
        const next = prompt('修改留言', currentText);
        if (next == null) return;
        const text = String(next).trim();
        if (!text){ alert('內容不可空白'); return; }
        try{
          await editQna(id, text);
          await loadQna(qnaOrderId);
        }catch(err){
          alert('更新失敗：' + (err.message || err));
        }
        return;
      }
      if (delBtn){
        const ok = confirm('確定要刪除這則留言？');
        if (!ok) return;
        try{
          await deleteQna(id);
          await loadQna(qnaOrderId);
        }catch(err){
          alert('刪除失敗：' + (err.message || err));
        }
      }
    });
  }
  const resultInput = document.getElementById('resultPhotoInput');
  if (resultInput){
    resultInput.addEventListener('change', async ()=>{
      const id = resultInput.dataset.targetId;
      if (!id || !resultInput.files || !resultInput.files[0]) return;
      const file = resultInput.files[0];
      if (file.size > 20 * 1024 * 1024){
        alert('檔案過大（限 20MB）');
        resultInput.value = '';
        return;
      }
      try{
        const form = new FormData();
        form.append('files[]', file);
        const upload = await authedFetch('/api/upload', { method:'POST', body: form });
        const url = upload.files && upload.files[0] && upload.files[0].url;
        if (!url) throw new Error('上傳失敗');
        await authedFetch('/api/service/order/result-photo', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id, photo: url })
        });
        const target = orders.find(o=> o.id === id);
        if (target) target.resultPhotoUrl = url;
        render();
        alert('祈福成果已更新');
      }catch(err){
        alert('上傳失敗：' + err.message);
      }finally{
        resultInput.value = '';
      }
    });
  }
  filterInput.addEventListener('input', render);
  btnReload.addEventListener('click', loadOrders);
  if (btnExport){
    btnExport.addEventListener('click', ()=>{
      window.location.href = API_BASE + '/api/service/orders/export';
    });
  }
  if (statusTabs){
    statusTabs.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-status]');
      if (!btn) return;
      activeStatus = btn.getAttribute('data-status') || 'pending';
      syncStatusTabs();
      render();
    });
  }
  resolveAdminRole().then(()=>{
    applyFulfillmentUi();
    loadOrders();
  });
})();
