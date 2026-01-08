(function(){
 const API_BASE = window.__SHOP_ORIGIN || 'https://unalomecodes.com';
  async function authedFetch(url, init){
    const opts = Object.assign({}, init||{}, { credentials:'include' });
    const target = /^https?:/i.test(url) ? url : API_BASE + url;
    const res = await fetch(target, opts);
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    return data;
  }

  const listBody = document.getElementById('svcListBody');
  const filterInput = document.getElementById('filter');
  const formMsg = document.getElementById('formMsg');
  const btnSave = document.getElementById('btnSave');
  const btnReset = document.getElementById('btnReset');
  const btnDelete = document.getElementById('btnDelete');
  const btnReload = document.getElementById('btnReload');
  const imagesInput = document.getElementById('svc_images');
  const soldInput = document.getElementById('svc_sold');
  const activeInput = document.getElementById('svc_active');
  const qtyEnabledInput = document.getElementById('svc_qty_enabled');
  const qtyLabelInput = document.getElementById('svc_qty_label');
  const fixedFeeInput = document.getElementById('svc_fixed_fee');
  const photoRequiredInput = document.getElementById('svc_photo_required');
  const imagePreview = document.getElementById('svcImagePreview');
  const optionsWrap = document.getElementById('svc_options');
  let items = [];
  let currentId = '';

  function resolveServiceId(item){
    if (!item) return '';
    return item.id || item._id || item.key || item._key || '';
  }
  function ensureItemIds(list){
    const stamp = Date.now();
    list.forEach((item, idx)=>{
      if (!item) return;
      const resolved = resolveServiceId(item);
      item.__virtualId = resolved || `svc-temp-${stamp}-${idx}`;
    });
  }
  function getRowId(item){
    return resolveServiceId(item) || item.__virtualId || '';
  }
  function fallbackCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(_){}
    document.body.removeChild(ta);
  }
  async function copyText(text){
    if (!text) return;
    try{
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }else{
        fallbackCopy(text);
      }
      alert('已複製 ID');
    }catch(_){
      fallbackCopy(text);
      alert('已複製 ID');
    }
  }
  function findItemByRowId(rowId){
    if (!rowId) return null;
    return items.find(it => getRowId(it) === rowId) || null;
  }
  function toIsoFromLocal(val){
    const raw = String(val || '').trim();
    if (!raw) return '';
    const parts = raw.split('T');
    if (parts.length !== 2) return '';
    const [datePart, timePart] = parts;
    const dateBits = datePart.split('-').map(Number);
    const timeBits = timePart.split(':').map(Number);
    if (dateBits.length < 3 || timeBits.length < 2) return '';
    const [y, m, d] = dateBits;
    const [hh, mm] = timeBits;
    if (![y, m, d, hh, mm].every(n => Number.isFinite(n))) return '';
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (!Number.isFinite(dt.getTime())) return '';
    return dt.toISOString();
  }
  function formatDatetimeLocal(val){
    const raw = String(val || '').trim();
    if (!raw) return '';
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return '';
    const pad = (n)=> String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getImages(){
    const raw = (imagesInput.value || '').trim();
    if (!raw) return [];
    return raw.split('\n').map(s=>s.trim()).filter(Boolean);
  }
  function setImages(list){
    const urls = Array.from(new Set((list||[]).filter(Boolean)));
    imagesInput.value = urls.join('\n');
    if (!urls.length){
      imagePreview.innerHTML = '<span class="muted">尚未上傳</span>';
      return;
    }
    imagePreview.innerHTML = urls.map((url, idx) => `
      <div class="thumb">
        <img src="${url}" alt="">
        <button type="button" class="x" data-url="${url}">×</button>
        ${idx === 0 ? '<div style="position:absolute;left:6px;bottom:6px;font-size:11px;background:rgba(15,23,42,.7);color:#fff;padding:2px 6px;border-radius:999px;">封面</div>' : ''}
      </div>
    `).join('');
  }
  function addOptionRow(name='', price=0){
    const row = document.createElement('div');
    row.className = 'svc-option-row';
    const nameInput = document.createElement('input');
    nameInput.name = 'opt_name';
    nameInput.placeholder = '項目名稱';
    nameInput.value = name || '';
    const priceInput = document.createElement('input');
    priceInput.name = 'opt_price';
    priceInput.type = 'number';
    priceInput.placeholder = '加價';
    priceInput.value = Number(price||0);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn danger';
    btn.textContent = '刪除';
    btn.addEventListener('click', ()=>{
      row.remove();
      if (!optionsWrap.querySelector('.svc-option-row')){
        addOptionRow();
      }
    });
    row.append(nameInput, priceInput, btn);
    optionsWrap.appendChild(row);
  }
  function readForm(){
    const images = getImages();
    const idInput = document.getElementById('svc_id').value.trim();
    const data = {
      name: document.getElementById('svc_name').value.trim(),
      price: Number(document.getElementById('svc_price').value || 0),
      sold: Number(soldInput.value || 0),
      active: activeInput.value !== '0',
      qtyEnabled: !!(qtyEnabledInput && qtyEnabledInput.checked),
      qtyLabel: qtyLabelInput ? qtyLabelInput.value.trim() : '',
      fixedFee: Number(fixedFeeInput ? fixedFeeInput.value : 0),
      ritualPhotoRequired: !!(photoRequiredInput && photoRequiredInput.checked),
      limitedUntil: toIsoFromLocal(document.getElementById('svc_limited_until').value.trim()),
      duration: document.getElementById('svc_duration').value.trim(),
      description: document.getElementById('svc_description').value,
      instagram: document.getElementById('svc_instagram').value.trim(),
      includes: document.getElementById('svc_includes').value.split('\n').map(s=>s.trim()).filter(Boolean),
      cover: images[0] || '',
      gallery: images.slice(1),
      options: Array.from(optionsWrap.querySelectorAll('.svc-option-row')).map(row=>{
        const name = row.querySelector('input[name="opt_name"]').value.trim();
        const price = Number(row.querySelector('input[name="opt_price"]').value||0);
        return { name, price };
      }).filter(opt => opt.name)
    };
    const resolvedId = idInput || currentId || '';
    if (resolvedId) data.id = resolvedId;
    return data;
  }
  function fillForm(data){
    currentId = resolveServiceId(data) || '';
    document.getElementById('svc_id').value = currentId;
    document.getElementById('svc_name').value = data.name || '';
    document.getElementById('svc_price').value = Number(data.price||0);
    soldInput.value = Number(data.sold||0);
    activeInput.value = data.active === false ? '0' : '1';
    if (qtyEnabledInput) qtyEnabledInput.checked = data.qtyEnabled === true;
    if (qtyLabelInput) qtyLabelInput.value = data.qtyLabel || '數量';
    if (fixedFeeInput) fixedFeeInput.value = Number(data.fixedFee||0);
    if (photoRequiredInput){
      const required = Object.prototype.hasOwnProperty.call(data, 'ritualPhotoRequired')
        ? data.ritualPhotoRequired
        : (Object.prototype.hasOwnProperty.call(data, 'photoRequired')
          ? data.photoRequired
          : (Object.prototype.hasOwnProperty.call(data, 'requirePhoto') ? data.requirePhoto : true));
      photoRequiredInput.checked = required !== false;
    }
    document.getElementById('svc_limited_until').value = formatDatetimeLocal(data.limitedUntil);
    document.getElementById('svc_duration').value = data.duration || '';
    document.getElementById('svc_description').value = data.description || '';
    document.getElementById('svc_instagram').value = data.instagram || '';
    document.getElementById('svc_includes').value = Array.isArray(data.includes) ? data.includes.join('\n') : '';
    const gallery = Array.isArray(data.gallery) ? data.gallery : [];
    const imgs = [];
    if (data.cover) imgs.push(data.cover);
    gallery.forEach(url=>{
      if (url && !imgs.includes(url)) imgs.push(url);
    });
    setImages(imgs);
    optionsWrap.innerHTML = '';
    const opts = Array.isArray(data.options) && data.options.length ? data.options : [{name:'',price:0}];
    opts.forEach(opt => addOptionRow(opt.name, opt.price));
    btnDelete.style.display = data.id ? 'inline-flex' : 'none';
  }
  function resetForm(){
    currentId = '';
    fillForm({
      id:'',
      name:'代捐棺服務',
      price:500,
      sold:0,
      gallery:[],
      options:[{name:'',price:0}],
      active:true,
      instagram:'',
      qtyEnabled:true,
      qtyLabel:'幾口棺',
      fixedFee:300,
      ritualPhotoRequired:false
    });
    formMsg.textContent = '';
  }
  async function uploadFiles(fileList){
    if (!fileList || !fileList.length) return [];
    const form = new FormData();
    Array.from(fileList).forEach(f => form.append('files[]', f));
        const res = await fetch(API_BASE + '/api/upload', { method:'POST', body: form });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || '上傳失敗');
    }
    return Array.isArray(data.files) ? data.files : [];
  }
  async function toggleActive(id, active){
    try{
      await authedFetch('/api/service/products', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id, active })
      });
      if (formMsg) formMsg.textContent = active ? '已上架' : '已下架';
      if (currentId === id){
        activeInput.value = active ? '1' : '0';
      }
      await loadServices();
    }catch(err){
      alert('更新狀態失敗：' + err.message);
    }
  }
  function renderList(){
    const q = (filterInput.value||'').trim().toLowerCase();
    const view = items.filter(it => !q || String(it.name||'').toLowerCase().includes(q));
    if (!view.length){
      listBody.innerHTML = '<tr><td colspan="4" class="muted">沒有符合條件的服務。</td></tr>';
      return;
    }
    listBody.innerHTML = view.map(it => {
      const rowId = getRowId(it);
      return `
      <tr data-id="${rowId}">
        <td>${it.cover ? `<img src="${it.cover}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:10px;">` : ''}</td>
        <td>
          <div style="font-weight:700;">${it.name||''}</div>
          <div class="muted">${it.includes && it.includes.length ? it.includes[0] : '—'}</div>
          <div class="muted">已售出：${Number(it.sold||0)}</div>
        </td>
        <td>
          <div>${Number(it.price||0).toLocaleString('zh-TW')}</div>
          <div class="muted">${it.active === false ? '（已下架）' : ''}</div>
        </td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn" data-act="edit" data-id="${rowId}">編輯</button>
          <button class="btn" data-act="${it.active === false ? 'publish' : 'unpublish'}" data-id="${rowId}">
            ${it.active === false ? '上架' : '下架'}
          </button>
          <button class="btn" data-act="copy" data-id="${rowId}">複製ID</button>
        </td>
      </tr>`;
    }).join('');
  }
  async function loadServices(){
    listBody.innerHTML = '<tr><td colspan="4" class="muted">載入中…</td></tr>';
    try{
      const data = await authedFetch('/api/service/products');
      items = Array.isArray(data.items) ? data.items : [];
      ensureItemIds(items);
      renderList();
    }catch(err){
      listBody.innerHTML = `<tr><td colspan="4" class="muted">載入失敗：${err.message}</td></tr>`;
    }
  }

  btnReload.addEventListener('click', loadServices);
  filterInput.addEventListener('input', renderList);
  btnReset.addEventListener('click', resetForm);
  listBody.addEventListener('click', e=>{
    const target = e.target instanceof Element ? e.target : (e.target && e.target.parentElement) || null;
    const btn = target ? target.closest('button[data-act]') : null;
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const id = (btn.getAttribute('data-id') || '').trim();
    if (!id) return;
    if (act === 'edit'){
      const item = findItemByRowId(id);
      if (item) fillForm(item);
      return;
    }
    if (act === 'copy'){
      const item = findItemByRowId(id);
      const realId = item ? resolveServiceId(item) : '';
      if (!realId){
        alert('此服務尚未產生 ID，請先編輯並儲存一次。');
        return;
      }
      copyText(realId);
      return;
    }
    if (act === 'publish' || act === 'unpublish'){
      const item = findItemByRowId(id);
      const realId = item ? resolveServiceId(item) : '';
      if (!realId){
        alert('此服務尚未產生 ID，請先編輯並儲存一次。');
        return;
      }
      const next = act === 'publish';
      toggleActive(realId, next);
    }
  });
  btnSave.addEventListener('click', async ()=>{
    const data = readForm();
    if (!data.name || !data.price){
      formMsg.textContent = '請填寫名稱與價格';
      return;
    }
    formMsg.textContent = '儲存中…';
    try{
      if (data.id){
        await authedFetch('/api/service/products', {
          method:'PUT',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(data)
        });
      }else{
        const res = await authedFetch('/api/service/products', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(data)
        });
        data.id = res.item && res.item.id;
      }
      formMsg.textContent = '已儲存';
      await loadServices();
      if (data.id){
        const target = items.find(x=> x.id === data.id);
        if (target) fillForm(target);
      }else{
        resetForm();
      }
    }catch(err){
      formMsg.textContent = '儲存失敗：' + err.message;
    }
  });
  btnDelete.addEventListener('click', async ()=>{
    const id = document.getElementById('svc_id').value.trim();
    if (!id) return;
    if (!confirm('確定要刪除服務「'+id+'」嗎？')) return;
    try{
      await authedFetch('/api/service/products?id='+encodeURIComponent(id), { method:'DELETE' });
      resetForm();
      await loadServices();
    }catch(err){
      alert('刪除失敗：' + err.message);
    }
  });
  document.getElementById('btnImagesUpload').addEventListener('click',()=> document.getElementById('fileImages').click());
  document.getElementById('fileImages').addEventListener('change', async e=>{
    const files = e.target.files;
    if (!files || !files.length) return;
    formMsg.textContent = '上傳圖片中…';
    try{
      const uploaded = await uploadFiles(files);
      const urls = getImages();
      uploaded.forEach(f => {
        if (f && f.url) urls.push(f.url);
      });
      setImages(urls);
      formMsg.textContent = '圖片已更新（首張為封面）';
    }catch(err){
      formMsg.textContent = '上傳失敗：' + err.message;
    }finally{
      e.target.value = '';
    }
  });
  imagePreview.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-url]');
    if (!btn) return;
    const url = btn.getAttribute('data-url');
    const urls = getImages().filter(item => item !== url);
    setImages(urls);
  });
  document.getElementById('btnAddOption').addEventListener('click', ()=> addOptionRow());

  resetForm();
  loadServices();
})();
