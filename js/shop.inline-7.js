(function(){
  const BANK = { bank: '中國信託 (822)', no: '148540417073' };
  const COD_SHIPPING_FEE = (typeof window !== 'undefined' && Number(window.__codShippingFee)) ? Number(window.__codShippingFee) : 38;

  (function(){
    var dlg = document.getElementById('dlgOrderSuccess');
    if (dlg){
      dlg.addEventListener('cancel', function(ev){
        if (dlg.getAttribute('data-lock') === '1'){
          ev.preventDefault();
        }
      });
      dlg.addEventListener('close', function(){
        closeSuccessDialog();
      });
    }
  })();
  function fmtPrice(n){
    try{ return Number(n||0).toLocaleString('zh-TW'); }
    catch(_){ return String(n||0); }
  }
  function escHtml(s){
    return String(s||'').replace(/[&<>\"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
  }
  function normalizeItems(source){
    var arr = [];
    (source||[]).forEach(function(it){
      if (!it) return;
      var qty = Math.max(1, Number(it.qty || it.quantity || 1) || 1);
      var unit = Number(it.unitPrice ?? it.price ?? it.amount ?? 0) || 0;
      var total = Number(it.total ?? 0);
      if (!total) total = unit * qty;
      var spec = it.variantName || it.spec || it.deity || '';
      var name = it.name || it.productName || it.title || '商品';
      var img = it.image || it.cover || it.thumb || '';
      arr.push({ name:name, spec:spec, qty:qty, unit:unit, total:total, image:img });
    });
    return arr;
  }
  function closeSuccessDialog(){
    try{
      var dlg = document.getElementById('dlgOrderSuccess');
      if (dlg && dlg.open) dlg.close();
    }catch(_){}
    try{
      window.__orderSuccessDialogOpen = false;
      window.__orderSuccessWillOpen = false;
    }catch(_){}
    try{
      if (typeof window.__runPendingOrderReload === 'function'){
        window.__runPendingOrderReload();
      }
    }catch(_){}
  }
  function normalizeOrderSuffix(val){
    return String(val||'').replace(/[^0-9a-z]/ig,'').toUpperCase().slice(-5);
  }
  window.showOrderSuccessPanel = function(payload, legacyLast5){
    var opts = (payload && typeof payload === 'object' && !Array.isArray(payload))
      ? payload
      : { phone: payload, last5: legacyLast5 };
    opts = opts || {};
    try{
      var dlg = document.getElementById('dlgOrderSuccess');
      if (!dlg){
        try{ window.__orderSuccessWillOpen = false; }catch(_){}
        alert('訂單已送出，已寄出 Email 通知。訂單編號：' + (opts.orderId || opts.id || ''));
        return;
      }
      try{
        window.__orderSuccessDialogOpen = true;
        window.__orderSuccessWillOpen = false;
      }catch(_){}
      var order = (opts.order && typeof opts.order === 'object') ? opts.order : {};
      var id = opts.orderId || order.id || opts.id || '';
      var suffixId = id ? normalizeOrderSuffix(id) : '';
      var amount = (typeof opts.amount === 'number') ? opts.amount : Number(order.amount || 0) || 0;
      var shipping = (typeof opts.shipping === 'number') ? opts.shipping : Number(order.shippingFee || order.shipping || 0) || 0;
      var discount = (typeof opts.discount === 'number')
        ? opts.discount
        : ((order.coupon && !order.coupon.failed) ? Number(order.coupon.discount || order.coupon.amount || 0) : 0);
      var store = opts.store || (order.buyer && order.buyer.store) || order.store || '';
      var sourceItems = Array.isArray(opts.items) && opts.items.length
        ? opts.items
        : (Array.isArray(order.items) && order.items.length ? order.items : (order.productName ? [order] : []));
      var items = normalizeItems(sourceItems);
      if (!items.length && order.productName){
        items = normalizeItems([{ name: order.productName, variantName: order.variantName, qty: order.qty || 1, price: order.price || order.amount || 0 }]);
      }
      if (!amount && items.length){
        amount = items.reduce(function(sum, it){ return sum + (Number(it.total)||0); }, 0) + shipping;
      }
      var title = opts.title || '訂單建立成功';
      var desc = opts.desc || '感謝您的訂購，核對無誤後將儘速安排出貨。';
      var note = opts.note || '已寄出 Email 通知，之後可在左側「查詢訂單狀態」輸入手機號碼查看處理進度。';
      var badge = opts.badge || (opts.channel === 'credit' ? '信用卡付款' : ((opts.channel === 'cod' || opts.channel === 'cod-711') ? '貨到付款(7-11)' : '轉帳匯款'));
      var lookupDigits = opts.orderLookupDigits || suffixId;
      var phone = opts.phone || '';
      var last5 = opts.last5 || (order.transferLast5 || '');
      var continueBtn = document.getElementById('successContinue');
      var doneBtn = document.getElementById('successDone');
      var closeBtn = document.getElementById('successClose');
      var lookupBtn = document.getElementById('successLookup');
      var copyBtn = document.getElementById('successCopyId');
      var idEl = document.getElementById('successOrderId');
      var amountEl = document.getElementById('successAmount');
      var badgeEl = document.getElementById('successBadge');
      var titleEl = document.getElementById('successTitle');
      var descEl = document.getElementById('successDesc');
      var noteEl = document.getElementById('successHint');
      var itemsEl = document.getElementById('successItems');
      var metaEl = document.getElementById('successMeta');
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;
      if (noteEl) noteEl.textContent = note;
      if (idEl) idEl.textContent = id || '—';
      if (amountEl) amountEl.textContent = 'NT$ ' + fmtPrice(amount);
      if (badgeEl) badgeEl.textContent = badge;
      if (itemsEl){
        if (!items.length){
          itemsEl.innerHTML = '<div class="os-item muted">暫無商品資訊</div>';
        }else{
          itemsEl.innerHTML = '';
          items.forEach(function(it){
            var spec = it.spec ? '<span class="os-item-spec">'+ escHtml(it.spec) +'</span>' : '';
            var meta = '<div class="os-item-meta">數量：'+ it.qty +'</div>';
            var node = document.createElement('div');
            node.className = 'os-item';
            node.innerHTML = '<div><div class="os-item-name">'+ escHtml(it.name) +'</div>'+ spec + meta +'</div>'
              + '<div class="os-item-price">NT$ '+ fmtPrice(it.total || (it.unit*it.qty)) +'</div>';
            itemsEl.appendChild(node);
          });
        }
      }
      if (metaEl){
        var rows = [];
        if (store) rows.push({ label:'取貨門市', value:store });
        if (shipping > 0) rows.push({ label:'運費', value:'+NT$ '+ fmtPrice(shipping) });
        if (discount > 0) rows.push({ label:'優惠折抵', value:'-NT$ '+ fmtPrice(discount), warn:true });
        if (rows.length){
          metaEl.style.display = 'flex';
          metaEl.innerHTML = rows.map(function(r){
            return '<div class="os-meta-row'+(r.warn?' warn':'')+'"><span>'+ escHtml(r.label) +'</span><span>'+ escHtml(r.value) +'</span></div>';
          }).join('');
        }else{
          metaEl.style.display = 'none';
          metaEl.innerHTML = '';
        }
      }
      if (lookupBtn){
        lookupBtn.disabled = !phone;
        lookupBtn.textContent = '查詢訂單狀態';
        lookupBtn.onclick = function(){
          closeSuccessDialog();
          if (phone && typeof window.openOrderLookup === 'function'){
            window.openOrderLookup(phone, last5, lookupDigits || (id ? id.slice(-5) : ''), { focusPhone: false });
          } else if (!phone){
            alert('請至左側「查詢訂單狀態」輸入手機號碼與資料。');
          }
        };
      }
      if (copyBtn){
        copyBtn.onclick = function(){
          if (!id) return;
          try{
            if (typeof copyToClipboard === 'function'){
              copyToClipboard(id);
            }else{
              if (navigator.clipboard && navigator.clipboard.writeText){
                navigator.clipboard.writeText(id);
              }else{
                var ta=document.createElement('textarea');
                ta.value=id;
                ta.style.position='fixed';
                ta.style.opacity='0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
              }
            }
            copyBtn.textContent = '已複製';
            setTimeout(function(){ copyBtn.textContent = '複製'; }, 2000);
          }catch(_){}
        };
      }
      var callback = (typeof opts.onContinue === 'function') ? opts.onContinue : null;
      var cbCalled = false;
      function runCallback(){
        if (cbCalled || !callback) return;
        cbCalled = true;
        try{ callback(); }catch(_){}
      }
      if (continueBtn){
        if (callback){
          continueBtn.style.display = '';
          continueBtn.textContent = opts.continueLabel || '前往下一步';
          continueBtn.onclick = function(){
            closeSuccessDialog();
            runCallback();
          };
        }else{
          continueBtn.style.display = 'none';
          continueBtn.onclick = null;
        }
      }
      if (doneBtn){
        if (callback){
          doneBtn.style.display = 'none';
          doneBtn.onclick = null;
        }else{
          doneBtn.style.display = '';
          doneBtn.onclick = closeSuccessDialog;
        }
      }
      if (closeBtn){
        if (callback){
          closeBtn.style.display = 'none';
          closeBtn.onclick = null;
        }else{
          closeBtn.style.display = '';
          closeBtn.onclick = closeSuccessDialog;
        }
      }
      dlg.setAttribute('data-lock', callback ? '1' : '0');
      dlg.__pendingContinue = callback ? runCallback : null;
      if (callback){
        dlg.onclick = function(ev){
          if (ev.target === dlg){
            ev.preventDefault();
          }
        };
      }else{
        dlg.onclick = null;
      }
      if (typeof dlg.showModal === 'function'){
        dlg.showModal();
      }else{
        try{ window.__orderSuccessDialogOpen = false; }catch(_){}
        try{
          if (typeof window.__runPendingOrderReload === 'function'){
            window.__runPendingOrderReload();
          }
        }catch(_){}
        alert('訂單已送出，已寄出 Email 通知。訂單編號：'+ (id || ''));
      }
    }catch(err){
      console.error(err);
      try{ window.__orderSuccessDialogOpen = false; }catch(_){}
      try{
        if (typeof window.__runPendingOrderReload === 'function'){
          window.__runPendingOrderReload();
        }
      }catch(_){}
      try{ alert('訂單已送出，已寄出 Email 通知。'); }catch(_){}
    }
  };

  function copyAll(){
    const text = `銀行：${BANK.bank}\n帳號：${BANK.no}`;
    try{ navigator.clipboard.writeText(text); }catch(e){
      const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    alert('已複製付款資訊');
  }

  window.openBankDialog = function(from){
    window.__checkoutSource = (from === 'cart') ? 'cart' : 'direct';
    try{
      const dlg = document.getElementById('dlgBank');
      if(!dlg) return alert('無法顯示結帳視窗');
      // 清表單
      const f = document.getElementById('bankForm');
      if (f) f.reset();
      // 同步 7-11 門市資訊到匯款視窗（若已在前一步選好）
      try{
        var storeFromDlg = document.getElementById('dlgStoreInput');
        var storeField   = document.getElementById('bfStore');
        // 只同步欄位值，不產生任何額外「查詢門市」按鈕
        if (storeFromDlg || storeField){
          var vDlg  = (storeFromDlg && storeFromDlg.value || '').trim();
          var vBank = (storeField   && storeField.value   || '').trim();
          if (vDlg && vBank){
            if (storeField && storeField.value !== vDlg){
              storeField.value = vDlg;
            }
            if (storeFromDlg && storeFromDlg.value !== vDlg){
              storeFromDlg.value = vDlg;
            }
          } else if (vDlg && !vBank){
            if (storeField){ storeField.value = vDlg; }
          } else if (!vDlg && vBank){
            if (storeFromDlg){ storeFromDlg.value = vBank; }
          }
        }
      }catch(e){}
      // If opened from product detail, capture the current detail as a pending item
      try{
        if (from !== 'cart'){
          var nameEl = document.getElementById('dlgTitle');
          var selEl  = document.getElementById('dlgVariant');
          var qtyEl  = document.getElementById('dlgQty');
          var priceNode = document.getElementById('dlgPrice');
          var pName = (nameEl && nameEl.textContent || '').trim();
          var spec  = (selEl && selEl.options && selEl.selectedIndex>=0) ? (selEl.options[selEl.selectedIndex].textContent||'').trim() : '';
          if (spec) spec = spec.replace(/（\+[^）]*）/g,'').trim();
          var qty   = qtyEl ? Math.max(1, Number(qtyEl.value||1)) : 1;
          var total = 0;
          if (priceNode){
            var dp = Number(priceNode.getAttribute('data-price')||0);
            if (!dp){
              var txt = (priceNode.textContent||'').replace(/[ ,\s]/g,'');
              dp = Number(txt)||0;
            }
            total = dp;
          }
          var unit  = qty ? (total/qty) : total;
          var dlgEl = document.getElementById('dlg');
          var cat   = dlgEl && dlgEl.getAttribute('data-product-cat');
          var looks = /蠟燭/.test(pName);
          var pid   = dlgEl && dlgEl.getAttribute('data-product-id'); // ensure product id is captured
          var pending = pName ? {
            id: pid || '',                 // for cart compatibility
            productId: pid || '',          // explicit for backend fallback
            name: pName,
            productName: pName,
            variantName: spec || '',
            qty: Number(qty||1),
            price: Number(unit||0),
            category: (cat === '蠟燭加持祈福' || looks) ? '蠟燭加持祈福' : (cat || '佛牌/聖物')
          } : null;
          // --- deity detection ---
          // try to capture deity code from dialog dataset or name keywords
          var deityCode = '';
          if (dlgEl){
            deityCode = (dlgEl.getAttribute('data-product-deity') || dlgEl.getAttribute('data-deity') || '').toUpperCase();
          }
          if (!deityCode && pName){
            var nm = pName.replace(/\s+/g,'').toUpperCase();
            // keyword → code map
            if (/四面神|BRAHMA|PHRA PHROM|PHROM|ERAWAN/.test(pName)) deityCode = 'FM';
            else if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/.test(pName)) deityCode = 'GA';
            else if (/崇迪|SOMDEJ|SOMDEJ|SOMDET/.test(pName)) deityCode = 'CD';
            else if (/坤平|KHUNPHAEN|KHUN PAEN|K\.P\.|KP/.test(pName)) deityCode = 'KP';
            else if (/哈魯曼|H(AN|AR)UMAN|HANUMAN/.test(pName)) deityCode = 'HM';
            else if (/拉胡|RAHU/.test(pName)) deityCode = 'RH';
            else if (/迦樓羅|GARUDA|K(AR|AL)UDA/.test(pName)) deityCode = 'JL';
            else if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDOGON|ZEDUKIN/.test(pName)) deityCode = 'ZD';
            else if (/招財女神|L(AX|AK)SHMI|LAKSHMI|LAMSI|ZF/.test(pName)) deityCode = 'ZF';
            else if (/五眼四耳|FIVE[-\s]*EYES|5EYES|WE/.test(pName)) deityCode = 'WE';
            else if (/徐祝|XUZHU|XU ZHU|XZ/.test(pName)) deityCode = 'XZ';
            else if (/魂魄勇|HPY|HUN PO YONG/.test(pName)) deityCode = 'HP';
          }
          if (deityCode) pending.deity = deityCode;
          // --- end deity detection ---
          if (pending){
            pending.deity = deityCodeOf(pending.deity || pending.name || '');
            sessionStorage.setItem('__pendingDetail__', JSON.stringify(pending));
          }
        }
      }catch(e){}
      function readCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){ return []; } }
      var checkoutSource = (typeof window !== 'undefined' && window.__checkoutSource === 'cart') ? 'cart' : 'direct';
      function combinedItems(){
        var items = [];
        if (checkoutSource === 'cart'){
          items = readCart().slice();
        }
        try{
          var pendRaw = sessionStorage.getItem('__pendingDetail__');
          var pend = pendRaw ? JSON.parse(pendRaw) : null;
          if (pend){
            if (checkoutSource === 'cart'){
              items.push(pend);
            }else{
              items = [pend];
            }
          }
        }catch(_){}
        return items;
      }
      function itemsNeedShipping(arr){
        if (!arr.length) return false;
        return arr.some(function(it){
          if (typeof window.isCandleItemLike === 'function') return !window.isCandleItemLike(it);
          var text = '';
          try{
            text += String((it && it.category) || '');
            text += ' ' + String((it && (it.name || it.title || it.productName)) || '');
          }catch(_){}
          return !/蠟燭/.test(text);
        });
      }
      function allCandle(arr){
        return arr.length>0 && arr.every(function(it){
          return typeof window.isCandleItemLike === 'function'
            ? window.isCandleItemLike(it)
            : /蠟燭/.test(String((it && it.category)||'') + String((it && (it.name||it.title||''))||''));
        });
      }
      var allItems = combinedItems();
      var candleFlow = allCandle(allItems);
      try{ sessionStorage.setItem('__candle_flow', candleFlow ? '1' : ''); }catch(_){}
      if (candleFlow){
        try{ resetStoreSelection(); }catch(_){}
      }
      applyStoreFieldVisibility(!candleFlow);

      // 自動帶入金額：購物車合計優先，否則詳情價
      let amount = 0;
      try{
        if (allItems.length){
          amount = allItems.reduce((s,it)=> s + Number(it.price||0)*Math.max(1, Number(it.qty||1)), 0);
        }
      }catch{}
      if (!amount){
        try{
          const priceNode = document.getElementById('dlgPrice');
          const p = priceNode ? Number(priceNode.getAttribute('data-price')||0) : 0;
          if (p>0) amount = p;
        }catch{}
      }
      // apply active coupon (fixed NT$200) only if deity matches any item
      function getActiveCoupon(){
        try{ if (window.__coupon && typeof window.__coupon.getActiveCoupon==='function') return window.__coupon.getActiveCoupon(); }catch(e){}
        try{ var raw = localStorage.getItem('__activeCoupon__'); if (raw) return JSON.parse(raw); }catch(e){}
        return null;
      }
      // Normalize any deity input (2-letter code or Chinese/English name) → 2-letter code
      function deityCodeOf(input){
        try{
          var s = (input||'').toString().trim();
          if (!s) return '';
          // already a 2-letter code
          if (/^[A-Z]{2}$/.test(s)) return s.toUpperCase();

          var raw = s.toUpperCase();
          // Chinese/English keyword matching (same rules as pending detection)
          if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/i.test(s)) return 'FM';
          if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/i.test(s))   return 'GA';
          if (/崇迪|SOMDEJ|SOMDET/i.test(s))                      return 'CD';
          if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/i.test(s))  return 'KP';
          if (/哈魯曼|H(AN|AR)UMAN/i.test(s))                     return 'HM';
          if (/拉胡|RAHU/i.test(s))                                return 'RH';
          if (/迦樓羅|GARUDA|K(AR|AL)UDA/i.test(s))               return 'JL';
          if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/i.test(s)) return 'ZD';
          if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/i.test(s))          return 'ZF';
          if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/i.test(s)) return 'WE';
          if (/徐祝|XU\s*ZHU|XUZHU/i.test(s))                     return 'XZ';
          if (/魂魄勇|HUN\s*PO\s*YONG|HPY/i.test(s))              return 'HP';

          return raw.length === 2 ? raw : raw; // fallback: return uppercased raw
        }catch(e){ return ''; }
      }

      function sumEligible(items, deity){
        if (!deity) return 0;
        var want = deityCodeOf(deity);
        if (!want) return 0;
        try{
          return items.reduce(function(s,it){
            var itemCode = deityCodeOf( (it && (it.deity || it.name || it.title || it.productName)) || '' );
            var ok = (itemCode && itemCode === want);
            return s + (ok ? Number(it.price||0)*Math.max(1, Number(it.qty||1)) : 0);
          }, 0);
        }catch(e){ return 0; }
      }
      var coupon = getActiveCoupon();
      var off = 0;
      if (!candleFlow && coupon && coupon.code){
        var elig = sumEligible(allItems, coupon.deity);
        if (elig > 0){ off = Number(coupon.amount||200) || 200; }
      }
      var shippingFee = (!candleFlow && itemsNeedShipping(allItems)) ? COD_SHIPPING_FEE : 0;
      var grand = Math.max(0, Math.round(amount - off + shippingFee));
      const amtEl = document.getElementById('bfAmount');
      if (amtEl) amtEl.value = grand;
      // show small line under amount to indicate coupon state
      (function(){
        var hint = document.getElementById('bfAmtHint');
        if (!hint) return;
        var baseText = shippingFee > 0
          ? '含 7-11 店到店運費 NT$' + COD_SHIPPING_FEE + '，請確認金額後再送出'
          : '系統自動帶入金額，無需修改';
        if (off > 0){
          hint.textContent = '已套用優惠碼 '+ (coupon && coupon.code || '') +' 折抵 NT$' + (Number(coupon.amount||200)||200) + (shippingFee>0 ? '；' + baseText : '');
          hint.style.color = '#059669';
        }else{
          hint.textContent = baseText;
          hint.style.color = '#6b7280';
        }
      })();
      // Candle extras based on formal category
      try{ var need = needCandleExtras(); ensureCandleFields(need); }catch(_){ }
      // Ensure toggleCandleUI runs after order state is set (only one copy)
      try{ if (typeof toggleCandleUI === 'function') toggleCandleUI(); }catch(e){}
      // 關閉其他已開啟的 dialog，避免 showModal 失敗
      try{ document.querySelectorAll('dialog[open]').forEach(d=>{ if(d!==dlg) d.close(); }); }catch{}
      // 顯示 Dialog
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else alert('請使用支援對話框的瀏覽器');

      // 移除匯款頁最下方「文字版購物車摘要」區塊（本次匯款金額包含以下購物車商品：...）
      // 只刪掉純文字摘要，不碰上方圖片版訂單確認表格
      try{
        var dlgRoot = document.getElementById('dlgBank');
        if (dlgRoot){
          var blocks = dlgRoot.querySelectorAll('div,section');
          blocks.forEach(function(node){
            var txt = (node.textContent || '').replace(/\s+/g,'');
            if (txt.indexOf('本次匯款金額包含以下購物車商品：') === 0){
              node.remove();
            }
          });
        }
      }catch(e){}

    }catch(e){ console.error(e); alert('開啟結帳視窗失敗'); }
  };

  document.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'bankCopyAll'){ e.preventDefault(); copyAll(); }
    if (e.target && e.target.id === 'bfCancel'){ e.preventDefault(); const d=document.getElementById('dlgBank'); if(d) d.close(); }
  });

  if (typeof window.__clearCouponState !== 'function'){
    window.__clearCouponState = function(){
      try{
        if (typeof setCartCoupons === 'function'){
          setCartCoupons([]);
        }else{
          localStorage.removeItem('__cartCoupons__');
          localStorage.removeItem('__cartCouponsCartSig__');
        }
      }catch(_){}
      try{ localStorage.removeItem('__activeCoupon__'); }catch(_){}
      try{
        window.__cartCouponState = window.__cartCouponState || {};
        window.__cartCouponState.coupons = [];
        window.__cartCouponState.assignment = null;
        window.__cartCouponState.shipping = 0;
        window.__cartCouponState.hasShipping = false;
      }catch(_){}
      try{
        window.__coupon = window.__coupon || {};
        window.__coupon.getActiveCoupon = function(){ return null; };
        window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay();
      }catch(_){}
    };
  }
  var clearCouponState = window.__clearCouponState;
