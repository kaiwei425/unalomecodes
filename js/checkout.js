const SHIP_LINK = "https://myship.7-11.com.tw/general/detail/GM2509114839878";

(function(){
  const BANK = { bank: '中國信託 (822)', no: '148540417073' };

  // Rich success panel (uses #toast) with "查詢訂單狀態" action
  window.showOrderSuccessPanel = function(phone, last5){
    try{
      var host = document.getElementById('toast');
      if (!host) return;
      var html = ''
        + '<div id="toastCard" style="background:#111827;color:#e5e7eb;border:1px solid rgba(255,255,255,.06);'
        + 'padding:12px 14px;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.25);min-width:260px;max-width:380px">'
        + '<div style="font-weight:800;margin-bottom:6px;font-size:14px">送出成功</div>'
        + '<div style="font-size:13px;line-height:1.5;color:#cbd5e1">'
        + '已收到你的匯款資訊。圖片較大時上傳需數秒，請勿重複點擊。你也可以立即查看訂單處理進度與祈福成果。'
        + '</div>'
        + '<div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">'
        +   '<button id="toastClose" class="btn" style="padding:6px 10px;border-radius:8px;font-size:13px;background:#374151;color:#fff;border:1px solid rgba(255,255,255,.08)">稍後</button>'
        +   '<button id="toastLookup" class="btn" style="padding:6px 10px;border-radius:8px;font-size:13px;background:#10b981;color:#062a1a;border:1px solid rgba(0,0,0,.06)">立即查詢</button>'
        + '</div>'
        + '</div>';
      host.innerHTML = html;
      host.style.display = '';
      // wire buttons
      var closeBtn = document.getElementById('toastClose');
      var goBtn = document.getElementById('toastLookup');
      if (closeBtn){ closeBtn.onclick = function(){ host.style.display='none'; }; }
      if (goBtn){
        goBtn.onclick = function(){
          host.style.display = 'none';
          if (typeof window.openOrderLookup === 'function'){
            window.openOrderLookup(phone||'', (String(last5||'').replace(/\D+/g,'').slice(-5)));
          }
        };
      }
      // auto-hide after 10s (if not interacted)
      setTimeout(function(){ try{ if (host && host.style.display !== 'none') host.style.display='none'; }catch(e){} }, 10000);
    }catch(e){}
  };

  function copyAll(){
    const text = `銀行：${BANK.bank}\n帳號：${BANK.no}`;
    try{ navigator.clipboard.writeText(text); }catch(e){
      const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    alert('已複製匯款資訊');
  }

  window.openBankDialog = function(from){
    window.__checkoutSource = (from === 'cart') ? 'cart' : 'direct';
    try{
      const dlg = document.getElementById('dlgBank');
      if(!dlg) return alert('無法顯示匯款視窗');
      // 填入展示資訊
      const bankEl = document.getElementById('bankBankVal');
      const noEl   = document.getElementById('bankNoVal');
      if (bankEl) bankEl.textContent = BANK.bank;
      if (noEl)   noEl.textContent   = BANK.no;
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
            pending.deity = toDeityCode(pending.deity || pending.name || '');
            sessionStorage.setItem('__pendingDetail__', JSON.stringify(pending));
          }
        }
      }catch(e){}
      // 自動帶入金額：購物車合計優先，否則詳情價
      let amount = 0;
      try{
        const cart = JSON.parse(localStorage.getItem('cart')||'[]');
        if (Array.isArray(cart) && cart.length){
          amount = cart.reduce((s,it)=> s + Number(it.price||0)*Math.max(1, Number(it.qty||1)), 0);
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
      function readCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){ return []; } }
      function getActiveCoupon(){
        try{ if (window.__coupon && typeof window.__coupon.getActiveCoupon==='function') return window.__coupon.getActiveCoupon(); }catch(e){}
        try{ var raw = localStorage.getItem('__activeCoupon__'); if (raw) return JSON.parse(raw); }catch(e){}
        return null;
      }

      function sumEligible(items, deity){
        if (!deity) return 0;
        var want = toDeityCode(deity);
        if (!want) return 0;
        try{
          return items.reduce(function(s,it){
            var itemCode = toDeityCode( (it && (it.deity || it.name || it.title || it.productName)) || '' );
            var ok = (itemCode && itemCode === want);
            return s + (ok ? Number(it.price||0)*Math.max(1, Number(it.qty||1)) : 0);
          }, 0);
        }catch(e){ return 0; }
      }
      var coupon = getActiveCoupon();
      var off = 0;
      if (coupon && coupon.code){
        // build a combined items list = cart + pending detail
        var items = readCart().slice();
        try{
          var _pend = JSON.parse(sessionStorage.getItem('__pendingDetail__')||'null');
          if (_pend) items.push(_pend);
        }catch(_){}
        var elig = sumEligible(items, coupon.deity);
        if (elig > 0){ off = Number(coupon.amount||200) || 200; }
      }
      var grand = Math.max(0, Math.round(amount - off));
      const amtEl = document.getElementById('bfAmount');
      if (amtEl) amtEl.value = grand;
      // show small line under amount to indicate coupon state
      (function(){
        var hint = document.getElementById('bfAmtHint');
        if (!hint) return;
        if (off > 0){
          hint.textContent = '已套用優惠碼 '+ (coupon && coupon.code || '') +' 折抵 NT$' + (Number(coupon.amount||200)||200);
          hint.style.color = '#059669';
        }else{
          hint.textContent = '系統自動帶入金額，無需修改';
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

    }catch(e){ console.error(e); alert('開啟匯款視窗失敗'); }
  };

  document.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'bankCopyAll'){ e.preventDefault(); copyAll(); }
    if (e.target && e.target.id === 'bfCancel'){ e.preventDefault(); const d=document.getElementById('dlgBank'); if(d) d.close(); }
  });

  const form = document.getElementById('bankForm');
  if (form){
    // 匯款憑證大小限制
    try{
      var rec = document.getElementById('bfFile');
      if (rec){
        rec.addEventListener('change', function(){
          try{
            var f = rec.files && rec.files[0];
            if (f && f.size > 20 * 1024 * 1024){
              alert('匯款憑證檔案過大（上限 20MB）');
              rec.value = '';
            }
          }catch(e){}
        });
      }
    }catch(e){}
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
        fd.set('method', 'BANK_TRANSFER');
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

        const res = await fetch('/api/payment/bank',  { method:'POST', body: fd });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const data = await res.json().catch(()=>({}));
        try{ sessionStorage.removeItem('__pendingDetail__'); }catch(e){}
        alert(data && data.ok ? '✅ 已送出匯款資訊，我們將盡快核對！' : '✅ 已送出，感謝！');
        if (dlg) dlg.close();
        // Show a rich success panel with an action button to open the lookup dialog (prefilled)
        try{
          var phoneVal = (document.getElementById('bfContact') && document.getElementById('bfContact').value) || '';
          var last5Val = (document.getElementById('bfLast5') && document.getElementById('bfLast5').value) || '';
          if (typeof window.showOrderSuccessPanel === 'function'){
            window.showOrderSuccessPanel(phoneVal, last5Val);
          }
        }catch(e){}

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
        alert('已送出訂單，核對匯款資訊無誤後會盡快安排出貨。');
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

/* ==== order-lookup script ==== */
(function(){
  // ---------- helpers ----------
  function statusBadge(s){
    var t = String(s||'').trim();
    var cls = 'ok-badge';
    if (t === '已完成訂單') cls += ' ok-done';
    else if (t === '已付款待出貨') cls += ' ok-paid';
    else if (t === '已寄件') cls += ' ok-ship';
    return '<span class="'+cls+'">'+ (t||'處理中') +'</span>';
  }
  function numTW(v){ try{ return 'NT$ ' + Number(String(v||0).toString().replace(/[^\d.]/g,'')).toLocaleString('zh-TW'); }catch(e){ return String(v||''); } }
  function digitsOnly(s){ return String(s||'').replace(/\D+/g,''); }
  function normalizeTWPhone(s){
    var d = digitsOnly(s);
    if (d.startsWith('8869') && d.length >= 11) return '0' + d.slice(3, 11);
    if (d.startsWith('8860') && d.length >= 13) return d.slice(3, 13);
    if (d.length === 9 && d.startsWith('9')) return '0' + d;
    if (d.length === 10 && d.startsWith('09')) return d;
    if (d.length > 10) return d.slice(-10);
    return d;
  }
  function phonesEqualLoose(a, b){
    var A = normalizeTWPhone(a);
    var B = normalizeTWPhone(b);
    if (!A || !B) return false;
    if (A === B) return true;
    var tA = A.slice(-9), tB = B.slice(-9);
    return (tA && B.endsWith(tA)) || (tB && A.endsWith(tB));
  }
  function matchesOrder(o, phone, last5){
    try{
      var pUser = normalizeTWPhone(phone);
      var l5User = String(last5||'').replace(/\D+/g,'').slice(-5);
      var wantPhone = !!pUser;
      var wantL5 = (l5User.length === 5);

      // Gather as many phone candidates as possible from common schemas
      var phoneCandidates = [
        o && o.phone, o && o.contact, o && o.mobile, o && o.phoneNumber, o && o.contactPhone,
        o && o.recipientPhone, o && o.buyerPhone, o && o.customerPhone,
        // buyer object from your backend schema
        o && o.buyer && (o.buyer.phone || o.buyer.mobile || o.buyer.contactPhone),
        // nested shipping/billing/customer/payment/bank/transfer objects
        o && o.shipping && (o.shipping.phone || o.shipping.contactPhone),
        o && o.billing  && (o.billing.phone  || o.billing.contactPhone),
        o && o.customer && (o.customer.phone || o.customer.mobile || (o.customer.contact && o.customer.contact.phone)),
        o && o.payment  && (o.payment.phone  || o.payment.contactPhone),
        o && o.bank     && (o.bank.phone     || o.bank.contactPhone),
        o && o.transfer && (o.transfer.phone || o.transfer.contactPhone)
      ].filter(Boolean);

      var phoneOk = phoneCandidates.some(function(v){ return phonesEqualLoose(v, pUser); });

      // Try to recover phone from notes/free text
      if (!phoneOk){
        var note = (o && (o.notes || o.note || o.remark || o.memo || '')) || '';
        var digits = digitsOnly(note);
        if (digits){
          var pn = normalizeTWPhone(digits);
          phoneOk = phonesEqualLoose(pn, pUser) || (!!pUser && digits.indexOf(pUser) !== -1);
        }
        // also check nested comment fields
        var cm = o && (o.comment || o.comments);
        if (!phoneOk && typeof cm === 'string'){
          var d2 = digitsOnly(cm);
          var pn2 = normalizeTWPhone(d2);
          phoneOk = phonesEqualLoose(pn2, pUser);
        }
      }

      // Gather last-5 candidates from multiple places
      var last5Candidates = [
        o && o.last5,
        o && o.transferLast5, // root-level field used by current backend
        o && o.payment && (o.payment.last5 || o.payment.ref_last5 || o.payment.lastfive || o.payment.transferLast5),
        o && o.bank    && (o.bank.last5    || o.bank.ref_last5    || o.bank.lastfive    || o.bank.transferLast5),
        o && o.transfer&& (o.transfer.last5|| o.transfer.ref_last5|| o.transfer.lastfive|| o.transfer.transferLast5)
      ].filter(Boolean).map(function(x){ return String(x||'').replace(/\D+/g,'').slice(-5); });

      var l5Ok = last5Candidates.some(function(v){ return v === l5User; });

      // Fallback: try to read any standalone 5 digits in notes/remarks
      if (!l5Ok){
        var textPool = [
          (o && (o.notes || o.note || o.remark || o.memo || '')) || '',
          (o && o.payment && (o.payment.note || o.payment.remark || '')) || ''
        ].join(' ');
        var m = textPool.match(/\b(\d{5})\b/);
        l5Ok = !!(m && m[1] === l5User);
      }

      return !!((wantPhone ? phoneOk : true) && (wantL5 ? l5Ok : true));
    }catch(e){ return false; }
  }
  function filterOrdersByQuery(list, phone, last5){
    try{
      var arr = Array.isArray(list) ? list : [];
      return arr.filter(function(o){ return matchesOrder(o, phone, last5); });
    }catch(e){ return []; }
  }
  function getAmount(o){
    var a = o && (o.amount || o.total || o.grandTotal || o.price || 0);
    if (!a){
      try{
        var items = Array.isArray(o.items) ? o.items : [];
        a = items.reduce(function(s,it){
          var unit = Number(it.unitPrice||it.price||0);
          var qty  = Number(it.qty||it.quantity||1);
          return s + unit * qty;
        }, 0);
      }catch(_){}
    }
    return a || 0;
  }
  function renderOrders(arr){
    var box = document.getElementById('lookupList');
    var wrap = document.getElementById('lookupResult');
    if (!box || !wrap) return;
    box.innerHTML = '';
    if (!Array.isArray(arr) || !arr.length){
      box.innerHTML = '<div class="ok-muted">查無符合條件的訂單，請確認輸入再嘗試。</div>';
      wrap.style.display = '';
      return;
    }
    if (arr.length > 20) arr = arr.slice(0, 20);
    arr.forEach(function(o){
      var id = o.id || o.orderId || '';
      var amt = numTW(getAmount(o));
      var items = Array.isArray(o.items) ? o.items : [];
      var lines = [];
      if (items.length){
        items.forEach(function(it){
          var name = it.name || it.productName || it.title || '商品';
          var spec = it.variantName || it.spec || it.deity || '';
          var qty  = it.qty || it.quantity || 1;
          var unit = numTW(it.unitPrice||it.price);
          lines.push('<div>'+ escapeHtml(name) +'｜單價：'+ unit +'｜規格：'+ escapeHtml(spec) +'｜數量：'+ qty +'</div>');
        });
      }else if (o.productName){
        lines.push('<div>'+ escapeHtml(o.productName) +'</div>');
      }
      var div = document.createElement('div');
      div.className = 'ok-card';
      div.innerHTML = ''
        + '<div style="font-weight:800">訂單編號：'+ escapeHtml(String(id||'')) +'</div>'
        + '<div class="ok-muted">金額：'+ amt + (lines.length? '（以下為明細）' : '') +'</div>'
        + (lines.join('')||'')
        + (o.store ? '<div class="ok-muted">門市：'+ escapeHtml(o.store) +'</div>' : '')
        + (o.contact ? '<div class="ok-muted">聯絡方式：'+ escapeHtml(o.contact) +'</div>' : '')
        + '<div class="ok-row" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;justify-content:space-between;margin-top:8px">'
        +   '<div class="ok-status">'+ statusBadge(o.status) +'</div>'
        +   ( (o && o.resultToken)
              ? ('<div class="ok-actions"><a class="btn" style="padding:6px 10px;font-size:13px" target="_blank" rel="noopener" href="/o/'+ encodeURIComponent(String(id||'')) +'?token='+ encodeURIComponent(String(o.resultToken||'')) +'">查看祈福成果</a></div>')
              : '' )
        + '</div>';
      box.appendChild(div);
    });
    wrap.style.display = '';
  }

  // ---------- multi-endpoint lookup ----------
  async function fetchJsonSafe(url, init){
    try{
      var opts = Object.assign({ cache:'no-store' }, init||{});
      var r = await fetch(url, opts);
      var text = await r.text();
      if (!text) return {};
      try{ return JSON.parse(text); }catch(_){ return {}; }
    }catch(e){ return {}; }
  }
  function pickArrayLike(obj){
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) return obj;
    return obj.orders || obj.items || obj.list || obj.data || [];
  }
  async function tryAllLookups(phone, last5){
    // Normalize inputs
    var pNorm = normalizeTWPhone(phone);
    var l5 = String(last5||'').replace(/\D+/g,'').slice(-5);

    // Compose common query variants (read-only)
    var usp1 = new URLSearchParams();
    usp1.set('phone', phone);
    usp1.set('last5', l5);
    usp1.set('lookupOnly','1');

    var usp2 = new URLSearchParams();
    usp2.set('lookup','1');
    usp2.set('phone', phone);
    usp2.set('last5', l5);

    var headersRO = {'X-Lookup':'phone+last5','X-Read-Only':'1','Cache-Control':'no-cache'};

    var all = [];

    // Helper to add unique array-like results
    function pushArr(x){
      try{
        var arr = pickArrayLike(x);
        if (Array.isArray(arr)) all = all.concat(arr);
      }catch(_){}
    }

    // --- Tier 1: filtered GET endpoints (preferred, zero side effects) ---
    pushArr(await fetchJsonSafe('/api/orders/lookup?'+usp1.toString(), {headers:headersRO}));
    pushArr(await fetchJsonSafe('/api/orders?'+usp1.toString(), {headers:headersRO}));
    pushArr(await fetchJsonSafe('/api/payment/bank?'+usp2.toString(), {headers:headersRO}));

    // --- Tier 2: plain reads (backend may ignore filters), capped by limit param if supported ---
    if (all.length === 0){
      pushArr(await fetchJsonSafe('/api/orders?limit=200', {headers:headersRO}));
      pushArr(await fetchJsonSafe('/api/payment/bank?limit=200', {headers:headersRO}));
    }

    // --- Tier 3: ultimate fallback to bare endpoints (no params) ---
    if (all.length === 0){
      pushArr(await fetchJsonSafe('/api/orders', {headers:headersRO}));
      pushArr(await fetchJsonSafe('/api/payment/bank', {headers:headersRO}));
    }

    // De-dup (by id + amount)
    var seen = new Set();
    var uniq = [];
    for (var i=0;i<all.length;i++){
      var o = all[i] || {};
      var key = (o.id||o.orderId||'') + '|' + String(getAmount(o)||0);
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(o);
    }
    return uniq;
  }

  // ---------- UI wiring ----------
  function openLookup(){
    var d = document.getElementById('dlgLookup');
    if (!d) return alert('無法顯示查詢視窗');
    try{
      // reset form and result box on every open
      var f = document.getElementById('lookupForm');
      if (f) f.reset();
      var list = document.getElementById('lookupList');
      var wrap = document.getElementById('lookupResult');
      if (list) list.innerHTML = '';
      if (wrap) wrap.style.display = 'none';
      d.showModal();
      // small delay to ensure focus lands after dialog opens
      setTimeout(function(){ try{ document.getElementById('qPhone').focus(); }catch(e){} }, 50);
    }catch(e){
      alert('請使用支援對話框的瀏覽器');
    }
  }
  document.addEventListener('click', function(e){
    var t = e.target;
    if (t && t.id === 'linkOrderLookup'){ e.preventDefault(); openLookup(); }
    if (t && t.id === 'lookupCancel'){ e.preventDefault(); var d=document.getElementById('dlgLookup'); if(d) d.close(); }
  });

  var form = document.getElementById('lookupForm');
  if (form){
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      e.stopPropagation();
      var phone = (document.getElementById('qPhone').value||'').trim();
      var last5 = (document.getElementById('qLast5').value||'').trim();
      var hasPhone = !!phone.trim();
      var hasLast5 = !!last5.trim();
      if (!hasPhone && !hasLast5){
        alert('請至少填寫手機號碼或匯款末五碼');
        return;
      }
      last5 = String(last5).replace(/\D+/g,'').slice(-5);
      var box = document.getElementById('lookupList');
      var wrap = document.getElementById('lookupResult');
      if (box){ box.innerHTML = '<div class="ok-muted">查詢中…</div>'; }
      if (wrap){ wrap.style.display = ''; }

      try{
        var raw = await tryAllLookups(phone, last5);
        var list = filterOrdersByQuery(raw, phone, last5);
        renderOrders(list);
      }catch(err){
        console.error('lookup error', err);
        if (box){ box.innerHTML = '<div class="ok-muted">查詢失敗，請稍後再試。</div>'; }
      }
    });
  }
  // Expose a helper so other modules can open the lookup dialog with prefilled fields
  window.openOrderLookup = function(phone, last5){
    try{
      openLookup();
      setTimeout(function(){
        try{
          var p = document.getElementById('qPhone');
          var l = document.getElementById('qLast5');
          if (p && typeof phone === 'string') p.value = phone;
          if (l && typeof last5 === 'string') l.value = String(last5).replace(/\D+/g,'').slice(-5);
          // focus on the next empty field
          if (p && !p.value) p.focus();
          else if (l && !l.value) l.focus();
        }catch(e){}
      }, 50);
    }catch(e){}
  };
})();

