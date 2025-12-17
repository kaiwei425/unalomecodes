(() => {
  const listEl = document.getElementById('svcList');
  const emptyEl = document.getElementById('svcListEmpty');
  const lookupTriggers = Array.from(document.querySelectorAll('#svcLookupBtn, #svcLookupBtn2, #linkServiceLookup'));
  const lookupDialog = document.getElementById('svcLookup');
  const lookupClose = document.getElementById('svcLookupClose');
  const lookupForm = document.getElementById('svcLookupForm');
  const detailDialog = document.getElementById('svcDetail');
  const detailClose = document.getElementById('svcDetailClose');
  const detailTitle = document.getElementById('svcDetailTitle');
  const detailPrice = document.getElementById('svcDetailPrice');
  const detailDesc = document.getElementById('svcDetailDesc');
  const detailIncludes = document.getElementById('svcDetailIncludes');
  const detailGallery = document.getElementById('svcDetailGallery');
  const detailAction = document.getElementById('svcDetailAction');
  let detailDataset = null;
  const cartDialog = document.getElementById('svcCart');
  const cartForm = document.getElementById('svcCartForm');
  const cartClose = document.getElementById('svcCartClose');
  const cartNameEl = document.getElementById('svcCartServiceName');
  const cartPriceEl = document.getElementById('svcCartServicePrice');
  const cartDurationEl = document.getElementById('svcCartDuration');
  const cartServiceIdInput = document.getElementById('svcCartServiceId');
  const cartSubmitBtn = document.getElementById('svcCartSubmit');
  const successDialog = document.getElementById('svcSuccess');
  const successIdEl = document.getElementById('svcSuccessId');
  const successCloseBtn = document.getElementById('svcSuccessClose');
  const successLookupBtn = document.getElementById('svcSuccessLookup');

  function escapeHtml(str){
    return String(str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
  }

  async function fetchServices(){
    try{
      const res = await fetch('/api/service/products', { cache:'no-store' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j || !j.ok) throw new Error(j && j.error || 'error');
      return Array.isArray(j.items) ? j.items : [];
    }catch(err){
      console.error('[service] fetch error', err);
      return [];
    }
  }

  function formatTWD(num){
    try{ return 'NT$ ' + Number(num||0).toLocaleString('zh-TW'); }
    catch(_){ return 'NT$ ' + (num||0); }
  }

  function renderList(items){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
      const placeholder = document.createElement('div');
      placeholder.id = 'svcListEmpty';
      placeholder.textContent = '目前尚未上架服務，請稍後再試。';
      listEl.appendChild(placeholder);
      return;
    }
    items.forEach(service => {
      const cover = service.cover || service.image || service.banner || '';
      const card = document.createElement('div');
      card.className = 'svc-card';
      card.innerHTML = `
        <div class="svc-pic">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(service.name||'')}">` : ''}</div>
        <div class="body">
          <div style="font-size:18px;font-weight:700;">${escapeHtml(service.name||'服務')}</div>
          <div class="meta">
            <span>${escapeHtml(service.duration || '時間依照老師安排')}</span>
            <span>${formatTWD(service.price)}</span>
          </div>
          <p style="margin:0;color:#cbd5f5;line-height:1.6;">${escapeHtml(service.summary || service.description || service.desc || '')}</p>
          <button data-service="${service.id}">查看服務</button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => {
        openServiceDetail(service);
      });
      listEl.appendChild(card);
    });
  }

  function initLookupDialog(){
    if (lookupTriggers.length && lookupDialog){
      lookupTriggers.forEach(btn=>{
        if (!btn) return;
        btn.addEventListener('click', (ev)=>{
          ev.preventDefault();
          lookupDialog.showModal();
        });
      });
    }
    if (lookupClose && lookupDialog){
      lookupClose.addEventListener('click', () => lookupDialog.close());
    }
    if (lookupForm){
      lookupForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        alert('祈福進度查詢 API 尚未接線，後續會實作。');
      });
    }
  }

  function openServiceDetail(service){
    if (!detailDialog) return;
    detailDataset = service;
    if (detailTitle) detailTitle.textContent = service.name || '服務';
    if (detailPrice) detailPrice.textContent = formatTWD(service.price || 0);
    if (detailDesc) detailDesc.textContent = service.description || service.desc || '';
    if (detailIncludes){
      const list = Array.isArray(service.includes) ? service.includes : [];
      if (list.length){
        detailIncludes.innerHTML = list.map(item => `<li>${escapeHtml(item)}</li>`).join('');
      }else{
        detailIncludes.innerHTML = '<li>老師依實際情況安排內容</li>';
      }
    }
    if (detailGallery){
      const gallery = Array.isArray(service.gallery) && service.gallery.length ? service.gallery : (service.cover ? [service.cover] : []);
      detailGallery.innerHTML = gallery.length
        ? gallery.map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(service.name||'')}">`).join('')
        : '<div style="color:#94a3b8;">目前尚未提供示意圖</div>';
    }
    if (detailAction){
      detailAction.dataset.serviceId = service.id || '';
    }
    detailDialog.showModal();
  }

  if (detailClose && detailDialog){
    detailClose.addEventListener('click', () => detailDialog.close());
  }
  if (detailAction){
    detailAction.addEventListener('click', ()=>{
      if (detailDialog) detailDialog.close();
      if (detailDataset) openCart(detailDataset);
    });
  }
  if (cartClose && cartDialog){
    cartClose.addEventListener('click', ()=> cartDialog.close());
  }
  if (successCloseBtn && successDialog){
    successCloseBtn.addEventListener('click', ()=> successDialog.close());
  }
  if (successLookupBtn){
    successLookupBtn.addEventListener('click', ()=>{
      if (successDialog) successDialog.close();
      if (lookupDialog) lookupDialog.showModal();
    });
  }

  function openCart(service){
    if (!cartDialog || !cartForm) return;
    cartForm.reset();
    cartForm.dataset.serviceId = service.id || '';
    if (cartNameEl) cartNameEl.textContent = service.name || '服務';
    if (cartPriceEl) cartPriceEl.textContent = formatTWD(service.price || 0);
    if (cartDurationEl) cartDurationEl.textContent = service.duration || '時間依老師安排';
    if (cartServiceIdInput) cartServiceIdInput.value = service.id || '';
    cartDialog.showModal();
  }

  async function submitServiceOrder(payload){
    const res = await fetch('/api/service/order', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || !data.ok){
      throw new Error((data && data.error) || '提交失敗');
    }
    return data;
  }

  if (cartForm){
    cartForm.addEventListener('submit', async ev=>{
      ev.preventDefault();
      if (!cartSubmitBtn) return;
      const serviceId = cartServiceIdInput ? cartServiceIdInput.value : '';
      if (!serviceId){
        alert('缺少服務資訊，請重新選擇。');
        return;
      }
      cartSubmitBtn.disabled = true;
      cartSubmitBtn.textContent = '送出中…';
      try{
        const formData = new FormData(cartForm);
        const payload = {
          serviceId,
          name: formData.get('name')||'',
          phone: formData.get('phone')||'',
          email: formData.get('email')||'',
          line: formData.get('line')||'',
          requestDate: formData.get('requestDate')||'',
          note: formData.get('note')||'',
        };
        const result = await submitServiceOrder(payload);
        cartDialog.close();
        cartForm.reset();
        if (successIdEl) successIdEl.textContent = result.orderId || result.id || '';
        if (successDialog) successDialog.showModal();
      }catch(err){
        alert(err && err.message ? err.message : '送出失敗，請稍後再試');
      }finally{
        cartSubmitBtn.disabled = false;
        cartSubmitBtn.textContent = '送出祈福訂單';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    (async ()=>{
      try{
        const data = await fetchServices();
        renderList(data);
        initLookupDialog();
        if (emptyEl) emptyEl.remove();
      }catch(err){
        console.error('[service] init error', err);
      }
    })();
  });
})();
