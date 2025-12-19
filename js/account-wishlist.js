(function(){
  const statusEl = document.getElementById('accountStatus');
  const wrapEl = document.getElementById('accountWrap');
  const listEl = document.getElementById('wishlistList');
  const backBtn = document.getElementById('backBtn');

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  async function loadWishlist(){
    if (!statusEl) return;
    statusEl.textContent = '載入收藏中…';
    try{
      const res = await fetch('/api/me/wishlist', { credentials:'include' });
      if (res.status === 401){
        statusEl.textContent = '請先登入以查看收藏。';
        return;
      }
      if (!res.ok){
        statusEl.textContent = '讀取收藏失敗，請稍後再試。';
        return;
      }
      const data = await res.json().catch(()=>({}));
      if (data.ok === false){
        statusEl.textContent = data.error || '讀取收藏失敗';
        return;
      }
      statusEl.textContent = '以下為您的收藏。';
      if (wrapEl) wrapEl.style.display = 'grid';
      renderList(Array.isArray(data.items) ? data.items : []);
    }catch(_){
      statusEl.textContent = '讀取收藏失敗，請稍後再試。';
    }
  }

  function renderList(items){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
      listEl.innerHTML = '<div class="empty-msg">目前沒有收藏的商品。</div>';
      return;
    }
    items.forEach(item=>{
      const div = document.createElement('div');
      div.className = 'item';
      const img = (item.images && item.images[0]) ? `<img src="${escapeHtml(item.images[0])}" alt="">` : '';
      div.innerHTML = `
        ${img}
        <div class="meta">
          <div class="name">${escapeHtml(item.name || '')}</div>
          <div class="price">NT$ ${Number(item.price || item.basePrice || 0).toLocaleString('zh-TW')}</div>
          <div class="price">神祇：${escapeHtml(item.deity || '—')}</div>
        </div>
        <div class="actions">
          <a class="btn primary" href="/shop.html#id=${encodeURIComponent(item.id||'')}" target="_blank" rel="noopener">查看商品</a>
          <button class="btn" data-remove="${escapeHtml(item.id||'')}">移除</button>
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
      else window.location.href = '/shop.html';
    });
  }

  function ensureLogin(){
    if (!window.authState){
      statusEl.textContent = '需要登入模組載入失敗。';
      return;
    }
    if (window.authState.isLoggedIn && window.authState.isLoggedIn()){
      loadWishlist();
    }else{
      statusEl.textContent = '請先登入以查看收藏。';
    }
  }

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadWishlist();
      }else{
        if (wrapEl) wrapEl.style.display = 'none';
        if (statusEl) statusEl.textContent = '請先登入以查看收藏。';
      }
    });
  }

  bindActions();
  initBack();
  ensureLogin();
})();
