function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createFoodUtils(deps){
  requireDeps(deps, ['getAny'], 'food-utils.js');
  const {
    getAny
  } = deps;

  // Foods helpers (for food map)
  function foodKey(id){ return `FOOD:${id}`; }
  function parseLatLngPair(lat, lng){
    const latStr = String(lat ?? '').trim();
    const lngStr = String(lng ?? '').trim();
    if (!latStr || !lngStr) return null;
    const latNum = Number(latStr);
    const lngNum = Number(lngStr);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
    return { lat: latNum, lng: lngNum };
  }
  function extractLatLngFromText(text){
    const m = String(text || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    return m ? parseLatLngPair(m[1], m[2]) : null;
  }
  function extractLatLngFromMapsUrl(raw){
    const url = String(raw || '').trim();
    if (!url) return null;
    try{
      const u = new URL(url);
      const atMatch = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) return parseLatLngPair(atMatch[1], atMatch[2]);
      const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dataMatch) return parseLatLngPair(dataMatch[1], dataMatch[2]);
      const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('ll') || '';
      const pair = extractLatLngFromText(q);
      if (pair) return pair;
      return null;
    }catch(_){
      return extractLatLngFromText(url);
    }
  }
  function extractMapsQuery(raw){
    const url = String(raw || '').trim();
    if (!url) return '';
    try{
      const u = new URL(url);
      return u.searchParams.get('q') || u.searchParams.get('query') || '';
    }catch(_){
      return '';
    }
  }
  function extractPlaceNameFromMapsUrl(raw){
    const url = String(raw || '').trim();
    if (!url) return '';
    try{
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('place');
      if (idx !== -1 && parts[idx + 1]){
        return decodeURIComponent(parts[idx + 1]).replace(/\+/g, ' ');
      }
    }catch(_){}
    return '';
  }
  function parseHmToMinutes(hm){
    const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    if (h < 0 || h > 47 || min < 0 || min > 59) return null;
    return h * 60 + min;
  }
  function parseTimeToken(raw){
    const text = String(raw || '').trim();
    if (!text) return null;
    const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!m) return null;
    let h = Number(m[1]);
    let min = Number(m[2] || '0');
    const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    if (h < 0 || h > 47 || min < 0 || min > 59) return null;
    return h * 60 + min;
  }
  function formatMinutes(mins){
    if (!Number.isFinite(mins)) return '';
    const norm = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = Math.floor(norm % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function buildRangeFromMinutes(minOpen, maxClose){
    if (!Number.isFinite(minOpen) || !Number.isFinite(maxClose)) return '';
    const openText = formatMinutes(minOpen);
    const closeText = formatMinutes(maxClose);
    return `${openText}-${closeText}`;
  }
  function deriveHoursFromPeriods(periods){
    if (!Array.isArray(periods) || !periods.length) return '';
    let minOpen = null;
    let maxClose = null;
    for (const p of periods){
      if (!p || !p.open || !p.open.time) continue;
      const openMin = parseHmToMinutes(`${String(p.open.time).slice(0,2)}:${String(p.open.time).slice(2)}`);
      if (!Number.isFinite(openMin)) continue;
      let closeMin = null;
      if (p.close && p.close.time){
        closeMin = parseHmToMinutes(`${String(p.close.time).slice(0,2)}:${String(p.close.time).slice(2)}`);
      }
      if (!Number.isFinite(closeMin)){
        minOpen = 0;
        maxClose = 1440;
        break;
      }
      let daySpan = 0;
      if (Number.isFinite(p.open.day) && Number.isFinite(p.close.day)){
        daySpan = p.close.day - p.open.day;
        if (daySpan < 0) daySpan += 7;
      }
      const closeAdj = closeMin + daySpan * 1440;
      minOpen = (minOpen === null) ? openMin : Math.min(minOpen, openMin);
      maxClose = (maxClose === null) ? closeAdj : Math.max(maxClose, closeAdj);
    }
    if (minOpen === null || maxClose === null) return '';
    return buildRangeFromMinutes(minOpen, maxClose);
  }
  function deriveHoursFromWeekdayText(list){
    if (!Array.isArray(list) || !list.length) return '';
    let minOpen = null;
    let maxClose = null;
    for (const row of list){
      const text = String(row || '');
      if (/24\s*hours|24\s*小時|24小時/i.test(text)){
        minOpen = 0;
        maxClose = 1440;
        break;
      }
      const parts = text.split(/–|-|—/).map(s=>s.trim());
      if (parts.length < 2) continue;
      const left = parts[0].replace(/^.*?:/, '').trim();
      const right = parts[1].trim();
      const openMin = parseTimeToken(left);
      const closeMin = parseTimeToken(right);
      if (!Number.isFinite(openMin) || !Number.isFinite(closeMin)) continue;
      minOpen = (minOpen === null) ? openMin : Math.min(minOpen, openMin);
      maxClose = (maxClose === null) ? closeMin : Math.max(maxClose, closeMin);
    }
    if (minOpen === null || maxClose === null) return '';
    return buildRangeFromMinutes(minOpen, maxClose);
  }
  function normalizeHoursFallback(text){
    const raw = String(text || '').trim();
    if (!raw) return '';
    const m = raw.match(/(\d{1,2}:\d{2})/);
    if (m && /開始|open/i.test(raw)){
      return `${m[1]}-23:00`;
    }
    return raw;
  }
  function hasNormalizedHours(text){
    return /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(String(text || ''));
  }
  async function fetchPlaceId(env, query){
    const key = (env.GOOGLE_MAPS_KEY || env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAP_API_KEY || env.GOOGLE_API_KEY || env.MAPS_API_KEY || env.GMAPS_KEY || '').trim();
    if (!key || !query) return '';
    const endpoint = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${encodeURIComponent(key)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return '';
    const data = await res.json().catch(()=>null);
    if (!data || data.status !== 'OK' || !Array.isArray(data.candidates) || !data.candidates.length) return '';
    return data.candidates[0].place_id || '';
  }
  async function fetchPlaceDetails(env, placeId){
    const key = (env.GOOGLE_MAPS_KEY || env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAP_API_KEY || env.GOOGLE_API_KEY || env.MAPS_API_KEY || env.GMAPS_KEY || '').trim();
    if (!key || !placeId) return null;
    const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=opening_hours&key=${encodeURIComponent(key)}&language=en`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json().catch(()=>null);
    if (!data || data.status !== 'OK' || !data.result) return null;
    return data.result.opening_hours || null;
  }
  async function resolveFoodHours(env, food){
    const query = buildFoodGeocodeQuery(food, food.maps) || '';
    if (!query) return '';
    const placeId = await fetchPlaceId(env, query);
    if (!placeId) return '';
    const opening = await fetchPlaceDetails(env, placeId);
    if (!opening) return '';
    const fromPeriods = deriveHoursFromPeriods(opening.periods);
    if (fromPeriods) return fromPeriods;
    const fromText = deriveHoursFromWeekdayText(opening.weekday_text);
    if (fromText) return fromText;
    return '';
  }
  async function expandMapsShortUrl(raw){
    const url = String(raw || '').trim();
    if (!url) return '';
    try{
      const u = new URL(url);
      const host = (u.hostname || '').toLowerCase();
      const isShort = host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'g.page';
      if (!isShort && !host.endsWith('goo.gl')) return '';
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; unalomecodes-food-map/1.0)'
        }
      });
      return res && res.url ? res.url : '';
    }catch(_){
      return '';
    }
  }
  async function readGeoCache(env, key){
    const store = env.GEO_CACHE || env.GEOCODE_CACHE || null;
    if (!store || !key || typeof store.get !== 'function') return null;
    try{
      const cached = await store.get(`GEO:${String(key).toLowerCase()}`);
      if (!cached) return null;
      const data = JSON.parse(cached);
      if (data && Number.isFinite(data.lat) && Number.isFinite(data.lng)){
        return { lat: Number(data.lat), lng: Number(data.lng) };
      }
    }catch(_){}
    return null;
  }
  async function writeGeoCache(env, key, coords){
    const store = env.GEO_CACHE || env.GEOCODE_CACHE || null;
    if (!store || !key || !coords || typeof store.put !== 'function') return;
    const payload = { lat: coords.lat, lng: coords.lng, display_name: coords.display_name || '' };
    try{
      await store.put(`GEO:${String(key).toLowerCase()}`, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 30 });
    }catch(err){
      console.warn('ensureFortuneIndex_failed', err);
    }
  }
  async function geocodeByGoogle(query, env){
    const key = (env.GOOGLE_MAPS_KEY || env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAP_API_KEY || env.GOOGLE_API_KEY || env.MAPS_API_KEY || env.GMAPS_KEY || '').trim();
    if (!key) return null;
    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}&language=th`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json().catch(()=>null);
    if (!data || data.status !== 'OK' || !Array.isArray(data.results) || !data.results.length) return null;
    const loc = data.results[0] && data.results[0].geometry && data.results[0].geometry.location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
    return { lat: Number(loc.lat), lng: Number(loc.lng), display_name: data.results[0].formatted_address || '' };
  }
  async function geocodeByNominatim(query, env){
    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const ua = env.GEO_USER_AGENT || env.GEOCODE_USER_AGENT || 'unalomecodes-food-map/1.0 (contact: support@unalomecodes.com)';
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': ua,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) return null;
    const data = await res.json().catch(()=>null);
    if (!Array.isArray(data) || !data.length) return null;
    const first = data[0] || {};
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, display_name: first.display_name || '' };
  }
  async function geocodeQueryForFood(env, query){
    const cached = await readGeoCache(env, query);
    if (cached) return cached;
    let coords = await geocodeByGoogle(query, env);
    if (!coords) coords = await geocodeByNominatim(query, env);
    if (coords) await writeGeoCache(env, query, coords);
    return coords;
  }
  function buildFoodGeocodeQuery(food, mapsUrl){
    const fromMaps = extractMapsQuery(mapsUrl);
    if (fromMaps) return fromMaps;
    const place = extractPlaceNameFromMapsUrl(mapsUrl);
    if (place) return place;
    const address = String(food.address || '').trim();
    if (address) return address;
    const name = String(food.name || '').trim();
    if (!name) return '';
    const area = String(food.area || '').trim();
    const suffix = area ? ` ${area} Thailand` : ' Thailand';
    return name + suffix;
  }
  async function resolveFoodCoords(env, food){
    if (!food) return null;
    const own = parseLatLngPair(food.lat, food.lng);
    if (own) return own;
    let mapsUrl = String(food.maps || '').trim();
    let coords = extractLatLngFromMapsUrl(mapsUrl);
    if (coords) return coords;
    if (mapsUrl){
      const expanded = await expandMapsShortUrl(mapsUrl);
      if (expanded){
        coords = extractLatLngFromMapsUrl(expanded);
        if (coords) return coords;
        mapsUrl = expanded;
      }
    }
    const query = buildFoodGeocodeQuery(food, mapsUrl);
    if (!query) return null;
    return await geocodeQueryForFood(env, query);
  }
  const resolveFoodLatLng = resolveFoodCoords;
  async function readFood(env, id){
    if (!env.FOODS) return null;
    try{
      const raw = await env.FOODS.get(foodKey(id));
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }
  async function saveFood(env, obj){
    if (!env.FOODS || !obj || !obj.id) return null;
    await env.FOODS.put(foodKey(obj.id), JSON.stringify(obj));
    return obj;
  }
  function normalizeFoodPayload(payload, fallbackId){
    const body = payload || {};
    const id = String(body.id || fallbackId || '').trim();
    if (!id) return null;

    const out = { id };
    // 只有當欄位存在於 payload 時才更新，避免 undefined 覆蓋掉舊資料
    const str = (k) => { if (body[k] !== undefined) out[k] = String(body[k]||'').trim(); };
    const num = (k) => {
      if (body[k] === undefined) return;
      const n = Number(body[k]);
      out[k] = Number.isFinite(n) ? n : body[k];
    };
    const list = (k, altKey) => {
      if (body[k] === undefined && (!altKey || body[altKey] === undefined)) return;
      const raw = (body[k] !== undefined) ? body[k] : body[altKey];
      if (Array.isArray(raw)) {
        out[k] = raw.map(v=>String(v).trim()).filter(Boolean);
        return;
      }
      if (typeof raw === 'string') {
        out[k] = raw.split(/[,，]/).map(v=>v.trim()).filter(Boolean);
        return;
      }
      out[k] = [];
    };

    str('name'); str('category'); str('area'); str('price');
    str('type');
    num('stayMin');
    num('priceLevel');
    list('openSlots', 'open_slots');
    list('tags');
    list('wishTags', 'wish_tags');
    str('address'); str('hours'); str('maps'); str('ig');
    str('youtube'); str('igComment'); str('cover');
    str('ownerId'); str('ownerName');

    if (body.coverPos !== undefined || body.cover_pos !== undefined) {
      out.coverPos = String(body.coverPos || body.cover_pos || '').trim();
    }
    str('intro'); str('googlePlaceId');
    const images = normalizeFoodImagesPayload(body.images !== undefined ? body.images : body.gallery);
    if (images !== undefined) out.images = images;
    const dayTripStops = normalizeDayTripStopsPayload(body.dayTripStops !== undefined ? body.dayTripStops : body.day_trip_stops);
    if (dayTripStops !== undefined) out.dayTripStops = dayTripStops;

    if (body.highlights !== undefined) out.highlights = Array.isArray(body.highlights) ? body.highlights : [];
    if (body.dishes !== undefined) out.dishes = Array.isArray(body.dishes) ? body.dishes : [];

    if (body.featured !== undefined || body.featured_ !== undefined) {
      out.featured = !!(body.featured || body.featured_);
    }
    if (body.rating !== undefined) out.rating = body.rating;
    if (body.lat !== undefined) out.lat = body.lat;
    if (body.lng !== undefined) out.lng = body.lng;

    return out;
  }
  function normalizeFoodImagesPayload(raw){
    if (raw === undefined) return undefined;
    let list = raw;
    if (typeof raw === 'string') {
      try{
        list = JSON.parse(raw);
      }catch(_){
        list = raw.split(/[\n,，]+/).map(v=>v.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(list)) return [];
    const normalized = list.map((entry)=>{
      if (!entry) return null;
      if (typeof entry === 'string') {
        const url = String(entry || '').trim();
        if (!url) return null;
        return { url };
      }
      if (typeof entry === 'object') {
        const url = String(entry.url || entry.src || entry.image || entry.link || entry.href || entry.value || '').trim();
        if (!url) return null;
        const pos = String(entry.pos || entry.position || entry.objectPosition || '').trim();
        const out = { url };
        if (pos) out.pos = pos;
        return out;
      }
      return null;
    }).filter(Boolean);
    return normalized;
  }
  function normalizeDayTripStopsPayload(raw){
    if (raw === undefined) return undefined;
    let list = raw;
    if (typeof raw === 'string') {
      try{
        list = JSON.parse(raw);
      }catch(_){
        list = raw.split(/\n+/).map(line => ({ maps: line }));
      }
    }
    if (!Array.isArray(list)) return [];
    const normalized = list.map((entry, idx)=>{
      if (typeof entry === 'string') {
        const maps = String(entry || '').trim();
        if (!maps) return null;
        return { name:'', maps, note:'', order: idx + 1 };
      }
      if (!entry || typeof entry !== 'object') return null;
      const name = String(entry.name || entry.title || '').trim();
      const maps = String(entry.maps || entry.mapsUrl || entry.map || entry.url || entry.link || entry.address || '').trim();
      const note = String(entry.note || entry.memo || '').trim();
      const orderRaw = Number(entry.order || entry.seq || entry.index);
      const order = Number.isFinite(orderRaw) ? orderRaw : idx + 1;
      if (!name && !maps) return null;
      return { name, maps, note, order };
    }).filter(Boolean);
    return normalized;
  }
  function mergeFoodRecord(existing, incoming, options){
    const out = Object.assign({}, existing || {});
    const preserveExisting = !!(options && options.preserveExisting);
    if (!incoming) return out;
    const assignIf = (key, val)=>{
      // 只有在傳入的值是 undefined 時才跳過，允許傳入 null 或空字串來清空欄位
      if (val === undefined) return;
      if (preserveExisting && out[key] != null && out[key] !== '' && (!Array.isArray(out[key]) || out[key].length > 0)) return;
      out[key] = val;
    };
    assignIf('name', incoming.name);
    assignIf('category', incoming.category);
    assignIf('area', incoming.area);
    assignIf('price', incoming.price);
    assignIf('type', incoming.type);
    assignIf('stayMin', incoming.stayMin);
    assignIf('openSlots', incoming.openSlots);
    assignIf('priceLevel', incoming.priceLevel);
    assignIf('tags', incoming.tags);
    assignIf('wishTags', incoming.wishTags);
    assignIf('images', incoming.images);
    assignIf('address', incoming.address);
    assignIf('hours', incoming.hours);
    assignIf('maps', incoming.maps);
    assignIf('ig', incoming.ig);
    assignIf('youtube', incoming.youtube);
    assignIf('igComment', incoming.igComment);
    assignIf('cover', incoming.cover);
    assignIf('coverPos', incoming.coverPos);
    assignIf('intro', incoming.intro);
    assignIf('ownerId', incoming.ownerId);
    assignIf('ownerName', incoming.ownerName);
    assignIf('highlights', incoming.highlights);
    assignIf('dishes', incoming.dishes);
    assignIf('dayTripStops', incoming.dayTripStops);
    assignIf('featured', incoming.featured);
    assignIf('rating', incoming.rating);
    assignIf('googlePlaceId', incoming.googlePlaceId);
    const latPair = parseLatLngPair(incoming.lat, incoming.lng);
    if (latPair){
      if (!preserveExisting || !parseLatLngPair(out.lat, out.lng)){
        out.lat = latPair.lat;
        out.lng = latPair.lng;
      }
    }
    out.id = incoming.id || out.id;
    out.deleted = false;
    return out;
  }
  async function deleteFood(env, id){
    if (!env.FOODS || !id) return false;
    await env.FOODS.delete(foodKey(id));
    return true;
  }
  function resetFoodsListMemoryCache(){
    FOODS_LIST_CACHE.ts = 0;
    FOODS_LIST_CACHE.items = null;
  }
  async function readFoodsListCacheRaw(env){
    if (!env.FOODS || !env.FOODS.get) return null;
    try{
      const raw = await env.FOODS.get(FOODS_LIST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return null;
      return data.items;
    }catch(_){
      return null;
    }
  }
  async function readFoodsListCache(env){
    if (!env.FOODS || !env.FOODS.get) return null;
    try{
      const raw = await env.FOODS.get(FOODS_LIST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return null;
      const ts = Number(data.ts || 0);
      if (!ts) return null;
      if ((Date.now() - ts) > FOODS_LIST_KV_TTL * 1000) return null;
      return data.items;
    }catch(_){
      return null;
    }
  }
  async function writeFoodsListCache(env, items){
    if (!env.FOODS || !env.FOODS.put) return;
    if (!Array.isArray(items)) return;
    try{
      await env.FOODS.put(FOODS_LIST_KEY, JSON.stringify({
        ts: Date.now(),
        items
      }));
    }catch(_){}
  }
  async function deleteFoodsListCache(env){
    if (!env.FOODS || !env.FOODS.delete) return;
    try{ await env.FOODS.delete(FOODS_LIST_KEY); }catch(_){}
  }
  async function upsertFoodsListCache(env, item){
    if (!item || !item.id) return;
    const items = await readFoodsListCacheRaw(env);
    if (!items) return;
    const next = items.filter(it=> it && it.id && it.id !== item.id);
    if (!item.deleted) next.push(item);
    await writeFoodsListCache(env, next);
  }
  async function listFoods(env, limit, opts = {}){
    const out = [];
    if (!env.FOODS || !env.FOODS.list) return out;
    const useCache = opts.cache !== false;
    const now = Date.now();
    if (useCache && FOODS_LIST_CACHE.items && (now - FOODS_LIST_CACHE.ts) < FOODS_LIST_TTL){
      const cached = FOODS_LIST_CACHE.items;
      return cached.slice(0, limit || cached.length);
    }
    const iter = await env.FOODS.list({ prefix:'FOOD:' });
    const keys = Array.isArray(iter.keys) ? iter.keys.slice(0, limit||200) : [];
    const chunkSize = 30;
    for (let i = 0; i < keys.length; i += chunkSize){
      const chunk = keys.slice(i, i + chunkSize);
      const raws = await Promise.all(chunk.map(k=> env.FOODS.get(k.name)));
      raws.forEach((raw)=>{
        if (!raw) return;
        try{
          const obj = JSON.parse(raw);
          if (obj && obj.id) out.push(obj);
        }catch(_){}
      });
    }
    if (useCache){
      FOODS_LIST_CACHE.items = out;
      FOODS_LIST_CACHE.ts = now;
    }
    return out;
  }

  return {
    buildFoodGeocodeQuery,
    extractMapsQuery,
    extractLatLngFromMapsUrl,
    extractPlaceNameFromMapsUrl,
    expandMapsShortUrl,
    geocodeByGoogle,
    geocodeByNominatim,
    geocodeQueryForFood,
    resolveFoodLatLng,
    readFood,
    saveFood,
    resetFoodsListMemoryCache,
    readFoodsListCache,
    writeFoodsListCache,
    deleteFoodsListCache,
    upsertFoodsListCache,
    listFoods
  };
}

export { createFoodUtils };
