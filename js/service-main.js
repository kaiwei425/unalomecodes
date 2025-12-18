(() => {
  const listEl = document.getElementById('svcList');
  const emptyEl = document.getElementById('svcListEmpty');
  const lookupTriggers = Array.from(document.querySelectorAll('#svcLookupBtn, #linkServiceLookup'));
  const lookupDialog = document.getElementById('svcLookup');
  const lookupClose = document.getElementById('svcLookupClose');
  const lookupForm = document.getElementById('svcLookupForm');
  const lookupResultWrap = document.getElementById('svcLookupResult');
  const lookupCards = document.getElementById('svcLookupCards');
  const detailDialog = document.getElementById('svcDetail');
  const detailClose = document.getElementById('svcDetailClose');
  const detailTitle = document.getElementById('svcDetailTitle');
  const detailPriceEl = document.getElementById('svcDetailPrice');
  const detailDesc = document.getElementById('svcDetailDesc');
  const detailIncludes = document.getElementById('svcDetailIncludes');
  const detailGallery = document.getElementById('svcDetailGallery');
  const detailVariant = document.getElementById('svcDetailVariant');
  const detailAddBtn = document.getElementById('svcDetailAddCart');
  const detailHero = document.getElementById('svcDetailHero');
  const detailOptionsWrap = document.getElementById('svcDetailOptionsWrap');
  const checkoutDialog = document.getElementById('svcCart');
  const checkoutForm = document.getElementById('svcCartForm');
  const checkoutServiceName = document.getElementById('svcCartServiceName');
  const checkoutSummary = document.getElementById('svcCartSummary');
  const checkoutTotal = document.getElementById('svcCartTotal');
  const checkoutBackBtn = document.getElementById('svcCartBack');
  const checkoutSubmitBtn = document.getElementById('svcCartSubmit');
  const checkoutServiceIdInput = document.getElementById('svcCartServiceId');
  const successDialog = document.getElementById('svcSuccess');
  const successIdEl = document.getElementById('svcSuccessId');
  const successCloseBtn = document.getElementById('svcSuccessClose');
  const successLookupBtn = document.getElementById('svcSuccessLookup');
  const cartFab = document.getElementById('cartFab');
  const cartBadge = document.getElementById('cartBadge');
  const cartPanel = document.getElementById('svcCartPanel');
  const cartListEl = document.getElementById('svcCartList');
  const cartAmountEl = document.getElementById('svcCartAmount');
  const cartPanelClose = document.getElementById('svcCartPanelClose');
  const cartPanelBack = document.getElementById('svcCartPanelBack');
  const cartClearBtn = document.getElementById('svcCartClear');
  const cartCheckoutBtn = document.getElementById('svcCartCheckout');
  const CART_KEY = 'svcCartItems';
  let detailDataset = null;
  let lastDetailService = null;

  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
  }

  function formatTWD(num){
    const n = Number(num || 0);
    return 'NT$ ' + n.toLocaleString('zh-TW');
  }

  function loadCart(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(_){
      return [];
    }
  }

  function saveCart(list){
    try{
      localStorage.setItem(CART_KEY, JSON.stringify(list));
    }catch(_){}
    updateCartBadge(list);
  }

  function updateCartBadge(list){
    const cart = Array.isArray(list) ? list : loadCart();
    const count = cart.length;
    if (cartBadge) cartBadge.textContent = count;
    if (cartFab){
      if (count){
        cartFab.disabled = false;
        cartFab.style.opacity = '1';
        cartFab.style.cursor = 'pointer';
      }else{
        cartFab.disabled = false;
        cartFab.style.opacity = '.6';
        cartFab.style.cursor = 'pointer';
      }
    }
  }

  function cartTotal(list){
    return list.reduce((sum,item)=> sum + Number(item.basePrice||0) + Number(item.optionPrice||0), 0);
  }

  function renderCartPanel(){
    if (!cartListEl) return;
    const cart = loadCart();
    if (!cart.length){
      cartListEl.innerHTML = '<div style="color:#6b7280;">購物車尚無服務。</div>';
    }else{
      cartListEl.innerHTML = cart.map(item => `
        <div class="svc-cart-item">
          <div class="info">
            ${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : ''}
            <div>
              <div style="font-weight:700;font-size:14px;">${escapeHtml(item.serviceName||'服務')}</div>
              <div class="meta">${escapeHtml(item.optionName||'標準服務')}</div>
            </div>
          </div>
          <div class="price">${formatTWD(Number(item.basePrice||0)+Number(item.optionPrice||0))}</div>
          <button type="button" class="svc-cart-remove" data-remove="${escapeHtml(item.uid||'')}">移除</button>
        </div>
      `).join('');
    }
    if (cartAmountEl){
      cartAmountEl.textContent = formatTWD(cartTotal(cart));
    }
  }

  async function fetchServices(){
    try{
      const res = await fetch('/api/service/products', { cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || 'error');
      return Array.isArray(data.items) ? data.items : [];
    }catch(err){
      console.error('[service] fetch error', err);
      return [];
    }
  }

  function renderList(items){
    if (!listEl) return;
    const activeItems = items.filter(it => it && it.active !== false);
    listEl.innerHTML = '';
    if (!activeItems.length){
      const placeholder = document.createElement('div');
      placeholder.id = 'svcListEmpty';
      placeholder.className = 'empty';
      placeholder.textContent = '目前尚未上架服務，請稍後再試。';
      listEl.appendChild(placeholder);
      return;
    }
    activeItems.forEach(service => {
      const sid = resolveServiceId(service);
      if (!service.id && sid) service.id = sid;
      const cover = service.cover || (Array.isArray(service.gallery) && service.gallery[0]) || '';
      const sold = Number(service.sold || 0);
      const card = document.createElement('div');
      card.className = 'card service-card';
      card.innerHTML = `
        <div class="pic">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(service.name||'')}" loading="lazy">` : ''}</div>
        <div class="body">
          <div class="name">${escapeHtml(service.name||'服務')}</div>
          <div class="meta"><span class="badge">已售出：${sold}</span></div>
          <div class="price">${formatTWD(service.price)}</div>
          <div class="cta">
            <button class="btn primary" data-service="${escapeHtml(service.id||'')}">查看服務</button>
          </div>
        </div>
      `;
      const btn = card.querySelector('button[data-service]');
      if (btn){
        btn.addEventListener('click', () => openServiceDetail(service));
      }
      listEl.appendChild(card);
    });
  }

  function populateVariantSelect(service){
    if (!detailVariant) return;
    const options = Array.isArray(service.options) ? service.options.filter(opt => opt && opt.name) : [];
    if (!options.length){
      detailOptionsWrap.style.display = 'none';
      detailVariant.innerHTML = '';
      detailVariant.disabled = true;
      detailVariant.value = '';
      return;
    }
    detailOptionsWrap.style.display = '';
    detailVariant.disabled = false;
    detailVariant.innerHTML = options.map(opt => `<option value="${escapeHtml(opt.name)}" data-price="${Number(opt.price||0)}">${escapeHtml(opt.name)}${opt.price ? `（+${formatTWD(opt.price)}）` : ''}</option>`).join('');
    detailVariant.value = options[0].name;
  }

  function getVariantSelection(service){
    if (!detailVariant) return null;
    const options = Array.isArray(service.options) ? service.options.filter(opt => opt && opt.name) : [];
    if (!options.length) return null;
    const val = detailVariant.value;
    if (!val) return null;
    const match = options.find(opt => String(opt.name) === val);
    if (!match) return null;
    return { name: match.name, price: Number(match.price||0) };
  }

  function updateDetailPrice(){
    if (!detailDataset || !detailPriceEl) return;
    const base = Number(detailDataset.price || 0);
    const variant = getVariantSelection(detailDataset);
    const diff = variant ? Number(variant.price||0) : 0;
    detailPriceEl.textContent = (base + diff).toLocaleString('zh-TW');
  }

  function openServiceDetail(service){
    detailDataset = service;
    lastDetailService = service;
    if (detailTitle) detailTitle.textContent = service.name || '服務';
    if (detailDesc) detailDesc.textContent = service.description || service.desc || '';
    if (detailIncludes){
      const includes = Array.isArray(service.includes) ? service.includes : [];
      detailIncludes.innerHTML = includes.length ? includes.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '<li>老師依實際情況安排內容</li>';
    }
    const gallery = Array.isArray(service.gallery) && service.gallery.length ? service.gallery : (service.cover ? [service.cover] : []);
    if (detailHero){
      detailHero.src = gallery[0] || service.cover || '';
      detailHero.alt = service.name || '';
    }
    if (detailGallery){
      if (gallery.length){
        detailGallery.innerHTML = gallery.map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(service.name||'')}" loading="lazy">`).join('');
        Array.from(detailGallery.querySelectorAll('img')).forEach(img=>{
          img.addEventListener('click', ()=>{
            if (detailHero) detailHero.src = img.getAttribute('src') || '';
          });
        });
      }else{
        detailGallery.innerHTML = '<div class="muted">目前尚未提供示意圖</div>';
      }
    }
    populateVariantSelect(service);
    updateDetailPrice();
    detailDialog.showModal();
  }

  function ensureSingleService(cart, serviceId){
    if (!cart.length) return cart;
    if (cart[0].serviceId === serviceId) return cart;
    const ok = confirm('購物車內已有其他服務，加入新服務會清空原本的內容，是否繼續？');
    if (!ok) return null;
    return [];
  }

  function addCurrentSelection(){
    if (!detailDataset) return;
    let cart = loadCart();
    cart = ensureSingleService(cart, resolveServiceId(detailDataset));
    if (cart === null) return;
    const options = Array.isArray(detailDataset.options) ? detailDataset.options.filter(opt=>opt && opt.name) : [];
    const variant = options.length ? getVariantSelection(detailDataset) : null;
    if (options.length && !variant){
      alert('請先選擇服務項目');
      return;
    }
    const svcId = resolveServiceId(detailDataset);
    const item = {
      uid: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      serviceId: svcId,
      serviceName: detailDataset.name || '服務',
      basePrice: Number(detailDataset.price||0),
      optionName: variant ? variant.name : '',
      optionPrice: variant ? Number(variant.price||0) : 0,
      image: (Array.isArray(detailDataset.gallery) && detailDataset.gallery[0]) || detailDataset.cover || ''
    };
    cart.push(item);
    saveCart(cart);
    renderCartPanel();
    updateCartBadge(cart);
    detailDialog.close();
    renderCartPanel();
    if (cartPanel) cartPanel.showModal();
  }

  function renderCheckoutSummary(cart){
    if (!checkoutSummary || !checkoutTotal || !checkoutServiceName) return;
    checkoutServiceName.textContent = cart[0].serviceName || '服務';
    checkoutSummary.innerHTML = cart.map(item => `<li>${escapeHtml(item.optionName || '標準服務')}｜${formatTWD(Number(item.basePrice||0)+Number(item.optionPrice||0))}</li>`).join('');
    checkoutTotal.textContent = formatTWD(cartTotal(cart));
    checkoutForm.dataset.selectedOptions = JSON.stringify(cart.filter(it => it.optionName).map(it => ({ name: it.optionName, price: it.optionPrice })));
    checkoutForm.dataset.baseCount = cart.filter(it => !it.optionName).length || 0;
    const svcId = cart[0].serviceId || '';
    checkoutForm.dataset.serviceId = svcId;
    if (checkoutServiceIdInput) checkoutServiceIdInput.value = svcId;
  }

  function openCheckoutDialog(){
    const cart = loadCart();
    if (!cart.length){
      alert('購物車是空的');
      return;
    }
    if (!cart.every(it => it.serviceId === cart[0].serviceId)){
      alert('購物車內包含不同服務，請清空後重新選擇。');
      return;
    }
    renderCheckoutSummary(cart);
    checkoutDialog.showModal();
  }

  function getCheckoutOptions(){
    try{
      const raw = checkoutForm.dataset.selectedOptions || '[]';
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    }catch(_){
      return [];
    }
  }

  function getCheckoutBaseCount(){
    const val = Number(checkoutForm.dataset.baseCount || 0);
    return val > 0 ? val : 0;
  }

  async function submitServiceOrder(payload){
    const res = await fetch('/api/service/order', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || '提交失敗');
    }
    return data;
  }

  function initLookupDialog(){
    if (lookupTriggers.length && lookupDialog){
      lookupTriggers.forEach(btn=>{
        if (!btn) return;
        btn.addEventListener('click', ev=>{
          ev.preventDefault();
          lookupDialog.showModal();
        });
      });
    }
    if (lookupClose){
      lookupClose.addEventListener('click', ()=> lookupDialog.close());
    }
    if (lookupForm){
      lookupForm.addEventListener('submit', async ev=>{
        ev.preventDefault();
        const formData = new FormData(lookupForm);
        const phone = String(formData.get('phone')||'').trim();
        const orderDigits = String(formData.get('orderDigits')||'').trim();
        if (!phone || !orderDigits){
          alert('請輸入手機與訂單末五碼');
          return;
        }
        try{
          const usp = new URLSearchParams({ phone, order: orderDigits });
          const res = await fetch('/api/service/orders/lookup?'+usp.toString(), { cache:'no-store' });
          const data = await res.json().catch(()=>({}));
          if (!res.ok || !data || data.ok === false){
            throw new Error((data && data.error) || '查詢失敗');
          }
          renderLookupResult(Array.isArray(data.orders) ? data.orders : []);
        }catch(err){
          alert(err && err.message ? err.message : '查詢失敗，請稍後再試');
        }
      });
    }
  }

  function renderLookupResult(list){
    if (!lookupResultWrap || !lookupCards) return;
    lookupCards.innerHTML = '';
    if (!list.length){
      lookupCards.innerHTML = '<div style="color:#94a3b8;">查無資料，請確認輸入是否正確。</div>';
    }else{
      list.forEach(order=>{
        const selectionNames = Array.isArray(order.selectedOptions) && order.selectedOptions.length
          ? order.selectedOptions.map(opt => opt && opt.name ? opt.name : '').filter(Boolean)
          : (order.selectedOption && order.selectedOption.name ? [order.selectedOption.name] : []);
        const serviceLine = selectionNames.length
          ? `${escapeHtml(order.serviceName || '')}｜${escapeHtml(selectionNames.join('、'))}`
          : escapeHtml(order.serviceName || '');
        const card = document.createElement('div');
        card.className = 'lookup-card';
        card.innerHTML = `
          <div style="font-weight:700;">訂單編號：${escapeHtml(order.id || '')}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">狀態：${escapeHtml(order.status || '處理中')}</div>
          <div style="margin-top:8px;font-weight:600;">服務：${serviceLine}</div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">備註：${escapeHtml(order.note || '—')}</div>
        `;
        lookupCards.appendChild(card);
      });
    }
    lookupResultWrap.style.display = '';
  }

  if (detailClose){
    detailClose.addEventListener('click', ()=> detailDialog.close());
  }
  if (detailVariant){
    detailVariant.addEventListener('change', updateDetailPrice);
  }
  if (detailAddBtn){
    detailAddBtn.addEventListener('click', ()=> addCurrentSelection());
  }
  if (cartFab){
    cartFab.addEventListener('click', ()=>{
      renderCartPanel();
      if (cartPanel) cartPanel.showModal();
    });
  }
  if (cartPanelClose){
    cartPanelClose.addEventListener('click', ()=> cartPanel.close());
  }
  if (cartPanelBack){
    cartPanelBack.addEventListener('click', ()=>{
      if (cartPanel) cartPanel.close();
      if (lastDetailService){
        openServiceDetail(lastDetailService);
      }
    });
  }
  if (cartClearBtn){
    cartClearBtn.addEventListener('click', ()=>{
      if (!loadCart().length) return;
      if (confirm('確定清空購物車？')){
        saveCart([]);
        renderCartPanel();
      }
    });
  }
  if (cartCheckoutBtn){
    cartCheckoutBtn.addEventListener('click', ()=>{
      cartPanel.close();
      openCheckoutDialog();
    });
  }
  if (cartListEl){
    cartListEl.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-remove]');
      if (!btn) return;
      const uid = btn.getAttribute('data-remove');
      let cart = loadCart();
      cart = cart.filter(item => item.uid !== uid);
      saveCart(cart);
      renderCartPanel();
    });
  }
  if (checkoutBackBtn){
    checkoutBackBtn.addEventListener('click', ()=> checkoutDialog.close());
  }
  if (checkoutForm){
    checkoutForm.addEventListener('submit', async ev=>{
      ev.preventDefault();
      if (!checkoutSubmitBtn) return;
      const serviceId = checkoutServiceIdInput ? checkoutServiceIdInput.value : '';
      if (!serviceId){
        alert('缺少服務資訊，請重新選擇。');
        return;
      }
      const cart = loadCart();
      if (!cart.length){
        alert('購物車為空，請重新選擇服務。');
        return;
      }
      checkoutSubmitBtn.disabled = true;
      checkoutSubmitBtn.textContent = '送出中…';
      try{
        const formData = new FormData(checkoutForm);
        const payload = {
          serviceId: serviceId || checkoutForm.dataset.serviceId || '',
          name: formData.get('name')||'',
          phone: formData.get('phone')||'',
          email: formData.get('email')||'',
          birth: formData.get('birth')||'',
          requestDate: formData.get('requestDate')||'',
          note: formData.get('note')||'',
          optionNames: getCheckoutOptions().map(opt => opt.name),
          baseCount: getCheckoutBaseCount()
        };
        const result = await submitServiceOrder(payload);
        checkoutDialog.close();
        checkoutForm.reset();
        saveCart([]);
        renderCartPanel();
        updateCartBadge([]);
        if (successIdEl) successIdEl.textContent = result.orderId || result.id || '';
        successDialog.showModal();
      }catch(err){
        alert(err && err.message ? err.message : '送出失敗，請稍後再試');
      }finally{
        checkoutSubmitBtn.disabled = false;
        checkoutSubmitBtn.textContent = '送出祈福訂單';
      }
    });
  }
  if (successCloseBtn){
    successCloseBtn.addEventListener('click', ()=> successDialog.close());
  }
  if (successLookupBtn){
    successLookupBtn.addEventListener('click', ()=>{
      successDialog.close();
      if (lookupDialog) lookupDialog.showModal();
    });
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const services = await fetchServices();
    renderList(services);
    if (emptyEl) emptyEl.remove();
    initLookupDialog();
    updateCartBadge();
    renderCartPanel();
  });
})();
  function resolveServiceId(service){
    if (!service) return '';
    return service.id || service._id || service.key || service._key || '';
  }