if (typeof window.__scheduleOrderRefresh !== 'function'){
  window.__scheduleOrderRefresh = function(delay){
    try{
      var wait = delay || 1200;
      var trigger = function(){
        if (window.__orderRefreshTimer){
          clearTimeout(window.__orderRefreshTimer);
        }
        window.__orderRefreshTimer = setTimeout(function(){
          try{ window.location.reload(); }catch(_){}
        }, wait);
      };
      if (window.__orderSuccessDialogOpen || window.__orderSuccessWillOpen){
        window.__pendingOrderReload = true;
        window.__orderReloadTrigger = trigger;
        return;
      }
      trigger();
    }catch(_){}
  };
}
if (typeof window.__runPendingOrderReload !== 'function'){
  window.__runPendingOrderReload = function(){
    try{
      if (window.__pendingOrderReload && typeof window.__orderReloadTrigger === 'function'){
        var fn = window.__orderReloadTrigger;
        window.__pendingOrderReload = false;
        window.__orderReloadTrigger = null;
        fn();
      }
    }catch(_){}
  };
}
var scheduleOrderRefresh = window.__scheduleOrderRefresh;

  const form = document.getElementById('bankForm');
  if (form && !form.__bankSubmitBound){
    form.__bankSubmitBound = true;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const dlg = document.getElementById('dlgBank');

      const submitBtn = document.getElementById('bfSubmit');
      let pendingOverlay = document.getElementById('orderPendingOverlay');
      let pendingText = document.getElementById('orderPendingText');
      if (!pendingOverlay) {
        pendingOverlay = document.createElement('div');
        pendingOverlay.id = 'orderPendingOverlay';
        pendingOverlay.style.position = 'fixed';
        pendingOverlay.style.inset = '0';
        pendingOverlay.style.zIndex = '9999';
        pendingOverlay.style.display = 'none';
        pendingOverlay.style.alignItems = 'center';
        pendingOverlay.style.justifyContent = 'center';
        pendingOverlay.style.background = 'rgba(15,23,42,0.45)';
        pendingOverlay.style.backdropFilter = 'blur(2px)';
        pendingOverlay.innerHTML = '<div id="orderPendingOverlayBox" style="display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:#ffffff;box-shadow:0 10px 25px rgba(15,23,42,0.35);font-size:14px;color:#374151;"><div id="orderPendingSpinner" style="width:18px;height:18px;border-radius:999px;border:2px solid #e5e7eb;border-top-color:#4b5563;animation:orderPendingSpin 0.8s linear infinite;"></div><div id="orderPendingText">訂單送出中，請稍候...</div></div>';
        (dlg || document.body).appendChild(pendingOverlay);
        if (!document.getElementById('orderPendingSpinStyle')) {
          const st = document.createElement('style');
          st.id = 'orderPendingSpinStyle';
          st.textContent = '@keyframes orderPendingSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}';
          document.head.appendChild(st);
        }
        pendingText = document.getElementById('orderPendingText');
      }

      if (pendingOverlay) {
        pendingOverlay.style.display = 'flex';
        if (pendingText) pendingText.textContent = '訂單送出中，請稍候...';
      }
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      const fd = new FormData(form);
      // 附加 7-11 門市資訊
      try{
        var sEl = document.getElementById('bfStore');
        if (sEl){
          fd.set('store', (sEl.value||'').trim());
          fd.append('store_id', sEl.getAttribute('data-storeid')||'');
          fd.append('store_name', sEl.getAttribute('data-storename')||'');
          fd.append('store_address', sEl.getAttribute('data-storeaddress')||'');
          fd.append('store_tel', sEl.getAttribute('data-storetel')||'');
        }
      }catch(_){ }
      // 不再強制檢查蠟燭加持額外欄位；改以備註＋可選照片
      try{ /* no-op */ }catch(_){ }
      try{
        // Merge: existing cart + pending detail (if any)
        var cart = [];
        try{ cart = JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){}
        if (!Array.isArray(cart)) cart = [];
        try{
          var pendRaw = sessionStorage.getItem('__pendingDetail__');
          var pend = pendRaw ? JSON.parse(pendRaw) : null;
          if (pend && typeof pend === 'object'){
            // 若購物車本身已有商品（從購物車匯款），就不要再加 pending，避免重複計算
            if (!cart.length){
              cart.push(pend);
            }
          }
        }catch(e){}
        fd.set('cart', JSON.stringify(cart));
        fd.set('method', 'COD_711');
        if (Array.isArray(cart) && cart.length > 0) {
          fd.set('mode', 'cart');
          fd.set('useCart', '1');
        }

        // Fallback product identity for backend counters (when no cart or missing id)
        try{
          var pendRaw2 = sessionStorage.getItem('__pendingDetail__');
          var pend2 = pendRaw2 ? JSON.parse(pendRaw2) : null;
          var fpid = (pend2 && (pend2.productId || pend2.id)) || '';
          var fqty = (pend2 && Number(pend2.qty||1)) || '';
          if (fpid){ fd.set('productId', String(fpid)); }
          if (fqty){ fd.set('qty', String(fqty)); }
          if (pend2 && pend2.variantName){ fd.set('variantName', String(pend2.variantName)); }
        }catch(_){}

        // attach coupon info if present
        try{
          var c = (window.__coupon && window.__coupon.getActiveCoupon && window.__coupon.getActiveCoupon()) || null;
          if (c){ fd.set('coupon', String(c.code||'')); fd.set('coupon_deity', String(c.deity||'')); }
        }catch(e){}
        try{
          var couponState = window.__cartCouponState || {};
          var multiCoupons = Array.isArray(couponState.coupons) ? couponState.coupons : [];
          if (multiCoupons.length){
            fd.set('coupons', JSON.stringify(multiCoupons.map(function(item){
              return {
                code: String(item.code||'').trim().toUpperCase(),
                deity: String(item.deity||'').trim().toUpperCase(),
                amount: (item.amount != null ? Number(item.amount) : undefined)
              };
            })));
          }
          if (couponState.assignment){
            fd.set('coupon_assignment', JSON.stringify(couponState.assignment));
            fd.set('coupon_total', String(Number(couponState.assignment.total||0)));
          }else if (off > 0){
            fd.set('coupon_total', String(off));
          }
          fd.set('shipping', String(shippingFee || 0));
        }catch(_){}

        const res = await fetch('/api/payment/bank',  { method:'POST', body: fd });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json().catch(()=>({}));
        try{ sessionStorage.removeItem('__pendingDetail__'); }catch(e){}
        try{
          if (typeof clearCouponState === 'function') clearCouponState();
          else if (typeof window.__clearCouponState === 'function') window.__clearCouponState();
        }catch(_){}
        var success = !!(data && data.ok);
        var willShowDialog = typeof window.showOrderSuccessPanel === 'function';
        if (willShowDialog){
          try{ window.__orderSuccessWillOpen = true; }catch(_){}
        }
        alert(success ? '✅ 已送出訂單，我們將盡快安排出貨！' : '✅ 已送出，感謝！');
        if (success){
          try{
            if (typeof scheduleOrderRefresh === 'function') scheduleOrderRefresh(600);
            else if (typeof window.__scheduleOrderRefresh === 'function') window.__scheduleOrderRefresh(600);
            else setTimeout(function(){ try{ window.location.reload(); }catch(_){ } }, 600);
          }catch(_){}
        }
        if (dlg) dlg.close();
        // Show a rich success panel with an action button to open the lookup dialog (prefilled)
        try{
          var phoneVal = (document.getElementById('bfContact') && document.getElementById('bfContact').value) || '';
          if (willShowDialog){
            window.showOrderSuccessPanel({
              channel:'cod',
              phone: phoneVal,
              last5: '',
              orderId: (data && data.id) || '',
              order: (data && data.order) || null,
              items: data && data.order && data.order.items,
              amount: data && data.order ? data.order.amount : null,
              shipping: data && data.order ? (data.order.shippingFee || data.order.shipping) : null,
              discount: data && data.order && data.order.coupon && !data.order.coupon.failed ? (data.order.coupon.discount || data.order.coupon.amount) : null,
              store: data && data.order && data.order.buyer && data.order.buyer.store
            });
          }
        }catch(e){
          console.error(e);
          try{ window.__orderSuccessWillOpen = false; }catch(_){}
          try{
            if (typeof window.__runPendingOrderReload === 'function'){
              window.__runPendingOrderReload();
            }
          }catch(_){}
        }

        // After success: clear cart and refresh product list to reflect updated "已售出"
        try{ localStorage.removeItem('cart'); }catch(_){}
        try{ window.__coupon && window.__coupon.updateTotalsDisplay(); }catch(_){ }
        try{
          if (typeof loadProducts === 'function'){
            await loadProducts();
          }
          // also refresh the badge in the opened detail dialog if same product
          var dlgEl2 = document.getElementById('dlg');
          var pidNow = dlgEl2 && dlgEl2.getAttribute('data-product-id');
          if (pidNow && Array.isArray(window.rawItems)){
            var pNew = window.rawItems.find(function(x){ return String(x.id) === String(pidNow); });
            if (pNew){
              var chip = document.getElementById('dlgChip');
              if (chip) chip.textContent = '已售出：' + Number(pNew.sold||0);
              var stockEl = document.getElementById('dlgStock');
              if (stockEl){
                var vStock = null;
                if (Array.isArray(pNew.variants) && pNew.variants.length){
                  var has = false; var sum = 0;
                  pNew.variants.forEach(function(v){
                    if (v && v.stock !== undefined && v.stock !== null){
                      var n = Number(v.stock);
                      if (!isNaN(n)){ has = true; sum += n; }
                    }
                  });
                  if (has) vStock = sum;
                }
                if (vStock === null && pNew.stock !== undefined && pNew.stock !== null){
                  var n2 = Number(pNew.stock);
                  if (!isNaN(n2)) vStock = n2;
                }
                if (vStock === null){
                  stockEl.style.display = 'none';
                  stockEl.classList.remove('ok','zero');
                } else {
                  stockEl.style.display = 'inline-flex';
                  stockEl.textContent = vStock > 0 ? ('庫存：' + vStock) : '庫存：0（已售完）';
                  stockEl.classList.toggle('ok', vStock > 0);
                  stockEl.classList.toggle('zero', vStock <= 0);
                }
              }
            }
          }
        }catch(_){}
      }catch(err){
        console.error(err);
        try{
          const stash = JSON.parse(localStorage.getItem('bankSubmits')||'[]');
          const obj = {}; fd.forEach((v,k)=>{ if(k==='receipt'){ obj[k] = (v && v.name) || 'file'; } else obj[k]=v; });
          obj.ts = Date.now();
          stash.push(obj);
          localStorage.setItem('bankSubmits', JSON.stringify(stash));
        }catch{}
        try{ sessionStorage.removeItem('__pendingDetail__'); }catch(e){}
        alert('已送出訂單，我們將盡快安排出貨。');
        if (dlg) dlg.close();
      }finally{
        if (pendingOverlay) {
          pendingOverlay.style.display = 'none';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
    });
  }
})();
// ---- bank dialog coupon apply (for direct-buy path) ----
(function(){
  var BASE = 'https://coupon-service.kaiwei425.workers.dev';
  function getPendingDeity(){
    try{
      var p = JSON.parse(sessionStorage.getItem('__pendingDetail__')||'null');
      if (p && (p.deity || p.name)) return deityCodeOf(p.deity || p.name);
    }catch(_){}
    try{
      var dlg = document.getElementById('dlg');
      var d = (dlg && (dlg.getAttribute('data-product-deitycode') || dlg.getAttribute('data-product-deity') || dlg.getAttribute('data-deity') || dlg.getAttribute('data-product-name'))) || '';
      if (d) return deityCodeOf(d);
    }catch(_){}
    return '';
  }
  async function checkCoupon(code, deity){
    var url = BASE + '/check?code=' + encodeURIComponent(code) + (deity ? '&deity=' + encodeURIComponent(deity) : '');
    var r = await fetch(url, { method:'GET', mode:'cors', credentials:'omit', cache:'no-store' });
    var j = await r.json().catch(()=>({}));
    return j && j.ok ? j : { ok:false };
  }
  function setActiveCoupon(obj){
    try{
      // write to localStorage so other modules react (top bar/cart observers)
      localStorage.setItem('__activeCoupon__', JSON.stringify(obj||{}));
      // minimal window.__coupon shim
      window.__coupon = window.__coupon || {};
      window.__coupon.getActiveCoupon = function(){ try{ var raw=localStorage.getItem('__activeCoupon__'); return raw?JSON.parse(raw):null; }catch(e){ return null; } };
      window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay();
      // notify listeners
      window.dispatchEvent(new StorageEvent('storage', { key:'__activeCoupon__', newValue:JSON.stringify(obj||{}) }));
    }catch(e){}
  }
  function markHint(ok, text){
    var hint = document.getElementById('bfCouponHint');
    if (!hint) return;
    hint.style.display = '';
    hint.textContent = text || (ok ? '已套用優惠碼' : '優惠碼無效或不適用');
    hint.style.color = ok ? '#059669' : '#ef4444';
  }
  function recalcAmount(){
    try{
      var amtEl = document.getElementById('bfAmount');
      var aHint = document.getElementById('bfAmtHint');

      // 1) Collect current items exactly like the order-summary does:
      var items = [];
      // 1a) cart (unless checkoutSource === 'direct')
      try{
        var src = (typeof window !== 'undefined' && window.__checkoutSource) ? String(window.__checkoutSource) : '';
        if (src !== 'direct'){
          var cart = JSON.parse(localStorage.getItem('cart')||'[]');
          if (Array.isArray(cart) && cart.length){
            items = cart.map(function(it){
              return {
                name:  (it && (it.name||it.title)) || '商品',
                spec:  (it && (it.variantName||'')) || '',
                qty:   Math.max(1, Number((it && it.qty) || 1)),
                price: Number((it && it.price) || 0),
                deity: (it && it.deity) || ''
              };
            });
          }
        }
      }catch(_){}
      // 1b) pending detail (direct-buy path)
      try{
        var pendRaw = sessionStorage.getItem('__pendingDetail__');
        var pend = pendRaw ? JSON.parse(pendRaw) : null;
        if (pend && (pend.name || pend.productName)){
          items.push({
            name:  pend.name || pend.productName || '商品',
            spec:  pend.variantName || '',
            qty:   Math.max(1, Number(pend.qty||1)),
            price: Number(pend.price||0),
            deity: (pend.deity||'')
          });
        }
      }catch(_){}

      // 2) Subtotal
      var amount = 0;
      try{
        amount = items.reduce(function(s,it){
          return s + Number(it.price||0) * Math.max(1, Number(it.qty||1));
        }, 0);
      }catch(_){ amount = 0; }

      var shippingFee = (items.length && items.some(function(it){ return !isCandleItemLike(it); })) ? (window.__codShippingFee || window.__shippingFee || 60) : 0;

      // 3) Coupon discount (fixed -200 if eligible deity is present in items)
      var cpnRaw = localStorage.getItem('__activeCoupon__');
      var cpn = cpnRaw ? JSON.parse(cpnRaw) : null;
      var off = 0;
      if (cpn && cpn.code){
        var want = (typeof deityCodeOf === 'function') ? deityCodeOf(cpn.deity) : String(cpn.deity||'').toUpperCase();
        var elig = 0;
        try{
          elig = items.reduce(function(s,it){
            var code = (it && it.deity && /^[A-Z]{2}$/.test(String(it.deity))) ? String(it.deity).toUpperCase()
                      : (typeof deityCodeOf === 'function' ? deityCodeOf((it && (it.name||'')) || '') : String(it.deity||'').toUpperCase());
            var ok = (code && want && code === want);
            return s + (ok ? Number(it.price||0) * Math.max(1, Number(it.qty||1)) : 0);
          }, 0);
        }catch(_){ elig = 0; }
        if (elig > 0) off = Number(cpn.amount||200) || 200;
      }

      var grand = Math.max(0, Math.round(amount - off + shippingFee));

      if (amtEl) amtEl.value = grand;
      if (aHint){
        var baseText = shippingFee > 0
          ? '含 7-11 店到店運費 NT$' + (window.__codShippingFee || window.__shippingFee || 60) + '，系統自動帶入金額，無需修改'
          : '系統自動帶入金額，無需修改';
        if (off>0){
          aHint.textContent = '已套用優惠碼 ' + (cpn && cpn.code || '') + ' 折抵 NT$' + (Number(cpn && cpn.amount || 200) || 200) + (shippingFee>0 ? '；' + baseText : '');
          aHint.style.color = '#059669';
        }else{
          aHint.textContent = baseText;
          aHint.style.color = '#6b7280';
        }
      }

      // 通知其他總計區塊（若有）
      try{ window.__coupon && window.__coupon.updateTotalsDisplay && window.__coupon.updateTotalsDisplay(); }catch(_){}
    }catch(e){}
  }

  // expose and react to changes
  window.__recalcBankAmount = recalcAmount;
  window.addEventListener('storage', function(ev){
    try{
      if (!ev) return;
      if (ev.key === 'cart' || ev.key === '__activeCoupon__'){ recalcAmount(); }
    }catch(_){}
  });

  // MutationObserver: watch order list for changes and recalc
  try{
    var orderListNode = document.getElementById('bfOrderList');
    if (orderListNode){
      var mo = new MutationObserver(function(){ recalcAmount(); });
      mo.observe(orderListNode, { childList:true, subtree:false });
    }
  }catch(_){}

  document.addEventListener('click', async function(e){
    if (!(e.target && e.target.id === 'bfCouponApply')) return;
    e.preventDefault();
    var code = (document.getElementById('bfCouponInput') && document.getElementById('bfCouponInput').value || '').trim().toUpperCase();
    if (!code){ markHint(false, '請輸入優惠碼'); return; }
    var deity = getPendingDeity();
    var res = await checkCoupon(code, deity);
    if (res && res.ok){
      setActiveCoupon({ code:res.code||code, deity:res.deity||deity, amount:Number(res.amount||200)||200 });
      markHint(true, '已套用優惠碼 ' + (res.code||code) + '（限定：'+ (res.deity||deity) +'）');
      recalcAmount();
    }else{
      markHint(false, '優惠碼無效、已使用，或不適用此守護神商品');
    }
  });
})();
