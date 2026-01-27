(function(){
  const subEl = document.getElementById('pageSubtitle');
  const btn = document.getElementById('btnEditSubtitle');
  const esimBtn = document.getElementById('btnEditEsim');
  if (!subEl || !btn) return;

  const esimDialog = document.getElementById('esimDialog');
  const esimName = document.getElementById('esimName');
  const esimPriceText = document.getElementById('esimPriceText');
  const esimBadges = document.getElementById('esimBadges');
  const esimUrl = document.getElementById('esimUrl');
  const esimUploadBtn = document.getElementById('esimUploadBtn');
  const esimImageFile = document.getElementById('esimImageFile');
  const esimImageUrl = document.getElementById('esimImageUrl');
  const esimPreview = document.getElementById('esimImagePreview');
  const esimStatus = document.getElementById('esimStatus');
  const esimClose = document.getElementById('esimClose');
  const esimSave = document.getElementById('esimSave');

  function setEsimStatus(msg, ok){
    if (!esimStatus) return;
    esimStatus.style.color = ok ? '#16a34a' : '#ef4444';
    esimStatus.textContent = msg || '';
  }
  function openDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open','');
  }
  function closeDialog(dlg){
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }
  function applyAdminState(isAdmin){
    if (typeof window.authState !== 'undefined' && typeof window.authState.hasAdminPermission === 'function'){
      isAdmin = isAdmin && window.authState.hasAdminPermission('shop_meta_edit');
    }
    btn.style.display = isAdmin ? 'inline-block' : 'none';
    if (esimBtn) esimBtn.style.display = isAdmin ? 'inline-block' : 'none';
  }
  if (window.authState && typeof window.authState.onAdmin === 'function'){
    window.authState.onAdmin(applyAdminState);
  } else {
    applyAdminState(false);
  }

  async function readMeta(){
    try{
      const res = await fetch('/api/shop/meta', { credentials: 'include', cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      return (data && data.ok && data.meta) ? (data.meta || {}) : {};
    }catch(_){
      return {};
    }
  }

  async function saveMeta(patch){
    const res = await fetch('/api/shop/meta', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(patch || {})
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok){
      throw new Error(data.error || ('HTTP '+res.status));
    }
    return data.meta || {};
  }

  btn.addEventListener('click', async () => {
    const oldVal = subEl.textContent;
    const newVal = prompt('編輯副標題', oldVal);
    if (!newVal || newVal === oldVal) return;
    try{
      await saveMeta({ subtitle: newVal });
      subEl.textContent = newVal;
    }catch(err){
      alert('儲存失敗：' + err.message);
    }
  });

  if (esimBtn){
    esimBtn.addEventListener('click', async () => {
      try{
        const meta = await readMeta();
        const esim = (meta && meta.esim && typeof meta.esim === 'object') ? meta.esim : {};
        if (esimName) esimName.value = String(esim.name || '泰國 eSIM 上網卡');
        if (esimPriceText) esimPriceText.value = String(esim.priceText || '依方案計價');
        if (esimBadges) esimBadges.value = String(esim.badges || esim.badge || esim.badgeText || '合作商品');
        if (esimUrl) esimUrl.value = String(esim.url || '');
        if (esimImageUrl) esimImageUrl.value = String(esim.imageUrl || '');
        if (esimPreview){
          const u = String(esim.imageUrl || '').trim();
          if (u){
            esimPreview.src = u;
            esimPreview.style.display = '';
          }else{
            esimPreview.removeAttribute('src');
            esimPreview.style.display = 'none';
          }
        }
        setEsimStatus('', false);
        openDialog(esimDialog);
      }catch(err){
        alert('讀取失敗：' + err.message);
      }
    });
  }

  if (esimClose){
    esimClose.addEventListener('click', ()=> closeDialog(esimDialog));
  }

  if (esimUploadBtn && esimImageFile){
    esimUploadBtn.addEventListener('click', ()=>{
      setEsimStatus('', false);
      esimImageFile.click();
    });
    esimImageFile.addEventListener('change', async ()=>{
      try{
        const file = esimImageFile.files && esimImageFile.files[0];
        if (!file) return;
        setEsimStatus('上傳中…', false);
        const fd = new FormData();
        fd.append('files[]', file, file.name || 'esim.png');
        const res = await fetch('/api/upload', { method:'POST', body: fd, credentials:'include' });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok || !data.files || !data.files[0] || !data.files[0].url){
          throw new Error((data && data.error) || ('HTTP ' + res.status));
        }
        const url = String(data.files[0].url || '').trim();
        if (esimImageUrl) esimImageUrl.value = url;
        if (esimPreview){
          esimPreview.src = url;
          esimPreview.style.display = '';
        }
        setEsimStatus('上傳成功', true);
      }catch(err){
        setEsimStatus('上傳失敗：' + (err.message || err), false);
      }finally{
        try{ esimImageFile.value = ''; }catch(_){}
      }
    });
  }

  if (esimSave){
    esimSave.addEventListener('click', async ()=>{
      try{
        setEsimStatus('儲存中…', false);
        await saveMeta({
          esim: {
            name: String(esimName && esimName.value || '').trim(),
            priceText: String(esimPriceText && esimPriceText.value || '').trim(),
            badges: String(esimBadges && esimBadges.value || '').trim(),
            imageUrl: String(esimImageUrl && esimImageUrl.value || '').trim(),
            url: String(esimUrl && esimUrl.value || '').trim()
          }
        });
        setEsimStatus('已儲存，重新整理中…', true);
        window.location.reload();
      }catch(err){
        setEsimStatus('儲存失敗：' + (err.message || err), false);
      }
    });
  }
  fetch('/api/shop/meta', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      if (data && data.ok && data.meta && data.meta.subtitle){
        subEl.textContent = data.meta.subtitle;
      }
    })
    .catch(()=>{});
})();
