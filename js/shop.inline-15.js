(function(){
  if (window.__orderConfirmUnified__) return;
  window.__orderConfirmUnified__ = true;
  var checkoutChannel = (function(){
    try{ var v = sessionStorage.getItem('__checkout_channel'); if (v) return v; }catch(_){}
    return 'bank';
  })(); // 'bank' | 'cc'
  try{
    window.__checkoutChannelRef = {
      set:function(v){ checkoutChannel = (v==='cc') ? 'cc' : 'bank'; },
      get:function(){ return checkoutChannel; }
    };
  }catch(_){}

  function tw(n){
    try{ return 'NT$ ' + Number(n||0).toLocaleString('zh-TW'); }
    catch(e){ var num = Number(n||0); if(!isFinite(num)) num = 0; return 'NT$ ' + num.toFixed(0); }
  }

  // --- 共用：在三個 Dialog 上方畫出 1/2/3 步驟條 ---
  function renderStepBar(dlgId, activeStep, labelsOverride){
    try{
      var dlg = document.getElementById(dlgId);
      if (!dlg) return;
      var header = dlg.firstElementChild;
      if (!header) return;

      var bar = dlg.querySelector('.checkout-step-bar');
      if (!bar){
        bar = document.createElement('div');
        bar.className = 'checkout-step-bar';
        bar.style.padding = '0 18px 8px';
        bar.style.display = 'flex';
        bar.style.gap = '8px';
        bar.style.marginTop = '4px';
        header.parentNode.insertBefore(bar, header.nextSibling);
      }

      var labels = Array.isArray(labelsOverride) && labelsOverride.length === 3
        ? labelsOverride
        : ['確認訂單','選擇門市','收件人資料'];
      var steps = [
        { idx:1, label:labels[0] },
        { idx:2, label:labels[1] },
        { idx:3, label:labels[2] }
      ];

      var html = '<div style="display:flex;gap:8px;font-size:12px;color:#6b7280;">';
      steps.forEach(function(s){
        var active = (s.idx === activeStep);
        html += '<div style="flex:1;display:flex;align-items:center;gap:6px;">'
              +   '<div style="width:20px;height:20px;border-radius:999px;display:flex;align-items:center;justify-content:center;'
              +        'font-weight:600;font-size:11px;'
              +        (active ? 'background:#16a34a;color:#ffffff;' : 'background:#e5e7eb;color:#6b7280;')
              +   '\">' + s.idx + '</div>'
              +   '<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
              +        (active ? 'color:#111827;font-weight:600;' : 'color:#6b7280;')
              +   '\">' + s.label + '</div>'
              + '</div>';
      });
      html += '</div>';
      bar.innerHTML = html;
    }catch(e){}
  }

  function readCartLS(){
    try{
      var c = JSON.parse(localStorage.getItem('cart')||'[]');
      return Array.isArray(c) ? c : [];
    }catch(e){ return []; }
  }
  function saveCartLS(cart){
    try{
      localStorage.setItem('cart', JSON.stringify(cart||[]));
      try{
        if (window.cartCouponAPI && typeof window.cartCouponAPI.recalcTotals === 'function'){
          window.cartCouponAPI.recalcTotals();
        }
      }catch(_){ }
      try{
        window.dispatchEvent(new StorageEvent('storage', { key:'cart', newValue: JSON.stringify(cart||[]) }));
      }catch(_){ }
    }catch(e){}
  }

  function getTotals(){
    function resolveCheckoutShippingFee(){
      return checkoutChannel === 'cc'
        ? (window.__shippingFee || 60)
        : (window.__codShippingFee || 38);
    }
    try{
      if (typeof window.getUnifiedCartTotals === 'function'){
        return window.getUnifiedCartTotals({ includeShipping: true, shippingFee: resolveCheckoutShippingFee() });
      }
    }catch(e){}
    var items = readCartLS();
    // 若購物車為空，嘗試使用 pendingDetail（直接結帳）
    if (!items.length){
      try{
        var pendRaw = sessionStorage.getItem('__pendingDetail__');
        var pend = pendRaw ? JSON.parse(pendRaw) : null;
        if (pend){
          items = [pend];
        }
      }catch(_){}
    }
    var sub = 0;
    var needsShipping = false;
    items.forEach(function(it){
      var unit = Number(it && (it.price!=null?it.price:it.unit)) || 0;
      var qty  = Number(it && (it.qty!=null?it.qty:it.quantity)) || 1;
      if (qty<1) qty = 1;
      sub += unit * qty;
      if (typeof window.isCandleItemLike === 'function'){
        if (!window.isCandleItemLike(it)) needsShipping = true;
      }else{
        var text = '';
        try{
          text += String((it && it.category) || '');
          text += ' ' + String((it && (it.name || it.title || it.productName)) || '');
        }catch(_){}
        if (!/蠟燭/.test(text)) needsShipping = true;
      }
    });
    var shipping = needsShipping ? resolveCheckoutShippingFee() : 0;
    return {
      items: items,
      coupons: [],
      assignment:{ total:0, lines:[] },
      sub: sub,
      off: 0,
      grand: sub + shipping,
      shipping: shipping
    };
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m;
    });
  }

  function renderOrderDialog(){
    var dlg  = document.getElementById('dlgOrderConfirm');
    if (!dlg) return;

    var box  = document.getElementById('orderItemsBox');
    var listBox = document.getElementById('orderCouponList');
    var hint = document.getElementById('orderCouponHint');
    var subtotalEl = document.getElementById('orderSubtotalText');
    var discountEl = document.getElementById('orderDiscountText');
    var shippingEl = document.getElementById('orderShippingText');
    var shippingRow= document.getElementById('orderShippingRow');
    var grandEl    = document.getElementById('orderGrandText');

    var totals = getTotals();
    var items  = totals.items || [];
    var coupons = totals.coupons || [];
    var assign  = totals.assignment || {lines:[], total:0};

    if (!box) return;

    if (!items.length){
      box.innerHTML = '<div style="padding:8px 0;color:#6b7280;">目前購物車沒有任何商品。</div>';
    }else{
      var html = '';
      html += '<div style="overflow-x:auto;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
      html += '<thead><tr>';
      html += '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #e5e7eb;">商品</th>';
      html += '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #e5e7eb;">單價</th>';
      html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #e5e7eb;">數量</th>';
      html += '<th style="text-align:right;padding:6px 4px;border-bottom:1px solid #e5e7eb;">小計</th>';
      html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #e5e7eb;">操作</th>';
      html += '</tr></thead><tbody>';

      for (var i=0;i<items.length;i++){
        var it   = items[i] || {};
        var name = it.name || it.title || it.productName || '商品';
        var spec = it.variantName || it.spec || it.deity || '';
        var qty  = Number(it.qty!=null?it.qty:it.quantity) || 1;
        if (qty<1) qty = 1;
        var unit = Number(it.price!=null?it.price:it.unit) || 0;
        var line = unit * qty;
        html += '<tr data-index="'+i+'">';
        html += '<td style="padding:6px 4px;vertical-align:top;">'
             +  '<div style="font-weight:600;">'+ escapeHtml(name) +'</div>'
             +  (spec ? '<div style="color:#6b7280;font-size:12px;">規格：'+ escapeHtml(spec) +'</div>' : '')
             +  '</td>';
        html += '<td style="padding:6px 4px;vertical-align:top;">'+ tw(unit) +'</td>';
        html += '<td style="padding:6px 4px;text-align:center;vertical-align:top;">'
             +  '<div class="order-qty-box">'
             +    '<button type="button" class="order-qty-minus" aria-label="減少數量">-</button>'
             +    '<input type="number" class="order-qty-input" min="1" value="'+ qty +'" aria-label="商品數量">'
             +    '<button type="button" class="order-qty-plus" aria-label="增加數量">+</button>'
             +  '</div>'
             +  '</td>';
        html += '<td style="padding:6px 4px;text-align:right;vertical-align:top;">'+ tw(line) +'</td>';
        html += '<td style="padding:6px 4px;text-align:center;vertical-align:top;">'
             +  '<button type="button" class="order-remove-item" style="padding:4px 8px;border-radius:8px;border:1px solid #ef4444;background:#fff;color:#ef4444;font-size:12px;cursor:pointer;">移除</button>'
             +  '</td>';
        html += '</tr>';
      }

      html += '</tbody></table></div>';
      box.innerHTML = html;
    }

    if (subtotalEl) subtotalEl.textContent = tw(totals.sub || 0);
    var shipOff = totals.shippingDiscount || 0;
    if (discountEl) discountEl.textContent = '-' + tw(totals.off || 0).replace(/^NT\$\s*/, 'NT$ ');
    if (shippingEl){
      var shipVal = totals.shipping || 0;
      if (shipOff > 0){
        shippingEl.textContent = '+NT$ ' + formatPrice(shipVal) + '（已折抵 NT$ ' + formatPrice(shipOff) + '）';
      }else{
        shippingEl.textContent = '+' + tw(shipVal).replace(/^NT\$\s*/, 'NT$ ');
      }
    }
    if (shippingRow) shippingRow.style.display = ((totals.shipping && totals.shipping>0) || shipOff>0) ? 'flex' : 'none';
    if (grandEl)    grandEl.textContent    = tw(totals.grand || 0);

    if (hint){
      if (coupons.length){
        hint.style.display = '';
        hint.textContent = '已套用 ' + coupons.length + ' 張優惠券，總折抵 ' +
                           tw(assign.total || totals.off || 0).replace(/^NT\$\s*/, 'NT$ ');
        hint.style.color = '#059669';
      }else{
        hint.style.display = '';
        hint.textContent = '如需使用優惠券，請輸入優惠碼後按「套用」。';
        hint.style.color = '#6b7280';
      }
    }

    if (listBox){
      listBox.innerHTML = '';
      if (!coupons.length){
        listBox.style.display = 'none';
      }else{
        listBox.style.display = '';
        coupons.forEach(function(cpn){
          var code = String(cpn.code||'');
          var line = (assign.lines||[]).find(function(l){
            return String(l.code||'').toUpperCase() === code.toUpperCase();
          });
          var usage = describeCouponUsage(cpn, line, items);
          var row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.gap = '8px';
          row.style.padding = '6px 8px';
          row.style.border = '1px solid #e5e7eb';
          row.style.borderRadius = '8px';
          row.style.marginBottom = '4px';
          row.innerHTML =
            '<div style="font-size:13px;line-height:1.5;">'
            +'<div style="font-weight:700;">優惠碼：'+ escapeHtml(code) +'</div>'
            +'<div style="color:'+ (usage.color || '#6b7280') +';">'+ escapeHtml(usage.message || '') +'</div>'
            +'</div>'
            +'<button type="button" class="order-remove-coupon" data-coupon-code="'+ escapeHtml(code) +'"'
            +' style="font-size:12px;padding:4px 8px;border-radius:8px;border:1px solid #ef4444;background:#fff;color:#ef4444;cursor:pointer;">移除</button>';
          listBox.appendChild(row);
        });
      }
    }
  }

  function openOrderDialog(){
    var dlg = document.getElementById('dlgOrderConfirm');
    if (!dlg) return;
    try{ dlg.setAttribute('data-channel', checkoutChannel); }catch(_){}
    try{ sessionStorage.setItem('__checkout_channel', checkoutChannel); }catch(_){}
    var totals = getTotals();
    if (!totals.items || !totals.items.length){
      alert('目前購物車沒有商品，無法進行結帳');
      return;
    }
    renderOrderDialog();
    // 判斷是否為蠟燭流程（全品項皆含「蠟燭」）
    var candleFlow = (function(){
      try{
        var totals = getTotals();
        var it = totals.items || [];
        return it.length>0 && it.every(function(x){ return /蠟燭/.test(String(x.category||'') + String(x.name||'')); });
      }catch(_){ return false; }
    })();
    try{
      dlg.setAttribute('data-candle', candleFlow ? '1':'0');
      sessionStorage.setItem('__candle_flow', candleFlow ? '1' : '');
      if (candleFlow && typeof resetStoreSelection === 'function'){
        resetStoreSelection();
      }
    }catch(_){}
    renderStepBar('dlgOrderConfirm', 1, candleFlow ? ['確認訂單','跳過門市','收件人資料'] : (checkoutChannel === 'cc' ? ['確認訂單','選擇門市','填寫付款資料'] : undefined));
    try{ dlg.showModal(); }catch(e){}
  }

  function closeOrderDialog(){
    var dlg = document.getElementById('dlgOrderConfirm');
    if (!dlg) return;
    try{ dlg.close(); }catch(e){}
  }

  function openBankStep(skipStore){
    try{
      var candleFlow = !!skipStore;
      if (!candleFlow){
        try{
          var memo = sessionStorage.getItem('__candle_flow');
          if (memo === '1') candleFlow = true;
        }catch(_){}
      }
      if (candleFlow && typeof resetStoreSelection === 'function'){
        resetStoreSelection();
      }
      applyStoreFieldVisibility(!candleFlow);
      if (typeof openBankDialog === 'function'){
        openBankDialog('detail');
        var b = document.getElementById('dlgBank');
        if (b) renderStepBar('dlgBank', 3, candleFlow ? ['確認訂單','跳過門市','收件人資料'] : undefined);
      }else{
        var dlg = document.getElementById('dlgBank');
        if (dlg && typeof dlg.showModal === 'function'){
          renderStepBar('dlgBank', 3, candleFlow ? ['確認訂單','跳過門市','收件人資料'] : undefined);
          dlg.showModal();
        }
      }
    }catch(err){}
  }

  function openCreditStep(){
    try{
      // 確保門市同步到信用卡欄位
      try{ if (typeof window.syncStoreToCCForm === 'function') window.syncStoreToCCForm(); }catch(_){}
      if (typeof openCreditDialog === 'function'){
        openCreditDialog('detail');
        var cdlg = document.getElementById('dlgCC');
        if (cdlg) renderStepBar('dlgCC', 3, ['確認訂單','選擇門市','填寫付款資料']);
      } else {
        var dlg = document.getElementById('dlgCC');
        if (dlg && typeof dlg.showModal === 'function'){
          renderStepBar('dlgCC', 3, ['確認訂單','選擇門市','填寫付款資料']);
          dlg.showModal();
        } else {
          alert('信用卡付款模組尚未載入，請重新整理頁面後再試。');
        }
      }
    }catch(err){
      console.error(err);
      alert('顯示信用卡付款視窗時發生錯誤，請稍後再試。');
    }
  }

  function openStoreDialog(){
    var dlg = document.getElementById('dlgStore');
    if (!dlg){
      // 若尚未建立門市 Dialog，直接進匯款步驟
      if (checkoutChannel === 'cc') {
        openCreditStep();
      } else {
        openBankStep();
      }
      return;
    }
    try{
      try{ syncStorePreviewFromBank(); }catch(e){}
      var labels = (checkoutChannel === 'cc') ? ['確認訂單','選擇門市','填寫付款資料'] : undefined;
      renderStepBar('dlgStore', 2, labels);
      try{ dlg.setAttribute('data-channel', checkoutChannel); }catch(_){}
      dlg.showModal();
    }catch(e){}
  }

  function closeStoreDialog(){
    var dlg = document.getElementById('dlgStore');
    if (!dlg) return;
    try{ dlg.close(); }catch(e){}
  }

  function syncStorePreviewFromBank(){
    try{
      var bankInput = document.getElementById('bfStore');
      var preview   = document.getElementById('bfStorePreview');
      if (!preview) return;
      var v = bankInput ? (bankInput.value || '').trim() : '';
      if (v){
        preview.value = v;
      }else{
        preview.value = '尚未選擇門市';
      }
    }catch(e){}
  }
  try{ window.__syncStorePreviewFromBank = syncStorePreviewFromBank; }catch(_){}

  function storeSelectionRequired(){
    try{
      return sessionStorage.getItem('__candle_flow') !== '1';
    }catch(_){ return true; }
  }

  function resetStoreSelection(){
    try{
      var preview = document.getElementById('bfStorePreview');
      if (preview) preview.value = '尚未選擇門市';
    }catch(_){}
    ['dlgStoreInput','bfStore','ccStore'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.value = '';
      el.removeAttribute('data-storeid');
      el.removeAttribute('data-storename');
      el.removeAttribute('data-storeaddress');
      el.removeAttribute('data-storetel');
    });
    applyStoreFieldVisibility(storeSelectionRequired());
  }
  function applyStoreFieldVisibility(required){
    try{
      var storeInput = document.getElementById('bfStore');
      var storeRow = storeInput && storeInput.closest('.bank-field');
      if (storeRow){ storeRow.style.display = required ? 'grid' : 'none'; }
      if (storeInput){ storeInput.required = !!required; }
      var backBtn = document.getElementById('bfBackToStoreBtn');
      if (backBtn){ backBtn.style.display = required ? 'inline-flex' : 'none'; }
      var preview = document.getElementById('bfStorePreview');
      if (preview){
        var wrap = preview.parentElement;
        if (wrap && wrap.style){ wrap.style.display = required ? 'grid' : 'none'; }
        if (!required) preview.value = '尚未選擇門市';
      }
      var ccInput = document.getElementById('ccStore');
      if (ccInput){
        ccInput.required = !!required;
        if (!required){
          ccInput.value = '';
          ccInput.removeAttribute('data-storeid');
          ccInput.removeAttribute('data-storename');
          ccInput.removeAttribute('data-storeaddress');
          ccInput.removeAttribute('data-storetel');
        }
      }
      var couponHint = document.getElementById('bfCouponHint');
      var couponList = document.getElementById('bfCouponList');
      var couponBack = document.getElementById('bfCouponBackHint');
      if (!required){
        if (couponHint){ couponHint.style.display = 'none'; }
        if (couponList){ couponList.style.display = 'none'; }
        if (couponBack){ couponBack.style.display = 'none'; }
      }else{
        if (couponBack){ couponBack.style.display = ''; }
        if (couponHint){ couponHint.style.display = ''; }
        if (couponList){ couponList.style.display = couponList.childElementCount ? '' : 'none'; }
      }
    }catch(_){}
  }
  try{ window.resetStoreSelection = resetStoreSelection; }catch(_){}

  // 新增：將門市預覽欄位的資料，同步到最終的匯款表單欄位
  function syncStoreToBankForm(){
    if (!storeSelectionRequired()) return;
    try {
      var previewInput = document.getElementById('bfStorePreview');
      var bankInput = document.getElementById('bfStore');
      if (previewInput && bankInput) {
        bankInput.value = previewInput.value;
      }
    } catch(e) {}
  }
  try{ window.syncStoreToBankForm = syncStoreToBankForm; }catch(e){}

  // 將門市同步到信用卡表單
  function syncStoreToCCForm(){
    if (!storeSelectionRequired()) return;
    try {
      var previewInput = document.getElementById('bfStorePreview') || document.getElementById('dlgStoreInput');
      var ccInput = document.getElementById('ccStore');
      if (previewInput && ccInput) {
        ccInput.value = previewInput.value || '';
      }
    } catch(e) {}
  }
  try{ window.syncStoreToCCForm = syncStoreToCCForm; }catch(e){}


  // --- 7-11 門市選擇：postMessage 監聽器 ---
  // 監聽來自 7-11 callback 彈出視窗的訊息
  window.addEventListener('message', function(ev){
    try {
      var d = ev.data || {};
      // 確認是我們需要的門市資料
      if (d && d.__cvs_store__) {
        // 呼叫統一的填寫函式，將資料填入所有相關欄位
        if (typeof fillStoreIntoForm === 'function') {
          fillStoreIntoForm(d);
        }
        // 信用卡流程：自動同步門市到 cc 欄位，但不自動跳下一步
        try{
          var chMsg = 'bank';
          try{ var cached = sessionStorage.getItem('__checkout_channel'); if (cached) chMsg = cached; }catch(_){}
          if (window.__checkoutChannelRef && typeof window.__checkoutChannelRef.get==='function'){
            chMsg = window.__checkoutChannelRef.get();
          }
          if (chMsg === 'cc' && typeof window.syncStoreToCCForm === 'function'){
            window.syncStoreToCCForm();
          }
        }catch(_){}
      }
    } catch(e) {}
  });
  // pay711 / cartGo711 / payCC 進入第一步：訂單確認
  // 只保留購物車流程，不再有單品「直接結帳」
  document.addEventListener('click', function(e){
    var t = e.target;
    var btn = t && t.closest && t.closest('#payCC,#cartPayCC,#pay711,#cartGo711');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    try{ sessionStorage.setItem('__candle_flow',''); }catch(_){}
    var isCard = btn.id === 'payCC' || btn.id === 'cartPayCC';
    checkoutChannel = isCard ? 'cc' : 'bank';
    openOrderDialog();
  }, true);

  // 訂單確認、門市選擇 與 下一步 / 返回 的按鈕邏輯
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest && e.target.closest('#orderCancelBtn,#orderNextBtn,#storeBackBtn,#storeNextBtn');
    if (!btn) return;
    e.preventDefault();

    if (btn.id === 'orderCancelBtn'){
      closeOrderDialog();
      return;
    }
    if (btn.id === 'orderNextBtn'){
      var candleFlow = false;
      try{
        var dlg = document.getElementById('dlgOrderConfirm');
        candleFlow = dlg && dlg.getAttribute('data-candle') === '1';
        if (!candleFlow){
          var memo = sessionStorage.getItem('__candle_flow');
          candleFlow = memo === '1';
        }
      }catch(_){}
      if (candleFlow){
        closeOrderDialog();
        openBankStep(true); // 直接進入匯款資料，跳過門市
        return;
      }
      try{ sessionStorage.setItem('__checkout_channel', checkoutChannel); }catch(_){}
      closeOrderDialog();
      openStoreDialog();
      return;
    }
    if (btn.id === 'storeBackBtn'){
      closeStoreDialog();
      openOrderDialog();
      return;
    }
    if (btn.id === 'storeNextBtn'){
      if (!e.isTrusted){ return; } // 僅接受使用者真實點擊，避免外部程式觸發
      var ch = checkoutChannel;
      try{
        var ds = document.getElementById('dlgStore');
        if (ds){
          var attr = ds.getAttribute('data-channel');
          if (attr) ch = attr;
        }
        if (!attr){
          var last = sessionStorage.getItem('__checkout_channel');
          if (last) ch = last;
        }
      }catch(_){}
      var candleFlow = false;
      try{
        candleFlow = sessionStorage.getItem('__candle_flow') === '1';
      }catch(_){}
      var requireStore = (ch === 'cc') || !candleFlow;
      if (requireStore){
        var storeVal = '';
        try{
          var previewField = document.getElementById('bfStorePreview') || document.getElementById('dlgStoreInput') || document.getElementById('bfStore');
          if (previewField){
            storeVal = (previewField.value || '').trim();
          }
        }catch(_){}
        if (!storeVal || /尚未選擇/.test(storeVal)){
          alert('請先完成 7-11 門市選擇，再進行下一步');
          try{
            var focusField = document.getElementById('storeOpenCvsBtn');
            if (focusField) focusField.focus();
          }catch(_){}
          return;
        }
      }
      // 允許服務性商品直接略過門市，或在已選門市後進入匯款/信用卡頁
      closeStoreDialog();
      // 確保在開啟下一步前，同步門市選擇
      try{
        if (typeof window.syncStoreToBankForm === 'function') window.syncStoreToBankForm();
      }catch(e){}
      try{
        if (typeof window.syncStoreToCCForm === 'function') window.syncStoreToCCForm();
      }catch(e){}
      if (ch === 'cc') {
        openCreditStep();
      } else {
        openBankStep();
      }
      return;
    }
  });

  // 數量增減 / 移除商品 / 移除優惠券
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t) return;
    var row, idx, cart, q;
    if (t.classList && t.classList.contains('order-qty-minus')){
      e.preventDefault();
      row = t.closest('tr[data-index]');
      if (!row) return;
      idx = parseInt(row.getAttribute('data-index'),10);
      cart = readCartLS();
      if (!cart[idx]) return;
      q = Number(cart[idx].qty!=null?cart[idx].qty:cart[idx].quantity) || 1;
      if (q>1) q--;
      cart[idx].qty = q;
      cart[idx].quantity = q;
      saveCartLS(cart);
      renderOrderDialog();
    }else if (t.classList && t.classList.contains('order-qty-plus')){
      e.preventDefault();
      row = t.closest('tr[data-index]');
      if (!row) return;
      idx = parseInt(row.getAttribute('data-index'),10);
      cart = readCartLS();
      if (!cart[idx]) return;
      q = Number(cart[idx].qty!=null?cart[idx].qty:cart[idx].quantity) || 1;
      q++;
      cart[idx].qty = q;
      cart[idx].quantity = q;
      saveCartLS(cart);
      renderOrderDialog();
    }else if (t.classList && t.classList.contains('order-remove-item')){
      e.preventDefault();
      row = t.closest('tr[data-index]');
      if (!row) return;
      idx = parseInt(row.getAttribute('data-index'),10);
      cart = readCartLS();
      if (!cart.length) return;
      cart.splice(idx,1);
      saveCartLS(cart);
      renderOrderDialog();
    }else if (t.classList && t.classList.contains('order-remove-coupon')){
      e.preventDefault();
      var code = t.getAttribute('data-coupon-code') || '';
      if (code && window.cartCouponAPI && typeof window.cartCouponAPI.removeCoupon === 'function'){
        window.cartCouponAPI.removeCoupon(code);
        if (typeof window.cartCouponAPI.recalcTotals === 'function'){
          window.cartCouponAPI.recalcTotals();
        }
      }
      renderOrderDialog();
    }
  });

  document.addEventListener('change', function(e){
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains('order-qty-input')) return;
    var row = t.closest('tr[data-index]');
    if (!row) return;
    var idx = parseInt(row.getAttribute('data-index'),10);
    var cart = readCartLS();
    if (!cart[idx]) return;
    var v = Number(t.value||'1'); if (!isFinite(v) || v<1) v = 1;
    cart[idx].qty = v;
    cart[idx].quantity = v;
    saveCartLS(cart);
    renderOrderDialog();
  });

  // 訂單確認 Dialog 內輸入優惠碼，實際仍委派給購物車欄位
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!(t && t.id === 'orderCouponApply')) return;
    e.preventDefault();
    var input = document.getElementById('orderCouponInput');
    var code  = (input && input.value || '').trim();
    if (!code){
      input && input.focus();
      return;
    }
    var cartInput = document.getElementById('cartCouponInput');
    var cartBtn   = document.getElementById('cartApply');
    if (cartInput && cartBtn){
      cartInput.value = code;
      cartBtn.click();
      setTimeout(function(){
        try{
          if (input){ input.value = ''; }
        }catch(_){ }
        renderOrderDialog();
      }, 600);
    }else{
      alert('找不到購物車優惠碼欄位，請稍後再試');
    }
  });

  // Expose helper for其他腳本（例如 bankBackBtn-handler）
  try{
    window.__openOrderConfirmDialogUnified   = openOrderDialog;
    window.__renderOrderConfirmDialogUnified = renderOrderDialog;
  }catch(_){ }

  // 當視窗獲得焦點時，若門市 Dialog 開啟則同步預覽欄位
  window.addEventListener('focus', function(){
    try{
      var dlgStore = document.getElementById('dlgStore');
      if (dlgStore && dlgStore.open && typeof syncStorePreviewFromBank === 'function'){
        syncStorePreviewFromBank();
      }
    }catch(e){}
  });

  
  // Step3 匯款頁面：從門市欄位「返回上一頁修改門市」
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || t.id !== 'bfBackToStoreBtn') return;
    e.preventDefault();
    try{
      var bankDlg = document.getElementById('dlgBank');
      if (bankDlg && bankDlg.open){ bankDlg.close(); }
    }catch(_){}
    try{
      if (typeof openStoreDialog === 'function'){
        openStoreDialog();
      }else{
        var storeDlg = document.getElementById('dlgStore');
        if (storeDlg && typeof storeDlg.showModal === 'function'){
          renderStepBar('dlgStore', 2);
          storeDlg.showModal();
        }
      }
    }catch(_){}
  }, true);
// 門市 Dialog 的「查詢 7-11 門市」按鈕：沿用現有 bfStoreLink 的 href
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || t.id !== 'storeOpenCvsBtn') return;
    e.preventDefault();
    try {
      // 動態產生 7-11 地圖的 URL
      var base = "https://emap.presco.com.tw/c2cemap.ashx";
      var params = new URLSearchParams();
      params.set("eshopid", "870");
      params.set("servicetype", "1");
      // 設定 callback URL 為我們的後端 Function
      var callbackUrl = new URL("/cvs_callback", location.origin);
      params.set("url", callbackUrl.toString());
      var href = base + "?" + params.toString();

      var w = window.open(href, 'cvs_popup', 'width=980,height=720,resizable=yes,scrollbars=yes');
    }catch(err){}
  });

})();
