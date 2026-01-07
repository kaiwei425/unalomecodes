(function(){
  if (window.__bankPriceStorePatched) return; window.__bankPriceStorePatched = true;

  function fmt(n){
    try{ return 'NT$ ' + Number(n||0).toLocaleString('zh-TW'); }catch(e){ return 'NT$ ' + (Number(n||0).toFixed(0)); }
  }

  function ensureOrderBox(){
    var dlg = document.getElementById('dlgBank');
    if (!dlg) return {list:null, box:null};
    var box = document.getElementById('bfOrderBox');
    if (!box){
      box = document.createElement('div');
      box.id = 'bfOrderBox';
      box.style.cssText = 'background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;display:none;margin-bottom:8px';
      box.innerHTML = '<div style="font-weight:800;margin-bottom:6px">訂單內容確認</div><div id="bfOrderList" style="display:flex;flex-direction:column;gap:8px"></div>';
      // Insert before bankForm
      var form = document.getElementById('bankForm');
      if (form && form.parentNode){
        form.parentNode.insertBefore(box, form);
      } else {
        dlg.appendChild(box);
      }
    }
    var list = document.getElementById('bfOrderList');
    return {list:list, box:box};
  }

  function buildItems(){
    var items = [];

    // Determine checkout source: 'direct' (single item flow) vs 'cart' (multi-item cart flow)
    var src = (typeof window !== 'undefined' && window.__checkoutSource) ? String(window.__checkoutSource) : '';

    if (src === 'direct'){
      // ---- DIRECT CHECKOUT: ONLY the pending detail item ----
      // read optional "removed ad-hoc ui keys" to avoid re-adding after user removed
      var removedUI = [];
      try{ removedUI = JSON.parse(sessionStorage.getItem('__bank_removed_ui__')||'[]'); if(!Array.isArray(removedUI)) removedUI = []; }catch(e){ removedUI = []; }

      // Pending detail captured from product page/dialog
      try{
        var pendRaw = sessionStorage.getItem('__pendingDetail__');
        var pend = pendRaw ? JSON.parse(pendRaw) : null;
        if (pend && pend.name){
          items.push({
            name: pend.name,
            spec: pend.variantName || '',
            qty:  Math.max(1, Number(pend.qty||1)),
            unit: Number(pend.price||0),
            source:'pending',
            index:0
          });
        }
      }catch(e){}

      // Fallback: if pending isn't present, attempt a last-resort snapshot from current UI
      if (!items.length){
        try{
          var name = (document.getElementById('dlgTitle') && document.getElementById('dlgTitle').textContent) || '';
          var sel  = document.getElementById('dlgVariant');
          var spec = (sel && sel.options && sel.selectedIndex>=0) ? sel.options[sel.selectedIndex].textContent : '';
          if (spec) spec = spec.replace(/（\+[^）]*）/g,'').trim();
          if (!spec) spec = '標準外殼';
          var qtyEl = document.getElementById('dlgQty');
          var qty = qtyEl ? Math.max(1, Number(qtyEl.value||1)) : 1;
          var priceNode = document.getElementById('dlgPrice');
          var total = 0;
          if (priceNode){
            var dp = Number(priceNode.getAttribute('data-price')||0);
            if (!dp){
              var txt = (priceNode.textContent||'').replace(/[ ,\s]/g,'');
              dp = Number(txt)||0;
            }
            total = dp;
          }
          var unit = qty ? (total/qty) : total;
          if (name){
            var snap = { name:name, spec:spec, qty:qty, unit:unit, source:'ui', index:0 };
            snap.__key = JSON.stringify({n:snap.name,s:snap.spec,u:snap.unit,q:snap.qty});
            if (!removedUI.includes(snap.__key)) items.push(snap);
          }
        }catch(e){}
      }
      return items;
    }

    // ---- CART CHECKOUT (default): ONLY cart items, do NOT append pending ----
    try{
      var cart = JSON.parse(localStorage.getItem('cart')||'[]');
      if (Array.isArray(cart) && cart.length){
        items = cart.map(function(it, idx){
          var name = (it && (it.name||it.title)) || '商品';
          var spec = (it && (it.variantName||'')) || '';
          var qty  = Math.max(1, Number((it && it.qty) || 1));
          var unit = Number((it && it.price) || 0);
          return { name:name, spec:spec, qty:qty, unit:unit, source:'cart', index:idx };
        });
      }
    }catch(e){}

    // No pending fallback here by design — cart and direct are strictly separated
    return items;
  }

  function renderOrderSummary(){
    // 已改用 bankCouponBridgeUnified 的訂單內容表格
    // 這裡只保留舊腳本需要的金額重算，不再渲染 bfOrderBox（訂單內容確認＋單行預覽＋移除按鈕）
    try{
      if (window.__coupon && typeof window.__coupon.updateTotalsDisplay === 'function'){
        window.__coupon.updateTotalsDisplay();
      }
    }catch(_){}

    try{
      if (typeof window.__recalcBankAmount === 'function'){
        window.__recalcBankAmount();
      }
    }catch(_){}
  }

  // 真正移除訂單項目並刷新
  function removeItemFromOrder(source, index, key){
    try{
      if (source === 'cart'){
        var cart = JSON.parse(localStorage.getItem('cart')||'[]');
        if (Array.isArray(cart) && cart.length){
          var idx = Number(index);
          if (!isNaN(idx) && idx>=0 && idx<cart.length){
            cart.splice(idx,1);
          }else{
            // fallback by snapshot key (if提供)
            if (key){
              var found = cart.findIndex(function(it){
                var snap = JSON.stringify({n:String(it.name||it.title||'商品'), s:String(it.variantName||''), u:Number(it.price||0), q:Math.max(1,Number(it.qty||1))});
                return snap === decodeURIComponent(key);
              });
              if (found>=0) cart.splice(found,1);
            }
          }
          localStorage.setItem('cart', JSON.stringify(cart));
          try{ window.dispatchEvent(new StorageEvent('storage', { key:'cart', newValue: JSON.stringify(cart) })); }catch(_){}
        }
      }else if (source === 'pending'){
        sessionStorage.removeItem('__pendingDetail__');
      }else if (source === 'ui'){
        // 記錄用戶移除的 ad-hoc UI 項，避免重建時又出現
        if (key){
          var arr = [];
          try{ arr = JSON.parse(sessionStorage.getItem('__bank_removed_ui__')||'[]'); }catch(e){}
          if (!Array.isArray(arr)) arr = [];
          if (arr.indexOf(decodeURIComponent(key)) === -1) arr.push(decodeURIComponent(key));
          sessionStorage.setItem('__bank_removed_ui__', JSON.stringify(arr));
        }
      }
    }catch(e){}
    // 重新渲染與重算金額
    try{ renderOrderSummary(); }catch(_){}
    try{ if (typeof window.__recalcBankAmount === 'function') window.__recalcBankAmount(); }catch(_){}
  }

  function ensureStoreField(){
    var form = document.getElementById('bankForm');
    if (!form) return;
    if (document.getElementById('bfStore')) return; // already exists
    // Find the "上傳匯款憑證" block to insert before
    var uploadLabel = null;
    var labels = form.querySelectorAll('label');
    for (var i=0;i<labels.length;i++){
      var t = (labels[i].textContent||'').trim();
      if (t.indexOf('上傳匯款憑證') !== -1){ uploadLabel = labels[i]; break; }
    }
    var field = document.createElement('div');
    field.style.display='grid';
    field.style.gap='6px';
    field.innerHTML = '<label style="font-size:12px;color:#6b7280">收件7-11門市（若非實體商品，請填寫「無」）</label>' +
                      '<input id="bfStore" name="store" placeholder="請輸入門市名稱或店號" required ' +
                      'style="padding:10px;border:1px solid #e5e7eb;border-radius:10px">' +
                      '<div id="bfStoreHelp" style="margin-top:6px;font-size:12px;color:#6b7280;display:none"></div>';
    if (uploadLabel && uploadLabel.parentNode){
      uploadLabel.parentNode.parentNode.insertBefore(field, uploadLabel.parentNode);
    }else{
      form.insertBefore(field, form.firstChild);
    }
  }

  // --- Candle UI helpers ---
  function isCandleOrder(){
    // 1) Check cart categories or names
    try{
      var cart = JSON.parse(localStorage.getItem('cart')||'[]');
      if (Array.isArray(cart) && cart.some(function(it){
        var cat = String((it && it.category) || '').trim();
        var nm  = String((it && (it.name||it.title||'')) || '');
        return cat === '蠟燭加持祈福' || /蠟燭/.test(nm);
      })){
        return true;
      }
    }catch(e){}
    // 2) Fallback: check current detail dialog dataset
    try{
      var dlg = document.getElementById('dlg');
      var cat = dlg && dlg.getAttribute('data-product-cat');
      if (cat === '蠟燭加持祈福') return true;
      var nm = dlg && dlg.getAttribute('data-product-name');
      if (nm && /蠟燭/.test(nm)) return true;
    }catch(e){}
    // 3) Also consider pending detail captured when opening from product page
    try{
      var pRaw = sessionStorage.getItem('__pendingDetail__');
      var p = pRaw ? JSON.parse(pRaw) : null;
      if (p && (p.category === '蠟燭加持祈福' || /蠟燭/.test(p.name||''))) return true;
    }catch(e){}
    return false;
  }

  function toggleCandleUI(){
    var isCandle = isCandleOrder();

    // 1) Ritual photo block
    try{
      var rb = document.getElementById('bfRitualBlock');
      if (rb){ rb.style.display = isCandle ? '' : 'none'; }
    }catch(e){}

    // 2) Candle tip above note
    try{
      var tip = document.getElementById('bfCandleTip');
      if (tip){ tip.style.display = isCandle ? '' : 'none'; }
    }catch(e){}

    // 3) Store help hint
    try{
      var help = document.getElementById('bfStoreHelp');
      if (help){
        if (isCandle){
          help.textContent = '若為蠟燭祈福等服務類商品，請填寫「無」。';
          help.style.display = '';
        }else{
          help.textContent = '';
          help.style.display = 'none';
        }
      }
    }catch(e){}
  }

  function onOpen(){
    var __src = (typeof window !== 'undefined' && window.__checkoutSource) ? String(window.__checkoutSource) : '';
    if (__src !== 'direct'){
      try{ sessionStorage.removeItem('__pendingDetail__'); }catch(_){ }
    }
    try{
      ensureStoreField();
      renderOrderSummary();
      toggleCandleUI();
    }catch(e){ console.error('bank patch error', e); }
  }

  // Hook into clicks that open bank dialog (without changing their original logic)
  document.addEventListener('click', function(e){
    var btn = e.target && ( e.target.id ? e.target : (e.target.closest && e.target.closest('#pay711, #cartGo711')) );
    if (!btn) return;
    var id = btn.id || '';
    if (id === 'cartGo711')      window.__checkoutSource = 'cart';
    else if (id === 'pay711')    window.__checkoutSource = 'direct';
    else if ((btn.matches && btn.matches('#cartGo711')) || (btn.closest && btn.closest('#cartGo711'))) window.__checkoutSource = 'cart';
    else if ((btn.matches && btn.matches('#pay711'))   || (btn.closest && btn.closest('#pay711')))   window.__checkoutSource = 'direct';

    setTimeout(onOpen, 0);
    setTimeout(toggleCandleUI, 0);
  }, true);

  // Handle remove clicks in the order summary list
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest && e.target.closest('.ok-remove');
    if (!btn) return;
    e.preventDefault();
    var src = btn.getAttribute('data-remove-source') || '';
    var idx = btn.getAttribute('data-remove-index') || '';
    var key = btn.getAttribute('data-remove-key') || '';
    removeItemFromOrder(src, idx, key);
  }, true);

  // Also run on DOM ready in case dialog is already present
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(onOpen, 0);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(onOpen, 0); });
  }

  // Expose for other scripts
  window.toggleCandleUI = toggleCandleUI;
  window.isCandleOrder = isCandleOrder;
})();
