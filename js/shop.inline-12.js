(function(){
  if (window.__cartCouponPatchedMulti__) return; 
  window.__cartCouponPatchedMulti__ = true;

  function t(key, fallback){
    try{
      var fn = window.UC_I18N && typeof window.UC_I18N.t === 'function' ? window.UC_I18N.t : null;
      if (!fn) return fallback;
      var v = fn(key);
      if (!v || v === key) return fallback;
      return v;
    }catch(_){
      return fallback;
    }
  }
  function tf(key, vars, fallback){
    var out = String(t(key, fallback) || '');
    var obj = vars && typeof vars === 'object' ? vars : {};
    try{
      Object.keys(obj).forEach(function(k){
        out = out.split('{' + k + '}').join(String(obj[k]));
      });
    }catch(_){}
    return out;
  }
  function getLang(){
    try{
      if (window.UC_I18N && typeof window.UC_I18N.getLang === 'function') return window.UC_I18N.getLang();
    }catch(_){}
    return 'zh';
  }

  // 初始化多券狀態：優先讀取 localStorage
  var __cartCouponsMem = [];
  var __cartCouponsMemSig = '';
  try{
    var _raw = localStorage.getItem('__cartCoupons__');
    var _sig = localStorage.getItem('__cartCouponsCartSig__') || '';
    var _arr = _raw ? JSON.parse(_raw) : [];
    if (Array.isArray(_arr)) __cartCouponsMem = _arr;
    __cartCouponsMemSig = _sig;
  }catch(_){}

  // 若 URL 帶有 coupon/deity（例如測驗頁返回），自動套用到本地優惠券狀態
  try{
    var sp = new URLSearchParams((window && window.location && window.location.search) || '');
    var qc = (sp.get('coupon') || '').trim();
    var qd = (sp.get('deity') || '').trim();
    var qa = Number(sp.get('amount') || sp.get('off') || 200) || 200;
    if (qc){
      (async function(){
        try{
          // 先向後端檢查券狀態，避免已使用的券被重複自動套用
          var res = await checkCoupon(qc.toUpperCase(), qd || '');
          if (!res || res.ok === false){
            // 若無效則移除本地殘留
            try{ removeCartCoupon(qc); }catch(_){}
            try{
              var ac = localStorage.getItem('__activeCoupon__');
              if (ac){
                var obj = JSON.parse(ac);
                if (obj && String(obj.code||'').toUpperCase() === qc.toUpperCase()){
                  localStorage.removeItem('__activeCoupon__');
                }
              }
            }catch(_){}
            try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(_){}
            try{ if (typeof updateCartTotals === 'function') updateCartTotals(); }catch(_){}
            return;
          }
          var obj = { code: res.code || qc, deity: res.deity || qd || '', amount: Number(res.amount||qa)||qa };
          // 推入多券系統（避免重複）
          var cur = getCartCoupons();
          var dup = cur.some(function(c){ return String(c.code||'').toUpperCase() === String(obj.code||'').toUpperCase(); });
          if (!dup){
            cur.push(obj);
            setCartCoupons(cur);
          }
          // 也寫入舊版 activeCoupon，供 direct-buy 流程使用
          try{
            localStorage.setItem('__activeCoupon__', JSON.stringify(obj));
            window.__coupon = window.__coupon || {};
            window.__coupon.getActiveCoupon = function(){
              try{ var raw=localStorage.getItem('__activeCoupon__'); return raw?JSON.parse(raw):null; }catch(e){ return null; }
            };
          }catch(_){}
          try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(_){}
          try{ if (typeof updateCartTotals === 'function') updateCartTotals(); }catch(_){}
        }catch(_){}
      })();
    }
    // 進站時同步檢查本地已存的優惠券，清掉已失效/已使用的
    (async function(){
      try{
        var coupons = getCartCoupons();
        var active = null;
        try{
          var acRaw = localStorage.getItem('__activeCoupon__');
          active = acRaw ? JSON.parse(acRaw) : null;
        }catch(_){}
        var codes = [];
        coupons.forEach(function(c){
          if (c && c.code) codes.push({ code:String(c.code).toUpperCase(), deity:c.deity||'' });
        });
        if (active && active.code){
          var up = String(active.code).toUpperCase();
          var exists = codes.some(function(x){ return x.code === up; });
          if (!exists) codes.push({ code:up, deity: active.deity || '' });
        }
        if (!codes.length) return;
        var toRemove = [];
        for (var i=0;i<codes.length;i++){
          var c = codes[i];
          var res = await checkCoupon(c.code, c.deity || '');
          if (!res || res.ok === false){
            toRemove.push(c.code);
          }
        }
        if (toRemove.length){
          var list = getCartCoupons().filter(function(c){ return toRemove.indexOf(String(c.code||'').toUpperCase()) === -1; });
          setCartCoupons(list);
          try{
            var acRaw2 = localStorage.getItem('__activeCoupon__');
            if (acRaw2){
              var ac2 = JSON.parse(acRaw2);
              if (ac2 && toRemove.indexOf(String(ac2.code||'').toUpperCase()) !== -1){
                localStorage.removeItem('__activeCoupon__');
              }
            }
          }catch(_){}
          try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(_){}
          try{ if (typeof updateCartTotals === 'function') updateCartTotals(); }catch(_){}
        }
      }catch(_){}
    })();
  }catch(_){}

  // ---------- 基本工具 ----------
  function deityCodeOf(input){
    try{
      var s = (input||'').toString().trim();
      if (!s) return '';
      if (/^[A-Z]{2}$/.test(s)) return s.toUpperCase();
      if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/i.test(s)) return 'FM';
      if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/i.test(s))   return 'GA';
      if (/崇迪|SOMDEJ|SOMDET/i.test(s))                      return 'CD';
      if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/i.test(s))  return 'KP';
      if (/哈魯曼|H(AN|AR)UMAN/i.test(s))                     return 'HM';
      if (/拉胡|RAHU/i.test(s))                               return 'RH';
      if (/迦樓羅|GARUDA|K(AR|AL)UDA/i.test(s))              return 'JL';
      if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/i.test(s)) return 'ZD';
      if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/i.test(s))          return 'ZF';
      if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/i.test(s)) return 'WE';
      if (/徐祝|XU\s*ZHU|XUZHU/i.test(s))                     return 'XZ';
      if (/魂魄勇|HUN\s*PO\s*YONG|HPY/i.test(s))              return 'HP';
      return s.toUpperCase();
    }catch(e){ return ''; }
  }
  function readCart(){
    try{
      var c = JSON.parse(localStorage.getItem('cart')||'[]');
      return Array.isArray(c) ? c : [];
    }catch(e){ return []; }
  }
  function subTotal(items){
    try{
      return (items || []).reduce(function(sum, it){
        return sum + baseAmountOfItem(it);
      }, 0);
    }catch(e){
      return 0;
    }
  }
  // --- 購物車內容簽章（快照） ---
  function cartSignature(){
    try{
      var items = readCart();
      return JSON.stringify(items.map(function(it){
        return {
          id: (it && (it.id || it.code || it.sku || it.productId || it.name || it.title || '')),
          deity: (it && (it.deity || '')),
          price: Number(it && it.price || 0),
          qty: Math.max(1, Number(it && (it.qty || it.quantity || 1)) || 1)
        };
      }));
    }catch(e){ return '[]'; }
  }
  function tw(n){
    try{ return 'NT$ ' + Number(n||0).toLocaleString('zh-TW'); }
    catch(e){ return 'NT$ ' + (Number(n||0).toFixed(0)); }
  }

  // ---------- 優惠券存取：支援多張 ----------
  function getCartCoupons(){
    try{
      var curSig = cartSignature();
      // 更新目前購物車簽章，但保留已套用的優惠券
      __cartCouponsMemSig = curSig;

      // 回傳一份拷貝，避免外部意外修改
      return __cartCouponsMem.slice();
    }catch(e){
      return [];
    }
  }
  function setCartCoupons(list){
    try{
      var arr = Array.isArray(list) ? list : [];
      __cartCouponsMem = arr.slice();
      __cartCouponsMemSig = cartSignature();

      // 將目前狀態寫入 localStorage 只是為了讓其它模組（例如頂部 bar）可以同步顯示
      try{
        localStorage.setItem('__cartCoupons__', JSON.stringify(arr));
        localStorage.setItem('__cartCouponsCartSig__', __cartCouponsMemSig);
      }catch(_){ }
      // 清除舊版 coupon keys
      try{
        localStorage.removeItem('__activeCoupon__');
        localStorage.removeItem('__activeCoupons__');
      }catch(_){ }

      // 對其他模組公布狀態（以記憶體為主）
      window.__cartCouponState = window.__cartCouponState || {};
      window.__cartCouponState.coupons = __cartCouponsMem.slice();
      // 清除舊版全域狀態
      try{
        window.__activeCoupon = null;
        window.__activeCoupons = null;
      }catch(_){ }

      // 廣播事件讓其它監聽者可更新
      try{
        window.dispatchEvent(new StorageEvent('storage', { key:'__cartCoupons__', newValue: JSON.stringify(arr) }));
      }catch(_){}
    }catch(e){}
  }
  function removeCartCoupon(code){
    var list = getCartCoupons().filter(function(c){
      return String(c.code||'').toUpperCase() !== String(code||'').toUpperCase();
    });
    setCartCoupons(list);
  }

  // ---------- 商品與折扣分配 ----------
  function baseAmountOfItem(it){
    if (!it) return 0;
    var unit = Number(it.price != null ? it.price : it.unit != null ? it.unit : 0) || 0;
    var qty  = Math.max(1, Number(it.qty != null ? it.qty : it.quantity != null ? it.quantity : 1) || 1);
    return unit * qty;
  }
  function itemDeityOf(it){
    if (!it) return '';
    var d = it.deity || it.deityCode || it.deity_id || '';
    if (!d){
      var nm = it.name || it.title || it.productName || '';
      d = deityCodeOf(nm);
    }
    return deityCodeOf(d);
  }
  function normDeity(d){
    return deityCodeOf(d||'');
  }

  // 依照「一個商品最多一張券」規則，把多張券分配到購物車商品上
  function assignCouponsToItems(items, coupons){
    var discountedItemIdx = {};   // itemIndex -> true
    var lines = [];
    var total = 0;
    var ship = null;

    for (var ci = 0; ci < coupons.length; ci++){
      var cpn = coupons[ci];
      if (!cpn || !cpn.code) continue;
      var cType = String(cpn.type||'').toUpperCase();
      var deityRaw = String(cpn.deity||'').toUpperCase();
      if (!cType && deityRaw === 'SHIP') cType = 'SHIP';
      if (!cType && deityRaw === 'ALL')  cType = 'ALL';
      if (cType === 'SHIP'){
        if (!ship) ship = cpn;
        continue;
      }

      var deity = normDeity(cpn.deity || '');
      if (cType === 'ALL' || deity === 'ALL'){
        deity = '';
      }
      var bestIdx  = -1;
      var bestBase = 0;

      for (var i = 0; i < items.length; i++){
        if (discountedItemIdx[i]) continue; // 一個商品只能吃一張券

        var it = items[i] || {};
        var itemDeity = itemDeityOf(it);

        if (deity && itemDeity !== deity) continue; // deity 券需守護神符合

        var base = baseAmountOfItem(it);
        if (base <= 0) continue;

        if (base > bestBase){
          bestBase = base;
          bestIdx  = i;
        }
      }

      if (bestIdx < 0){
        // 無守護神限制的全館券可套到第一個未折抵商品
        if (!deity){
          for (var j=0;j<items.length;j++){
            if (!discountedItemIdx[j] && baseAmountOfItem(items[j])>0){ bestIdx=j; bestBase=baseAmountOfItem(items[j]); break; }
          }
        }
      }
      if (bestIdx < 0) continue; // 找不到適用商品

      var rawAmt   = (cpn.amount != null ? cpn.amount : (cpn.off != null ? cpn.off : cpn.discount));
      var discount = Number(rawAmt || 0);
      if (!discount || discount <= 0) discount = 200;
      if (discount > bestBase) discount = bestBase;

      total += discount;
      discountedItemIdx[bestIdx] = true;

      lines.push({
        code:      String(cpn.code || ''),
        deity:     deity,
        amount:    discount,
        itemIndex: bestIdx,
        type: cType || (deity ? 'DEITY':'ALL')
      });
    }

    return { total: total, lines: lines, usedItems: discountedItemIdx, ship };
  }

  // ---------- 優惠券清單 UI（在購物車欄位下方） ----------
  function deityNameOf(code){
    var m = {
      FM:'四面神',
      GA:'象神',
      CD:'崇迪',
      KP:'坤平',
      HM:'哈魯曼',
      RH:'拉胡',
      JL:'迦樓羅',
      ZD:'澤度金',
      ZF:'招財女神',
      WE:'五眼四耳',
      XZ:'徐祝',
      HP:'魂魄勇'
    };
    return m[ normDeity(code) ] || '';
  }
  function couponEscapeHtml(s){
    try{
      if (typeof escapeHtml === 'function'){
        return escapeHtml(s);
      }
    }catch(_){}
    return String(s||'').replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m;
    });
  }
  function describeCouponUsage(cpn, line, items){
    var amtSource = (line && line.amount != null ? line.amount : null);
    if (amtSource == null){
      if (cpn && cpn.amount != null){
        amtSource = cpn.amount;
      }else if (cpn && cpn.off != null){
        amtSource = cpn.off;
      }else if (cpn && cpn.discount != null){
        amtSource = cpn.discount;
      }else{
        amtSource = 0;
      }
    }
    var amt = Number(amtSource) || 0;
    var info = {
      status: 'pending',
      color: '#ea580c',
      itemName: '',
      amount: amt,
      message: '目前購物車未找到可套用的商品，此優惠尚未生效'
    };
    var idx = line && typeof line.itemIndex === 'number' ? line.itemIndex : -1;
    var cType = couponTypeOf(cpn);

    if (cType === 'SHIP'){
      info.status = line ? 'applied' : 'pending';
      info.color = line ? '#059669' : '#ea580c';
      info.message = line
        ? ('免運券：運費折抵 ' + tw(amt).replace(/^NT\$\s*/, 'NT$ '))
        : '免運券（折抵運費）';
      return info;
    }

    if (idx >= 0 && items && items[idx]){
      var it = items[idx] || {};
      var nm = it.name || it.title || it.productName || '商品';
      info.status = 'applied';
      info.itemName = nm;
      info.color = '#059669';
      info.message = '已套用於：「' + nm + '」，折抵 ' + tw(amt).replace(/^NT\$\s*/, 'NT$ ');
      return info;
    }
    var deity = normDeity((line && line.deity) || (cpn && cpn.deity) || '');
    var deityLabel = deityNameOf(deity);
    if (deityLabel){
      info.message = '目前商品未包含「' + deityLabel + '」系列品項，此優惠尚未生效';
    }
    return info;
  }
  try{
    window.describeCouponUsage = describeCouponUsage;
  }catch(_){}
  try{
    window.couponEscapeHtml = couponEscapeHtml;
  }catch(_){}

  function ensureCouponListBox(){
    var box = document.getElementById('cartCouponList');
    if (box) return box;

    box = document.createElement('div');
    box.id = 'cartCouponList';
    box.style.marginTop = '6px';
    box.style.display = 'none';
    box.style.fontSize = '13px';
    box.style.lineHeight = '1.6';

    var hint = document.getElementById('cartCouponHint');
    if (hint && hint.parentNode){
      hint.parentNode.insertBefore(box, hint.nextSibling);
    }else{
      var input = document.getElementById('cartCouponInput');
      if (input && input.parentNode){
        input.parentNode.appendChild(box);
      }else{
        document.body.appendChild(box);
      }
    }
    return box;
  }

  function renderCouponList(assignInfo){
    var box = ensureCouponListBox();
    var coupons = getCartCoupons();
    box.innerHTML = '';

    if (!coupons.length){
      box.style.display = 'none';
      return;
    }
    box.style.display = '';

    var items = readCart();
    var assignedLines = (assignInfo && assignInfo.lines) ? assignInfo.lines : [];

    coupons.forEach(function(cpn){
      var row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '6px 8px';
      row.style.border = '1px solid #e5e7eb';
      row.style.borderRadius = '8px';
      row.style.marginBottom = '4px';

      var deity = normDeity(cpn.deity || '');
      var dName = deityNameOf(deity);
      var line  = assignedLines.find(function(l){ 
        return String(l.code||'').toUpperCase() === String(cpn.code||'').toUpperCase();
      });
      var usage = describeCouponUsage(cpn, line, items);

      var left = document.createElement('div');
      left.innerHTML = '';
      left.innerHTML += '<div style="font-weight:700">優惠碼：'+ String(cpn.code||'') +'</div>';
      if (couponTypeOf(cpn) !== 'SHIP'){
        left.innerHTML += '<div style="color:#6b7280">守護神：'
          + (deity ? deity + (dName ? '｜'+dName : '') : '不限')
          + '</div>';
      }
      left.innerHTML += '<div style="color:'+ (usage.color || '#6b7280') +';font-size:12px">'
        + couponEscapeHtml(usage.message || '')
        + '</div>';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = t('shop.cart_remove','移除');
      btn.setAttribute('data-coupon-code', String(cpn.code||''));
      btn.style.fontSize = '12px';
      btn.style.padding = '4px 8px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid #ef4444';
      btn.style.background = '#fff';
      btn.style.color = '#ef4444';
      btn.style.cursor = 'pointer';

      row.appendChild(left);
      row.appendChild(btn);
      box.appendChild(row);
    });
  }

  // ---------- 合計金額：使用多券分配結果 ----------
  function updateCartTotals(){
    // 確保購物車優惠碼輸入框與按鈕永遠可以使用（不會被其他腳本鎖住）
    try{
      var _input = document.getElementById('cartCouponInput');
      if (_input){
        _input.disabled = false;
        _input.readOnly = false;
        _input.removeAttribute('disabled');
        _input.removeAttribute('readonly');
      }
      var _btn = document.getElementById('cartApply');
      if (_btn){
        _btn.disabled = false;
        _btn.removeAttribute('disabled');
      }
    }catch(e){}

    var items = readCart();
    var sub   = subTotal(items);
    var coupons = getCartCoupons();
    window.__cartCouponState = window.__cartCouponState || {};
    window.__cartCouponState.coupons = coupons.slice();
    var assign = assignCouponsToItems(items, coupons);
    var off   = (assign && assign.total) ? assign.total : 0;
    function needsShippingForItems(arr){
      return arr.length && arr.some(function(it){
        if (typeof window.isCandleItemLike === 'function') return !window.isCandleItemLike(it);
        var text = '';
        try{
          text += String((it && it.category) || '');
          text += ' ' + String((it && (it.name || it.title || it.productName)) || '');
        }catch(_){}
        return !/蠟燭/.test(text);
      });
    }
    var needsShipping = needsShippingForItems(items);
    var showShipping = false;
    var shippingFee = 0;
    var shipOff = 0;
    if (showShipping && needsShipping && assign && assign.ship){
      shipOff = Math.min(shippingFee, Number(assign.ship.amount||shippingFee)||shippingFee);
      shippingFee = Math.max(0, shippingFee - shipOff);
      // shipOff 只影響運費，不計入折扣欄位
    }
    // 將 shipOff 傳遞給下游顯示
    var grand = Math.max(0, sub - off + shippingFee);


    // 對外輸出目前分配結果，給上方 bar / 其他模組使用
    window.__cartCouponState = window.__cartCouponState || {};
    window.__cartCouponState.assignment = assign;
    window.__cartCouponState.shipping = showShipping ? shippingFee : 0;
    window.__cartCouponState.hasShipping = showShipping && needsShipping;
    window.__cartCouponState.shippingDiscount = showShipping ? shipOff : 0;

    function setText(selList, val){
      selList.forEach(function(sel){
        try{
          var nodes = [];
          if (typeof sel === 'string') nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
          else if (sel && sel.nodeType === 1) nodes = [sel];
          nodes.forEach(function(n){ n.textContent = val; });
        }catch(_){}
      });
    }

    // 小計（cart overlay + 其他可能的顯示區域）
    setText([
      '#cartTotal',            // 購物車視窗中的「小計」
      '#cartSubtotal',         // 舊版備援
      '#topSubtotal',          // 頂部 bar
      '[data-cart-subtotal]',
      '.cart-subtotal'
    ], tw(sub));

    // 折扣（顯示成 -NT$ xxx）；沒有折扣時顯示 -NT$ 0 並可選擇隱藏折扣列
    var offText = off ? ('-' + tw(off).replace(/^NT\$\s*/, 'NT$ ')) : '-NT$ 0';
    setText([
      '#cartOff',              // 購物車視窗中的「折扣」
      '#cartDiscount',         // 舊版備援
      '#topDiscount',          // 頂部 bar
      '[data-cart-discount]',
      '.cart-discount'
    ], offText);

    // 控制折扣那一整列要不要顯示
    try{
      var offRow = document.querySelector('.cartSum.cartDiscount');
      if (offRow){ offRow.style.display = off ? '' : 'none'; }
    }catch(_){ }

    try{
      var shipRow = document.querySelector('.cartSum.cartShip');
      if (shipRow){
        shipRow.style.display = 'none';
        var shipVal = document.getElementById('cartShipping');
        if (shipVal){
          var labelFee = shippingFee;
          if (shipOff > 0){
            shipVal.textContent = tf('checkout.shipping_discount_line', {
              fee: 'NT$ ' + formatPrice(labelFee),
              off: 'NT$ ' + formatPrice(shipOff)
            }, '+NT$ ' + formatPrice(labelFee) + '（已折抵 NT$ ' + formatPrice(shipOff) + '）');
          }else{
            shipVal.textContent = '+' + tw(labelFee).replace(/^NT\$\s*/, 'NT$ ');
          }
        }
      }
    }catch(_){}

    // 應付金額 / 總金額
    setText([
      '#cartGrandTotal',       // 購物車視窗中的「應付金額」
      '#cartGrand',            // 舊版備援
      '#cartSum',              // 其他舊版 ID
      '#topGrand',             // 頂部 bar
      '[data-cart-grand]',
      '.cartGrandTotal',
      '.cart-grand',
      '.cart-total'
    ], tw(grand));

    var hint = document.getElementById('cartCouponHint');
    if (hint){
      var state = hint.getAttribute('data-state') || '';
      if (coupons && coupons.length){
        hint.style.display = '';
        var effectiveOff = off;
        if (off > 0){
          hint.textContent = tf('checkout.coupons_applied', {
            count: coupons.length,
            amount: tw(effectiveOff).replace(/^NT\\$\\s*/, 'NT$ ')
          }, '已套用 ' + coupons.length + ' 張優惠券，總折抵 ' + tw(effectiveOff).replace(/^NT\\$\\s*/, 'NT$ '));
          hint.style.color = '#059669';
          hint.setAttribute('data-state', 'ok');
        }else{
          hint.textContent = tf('checkout.coupons_entered_pending', { count: coupons.length }, '已輸入 ' + coupons.length + ' 張優惠券，目前尚未符合折扣條件');
          hint.style.color = '#d97706';
          hint.setAttribute('data-state', 'pending');
        }
        hint.style.background = 'transparent';
        hint.style.padding = '0';
        hint.style.borderRadius = '0';
        hint.style.marginTop = '0';
      }else{
        // 若目前是錯誤狀態，就保留錯誤提示，不要清空
        if (state !== 'error'){
          hint.style.display = 'none';
          hint.textContent = '';
          hint.style.background = 'transparent';
          hint.style.padding = '0';
          hint.style.borderRadius = '0';
          hint.style.marginTop = '0';
          hint.removeAttribute('data-state');
        }
      }
    }

    // 渲染「已套用優惠券」清單
    renderCouponList(assign);

  }

  // storage 變動即時更新
  window.addEventListener('storage', function(ev){
    if (!ev) return;
    if (ev.key === 'cart' || ev.key === '__cartCoupons__'){
      updateCartTotals();
    }
  });
  document.addEventListener('DOMContentLoaded', updateCartTotals);

  // 讓新的折扣與總金額邏輯成為唯一來源：
  // 1) 把 updateCartTotals 暴露給其他腳本使用
  // 2) 用低頻率計時器重算，避免舊的購物車腳本在之後覆寫總金額或折扣
  try{
    window.__cartCouponRecalc = updateCartTotals;
    if (!window.__cartGrandWatch){
      window.__cartGrandWatch = setInterval(function(){
        try{ updateCartTotals(); }catch(_){ }
      }, 500);
    }
  }catch(_){ }

  // ---------- 遠端檢查優惠碼 ----------
  async function checkCoupon(code, deity) {
    try {
      // 改為呼叫我們自己的後端 API，由後端去安全地驗證優惠券
      const res = await fetch('/api/coupons/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, deity })
      });
      const data = await res.json();
      return data && data.ok ? data : { ok: false, reason: data.reason || 'check_failed' };
    } catch (e) {
      return { ok: false, reason: 'fetch_error' };
    }
  }

  function computeCartDeitySet(items){
    var set = new Set();
    (items||[]).forEach(function(it){
      var code = itemDeityOf(it);
      if (code) set.add(code);
    });
    return Array.from(set);
  }

  function couponTypeOf(c){
    var t = String((c && c.type) || '').toUpperCase();
    var d = String((c && c.deity) || '').toUpperCase();
    if (!t && d === 'SHIP') t = 'SHIP';
    if (!t && d === 'ALL')  t = 'ALL';
    return t || '';
  }

  // 檢查新券加入後是否真的能分配到某個商品
  function canAssignCoupon(items, coupons, newCoupon){
    var nType = couponTypeOf(newCoupon);
    if (nType === 'SHIP'){
      var existsShip = coupons.some(function(c){ return couponTypeOf(c)==='SHIP'; });
      return !existsShip;
    }
    var currentAssign = assignCouponsToItems(items, coupons);
    var withNew = coupons.concat([newCoupon]);
    var assign2 = assignCouponsToItems(items, withNew);

    var beforeCodes = {};
    (currentAssign.lines||[]).forEach(function(l){
      beforeCodes[String(l.code||'').toUpperCase()] = true;
    });

    var added = (assign2.lines||[]).some(function(l){
      var c = String(l.code||'').toUpperCase();
      return c === String(newCoupon.code||'').toUpperCase();
    });
    return added;
  }

  // ---------- 套用優惠碼按鈕（購物車） ----------
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!(t && t.id === 'cartApply')) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    (async function(){
      var input = document.getElementById('cartCouponInput');
      var code = (input && input.value || '').trim().toUpperCase();
      if (!code){
        input && input.focus();
        return;
      }

      var items = readCart();
      if (!items.length){
        alert(t('checkout.cart_no_items_coupon','購物車內沒有商品，無法套用優惠券'));
        return;
      }

      // 不允許同一張券重複加入
      var existing = getCartCoupons();
      var dup = existing.some(function(c){
        return String(c.code||'').toUpperCase() === code;
      });
      if (dup){
        var h1 = document.getElementById('cartCouponHint');
        if (h1){
          h1.style.display = '';
          h1.textContent = t('checkout.coupon_already_applied','此優惠碼已套用，無需重複使用');
          h1.style.color = '#ef4444';
        }else{
          alert(t('checkout.coupon_already_applied','此優惠碼已套用，無需重複使用'));
        }
        return;
      }

      // 若購物車只有單一守護神，帶入 deity 供後端檢查
      var deities = computeCartDeitySet(items);
      var deity = deities.length === 1 ? deities[0] : '';

      var res = await checkCoupon(code, deity);
      if (!(res && res.ok)){
        var h2 = document.getElementById('cartCouponHint');
        var msg;
        // 如果是在同一台裝置上重複輸入同一張券，或後端判定該券已使用過
        if (res && (res.reason === 'already_used' || res.reason === 'already_used_local')){
          msg = t('checkout.coupon_used','此優惠券已使用過，無法再次使用');
        }else if (res && res.reason === 'not_started'){
          msg = tf('checkout.coupon_not_started', { date: (res.startAt ? new Date(res.startAt).toLocaleString(getLang()==='en'?'en-US':'zh-TW') : '') }, '此優惠券尚未生效，開始時間：{date}');
        }else if (res && res.reason === 'expired'){
          msg = t('checkout.coupon_expired','此優惠券已過期');
        }else{
          // 其他情況（後端回傳無效、守護神不符等等）維持原本文案
          msg = t('checkout.coupon_invalid','優惠碼無效、已使用，或不適用此守護神商品');
        }
        if (h2){
          h2.style.display = '';
          h2.textContent = msg;
          h2.style.color = '#ffffff';
          h2.style.background = '#ef4444';
          h2.style.padding = '6px 10px';
          h2.style.borderRadius = '6px';
          h2.style.marginTop = '6px';
          h2.setAttribute('data-state', 'error');
        }else{
          alert(msg);
        }
        return;
      }

      // 多商品時補強：若為神祇券但購物車不含該守護神，直接提示不適用
      var resType = String(res.type || '').toUpperCase();
      var resDeity = String(res.deity || '').toUpperCase();
      if (resType !== 'ALL' && resType !== 'SHIP' && resDeity){
        var cartDeities = deities && deities.length ? deities : computeCartDeitySet(items);
        if (cartDeities.length && cartDeities.indexOf(resDeity) === -1){
          var h2b = document.getElementById('cartCouponHint');
          var msgb = '優惠碼無效、已使用，或不適用此守護神商品';
          if (h2b){
            h2b.style.display = '';
            h2b.textContent = msgb;
            h2b.style.color = '#ffffff';
            h2b.style.background = '#ef4444';
            h2b.style.padding = '6px 10px';
            h2b.style.borderRadius = '6px';
            h2b.style.marginTop = '6px';
            h2b.setAttribute('data-state', 'error');
          }else{
            alert(msgb);
          }
          return;
        }
      }

      var newCoupon = {
        code:   res.code || code,
        deity:  res.deity || deity || '',
        amount: Number(res.amount||200)||200,
        type:   (res.type || '').toUpperCase() || (res.deity ? 'DEITY' : 'ALL'),
        startAt: res.startAt || null,
        expireAt: res.expireAt || null
      };

      // 確認這張券加入後，是否真的能套用到某個商品
      var okAssign = canAssignCoupon(items, existing, newCoupon);
      if (!okAssign){
        var h3 = document.getElementById('cartCouponHint');
        var msg = t('checkout.coupon_no_applicable_items','目前購物車內沒有可套用此優惠券的商品，或相關商品已使用其他優惠。');
        if (h3){
          h3.style.display = '';
          h3.textContent = msg;
          h3.style.color = '#ef4444';
        }else{
          alert(msg);
        }
        return;
      }

      // 正式加入
      existing.push(newCoupon);
      setCartCoupons(existing);
      updateCartTotals();
      try{
        if (input){ input.value = ''; input.focus(); }
      }catch(e){}

      var hint = document.getElementById('cartCouponHint');
      if (hint){
        hint.style.display = '';
        hint.textContent = tf('checkout.coupon_applied_summary', { code: newCoupon.code, count: existing.length }, '已套用優惠碼 {code}，目前共 {count} 張優惠券生效');
        hint.style.color = '#059669';
        hint.style.background = 'transparent';
        hint.style.padding = '0';
        hint.style.borderRadius = '0';
        hint.style.marginTop = '0';
        hint.setAttribute('data-state', 'ok');
      }
    })();
  }, true);

  // ---------- 「移除優惠券」按鈕 ----------
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest && e.target.closest('button[data-coupon-code]');
    if (!btn) return;
    var code = btn.getAttribute('data-coupon-code') || '';
    if (!code) return;
    e.preventDefault();
    removeCartCoupon(code);
    updateCartTotals();
  });
  // 選用已儲存的優惠券
  (function(){
    const btn = document.getElementById('cartSelectSaved');
    if (!btn) return;
    btn.addEventListener('click', async ()=>{
      try{
        const res = await fetch('/api/me/coupons', { credentials:'include', cache:'no-store' });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data || data.ok === false){
          alert(t('checkout.coupons_load_failed_login','讀取優惠券失敗，請先登入再試。'));
          return;
        }
        const items = Array.isArray(data.items) ? data.items.filter(c=>!c.used) : [];
        if (!items.length){
          alert(t('checkout.coupons_none_saved','沒有可用的已儲存優惠券'));
          return;
        }

        // 建立優惠券選擇 Dialog（卡片版）
        function openPicker(list){
          function esc(s){ return String(s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c)); }
          const deityNames = (getLang() === 'en')
            ? {
                FM:'Brahma (Four-Faced)', GA:'Ganesha', CD:'Somdej', KP:'Khun Paen', HM:'Hanuman',
                RH:'Rahu', JL:'Garuda', ZD:'Jatukam', ZF:'Lakshmi',
                WE:'Five-Eyed Four-Eared', XZ:'Elder Xu Zhu', HP:'Hoon Payon'
              }
            : {
                FM:'四面神', GA:'象神', CD:'崇迪', KP:'坤平', HM:'哈魯曼',
                RH:'拉胡', JL:'迦樓羅', ZD:'澤度金', ZF:'招財女神',
                WE:'五眼四耳', XZ:'徐祝老人', HP:'魂魄勇'
              };
          function typeLabel(c){
            const typ = (c.type || (c.deity ? 'DEITY':'ALL')).toUpperCase();
            if (typ === 'ALL') return t('checkout.coupon_type_all','全館折扣券（全站適用）');
            if (typ === 'SHIP') return t('checkout.coupon_type_ship','免運券（運費折抵）');
            return t('checkout.coupon_type_deity','神祇券');
          }
          function deityLabel(c){
            const d = (c.deity||'').toUpperCase();
            if (!d || d==='ALL' || d==='SHIP') return '';
            return deityNames[d] ? `${deityNames[d]}（${d}）` : d;
          }
          function usageText(c){
            const typ = (c.type||'DEITY').toUpperCase();
            const d = (c.deity||'').toUpperCase();
            if (typ === 'ALL') return t('checkout.coupon_usage_all','可用於全館任一商品（全館券與神祇券擇一）。');
            if (typ === 'SHIP') return t('checkout.coupon_usage_ship','折抵運費，可搭配折扣券使用。');
            if (d && deityNames[d]) return tf('checkout.coupon_usage_deity_named', { name: deityNames[d] }, `可用於「${deityNames[d]}」系列商品。`);
            return t('checkout.coupon_usage_deity','可用於指定守護神商品。');
          }

          const overlay = document.createElement('div');
          overlay.className = 'coupon-dialog-overlay';

          const panel = document.createElement('div');
          panel.className = 'coupon-dialog-panel';

          panel.innerHTML = `
            <div class="coupon-dialog-header">
              <div class="coupon-dialog-title">${esc(t('checkout.coupon_picker_title','選擇要套用的優惠券'))}</div>
              <button type="button" class="coupon-dialog-close" aria-label="${esc(t('common.close','關閉'))}">×</button>
            </div>
            <div class="coupon-dialog-list"></div>
          `;

          const listBox = panel.querySelector('.coupon-dialog-list');
          listBox.innerHTML = list.map(c=>{
            const dLabel = deityLabel(c);
            const chips = [
              `<span class="coupon-chip">${esc(t('checkout.coupon_chip_type','類型：'))}${esc(typeLabel(c))}</span>`
            ];
            if (dLabel){
              chips.push(`<span class="coupon-chip">${esc(t('checkout.coupon_chip_guardian','守護神：'))}${esc(dLabel)}</span>`);
            }else if ((c.deity||'').toUpperCase()==='ALL'){
              chips.push(`<span class="coupon-chip">${esc(t('checkout.coupon_chip_scope','適用範圍：'))}${esc(t('checkout.coupon_scope_all','全館'))}</span>`);
            }else if ((c.deity||'').toUpperCase()==='SHIP'){
              chips.push(`<span class="coupon-chip">${esc(t('checkout.coupon_chip_scope','適用範圍：'))}${esc(t('checkout.coupon_scope_shipping','運費'))}</span>`);
            }
            chips.push(`<span class="coupon-chip ok">${esc(t('checkout.coupon_unused','未使用'))}</span>`);
            return `
              <div class="coupon-card">
                <div>
                  <div class="coupon-code">${esc(c.code||'')}</div>
                  <div class="coupon-meta">${esc(t('checkout.coupon_amount_prefix','折抵：'))}NT$ ${Number(c.amount||0)}｜${esc(typeLabel(c))}</div>
                  <div class="coupon-meta">${esc(t('checkout.coupon_issued_prefix','發放：'))}${c.issuedAt ? new Date(c.issuedAt).toLocaleString(getLang()==='en'?'en-US':'zh-TW') : esc(t('common.dash','—'))}</div>
                  <div class="coupon-meta">${esc(usageText(c))}</div>
                  ${c.startAt ? `<div class="coupon-meta">${esc(t('checkout.coupon_start_prefix','生效：'))}${new Date(c.startAt).toLocaleString(getLang()==='en'?'en-US':'zh-TW')}</div>` : ''}
                  ${c.expireAt ? `<div class="coupon-meta">${esc(t('checkout.coupon_expire_prefix','到期：'))}${new Date(c.expireAt).toLocaleString(getLang()==='en'?'en-US':'zh-TW')}</div>` : ''}
                  <div class="coupon-chips">${chips.join('')}</div>
                </div>
                <div class="coupon-actions">
                  <button type="button" class="btn primary" data-coupon-code="${esc(c.code||'')}">${esc(t('checkout.apply','套用'))}</button>
                </div>
              </div>
            `;
          }).join('');

          overlay.appendChild(panel);

          function close(){
            try{ overlay.remove(); }catch(_){}
          }
          overlay.addEventListener('click', (ev)=>{ if (ev.target === overlay) close(); });
          panel.querySelector('.coupon-dialog-close').addEventListener('click', close);
          listBox.addEventListener('click', (ev)=>{
            const btn = ev.target.closest && ev.target.closest('button[data-coupon-code]');
            if (!btn) return;
            const code = btn.getAttribute('data-coupon-code') || '';
            if (!code) return;
            const input = document.getElementById('cartCouponInput');
            if (input){ input.value = code; }
            close();
            document.getElementById('cartApply')?.click();
          });

          const host = document.getElementById('dlgCart') || document.body;
          host.appendChild(overlay);
        }

        openPicker(items);
      }catch(err){
        alert(t('checkout.coupons_load_failed','無法載入優惠券，請稍後再試'));
      }
    });
  })();

  // 將新版購物車合計函式對外公開，並定期刷新，避免被舊腳本覆蓋
  try{
    window.__cartUpdateTotals = updateCartTotals;
  }catch(_){ }
  try{
    // 每 800ms 重新計算一次，確保「小計」與「應付金額」始終一致
    setInterval(function(){
      try{ updateCartTotals(); }catch(_){ }
    }, 800);
  }catch(_){ }

  // === Unified totals helper for ALL pages (cart + top bar + bank dialog) ===
  // 之後所有地方只要呼叫 getUnifiedCartTotals()，就會用同一套邏輯：
  // 讀取 cart 內容 + 多張優惠券分配結果，算出小計 / 折扣 / 應付金額。
  try{
    window.getUnifiedCartTotals = function(opts){
      opts = opts || {};
      var includeShipping = opts.includeShipping === true;
      var overrideFee = (typeof opts.shippingFee === 'number' && !Number.isNaN(opts.shippingFee)) ? opts.shippingFee : null;
      var items = readCart();
      var coupons = getCartCoupons();
      var assign = assignCouponsToItems(items, coupons);
      var sub    = subTotal(items);
      var off    = assign && assign.total ? assign.total : 0;
      var needsShipping = items.length && items.some(function(it){
        return typeof window.isCandleItemLike === 'function' ? !window.isCandleItemLike(it) : !/蠟燭/.test(String((it&&it.category)||'') + String((it&&(it.name||it.title||''))||''));
      });
      var shipping = 0;
      var shipOff = 0;
      if (includeShipping && needsShipping){
        shipping = (overrideFee != null) ? overrideFee : (window.__shippingFee || 60);
        if (assign && assign.ship){
          shipOff = Math.min(shipping, Number(assign.ship.amount||shipping)||shipping);
          shipping = Math.max(0, shipping - shipOff);
          // shipOff 僅影響運費，不計入商品折扣
        }
      }
      var grand  = Math.max(0, sub - off + shipping);
      return {
        items:      items,
        coupons:    coupons,
        assignment: assign,
        sub:        sub,
        off:        off,
        grand:      grand,
        shipping:   shipping,
        shippingDiscount: shipOff
      };
    };

    // 統一對外的優惠券 API，讓匯款頁或其他模組都用同一套狀態
    window.cartCouponAPI = {
      getCoupons:   getCartCoupons,
      setCoupons:   setCartCoupons,
      removeCoupon: removeCartCoupon,
      recalcTotals: updateCartTotals
    };
  }catch(_){}
})();
