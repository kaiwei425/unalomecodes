(function(){
  const statusEl = document.getElementById('statusText');
  const resultEl = document.getElementById('resultPanel');
  const startInput = document.getElementById('startLocation');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const btnLocate = document.getElementById('btnLocate');
  const btnGenerate = document.getElementById('btnGenerate');
  const DEFAULT_STAY = { food: 60, temple: 45 };
  const FOOD_SLOT_ORDER = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const TEMPLE_SLOT_ORDER = ['morning', 'afternoon', 'evening'];

  const state = {
    foods: [],
    temples: [],
    ready: false,
    startCoords: null,
    startLabel: ''
  };

  function setStatus(text, isError){
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? '#b91c1c' : '';
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
    const inferred = inferSlotsFromHours(item.hours, windows, FOOD_SLOT_ORDER, null);
    return inferred;
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
          id: item.id,
          name: item.name || '',
          category: item.category || '',
          area: item.area || '',
          rating: item.rating || '',
          maps: item.maps || '',
          googlePlaceId: item.googlePlaceId || item.google_place_id || '',
          hours: item.hours || '',
          kind,
          coords,
          stayMin,
          openSlotsResolved
        };
      })
      .filter(Boolean);
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
      setStatus(`已載入 ${state.foods.length} 家美食、${state.temples.length} 間寺廟`);
    }catch(err){
      setStatus(`資料載入失敗：${err.message}`, true);
      state.ready = false;
    }
  }

  function getPreferredKind(minutes, lastKinds){
    const hour = minutes / 60;
    if (hour < 12) return 'temple';
    if (hour < 14) return 'food';
    if (hour < 18) {
      const last = lastKinds[lastKinds.length - 1];
      return last === 'food' ? 'temple' : 'food';
    }
    return 'food';
  }

  function pickNextItem(candidates, currentCoords, preferredKind){
    let pool = candidates.filter(it => it.kind === preferredKind);
    if (!pool.length) pool = candidates;
    let best = null;
    let bestScore = Infinity;
    pool.forEach(item => {
      const dist = haversineKm(currentCoords, item.coords);
      const rating = Number(item.rating) || 0;
      const score = dist - (rating * 0.02);
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    });
    return best;
  }

  function buildPlan(origin, startMin, endMin, items){
    const used = new Set();
    const plan = [];
    let currentTime = startMin;
    let currentCoords = origin;
    const lastKinds = [];
    const totalMinutes = endMin - startMin;
    const maxStops = Math.min(10, Math.max(3, Math.floor(totalMinutes / 90)));

    for (let i = 0; i < maxStops; i++){
      const candidates = items.filter(item => {
        if (!item || !item.id || used.has(item.id)) return false;
        return isOpenAt(item, currentTime);
      });
      const fallback = candidates.length >= 3 ? candidates : items.filter(item => item && item.id && !used.has(item.id));
      if (!fallback.length) break;
      const preferred = getPreferredKind(currentTime, lastKinds);
      const next = pickNextItem(fallback, currentCoords, preferred);
      if (!next) break;
      const distKm = haversineKm(currentCoords, next.coords);
      const travelMin = Math.max(10, Math.round(distKm * 4));
      const arrive = currentTime + travelMin;
      const depart = arrive + next.stayMin;
      if (depart > endMin) break;
      plan.push({
        item: next,
        arrive,
        depart,
        travelMin,
        distKm
      });
      used.add(next.id);
      currentCoords = next.coords;
      currentTime = depart;
      lastKinds.push(next.kind);
      if (lastKinds.length > 2) lastKinds.shift();
    }
    return plan;
  }

  function buildMultiStopUrl(origin, plan){
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
    params.set('travelmode', 'driving');
    return `${base}&${params.toString()}`;
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

  function renderPlan(plan, originLabel){
    if (!resultEl) return;
    if (!plan.length){
      resultEl.innerHTML = '<div class="result-empty">找不到符合時間的行程，請調整時間或地點再試一次。</div>';
      return;
    }
    const foodCount = plan.filter(p => p.item.kind === 'food').length;
    const templeCount = plan.filter(p => p.item.kind === 'temple').length;
    const totalStay = plan.reduce((sum, p)=> sum + p.item.stayMin, 0);
    const totalTravel = plan.reduce((sum, p)=> sum + p.travelMin, 0);
    const routeUrl = buildMultiStopUrl(state.startCoords, plan);

    const listHtml = plan.map((entry, idx)=>{
      const item = entry.item;
      const kindLabel = item.kind === 'temple' ? '寺廟' : '美食';
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
              </div>
              ${meta ? `<div class="plan-meta">${escapeHtml(meta)}</div>` : ''}
              <div class="plan-meta">移動：${escapeHtml(distanceText)} · 建議停留 ${escapeHtml(String(item.stayMin))} 分</div>
              <div class="plan-actions">
                ${mapLink ? `<a class="pill-btn" href="${escapeHtml(mapLink)}" target="_blank" rel="noopener">地圖</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    resultEl.innerHTML = `
      <div class="plan-summary">
        <span class="tag">起點：${escapeHtml(originLabel || '自訂位置')}</span>
        <span class="tag">美食 ${foodCount} / 寺廟 ${templeCount}</span>
        <span class="tag">停留 ${totalStay} 分 / 移動 ${totalTravel} 分</span>
        ${routeUrl ? `<a class="pill-btn" href="${escapeHtml(routeUrl)}" target="_blank" rel="noopener">開啟路線</a>` : ''}
      </div>
      ${listHtml}
    `;

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

  async function generatePlan(){
    if (!state.ready){
      setStatus('資料尚未載入完成，請稍後再試', true);
      return;
    }
    const startMin = timeInputToMinutes(startTimeInput && startTimeInput.value);
    const endMin = timeInputToMinutes(endTimeInput && endTimeInput.value);
    if (startMin === null || endMin === null){
      setStatus('請填寫開始與結束時間', true);
      return;
    }
    if (endMin <= startMin){
      setStatus('結束時間需大於開始時間', true);
      return;
    }
    const origin = await resolveStartCoords();
    if (!origin) return;
    const items = state.foods.concat(state.temples);
    const plan = buildPlan(origin, startMin, endMin, items);
    renderPlan(plan, state.startLabel);
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

  if (btnGenerate){
    btnGenerate.addEventListener('click', ()=>{ generatePlan(); });
  }

  loadData();
})();
