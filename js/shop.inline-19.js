(function(){
  if (window.__couponDeityNormalize__) return; window.__couponDeityNormalize__ = true;

  // --- deity inference from product name/title (both zh & en keywords) ---
  function inferDeityFromName(name){
    var s = (name||'').toString().toUpperCase();
    // Chinese keywords don't need case conversion, but keep both checks on same source string
    var raw = (name||'').toString();
    if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/i.test(raw)) return 'FM';
    if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/i.test(raw)) return 'GA';
    if (/崇迪|SOMDEJ|SOMDET/i.test(raw)) return 'CD';
    if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/i.test(raw)) return 'KP';
    if (/哈魯曼|H(AN|AR)UMAN/i.test(raw)) return 'HM';
    if (/拉胡|RAHU/i.test(raw)) return 'RH';
    if (/迦樓羅|GARUDA|K(AR|AL)UDA/i.test(raw)) return 'JL';
    if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/i.test(raw)) return 'ZD';
    if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/i.test(raw)) return 'ZF';
    if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/i.test(raw)) return 'WE';
    if (/徐祝|XU\s*ZHU|XUZHU/i.test(raw)) return 'XZ';
    if (/魂魄勇|HUN\s*PO\s*YONG|HPY/i.test(raw)) return 'HP';
    return '';
  }

  // Normalize deity for a single cart/pending item
  function normalizeItemDeity(it){
    if (!it || typeof it !== 'object') return it;
    var d = it.deity ? String(it.deity).toUpperCase() : '';
    if (!d){
      var nm = it.name || it.title || it.productName || '';
      d = inferDeityFromName(nm);
    }
    if (d) it.deity = d;
    return it;
  }

  // Normalize entire cart
  function normalizeCart(){
    try{
      var cart = JSON.parse(localStorage.getItem('cart')||'[]');
      if (Array.isArray(cart) && cart.length){
        var changed = false;
        for (var i=0;i<cart.length;i++){
          var before = cart[i] && cart[i].deity;
          normalizeItemDeity(cart[i]);
          if ((cart[i] && cart[i].deity) !== before) changed = true;
        }
        if (changed){
          localStorage.setItem('cart', JSON.stringify(cart));
          // notify observers (totals bar, etc.)
          try{ window.dispatchEvent(new StorageEvent('storage', { key:'cart', newValue: JSON.stringify(cart) })); }catch(e){}
        }
      }
    }catch(e){}
  }

  // Normalize pending detail (direct-buy path)
  function normalizePending(){
    try{
      var raw = sessionStorage.getItem('__pendingDetail__');
      if (!raw) return;
      var p = JSON.parse(raw);
      var before = p && p.deity;
      normalizeItemDeity(p);
      if (before !== p.deity){
        sessionStorage.setItem('__pendingDetail__', JSON.stringify(p));
      }
    }catch(e){}
  }

  // Compute "current deity" for /check fallback (when getPendingDeity() returns blank)
  function computeCurrentDeity(){
    // 1) pending first
    try{
      var p = JSON.parse(sessionStorage.getItem('__pendingDetail__')||'null');
      if (p && p.deity) return String(p.deity).toUpperCase();
    }catch(e){}
    // 2) if cart has only one distinct deity, use it
    try{
      var cart = JSON.parse(localStorage.getItem('cart')||'[]');
      if (Array.isArray(cart) && cart.length){
        var set = new Set();
        cart.forEach(function(it){
          if (it && it.deity) set.add(String(it.deity).toUpperCase());
          else {
            var d = inferDeityFromName((it && (it.name||it.title||''))||'');
            if (d) set.add(d);
          }
        });
        if (set.size === 1) return Array.from(set)[0];
      }
    }catch(e){}
    // 3) fallback: from current product dialog dataset/name
    try{
      var dlg = document.getElementById('dlg');
      var d = (dlg && (dlg.getAttribute('data-product-deity') || dlg.getAttribute('data-deity'))) || '';
      if (d) return String(d).toUpperCase();
      var nm = (document.getElementById('dlgTitle') && document.getElementById('dlgTitle').textContent) || '';
      var g = inferDeityFromName(nm);
      if (g) return g;
    }catch(e){}
    return '';
  }

  // Hook coupon "套用" 按鈕，若 deity 取不到則用 computeCurrentDeity()
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!(t && t.id === 'bfCouponApply')) return;
    setTimeout(function(){
      try{
        // normalize first
        normalizePending();
        normalizeCart();
        // if the existing script's getPendingDeity()回傳空，這裡補上 dataset
        var deity = computeCurrentDeity();
        if (deity){
          // 暫存到 session 讓原流程也能拿到
          try{
            var raw = sessionStorage.getItem('__pendingDetail__');
            var obj = raw ? JSON.parse(raw) : {};
            if (typeof obj !== 'object' || !obj) obj = {};
            obj.deity = deity;
            sessionStorage.setItem('__pendingDetail__', JSON.stringify(obj));
          }catch(e){}
        }
      }catch(e){}
    }, 0);
  }, true);

  // When opening the bank dialog, normalize first
  document.addEventListener('click', function(e){
    var t = e.target;
    if (t && (t.id==='pay711' || t.id==='cartGo711' || (t.closest && t.closest('#pay711,#cartGo711')))){
      setTimeout(function(){ normalizePending(); normalizeCart(); }, 0);
    }
  }, true);

  // Initial pass on load
  document.addEventListener('DOMContentLoaded', function(){
    normalizePending();
    normalizeCart();
  });
})();
