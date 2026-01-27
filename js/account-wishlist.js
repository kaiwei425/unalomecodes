(function(){
  const statusEl = document.getElementById('accountStatus');
  const wrapEl = document.getElementById('accountWrap');
  const listEl = document.getElementById('wishlistList');
  const backBtn = document.getElementById('backBtn');
  const t = (window.UC_I18N && typeof window.UC_I18N.t === 'function')
    ? window.UC_I18N.t
    : function(k){ return k; };

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function sanitizeImageUrl(raw){
    try{
      const val = String(raw || '').trim();
      if (!val) return '';
      if (/^data:image\//i.test(val)) return val;
      const u = new URL(val, window.location.origin);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
    }catch(_){}
    return '';
  }

  async function loadWishlist(){
    if (!statusEl) return;
    statusEl.textContent = t('account_wishlist.loading');
    try{
      const res = await fetch('/api/me/wishlist', { credentials:'include' });
      if (res.status === 401){
        statusEl.textContent = t('account_wishlist.need_login');
        return;
      }
      if (!res.ok){
        statusEl.textContent = t('account_wishlist.load_failed');
        return;
      }
      const data = await res.json().catch(()=>({}));
      if (data.ok === false){
        statusEl.textContent = data.error || t('account_wishlist.load_failed');
        return;
      }
      statusEl.textContent = t('account_wishlist.intro');
      if (wrapEl) wrapEl.style.display = 'grid';
      renderList(Array.isArray(data.items) ? data.items : []);
    }catch(_){
      statusEl.textContent = t('account_wishlist.load_failed');
    }
  }

  function renderList(items){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
      listEl.innerHTML = '<div class="empty-msg">' + escapeHtml(t('account_wishlist.empty')) + '</div>';
      return;
    }
    items.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'item';
      const imgUrl = item.images && item.images[0] ? sanitizeImageUrl(item.images[0]) : '';
      const img = imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="">` : '';
      const link = `/shop#id=${encodeURIComponent(item.id||'')}`;
      div.innerHTML = `
        ${img}
        <div class="meta">
          <a class="name" href="${link}" target="_blank" rel="noopener" style="color:#0f172a;text-decoration:none;">${escapeHtml(item.name || '')}</a>
          <div class="price">NT$ ${Number(item.price || item.basePrice || 0).toLocaleString('zh-TW')}</div>
          <div class="price">${escapeHtml(t('account_wishlist.deity'))}：${escapeHtml(item.deity || '—')}</div>
        </div>
        <div class="actions">
          <a class="btn primary" href="${link}" target="_blank" rel="noopener">${escapeHtml(t('account_wishlist.view'))}</a>
          <button class="btn" data-remove="${escapeHtml(item.id||'')}">${escapeHtml(t('account_wishlist.remove'))}</button>
        </div>
      `;
      listEl.appendChild(div);
    });
  }

  function bindActions(){
    if (!listEl) return;
    listEl.addEventListener('click', ev=>{
      const btn = ev.target.closest('button[data-remove]');
      if (!btn) return;
      const pid = btn.getAttribute('data-remove');
      fetch('/api/me/wishlist', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({ productId: pid, action:'remove' })
      }).then(()=> loadWishlist()).catch(()=>{});
    });
  }

  function initBack(){
    if (!backBtn) return;
    backBtn.addEventListener('click', ()=>{
      if (window.history.length > 1) history.back();
      else window.location.href = '/shop';
    });
  }

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = t('account.login_module_missing');
      return;
    }
    if (window.authState.isLoggedIn && window.authState.isLoggedIn()){
      loadWishlist();
    }else{
      statusEl.textContent = t('account_wishlist.need_login');
    }
  }

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadWishlist();
      }else{
        if (wrapEl) wrapEl.style.display = 'none';
        if (statusEl) statusEl.textContent = t('account_wishlist.need_login');
      }
    });
  }

  bindActions();
  initBack();
  ensureLogin();
})();
