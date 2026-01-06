(function(){
  const originInput = document.getElementById('originInput');
  const destinationInput = document.getElementById('destinationInput');
  const transitPreference = document.getElementById('transitPreference');
  const departTimeInput = document.getElementById('departTime');
  const btnUseLocation = document.getElementById('btnUseLocation');
  const btnSearchRoute = document.getElementById('btnSearchRoute');
  const routeStatus = document.getElementById('routeStatus');
  const routeSummary = document.getElementById('routeSummary');
  const routeSteps = document.getElementById('routeSteps');
  const stationResults = document.getElementById('stationResults');
  const transitMapSvg = document.getElementById('transitMapSvg');
  const mapTabs = document.getElementById('mapTabs');
  const mapTools = document.getElementById('mapTools');
  const btsMapImg = document.getElementById('btsMapImg');
  const mrtMapImg = document.getElementById('mrtMapImg');
  const mapScaleLabel = document.getElementById('mapScaleLabel');
  const routeMapFrame = document.getElementById('routeMapFrame');
  const routeStationList = document.getElementById('routeStationList');
  const routeStationHint = document.getElementById('routeStationHint');

  const SEARCH_RADIUS_KM = 0.8;
  const MAX_NEARBY = 4;

  const state = {
    foods: [],
    temples: [],
    ready: false,
    googleReady: false,
    googleMapsKey: '',
    googleLoadingPromise: null,
    directionsService: null,
    originPlace: null,
    destinationPlace: null,
    mapLines: new Map(),
    stationNodes: new Map(),
    stationIndex: new Map(),
    pendingGeo: new Map()
  };

  const stationLineMap = new Map();
  const mapView = { scale: 1, baseWidth: 0 };

  const LINE_DEFS = [
    {
      key: 'bts_sukhumvit',
      label: 'BTS Sukhumvit',
      color: '#22c55e',
      path: [[120, 80], [760, 430]],
      stations: [
        'Khu Khot', 'Yaek Kor Por Aor', 'Royal Thai Air Force Museum', 'Bhumibol Adulyadej Hospital',
        'Saphan Mai', 'Sai Yud', 'Phahon Yothin 59', 'Wat Phra Sri Mahathat',
        '11th Infantry Regiment', 'Bang Bua', 'Royal Forest Department', 'Kasetsart University',
        'Sena Nikhom', 'Ratchayothin', 'Phahon Yothin 24', 'Ha Yaek Lat Phrao',
        'Mo Chit', 'Saphan Khwai', 'Ari', 'Sanam Pao', 'Victory Monument',
        'Phaya Thai', 'Ratchathewi', 'Siam', 'Chit Lom', 'Phloen Chit',
        'Nana', 'Asok', 'Phrom Phong', 'Thong Lo', 'Ekkamai',
        'Phra Khanong', 'On Nut', 'Bang Chak', 'Punnawithi', 'Udom Suk',
        'Bang Na', 'Bearing', 'Samrong', 'Pu Chao', 'Chang Erawan',
        'Royal Thai Naval Academy', 'Pak Nam', 'Srinagarindra', 'Phraek Sa',
        'Sai Luat', 'Kheha'
      ]
    },
    {
      key: 'bts_silom',
      label: 'BTS Silom',
      color: '#16a34a',
      path: [[160, 160], [520, 160], [520, 350], [430, 430]],
      stations: [
        'National Stadium', 'Siam', 'Ratchadamri', 'Sala Daeng', 'Chong Nonsi',
        'Saint Louis', 'Surasak', 'Saphan Taksin', 'Krung Thon Buri',
        'Wongwian Yai', 'Pho Nimit', 'Talat Phlu', 'Wutthakat', 'Bang Wa'
      ]
    },
    {
      key: 'mrt_blue',
      label: 'MRT Blue',
      color: '#2563eb',
      path: [[240, 420], [240, 260], [360, 180], [540, 180], [660, 260], [660, 420], [540, 480], [360, 480], [240, 420]],
      stations: [
        'Tha Phra', 'Charan 13', 'Fai Chai', 'Bang Khun Non', 'Bang Yi Khan',
        'Sirindhorn', 'Bang Phlat', 'Bang O', 'Bang Pho', 'Tao Poon',
        'Bang Sue', 'Kamphaeng Phet', 'Chatuchak Park', 'Phahon Yothin',
        'Lat Phrao', 'Ratchadaphisek', 'Sutthisan', 'Huai Khwang',
        'Thailand Cultural Centre', 'Phra Ram 9', 'Phetchaburi', 'Sukhumvit',
        'Queen Sirikit National Convention Centre', 'Khlong Toei', 'Lumphini',
        'Si Lom', 'Sam Yan', 'Hua Lamphong', 'Wat Mangkon', 'Sam Yot',
        'Sanam Chai', 'Itsaraphap', 'Tha Phra', 'Bang Phai', 'Bang Wa',
        'Phetkasem 48', 'Phasi Charoen', 'Bang Khae', 'Lak Song'
      ]
    },
    {
      key: 'arl',
      label: 'Airport Rail Link',
      color: '#ef4444',
      path: [[300, 60], [300, 500]],
      stations: [
        'Suvarnabhumi', 'Lat Krabang', 'Ban Thap Chang', 'Hua Mak',
        'Ramkhamhaeng', 'Makkasan', 'Ratchaprarop', 'Phaya Thai'
      ]
    }
  ];

  const STATION_COORDS = {
    'Mo Chit': { lat:13.8025, lng:100.5536 },
    'Saphan Khwai': { lat:13.7936, lng:100.5500 },
    'Ari': { lat:13.7794, lng:100.5447 },
    'Victory Monument': { lat:13.7628, lng:100.5374 },
    'Phaya Thai': { lat:13.7566, lng:100.5347 },
    'Siam': { lat:13.7456, lng:100.5341 },
    'Chit Lom': { lat:13.7440, lng:100.5447 },
    'Phloen Chit': { lat:13.7430, lng:100.5484 },
    'Nana': { lat:13.7405, lng:100.5559 },
    'Asok': { lat:13.7367, lng:100.5606 },
    'Phrom Phong': { lat:13.7306, lng:100.5692 },
    'Thong Lo': { lat:13.7245, lng:100.5780 },
    'Ekkamai': { lat:13.7191, lng:100.5853 },
    'On Nut': { lat:13.7056, lng:100.6008 },
    'Bearing': { lat:13.6610, lng:100.6012 },
    'National Stadium': { lat:13.7463, lng:100.5290 },
    'Ratchadamri': { lat:13.7394, lng:100.5399 },
    'Sala Daeng': { lat:13.7294, lng:100.5365 },
    'Chong Nonsi': { lat:13.7243, lng:100.5330 },
    'Saphan Taksin': { lat:13.7189, lng:100.5143 },
    'Krung Thon Buri': { lat:13.7209, lng:100.5048 },
    'Wongwian Yai': { lat:13.7211, lng:100.4957 },
    'Pho Nimit': { lat:13.7196, lng:100.4861 },
    'Talat Phlu': { lat:13.7142, lng:100.4766 },
    'Wutthakat': { lat:13.7131, lng:100.4680 },
    'Bang Wa': { lat:13.7209, lng:100.4576 },
    'Bang Sue': { lat:13.8033, lng:100.5390 },
    'Chatuchak Park': { lat:13.8030, lng:100.5532 },
    'Lat Phrao': { lat:13.8062, lng:100.5730 },
    'Sutthisan': { lat:13.7890, lng:100.5730 },
    'Huai Khwang': { lat:13.7778, lng:100.5734 },
    'Thailand Cultural Centre': { lat:13.7669, lng:100.5727 },
    'Phra Ram 9': { lat:13.7579, lng:100.5643 },
    'Phetchaburi': { lat:13.7486, lng:100.5630 },
    'Sukhumvit': { lat:13.7383, lng:100.5610 },
    'Queen Sirikit': { lat:13.7236, lng:100.5601 },
    'Queen Sirikit National Convention Centre': { lat:13.7236, lng:100.5601 },
    'Khlong Toei': { lat:13.7220, lng:100.5540 },
    'Lumphini': { lat:13.7251, lng:100.5446 },
    'Si Lom': { lat:13.7292, lng:100.5370 },
    'Sam Yan': { lat:13.7336, lng:100.5301 },
    'Hua Lamphong': { lat:13.7376, lng:100.5170 },
    'Ratchaprarop': { lat:13.7542, lng:100.5421 },
    'Makkasan': { lat:13.7503, lng:100.5616 },
    'Ramkhamhaeng': { lat:13.7486, lng:100.6007 },
    'Hua Mak': { lat:13.7376, lng:100.6453 },
    'Ban Thap Chang': { lat:13.7311, lng:100.6889 },
    'Lat Krabang': { lat:13.7287, lng:100.7508 },
    'Suvarnabhumi': { lat:13.6981, lng:100.7520 }
  };

  const LABEL_STATIONS = new Set([
    'Siam', 'Asok', 'Sukhumvit', 'Phaya Thai', 'Sala Daeng',
    'Chatuchak Park', 'Bang Sue', 'Makkasan', 'Suvarnabhumi'
  ]);

  function setStatus(text, isError){
    if (!routeStatus) return;
    routeStatus.textContent = text || '';
    routeStatus.style.color = isError ? '#b91c1c' : '';
  }

  function normalizeStationName(name){
    return String(name || '')
      .toLowerCase()
      .replace(/centre/g, 'center')
      .replace(/\bst\.?\b/g, 'saint')
      .replace(/station|站|bts|mrt|line|airport\s*rail\s*link|rail\s*link/g, '')
      .replace(/[^a-z0-9\u0E00-\u9FFF]/g, '')
      .trim();
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

  function formatDistance(km){
    if (!Number.isFinite(km)) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  }

  function getActiveMapImage(){
    if (btsMapImg && btsMapImg.classList.contains('is-active')) return btsMapImg;
    if (mrtMapImg && mrtMapImg.classList.contains('is-active')) return mrtMapImg;
    return btsMapImg || mrtMapImg || null;
  }

  function updateMapScaleLabel(){
    if (mapScaleLabel) mapScaleLabel.textContent = `${Math.round(mapView.scale * 100)}%`;
  }

  function fitMapToFrame(){
    if (!routeMapFrame) return;
    const img = getActiveMapImage();
    if (!img) return;
    const frameWidth = Math.max(200, routeMapFrame.clientWidth - 24);
    const natural = img.naturalWidth || frameWidth;
    mapView.baseWidth = Math.min(natural, frameWidth);
    mapView.scale = 1;
    img.style.width = `${Math.round(mapView.baseWidth)}px`;
    img.style.height = 'auto';
    updateMapScaleLabel();
  }

  function applyMapScale(){
    const img = getActiveMapImage();
    if (!img) return;
    if (!mapView.baseWidth) fitMapToFrame();
    const width = Math.max(200, Math.round(mapView.baseWidth * mapView.scale));
    img.style.width = `${width}px`;
    img.style.height = 'auto';
    updateMapScaleLabel();
  }

  function renderStationHighlightList(stopNames, transferNames){
    if (!routeStationList || !routeStationHint){
      return;
    }
    if (!stopNames || !stopNames.length){
      routeStationList.innerHTML = '';
      routeStationHint.textContent = '查詢後會顯示本站路線站名清單。';
      return;
    }
    const transferSet = new Set((transferNames || []).map(normalizeStationName));
    const startKey = normalizeStationName(stopNames[0]);
    const endKey = normalizeStationName(stopNames[stopNames.length - 1]);
    routeStationList.innerHTML = stopNames.map((name, idx) => {
      const key = normalizeStationName(name);
      const badges = [];
      let extraClass = '';
      if (key === startKey){
        badges.push('起點');
        extraClass = 'is-start';
      } else if (key === endKey){
        badges.push('終點');
        extraClass = 'is-end';
      } else if (transferSet.has(key)){
        badges.push('轉乘');
        extraClass = 'is-transfer';
      }
      return `
        <div class="station-chip ${extraClass}">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="station-index">${idx + 1}</span>
            <span>${escapeHtml(name)}</span>
          </div>
          <div class="station-badges">${badges.map(label => `<span class="station-badge">${label}</span>`).join('')}</div>
        </div>
      `;
    }).join('');
    routeStationHint.textContent = `共 ${stopNames.length} 站。`;
  }

  function normalizeItems(list, kind){
    return (Array.isArray(list) ? list : [])
      .filter(item => item && !item.deleted)
      .map(item => {
        const lat = Number(item.lat);
        const lng = Number(item.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          id: String(item.id || ''),
          name: item.name || '',
          category: item.category || '',
          area: item.area || '',
          rating: Number(item.rating) || 0,
          coords: { lat, lng },
          kind
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
      buildStationIndex();
      setStatus('請輸入出發地與目的地');
    }catch(err){
      setStatus(`資料載入失敗：${err.message}`, true);
      state.ready = false;
    }
  }

  function buildStationIndex(){
    state.stationIndex = new Map();
    Object.keys(STATION_COORDS).forEach(name => {
      const key = normalizeStationName(name);
      state.stationIndex.set(key, { name, coords: STATION_COORDS[name] });
    });
    buildStationLineMap();
  }

  function buildStationLineMap(){
    stationLineMap.clear();
    LINE_DEFS.forEach(line => {
      line.stations.forEach(name => {
        const key = normalizeStationName(name);
        if (key && !stationLineMap.has(key)) stationLineMap.set(key, line.key);
      });
    });
  }

  function getStationByName(name){
    const key = normalizeStationName(name);
    return state.stationIndex.get(key) || null;
  }

  function getStationLineKey(name){
    const key = normalizeStationName(name);
    return stationLineMap.get(key) || '';
  }

  async function geocodeQuery(query){
    try{
      const res = await fetch(`/api/geo?q=${encodeURIComponent(query)}`, { credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data && data.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)){
        return { lat: Number(data.lat), lng: Number(data.lng) };
      }
    }catch(_){ }
    return null;
  }

  async function geocodeStation(name){
    const key = normalizeStationName(name);
    if (!key) return null;
    const cached = state.stationIndex.get(key);
    if (cached && cached.coords) return cached.coords;
    if (state.pendingGeo.has(key)) return state.pendingGeo.get(key);

    const lineKey = getStationLineKey(name);
    let query = `${name} station Bangkok`;
    if (lineKey === 'bts_sukhumvit' || lineKey === 'bts_silom') query = `BTS ${name} station Bangkok`;
    if (lineKey === 'mrt_blue') query = `MRT ${name} station Bangkok`;
    if (lineKey === 'arl') query = `Airport Rail Link ${name} station Bangkok`;

    const promise = (async ()=>{
      let coords = await geocodeQuery(query);
      if (!coords) coords = await geocodeQuery(`${name} Bangkok`);
      return coords;
    })();

    state.pendingGeo.set(key, promise);
    const coords = await promise;
    state.pendingGeo.delete(key);
    if (coords) state.stationIndex.set(key, { name, coords });
    return coords;
  }

  async function ensureStationCoords(stopNames){
    const uniqueStops = dedupeStops(stopNames);
    for (const name of uniqueStops){
      const station = getStationByName(name);
      if (station && station.coords) continue;
      await geocodeStation(name);
    }
  }

  function distributeAlongPath(points, count){
    if (count <= 1) return [points[0]];
    const segments = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++){
      const a = points[i];
      const b = points[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segments.push({ a, b, len });
      total += len;
    }
    const positions = [];
    for (let i = 0; i < count; i++){
      const dist = total * (i / (count - 1));
      let acc = 0;
      for (let j = 0; j < segments.length; j++){
        const seg = segments[j];
        if (acc + seg.len >= dist || j === segments.length - 1){
          const t = seg.len === 0 ? 0 : (dist - acc) / seg.len;
          const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
          const y = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
          positions.push([x, y]);
          break;
        }
        acc += seg.len;
      }
    }
    return positions;
  }

  function renderTransitMap(){
    if (!transitMapSvg) return;
    transitMapSvg.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';

    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = `
      <radialGradient id="mapGlow" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#f1f5f9" stop-opacity="1" />
      </radialGradient>
    `;
    transitMapSvg.appendChild(defs);

    const bg = document.createElementNS(svgNS, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', '900');
    bg.setAttribute('height', '560');
    bg.setAttribute('class', 'map-backdrop');
    transitMapSvg.appendChild(bg);

    state.mapLines = new Map();
    state.stationNodes = new Map();

    LINE_DEFS.forEach(line => {
      const path = document.createElementNS(svgNS, 'path');
      const d = line.path.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
      path.setAttribute('d', d);
      path.setAttribute('stroke', line.color);
      path.setAttribute('class', 'line-path');
      path.setAttribute('data-line-key', line.key);
      transitMapSvg.appendChild(path);
      state.mapLines.set(line.key, path);

      const positions = distributeAlongPath(line.path, line.stations.length);
      line.stations.forEach((name, idx) => {
        const pos = positions[idx];
        const key = normalizeStationName(name);
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', pos[0]);
        circle.setAttribute('cy', pos[1]);
        circle.setAttribute('r', '6');
        circle.setAttribute('class', 'station-node');
        circle.setAttribute('data-station-key', key);
        circle.style.setProperty('--line-color', line.color);
        transitMapSvg.appendChild(circle);

        if (!state.stationNodes.has(key)) state.stationNodes.set(key, []);
        state.stationNodes.get(key).push(circle);

        if (LABEL_STATIONS.has(name)){
          const label = document.createElementNS(svgNS, 'text');
          label.setAttribute('x', pos[0] + 10);
          label.setAttribute('y', pos[1] - 8);
          label.setAttribute('class', 'station-label');
          label.textContent = name;
          transitMapSvg.appendChild(label);
        }
      });
    });
  }

  function resetMapHighlight(){
    state.mapLines.forEach(line => line.classList.remove('is-active'));
    state.stationNodes.forEach(nodes => nodes.forEach(node => node.classList.remove('is-active')));
  }

  function highlightRoute(lineKeys, stopNames){
    resetMapHighlight();
    lineKeys.forEach(key => {
      const line = state.mapLines.get(key);
      if (line) line.classList.add('is-active');
    });
    stopNames.forEach(name => {
      const key = normalizeStationName(name);
      const nodes = state.stationNodes.get(key) || [];
      nodes.forEach(node => node.classList.add('is-active'));
    });
  }

  function resolveLineKey(lineName, departure, arrival){
    const name = String(lineName || '').toLowerCase();
    if (name.includes('sukhumvit')) return 'bts_sukhumvit';
    if (name.includes('silom')) return 'bts_silom';
    if (name.includes('blue') || name.includes('mrt')) return 'mrt_blue';
    if (name.includes('airport') || name.includes('rail link') || name.includes('arl')) return 'arl';

    const depKey = normalizeStationName(departure);
    const arrKey = normalizeStationName(arrival);
    const matchLine = LINE_DEFS.find(line => {
      const keys = line.stations.map(normalizeStationName);
      return keys.includes(depKey) && keys.includes(arrKey);
    });
    if (matchLine) return matchLine.key;
    const partialLine = LINE_DEFS.find(line => {
      const keys = line.stations.map(normalizeStationName);
      return keys.includes(depKey) || keys.includes(arrKey);
    });
    return partialLine ? partialLine.key : '';
  }

  function getStationIndices(line, name){
    const key = normalizeStationName(name);
    if (!key) return [];
    const indices = [];
    line.stations.forEach((station, idx) => {
      if (normalizeStationName(station) === key) indices.push(idx);
    });
    return indices;
  }

  function expandStops(lineKey, departure, arrival){
    const line = LINE_DEFS.find(l => l.key === lineKey);
    if (!line) return [departure, arrival];
    const depIndices = getStationIndices(line, departure);
    const arrIndices = getStationIndices(line, arrival);
    if (!depIndices.length || !arrIndices.length) return [departure, arrival];

    let bestSegment = null;
    let bestLen = Infinity;
    depIndices.forEach(depIdx => {
      arrIndices.forEach(arrIdx => {
        const segment = depIdx <= arrIdx
          ? line.stations.slice(depIdx, arrIdx + 1)
          : line.stations.slice(arrIdx, depIdx + 1).reverse();
        if (segment.length < bestLen){
          bestLen = segment.length;
          bestSegment = segment;
        }
      });
    });
    return bestSegment || [departure, arrival];
  }

  function dedupeStops(list){
    const seen = new Set();
    const out = [];
    list.forEach(name => {
      const key = normalizeStationName(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(name);
    });
    return out;
  }

  function classifyLine(step){
    if (!step || !step.transit_details || !step.transit_details.line) return '';
    const line = step.transit_details.line;
    const name = `${line.short_name || ''} ${line.name || ''}`.toLowerCase();
    if (name.includes('bts')) return 'bts';
    if (name.includes('mrt') || name.includes('blue')) return 'mrt';
    if (name.includes('airport') || name.includes('rail link')) return 'arl';
    return '';
  }

  function chooseBestRoute(routes, preference){
    if (!routes || !routes.length) return null;
    if (preference === 'mix') return routes[0];
    let best = routes[0];
    let bestScore = Infinity;
    routes.forEach(route => {
      const leg = route.legs && route.legs[0];
      const steps = leg ? leg.steps || [] : [];
      let violations = 0;
      steps.forEach(step => {
        if (step.travel_mode !== 'TRANSIT') return;
        const lineType = classifyLine(step);
        if (!lineType) return;
        if (preference === 'bts' && lineType !== 'bts') violations += 1;
        if (preference === 'mrt' && lineType !== 'mrt') violations += 1;
      });
      const duration = leg && leg.duration ? leg.duration.value : 999999;
      if (violations < bestScore || (violations === bestScore && duration < (best.legs?.[0]?.duration?.value || 999999))){
        best = route;
        bestScore = violations;
      }
    });
    return best;
  }

  function renderRoute(route, preference){
    if (!routeSummary || !routeSteps) return;
    routeSummary.innerHTML = '';
    routeSteps.innerHTML = '';
    stationResults.innerHTML = '';

    if (!route || !route.legs || !route.legs.length){
      routeSummary.innerHTML = '<span class="status-pill">找不到捷運路線，請換個起點/目的地。</span>';
      renderStationHighlightList([]);
      return;
    }
    const leg = route.legs[0];
    const totalDuration = leg.duration ? Math.round(leg.duration.value / 60) : 0;
    const totalDistance = leg.distance ? (leg.distance.value / 1000).toFixed(1) : '';
    const steps = leg.steps || [];
    const transitSteps = steps.filter(step => step.travel_mode === 'TRANSIT');
    const walkingSteps = steps.filter(step => step.travel_mode === 'WALKING');

    const lineKeys = new Set();
    let stopNames = [];

    transitSteps.forEach(step => {
      const detail = step.transit_details;
      if (!detail) return;
      const lineName = detail.line && (detail.line.short_name || detail.line.name) || '';
      const dep = detail.departure_stop ? detail.departure_stop.name : '';
      const arr = detail.arrival_stop ? detail.arrival_stop.name : '';
      const lineKey = resolveLineKey(lineName, dep, arr);
      if (lineKey) lineKeys.add(lineKey);
      const stops = expandStops(lineKey, dep, arr);
      stopNames = stopNames.concat(stops);
    });

    stopNames = dedupeStops(stopNames);

    const transferCount = Math.max(0, transitSteps.length - 1);
    const walkMinutes = walkingSteps.reduce((sum, step) => sum + (step.duration ? step.duration.value : 0), 0);
    const walkText = walkMinutes ? `${Math.round(walkMinutes / 60)} 分` : '0 分';
    const transferNames = transitSteps.slice(0, -1)
      .map(step => step.transit_details && step.transit_details.arrival_stop ? step.transit_details.arrival_stop.name : '')
      .filter(Boolean);

    const preferenceWarning = (()=>{
      if (preference === 'mix') return '';
      const hasViolation = transitSteps.some(step => {
        const lineType = classifyLine(step);
        if (!lineType) return false;
        if (preference === 'bts' && lineType !== 'bts') return true;
        if (preference === 'mrt' && lineType !== 'mrt') return true;
        return false;
      });
      return hasViolation ? '<span class="status-pill">符合度最高的路線仍包含其他系統</span>' : '';
    })();

    routeSummary.innerHTML = `
      <div><strong>總時間：</strong>${totalDuration} 分 ${totalDistance ? ` · ${totalDistance} km` : ''}</div>
      <div><strong>轉乘次數：</strong>${transferCount} 次</div>
      <div><strong>步行時間：</strong>${walkText}</div>
      ${preferenceWarning}
    `;

    transitSteps.forEach(step => {
      const detail = step.transit_details;
      if (!detail) return;
      const line = detail.line || {};
      const lineName = line.short_name || line.name || '捷運';
      const dep = detail.departure_stop ? detail.departure_stop.name : '';
      const arr = detail.arrival_stop ? detail.arrival_stop.name : '';
      const stops = detail.num_stops || 0;
      const lineKey = resolveLineKey(lineName, dep, arr);
      const lineColor = LINE_DEFS.find(l => l.key === lineKey)?.color || '#94a3b8';
      const stepEl = document.createElement('li');
      stepEl.className = 'route-step';
      stepEl.innerHTML = `
        <div class="route-step-title">
          <span class="route-line-tag"><span style="background:${lineColor}"></span>${escapeHtml(lineName)}</span>
          ${escapeHtml(dep)} → ${escapeHtml(arr)}
        </div>
        <div class="route-step-meta">經過 ${stops} 站 · ${detail.headsign ? `方向 ${escapeHtml(detail.headsign)}` : ''}</div>
      `;
      routeSteps.appendChild(stepEl);
    });

    walkingSteps.forEach(step => {
      const stepEl = document.createElement('li');
      stepEl.className = 'route-step';
      stepEl.innerHTML = `
        <div class="route-step-title">步行 ${Math.round((step.duration?.value || 0) / 60)} 分鐘</div>
        <div class="route-step-meta">${escapeHtml(step.instructions || '')}</div>
      `;
      routeSteps.appendChild(stepEl);
    });

    renderStationHighlightList(stopNames, transferNames);
    highlightRoute(Array.from(lineKeys), stopNames);
    renderStationRecommendations(stopNames).catch(()=>{});
  }

  function getNearbyItems(center, items){
    return items
      .map(item => ({
        item,
        dist: haversineKm(center, item.coords)
      }))
      .filter(entry => entry.dist <= SEARCH_RADIUS_KM)
      .sort((a, b) => {
        if (b.item.rating !== a.item.rating) return b.item.rating - a.item.rating;
        return a.dist - b.dist;
      })
      .slice(0, MAX_NEARBY);
  }

  async function renderStationRecommendations(stopNames){
    if (!stationResults) return;
    if (!stopNames.length){
      stationResults.innerHTML = '<div class="planner-hint">目前沒有站點資料。</div>';
      return;
    }
    stationResults.innerHTML = '<div class="planner-hint">正在定位站點並載入推薦…</div>';
    await ensureStationCoords(stopNames);

    const uniqueStops = dedupeStops(stopNames);
    stationResults.innerHTML = uniqueStops.map(name => {
      const station = getStationByName(name);
      if (!station || !station.coords){
        return `
          <div class="station-card">
            <div class="station-head">
              <div>
                <div class="station-title">${escapeHtml(name)}</div>
                <div class="station-meta">目前無法取得座標，請稍後再試。</div>
              </div>
            </div>
          </div>
        `;
      }
      const foodHits = getNearbyItems(station.coords, state.foods);
      const templeHits = getNearbyItems(station.coords, state.temples);
      const foodHtml = foodHits.length
        ? foodHits.map(hit => `
          <div class="nearby-item">
            <div><strong>${escapeHtml(hit.item.name)}</strong> · ${escapeHtml(hit.item.area || '')}</div>
            <div><span class="nearby-tag">美食</span> ${formatDistance(hit.dist)}</div>
          </div>
        `).join('')
        : '<div class="planner-hint">附近沒有美食資料</div>';
      const templeHtml = templeHits.length
        ? templeHits.map(hit => `
          <div class="nearby-item">
            <div><strong>${escapeHtml(hit.item.name)}</strong> · ${escapeHtml(hit.item.area || '')}</div>
            <div><span class="nearby-tag temple">寺廟</span> ${formatDistance(hit.dist)}</div>
          </div>
        `).join('')
        : '<div class="planner-hint">附近沒有寺廟資料</div>';
      return `
        <div class="station-card">
          <div class="station-head">
            <div>
              <div class="station-title">${escapeHtml(station.name)}</div>
              <div class="station-meta">800m 內美食 ${foodHits.length} · 寺廟 ${templeHits.length}</div>
            </div>
          </div>
          <div class="nearby-grid">${foodHtml}</div>
          <div class="nearby-grid" style="margin-top:6px;">${templeHtml}</div>
        </div>
      `;
    }).join('');
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
    }catch(_){ }
    return '';
  }

  function initGoogleMaps(){
    if (!window.google || !window.google.maps) return;
    state.googleReady = true;
    state.directionsService = new google.maps.DirectionsService();

    if (originInput){
      const auto = new google.maps.places.Autocomplete(originInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'th' }
      });
      auto.addListener('place_changed', ()=>{
        const place = auto.getPlace();
        const loc = place && place.geometry && place.geometry.location;
        if (!loc) return;
        state.originPlace = {
          name: place.name || '',
          address: place.formatted_address || originInput.value.trim(),
          placeId: place.place_id || '',
          coords: { lat: loc.lat(), lng: loc.lng() }
        };
      });
    }

    if (destinationInput){
      const auto = new google.maps.places.Autocomplete(destinationInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'th' }
      });
      auto.addListener('place_changed', ()=>{
        const place = auto.getPlace();
        const loc = place && place.geometry && place.geometry.location;
        if (!loc) return;
        state.destinationPlace = {
          name: place.name || '',
          address: place.formatted_address || destinationInput.value.trim(),
          placeId: place.place_id || '',
          coords: { lat: loc.lat(), lng: loc.lng() }
        };
      });
    }
  }

  async function ensureGoogleMaps(){
    if (state.googleReady && window.google && window.google.maps) return true;
    if (state.googleLoadingPromise) return state.googleLoadingPromise;
    state.googleLoadingPromise = new Promise(async (resolve) => {
      const key = await getGoogleMapsKey();
      if (!key){
        setStatus('未設定 Google Maps Key', true);
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=initTransitMaps`;
      window.initTransitMaps = () => {
        initGoogleMaps();
        resolve(true);
      };
      script.onerror = () => {
        setStatus('地圖載入失敗', true);
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return state.googleLoadingPromise;
  }

  async function geocodeInput(inputEl, cached){
    if (cached && cached.coords) return cached;
    const query = String(inputEl?.value || '').trim();
    if (!query) return null;
    try{
      const res = await fetch(`/api/geo?q=${encodeURIComponent(query)}`, { credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if (!data || !data.ok) return null;
      return {
        name: query,
        address: data.display_name || query,
        coords: { lat: data.lat, lng: data.lng },
        placeId: ''
      };
    }catch(_){
      return null;
    }
  }

  async function searchRoute(){
    if (!state.ready){
      setStatus('資料尚未載入完成', true);
      return;
    }
    const ok = await ensureGoogleMaps();
    if (!ok) return;

    const origin = await geocodeInput(originInput, state.originPlace);
    const destination = await geocodeInput(destinationInput, state.destinationPlace);
    if (!origin || !destination){
      setStatus('請先輸入出發地與目的地', true);
      return;
    }

    const preference = transitPreference ? transitPreference.value : 'mix';
    const departTime = departTimeInput && departTimeInput.value ? new Date(departTimeInput.value) : null;
    setStatus('路線查詢中…');

    const request = {
      origin: origin.placeId ? { placeId: origin.placeId } : origin.coords,
      destination: destination.placeId ? { placeId: destination.placeId } : destination.coords,
      travelMode: google.maps.TravelMode.TRANSIT,
      provideRouteAlternatives: true
    };
    if (departTime) request.transitOptions = { departureTime: departTime };

    state.directionsService.route(request, (result, status)=>{
      if (status !== 'OK' || !result){
        setStatus('找不到捷運路線，請換個地點再試', true);
        renderRoute(null, preference);
        return;
      }
      const best = chooseBestRoute(result.routes, preference);
      setStatus('已產生捷運路線');
      renderRoute(best, preference);
    });
  }

  if (btnUseLocation){
    btnUseLocation.addEventListener('click', ()=>{
      if (!navigator.geolocation){
        setStatus('瀏覽器不支援定位', true);
        return;
      }
      setStatus('定位中…');
      navigator.geolocation.getCurrentPosition(pos => {
        state.originPlace = {
          name: '我的位置',
          address: '我的位置',
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          placeId: ''
        };
        if (originInput) originInput.value = '我的位置';
        setStatus('已取得定位');
      }, ()=>{
        setStatus('定位失敗，請允許定位權限', true);
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }

  if (btnSearchRoute){
    btnSearchRoute.addEventListener('click', searchRoute);
  }

  if (mapTabs && btsMapImg && mrtMapImg){
    mapTabs.addEventListener('click', (event)=>{
      const btn = event.target.closest('[data-map-tab]');
      if (!btn) return;
      const tab = btn.getAttribute('data-map-tab');
      mapTabs.querySelectorAll('.map-tab').forEach(el => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      btsMapImg.classList.toggle('is-active', tab === 'bts');
      mrtMapImg.classList.toggle('is-active', tab === 'mrt');
      fitMapToFrame();
    });
  }

  if (mapTools){
    mapTools.addEventListener('click', (event)=>{
      const btn = event.target.closest('[data-map-zoom]');
      if (!btn) return;
      const mode = btn.getAttribute('data-map-zoom');
      if (mode === 'reset'){
        fitMapToFrame();
        return;
      }
      if (mode === 'in') mapView.scale = Math.min(2.5, mapView.scale + 0.1);
      if (mode === 'out') mapView.scale = Math.max(0.6, mapView.scale - 0.1);
      applyMapScale();
    });
  }

  if (btsMapImg){
    btsMapImg.addEventListener('load', fitMapToFrame, { once:true });
  }
  if (mrtMapImg){
    mrtMapImg.addEventListener('load', fitMapToFrame, { once:true });
  }
  if (window){
    window.addEventListener('resize', ()=>{
      fitMapToFrame();
    });
  }

  fitMapToFrame();
  renderTransitMap();
  loadData();
  ensureGoogleMaps();
})();
