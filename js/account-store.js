(function(){
  const statusEl = document.getElementById('storeStatus');
  const nameEl = document.getElementById('storeName');
  const idEl = document.getElementById('storeId');
  const addrEl = document.getElementById('storeAddress');
  const telEl = document.getElementById('storeTel');
  const saveBtn = document.getElementById('saveStore');
  const backBtn = document.getElementById('backBtn');
  const openBtn = document.getElementById('openCvsMap');

  function fill(store){
    if (!store) return;
    if (nameEl) nameEl.value = store.name || '';
    if (idEl) idEl.value = store.id || '';
    if (addrEl) addrEl.value = store.address || '';
    if (telEl) telEl.value = store.tel || '';
  }

  async function loadStore(){
    if (!statusEl) return;
    statusEl.textContent = '載入中…';
    try{
      const res = await fetch('/api/me/store', { credentials:'include' });
      if (res.status === 401){
        statusEl.textContent = '請先登入以設定門市。';
        return;
      }
      const data = await res.json().catch(()=>({}));
      if (data.ok === false){
        statusEl.textContent = data.error || '讀取門市失敗';
        return;
      }
      fill(data.store || {});
      statusEl.textContent = '已載入，儲存後將套用於結帳的門市步驟。';
    }catch(_){
      statusEl.textContent = '讀取門市失敗';
    }
  }

  async function saveStore(){
    if (!statusEl) return;
    const payload = {
      name: (nameEl && nameEl.value) || '',
      id: (idEl && idEl.value) || '',
      address: (addrEl && addrEl.value) || '',
      tel: (telEl && telEl.value) || ''
    };
    statusEl.textContent = '儲存中…';
    saveBtn && (saveBtn.disabled = true);
    try{
      const res = await fetch('/api/me/store', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || data.ok === false){
        statusEl.textContent = (data && data.error) ? ('儲存失敗：' + data.error) : '儲存失敗';
      }else{
        statusEl.textContent = '已儲存，之後結帳會自動帶入。';
      }
    }catch(_){
      statusEl.textContent = '儲存失敗';
    }finally{
      saveBtn && (saveBtn.disabled = false);
    }
  }

  function initBack(){
    if (!backBtn) return;
    backBtn.addEventListener('click', ()=>{
      if (window.history.length > 1) history.back();
      else window.location.href = '/shop';
    });
  }

  if (saveBtn){
    saveBtn.addEventListener('click', saveStore);
  }

  if (openBtn){
    openBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      try{
        const base = "https://emap.presco.com.tw/c2cemap.ashx";
        const params = new URLSearchParams();
        params.set("eshopid", "870");
        params.set("servicetype", "1");
        const callbackUrl = new URL("/cvs_callback", location.origin);
        params.set("url", callbackUrl.toString());
        const href = base + "?" + params.toString();
        window.open(href, 'cvs_popup', 'width=980,height=720,resizable=yes,scrollbars=yes');
      }catch(_){}
    });
  }

  window.addEventListener('message', function(ev){
    try{
      const d = ev.data || {};
      if (!d.__cvs_store__) return;
      const store = {
        id: d.storeid || '',
        name: d.storename || '',
        address: d.storeaddress || '',
        tel: d.storetel || ''
      };
      fill(store);
      statusEl && (statusEl.textContent = '已選擇門市，按下儲存即可套用。');
    }catch(_){}
  });

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        loadStore();
      }else{
        statusEl.textContent = '請先登入以設定門市。';
      }
    });
  }

  initBack();
})();
