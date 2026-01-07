(function(){
  // 將舊版單一優惠券邏輯全面降級為 no-op，避免與「cart-coupon-normalize-and-apply」的新多券邏輯產生衝突
  try{
    // 1) 關掉舊版全域物件 __coupon 上所有可能的動作函式
    window.__coupon = window.__coupon || {};
    var legacyFns = [
      'updateTotalsDisplay',
      'apply',
      'applyToCart',
      'applyToPending',
      'remove',
      'clear',
      'reset',
      'syncFromStorage',
      'init'
    ];
    legacyFns.forEach(function(k){
      try{ window.__coupon[k] = function(){ /* legacy disabled */ }; }catch(_){ }
    });

    // 2) 常見舊版全域函式名稱：一律覆寫為空函式，避免再改動金額
    var globalNames = [
      'applyCoupon',
      'applyCartCoupon',
      'applyBankCoupon',
      'cartApplyCoupon',
      'bankApplyCoupon',
      'recalcCartTotals',
      'recalcCouponTotals'
    ];
    globalNames.forEach(function(name){
      try{
        if (typeof window[name] === 'function'){
          window[name] = function(){ /* legacy disabled */ };
        }
      }catch(_){ }
    });

    // 3) 清除舊版在 localStorage / sessionStorage 裡使用的暫存 key，避免殘留 -200 折扣
    try{
      var lsKeys = [
        '__activeCoupon__',
        '__activeCoupons__',
        'coupon_subtotal',
        'coupon_discount',
        'coupon_grand',
        'coupon_lines'
      ];
      lsKeys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(_){ } });
    }catch(_){ }

    try{
      var ssKeys = [
        '__activeCoupon__',
        '__activeCoupons__',
        'coupon_subtotal',
        'coupon_discount',
        'coupon_grand',
        'coupon_lines'
      ];
      ssKeys.forEach(function(k){ try{ sessionStorage.removeItem(k); }catch(_){ } });
    }catch(_){ }

  }catch(_){ }
})();
