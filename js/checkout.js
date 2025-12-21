const SHIP_LINK = "https://myship.7-11.com.tw/general/detail/GM2509114839878";
const SHIPPING_FEE = (typeof window !== 'undefined' && Number(window.__shippingFee)) ? Number(window.__shippingFee) : 60;
try{ if (typeof window !== 'undefined') window.__shippingFee = SHIPPING_FEE; }catch(_){}
const PROFILE_URL = (function(){
  try{ return (window.__SHOP_ORIGIN || window.location.origin || '') + '/api/me/profile'; }
  catch(_){ return '/api/me/profile'; }
})();

function isCandleItemLike(obj){
  try{
    var text = '';
    if (obj && obj.category) text += String(obj.category);
    var nm = (obj && (obj.name || obj.title || obj.productName || obj.deity)) || '';
    text += ' ' + String(nm);
    return /蠟燭/.test(text);
  }catch(_){ return false; }
}

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

const bfNameInput = document.getElementById('bfName');
const bfPhoneInput = document.getElementById('bfContact');
const bfEmailInput = document.getElementById('bfEmail');
const memberPerkHintEl = document.getElementById('memberPerkHint');
const bfStoreInput = document.getElementById('bfStore');

function applyBankProfile(profile, force){
  if (!profile) return;
  try{ console.debug && console.debug('[checkout] apply profile', profile); }catch(_){}
  const defaults = profile.defaultContact || {};
  const source = Object.assign(
    {},
    {
      name: profile.name || '',
      email: profile.email || ''
    },
    defaults
  );
  if (bfNameInput && (force || !bfNameInput.value)) bfNameInput.value = source.name || '';
  if (bfPhoneInput && (force || !bfPhoneInput.value) && source.phone) bfPhoneInput.value = source.phone;
  if (bfEmailInput && (force || !bfEmailInput.value)) bfEmailInput.value = source.email || '';
  updateMemberPerkHint(profile);
  if (bfStoreInput && profile.defaultStore){
    const st = profile.defaultStore || {};
    const textParts = [];
    if (st.name) textParts.push(st.name);
    if (st.id) textParts.push(`(${st.id})`);
    if (!textParts.length && st.address) textParts.push(st.address);
    const storeText = textParts.join(' ');
    if (typeof window.fillStoreIntoForm === 'function'){
      window.fillStoreIntoForm({
        storename: st.name || '',
        storeid: st.id || '',
        storeaddress: st.address || '',
        storetel: st.tel || ''
      });
    } else {
      if (storeText) bfStoreInput.value = storeText;
      if (st.id) bfStoreInput.setAttribute('data-storeid', st.id);
      if (st.name) bfStoreInput.setAttribute('data-storename', st.name);
      if (st.address) bfStoreInput.setAttribute('data-storeaddress', st.address);
      if (st.tel) bfStoreInput.setAttribute('data-storetel', st.tel);
      const dlgStore = document.getElementById('dlgStoreInput');
      if (dlgStore && storeText) dlgStore.value = storeText;
      const ccStore = document.getElementById('ccStore');
      if (ccStore && storeText) ccStore.value = storeText;
    }
  }
}

function updateMemberPerkHint(profile){
  if (!memberPerkHintEl) return;
  // 暫不顯示會員折扣
  memberPerkHintEl.style.display = 'none';
}

function maybeSaveDefaultStore(){
  if (!bfStoreInput) return;
  const payload = {
    name: bfStoreInput.value || bfStoreInput.getAttribute('data-storename') || '',
    id: bfStoreInput.getAttribute('data-storeid') || '',
    address: bfStoreInput.getAttribute('data-storeaddress') || '',
    tel: bfStoreInput.getAttribute('data-storetel') || ''
  };
  if (!payload.name && !payload.id) return;
  try{
    fetch('/api/me/store', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify(payload)
    }).catch(()=>{});
  }catch(_){}
}

if (window.authState){
  window.authState.onProfile(profile=>{
    try{ console.debug && console.debug('[checkout] authState onProfile', profile); }catch(_){}
    applyBankProfile(profile);
  });
  if (typeof window.authState.getProfile === 'function'){
    const existing = window.authState.getProfile();
    try{ console.debug && console.debug('[checkout] existing profile', existing); }catch(_){}
    if (existing) applyBankProfile(existing);
  }
}

