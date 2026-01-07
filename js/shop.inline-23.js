(function(){
  function bindCC(){
    var cbtn = document.getElementById('cartPayCC');
    if (cbtn && !cbtn.__ccBound){
      cbtn.__ccBound = true;
      cbtn.addEventListener('click', function(ev){
        ev.preventDefault();
        if (window.__checkoutChannelRef && typeof window.__checkoutChannelRef.set==='function'){
          window.__checkoutChannelRef.set('cc');
        }
        try{ sessionStorage.setItem('__checkout_channel','cc'); }catch(_){}
        if (typeof window.__openOrderConfirmDialogUnified === 'function'){
          window.__openOrderConfirmDialogUnified();
        } else if (typeof window.openCreditDialog === 'function'){
          window.openCreditDialog('cart');
        } else {
          alert('信用卡付款模組尚未載入，請重新整理頁面後再試。');
        }
      });
    }
  }
  document.addEventListener('DOMContentLoaded', bindCC);
  bindCC();
})();
