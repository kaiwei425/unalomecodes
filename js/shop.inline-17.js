(function(){
  function tw(n){ 
    try{ return 'NT$ ' + Number(n||0).toLocaleString('zh-TW'); }
    catch(e){ return 'NT$ ' + (Number(n||0).toFixed(0)); }
  }
  function readCart(){ 
    try{ var c = JSON.parse(localStorage.getItem('cart')||'[]'); return Array.isArray(c)?c:[]; }
    catch(e){ return []; } 
  }
  function subTotal(items){
    try{
      return items.reduce(function(s,it){
        return s + Number(it.price||0)*Math.max(1,Number(it.qty||1));
      },0);
    }catch(e){ return 0; }
  }

  // 讓頂部 bar 優先使用 window.__cartCouponState.assignment 的折扣
  function getCurrentDiscountTotal(){
    try{
      if (window.__cartCouponState && window.__cartCouponState.assignment){
        return Number(window.__cartCouponState.assignment.total||0) || 0;
      }
    }catch(e){}
    // 後備：若尚未建立多券狀態，預設 0（由購物車腳本負責主導折扣）
    return 0;
  }

  function updateTopTotals(){
    try{
      var items = readCart();
      var sub   = subTotal(items);
      var off   = getCurrentDiscountTotal();
      var grand = Math.max(0, sub - off);

      var elSub   = document.getElementById('topSubtotal');
      var elOff   = document.getElementById('topDiscount');
      var elGrand = document.getElementById('topGrand');
      if (elSub)   elSub.textContent   = tw(sub);
      if (elOff)   elOff.textContent   = off ? ('-' + tw(off).replace(/^NT\$\s*/, 'NT$ ')) : 'NT$ 0';
      if (elGrand) elGrand.textContent = tw(grand);

      var hint = document.getElementById('topCouponHint');
      if (hint){
        var cps = (window.__cartCouponState && window.__cartCouponState.coupons) || [];
        if (cps && cps.length){
          hint.style.display = '';
          hint.textContent = '已套用 ' + cps.length + ' 張優惠券，總折抵 ' 
                             + tw(off).replace(/^NT\$\s*/, 'NT$ ');
        }else{
          hint.style.display = 'none';
          hint.textContent = '';
        }
      }
    }catch(e){}
  }

  function applyTopCoupon(){
    try{
      var input = document.getElementById('topCouponInput');
      var code = (input && input.value || '').trim();
      if (!code){
        input && input.focus();
        return;
      }
      var cartInput = document.getElementById('cartCouponInput');
      var cartBtn   = document.getElementById('cartApply');
      if (!cartInput || !cartBtn){
        alert('找不到購物車優惠碼欄位，請稍後再試');
        return;
      }
      cartInput.value = code;
      cartBtn.click();
      setTimeout(updateTopTotals, 300);
    }catch(e){}
  }

  document.addEventListener('click', function(e){
    if (e.target && e.target.id === 'topCouponApply'){
      e.preventDefault();
      applyTopCoupon();
    }
  });

  document.addEventListener('DOMContentLoaded', updateTopTotals);
  window.addEventListener('storage', function(ev){
    if (!ev) return;
    if (ev.key === 'cart' || ev.key === '__cartCoupons__'){
      updateTopTotals();
    }
  });
})();
