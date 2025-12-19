const listEl = document.getElementById('list');
const banner = document.getElementById('banner');

let rawItems = [];
let viewItems = [];
let wishlistIds = [];

function refreshWishlistButtons(){
  document.querySelectorAll('button[data-wishlist]').forEach(btn=>{
    const id = btn.getAttribute('data-wishlist');
    const active = wishlistIds.includes(String(id));
    btn.classList.toggle('active', active);
    btn.innerHTML = active ? '❤️ 已收藏' : '🤍 收藏';
  });
}

if (window.wishlist){
  window.wishlist.subscribe(ids=>{
    wishlistIds = Array.isArray(ids) ? ids.map(String) : [];
    refreshWishlistButtons();
  });
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

async function loadProducts(){
  try{
    const res = await fetch('/api/products?active=true',{cache:'no-store'});
    const data = await res.json();
    if(!data.ok){ throw new Error('API error'); }
    rawItems = data.items || [];
    populateDeityFilter(rawItems);
    applyFilter();
    banner.style.display = rawItems.length ? 'none' : 'block';
    banner.textContent = rawItems.length ? '' : '目前沒有上架商品'; const sk=document.getElementById('skeleton'); if(sk && rawItems.length===0) sk.style.display='none';
  }catch(e){
    banner.style.display = 'block';
    banner.textContent = '讀取商品失敗，請稍後再試';
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

  viewItems = rawItems.filter(p=>{
    const price = minPrice(p);
    if (deity && p.deity !== deity) return false;
    if (price < min) return false;
    if (price > max) return false;
    if (category && p.category !== category) return false;
    return true;
  });

  if (sort === 'sold-desc') viewItems.sort((a,b)=>Number(b.sold||0)-Number(a.sold||0));
  else if (sort === 'price-asc') viewItems.sort((a,b)=>minPrice(a)-minPrice(b));
  else if (sort === 'price-desc') viewItems.sort((a,b)=>minPrice(b)-minPrice(a));
  else if (sort === 'newest') viewItems.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));

  renderList(viewItems);
}

function renderList(items){
  listEl.innerHTML = '';
  if (!items.length){
    listEl.innerHTML = '<div class="empty" style="grid-column:1/-1">沒有符合條件的商品</div>'; const sk=document.getElementById('skeleton'); if(sk) sk.style.display='none';
    return;
  }

  for (const p of items){
    const img = (p.images && p.images[0]) ? p.images[0] : '';
    const price = minPrice(p);
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', String(p.id || ''));
    card.innerHTML = `
      <div class="pic">${img?`<img src="${img}" alt="" loading="lazy" decoding="async">`:''}</div>
      <div class="body">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="meta">
          ${p.deity?`<span class="badge">${escapeHtml(p.deity)}</span>`:""}
          <span class="badge">已售出：${Number(p.sold||0)}</span>
        </div>
        <div class="price">NT$ ${formatPrice(price)}</div>
        <div class="cta">
          <button class="btn primary" data-open-detail="1">查看商品</button>
          <button class="btn wishlist-btn" data-wishlist="${escapeHtml(p.id || '')}">🤍 收藏</button>
        </div>
      </div>
    `;
    // 查看商品 -> 打開詳情
    card.querySelector('.btn.primary').addEventListener('click',()=>openDetail(p));
    const favBtn = card.querySelector('button[data-wishlist]');
    if (favBtn){
      favBtn.addEventListener('click', ev=>{
        ev.stopPropagation();
        if (!window.wishlist){
          alert('請登入後再使用收藏功能');
          return;
        }
        window.wishlist.toggle(p.id).catch(()=>{});
      });
    }
    // 加入卡片
    listEl.appendChild(card);
  const sk=document.getElementById('skeleton'); if(sk) sk.style.display='none';
  }
  refreshWishlistButtons();
}

document.getElementById('fDeity').addEventListener('change', applyFilter);
document.getElementById('fMin').addEventListener('input', applyFilter);
document.getElementById('fMax').addEventListener('input', applyFilter);
document.getElementById('fSort').addEventListener('change', applyFilter);

// 將 loadProducts() 包在一個函式中，等待 shop.html 中的 DOMContentLoaded 事件觸發
function runMain() {
  loadProducts();
}

// 將 runMain 函式掛載到 window 物件上，以便 shop.html 可以呼叫它
window.runMain = runMain;
