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
  const detailQtyMinus = document.getElementById('svcDetailQtyMinus');
  const detailQtyPlus = document.getElementById('svcDetailQtyPlus');
  const detailFeeHint = document.getElementById('svcDetailFeeHint');
  const detailPriceHint = document.getElementById('svcDetailPriceHint');
  const detailPriceOldEl = document.getElementById('svcDetailPriceOld');
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
  const slotChangeBtn = document.getElementById('svcSlotChangeBtn');
  const checkoutNextBtn = document.getElementById('svcCartNext');
  const checkoutNextLabelDefault = checkoutNextBtn ? checkoutNextBtn.textContent : '';
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
  const requestDateWrap = requestDateInput ? requestDateInput.closest('label') : null;
  const contactNameInput = checkoutForm ? checkoutForm.querySelector('input[name="name"]') : null;
  const contactNameEnInput = checkoutForm ? checkoutForm.querySelector('input[name="nameEn"]') : null;
  const contactPhoneInput = checkoutForm ? checkoutForm.querySelector('input[name="phone"]') : null;
  const contactEmailInput = checkoutForm ? checkoutForm.querySelector('input[name="email"]') : null;
  const contactBirthInput = checkoutForm ? checkoutForm.querySelector('input[name="birth"]') : null;
  const contactNoteInput = checkoutForm ? checkoutForm.querySelector('textarea[name="note"]') : null;
  const contactNameEnWrap = contactNameEnInput ? contactNameEnInput.closest('label') : null;
  const contactBirthWrap = contactBirthInput ? contactBirthInput.closest('label') : null;
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
  const successNotice = document.getElementById('svcSuccessNotice');
  const successRescheduleWrap = document.getElementById('svcSuccessRescheduleWrap');
  const successRescheduleBtn = document.getElementById('svcSuccessReschedule');
  const step3RescheduleWrap = document.getElementById('svcStep3RescheduleWrap');
  const step3RescheduleBtn = document.getElementById('svcStep3Reschedule');
  const bookingNoticeEl = document.getElementById('svcBookingNotice');
  const rescheduleDialog = document.getElementById('svcRescheduleDialog');
  const rescheduleClose = document.getElementById('svcRescheduleClose');
  const rescheduleDaysEl = document.getElementById('svcRescheduleDays');
  const rescheduleGridEl = document.getElementById('svcRescheduleGrid');
  const rescheduleStateEl = document.getElementById('svcRescheduleState');
  const rescheduleHintEl = document.getElementById('svcRescheduleSlotHint');
  const rescheduleNoteInput = document.getElementById('svcRescheduleNote');
  const rescheduleSubmitBtn = document.getElementById('svcRescheduleSubmit');
  const cartFab = document.getElementById('cartFab');
  const cartBadge = document.getElementById('cartBadge');
  const cartPanel = document.getElementById('svcCartPanel');
  const cartListEl = document.getElementById('svcCartList');
  const cartAmountEl = document.getElementById('svcCartAmount');
  const cartPanelClose = document.getElementById('svcCartPanelClose');
  const cartPanelBack = document.getElementById('svcCartPanelBack');
  const cartClearBtn = document.getElementById('svcCartClear');
  const cartCheckoutBtn = document.getElementById('svcCartCheckout');
  const cartCheckoutLabelDefault = cartCheckoutBtn ? cartCheckoutBtn.textContent : '';
  const privacyLink = document.getElementById('privacyLink');
  const privacyDialog = document.getElementById('privacyDialog');
  const privacyClose = document.getElementById('privacyClose');
  const promoSection = document.getElementById('svcPromoPhone');
  const promoCta = document.getElementById('svcPromoCta');
  const promoPills = Array.from(document.querySelectorAll('#svcPromoPhone .svc-pill'));
  const promoMediaEl = document.querySelector('#svcPromoPhone .svc-promo-media');
  const promoKickerEl = document.getElementById('svcPromoKicker');
  const promoTitleEl = document.getElementById('svcPromoTitle');
  const promoSubEl = document.getElementById('svcPromoSub');
  const promoBulletsEl = document.getElementById('svcPromoBullets');
  const promoNoteEl = document.getElementById('svcPromoNote');
  const promoPackLabelEl = document.getElementById('svcPromoPackLabel');
  const promoPackEnEl = document.getElementById('svcPromoPackEn');
  const promoPackZhEl = document.getElementById('svcPromoPackZh');
  const promoMiniEl = document.getElementById('svcPromoMini');
  const promoPriceRow = document.getElementById('svcPromoPriceRow');
  const promoPriceOldEl = document.getElementById('svcPromoPriceOld');
  const promoPriceNewEl = document.getElementById('svcPromoPriceNew');
  const promoStoriesEl = document.getElementById('svcPromoStories');
  const promoStoryMediaEl = document.querySelector('#svcPromoStories .svc-promo-story-media');
  const promoStoryImgEl = document.getElementById('svcPromoStoryImg');
  const promoStoryMsgEl = document.getElementById('svcPromoStoryMsg');
  const promoStoryMoreBtn = document.getElementById('svcPromoStoryMore');
  const promoStoryNameEl = document.getElementById('svcPromoStoryName');
  const promoStoryTimeEl = document.getElementById('svcPromoStoryTime');
  const promoLimitedEl = document.getElementById('svcPromoLimited');
  const promoPeriodEl = document.getElementById('svcPromoPeriod');
  const promoEarlyBirdEl = document.getElementById('svcPromoEarlyBird');
  const promoCountdownEl = document.getElementById('svcPromoCountdown');
  const detailPromoLimitedEl = document.getElementById('svcDetailPromoLimited');
  const detailPromoPeriodEl = document.getElementById('svcDetailPromoPeriod');
  const detailPromoEarlyBirdEl = document.getElementById('svcDetailPromoEarlyBird');
  const detailPromoCountdownEl = document.getElementById('svcDetailPromoCountdown');
  const storyModal = document.getElementById('svcStoryModal');
  const storyModalImg = document.getElementById('svcStoryModalImg');
  const storyModalMsg = document.getElementById('svcStoryModalMsg');
  const storyModalName = document.getElementById('svcStoryModalName');
  const storyModalTime = document.getElementById('svcStoryModalTime');
  const storyPrevBtn = document.getElementById('svcStoryPrev');
  const storyNextBtn = document.getElementById('svcStoryNext');
  const promoImgEl = document.getElementById('svcPromoImg');
  const promoAdminEl = document.getElementById('svcPromoAdmin');
  const promoKickerInput = document.getElementById('promoKickerInput');
  const promoTitleInput = document.getElementById('promoTitleInput');
  const promoSubInput = document.getElementById('promoSubInput');
  const promoBulletsInput = document.getElementById('promoBulletsInput');
  const promoNoteInput = document.getElementById('promoNoteInput');
  const promoEarlyBirdInput = document.getElementById('promoEarlyBirdInput');
  const promoPackLabelInput = document.getElementById('promoPackLabelInput');
  const promoPackEnInput = document.getElementById('promoPackEnInput');
  const promoPackZhInput = document.getElementById('promoPackZhInput');
  const promoCtaInput = document.getElementById('promoCtaInput');
  const promoMiniInput = document.getElementById('promoMiniInput');
  const promoPriceInput = document.getElementById('promoPriceInput');
  const promoStartInput = document.getElementById('promoStartInput');
  const promoEndInput = document.getElementById('promoEndInput');
  const promoImageInput = document.getElementById('promoImageInput');
  const promoImagePosXInput = document.getElementById('promoImagePosXInput');
  const promoImagePosYInput = document.getElementById('promoImagePosYInput');
  const promoEditToggle = document.getElementById('promoEditToggle');
  const promoSaveBtn = document.getElementById('promoSave');
  const promoResetBtn = document.getElementById('promoReset');
  const adminPreviewBadge = document.getElementById('svcAdminPreviewBadge');
  const launchToggle = document.getElementById('svcLaunchToggle');
  const launchModeSelect = document.getElementById('phoneLaunchMode');
  const allowlistInput = document.getElementById('phoneAllowlist');
  const slotSection = document.getElementById('svcSlotSection');
  const slotDaysEl = document.getElementById('svcSlotDays');
  const slotGridEl = document.getElementById('svcSlotGrid');
  const slotStateEl = document.getElementById('svcSlotState');
  const slotHintEl = document.getElementById('svcSlotHint');
  const slotTzHintEl = document.getElementById('svcSlotTzHint');
  const slotMoreBtn = document.getElementById('svcSlotMore');
  const slotDaysPrev = document.getElementById('svcSlotDaysPrev');
  const slotDaysNext = document.getElementById('svcSlotDaysNext');
  const consultPackWrap = document.getElementById('svcConsultPack');
  const consultPackPills = Array.from(document.querySelectorAll('#svcConsultPack .svc-pack-pill'));
  let consultAddonInput = document.getElementById('svcConsultAddonSummary');
  const CART_KEY = 'svcCartItems';
  const SLOT_HOLD_KEY_PREFIX = 'svcSlotHold:';
  let HOLD_OWNER_KEY = 'anon';
  const SLOT_AVAIL_TTL_MS = 60 * 1000;
  const __SLOT_AVAIL_CACHE = new Map();
  let PHONE_CONSULT_CFG = null;
  let PHONE_CONSULT_CFG_AT = 0;
  let __IS_ADMIN_VIEWER__ = false;
  let ADMIN_PREVIEW_MODE = false;
  let ADMIN_ROLE = '';
  let ADMIN_ME = { ok:false, role:'', at:0 };
  let __PHONE_PACK__ = 'en';
  let __PHONE_PROMO_SERVICE__ = null;
  let __PHONE_SVC_ID__ = null;
  let promoStoryTimer = null;
  let promoStoryItems = [];
  let promoStoryIndex = 0;
  let promoCountdownTimer = null;
  let requestDateLabelOriginal = '';
  let requestDateHintOriginal = '';
  let notePlaceholderOriginal = '';
  let CONSULT_PACK = null;
  let CONSULT_ADDON = false;
  let LAST_RELEASE_MSG = '';
  const PHONE_BASE_PRICE = 3500;
  let PHONE_BASE_PRICE_OVERRIDE = 0;
  let CONSULT_PACK_PRICES = { en: 0, zh: 0 };
  let CURRENT_DETAIL_SLOT = {
    serviceId: '',
    slotKey: '',
    slotHoldToken: '',
    slotStart: '',
    holdUntilMs: 0,
    timerId: null,
    pendingSlotKey: '',
    pendingSlotStart: ''
  };
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
  let lastLookupPhone = '';
  let lastLookupTransfer = '';
  let lastLookupResult = [];
  let rescheduleContext = { order:null, serviceId:'', slotKey:'', selectedDate:'', items:[] };
  let slotItems = [];
  let slotLastDate = '';
  let slotDaysPage = 0;
  let slotHasMore = true;
  let slotPlaceholderMode = false;
  const SLOT_DAYS_STEP = 10;
  const SLOT_CACHE_PREFIX = 'svcSlotCache:';
  const SLOT_CACHE_TTL_MS = 0;
  let SKIP_AUTO_RESUME = false;
  let limitedTimer = null;
  let serviceItems = [];
  let allServiceItems = [];
  let pendingServiceId = '';
  let pendingServiceSource = '';
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

  function parsePriceValue(raw){
    if (raw === null || raw === undefined) return NaN;
    if (typeof raw === 'number') return raw;
    const txt = String(raw).replace(/[^\d.]/g, '');
    if (!txt) return NaN;
    return Number(txt);
  }

  function readOptionPrice(opt){
    if (!opt) return NaN;
    const raw = opt.price ?? opt.amount ?? opt.value ?? opt.cost;
    return parsePriceValue(raw);
  }

  function getItemQty(item){
    const raw = Number(item && item.qty);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.floor(raw);
  }

  function isQtyEnabled(service){
    return service && service.qtyEnabled === true;
  }

  function isDonationService(service){
    if (!service) return false;
    const name = String(service.serviceName || service.name || '').trim();
    const option = String(service.optionName || service.option || '').trim();
    return /捐棺|代捐棺/.test(name) || /捐棺|代捐棺/.test(option);
  }

  function isRitualPhotoRequired(service){
    if (!service) return true;
    if (isPhoneConsultService(service)) return false;
    if (Object.prototype.hasOwnProperty.call(service, 'ritualPhotoRequired')) return !!service.ritualPhotoRequired;
    if (Object.prototype.hasOwnProperty.call(service, 'photoRequired')) return !!service.photoRequired;
    if (Object.prototype.hasOwnProperty.call(service, 'requirePhoto')) return !!service.requirePhoto;
    const name = String(service.name || service.serviceName || '').trim();
    const option = String(service.optionName || service.option || '').trim();
    if ((name && /代捐棺/.test(name)) || (option && /代捐棺/.test(option))) return false;
    return true;
  }

  function isCandleService(service){
    if (!service) return false;
    const name = String(service.serviceName || service.name || '').trim();
    const option = String(service.optionName || service.option || '').trim();
    return /蠟燭|candle/i.test(name) || /蠟燭|candle/i.test(option);
  }

  async function isAdminViewer(){
    try{
      const res = await fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>null);
      if (res.ok && data && data.ok) return true;
    }catch(_){}
    return false;
  }

  async function getAdminMe(){
    const now = Date.now();
    if (ADMIN_ME.at && (now - ADMIN_ME.at) < 60000) return ADMIN_ME;
    try{
      const res = await fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>null);
      const ok = !!(res.ok && data && data.ok);
      ADMIN_ME = { ok: ok, role: ok ? String(data.role || '').trim().toLowerCase() : '', at: now };
      return ADMIN_ME;
    }catch(_){
      ADMIN_ME = { ok:false, role:'', at: now };
      return ADMIN_ME;
    }
  }

  async function loadPhoneConsultConfig(force){
    const now = Date.now();
    if (!force && PHONE_CONSULT_CFG && (now - PHONE_CONSULT_CFG_AT) < 60000){
      return PHONE_CONSULT_CFG;
    }
    try{
      const res = await fetch('/api/service/phone-consult/config', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>null);
      if (res.ok && data && data.ok){
        PHONE_CONSULT_CFG = {
          ok: true,
          mode: String(data.mode || 'admin').trim().toLowerCase(),
          serviceId: String(data.serviceId || '').trim(),
          isAdmin: !!data.isAdmin,
          allowlisted: !!data.allowlisted
        };
        PHONE_CONSULT_CFG_AT = now;
        return PHONE_CONSULT_CFG;
      }
    }catch(_){}
    const adminMe = await getAdminMe();
    PHONE_CONSULT_CFG = { ok:false, mode:'admin', serviceId:'', isAdmin: !!adminMe.ok, allowlisted:false };
    PHONE_CONSULT_CFG_AT = now;
    return PHONE_CONSULT_CFG;
  }

  function getPhoneConsultScore(service){
    if (!service) return 0;
    const metaType = service.meta && service.meta.type ? String(service.meta.type) : '';
    if (String(metaType).toLowerCase() === 'phone_consult') return 5;
    const name = String(service.name || service.serviceName || '').trim();
    const desc = String(service.description || service.desc || '').trim();
    const tags = Array.isArray(service.tags) ? service.tags.join(' ') : String(service.tags || '').trim();
    const text = `${name} ${desc} ${tags}`.toLowerCase();
    let score = 0;
    if (/電話算命|電話|phone|consultation|占卜|算命/i.test(text)) score += 3;
    if (/翻譯|translation|泰文/i.test(text)) score += 2;
    return score;
  }

  function findPhoneConsultService(services){
    const list = Array.isArray(services) ? services : [];
    const cfgId = PHONE_CONSULT_CFG && PHONE_CONSULT_CFG.serviceId ? String(PHONE_CONSULT_CFG.serviceId) : '';
    if (cfgId){
      const direct = list.find(service => String(resolveServiceId(service)) === cfgId);
      if (direct) return direct;
      return null;
    }
    return null;
  }

  function isPhoneConsultService(service){
    const cfgId = PHONE_CONSULT_CFG && PHONE_CONSULT_CFG.serviceId ? String(PHONE_CONSULT_CFG.serviceId) : '';
    if (cfgId){
      return String(resolveServiceId(service)) === cfgId;
    }
    return false;
  }

  function isPhoneConsultOrder(order){
    if (!order) return false;
    const metaType = order.serviceMeta && order.serviceMeta.type ? String(order.serviceMeta.type) : '';
    if (String(metaType).toLowerCase() === 'phone_consult') return true;
    const type = String(order.serviceType || order.type || '').toLowerCase();
    if (type === 'phone_consult') return true;
    return getPhoneConsultScore({ name: order.serviceName || '' }) >= 3;
  }

  function parseSlotStartMs(raw){
    const val = String(raw || '').trim();
    if (!val) return 0;
    const iso = val.includes('T') ? val : val.replace(' ', 'T');
    const ts = Date.parse(iso);
    return Number.isNaN(ts) ? 0 : ts;
  }

  function canRequestReschedule(order){
    if (!isPhoneConsultOrder(order)) return false;
    const status = String(order.status || '').trim().toLowerCase();
    if (status === 'completed' || status === 'cancelled') return false;
    if (/已完成|完成/.test(order.status || '')) return false;
    if (/已取消|取消/.test(order.status || '')) return false;
    const slotMs = parseSlotStartMs(order.slotStart || '');
    if (!slotMs) return false;
    return Date.now() < (slotMs - 48 * 3600 * 1000);
  }

  function updateRescheduleButtons(order){
    const eligible = !!(order && canRequestReschedule(order));
    if (successRescheduleWrap) successRescheduleWrap.style.display = eligible ? '' : 'none';
    if (step3RescheduleWrap) step3RescheduleWrap.style.display = eligible ? '' : 'none';
    const bind = (btn)=>{
      if (!btn || !eligible || btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', ()=>{
        if (order) openRescheduleDialog(order);
      });
    };
    bind(successRescheduleBtn);
    bind(step3RescheduleBtn);
  }

  function updateBookingNotice(order){
    if (!bookingNoticeEl) return;
    bookingNoticeEl.style.display = (order && isPhoneConsultOrder(order)) ? '' : 'none';
    if (successNotice){
      successNotice.style.display = (order && isPhoneConsultOrder(order)) ? '' : 'none';
    }
  }

  function canShowPhoneConsultToViewer(service){
    if (!isPhoneConsultService(service)) return true;
    const cfg = PHONE_CONSULT_CFG;
    if (!cfg || !cfg.serviceId) return false;
    if (cfg.isAdmin) return true;
    const mode = String(cfg.mode || 'admin').toLowerCase();
    if (mode === 'public') return true;
    if (mode === 'allowlist') return !!cfg.allowlisted;
    return false;
  }

  function shouldGateBySlotsForViewer(){
    if (ADMIN_PREVIEW_MODE) return false;
    const cfg = PHONE_CONSULT_CFG;
    if (!cfg || !cfg.serviceId) return false;
    const mode = String(cfg.mode || 'admin').toLowerCase();
    if (mode === 'public') return true;
    if (mode === 'allowlist') return true;
    return false;
  }

  function parseSlotStart(item){
    if (!item) return null;
    const direct = item.startISO || item.start || item.slotStart;
    if (direct){
      const t = Date.parse(direct);
      if (!Number.isNaN(t)) return t;
    }
    const date = item.date || item.day || item.slotDate;
    const time = item.time || item.hhmm || item.hh || '';
    if (date && time){
      const iso = `${date}T${time.length === 5 ? time : time.slice(0,2) + ':' + time.slice(2,4)}:00`;
      const t = Date.parse(iso);
      if (!Number.isNaN(t)) return t;
    }
    const key = item.slotKey || '';
    const match = String(key).match(/slot:[^:]+:(\d{4}-\d{2}-\d{2}):(\d{4})/);
    if (match){
      const iso = `${match[1]}T${match[2].slice(0,2)}:${match[2].slice(2)}:00`;
      const t = Date.parse(iso);
      if (!Number.isNaN(t)) return t;
    }
    return null;
  }

  async function getPhoneConsultSlotAvailability(service){
    if (!isPhoneConsultService(service)){
      return { ok:true, enabled:true, hasFuture:true, freeCount:999, reason:'not_phone_consult' };
    }
    const serviceId = resolveServiceId(service) || service.serviceId || '';
    if (!serviceId) return { ok:false, enabled:false, hasFuture:false, freeCount:0, reason:'no_service_id' };
    const cached = __SLOT_AVAIL_CACHE.get(serviceId);
    if (cached && (Date.now() - cached.at) < SLOT_AVAIL_TTL_MS){
      return cached;
    }
    try{
      const res = await fetch(`/api/service/slots?serviceId=${encodeURIComponent(serviceId)}`, { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>null);
      if (!res.ok || !data || data.ok === false){
        if (ADMIN_PREVIEW_MODE){
          const fallback = { at:Date.now(), ok:true, enabled:true, hasFuture:true, freeCount:1, reason:'admin_bypass' };
          __SLOT_AVAIL_CACHE.set(serviceId, fallback);
          return fallback;
        }
        const fallback = { at:Date.now(), ok:false, enabled:false, hasFuture:false, freeCount:0, reason:'fetch_failed' };
        __SLOT_AVAIL_CACHE.set(serviceId, fallback);
        return fallback;
      }
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.slots) ? data.slots : []);
      const enabled = data.enabled !== undefined ? !!data.enabled : true;
      const now = Date.now();
      const futureSlots = [];
      items.forEach(dayItem=>{
        const slots = Array.isArray(dayItem.slots) ? dayItem.slots : (dayItem.time ? [dayItem] : []);
        slots.forEach(slot=>{
          const merged = Object.assign({}, slot);
          if (!merged.date && dayItem.date) merged.date = dayItem.date;
          const ts = parseSlotStart(merged);
          const enabledSlot = merged.enabled !== false;
          if (ts && ts >= now && enabledSlot) futureSlots.push(merged);
        });
      });
      const freeCount = futureSlots.filter(slot=>{
        const status = String(slot.status || '').toLowerCase();
        return (status === 'free' || slot.free === true) && slot.enabled !== false;
      }).length;
      const hasFuture = futureSlots.length > 0;
      let reason = 'ok';
      if (!enabled) reason = 'not_published';
      else if (!hasFuture) reason = 'no_slots';
      else if (freeCount <= 0) reason = 'sold_out';
      const result = { at:Date.now(), ok:true, enabled, hasFuture, freeCount, reason };
      __SLOT_AVAIL_CACHE.set(serviceId, result);
      return result;
    }catch(_){
      if (ADMIN_PREVIEW_MODE){
        const fallback = { at:Date.now(), ok:true, enabled:true, hasFuture:true, freeCount:1, reason:'admin_bypass' };
        __SLOT_AVAIL_CACHE.set(serviceId, fallback);
        return fallback;
      }
      const fallback = { at:Date.now(), ok:false, enabled:false, hasFuture:false, freeCount:0, reason:'fetch_failed' };
      __SLOT_AVAIL_CACHE.set(serviceId, fallback);
      return fallback;
    }
  }

  function getPhoneAddonCheckbox(){
    const row = document.getElementById('svcAddonSummary');
    return row ? row.querySelector('input[type="checkbox"]') : null;
  }

  function isPhoneAddonChecked(){
    const input = getPhoneAddonCheckbox();
    return !!(input && input.checked);
  }

  function applyRequestDateVisibility(cart){
    if (!requestDateWrap) return;
    const list = Array.isArray(cart) ? cart : [];
    const shouldShow = list.some(item => isCandleService(item));
    requestDateWrap.style.display = shouldShow ? '' : 'none';
    if (!shouldShow && requestDateInput) requestDateInput.value = '';
  }

  function isCheckoutPhotoRequired(){
    try{
      const cart = loadCart();
      if (Array.isArray(cart) && cart.length){
        const hit = cart.some(item => {
          const name = String(item.serviceName || '').trim();
          const opt = String(item.optionName || '').trim();
          return /代捐棺/.test(name) || /代捐棺/.test(opt);
        });
        if (hit) return false;
      }
    }catch(_){}
    if (checkoutForm && checkoutForm.dataset && checkoutForm.dataset.photoRequired){
      return checkoutForm.dataset.photoRequired === '1';
    }
    return true;
  }

  function applyPhotoRequirement(required, serviceName){
    const need = !!required;
    const name = String(serviceName || '').trim();
    let skipText = '此服務不需上傳個人照片。';
    let isCoffinDonation = /代捐棺/.test(name);
    if (!isCoffinDonation && checkoutForm && checkoutForm.dataset){
      try{
        const opts = JSON.parse(checkoutForm.dataset.selectedOptions || '[]') || [];
        if (opts.some(opt => /代捐棺/.test(String(opt && opt.name || '')))) {
          isCoffinDonation = true;
        }
      }catch(_){}
    }
    if (name){
      if (/義德善堂/.test(name) && /捐/.test(name)){
        skipText = `${name}不用上傳照片。`;
      }else if (isCoffinDonation){
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
      contactPhotoSkipHint.style.display = (need || isCoffinDonation) ? 'none' : '';
    }
    if (contactPhotoTitle){
      contactPhotoTitle.textContent = need
        ? '上傳個人照片（祈福使用，必填）'
        : '上傳個人照片（祈福使用，可略過）';
    }
    if (isCoffinDonation && contactPhotoWrap) contactPhotoWrap.style.display = 'none';
    if (!need){
      checkoutRitualPhoto = { url:'', name:'' };
      if (contactPhotoInput) contactPhotoInput.value = '';
      if (contactPhotoName) contactPhotoName.textContent = '';
    }
  }

  function applyPhoneConsultCheckoutFields(isPhone, serviceName, photoRequired){
    if (contactNameEnWrap){
      contactNameEnWrap.style.display = isPhone ? 'none' : '';
      if (contactNameEnInput) {
        contactNameEnInput.required = !isPhone;
        if (isPhone) contactNameEnInput.value = '';
      }
    }
    if (contactBirthWrap){
      contactBirthWrap.style.display = isPhone ? 'none' : '';
      if (contactBirthInput){
        contactBirthInput.required = !isPhone;
        if (isPhone) contactBirthInput.value = '';
      }
    }
    if (contactNoteInput){
      if (!notePlaceholderOriginal) notePlaceholderOriginal = contactNoteInput.placeholder || '';
      contactNoteInput.placeholder = isPhone
        ? '可先將要問的問題寫在這裡，或之後至會員中心「我的訂單 → 問與答」內留言。'
        : notePlaceholderOriginal;
      contactNoteInput.required = false;
    }
    if (isPhone){
      applyPhotoRequirement(false, serviceName);
      if (contactPhotoSkipHint){
        contactPhotoSkipHint.textContent = '';
        contactPhotoSkipHint.style.display = 'none';
      }
    }else{
      applyPhotoRequirement(!!photoRequired, serviceName);
    }
    applyCheckoutLabels(!!isPhone);
  }

  function applyCheckoutLabels(isPhone){
    if (cartCheckoutBtn){
      cartCheckoutBtn.textContent = isPhone ? '填寫預約資料' : cartCheckoutLabelDefault;
    }
    if (checkoutNextBtn){
      checkoutNextBtn.textContent = isPhone ? '填寫預約資料' : checkoutNextLabelDefault;
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
      const promoUnit = Number(item && item.promoActive ? item.promoDisplayPrice : 0);
      const unit = promoUnit > 0 ? promoUnit : (Number(item.basePrice||0) + Number(item.optionPrice||0));
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

  function getCartItemOptionLabel(item){
    const base = item.optionName || '標準服務';
    if (item.addonSummary) return `${base} + ${item.addonSummary}`;
    return base;
  }

  function getHoldOwnerKey(){
    try{
      if (window.authState && typeof window.authState.getProfile === 'function'){
        const p = window.authState.getProfile();
        const email = p && p.email ? String(p.email).trim().toLowerCase() : '';
        const uid = p && (p.id || p.uid) ? String(p.id || p.uid).trim() : '';
        return email || uid || 'anon';
      }
    }catch(_){}
    return 'anon';
  }

  function updateHoldOwnerKey(profile){
    const email = profile && profile.email ? String(profile.email).trim().toLowerCase() : '';
    const uid = profile && (profile.id || profile.uid) ? String(profile.id || profile.uid).trim() : '';
    const next = email || uid || 'anon';
    if (HOLD_OWNER_KEY !== next){
      HOLD_OWNER_KEY = next;
    CURRENT_DETAIL_SLOT.slotKey = '';
    CURRENT_DETAIL_SLOT.slotHoldToken = '';
    CURRENT_DETAIL_SLOT.slotStart = '';
    CURRENT_DETAIL_SLOT.holdUntilMs = 0;
    CURRENT_DETAIL_SLOT.pendingSlotKey = '';
    CURRENT_DETAIL_SLOT.pendingSlotStart = '';
      // 清除購物車中的時段資料，避免不同帳號看到倒數
      const cart = loadCart();
      if (Array.isArray(cart) && cart.length){
        const cleaned = cart.map(item=>{
          if (!isPhoneConsultService(item)) return item;
          return Object.assign({}, item, { slotKey:'', slotHoldToken:'', slotStart:'', slotHoldUntilMs: 0 });
        });
        saveCart(cleaned);
        renderCartPanel();
      }
    }
  }

  function holdStorageKey(serviceId){
    const owner = HOLD_OWNER_KEY || getHoldOwnerKey();
    return SLOT_HOLD_KEY_PREFIX + owner + ':' + String(serviceId || '').trim();
  }

  function saveHoldToStorage(serviceId, hold){
    try{
      if (!serviceId) return;
      localStorage.setItem(holdStorageKey(serviceId), JSON.stringify(hold || {}));
    }catch(_){}
  }

  function loadHoldFromStorage(serviceId){
    try{
      if (!serviceId) return null;
      const raw = localStorage.getItem(holdStorageKey(serviceId));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : null;
    }catch(_){
      return null;
    }
  }

  function clearHoldFromStorage(serviceId){
    try{
      if (!serviceId) return;
      localStorage.removeItem(holdStorageKey(serviceId));
    }catch(_){}
  }

  function saveSlotCache(serviceId, items){
    try{
      if (!serviceId) return;
      const key = SLOT_CACHE_PREFIX + String(serviceId || '').trim();
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), items: items || [] }));
    }catch(_){}
  }

  function loadSlotCache(serviceId){
    try{
      if (!serviceId) return null;
      const key = SLOT_CACHE_PREFIX + String(serviceId || '').trim();
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return null;
      if (data.at && (Date.now() - Number(data.at)) > SLOT_CACHE_TTL_MS){
        sessionStorage.removeItem(key);
        return null;
      }
      return data.items;
    }catch(_){
      return null;
    }
  }

  function getConsultPackKeyFromStorage(){
    try{
      return localStorage.getItem('svcConsultPack') || '';
    }catch(_){
      return '';
    }
  }

  function getConsultAddonFromStorage(){
    try{
      return localStorage.getItem('svcConsultAddon') === '1';
    }catch(_){
      return false;
    }
  }

  function getTzDateParts(tz, date){
    try{
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = fmt.formatToParts(date || new Date());
      const pick = type => {
        const found = parts.find(p => p.type === type);
        return found ? found.value : '';
      };
      return {
        y: Number(pick('year')),
        m: Number(pick('month')),
        d: Number(pick('day'))
      };
    }catch(_){
      return null;
    }
  }

  function formatDateParts(parts){
    if (!parts) return '';
    const y = String(parts.y || '').padStart(4, '0');
    const m = String(parts.m || '').padStart(2, '0');
    const d = String(parts.d || '').padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysInTz(tz, days){
    const parts = getTzDateParts(tz);
    if (!parts || !parts.y || !parts.m || !parts.d) return '';
    const baseUtc = Date.UTC(parts.y, parts.m - 1, parts.d);
    const next = new Date(baseUtc + (days * 86400000));
    const nextParts = getTzDateParts(tz, next);
    return formatDateParts(nextParts);
  }

  function getMinSlotDateStr(){
    return addDaysInTz('Asia/Bangkok', 1) || (()=> {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();
  }

  function addDaysToDateStr(dateStr, delta){
    const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (!y || !m || !d) return '';
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(delta || 0));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function buildPlaceholderSlots(dateStr){
    const slots = [];
    for (let h = 13; h <= 19; h += 1){
      const hh = String(h).padStart(2, '0');
      slots.push({ slotKey: `slot:placeholder:${dateStr}:${hh}00`, time: `${hh}:00`, status: 'free', enabled: false });
      slots.push({ slotKey: `slot:placeholder:${dateStr}:${hh}30`, time: `${hh}:30`, status: 'free', enabled: false });
    }
    return slots;
  }

  function buildPlaceholderDays(startDate, count){
    const list = [];
    for (let i = 0; i < count; i += 1){
      const date = addDaysToDateStr(startDate, i);
      if (!date) continue;
      list.push({ date, slots: buildPlaceholderSlots(date) });
    }
    return list;
  }

  function filterFutureSlotItems(items){
    const minDate = getMinSlotDateStr();
    return (items || []).filter(day => day && day.date && day.date >= minDate);
  }

  function ensurePlaceholderSlots(){
    const minDate = getMinSlotDateStr();
    if (!minDate) return;
    slotPlaceholderMode = true;
    if (!slotItems.length){
      slotItems = buildPlaceholderDays(minDate, SLOT_DAYS_STEP);
    }
    if (!slotItems.length) return;
    slotLastDate = slotItems[slotItems.length - 1].date || '';
    if (slotDaysEl) slotDaysEl.style.display = '';
    if (slotGridEl) slotGridEl.style.display = '';
    const activeDate = renderSlotDays(slotItems);
    const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
    if (activeItem) renderSlotGrid(activeItem);
    setSlotStateText('目前暫無可預約時段', true);
    if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
      detailAddBtn.disabled = true;
      detailAddBtn.textContent = '目前無法預約';
    }
  }

  function formatSlotDayLabel(dateStr){
    const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return dateStr || '';
    return `${match[2]}-${match[3]}`;
  }

  function saveConsultState(packKey, addon){
    try{
      if (packKey) localStorage.setItem('svcConsultPack', packKey);
      localStorage.setItem('svcConsultAddon', addon ? '1' : '0');
    }catch(_){}
  }

  function clearConsultState(){
    CONSULT_PACK = null;
    CONSULT_ADDON = false;
  }

  function resolveConsultPack(key){
    if (key === 'en'){
      return { key:'en', label:'英文翻譯', price: Number(CONSULT_PACK_PRICES.en || 0) };
    }
    return { key:'zh', label:'中文翻譯', price: Number(CONSULT_PACK_PRICES.zh || 0) };
  }

  function getPhoneBasePrice(){
    return PHONE_BASE_PRICE_OVERRIDE || PHONE_BASE_PRICE;
  }

  function getConsultPackDelta(pack){
    if (!pack) return 0;
    const target = pack.key === 'zh' ? Number(CONSULT_PACK_PRICES.zh || 0) : Number(CONSULT_PACK_PRICES.en || 0);
    if (!Number.isFinite(target) || target <= 0) return 0;
    return target - getPhoneBasePrice();
  }

  function ensureConsultAddonUI(){
    if (!consultAddonInput) return;
    if (consultAddonInput.tagName === 'SELECT') return;
    const wrap = consultAddonInput.closest('.svc-pack-addon');
    if (!wrap) return;
    const hint = wrap.querySelector('.addon-hint');
    const hintNode = hint ? hint.cloneNode(true) : null;
    wrap.innerHTML = '';
    const label = document.createElement('label');
    label.className = 'addon-label';
    label.textContent = '加購（選填）';
    const select = document.createElement('select');
    select.id = 'svcConsultAddonSummary';
    select.className = 'svc-addon-select';
    select.innerHTML = '<option value="0">不加購</option><option value="1">加購：轉譯＋重點摘要整理 + NT$ 500</option>';
    wrap.appendChild(label);
    wrap.appendChild(select);
    if (hintNode) wrap.appendChild(hintNode);
    consultAddonInput = select;
  }

  function syncConsultPackPrices(service){
    if (!service) return;
    const options = Array.isArray(service.options) ? service.options : [];
    const enOpt = options.find(opt => /英文/.test(String(opt.name || '')));
    const zhOpt = options.find(opt => /中文/.test(String(opt.name || '')));
    const enPrice = readOptionPrice(enOpt);
    const zhPrice = readOptionPrice(zhOpt);
    const serviceBase = parsePriceValue(service.price);
    const base = Number.isFinite(enPrice) ? enPrice : (Number.isFinite(serviceBase) ? serviceBase : 0);
    PHONE_BASE_PRICE_OVERRIDE = base;
    CONSULT_PACK_PRICES = {
      en: Number.isFinite(enPrice) ? enPrice : base,
      zh: Number.isFinite(zhPrice) ? zhPrice : 0
    };
    consultPackPills.forEach(btn=>{
      let price = btn.dataset.pack === 'zh' ? CONSULT_PACK_PRICES.zh : CONSULT_PACK_PRICES.en;
      const promo = getPromoDisplayPrice(service, btn.dataset.pack);
      if (promo && Number.isFinite(promo) && promo > 0 && promo < price){
        price = promo;
      }
      const priceEl = btn.querySelector('.pill-price');
      if (priceEl) priceEl.textContent = formatTWD(price);
    });
  }

  function getConsultAddonValue(){
    if (!consultAddonInput) return false;
    if (consultAddonInput.tagName === 'SELECT') return String(consultAddonInput.value || '0') === '1';
    return !!consultAddonInput.checked;
  }

  function setConsultAddonValue(on){
    if (!consultAddonInput) return;
    if (consultAddonInput.tagName === 'SELECT'){
      consultAddonInput.value = on ? '1' : '0';
    }else{
      consultAddonInput.checked = !!on;
    }
  }

  function applyConsultPack(key){
    CONSULT_PACK = resolveConsultPack(key);
    consultPackPills.forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.pack === CONSULT_PACK.key);
    });
    saveConsultState(CONSULT_PACK.key, CONSULT_ADDON);
    if (detailDataset && isPhoneConsultService(detailDataset)){
      applyPhonePackSelection(detailDataset, CONSULT_PACK.key);
    }
    updateDetailPrice();
  }

  function initConsultPackUI(service){
    if (!consultPackWrap) return;
    if (!isPhoneConsultService(service)){
      consultPackWrap.style.display = 'none';
      clearConsultState();
      return;
    }
    ensureConsultAddonUI();
    syncConsultPackPrices(service);
    consultPackWrap.style.display = '';
    const savedKey = getConsultPackKeyFromStorage();
    const defaultKey = savedKey === 'en' || savedKey === 'zh' ? savedKey : 'zh';
    CONSULT_ADDON = getConsultAddonFromStorage();
    setConsultAddonValue(CONSULT_ADDON);
    applyConsultPack(defaultKey);
    consultPackPills.forEach(btn=>{
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', ()=>{
        applyConsultPack(btn.dataset.pack);
      });
    });
    if (consultAddonInput && !consultAddonInput.__bound){
      consultAddonInput.__bound = true;
      consultAddonInput.addEventListener('change', ()=>{
        CONSULT_ADDON = getConsultAddonValue();
        saveConsultState(CONSULT_PACK ? CONSULT_PACK.key : defaultKey, CONSULT_ADDON);
        updateDetailPrice();
      });
    }
  }
  function resetSlotState(){
    if (CURRENT_DETAIL_SLOT.timerId){
      clearInterval(CURRENT_DETAIL_SLOT.timerId);
    }
    CURRENT_DETAIL_SLOT = {
      serviceId: '',
      slotKey: '',
      slotHoldToken: '',
      slotStart: '',
      holdUntilMs: 0,
      timerId: null,
      pendingSlotKey: '',
      pendingSlotStart: ''
    };
    if (slotGridEl) slotGridEl.innerHTML = '';
    if (slotDaysEl) slotDaysEl.innerHTML = '';
    if (slotStateEl){
      slotStateEl.textContent = '';
      slotStateEl.classList.remove('ok','err');
    }
    slotItems = [];
    slotLastDate = '';
    slotDaysPage = 0;
    slotHasMore = true;
    slotPlaceholderMode = false;
    if (slotMoreBtn){
      slotMoreBtn.style.display = 'none';
      slotMoreBtn.disabled = false;
      slotMoreBtn.textContent = '載入更多';
    }
  }

  function clearSlotFromCart(serviceId){
    const cart = loadCart();
    if (!cart.length) return;
    let changed = false;
    const next = cart.map(item=>{
      if (!item || String(item.serviceId || '') !== String(serviceId || '')) return item;
      if (item.slotKey || item.slotHoldToken || item.slotStart){
        changed = true;
        return Object.assign({}, item, { slotKey:'', slotHoldToken:'', slotStart:'', slotHoldUntilMs: 0 });
      }
      return item;
    });
    if (changed) saveCart(next);
  }

  function getActiveHold(serviceId){
    const hold = loadHoldFromStorage(serviceId);
    if (!hold) return null;
    const until = Number(hold.holdUntilMs || 0);
    if (!until || Date.now() >= until){
      clearHoldFromStorage(serviceId);
      return null;
    }
    return hold;
  }

  function syncHoldWithCart(cart){
    const list = Array.isArray(cart) ? cart : [];
    if (!list.length) return { cart: list, changed: false };
    let changed = false;
    const next = list.map(item=>{
      if (!item || !isPhoneConsultService(item)) return item;
      const serviceId = String(item.serviceId || '').trim();
      if (!serviceId) return item;
      const hold = getActiveHold(serviceId);
      if (hold){
        if (!item.slotHoldToken && hold.slotHoldToken){
          changed = true;
          return Object.assign({}, item, {
            slotKey: String(hold.slotKey || ''),
            slotHoldToken: String(hold.slotHoldToken || ''),
            slotStart: String(hold.slotStart || ''),
            slotHoldUntilMs: Number(hold.holdUntilMs || 0)
          });
        }
        if (item.slotHoldToken && !hold.slotHoldToken){
          saveHoldToStorage(serviceId, {
            serviceId,
            slotKey: item.slotKey || '',
            slotHoldToken: item.slotHoldToken || '',
            slotStart: item.slotStart || '',
            holdUntilMs: Number(item.slotHoldUntilMs || 0)
          });
        }
        return item;
      }
      if (item.slotHoldToken && Number(item.slotHoldUntilMs || 0) > Date.now()){
        saveHoldToStorage(serviceId, {
          serviceId,
          slotKey: item.slotKey || '',
          slotHoldToken: item.slotHoldToken || '',
          slotStart: item.slotStart || '',
          holdUntilMs: Number(item.slotHoldUntilMs || 0)
        });
        return item;
      }
      if (item.slotHoldToken || item.slotKey || item.slotStart){
        changed = true;
        return Object.assign({}, item, { slotKey:'', slotHoldToken:'', slotStart:'', slotHoldUntilMs: 0 });
      }
      if (hold) clearHoldFromStorage(serviceId);
      return item;
    });
    return { cart: next, changed };
  }

  function setSlotStateText(msg, isError){
    if (!slotStateEl) return;
    slotStateEl.textContent = msg || '';
    slotStateEl.classList.toggle('err', !!isError);
    slotStateEl.classList.toggle('ok', !isError && !!msg);
  }

  function parseSlotKeyDateTime(slotKey){
    const raw = String(slotKey || '');
    const match = raw.match(/slot:[^:]+:(\d{4}-\d{2}-\d{2}):(\d{4})/);
    if (!match) return { date:'', time:'' };
    const time = match[2] ? (match[2].slice(0,2) + ':' + match[2].slice(2,4)) : '';
    return { date: match[1] || '', time };
  }

  function getPendingSlotForHold(){
    const slotKey = CURRENT_DETAIL_SLOT.pendingSlotKey || '';
    if (!slotKey) return null;
    let date = '';
    let time = '';
    if (CURRENT_DETAIL_SLOT.pendingSlotStart){
      const parts = CURRENT_DETAIL_SLOT.pendingSlotStart.split(' ');
      date = parts[0] || '';
      time = parts[1] || '';
    }
    if (!date || !time){
      const parsed = parseSlotKeyDateTime(slotKey);
      date = date || parsed.date;
      time = time || parsed.time;
    }
    return { slotKey, __date: date, time };
  }

  async function requestHold(serviceId, slotKey){
    if (!serviceId || !slotKey) return { ok:false, error:'missing' };
    try{
      const res = await fetch('/api/service/slot/hold', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ serviceId, slotKey })
      });
      const data = await res.json().catch(()=>({}));
      if (res.status === 401){
        return { ok:false, error:'UNAUTHORIZED' };
      }
      if (!res.ok || !data || data.ok === false){
        return { ok:false, error:(data && data.error) || 'SLOT_CONFLICT' };
      }
      return { ok:true, data };
    }catch(_){
      return { ok:false, error:'network_error' };
    }
  }

  async function releaseHoldOnServer(serviceId, slotKey, slotHoldToken){
    if (!serviceId || !slotKey || !slotHoldToken){
      return { ok:true, released:false, reason:'missing' };
    }
    try{
      const res = await fetch('/api/service/slot/release', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ serviceId, slotKey, slotHoldToken })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || data.ok === false){
        return { ok:false, released:false, error:(data && data.error) || 'release_failed' };
      }
      return { ok:true, released:!!data.released, reason:data.reason || '' };
    }catch(_){
      return { ok:false, released:false, error:'network_error' };
    }
  }

  function mapUserErrorMessage(code){
    const key = String(code || '').toUpperCase();
    if (key === 'SLOT_CONFLICT' || key === 'SLOT_UNAVAILABLE') return '該時段目前已暫時被預訂保留中（若未完成訂單建立會自動釋放），請於 15 分鐘後再查看';
    if (key === 'SLOT_EXPIRED') return '此時段已過期，請重新選擇';
    if (key === 'TOO_LATE') return '已超過可改期時間';
    if (key === 'ALREADY_REQUESTED') return '已送出改期申請';
    if (key === 'UNAUTHORIZED') return '請先登入';
    if (key === 'SLOT_NOT_PUBLISHED') return '此時段尚未開放';
    if (key === 'SLOT_HOLD_EXPIRED') return '此時段已過期，請重新選擇';
    if (key === 'HOLD_LIMIT_REACHED') return '你已有一筆時段保留中，請先完成訂單或等待 15 分鐘後再試';
    if (key === 'INVALID_SLOT') return '時段資訊不一致，請重新整理後再試';
    if (key === 'SLOT_REQUIRED_BUT_NOT_CONFIGURED') return '目前無法預約此時段，請稍後再試';
    return '';
  }

  function restoreHoldForService(serviceId){
    const hold = getActiveHold(serviceId);
    if (!hold) return false;
    const until = Number(hold.holdUntilMs || 0);
    CURRENT_DETAIL_SLOT.serviceId = String(hold.serviceId || serviceId || '');
    CURRENT_DETAIL_SLOT.slotKey = String(hold.slotKey || '');
    CURRENT_DETAIL_SLOT.slotHoldToken = String(hold.slotHoldToken || '');
    CURRENT_DETAIL_SLOT.slotStart = String(hold.slotStart || '');
    CURRENT_DETAIL_SLOT.holdUntilMs = until;
    startHoldTimer();
    setSlotStateText('已恢復保留的時段', false);
    if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
      detailAddBtn.disabled = false;
      detailAddBtn.textContent = '加入購物車';
    }
    return true;
  }

  function normalizeSlots(data){
    if (!data) return [];
    if (Array.isArray(data.slots)) return data.slots;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }

  function buildSlotsUrl(qs){
    try{
      const url = new URL('/api/service/slots', window.location.origin);
      url.search = qs.toString();
      return url.toString();
    }catch(_){
      return '/api/service/slots?' + qs.toString();
    }
  }

  async function fetchSlots(serviceId, dateFrom, days){
    const qs = new URLSearchParams();
    qs.set('serviceId', serviceId);
    if (dateFrom) qs.set('dateFrom', dateFrom);
    qs.set('days', String(days || 7));
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timer = null;
    if (controller){
      timer = setTimeout(()=> controller.abort(), 12000);
    }
    try{
      const url = buildSlotsUrl(qs);
      const res = await fetch(url, {
        credentials:'include',
        cache:'no-store',
        signal: controller ? controller.signal : undefined
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok){
        console.warn('[slots] fetch failed', res.status, url, data);
      }
      return { res, data };
    }finally{
      if (timer) clearTimeout(timer);
    }
  }

  function renderSlotDays(items){
    if (!slotDaysEl) return '';
    let list = Array.isArray(items) ? items : [];
    if (!list.length){
      const minDate = getMinSlotDateStr();
      slotPlaceholderMode = true;
      slotItems = minDate ? buildPlaceholderDays(minDate, SLOT_DAYS_STEP) : [];
      list = slotItems;
      slotLastDate = list.length ? (list[list.length - 1].date || '') : '';
    }
    const totalPages = Math.max(1, Math.ceil(list.length / SLOT_DAYS_STEP));
    if (slotDaysPage < 0) slotDaysPage = 0;
    if (slotDaysPage > totalPages - 1) slotDaysPage = totalPages - 1;
    const start = slotDaysPage * SLOT_DAYS_STEP;
    const pageItems = list.slice(start, start + SLOT_DAYS_STEP);
    slotDaysEl.innerHTML = '';
    const active = getActiveSlotDate();
    let activeDate = '';
    pageItems.forEach((item, idx)=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = active ? item.date === active : idx === 0;
      btn.className = 'svc-slot-day' + (isActive ? ' is-active' : '');
      btn.textContent = formatSlotDayLabel(item.date || '');
      btn.dataset.date = item.date || '';
      btn.addEventListener('click', ()=>{
        Array.from(slotDaysEl.querySelectorAll('.svc-slot-day')).forEach(node=> node.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderSlotGrid(item);
      });
      if (isActive && item.date) activeDate = item.date;
      slotDaysEl.appendChild(btn);
    });
    if (slotDaysPrev) slotDaysPrev.disabled = slotDaysPage <= 0;
    if (slotDaysNext){
      const atEnd = slotDaysPage >= totalPages - 1;
      slotDaysNext.disabled = atEnd && !slotHasMore;
    }
    return activeDate || (pageItems[0] && pageItems[0].date) || (items[0] && items[0].date) || '';
  }

  function getActiveSlotDate(){
    if (!slotDaysEl) return '';
    const active = slotDaysEl.querySelector('.svc-slot-day.is-active');
    return active ? (active.dataset.date || '') : '';
  }

  function getNextDateStr(dateStr){
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  function mergeSlotDays(base, extra){
    const map = new Map();
    (base || []).forEach(day=>{
      if (day && day.date) map.set(day.date, day);
    });
    (extra || []).forEach(day=>{
      if (!day || !day.date) return;
      if (!map.has(day.date)){
        map.set(day.date, day);
        return;
      }
      const existing = map.get(day.date);
      const existingSlots = Array.isArray(existing && existing.slots) ? existing.slots : [];
      const nextSlots = Array.isArray(day && day.slots) ? day.slots : [];
      const existingIsPlaceholder = existingSlots.every(slot => String(slot.slotKey || '').startsWith('slot:placeholder'));
      const nextIsReal = nextSlots.some(slot => !String(slot.slotKey || '').startsWith('slot:placeholder'));
      if (existingIsPlaceholder && nextIsReal){
        map.set(day.date, day);
      }
    });
    return Array.from(map.values()).sort((a,b)=> String(a.date || '').localeCompare(String(b.date || '')));
  }

  async function loadMoreSlots(targetPage){
    if (!detailDataset) return;
    const serviceId = resolveServiceId(detailDataset);
    if (!serviceId) return;
    if (slotPlaceholderMode){
      const nextDate = addDaysToDateStr(slotLastDate, 1);
      if (!nextDate) return;
      const moreItems = buildPlaceholderDays(nextDate, SLOT_DAYS_STEP);
      slotItems = mergeSlotDays(slotItems, moreItems);
      slotLastDate = slotItems.length ? (slotItems[slotItems.length - 1].date || '') : nextDate;
      if (Number.isInteger(targetPage)) slotDaysPage = targetPage;
      const activeDate = renderSlotDays(slotItems);
      const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
      if (activeItem) renderSlotGrid(activeItem);
      setSlotStateText('目前暫無可預約時段', true);
      return;
    }
    const nextDate = getNextDateStr(slotLastDate);
    if (!nextDate) return;
    if (slotMoreBtn){
      slotMoreBtn.disabled = true;
      slotMoreBtn.textContent = '載入中…';
    }
    try{
      const result = await fetchSlots(serviceId, nextDate, SLOT_DAYS_STEP);
      const data = result.data || {};
      if (!result.res.ok || !data || data.ok === false){
        const fallback = buildPlaceholderDays(nextDate, SLOT_DAYS_STEP);
        slotItems = mergeSlotDays(slotItems, fallback);
        slotLastDate = slotItems.length ? (slotItems[slotItems.length - 1].date || '') : nextDate;
        slotPlaceholderMode = true;
        if (Number.isInteger(targetPage)) slotDaysPage = targetPage;
        const activeDate = renderSlotDays(slotItems);
        const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
        if (activeItem) renderSlotGrid(activeItem);
        setSlotStateText('目前暫無可預約時段', true);
        return;
      }
      const moreItems = normalizeSlots(data);
      if (!moreItems.length){
        const fallback = buildPlaceholderDays(nextDate, SLOT_DAYS_STEP);
        slotItems = mergeSlotDays(slotItems, fallback);
        slotLastDate = slotItems.length ? (slotItems[slotItems.length - 1].date || '') : nextDate;
        slotPlaceholderMode = true;
        if (Number.isInteger(targetPage)) slotDaysPage = targetPage;
        const activeDate = renderSlotDays(slotItems);
        const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
        if (activeItem) renderSlotGrid(activeItem);
        setSlotStateText('目前暫無可預約時段', true);
        return;
      }
      slotItems = filterFutureSlotItems(mergeSlotDays(slotItems, moreItems));
      slotLastDate = slotItems.length ? (slotItems[slotItems.length - 1].date || '') : nextDate;
      if (Number.isInteger(targetPage)) slotDaysPage = targetPage;
      const activeDate = renderSlotDays(slotItems);
      const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
      if (activeItem) renderSlotGrid(activeItem);
      setSlotStateText('');
      if (slotMoreBtn){
        slotMoreBtn.disabled = false;
        slotMoreBtn.textContent = '載入更多';
      }
    }catch(_){
      const fallback = buildPlaceholderDays(nextDate, SLOT_DAYS_STEP);
      slotItems = mergeSlotDays(slotItems, fallback);
      slotLastDate = slotItems.length ? (slotItems[slotItems.length - 1].date || '') : nextDate;
      slotPlaceholderMode = true;
      if (Number.isInteger(targetPage)) slotDaysPage = targetPage;
      const activeDate = renderSlotDays(slotItems);
      const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
      if (activeItem) renderSlotGrid(activeItem);
      setSlotStateText('目前暫無可預約時段', true);
    }finally{
      if (slotMoreBtn && slotMoreBtn.textContent !== '沒有更多時段'){
        slotMoreBtn.disabled = false;
      }
    }
  }

  function setPendingSlot(slot){
    if (!slot || !slot.slotKey) return;
    const date = slot.__date || slot.date || '';
    const start = date ? `${date} ${slot.time || ''}`.trim() : '';
    CURRENT_DETAIL_SLOT.pendingSlotKey = slot.slotKey;
    CURRENT_DETAIL_SLOT.pendingSlotStart = start;
    if (slotGridEl){
      Array.from(slotGridEl.querySelectorAll('.svc-slot-btn')).forEach(btn=>{
        const key = btn.dataset.slotKey || '';
        btn.classList.toggle('is-held', key && key === slot.slotKey);
      });
    }
    if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
      detailAddBtn.disabled = false;
      detailAddBtn.textContent = '加入購物車';
    }
    if (start){
      setSlotStateText(`已選擇 ${start}，按填寫預約資料後保留 15 分鐘`, false);
    }else{
      setSlotStateText('已選擇時段，按填寫預約資料後保留 15 分鐘', false);
    }
  }

  function updateAddBtnStateForSlot(){
    if (!detailAddBtn || detailAddBtn.textContent === '已結束') return;
    const hasSelection = !!(CURRENT_DETAIL_SLOT.slotHoldToken || CURRENT_DETAIL_SLOT.pendingSlotKey);
    detailAddBtn.disabled = !hasSelection;
    detailAddBtn.textContent = '加入購物車';
  }

  function renderSlotGrid(item){
    if (!slotGridEl) return;
    slotGridEl.innerHTML = '';
    let slots = Array.isArray(item && item.slots) ? item.slots : [];
    if (!slots.length && item && item.date){
      slots = buildPlaceholderSlots(item.date);
    }
    slots.forEach(slot=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'svc-slot-btn';
      const status = String(slot.status || 'free');
      const enabled = slot.enabled !== false;
      btn.textContent = slot.time || '--:--';
      if (slot.slotKey) btn.dataset.slotKey = slot.slotKey;
      if (!enabled || status !== 'free'){
        btn.classList.add('is-disabled');
        if (status === 'booked') btn.classList.add('is-booked');
        if (status === 'blocked') btn.classList.add('is-blocked');
        if (status === 'held') btn.classList.add('is-held-other');
      }
      if (CURRENT_DETAIL_SLOT.slotHoldToken && CURRENT_DETAIL_SLOT.slotKey && slot.slotKey === CURRENT_DETAIL_SLOT.slotKey){
        btn.classList.add('is-held');
        btn.classList.add('is-disabled');
        btn.disabled = true;
      }else if (CURRENT_DETAIL_SLOT.pendingSlotKey && slot.slotKey === CURRENT_DETAIL_SLOT.pendingSlotKey){
        btn.classList.add('is-held');
      }
      btn.addEventListener('click', ()=>{
        if (!enabled || status !== 'free'){
          if (status === 'held'){
            setSlotStateText(mapUserErrorMessage('SLOT_UNAVAILABLE'), true);
          }
          return;
        }
        if (CURRENT_DETAIL_SLOT.slotHoldToken && CURRENT_DETAIL_SLOT.slotKey && CURRENT_DETAIL_SLOT.slotKey !== slot.slotKey){
          setSlotStateText('已有保留時段，請先按修改時間', true);
          return;
        }
        setPendingSlot(Object.assign({ __date: item.date || '' }, slot));
      });
      slotGridEl.appendChild(btn);
    });
  }

  function startHoldTimer(){
    if (!CURRENT_DETAIL_SLOT.holdUntilMs) return;
    if (CURRENT_DETAIL_SLOT.timerId) clearInterval(CURRENT_DETAIL_SLOT.timerId);
    CURRENT_DETAIL_SLOT.timerId = setInterval(()=>{
      const remain = CURRENT_DETAIL_SLOT.holdUntilMs - Date.now();
      if (remain <= 0){
        clearInterval(CURRENT_DETAIL_SLOT.timerId);
        CURRENT_DETAIL_SLOT.timerId = null;
        clearHoldFromStorage(CURRENT_DETAIL_SLOT.serviceId);
        clearSlotFromCart(CURRENT_DETAIL_SLOT.serviceId);
        CURRENT_DETAIL_SLOT.slotKey = '';
        CURRENT_DETAIL_SLOT.slotHoldToken = '';
        CURRENT_DETAIL_SLOT.holdUntilMs = 0;
        CURRENT_DETAIL_SLOT.pendingSlotKey = '';
        CURRENT_DETAIL_SLOT.pendingSlotStart = '';
        setSlotStateText('保留已到期，請重新選擇', true);
        if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
          detailAddBtn.disabled = true;
          detailAddBtn.textContent = '目前無法預約';
        }
        return;
      }
      const mins = Math.floor(remain / 60000);
      const secs = Math.floor((remain % 60000) / 1000);
      const mm = String(mins).padStart(2,'0');
      const ss = String(secs).padStart(2,'0');
      setSlotStateText(`已保留此時段 ${mm}:${ss}（請於倒數內完成下單）`, false);
    }, 1000);
  }

  async function holdSlot(slot){
    if (!slot || !slot.slotKey || !detailDataset) return false;
    const serviceId = resolveServiceId(detailDataset);
    setSlotStateText('保留中…', false);
    if (CURRENT_DETAIL_SLOT.slotHoldToken && CURRENT_DETAIL_SLOT.slotKey && CURRENT_DETAIL_SLOT.slotKey !== slot.slotKey){
      const released = await releaseHoldOnServer(serviceId, CURRENT_DETAIL_SLOT.slotKey, CURRENT_DETAIL_SLOT.slotHoldToken);
      if (!released.ok){
        setSlotStateText('目前無法釋放原本時段，請稍後再試', true);
        return false;
      }
      if (released.released || released.reason === 'hold_not_found'){
        clearHoldFromStorage(serviceId);
        clearSlotFromCart(serviceId);
        CURRENT_DETAIL_SLOT.slotKey = '';
        CURRENT_DETAIL_SLOT.slotHoldToken = '';
        CURRENT_DETAIL_SLOT.holdUntilMs = 0;
        CURRENT_DETAIL_SLOT.slotStart = '';
      }
    }
    try{
      const res = await fetch('/api/service/slot/hold', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ serviceId, slotKey: slot.slotKey })
      });
      const data = await res.json().catch(()=>({}));
      if (res.status === 401){
        setSlotStateText(mapUserErrorMessage('UNAUTHORIZED') || '請先登入後再預約時段', true);
        if (window.authState && typeof window.authState.login === 'function'){
          window.authState.login();
        }
        return false;
      }
      if (!res.ok || !data || data.ok === false){
        const err = (data && data.error) || 'SLOT_CONFLICT';
        const msg = mapUserErrorMessage(err) || '此時段目前無法預約，請稍後再試';
        setSlotStateText(msg, true);
        return false;
      }
      CURRENT_DETAIL_SLOT.serviceId = serviceId;
      CURRENT_DETAIL_SLOT.slotKey = data.slotKey || slot.slotKey;
      CURRENT_DETAIL_SLOT.slotHoldToken = data.holdToken || '';
      CURRENT_DETAIL_SLOT.holdUntilMs = Number(data.heldUntil || 0) || 0;
      const slotDate = slot.__date || slot.date || '';
      CURRENT_DETAIL_SLOT.slotStart = slotDate ? `${slotDate} ${slot.time || ''}`.trim() : '';
      CURRENT_DETAIL_SLOT.pendingSlotKey = '';
      CURRENT_DETAIL_SLOT.pendingSlotStart = '';
      saveHoldToStorage(serviceId, {
        serviceId,
        slotKey: CURRENT_DETAIL_SLOT.slotKey,
        slotHoldToken: CURRENT_DETAIL_SLOT.slotHoldToken,
        slotStart: CURRENT_DETAIL_SLOT.slotStart,
        holdUntilMs: CURRENT_DETAIL_SLOT.holdUntilMs
      });
      startHoldTimer();
      if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
        detailAddBtn.disabled = false;
        detailAddBtn.textContent = '加入購物車';
      }
      if (slotGridEl){
        Array.from(slotGridEl.querySelectorAll('.svc-slot-btn')).forEach(btn=>{
          btn.classList.toggle('is-held', btn.textContent === slot.time);
        });
      }
      return true;
    }catch(_){
      setSlotStateText('保留失敗，請稍後再試', true);
      return false;
    }
  }

  function setRescheduleStateText(msg, isError){
    if (!rescheduleStateEl) return;
    rescheduleStateEl.textContent = msg || '';
    rescheduleStateEl.classList.toggle('err', !!isError);
    rescheduleStateEl.classList.toggle('ok', !isError && !!msg);
  }

  function renderRescheduleDays(items){
    if (!rescheduleDaysEl) return;
    rescheduleDaysEl.innerHTML = '';
    items.forEach((item, idx)=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'svc-slot-day' + (idx === 0 ? ' is-active' : '');
      btn.textContent = item.date || '';
      btn.dataset.date = item.date || '';
      btn.addEventListener('click', ()=>{
        Array.from(rescheduleDaysEl.querySelectorAll('.svc-slot-day')).forEach(node=> node.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderRescheduleGrid(item);
      });
      rescheduleDaysEl.appendChild(btn);
    });
  }

  function renderRescheduleGrid(item){
    if (!rescheduleGridEl) return;
    rescheduleGridEl.innerHTML = '';
    const slots = Array.isArray(item && item.slots) ? item.slots : [];
    slots.forEach(slot=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'svc-slot-btn';
      const status = String(slot.status || 'free');
      const enabled = slot.enabled !== false;
      btn.textContent = slot.time || '--:--';
      if (!enabled || status !== 'free'){
        btn.classList.add('is-disabled');
        if (status === 'booked') btn.classList.add('is-booked');
        if (status === 'blocked') btn.classList.add('is-blocked');
      }
      if (rescheduleContext.slotKey && slot.slotKey === rescheduleContext.slotKey){
        btn.classList.add('is-held');
      }
      btn.addEventListener('click', ()=>{
        if (!enabled || status !== 'free') return;
        rescheduleContext.slotKey = slot.slotKey || '';
        rescheduleContext.selectedDate = item.date || '';
        Array.from(rescheduleGridEl.querySelectorAll('.svc-slot-btn')).forEach(node=> node.classList.remove('is-held'));
        btn.classList.add('is-held');
        setRescheduleStateText('已選取改期時段', false);
      });
      rescheduleGridEl.appendChild(btn);
    });
  }

  function hideRescheduleSlotPicker(msg){
    if (rescheduleDaysEl) rescheduleDaysEl.style.display = 'none';
    if (rescheduleGridEl) rescheduleGridEl.style.display = 'none';
    setRescheduleStateText(msg || '目前暫無可預約時段', true);
  }

  async function loadRescheduleSlots(serviceId){
    if (!serviceId) return;
    setRescheduleStateText('載入中…', false);
    try{
      const res = await fetchSlots(serviceId, '', 7);
      const data = res.data || {};
      if (!res.res.ok || !data || data.ok === false){
        hideRescheduleSlotPicker('目前暫無可預約時段');
        return;
      }
      const items = normalizeSlots(data);
      rescheduleContext.items = items;
      if (!items.length){
        hideRescheduleSlotPicker('目前暫無可預約時段');
        return;
      }
      if (rescheduleDaysEl) rescheduleDaysEl.style.display = '';
      if (rescheduleGridEl) rescheduleGridEl.style.display = '';
      renderRescheduleDays(items);
      if (items && items.length) renderRescheduleGrid(items[0]);
      if (rescheduleHintEl) rescheduleHintEl.textContent = '請選擇可預約時段';
      setRescheduleStateText('', false);
    }catch(_){
      hideRescheduleSlotPicker('目前暫無可預約時段');
    }
  }

  function openRescheduleDialog(order){
    if (!order || !rescheduleDialog) return;
    rescheduleContext = { order: order, serviceId: String(order.serviceId || '').trim(), slotKey:'', selectedDate:'', items:[] };
    if (rescheduleGridEl) rescheduleGridEl.innerHTML = '';
    if (rescheduleDaysEl) rescheduleDaysEl.innerHTML = '';
    if (rescheduleNoteInput) rescheduleNoteInput.value = '';
    if (rescheduleSubmitBtn){
      rescheduleSubmitBtn.disabled = false;
      rescheduleSubmitBtn.textContent = '送出改期申請';
    }
    setRescheduleStateText('', false);
    openDialog(rescheduleDialog);
    loadRescheduleSlots(rescheduleContext.serviceId);
  }

  async function submitRescheduleRequest(){
    if (!rescheduleContext.order) return;
    if (!rescheduleContext.slotKey){
      setRescheduleStateText('請先選擇時段', true);
      return;
    }
    if (rescheduleSubmitBtn){
      rescheduleSubmitBtn.disabled = true;
      rescheduleSubmitBtn.textContent = '送出中…';
    }
    try{
      const payload = {
        orderId: rescheduleContext.order.id,
        slotKey: rescheduleContext.slotKey,
        note: rescheduleNoteInput ? rescheduleNoteInput.value.trim() : ''
      };
      if (lastLookupPhone && lastLookupTransfer){
        payload.phone = lastLookupPhone;
        payload.transferLast5 = lastLookupTransfer;
      }
      const res = await fetch('/api/service/order/reschedule-request', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || data.ok === false){
        const err = (data && data.error) || '';
        const msg = mapUserErrorMessage(err) || '送出失敗，請稍後再試';
        setRescheduleStateText(msg, true);
        if (rescheduleSubmitBtn){
          rescheduleSubmitBtn.disabled = false;
          rescheduleSubmitBtn.textContent = '送出改期申請';
        }
        return;
      }
      setRescheduleStateText('已送出改期申請，等待確認', false);
      if (rescheduleSubmitBtn){
        rescheduleSubmitBtn.disabled = true;
        rescheduleSubmitBtn.textContent = '已送出';
      }
    }catch(_){
      setRescheduleStateText('送出失敗，請稍後再試', true);
      if (rescheduleSubmitBtn){
        rescheduleSubmitBtn.disabled = false;
        rescheduleSubmitBtn.textContent = '送出改期申請';
      }
    }
  }

  function hideSlotPicker(msg){
    if (slotDaysEl) slotDaysEl.style.display = 'none';
    if (slotGridEl) slotGridEl.style.display = 'none';
    if (slotMoreBtn) slotMoreBtn.style.display = 'none';
    setSlotStateText(msg || '目前暫無可預約時段', true);
    if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
      detailAddBtn.disabled = true;
      detailAddBtn.textContent = '目前無法預約';
    }
  }

  async function initSlotPicker(service){
    if (!slotSection || !slotHintEl) return;
    if (!isPhoneConsultService(service)){
      resetSlotState();
      slotSection.style.display = 'none';
      return;
    }
    resetSlotState();
    slotSection.style.display = '';
    slotHintEl.textContent = '僅顯示可開放預約時段，（保留 15 分鐘）';
    if (slotTzHintEl){
      slotTzHintEl.textContent = getTzHintText();
    }
    const serviceId = resolveServiceId(service);
    slotHasMore = true;
    slotDaysPage = 0;
    restoreHoldForService(serviceId);
    const cached = loadSlotCache(serviceId);
    const cachedItems = cached ? filterFutureSlotItems(cached) : [];
    if (cachedItems && cachedItems.length){
      slotItems = cachedItems;
      slotLastDate = slotItems.length ? (slotItems[slotItems.length - 1].date || '') : '';
      if (slotDaysEl) slotDaysEl.style.display = '';
      if (slotGridEl) slotGridEl.style.display = '';
      const activeDate = renderSlotDays(slotItems);
      const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[0];
      if (activeItem) renderSlotGrid(activeItem);
      setSlotStateText('顯示最近時段', false);
      updateAddBtnStateForSlot();
    }else{
      ensurePlaceholderSlots();
    }
    if (slotDaysPrev && !slotDaysPrev.__bound){
      slotDaysPrev.__bound = true;
      slotDaysPrev.addEventListener('click', ()=>{
        if (slotDaysPage <= 0) return;
        slotDaysPage -= 1;
        const activeDate = renderSlotDays(slotItems);
        const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[slotDaysPage * SLOT_DAYS_STEP] || slotItems[0];
        if (activeItem) renderSlotGrid(activeItem);
      });
    }
    if (slotDaysNext && !slotDaysNext.__bound){
      slotDaysNext.__bound = true;
      slotDaysNext.addEventListener('click', async ()=>{
        const totalPages = Math.max(1, Math.ceil(slotItems.length / SLOT_DAYS_STEP));
        if (slotDaysPage < totalPages - 1){
          slotDaysPage += 1;
          const activeDate = renderSlotDays(slotItems);
          const activeItem = slotItems.find(day => day.date === activeDate) || slotItems[slotDaysPage * SLOT_DAYS_STEP] || slotItems[0];
          if (activeItem) renderSlotGrid(activeItem);
          return;
        }
        if (slotHasMore){
          await loadMoreSlots(slotDaysPage + 1);
        }
      });
    }
    try{
      const result = await fetchSlots(serviceId, '', SLOT_DAYS_STEP);
      const data = result.data || {};
      if (!result.res.ok || !data || data.ok === false){
        ensurePlaceholderSlots();
        return;
      }
      let items = normalizeSlots(data);
      if (!items.length){
        const retry = await fetchSlots(serviceId, '', 30);
        const retryData = retry.data || {};
        if (retry.res.ok && retryData && retryData.ok !== false){
          items = normalizeSlots(retryData);
        }
      }
      items = filterFutureSlotItems(items);
      if (!items.length){
        ensurePlaceholderSlots();
        return;
      }
      slotPlaceholderMode = false;
      slotItems = items;
      saveSlotCache(serviceId, items);
      slotLastDate = items.length ? (items[items.length - 1].date || '') : '';
      if (slotDaysEl) slotDaysEl.style.display = '';
      if (slotGridEl) slotGridEl.style.display = '';
      const activeDate = renderSlotDays(items);
      const activeItem = items.find(day => day.date === activeDate) || items[0];
      if (activeItem) renderSlotGrid(activeItem);
      if (slotMoreBtn){
        slotMoreBtn.style.display = '';
        if (!slotMoreBtn.__bound){
          slotMoreBtn.__bound = true;
          slotMoreBtn.addEventListener('click', loadMoreSlots);
        }
        slotMoreBtn.disabled = false;
        slotMoreBtn.textContent = '載入更多';
      }
      const hasFree = items.some(day => Array.isArray(day.slots) && day.slots.some(slot => slot.enabled !== false && String(slot.status || '') === 'free'));
      if (!hasFree){
        setSlotStateText('目前暫無可預約時段', true);
        if (detailAddBtn && detailAddBtn.textContent !== '已結束'){
          detailAddBtn.disabled = true;
          detailAddBtn.textContent = '目前無法預約';
        }
      }else{
        updateAddBtnStateForSlot();
      }
      if (hasFree) setSlotStateText('');
      return;
    }catch(_){
      ensurePlaceholderSlots();
    }
  }

  function getTzHintText(){
    return '時段顯示：曼谷時間（UTC+7），台北時間請 +1 小時 / Slot times are Bangkok time (UTC+7); Taipei is +1 hour.';
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

  function renderCartPanel(){
    if (!cartListEl) return;
    let cart = loadCart();
    const sync = syncHoldWithCart(cart);
    if (sync.changed){
      cart = sync.cart;
      saveCart(cart);
    }
    if (!cart.length){
      cartListEl.innerHTML = '<div style="color:#6b7280;">購物車尚無服務。</div>';
    }else{
      cartListEl.innerHTML = cart.map(item => {
        const tzLine = item.slotStart && isPhoneConsultService(item)
          ? `<div class="meta" style="color:#dc2626;">台灣時間：${escapeHtml(formatTaipeiFromBkk(item.slotStart))}</div>`
          : '';
        const promoPriceHtml = item.promoActive && item.promoDisplayPrice
          ? `<div class="price"><span class="price-old">${formatTWD(Number(item.promoOriginalPrice||0) * getItemQty(item))}</span><span class="price-new">${formatTWD(Number(item.promoDisplayPrice||0) * getItemQty(item))}</span></div>`
          : `<div class="price">${formatTWD((Number(item.basePrice||0)+Number(item.optionPrice||0)) * getItemQty(item))}</div>`;
        return `
        <div class="svc-cart-item">
          <div class="info">
            ${sanitizeImageUrl(item.image) ? `<img src="${escapeHtml(sanitizeImageUrl(item.image))}" alt="">` : ''}
            <div>
              <div style="font-weight:700;font-size:14px;">${escapeHtml(item.serviceName||'服務')}</div>
              <div class="meta">${escapeHtml(getCartItemOptionLabel(item))}${(!isDonationService(item) && !item.qtyEnabled && getItemQty(item) > 1) ? ` × ${getItemQty(item)}` : ''}</div>
              ${item.slotStart ? `<div class="meta">預約時段：${escapeHtml(item.slotStart)}</div>` : ''}
              ${tzLine}
              ${item.consultPackLabel ? `<div class="meta">方案：${escapeHtml(item.consultPackLabel)}</div>` : ''}
              ${item.consultAddonSummary ? `<div class="meta">加購：轉譯＋摘要</div>` : ''}
              ${(item.qtyEnabled || isDonationService(item)) ? `
                <div class="svc-cart-qty">
                  <button type="button" class="svc-cart-qty-btn" data-qty="dec" data-uid="${escapeHtml(item.uid||'')}">-</button>
                  <input type="number" min="1" value="${getItemQty(item)}" data-qty-input="1" data-uid="${escapeHtml(item.uid||'')}">
                  <button type="button" class="svc-cart-qty-btn" data-qty="inc" data-uid="${escapeHtml(item.uid||'')}">+</button>
                </div>
              ` : ''}
            </div>
          </div>
          ${promoPriceHtml}
          <button type="button" class="svc-cart-remove" data-remove="${escapeHtml(item.uid||'')}">移除</button>
        </div>
      `;
      }).join('');
    }
    if (cartAmountEl){
      cartAmountEl.textContent = formatTWD(cartTotal(cart));
    }
    applyCheckoutLabels(cart.some(item => isPhoneConsultService(item)));
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
    applyPhoneConsultCheckoutFields(false, '', true);
    setCheckoutStep(1);
    setRequestDateMin();
  }

  function collectStepOneData(){
    if (!checkoutForm) return null;
    try{
      const cart = loadCart();
      if (cart && cart.length){
        const serviceName = cart[0].serviceName || '';
        const isPhone = cart.some(item => isPhoneConsultService(item));
        const photoRequired = cart.some(item => isRitualPhotoRequired(item));
        applyPhoneConsultCheckoutFields(isPhone, serviceName, photoRequired);
      }
    }catch(_){}
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
    const cart = loadCart();
    const isPhone = Array.isArray(cart) && cart.some(item => isPhoneConsultService(item));
    if (!isPhone && !nameEn){
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
    if (!isPhone && !birth){
      alert('請填寫生日');
      return null;
    }
    if (!isPhone && isCheckoutPhotoRequired()){
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
      const opt = item.optionName ? `｜${getCartItemOptionLabel(item)}` : '';
      const slot = item.slotStart ? `（預約：${item.slotStart}）` : '';
      return `${item.serviceName || '服務'}${opt}${slot}`;
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

  function parsePromoTime(val){
    const raw = String(val || '').trim();
    if (!raw) return 0;
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : 0;
  }

  function formatPromoDate(ts){
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }

  function getPromoInfo(service){
    const promo = service && service.meta && service.meta.promo ? service.meta.promo : {};
    const price = Number(promo.promoPrice ?? promo.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) return null;
    const start = parsePromoTime(promo.promoStart || promo.start);
    const end = parsePromoTime(promo.promoEnd || promo.end);
    if (start && Date.now() < start) return null;
    if (end && Date.now() > end) return null;
    if (start && end && end < start) return null;
    return { price, start, end, earlyBird: String(promo.earlyBird || '') };
  }

  function getPromoDisplayPrice(service, packKey){
    const info = getPromoInfo(service);
    if (!info) return 0;
    if (!isPhoneConsultService(service)) return info.price;
    const base = Number(CONSULT_PACK_PRICES.en || 0);
    const zh = Number(CONSULT_PACK_PRICES.zh || 0);
    const delta = (packKey === 'zh' && Number.isFinite(zh) && Number.isFinite(base)) ? (zh - base) : 0;
    const promo = info.price + (Number.isFinite(delta) ? delta : 0);
    return Number.isFinite(promo) ? promo : info.price;
  }

  function getPromoPackBasePrice(packKey){
    if (packKey === 'zh'){
      const zh = Number(CONSULT_PACK_PRICES.zh || 0);
      if (Number.isFinite(zh) && zh > 0) return zh;
    }
    const en = Number(CONSULT_PACK_PRICES.en || 0);
    if (Number.isFinite(en) && en > 0) return en;
    return getPhoneBasePrice();
  }

  function updatePromoCountdown(info){
    const end = info && info.end ? Number(info.end) : 0;
    if (!end || !Number.isFinite(end)){
      if (promoCountdownEl) promoCountdownEl.textContent = '';
      if (detailPromoCountdownEl) detailPromoCountdownEl.textContent = '';
      return false;
    }
    const now = Date.now();
    const remain = end - now;
    if (remain <= 0){
      if (promoCountdownEl) promoCountdownEl.textContent = '';
      if (detailPromoCountdownEl) detailPromoCountdownEl.textContent = '';
      return false;
    }
    const totalSec = Math.floor(remain / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const text = `剩餘 ${days}天 ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    if (promoCountdownEl) promoCountdownEl.textContent = text;
    if (detailPromoCountdownEl) detailPromoCountdownEl.textContent = text;
    return true;
  }

  function updatePromoLimitedBlocks(service){
    if (!service || !isPhoneConsultService(service)){
      if (promoLimitedEl) promoLimitedEl.style.display = 'none';
      if (detailPromoLimitedEl) detailPromoLimitedEl.style.display = 'none';
      if (promoCountdownTimer){
        clearInterval(promoCountdownTimer);
        promoCountdownTimer = null;
      }
      return;
    }
    const info = getPromoInfo(service);
    if (!info){
      if (promoLimitedEl) promoLimitedEl.style.display = 'none';
      if (detailPromoLimitedEl) detailPromoLimitedEl.style.display = 'none';
      if (promoCountdownTimer){
        clearInterval(promoCountdownTimer);
        promoCountdownTimer = null;
      }
      return;
    }
    const endText = formatPromoDate(info.end);
    const periodText = endText ? `至 ${endText} 截止` : '限時優惠';
    if (promoPeriodEl) promoPeriodEl.textContent = periodText;
    if (detailPromoPeriodEl) detailPromoPeriodEl.textContent = periodText;
    if (promoEarlyBirdEl) promoEarlyBirdEl.textContent = info.earlyBird || '';
    if (detailPromoEarlyBirdEl) detailPromoEarlyBirdEl.textContent = info.earlyBird || '';
    if (promoLimitedEl) promoLimitedEl.style.display = '';
    if (detailPromoLimitedEl) detailPromoLimitedEl.style.display = '';
    const ok = updatePromoCountdown(info);
    if (promoCountdownTimer){
      clearInterval(promoCountdownTimer);
      promoCountdownTimer = null;
    }
    if (info.end && ok){
      promoCountdownTimer = setInterval(()=>{
        if (!updatePromoCountdown(info)){
          if (promoLimitedEl) promoLimitedEl.style.display = 'none';
          if (detailPromoLimitedEl) detailPromoLimitedEl.style.display = 'none';
          if (promoCountdownTimer){
            clearInterval(promoCountdownTimer);
            promoCountdownTimer = null;
          }
        }
      }, 1000);
    }
  }

  function updatePromoPriceRow(packKey){
    if (!promoPriceRow || !promoPriceOldEl || !promoPriceNewEl || !__PHONE_PROMO_SERVICE__) return;
    const promoInfo = getPromoInfo(__PHONE_PROMO_SERVICE__);
    const base = getPromoPackBasePrice(packKey || 'en');
    const promoPrice = promoInfo ? getPromoDisplayPrice(__PHONE_PROMO_SERVICE__, packKey || 'en') : 0;
    if (promoPrice && Number.isFinite(promoPrice) && promoPrice > 0 && promoPrice < base){
      promoPriceOldEl.textContent = formatTWD(base);
      promoPriceNewEl.textContent = formatTWD(promoPrice);
      promoPriceRow.style.display = '';
    }else{
      promoPriceRow.style.display = 'none';
    }
  }

  function buildServiceCard(service, opts = {}){
    const sid = resolveServiceId(service);
    if (!service.id && sid) service.id = sid;
    const cover = service.cover || (Array.isArray(service.gallery) && service.gallery[0]) || '';
    const sold = Number(service.sold || 0);
    const showSold = !isPhoneConsultService(service);
    const limitedRow = buildLimitedRow(service, '限時服務');
    const basePrice = isPhoneConsultService(service) ? getPhoneBasePrice() : Number(service.price||0);
    let priceHtml = formatTWD(basePrice);
    const promoInfo = isPhoneConsultService(service) ? getPromoInfo(service) : null;
    if (promoInfo){
      const promoPrice = getPromoDisplayPrice(service, 'en');
      if (Number.isFinite(promoPrice) && promoPrice > 0 && promoPrice < basePrice){
        priceHtml = `<span class="price-old">${formatTWD(basePrice)}</span><span class="price-new">${formatTWD(promoPrice)}</span>`;
      }
    }
    const card = document.createElement('div');
    card.className = 'card service-card' + (opts.hot ? ' hot-card' : '');
    card.innerHTML = `
      <div class="pic">${sanitizeImageUrl(cover) ? `<img src="${escapeHtml(sanitizeImageUrl(cover))}" alt="${escapeHtml(service.name||'')}" loading="lazy">` : ''}</div>
      <div class="body">
        <div class="name">${escapeHtml(service.name||'服務')}</div>
        ${limitedRow}
        <div class="meta">${showSold ? `<span class="badge badge-sold">已售出：${sold}</span>` : ''}</div>
        <div class="price">${priceHtml}</div>
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

  function setPromoPack(next){
    const pack = next === 'zh' ? 'zh' : 'en';
    __PHONE_PACK__ = pack;
    promoPills.forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.pack === pack);
    });
    updatePromoPriceRow(pack);
    if (__PHONE_PROMO_SERVICE__) updatePromoLimitedBlocks(__PHONE_PROMO_SERVICE__);
  }

  function applyPhonePackSelection(service, pack){
    if (!detailVariant || !service) return;
    const options = Array.isArray(service.options) ? service.options.filter(opt => opt && opt.name) : [];
    if (!options.length) return;
    let match = null;
    if (pack === 'zh'){
      match = options.find(opt => /中文/.test(String(opt.name || '')));
    }else{
      match = options.find(opt => /英文/.test(String(opt.name || '')));
    }
    if (match){
      detailVariant.value = match.name;
      updateDetailPrice();
    }
  }

  function normalizePromoPos(val){
    const num = Number(val);
    if (!Number.isFinite(num)) return '';
    if (num < 0) return 0;
    if (num > 100) return 100;
    return Math.round(num);
  }

  function getPromoDefaults(){
    const bullets = promoBulletsEl ? Array.from(promoBulletsEl.querySelectorAll('li')).map(li => li.textContent.trim()).filter(Boolean) : [];
    return {
      kicker: promoKickerEl ? promoKickerEl.textContent.trim() : '',
      title: promoTitleEl ? promoTitleEl.textContent.trim() : '',
      sub: promoSubEl ? promoSubEl.textContent.trim() : '',
      bullets,
      note: promoNoteEl ? promoNoteEl.textContent.trim() : '',
      earlyBird: promoEarlyBirdEl ? promoEarlyBirdEl.textContent.trim() : '',
      packLabel: promoPackLabelEl ? promoPackLabelEl.textContent.trim() : '',
      packEn: promoPackEnEl ? promoPackEnEl.textContent.trim() : '',
      packZh: promoPackZhEl ? promoPackZhEl.textContent.trim() : '',
      cta: promoCta ? promoCta.textContent.trim() : '',
      mini: promoMiniEl ? promoMiniEl.textContent.trim() : '',
      promoPrice: '',
      promoStart: '',
      promoEnd: '',
      imageUrl: promoImgEl ? promoImgEl.getAttribute('src') || '' : '',
      imagePosX: '',
      imagePosY: ''
    };
  }

  function getPromoData(service){
    const base = getPromoDefaults();
    const meta = service && service.meta && service.meta.promo ? service.meta.promo : {};
    const cover = service ? (service.cover || (Array.isArray(service.gallery) && service.gallery[0]) || '') : '';
    const merged = Object.assign({}, base, meta);
    if (!merged.imageUrl && cover) merged.imageUrl = cover;
    const optList = Array.isArray(service && service.options) ? service.options : [];
    if (!merged.packEn || !merged.packZh){
      const enOpt = optList.find(opt => /英文/.test(String(opt.name || '')));
      const zhOpt = optList.find(opt => /中文/.test(String(opt.name || '')));
      if (!merged.packEn && enOpt){
        merged.packEn = `英文翻譯 ${formatTWD(readOptionPrice(enOpt) || 0)}`;
      }
      if (!merged.packZh && zhOpt){
        merged.packZh = `中文翻譯 ${formatTWD(readOptionPrice(zhOpt) || 0)}`;
      }
    }else{
      const enOpt = optList.find(opt => /英文/.test(String(opt.name || '')));
      const zhOpt = optList.find(opt => /中文/.test(String(opt.name || '')));
      if (enOpt && merged.packEn){
        merged.packEn = String(merged.packEn).replace(/NT\$\s*[\d,]+/i, formatTWD(readOptionPrice(enOpt) || 0));
      }
      if (zhOpt && merged.packZh){
        merged.packZh = String(merged.packZh).replace(/NT\$\s*[\d,]+/i, formatTWD(readOptionPrice(zhOpt) || 0));
      }
    }
    merged.imagePosX = normalizePromoPos(merged.imagePosX);
    merged.imagePosY = normalizePromoPos(merged.imagePosY);
    return merged;
  }

  function applyPromoContent(data){
    if (!data) return;
    if (promoKickerEl) promoKickerEl.textContent = data.kicker || '';
    if (promoTitleEl) promoTitleEl.textContent = data.title || '';
    if (promoSubEl) promoSubEl.textContent = data.sub || '';
    if (promoNoteEl) promoNoteEl.textContent = data.note || '';
    if (promoEarlyBirdEl) promoEarlyBirdEl.textContent = data.earlyBird || '';
    if (detailPromoEarlyBirdEl) detailPromoEarlyBirdEl.textContent = data.earlyBird || '';
    if (promoPackLabelEl) promoPackLabelEl.textContent = data.packLabel || '';
    if (promoPackEnEl) promoPackEnEl.textContent = data.packEn || '';
    if (promoPackZhEl) promoPackZhEl.textContent = data.packZh || '';
    if (promoCta) promoCta.textContent = data.cta || '查看並預約';
    if (promoMiniEl) promoMiniEl.textContent = data.mini || '';
    updatePromoPriceRow(__PHONE_PACK__ || 'en');
    if (__PHONE_PROMO_SERVICE__) updatePromoLimitedBlocks(__PHONE_PROMO_SERVICE__);
    if (promoBulletsEl){
      promoBulletsEl.innerHTML = '';
      (data.bullets || []).forEach(text=>{
        if (!text) return;
        const li = document.createElement('li');
        li.textContent = text;
        promoBulletsEl.appendChild(li);
      });
    }
    if (promoImgEl){
      const url = data.imageUrl || '';
      if (promoMediaEl) promoMediaEl.style.display = url ? '' : 'none';
      if (url) promoImgEl.setAttribute('src', url);
      const posX = normalizePromoPos(data.imagePosX);
      const posY = normalizePromoPos(data.imagePosY);
      if (posX !== '' || posY !== ''){
        const x = posX === '' ? 50 : posX;
        const y = posY === '' ? 50 : posY;
        setPromoImagePosition(x, y);
      }else{
        promoImgEl.style.objectPosition = '';
      }
    }
  }

  function fillPromoForm(data){
    if (!data) return;
    if (promoKickerInput) promoKickerInput.value = data.kicker || '';
    if (promoTitleInput) promoTitleInput.value = data.title || '';
    if (promoSubInput) promoSubInput.value = data.sub || '';
    if (promoBulletsInput) promoBulletsInput.value = (data.bullets || []).join('\n');
    if (promoNoteInput) promoNoteInput.value = data.note || '';
    if (promoEarlyBirdInput) promoEarlyBirdInput.value = data.earlyBird || '';
    if (promoPackLabelInput) promoPackLabelInput.value = data.packLabel || '';
    if (promoPackEnInput) promoPackEnInput.value = data.packEn || '';
    if (promoPackZhInput) promoPackZhInput.value = data.packZh || '';
    if (promoCtaInput) promoCtaInput.value = data.cta || '';
    if (promoMiniInput) promoMiniInput.value = data.mini || '';
    if (promoPriceInput) promoPriceInput.value = data.promoPrice || '';
    if (promoStartInput) promoStartInput.value = data.promoStart || '';
    if (promoEndInput) promoEndInput.value = data.promoEnd || '';
    if (promoImageInput) promoImageInput.value = data.imageUrl || '';
    if (promoImagePosXInput) promoImagePosXInput.value = data.imagePosX !== '' ? data.imagePosX : '';
    if (promoImagePosYInput) promoImagePosYInput.value = data.imagePosY !== '' ? data.imagePosY : '';
  }

  function readPromoForm(){
    return {
      kicker: promoKickerInput ? promoKickerInput.value.trim() : '',
      title: promoTitleInput ? promoTitleInput.value.trim() : '',
      sub: promoSubInput ? promoSubInput.value.trim() : '',
      bullets: promoBulletsInput ? promoBulletsInput.value.split('\n').map(x=>x.trim()).filter(Boolean) : [],
      note: promoNoteInput ? promoNoteInput.value.trim() : '',
      earlyBird: promoEarlyBirdInput ? promoEarlyBirdInput.value.trim() : '',
      packLabel: promoPackLabelInput ? promoPackLabelInput.value.trim() : '',
      packEn: promoPackEnInput ? promoPackEnInput.value.trim() : '',
      packZh: promoPackZhInput ? promoPackZhInput.value.trim() : '',
      cta: promoCtaInput ? promoCtaInput.value.trim() : '',
      mini: promoMiniInput ? promoMiniInput.value.trim() : '',
      promoPrice: promoPriceInput ? promoPriceInput.value.trim() : '',
      promoStart: promoStartInput ? promoStartInput.value.trim() : '',
      promoEnd: promoEndInput ? promoEndInput.value.trim() : '',
      imageUrl: promoImageInput ? promoImageInput.value.trim() : '',
      imagePosX: normalizePromoPos(promoImagePosXInput ? promoImagePosXInput.value : ''),
      imagePosY: normalizePromoPos(promoImagePosYInput ? promoImagePosYInput.value : '')
    };
  }

  async function savePromoForService(service, promo){
    const id = resolveServiceId(service);
    if (!id) return false;
    const meta = Object.assign({}, service.meta || {}, { promo });
    const res = await fetch('/api/service/products', {
      method:'PUT',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify({ id, meta })
    });
    const data = await res.json().catch(()=>null);
    if (!res.ok || !data || data.ok === false) return false;
    service.meta = meta;
    return true;
  }

  function setPromoImagePosition(x, y){
    if (!promoImgEl) return;
    const px = Math.max(0, Math.min(100, Number(x)));
    const py = Math.max(0, Math.min(100, Number(y)));
    promoImgEl.style.objectPosition = `${px}% ${py}%`;
    if (promoImagePosXInput) promoImagePosXInput.value = String(Math.round(px));
    if (promoImagePosYInput) promoImagePosYInput.value = String(Math.round(py));
  }

  function bindPromoImageDrag(){
    if (!promoMediaEl || !promoImgEl || promoMediaEl.__bound) return;
    promoMediaEl.__bound = true;
    let dragging = false;
    const onMove = (e) => {
      if (!dragging) return;
      const rect = promoMediaEl.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPromoImagePosition(x, y);
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    promoMediaEl.addEventListener('pointerdown', (e) => {
      if (!promoAdminEl || promoAdminEl.style.display === 'none') return;
      dragging = true;
      promoMediaEl.setPointerCapture && promoMediaEl.setPointerCapture(e.pointerId);
      onMove(e);
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function initPromoAdmin(service){
    if (!promoAdminEl) return;
    if (!ADMIN_PREVIEW_MODE || ADMIN_ROLE !== 'owner'){
      if (promoEditToggle) promoEditToggle.style.display = 'none';
      promoAdminEl.style.display = 'none';
      return;
    }
    if (promoEditToggle){
      promoEditToggle.style.display = '';
      promoEditToggle.textContent = '編輯';
    }
    promoAdminEl.style.display = 'none';
    const data = getPromoData(service);
    fillPromoForm(data);
    if (promoMediaEl) promoMediaEl.classList.toggle('is-editing', promoAdminEl.style.display !== 'none');
    bindPromoImageDrag();
    if (promoEditToggle && !promoEditToggle.__bound){
      promoEditToggle.__bound = true;
      promoEditToggle.addEventListener('click', ()=>{
        const next = promoAdminEl.style.display === 'none' ? '' : 'none';
        promoAdminEl.style.display = next;
        promoEditToggle.textContent = next === 'none' ? '編輯' : '收起';
        if (promoMediaEl) promoMediaEl.classList.toggle('is-editing', next !== 'none');
      });
    }
    if (promoResetBtn && !promoResetBtn.__bound){
      promoResetBtn.__bound = true;
      promoResetBtn.addEventListener('click', ()=>{
        fillPromoForm(getPromoData(service));
        applyPromoContent(getPromoData(service));
      });
    }
    if (promoSaveBtn && !promoSaveBtn.__bound){
      promoSaveBtn.__bound = true;
      promoSaveBtn.addEventListener('click', async ()=>{
        const next = readPromoForm();
        applyPromoContent(next);
        const ok = await savePromoForService(service, next);
        if (!ok){
          alert('儲存失敗，請稍後再試');
        }
      });
    }
  }

  function stopPromoStoryRotation(){
    if (promoStoryTimer){
      clearInterval(promoStoryTimer);
      promoStoryTimer = null;
    }
  }

  function formatStoryTime(ts){
    try{
      if (!ts) return '';
      const date = new Date(ts);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString('zh-TW', {year:'numeric',month:'2-digit',day:'2-digit'});
    }catch(_){
      return '';
    }
  }

  function formatStoryMsgHtml(msg){
    const raw = String(msg || '').trim();
    if (!raw) return '目前尚無留言';
    const escaped = escapeHtml(raw);
    if (/\r|\n/.test(raw)){
      return escaped.replace(/\r\n|\r|\n/g, '<br>');
    }
    return escaped.replace(/([。！？!?])\s*/g, '$1<br>');
  }

  function renderPromoStory(item){
    if (!promoStoriesEl || !promoStoryMsgEl) return;
    const imgUrl = sanitizeImageUrl(item && (item.imageUrl || item.image || item.photo || item.pic));
    if (promoStoryMediaEl && promoStoryImgEl){
      if (imgUrl){
        promoStoryImgEl.src = imgUrl;
        promoStoryImgEl.alt = (item && item.nick) ? String(item.nick) : '';
        promoStoryMediaEl.style.display = '';
      }else{
        promoStoryImgEl.removeAttribute('src');
        promoStoryImgEl.alt = '';
        promoStoryMediaEl.style.display = 'none';
      }
    }
    promoStoryMsgEl.innerHTML = formatStoryMsgHtml(item && item.msg ? String(item.msg) : '');
    if (promoStoryMoreBtn){
      promoStoryMoreBtn.style.display = promoStoryItems.length ? '' : 'none';
      promoStoryMoreBtn.textContent = '查看全部';
    }
    if (promoStoryNameEl) promoStoryNameEl.textContent = item && item.nick ? String(item.nick) : '';
    if (promoStoryTimeEl) promoStoryTimeEl.textContent = item ? formatStoryTime(item.ts) : '';
  }

  function startPromoStoryRotation(items){
    stopPromoStoryRotation();
    promoStoryItems = Array.isArray(items) ? items : [];
    promoStoryIndex = 0;
    if (!promoStoriesEl || !promoStoryItems.length){
      if (promoStoriesEl){
        promoStoriesEl.style.display = '';
        renderPromoStory(null);
      }
      return;
    }
    promoStoriesEl.style.display = '';
    renderPromoStory(promoStoryItems[0]);
    if (promoStoryItems.length <= 1) return;
    promoStoryTimer = setInterval(()=>{
      promoStoryIndex = (promoStoryIndex + 1) % promoStoryItems.length;
      renderPromoStory(promoStoryItems[promoStoryIndex]);
    }, 7000);
  }

  async function loadPromoStories(service){
    if (!promoStoriesEl) return;
    const serviceId = String((service && resolveServiceId(service)) || __PHONE_SVC_ID__ || '').trim();
    if (!serviceId){
      promoStoriesEl.style.display = '';
      startPromoStoryRotation([]);
      return;
    }
    try{
      const cacheBust = Date.now();
      const res = await fetch(`/api/stories?code=${encodeURIComponent(serviceId)}&_=${cacheBust}`);
      const data = await res.json().catch(()=>null);
      if (!res.ok || !data || data.ok === false){
        promoStoriesEl.style.display = '';
        startPromoStoryRotation([]);
        return;
      }
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length){
        promoStoriesEl.style.display = '';
        startPromoStoryRotation([]);
        return;
      }
      startPromoStoryRotation(items.slice(0, 10));
    }catch(_){
      promoStoriesEl.style.display = '';
      startPromoStoryRotation([]);
    }
  }

  function renderStoryModalItem(item){
    if (!storyModalMsg) return;
    const imgUrl = sanitizeImageUrl(item && (item.imageUrl || item.image || item.photo || item.pic));
    if (storyModalImg){
      if (imgUrl){
        storyModalImg.src = imgUrl;
        storyModalImg.alt = item && item.nick ? String(item.nick) : '';
        storyModalImg.parentElement.style.display = '';
      }else{
        storyModalImg.removeAttribute('src');
        storyModalImg.alt = '';
        storyModalImg.parentElement.style.display = 'none';
      }
    }
    storyModalMsg.innerHTML = formatStoryMsgHtml(item && item.msg ? String(item.msg) : '');
    if (storyModalName) storyModalName.textContent = item && item.nick ? String(item.nick) : '';
    if (storyModalTime) storyModalTime.textContent = item ? formatStoryTime(item.ts) : '';
  }

  function openStoryModal(){
    if (!storyModal || !promoStoryItems.length) return;
    renderStoryModalItem(promoStoryItems[promoStoryIndex] || promoStoryItems[0]);
    openDialog(storyModal);
  }

  function initPhonePromo(services){
    if (!promoSection) return;
    const target = findPhoneConsultService(services);
    if (!target){
      promoSection.style.display = 'none';
      return;
    }
    if (promoSection.__bound) return;
    __PHONE_SVC_ID__ = resolveServiceId(target);
    __PHONE_PROMO_SERVICE__ = target;
    promoSection.style.display = '';
    syncConsultPackPrices(target);
    applyPromoContent(getPromoData(target));
    initPromoAdmin(target);
    loadPromoStories(target);
    if (promoStoryMoreBtn && !promoStoryMoreBtn.__bound){
      promoStoryMoreBtn.__bound = true;
      promoStoryMoreBtn.addEventListener('click', ()=>{
        openStoryModal();
      });
    }
    if (storyPrevBtn && !storyPrevBtn.__bound){
      storyPrevBtn.__bound = true;
      storyPrevBtn.addEventListener('click', ()=>{
        if (!promoStoryItems.length) return;
        promoStoryIndex = (promoStoryIndex - 1 + promoStoryItems.length) % promoStoryItems.length;
        renderStoryModalItem(promoStoryItems[promoStoryIndex]);
      });
    }
    if (storyNextBtn && !storyNextBtn.__bound){
      storyNextBtn.__bound = true;
      storyNextBtn.addEventListener('click', ()=>{
        if (!promoStoryItems.length) return;
        promoStoryIndex = (promoStoryIndex + 1) % promoStoryItems.length;
        renderStoryModalItem(promoStoryItems[promoStoryIndex]);
      });
    }
    if (storyModal && !storyModal.__bound){
      storyModal.__bound = true;
      storyModal.addEventListener('click', (event)=>{
        const target = event.target;
        if (!target) return;
        if (target.closest('[data-close-dialog]')){
          closeDialog(storyModal);
        }
      });
    }
    if (storyModal && !storyModal.__closeBound){
      const closeBtn = storyModal.querySelector('[data-close-dialog]');
      if (closeBtn){
        storyModal.__closeBound = true;
        closeBtn.addEventListener('click', ()=>{
          closeDialog(storyModal);
        });
      }
    }
    setPromoPack(__PHONE_PACK__);
    promoPills.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        setPromoPack(btn.dataset.pack);
      });
    });
    if (promoCta){
      promoCta.addEventListener('click', ()=>{
        openServiceDetail(target);
        applyPhonePackSelection(target, __PHONE_PACK__);
      });
    }
    promoSection.__bound = true;
  }

  // Manual tests (slots):
  // 1) 發布時段後，電話諮詢詳情可載入時段
  // 2) 未選時段不可加入購物車
  // 3) 保留成功顯示倒數；過期後需重選
  // 4) 下單 payload 帶 slotKey/slotHoldToken

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

  async function applyServiceVisibility(){
    const baseVisible = allServiceItems.filter(svc => canShowPhoneConsultToViewer(svc));
    serviceItems = baseVisible;
    renderHotServices(serviceItems);
    renderList(serviceItems);
  }

  function populateVariantSelect(service){
    if (!detailVariant) return;
    if (isPhoneConsultService(service)){
      if (detailOptionsWrap) detailOptionsWrap.style.display = 'none';
      detailVariant.innerHTML = '';
      detailVariant.disabled = true;
      detailVariant.value = '';
      return;
    }
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
    if (isPhoneConsultService(service)) return null;
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
    let unit = base + diff;
    let promoUnit = 0;
    if (isPhoneConsultService(detailDataset)){
      const pack = CONSULT_PACK || resolveConsultPack('en');
      const packDelta = getConsultPackDelta(pack);
      unit = getPhoneBasePrice() + packDelta + (CONSULT_ADDON ? 500 : 0);
      promoUnit = getPromoDisplayPrice(detailDataset, pack.key);
    }else{
      unit = base + diff;
      promoUnit = 0;
    }
    const qtyEnabled = isQtyEnabled(detailDataset);
    const qty = qtyEnabled && detailQtyInput ? Math.max(1, Number(detailQtyInput.value||1) || 1) : 1;
    const fee = qtyEnabled ? getServiceFee(detailDataset) : 0;
    let displayUnit = unit;
    let showPromo = false;
    if (promoUnit && Number.isFinite(promoUnit) && promoUnit > 0 && promoUnit < unit){
      displayUnit = promoUnit;
      showPromo = true;
    }
    const total = unit * qty + fee;
    const displayTotal = displayUnit * qty + fee;
    detailPriceEl.textContent = displayTotal.toLocaleString('zh-TW');
    detailPriceEl.classList.toggle('is-promo', showPromo);
    if (detailPriceOldEl){
      if (showPromo){
        detailPriceOldEl.textContent = formatTWD(total);
        detailPriceOldEl.style.display = '';
      }else{
        detailPriceOldEl.textContent = '';
        detailPriceOldEl.style.display = 'none';
      }
    }
    if (detailPriceHint){
      if (qtyEnabled){
        const feeText = fee > 0 ? ` + ${getServiceFeeLabel(detailDataset)} ${formatTWD(fee)}` : '';
        detailPriceHint.textContent = `單價 ${formatTWD(displayUnit)} × ${qty}${feeText}`;
        detailPriceHint.style.display = '';
      }else{
        detailPriceHint.textContent = '';
        detailPriceHint.style.display = 'none';
      }
    }
    updatePromoLimitedBlocks(detailDataset);
  }

  function syncPhoneAddonRow(service){
    const row = document.getElementById('svcAddonSummary');
    if (!isPhoneConsultService(service)){
      if (row){
        const input = row.querySelector('input[type="checkbox"]');
        if (input) input.checked = false;
        row.remove();
      }
      return;
    }
    if (row) row.remove();
  }
  function setDetailQty(next){
    if (!detailQtyInput) return;
    const val = Math.max(1, Number(next || 1) || 1);
    detailQtyInput.value = String(Math.floor(val));
    if (detailQtyMinus) detailQtyMinus.disabled = val <= 1;
    updateDetailPrice();
  }
  if (detailQtyInput && !detailQtyInput.__bound){
    detailQtyInput.__bound = true;
    detailQtyInput.addEventListener('input', ()=>{
      const val = Math.max(1, Number(detailQtyInput.value||1) || 1);
      setDetailQty(val);
    });
  }
  if (detailQtyMinus && !detailQtyMinus.__bound){
    detailQtyMinus.__bound = true;
    detailQtyMinus.addEventListener('click', ()=>{
      if (!detailQtyInput) return;
      setDetailQty(Number(detailQtyInput.value || 1) - 1);
    });
    detailQtyMinus.addEventListener('touchend', (ev)=>{
      ev.preventDefault();
      if (!detailQtyInput) return;
      setDetailQty(Number(detailQtyInput.value || 1) - 1);
    }, { passive: false });
  }
  if (detailQtyPlus && !detailQtyPlus.__bound){
    detailQtyPlus.__bound = true;
    detailQtyPlus.addEventListener('click', ()=>{
      if (!detailQtyInput) return;
      setDetailQty(Number(detailQtyInput.value || 1) + 1);
    });
    detailQtyPlus.addEventListener('touchend', (ev)=>{
      ev.preventDefault();
      if (!detailQtyInput) return;
      setDetailQty(Number(detailQtyInput.value || 1) + 1);
    }, { passive: false });
  }

  function resumeCheckoutIfHeld(service){
    if (!isPhoneConsultService(service)) return false;
    if (SKIP_AUTO_RESUME){
      SKIP_AUTO_RESUME = false;
      return false;
    }
    const serviceId = resolveServiceId(service);
    const hold = getActiveHold(serviceId);
    if (!hold) return false;
    let cart = loadCart();
    const idx = cart.findIndex(it => String(it.serviceId || '') === String(serviceId || ''));
    if (idx >= 0){
      const item = cart[idx];
      if (!item.slotHoldToken || !item.slotKey){
        cart[idx] = Object.assign({}, item, {
          slotKey: String(hold.slotKey || ''),
          slotHoldToken: String(hold.slotHoldToken || ''),
          slotStart: String(hold.slotStart || ''),
          slotHoldUntilMs: Number(hold.holdUntilMs || 0)
        });
        saveCart(cart);
      }
    }else{
      return false;
    }
    openCheckoutDialog();
    if (checkoutDialog) setCheckoutStep(1);
    if (slotChangeBtn) slotChangeBtn.style.display = '';
    return true;
  }

  async function openServiceDetail(service){
    detailDataset = service;
    lastDetailService = service;
    if (isPhoneConsultService(service) && !canShowPhoneConsultToViewer(service)){
      console.log('[admin-preview] phone-consult blocked for non-admin');
      const cfg = PHONE_CONSULT_CFG || {};
      let msg = '此服務目前尚未開放 / This service is not available yet';
      const mode = String(cfg.mode || '').toLowerCase();
      if (mode === 'allowlist' && !cfg.allowlisted){
        msg = '僅限邀請名單 / Invite-only';
      }
      if (detailTitle) detailTitle.textContent = service.name || '服務';
      if (detailDesc) detailDesc.textContent = msg;
      if (detailOptionsWrap) detailOptionsWrap.style.display = 'none';
      if (detailQtyWrap) detailQtyWrap.style.display = 'none';
      if (consultPackWrap) consultPackWrap.style.display = 'none';
      if (slotSection) slotSection.style.display = 'none';
      if (detailAddBtn){
        detailAddBtn.disabled = true;
        detailAddBtn.textContent = '尚未開放';
      }
      openDialog(detailDialog);
      return;
    }
    if (isPhoneConsultService(service) && shouldGateBySlotsForViewer()){
      const avail = await getPhoneConsultSlotAvailability(service);
      if (avail.reason !== 'ok'){
        let msg = '目前沒有可預約時段 / No available slots at the moment';
        if (avail.reason === 'fetch_failed'){
          msg = '此服務目前尚未開放 / This service is not available yet';
        }
        if (detailTitle) detailTitle.textContent = service.name || '服務';
        if (detailDesc) detailDesc.textContent = msg;
        if (detailIncludes){
          if (avail.reason === 'no_slots' || avail.reason === 'sold_out'){
            detailIncludes.innerHTML = '<li>你可以稍後重新整理查看最新時段</li>';
          }else{
            detailIncludes.innerHTML = '';
          }
        }
        if (detailOptionsWrap) detailOptionsWrap.style.display = 'none';
        if (detailQtyWrap) detailQtyWrap.style.display = 'none';
        if (consultPackWrap) consultPackWrap.style.display = 'none';
        if (slotSection) slotSection.style.display = 'none';
        if (detailAddBtn){
          detailAddBtn.disabled = true;
          detailAddBtn.textContent = '目前無法預約';
        }
        openDialog(detailDialog);
        return;
      }
    }
    if (resumeCheckoutIfHeld(service)) return;
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
        setDetailQty(1);
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
    syncPhoneAddonRow(service);
    initConsultPackUI(service);
    updateDetailPrice();
    initSlotPicker(service);
    if (LAST_RELEASE_MSG){
      setSlotStateText(LAST_RELEASE_MSG, true);
      LAST_RELEASE_MSG = '';
    }
    openDialog(detailDialog);
    updateLimitedCountdowns(detailDialog);
    scheduleLimitedTimer();
    try{
      if (window.trackEvent) window.trackEvent('service_detail_open', { itemId: resolveServiceId(service) });
    }catch(_){}
  }

  function ensureSingleService(cart, serviceId){
    if (!cart.length) return cart;
    if (cart[0].serviceId === serviceId) return cart;
    const ok = confirm('購物車內已有其他服務，加入新服務會清空原本的內容，是否繼續？');
    if (!ok) return null;
    return [];
  }

  function buildServiceCartItem(detail){
    if (!detail) return null;
    const options = Array.isArray(detail.options) ? detail.options.filter(opt=>opt && opt.name) : [];
    const variant = options.length ? getVariantSelection(detail) : null;
    const isPhone = isPhoneConsultService(detail);
    if (options.length && !variant && !isPhone){
      alert('請先選擇服務項目');
      return null;
    }
    const addonChecked = !isPhoneConsultService(detail) && isPhoneAddonChecked();
    const addonSummary = addonChecked ? '加購：轉譯＋重點摘要整理(+500)' : '';
    const addonPrice = addonChecked ? 500 : 0;
    const svcId = resolveServiceId(detail);
    const qtyEnabled = isQtyEnabled(detail);
    const qty = qtyEnabled && detailQtyInput ? Math.max(1, Number(detailQtyInput.value||1) || 1) : 1;
    const fee = qtyEnabled ? getServiceFee(detail) : 0;
    const feeLabel = qtyEnabled ? getServiceFeeLabel(detail) : '';
    const qtyLabel = qtyEnabled ? getServiceQtyLabel(detail) : '';
    const photoRequired = isRitualPhotoRequired(detail);
    const basePrice = isPhone ? getPhoneBasePrice() : Number(detail.price||0);
    const slotKey = isPhone ? (CURRENT_DETAIL_SLOT.slotHoldToken ? CURRENT_DETAIL_SLOT.slotKey : CURRENT_DETAIL_SLOT.pendingSlotKey) : '';
    const slotHoldToken = isPhone ? CURRENT_DETAIL_SLOT.slotHoldToken : '';
    const slotStart = isPhone ? (CURRENT_DETAIL_SLOT.slotHoldToken ? CURRENT_DETAIL_SLOT.slotStart : CURRENT_DETAIL_SLOT.pendingSlotStart) : '';
    const slotHoldUntilMs = isPhone ? (CURRENT_DETAIL_SLOT.slotHoldToken ? CURRENT_DETAIL_SLOT.holdUntilMs : 0) : 0;
    const consultPack = isPhone ? (CONSULT_PACK || resolveConsultPack('zh')) : null;
    const consultPackPrice = consultPack ? Number(consultPack.price || 0) : 0;
    const consultAddonPrice = isPhone && CONSULT_ADDON ? 500 : 0;
    let optionPrice = variant ? Number(variant.price||0) : 0;
    if (isPhone && consultPack){
      optionPrice = getConsultPackDelta(consultPack);
    }
    const actualUnit = basePrice + optionPrice + addonPrice + consultAddonPrice;
    let promoDisplayPrice = 0;
    let promoOriginalPrice = 0;
    let promoActive = false;
    if (isPhone){
      const promoPack = getPromoDisplayPrice(detail, consultPack ? consultPack.key : 'en');
      if (promoPack && Number.isFinite(promoPack) && promoPack > 0){
        const promoUnit = promoPack + consultAddonPrice;
        if (promoUnit < actualUnit){
          promoDisplayPrice = promoUnit;
          promoOriginalPrice = actualUnit;
          promoActive = true;
        }
      }
    }
    return {
      uid: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      serviceId: svcId,
      serviceName: detail.name || '服務',
      basePrice: basePrice,
      optionName: isPhone ? (consultPack ? consultPack.label : '') : (variant ? variant.name : ''),
      optionPrice: optionPrice + addonPrice + consultAddonPrice,
      addonSummary,
      addonPrice,
      qty,
      qtyEnabled,
      qtyLabel,
      serviceFee: fee,
      serviceFeeLabel: feeLabel,
      photoRequired,
      slotKey,
      slotHoldToken,
      slotStart,
      slotHoldUntilMs,
      consultPackKey: consultPack ? consultPack.key : '',
      consultPackLabel: consultPack ? consultPack.label : '',
      consultPackPrice: isPhone ? (basePrice + optionPrice) : consultPackPrice,
      consultAddonSummary: !!CONSULT_ADDON,
      consultAddonPrice: consultAddonPrice,
      promoActive,
      promoDisplayPrice,
      promoOriginalPrice,
      image: (Array.isArray(detail.gallery) && detail.gallery[0]) || detail.cover || ''
    };
  }

  function stashPendingService(item){
    if (!item) return;
    try{
      localStorage.setItem('__svcPendingAddToCart__', JSON.stringify(item));
      localStorage.setItem('__addSvcPendingAfterLogin','1');
      localStorage.setItem('__openSvcCartAfterLogin','1');
      if (item.serviceId) localStorage.setItem('__svcBackToDetailId__', String(item.serviceId));
    }catch(_){}
  }

  function clearCartBackId(){
    try{ localStorage.removeItem('__svcBackToDetailId__'); }catch(_){}
  }

  async function addPendingServiceToCart(){
    let pending = null;
    try{
      const raw = localStorage.getItem('__svcPendingAddToCart__');
      if (raw) pending = JSON.parse(raw);
    }catch(_){}
    try{ localStorage.removeItem('__svcPendingAddToCart__'); }catch(_){}
    if (!pending) return false;
    if (isPhoneConsultService(pending)){
      if (!pending.slotKey){
        alert('請先選擇預約時段');
        return false;
      }
    }
    let cart = loadCart();
    cart = ensureSingleService(cart, pending.serviceId);
    if (cart === null) return false;
    cart.push(pending);
    saveCart(cart);
    renderCartPanel();
    updateCartBadge(cart);
    return true;
  }

  function openServiceCartPanel(){
    renderCartPanel();
    if (cartPanel) openDialog(cartPanel);
  }

  async function addCurrentSelection(){
    if (!detailDataset) return;
    const limitedTs = parseLimitedUntil(detailDataset && detailDataset.limitedUntil);
    if (limitedTs && Date.now() >= limitedTs){
      alert('此服務已結束上架');
      return;
    }
    const isPhone = isPhoneConsultService(detailDataset);
    if (isPhone && !CURRENT_DETAIL_SLOT.slotHoldToken && !CURRENT_DETAIL_SLOT.pendingSlotKey){
      setSlotStateText('請先選擇預約時段', true);
      return;
    }
    if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
      const item = buildServiceCartItem(detailDataset);
      if (!item) return;
      closeDialog(detailDialog);
      if (cartPanel) closeDialog(cartPanel);
      stashPendingService(item);
      if (window.authState && typeof window.authState.login === 'function'){
        window.authState.login();
      }else{
        window.location.href = '/api/auth/google/login?prompt=select_account';
      }
      return;
    }
    const item = buildServiceCartItem(detailDataset);
    if (!item) return;
    let cart = loadCart();
    cart = ensureSingleService(cart, item.serviceId);
    if (cart === null) return;
    cart.push(item);
    saveCart(cart);
    renderCartPanel();
    updateCartBadge(cart);
    closeDialog(detailDialog);
    renderCartPanel();
    if (cartPanel) openDialog(cartPanel);
    try{
      if (window.trackEvent) window.trackEvent('service_add_to_cart', { itemId: item.serviceId, qty: item.qty });
    }catch(_){}
  }

  function renderCheckoutSummary(cart){
    if (!Array.isArray(cart) || !cart.length) return;
    const sync = syncHoldWithCart(cart);
    const finalCart = sync.changed ? sync.cart : cart;
    if (sync.changed) saveCart(finalCart);
    const svcId = finalCart[0].serviceId || '';
    lastCartSnapshot = finalCart.map(item => Object.assign({}, item));
    const isPhone = finalCart.some(item => isPhoneConsultService(item));
    const photoRequired = finalCart.some(item => isRitualPhotoRequired(item));
    const serviceName = finalCart[0] && finalCart[0].serviceName ? finalCart[0].serviceName : '';
    applyPhoneConsultCheckoutFields(isPhone, serviceName, photoRequired);
    applyRequestDateVisibility(cart);
    const selectedOpts = [];
    finalCart.forEach(it => {
      const qty = getItemQty(it);
      if (it.optionName){
        for (let i=0;i<qty;i++){
          selectedOpts.push({ name: it.optionName, price: it.optionPrice });
        }
      }
      if (it.addonSummary){
        for (let i=0;i<qty;i++){
          selectedOpts.push({ name: it.addonSummary, price: it.addonPrice || 0 });
        }
      }
    });
    const baseCount = finalCart.filter(it => !it.optionName).reduce((sum, it)=> sum + getItemQty(it), 0) || 0;
    if (checkoutForm){
      checkoutForm.dataset.selectedOptions = JSON.stringify(selectedOpts);
      checkoutForm.dataset.baseCount = String(baseCount);
      checkoutForm.dataset.serviceId = svcId;
      checkoutForm.dataset.serviceFee = String(getCartFee(cart));
      checkoutForm.dataset.serviceFeeLabel = getCartFeeLabel(cart);
    }
    if (checkoutServiceIdInput) checkoutServiceIdInput.value = svcId;
    if (checkoutServiceName) checkoutServiceName.textContent = finalCart[0].serviceName || '服務';
    if (checkoutSummary){
      const lines = finalCart.map(item => {
        const qty = getItemQty(item);
        const promoUnit = Number(item && item.promoActive ? item.promoDisplayPrice : 0);
        const unit = promoUnit > 0 ? promoUnit : (Number(item.basePrice||0)+Number(item.optionPrice||0));
        const label = escapeHtml(getCartItemOptionLabel(item)) + (qty > 1 ? ` × ${qty}` : '');
        const slotLine = item.slotStart ? `<div class="muted">預約時段：${escapeHtml(item.slotStart)}</div>` : '';
        const tzLine = item.slotStart && isPhoneConsultService(item)
          ? `<div class="muted" style="color:#dc2626;">台灣時間：${escapeHtml(formatTaipeiFromBkk(item.slotStart))}</div>`
          : '';
        const packLine = item.consultPackLabel ? `<div class="muted">方案：${escapeHtml(item.consultPackLabel)}</div>` : '';
        const addonLine = item.consultAddonSummary ? `<div class="muted">加購：轉譯＋摘要</div>` : '';
        return `<li>${label}｜${formatTWD(unit * qty)}${slotLine}${tzLine}${packLine}${addonLine}</li>`;
      });
      const fee = getCartFee(finalCart);
      if (fee > 0){
        lines.push(`<li>${escapeHtml(getCartFeeLabel(cart))}｜${formatTWD(fee)}</li>`);
      }
      checkoutSummary.innerHTML = lines.join('');
    }
    const total = cartTotal(finalCart);
    if (checkoutTotal) checkoutTotal.textContent = formatTWD(total);
    if (slotChangeBtn){
      const phoneItem = finalCart.find(it => isPhoneConsultService(it));
      slotChangeBtn.style.display = (phoneItem && phoneItem.slotHoldToken) ? '' : 'none';
    }
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
    try{
      if (window.trackEvent) window.trackEvent('service_checkout_start', { itemId: cart[0].serviceId || '' });
    }catch(_){}
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
      const err = (data && data.error) || '';
      const msg = mapUserErrorMessage(err) || (data && data.error) || '提交失敗';
      throw new Error(msg);
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
        lastLookupPhone = phone;
        lastLookupTransfer = bankDigits;
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
    lastLookupResult = Array.isArray(list) ? list : [];
    lookupCards.innerHTML = '';
    if (!list.length){
      lookupCards.innerHTML = '<div style="color:#94a3b8;">查無資料，請確認輸入是否正確。</div>';
    }else{
      list.forEach(order=>{
        const transfer = order && order.transfer ? order.transfer : {};
        const directTotal = Number(transfer.amount || order.amount || order.totalAmount || order.total || 0);
        let totalAmount = Number.isFinite(directTotal) && directTotal > 0 ? directTotal : 0;
        if (!totalAmount && Array.isArray(order.items)){
          totalAmount = order.items.reduce((sum, it)=>{
            const line = Number(it && (it.total ?? it.amount));
            if (Number.isFinite(line) && line > 0) return sum + line;
            const price = Number(it && (it.price ?? it.basePrice ?? 0));
            const qty = Number(it && (it.qty ?? it.quantity ?? 1));
            if (Number.isFinite(price) && price > 0){
              return sum + price * (Number.isFinite(qty) && qty > 0 ? qty : 1);
            }
            return sum;
          }, 0);
        }
        const selectionNames = Array.isArray(order.selectedOptions) && order.selectedOptions.length
          ? order.selectedOptions.map(opt => opt && opt.name ? opt.name : '').filter(Boolean)
          : (order.selectedOption && order.selectedOption.name ? [order.selectedOption.name] : []);
        const serviceLine = selectionNames.length
          ? `${escapeHtml(order.serviceName || '')}｜${escapeHtml(selectionNames.join('、'))}`
          : escapeHtml(order.serviceName || '');
        const buyer = order && order.buyer ? order.buyer : {};
        const resultUrl = resolveResultPhoto(order);
        const isPhoneOrder = isPhoneConsultOrder(order);
        const scheduleLabel = isPhoneOrder && order.slotStart ? order.slotStart : (order.requestDate || '—');
        const canReschedule = canRequestReschedule(order);
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
          <div style="font-size:13px;color:#475569;">生日：${escapeHtml(buyer.birth || '—')}｜指定日期：${escapeHtml(scheduleLabel)}</div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">總金額：${formatTWD(totalAmount)}</div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">備註：${escapeHtml(order.note || '—')}</div>
          ${canReschedule ? `
          <div style="margin-top:12px;">
            <div style="font-size:12px;color:#64748b;">請於預約時間 48 小時前申請</div>
            <button type="button" class="btn primary" data-reschedule-order="${escapeHtml(order.id || '')}">申請改期 / Request Reschedule</button>
          </div>` : ''}
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
    cartPanelClose.addEventListener('click', ()=>{
      closeDialog(cartPanel);
      clearCartBackId();
    });
  }
  if (cartPanelBack){
    cartPanelBack.addEventListener('click', ()=>{
      closeDialog(cartPanel);
      if (lastDetailService){
        openServiceDetail(lastDetailService);
        clearCartBackId();
        return;
      }
      let backId = '';
      try{ backId = localStorage.getItem('__svcBackToDetailId__') || ''; }catch(_){}
      if (backId){
        const target = serviceItems.find(it => String(resolveServiceId(it)) === String(backId));
        clearCartBackId();
        if (target){
          openServiceDetail(target);
        }
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
    cartCheckoutBtn.addEventListener('click', async ()=>{
      const cart = loadCart();
      if (!cart.length){
        alert('購物車是空的');
        return;
      }
      const phoneItem = cart.find(it => isPhoneConsultService(it));
      if (phoneItem){
        if (!phoneItem.slotKey){
          alert('請先選擇預約時段');
          return;
        }
        if (!phoneItem.slotHoldToken){
          if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
            if (window.authState && typeof window.authState.login === 'function'){
              window.authState.login();
            }else{
              window.location.href = '/api/auth/google/login?prompt=select_account';
            }
            return;
          }
          const holdRes = await requestHold(phoneItem.serviceId, phoneItem.slotKey);
          if (!holdRes.ok){
            if (holdRes.error === 'UNAUTHORIZED' && window.authState && typeof window.authState.login === 'function'){
              window.authState.login();
              return;
            }
            alert(mapUserErrorMessage(holdRes.error) || '無法保留時段，請稍後再試');
            return;
          }
          phoneItem.slotHoldToken = holdRes.data.holdToken || '';
          phoneItem.slotHoldUntilMs = Number(holdRes.data.heldUntil || 0) || 0;
          if (!phoneItem.slotStart){
            const parsed = parseSlotKeyDateTime(phoneItem.slotKey);
            phoneItem.slotStart = parsed.date && parsed.time ? `${parsed.date} ${parsed.time}` : '';
          }
          saveHoldToStorage(phoneItem.serviceId, {
            serviceId: phoneItem.serviceId,
            slotKey: phoneItem.slotKey,
            slotHoldToken: phoneItem.slotHoldToken,
            slotStart: phoneItem.slotStart,
            holdUntilMs: phoneItem.slotHoldUntilMs
          });
          saveCart(cart);
        }
      }
      closeDialog(cartPanel);
      clearCartBackId();
      openCheckoutDialog();
    });
  }
  if (cartListEl){
    cartListEl.addEventListener('click', e=>{
      const qtyBtn = e.target.closest && e.target.closest('[data-qty]');
      if (qtyBtn){
        const uid = qtyBtn.getAttribute('data-uid');
        const op = qtyBtn.getAttribute('data-qty');
        let cart = loadCart();
        const idx = cart.findIndex(item => item.uid === uid);
        if (idx < 0) return;
        const cur = getItemQty(cart[idx]);
        const next = op === 'inc' ? cur + 1 : Math.max(1, cur - 1);
        cart[idx].qty = next;
        saveCart(cart);
        renderCartPanel();
        return;
      }
      const btn = e.target.closest('button[data-remove]');
      if (!btn) return;
      const uid = btn.getAttribute('data-remove');
      let cart = loadCart();
      cart = cart.filter(item => item.uid !== uid);
      saveCart(cart);
      renderCartPanel();
    });
    cartListEl.addEventListener('change', e=>{
      const input = e.target.closest && e.target.closest('[data-qty-input]');
      if (!input) return;
      const uid = input.getAttribute('data-uid');
      let cart = loadCart();
      const idx = cart.findIndex(item => item.uid === uid);
      if (idx < 0) return;
      const val = Math.max(1, Number(input.value||1) || 1);
      cart[idx].qty = val;
      saveCart(cart);
      renderCartPanel();
    });
  }
  if (checkoutDialog){
    checkoutDialog.addEventListener('close', ()=>{
      resetCheckoutFlow();
    });
  }

  try{
    window.__addPendingServiceToCart = addPendingServiceToCart;
    window.openServiceCartPanel = openServiceCartPanel;
    if (window.authState && typeof window.authState.isLoggedIn === 'function' && window.authState.isLoggedIn()){
      if (localStorage.getItem('__addSvcPendingAfterLogin') === '1'){
        const added = addPendingServiceToCart();
        if (added && typeof added.then === 'function'){
          added.then(res=>{
            if (res !== false) localStorage.removeItem('__addSvcPendingAfterLogin');
          });
        }else if (added !== false){
          localStorage.removeItem('__addSvcPendingAfterLogin');
        }
      }
      if (localStorage.getItem('__openSvcCartAfterLogin') === '1'){
        openServiceCartPanel();
        localStorage.removeItem('__openSvcCartAfterLogin');
      }
    }
  }catch(_){}

  setRequestDateMin();
  if (window.authState){
    window.authState.onProfile(profile=>{
      try{ console.debug && console.debug('[svc] onProfile', profile); }catch(_){}
      lastProfile = profile;
      fillContactFromProfile(profile);
      updateHoldOwnerKey(profile);
    });
    if (typeof window.authState.getProfile === 'function'){
      const existingProfile = window.authState.getProfile();
      try{ console.debug && console.debug('[svc] existing profile', existingProfile); }catch(_){}
      if (existingProfile){ lastProfile = existingProfile; fillContactFromProfile(existingProfile); updateHoldOwnerKey(existingProfile); }
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
  if (slotChangeBtn){
    slotChangeBtn.addEventListener('click', async ()=>{
      const cart = loadCart();
      const phoneItem = cart.find(it => isPhoneConsultService(it));
      if (!phoneItem) return;
      const serviceId = phoneItem.serviceId;
      slotChangeBtn.disabled = true;
      const oldText = slotChangeBtn.textContent;
      slotChangeBtn.textContent = '釋放中…';
      const releaseRes = await releaseHoldOnServer(serviceId, phoneItem.slotKey, phoneItem.slotHoldToken);
      if (releaseRes.ok && (releaseRes.released || releaseRes.reason === 'hold_not_found')){
        clearHoldFromStorage(serviceId);
        clearSlotFromCart(serviceId);
        resetSlotState();
      }else{
        LAST_RELEASE_MSG = '目前無法釋放原本時段，請稍後再試';
      }
      slotChangeBtn.disabled = false;
      slotChangeBtn.textContent = oldText;
      SKIP_AUTO_RESUME = true;
      closeDialog(checkoutDialog);
      const target = allServiceItems.find(s => String(resolveServiceId(s)) === String(serviceId || ''));
      if (target){
        openServiceDetail(target);
      }
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
      const submitTip = document.getElementById('svcSubmitTip');
      if (submitTip) submitTip.classList.add('show');
      if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
        if (window.authState && typeof window.authState.promptLogin === 'function'){
          window.authState.promptLogin('請先登入後再送出匯款資料。');
        }else{
          alert('請先登入後再送出匯款資料。');
          window.location.href = '/api/auth/google/login?prompt=select_account';
        }
        if (submitTip) submitTip.classList.remove('show');
        return;
      }
      const serviceIdFromInput = checkoutServiceIdInput ? checkoutServiceIdInput.value : '';
      const serviceId = serviceIdFromInput || (checkoutForm && checkoutForm.dataset ? checkoutForm.dataset.serviceId : '') || '';
      if (!serviceId){
        alert('缺少服務資訊，請重新選擇。');
        if (submitTip) submitTip.classList.remove('show');
        return;
      }
      if (!checkoutContact){
        alert('請先填寫基本資料');
        setCheckoutStep(1);
        if (submitTip) submitTip.classList.remove('show');
        return;
      }
      const last5 = bankLast5Input ? bankLast5Input.value.trim() : '';
      if (!/^\d{5}$/.test(last5)){
        alert('請輸入 5 位數的匯款末五碼');
        if (bankLast5Input) bankLast5Input.focus();
        if (submitTip) submitTip.classList.remove('show');
        return;
      }
      const cart = loadCart();
      if (!cart.length){
        alert('購物車為空，請重新選擇服務。');
        if (submitTip) submitTip.classList.remove('show');
        return;
      }
      const slotItem = cart.find(it => isPhoneConsultService(it) && it.slotHoldToken && it.slotKey);
      checkoutSubmitBtn.disabled = true;
      checkoutSubmitBtn.textContent = '送出中…';
      checkoutSubmitBtn.classList.add('loading');
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
          ritualPhotoUrl: checkoutRitualPhoto.url || '',
          slotKey: slotItem ? slotItem.slotKey : '',
          slotHoldToken: slotItem ? slotItem.slotHoldToken : '',
          slotStart: slotItem ? slotItem.slotStart : ''
        };
        if (slotItem && slotItem.slotStart){
          payload.requestDate = slotItem.slotStart;
        }
        const result = await submitServiceOrder(payload);
        lastOrderResult = result;
        saveCart([]);
        renderCartPanel();
        updateCartBadge([]);
        const finalAmount = (result && result.order && Number(result.order.amount)) || Number(result.amount) || totalAmount;
        renderCheckoutSuccess(result.orderId || result.id || '', finalAmount);
        if (result && result.order){
          updateRescheduleButtons(result.order);
          updateBookingNotice(result.order);
        }
        if (slotItem && slotItem.serviceId) clearHoldFromStorage(slotItem.serviceId);
        resetSlotState();
        try{
          if (window.trackEvent) window.trackEvent('service_order_submit', { itemId: serviceId, value: finalAmount });
        }catch(_){}
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
        checkoutSubmitBtn.classList.remove('loading');
        if (submitTip) submitTip.classList.remove('show');
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
  if (rescheduleClose){
    rescheduleClose.addEventListener('click', ()=> closeDialog(rescheduleDialog));
  }
  if (rescheduleSubmitBtn){
    rescheduleSubmitBtn.addEventListener('click', submitRescheduleRequest);
  }

  if (checkoutDialog){
    setCheckoutStep(1);
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    HOLD_OWNER_KEY = getHoldOwnerKey();
    const services = await fetchServices();
    const allServices = Array.isArray(services) ? services : [];
    const cfg = await loadPhoneConsultConfig();
    const adminMe = await getAdminMe();
    ADMIN_ROLE = adminMe && adminMe.ok ? adminMe.role : '';
    ADMIN_PREVIEW_MODE = !!(cfg && cfg.isAdmin);
    __IS_ADMIN_VIEWER__ = ADMIN_PREVIEW_MODE;
    console.log('[admin-preview]', { enabled: ADMIN_PREVIEW_MODE, ts: new Date().toISOString() });
    if (adminPreviewBadge){
      adminPreviewBadge.style.display = ADMIN_PREVIEW_MODE ? 'inline-flex' : 'none';
    }
    allServiceItems = allServices;
    bindHotToggle();
    const phoneTarget = findPhoneConsultService(allServices);
    let canShowPromo = !!(phoneTarget && canShowPhoneConsultToViewer(phoneTarget));
    if (canShowPromo){
      initPhonePromo(allServices);
    }else if (promoSection){
      promoSection.style.display = 'none';
    }
    if (launchToggle) launchToggle.style.display = 'none';
    applyServiceVisibility();
    openServiceFromUrl();
    if (emptyEl) emptyEl.remove();
    initLookupDialog();
    updateCartBadge();
    renderCartPanel();
  });
  function resolveServiceId(service){
    if (!service) return '';
    return service.serviceId || service.service_id || service.id || service._id || service.key || service._key || '';
  }

  function parseServiceIdFromSearch(){
    const params = new URLSearchParams(window.location.search || '');
    return params.get('id') || params.get('sid') || params.get('serviceId') || '';
  }

  function parseServiceIdFromHash(){
    const hash = String(window.location.hash || '').replace(/^#/, '');
    if (!hash || !hash.includes('=')) return '';
    try{
      const params = new URLSearchParams(hash);
      return params.get('id') || params.get('sid') || params.get('serviceId') || '';
    }catch(_){
      return '';
    }
  }

  function clearServiceUrl(source){
    try{
      if (source === 'search'){
        const params = new URLSearchParams(window.location.search || '');
        params.delete('id');
        params.delete('sid');
        params.delete('serviceId');
        const qs = params.toString();
        const next = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
        if (history && typeof history.replaceState === 'function'){
          history.replaceState(null, document.title || '', next);
        }else{
          window.location.search = qs ? `?${qs}` : '';
        }
        return;
      }
      if (window.location.hash){
        if (history && typeof history.replaceState === 'function'){
          history.replaceState(null, document.title || '', window.location.pathname + window.location.search);
        }else{
          window.location.hash = '';
        }
      }
    }catch(_){}
  }

  function openServiceFromUrl(){
    const searchId = parseServiceIdFromSearch();
    const hashId = parseServiceIdFromHash();
    const sid = pendingServiceId || searchId || hashId;
    if (!sid) return;
    const source = pendingServiceId ? pendingServiceSource : (searchId ? 'search' : (hashId ? 'hash' : ''));
    if (!serviceItems.length){
      pendingServiceId = sid;
      pendingServiceSource = source;
      return;
    }
    const item = serviceItems.find(it => String(resolveServiceId(it)) === String(sid));
    pendingServiceId = '';
    pendingServiceSource = '';
    if (!item) return;
    openServiceDetail(item);
    clearServiceUrl(source);
  }
  if (lookupCards){
    lookupCards.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-result-url]');
      if (btn){
        const url = btn.getAttribute('data-result-url');
        if (!url) return;
        window.open(url, '_blank', 'noopener');
        return;
      }
      const resBtn = e.target.closest('button[data-reschedule-order]');
      if (resBtn){
        const orderId = resBtn.getAttribute('data-reschedule-order');
        const order = (lastLookupResult || []).find(item => String(item.id) === String(orderId));
        if (order && canRequestReschedule(order)) openRescheduleDialog(order);
      }
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
    try{
      const u = new URL(src);
      const host = (u.hostname || '').toLowerCase();
      if (!host.endsWith('instagram.com')) return '';
      if (!/^\/(p|reel|tv)\//.test(u.pathname)) return '';
      const cleanPath = u.pathname.replace(/\/?$/, '/');
      const embed = `${u.origin}${cleanPath}embed`;
      return `<iframe src="${escapeHtml(embed)}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen="true" frameborder="0"></iframe>`;
    }catch(_){
      return '';
    }
  }

  window.addEventListener('hashchange', () => {
    openServiceFromUrl();
  });
})();
