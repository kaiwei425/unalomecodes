const dlg = document.getElementById('dlg');
const dlgInstagram = document.getElementById('dlgInstagram');

function storyCodeFromProduct(p){
  try{
    if (p && p.deityCode){
      const c = String(p.deityCode).trim().toUpperCase();
      if (c) return c;
    }
    const name = (p && (p.deity || p.name)) || '';
    const nameCode = toDeityCode(name);
    if (nameCode) return nameCode;
    if (p && p.id) return __kvOnlyCode(p.id);
  }catch(e){}
  return '';
}

function openDetail(p){
  // expose product id to DOM for order fallback
  try {
    var __dlg = document.getElementById('dlg');
    if (__dlg) {
      __dlg.setAttribute('data-product-id', String(p.id||''));
      __dlg.setAttribute('data-product-cat', String((p && p.category) || ''));
      __dlg.setAttribute('data-product-name', String(p.name||''));
      __dlg.setAttribute('data-product-deity', String(p.deity||''));
      // fallback: if no formal category but looks like candle, mark as 蠟燭加持祈福
      try{
        var _catNow = __dlg.getAttribute('data-product-cat')||'';
        var _looksCandle = /蠟燭/.test((p.name||'') + ' ' + (p.deity||''));
        if (!_catNow && _looksCandle){
          __dlg.setAttribute('data-product-cat','蠟燭加持祈福');
          if (p) p.category = '蠟燭加持祈福';
        }
      }catch(e){}
      try{
        var __code = storyCodeFromProduct(p);
        if (__code) __dlg.setAttribute('data-product-deitycode', __code);
      }catch(_){}
    }
  } catch(e) {}

  document.getElementById('dlgTitle').textContent = p.name;
  document.getElementById('dlgName').textContent = p.name;
  const chipEl=document.getElementById('dlgChip');
  if (chipEl){
    chipEl.textContent = `已售出：${Number(p.sold||0)}`;
    chipEl.classList.remove('badge');
    chipEl.classList.add('dlgTag','dlgTag--sold');
  }
  const stockEl = document.getElementById('dlgStock');
  const dEl=document.getElementById('dlgDeity');
  if (dEl){
    const deityName = String(p.deity || '').trim();
    if (deityName){
      dEl.textContent = deityName;
      dEl.style.display = 'inline-flex';
      dEl.classList.add('dlgTag','dlgTag--deity');
    }else{
      dEl.textContent = '';
      dEl.style.display = 'none';
    }
  }
  document.getElementById('dlgDesc').textContent = p.description || '';

  const big = document.getElementById('dlgBig');
  const thumbs = document.getElementById('dlgThumbs');
  thumbs.innerHTML = '';
  const imgs = Array.isArray(p.images)?p.images:[];
  big.loading='lazy'; big.decoding='async'; big.src = imgs[0] || '';
  imgs.forEach((u)=>{
    const t = document.createElement('img');
    t.src = u; t.alt = 'photo'; t.loading='lazy'; t.decoding='async';
    t.addEventListener('click',()=>{ big.src = u; });
    thumbs.appendChild(t);
  });
  if (dlgInstagram){
    const igUrl = (p.instagram || p.ig || p.instagramUrl || '').trim();
    if (igUrl){
      dlgInstagram.innerHTML = buildInstagramEmbed(igUrl);
      dlgInstagram.style.display = '';
    }else{
      dlgInstagram.innerHTML = '';
      dlgInstagram.style.display = 'none';
    }
  }

  // 規格
  const sel = document.getElementById('dlgVariant');
  sel.innerHTML = '';
  const variants = Array.isArray(p.variants)?p.variants:[];
  if (variants.length){
    variants.forEach((v,idx)=>{
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${v.name}（+${formatPrice(Number(v.priceDiff||0))}）`;
      sel.appendChild(opt);
    });
  } else {
    const opt = document.createElement('option');
    opt.value = -1; opt.textContent = '標準外殼（無加價）';
    sel.appendChild(opt);
  }

  // 價格
  const qty = document.getElementById('dlgQty');
  qty.value = 1;
  const priceEl = document.getElementById('dlgPrice');
  function resolveVariantStock(idx){
    const variants = Array.isArray(p.variants) ? p.variants : [];
    if (variants.length){
      let v = null;
      if (idx >= 0 && variants[idx]) v = variants[idx];
      else if (variants.length === 1) v = variants[0];
      if (v && v.stock !== undefined && v.stock !== null){
        const n = Number(v.stock);
        return Number.isFinite(n) ? n : 0;
      }
    }
    if (p.stock !== undefined && p.stock !== null){
      const n = Number(p.stock);
      return Number.isFinite(n) ? n : 0;
    }
    return null;
  }
  function updateStockDisplay(){
    const idx = Number(sel.value);
    const available = resolveVariantStock(idx);
    if (stockEl){
      if (available === null){
        stockEl.style.display = 'none';
        stockEl.classList.remove('ok','zero');
      } else {
        stockEl.style.display = 'inline-flex';
        stockEl.textContent = available > 0 ? `庫存：${available}` : '庫存：0（已售完）';
        stockEl.classList.add('dlgTag','dlgTag--stock');
        stockEl.classList.toggle('ok', available > 0);
        stockEl.classList.toggle('zero', available <= 0);
      }
    }
    if (available !== null && available > 0){
      qty.setAttribute('max', String(available));
      if (Number(qty.value || 1) > available) qty.value = available;
    } else {
      qty.removeAttribute('max');
      if (available === 0 && Number(qty.value || 1) < 1) qty.value = 1;
    }
    try{
      const btn = document.getElementById('btnAddCart');
      if (btn){
        btn.setAttribute('data-stock', available === null ? '' : String(available));
      }
    }catch(_){}
  }
  function refreshPrice(){
    const base = basePrice(p);
    const idx = Number(sel.value);
    const diff = (idx>=0 && variants[idx]) ? Number(variants[idx].priceDiff||0) : 0;
    const q = Math.max(1, Number(qty.value||1));
    priceEl.textContent = formatPrice((base + diff) * q);

    try {
      var priceNode = document.getElementById('dlgPrice');
      if (priceNode) { priceNode.setAttribute('data-price', String((base + diff) * q)); }
    } catch(e) {}
    updateStockDisplay();
  }
  sel.onchange = refreshPrice;
  qty.oninput = refreshPrice;
  refreshPrice();

  // CTA
  const btnAdd = document.getElementById('btnAddCart');
  // 直接結帳功能已移除，僅保留加入購物車

  function isCandleItem(obj){
    try{
      var cat = String(obj && obj.category || '');
      var nm  = String((obj && obj.name) || '');
      return /蠟燭/.test(cat) || /蠟燭/.test(nm);
    }catch(e){ return false; }
  }

  // 加入購物車：用 localStorage 簡易存放
  btnAdd.onclick = ()=>{
    const sel = document.getElementById('dlgVariant');
    const qtyEl = document.getElementById('dlgQty');
    const variants = Array.isArray(p.variants)?p.variants:[];
    const idx = Number(sel.value);
    const diff = (idx>=0 && variants[idx]) ? Number(variants[idx].priceDiff||0) : 0;
    const unit = basePrice(p) + diff;
    const qty = Math.max(1, Number(qtyEl.value||1));
    const available = resolveVariantStock(idx);
    if (available !== null){
      if (available <= 0){
        alert('該商品已無庫存');
        return;
      }
      if (qty > available){
        alert('該商品庫存不足');
        return;
      }
    }
    let variantName = '';
    try {
      if (idx>=0 && variants[idx] && variants[idx].name) { variantName = String(variants[idx].name); }
      else {
        const opt = sel && sel.options ? sel.options[sel.selectedIndex] : null;
        variantName = opt ? (opt.textContent||'').replace(/（\+[^）]*）/g,'').trim() : '';
      }
    } catch(e) { variantName = ''; }
    const item = {
      id: p.id,
      name: p.name,
      deity: (p.deity || toDeityCode(p.name || '')),
      deityCode: toDeityCode(p.deity || p.name || ''),
      price: unit,
      qty: qty,
      variantIndex: idx,
      variantName: variantName,
      image: (Array.isArray(p.images) && p.images[0]) || '',
      category: (function(){
        var cat = String((p && p.category) || '');
        var looks = /蠟燭/.test(((p&&p.name)||'') + ' ' + ((p&&p.deity)||''));
        if (looks) return '蠟燭加持祈福';
        return cat || '佛牌/聖物';
      })()
    };
    try{
      const cart = JSON.parse(localStorage.getItem('cart')||'[]');
      const incomingIsCandle = isCandleItem(item);
      const cartHasCandle = cart.some(isCandleItem);
      const cartHasNormal  = cart.some(it=> !isCandleItem(it));
      // 禁止混放：如果 cart 已有蠟燭就只能放蠟燭；若 cart 有一般商品就不能放蠟燭
      if (incomingIsCandle && cartHasNormal){
        alert('蠟燭祈福商品需單獨結帳，請先清空購物車或完成當前訂單。');
        return;
      }
      if (!incomingIsCandle && cartHasCandle){
        alert('購物車目前是蠟燭祈福商品，需單獨結帳，請先完成或清空後再加入其他商品。');
        return;
      }
      cart.push(item);
      localStorage.setItem('cart', JSON.stringify(cart));
      showToast('已加入購物車');
      updateCartBadge();
      openCart();
      try{ window.__coupon && window.__coupon.updateTotalsDisplay(); }catch(e){}
    }catch(e){ alert('加入購物車失敗'); }
  };

function stashPendingDetail(){
    try{
      var sel = document.getElementById('dlgVariant');
      var qtyEl = document.getElementById('dlgQty');
      var variants = Array.isArray(p.variants)?p.variants:[];
      var idx = Number(sel.value);
      var diff = (idx>=0 && variants[idx]) ? Number(variants[idx].priceDiff||0) : 0;
      var unit = basePrice(p) + diff;
      var qty = qtyEl ? Math.max(1, Number(qtyEl.value||1)) : 1;
      var variantName = '';
      try{
        if (idx>=0 && variants[idx] && variants[idx].name) { variantName = String(variants[idx].name); }
        else {
          var opt = sel && sel.options ? sel.options[sel.selectedIndex] : null;
          variantName = opt ? (opt.textContent||'').replace(/（\+[^）]*）/g,'').trim() : '';
        }
      }catch(_){}
      var looks = /蠟燭/.test(((p&&p.name)||'') + ' ' + ((p&&p.deity)||''));
      var pending = {
        id: p.id || '',
        productId: p.id || '',
        name: p.name || '',
        productName: p.name || '',
        variantName: variantName,
        qty: qty,
        price: unit,
        image: (Array.isArray(p.images) && p.images[0]) || '',
        category: looks ? '蠟燭加持祈福' : (p.category || '')
      };
      try{ sessionStorage.setItem('__pendingDetail__', JSON.stringify(pending)); }catch(_){}
    }catch(_){}
  }

  // 直接結帳已移除

  // 評價：立即用神祇代碼讀取雲端留言
  const rvCode = storyCodeFromProduct(p);
  if (typeof window.loadReviews === 'function') {
    window.loadReviews(rvCode);
  } else {
    renderReviews(rvCode);
  }

  // 綁定送出分享（暫存到 localStorage，並複製內容）
  document.getElementById('rvSubmit').onclick = () => {
    const ta = document.getElementById('rvText');
    const txt = (ta.value||'').trim();
    if (!txt) return alert('請先輸入你的分享內容～');
    (async()=>{
      try{
        const payload = { code: storyCodeFromProduct(p), nick: '訪客', msg: txt };
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({}));
        if(!res.ok || !data.ok){
          throw new Error('Stories POST failed: ' + res.status);
        }
        ta.value='';
        renderReviews(storyCodeFromProduct(p));
        alert('已送出，感謝你的分享！');
      }catch(e){
        console.error(e);
        alert('送出失敗，請稍後再試');
      }
    })();
  };

  dlg.showModal();
}

function buildInstagramEmbed(url){
  if (!url) return '';
  let src = url.trim();
  if (src.indexOf('http') !== 0){
    src = 'https://' + src.replace(/^\/+/, '');
  }
  src = src.replace(/[\?#].*$/, '');
  const match = src.match(/(https?:\/\/[^/]*instagram\.com\/(?:p|reel|tv)\/[^/?#]+)/i);
  if (match){
    src = match[1].replace(/\/$/, '') + '/embed';
  }else if (!/\/embed$/.test(src)){
    src = src.replace(/\/$/, '') + '/embed';
  }
  return `<iframe src="${escapeHtml(src)}" allowtransparency="true" allowfullscreen="true" frameborder="0"></iframe>`;
}

function renderReviews(pidOrCode){
  const box = document.getElementById('rvList');
  if (!box) return;
  const dlgEl = document.getElementById('dlg');
  const raw = pidOrCode ||
    (dlgEl && (dlgEl.getAttribute('data-product-deitycode') || dlgEl.getAttribute('data-product-deity') || dlgEl.getAttribute('data-deity') || dlgEl.getAttribute('data-product-name'))) ||
    '';
  const code = toDeityCode(raw) || __kvOnlyCode(raw);
  if (!code){
    box.innerHTML = '<div class="rvItem" style="opacity:.85">暫時無法取得留言代碼</div>';
    return;
  }
  if (typeof window.loadReviews === 'function') {
    return window.loadReviews(code);
  }
  box.innerHTML = '<div class="rvItem" style="opacity:.7">讀取中…</div>';
  (async()=>{
    try{
      const r = await fetch(`/api/stories?code=${encodeURIComponent(code)}`, { cache:'no-store' });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json().catch(()=>[]);
      const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      if(!arr.length){
        box.innerHTML = '<div class="rvItem" style="opacity:.85">尚無真實故事，成為第一位分享者吧！</div>';
        return;
      }
      box.innerHTML = '';
      arr.sort((a,b)=>(b.ts||0)-(a.ts||0));
      arr.forEach(it=>{
        const d = new Date(it.ts || Date.now());
        const ts = d.toLocaleString('zh-TW', {
          year:'numeric', month:'2-digit', day:'2-digit',
          hour:'2-digit', minute:'2-digit', second:'2-digit',
          hour12:false
        });
        const div = document.createElement('div');
        div.className = 'rvItem';
        div.innerHTML = `<div class="rvHead">${ts}</div><div>${escapeHtml(it.msg || it.text || '')}</div>`;
        box.appendChild(div);
      });
    }catch(e){
      console.error('KV read error', e);
      box.innerHTML = '<div class="rvItem" style="opacity:.85">讀取失敗，稍後再試</div>';
    }
  })();
}

// GLOBAL_OPEN_DETAIL_DELEGATION
document.addEventListener('click', (e)=>{
  const btn = e.target.closest && e.target.closest('button[data-open-detail="1"]');
  if (!btn) return;
  // find the card element to extract its data-id
  const card = btn.closest && btn.closest('.card');
  if (!card) return;
  const pid = card.getAttribute('data-id');
  try{
    // find product from in-memory lists
    const all = (window.viewItems && Array.isArray(window.viewItems) ? window.viewItems : (window.rawItems||[]));
    const p = all.find(x => String(x.id) === String(pid));
    if (p) { openDetail(p); }
  }catch(err){ console.error('openDetail delegation failed', err); }
}, true);
