const listEl = document.getElementById('list');
const banner = document.getElementById('banner');
const hotSection = document.getElementById('hotSection');
const hotList = document.getElementById('hotList');
let limitedTimer = null;

let rawItems = [];
let viewItems = [];
let pendingProductId = '';
let pendingProductSource = '';

const ESIM_AFFIL_URL = 'https://esimconnect.com.tw/#/access/esimbuy?referencecode=Unalomecodes';
const ESIM_PRODUCT_ID = 'esimconnect-affiliate';

function openExternal(url, meta){
  const eventName = (meta && (meta.event || meta.eventName)) ? String(meta.event || meta.eventName) : 'outbound_click';
  try{
    if (typeof window.track === 'function') window.track(eventName, meta || { url });
    else if (typeof window.trackEvent === 'function') window.trackEvent(eventName, meta || { url });
  }catch(_){}
  try{
    window.open(url, '_blank', 'noopener,noreferrer');
  }catch(_){
    // Fallback: allow navigation if popup blocked.
    try{ window.location.href = url; }catch(__){}
  }
}

function buildEsimProduct(){
  const meta = (window.__shopPageMeta && window.__shopPageMeta.esim && typeof window.__shopPageMeta.esim === 'object')
    ? window.__shopPageMeta.esim
    : {};
  const customBadges = String(meta.badges || '').split(',').map(s=>s.trim()).filter(Boolean);
  return {
    id: ESIM_PRODUCT_ID,
    name: String(meta.name || '泰國 eSIM 上網卡'),
    category: 'eSIM',
    basePrice: 0,
    sold: 0,
    stock: null,
    images: [String(meta.imageUrl || '/img/esim.svg')],
    externalUrl: String(meta.url || ESIM_AFFIL_URL),
    priceText: String(meta.priceText || '依方案計價'),
    badges: customBadges.length ? customBadges : ['合作商品']
  };
}
// 安全補丁：避免呼叫未定義
function refreshWishlistButtons() {
  try{
    if (window.wishlist && typeof window.wishlist.subscribe === 'function'){
      // 未來可在此綁定收藏按鈕狀態
    }
  }catch(_){}
}
// 目前不在列表卡顯示
const DEITY_PAGE = 'https://unalomecodes.pages.dev/deity.html';

function basePrice(p){ return Number(p.basePrice||0); }
function minPrice(p){
  if (Array.isArray(p.variants) && p.variants.length){
    const diffs = p.variants.map(v => Number(v.priceDiff||0));
    return basePrice(p) + Math.min(...diffs);
  }
  return basePrice(p);
}
function resolveTotalStock(p){
  if (!p) return null;
  const variants = Array.isArray(p.variants) ? p.variants : [];
  if (variants.length){
    let hasStock = false;
    let sum = 0;
    for (const v of variants){
      if (v && v.stock !== undefined && v.stock !== null){
        const n = Number(v.stock);
        if (Number.isFinite(n)){
          hasStock = true;
          sum += n;
        }
      }
    }
    if (hasStock) return sum;
  }
  if (p.stock !== undefined && p.stock !== null){
    const n = Number(p.stock);
    return Number.isFinite(n) ? n : 0;
  }
  return null;
}

function parseProductIdFromSearch(){
  const params = new URLSearchParams(window.location.search || '');
  return params.get('id') || params.get('pid') || params.get('productId') || '';
}

function parseProductIdFromHash(){
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash || hash.includes('lookup=')) return '';
  if (!hash.includes('=')) return '';
  try{
    const params = new URLSearchParams(hash);
    return params.get('id') || params.get('pid') || params.get('productId') || '';
  }catch(_){
    return '';
  }
}

