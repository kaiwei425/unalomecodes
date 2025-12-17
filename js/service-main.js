(() => {
  const listEl = document.getElementById('svcList');
  const emptyEl = document.getElementById('svcListEmpty');
  const lookupTriggers = Array.from(document.querySelectorAll('#svcLookupBtn, #linkServiceLookup'));
  const lookupDialog = document.getElementById('svcLookup');
  const lookupClose = document.getElementById('svcLookupClose');
  const lookupForm = document.getElementById('svcLookupForm');
  const lookupResultWrap = document.getElementById('svcLookupResult');
  const lookupCards = document.getElementById('svcLookupCards');
  const detailDialog = document.getElementById('svcDetail');
  const detailClose = document.getElementById('svcDetailClose');
  const detailTitle = document.getElementById('svcDetailTitle');
  const detailPrice = document.getElementById('svcDetailPrice');
  const detailDesc = document.getElementById('svcDetailDesc');
  const detailIncludes = document.getElementById('svcDetailIncludes');
  const detailGallery = document.getElementById('svcDetailGallery');
  const detailAction = document.getElementById('svcDetailAction');
  const detailOptionsWrap = document.getElementById('svcDetailOptionsWrap');
  const detailOptions = document.getElementById('svcDetailOptions');
  const detailHero = document.getElementById('svcDetailHero');
  let detailDataset = null;
  const cartDialog = document.getElementById('svcCart');
  const cartForm = document.getElementById('svcCartForm');
  const cartNameEl = document.getElementById('svcCartServiceName');
  const cartPriceEl = document.getElementById('svcCartServicePrice');
  const cartServiceIdInput = document.getElementById('svcCartServiceId');
  const cartSubmitBtn = document.getElementById('svcCartSubmit');
  const cartBackBtn = document.getElementById('svcCartBack');
  const cartSelectionsEl = document.getElementById('svcCartSelections');
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
      placeholder.className = 'empty';
      placeholder.textContent = '目前尚未上架服務，請稍後再試。';
      listEl.appendChild(placeholder);
      return;
    }
    items.forEach(service => {
      const cover = service.cover || service.image || service.banner || '';
      const card = document.createElement('div');
      card.className = 'card service-card';
      card.innerHTML = `
        <div class="pic">${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(service.name||'')}" loading="lazy">` : ''}</div>
        <div class="body">
          <div class="name">${escapeHtml(service.name||'服務')}</div>
          <div class="price">${formatTWD(service.price)}</div>
          <div class="cta">
            <button class="btn primary" data-service="${escapeHtml(service.id||'')}">查看服務</button>
          </div>
        </div>
      `;
      const btn = card.querySelector('button[data-service]');
      if (btn){
        btn.addEventListener('click', () => openServiceDetail(service));
      }
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
      lookupForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const formData = new FormData(lookupForm);
        const phone = String(formData.get('phone')||'').trim();
        const orderDigits = String(formData.get('orderDigits')||formData.get('order')||'').trim();
        if (!phone || !orderDigits){
          alert('請輸入手機與訂單末五碼');
          return;
        }
        try{
          const usp = new URLSearchParams({ phone, order: orderDigits });
          const res = await fetch('/api/service/orders/lookup?'+usp.toString(), { cache:'no-store' });
          const data = await res.json().catch(()=>({}));
          if (!res.ok || !data || !data.ok){
            throw new Error((data && data.error) || '查詢失敗');
          }
          renderLookupResult(Array.isArray(data.orders) ? data.orders : []);
        }catch(err){
          alert(err && err.message ? err.message : '查詢失敗，請稍後再試');
        }
      });
    }
  }

  function renderLookupResult(list){
    if (!lookupResultWrap || !lookupCards){
      return;
    }
    lookupCards.innerHTML = '';
    if (!list.length){
      lookupCards.innerHTML = '<div style="color:#94a3b8;">查無資料，請確認輸入是否正確。</div>';
    }else{
      list.forEach(order=>{
        const selectionNames = Array.isArray(order.selectedOptions) && order.selectedOptions.length
          ? order.selectedOptions.map(opt => opt && opt.name ? opt.name : '').filter(Boolean)
          : (order.selectedOption && order.selectedOption.name ? [order.selectedOption.name] : []);
        const serviceLine = selectionNames.length
          ? `${escapeHtml(order.serviceName || '')}｜${escapeHtml(selectionNames.join('、'))}`
          : escapeHtml(order.serviceName || '');
        const card = document.createElement('div');
        card.className = 'lookup-card';
        card.innerHTML = `
          <div style="font-weight:700;">訂單編號：${escapeHtml(order.id || '')}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">狀態：${escapeHtml(order.status || '處理中')}</div>
          <div style="margin-top:8px;font-weight:600;">服務：${serviceLine}</div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">願望／備註：${escapeHtml(order.note || '—')}</div>
        `;
        lookupCards.appendChild(card);
      });
    }
    lookupResultWrap.style.display = '';
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
    const gallery = Array.isArray(service.gallery) && service.gallery.length ? service.gallery : (service.cover ? [service.cover] : []);
    if (detailHero){
      detailHero.src = gallery[0] || service.cover || '';
      detailHero.alt = service.name || '';
    }
    if (detailGallery){
      if (gallery.length){
        detailGallery.innerHTML = gallery.map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(service.name||'')}" loading="lazy">`).join('');
        Array.from(detailGallery.querySelectorAll('img')).forEach(img=>{
          img.addEventListener('click', ()=>{
            if (detailHero){
              detailHero.src = img.getAttribute('src') || '';
            }
          });
        });
      }else{
        detailGallery.innerHTML = '<div class="muted">目前尚未提供示意圖</div>';
      }
    }
    if (detailOptions){
      const options = Array.isArray(service.options) ? service.options.filter(opt=> opt && opt.name) : [];
      if (options.length){
        detailOptionsWrap.style.display = '';
        detailOptions.innerHTML = options.map((opt, idx)=>`
          <label>
            <input type="checkbox" name="svcOptCheck" value="${escapeHtml(opt.name)}" data-price="${Number(opt.price||0)}" ${idx===0 ? 'checked':''}>
            <span>
              <span style="font-weight:600;">${escapeHtml(opt.name)}</span>
              ${opt.price ? `<span style="color:#6b7280;font-size:12px;margin-left:4px;">+${formatTWD(opt.price)}</span>` : ''}
            </span>
          </label>
        `).join('');
      }else{
        detailOptionsWrap.style.display = 'none';
        detailOptions.innerHTML = '';
      }
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
      if (detailDataset){
        let selectedList = [];
        if (detailOptions){
          selectedList = Array.from(detailOptions.querySelectorAll('input[name="svcOptCheck"]:checked')).map(inp=>({
            name: inp.value,
            price: Number(inp.getAttribute('data-price')||0)
          }));
          const hasOptions = Array.isArray(detailDataset.options) && detailDataset.options.length;
          if (hasOptions && !selectedList.length){
            alert('請至少選擇一個服務項目');
            return;
          }
        }else{
          selectedList = [];
        }
        detailDataset.__selectedOptions = selectedList;
        openCart(detailDataset);
      }
    });
  }
  if (cartBackBtn && cartDialog){
    cartBackBtn.addEventListener('click', ()=> cartDialog.close());
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
    cartForm.dataset.basePrice = Number(service.price || 0);
    const selected = Array.isArray(service.__selectedOptions) ? service.__selectedOptions : [];
    cartForm.dataset.selectedOptions = JSON.stringify(selected);
    if (cartNameEl) cartNameEl.textContent = service.name || '服務';
    renderCartSelections(selected);
    if (cartPriceEl) cartPriceEl.textContent = formatTWD(computeCartAmount());
    if (cartServiceIdInput) cartServiceIdInput.value = service.id || '';
    delete service.__selectedOptions;
    cartDialog.showModal();
  }

  function getSelectedOptions(){
    if (!cartForm) return [];
    try{
      const raw = cartForm.dataset.selectedOptions || '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(_){
      return [];
    }
  }

  function renderCartSelections(list){
    if (!cartSelectionsEl) return;
    if (!list.length){
      cartSelectionsEl.innerHTML = '<li>標準服務</li>';
      return;
    }
    cartSelectionsEl.innerHTML = list.map(opt => `<li>${escapeHtml(opt.name)}${opt.price ? `（+${formatTWD(opt.price)}）` : ''}</li>`).join('');
  }

  function computeCartAmount(){
    if (!cartForm) return 0;
    const base = Number(cartForm.dataset.basePrice || 0);
    const opts = getSelectedOptions();
    const optPrice = opts.reduce((sum,opt)=> sum + Number(opt.price||0), 0);
    return base + optPrice;
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
          requestDate: formData.get('requestDate')||'',
          note: formData.get('note')||'',
          optionNames: getSelectedOptions().map(opt => opt.name)
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