/* ==== ECPay credit card ==== */
(function(){
  function activeCoupon(){
    try{ if (window.__coupon && typeof window.__coupon.getActiveCoupon==='function') return window.__coupon.getActiveCoupon(); }catch(e){}
    try{ const raw = localStorage.getItem('__activeCoupon__'); if (raw) return JSON.parse(raw); }catch(_){}
    return null;
  }
  function readCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){ return []; } }
  function capturePendingDetail(){
    try{
      const cached = sessionStorage.getItem('__pendingDetail__');
      if (cached) return JSON.parse(cached);
    }catch(_){}
    try{
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
      var pid   = dlgEl && dlgEl.getAttribute('data-product-id');
      var looks = /蠟燭/.test(pName);
      var pending = pName ? {
        id: pid || '',
        productId: pid || '',
        name: pName,
        productName: pName,
        variantName: spec || '',
        qty: Number(qty||1),
        price: Number(unit||0),
        category: (cat === '蠟燭加持祈福' || looks) ? '蠟燭加持祈福' : (cat || '佛牌/聖物')
      } : null;
      if (pending){
        pending.deity = toDeityCode(pending.name || '');
        try{ sessionStorage.setItem('__pendingDetail__', JSON.stringify(pending)); }catch(_){}
      }
      return pending;
    }catch(_){ return null; }
  }
  function computeAmount(){
    const cart = readCart();
    const items = Array.isArray(cart) && cart.length ? cart.slice() : [];
    let pending = null;
    if (!items.length){
      pending = capturePendingDetail();
      if (pending) items.push(pending);
    } else {
      try{
        const cached = capturePendingDetail();
        if (cached) pending = cached;
      }catch(_){}
    }
    const subtotal = items.reduce((s,it)=> s + Number(it.price||0)*Math.max(1, Number(it.qty||1)), 0);
    const coupon = activeCoupon();
    let off = 0;
    if (coupon && coupon.code){
      const want = toDeityCode(coupon.deity || coupon.code || '');
      if (want){
        const elig = items.some(it => toDeityCode(it.deity || it.name || it.productName) === want);
        if (elig) off = Number(coupon.amount || 200) || 200;
      }
    }
    const grand = Math.max(0, Math.round(subtotal - off));
    return { cart, pending, items, subtotal, off, grand, coupon };
  }

  function setCouponHint(ctx){
    const hint = document.getElementById('ccCouponHint');
    if (!hint) return;
    if (ctx.coupon && ctx.coupon.code && ctx.off > 0){
      hint.style.display = 'block';
      hint.textContent = `已套用優惠碼 ${ctx.coupon.code}，折抵 NT$ ${formatPrice(ctx.off)}。`;
    } else if (ctx.coupon && ctx.coupon.code){
      hint.style.display = 'block';
      hint.textContent = `優惠碼 ${ctx.coupon.code} 尚未符合折抵條件，請確認商品守護神是否相符。`;
    } else {
      hint.style.display = 'none';
    }
  }

  window.openCreditDialog = function(source){
    try{
      if (window.__checkoutChannelRef && typeof window.__checkoutChannelRef.set==='function'){
        window.__checkoutChannelRef.set('cc');
      }
    }catch(_){}
    try{
      const dlg = document.getElementById('dlgCC');
      if (!dlg) return alert('無法顯示信用卡付款視窗');
      const ctx = computeAmount();
      dlg.__ctx = ctx;
      // 填入商品/金額摘要
      try{
        const box = document.getElementById('ccOrderItems');
        if (box){
          if (!ctx.items.length){
            box.textContent = '目前沒有商品，請返回重新選購。';
          } else {
            const lines = ctx.items.map(it=>{
              const name = (it.name || it.productName || '商品');
              const spec = it.variantName ? `（${it.variantName}）` : '';
              const qty  = Math.max(1, Number(it.qty||1));
              const unit = Number(it.price||0);
              return `${name}${spec} × ${qty}｜單價 NT$${unit}`;
            });
            box.textContent = lines.join('\n');
          }
        }
      }catch(_){}
      const amtEl = document.getElementById('ccAmount');
      if (amtEl) amtEl.textContent = 'NT$ ' + formatPrice(ctx.grand);
      setCouponHint(ctx);
      const storeFromDlg = document.getElementById('dlgStoreInput');
      const storeField   = document.getElementById('ccStore');
      if (storeField){
        const pref = (storeFromDlg && storeFromDlg.value) || (document.getElementById('bfStore') && document.getElementById('bfStore').value) || '';
        if (pref) storeField.value = pref;
      }
      const dlgCheckout = document.getElementById('dlgCheckout');
      if (dlgCheckout && typeof dlgCheckout.close === 'function') dlgCheckout.close();
      if (typeof dlg.showModal === 'function') dlg.showModal(); else alert('請使用最新瀏覽器進行付款');
    }catch(err){
      console.error('openCreditDialog error', err);
      alert('顯示信用卡付款視窗時發生錯誤，請重新整理再試。');
    }
  };

  const ccForm = document.getElementById('ccForm');
  if (ccForm){
    const cancelBtn = document.getElementById('ccCancel');
    if (cancelBtn) cancelBtn.onclick = ()=>{ const dlg = document.getElementById('dlgCC'); if (dlg) dlg.close(); };
    ccForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const dlg = document.getElementById('dlgCC');
      const ctx = (dlg && dlg.__ctx) || computeAmount();
      const cart = Array.isArray(ctx.cart) ? ctx.cart.slice() : [];
      const payload = {
        buyer:{
          name: (ccForm.querySelector('[name="name"]')?.value || '').trim(),
          phone: (ccForm.querySelector('[name="phone"]')?.value || '').trim(),
          email: (ccForm.querySelector('[name="email"]')?.value || '').trim()
        },
        store: (ccForm.querySelector('[name="store"]')?.value || '').trim(),
        note: (ccForm.querySelector('[name="note"]')?.value || '').trim()
      };
      if (cart.length){
        payload.cart = cart;
        payload.mode = 'cart';
        payload.fromCart = '1';
        payload.useCart = '1';
      } else if (ctx.pending) {
        payload.productId   = ctx.pending.productId || ctx.pending.id || '';
        payload.productName = ctx.pending.productName || ctx.pending.name || '';
        payload.price       = ctx.pending.price || 0;
        payload.qty         = ctx.pending.qty || 1;
        payload.deity       = ctx.pending.deity || ctx.pending.deityCode || '';
        payload.variantName = ctx.pending.variantName || '';
        payload.directBuy   = '1';
      }
      const c = ctx.coupon;
      if (c && c.code){
        payload.coupon = c.code;
        if (c.deity) payload.coupon_deity = c.deity;
        if (c.amount) payload.coupon_amount = c.amount;
      }
      const btn = document.getElementById('ccSubmit');
      if (btn) btn.disabled = true;
      try{
        const res = await fetch('/api/payment/ecpay/create', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
        submitECPayForm(data.action, data.params);
        if (dlg) dlg.close();
      }catch(err){
        console.error(err);
        alert('刷卡請求失敗，請稍後再試。\n' + (err && err.message ? err.message : err));
      }finally{
        if (btn) btn.disabled = false;
      }
    });
  }

  // 返回上一頁修改門市（信用卡）
  document.addEventListener('click', function(e){
    const t = e.target;
    if (!t || t.id !== 'ccBackStore') return;
    e.preventDefault();
    try{
      const dlg = document.getElementById('dlgCC');
      if (dlg && dlg.open) dlg.close();
    }catch(_){}
    try{
      const storeDlg = document.getElementById('dlgStore');
      if (storeDlg && typeof storeDlg.showModal === 'function'){
        if (typeof renderStepBar === 'function') renderStepBar('dlgStore', 2, ['確認訂單','選擇門市','填寫付款資料']);
        storeDlg.showModal();
      }
    }catch(_){}
  }, true);

  function submitECPayForm(action, params){
    if (!action || !params) {
      alert('缺少付款資訊，請稍後再試');
      return;
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.style.display = 'none';
    Object.entries(params).forEach(([k,v])=>{
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  // 保險：確保按鈕綁定到信用卡流程，不再顯示「暫未開放」
  document.addEventListener('DOMContentLoaded', function(){
    const payBtn = document.getElementById('payCC');
    if (payBtn){
      payBtn.textContent = '信用卡付款';
      payBtn.onclick = function(ev){ ev.preventDefault(); openCreditDialog('detail'); };
    }
    const cartBtn = document.getElementById('cartPayCC');
    if (cartBtn){
      cartBtn.textContent = '信用卡付款';
      cartBtn.onclick = function(ev){ ev.preventDefault(); openCreditDialog('cart'); };
    }
  });
})();