// 後備：若未透過 authState 取得資料，直接呼叫 /api/me/profile 帶入
(function(){
  let attempts = 0;
  let cachedProfile = null;
  function tryFillCached(){
    if (cachedProfile){
      applyBankProfile(cachedProfile);
    }
  }
  async function preloadProfileForCheckout(){
    // 若已經填有值則不覆蓋使用者輸入
    if ((bfNameInput && bfNameInput.value) || (bfPhoneInput && bfPhoneInput.value) || (bfEmailInput && bfEmailInput.value)){
      attempts = 99; // 停止重試
      return;
    }
    try{
      const res = await fetch(PROFILE_URL, { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (data && data.profile){
        cachedProfile = data.profile;
        applyBankProfile(data.profile);
      }
      if (res && !res.ok && (!data || !data.profile)){
        console.warn('profile preload failed', res.status);
      }
    }catch(e){
      console.warn('profile preload error', e);
    }
    attempts++;
    if (attempts < 8){
      setTimeout(preloadProfileForCheckout, 800);
    }
  }
  // 等待 DOM 完成後再開始嘗試
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', preloadProfileForCheckout, { once:true });
  }else{
    preloadProfileForCheckout();
  }
  // 若 3 秒後仍空白，再強制補一次
  setTimeout(()=>{ preloadProfileForCheckout(); }, 3000);
  // 以 1 秒間隔連續嘗試 10 次補寫（避免其他腳本清空欄位）
  (function(){
    let count = 0;
    const timer = setInterval(()=>{
      if ((bfNameInput && bfNameInput.value) && (bfPhoneInput && bfPhoneInput.value) && (bfEmailInput && bfEmailInput.value)){
        clearInterval(timer);
        return;
      }
      tryFillCached();
      count++;
      if (count >= 10) clearInterval(timer);
    }, 1000);
  })();
})();

if (typeof window.__scheduleOrderRefresh !== 'function'){
  window.__scheduleOrderRefresh = function(delay){
    try{
      var wait = delay || 1200;
      var trigger = function(){
        if (window.__orderRefreshTimer){
          clearTimeout(window.__orderRefreshTimer);
        }
        window.__orderRefreshTimer = setTimeout(function(){
          try{
            window.location.reload();
          }catch(_){}
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

(function(){
  const BANK = { bank: '中國信託 (822)', no: '148540417073' };

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
  window.showOrderSuccessPanel = function(payload, legacyLast5){
    var opts = (payload && typeof payload === 'object' && !Array.isArray(payload))
      ? payload
      : { phone: payload, last5: legacyLast5 };
    opts = opts || {};
    try{
      var dlg = document.getElementById('dlgOrderSuccess');
      if (!dlg){
        try{ window.__orderSuccessWillOpen = false; }catch(_){}
        alert('訂單已送出，請截圖保存。訂單編號：' + (opts.orderId || opts.id || ''));
        return;
      }
      try{
        window.__orderSuccessDialogOpen = true;
        window.__orderSuccessWillOpen = false;
      }catch(_){}
      var order = (opts.order && typeof opts.order === 'object') ? opts.order : {};
      var id = opts.orderId || order.id || opts.id || '';
      var digitsId = id ? String(id).replace(/\D+/g,'') : '';
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
      var note = opts.note || '請截圖保存本頁資訊，之後可在左側「查詢訂單狀態」輸入手機號碼查看處理進度。';
      var badge = opts.badge || (opts.channel === 'credit' ? '信用卡付款' : '轉帳匯款');
      var lookupDigits = opts.orderLookupDigits || digitsId.slice(-5);
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
        alert('訂單已送出，請截圖保存。訂單編號：'+ (id || ''));
      }
    }catch(err){
      console.error(err);
      try{ window.__orderSuccessDialogOpen = false; }catch(_){}
      try{
        if (typeof window.__runPendingOrderReload === 'function'){
          window.__runPendingOrderReload();
        }
      }catch(_){}
      try{ alert('訂單已送出，請截圖保存。'); }catch(_){}
    }
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
      // 先清表單，避免之後回填被 reset 掉
      const f = document.getElementById('bankForm');
      if (f) f.reset();
      // 確保在開啟前帶入會員基本資料
      (function ensureProfile(){
        const fieldsEmpty = (!bfNameInput || !bfNameInput.value) && (!bfPhoneInput || !bfPhoneInput.value) && (!bfEmailInput || !bfEmailInput.value);
        if (!fieldsEmpty) return;
        const auth = window.authState;
        if (auth && typeof auth.getProfile === 'function'){
          const p = auth.getProfile();
          if (p) applyBankProfile(p, true);
        }
        // 若仍未填入，直接打 API
        if ((!bfNameInput || !bfNameInput.value) && (!bfPhoneInput || !bfPhoneInput.value) && (!bfEmailInput || !bfEmailInput.value)){
          fetch(PROFILE_URL, { credentials:'include', cache:'no-store' })
            .then(r=>r.json().catch(()=>({})))
            .then(data=>{
              if (data && data.profile) applyBankProfile(data.profile, true);
            })
            .catch(()=>{});
          // 1 秒後再補一次，避免第一次延遲
          setTimeout(()=>{
            if ((!bfNameInput || !bfNameInput.value) && (!bfPhoneInput || !bfPhoneInput.value) && (!bfEmailInput || !bfEmailInput.value)){
          fetch(PROFILE_URL, { credentials:'include', cache:'no-store' })
            .then(r=>r.json().catch(()=>({})))
            .then(data=>{
              if (data && data.profile) applyBankProfile(data.profile, true);
            })
            .catch(()=>{});
            }
          }, 1000);
        }
      })();
      // 填入展示資訊
      const bankEl = document.getElementById('bankBankVal');
      const noEl   = document.getElementById('bankNoVal');
      if (bankEl) bankEl.textContent = BANK.bank;
      if (noEl)   noEl.textContent   = BANK.no;
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
      const pricing = __cartPricing(true);
      var amount = pricing.subtotal;
      var off = pricing.off;
      var shippingFee = pricing.shipping;
      var grand = pricing.grand;
      const amtEl = document.getElementById('bfAmount');
      if (amtEl){
        amtEl.value = grand;
        amtEl.dataset.amount = grand;
      }
      // show small line under amount to indicate coupon state
      (function(){
        var hint = document.getElementById('bfAmtHint');
        if (!hint) return;
        var baseText = '系統自動帶入金額，無需修改';
        if (shippingFee > 0){
          baseText = '含 7-11 店到店運費 NT$' + SHIPPING_FEE + '，請確認金額後再送出';
        }
        if (off > 0){
          hint.textContent = '已套用優惠折抵 NT$' + (Number(off)||0) + (shippingFee>0 ? '；' + baseText : '');
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

    }catch(e){ console.error(e); alert('開啟匯款視窗失敗'); }
  };

  document.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'bankCopyAll'){ e.preventDefault(); copyAll(); }
    if (e.target && e.target.id === 'bfCancel'){ e.preventDefault(); const d=document.getElementById('dlgBank'); if(d) d.close(); }
  });

  const form = document.getElementById('bankForm');
  if (form && !form.__bankSubmitBound){
    form.__bankSubmitBound = true;
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

      const auth = window.authState;
      const loggedIn = !!(auth && typeof auth.isLoggedIn === 'function' ? auth.isLoggedIn() : false);
      if (!loggedIn){
        if (submitBtn) {
          submitBtn.disabled = false;
        }
        if (auth && typeof auth.promptLogin === 'function'){
          auth.promptLogin('請先登入後再送出匯款資料。');
        }else{
          alert('請先登入後再送出匯款資料。');
          window.location.href = '/api/auth/google/login';
        }
        return;
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
      maybeSaveDefaultStore();
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
        alert(success ? '✅ 已送出匯款資訊，我們將盡快核對！' : '✅ 已送出，感謝！');
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
          var last5Val = (document.getElementById('bfLast5') && document.getElementById('bfLast5').value) || '';
          if (willShowDialog){
            window.showOrderSuccessPanel({
              channel:'bank',
              phone: phoneVal,
              last5: last5Val,
              orderId: (data && data.id) || '',
              order: (data && data.order) || null,
              items: data && data.order && data.order.items,
              amount: data && data.order ? data.order.amount : null,
              shipping: data && data.order ? (data.order.shippingFee || data.order.shipping) : null,
              discount: data && data.order && data.order.coupon && !data.order.coupon.failed ? (data.order.coupon.discount || data.order.coupon.amount) : null,
              store: data && data.order && data.order.buyer && data.order.buyer.store
            });
          }
          if (window.authState && typeof window.authState.refreshProfile === 'function'){
            window.authState.refreshProfile();
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

// 統一的購物車計算（實體商品/信用卡/轉帳共用）
function __cartPricing(includePendingDetail){
  function readCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){ return []; } }
  function activeCoupon(){
    try{ if (window.__coupon && typeof window.__coupon.getActiveCoupon==='function') return window.__coupon.getActiveCoupon(); }catch(e){}
    try{ const raw = localStorage.getItem('__activeCoupon__'); if (raw) return JSON.parse(raw); }catch(_){}
    return null;
  }
  function capturePendingDetail(){
    try{
      const cached = sessionStorage.getItem('__pendingDetail__');
      if (cached) return JSON.parse(cached);
    }catch(_){}
    return null;
  }
  const items = [];
  const cart = readCart();
  if (Array.isArray(cart)) items.push(...cart);
  if (includePendingDetail !== false){
    const pending = capturePendingDetail();
    if (pending) items.push(pending);
  }
  const subtotal = items.reduce((s,it)=> s + Number(it.price||0)*Math.max(1, Number(it.qty||1)), 0);
  const hasCandle = items.length && items.every(it=> /蠟燭/.test(String(it.category||'') + String(it.name||'')));
  let couponFromState = null;
  let assignmentFromState = null;
  let couponsFromState = [];
  let off = 0;
  let shipping = 0;
  let hasShipCoupon = false;
  try{
    const state = window.__cartCouponState;
    if (state){
      if (Array.isArray(state.coupons)){
        couponsFromState = state.coupons.slice();
        couponFromState = couponsFromState[0] || null;
        hasShipCoupon = couponsFromState.some(c=>{
          const d = String(c.deity||c.type||'').toUpperCase();
          return d === 'SHIP';
        });
      }
      if (state.assignment){
        off = Number(state.assignment.total || 0) || 0;
        assignmentFromState = state.assignment;
      }
      if (typeof state.shipping === 'number'){
        shipping = Number(state.shipping)||0;
      }
    }
  }catch(_){}
  const coupon = hasCandle ? null : (couponFromState || activeCoupon());
  if (!off && coupon && coupon.code){
    const want = toDeityCode(coupon.deity || coupon.code || '');
    if (want){
      const elig = items.some(it => toDeityCode(it.deity || it.name || it.productName) === want);
      if (elig) off = Number(coupon.amount || 200) || 200;
    }
  }
  if (!shipping && !hasCandle){
    const hasPhysical = items.some(it => !isCandleItemLike(it));
    if (hasShipCoupon){
      shipping = 0;
    }else if (hasPhysical){
      shipping = SHIPPING_FEE;
    }
  }
  const grand = Math.max(0, Math.round(subtotal - off + shipping));
  return {
    items,
    subtotal,
    off,
    shipping,
    grand,
    coupons: couponsFromState,
    coupon,
    assignment: assignmentFromState,
    hasShipCoupon
  };
}

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
  function matchesOrder(o, phone, last5, orderDigits){
    try{
      var pUser = normalizeTWPhone(phone);
      if (!pUser) return false;
      var ordUser = String(orderDigits||'').replace(/\D+/g,'').slice(-5);
      var l5User = String(last5||'').replace(/\D+/g,'').slice(-5);
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

      if (ordUser){
        var ordCandidates = [
          o && o.id,
          o && o.orderId,
          o && o.order_id,
          o && o.orderNo,
          o && o.order_no,
          o && o.ecpayOrderId,
          o && o.ecpayMerchantTradeNo,
          o && o.ecpay && (o.ecpay.MerchantTradeNo || o.ecpay.orderId),
          o && o.MerchantTradeNo,
          o && o.order && (o.order.id || o.order.orderId),
          o && o.meta && (o.meta.orderId || o.meta.id),
          o && o.payment && (o.payment.orderId || o.payment.order_id || o.payment.MerchantTradeNo || o.payment.merchantTradeNo)
        ].filter(Boolean);
        var ordMatch = ordCandidates.some(function(val){
          var digits = String(val||'').replace(/\D+/g,'');
          if (!digits) return false;
          return digits.slice(-5) === ordUser;
        });
        if (ordMatch) return phoneOk;
      }

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

      if (!phoneOk) return false;
      if (!wantL5) return false;
      return l5Ok;
    }catch(e){ return false; }
  }
  function filterOrdersByQuery(list, phone, last5, orderDigits){
    try{
      var arr = Array.isArray(list) ? list : [];
      return arr.filter(function(o){ return matchesOrder(o, phone, last5, orderDigits); });
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
  var lookupImageHost = (function(){
    var raw = (window.LOOKUP_IMAGE_HOST || window.ORDER_LOOKUP_IMAGE_HOST || window.PUBLIC_FILE_HOST || window.FILE_HOST || '').trim();
    if (!raw){
      if (/\.pages\.dev$/i.test(window.location.hostname)){
        raw = 'https://shop.unalomecodes.com';
      }else{
        raw = window.location.origin;
      }
    }
    if (!/^https?:\/\//i.test(raw)){
      raw = 'https://' + raw.replace(/^\/+/, '');
    }
    try{
      var u = new URL(raw);
      u.hash = '';
      u.search = '';
      return u.toString().replace(/\/+$/,'');
    }catch(e){
      return window.location.origin;
    }
  })();
  function rewriteLookupImageUrl(url){
    if (!url) return '';
    try{
      var base = new URL(lookupImageHost);
      var resolved = new URL(url, lookupImageHost);
      var host = resolved.hostname.replace(/^www\./,'');
      if (/\.pages\.dev$/i.test(host)){
        resolved.protocol = base.protocol;
        resolved.hostname = base.hostname;
        resolved.port = base.port;
      }
      return resolved.toString();
    }catch(e){
      return url;
    }
  }
  function renderLookupImage(url, alt){
    var finalUrl = rewriteLookupImageUrl(url);
    if (!finalUrl) return '<div class="ok-item-img placeholder"></div>';
    return '<div class="ok-item-img"><img src="'+ escapeHtml(finalUrl) +'" alt="'+ escapeHtml(alt || '商品圖片') +'" loading="lazy"></div>';
  }
  function firstTextValue(list){
    for (var i=0;i<list.length;i++){
      var v = list[i];
      if (v === undefined || v === null) continue;
      var s = String(v).trim();
      if (s) return s;
    }
    return '';
  }
  function gatherContactInfo(o){
    var buyer = (o && o.buyer) || {};
    var shipping = o && (o.shipping || o.receiver || o.logistics || o.cvs || o.storeInfo || {});
    var payment = o && (o.payment || o.bank || o.transfer || {});
    var customer = o && (o.customer || {});
    return {
      name: firstTextValue([buyer.name, buyer.fullName, buyer.recipient, buyer.contactName, o && o.recipient, customer.name, shipping.name, shipping.recipient, o && o.name]),
      phone: firstTextValue([buyer.phone, buyer.mobile, buyer.contact, o && o.phone, o && o.mobile, o && o.contact, shipping.phone, shipping.contactPhone, payment.phone, payment.contactPhone, customer.phone]),
      email: firstTextValue([buyer.email, customer.email, o && o.email, o && o.contactEmail]),
      store: firstTextValue([buyer.store, buyer.storeName, shipping.store, shipping.storeName, shipping.storeAddress, shipping.address, o && o.store, o && o.storeName, o && o.storeAddress, o && o.store_address]),
      note: firstTextValue([buyer.note, o && o.note, o && o.memo, o && o.remark, o && o.comment, o && o.comments, shipping.note, payment.note])
    };
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
        lines.push('<div class="ok-items-grid">'+ items.map(function(it){
          var name = it.name || it.productName || it.title || '商品';
          var spec = it.variantName || it.spec || it.deity || '';
          var qty  = it.qty || it.quantity || 1;
          var unit = numTW(it.unitPrice||it.price);
          var img = it.image || it.picture || it.cover || '';
          if (!img && o.image) img = o.image;
          var imgTag = renderLookupImage(img, name);
          return '<div class="ok-item">'+ imgTag +'<div class="ok-item-info"><div class="name">'+ escapeHtml(name) +'</div><div class="meta">'+ (spec? '規格：'+ escapeHtml(spec)+'｜':'' ) +'單價：'+ unit +'｜數量：'+ qty +'</div></div></div>';
        }).join('') + '</div>');
      }else if (o.productName){
        lines.push('<div class="ok-item">'+
          renderLookupImage(o.image, o.productName) +
          '<div class="ok-item-info"><div class="name">'+ escapeHtml(o.productName) +'</div></div></div>');
      }
      var contact = gatherContactInfo(o);
      var contactLines = [];
      if (contact.name) contactLines.push('<div>收件人：'+ escapeHtml(contact.name) +'</div>');
      if (contact.phone) contactLines.push('<div>電話：'+ escapeHtml(contact.phone) +'</div>');
      if (contact.email) contactLines.push('<div>Email：'+ escapeHtml(contact.email) +'</div>');
      if (contact.store) contactLines.push('<div>7-11 門市：'+ escapeHtml(contact.store) +'</div>');
      if (contact.note)  contactLines.push('<div>備註：'+ escapeHtml(contact.note) +'</div>');
      var contactHtml = contactLines.length
        ? '<div class="ok-contact">'+ contactLines.join('') +'</div>'
        : '';
      var div = document.createElement('div');
      div.className = 'ok-card';
      div.innerHTML = ''
        + '<div style="font-weight:800">訂單編號：'+ escapeHtml(String(id||'')) +'</div>'
        + '<div class="ok-muted">金額：'+ amt + (lines.length? '（以下為明細）' : '') +'</div>'
        + (lines.join('')||'')
        + contactHtml
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
  async function tryAllLookups(phone, last5, orderDigits){
    // Normalize inputs
    var pNorm = normalizeTWPhone(phone);
    if (!pNorm) return [];
    var l5 = String(last5||'').replace(/\D+/g,'').slice(-5);
    var ord = String(orderDigits||'').replace(/\D+/g,'').slice(-5);
    var usingOrder = !!ord;
    var usingBank = (l5.length === 5);
    if (!usingOrder && !usingBank) return [];

    var headersRO = {
      'X-Lookup': usingOrder ? 'order-last5' : 'phone+last5',
      'X-Read-Only':'1',
      'Cache-Control':'no-cache'
    };

    var all = [];

    // Helper to add unique array-like results
    function pushArr(x){
      try{
        var arr = pickArrayLike(x);
        if (Array.isArray(arr)) all = all.concat(arr);
      }catch(_){}
    }

    if (usingOrder){
      var uspOrder = new URLSearchParams();
      uspOrder.set('order', ord);
      uspOrder.set('phone', phone);
      uspOrder.set('lookupOnly','1');
      pushArr(await fetchJsonSafe('/api/orders/lookup?'+uspOrder.toString(), {headers:headersRO}));
      pushArr(await fetchJsonSafe('/api/orders?'+uspOrder.toString(), {headers:headersRO}));
    }else{
      // Compose common query variants (read-only)
      var usp1 = new URLSearchParams();
      usp1.set('phone', phone);
      usp1.set('last5', l5);
      usp1.set('lookupOnly','1');

      var usp2 = new URLSearchParams();
      usp2.set('lookup','1');
      usp2.set('phone', phone);
      usp2.set('last5', l5);

      // --- Tier 1: filtered GET endpoints (preferred, zero side effects) ---
      pushArr(await fetchJsonSafe('/api/orders/lookup?'+usp1.toString(), {headers:headersRO}));
      pushArr(await fetchJsonSafe('/api/orders?'+usp1.toString(), {headers:headersRO}));
      pushArr(await fetchJsonSafe('/api/payment/bank?'+usp2.toString(), {headers:headersRO}));
    }

    // --- Tier 2: plain reads (backend may ignore filters), capped by limit param if supported ---
    if (all.length === 0){
      pushArr(await fetchJsonSafe('/api/orders?limit=200', {headers:headersRO}));
      if (!usingOrder){
        pushArr(await fetchJsonSafe('/api/payment/bank?limit=200', {headers:headersRO}));
      }
    }

    // --- Tier 3: ultimate fallback to bare endpoints (no params) ---
    if (all.length === 0){
      pushArr(await fetchJsonSafe('/api/orders', {headers:headersRO}));
      if (!usingOrder){
        pushArr(await fetchJsonSafe('/api/payment/bank', {headers:headersRO}));
      }
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
      setTimeout(function(){
        try{
          var orderField = document.getElementById('qOrder');
          var phoneField = document.getElementById('qPhone');
          if (orderField) orderField.focus();
          else if (phoneField) phoneField.focus();
        }catch(e){}
      }, 50);
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
      var last5Raw = (document.getElementById('qLast5').value||'').trim();
      var orderRaw = (document.getElementById('qOrder').value||'').trim();
      var orderDigits = String(orderRaw).replace(/\D+/g,'').slice(-5);
      var last5 = String(last5Raw).replace(/\D+/g,'').slice(-5);
      if (!phone){
        alert('請輸入手機號碼');
        return;
      }
      var hasOrder = orderDigits.length === 5;
      var hasLast5 = last5.length === 5;
      if (!hasOrder && !hasLast5){
        alert('請輸入匯款末五碼或訂單編號末五碼');
        return;
      }
      if (hasLast5 === false && last5Raw){
        alert('匯款末五碼需為 5 位數字');
        return;
      }
      var box = document.getElementById('lookupList');
      var wrap = document.getElementById('lookupResult');
      if (box){ box.innerHTML = '<div class="ok-muted">查詢中…</div>'; }
      if (wrap){ wrap.style.display = ''; }

      try{
        var raw = await tryAllLookups(phone, last5, orderDigits);
        var list = filterOrdersByQuery(raw, phone, last5, orderDigits);
        renderOrders(list);
      }catch(err){
        console.error('lookup error', err);
        if (box){ box.innerHTML = '<div class="ok-muted">查詢失敗，請稍後再試。</div>'; }
      }
    });
  }
  // Expose a helper so other modules can open the lookup dialog with prefilled fields
  window.openOrderLookup = function(phone, last5, orderDigits, opts){
    try{
      openLookup();
      setTimeout(function(){
        try{
          var p = document.getElementById('qPhone');
          var l = document.getElementById('qLast5');
          var o = document.getElementById('qOrder');
          if (p && typeof phone === 'string' && phone) p.value = phone;
          if (l && typeof last5 === 'string' && last5) l.value = String(last5).replace(/\D+/g,'').slice(-5);
          if (o && typeof orderDigits === 'string' && orderDigits){
            o.value = String(orderDigits).replace(/\D+/g,'').slice(-5);
          }
          // focus on the next empty field
          var focusTarget = null;
          var phoneFilled = !!(p && p.value);
          var last5Filled = !!(l && l.value);
          var forcePhone = !!(opts && opts.focusPhone);
          if (forcePhone && p){
            focusTarget = p;
          }else if (p && !p.value){
            focusTarget = p;
          }else if (l && !l.value){
            focusTarget = l;
          }else if (o && !o.value){
            focusTarget = o;
          }else if (orderDigits && o){
            focusTarget = o;
          }
          if (focusTarget) focusTarget.focus();

          var wantsAuto = !!(opts && opts.autoSubmit);
          var ordVal = (o && o.value) ? String(o.value).replace(/\D+/g,'').slice(-5) : '';
          if (wantsAuto && ordVal.length === 5){
            var form = document.getElementById('lookupForm');
            setTimeout(function(){
              try{
                if (!form) return;
                if (typeof form.requestSubmit === 'function') form.requestSubmit();
                else form.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
              }catch(e){}
            }, 30);
          }
        }catch(e){}
      }, 50);
    }catch(e){}
  };

  function openLookupFromHash(){
    var hash = String(window.location.hash || '');
    var m = hash.match(/lookup=([^&]+)/i);
    if (!m) return;
    try{
      var raw = '';
      try{ raw = decodeURIComponent(m[1]); }catch(_){ raw = m[1]; }
      var digits = String(raw||'').replace(/\D+/g,'');
      if (digits){
        window.openOrderLookup('', '', digits.slice(-5), { focusPhone:true });
      }else{
        openLookup();
      }
    }finally{
      try{
        if (history && typeof history.replaceState === 'function'){
          history.replaceState(null, document.title || '', location.pathname + location.search);
        }else{
          window.location.hash = '';
        }
      }catch(_){}
    }
  }
  if (!window.__lookupHashInit){
    window.__lookupHashInit = true;
    document.addEventListener('DOMContentLoaded', openLookupFromHash);
  }
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
    const pricing = __cartPricing(true);
    return {
      cart: readCart(),
      pending: capturePendingDetail(),
      items: pricing.items,
      subtotal: pricing.subtotal,
      off: pricing.off,
      grand: pricing.grand,
      coupon: pricing.coupon,
      coupons: pricing.coupons,
      shipping: pricing.shipping,
      assignment: pricing.assignment,
      hasShipCoupon: pricing.hasShipCoupon
    };
  }

  function setCouponHint(ctx){
    const hint = document.getElementById('ccCouponHint');
    const shipHint = document.getElementById('ccShipDiscount');
    if (!hint) return;
    if (shipHint){
      if (ctx.hasShipCoupon){
        shipHint.style.display = 'block';
        shipHint.textContent = '已使用免運券，運費折抵 NT$ ' + formatPrice(SHIPPING_FEE) + '。';
      }else{
        shipHint.style.display = 'none';
        shipHint.textContent = '';
      }
    }
    if (ctx.off > 0){
      hint.style.display = 'block';
      let codeText = '優惠折扣';
      if (ctx.coupon && ctx.coupon.code){
        codeText = `優惠碼 ${ctx.coupon.code}`;
      }else if (ctx.coupons && ctx.coupons.length){
        if (ctx.coupons.length === 1 && ctx.coupons[0].code){
          codeText = `優惠碼 ${ctx.coupons[0].code}`;
        }else{
          codeText = `優惠券折抵（${ctx.coupons.length} 張）`;
        }
      }
      hint.textContent = `${codeText}，折抵 NT$ ${formatPrice(ctx.off)}。` + (ctx.shipping>0 ? `含 7-11 店到店運費 NT$ ${formatPrice(ctx.shipping)}。` : '');
    } else if (ctx.coupon && ctx.coupon.code){
      hint.style.display = 'block';
      hint.textContent = `優惠碼 ${ctx.coupon.code} 尚未符合折抵條件，請確認商品守護神是否相符。`;
    } else if (ctx.shipping > 0){
      hint.style.display = 'block';
      hint.textContent = `含 7-11 店到店運費 NT$ ${formatPrice(ctx.shipping)}。`;
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
      // 禁用蠟燭祈福等特殊品項的信用卡付款
      const hasCandle = ctx.items.some(it=>{
        const cat = (it.category || '').toString();
        const nm  = ((it.name || it.productName || '') + (it.deity || '')).toString();
        return /蠟燭/.test(cat) || /蠟燭/.test(nm);
      });
      if (hasCandle){
        alert('此類商品僅提供轉帳匯款，請改用「轉帳匯款」完成訂單。');
        if (typeof openBankDialog === 'function'){
          openBankDialog('detail');
        }
        return;
      }
      dlg.__ctx = ctx;
      // 填入商品/金額摘要
      try{
        const box = document.getElementById('ccOrderItems');
        if (box){
          box.innerHTML = '';
          if (!ctx.items.length){
            box.textContent = '目前沒有商品，請返回重新選購。';
          } else {
            const assignLines = ctx.assignment && Array.isArray(ctx.assignment.lines) ? ctx.assignment.lines : [];
            function discountForIndex(idx){
              if (assignLines.length){
                const line = assignLines.find(l => Number(l.itemIndex) === idx);
                if (line) return Number(line.amount || 0);
              }
              if ((!assignLines.length) && ctx.items.length === 1 && ctx.off > 0){
                return ctx.off;
              }
              return 0;
            }
            ctx.items.forEach((it, idx)=>{
              const name = (it.name || it.productName || '商品');
              const spec = it.variantName ? `（${it.variantName}）` : '';
              const qty  = Math.max(1, Number(it.qty||1));
              const unit = Number(it.price||0);
              const img  = it.image || '';
              const total = unit * qty;
              const discount = Math.min(total, Math.max(0, discountForIndex(idx)));
              const finalTotal = Math.max(0, total - discount);
              const row  = document.createElement('div');
              row.style.display = 'grid';
              row.style.gridTemplateColumns = '60px 1fr';
              row.style.gap = '10px';
              row.style.alignItems = 'center';
              row.style.padding = '8px';
              row.style.border = '1px solid #e5e7eb';
              row.style.borderRadius = '10px';
              row.innerHTML =
                `<div style="width:60px;height:60px;border-radius:10px;overflow:hidden;background:#fff;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;">`+
                  (img ? `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : `<div style="font-size:12px;color:#9ca3af;">無圖</div>`) +
                `</div>`+
                `<div style="font-size:13px;line-height:1.5;">`+
                  `<div style="font-weight:700;color:#111827;">${escapeHtml(name)}${spec}</div>`+
                  `<div style="color:#6b7280;">數量：${qty}</div>`+
                  (discount>0
                    ? `<div style="display:flex;gap:8px;align-items:center;margin-top:2px;">
                         <span style="text-decoration:line-through;color:#9ca3af;">NT$ ${formatPrice(total)}</span>
                         <span style="color:#dc2626;font-weight:700;">NT$ ${formatPrice(finalTotal)}</span>
                       </div>`
                    : `<div style="color:#6b7280;">合計：NT$ ${formatPrice(total)}</div>`)+
                `</div>`;
              box.appendChild(row);
            });
          }
        }
      }catch(_){}
      const amtEl = document.getElementById('ccAmount');
      if (amtEl) amtEl.textContent = 'NT$ ' + formatPrice(ctx.grand);
      const shipNote = document.getElementById('ccShippingNote');
      if (shipNote){
        if (ctx.shipping > 0){
          shipNote.style.display = 'block';
          shipNote.textContent = `此金額包含 7-11 店到店運費 NT$ ${formatPrice(ctx.shipping)}。`;
        }else{
          shipNote.style.display = 'none';
        }
      }
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
        note: (ccForm.querySelector('[name="note"]')?.value || '').trim(),
        shipping: ctx.shipping || 0
      };
      if (!payload.store){
        alert('請先在上一步選擇 7-11 門市，再進行刷卡。');
        try{ ccForm.querySelector('[name="store"]').focus(); }catch(_){}
        return;
      }
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
      const couponState = window.__cartCouponState || {};
      const multiCoupons = Array.isArray(couponState?.coupons) ? couponState.coupons : (Array.isArray(ctx.coupons) ? ctx.coupons : []);
      if (Array.isArray(multiCoupons) && multiCoupons.length){
        payload.coupons = multiCoupons
          .map(c => ({
            code: String(c.code || '').trim().toUpperCase(),
            deity: String(c.deity || '').trim().toUpperCase() || '',
            amount: Number(c.amount ?? c.off ?? c.discount ?? c.value) || undefined
          }))
          .filter(c => c.code);
      }
      if (couponState && couponState.assignment){
        payload.coupon_assignment = couponState.assignment;
        if (couponState.assignment && typeof couponState.assignment.total !== 'undefined'){
          const totalOff = Number(couponState.assignment.total || 0);
          if (totalOff > 0) payload.coupon_total = totalOff;
        }
      } else if (ctx.off > 0){
        payload.coupon_total = ctx.off;
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
        try{
          if (typeof clearCouponState === 'function') clearCouponState();
          else if (typeof window.__clearCouponState === 'function') window.__clearCouponState();
        }catch(_){}
        try{ localStorage.removeItem('cart'); }catch(_){}
        if (dlg) dlg.close();
        var proceedPayment = function(){ submitECPayForm(data.action, data.params); };
        var usedDialog = false;
        if (typeof window.showOrderSuccessPanel === 'function'){
          usedDialog = true;
          try{ window.__orderSuccessWillOpen = true; }catch(_){}
          window.showOrderSuccessPanel({
            channel:'credit',
            phone: payload.buyer.phone,
            orderId: data.orderId,
            orderLookupDigits: data.orderId,
            items: ctx.items,
            amount: ctx.grand,
            shipping: ctx.shipping,
            discount: ctx.off,
            store: payload.store,
            badge:'信用卡付款',
            desc:'感謝您的訂購，請確認以下資訊後再前往綠界刷卡頁面。',
            note:'建議先截圖保存訂單資訊，若需查詢可在左側「查詢訂單狀態」輸入手機號碼與訂單編號末五碼。',
            continueLabel:'前往刷卡',
            onContinue: proceedPayment
          });
        }
        if (!usedDialog){
          proceedPayment();
        }
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
