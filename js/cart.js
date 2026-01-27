// ===== Cart helpers & preview =====
// 使用优化的存储工具（如果可用）
let useOptimizedStorage = false;
try {
  if (typeof window !== 'undefined' && window.__storageManager) {
    useOptimizedStorage = true;
  }
} catch(_){}

function i18nCart(key, fallback){
  try{
    var t = window.UC_I18N && typeof window.UC_I18N.t === 'function' ? window.UC_I18N.t : null;
    if (!t) return fallback;
    var v = t(key);
    if (!v || v === key) return fallback;
    return v;
  }catch(_){
    return fallback;
  }
}

function cartLoad(){ 
  try{
    if (useOptimizedStorage && window.__storageManager) {
      return window.__storageManager.getItem('cart', []);
    }
    return JSON.parse(localStorage.getItem('cart')||'[]');
  }catch{
    return [];
  }
}

function cartSave(a, immediate = false){
  try{
    if (useOptimizedStorage && window.__storageManager) {
      window.__storageManager.setItem('cart', a, immediate);
    } else {
      localStorage.setItem('cart', JSON.stringify(a));
    }
    if (!a || !a.length){
      try{
        if (typeof resetStoreSelection === 'function'){
          resetStoreSelection();
        }
      }catch(_){}
    }
  }catch(err){
    console.error('[Cart] Failed to save cart:', err);
  }
}
function cartCount(){ return cartLoad().reduce((n,it)=> n + Math.max(1, Number(it.qty||1)), 0); }
function cartSum(){ return cartLoad().reduce((sum,it)=> sum + Number(it.price||0) * Math.max(1, Number(it.qty||1)), 0); }
function updateCartBadge(){
  const el = document.getElementById('cartBadge'); if (!el) return;
  el.textContent = cartCount();
}

function renderCart(){
  const list = document.getElementById('cartList');
  const total = document.getElementById('cartTotal');
  if (!list || !total) return;
  const arr = cartLoad();
  const couponBox = document.querySelector('.cartCoupon');
  const isCandleOnly = arr.length>0 && arr.every(it=> /蠟燭/.test(String(it.category||'') + String(it.name||'')));
  if (couponBox){ couponBox.style.display = isCandleOnly ? 'none' : 'grid'; }
  list.innerHTML = '';
  if (!arr.length){
    list.innerHTML = '<div class="empty">' + escapeHtml(i18nCart('shop.cart_empty','購物車目前是空的')) + '</div>';
  } else {
    for (let i=0;i<arr.length;i++){
      const it = arr[i];
      const div = document.createElement('div');
      div.className = 'cartItem';
      const name = escapeHtml(it.name||i18nCart('shop.item_fallback','商品'));
      const deity = escapeHtml(it.deity||'');
      const img = sanitizeImageUrl(it.image||'');
      const imgSafe = img ? escapeHtml(img) : '';
      const unit = Number(it.price||0);
      const qty = Math.max(1, Number(it.qty||1));
      const specLabel = i18nCart('shop.cart_spec','規格');
      const qtyLabel = i18nCart('shop.cart_qty','數量');
      const unitLabel = i18nCart('shop.cart_unit','單價');
      const rmLabel = i18nCart('shop.cart_remove','移除');
      div.innerHTML = `\
        <img src="${imgSafe||''}" alt="">\
        <div>\
          <div class="cartTitle">${name}</div>\
          <div class="muted">${deity}</div>\
          <div class="muted">${escapeHtml(specLabel)}：${escapeHtml(it.variantName||"")}｜${escapeHtml(qtyLabel)}：${qty}｜${escapeHtml(unitLabel)} ${formatPrice(unit)}</div>\
        </div>\
        <div class="cartCtl" data-idx="${i}">\
          <button class="btn" data-act="dec">-</button>\
          <input type="number" min="1" value="${qty}" data-act="qty">\
          <button class="btn" data-act="inc">+</button>\
          <button class="btn link" data-act="rm">${escapeHtml(rmLabel)}</button>\
        </div>`;
      list.appendChild(div);
    }
  }
  total.textContent = 'NT$ ' + formatPrice(cartSum());
  try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(e){}
}

function openCart(){
  renderCart();
  updateCartBadge();
  try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(e){}
  const dlg = document.getElementById('dlgCart');
  const closeBtn = document.getElementById('cartClose');
  const clearBtn = document.getElementById('cartClear');
  const go711 = document.getElementById('cartGo711');
  if (go711){ go711.href = '#'; go711.onclick = (ev)=>{ ev.preventDefault(); if (typeof openOrderDialog === 'function'){ try{ window.__checkoutChannelRef && window.__checkoutChannelRef.set && window.__checkoutChannelRef.set('bank'); }catch(_){ } openOrderDialog(); } else if (typeof openBankDialog === 'function'){ openBankDialog('cart'); } }; }
  const payCC = document.getElementById('cartPayCC');
  if (payCC){ payCC.href = '#'; payCC.onclick = (ev)=>{ ev.preventDefault(); openCreditDialog('cart'); }; }

  if (closeBtn) closeBtn.onclick = ()=> dlg.close();
  if (clearBtn) clearBtn.onclick = ()=>{ cartSave([]); renderCart(); updateCartBadge(); try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(e){} };
  if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
}

// events
document.addEventListener('click', (e)=>{
  const t = e.target;
  if (t){
    const trigger = (t.id === 'cartFab') ? t : (t.closest && t.closest('#cartFab'));
    if (trigger){ openCart(); }
  }
  // cart control delegation
  const ctl = t && t.closest && t.closest('.cartCtl');
  if (ctl){
    const idx = Number(ctl.getAttribute('data-idx'));
    const arr = cartLoad();
    if (!arr[idx]) return;
    const act = t.getAttribute('data-act');
    if (act === 'inc'){ arr[idx].qty = Math.max(1, Number(arr[idx].qty||1)) + 1; }
    else if (act === 'dec'){ arr[idx].qty = Math.max(1, Number(arr[idx].qty||1) - 1); }
    else if (act === 'rm'){ arr.splice(idx,1); }
    else { return; } // Do nothing if not inc/dec/rm
    cartSave(arr); renderCart(); updateCartBadge(); 
    try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(e){} 
  }
});

document.addEventListener('change', (e)=>{
  const input = e.target;
  if (!(input && input.getAttribute && input.getAttribute('data-act') === 'qty')) return;
  const ctl = input.closest && input.closest('.cartCtl');
  if (!ctl) return;
  const idx = Number(ctl.getAttribute('data-idx'));
  const arr = cartLoad();
  if (!arr[idx]) return;
  let qty = Number(input.value);
  if (!Number.isFinite(qty) || qty < 1){ qty = 1; }
  arr[idx].qty = qty;
  cartSave(arr);
  renderCart();
  updateCartBadge();
  try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(e){}
});

document.addEventListener('DOMContentLoaded', ()=>{
  updateCartBadge();
});
