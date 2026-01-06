(function(){
  const statusEl = document.getElementById('statusText');
  const resultEl = document.getElementById('resultPanel');
  const startInput = document.getElementById('startLocation');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const modeSelect = document.getElementById('modeSelect');
  const ratioSelect = document.getElementById('ratioSelect');
  const transportSelect = document.getElementById('transportSelect');
  const btnLocate = document.getElementById('btnLocate');
  const btnGenerate = document.getElementById('btnGenerate');
  const btnSavePlan = document.getElementById('btnSavePlan');
  const btnPrint = document.getElementById('btnPrint');
  const btnShareLine = document.getElementById('btnShareLine');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const btnCopyShare = document.getElementById('btnCopyShare');

  const stepper = document.getElementById('stepper');
  const stepPills = Array.from(document.querySelectorAll('[data-step-pill]'));
  const stepSections = Array.from(document.querySelectorAll('[data-step-section]'));
  const btnStep1Next = document.getElementById('btnStep1Next');
  const btnStep2Back = document.getElementById('btnStep2Back');
  const btnStep2Next = document.getElementById('btnStep2Next');
  const btnStep3Back = document.getElementById('btnStep3Back');
  const btnStep3Next = document.getElementById('btnStep3Next');
  const btnStep4Back = document.getElementById('btnStep4Back');

  const mustSearchInput = document.getElementById('mustSearchInput');
  const mustSearchResults = document.getElementById('mustSearchResults');
  const mustList = document.getElementById('mustList');
  const recommendList = document.getElementById('recommendList');

  const foodCatFilter = document.getElementById('foodCatFilter');
  const foodAreaFilter = document.getElementById('foodAreaFilter');
  const foodPriceFilter = document.getElementById('foodPriceFilter');
  const foodTagFilters = document.getElementById('foodTagFilters');

  const templeAreaFilter = document.getElementById('templeAreaFilter');
  const templeTagFilters = document.getElementById('templeTagFilters');
  const templeWishFilters = document.getElementById('templeWishFilters');

  const mapSearchInput = document.getElementById('mapSearchInput');
  const mapPlaceType = document.getElementById('mapPlaceType');
  const btnAddMapPlace = document.getElementById('btnAddMapPlace');
  const mapPlaceInfo = document.getElementById('mapPlaceInfo');
  const mapCanvas = document.getElementById('mapCanvas');

  const modeCards = document.getElementById('modeCards');

  const savedList = document.getElementById('savedList');

  const DEFAULT_STAY = { food: 60, temple: 45, spot: 50 };
  const FOOD_SLOT_ORDER = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const TEMPLE_SLOT_ORDER = ['morning', 'afternoon', 'evening'];
  const STORAGE_KEY = 'day_trip_saved_plans_v1';
  const RECOMMENDED_SPOTS = [
    { name:'大皇宮', kind:'temple', lat:13.7500, lng:100.4913, area:'曼谷', category:'皇宮' },
    { name:'玉佛寺', kind:'temple', lat:13.7515, lng:100.4927, area:'曼谷', category:'寺廟' },
    { name:'臥佛寺', kind:'temple', lat:13.7467, lng:100.4930, area:'曼谷', category:'寺廟' },
    { name:'鄭王廟', kind:'temple', lat:13.7440, lng:100.4889, area:'曼谷', category:'寺廟' },
    { name:'四面佛', kind:'temple', lat:13.7443, lng:100.5401, area:'曼谷', category:'祈福' },
    { name:'恰圖恰市集', kind:'spot', lat:13.7994, lng:100.5510, area:'曼谷', category:'市集' },
    { name:'ICONSIAM', kind:'spot', lat:13.7266, lng:100.5107, area:'曼谷', category:'購物' },
    { name:'暹羅百麗宮', kind:'spot', lat:13.7466, lng:100.5350, area:'曼谷', category:'購物' },
    { name:'考山路', kind:'spot', lat:13.7587, lng:100.4971, area:'曼谷', category:'夜生活' },
    { name:'喬德夜市', kind:'spot', lat:13.7641, lng:100.5699, area:'曼谷', category:'夜市' },
    { name:'Asiatique 河濱夜市', kind:'spot', lat:13.7047, lng:100.5030, area:'曼谷', category:'夜市' },
    { name:'Jim Thompson House', kind:'spot', lat:13.7494, lng:100.5280, area:'曼谷', category:'景點' }
  ];

  const state = {
    foods: [],
    temples: [],
    customItems: [],
    ready: false,
    startCoords: null,
    startLabel: '',
    mustIds: new Set(),
    currentPlan: [],
    currentSummary: null,
    savedPlans: [],
    selectedMapPlace: null,
    googleReady: false,
    googleMap: null,
    googleMarker: null,
    googleAutocomplete: null,
    googleMapsKey: '',
    googleLoadingPromise: null
  };

  function setStatus(text, isError){
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? '#b91c1c' : '';
  }

  let currentStep = 1;
  function showStep(step){
    currentStep = step;
    stepSections.forEach(section => {
      section.classList.toggle('is-active', section.getAttribute('data-step-section') === String(step));
    });
    stepPills.forEach(pill => {
      pill.classList.toggle('is-active', pill.getAttribute('data-step-pill') === String(step));
    });
    if (step === 2){
      ensureGoogleMaps().then(()=>{
        if (!state.googleMap || !window.google || !window.google.maps) return;
        window.setTimeout(()=>{
          try{
            google.maps.event.trigger(state.googleMap, 'resize');
            if (state.googleMap.getCenter) state.googleMap.setCenter(state.googleMap.getCenter());
          }catch(_){}
        }, 200);
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep1(){
    const startVal = (startInput && startInput.value || '').trim();
    if (!startVal){
      setStatus('請先輸入起點位置', true);
      return false;
    }
    const startMin = timeInputToMinutes(startTimeInput && startTimeInput.value);
    const endMin = timeInputToMinutes(endTimeInput && endTimeInput.value);
    if (startMin === null || endMin === null){
      setStatus('請填寫出發與回程時間', true);
      return false;
    }
    if (endMin <= startMin){
      setStatus('回程時間需晚於出發時間', true);
      return false;
    }
    return true;
  }

  function normalizeListField(value){
    if (Array.isArray(value)) {
      return value.map(v=>String(v).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(/[,，]/).map(v=>v.trim()).filter(Boolean);
    }
    return [];
  }

  function parseTimeMinutes(value){
    const raw = String(value || '').trim();
    if (!raw) return null;
    const match = raw.match(/^(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 24 || minute < 0 || minute >= 60) return null;
    if (hour === 24 && minute !== 0) return null;
    return hour * 60 + minute;
  }

  function timeInputToMinutes(input){
    const val = String(input || '').trim();
    const out = parseTimeMinutes(val);
    return Number.isFinite(out) ? out : null;
  }

  function formatMinutes(minutes){
    const m = Math.max(0, Math.round(minutes));
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  function haversineKm(a, b){
    if (!a || !b) return 9999;
    const toRad = (deg)=>deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
    return 6371 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
  }

  function parseHoursRanges(raw){
    const text = String(raw || '').trim();
    if (!text) return [];
    const ranges = [];
    const rangeRegex = /(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?\s*(?:-|–|—|~|～|〜|到|至|－)\s*(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?/g;
    let match;
    while ((match = rangeRegex.exec(text)) !== null) {
      const start = parseTimeMinutes(`${match[1]}:${match[2] || '00'}`);
      const end = parseTimeMinutes(`${match[3]}:${match[4] || '00'}`);
      if (start === null || end === null) continue;
      if (start === end) continue;
      ranges.push([start, end]);
    }
    return ranges;
  }

  function inferSlotsFromHours(raw, slotWindows, slotOrder, allDayKey){
    const text = String(raw || '').trim();
    if (!text) return [];
    if (/(24\s*小時|24\s*hr|24\s*h|24\/7|24-7|all\s*day|全天|全日)/i.test(text)) {
      return allDayKey ? [allDayKey] : slotOrder.slice();
    }
    if (/(休息|公休|店休|暫停營業|歇業|closed)/i.test(text)) return [];
    const ranges = parseHoursRanges(text);
    if (!ranges.length) return [];
    const chosen = new Set();
    const overlaps = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
    ranges.forEach(([start, end])=>{
      const segments = end > start ? [[start, end]] : [[start, 1440], [0, end]];
      segments.forEach(([segStart, segEnd])=>{
        slotOrder.forEach((slot)=>{
          const windows = slotWindows[slot] || [];
          windows.forEach(([winStart, winEnd])=>{
            if (overlaps(segStart, segEnd, winStart, winEnd)) {
              chosen.add(slot);
            }
          });
        });
      });
    });
    return slotOrder.filter(slot=>chosen.has(slot));
  }

  function resolveFoodSlots(item){
    const raw = normalizeListField(item.openSlots || item.open_slots);
    if (raw.length) {
      const mapped = raw.map(s=>String(s).trim());
      if (mapped.some(s=>/^(all_day|24h|24hours|全天)$/i.test(s))) return FOOD_SLOT_ORDER.slice();
      return mapped;
    }
    const windows = {
      morning: [[360, 600]],
      noon: [[600, 840]],
      afternoon: [[840, 1080]],
      evening: [[1080, 1320]],
      night: [[1320, 1440], [0, 180]]
    };
    return inferSlotsFromHours(item.hours, windows, FOOD_SLOT_ORDER, null);
  }

  function resolveTempleSlots(item){
    const raw = normalizeListField(item.openSlots || item.open_slots);
    if (raw.length) {
      const mapped = raw.map((slot)=>{
        if (slot === 'night') return 'evening';
        if (/^(all_day|24h|24hours|全天)$/i.test(slot)) return 'all_day';
        return slot;
      });
      if (mapped.includes('all_day')) return ['all_day'];
      return mapped.filter(slot=>slot !== 'all_day');
    }
    const windows = {
      morning: [[360, 720]],
      afternoon: [[720, 1080]],
      evening: [[1080, 1440]]
    };
    const inferred = inferSlotsFromHours(item.hours, windows, TEMPLE_SLOT_ORDER, 'all_day');
    if (inferred.includes('all_day')) return ['all_day'];
    return inferred;
  }

  function getFoodSlotForTime(minutes){
    if (minutes >= 1320 || minutes < 180) return 'night';
    if (minutes >= 1080) return 'evening';
    if (minutes >= 840) return 'afternoon';
    if (minutes >= 600) return 'noon';
    return 'morning';
  }

  function getTempleSlotForTime(minutes){
    if (minutes >= 1080 && minutes < 1440) return 'evening';
    if (minutes >= 720) return 'afternoon';
    if (minutes >= 360) return 'morning';
    return '';
  }

  function isOpenAt(item, minutes){
    const slots = item.openSlotsResolved || [];
    if (!slots.length) return true;
    if (slots.includes('all_day')) return true;
    const slot = item.kind === 'temple' ? getTempleSlotForTime(minutes) : getFoodSlotForTime(minutes);
    if (!slot) return false;
    return slots.includes(slot);
  }

  function readCoords(item){
    const lat = Number(item.lat ?? item.latitude);
    const lng = Number(item.lng ?? item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  function normalizeItems(list, kind){
    return (Array.isArray(list) ? list : [])
      .filter(item => item && !item.deleted)
      .map(item => {
        const coords = readCoords(item);
        if (!coords) return null;
        const stayMinRaw = item.stayMin || item.stay_min;
        const stayMin = Number.isFinite(Number(stayMinRaw)) ? Number(stayMinRaw) : DEFAULT_STAY[kind];
        const openSlotsResolved = kind === 'temple' ? resolveTempleSlots(item) : resolveFoodSlots(item);
        return {
          id: String(item.id || ''),
          name: item.name || '',
          category: item.category || '',
          area: item.area || '',
          price: item.price || '',
          rating: item.rating || '',
          maps: item.maps || '',
          googlePlaceId: item.googlePlaceId || item.google_place_id || '',
          hours: item.hours || '',
          tags: normalizeListField(item.tags),
          wishTags: normalizeListField(item.wishTags || item.wish_tags),
          kind,
          coords,
          stayMin,
          openSlotsResolved,
          isCustom: false
        };
      })
      .filter(Boolean);
  }

  function uniqueValues(list, selector){
    const set = new Set();
    list.forEach(item => {
      const val = typeof selector === 'function' ? selector(item) : item[selector];
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  }

  function fillSelect(select, values){
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">全部</option>';
    values.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
    if (values.includes(current)) select.value = current;
  }

  function renderTagFilters(container, tags, dataAttr){
    if (!container) return;
    container.innerHTML = '';
    tags.forEach(tag => {
      const label = document.createElement('label');
      label.className = 'tag-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute(dataAttr, tag);
      const span = document.createElement('span');
      span.textContent = tag;
      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  function getCheckedValues(container, dataAttr){
    if (!container) return [];
    return Array.from(container.querySelectorAll(`input[${dataAttr}]`))
      .filter(el => el.checked)
      .map(el => el.getAttribute(dataAttr))
      .filter(Boolean);
  }

  function renderFilterOptions(){
    const foodCats = uniqueValues(state.foods, 'category');
    const foodAreas = uniqueValues(state.foods, 'area');
    fillSelect(foodCatFilter, foodCats);
    fillSelect(foodAreaFilter, foodAreas);

    const foodTags = uniqueValues(state.foods.flatMap(item => item.tags || []), v => v);
    renderTagFilters(foodTagFilters, foodTags, 'data-food-tag');

    const templeAreas = uniqueValues(state.temples, 'area');
    fillSelect(templeAreaFilter, templeAreas);

    const templeTags = uniqueValues(state.temples.flatMap(item => item.tags || []), v => v);
    renderTagFilters(templeTagFilters, templeTags, 'data-temple-tag');

    const wishTagsBase = ['轉運','財運','健康','事業','愛情','人緣','許願','算命','特殊儀式'];
    const wishTagsExtra = uniqueValues(state.temples.flatMap(item => item.wishTags || []), v => v);
    const wishTags = Array.from(new Set(wishTagsBase.concat(wishTagsExtra)));
    renderTagFilters(templeWishFilters, wishTags, 'data-wish-tag');
  }

  function renderMustList(){
    if (!mustList) return;
    if (!state.mustIds.size){
      mustList.innerHTML = '<span class="planner-hint">尚未加入必去點。</span>';
      return;
    }
    const items = Array.from(state.mustIds).map(id => findItemById(id)).filter(Boolean);
    mustList.innerHTML = items.map(item => {
      const meta = [getKindLabel(item.kind), item.area].filter(Boolean).join(' · ');
      return `
        <div class="must-chip">
          <span>${escapeHtml(item.name || '')}</span>
          <span style="color:#64748b;">${escapeHtml(meta)}</span>
          <button type="button" data-must-remove="${escapeHtml(item.id)}">✕</button>
        </div>
      `;
    }).join('');
    mustList.querySelectorAll('[data-must-remove]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-must-remove') || '';
        removeMustItem(id);
      });
    });
  }

  function renderMustSearchResults(query){
    if (!mustSearchResults) return;
    const q = String(query || '').trim().toLowerCase();
    if (!q){
      mustSearchResults.innerHTML = '';
      return;
    }
    const items = state.foods.concat(state.temples)
      .filter(item => item.name && item.name.toLowerCase().includes(q))
      .slice(0, 8);
    if (!items.length){
      mustSearchResults.innerHTML = '<div class="planner-hint">找不到符合的資料。</div>';
      return;
    }
    mustSearchResults.innerHTML = items.map(item => {
      const meta = [getKindLabel(item.kind), item.area, item.category].filter(Boolean).join(' · ');
      return `
        <div class="search-item">
          <div>
            <div class="search-item-title">${escapeHtml(item.name || '')}</div>
            <div class="search-item-meta">${escapeHtml(meta)}</div>
          </div>
          <button class="pill-btn" type="button" data-add-must="${escapeHtml(item.id)}">加入必去</button>
        </div>
      `;
    }).join('');
    mustSearchResults.querySelectorAll('[data-add-must]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-add-must') || '';
        const item = findItemById(id);
        if (item) addMustItem(item);
      });
    });
  }

  function renderRecommendedList(){
    if (!recommendList) return;
    recommendList.innerHTML = RECOMMENDED_SPOTS.map(spot => {
      const meta = [getKindLabel(spot.kind), spot.area, spot.category].filter(Boolean).join(' · ');
      return `
        <div class="search-item">
          <div>
            <div class="search-item-title">${escapeHtml(spot.name)}</div>
            <div class="search-item-meta">${escapeHtml(meta)}</div>
          </div>
          <button class="pill-btn" type="button" data-add-reco="${escapeHtml(spot.name)}">加入</button>
        </div>
      `;
    }).join('');

    recommendList.querySelectorAll('[data-add-reco]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-add-reco') || '';
        const spot = RECOMMENDED_SPOTS.find(item => item.name === name);
        if (!spot) return;
        const existing = state.foods.concat(state.temples).find(item => item.name === spot.name);
        if (existing){
          addMustItem(existing);
          return;
        }
        const custom = buildPresetItem(spot);
        const existsCustom = state.customItems.find(x => x.id === custom.id);
        if (!existsCustom) state.customItems.push(custom);
        addMustItem(custom);
      });
    });
  }

  function findItemById(id){
    if (!id) return null;
    const all = state.foods.concat(state.temples, state.customItems);
    return all.find(item => item.id === id) || null;
  }

  function addMustItem(item){
    if (!item || !item.id) return;
    state.mustIds.add(item.id);
    renderMustList();
  }

  function removeMustItem(id){
    if (!id) return;
    state.mustIds.delete(id);
    state.customItems = state.customItems.filter(item => item.id !== id);
    renderMustList();
  }

  function buildCustomItem(place, type){
    const kind = type === 'temple' ? 'temple' : (type === 'food' ? 'food' : 'spot');
    const coords = { lat: place.lat, lng: place.lng };
    const name = place.name || '自訂地點';
    const area = place.address || '';
    const mapsUrl = place.mapsUrl
      || (place.placeId ? `https://www.google.com/maps/search/?api=1&query=place_id:${encodeURIComponent(place.placeId)}` : '')
      || (name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}` : '');
    const id = place.placeId ? `custom:${place.placeId}` : `custom:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
    return {
      id,
      name,
      category: kind === 'spot' ? '自訂景點' : (kind === 'food' ? '自訂美食' : '自訂寺廟'),
      area,
      price: '',
      rating: place.rating || '',
      maps: mapsUrl,
      googlePlaceId: place.placeId || '',
      hours: place.hours || '',
      tags: [],
      wishTags: [],
      kind,
      coords,
      stayMin: DEFAULT_STAY[kind] || 60,
      openSlotsResolved: [],
      isCustom: true
    };
  }

  function buildPresetItem(spot){
    const kind = spot.kind === 'temple' ? 'temple' : 'spot';
    const coords = { lat: spot.lat, lng: spot.lng };
    const id = `preset:${spot.name}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`;
    return {
      id,
      name: spot.name,
      category: spot.category || (kind === 'temple' ? '寺廟' : '景點'),
      area: spot.area || '',
      price: '',
      rating: '',
      maps: mapsUrl,
      googlePlaceId: '',
      hours: '',
      tags: [],
      wishTags: [],
      kind,
      coords,
      stayMin: DEFAULT_STAY[kind] || 50,
      openSlotsResolved: [],
      isCustom: true
    };
  }

  function applyModeSettings(mode){
    if (mode === 'battle') return { stayMultiplier: 0.8, stopFactor: 70 };
    if (mode === 'chill') return { stayMultiplier: 1.2, stopFactor: 110 };
    return { stayMultiplier: 1.0, stopFactor: 90 };
  }

  function getModeLabel(mode){
    if (mode === 'battle') return '戰鬥模式';
    if (mode === 'chill') return '散步模式';
    return '平衡模式';
  }

  function getRatioLabel(value){
    if (value === 'food-only') return '只要美食';
    if (value === 'temple-only') return '只要寺廟';
    if (value === '2-1') return '美食 2 / 寺廟 1';
    if (value === '1-2') return '美食 1 / 寺廟 2';
    return '美食 1 / 寺廟 1';
  }

  function getTransportLabel(mode){
    if (mode === 'walking') return '步行';
    if (mode === 'transit') return '大眾運輸';
    if (mode === 'mixed') return '混合搭配';
    return '開車/叫車';
  }

  function getKindLabel(kind){
    if (kind === 'temple') return '寺廟';
    if (kind === 'food') return '美食';
    return '景點';
  }

  function kindForRatio(kind){
    return kind === 'temple' ? 'temple' : 'food';
  }

  function getTransportSettings(mode){
    if (mode === 'walking') return { mode, speedMinPerKm: 12, travelMode: 'walking' };
    if (mode === 'transit') return { mode, speedMinPerKm: 6, travelMode: 'transit' };
    if (mode === 'mixed') return { mode, speedMinPerKm: 6, travelMode: 'driving' };
    return { mode: 'driving', speedMinPerKm: 4, travelMode: 'driving' };
  }

  function estimateTravelMinutes(distKm, transport){
    const distance = Number(distKm) || 0;
    if (!transport || !transport.mode) return Math.max(10, Math.round(distance * 4));
    if (transport.mode === 'mixed') {
      if (distance <= 1.2) return Math.max(10, Math.round(distance * 12));
      if (distance <= 4) return Math.max(10, Math.round(distance * 6));
      return Math.max(10, Math.round(distance * 4));
    }
    return Math.max(10, Math.round(distance * transport.speedMinPerKm));
  }

  function parseRatio(value){
    if (value === 'food-only') return { food: 1, temple: 0 };
    if (value === 'temple-only') return { food: 0, temple: 1 };
    const match = String(value || '').match(/(\d+)-(\d+)/);
    if (match) return { food: Number(match[1]), temple: Number(match[2]) };
    return { food: 1, temple: 1 };
  }

  function itemMatchesTags(item, selectedTags){
    if (!selectedTags.length) return true;
    const tags = item.tags || [];
    return selectedTags.some(tag => tags.includes(tag));
  }

  function itemMatchesWishTags(item, selectedTags){
    if (!selectedTags.length) return true;
    const tags = item.wishTags || [];
    return selectedTags.some(tag => tags.includes(tag));
  }

  function applyFilters(items){
    const foodCat = foodCatFilter ? foodCatFilter.value : '';
    const foodArea = foodAreaFilter ? foodAreaFilter.value : '';
    const foodPrice = foodPriceFilter ? foodPriceFilter.value : '';
    const foodTags = getCheckedValues(foodTagFilters, 'data-food-tag');

    const templeArea = templeAreaFilter ? templeAreaFilter.value : '';
    const templeTags = getCheckedValues(templeTagFilters, 'data-temple-tag');
    const wishTags = getCheckedValues(templeWishFilters, 'data-wish-tag');

    return items.filter(item => {
      if (item.kind === 'food'){
        if (foodCat && item.category !== foodCat) return false;
        if (foodArea && item.area !== foodArea) return false;
        if (foodPrice && item.price !== foodPrice) return false;
        if (!itemMatchesTags(item, foodTags)) return false;
      }
      if (item.kind === 'temple'){
        if (templeArea && item.area !== templeArea) return false;
        if (!itemMatchesTags(item, templeTags)) return false;
        if (!itemMatchesWishTags(item, wishTags)) return false;
      }
      return true;
    });
  }

  function getPreferredKind(minutes, counts, ratio, lastKinds){
    if (ratio.food === 0) return 'temple';
    if (ratio.temple === 0) return 'food';
    const totalTarget = ratio.food + ratio.temple;
    const targetFoodRatio = ratio.food / totalTarget;
    const totalCount = counts.food + counts.temple + 1;
    const currentFoodRatio = counts.food / totalCount;
    const hour = minutes / 60;
    let timeBias = 'food';
    if (hour < 12) timeBias = 'temple';
    else if (hour < 14) timeBias = 'food';
    else if (hour < 18) timeBias = lastKinds[lastKinds.length - 1] === 'food' ? 'temple' : 'food';

    if (currentFoodRatio < targetFoodRatio) return 'food';
    if (currentFoodRatio > targetFoodRatio) return 'temple';
    return timeBias;
  }

  function pickNextItem(candidates, currentCoords, preferredKind, mustSet){
    let pool = candidates;
    const mustCandidates = candidates.filter(item => mustSet.has(item.id));
    if (mustCandidates.length) pool = mustCandidates;
    else if (preferredKind) {
      const preferredPool = candidates.filter(item => kindForRatio(item.kind) === preferredKind);
      if (preferredPool.length) pool = preferredPool;
    }
    let best = null;
    let bestScore = Infinity;
    pool.forEach(item => {
      const dist = haversineKm(currentCoords, item.coords);
      const rating = Number(item.rating) || 0;
      const mustBoost = mustSet.has(item.id) ? -0.6 : 0;
      const score = dist - (rating * 0.02) + mustBoost;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    });
    return best;
  }

  function buildPlan(origin, startMin, endMin, items, settings){
    const used = new Set();
    const plan = [];
    let currentTime = startMin;
    let currentCoords = origin;
    const lastKinds = [];
    const totalMinutes = endMin - startMin;
    const modeSettings = settings.modeSettings;
    const transport = settings.transport;
    const ratio = settings.ratio;
    const maxStops = Math.min(12, Math.max(3, Math.floor(totalMinutes / modeSettings.stopFactor)));
    const mustSet = settings.mustSet;

    const counts = { food: 0, temple: 0 };

    for (let i = 0; i < maxStops; i++){
      const candidates = items.filter(item => {
        if (!item || !item.id || used.has(item.id)) return false;
        return isOpenAt(item, currentTime);
      });
      const fallback = candidates.length ? candidates : items.filter(item => item && item.id && !used.has(item.id));
      if (!fallback.length) break;
      const preferred = getPreferredKind(currentTime, counts, ratio, lastKinds);
      const next = pickNextItem(fallback, currentCoords, preferred, mustSet);
      if (!next) break;
      const distKm = haversineKm(currentCoords, next.coords);
      const travelMin = estimateTravelMinutes(distKm, transport);
      const stayMin = Math.max(20, Math.round(next.stayMin * modeSettings.stayMultiplier));
      const arrive = currentTime + travelMin;
      const depart = arrive + stayMin;
      if (depart > endMin) break;
      plan.push({
        item: next,
        arrive,
        depart,
        travelMin,
        distKm,
        stayMin
      });
      used.add(next.id);
      currentCoords = next.coords;
      currentTime = depart;
      if (kindForRatio(next.kind) === 'food') counts.food += 1;
      if (next.kind === 'temple') counts.temple += 1;
      lastKinds.push(next.kind);
      if (lastKinds.length > 2) lastKinds.shift();
    }
    const skippedMust = Array.from(mustSet).filter(id => !plan.some(entry => entry.item.id === id));
    return { plan, skippedMust, startMin, endMin };
  }

  function recomputeTravelStats(plan, origin, transport){
    let prev = origin;
    plan.forEach(entry => {
      const distKm = haversineKm(prev, entry.item.coords);
      entry.distKm = distKm;
      entry.travelMin = estimateTravelMinutes(distKm, transport);
      prev = entry.item.coords;
    });
  }

  function recomputeTimes(plan, startMin){
    let current = startMin;
    plan.forEach(entry => {
      const travelMin = Number(entry.travelMin) || 0;
      entry.arrive = current + travelMin;
      entry.depart = entry.arrive + (Number(entry.stayMin) || 0);
      current = entry.depart;
    });
    return current;
  }

  function buildMultiStopUrl(origin, plan, travelMode){
    if (!origin || !plan.length) return '';
    const base = 'https://www.google.com/maps/dir/?api=1';
    const params = new URLSearchParams();
    params.set('origin', `${origin.lat},${origin.lng}`);

    const getLoc = (entry) => {
      const item = entry.item;
      const pid = item.googlePlaceId;
      if (pid) return `place_id:${pid}`;
      if (item.name) {
        let q = item.name;
        if (item.area) q += ` ${item.area}`;
        return q;
      }
      return `${item.coords.lat},${item.coords.lng}`;
    };

    params.set('destination', getLoc(plan[plan.length - 1]));
    if (plan.length > 1) {
      const waypoints = plan.slice(0, -1).map(getLoc).join('|');
      params.set('waypoints', waypoints);
    }
    params.set('travelmode', travelMode || 'driving');
    return `${base}&${params.toString()}`;
  }

  function getRouteKey(planData){
    const ids = (planData.plan || []).map(entry => entry.item && entry.item.id).join(',');
    const mode = planData.travelMode || 'driving';
    return `${mode}:${ids}`;
  }

  function maybeApplyGoogleTimes(planData){
    if (!planData || !planData.plan || planData.plan.length < 1) return;
    if (!state.googleReady || !window.google || !window.google.maps) return;
    const origin = state.startCoords;
    if (!origin) return;
    const routeKey = getRouteKey(planData);
    if (planData.googleKey === routeKey && (planData.googleApplied || planData.googlePending)) return;
    planData.googleKey = routeKey;
    planData.googlePending = true;

    const service = new google.maps.DirectionsService();
    const waypoints = planData.plan.slice(0, -1).map(entry => {
      const item = entry.item;
      if (item.googlePlaceId) return { location: { placeId: item.googlePlaceId }, stopover: true };
      return { location: { lat: item.coords.lat, lng: item.coords.lng }, stopover: true };
    });
    const last = planData.plan[planData.plan.length - 1].item;
    const destination = last.googlePlaceId
      ? { placeId: last.googlePlaceId }
      : { lat: last.coords.lat, lng: last.coords.lng };
    const travelMode = (planData.travelMode || 'driving').toUpperCase();

    service.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination,
      waypoints,
      travelMode: google.maps.TravelMode[travelMode] || google.maps.TravelMode.DRIVING
    }, (result, status)=>{
      planData.googlePending = false;
      if (status !== 'OK' || !result || !result.routes || !result.routes.length) {
        planData.googleApplied = false;
        return;
      }
      const legs = result.routes[0].legs || [];
      if (!legs.length) return;
      planData.plan.forEach((entry, idx)=>{
        const leg = legs[idx];
        if (!leg) return;
        const durationMin = leg.duration ? Math.round(leg.duration.value / 60) : entry.travelMin;
        const distKm = leg.distance ? leg.distance.value / 1000 : entry.distKm;
        entry.travelMin = Math.max(1, durationMin || 0);
        entry.distKm = distKm || entry.distKm;
      });
      recomputeTimes(planData.plan, planData.startMin || 0);
      planData.googleApplied = true;
      renderPlan(planData, { skipGoogle: true });
    });
  }

  function buildPlaceLink(item){
    if (item.maps) return item.maps;
    if (item.googlePlaceId) {
      return `https://www.google.com/maps/search/?api=1&query=place_id:${encodeURIComponent(item.googlePlaceId)}`;
    }
    if (item.name) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + (item.area ? ' ' + item.area : ''))}`;
    }
    return '';
  }

  function renderPlan(planData, opts){
    if (!resultEl) return;
    const plan = planData.plan || [];
    if (!plan.length){
      resultEl.innerHTML = '<div class="result-empty">找不到符合時間的行程，請調整時間或地點再試一次。</div>';
      return;
    }
    const modeLabel = getModeLabel(planData.mode || (modeSelect ? modeSelect.value : 'balance'));
    const ratioLabel = getRatioLabel(planData.ratioValue || (ratioSelect ? ratioSelect.value : '1-1'));
    const transportLabel = getTransportLabel(planData.transportMode || (transportSelect ? transportSelect.value : 'driving'));
    const startTimeLabel = startTimeInput ? startTimeInput.value : '';
    const endTimeLabel = endTimeInput ? endTimeInput.value : '';
    const today = new Date().toLocaleDateString('zh-TW', { month:'2-digit', day:'2-digit', weekday:'short' });
    const foodCount = plan.filter(p => p.item.kind === 'food').length;
    const templeCount = plan.filter(p => p.item.kind === 'temple').length;
    const spotCount = plan.filter(p => p.item.kind === 'spot').length;
    const totalStay = plan.reduce((sum, p)=> sum + p.stayMin, 0);
    const totalTravel = plan.reduce((sum, p)=> sum + p.travelMin, 0);
    const routeUrl = buildMultiStopUrl(state.startCoords, plan, planData.travelMode);
    const endOverrun = planData.endMin && plan.length ? Math.max(0, plan[plan.length - 1].depart - planData.endMin) : 0;

    const listHtml = plan.map((entry, idx)=>{
      const item = entry.item;
      const kindLabel = getKindLabel(item.kind);
      const kindClass = item.kind === 'temple' ? 'plan-kind temple' : 'plan-kind';
      const timeText = `${formatMinutes(entry.arrive)} - ${formatMinutes(entry.depart)}`;
      const meta = [item.area, item.category].filter(Boolean).join(' · ');
      const mapLink = buildPlaceLink(item);
      const distanceText = `${entry.distKm.toFixed(1)} km / 約 ${entry.travelMin} 分`;
      return `
        <div class="plan-card">
          <div class="plan-row">
            <div class="plan-time">${escapeHtml(timeText)}</div>
            <div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <h3 class="plan-title">${escapeHtml(item.name || '')}</h3>
                <span class="${kindClass}">${escapeHtml(kindLabel)}</span>
                ${state.mustIds.has(item.id) ? '<span class="plan-kind" style="background:#f1f5f9;border-color:#cbd5f5;color:#475569;">必去</span>' : ''}
              </div>
              ${meta ? `<div class="plan-meta">${escapeHtml(meta)}</div>` : ''}
              <div class="plan-meta">移動：${escapeHtml(distanceText)} · 停留 ${escapeHtml(String(entry.stayMin))} 分</div>
              <div class="plan-actions">
                ${mapLink ? `<a class="pill-btn" href="${escapeHtml(mapLink)}" target="_blank" rel="noopener">地圖</a>` : ''}
                <button class="pill-btn" type="button" data-move="up" data-idx="${idx}">上移</button>
                <button class="pill-btn" type="button" data-move="down" data-idx="${idx}">下移</button>
              </div>
              <div class="plan-edit">
                <label>停留(分)</label>
                <input type="number" min="10" step="5" value="${escapeHtml(String(entry.stayMin))}" data-stay-input="${idx}">
                <button class="pill-btn" type="button" data-stay-update="${idx}">更新</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const skippedItems = (planData.skippedMust || [])
      .map(id => findItemById(id))
      .filter(Boolean);
    const warning = skippedItems.length
      ? `<div class="must-warning">
          必去點未排入（${skippedItems.length}）：請延長時間或調整條件。
          <div class="must-warning-list">
            ${skippedItems.map(item => `<span class="must-warning-chip">${escapeHtml(item.name || '')}</span>`).join('')}
          </div>
        </div>`
      : '';

    const timeSourceTag = planData.googleApplied
      ? '<span class="tag">時間：Google ETA</span>'
      : (planData.googlePending ? '<span class="tag">時間：Google ETA 計算中</span>' : '<span class="tag">時間：估算</span>');

    resultEl.innerHTML = `
      <div class="plan-cover">
        <div>
          <div class="plan-cover-title">泰國一日行程</div>
          <div class="plan-cover-sub">${escapeHtml(today)} · ${escapeHtml(startTimeLabel)} - ${escapeHtml(endTimeLabel)}</div>
        </div>
        <div class="plan-cover-grid">
          <div class="plan-cover-badge">
            <span>起點</span>
            ${escapeHtml(state.startLabel || '自訂位置')}
          </div>
          <div class="plan-cover-badge">
            <span>模式</span>
            ${escapeHtml(modeLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>比例</span>
            ${escapeHtml(ratioLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>交通</span>
            ${escapeHtml(transportLabel)}
          </div>
        </div>
      </div>
      <div class="plan-summary">
        <span class="tag">起點：${escapeHtml(state.startLabel || '自訂位置')}</span>
        <span class="tag">美食 ${foodCount} / 寺廟 ${templeCount}${spotCount ? ` / 景點 ${spotCount}` : ''}</span>
        <span class="tag">停留 ${totalStay} 分 / 移動 ${totalTravel} 分</span>
        ${timeSourceTag}
        ${routeUrl ? `<a class="pill-btn" href="${escapeHtml(routeUrl)}" target="_blank" rel="noopener">開啟路線</a>` : ''}
      </div>
      ${endOverrun ? `<div class="planner-hint" style="color:#b91c1c;">依目前預估會超過結束時間約 ${Math.ceil(endOverrun)} 分鐘。</div>` : ''}
      ${warning}
      ${listHtml}
    `;

    resultEl.querySelectorAll('[data-move]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.getAttribute('data-idx'));
        const dir = btn.getAttribute('data-move');
        movePlanItem(idx, dir === 'up' ? -1 : 1);
      });
    });
    resultEl.querySelectorAll('[data-stay-update]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.getAttribute('data-stay-update'));
        const input = resultEl.querySelector(`[data-stay-input="${idx}"]`);
        if (!input) return;
        const val = parseInt(input.value, 10);
        if (!Number.isFinite(val) || val <= 0) return;
        applyStayChange(idx, val);
      });
    });

    state.currentPlan = plan;
    state.currentSummary = planData;
    updateShareLink(planData);
    if (!opts || !opts.skipGoogle) maybeApplyGoogleTimes(planData);
  }

  function movePlanItem(idx, delta){
    if (!state.currentPlan || !state.currentPlan.length) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= state.currentPlan.length) return;
    const plan = state.currentPlan.slice();
    const temp = plan[idx];
    plan[idx] = plan[nextIdx];
    plan[nextIdx] = temp;
    const planData = Object.assign({}, state.currentSummary || {}, { plan });
    const transport = planData.transport || getTransportSettings(planData.transportMode || 'driving');
    recomputeTravelStats(plan, state.startCoords, transport);
    recomputeTimes(plan, planData.startMin || 0);
    renderPlan(planData);
  }

  function applyStayChange(idx, newVal){
    if (!state.currentSummary || !state.currentSummary.plan) return;
    const plan = state.currentSummary.plan.slice();
    if (!plan[idx]) return;
    plan[idx].stayMin = newVal;
    recomputeTimes(plan, state.currentSummary.startMin || 0);
    const planData = Object.assign({}, state.currentSummary, { plan });
    renderPlan(planData, { skipGoogle: true });
  }

  async function geocodeQuery(query){
    const q = String(query || '').trim();
    if (!q) return null;
    const res = await fetch(`/api/geo?q=${encodeURIComponent(q)}`, { credentials:'include' });
    const data = await res.json().catch(()=>({}));
    if (!data || !data.ok || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
    return { lat: data.lat, lng: data.lng, label: data.display_name || q };
  }

  async function resolveStartCoords(){
    if (state.startCoords) return state.startCoords;
    const query = (startInput && startInput.value || '').trim();
    if (!query){
      setStatus('請輸入起點位置', true);
      return null;
    }
    setStatus('定位中…');
    const geo = await geocodeQuery(query);
    if (!geo){
      setStatus('找不到此位置，請換個關鍵字', true);
      return null;
    }
    state.startCoords = { lat: geo.lat, lng: geo.lng };
    state.startLabel = geo.label;
    if (startInput) startInput.value = geo.label || query;
    setStatus(`已定位：${geo.label}`);
    return state.startCoords;
  }

  function getActiveItems(){
    const base = applyFilters(state.foods.concat(state.temples));
    const custom = state.customItems || [];
    return base.concat(custom);
  }

  async function generatePlan(){
    if (!state.ready){
      setStatus('資料尚未載入完成，請稍後再試', true);
      return false;
    }
    const startMin = timeInputToMinutes(startTimeInput && startTimeInput.value);
    const endMin = timeInputToMinutes(endTimeInput && endTimeInput.value);
    if (startMin === null || endMin === null){
      setStatus('請填寫開始與結束時間', true);
      return false;
    }
    if (endMin <= startMin){
      setStatus('結束時間需大於開始時間', true);
      return false;
    }
    const origin = await resolveStartCoords();
    if (!origin) return false;

    const modeValue = modeSelect ? modeSelect.value : 'balance';
    const transportMode = transportSelect ? transportSelect.value : 'driving';
    const ratioValue = ratioSelect ? ratioSelect.value : '1-1';
    const modeSettings = applyModeSettings(modeValue);
    const transport = getTransportSettings(transportMode);
    const ratio = parseRatio(ratioValue);
    let items = getActiveItems();
    if (ratio.food === 0) items = items.filter(item => kindForRatio(item.kind) !== 'food');
    if (ratio.temple === 0) items = items.filter(item => item.kind !== 'temple');
    const settings = { modeSettings, transport, ratio, mustSet: new Set(state.mustIds) };
    const planData = buildPlan(origin, startMin, endMin, items, settings);
    planData.travelMode = transport.travelMode;
    planData.transport = transport;
    planData.transportMode = transportMode;
    planData.mode = modeValue;
    planData.ratioValue = ratioValue;
    renderPlan(planData);
    if (planData.plan && planData.plan.length){
      setStatus('已產生行程');
    }
    return true;
  }

  function encodePayload(payload){
    const json = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return encoded;
  }

  function decodePayload(input){
    try{
      const pad = input.length % 4;
      const base64 = (input + (pad ? '='.repeat(4 - pad) : ''))
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json);
    }catch(_){
      return null;
    }
  }

  function buildSharePayload(planData){
    const plan = planData.plan || [];
    return {
      startLabel: state.startLabel,
      startCoords: state.startCoords,
      startTime: startTimeInput ? startTimeInput.value : '',
      endTime: endTimeInput ? endTimeInput.value : '',
      mode: modeSelect ? modeSelect.value : 'balance',
      ratio: ratioSelect ? ratioSelect.value : '1-1',
      transport: transportSelect ? transportSelect.value : 'driving',
      plan: plan.map(entry => ({
        item: {
          id: entry.item.id,
          name: entry.item.name,
          kind: entry.item.kind,
          area: entry.item.area,
          category: entry.item.category,
          coords: entry.item.coords,
          maps: entry.item.maps,
          googlePlaceId: entry.item.googlePlaceId
        },
        arrive: entry.arrive,
        depart: entry.depart,
        travelMin: entry.travelMin,
        distKm: entry.distKm,
        stayMin: entry.stayMin
      }))
    };
  }

  function updateShareLink(planData){
    if (!shareLinkInput) return;
    const payload = buildSharePayload(planData);
    const encoded = encodePayload(payload);
    const url = `${location.origin}${location.pathname}?plan=${encoded}`;
    shareLinkInput.value = url;
  }

  function applySharedPlan(payload){
    if (!payload) return;
    state.startCoords = payload.startCoords || null;
    state.startLabel = payload.startLabel || '';
    if (startInput && payload.startLabel) startInput.value = payload.startLabel;
    if (startTimeInput && payload.startTime) startTimeInput.value = payload.startTime;
    if (endTimeInput && payload.endTime) endTimeInput.value = payload.endTime;
    if (modeSelect && payload.mode) modeSelect.value = payload.mode;
    if (ratioSelect && payload.ratio) ratioSelect.value = payload.ratio;
    if (transportSelect && payload.transport) transportSelect.value = payload.transport;
    if (payload.mode) selectMode(payload.mode);

    const plan = (payload.plan || []).map(entry => ({
      item: Object.assign({}, entry.item, {
        coords: entry.item.coords || null,
        stayMin: entry.stayMin || DEFAULT_STAY[entry.item.kind] || 60,
        isCustom: true
      }),
      arrive: entry.arrive,
      depart: entry.depart,
      travelMin: entry.travelMin || 0,
      distKm: entry.distKm || 0,
      stayMin: entry.stayMin || DEFAULT_STAY[entry.item.kind] || 60
    }));

    state.currentPlan = plan;
    const transportMode = payload.transport || 'driving';
    const transport = getTransportSettings(transportMode);
    const startMin = payload.startTime ? timeInputToMinutes(payload.startTime) : null;
    const endMin = payload.endTime ? timeInputToMinutes(payload.endTime) : null;
    if (state.startCoords) recomputeTravelStats(plan, state.startCoords, transport);
    if (Number.isFinite(startMin)) recomputeTimes(plan, startMin);
    state.currentSummary = {
      plan,
      travelMode: transport.travelMode,
      transport,
      transportMode,
      mode: payload.mode || 'balance',
      ratioValue: payload.ratio || '1-1',
      startMin: Number.isFinite(startMin) ? startMin : 0,
      endMin: Number.isFinite(endMin) ? endMin : 0,
      skippedMust: []
    };
    if (payload.startCoords && payload.startLabel) setStatus(`已載入分享行程：${payload.startLabel}`);
    renderPlan(state.currentSummary);
    showStep(4);
  }

  function shareToLine(){
    if (!state.currentSummary || !state.currentSummary.plan || !state.currentSummary.plan.length){
      setStatus('請先產生行程', true);
      return;
    }
    const foodCount = state.currentSummary.plan.filter(p => p.item.kind === 'food').length;
    const templeCount = state.currentSummary.plan.filter(p => p.item.kind === 'temple').length;
    const spotCount = state.currentSummary.plan.filter(p => p.item.kind === 'spot').length;
    const shareUrl = shareLinkInput ? shareLinkInput.value : location.href;
    const spotText = spotCount ? ` / 景點 ${spotCount}` : '';
    const text = `泰國一日行程：美食 ${foodCount} / 寺廟 ${templeCount}${spotText}\n起點：${state.startLabel || '自訂位置'}\n${shareUrl}`;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank');
  }

  function saveCurrentPlan(){
    if (!state.currentSummary || !state.currentSummary.plan || !state.currentSummary.plan.length){
      setStatus('請先產生行程', true);
      return;
    }
    const defaultName = `${new Date().toLocaleDateString('zh-TW')} 行程`;
    const name = prompt('請輸入行程名稱', defaultName) || '';
    if (!name) return;
    const record = {
      id: `plan_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      startLabel: state.startLabel,
      startCoords: state.startCoords,
      startTime: startTimeInput ? startTimeInput.value : '',
      endTime: endTimeInput ? endTimeInput.value : '',
      mode: modeSelect ? modeSelect.value : 'balance',
      ratio: ratioSelect ? ratioSelect.value : '1-1',
      transport: transportSelect ? transportSelect.value : 'driving',
      plan: state.currentSummary.plan
    };
    state.savedPlans.unshift(record);
    persistSavedPlans();
    renderSavedPlans();
    setStatus(`已儲存：${name}`);
  }

  function persistSavedPlans(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedPlans));
    }catch(_){ }
  }

  function loadSavedPlans(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) state.savedPlans = list;
    }catch(_){ }
  }

  function renderSavedPlans(){
    if (!savedList) return;
    if (!state.savedPlans.length){
      savedList.innerHTML = '<div class="planner-hint">尚未儲存行程。</div>';
      return;
    }
    savedList.innerHTML = state.savedPlans.map(plan => {
      const created = plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('zh-TW') : '';
      const meta = [created, plan.startLabel].filter(Boolean).join(' · ');
      return `
        <div class="saved-item">
          <div>
            <div class="saved-title">${escapeHtml(plan.name || '')}</div>
            <div class="saved-meta">${escapeHtml(meta)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="pill-btn" type="button" data-load-plan="${escapeHtml(plan.id)}">載入</button>
            <button class="pill-btn" type="button" data-delete-plan="${escapeHtml(plan.id)}">刪除</button>
          </div>
        </div>
      `;
    }).join('');

    savedList.querySelectorAll('[data-load-plan]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-load-plan') || '';
        const plan = state.savedPlans.find(p => p.id === id);
        if (plan) applySavedPlan(plan);
      });
    });
    savedList.querySelectorAll('[data-delete-plan]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-delete-plan') || '';
        state.savedPlans = state.savedPlans.filter(p => p.id !== id);
        persistSavedPlans();
        renderSavedPlans();
      });
    });
  }

  function applySavedPlan(plan){
    state.startCoords = plan.startCoords || null;
    state.startLabel = plan.startLabel || '';
    if (startInput && plan.startLabel) startInput.value = plan.startLabel;
    if (startTimeInput && plan.startTime) startTimeInput.value = plan.startTime;
    if (endTimeInput && plan.endTime) endTimeInput.value = plan.endTime;
    if (modeSelect && plan.mode) modeSelect.value = plan.mode;
    if (ratioSelect && plan.ratio) ratioSelect.value = plan.ratio;
    if (transportSelect && plan.transport) transportSelect.value = plan.transport;
    if (plan.mode) selectMode(plan.mode);
    const transportMode = plan.transport || 'driving';
    const transport = getTransportSettings(transportMode);
    const startMin = plan.startTime ? timeInputToMinutes(plan.startTime) : null;
    const endMin = plan.endTime ? timeInputToMinutes(plan.endTime) : null;
    const planItems = (plan.plan || []).map(entry => ({
      item: entry.item,
      arrive: entry.arrive,
      depart: entry.depart,
      travelMin: entry.travelMin || 0,
      distKm: entry.distKm || 0,
      stayMin: entry.stayMin || entry.item.stayMin || DEFAULT_STAY[entry.item.kind] || 60
    }));
    if (state.startCoords) recomputeTravelStats(planItems, state.startCoords, transport);
    if (Number.isFinite(startMin)) recomputeTimes(planItems, startMin);
    state.currentSummary = {
      plan: planItems,
      travelMode: transport.travelMode,
      transport,
      transportMode,
      mode: plan.mode || 'balance',
      ratioValue: plan.ratio || '1-1',
      startMin: Number.isFinite(startMin) ? startMin : 0,
      endMin: Number.isFinite(endMin) ? endMin : 0,
      skippedMust: []
    };
    renderPlan(state.currentSummary);
    showStep(4);
  }

  function updateMapPlaceInfo(place){
    if (!mapPlaceInfo) return;
    if (!place){
      mapPlaceInfo.textContent = '尚未選擇地點。';
      return;
    }
    const lines = [place.name, place.address].filter(Boolean).join(' · ');
    mapPlaceInfo.textContent = lines || '已選擇地點';
  }

  function addCustomPlace(){
    if (!state.selectedMapPlace) return;
    const type = mapPlaceType ? mapPlaceType.value : 'spot';
    const existing = state.foods.concat(state.temples).find(item => {
      if (state.selectedMapPlace.placeId && item.googlePlaceId) {
        return item.googlePlaceId === state.selectedMapPlace.placeId;
      }
      return item.name === state.selectedMapPlace.name;
    });
    if (existing){
      addMustItem(existing);
      setStatus(`已加入：${existing.name}`);
      return;
    }
    const item = buildCustomItem(state.selectedMapPlace, type);
    const exists = state.customItems.find(x => x.id === item.id);
    if (!exists){
      state.customItems.push(item);
    }
    addMustItem(item);
    setStatus(`已加入：${item.name}`);
  }

  function initGoogleMaps(){
    if (!window.google || !window.google.maps || !mapCanvas) return;
    state.googleReady = true;
    mapCanvas.textContent = '';
    state.googleMap = new google.maps.Map(mapCanvas, {
      center: { lat: 13.7563, lng: 100.5018 },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    });
    state.googleMarker = new google.maps.Marker({ map: state.googleMap });
    if (mapSearchInput){
      state.googleAutocomplete = new google.maps.places.Autocomplete(mapSearchInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'th' }
      });
      state.googleAutocomplete.addListener('place_changed', ()=>{
        const place = state.googleAutocomplete.getPlace();
        const loc = place && place.geometry && place.geometry.location;
        if (!loc) return;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        const label = place.formatted_address || place.name || mapSearchInput.value.trim();
        state.googleMap.setCenter(coords);
        state.googleMap.setZoom(14);
        state.googleMarker.setPosition(coords);
        state.selectedMapPlace = {
          name: place.name || label,
          address: label,
          lat: coords.lat,
          lng: coords.lng,
          placeId: place.place_id || '',
          rating: place.rating || ''
        };
        if (btnAddMapPlace) btnAddMapPlace.disabled = false;
        updateMapPlaceInfo(state.selectedMapPlace);
      });
    }
  }

  async function getGoogleMapsKey(){
    if (state.googleMapsKey) return state.googleMapsKey;
    try{
      const res = await fetch('/api/maps-key', { cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data && data.ok && data.key){
        state.googleMapsKey = data.key;
        return state.googleMapsKey;
      }
      if (mapPlaceInfo){
        mapPlaceInfo.textContent = res.status ? `地圖載入失敗（${res.status}）` : '地圖載入失敗';
      }
    }catch(_){ }
    return '';
  }

  async function ensureGoogleMaps(){
    if (state.googleReady && window.google && window.google.maps) return true;
    if (state.googleLoadingPromise) return state.googleLoadingPromise;
    state.googleLoadingPromise = new Promise(async (resolve) => {
      if (mapPlaceInfo) mapPlaceInfo.textContent = '地圖載入中…';
      const key = await getGoogleMapsKey();
      if (!key){
        if (mapPlaceInfo) mapPlaceInfo.textContent = '未設定 Google Maps Key';
        resolve(false);
        return;
      }
      if (window.google && window.google.maps) {
        initGoogleMaps();
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=initDayTripMaps`;
      window.initDayTripMaps = () => {
        initGoogleMaps();
        resolve(true);
      };
      script.onerror = () => {
        if (mapPlaceInfo) mapPlaceInfo.textContent = '地圖載入失敗';
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return state.googleLoadingPromise;
  }

  async function loadData(){
    setStatus('資料載入中…');
    try{
      const [foodsRes, templesRes] = await Promise.all([
        fetch('/api/foods', { credentials:'include' }),
        fetch('/api/temples', { credentials:'include' })
      ]);
      const foodsData = await foodsRes.json().catch(()=>({}));
      const templesData = await templesRes.json().catch(()=>({}));
      state.foods = normalizeItems(foodsData.items || [], 'food');
      state.temples = normalizeItems(templesData.items || [], 'temple');
      state.ready = true;
      renderFilterOptions();
      setStatus(`已載入 ${state.foods.length} 家美食、${state.temples.length} 間寺廟`);
    }catch(err){
      setStatus(`資料載入失敗：${err.message}`, true);
      state.ready = false;
    }
  }

  if (mustSearchInput){
    mustSearchInput.addEventListener('input', (e)=>{
      renderMustSearchResults(e.target.value);
    });
  }

  function selectMode(mode){
    if (modeSelect) modeSelect.value = mode;
    if (!modeCards) return;
    modeCards.querySelectorAll('.mode-card').forEach(card=>{
      card.classList.toggle('is-selected', card.getAttribute('data-mode') === mode);
    });
  }

  if (modeCards){
    modeCards.querySelectorAll('.mode-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        const mode = card.getAttribute('data-mode') || 'balance';
        selectMode(mode);
      });
    });
  }

  if (stepper){
    stepPills.forEach(pill=>{
      pill.addEventListener('click', ()=>{
        const step = Number(pill.getAttribute('data-step-pill'));
        if (Number.isFinite(step)) showStep(step);
      });
    });
  }

  if (btnLocate){
    btnLocate.addEventListener('click', () => {
      if (!navigator.geolocation){
        setStatus('瀏覽器不支援定位', true);
        return;
      }
      setStatus('定位中…');
      navigator.geolocation.getCurrentPosition((pos)=>{
        state.startCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.startLabel = '我的位置';
        if (startInput) startInput.value = '我的位置';
        setStatus('已取得定位');
      }, ()=>{
        setStatus('定位失敗，請允許定位權限', true);
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }
  if (startInput){
    startInput.addEventListener('input', ()=>{
      state.startCoords = null;
      state.startLabel = '';
    });
  }

  if (btnGenerate){
    btnGenerate.addEventListener('click', ()=>{ generatePlan(); });
  }
  if (btnStep1Next){
    btnStep1Next.addEventListener('click', ()=>{
      if (!validateStep1()) return;
      showStep(2);
    });
  }
  if (btnStep2Back){
    btnStep2Back.addEventListener('click', ()=>{ showStep(1); });
  }
  if (btnStep2Next){
    btnStep2Next.addEventListener('click', ()=>{ showStep(3); });
  }
  if (btnStep3Back){
    btnStep3Back.addEventListener('click', ()=>{ showStep(2); });
  }
  if (btnStep3Next){
    btnStep3Next.addEventListener('click', async ()=>{
      if (!validateStep1()) return;
      const ok = await generatePlan();
      if (ok) showStep(4);
    });
  }
  if (btnStep4Back){
    btnStep4Back.addEventListener('click', ()=>{ showStep(3); });
  }
  if (btnSavePlan){
    btnSavePlan.addEventListener('click', saveCurrentPlan);
  }
  if (btnPrint){
    btnPrint.addEventListener('click', ()=>{ window.print(); });
  }
  if (btnShareLine){
    btnShareLine.addEventListener('click', shareToLine);
  }
  if (btnCopyShare){
    btnCopyShare.addEventListener('click', ()=>{
      if (shareLinkInput && shareLinkInput.value){
        if (typeof copyToClipboard === 'function') copyToClipboard(shareLinkInput.value);
        setStatus('已複製分享連結');
      }
    });
  }
  if (btnAddMapPlace){
    btnAddMapPlace.addEventListener('click', addCustomPlace);
  }

  loadSavedPlans();
  renderSavedPlans();
  loadData().then(()=>{
    renderMustList();
    renderRecommendedList();
    selectMode(modeSelect ? modeSelect.value : 'balance');
    ensureGoogleMaps().then(()=>{
      if (state.currentSummary) maybeApplyGoogleTimes(state.currentSummary);
    });
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('plan');
    if (encoded){
      const payload = decodePayload(encoded);
      if (payload) applySharedPlan(payload);
    }
    showStep(1);
  });
})();
