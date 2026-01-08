(function(){
  const grid = document.getElementById('resultGrid');
  const statusText = document.getElementById('statusText');
  const resultMeta = document.getElementById('resultMeta');
  const typeSelect = document.getElementById('typeSelect');
  const langSelect = document.getElementById('langSelect');
  const keywordInput = document.getElementById('keywordInput');
  const provinceInput = document.getElementById('provinceInput');
  const searchBtn = document.getElementById('searchBtn');
  const resetBtn = document.getElementById('resetBtn');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  if (!grid) return;

  const state = {
    page: 1,
    pageSize: 12,
    type: 'attractions',
    lang: 'zh',
    keyword: '',
    province: '',
    loading: false,
    total: null
  };

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

  const extractItems = (data)=>{
    if (!data) return [];
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.result)) return data.result;
    if (Array.isArray(data)) return data;
    return [];
  };

  const resolveImage = (item)=>{
    const direct = pickFirst(item, ['thumbnail_url','thumbnail','image_url','image','cover','picture']);
    if (direct) return direct;
    const gallery = item && (item.images || item.gallery || item.photos);
    if (Array.isArray(gallery) && gallery.length){
      const first = gallery[0];
      if (typeof first === 'string') return first;
      return pickFirst(first, ['url','src','image','imageUrl']);
    }
    return '';
  };

  const resolveTitle = (item)=>{
    return pickFirst(item, [
      'name','name_en','name_th','title','place_name','attraction_name','event_name','route_name'
    ]) || '未命名項目';
  };

  const resolveDesc = (item)=>{
    return pickFirst(item, ['introduction','overview','description','detail','short_description','detail_th']);
  };

  const resolveLocation = (item)=>{
    return pickFirst(item, ['location','address','address_en','province','city','district','area']);
  };

  const resolveLink = (item)=>{
    return pickFirst(item, ['url','link','website','official_site','share_url']);
  };

  const updateStatus = (text)=>{
    if (statusText) statusText.textContent = text;
  };

  const updateMeta = (count)=>{
    const total = state.total;
    if (!resultMeta) return;
    if (total !== null){
      resultMeta.textContent = `已載入 ${count} 筆 / 可能共有 ${total} 筆`;
      return;
    }
    resultMeta.textContent = `已載入 ${count} 筆`;
  };

  const setLoading = (loading)=>{
    state.loading = loading;
    if (searchBtn) searchBtn.disabled = loading;
    if (loadMoreBtn) loadMoreBtn.disabled = loading;
  };

  const buildParams = ()=>{
    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('per_page', String(state.pageSize));
    params.set('limit', String(state.pageSize));
    if (state.keyword) params.set('keyword', state.keyword);
    if (state.province) params.set('province', state.province);
    params.set('language', state.lang === 'en' ? 'EN' : 'ZH');
    return params;
  };

  const fetchData = async (append)=>{
    if (state.loading) return;
    setLoading(true);
    updateStatus('載入中…');
    const params = buildParams();
    const endpoint = `/api/tat/${encodeURIComponent(state.type)}?${params.toString()}`;
    try{
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(()=>null);
      const items = extractItems(data);
      const total = data && (data.total || data.count || data.total_records || data.totalResults);
      state.total = Number.isFinite(Number(total)) ? Number(total) : state.total;
      render(items, append);
      updateStatus(items.length ? '已更新' : '沒有資料');
    }catch(err){
      updateStatus('載入失敗');
      renderError(String(err || '載入失敗'));
    }finally{
      setLoading(false);
    }
  };

  const render = (items, append)=>{
    const html = items.map((item)=>{
      const title = esc(resolveTitle(item));
      const desc = esc(resolveDesc(item));
      const location = esc(resolveLocation(item));
      const link = resolveLink(item);
      const image = resolveImage(item);
      const imgTag = image ? `<img src="${esc(image)}" alt="${title}">` : '';
      return `
        <article class="card">
          ${imgTag}
          <div class="card-body">
            <h3 class="card-title">${title}</h3>
            ${desc ? `<p class="card-desc">${desc}</p>` : ''}
            ${location ? `<div class="card-meta">${location}</div>` : ''}
            ${link ? `<a class="card-link" href="${esc(link)}" target="_blank" rel="noopener">查看官方資訊 →</a>` : ''}
          </div>
        </article>
      `;
    }).join('');

    if (!append) grid.innerHTML = html || '<div class="empty">目前沒有資料。</div>';
    else grid.insertAdjacentHTML('beforeend', html);

    const count = grid.querySelectorAll('.card').length;
    updateMeta(count);
    if (loadMoreBtn) loadMoreBtn.disabled = !items.length;
  };

  const renderError = (message)=>{
    grid.innerHTML = `<div class="empty">載入失敗：${esc(message)}</div>`;
    if (loadMoreBtn) loadMoreBtn.disabled = true;
  };

  const resetFilters = ()=>{
    state.page = 1;
    state.total = null;
    state.keyword = '';
    state.province = '';
    if (keywordInput) keywordInput.value = '';
    if (provinceInput) provinceInput.value = '';
  };

  if (typeSelect){
    typeSelect.addEventListener('change', (e)=>{
      state.type = e.target.value || 'attractions';
    });
  }
  if (langSelect){
    langSelect.addEventListener('change', (e)=>{
      state.lang = e.target.value || 'zh';
    });
  }
  if (searchBtn){
    searchBtn.addEventListener('click', ()=>{
      state.page = 1;
      state.keyword = keywordInput ? keywordInput.value.trim() : '';
      state.province = provinceInput ? provinceInput.value.trim() : '';
      fetchData(false);
    });
  }
  if (resetBtn){
    resetBtn.addEventListener('click', ()=>{
      resetFilters();
      grid.innerHTML = '<div class="empty">請點擊「搜尋」載入資料。</div>';
      updateStatus('等待載入');
      if (loadMoreBtn) loadMoreBtn.disabled = true;
      if (resultMeta) resultMeta.textContent = '尚未載入資料';
    });
  }
  if (loadMoreBtn){
    loadMoreBtn.addEventListener('click', ()=>{
      state.page += 1;
      fetchData(true);
    });
  }
})();
