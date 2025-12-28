const listEl = document.getElementById('list');
const banner = document.getElementById('banner');
const hotSection = document.getElementById('hotSection');
const hotList = document.getElementById('hotList');
let limitedTimer = null;

let rawItems = [];
let viewItems = [];
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
  const img = sanitizeImageUrl((p.images && p.images[0]) ? p.images[0] : '');
  const price = minPrice(p);
  const stockTotal = resolveTotalStock(p);
  const stockBadge = stockTotal === null
    ? ''
    : `<span class="badge badge-stock ${stockTotal > 0 ? 'ok' : 'zero'}">庫存：${stockTotal}</span>`;
  const deityBadge = p.deity ? `<span class="badge badge-deity">${escapeHtml(p.deity)}</span>` : '';
  const limitedRow = buildLimitedRow(p, '限時商品');

  const card = document.createElement('div');
  card.className = 'card' + (opts.hot ? ' hot-card' : '');
  card.setAttribute('data-id', String(p.id || ''));
  card.innerHTML = `
    <div class="pic">${img?`<img src="${escapeHtml(img)}" alt="" loading="lazy" decoding="async">`:''}</div>
    <div class="body">
      <div class="name">${escapeHtml(p.name)}</div>
      ${limitedRow}
      ${deityBadge ? `<div class="meta meta-top">${deityBadge}</div>` : ''}
      <div class="meta meta-bottom">
        <span class="badge badge-sold">已售出：${Number(p.sold||0)}</span>
        ${stockBadge}
      </div>
      <div class="price">NT$ ${formatPrice(price)}</div>
      <div class="cta">
        <button class="btn primary" data-open-detail="1">查看商品</button>
      </div>
    </div>
  `;
  const btn = card.querySelector('.btn.primary');
  if (btn){
    btn.addEventListener('click',()=>openDetail(p));
  }
  return card;
}

function scheduleLimitedTimer(){
  if (limitedTimer) return;
  limitedTimer = setInterval(()=> updateLimitedCountdowns(document), 60000);
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
    const res = await fetch('/api/products?active=true',{cache:'no-store'});
    const data = await res.json();
    if (data.ok === false){ throw new Error('API error'); }
    rawItems = Array.isArray(data.items) ? data.items : [];
    try{ window.rawItems = rawItems; }catch(_){}
    populateDeityFilter(rawItems);
    renderHotItems(rawItems);
    applyFilter();
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
    listEl.innerHTML = `<div class="empty" style="grid-column:1/-1">${msg}</div>`; const sk=document.getElementById('skeleton'); if(sk) sk.style.display='none';
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
  const profileLink = panel ? panel.querySelector('a[data-profile]') : null;
  const dlg = document.getElementById('profileDialog');
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const phoneInput = document.getElementById('profilePhone');
  const saveBtn = document.getElementById('profileSave');
  const closeBtn = document.getElementById('profileClose');
  const statusEl = document.getElementById('profileStatus');

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
    const close = ()=>{
      panel.style.display = 'none';
      toggle.textContent = '會員中心 ▾';
    };
    const open = ()=>{
      panel.style.display = 'block';
      toggle.textContent = '會員中心 ▴';
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