function clearProductUrl(source){
  try{
    if (source === 'search'){
      const params = new URLSearchParams(window.location.search || '');
      params.delete('id');
      params.delete('pid');
      params.delete('productId');
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

function openProductFromUrl(){
  const searchId = parseProductIdFromSearch();
  const hashId = parseProductIdFromHash();
  const pid = pendingProductId || searchId || hashId;
  if (!pid) return;
  const source = pendingProductId ? pendingProductSource : (searchId ? 'search' : (hashId ? 'hash' : ''));
  if (!rawItems.length){
    pendingProductId = pid;
    pendingProductSource = source;
    return;
  }
  const item = rawItems.find(it => String(it.id) === String(pid));
  pendingProductId = '';
  pendingProductSource = '';
  if (!item) return;
  try{
    if (item && item.externalUrl){
      openExternal(item.externalUrl, { event:'esim_click', url: item.externalUrl, placement:'shop_deeplink', productId: String(item.id || '') });
    }else{
      openDetail(item);
    }
    clearProductUrl(source);
  }catch(err){
    console.error('openDetail failed', err);
  }
}

function getLimitedInfo(p){
  const ts = parseLimitedUntil(p && p.limitedUntil);
  if (!ts) return null;
  return { ts, label: formatLimitedLabel(ts) };
}

function buildLimitedRow(p, labelText){
  const info = getLimitedInfo(p);
  if (!info) return '';
  return `
    <div class="meta meta-limited">
      <span class="badge badge-limited">${labelText}</span>
      <span class="badge badge-remaining" data-limited-until="${info.ts}">${info.label}</span>
    </div>
  `;
}

function buildProductCard(p, opts = {}){
  const isExternal = !!(p && p.externalUrl);
  const img = sanitizeImageUrl((p.images && p.images[0]) ? p.images[0] : '');
  const price = minPrice(p);
  const stockTotal = resolveTotalStock(p);
  const stockBadge = stockTotal === null
    ? ''
    : `<span class="badge badge-stock ${stockTotal > 0 ? 'ok' : 'zero'}">庫存：${escapeHtml(String(stockTotal))}</span>`;
  const deityBadge = p.deity ? `<span class="badge badge-deity">${escapeHtml(p.deity)}</span>` : '';
  const limitedRow = buildLimitedRow(p, '限時商品'); // buildLimitedRow 内部已使用 escapeHtml

  const card = document.createElement('div');
  card.className = 'card' + (opts.hot ? ' hot-card' : '');
  card.setAttribute('data-id', String(p.id || ''));
  
  // 使用更安全的方式构建 DOM，减少 innerHTML 使用
  const picDiv = document.createElement('div');
  picDiv.className = 'pic';
  if (img) {
    const imgEl = document.createElement('img');
    // 使用懒加载
    if (typeof setLazyImage === 'function') {
      setLazyImage(imgEl, img);
    } else {
      imgEl.src = img;
      imgEl.loading = 'lazy';
    }
    imgEl.alt = '';
    imgEl.decoding = 'async';
    picDiv.appendChild(imgEl);
  }
  
  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'body';
  
  const nameDiv = document.createElement('div');
  nameDiv.className = 'name';
  nameDiv.textContent = p.name || '';
  bodyDiv.appendChild(nameDiv);
  
  if (limitedRow) {
    const limitedDiv = document.createElement('div');
    limitedDiv.innerHTML = limitedRow;
    bodyDiv.appendChild(limitedDiv);
  }
  
  if (deityBadge) {
    const metaTop = document.createElement('div');
    metaTop.className = 'meta meta-top';
    metaTop.innerHTML = deityBadge;
    bodyDiv.appendChild(metaTop);
  }
  
  const metaBottom = document.createElement('div');
  metaBottom.className = 'meta meta-bottom';
  if (isExternal){
    const tags = Array.isArray(p.badges) ? p.badges.filter(Boolean) : [];
    metaBottom.innerHTML = tags.length
      ? tags.map(t => `<span class="badge badge-sold">${escapeHtml(String(t))}</span>`).join(' ')
      : `<span class="badge badge-sold">合作商品</span>`;
  }else{
    metaBottom.innerHTML = `
      <span class="badge badge-sold">已售出：${escapeHtml(String(Number(p.sold||0)))}</span>
      ${stockBadge}
    `;
  }
  bodyDiv.appendChild(metaBottom);
  
  const priceDiv = document.createElement('div');
  priceDiv.className = 'price';
  priceDiv.textContent = isExternal && p.priceText
    ? String(p.priceText)
    : `NT$ ${formatPrice(price)}`;
  bodyDiv.appendChild(priceDiv);
  
  const ctaDiv = document.createElement('div');
  ctaDiv.className = 'cta';
  const btn = document.createElement('button');
  btn.className = 'btn primary';
  if (isExternal){
    btn.textContent = '前往購買';
    btn.addEventListener('click', () => openExternal(p.externalUrl, { event:'esim_click', url: p.externalUrl, placement:'shop', productId: String(p.id || '') }));
  }else{
    btn.setAttribute('data-open-detail', '1');
    btn.textContent = '查看商品';
    btn.addEventListener('click', () => openDetail(p));
  }
  ctaDiv.appendChild(btn);
  bodyDiv.appendChild(ctaDiv);
  
  card.appendChild(picDiv);
  card.appendChild(bodyDiv);
  
  return card;
}

// 使用常量定义更新间隔
const LIMITED_UPDATE_INTERVAL = 60000; // 1分钟

function scheduleLimitedTimer(){
  if (limitedTimer) return;
  limitedTimer = setInterval(()=> updateLimitedCountdowns(document), LIMITED_UPDATE_INTERVAL);
}

function getHotItems(items){
  const list = (items || [])
    .filter(p => p && !isLimitedExpired(p.limitedUntil))
    .filter(p => Number(p.sold||0) > 0);
  list.sort((a,b)=>{
    const diff = Number(b.sold||0) - Number(a.sold||0);
    if (diff !== 0) return diff;
    return new Date(b.updatedAt||0) - new Date(a.updatedAt||0);
  });
  return list.slice(0, 3);
}

async function loadProducts(){
  try{
    const [prodRes, metaRes] = await Promise.all([
      fetch('/api/products?active=true',{cache:'no-store'}),
      fetch('/api/shop/meta',{cache:'no-store'}).catch(()=>null)
    ]);
    const data = await prodRes.json();
    if (data.ok === false){ throw new Error('API error'); }
    try{
      const metaData = metaRes ? await metaRes.json().catch(()=>null) : null;
      window.__shopPageMeta = (metaData && metaData.ok && metaData.meta) ? (metaData.meta || {}) : {};
    }catch(_){
      window.__shopPageMeta = {};
    }
    rawItems = Array.isArray(data.items) ? data.items : [];
    // Add external affiliate "product" (not part of cart/checkout).
    rawItems = rawItems.concat([buildEsimProduct()]);
    try{ window.rawItems = rawItems; }catch(_){}
    populateDeityFilter(rawItems);
    renderHotItems(rawItems);
    applyFilter();
    openProductFromUrl();
    banner.style.display = rawItems.length ? 'none' : 'block';
    banner.textContent = rawItems.length ? '' : '目前沒有上架商品'; const sk=document.getElementById('skeleton'); if(sk && rawItems.length===0) sk.style.display='none';
  }catch(e){
    // 如果先前已有資料，避免錯誤訊息覆蓋畫面
    if (rawItems.length){
      banner.style.display = 'none';
    }else{
      banner.style.display = 'block';
      banner.textContent = '讀取商品失敗，請稍後再試';
    }
    console.error('loadProducts error', e);
  }
}

function populateDeityFilter(items){
  const f = document.getElementById('fDeity');
  if (!f) return;
  while (f.options && f.options.length > 1){
    f.remove(1);
  }
  const set = new Set();
  items.forEach(p => { if (p.deity) set.add(p.deity); });
  [...set].sort().forEach(name=>{
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    f.appendChild(opt);
  });
}

function applyFilter(){
  const deity = document.getElementById('fDeity').value.trim();
  const min = Number(document.getElementById('fMin').value || 0);
  const maxVal = document.getElementById('fMax').value;
  const max = maxVal === '' ? Infinity : Number(maxVal);
  const sort = document.getElementById('fSort').value;

  // 從 shop.html 的 cats-inline 腳本讀取當前選擇的分類
  // 這裡使用一個全域變數來溝通
  const category = window.__currentCategoryFilter || null;
  const isHot = category === '__hot__';

  const filtered = rawItems.filter(p=>{
    const price = minPrice(p);
    if (deity && p.deity !== deity) return false;
    if (price < min) return false;
    if (price > max) return false;
    if (!isHot && category && p.category !== category) return false;
    if (isLimitedExpired(p && p.limitedUntil)) return false;
    return true;
  });

  viewItems = isHot ? getHotItems(filtered) : filtered;

  if (!isHot){
    if (sort === 'sold-desc') viewItems.sort((a,b)=>Number(b.sold||0)-Number(a.sold||0));
    else if (sort === 'price-asc') viewItems.sort((a,b)=>minPrice(a)-minPrice(b));
    else if (sort === 'price-desc') viewItems.sort((a,b)=>minPrice(b)-minPrice(a));
    else if (sort === 'newest') viewItems.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  }

  if (hotSection){
    if (isHot){
      hotSection.style.display = 'none';
    }else{
      renderHotItems(rawItems);
    }
  }
  renderList(viewItems);
}

function renderHotItems(items){
  if (!hotSection || !hotList) return;
  if (window.__currentCategoryFilter === '__hot__'){
    hotSection.style.display = 'none';
    return;
  }
  const top = getHotItems(items);
  if (!top.length){
    hotSection.style.display = 'none';
    hotList.innerHTML = '';
    return;
  }
  hotSection.style.display = '';
  hotList.innerHTML = '';
  top.forEach(p=>{
    hotList.appendChild(buildProductCard(p, { hot:true }));
  });
  updateLimitedCountdowns(hotList);
  scheduleLimitedTimer();
}

function renderList(items){
  listEl.innerHTML = '';
  if (!items.length){
    const isHot = window.__currentCategoryFilter === '__hot__';
    const msg = isHot ? '目前沒有熱賣中商品' : '沒有符合條件的商品';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty';
    emptyDiv.style.cssText = 'grid-column:1/-1';
    emptyDiv.textContent = msg;
    listEl.appendChild(emptyDiv);
    const sk=document.getElementById('skeleton'); if(sk) sk.style.display='none';
    return;
  }

  for (const p of items){
    const card = buildProductCard(p);
    listEl.appendChild(card);
  }
  const sk=document.getElementById('skeleton'); if(sk) sk.style.display='none';
  refreshWishlistButtons();
  updateLimitedCountdowns(listEl);
  scheduleLimitedTimer();
  
  // 初始化图片懒加载
  try{
    if (typeof initLazyLoad === 'function') {
      initLazyLoad('img[data-src]');
    }
  }catch(_){}
}

document.getElementById('fDeity').addEventListener('change', applyFilter);
document.getElementById('fMin').addEventListener('input', applyFilter);
document.getElementById('fMax').addEventListener('input', applyFilter);
document.getElementById('fSort').addEventListener('change', applyFilter);

// 後備：事件委派，避免按鈕未綁定時無法打開詳情
document.addEventListener('click', function(e){
  const btn = e.target && e.target.closest && e.target.closest('[data-open-detail]');
  if (!btn) return;
  e.preventDefault();
  const card = btn.closest('[data-id]');
  const pid = card ? card.getAttribute('data-id') : '';
  let p = null;
  try{
    if (pid && Array.isArray(window.rawItems)){
      p = window.rawItems.find(it => String(it.id) === pid);
    }
  }catch(_){}
  if (!p && card){
    // 嘗試從目前顯示的 viewItems 找
    try{ p = viewItems.find(it=> String(it.id) === pid); }catch(_){}
  }
  if (p){
    try{ openDetail(p); }catch(err){ console.error('openDetail failed', err); }
  }
}, true);

// 會員中心頂部下拉
(function(){
  const toggle = document.getElementById('memberMenuBtn');
  const panel = document.getElementById('memberMenuPanel');
  const arrow = document.getElementById('memberMenuArrow');
  const memberMenuBadge = document.getElementById('memberMenuBadge');
  const profileLink = panel ? panel.querySelector('a[data-profile]') : null;
  const dlg = document.getElementById('profileDialog');
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const phoneInput = document.getElementById('profilePhone');
  const saveBtn = document.getElementById('profileSave');
  const closeBtn = document.getElementById('profileClose');
  const statusEl = document.getElementById('profileStatus');
  const qnaLink = panel ? panel.querySelector('#adminQnaLink') : null;
  const qnaBadge = document.getElementById('adminQnaBadge');
  const userOrdersLink = panel ? panel.querySelector('#userOrdersLink') : null;
  const userQnaBadge = document.getElementById('userQnaBadge');
  const userCouponsLink = panel ? panel.querySelector('#userCouponsLink') : null;
  const userCouponBadge = document.getElementById('userCouponBadge');
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
    document.addEventListener('click', (ev)=>{
      if (!panel.contains(ev.target) && ev.target !== toggle){
        close();
      }
    });
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

// 將 loadProducts() 包在一個函式中，等待 shop.html 中的 DOMContentLoaded 事件觸發
function runMain() {
  loadProducts();
}

// 將 runMain 函式掛載到 window 物件上，以便 shop.html 可以呼叫它
window.runMain = runMain;

window.addEventListener('hashchange', () => {
  openProductFromHash();
});
