(() => {
  const listEl = document.getElementById('svcList');
  const emptyEl = document.getElementById('svcListEmpty');
  const hotSection = document.getElementById('svcHotSection');
  const hotListEl = document.getElementById('svcHotList');
  let hotToggle = null;
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
  const detailQtyWrap = document.getElementById('svcDetailQtyWrap');
  const detailQtyInput = document.getElementById('svcDetailQty');
  const detailQtyLabel = document.getElementById('svcDetailQtyLabel');
  const detailFeeHint = document.getElementById('svcDetailFeeHint');
  const detailPriceHint = document.getElementById('svcDetailPriceHint');
  const detailLimited = document.getElementById('svcDetailLimited');
  const detailRemaining = document.getElementById('svcDetailRemaining');
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
  const memberPerkHintEl = document.getElementById('svcMemberPerkHint');
  const requestDateInput = checkoutForm ? checkoutForm.querySelector('input[name="requestDate"]') : null;
  const contactNameInput = checkoutForm ? checkoutForm.querySelector('input[name="name"]') : null;
  const contactNameEnInput = checkoutForm ? checkoutForm.querySelector('input[name="nameEn"]') : null;
  const contactPhoneInput = checkoutForm ? checkoutForm.querySelector('input[name="phone"]') : null;
  const contactEmailInput = checkoutForm ? checkoutForm.querySelector('input[name="email"]') : null;
  const contactBirthInput = checkoutForm ? checkoutForm.querySelector('input[name="birth"]') : null;
  const contactNoteInput = checkoutForm ? checkoutForm.querySelector('textarea[name="note"]') : null;
  const contactPhotoInput = document.getElementById('svcContactPhoto');
  const contactPhotoName = document.getElementById('svcContactPhotoName');
  const contactPhotoWrap = document.getElementById('svcContactPhotoWrap');
  const contactPhotoTitle = document.getElementById('svcContactPhotoTitle');
  const contactPhotoHint = document.getElementById('svcContactPhotoHint');
  const contactPhotoSkipHint = document.getElementById('svcContactPhotoSkipHint');
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
  let lastProfile = null;
  let lastCartSnapshot = [];
  let lastOrderResult = null;
  let lastRemitLast5 = '';
  let limitedTimer = null;
  let serviceItems = [];
  let hotOnly = false;
  const RECEIPT_MAX_SIZE = 20 * 1024 * 1024;
  const BANK_INFO = {
    name: checkoutDialog ? (checkoutDialog.getAttribute('data-bank-name') || checkoutDialog.dataset.bankName || '中國信託 (822)') : '中國信託 (822)',
    account: checkoutDialog ? (checkoutDialog.getAttribute('data-bank-account') || checkoutDialog.dataset.bankAccount || '148540417073') : '148540417073'
  };
  const STATUS_LABELS = {
    '祈福進行中': '已確認付款，祈福進行中'
  };
  const supportsDialog = typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function';
  const fallbackBackdrops = new Map();
  function getFallbackBackdrop(el){
    if (!document.body) return null;
    let node = fallbackBackdrops.get(el);
    if (!node){
      node = document.createElement('div');
      node.className = 'dialog-fallback-backdrop';
      node.addEventListener('click', ()=> closeDialog(el));
      document.body.appendChild(node);
      fallbackBackdrops.set(el, node);
    }
    return node;
  }
  function openDialog(el){
    if (!el) return;
    if (supportsDialog && typeof el.showModal === 'function'){
      el.showModal();
    }else{
      el.setAttribute('open','');
      el.dataset.fallbackOpen = '1';
      const backdrop = getFallbackBackdrop(el);
      if (backdrop){
        requestAnimationFrame(()=> backdrop.classList.add('active'));
      }
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
      const backdrop = fallbackBackdrops.get(el);
      if (backdrop){
        backdrop.classList.remove('active');
      }
    }
  }
  let currentReviewCode = '';
  let currentReviewName = '';
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
        const imgUrl = sanitizeImageUrl(item.imageUrl);
        const img = imgUrl ? `<a href="${escapeHtml(imgUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(imgUrl)}" alt="" class="rvImage"></a>` : '';
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
  function normalizeResultUrl(raw){
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^https?:\/\//i.test(val) || val.startsWith('data:')) return val;
    if (val.startsWith('/api/')) return val;
    return '/api/proof/' + encodeURIComponent(val);
  }
  function resolveResultPhoto(order){
    if (!order) return '';
    const direct = order.resultPhotoUrl || order.resultPhoto || order.result_photo_url || order.resultPhotoURL || '';
    const directUrl = normalizeResultUrl(direct);
    if (directUrl) return directUrl;
    const list = Array.isArray(order.results) ? order.results : [];
    for (const item of list){
      if (!item) continue;
      const candidate = item.url || item.imageUrl || item.image || '';
      const candidateUrl = normalizeResultUrl(candidate);
      if (candidateUrl) return candidateUrl;
    }
    return '';
  }

  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
  }
  function sanitizeImageUrl(raw){
    if (typeof window.sanitizeImageUrl === 'function') return window.sanitizeImageUrl(raw);
    try{
      const val = String(raw || '').trim();
      if (!val) return '';
      if (/^data:image\//i.test(val)) return val;
      const u = new URL(val, window.location.origin);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    }catch(_){}
    return '';
  }
  function parseLimitedUntil(raw){
    try{
      const val = String(raw || '').trim();
      if (!val) return null;
      const ts = Date.parse(val);
      return Number.isFinite(ts) ? ts : null;
    }catch(_){
      return null;
    }
  }
  function isLimitedExpired(raw){
    const ts = parseLimitedUntil(raw);
    if (!ts) return false;
    return Date.now() >= ts;
  }
  function formatRemainingTime(ms){
    if (!Number.isFinite(ms)) return '';
    if (ms <= 0) return '已結束';
    const totalMinutes = Math.ceil(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}天${hours}小時`;
    if (hours > 0) return `${hours}小時${minutes}分`;
    return `${minutes}分`;
  }
  function formatLimitedLabel(ts){
    const text = formatRemainingTime(ts - Date.now());
    return text === '已結束' ? '已結束' : `剩餘：${text}`;
  }
  function updateLimitedCountdowns(root){
    try{
      const scope = root || document;
      const nodes = scope.querySelectorAll('[data-limited-until]');
      if (!nodes.length) return;
      const now = Date.now();
      nodes.forEach(node=>{
        const ts = Number(node.getAttribute('data-limited-until'));
        if (!Number.isFinite(ts) || ts <= 0) return;
        const text = formatRemainingTime(ts - now);
        node.textContent = text === '已結束' ? '已結束' : `剩餘：${text}`;
      });
    }catch(_){}
  }
  function normalizeOrderSuffix(val){
    return String(val||'').replace(/[^0-9a-z]/ig,'').toUpperCase().slice(-5);
  }

  function formatTWD(num){
    const n = Number(num || 0);
    return 'NT$ ' + n.toLocaleString('zh-TW');
  }

  function getItemQty(item){
    const raw = Number(item && item.qty);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.floor(raw);
  }

  function isQtyEnabled(service){
    return service && service.qtyEnabled === true;
  }

  function isRitualPhotoRequired(service){
    if (!service) return true;
    if (Object.prototype.hasOwnProperty.call(service, 'ritualPhotoRequired')) return !!service.ritualPhotoRequired;
    if (Object.prototype.hasOwnProperty.call(service, 'photoRequired')) return !!service.photoRequired;
    if (Object.prototype.hasOwnProperty.call(service, 'requirePhoto')) return !!service.requirePhoto;
    const name = String(service.name || service.serviceName || '').trim();
    if (name && /代捐棺/.test(name)) return false;
    return true;
  }

  function isCheckoutPhotoRequired(){
    if (checkoutForm && checkoutForm.dataset && checkoutForm.dataset.photoRequired){
      return checkoutForm.dataset.photoRequired === '1';
    }
    return true;
  }

  function applyPhotoRequirement(required, serviceName){
    const need = !!required;
    const name = String(serviceName || '').trim();
    let skipText = '此服務不需上傳個人照片。';
    if (name){
      if (/義德善堂/.test(name) && /捐/.test(name)){
        skipText = `${name}不用上傳照片。`;
      }else if (/代捐棺/.test(name)){
        skipText = '代捐棺服務不用上傳照片。';
      }else{
        skipText = `${name}不需上傳個人照片。`;
      }
    }
    if (checkoutForm && checkoutForm.dataset){
      checkoutForm.dataset.photoRequired = need ? '1' : '0';
    }
    if (contactPhotoInput){
      contactPhotoInput.required = need;
      contactPhotoInput.disabled = !need;
    }
    if (contactPhotoWrap) contactPhotoWrap.style.display = need ? '' : 'none';
    if (contactPhotoSkipHint){
      contactPhotoSkipHint.textContent = skipText;
      contactPhotoSkipHint.style.display = need ? 'none' : '';
    }
    if (contactPhotoTitle){
      contactPhotoTitle.textContent = need
        ? '上傳個人照片（祈福使用，必填）'
        : '上傳個人照片（祈福使用，可略過）';
    }
    if (!need){
      checkoutRitualPhoto = { url:'', name:'' };
      if (contactPhotoInput) contactPhotoInput.value = '';
      if (contactPhotoName) contactPhotoName.textContent = '';
    }
  }

  function getServiceQtyLabel(service){
    const label = service && (service.qtyLabel || service.quantityLabel || service.unitLabel);
    return String(label || '數量');
  }

  function getServiceFee(service){
    const raw = service && (service.fixedFee ?? service.serviceFee ?? service.travelFee ?? service.extraFee ?? service.carFee);
    const fee = Number(raw || 0);
    return Number.isFinite(fee) && fee > 0 ? fee : 0;
  }

  function getServiceFeeLabel(service){
    const label = service && (service.feeLabel || service.serviceFeeLabel);
    return String(label || '車馬費');
  }

  function getCartFee(list){
    if (!Array.isArray(list) || !list.length) return 0;
    return getServiceFee(list[0]);
  }

  function getCartFeeLabel(list){
    if (!Array.isArray(list) || !list.length) return '車馬費';
    return getServiceFeeLabel(list[0]);
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
    const itemsTotal = list.reduce((sum,item)=> {
      const unit = Number(item.basePrice||0) + Number(item.optionPrice||0);
      return sum + unit * getItemQty(item);
    }, 0);
    return itemsTotal + getCartFee(list);
  }

  function setRequestDateMin(){
    if (!requestDateInput) return;
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    requestDateInput.min = iso;
  }

  function fillContactFromProfile(profile, force){
    if (!profile) return;
    const defaults = profile.defaultContact || {};
    const source = Object.assign(
      {},
      {
        name: profile.name || '',
        email: profile.email || ''
      },
      defaults
    );
    if (contactNameInput && (force || !contactNameInput.value)){
      contactNameInput.value = source.name || '';
    }
    if (contactPhoneInput && (force || !contactPhoneInput.value) && source.phone){
      contactPhoneInput.value = source.phone;
    }
    if (contactEmailInput && (force || !contactEmailInput.value)){
      contactEmailInput.value = source.email || '';
    }
    updateMemberPerkHint(profile);
  }

  // 強制帶入會員資料（多次嘗試，避免其他腳本覆寫）
  function ensureContactFromProfile(retries){
    const tryFetch = ()=>{
      fetch('/api/me/profile',{credentials:'include',cache:'no-store'})
        .then(r=>r.json().catch(()=>({})))
        .then(data=>{
          const p = data && data.profile ? data.profile : null;
          if (p){
            lastProfile = p;
            fillContactFromProfile(p, true);
          }
        }).catch(()=>{});
    };
    // 先用現有 session profile
    try{
      if (window.authState && typeof window.authState.getProfile === 'function'){
        const p = window.authState.getProfile();
        if (p){
          lastProfile = p;
          fillContactFromProfile(p, true);
        }
      }
    }catch(_){}
    tryFetch();
    let count = 0;
    const timer = setInterval(()=>{
      if ((contactNameInput && contactNameInput.value) &&
          (contactPhoneInput && contactPhoneInput.value) &&
          (contactEmailInput && contactEmailInput.value)){
        clearInterval(timer);
        return;
      }
      tryFetch();
      count++;
      if (count >= (retries||5)){
        clearInterval(timer);
      }
    }, 600);
  }

  function updateMemberPerkHint(profile){
    if (!memberPerkHintEl) return;
    // 暫不顯示會員優惠
    memberPerkHintEl.style.display = 'none';
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
            ${sanitizeImageUrl(item.image) ? `<img src="${escapeHtml(sanitizeImageUrl(item.image))}" alt="">` : ''}
            <div>
              <div style="font-weight:700;font-size:14px;">${escapeHtml(item.serviceName||'服務')}</div>
              <div class="meta">${escapeHtml(item.optionName||'標準服務')}${getItemQty(item) > 1 ? ` × ${getItemQty(item)}` : ''}</div>
            </div>
          </div>
          <div class="price">${formatTWD((Number(item.basePrice||0)+Number(item.optionPrice||0)) * getItemQty(item))}</div>
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
    applyPhotoRequirement(true, '');
    setCheckoutStep(1);
    setRequestDateMin();
  }

  function collectStepOneData(){
    if (!checkoutForm) return null;
    const fd = new FormData(checkoutForm);
    const name = String(fd.get('name')||'').trim();
    const nameEn = String(fd.get('nameEn')||'').trim();
    const phoneRaw = String(fd.get('phone')||'').trim();
    const email = String(fd.get('email')||'').trim();
    const birth = String(fd.get('birth')||'').trim();
    const requestDate = String(fd.get('requestDate')||'').trim();
    const note = String(fd.get('note')||'').trim();
    if (!name){
      alert('請輸入聯絡人姓名');
      return null;
    }
    if (!nameEn){
      alert('請輸入英文姓名');
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
    if (isCheckoutPhotoRequired()){
      if (!contactPhotoInput || !contactPhotoInput.files || !contactPhotoInput.files[0]){
        alert('請上傳祈福用照片');
        if (contactPhotoInput) contactPhotoInput.focus();
        return null;
      }
    }
    return { name, nameEn, phone: phoneDigits, email, birth, requestDate, note };
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
    if (!isCheckoutPhotoRequired()) return '';
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
      const res = await fetch('/api/service/products?active=true', { cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || 'error');
      return Array.isArray(data.items) ? data.items : [];
    }catch(err){
      console.error('[service] fetch error', err);
      return [];
    }
  }

  function getLimitedInfo(item){
    const ts = parseLimitedUntil(item && item.limitedUntil);
    if (!ts) return null;
    return { ts, label: formatLimitedLabel(ts) };
  }

  function buildLimitedRow(item, labelText){
    const info = getLimitedInfo(item);
    if (!info) return '';
    return `
      <div class="meta meta-limited">
        <span class="badge badge-limited">${labelText}</span>
        <span class="badge badge-remaining" data-limited-until="${info.ts}">${info.label}</span>
      </div>
    `;
  }

  function buildServiceCard(service, opts = {}){
    const sid = resolveServiceId(service);
    if (!service.id && sid) service.id = sid;
    const cover = service.cover || (Array.isArray(service.gallery) && service.gallery[0]) || '';
    const sold = Number(service.sold || 0);
    const limitedRow = buildLimitedRow(service, '限時服務');
    const card = document.createElement('div');
    card.className = 'card service-card' + (opts.hot ? ' hot-card' : '');
    card.innerHTML = `
      <div class="pic">${sanitizeImageUrl(cover) ? `<img src="${escapeHtml(sanitizeImageUrl(cover))}" alt="${escapeHtml(service.name||'')}" loading="lazy">` : ''}</div>
      <div class="body">
        <div class="name">${escapeHtml(service.name||'服務')}</div>
        ${limitedRow}
        <div class="meta"><span class="badge badge-sold">已售出：${sold}</span></div>
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
    return card;
  }

  function scheduleLimitedTimer(){
    if (limitedTimer) return;
    limitedTimer = setInterval(()=> updateLimitedCountdowns(document), 60000);
  }

  function resolveHotToggle(){
    if (hotToggle && document.body.contains(hotToggle)) return hotToggle;
    hotToggle = document.getElementById('svcHotToggle');
    return hotToggle;
  }

  function bindHotToggle(){
    const toggle = resolveHotToggle();
    if (!toggle || toggle.__bound) return;
    toggle.__bound = true;
    toggle.addEventListener('click', ()=>{
      hotOnly = !hotOnly;
      toggle.classList.toggle('active', hotOnly);
      renderList(serviceItems);
      renderHotServices(serviceItems);
    });
  }

  function getHotItems(items){
    const list = (items || [])
      .filter(it => it && it.active !== false && !isLimitedExpired(it.limitedUntil))
      .filter(it => Number(it.sold||0) > 0);
    list.sort((a,b)=>{
      const diff = Number(b.sold||0) - Number(a.sold||0);
      if (diff !== 0) return diff;
      return new Date(b.updatedAt||0) - new Date(a.updatedAt||0);
    });
    return list.slice(0, 3);
  }

  function renderHotServices(items){
    if (!hotSection || !hotListEl) return;
    if (hotOnly){
      hotSection.style.display = 'none';
      return;
    }
    const top = getHotItems(items);
    if (!top.length){
      hotSection.style.display = 'none';
      hotListEl.innerHTML = '';
      return;
    }
    hotSection.style.display = '';
    hotListEl.innerHTML = '';
    top.forEach(service=>{
      hotListEl.appendChild(buildServiceCard(service, { hot:true }));
    });
    updateLimitedCountdowns(hotListEl);
    scheduleLimitedTimer();
  }

  function renderList(items){
    if (!listEl) return;
    const activeItems = items.filter(it => it && it.active !== false && !isLimitedExpired(it.limitedUntil));
    const displayItems = hotOnly ? getHotItems(activeItems) : activeItems;
    listEl.innerHTML = '';
    if (!displayItems.length){
      const placeholder = document.createElement('div');
      placeholder.id = 'svcListEmpty';
      placeholder.className = 'empty';
      placeholder.textContent = hotOnly ? '目前沒有熱賣中的服務。' : '目前尚未上架服務，請稍後再試。';
      listEl.appendChild(placeholder);
      return;
    }
    displayItems.forEach(service => {
      listEl.appendChild(buildServiceCard(service));
    });
    updateLimitedCountdowns(listEl);
    scheduleLimitedTimer();
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
    const unit = base + diff;
    const qtyEnabled = isQtyEnabled(detailDataset);
    const qty = qtyEnabled && detailQtyInput ? Math.max(1, Number(detailQtyInput.value||1) || 1) : 1;
    const fee = qtyEnabled ? getServiceFee(detailDataset) : 0;
    detailPriceEl.textContent = (unit * qty + fee).toLocaleString('zh-TW');
    if (detailPriceHint){
      if (qtyEnabled){
        const feeText = fee > 0 ? ` + ${getServiceFeeLabel(detailDataset)} ${formatTWD(fee)}` : '';
        detailPriceHint.textContent = `單價 ${formatTWD(unit)} × ${qty}${feeText}`;
        detailPriceHint.style.display = '';
      }else{
        detailPriceHint.textContent = '';
        detailPriceHint.style.display = 'none';
      }
    }
  }
  if (detailQtyInput && !detailQtyInput.__bound){
    detailQtyInput.__bound = true;
    detailQtyInput.addEventListener('input', ()=>{
      const val = Math.max(1, Number(detailQtyInput.value||1) || 1);
      detailQtyInput.value = String(Math.floor(val));
      updateDetailPrice();
    });
  }

  function openServiceDetail(service){
    detailDataset = service;
    lastDetailService = service;
    if (detailTitle) detailTitle.textContent = service.name || '服務';
    if (detailDesc) detailDesc.textContent = service.description || service.desc || '';
    const limitedTs = parseLimitedUntil(service && service.limitedUntil);
    const limitedExpired = limitedTs ? Date.now() >= limitedTs : false;
    if (detailLimited){
      if (limitedTs){
        detailLimited.textContent = '限時服務';
        detailLimited.style.display = 'inline-flex';
      }else{
        detailLimited.textContent = '';
        detailLimited.style.display = 'none';
      }
    }
    if (detailRemaining){
      if (limitedTs){
        detailRemaining.textContent = formatLimitedLabel(limitedTs);
        detailRemaining.setAttribute('data-limited-until', String(limitedTs));
        detailRemaining.style.display = 'inline-flex';
      }else{
        detailRemaining.textContent = '';
        detailRemaining.removeAttribute('data-limited-until');
        detailRemaining.style.display = 'none';
      }
    }
    if (detailAddBtn){
      detailAddBtn.disabled = !!limitedExpired;
      detailAddBtn.textContent = limitedExpired ? '已結束' : '加入購物車';
    }
    if (detailIncludes){
      const includes = Array.isArray(service.includes) ? service.includes : [];
      detailIncludes.innerHTML = includes.length ? includes.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '<li>老師依實際情況安排內容</li>';
    }
    if (detailQtyWrap && detailQtyInput){
      const qtyEnabled = isQtyEnabled(service);
      if (qtyEnabled){
        detailQtyWrap.style.display = '';
        detailQtyInput.value = '1';
        detailQtyInput.min = '1';
        detailQtyInput.step = '1';
        if (detailQtyLabel) detailQtyLabel.textContent = getServiceQtyLabel(service);
        if (detailFeeHint){
          const fee = getServiceFee(service);
          detailFeeHint.textContent = fee > 0 ? `${getServiceFeeLabel(service)} ${formatTWD(fee)}` : '';
          detailFeeHint.style.display = fee > 0 ? '' : 'none';
        }
      }else{
        detailQtyWrap.style.display = 'none';
      }
    }
    currentReviewCode = (service.reviewCode || service.deityCode || service.deity || service.code || resolveServiceId(service) || '').toString().trim().toUpperCase();
    currentReviewName = (service.name || service.serviceName || '').toString().trim();
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
      const heroSrc = sanitizeImageUrl(gallery[0] || service.cover || '');
      detailHero.src = heroSrc;
      detailHero.alt = service.name || '';
    }
    if (detailGallery){
      if (gallery.length){
        const safeGallery = gallery.map(sanitizeImageUrl).filter(Boolean);
        detailGallery.innerHTML = safeGallery.map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(service.name||'')}" loading="lazy">`).join('');
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
    updateLimitedCountdowns(detailDialog);
    scheduleLimitedTimer();
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
    const limitedTs = parseLimitedUntil(detailDataset && detailDataset.limitedUntil);
    if (limitedTs && Date.now() >= limitedTs){
      alert('此服務已結束上架');
      return;
    }
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
    const qtyEnabled = isQtyEnabled(detailDataset);
    const qty = qtyEnabled && detailQtyInput ? Math.max(1, Number(detailQtyInput.value||1) || 1) : 1;
    const fee = qtyEnabled ? getServiceFee(detailDataset) : 0;
    const feeLabel = qtyEnabled ? getServiceFeeLabel(detailDataset) : '';
    const qtyLabel = qtyEnabled ? getServiceQtyLabel(detailDataset) : '';
    const photoRequired = isRitualPhotoRequired(detailDataset);
    const item = {
      uid: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      serviceId: svcId,
      serviceName: detailDataset.name || '服務',
      basePrice: Number(detailDataset.price||0),
      optionName: variant ? variant.name : '',
      optionPrice: variant ? Number(variant.price||0) : 0,
      qty,
      qtyEnabled,
      qtyLabel,
      serviceFee: fee,
      serviceFeeLabel: feeLabel,
      photoRequired,
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
    const photoRequired = cart.some(item => isRitualPhotoRequired(item));
    const serviceName = cart[0] && cart[0].serviceName ? cart[0].serviceName : '';
    applyPhotoRequirement(photoRequired, serviceName);
    const selectedOpts = [];
    cart.filter(it => it.optionName).forEach(it => {
      const qty = getItemQty(it);
      for (let i=0;i<qty;i++){
        selectedOpts.push({ name: it.optionName, price: it.optionPrice });
      }
    });
    const baseCount = cart.filter(it => !it.optionName).reduce((sum, it)=> sum + getItemQty(it), 0) || 0;
    if (checkoutForm){
      checkoutForm.dataset.selectedOptions = JSON.stringify(selectedOpts);
      checkoutForm.dataset.baseCount = String(baseCount);
      checkoutForm.dataset.serviceId = svcId;
      checkoutForm.dataset.serviceFee = String(getCartFee(cart));
      checkoutForm.dataset.serviceFeeLabel = getCartFeeLabel(cart);
    }
    if (checkoutServiceIdInput) checkoutServiceIdInput.value = svcId;
    if (checkoutServiceName) checkoutServiceName.textContent = cart[0].serviceName || '服務';
    if (checkoutSummary){
      const lines = cart.map(item => {
        const qty = getItemQty(item);
        const unit = Number(item.basePrice||0)+Number(item.optionPrice||0);
        const label = escapeHtml(item.optionName || '標準服務') + (qty > 1 ? ` × ${qty}` : '');
        return `<li>${label}｜${formatTWD(unit * qty)}</li>`;
      });
      const fee = getCartFee(cart);
      if (fee > 0){
        lines.push(`<li>${escapeHtml(getCartFeeLabel(cart))}｜${formatTWD(fee)}</li>`);
      }
      checkoutSummary.innerHTML = lines.join('');
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
    // 強制載入會員基本資料
    ensureContactFromProfile(6);
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
        const orderDigitsRaw = String(formData.get('orderDigits')||'').trim();
        const orderDigits = normalizeOrderSuffix(orderDigitsRaw);
        const bankDigits = String(formData.get('bankDigits')||'').trim();
        if (!phone){
          alert('請輸入手機號碼');
          return;
        }
        if (!orderDigits && !bankDigits){
          alert('請輸入訂單末五碼（英數）或匯款帳號末五碼');
          return;
        }
        if (orderDigitsRaw && orderDigits.length !== 5){
          alert('訂單編號末五碼需為 5 位英數');
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
  if (window.authState){
    window.authState.onProfile(profile=>{
      try{ console.debug && console.debug('[svc] onProfile', profile); }catch(_){}
      lastProfile = profile;
      fillContactFromProfile(profile);
    });
    if (typeof window.authState.getProfile === 'function'){
      const existingProfile = window.authState.getProfile();
      try{ console.debug && console.debug('[svc] existing profile', existingProfile); }catch(_){}
      if (existingProfile){ lastProfile = existingProfile; fillContactFromProfile(existingProfile); }
    }
  }

  // 會員中心頂部下拉
  (function(){
    const toggle = document.getElementById('memberMenuBtnSvc');
    const panel = document.getElementById('memberMenuPanelSvc');
    const arrow = document.getElementById('memberMenuArrowSvc');
    const memberMenuBadge = document.getElementById('memberMenuBadgeSvc');
    const profileLink = panel ? panel.querySelector('a[data-profile]') : null;
    const dlg = document.getElementById('profileDialogSvc');
    const nameInput = document.getElementById('profileNameSvc');
    const emailInput = document.getElementById('profileEmailSvc');
    const phoneInput = document.getElementById('profilePhoneSvc');
    const saveBtn = document.getElementById('profileSaveSvc');
    const closeBtn = document.getElementById('profileCloseSvc');
    const statusEl = document.getElementById('profileStatusSvc');
    const qnaLink = panel ? panel.querySelector('#adminQnaLinkSvc') : null;
    const qnaBadge = document.getElementById('adminQnaBadgeSvc');
    const userOrdersLink = panel ? panel.querySelector('#userOrdersLinkSvc') : null;
    const userQnaBadge = document.getElementById('userQnaBadgeSvc');
    const userCouponsLink = panel ? panel.querySelector('#userCouponsLinkSvc') : null;
    const userCouponBadge = document.getElementById('userCouponBadgeSvc');
    let userQnaCount = 0;
    let userCouponCount = 0;
    let qnaTimer = null;
    let userQnaTimer = null;
    let userCouponTimer = null;

    async function openProfile(){
      if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
        if (window.authState && typeof window.authState.promptLogin === 'function'){
          window.authState.promptLogin('請先登入再編輯基本資料');
        }
        return;
      }
      try{
        const res = await fetch('/api/me/profile',{credentials:'include',cache:'no-store'});
        const data = await res.json().catch(()=>({}));
        const profile = data.profile || data || {};
        if (nameInput) nameInput.value = profile.name || profile.defaultContact?.name || '';
        if (emailInput) emailInput.value = profile.email || profile.defaultContact?.email || '';
        if (phoneInput) phoneInput.value = profile.defaultContact?.phone || profile.phone || '';
        if (statusEl) statusEl.textContent = '';
        if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
        else if (dlg) dlg.setAttribute('open','');
      }catch(e){
        if (statusEl) statusEl.textContent = '讀取失敗，請稍後再試';
      }
    }

    async function saveProfile(){
      if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
        if (window.authState && typeof window.authState.promptLogin === 'function'){
          window.authState.promptLogin('請先登入再儲存');
        }
        return;
      }
      if (statusEl) statusEl.style.color = '#ef4444';
      try{
        const body = {
          profile:{
            name: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : ''
          },
          defaultContact:{
            name: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            phone: phoneInput ? phoneInput.value.trim() : ''
          }
        };
        const res = await fetch('/api/me/profile',{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok){
          throw new Error(data.error || ('HTTP '+res.status));
        }
        if (statusEl){
          statusEl.style.color = '#16a34a';
          statusEl.textContent = '已儲存，下次結帳自動帶入。';
        }
        if (window.authState && typeof window.authState.refreshProfile === 'function'){
          window.authState.refreshProfile();
        }
        setTimeout(()=>{ if (closeBtn) closeBtn.click(); }, 800);
      }catch(err){
        if (statusEl) statusEl.textContent = err.message || '儲存失敗';
      }
    }

    if (toggle && panel){
      const setArrow = (isOpen)=>{
        if (arrow){
          arrow.textContent = isOpen ? '▴' : '▾';
        }else{
          toggle.textContent = isOpen ? '會員中心 ▴' : '會員中心 ▾';
        }
      };
      const close = ()=>{
        panel.style.display = 'none';
        setArrow(false);
      };
      const open = ()=>{
        panel.style.display = 'block';
        setArrow(true);
      };
      toggle.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        const isOpen = panel.style.display === 'block';
        if (isOpen) close(); else open();
      });
      if (profileLink){
        profileLink.addEventListener('click', ev=>{
          ev.preventDefault();
          close();
          openProfile();
        });
      }
      panel.addEventListener('click', ev=>{
        const link = ev.target.closest('a[href]');
        if (!link) return;
        ev.preventDefault();
        close();
        window.location.href = link.href;
      });
      document.addEventListener('click', (ev)=>{
        if (!panel.contains(ev.target) && ev.target !== toggle){
          close();
        }
      });
    }

    function setMemberMenuBadge(){
      if (!memberMenuBadge) return;
      const total = (Number(userQnaCount || 0) || 0) + (Number(userCouponCount || 0) || 0);
      if (total > 0){
        memberMenuBadge.textContent = String(total);
        memberMenuBadge.classList.add('show');
      }else{
        memberMenuBadge.textContent = '';
        memberMenuBadge.classList.remove('show');
      }
    }

    function setUserQnaBadge(count){
      if (!userQnaBadge) return;
      const num = Number(count || 0) || 0;
      userQnaCount = num;
      if (num > 0){
        userQnaBadge.textContent = String(num);
        userQnaBadge.classList.add('show');
      }else{
        userQnaBadge.textContent = '0';
        userQnaBadge.classList.remove('show');
      }
      setMemberMenuBadge();
    }

    function setUserCouponBadge(count){
      if (!userCouponBadge) return;
      const num = Number(count || 0) || 0;
      userCouponCount = num;
      if (num > 0){
        userCouponBadge.textContent = String(num);
        userCouponBadge.classList.add('show');
      }else{
        userCouponBadge.textContent = '0';
        userCouponBadge.classList.remove('show');
      }
      setMemberMenuBadge();
    }

    function setQnaBadge(count){
      if (!qnaBadge) return;
      const num = Number(count || 0) || 0;
      if (num > 0){
        qnaBadge.textContent = String(num);
        qnaBadge.classList.add('show');
      }else{
        qnaBadge.textContent = '0';
        qnaBadge.classList.remove('show');
      }
    }

    async function refreshQnaUnread(){
      if (!qnaBadge) return;
      try{
        const res = await fetch('/api/admin/qna/unread', { credentials:'include', cache:'no-store' });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data || data.ok === false){
          setQnaBadge(0);
          return;
        }
        setQnaBadge(data.unread || 0);
      }catch(_){
        setQnaBadge(0);
      }
    }

    async function refreshUserQnaUnread(){
      if (!userQnaBadge) return;
      try{
        const res = await fetch('/api/me/qna/unread', { credentials:'include', cache:'no-store' });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data || data.ok === false){
          setUserQnaBadge(0);
          return;
        }
        setUserQnaBadge(data.total || 0);
      }catch(_){
        setUserQnaBadge(0);
      }
    }

    async function refreshUserCouponUnread(){
      if (!userCouponBadge) return;
      try{
        const res = await fetch('/api/me/coupons/unread', { credentials:'include', cache:'no-store' });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data || data.ok === false){
          setUserCouponBadge(0);
          return;
        }
        setUserCouponBadge(data.total || 0);
      }catch(_){
        setUserCouponBadge(0);
      }
    }

    async function clearQnaUnread(){
      try{
        await fetch('/api/admin/qna/unread', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ action:'clear' })
        });
      }catch(_){}
      setQnaBadge(0);
    }

    async function clearUserQnaUnread(){
      try{
        await fetch('/api/me/qna/unread', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ action:'clear' })
        });
      }catch(_){}
      setUserQnaBadge(0);
    }

    async function clearUserCouponUnread(){
      try{
        await fetch('/api/me/coupons/unread', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ action:'clear' })
        });
      }catch(_){}
      setUserCouponBadge(0);
    }

    if (qnaLink){
      qnaLink.addEventListener('click', ()=>{
        clearQnaUnread();
      });
    }
    if (userCouponsLink){
      userCouponsLink.addEventListener('click', ()=>{
        clearUserCouponUnread();
      });
    }

    if (window.authState && typeof window.authState.onAdmin === 'function'){
      window.authState.onAdmin(isAdmin=>{
        if (!qnaLink || !qnaBadge) return;
        if (isAdmin){
          refreshQnaUnread();
          if (qnaTimer) clearInterval(qnaTimer);
          qnaTimer = setInterval(refreshQnaUnread, 60000);
        }else{
          setQnaBadge(0);
          if (qnaTimer) clearInterval(qnaTimer);
          qnaTimer = null;
        }
      });
    }

    if (window.authState && typeof window.authState.subscribe === 'function'){
      window.authState.subscribe(user=>{
        if (user){
          refreshUserQnaUnread();
          refreshUserCouponUnread();
          if (userQnaTimer) clearInterval(userQnaTimer);
          userQnaTimer = setInterval(refreshUserQnaUnread, 60000);
          if (userCouponTimer) clearInterval(userCouponTimer);
          userCouponTimer = setInterval(refreshUserCouponUnread, 60000);
        }else{
          setUserQnaBadge(0);
          setUserCouponBadge(0);
          if (userQnaTimer) clearInterval(userQnaTimer);
          userQnaTimer = null;
          if (userCouponTimer) clearInterval(userCouponTimer);
          userCouponTimer = null;
        }
      });
    }

    if (closeBtn){
      closeBtn.addEventListener('click', ()=>{
        if (dlg && typeof dlg.close === 'function') dlg.close();
        else if (dlg) dlg.removeAttribute('open');
      });
    }
    if (saveBtn){
      saveBtn.addEventListener('click', saveProfile);
    }
  })();
  if (checkoutBackBtn){
    checkoutBackBtn.addEventListener('click', ()=>{
      closeDialog(checkoutDialog);
      renderCartPanel();
      if (cartPanel) openDialog(cartPanel);
    });
  }
  if (checkoutNextBtn){
    checkoutNextBtn.addEventListener('click', async ()=>{
      // 顯示載入中狀態，避免使用者誤以為沒反應
      checkoutNextBtn.disabled = true;
      const oldText = checkoutNextBtn.textContent;
      checkoutNextBtn.textContent = '處理中…';
      checkoutNextBtn.classList.add('loading');
      const data = collectStepOneData();
      if (!data){
        checkoutNextBtn.disabled = false;
        checkoutNextBtn.textContent = oldText;
        checkoutNextBtn.classList.remove('loading');
        return;
      }
      checkoutContact = data;
      // 若尚未帶入會員基本資料，再嘗試一次（使用 profile）
      try{
        if (!contactNameInput.value || !contactPhoneInput.value || !contactEmailInput.value){
          if (window.authState && typeof window.authState.getProfile === 'function'){
            const p = window.authState.getProfile();
            if (p){
              fillContactFromProfile(p);
            }
          }
        }
      }catch(_){}
      try{
        await ensureRitualPhotoUploaded();
      }catch(err){
        alert(err && err.message ? err.message : '上傳祈福照片失敗');
        checkoutNextBtn.disabled = false;
        checkoutNextBtn.textContent = oldText;
        checkoutNextBtn.classList.remove('loading');
        return;
      }
      setCheckoutStep(2);
      checkoutNextBtn.disabled = false;
      checkoutNextBtn.textContent = oldText;
      checkoutNextBtn.classList.remove('loading');
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
      if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
        if (window.authState && typeof window.authState.promptLogin === 'function'){
          window.authState.promptLogin('請先登入後再送出匯款資料。');
        }else{
          alert('請先登入後再送出匯款資料。');
          window.location.href = '/api/auth/google/login';
        }
        return;
      }
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
          nameEn: checkoutContact.nameEn,
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
        const finalAmount = (result && result.order && Number(result.order.amount)) || Number(result.amount) || totalAmount;
        renderCheckoutSuccess(result.orderId || result.id || '', finalAmount);
        if (result && result.order && result.order.memberDiscount){
          updateMemberPerkHint({ memberPerks:{ welcomeDiscount:{ used:true } } });
        }
        if (bankReceiptInput) bankReceiptInput.value = '';
        if (bankReceiptName) bankReceiptName.textContent = '';
        if (window.authState && typeof window.authState.refreshProfile === 'function'){
          window.authState.refreshProfile();
        }
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
    serviceItems = Array.isArray(services) ? services : [];
    bindHotToggle();
    renderHotServices(serviceItems);
    renderList(serviceItems);
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
        const payload = { code: currentReviewCode, nick, msg, imageUrl, productName: currentReviewName };
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
