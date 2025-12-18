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
  const detailIG = document.getElementById('svcDetailInstagram');
  const detailGallery = document.getElementById('svcDetailGallery');
  const detailVariant = document.getElementById('svcDetailVariant');
  const detailAddBtn = document.getElementById('svcDetailAddCart');
  const detailHero = document.getElementById('svcDetailHero');
  const detailOptionsWrap = document.getElementById('svcDetailOptionsWrap');
  const reviewListEl = document.getElementById('svcRvList');
  const reviewNickInput = document.getElementById('svcRvNick');
  const reviewTextInput = document.getElementById('svcRvText');
  const reviewFileInput = document.getElementById('svcRvFile');
  const reviewSubmitBtn = document.getElementById('svcRvSubmit');
  const checkoutDialog = document.getElementById('svcCart');
  const checkoutForm = document.getElementById('svcCartForm');
  const checkoutServiceName = document.getElementById('svcCartServiceName');
  const checkoutSummary = document.getElementById('svcCartSummary');
  const checkoutTotal = document.getElementById('svcCartTotal');
  const checkoutBackBtn = document.getElementById('svcCartBack');
  const checkoutNextBtn = document.getElementById('svcCartNext');
  const checkoutSubmitBtn = document.getElementById('svcBankSubmit');
  const checkoutServiceIdInput = document.getElementById('svcCartServiceId');
  const checkoutStepSections = {
    1: document.getElementById('svcCartStep1'),
    2: document.getElementById('svcCartStep2'),
    3: document.getElementById('svcCartStep3')
  };
  const checkoutStepper = Array.from(document.querySelectorAll('#svcCart .svc-stepper span'));
  const bankNameEl = document.getElementById('svcBankName');
  const bankAccountEl = document.getElementById('svcBankAccount');
  const bankCopyBtn = document.getElementById('svcBankCopy');
  const bankAmountInput = document.getElementById('svcBankAmount');
  const bankLast5Input = document.getElementById('svcBankLast5');
  const bankReceiptInput = document.getElementById('svcBankReceipt');
  const bankReceiptName = document.getElementById('svcBankReceiptName');
  const bankMemoInput = document.getElementById('svcBankMemo');
  const requestDateInput = checkoutForm ? checkoutForm.querySelector('input[name="requestDate"]') : null;
  const contactPhotoInput = document.getElementById('svcContactPhoto');
  const contactPhotoName = document.getElementById('svcContactPhotoName');
  const bankBackBtn = document.getElementById('svcBankBack');
  const checkoutStep3OrderId = document.getElementById('svcStep3OrderId');
  const checkoutStep3Service = document.getElementById('svcStep3Service');
  const checkoutStep3Amount = document.getElementById('svcStep3Amount');
  const checkoutStep3Last5 = document.getElementById('svcStep3Last5');
  const checkoutStep3Buyer = document.getElementById('svcStep3Buyer');
  const checkoutStep3Lookup = document.getElementById('svcStep3Lookup');
  const checkoutStep3Close = document.getElementById('svcStep3Close');
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
  const privacyLink = document.getElementById('privacyLink');
  const privacyDialog = document.getElementById('privacyDialog');
  const privacyClose = document.getElementById('privacyClose');
  const CART_KEY = 'svcCartItems';
  let detailDataset = null;
  let lastDetailService = null;
  let checkoutStep = 1;
  let checkoutContact = null;
  let checkoutReceipt = { url:'', name:'' };
  let checkoutRitualPhoto = { url:'', name:'' };
  let lastCartSnapshot = [];
  let lastOrderResult = null;
  let lastRemitLast5 = '';
  const RECEIPT_MAX_SIZE = 20 * 1024 * 1024;
  const BANK_INFO = {
    name: checkoutDialog ? (checkoutDialog.getAttribute('data-bank-name') || checkoutDialog.dataset.bankName || '中國信託 (822)') : '中國信託 (822)',
    account: checkoutDialog ? (checkoutDialog.getAttribute('data-bank-account') || checkoutDialog.dataset.bankAccount || '148540417073') : '148540417073'
  };
  const STATUS_LABELS = {
    '祈福進行中': '已確認付款，祈福進行中'
  };
  const supportsDialog = typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function';
  function openDialog(el){
    if (!el) return;
    if (supportsDialog && typeof el.showModal === 'function'){
      el.showModal();
    }else{
      el.setAttribute('open','open');
      el.dataset.fallbackOpen = '1';
    }
  }
  function closeDialog(el){
    if (!el) return;
    if (supportsDialog && typeof el.close === 'function'){
      try{
        el.close();
      }catch(_){
        el.removeAttribute('open');
      }
    }else{
      el.removeAttribute('open');
      delete el.dataset.fallbackOpen;
    }
  }
  let currentReviewCode = '';
  async function loadServiceReviews(code){
    if (!reviewListEl) return;
    if (!code){
      reviewListEl.innerHTML = '<div style="color:#94a3b8;">尚未提供評價。</div>';
      return;
    }
    reviewListEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:10px;">讀取中...</div>';
    try{
      const cacheBust = Date.now();
      const res = await fetch(`/api/stories?code=${encodeURIComponent(code)}&_=${cacheBust}`);
      const data = await res.json();
      if (!res.ok || !data || data.ok === false){
        throw new Error((data && data.error) || '無法讀取留言');
      }
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length){
        reviewListEl.innerHTML = '<div style="color:#94a3b8;">還沒有任何分享，歡迎成為第一位分享者！</div>';
        return;
      }
      reviewListEl.innerHTML = items.map(item=>{
        const date = new Date(item.ts).toLocaleString('zh-TW', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
        const img = item.imageUrl ? `<a href="${escapeHtml(item.imageUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(item.imageUrl)}" alt="" class="rvImage"></a>` : '';
        return `
          <div class="rvItem">
            ${img}
            <div class="rvContent">
              <div class="rvHead">
                <strong class="rvNick">${escapeHtml(item.nick)}</strong>
                <span class="rvDate">${escapeHtml(date)}</span>
              </div>
              <div class="rvMsg">${escapeHtml(item.msg)}</div>
            </div>
          </div>
        `;
      }).join('');
    }catch(err){
      reviewListEl.innerHTML = `<div style="color:#ef4444;padding:10px;">${escapeHtml(err.message || '讀取失敗')}</div>`;
    }
  }
  function resolveResultPhoto(order){
    if (!order) return '';
    if (order.resultPhotoUrl) return order.resultPhotoUrl;
    const list = Array.isArray(order.results) ? order.results : [];
    for (const item of list){
      if (!item) continue;
      if (item.url) return item.url;
      if (item.imageUrl) return item.imageUrl;
      if (item.image) return item.image;
    }
    return '';
  }

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

  function setRequestDateMin(){
    if (!requestDateInput) return;
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    requestDateInput.min = iso;
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

  function setCheckoutStep(step){
    checkoutStep = step;
    Object.entries(checkoutStepSections).forEach(([idx, section])=>{
      if (!section) return;
      section.classList.toggle('active', Number(idx) === step);
    });
    checkoutStepper.forEach(span=>{
      const spanStep = Number(span.getAttribute('data-step') || span.textContent || 0);
      span.classList.toggle('active', spanStep === step);
      span.classList.toggle('done', spanStep < step);
    });
  }

  function resetCheckoutFlow(){
    checkoutContact = null;
    checkoutReceipt = { url:'', name:'' };
    checkoutRitualPhoto = { url:'', name:'' };
    lastOrderResult = null;
    lastRemitLast5 = '';
    if (bankReceiptInput) bankReceiptInput.value = '';
    if (bankReceiptName) bankReceiptName.textContent = '';
    if (bankLast5Input) bankLast5Input.value = '';
    if (bankMemoInput) bankMemoInput.value = '';
    if (contactPhotoInput) contactPhotoInput.value = '';
    if (contactPhotoName) contactPhotoName.textContent = '';
    if (checkoutForm){
      checkoutForm.reset();
    }
    setCheckoutStep(1);
    setRequestDateMin();
  }

  function collectStepOneData(){
    if (!checkoutForm) return null;
    const fd = new FormData(checkoutForm);
    const name = String(fd.get('name')||'').trim();
    const phoneRaw = String(fd.get('phone')||'').trim();
    const email = String(fd.get('email')||'').trim();
    const birth = String(fd.get('birth')||'').trim();
    const requestDate = String(fd.get('requestDate')||'').trim();
    const note = String(fd.get('note')||'').trim();
    if (!name){
      alert('請輸入聯絡人姓名');
      return null;
    }
    const phoneDigits = phoneRaw.replace(/\D+/g,'');
    if (!/^09\d{8}$/.test(phoneDigits)){
      alert('請輸入有效的手機號碼（09 開頭，共 10 碼）');
      return null;
    }
    if (!email){
      alert('請輸入 Email');
      return null;
    }
    if (!birth){
      alert('請填寫生日');
      return null;
    }
    return { name, phone: phoneDigits, email, birth, requestDate, note };
  }

  async function ensureReceiptUploaded(){
    const file = bankReceiptInput && bankReceiptInput.files && bankReceiptInput.files[0];
    if (!file){
      if (checkoutReceipt.url) return checkoutReceipt.url;
      throw new Error('請上傳匯款憑證');
    }
    if (file.size > RECEIPT_MAX_SIZE){
      throw new Error('匯款憑證檔案過大（上限 20MB）');
    }
    if (checkoutReceipt.url && checkoutReceipt.name === file.name){
      return checkoutReceipt.url;
    }
    const form = new FormData();
    form.append('files[]', file);
    const res = await fetch('/api/upload', { method:'POST', body: form });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false || !Array.isArray(data.files) || !data.files.length){
      throw new Error((data && data.error) || '匯款憑證上傳失敗');
    }
    checkoutReceipt = { url: data.files[0].url, name: file.name };
    return checkoutReceipt.url;
  }

  async function ensureRitualPhotoUploaded(){
    if (!contactPhotoInput) return checkoutRitualPhoto.url || '';
    const file = contactPhotoInput.files && contactPhotoInput.files[0];
    if (!file){
      return checkoutRitualPhoto.url || '';
    }
    if (file.size > RECEIPT_MAX_SIZE){
      throw new Error('祈福照片檔案過大（上限 20MB）');
    }
    if (checkoutRitualPhoto.url && checkoutRitualPhoto.name === file.name){
      return checkoutRitualPhoto.url;
    }
    const form = new FormData();
    form.append('files[]', file);
    const res = await fetch('/api/upload', { method:'POST', body: form });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false || !Array.isArray(data.files) || !data.files.length){
      throw new Error((data && data.error) || '祈福照片上傳失敗');
    }
    checkoutRitualPhoto = { url: data.files[0].url, name: file.name };
    if (contactPhotoName) contactPhotoName.textContent = file.name;
    return checkoutRitualPhoto.url;
  }

  function renderCheckoutSuccess(orderId, total){
    setCheckoutStep(3);
    if (checkoutStep3OrderId) checkoutStep3OrderId.textContent = orderId || '—';
    const summary = lastCartSnapshot.map(item=>{
      const opt = item.optionName ? `｜${item.optionName}` : '';
      return `${item.serviceName || '服務'}${opt}`;
    }).join('、');
    if (checkoutStep3Service) checkoutStep3Service.textContent = summary || (checkoutServiceName ? checkoutServiceName.textContent : '服務');
    if (checkoutStep3Amount) checkoutStep3Amount.textContent = formatTWD(total);
    if (checkoutStep3Last5) checkoutStep3Last5.textContent = lastRemitLast5 || '—';
    if (checkoutStep3Buyer && checkoutContact){
      checkoutStep3Buyer.textContent = `${checkoutContact.name}（${checkoutContact.phone}）`;
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
    currentReviewCode = (service.reviewCode || service.deityCode || service.deity || service.code || resolveServiceId(service) || '').toString().trim().toUpperCase();
    loadServiceReviews(currentReviewCode);
    const igUrl = service.instagram || service.ig || service.igUrl || '';
    if (detailIG){
      if (igUrl){
        detailIG.innerHTML = buildInstagramEmbed(igUrl);
        detailIG.style.display = '';
      }else{
        detailIG.innerHTML = '';
        detailIG.style.display = 'none';
      }
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
    openDialog(detailDialog);
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
    closeDialog(detailDialog);
    renderCartPanel();
    if (cartPanel) openDialog(cartPanel);
  }

  function renderCheckoutSummary(cart){
    if (!Array.isArray(cart) || !cart.length) return;
    const svcId = cart[0].serviceId || '';
    lastCartSnapshot = cart.map(item => Object.assign({}, item));
    const selectedOpts = cart.filter(it => it.optionName).map(it => ({ name: it.optionName, price: it.optionPrice }));
    const baseCount = cart.filter(it => !it.optionName).length || 0;
    if (checkoutForm){
      checkoutForm.dataset.selectedOptions = JSON.stringify(selectedOpts);
      checkoutForm.dataset.baseCount = String(baseCount);
      checkoutForm.dataset.serviceId = svcId;
    }
    if (checkoutServiceIdInput) checkoutServiceIdInput.value = svcId;
    if (checkoutServiceName) checkoutServiceName.textContent = cart[0].serviceName || '服務';
    if (checkoutSummary){
      checkoutSummary.innerHTML = cart.map(item => `<li>${escapeHtml(item.optionName || '標準服務')}｜${formatTWD(Number(item.basePrice||0)+Number(item.optionPrice||0))}</li>`).join('');
    }
    const total = cartTotal(cart);
    if (checkoutTotal) checkoutTotal.textContent = formatTWD(total);
    if (bankAmountInput){
      bankAmountInput.value = 'NT$ ' + Number(total||0).toLocaleString('zh-TW');
      bankAmountInput.dataset.amount = String(total||0);
    }
    if (bankNameEl) bankNameEl.textContent = BANK_INFO.name;
    if (bankAccountEl) bankAccountEl.textContent = BANK_INFO.account;
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
    resetCheckoutFlow();
    renderCheckoutSummary(cart);
    openDialog(checkoutDialog);
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
          openDialog(lookupDialog);
        });
      });
    }
    if (lookupClose){
      lookupClose.addEventListener('click', ()=> closeDialog(lookupDialog));
    }
    if (lookupForm){
      lookupForm.addEventListener('submit', async ev=>{
        ev.preventDefault();
        const formData = new FormData(lookupForm);
        const phone = String(formData.get('phone')||'').trim();
        const orderDigits = String(formData.get('orderDigits')||'').trim();
        const bankDigits = String(formData.get('bankDigits')||'').trim();
        if (!phone){
          alert('請輸入手機號碼');
          return;
        }
        if (!orderDigits && !bankDigits){
          alert('請輸入訂單末五碼或匯款帳號末五碼');
          return;
        }
        try{
          const usp = new URLSearchParams({ phone });
          if (orderDigits) usp.append('order', orderDigits);
          if (bankDigits) usp.append('bank', bankDigits);
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
        const buyer = order && order.buyer ? order.buyer : {};
        const resultUrl = resolveResultPhoto(order);
        const card = document.createElement('div');
        card.className = 'lookup-card';
        card.innerHTML = `
          <div style="font-weight:700;">訂單編號：${escapeHtml(order.id || '')}</div>
          <div style="margin-top:6px;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;font-size:13px;font-weight:700;color:#0f172a;background:#dbeafe;">
            <span style="width:8px;height:8px;border-radius:999px;background:#2563eb;display:inline-block;"></span>
            ${escapeHtml(STATUS_LABELS[order.status] || order.status || '處理中')}
          </div>
          <div style="margin-top:8px;font-weight:600;">服務：${serviceLine}</div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">聯絡人：${escapeHtml(buyer.name || '—')}（${escapeHtml(buyer.phone || '')}）</div>
          <div style="font-size:13px;color:#475569;">Email：${escapeHtml(buyer.email || '—')}</div>
          <div style="font-size:13px;color:#475569;">生日：${escapeHtml(buyer.birth || '—')}｜指定日期：${escapeHtml(order.requestDate || '—')}</div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">備註：${escapeHtml(order.note || '—')}</div>
          ${resultUrl ? `<div style="margin-top:12px;"><button type="button" class="btn primary" data-result-url="${escapeHtml(resultUrl)}">查看祈福成果照片</button></div>` : ''}
          <div style="margin-top:14px;border:1px dashed #cbd5f5;border-radius:12px;padding:12px;background:#f8fbff;">
            <div style="font-size:13px;color:#1e40af;line-height:1.6;">祈福影片檔案較大無法直接上傳，請點下方加入官方 LINE 並輸入訂單資訊（訂單編號、手機或姓名即可），我們將把完整影片傳送給您。</div>
            <div style="margin-top:10px;">
              <a href="https://line.me/R/ti/p/@427oaemj" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:linear-gradient(90deg,#16a34a,#22c55e);color:#fff;text-decoration:none;font-weight:700;box-shadow:0 6px 14px rgba(34,197,94,.35);">
                <span style="font-size:16px;">💬</span>
                官方LINE客服
              </a>
            </div>
          </div>
        `;
        lookupCards.appendChild(card);
      });
    }
    lookupResultWrap.style.display = '';
  }

  if (detailClose){
    detailClose.addEventListener('click', ()=> closeDialog(detailDialog));
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
      if (cartPanel) openDialog(cartPanel);
    });
  }
  if (cartPanelClose){
    cartPanelClose.addEventListener('click', ()=> closeDialog(cartPanel));
  }
  if (cartPanelBack){
    cartPanelBack.addEventListener('click', ()=>{
      closeDialog(cartPanel);
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
      closeDialog(cartPanel);
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
  if (checkoutDialog){
    checkoutDialog.addEventListener('close', ()=>{
      resetCheckoutFlow();
    });
  }

  setRequestDateMin();
  if (checkoutBackBtn){
    checkoutBackBtn.addEventListener('click', ()=>{
      closeDialog(checkoutDialog);
      renderCartPanel();
      if (cartPanel) openDialog(cartPanel);
    });
  }
  if (checkoutNextBtn){
    checkoutNextBtn.addEventListener('click', async ()=>{
      const data = collectStepOneData();
      if (!data) return;
      checkoutContact = data;
      try{
        await ensureRitualPhotoUploaded();
      }catch(err){
        alert(err && err.message ? err.message : '上傳祈福照片失敗');
        return;
      }
      setCheckoutStep(2);
    });
  }
  if (bankBackBtn){
    bankBackBtn.addEventListener('click', ()=>{
      setCheckoutStep(1);
    });
  }
  if (bankCopyBtn){
    bankCopyBtn.addEventListener('click', ()=>{
      const digits = String(BANK_INFO.account||'').replace(/\D+/g,'');
      const text = digits || String(BANK_INFO.account||'');
      try{
        navigator.clipboard.writeText(text);
        alert('已複製匯款帳號');
      }catch(_){
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        alert('已複製匯款帳號');
      }
    });
  }
  if (bankReceiptInput){
    bankReceiptInput.addEventListener('change', ()=>{
      checkoutReceipt = { url:'', name:'' };
      if (bankReceiptInput.files && bankReceiptInput.files[0]){
        const file = bankReceiptInput.files[0];
        if (file.size > RECEIPT_MAX_SIZE){
          alert('匯款憑證檔案過大（上限 20MB）');
          bankReceiptInput.value = '';
          if (bankReceiptName) bankReceiptName.textContent = '';
          return;
        }
        if (bankReceiptName) bankReceiptName.textContent = file.name;
      }else if (bankReceiptName){
        bankReceiptName.textContent = '';
      }
    });
  }
  if (contactPhotoInput){
    contactPhotoInput.addEventListener('change', ()=>{
      checkoutRitualPhoto = { url:'', name:'' };
      if (contactPhotoInput.files && contactPhotoInput.files[0]){
        const file = contactPhotoInput.files[0];
        if (file.size > RECEIPT_MAX_SIZE){
          alert('檔案過大（上限 20MB）');
          contactPhotoInput.value = '';
          if (contactPhotoName) contactPhotoName.textContent = '';
          return;
        }
        if (contactPhotoName) contactPhotoName.textContent = file.name;
      }else if (contactPhotoName){
        contactPhotoName.textContent = '';
      }
    });
  }
  if (checkoutForm){
    checkoutForm.addEventListener('submit', async ev=>{
      ev.preventDefault();
      if (checkoutStep !== 2 || !checkoutSubmitBtn) return;
      const serviceIdFromInput = checkoutServiceIdInput ? checkoutServiceIdInput.value : '';
      const serviceId = serviceIdFromInput || (checkoutForm && checkoutForm.dataset ? checkoutForm.dataset.serviceId : '') || '';
      if (!serviceId){
        alert('缺少服務資訊，請重新選擇。');
        return;
      }
      if (!checkoutContact){
        alert('請先填寫基本資料');
        setCheckoutStep(1);
        return;
      }
      const last5 = bankLast5Input ? bankLast5Input.value.trim() : '';
      if (!/^\d{5}$/.test(last5)){
        alert('請輸入 5 位數的匯款末五碼');
        if (bankLast5Input) bankLast5Input.focus();
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
        const receiptUrl = await ensureReceiptUploaded();
        const totalAmount = Number(bankAmountInput && bankAmountInput.dataset ? bankAmountInput.dataset.amount : cartTotal(cart));
        lastRemitLast5 = last5;
        const payload = {
          serviceId,
          name: checkoutContact.name,
          phone: checkoutContact.phone,
          email: checkoutContact.email,
          birth: checkoutContact.birth,
          requestDate: checkoutContact.requestDate,
          note: checkoutContact.note,
          optionNames: getCheckoutOptions().map(opt => opt.name),
          baseCount: getCheckoutBaseCount(),
          transferAmount: totalAmount,
          transferLast5: last5,
          transferMemo: bankMemoInput ? bankMemoInput.value.trim() : '',
          transferReceiptUrl: receiptUrl,
          transferBank: BANK_INFO.name,
          transferAccount: BANK_INFO.account,
          ritualPhotoUrl: checkoutRitualPhoto.url || ''
        };
        const result = await submitServiceOrder(payload);
        lastOrderResult = result;
        saveCart([]);
        renderCartPanel();
        updateCartBadge([]);
        renderCheckoutSuccess(result.orderId || result.id || '', totalAmount);
        if (bankReceiptInput) bankReceiptInput.value = '';
        if (bankReceiptName) bankReceiptName.textContent = '';
      }catch(err){
        alert(err && err.message ? err.message : '送出失敗，請稍後再試');
      }finally{
        checkoutSubmitBtn.disabled = false;
        checkoutSubmitBtn.textContent = '送出匯款資料';
      }
    });
  }
  if (checkoutStep3Lookup){
    checkoutStep3Lookup.addEventListener('click', ()=>{
      if (lookupDialog){
        if (lookupForm){
          const phoneInput = lookupForm.querySelector('input[name="phone"]');
          const orderInput = lookupForm.querySelector('input[name="orderDigits"]');
          if (phoneInput && checkoutContact) phoneInput.value = checkoutContact.phone || '';
          const orderId = (lastOrderResult && (lastOrderResult.orderId || lastOrderResult.id)) || (checkoutStep3OrderId ? checkoutStep3OrderId.textContent : '');
          if (orderInput && orderId){
            const digits = String(orderId).replace(/\D+/g,'').slice(-5);
            orderInput.value = digits;
          }
        }
        closeDialog(checkoutDialog);
        openDialog(lookupDialog);
      }
    });
  }
  if (checkoutStep3Close){
    checkoutStep3Close.addEventListener('click', ()=>{
      closeDialog(checkoutDialog);
    });
  }
  if (successCloseBtn){
    successCloseBtn.addEventListener('click', ()=> closeDialog(successDialog));
  }
  if (successLookupBtn){
    successLookupBtn.addEventListener('click', ()=>{
      closeDialog(successDialog);
      if (lookupDialog) openDialog(lookupDialog);
    });
  }

  if (checkoutDialog){
    setCheckoutStep(1);
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const services = await fetchServices();
    renderList(services);
    if (emptyEl) emptyEl.remove();
    initLookupDialog();
    updateCartBadge();
    renderCartPanel();
  });
  function resolveServiceId(service){
    if (!service) return '';
    return service.id || service._id || service.key || service._key || '';
  }
  if (lookupCards){
    lookupCards.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-result-url]');
      if (!btn) return;
      const url = btn.getAttribute('data-result-url');
      if (!url) return;
      window.open(url, '_blank', 'noopener');
    });
  }
  if (reviewSubmitBtn){
    reviewSubmitBtn.addEventListener('click', async ()=>{
      if (!currentReviewCode){
        alert('尚未選擇服務');
        return;
      }
      const nick = reviewNickInput ? reviewNickInput.value.trim() : '';
      const msg = reviewTextInput ? reviewTextInput.value.trim() : '';
      if (!nick){
        alert('請輸入您的名字或暱稱');
        if (reviewNickInput) reviewNickInput.focus();
        return;
      }
      if (!msg){
        alert('請分享您的體驗內容');
        if (reviewTextInput) reviewTextInput.focus();
        return;
      }
      reviewSubmitBtn.disabled = true;
      reviewSubmitBtn.textContent = '送出中...';
      try{
        let imageUrl = '';
        if (reviewFileInput && reviewFileInput.files && reviewFileInput.files[0]){
          const file = reviewFileInput.files[0];
          const formData = new FormData();
          formData.append('files[]', file);
          const uploadRes = await fetch('/api/upload', { method:'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData || uploadData.ok === false || !uploadData.files || !uploadData.files.length){
            throw new Error((uploadData && uploadData.error) || '圖片上傳失敗');
          }
          imageUrl = uploadData.files[0].url;
        }
        const payload = { code: currentReviewCode, nick, msg, imageUrl };
        const res = await fetch('/api/stories', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data || data.ok === false){
          throw new Error((data && data.error) || '送出分享失敗');
        }
        alert('感謝您的分享！');
        if (reviewNickInput) reviewNickInput.value = '';
        if (reviewTextInput) reviewTextInput.value = '';
        if (reviewFileInput) reviewFileInput.value = '';
        loadServiceReviews(currentReviewCode);
      }catch(err){
        alert(err && err.message ? err.message : '送出分享失敗');
      }finally{
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.textContent = '送出分享';
      }
    });
  }
  if (privacyLink && privacyDialog){
    privacyLink.addEventListener('click', e=>{
      e.preventDefault();
      openDialog(privacyDialog);
    });
  }
  if (privacyClose && privacyDialog){
    privacyClose.addEventListener('click', ()=> closeDialog(privacyDialog));
  }
  function buildInstagramEmbed(url){
    if (!url) return '';
    let src = url.trim();
    if (src.indexOf('http') !== 0){
      src = 'https://' + src.replace(/^\/+/, '');
    }
    src = src.replace(/[\?#].*$/, '');
    const match = src.match(/(https?:\/\/[^/]*instagram\.com\/(?:p|reel|tv)\/[^/?#]+)/i);
    if (match){
      src = match[1].replace(/\/$/, '') + '/embed';
    }else if (!/\/embed$/.test(src)){
      src = src.replace(/\/$/, '') + '/embed';
    }
    return `<iframe src="${escapeHtml(src)}" allowtransparency="true" allowfullscreen="true" frameborder="0"></iframe>`;
  }
})();
