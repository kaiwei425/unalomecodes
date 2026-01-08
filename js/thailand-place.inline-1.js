(function(){
  const titleEl = document.getElementById('placeTitle');
  const introEl = document.getElementById('placeIntro');
  const galleryEl = document.getElementById('placeGallery');
  const metaEl = document.getElementById('placeMeta');
  const detailEl = document.getElementById('placeDetail');
  const contactEl = document.getElementById('placeContact');

  const esc = (value)=>{
    return String(value || '').replace(/[&<>"']/g, (m)=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m] || m));
  };

  const pickFirst = (obj, keys)=>{
    for (const key of keys){
      if (obj && obj[key]) return obj[key];
    }
    return '';
  };

  const getIdFromPath = ()=>{
    const path = window.location.pathname || '';
    const parts = path.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    if (last && last !== 'place' && last !== 'thailand-place' && last !== 'thailand-place.html') return last;
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
  };

  const getLang = ()=>{
    const params = new URLSearchParams(window.location.search);
    const lang = (params.get('lang') || '').toLowerCase();
    return lang === 'en' ? 'en' : 'zh';
  };

  const toApiLang = (lang)=>{
    return lang === 'en' ? 'en' : 'en';
  };

  const resolveImages = (data)=>{
    const list = [];
    const add = (val)=>{
      if (!val) return;
      if (Array.isArray(val)){
        val.forEach(add);
        return;
      }
      if (typeof val === 'string') list.push(val);
    };
    add(data.thumbnailUrl);
    add(data.thumbnail_url);
    add(data.desktopImageUrls);
    add(data.mobileImageUrls);
    add(data.desktopImage_urls);
    add(data.mobileImage_urls);
    add(data.web_picture_urls);
    add(data.mobile_picture_urls);
    return Array.from(new Set(list)).slice(0, 6);
  };

  const renderMeta = (data)=>{
    const province = data.location && data.location.province && data.location.province.name;
    const address = data.location && data.location.address;
    const hours = data.openingHours || data.opening_hours;
    const price = data.minPrice || data.maxPrice || '';
    const tags = Array.isArray(data.tags) ? data.tags.slice(0, 6) : [];
    const meta = [];
    if (province) meta.push(`<div><strong>省份：</strong>${esc(province)}</div>`);
    if (address) meta.push(`<div><strong>地址：</strong>${esc(address)}</div>`);
    if (hours && Array.isArray(hours) && hours.length){
      const item = hours[0];
      if (item && item.day){
        meta.push(`<div><strong>開放：</strong>${esc(item.day)} ${esc(item.open || '')}-${esc(item.close || '')}</div>`);
      }
    }
    if (price) meta.push(`<div><strong>價格：</strong>${esc(price)}</div>`);
    if (tags.length){
      meta.push(`<div>${tags.map(t=>`<span class="pill">${esc(t)}</span>`).join(' ')}</div>`);
    }
    metaEl.innerHTML = meta.join('') || '<div>尚無資料</div>';
  };

  const renderContact = (data)=>{
    const contact = data.contact || {};
    const urls = contact.urls || contact.url || [];
    const phones = contact.phones || [];
    const emails = contact.emails || [];
    const out = [];
    if (phones.length) out.push(`<div><strong>電話：</strong>${esc(phones.join(', '))}</div>`);
    if (emails.length) out.push(`<div><strong>Email：</strong>${esc(emails.join(', '))}</div>`);
    if (urls.length){
      const list = Array.isArray(urls) ? urls : [urls];
      out.push(`<div><strong>網站：</strong>${list.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`).join(' ')}</div>`);
    }
    contactEl.innerHTML = out.join('') || '<div>尚無聯絡資訊</div>';
  };

  const render = (data)=>{
    const title = pickFirst(data, ['name','placeName','place_name']) || '未命名景點';
    const intro = pickFirst(data, ['introduction','detail','place_information','information']) || '';
    titleEl.textContent = title;
    introEl.textContent = typeof intro === 'string' ? intro : '';

    const images = resolveImages(data);
    galleryEl.innerHTML = images.length
      ? images.map(src=>`<img src="${esc(src)}" alt="${esc(title)}">`).join('')
      : '<div class="card">目前沒有圖片</div>';

    const detail = data.information && data.information.detail
      ? data.information.detail
      : (data.place_information && data.place_information.detail) || '';
    detailEl.innerHTML = detail ? esc(detail) : '目前沒有詳細介紹';

    renderMeta(data);
    renderContact(data);
  };

  const load = async ()=>{
    const id = getIdFromPath();
    if (!id || id === 'thailand-place' || id === 'thailand-place.html') {
      if (titleEl) titleEl.textContent = '找不到景點 ID';
      if (detailEl) detailEl.textContent = '請從入口頁點擊進入。';
      return;
    }
    const lang = getLang();
    const apiLang = toApiLang(lang);
    const endpoint = `/api/tat/places/${encodeURIComponent(id)}?lang=${encodeURIComponent(apiLang)}`;
    try{
      const res = await fetch(endpoint, { cache:'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(()=>null);
      if (!data) throw new Error('No data');
      render(data.data || data);
    }catch(err){
      try{
        const fallback = `/api/tat/places/details?ids=${encodeURIComponent(id)}&lang=${encodeURIComponent(apiLang)}`;
        const res2 = await fetch(fallback, { cache:'no-store' });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const data2 = await res2.json().catch(()=>null);
        const first = data2 && Array.isArray(data2.data) ? data2.data[0] : null;
        if (!first) throw new Error('No data');
        render(first);
        return;
      }catch(err2){
        if (titleEl) titleEl.textContent = '載入失敗';
        if (detailEl) detailEl.textContent = String(err2 || err || '載入失敗');
      }
    }
  };

  load();
})();
