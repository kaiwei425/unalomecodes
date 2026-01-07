/* ==== order-lookup script ==== */
(function(){
  // ---------- helpers ----------
  function normalizeDisplayStatus(s){
    var t = String(s || '').trim();
    if (!t || t === 'pending' || t === '待付款' || t === 'waiting_verify' || t.indexOf('待處理') !== -1 || t.indexOf('待確認') !== -1){
      return '訂單待處理';
    }
    if (t.indexOf('已付款待出貨') !== -1 || t === '待出貨') return '待出貨';
    if (t.indexOf('已寄件') !== -1 || t.indexOf('已寄出') !== -1 || t.indexOf('已出貨') !== -1 || t.indexOf('寄出') !== -1) return '已寄件';
    if (t.indexOf('已取件') !== -1 || t.indexOf('已完成訂單') !== -1 || t.indexOf('完成訂單') !== -1 || t.indexOf('訂單完成') !== -1){
      return '已取件（訂單完成）';
    }
    if (t.indexOf('付款逾期') !== -1 || t.indexOf('付款失敗') !== -1 || t.indexOf('金額不符') !== -1) return '付款逾期';
    if (t.indexOf('取消') !== -1 || t.indexOf('退款') !== -1 || t.indexOf('作廢') !== -1) return '取消訂單';
    return t;
  }
  function statusBadge(s){
    var t = normalizeDisplayStatus(s);
    var cls = 'ok-badge';
    if (t.indexOf('已取件') !== -1 || t.indexOf('訂單完成') !== -1) cls += ' ok-done';
    else if (t.indexOf('待出貨') !== -1) cls += ' ok-paid';
    else if (t.indexOf('已寄件') !== -1) cls += ' ok-ship';
    else if (t.indexOf('取消') !== -1 || t.indexOf('逾期') !== -1) cls += ' ok-muted';
    return '<span class="'+cls+'">'+ (t||'訂單待處理') +'</span>';
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>\"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m] || m; }); }
  function numTW(v){ try{ return 'NT$ ' + Number(String(v||0).toString().replace(/[^\d.]/g,'')).toLocaleString('zh-TW'); }catch(e){ return String(v||''); } }
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
  function normalizeOrderSuffix(s){
    return String(s||'').replace(/[^0-9a-z]/ig,'').toUpperCase().slice(-5);
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
      if (o && o.publicView) return true;
      var pUser = normalizeTWPhone(phone);
      if (!pUser) return false;
      var ordUser = normalizeOrderSuffix(orderDigits);
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
          var suffix = normalizeOrderSuffix(val);
          if (!suffix) return false;
          return suffix === ordUser;
        });
        if (ordMatch) return true;
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
    var ord = normalizeOrderSuffix(orderDigits);
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

      // --- Tier 1: filtered GET endpoints (preferred, zero side effects) ---
      pushArr(await fetchJsonSafe('/api/orders/lookup?'+usp1.toString(), {headers:headersRO}));
      pushArr(await fetchJsonSafe('/api/orders?'+usp1.toString(), {headers:headersRO}));
    }

    // No unfiltered fallbacks: avoid leaking other customers' orders

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
      var orderDigits = normalizeOrderSuffix(orderRaw);
      var last5 = String(last5Raw).replace(/\D+/g,'').slice(-5);
      if (!phone){
        alert('請輸入手機號碼');
        return;
      }
      var hasOrder = orderDigits.length === 5;
      var hasLast5 = last5.length === 5;
      if (!hasOrder && !hasLast5){
        alert('請輸入匯款末五碼或訂單編號末五碼（英數）');
        return;
      }
      if (hasLast5 === false && last5Raw){
        alert('匯款末五碼需為 5 位數字');
        return;
      }
      if (!hasOrder && orderRaw){
        alert('訂單編號末五碼需為 5 位英數');
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
            o.value = normalizeOrderSuffix(orderDigits);
          }
          // focus on the next empty field，沒有空白時若有訂單末碼則聚焦於它
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
          var ordVal = (o && o.value) ? normalizeOrderSuffix(o.value) : '';
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
      var suffix = normalizeOrderSuffix(raw);
      if (suffix){
        window.openOrderLookup('', '', suffix, { focusPhone:true });
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
