function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createTempleUtils(deps){
  requireDeps(deps, ['getAny', 'parseLatLngPair', 'normalizeHoursFallback'], 'temple-utils.js');
  const {
    getAny,
    parseLatLngPair,
    normalizeHoursFallback
  } = deps;

  // Temples helpers (for temple map)
  function templeKey(id){ return `TEMPLE:${id}`; }
  async function geocodeQueryForTemple(env, query){
    return await geocodeQueryForFood(env, query);
  }
  function buildTempleGeocodeQuery(temple, mapsUrl){
    const fromMaps = extractMapsQuery(mapsUrl);
    if (fromMaps) return fromMaps;
    const place = extractPlaceNameFromMapsUrl(mapsUrl);
    if (place) return place;
    const address = String(temple.address || '').trim();
    if (address) return address;
    const name = String(temple.name || '').trim();
    if (!name) return '';
    const area = String(temple.area || '').trim();
    const suffix = area ? ` ${area} Thailand` : ' Thailand';
    return name + suffix;
  }
  async function resolveTempleCoords(env, temple){
    if (!temple) return null;
    const own = parseLatLngPair(temple.lat, temple.lng);
    if (own) return own;
    let mapsUrl = String(temple.maps || '').trim();
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
    const query = buildTempleGeocodeQuery(temple, mapsUrl);
    if (!query) return null;
    return await geocodeQueryForTemple(env, query);
  }
  async function resolveTempleHours(env, temple){
    const query = buildTempleGeocodeQuery(temple, temple.maps) || '';
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
  async function readTemple(env, id){
    if (!env.TEMPLES) return null;
    try{
      const raw = await env.TEMPLES.get(templeKey(id));
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }
  async function saveTemple(env, obj){
    if (!env.TEMPLES || !obj || !obj.id) return null;
    await env.TEMPLES.put(templeKey(obj.id), JSON.stringify(obj));
    return obj;
  }
  function normalizeTemplePayload(payload, fallbackId){
    const body = payload || {};
    const id = String(body.id || fallbackId || '').trim();
    if (!id) return null;

    const out = { id };
    const str = (k) => { if (body[k] !== undefined) out[k] = String(body[k] || '').trim(); };
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

    str('name'); str('category'); str('area');
    str('type');
    num('stayMin');
    num('priceLevel');
    list('openSlots', 'open_slots');
    list('tags');
    list('wishTags', 'wish_tags');
    str('address'); str('hours'); str('maps');
    str('cover'); str('intro'); str('detail'); str('ctaText'); str('ctaUrl'); str('googlePlaceId');
    str('ig'); str('youtube');

    if (body.coverPos !== undefined || body.cover_pos !== undefined) {
      out.coverPos = String(body.coverPos || body.cover_pos || '').trim();
    }

    if (body.featured !== undefined || body.featured_ !== undefined) {
      out.featured = !!(body.featured || body.featured_);
    }
    if (body.rating !== undefined) out.rating = body.rating;
    if (body.lat !== undefined) out.lat = body.lat;
    if (body.lng !== undefined) out.lng = body.lng;

    return out;
  }
  function mergeTempleRecord(existing, incoming, options){
    const out = Object.assign({}, existing || {});
    const preserveExisting = !!(options && options.preserveExisting);
    if (!incoming) return out;
    const assignIf = (key, val)=>{
      if (val === undefined) return;
      if (preserveExisting && out[key] != null && out[key] !== '' && (!Array.isArray(out[key]) || out[key].length > 0)) return;
      out[key] = val;
    };
    assignIf('name', incoming.name);
    assignIf('category', incoming.category);
    assignIf('area', incoming.area);
    assignIf('type', incoming.type);
    assignIf('stayMin', incoming.stayMin);
    assignIf('openSlots', incoming.openSlots);
    assignIf('priceLevel', incoming.priceLevel);
    assignIf('tags', incoming.tags);
    assignIf('wishTags', incoming.wishTags);
    assignIf('address', incoming.address);
    assignIf('hours', incoming.hours);
    assignIf('maps', incoming.maps);
    assignIf('ig', incoming.ig);
    assignIf('youtube', incoming.youtube);
    assignIf('cover', incoming.cover);
    assignIf('coverPos', incoming.coverPos);
    assignIf('intro', incoming.intro);
    assignIf('detail', incoming.detail);
    assignIf('ctaText', incoming.ctaText);
    assignIf('ctaUrl', incoming.ctaUrl);
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
  async function deleteTemple(env, id){
    if (!env.TEMPLES || !id) return false;
    await env.TEMPLES.delete(templeKey(id));
    return true;
  }
  function resetTemplesListMemoryCache(){
    TEMPLES_LIST_CACHE.ts = 0;
    TEMPLES_LIST_CACHE.items = null;
  }
  async function readTemplesListCacheRaw(env){
    if (!env.TEMPLES || !env.TEMPLES.get) return null;
    try{
      const raw = await env.TEMPLES.get(TEMPLES_LIST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return null;
      return data.items;
    }catch(_){
      return null;
    }
  }
  const getTemplesListCacheRaw = readTemplesListCacheRaw;
  async function readTemplesListCache(env){
    if (!env.TEMPLES || !env.TEMPLES.get) return null;
    try{
      const raw = await env.TEMPLES.get(TEMPLES_LIST_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return null;
      const ts = Number(data.ts || 0);
      if (!ts) return null;
      if ((Date.now() - ts) > TEMPLES_LIST_KV_TTL * 1000) return null;
      return data.items;
    }catch(_){
      return null;
    }
  }
  const getTemplesListCache = readTemplesListCache;
  async function writeTemplesListCache(env, items){
    if (!env.TEMPLES || !env.TEMPLES.put) return;
    if (!Array.isArray(items)) return;
    try{
      await env.TEMPLES.put(TEMPLES_LIST_KEY, JSON.stringify({
        ts: Date.now(),
        items
      }));
    }catch(_){}
  }
  const saveTemplesListCache = writeTemplesListCache;
  async function deleteTemplesListCache(env){
    if (!env.TEMPLES || !env.TEMPLES.delete) return;
    try{ await env.TEMPLES.delete(TEMPLES_LIST_KEY); }catch(_){}
  }
  async function upsertTemplesListCache(env, item){
    if (!item || !item.id) return;
    const items = await readTemplesListCacheRaw(env);
    if (!items) return;
    const next = items.filter(it=> it && it.id && it.id !== item.id);
    if (!item.deleted) next.push(item);
    await writeTemplesListCache(env, next);
  }
  async function listTemples(env, limit, opts = {}){
    const out = [];
    if (!env.TEMPLES || !env.TEMPLES.list) return out;
    const useCache = opts.cache !== false;
    const now = Date.now();
    if (useCache && TEMPLES_LIST_CACHE.items && (now - TEMPLES_LIST_CACHE.ts) < TEMPLES_LIST_TTL){
      const cached = TEMPLES_LIST_CACHE.items;
      return cached.slice(0, limit || cached.length);
    }
    const iter = await env.TEMPLES.list({ prefix:'TEMPLE:' });
    const keys = Array.isArray(iter.keys) ? iter.keys.slice(0, limit||200) : [];
    const chunkSize = 30;
    for (let i = 0; i < keys.length; i += chunkSize){
      const chunk = keys.slice(i, i + chunkSize);
      const raws = await Promise.all(chunk.map(k=> env.TEMPLES.get(k.name)));
      raws.forEach((raw)=>{
        if (!raw) return;
        try{
          const obj = JSON.parse(raw);
          if (obj && obj.id) out.push(obj);
        }catch(_){}
      });
    }
    if (useCache){
      TEMPLES_LIST_CACHE.items = out;
      TEMPLES_LIST_CACHE.ts = now;
    }
    return out;
  }
  async function readCoupon(env, code){
    if (!env.COUPONS) return null;
    if (!code) return null;
    try{
      const raw = await env.COUPONS.get(couponKey(code));
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(_){ return null; }
  }
  async function saveCoupon(env, obj){
    if (!env.COUPONS || !obj || !obj.code) return null;
    const rec = Object.assign({}, obj);
    await env.COUPONS.put(couponKey(obj.code), JSON.stringify(rec));
    return rec;
  }
  async function generateUniqueCouponCode(env, deity){
    const d = String(deity || '').trim().toUpperCase() || 'XX';
    if (!env || !env.COUPONS) return makeCouponCode(d);
    for (let i=0;i<6;i++){
      const cand = makeCouponCode(d);
      const exists = await env.COUPONS.get(couponKey(cand));
      if (!exists) return cand;
    }
    return makeCouponCode(d);
  }
  async function issueWelcomeCoupon(env, record){
    if (!env || !env.COUPONS || !record || !record.id) return null;
    if (record.welcomeCouponIssued || record.welcomeCoupon) return null;
    try{
      const ttlDays = Math.max(1, Number(env.WELCOME_COUPON_TTL_DAYS || 14) || 14);
      const amount = Math.max(1, Number(env.WELCOME_COUPON_AMOUNT || 200) || 200);
      const now = new Date();
      const issuedAt = now.toISOString();
      const expireAt = new Date(now.getTime() + ttlDays * 86400000).toISOString();
      const code = await generateUniqueCouponCode(env, 'ALL');
      const rec = {
        code,
        deity: 'ALL',
        type: 'ALL',
        amount,
        issuedAt,
        expireAt,
        issuedFrom: 'welcome',
        issuedTo: record.id,
        used: false
      };
      await saveCoupon(env, rec);
      const list = Array.isArray(record.coupons) ? record.coupons.slice() : [];
      if (!list.includes(code)) list.unshift(code);
      record.coupons = list.slice(0, 200);
      record.welcomeCouponIssued = true;
      record.welcomeCoupon = { code, issuedAt, expireAt, amount };
      return rec;
    }catch(_){
      return null;
    }
  }
  async function getUserCouponUnread(env, record){
    if (!record) return 0;
    const rawCodes = [];
    if (Array.isArray(record.coupons)) rawCodes.push(...record.coupons);
    if (record.welcomeCoupon && record.welcomeCoupon.code) rawCodes.push(record.welcomeCoupon.code);
    const codes = Array.from(new Set(
      rawCodes.map(c => String(c || '').trim().toUpperCase()).filter(Boolean)
    ));
    if (!codes.length) return 0;
    const seenAt = record.couponsSeenAt ? Date.parse(record.couponsSeenAt) : 0;
    const nowTs = Date.now();
    let total = 0;
    for (const code of codes){
      const rec = await readCoupon(env, code);
      if (!rec) continue;
      if (rec.used) continue;
      if (rec.expireAt){
        const exp = Date.parse(rec.expireAt);
        if (!Number.isNaN(exp) && exp <= nowTs) continue;
      }
      let issuedAt = 0;
      if (rec.issuedAt){
        const parsed = Date.parse(rec.issuedAt);
        if (!Number.isNaN(parsed)) issuedAt = parsed;
      }
      if (issuedAt){
        if (issuedAt <= seenAt) continue;
      }else if (seenAt){
        continue;
      }
      total++;
    }
    return total;
  }
  async function revokeUserCoupons(env, record, opts = {}){
    const result = { total: 0, revoked: 0, codes: [] };
    if (!record) return result;
    const rawCodes = [];
    if (Array.isArray(record.coupons)) rawCodes.push(...record.coupons);
    if (record.welcomeCoupon && record.welcomeCoupon.code) rawCodes.push(record.welcomeCoupon.code);
    const codes = Array.from(new Set(
      rawCodes.map(c => String(c || '').trim().toUpperCase()).filter(Boolean)
    ));
    result.total = codes.length;
    result.codes = codes.slice();
    if (!codes.length) return result;
    const now = new Date().toISOString();
    const reason = String(opts.reason || 'user_deleted');
    for (const code of codes){
      let changed = false;
      if (env.COUPONS){
        try{
          const rec = await readCoupon(env, code);
          if (rec){
            if (rec.issuedTo && record.id && String(rec.issuedTo) === String(record.id)) {
              delete rec.issuedTo;
              changed = true;
            }
            if (!rec.used){
              rec.used = true;
              rec.usedAt = now;
              rec.orderId = rec.orderId || 'USER_DELETED';
              changed = true;
            }
            rec.revoked = true;
            rec.revokedAt = now;
            rec.revokedReason = reason;
            if (rec.reservedBy) {
              delete rec.reservedBy;
              delete rec.reservedAt;
              delete rec.reservedUntil;
            }
            changed = true;
            if (changed) await saveCoupon(env, rec);
          }
        }catch(_){}
      }
      if (env.ORDERS){
        try{
          await env.ORDERS.delete(`COUPON_HOLD:${code}`);
        }catch(_){}
        try{
          const usedKey = `COUPON_USED:${code}`;
          const existing = await env.ORDERS.get(usedKey);
          if (!existing){
            const payload = { code, orderId: 'USER_DELETED', ts: now, reason };
            await env.ORDERS.put(usedKey, JSON.stringify(payload));
            changed = true;
          }
        }catch(_){}
      }
      if (changed) result.revoked++;
    }
    return result;
  }
  async function redeemCoupon(env, { code, deity, orderId, lock }){
    if (!code) return { ok:false, reason:"missing_code" };
    const codeNorm = String(code||'').toUpperCase();
    if (!env.COUPONS) return { ok:false, reason:'COUPONS_not_bound' };
    const rec = await readCoupon(env, codeNorm);
    if (!rec) return { ok:false, reason:'not_found' };
    if (rec.used) return { ok:false, reason:'already_used' };
    const nowTs = Date.now();
    if (rec.reservedUntil){
      const reservedUntil = Date.parse(rec.reservedUntil);
      if (!Number.isNaN(reservedUntil) && reservedUntil > nowTs){
        const reservedBy = String(rec.reservedBy || '').trim();
        if (reservedBy && orderId && reservedBy !== String(orderId)) {
          return { ok:false, reason:'reserved' };
        }
      }
    }
    if (rec.startAt && nowTs < Date.parse(rec.startAt)) return { ok:false, reason:'not_started' };
    if (rec.expireAt && nowTs > Date.parse(rec.expireAt)) return { ok:false, reason:'expired' };
    const targetDeity = String(rec.deity||'').toUpperCase();
    const want = String(deity||'').toUpperCase();
    if (rec.type !== 'SHIP' && rec.type !== 'ALL'){
      if (targetDeity && want && targetDeity !== want){
        return { ok:false, reason:'deity_not_match' };
      }
    }
    const amount = Number(rec.amount||200)||200;
    if (lock){
      const now = new Date().toISOString();
      rec.used = true;
      rec.usedAt = now;
      rec.orderId = orderId || rec.orderId || '';
      await saveCoupon(env, rec);
    }
    return { ok:true, amount, deity: targetDeity || want || inferCouponDeity(codeNorm), type: rec.type||'DEITY', expireAt: rec.expireAt||null, startAt: rec.startAt||null };
  }

  async function generateOrderId(env){
    const store = env && env.ORDERS;
    for (let i=0;i<6;i++){
      const id = ORDER_ID_PREFIX + makeOrderCode(ORDER_ID_LEN);
      if (!store) return id;
      const hit = await store.get(id);
      if (!hit) return id;
    }
    return ORDER_ID_PREFIX + makeOrderCode(ORDER_ID_LEN + 2);
  }

  async function generateServiceOrderId(env){
    const store = env.SERVICE_ORDERS || env.ORDERS;
    for (let i=0;i<6;i++){
      const id = SERVICE_ORDER_ID_PREFIX + makeOrderCode(SERVICE_ORDER_ID_LEN);
      if (!store) return id;
      const hit = await store.get(id);
      if (!hit) return id;
    }
    return SERVICE_ORDER_ID_PREFIX + makeOrderCode(SERVICE_ORDER_ID_LEN + 2);
  }

  const DEFAULT_SERVICE_PRODUCTS = [
    {
      id: 'svc-candle-basic',
      name: '蠟燭祈福｜基本祈請',
      category: '服務型',
      description: '老師於指定吉日時為您點燃蠟燭祈願，並以泰文逐一祝禱所託願望。',
      duration: '約 7 天',
      includes: ['蠟燭祈請一次', '祈福祝禱錄音節錄'],
      price: 799,
      cover: 'https://unalomecodes.com/api/file/mock/candle-basic.png',
      options: [
        { name: '基礎蠟燭', price: 0 },
        { name: '祈願蠟燭 + 供品', price: 300 }
      ]
    },
    {
      id: 'svc-candle-plus',
      name: '蠟燭祈福｜進階供品組',
      category: '服務型',
      description: '加上供品與祈福儀式照片回傳，適合需要長期加持的願望。',
      duration: '約 14 天',
      includes: ['蠟燭祈請三次', '供品與祝禱紀錄', '祈福成果照片'],
      price: 1299,
      cover: 'https://unalomecodes.com/api/file/mock/candle-plus.png',
      options: [
        { name: '進階供品組', price: 0 },
        { name: '供品＋特別祈禱', price: 500 }
      ]
    }
  ];

  function normalizeTWPhoneStrict(raw){
    const digits = String(raw||'').replace(/\D+/g,'');
    if (!digits) return '';
    if (digits.startsWith('886') && digits.length >= 11){
      const rest = digits.slice(3);
      if (rest.startsWith('9')) return '0' + rest.slice(0,9);
      return rest;
    }
    if (digits.startsWith('09') && digits.length === 10) return digits;
    if (digits.length === 9 && digits.startsWith('9')) return '0' + digits;
    return digits.slice(-10);
  }

  function lastDigits(str, count=5){
    return String(str||'').replace(/\D+/g,'').slice(-count);
  }
  function normalizeOrderSuffix(str, count=5){
    return String(str||'').replace(/[^0-9a-z]/ig,'').toUpperCase().slice(-count);
  }
  function normalizeQuizInput(raw){
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    if (raw.dow) out.dow = String(raw.dow).trim();
    if (raw.dowLabel) out.dowLabel = String(raw.dowLabel).trim();
    if (raw.zod) out.zod = String(raw.zod).trim();
    if (raw.zodLabel) out.zodLabel = String(raw.zodLabel).trim();
    if (raw.job) out.job = String(raw.job).trim();
    if (raw.jobLabel) out.jobLabel = String(raw.jobLabel).trim();
    if (raw.color) out.color = String(raw.color).trim();
    if (Array.isArray(raw.traits)){
      out.traits = raw.traits.map(s=>String(s||'').trim()).filter(Boolean).slice(0, 12);
    }
    if (raw.answers && typeof raw.answers === 'object'){
      const ans = {};
      ['p2','p3','p4','p5','p6','p7'].forEach(k=>{
        if (raw.answers[k]) ans[k] = String(raw.answers[k]).trim();
      });
      out.answers = ans;
    }
    try{
      out.ts = raw.ts ? new Date(raw.ts).toISOString() : new Date().toISOString();
    }catch(_){
      out.ts = new Date().toISOString();
    }
    return out;
  }

  // Generate a public-share token for ritual results
  function makeToken(len=32){
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    if (typeof crypto !== "undefined" && crypto.getRandomValues){
      const buf = new Uint8Array(len);
      crypto.getRandomValues(buf);
      for (let i=0;i<len;i++) s += abc[buf[i] % abc.length];
      return s;
    }
    for (let i=0;i<len;i++) s += abc[Math.floor(Math.random()*abc.length)];
    return s;
  }

  function makeOrderCode(len=10){
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    if (typeof crypto !== "undefined" && crypto.getRandomValues){
      const buf = new Uint8Array(len);
      crypto.getRandomValues(buf);
      for (let i=0;i<len;i++) s += abc[buf[i] % abc.length];
      return s;
    }
    for (let i=0;i<len;i++) s += abc[Math.floor(Math.random()*abc.length)];
    return s;
  }

  function base64UrlEncode(input){
    let bytes;
    if (typeof input === 'string'){
      bytes = new TextEncoder().encode(input);
    } else if (input instanceof Uint8Array){
      bytes = input;
    } else if (input instanceof ArrayBuffer){
      bytes = new Uint8Array(input);
    } else {
      bytes = new TextEncoder().encode(String(input || ''));
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i++){
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function base64UrlDecodeToBytes(b64){
    const normalized = b64.replace(/-/g,'+').replace(/_/g,'/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i=0;i<len;i++){
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function escapeHtmlAttr(value){
    return String(value || '')
      .replace(/&/g,'&amp;')
      .replace(/"/g,'&quot;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  function redirectWithBody(location, headers){
    const safeUrl = escapeHtmlAttr(location || '/');
    const html = `<!doctype html>
  <html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${safeUrl}">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>轉跳中</title>
  </head>
  <body style="background:#0f172a;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
    <div style="text-align:center;max-width:420px;padding:24px">
      <div style="font-size:16px;margin-bottom:10px">登入完成，正在返回後台…</div>
      <a href="${safeUrl}" style="color:#eab308;text-decoration:none;font-weight:700">若未自動跳轉，請點此返回</a>
    </div>
    <script>setTimeout(function(){ location.replace(${JSON.stringify(location || '/')}); }, 150);</script>
  </body>
  </html>`;
    const h = new Headers(headers || {});
    h.set('Content-Type', 'text/html; charset=utf-8');
    h.set('Cache-Control', 'no-store');
    h.set('Location', location || '/');
    return new Response(html, { status:302, headers: h });
  }

  async function hmacSha256(secret, data){
    if (!secret) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name:'HMAC', hash:'SHA-256' },
      false,
      ['sign','verify']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return new Uint8Array(sig);
  }

  async function makeSignedState(payload, secret){
    if (!secret) return '';
    const body = JSON.stringify(payload || {});
    const payloadB64 = base64UrlEncode(body);
    const sigBytes = await hmacSha256(secret, payloadB64);
    if (!sigBytes) return '';
    const sigB64 = base64UrlEncode(sigBytes);
    return `${payloadB64}.${sigB64}`;
  }

  async function verifySignedState(state, secret, maxAgeSec){
    if (!state || !secret) return null;
    const parts = String(state).split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    let sigBytes;
    try{
      sigBytes = base64UrlDecodeToBytes(sigB64);
    }catch(_){
      return null;
    }
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name:'HMAC', hash:'SHA-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payloadB64));
    if (!ok) return null;
    let payload = null;
    try{
      const decoded = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
      payload = JSON.parse(decoded);
    }catch(_){
      return null;
    }
    if (maxAgeSec){
      const ts = Number(payload && payload.t);
      if (!Number.isFinite(ts)) return null;
      const age = Math.floor(Date.now() / 1000) - ts;
      if (age < 0 || age > maxAgeSec) return null;
    }
    return payload;
  }

  function csvEscape(val){
    const s = String(val ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')){
      return `"${s.replace(/"/g,'""')}"`;
    }
    return s;
  }

  function formatTZ(ts, offsetHours=0){
    if (!ts) return '';
    try{
      const t = new Date(ts).getTime();
      const shifted = t + (offsetHours * 3600 * 1000);
      const d = new Date(shifted);
      return d.toISOString().replace('T',' ').replace(/\.\d+Z$/,'');
    }catch(_){ return ts; }
  }

  function taipeiDateKey(ts=Date.now()){
    const d = new Date(ts + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  async function recordFortuneStat(env, dateKey, userId){
    if (!env || !env.FORTUNES || !dateKey || !userId) return;
    const seenKey = `${FORTUNE_STATS_SEEN_PREFIX}${dateKey}:${userId}`;
    const countKey = `${FORTUNE_STATS_PREFIX}${dateKey}`;
    try{
      const seen = await env.FORTUNES.get(seenKey);
      if (seen) return;
      await env.FORTUNES.put(seenKey, '1', { expirationTtl: 60 * 60 * 24 * 90 });
      const raw = await env.FORTUNES.get(countKey);
      const count = (parseInt(raw || '0', 10) || 0) + 1;
      await env.FORTUNES.put(countKey, String(count), { expirationTtl: 60 * 60 * 24 * 365 });
    }catch(_){}
  }
  async function recordFoodMapStat(env, dateKey, clientId){
    if (!env || !env.FOODS || !dateKey || !clientId) return;
    const dailySeenKey = `FOOD_STATS:SEEN:${dateKey}:${clientId}`;
    const dailyCountKey = `FOOD_STATS:${dateKey}`;
    const totalSeenKey = `FOOD_STATS:USER_SEEN:${clientId}`;
    const totalCountKey = `FOOD_STATS:TOTAL_UNIQUE`;

    try{
      // Daily unique visitor
      const seenToday = await env.FOODS.get(dailySeenKey);
      if (!seenToday) {
        await env.FOODS.put(dailySeenKey, '1', { expirationTtl: 60 * 60 * 24 * 2 });
        const rawDaily = await env.FOODS.get(dailyCountKey);
        const dailyCount = (parseInt(rawDaily || '0', 10) || 0) + 1;
        await env.FOODS.put(dailyCountKey, String(dailyCount));
      }

      // Total unique visitor
      const seenEver = await env.FOODS.get(totalSeenKey);
      if (!seenEver) {
        await env.FOODS.put(totalSeenKey, '1'); // No TTL, mark as seen forever
        const rawTotal = await env.FOODS.get(totalCountKey);
        const totalCount = (parseInt(rawTotal || '0', 10) || 0) + 1;
        await env.FOODS.put(totalCountKey, String(totalCount));
      }
    }catch(_){}
  }
  async function recordTempleMapStat(env, dateKey, clientId){
    if (!env || !env.TEMPLES || !dateKey || !clientId) return;
    const dailySeenKey = `TEMPLE_STATS:SEEN:${dateKey}:${clientId}`;
    const dailyCountKey = `TEMPLE_STATS:${dateKey}`;
    const totalSeenKey = `TEMPLE_STATS:USER_SEEN:${clientId}`;
    const totalCountKey = `TEMPLE_STATS:TOTAL_UNIQUE`;

    try{
      const seenToday = await env.TEMPLES.get(dailySeenKey);
      if (!seenToday) {
        await env.TEMPLES.put(dailySeenKey, '1', { expirationTtl: 60 * 60 * 24 * 2 });
        const rawDaily = await env.TEMPLES.get(dailyCountKey);
        const dailyCount = (parseInt(rawDaily || '0', 10) || 0) + 1;
        await env.TEMPLES.put(dailyCountKey, String(dailyCount));
      }

      const seenEver = await env.TEMPLES.get(totalSeenKey);
      if (!seenEver) {
        await env.TEMPLES.put(totalSeenKey, '1');
        const rawTotal = await env.TEMPLES.get(totalCountKey);
        const totalCount = (parseInt(rawTotal || '0', 10) || 0) + 1;
        await env.TEMPLES.put(totalCountKey, String(totalCount));
      }
    }catch(_){}
  }
  const CREATOR_INVITE_TTL = 60 * 60 * 24 * 30;
  const CREATOR_INVITE_LINK_TTL = 60 * 60 * 24;
  function creatorInviteKey(code){
    return `CREATOR_INVITE:${code}`;
  }
  function normalizeCreatorCode(input){
    return String(input || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }
  function generateCreatorInviteCode(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++){
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }
  function isFoodCreator(record){
    return !!(record && record.creatorFoods);
  }
  function hasCreatorTermsAccepted(record){
    return !!(record && (record.creatorTermsAccepted || record.creatorTermsAcceptedAt));
  }
  function resolveCreatorName(record){
    return String(record && (record.creatorName || record.name || record.email) || '').trim();
  }
  const TRACK_EVENT_TTL = 60 * 60 * 24 * 180;
  function pickTrackStore(env){
    return env.TRACKING || env.ANALYTICS || env.STATS || env.ORDERS || env.SERVICE_ORDERS || env.FOODS || env.TEMPLES || null;
  }
  function normalizeTrackEvent(input){
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.replace(/[^a-z0-9_.-]+/g, '_').slice(0, 48);
  }
  function normalizeTrackLabel(input, fallback){
    const raw = String(input || '').trim();
    if (!raw) return fallback || '';
    return raw.toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  }
  async function recordTrackEvent(env, eventName, utm){
    const store = pickTrackStore(env);
    if (!store || !eventName) return false;
    const source = normalizeTrackLabel(utm && (utm.source || utm.utm_source), 'direct');
    const campaign = normalizeTrackLabel(utm && (utm.campaign || utm.utm_campaign), '');
    const dateKey = taipeiDateKey();
    const key = `TRACK:${dateKey}:EVENT:${eventName}`;
    let data = { total: 0, sources: {}, campaigns: {} };
    try{
      const raw = await store.get(key);
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') data = parsed;
      }
    }catch(_){}
    data.total = (parseInt(data.total || 0, 10) || 0) + 1;
    if (source){
      data.sources = data.sources && typeof data.sources === 'object' ? data.sources : {};
      data.sources[source] = (parseInt(data.sources[source] || 0, 10) || 0) + 1;
    }
    if (campaign){
      data.campaigns = data.campaigns && typeof data.campaigns === 'object' ? data.campaigns : {};
      data.campaigns[campaign] = (parseInt(data.campaigns[campaign] || 0, 10) || 0) + 1;
    }
    data.updatedAt = new Date().toISOString();
    try{
      await store.put(key, JSON.stringify(data), { expirationTtl: TRACK_EVENT_TTL });
    }catch(_){}
    return true;
  }
  function taipeiDateParts(ts=Date.now()){
    const d = new Date(ts + 8 * 3600 * 1000);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      dow: d.getUTCDay()
    };
  }
  function formatTaipeiDate(ts=Date.now()){
    const p = taipeiDateParts(ts);
    return `${p.year}/${String(p.month).padStart(2,'0')}/${String(p.day).padStart(2,'0')}`;
  }
  function fnv1aHash(str){
    let h = 2166136261>>>0;
    for (let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h>>>0;
  }
  function pickBySeed(list, seed){
    if (!Array.isArray(list) || !list.length) return '';
    const idx = Math.abs(seed) % list.length;
    return list[idx];
  }
  const ZODIAC_TABLE = [
    { key:'Capricorn', name:'魔羯座', element:'土', from:[12,22], to:[1,19] },
    { key:'Aquarius', name:'水瓶座', element:'風', from:[1,20], to:[2,18] },
    { key:'Pisces', name:'雙魚座', element:'水', from:[2,19], to:[3,20] },
    { key:'Aries', name:'牡羊座', element:'火', from:[3,21], to:[4,19] },
    { key:'Taurus', name:'金牛座', element:'土', from:[4,20], to:[5,20] },
    { key:'Gemini', name:'雙子座', element:'風', from:[5,21], to:[6,20] },
    { key:'Cancer', name:'巨蟹座', element:'水', from:[6,21], to:[7,22] },
    { key:'Leo', name:'獅子座', element:'火', from:[7,23], to:[8,22] },
    { key:'Virgo', name:'處女座', element:'土', from:[8,23], to:[9,22] },
    { key:'Libra', name:'天秤座', element:'風', from:[9,23], to:[10,22] },
    { key:'Scorpio', name:'天蠍座', element:'水', from:[10,23], to:[11,21] },
    { key:'Sagittarius', name:'射手座', element:'火', from:[11,22], to:[12,21] }
  ];
  function sunSignByDate(month, day){
    for (const item of ZODIAC_TABLE){
      const [fm, fd] = item.from;
      const [tm, td] = item.to;
      if (fm <= tm){
        if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return item;
      }else{
        if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm || month < tm)) return item;
      }
    }
    return ZODIAC_TABLE[0];
  }
  function zodiacInfoByKey(raw){
    const val = String(raw || '').trim();
    if (!val) return null;
    const cleaned = val.replace(/[^\u4e00-\u9fffA-Za-z]/g, '');
    const lower = val.toLowerCase();
    const lowerClean = cleaned.toLowerCase();
    for (const item of ZODIAC_TABLE){
      if (item.key.toLowerCase() === lower || item.key.toLowerCase() === lowerClean) return item;
      if (item.name === val || item.name === cleaned) return item;
    }
    for (const item of ZODIAC_TABLE){
      if (val.includes(item.name) || cleaned.includes(item.name)) return item;
    }
    return null;
  }
  function moonPhaseInfo(ts=Date.now()){
    const synodic = 29.530588853;
    const newMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
    const days = (ts - newMoon) / 86400000;
    const phase = ((days % synodic) + synodic) % synodic;
    const idx = Math.floor((phase / synodic) * 8);
    const names = [
      { name:'新月', tag:'New Moon' },
      { name:'上弦前月牙', tag:'Waxing Crescent' },
      { name:'上弦月', tag:'First Quarter' },
      { name:'盈凸月', tag:'Waxing Gibbous' },
      { name:'滿月', tag:'Full Moon' },
      { name:'虧凸月', tag:'Waning Gibbous' },
      { name:'下弦月', tag:'Last Quarter' },
      { name:'殘月', tag:'Waning Crescent' }
    ];
    return names[idx] || names[0];
  }
  function thaiDayColor(dow){
    const map = ['紅','黃','粉紅','綠','橘','藍','紫'];
    return map[dow] || '';
  }
  const PHUM_LABEL = {
    BORIWAN:'บริวาร (Boriwan)',
    AYU:'อายุ (Ayu)',
    DECH:'เดช (Dech)',
    SRI:'ศรี (Sri)',
    MULA:'มูละ (Mula)',
    UTSAHA:'อุตสาหะ (Utsaha)',
    MONTRI:'มนตรี (Montri)',
    KALAKINI:'กาลกิณี (Kalakini)'
  };
  const MANTRA_LIST = [
    'นะโมเมตตา สุขัง',
    'โอม นะ โม พุท ธา ยะ',
    'นะโม พุท ธา ยะ',
    'โอม สุขะโต'
  ];
  function toBirthWeekdayKey(quiz){
    const raw = String(quiz?.dow || '').trim();
    if (!raw) return '';
    const map = { Sun:'SUN', Mon:'MON', Tue:'TUE', Wed:'WED', Thu:'THU', Fri:'FRI', Sat:'SAT' };
    const key = map[raw] || map[raw.slice(0,3)];
    return key || raw.toUpperCase();
  }
  function buildLuckyNumbers(seedStr){
    const base = fnv1aHash(seedStr);
    const first = (base % 99) + 1;
    const second = (fnv1aHash(seedStr + ':b') % 99) + 1;
    if (second === first){
      const third = (fnv1aHash(seedStr + ':c') % 99) + 1;
      return [first, third === first ? ((third % 99) + 1) : third];
    }
    return [first, second];
  }
  const ICHING_NAMES = [
    '乾為天','坤為地','水雷屯','山水蒙','水天需','天水訟','地水師','水地比',
    '風天小畜','天澤履','地天泰','天地否','天火同人','火天大有','地山謙','雷地豫',
    '澤雷隨','山風蠱','地澤臨','風地觀','火雷噬嗑','山火賁','山地剝','地雷復',
    '天雷無妄','山天大畜','山雷頤','澤風大過','坎為水','離為火','澤山咸','雷風恆',
    '天山遯','雷天大壯','火地晉','地火明夷','風火家人','火澤睽','水山蹇','雷水解',
    '山澤損','風雷益','澤天夬','天風姤','澤地萃','地風升','澤水困','水風井',
    '澤火革','火風鼎','震為雷','艮為山','風山漸','雷澤歸妹','雷火豐','火山旅',
    '巽為風','兌為澤','風水渙','水澤節','風澤中孚','雷山小過','水火既濟','火水未濟'
  ];
  const GUARDIAN_MESSAGES = {
    FM:'把擔心交給時間，今天只要把一件事做到最好就足夠。',
    GA:'閉上眼深呼吸三次，想清楚目標再出發，你會更順。',
    CD:'先穩住情緒，再處理問題，你的穩定就是幸運。',
    KP:'把柔軟放在心裡，但行動要堅定，今天會有好轉。',
    HP:'相信自己走在對的路上，慢一點也沒關係。',
    XZ:'少一點內耗，多一點耐心，今天的你會更清明。',
    WE:'把注意力放回當下，會發現答案一直都在。',
    HM:'給自己一句肯定：我可以做到，然後就去做。',
    RH:'保持界線、拒絕干擾，你會越走越穩。',
    JL:'把機會握緊，今天的努力會換來回報。',
    ZD:'先整理財務與節奏，穩定就是最好的好運。',
    ZF:'對自己溫柔一點，人緣與幸福自然靠近。'
  };
  const GUARDIAN_TONE = {
    FM:'穩重、全局感',
    GA:'開路、果斷',
    CD:'安定、踏實',
    KP:'親和、柔中帶剛',
    HP:'守護、堅定',
    XZ:'冷靜、洞察',
    WE:'穩定、守護',
    HM:'鼓舞、行動派',
    RH:'切割雜訊、果敢',
    JL:'權威、效率',
    ZD:'務實、保守',
    ZF:'溫柔、關係導向'
  };
  function textSimilarity(a, b){
    const norm = (s)=> String(s||'').replace(/\s+/g,'').toLowerCase();
    const aa = norm(a);
    const bb = norm(b);
    if (!aa || !bb) return 0;
    if (aa === bb) return 1;
    const grams = (s)=>{
      const set = new Set();
      for (let i=0;i<s.length-1;i++) set.add(s.slice(i, i+2));
      return set;
    };
    const g1 = grams(aa);
    const g2 = grams(bb);
    let inter = 0;
    for (const x of g1) if (g2.has(x)) inter++;
    const union = g1.size + g2.size - inter;
    return union ? inter / union : 0;
  }
  function normalizeTaskText(text){
    return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function isTooSimilar(fortune, history){
    const task = normalizeTaskText(fortune?.action?.task || '');
    if (!task) return false;
    for (const h of history){
      if (!h || !h.action || !h.action.task) continue;
      if (normalizeTaskText(h.action.task) === task) return true;
    }
    return false;
  }
  function isTooSimilarLegacy(fortune, history){
    const summary = fortune?.summary || '';
    const advice = fortune?.advice || '';
    for (const h of history){
      if (!h) continue;
      const hs = h.summary || '';
      const ha = h.advice || '';
      if (textSimilarity(summary, hs) > 0.84) return true;
      if (textSimilarity(advice, ha) > 0.84) return true;
    }
    return false;
  }
  const FORTUNE_THEMES = ['穩定聚焦','重新整理','小幅突破','順勢前行','修復節奏','溫和推進'];
  const FORTUNE_FOCUSES = ['整理手邊任務','與人溝通協調','身心平衡','財務細節','學習精進','斷捨離'];
  function buildStarText(seed){
    const stars = (seed % 4) + 2;
    return '🌟'.repeat(stars) + '☆'.repeat(5 - stars);
  }
  function buildAdviceLine(seed){
    const theme = pickBySeed(FORTUNE_THEMES, seed);
    const focus = pickBySeed(FORTUNE_FOCUSES, seed + 7);
    return {
      theme,
      focus,
      line: `今日運勢偏向「${theme}」，把重點放在${focus}會更順。`
    };
  }
  function stripAdviceLine(text){
    const raw = String(text || '');
    let cleaned = raw.replace(/今日運勢偏向[^。！？!?]*[。！？!?]?/g, '');
    cleaned = cleaned.replace(/^[\s。！？!?、，]+/g, '').replace(/\s+/g, ' ');
    return cleaned.trim();
  }
  function normalizeAdviceWithLine(advice, line){
    const cleaned = stripAdviceLine(advice);
    if (!line) return cleaned;
    if (!cleaned) return line;
    return `${line}${cleaned}`;
  }
  const TASK_POOL = {
    BORIWAN:{
      work:[
        '整理 3 份今天要用的文件並命名清楚。',
        '列出今天最重要的 2 個合作事項並標記負責人。'
      ],
      love:[
        '寫下 1 句你想對對方說的肯定話。',
        '回覆一則訊息，清楚說出你的期待。'
      ],
      money:[
        '記下今天的 3 筆固定支出並核對金額。',
        '整理一張常用帳戶的收支項目。'
      ],
      health:[
        '做 3 次深呼吸，放慢節奏再開始工作。',
        '喝一杯溫水，並做 3 次伸展。'
      ],
      social:[
        '傳一則訊息確認一個合作時間。',
        '整理你今天需要聯絡的 3 個人名單。'
      ],
      study:[
        '整理 3 個今天要看的重點並做記號。',
        '花 10 分鐘複習一頁筆記並寫下 1 行摘要。'
      ]
    },
    AYU:{
      work:[
        '把今日待辦分成「必做」與「可延後」兩欄。',
        '設定 15 分鐘計時，先完成一件小工作。',
        '把今天最重要的一件事寫成 1 句行動。',
        '整理桌面檔案 3 個，避免分心。',
        '把會議/回覆清單縮成 3 件內。',
        '關閉 2 個干擾通知並設定 15 分鐘專注。'
      ],
      love:[
        '安排 10 分鐘安靜對話，先聽再說。',
        '寫下你今天想維持的相處節奏。'
      ],
      money:[
        '檢查今天是否有延遲付款項目並標記。',
        '整理一筆你近期可延後的支出。',
        '記下今天一筆可省下的支出項目。',
        '檢查一筆固定扣款的日期與金額。',
        '把今天的購物清單縮成 3 樣內。',
        '確認一筆帳單金額是否正確。'
      ],
      health:[
        '做 3 組緩慢伸展，讓身體回到節奏。',
        '把今天的水量分成 3 次提醒。',
        '做 5 次深呼吸並放慢步調。',
        '站起來走動 5 分鐘，放鬆肩頸。',
        '把手機放遠 10 分鐘，讓眼睛休息。',
        '寫下今天要避免的 1 個不良姿勢。'
      ],
      social:[
        '回覆一則關心訊息，避免延遲。',
        '整理今天需要回覆的 3 則訊息。'
      ],
      study:[
        '設定 15 分鐘專注學習並寫下 1 行重點。',
        '把今天的學習目標縮成 2 個小點。'
      ]
    },
    DECH:{
      work:[
        '把一件卡關事項寫成 3 個步驟。',
        '刪除 5 封不重要郵件並清空收件匣一角。',
        '把今天最難的一件事拆成 2 個小步驟。',
        '完成一個你一直拖延的小工作項目。',
        '把一份待提交的內容先完成 80%。',
        '關閉一個干擾視窗並專心處理 15 分鐘。'
      ],
      love:[
        '寫下你想要的界線與底線各 1 句。',
        '把一件想說清楚的事用 3 行表達。'
      ],
      money:[
        '列出一筆可立即改善的支出。',
        '為一項付款設定提醒並記錄金額。'
      ],
      health:[
        '整理一項會讓你壓力大的小習慣並暫停。',
        '用 10 分鐘走動或伸展降低緊繃感。'
      ],
      social:[
        '直接回覆一位你需要面對的人，避免拖延。',
        '刪除 3 個無效群組或靜音一個干擾來源。',
        '把需要協調的事項用一句話清楚說明。',
        '回覆一則重要訊息並確認下一步。',
        '整理今天要聯絡的 2 位對象。',
        '停止一段無效對話，把重點寫清楚。'
      ],
      study:[
        '挑一個問題寫下 3 個解法。',
        '完成一個你一直拖延的小練習。'
      ]
    },
    SRI:{
      work:[
        '把今天要說的重要內容寫成 3 行重點。',
        '整理一份你要提交的文件並補齊標題。'
      ],
      love:[
        '寫下你對關係的 1 個具體期望。',
        '用一句話肯定對方的努力。',
        '回覆一則訊息並加上一句感謝。',
        '寫下你希望對方理解的 1 句話。',
        '主動提出一件可一起完成的小事。',
        '把一個誤會點用一句話說清楚。'
      ],
      money:[
        '檢查一筆收入來源並記錄日期。',
        '整理一項你想增加的收入方向。',
        '對照一筆帳單，確認是否有重複扣款。',
        '整理一張常用付款方式的限額。',
        '記下本週可優化的 1 個支出項目。',
        '把今天的收支寫成 2 行摘要。'
      ],
      health:[
        '安排 10 分鐘陽光或戶外呼吸。',
        '把今天的作息提醒寫在便利貼。'
      ],
      social:[
        '約定一個簡短會面時間並確認地點。',
        '回覆一位重要對象並保持禮貌。'
      ],
      study:[
        '整理一頁筆記並加上 3 個關鍵詞。',
        '用 10 分鐘重讀一段重要內容。'
      ]
    },
    MULA:{
      work:[
        '整理工作檔案夾，刪除 3 個無用檔。',
        '把明天的第一件事寫在便條紙上。'
      ],
      love:[
        '寫下一句你希望被理解的話。',
        '在訊息中補充一個你在意的小細節。'
      ],
      money:[
        '記下今天的必支出項目與金額。',
        '檢查一張帳單的到期日。'
      ],
      health:[
        '整理一個讓你放鬆的角落。',
        '做 5 分鐘伸展或輕微走動。'
      ],
      social:[
        '整理聯絡人清單，標記 2 個需要回覆的對象。',
        '關閉一個容易分心的通知。'
      ],
      study:[
        '整理今天學到的 3 個重點。',
        '把一頁筆記重新抄寫清楚。'
      ]
    },
    UTSAHA:{
      work:[
        '設定 15 分鐘深度工作，完成一段核心內容。',
        '列出今天能完成的 2 件小成果並打勾。'
      ],
      love:[
        '主動提出一件你願意做的實際行動。',
        '用一句話確認今天的相處安排。'
      ],
      money:[
        '完成一筆必要付款，避免拖延。',
        '整理一項收入目標並寫下下一步。'
      ],
      health:[
        '完成 10 分鐘活動，讓身體動起來。',
        '把今天要避免的飲食寫下來。'
      ],
      social:[
        '約定一個 10 分鐘的簡短會議或通話。',
        '主動回覆一則重要訊息並確認細節。'
      ],
      study:[
        '安排 15 分鐘專注學習並做 3 個重點筆記。',
        '完成一個練習題並核對答案。'
      ]
    },
    MONTRI:{
      work:[
        '請求一位同事給你 1 個具體建議。',
        '把需要協調的事項寫成一句話發出去。'
      ],
      love:[
        '向對方請教一個你不確定的問題。',
        '整理一個你想確認的共識點。'
      ],
      money:[
        '詢問一筆支出的必要性，做簡單評估。',
        '整理今天想避免的衝動購物項目。'
      ],
      health:[
        '請教一個健康相關的小習慣並記錄。',
        '把你需要被提醒的作息寫下來。'
      ],
      social:[
        '請一位朋友協助確認今天的安排。',
        '把協調需求寫成 1 句清楚訊息。'
      ],
      study:[
        '請教一個學習卡點並記錄答案。',
        '整理 3 個你今天需要釐清的問題。'
      ]
    },
    KALAKINI:{
      work:[
        '把一件高風險決定延後，先完成低風險任務。',
        '將今天的工作拆成最小步驟，只做第一步。',
        '先完成一件不需協調他人的小任務。',
        '把今天要避免的 2 件事寫下來。',
        '暫停一個可能出錯的操作，先檢查清單。',
        '把重要工作留到確認後再執行。'
      ],
      love:[
        '避免爭辯，先寫下你想說的重點再決定是否傳。',
        '把需要說明的事暫緩，先釐清自己的想法。'
      ],
      money:[
        '避免立即付款或投資，先列出利弊清單。',
        '延後一筆非必要消費，改成記帳。',
        '檢查一筆大額支出是否真的必要。',
        '暫停一筆自動扣款，先確認用途。',
        '今天只做記帳，不做新增消費決定。',
        '把一筆支出延後 24 小時再決定。'
      ],
      health:[
        '避開高強度活動，改成 10 分鐘伸展。',
        '今天先睡前提早 15 分鐘，減少身體負擔。'
      ],
      social:[
        '避免正面衝突，先整理你要說的 3 點。',
        '暫停一個會引起爭議的對話。',
        '今天不談爭議話題，只做必要回覆。',
        '先整理訊息再回，避免情緒用詞。',
        '把溝通改成書面一句話確認。',
        '延後需要對峙的溝通，先確認資訊。'
      ],
      study:[
        '避免同時學太多，先整理一個核心重點。',
        '先做複習，不進行新的高難度內容。'
      ]
    }
  };
  function normalizeBucket(focus){
    const text = String(focus || '').trim();
    if (text === '感情') return 'love';
    if (text === '財運') return 'money';
    if (text === '健康') return 'health';
    if (text === '人際') return 'social';
    if (text === '學業') return 'study';
    return 'work';
  }
  function classifyJobLabel(raw){
    const text = String(raw || '').trim();
    if (!text) return '其他';
    if (/工程|程式|開發|IT|軟體/i.test(text)) return '工程師';
    if (/設計|視覺|美術|UI|UX/i.test(text)) return '設計';
    if (/行銷|市場|廣告|品牌/i.test(text)) return '行銷';
    if (/學生|研究生|博士|碩士/i.test(text)) return '學生';
    if (/自由|接案|SOHO|Freelance/i.test(text)) return '自由業';
    if (/管理|主管|經理|PM|負責人/i.test(text)) return '管理';
    return '其他';
  }
  const STOPWORDS = [
    '壓力大','拖延','容易分心','焦慮','想要穩定','需要聚焦','社交疲乏','想突破',
    '工作','感情','財運','健康','人際','學業'
  ];
  function extractQuizKeywords(quiz){
    const results = [];
    const pushTokens = (value)=>{
      if (!value) return;
      if (Array.isArray(value)){
        value.forEach(v=> pushTokens(v));
        return;
      }
      const text = String(value || '').trim();
      if (!text) return;
      text.split(/[，,\/\s|]+/).forEach(token=>{
        const t = String(token || '').trim();
        if (t) results.push(t);
      });
    };
    pushTokens(quiz?.keywords);
    pushTokens(quiz?.kws);
    pushTokens(quiz?.tags);
    const answers = quiz?.answers || {};
    ['p2','p3','p4','p5','p6','p7'].forEach(k=>{
      pushTokens(answers[k]);
    });
    pushTokens(quiz?.jobLabel);
    pushTokens(quiz?.zodLabel);
    return results;
  }
  function isConcreteKeyword(word){
    const text = String(word || '').trim();
    if (!text) return false;
    if (STOPWORDS.includes(text)) return false;
    const ascii = /[A-Za-z]/.test(text);
    return ascii ? text.length >= 4 : text.length >= 2;
  }
  function buildUserSignals(quiz){
    const jobLabel = String(quiz?.jobLabel || quiz?.job || '').trim();
    const answers = quiz?.answers || {};
    const answersKey = ['p2','p3','p4','p5','p6','p7'].map(k=>answers[k] || '').join('|');
    const hashBase = fnv1aHash(`${answersKey}|${jobLabel}|${quiz?.zodLabel || ''}`);
    const focusPool = ['工作','感情','財運','健康','人際','學業'];
    const focus = [];
    if (/學生/i.test(jobLabel)) focus.push('學業');
    if (/業務|銷售|客服|公關|人資|HR/i.test(jobLabel)) focus.push('人際');
    if (/財務|會計|投資|金融/i.test(jobLabel)) focus.push('財運');
    if (/醫|護理|健身|教練/i.test(jobLabel)) focus.push('健康');
    if (!focus.length){
      focus.push(focusPool[hashBase % focusPool.length]);
    }
    if (focus.length < 2){
      const second = focusPool[(hashBase >> 3) % focusPool.length];
      if (second && second !== focus[0]) focus.push(second);
    }
    const traitsBase = Array.isArray(quiz?.traits) ? quiz.traits.map(s=>String(s||'').trim()).filter(Boolean) : [];
    const traitPool = ['容易分心','壓力大','拖延','社交疲乏','想突破','需要聚焦','容易焦慮','想要穩定'];
    const traits = traitsBase.slice(0, 3);
    let seed = hashBase;
    while (traits.length < 3){
      const idx = seed % traitPool.length;
      const t = traitPool[idx];
      if (t && !traits.includes(t)) traits.push(t);
      seed = (seed >> 1) + 7;
    }
    const stylePool = ['行動派','謹慎派','感性派','理性派'];
    const style = stylePool[(hashBase >> 6) % stylePool.length] || '理性派';
    const rawKeywords = extractQuizKeywords(quiz);
    const filtered = rawKeywords.map(s=>String(s||'').trim()).filter(isConcreteKeyword);
    const deduped = [];
    filtered.forEach(k=>{
      if (!deduped.includes(k)) deduped.push(k);
    });
    let keywords = deduped.slice(0, 5);
    if (!keywords.length){
      const fallback = traitsBase.filter(isConcreteKeyword);
      keywords = fallback.slice(0, 5);
    }
    return {
      job: classifyJobLabel(jobLabel),
      focus: focus.slice(0, 2),
      traits: traits.slice(0, 3),
      style,
      keywords
    };
  }
  function pickPersonalTask({ phum, signals, seed, avoidTasks }){
    const bucket = normalizeBucket((signals && signals.focus && signals.focus[0]) || '');
    const pool = (TASK_POOL[phum] && TASK_POOL[phum][bucket]) || (TASK_POOL[phum] && TASK_POOL[phum].work) || (TASK_POOL.MULA && TASK_POOL.MULA.work) || [];
    const avoid = new Set((avoidTasks || []).map(normalizeTaskText).filter(Boolean));
    for (let i=0;i<pool.length;i++){
      const task = pool[(seed + i) % pool.length];
      if (!avoid.has(normalizeTaskText(task))){
        const label = PHUM_LABEL[phum] || phum || '—';
        const focusLabel = (signals && signals.focus && signals.focus[0]) ? signals.focus[0] : '工作';
        return {
          task,
          why: `今天是 ${label} 日，先把與${focusLabel}相關的可控小事完成。`
        };
      }
    }
    const fallback = pool[0] || '列出今天三個待辦，先完成最重要的一件。';
    return { task: fallback, why: '先完成一件可控的小步驟，讓節奏回正。' };
  }
  function adviceMatchesSignals(advice, signals){
    const text = String(advice || '').trim();
    if (!text) return false;
    const keywords = (signals && signals.keywords) ? signals.keywords : [];
    if (keywords.length){
      const concrete = keywords.filter(isConcreteKeyword);
      if (concrete.length){
        return concrete.some(k=> k && text.includes(k));
      }
    }
    const focus = (signals && signals.focus) ? signals.focus : [];
    if (focus.some(f=> f && text.includes(f))) return true;
    const job = (signals && signals.job) ? String(signals.job || '') : '';
    if (job && text.includes(job)) return true;
    return false;
  }
  function ensurePhumSummary(summary, phum){
    const label = PHUM_LABEL[phum] || phum || '—';
    const prefix = `今天是 ${label} 日，`;
    if (!summary) return prefix;
    if (summary.includes(label)) return summary;
    return `${prefix}${summary}`;
  }
  function buildTimingFromYam(yam){
    const best = Array.isArray(yam?.best) ? yam.best.map(s=>({ start:s.start, end:s.end, level:s.level })) : [];
    const avoid = Array.isArray(yam?.forbidden) ? yam.forbidden.map(s=>({ start:s.start, end:s.end, level:s.level })) : [];
    return { best, avoid };
  }
  async function ensureFortuneIndex(env, memberId, todayKey){
    if (!env || !env.FORTUNES || !memberId || !todayKey) return;
    const indexKey = `FORTUNE_INDEX:${memberId}`;
    try{
      const raw = await env.FORTUNES.get(indexKey);
      let list = [];
      if (raw){
        try{
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed.filter(Boolean);
        }catch(_){}
      }
      const next = [todayKey, ...list.filter(k=>k !== todayKey)].slice(0, 7);
      await env.FORTUNES.put(indexKey, JSON.stringify(next));
    }catch(_){}
  }
  function buildLocalFortuneV2(ctx, seed, avoidTasks, signals){
    const phum = ctx.thaiTaksa?.phum || '';
    const summaryParts = [
      '重點在把節奏拉回正軌，不求一次到位。',
      '先處理能掌控的事，情緒會穩下來。',
      '把複雜的事情拆小，今天會更順。'
    ];
    const adviceParts = [
      '以「完成度」取代「完美度」。',
      '先把最重要的事做完，再談優化。',
      '用 15 分鐘清理干擾源，效率會提升。'
    ];
    const ritualBase = GUARDIAN_MESSAGES[ctx.guardianCode] || '把注意力放回當下，今天會更穩。';
    const userSignals = signals || ctx.userSignals || {};
    const personal = pickPersonalTask({ phum, signals: userSignals, seed: seed + 11, avoidTasks });
    const task = personal.task;
    const starText = buildStarText(seed);
    const summary = ensurePhumSummary(pickBySeed(summaryParts, seed + 3), phum);
    const keyword = (userSignals.keywords && userSignals.keywords[0]) || '';
    const focusLabel = (userSignals.focus && userSignals.focus[0]) || '';
    let jobLabel = userSignals.job || '';
    if (jobLabel){
      jobLabel = String(jobLabel).replace(/[（(].*?[)）]/g, '').trim();
    }
    let advice = pickBySeed(adviceParts, seed + 17);
    if (keyword){
      advice = `今天適合把重點放在「${keyword}」，先整理再推進。${advice}`;
    }else if (focusLabel){
      advice = `把注意力先放回${focusLabel}，${advice}`;
    }else if (jobLabel){
      advice = `今天適合用「${jobLabel}式」的方法處理：先整理、再協調、再推進。${advice}`;
    }
    const mantra = pickBySeed(MANTRA_LIST, seed + 23);
    return {
      date: ctx.dateText,
      stars: starText,
      summary,
      advice,
      ritual: ritualBase,
      mantra,
      action: {
        task,
        why: personal.why || '用小步驟完成可驗證的行動，讓局勢回到可控範圍。'
      },
      core: ctx.thaiTaksa || {},
      timing: buildTimingFromYam(ctx.yam),
      lucky: ctx.lucky || {}
    };
  }
  function buildLocalFortune(ctx, seed){
    const advices = [
      '把最重要的一件事先完成，效率自然拉高。',
      '今天適合把界線說清楚，避免情緒耗損。',
      '把步調放慢一點，讓直覺帶你做正確選擇。',
      '用 20 分鐘整理空間，運勢會跟著回正。',
      '重要決定先寫下利弊，再做最後確認。'
    ];
    const loveNotes = [
      '有伴侶的人與異性朋友互動要拿捏分寸，避免誤會。',
      '單身者適合保持自然交流，慢慢累積好感。',
      '人際互動容易放大情緒，先聽再說會更順。',
      '適合安排短暫的交流與分享，對感情有加分。'
    ];
    const workNotes = [
      '精力旺盛，雖然難以完美，但會明顯感受到能力提升。',
      '工作步調穩定，適合收斂目標、逐步推進。',
      '今天適合專注學習與修正流程，小幅調整就有成果。',
      '需要多一點耐心處理細節，成果會更扎實。'
    ];
    const moneyNotes = [
      '財運偏保守，投資不宜過度冒進，選擇穩健標的較佳。',
      '收支需留意細節，小額支出容易累積。',
      '財運有波動，短線投資風險較高，宜保守。',
      '偏財運一般，先穩住現金流更安心。'
    ];
    const rituals = [
      '閉上眼睛誠心祈願三次，想像守護神在你身旁。',
      '對自己說一句肯定的話，今天會更有力量。',
      '用一分鐘深呼吸，讓心安定後再做決定。'
    ];
    const adviceLine = buildAdviceLine(seed);
    const advice = pickBySeed(advices, seed + 13);
    const love = pickBySeed(loveNotes, seed + 19);
    const work = pickBySeed(workNotes, seed + 23);
    const money = pickBySeed(moneyNotes, seed + 29);
    const starText = buildStarText(seed);
    const thaiColor = ctx.meta && ctx.meta.thaiDayColor ? String(ctx.meta.thaiDayColor) : '';
    const thaiHint = thaiColor ? `泰國星期色是${thaiColor}，可用小配件或穿搭呼應。` : '';
    const ritualBase = GUARDIAN_MESSAGES[ctx.guardianCode] || pickBySeed(rituals, seed + 37);
    return {
      date: ctx.dateText,
      stars: starText,
      summary: `${love}${work}${money}`,
      advice: [adviceLine.line, advice, thaiHint].filter(Boolean).join(''),
      ritual: ritualBase,
      meta: ctx.meta || {}
    };
  }
  function normalizeSummaryStars(summary){
    const text = String(summary || '').trim();
    if (!text) return '';
    const clean = text.replace(/^[★☆⭐🌟\uFE0F\s]+/g, '').trim();
    return clean;
  }
  function normalizeFortunePayloadV2(obj, ctx){
    if (!obj || typeof obj !== 'object') return null;
    const out = {};
    out.date = String(obj.date || ctx.dateText || '').trim();
    out.summary = String(obj.summary || '').trim();
    out.advice = String(obj.advice || '').trim();
    out.ritual = String(obj.ritual || '').trim();
    out.mantra = String(obj.mantra || '').trim();
    if (obj.action && typeof obj.action === 'object'){
      out.action = {
        task: String(obj.action.task || '').trim(),
        why: String(obj.action.why || obj.action.reason || '').trim()
      };
    } else {
      out.action = { task:'', why:'' };
    }
    out.core = ctx.thaiTaksa || {};
    out.timing = buildTimingFromYam(ctx.yam);
    out.lucky = ctx.lucky || {};
    if (ctx.personalTask && ctx.personalTask.task){
      out.action.task = ctx.personalTask.task;
      if (!out.action.why){
        out.action.why = ctx.personalTask.why || '';
      }
    }
    if (out.summary){
      out.summary = ensurePhumSummary(out.summary, out.core.phum);
    }
    if (!adviceMatchesSignals(out.advice, ctx.userSignals || {})) return null;
    if (!out.summary || !out.advice || !out.ritual || !out.action.task) return null;
    if (!out.lucky || !Array.isArray(out.lucky.numbers)) return null;
    return out;
  }
  function normalizeFortunePayload(obj, ctx){
    if (!obj || typeof obj !== 'object') return null;
    const out = {};
    out.date = String(obj.date || ctx.dateText || '').trim();
    out.summary = String(obj.summary || '').trim();
    out.advice = String(obj.advice || '').trim();
    out.ritual = String(obj.ritual || '').trim();
    if (obj.meta && typeof obj.meta === 'object'){
      out.meta = obj.meta;
    } else {
      out.meta = ctx.meta || {};
    }
    if (!out.summary || !out.advice || !out.ritual) return null;
    return out;
  }
  function sanitizeRitual(text, ctx){
    const raw = String(text || '').trim();
    if (!raw) return '';
    if (/(蠟燭|點香|供品|香火|供奉|焚香)/.test(raw)){
      return GUARDIAN_MESSAGES[ctx.guardianCode] || '閉上眼睛誠心祈願，今天會有力量陪著你。';
    }
    return raw;
  }
  function runFortuneTests(){
    const taksa = getMahaTaksa('TUE', 'FRI');
    console.assert(taksa.phum === 'UTSAHA', 'getMahaTaksa TUE/FRI should be UTSAHA');
    const yam = getYamUbakong('SUN');
    console.assert(Array.isArray(yam.best) && Array.isArray(yam.forbidden), 'getYamUbakong returns best/forbidden arrays');
    const ts = Date.UTC(2026, 0, 14, 0, 0, 0);
    const dow = taipeiDateParts(ts).dow;
    console.assert(toWeekdayKey(dow) === 'WED', 'toWeekdayKey should map 2026-01-14 to WED');
    const ctx = {
      dateText: '',
      guardianCode: 'WE',
      thaiTaksa: { phum:'MULA' },
      yam: { best:[], forbidden:[], slots:[] },
      lucky: { dayColor:'Red', tabooColor:'', numbers:[11,22] },
      meta: {}
    };
    const first = buildLocalFortuneV2(ctx, 7, [], buildUserSignals(ctx.quiz || {}));
    const second = buildLocalFortuneV2(ctx, 7, [first.action.task], buildUserSignals(ctx.quiz || {}));
    console.assert(first.action.task !== second.action.task, 'buildLocalFortune should avoid repeated task');
  }
  function parseJsonFromText(text){
    if (!text) return null;
    try{ return JSON.parse(text); }catch(_){}
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try{ return JSON.parse(m[0]); }catch(_){ return null; }
  }
  async function callOpenAIFortune(env, prompt, seed, systemPrompt){
    const apiKey = env.OPENAI_API_KEY || env.OPENAI_KEY || '';
    if (!apiKey) return null;
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const payload = {
      model,
      messages: [
        { role:'system', content: systemPrompt || '你是資深命理顧問，請以繁體中文輸出。只回傳 JSON，不要任何多餘文字。' },
        { role:'user', content: prompt }
      ],
      temperature: 0.85,
      max_tokens: 320,
      response_format: { type:'json_object' }
    };
    if (seed != null) payload.seed = seed;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('openai fortune error', res.status, text);
      return null;
    }
    let data = null;
    try{ data = JSON.parse(text); }catch(_){ return null; }
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) return null;
    return parseJsonFromText(content);
  }

  async function signSession(payload, secret){
    const body = JSON.stringify(payload);
    const data = new TextEncoder().encode(body);
    const keyData = new TextEncoder().encode(secret || '');
    const composite = new Uint8Array(keyData.length + data.length + 1);
    composite.set(keyData, 0);
    composite.set(new Uint8Array([46]), keyData.length); // '.'
    composite.set(data, keyData.length + 1);
    const digest = await crypto.subtle.digest('SHA-256', composite);
    const signature = base64UrlEncode(new Uint8Array(digest));
    return `${base64UrlEncode(body)}.${signature}`;
  }

  async function verifySessionToken(token, secret){
    if (!token || token.indexOf('.') < 0) return null;
    const [bodyB64, sigProvided] = token.split('.');
    try{
      const bodyBytes = base64UrlDecodeToBytes(bodyB64);
      const bodyJson = new TextDecoder().decode(bodyBytes);
      const data = bodyBytes;
      const keyData = new TextEncoder().encode(secret || '');
      const composite = new Uint8Array(keyData.length + data.length + 1);
      composite.set(keyData, 0);
      composite.set(new Uint8Array([46]), keyData.length);
      composite.set(data, keyData.length + 1);
      const digest = await crypto.subtle.digest('SHA-256', composite);
      const sigExpected = base64UrlEncode(new Uint8Array(digest));
      if (sigExpected !== sigProvided) return null;
      const payload = JSON.parse(bodyJson);
      if (payload && payload.exp && Date.now() > Number(payload.exp)) return null;
      return payload;
    }catch(_){
      return null;
    }
  }
  function proofSecret(env){
    return String(env?.PROOF_TOKEN_SECRET || env?.SESSION_SECRET || '').trim();
  }
  async function signProofToken(env, key, ttlSec=900){
    const secret = proofSecret(env);
    if (!secret || !key) return '';
    const payload = { key: String(key), exp: Date.now() + (ttlSec * 1000) };
    return await signSession(payload, secret);
  }
  async function verifyProofToken(env, key, token){
    const secret = proofSecret(env);
    if (!secret || !key || !token) return false;
    const payload = await verifySessionToken(token, secret);
    if (!payload || payload.key !== String(key)) return false;
    return true;
  }
  function extractProofKey(val){
    const raw = String(val || '').trim();
    if (!raw) return '';
    if (raw.startsWith('/api/proof/')) return raw.replace('/api/proof/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/proof.view/')) return raw.replace('/api/proof.view/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/proof.data/')) return raw.replace('/api/proof.data/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/proof.inline/')) return raw.replace('/api/proof.inline/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/file/')) return raw.replace('/api/file/','').replace(/\?.*$/,'');
    if (/^https?:\/\//i.test(raw)){
      try{
        const u = new URL(raw);
        const path = u.pathname || '';
        if (path.startsWith('/api/proof/')) return path.replace('/api/proof/','');
        if (path.startsWith('/api/proof.view/')) return path.replace('/api/proof.view/','');
        if (path.startsWith('/api/proof.data/')) return path.replace('/api/proof.data/','');
        if (path.startsWith('/api/proof.inline/')) return path.replace('/api/proof.inline/','');
        if (path.startsWith('/api/file/')) return path.replace('/api/file/','');
      }catch(_){}
      return '';
    }
    if (raw.startsWith('/')) return raw.replace(/^\/+/,'');
    return raw;
  }
  async function signProofUrl(env, val, ttlSec=900){
    const key = extractProofKey(val);
    if (!key) return String(val || '');
    const token = await signProofToken(env, key, ttlSec);
    if (!token) return String(val || '');
    return `/api/proof/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`;
  }
  function isAllowedFileUrl(raw, env, origin){
    if (!raw) return false;
    if (raw.startsWith('/')) return true;
    if (!/^https?:\/\//i.test(raw)) return true;
    try{
      const url = new URL(raw);
      const allow = new Set();
      const addHost = (val)=>{
        if (!val) return;
        try{
          const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
          allow.add(u.host);
        }catch(_){}
      };
      addHost(origin);
      addHost(env?.SITE_URL);
      addHost(env?.PUBLIC_SITE_URL);
      addHost(env?.PUBLIC_ORIGIN);
      addHost(env?.FILE_HOST);
      addHost(env?.PUBLIC_FILE_HOST);
      return allow.has(url.host);
    }catch(_){
      return false;
    }
  }

  function parseCookies(request){
    const header = request.headers.get('cookie') || request.headers.get('Cookie') || '';
    const obj = {};
    header.split(';').forEach(part=>{
      const idx = part.indexOf('=');
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx+1).trim();
      if (key) obj[key] = decodeURIComponent(val);
    });
    return obj;
  }

  // === Slots: required KV bindings + env (Pages -> Settings -> Functions) ===
  // KV bindings: SERVICE_SLOTS_KV, SERVICE_SLOT_HOLDS_KV
  // Env (txt): SLOT_TZ=Asia/Bangkok, SLOT_HOLD_TTL_MIN=15, SLOT_DAYS_AHEAD=14, SLOT_STEP_MIN=30, SLOT_DAILY_WINDOWS="13:00-20:00"
  // Optional: PHONE_CONSULT_SERVICE_MATCH="電話|phone|翻譯|translation|泰文"
  // Manual tests:
  // (1) GET /api/service/slots => enabled=false unless published
  // (2) POST /api/service/slot/hold (logged-out) => 401
  // (3) POST /api/service/slot/hold on unpublished slot => 409 slot_not_published
  // (4) Hold same slot twice within TTL => 409 slot_unavailable
  // (5) POST /api/service/order with slotKey+slotHoldToken => booked
  // (6) Wait > TTL then order => 409 slot_hold_expired
  // (7) Admin publish/block/unblock via /api/admin/service/slots/* and verify status/enabled
  // === Reschedule: required KV + env ===
  // KV binding: SERVICE_RESCHEDULE_KV
  // Env (txt): RESCHEDULE_RULE_HOURS=48, RESCHEDULE_INDEX_LIMIT=2000, RESCHEDULE_NOTIFY_EMAIL (optional)
  function parseTimeToMinutes(input){
    const raw = String(input || '').trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  function minutesToHHMM(min){
    const total = Number(min);
    if (!Number.isFinite(total)) return '';
    const h = Math.floor(total / 60) % 24;
    const m = Math.floor(total % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function getSlotConfig(env){
    const tz = String(env?.SLOT_TZ || 'Asia/Bangkok');
    const holdTtlMin = Math.max(5, Number(env?.SLOT_HOLD_TTL_MIN || 15) || 15);
    const daysAhead = Math.max(1, Math.min(31, Number(env?.SLOT_DAYS_AHEAD || 14) || 14));
    const stepMin = Math.max(5, Number(env?.SLOT_STEP_MIN || 30) || 30);
    const windowsStr = String(env?.SLOT_DAILY_WINDOWS || '13:00-20:30');
    return { tz, holdTtlMin, daysAhead, stepMin, windowsStr };
  }
  const SLOT_MODE_KEY_PREFIX = 'slot_mode:';
  const SLOT_WINDOW_KEY_PREFIX = 'slot_window:';
  const SLOT_PUBLISH_SCHEDULE_KEY_PREFIX = 'slot_publish_schedule:';
  const BOOKING_MODE_LEGACY = 'legacy';
  const BOOKING_MODE_WINDOWED = 'windowed';
  function normalizeBookingMode(input){
    const raw = String(input || '').trim().toLowerCase();
    if (raw === BOOKING_MODE_WINDOWED) return BOOKING_MODE_WINDOWED;
    return BOOKING_MODE_LEGACY;
  }
  function buildSlotModeKey(serviceId){
    return `${SLOT_MODE_KEY_PREFIX}${String(serviceId || '').trim()}`;
  }
  function buildSlotWindowKey(serviceId){
    return `${SLOT_WINDOW_KEY_PREFIX}${String(serviceId || '').trim()}`;
  }
  function buildSlotPublishScheduleKey(serviceId){
    return `${SLOT_PUBLISH_SCHEDULE_KEY_PREFIX}${String(serviceId || '').trim()}`;
  }
  async function getServiceSlotMode(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return BOOKING_MODE_LEGACY;
    try{
      const raw = await env.SERVICE_SLOTS_KV.get(buildSlotModeKey(serviceId));
      if (!raw) return BOOKING_MODE_LEGACY;
      return normalizeBookingMode(raw);
    }catch(_){
      return BOOKING_MODE_LEGACY;
    }
  }
  async function setServiceSlotMode(env, serviceId, mode){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return;
    const normalized = normalizeBookingMode(mode);
    const key = buildSlotModeKey(serviceId);
    try{
      if (normalized === BOOKING_MODE_LEGACY){
        await env.SERVICE_SLOTS_KV.delete(key);
      }else{
        await env.SERVICE_SLOTS_KV.put(key, normalized);
      }
    }catch(_){}
  }
  async function getServiceSlotWindow(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return null;
    try{
      const raw = await env.SERVICE_SLOTS_KV.get(buildSlotWindowKey(serviceId));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    }catch(_){
      return null;
    }
  }
  async function setServiceSlotWindow(env, serviceId, windowInfo){
    if (!env?.SERVICE_SLOTS_KV || !serviceId || !windowInfo) return;
    try{
      await env.SERVICE_SLOTS_KV.put(buildSlotWindowKey(serviceId), JSON.stringify(windowInfo));
    }catch(_){}
  }
  async function getServiceSlotPublishSchedule(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return null;
    try{
      const raw = await env.SERVICE_SLOTS_KV.get(buildSlotPublishScheduleKey(serviceId));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    }catch(_){
      return null;
    }
  }
  async function setServiceSlotPublishSchedule(env, serviceId, schedule){
    if (!env?.SERVICE_SLOTS_KV || !serviceId || !schedule) return;
    try{
      await env.SERVICE_SLOTS_KV.put(buildSlotPublishScheduleKey(serviceId), JSON.stringify(schedule));
    }catch(_){}
  }
  async function clearServiceSlotPublishSchedule(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return;
    try{ await env.SERVICE_SLOTS_KV.delete(buildSlotPublishScheduleKey(serviceId)); }catch(_){}
  }
  function isSlotWindowActive(windowInfo, now){
    if (!windowInfo) return false;
    const openFrom = Number(windowInfo.openFrom || 0);
    const openUntil = Number(windowInfo.openUntil || 0);
    if (!openFrom || !openUntil) return false;
    if (openUntil <= openFrom) return false;
    return now >= openFrom && now < openUntil;
  }
  function buildSlotKey(serviceId, dateStr, hhmmNoColon){
    return `slot:${serviceId}:${dateStr}:${hhmmNoColon}`;
  }
  function parseSlotKey(slotKey){
    const raw = String(slotKey || '').trim();
    const match = raw.match(/^slot:([^:]+):(\d{4}-\d{2}-\d{2}):(\d{4})$/);
    if (!match) return null;
    const hh = match[3].slice(0,2);
    const mm = match[3].slice(2,4);
    return { serviceId: match[1], dateStr: match[2], hhmm: `${hh}:${mm}` };
  }
  function nowMs(){
    return Date.now();
  }
  function parsePublishAt(input){
    if (!input) return 0;
    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
    const raw = String(input || '').trim();
    if (!raw) return 0;
    const direct = Number(raw);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  async function publishSlotKeys(env, slotKeys){
    const updated = [];
    const skipped = [];
    for (const slotKey of slotKeys){
      const parsed = parseSlotKey(slotKey);
      if (!parsed){
        skipped.push({ slotKey, reason:'invalid_slot' });
        continue;
      }
      let existing = null;
      try{
        const raw = await env.SERVICE_SLOTS_KV.get(slotKey);
        if (raw) existing = JSON.parse(raw);
      }catch(_){}
      if (existing && (existing.status === 'booked' || existing.status === 'held')){
        skipped.push({ slotKey, reason: existing.status });
        continue;
      }
      const record = {
        serviceId: parsed.serviceId,
        slotKey,
        date: parsed.dateStr,
        time: parsed.hhmm,
        enabled: true,
        status: 'free',
        heldUntil: 0,
        holdToken: '',
        bookedOrderId: ''
      };
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(record));
      updated.push(slotKey);
    }
    return { updated, skipped };
  }
  async function unpublishSlotKeys(env, slotKeys){
    const updated = [];
    const skipped = [];
    const now = nowMs();
    for (const slotKey of slotKeys){
      const parsed = parseSlotKey(slotKey);
      if (!parsed){
        skipped.push({ slotKey, reason:'invalid_slot' });
        continue;
      }
      let existing = null;
      try{
        const raw = await env.SERVICE_SLOTS_KV.get(slotKey);
        if (raw) existing = JSON.parse(raw);
      }catch(_){}
      const status = resolveSlotStatus(existing, now);
      if (status === 'booked' || status === 'held'){
        skipped.push({ slotKey, reason: status });
        continue;
      }
      const record = {
        serviceId: parsed.serviceId,
        slotKey,
        date: parsed.dateStr,
        time: parsed.hhmm,
        enabled: false,
        status: 'blocked',
        heldUntil: 0,
        holdToken: '',
        bookedOrderId: ''
      };
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(record));
      updated.push(slotKey);
    }
    return { updated, skipped };
  }
  async function applyScheduledSlotPublish(env, serviceId){
    const schedule = await getServiceSlotPublishSchedule(env, serviceId);
    const scheduleAt = schedule ? Number(schedule.publishAt || 0) : 0;
    if (!schedule || !scheduleAt || nowMs() < scheduleAt) return schedule;
    const scheduleKeys = Array.isArray(schedule.slotKeys) ? schedule.slotKeys.map(k=>String(k||'').trim()).filter(Boolean) : [];
    if (scheduleKeys.length){
      await publishSlotKeys(env, scheduleKeys);
    }
    const minutes = Number(schedule.openWindowMinutes || 0);
    if (minutes > 0){
      await setServiceSlotWindow(env, serviceId, {
        serviceId,
        openFrom: scheduleAt,
        openUntil: scheduleAt + minutes * 60 * 1000,
        createdAt: new Date().toISOString(),
        createdBy: String(schedule.createdBy || ''),
        slotKeys: scheduleKeys
      });
    }
    await clearServiceSlotPublishSchedule(env, serviceId);
    return null;
  }
  async function closeExpiredWindowIfNeeded(env, serviceId, windowInfo){
    if (!windowInfo) return windowInfo;
    const openUntil = Number(windowInfo.openUntil || 0);
    if (!openUntil || nowMs() < openUntil) return windowInfo;
    const slotKeys = Array.isArray(windowInfo.slotKeys) ? windowInfo.slotKeys : [];
    if (slotKeys.length){
      await unpublishSlotKeys(env, slotKeys);
      const next = Object.assign({}, windowInfo, {
        slotKeys: [],
        closedAt: new Date().toISOString()
      });
      await setServiceSlotWindow(env, serviceId, next);
      return next;
    }
    return windowInfo;
  }
  function getTodayDateStr(tz){
    try{
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' });
      return fmt.format(new Date());
    }catch(_){
      return new Date().toISOString().split('T')[0];
    }
  }
  function addDaysDateStr(dateStr, offset){
    const base = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(base.getTime())) return '';
    base.setUTCDate(base.getUTCDate() + offset);
    return base.toISOString().split('T')[0];
  }
  function parseDailyWindows(windowsStr, stepMin){
    const list = String(windowsStr || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const out = [];
    list.forEach(range=>{
      const parts = range.split('-').map(s=>s.trim());
      if (parts.length !== 2) return;
      const startMin = parseTimeToMinutes(parts[0]);
      const endMin = parseTimeToMinutes(parts[1]);
      if (startMin === null || endMin === null) return;
      if (endMin <= startMin) return;
      out.push({ startMin, endMin, stepMin });
    });
    return out;
  }
  function resolveSlotEnabled(record){
    if (!record) return false;
    if (typeof record.enabled === 'boolean') return record.enabled;
    if (record.status === 'held' || record.status === 'booked') return true;
    return false;
  }
  function resolveSlotStatus(record, now){
    if (!record) return 'free';
    if (record.status === 'blocked') return 'blocked';
    if (record.status === 'booked') return 'booked';
    if (record.status === 'held'){
      const heldUntil = Number(record.heldUntil || 0);
      if (heldUntil > now) return 'held';
    }
    return 'free';
  }
  function resolveHoldUserId(svcUser, request){
    if (svcUser && svcUser.id) return String(svcUser.id);
    if (svcUser && svcUser.email) return String(svcUser.email).toLowerCase();
    return getClientIp(request) || '';
  }
  async function cleanupExpiredHolds(env){
    const holdsKv = env?.SERVICE_SLOT_HOLDS_KV;
    const slotsKv = env?.SERVICE_SLOTS_KV;
    if (!holdsKv || !slotsKv || typeof holdsKv.list !== 'function') return;
    const now = nowMs();
    let cursor = undefined;
    let loops = 0;
    try{
      do{
        const listing = await holdsKv.list({ prefix:'hold:', limit:100, cursor });
        const keys = listing && Array.isArray(listing.keys) ? listing.keys : [];
        for (const key of keys){
          const name = key && key.name ? key.name : '';
          if (!name) continue;
          let raw = null;
          try{ raw = await holdsKv.get(name); }catch(_){}
          if (!raw) continue;
          let rec = null;
          try{ rec = JSON.parse(raw); }catch(_){}
          if (!rec) continue;
          const exp = Number(rec.holdExpiresAt || rec.expiresAt || 0);
          if (!exp || exp > now) continue;
          const slotKey = String(rec.slotKey || '');
          const holdToken = name.replace(/^hold:/, '');
          if (slotKey){
            try{
              const slotRaw = await slotsKv.get(slotKey);
              if (slotRaw){
                const slotRec = JSON.parse(slotRaw);
                if (slotRec && slotRec.status === 'held' && slotRec.holdToken === holdToken){
                  slotRec.status = 'free';
                  slotRec.holdToken = '';
                  slotRec.heldUntil = 0;
                  slotRec.holdExpiresAt = 0;
                  slotRec.holdBy = '';
                  await slotsKv.put(slotKey, JSON.stringify(slotRec));
                  try{
                    await auditAppend(env, {
                      ts: new Date().toISOString(),
                      action: 'slot_hold_released',
                      actorEmail: '',
                      actorRole: 'system',
                      ip: '',
                      ua: '',
                      targetType: 'service_slot',
                      targetId: slotKey,
                      orderId: '',
                      slotKey,
                      meta: { slotKey, orderId:'', userId: rec.userId || rec.holdBy || '' }
                    });
                  }catch(err){
                    console.warn('audit slot_hold_released failed', err);
                  }
                }
              }
            }catch(_){}
          }
          try{ await holdsKv.delete(name); }catch(_){}
          try{
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'slot_hold_expired',
              actorEmail: '',
              actorRole: 'system',
              ip: '',
              ua: '',
              targetType: 'service_slot',
              targetId: slotKey,
              orderId: '',
              slotKey,
              meta: { slotKey, orderId:'', userId: rec.userId || rec.holdBy || '' }
            });
          }catch(err){
            console.warn('audit slot_hold_expired failed', err);
          }
        }
        cursor = listing && listing.cursor ? listing.cursor : '';
        loops++;
      }while(cursor && loops < 20);
    }catch(err){
      console.warn('cleanupExpiredHolds failed', err);
    }
  }
  async function hasActiveHoldForUser(env, userId){
    const holdsKv = env?.SERVICE_SLOT_HOLDS_KV;
    if (!holdsKv || typeof holdsKv.list !== 'function') return null;
    const now = nowMs();
    let cursor = undefined;
    let loops = 0;
    try{
      do{
        const listing = await holdsKv.list({ prefix:'hold:', limit:100, cursor });
        const keys = listing && Array.isArray(listing.keys) ? listing.keys : [];
        for (const key of keys){
          const name = key && key.name ? key.name : '';
          if (!name) continue;
          let raw = null;
          try{ raw = await holdsKv.get(name); }catch(_){}
          if (!raw) continue;
          let rec = null;
          try{ rec = JSON.parse(raw); }catch(_){}
          if (!rec) continue;
          const exp = Number(rec.holdExpiresAt || rec.expiresAt || 0);
          const holdUser = String(rec.userId || rec.holdBy || '').toLowerCase();
          if (exp > now && holdUser && userId && holdUser === String(userId).toLowerCase()){
            return rec;
          }
        }
        cursor = listing && listing.cursor ? listing.cursor : '';
        loops++;
      }while(cursor && loops < 20);
    }catch(err){
      console.warn('hasActiveHoldForUser failed', err);
    }
    return null;
  }
  function getRescheduleConfig(env){
    const ruleHours = Math.max(1, Number(env?.RESCHEDULE_RULE_HOURS || 48) || 48);
    const indexLimit = Math.max(100, Number(env?.RESCHEDULE_INDEX_LIMIT || 2000) || 2000);
    return { ruleHours, indexLimit };
  }
  function getRescheduleNotifyEmails(env){
    const raw = String(env?.RESCHEDULE_NOTIFY_EMAIL || env?.ORDER_NOTIFY_EMAIL || env?.ADMIN_EMAIL || '').trim();
    return raw.split(',').map(s=>s.trim()).filter(Boolean);
  }
  function parseSlotStartToMs(slotStart){
    const raw = String(slotStart || '').trim();
    if (!raw) return 0;
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? 0 : ms;
  }
  function buildRescheduleId(){
    return `rsch_${makeToken(12)}`;
  }
  async function updateRescheduleIndex(env, requestId){
    const kv = env?.SERVICE_RESCHEDULE_KV;
    if (!kv) return false;
    const cfg = getRescheduleConfig(env);
    const idxKey = 'reschedule:index';
    let idxRaw = await kv.get(idxKey);
    let list = [];
    if (idxRaw){
      try{ list = String(idxRaw).split('\n').filter(Boolean); }catch(_){}
    }
    list = [requestId].concat(list.filter(id => id !== requestId)).slice(0, cfg.indexLimit);
    await kv.put(idxKey, list.join('\n'));
    return true;
  }
  function buildRescheduleEmail(payload){
    const esc = (typeof escapeHtmlEmail === 'function') ? escapeHtmlEmail : (s)=> String(s || '');
    const type = payload?.type || 'requested';
    const orderId = payload?.orderId || '';
    const currentSlot = payload?.currentSlot || '';
    const desiredSlot = payload?.desiredSlot || '';
    const createdAt = payload?.createdAt || '';
    const note = payload?.note || '';
    const adminUrl = payload?.adminUrl || '';
    const reason = payload?.reason || '';
    const subjectBase = type === 'approved'
      ? '改期已核准 / Reschedule Approved'
      : type === 'rejected'
        ? '改期已婉拒 / Reschedule Rejected'
        : '改期申請通知 / Reschedule Request';
    const subject = `[Unalomecodes] ${subjectBase}`;
    const zhBlock = `
  ---\n【中文】
  訂單編號：${orderId}
  原時段：${currentSlot}
  申請改期至：${desiredSlot}
  申請時間：${createdAt}
  ${note ? `備註：${note}\n` : ''}${reason ? `原因：${reason}\n` : ''}${adminUrl ? `請至後台處理：\n${adminUrl}\n` : ''}`.trim();
    const enBlock = `
  ---
  [English]
  Order ID: ${orderId}
  Original slot: ${currentSlot}
  Requested slot: ${desiredSlot}
  Request time: ${createdAt}
  ${note ? `Note: ${note}\n` : ''}${reason ? `Reason: ${reason}\n` : ''}${adminUrl ? `Please review in admin panel:\n${adminUrl}\n` : ''}`.trim();
    const text = `${zhBlock}\n\n${enBlock}`.trim();
    const zhHtml = `
  <div style="margin:0 0 16px;">
    <strong>【中文】</strong><br>
    訂單編號：${esc(orderId)}<br>
    原時段：${esc(currentSlot)}<br>
    申請改期至：${esc(desiredSlot)}<br>
    申請時間：${esc(createdAt)}<br>
    ${note ? `備註：${esc(note)}<br>` : ''}${reason ? `原因：${esc(reason)}<br>` : ''}${adminUrl ? `請至後台處理：<br><a href="${esc(adminUrl)}" target="_blank" rel="noopener">${esc(adminUrl)}</a>` : ''}
  </div>`;
    const enHtml = `
  <div style="margin:16px 0 0;">
    <strong>[English]</strong><br>
    Order ID: ${esc(orderId)}<br>
    Original slot: ${esc(currentSlot)}<br>
    Requested slot: ${esc(desiredSlot)}<br>
    Request time: ${esc(createdAt)}<br>
    ${note ? `Note: ${esc(note)}<br>` : ''}${reason ? `Reason: ${esc(reason)}<br>` : ''}${adminUrl ? `Please review in admin panel:<br><a href="${esc(adminUrl)}" target="_blank" rel="noopener">${esc(adminUrl)}</a>` : ''}
  </div>`;
    const html = `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:14px;">${zhHtml}${enHtml}</div>`;
    return { subject, html, text };
  }
  function buildBilingualOrderEmail(order, zhHtml, zhText, opts = {}){
    return { html: zhHtml, text: zhText };
  }

  async function getSessionUser(request, env){
    if (!env || !env.SESSION_SECRET) return null;
    const cookies = parseCookies(request);
    const token = cookies.auth || '';
    if (!token) return null;
    const user = await verifySessionToken(token, env.SESSION_SECRET);
    if (!user) return null;
    const store = getUserStore(env);
    if (!store) return user;
    const record = await loadUserRecord(env, user.id);
    if (!record) return null;
    if (record.disabled || record.deleted) return null;
    return user;
  }

  function getUserStore(env){
    return env.USERS || env.USER_STORE || env.MEMBERS || env.PROFILES || env.ORDERS || null;
  }

  function userKey(id){
    return `USER:${id}`;
  }

  async function loadUserRecord(env, id){
    const store = getUserStore(env);
    if (!store || !id) return null;
    try{
      const raw = await store.get(userKey(id));
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(_){
      return null;
    }
  }

  async function saveUserRecord(env, data){
    const store = getUserStore(env);
    if (!store || !data || !data.id) return null;
    const now = new Date().toISOString();
    if (!data.createdAt) data.createdAt = now;
    data.updatedAt = now;
    await store.put(userKey(data.id), JSON.stringify(data));
    return data;
  }

  async function ensureUserRecord(env, profile){
    if (!profile || !profile.id) return null;
    let record = await loadUserRecord(env, profile.id);
    const isNew = !record;
    const now = new Date().toISOString();
    if (!record){
      record = {
        id: profile.id,
        createdAt: now,
        wishlist: [],
        favoritesFoods: [],
        coupons: [],
        memberPerks: {}
      };
    }
    if (profile.email && (!record.profileEmailLocked || !record.email)){
      record.email = profile.email || record.email || '';
    }
    if (profile.name && (!record.profileNameLocked || !record.name)){
      record.name = profile.name || record.name || '';
    }
    record.picture = profile.picture || record.picture || '';
    record.provider = profile.provider || record.provider || 'google';
    record.lastLoginAt = now;
    if (!record.memberPerks) record.memberPerks = {};
    if (!record.memberPerks.welcomeDiscount){
      record.memberPerks.welcomeDiscount = {
        amount: Number(env.MEMBER_DISCOUNT || env.MEMBER_BONUS || 100),
        used: false
      };
    }
    if (!Array.isArray(record.coupons)){
      record.coupons = [];
    }
    if (!Array.isArray(record.favoritesFoods)){
      record.favoritesFoods = [];
    }
    if (isNew){
      await issueWelcomeCoupon(env, record);
    }
    await saveUserRecord(env, record);
    return record;
  }

  async function updateUserDefaultContact(env, userId, contact){
    if (!userId || !contact) return;
    const record = await loadUserRecord(env, userId);
    if (!record) return;
    record.defaultContact = Object.assign({}, record.defaultContact || {}, contact);
    await saveUserRecord(env, record);
  }

  async function updateUserDefaultStore(env, userId, store){
    if (!userId || !store) return;
    const record = await loadUserRecord(env, userId);
    if (!record) return;
    record.defaultStore = Object.assign({}, record.defaultStore || {}, store);
    await saveUserRecord(env, record);
  }

  async function getSessionUserRecord(request, env){
    const session = await getSessionUser(request, env);
    if (!session) return null;
    return await ensureUserRecord(env, session);
  }

  function getAvailableMemberDiscount(record){
    const perk = record?.memberPerks?.welcomeDiscount;
    if (!perk) return null;
    const amount = Number(perk.amount || 0);
    if (!amount || perk.used) return null;
    return { key: 'welcomeDiscount', amount };
  }

  async function markMemberDiscountUsed(env, record, perkKey, orderId){
    if (!record || !record.memberPerks || !record.memberPerks[perkKey]) return;
    record.memberPerks[perkKey].used = true;
    record.memberPerks[perkKey].usedOrder = orderId;
    record.memberPerks[perkKey].usedAt = new Date().toISOString();
    await saveUserRecord(env, record);
  }

  // ======== ECPay helpers ========
  function ecpayEndpoint(env){
    const flag = String(env?.ECPAY_STAGE || env?.ECPAY_MODE || "").toLowerCase();
    const isStage = flag === "stage" || flag === "test" || flag === "sandbox" || flag === "1" || flag === "true";
    return isStage
      ? "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
      : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
  }

  function ecpayNormalize(str=""){
    return encodeURIComponent(str)
      .toLowerCase()
      .replace(/%20/g, "+")
      .replace(/%21/g, "!")
      .replace(/%28/g, "(")
      .replace(/%29/g, ")")
      .replace(/%2a/g, "*");
  }

  async function ecpayCheckMac(params, hashKey, hashIV){
    const sorted = Object.keys(params).sort((a,b)=> a.localeCompare(b));
    const query = sorted.map(k => `${k}=${params[k]}`).join("&");
    const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
    const normalized = ecpayNormalize(raw);
    const data = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
  }

  function looksLikeCandleItem(it){
    if (!it) return false;
    try{
      const parts = [
        it.category, it.cat, it.type,
        it.name, it.title, it.productName,
        it.deity, it.variantName, it.spec
      ].filter(Boolean).join(" ").toLowerCase();
      return /蠟燭|candle/.test(parts);
    }catch(_){
      return false;
    }
  }
  function needShippingFee(items, fallbackText){
    if (Array.isArray(items) && items.length){
      return items.some(it => !looksLikeCandleItem(it));
    }
    if (fallbackText){
      return !/蠟燭|candle/i.test(String(fallbackText));
    }
    return false;
  }
  function resolveShippingFee(env){
    const val = Number(env?.SHIPPING_FEE || env?.DEFAULT_SHIPPING_FEE || 0);
    if (Number.isFinite(val) && val > 0) return val;
    return 60;
  }
  function parseCouponAssignment(raw){
    if (!raw) return null;
    try{
      if (typeof raw === 'string') return JSON.parse(raw);
      if (typeof raw === 'object') return raw;
    }catch(_){}
    return null;
  }
  async function readProductById(env, id){
    if (!env || !env.PRODUCTS || !id) return null;
    const pid = normalizeProductId(id);
    if (!pid) return null;
    const normalizeProduct = (p)=>{
      if (p && !p.deityCode && p.deity) p.deityCode = getDeityCodeFromName(p.deity);
      if (p) p.category = inferCategory(p);
      return p;
    };
    try{
      const raw = await env.PRODUCTS.get(`PRODUCT:${pid}`);
      if (raw){
        const p = JSON.parse(raw);
        return normalizeProduct(p);
      }
    }catch(_){}
    try{
      const rawDirect = await env.PRODUCTS.get(pid);
      if (rawDirect){
        const p = JSON.parse(rawDirect);
        return normalizeProduct(p);
      }
    }catch(_){}
    try{
      const indexRaw = await env.PRODUCTS.get('INDEX');
      const ids = indexRaw ? (JSON.parse(indexRaw) || []) : [];
      if (Array.isArray(ids) && ids.length){
        const target = String(pid).toLowerCase();
        for (const entry of ids.slice(0, 500)){
          const key = `PRODUCT:${entry}`;
          const raw = await env.PRODUCTS.get(key);
          if (!raw) continue;
          let p = null;
          try{ p = JSON.parse(raw); }catch(_){ p = null; }
          if (!p) continue;
          const candidates = [
            p.id,
            entry,
            p.productId,
            p.code,
            p.sku,
            p.slug
          ].filter(Boolean).map(v => String(v).toLowerCase());
          if (candidates.includes(target)){
            return normalizeProduct(p);
          }
        }
      }
    }catch(_){}
    try{
      if (env.PRODUCTS.list){
        const iter = await env.PRODUCTS.list({ prefix:'PRODUCT:' });
        const keys = Array.isArray(iter.keys) ? iter.keys : [];
        const target = String(pid).toLowerCase();
        for (const k of keys.slice(0, 500)){
          const name = String(k.name || '');
          if (!name) continue;
          if (name.toLowerCase() === `product:${target}`){
            const raw = await env.PRODUCTS.get(name);
            if (raw){
              const p = JSON.parse(raw);
              return normalizeProduct(p);
            }
          }
        }
        for (const k of keys.slice(0, 500)){
          const name = String(k.name || '');
          if (!name) continue;
          const raw = await env.PRODUCTS.get(name);
          if (!raw) continue;
          let p = null;
          try{ p = JSON.parse(raw); }catch(_){ p = null; }
          if (!p) continue;
          const candidates = [
            p.id,
            p.productId,
            p.code,
            p.sku,
            p.slug,
            name.replace(/^PRODUCT:/, '')
          ].filter(Boolean).map(v => String(v).toLowerCase());
          if (candidates.includes(target)){
            return normalizeProduct(p);
          }
        }
      }
    }catch(_){}
    return null;
  }
  function resolveVariant(product, variantName){
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length){
      return { ok:true, name:'', priceDiff:0 };
    }
    const vn = cleanVariantName(variantName || '');
    let idx = -1;
    if (vn){
      idx = variants.findIndex(v => cleanVariantName(v?.name) === vn);
    }
    if (idx < 0 && variants.length === 1){
      idx = 0;
    }
    if (idx < 0) return { ok:false, error:'invalid_variant' };
    const v = variants[idx] || {};
    return { ok:true, name: String(v.name || vn || ''), priceDiff: Number(v.priceDiff || 0) || 0 };
  }
  function resolveAvailableStock(product, variantName){
    if (!product) return null;
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length){
      const vn = cleanVariantName(variantName || '');
      let idx = -1;
      if (vn){
        idx = variants.findIndex(v => cleanVariantName(v?.name) === vn);
      }
      if (idx < 0 && variants.length === 1) idx = 0;
      if (idx >= 0){
        const v = variants[idx] || {};
        if (v.stock !== undefined && v.stock !== null){
          const n = Number(v.stock);
          return Number.isFinite(n) ? n : 0;
        }
      }
    }
    if (product.stock !== undefined && product.stock !== null){
      const n = Number(product.stock);
      return Number.isFinite(n) ? n : 0;
    }
    return null;
  }
  function resolveTotalStockForProduct(product){
    if (!product) return null;
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length){
      let hasStock = false;
      let sum = 0;
      for (const v of variants){
        if (v && v.stock !== undefined && v.stock !== null){
          const n = Number(v.stock);
          if (Number.isFinite(n)){
            hasStock = true;
            sum += n;
          }
        }
      }
      if (hasStock) return sum;
    }
    if (product.stock !== undefined && product.stock !== null){
      const n = Number(product.stock);
      return Number.isFinite(n) ? n : 0;
    }
    return null;
  }
  function normalizeProductId(raw){
    const val = String(raw || '').trim();
    if (!val) return '';
    if (val.startsWith('PRODUCT:')) return val.slice(8);
    if (val.startsWith('product:')) return val.slice(8);
    return val;
  }
  async function buildItemFromProduct(env, productId, variantName, qty){
    const pid = normalizeProductId(productId);
    if (!pid) return { ok:false, error:'missing_product_id' };
    const product = await readProductById(env, pid);
    if (!product) return { ok:false, error:'product_not_found' };
    if (product.active === false) return { ok:false, error:'product_inactive' };
    const variantInfo = resolveVariant(product, variantName);
    if (!variantInfo.ok) return { ok:false, error:variantInfo.error || 'invalid_variant' };
    const base = Number(product.basePrice || 0) || 0;
    const unit = Math.max(0, base + Number(variantInfo.priceDiff || 0));
    const count = Math.max(1, Number(qty || 1));
    const available = resolveAvailableStock(product, variantInfo.name || variantName || '');
    if (available !== null && available < count){
      return { ok:false, error:'out_of_stock', available };
    }
    const item = {
      productId: pid,
      productName: String(product.name || ''),
      name: String(product.name || ''),
      deity: String(product.deity || ''),
      deityCode: String(product.deityCode || ''),
      variantName: String(variantInfo.name || ''),
      price: unit,
      unitPrice: unit,
      qty: count,
      image: (Array.isArray(product.images) && product.images[0]) ? String(product.images[0]) : '',
      category: String(product.category || '')
    };
    return { ok:true, item };
  }
  async function resolveOrderSelection(env, body){
    function isTruthy(x){ return x === true || x === 1 || x === '1' || String(x).toLowerCase() === 'true' || String(x).toLowerCase() === 'yes' || x === 'on'; }
    const buildItemFromRaw = (it)=>{
      const qty = Math.max(1, Number(it?.qty ?? it?.quantity ?? 1) || 1);
      const unit = Number(it?.unitPrice ?? it?.price ?? 0);
      if (!Number.isFinite(unit) || unit <= 0) return { ok:false, error:'invalid_item_price' };
      const name = String(it?.productName || it?.name || it?.title || '商品').trim();
      if (!name) return { ok:false, error:'invalid_item_name' };
      const variantName = String(it?.variantName || it?.variant || it?.spec || '').trim();
      return {
        ok:true,
        item: {
          productId: normalizeProductId(it?.id || it?.productId || it?.code || it?.sku || it?.product_id || it?.pid || '') || 'UNKNOWN',
          productName: name,
          name,
          deity: String(it?.deity || it?.deityCode || ''),
          deityCode: String(it?.deityCode || it?.deity || ''),
          variantName,
          price: unit,
          unitPrice: unit,
          qty,
          image: String(it?.image || it?.img || it?.picture || it?.cover || ''),
          category: String(it?.category || '')
        }
      };
    };
    const hintMode   = (body.mode || '').toLowerCase();
    const directHint = isTruthy(body.directBuy) || isTruthy(body.single) || hintMode === 'direct';
    const hasCart    = Array.isArray(body.cart) && body.cart.length > 0;
    const cartHint   = hasCart && (isTruthy(body.fromCart) || isTruthy(body.useCart) || hintMode === 'cart');
    const preferDirect = (hintMode !== 'cart') && (directHint || !!body.productId);
    let useCartOnly = !preferDirect && cartHint;
    let items = [];
    const resolveItemId = (it)=> normalizeProductId(it?.id || it?.productId || it?.code || it?.sku || it?.product_id || it?.pid || '');
    if (useCartOnly){
      const cartArr = Array.isArray(body.cart) ? body.cart : [];
      for (const it of cartArr){
        const res = await buildItemFromProduct(env, resolveItemId(it), it.variantName || it.variant || '', it.qty || it.quantity || 1);
        if (!res.ok){
          if (res.error === 'product_not_found'){
            const fallback = buildItemFromRaw(it);
            if (!fallback.ok) return { ok:false, error: fallback.error || 'invalid_item' };
            items.push(fallback.item);
            continue;
          }
          return { ok:false, error: res.error || 'invalid_item' };
        }
        items.push(res.item);
      }
    } else {
      const directId = normalizeProductId(body.productId || body.id || body.product_id || body.pid || '');
      const res = await buildItemFromProduct(env, directId, body.variantName || body.variant || '', body.qty || 1);
      if (!res.ok){
        if (hasCart){
          useCartOnly = true;
          items = [];
          const cartArr = Array.isArray(body.cart) ? body.cart : [];
          for (const it of cartArr){
            const r = await buildItemFromProduct(env, resolveItemId(it), it.variantName || it.variant || '', it.qty || it.quantity || 1);
            if (!r.ok){
              if (r.error === 'product_not_found'){
                const fallback = buildItemFromRaw(it);
                if (!fallback.ok) return { ok:false, error: fallback.error || 'invalid_item' };
                items.push(fallback.item);
                continue;
              }
              return { ok:false, error: r.error || 'invalid_item' };
            }
            items.push(r.item);
          }
        } else {
          return { ok:false, error: res.error || 'missing_product' };
        }
      } else {
        items = [res.item];
      }
    }
    if (!items.length) return { ok:false, error:'missing_items' };
    const total = items.reduce((s, it)=> s + (Number(it.price || 0) * Math.max(1, Number(it.qty || 1))), 0);
    const totalQty = items.reduce((s, it)=> s + Math.max(1, Number(it.qty || 1)), 0);
    const first = items[0];
    const productId = useCartOnly ? (first.productId || 'CART') : first.productId;
    const productName = useCartOnly ? `購物車共 ${items.length} 項` : (first.productName || first.name || '');
    const price = useCartOnly ? total : Number(first.price || 0);
    const qty = useCartOnly ? totalQty : Math.max(1, Number(first.qty || 1));
    const deity = String(first.deity || '');
    const variantName = useCartOnly ? String(first.variantName || '') : String(first.variantName || '');
    return { ok:true, useCartOnly, items, productId, productName, price, qty, deity, variantName };
  }

  // === Helper: unified proof retriever (R2 first, then KV) ===
  async function getProofFromStore(env, rawKey) {
    const k = String(rawKey || '');
    if (!k) return null;

    // 1. Try exact or decoded key from R2 bucket
    const tryKeys = [k];
    try { tryKeys.push(decodeURIComponent(k)); } catch {}
    for (const key of tryKeys) {
      try {
        const obj = await env.R2_BUCKET.get(key);
        if (obj) {
          const bin = await obj.arrayBuffer();
          const contentType = (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg';
          return { source: 'r2', key, bin, metadata: { contentType } };
        }
      } catch (e) {
        console.log('R2 get failed for', key, e);
      }
    }

    // 2. Fallback: try KV (RECEIPTS)
    try {
      const res = env.RECEIPTS.getWithMetadata
        ? await env.RECEIPTS.getWithMetadata(k)
        : { value: await env.RECEIPTS.get(k, { type: 'arrayBuffer' }), metadata: {} };
      const bin = res && res.value;
      if (bin instanceof ArrayBuffer || (bin && typeof bin.byteLength === 'number')) {
        return { source: 'kv', key: k, bin, metadata: res.metadata || {} };
      }
    } catch (e) {
      console.log('KV get failed for', k, e);
    }

    return null;
  }
  async function canAccessProof(request, env, key){
    if (await isAdmin(request, env)) return true;
    const url = new URL(request.url);
    const token = String(url.searchParams.get('token') || '').trim();
    if (!token) return false;
    return await verifyProofToken(env, key, token);
  }

  const CANONICAL_STATUS = {
    PENDING: 'PENDING',
    READY_TO_SHIP: 'READY_TO_SHIP',
    SHIPPED: 'SHIPPED',
    COMPLETED: 'COMPLETED',
    OVERDUE: 'OVERDUE',
    CANCELED: 'CANCELED'
  };

  function normalizeStatus(input){
    const raw = String(input || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const normalized = lower.replace(/\s+/g, '_').replace(/-+/g, '_');

    // English keys
    if (normalized === 'pending' || normalized === 'waiting' || normalized === 'waiting_payment' || normalized === 'waiting_verify') return CANONICAL_STATUS.PENDING;
    if (normalized === 'to_ship' || normalized === 'ready_to_ship' || normalized === 'paid') return CANONICAL_STATUS.READY_TO_SHIP;
    if (normalized === 'shipped' || normalized === 'shipping') return CANONICAL_STATUS.SHIPPED;
    if (normalized === 'completed' || normalized === 'done' || normalized === 'picked_up') return CANONICAL_STATUS.COMPLETED;
    if (normalized === 'overdue' || normalized === 'expired') return CANONICAL_STATUS.OVERDUE;
    if (normalized === 'canceled' || normalized === 'cancelled' || normalized === 'refunded' || normalized === 'refund') return CANONICAL_STATUS.CANCELED;

    // Chinese labels (current UI + common variants)
    if (raw.includes('訂單待處理') || raw.includes('待處理') || raw.includes('待付款') || raw.includes('未付款') || raw.includes('待確認')) {
      return CANONICAL_STATUS.PENDING;
    }
    if (raw.includes('已付款') || raw.includes('已確認付款') || raw.includes('確認付款') || raw.includes('付款成功') || raw.includes('付款完成') || raw.includes('待出貨')) {
      return CANONICAL_STATUS.READY_TO_SHIP;
    }
    if (raw.includes('已寄件') || raw.includes('已寄出') || raw.includes('已出貨')) {
      return CANONICAL_STATUS.SHIPPED;
    }
    const rawNoSpace = raw.replace(/\s+/g, '');
    const hasRefundish = rawNoSpace.includes('退款') || rawNoSpace.includes('退貨');
    if (raw.includes('已取件') || raw.includes('已完成訂單') || raw.includes('完成訂單') || raw.includes('訂單完成')) {
      return CANONICAL_STATUS.COMPLETED;
    }
    if (!hasRefundish && rawNoSpace.includes('已完成') && (rawNoSpace.includes('訂單') || rawNoSpace.includes('取件') || rawNoSpace.includes('交易'))) {
      return CANONICAL_STATUS.COMPLETED;
    }
    if (raw.includes('付款逾期') || raw.includes('逾期')) {
      return CANONICAL_STATUS.OVERDUE;
    }
    if (raw.includes('取消訂單') || raw.includes('取消') || raw.includes('作廢') || raw.includes('退款') || raw.includes('退貨') || raw.includes('失敗') || raw.includes('金額不符') || raw.includes('拒收') || raw.includes('未取') || raw.includes('無效') || raw.includes('撤單')) {
      return CANONICAL_STATUS.CANCELED;
    }
    return '';
  }
  function statusIsPaid(s){
    const key = normalizeStatus(s);
    return key === CANONICAL_STATUS.READY_TO_SHIP
      || key === CANONICAL_STATUS.SHIPPED
      || key === CANONICAL_STATUS.COMPLETED;
  }
  function statusIsCompleted(s){
    const key = normalizeStatus(s);
    return key === CANONICAL_STATUS.COMPLETED;
  }
  function statusIsCanceled(s){
    const key = normalizeStatus(s);
    return key === CANONICAL_STATUS.CANCELED;
  }

  const FULFILLMENT_ORDER_TRANSITIONS = {
    [CANONICAL_STATUS.PENDING]: [CANONICAL_STATUS.READY_TO_SHIP],
    [CANONICAL_STATUS.READY_TO_SHIP]: [CANONICAL_STATUS.SHIPPED],
    [CANONICAL_STATUS.SHIPPED]: [CANONICAL_STATUS.COMPLETED]
  };

  function isFulfillmentOrderTransitionAllowed(prevKey, nextKey){
    if (!nextKey) return false;
    if (prevKey && prevKey === nextKey) return true;
    if (!prevKey) return false;
    const allowed = FULFILLMENT_ORDER_TRANSITIONS[prevKey];
    if (!allowed) return false;
    return allowed.includes(nextKey);
  }
  function toTs(value){
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? 0 : ts;
  }
  function getOrderCreatedTs(order){
    return toTs(order?.createdAt || order?.updatedAt || order?.ts || '');
  }
  function getOrderPaidTs(order){
    return toTs(
      order?.payment?.paidAt ||
      order?.payment?.paid_at ||
      order?.paidAt ||
      order?.paid_at ||
      order?.updatedAt ||
      order?.createdAt ||
      ''
    );
  }
  function getOrderAmount(order){
    const raw =
      order?.amount ??
      order?.total ??
      order?.totalAmount ??
      order?.total_amount ??
      order?.totalPrice ??
      order?.total_price ??
      order?.amountTotal ??
      order?.price ??
      order?.payment?.amount ??
      order?.payment?.total ??
      order?.payment?.paidAmount ??
      0;
    if (typeof raw === 'string') {
      const cleaned = raw.replace(/[^\d.]/g, '');
      const num = Number(cleaned || 0);
      return Number.isFinite(num) ? num : 0;
    }
    const amt = Number(raw || 0);
    return Number.isFinite(amt) ? amt : 0;
  }
  function extractCouponCodes(coupon){
    if (!coupon) return [];
    const raw = Array.isArray(coupon.codes) && coupon.codes.length ? coupon.codes : (coupon.code ? [coupon.code] : []);
    return Array.from(new Set(raw.map(c => String(c || '').trim().toUpperCase()).filter(Boolean)));
  }
  async function ensureOrderPaidResources(env, order){
    let changed = false;
    if (order && order.coupon && !order.coupon.failed) {
      const codes = extractCouponCodes(order.coupon);
      if (codes.length && !order.coupon.locked) {
        let lockOk = true;
      for (const code of codes){
        const locked = await markCouponUsageOnce(env, code, order.id);
        if (!locked.ok){
          const sameOrder = locked.reason === 'already_used'
            && locked.existing
            && String(locked.existing.orderId || '') === String(order.id || '');
          if (!sameOrder){
            lockOk = false;
            break;
          }
        }
      }
        if (lockOk){
          order.coupon.locked = true;
          order.coupon.reserved = false;
          changed = true;
        }
      }
      if (order.coupon.locked && order.coupon.reserved) {
        order.coupon.reserved = false;
        changed = true;
      }
    }
    if (order.stockDeducted === false) {
      try { await decStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){}
      order.stockDeducted = true;
      changed = true;
    }
    if (order.soldCounted === false) {
      try { await bumpSoldCounters(env, order.items, order.productId, order.qty); } catch(_){}
      order.soldCounted = true;
      changed = true;
    }
    return changed;
  }
  async function releaseOrderResources(env, order){
    let changed = false;
    if (order && order.coupon && !order.coupon.failed) {
      const codes = extractCouponCodes(order.coupon);
      for (const code of codes){
        try { await releaseCouponUsage(env, code, order.id); } catch(_){}
      }
      if (order.coupon.locked || order.coupon.reserved){
        order.coupon.locked = false;
        order.coupon.reserved = false;
        changed = true;
      }
    }
    if (order.stockDeducted === true) {
      try { await restoreStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){}
      order.stockDeducted = false;
      changed = true;
    }
    if (order.soldCounted === true) {
      try { await decSoldCounters(env, order.items, order.productId, order.qty); } catch(_){}
      order.soldCounted = false;
      changed = true;
    }
    return changed;
  }
  function parseOrderTimestamp(order){
    const ts = Date.parse(order?.createdAt || order?.payment?.createdAt || order?.updatedAt || '');
    return Number.isNaN(ts) ? 0 : ts;
  }
  function resolveOrderHoldTtlSec(order, env){
    const fallback = Number(env.ORDER_HOLD_TTL_SEC || 86400) || 86400;
    const creditTtl = Number(env.CC_ORDER_HOLD_TTL_SEC || env.CC_COUPON_HOLD_TTL_SEC || 1800) || 1800;
    const bankTtl = Number(env.BANK_ORDER_HOLD_TTL_SEC || env.ORDER_HOLD_TTL_SEC || 72 * 3600) || (72 * 3600);
    const method = String(order?.method || '').toLowerCase();
    if (method.includes('信用卡') || method.includes('綠界') || method.includes('credit') || order?.payment?.gateway === 'ecpay') {
      return creditTtl;
    }
    if (method.includes('轉帳') || method.includes('匯款') || method.includes('bank')) {
      return bankTtl;
    }
    return fallback;
  }
  function isWaitingVerifyStatus(status){
    const raw = String(status || '').trim();
    if (!raw) return false;
    const lower = raw.toLowerCase();
    if (lower === 'waiting_verify' || lower === 'waiting verify') return true;
    return raw.includes('待確認') || raw.includes('待查帳');
  }
  function isHoldReleaseCandidate(order, includeWaitingVerify){
    if (!order || order.type === 'service') return false;
    const status = normalizeStatus(order.status || '');
    if (!status) return true;
    if (statusIsPaid(status)) return false;
    if (!includeWaitingVerify && isWaitingVerifyStatus(status)) return false;
    return true;
  }
  async function releaseExpiredOrderHolds(env, opts = {}){
    if (!env || !env.ORDERS) {
      return { ok:false, error:'ORDERS KV not bound' };
    }
    const now = Number(opts.now || Date.now());
    const dryRun = !!opts.dryRun;
    const includeWaitingVerify = opts.includeWaitingVerify === true
      || String(env.ORDER_RELEASE_INCLUDE_WAITING_VERIFY || '') === '1';
    const maxScan = Math.min(Number(opts.limit || env.ORDER_RELEASE_LIMIT || 300) || 300, 1000);
    let ids = [];
    try{
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      ids = idxRaw ? JSON.parse(idxRaw) : [];
      if (!Array.isArray(ids)) ids = [];
    }catch(_){ ids = []; }
    let scanned = 0;
    let expired = 0;
    let released = 0;
    let updated = 0;
    for (const id of ids){
      if (maxScan && scanned >= maxScan) break;
      scanned++;
      const raw = await env.ORDERS.get(id);
      if (!raw) continue;
      let order = null;
      try{ order = JSON.parse(raw); }catch(_){ order = null; }
      if (!order) continue;
      const status = normalizeStatus(order.status || '');
      if (statusIsPaid(status)) continue;
      if (statusIsCanceled(status)) {
        const changed = await releaseOrderResources(env, order);
        if (changed && !dryRun) {
          order.updatedAt = new Date().toISOString();
          await env.ORDERS.put(id, JSON.stringify(order));
          updated++;
        }
        if (changed) released++;
        continue;
      }
      if (!isHoldReleaseCandidate(order, includeWaitingVerify)) continue;
      const createdTs = parseOrderTimestamp(order);
      if (!createdTs) continue;
      const ttlSec = resolveOrderHoldTtlSec(order, env);
      if (now - createdTs < ttlSec * 1000) continue;
      expired++;
      const changed = await releaseOrderResources(env, order);
      const expireStatus = '付款逾期';
      let statusChanged = false;
      if (expireStatus && order.status !== expireStatus) {
        order.status = expireStatus;
        statusChanged = true;
      }
      order.cancelReason = order.cancelReason || 'hold_expired';
      order.cancelledAt = order.cancelledAt || new Date().toISOString();
      if (order.payment && order.payment.status !== 'PAID') {
        order.payment.status = 'EXPIRED';
        order.payment.expiredAt = new Date().toISOString();
      }
      if ((changed || statusChanged) && !dryRun) {
        order.updatedAt = new Date().toISOString();
        await env.ORDERS.put(id, JSON.stringify(order));
        updated++;
      }
      if (changed || statusChanged) released++;
    }
    return { ok:true, scanned, expired, released, updated, dryRun };
  }

  async function updateDashboardStats(env) {
    const scanLimit = Math.max(50, Math.min(Number(env.ADMIN_STATS_LIMIT || 800) || 800, 2000));
    const lowStockThreshold = Math.max(0, Number(env.LOW_STOCK_THRESHOLD || 3) || 3);
    const stats = {
      products: { total: 0, active: 0, lowStock: 0, approx: false },
      orders: { total: 0, paid: 0, shipped: 0, pending: 0, done: 0, canceled: 0, approx: false },
      serviceOrders: { total: 0, paid: 0, pending: 0, done: 0, canceled: 0, approx: false },
      members: { total: 0, approx: false },
      coupons: { total: 0, used: 0, total7: 0, used7: 0, approx: false }
    };
    const nowTs = Date.now();
    const todayKey = taipeiDateKey(nowTs);
    const last7Ts = nowTs - 7 * 86400000;
    const last30Ts = nowTs - 30 * 86400000;
    const makePeriods = ()=>({ today: 0, last7: 0, last30: 0 });
    const addPeriods = (obj, ts, value = 1)=>{
      if (!ts) return;
      if (taipeiDateKey(ts) === todayKey) obj.today += value;
      if (ts >= last7Ts) obj.last7 += value;
      if (ts >= last30Ts) obj.last30 += value;
    };
    const topPhysicalMap = new Map();
    const topServiceMap = new Map();
    const lowStockItems = [];
    const reports = {
      physical: {
        revenue: makePeriods(),
        orders: makePeriods(),
        status: { paid: 0, shipped: 0, pending: 0, done: 0, canceled: 0 },
        topItems: [],
        lowStock: [],
        approx: false
      },
      service: {
        revenue: makePeriods(),
        orders: makePeriods(),
        status: { paid: 0, pending: 0, done: 0, canceled: 0 },
        topItems: [],
        approx: false
      }
    };
    const addTop = (map, key, payload)=>{
      if (!key) return;
      const current = map.get(key) || { id: payload.id || '', name: payload.name || key, qty: 0, amount: 0, image: payload.image || '' };
      current.qty += Number(payload.qty || 0) || 0;
      current.amount += Number(payload.amount || 0) || 0;
      if (!current.image && payload.image) current.image = payload.image;
      map.set(key, current);
    };
    const getOrderItems = (o)=>{
      if (Array.isArray(o?.items)) return o.items;
      if (Array.isArray(o?.products)) return o.products;
      if (Array.isArray(o?.cartItems)) return o.cartItems;
      if (Array.isArray(o?.orderItems)) return o.orderItems;
      return [];
    };

    // Products
    if (env.PRODUCTS){
      let ids = [];
      try{
        const indexRaw = await env.PRODUCTS.get('INDEX');
        ids = indexRaw ? JSON.parse(indexRaw) : [];
        if (!Array.isArray(ids)) ids = [];
      }catch(_){ ids = []; }
      stats.products.total = ids.length;
      const slice = ids.slice(0, scanLimit);
      if (ids.length > slice.length) stats.products.approx = true;
      for (const id of slice){
        const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
        if (!raw) continue;
        try{
          const p = JSON.parse(raw);
          if (p.active === true) stats.products.active++;
          const stockTotal = resolveTotalStockForProduct(p);
          if (stockTotal !== null && stockTotal <= lowStockThreshold){
            stats.products.lowStock++;
            lowStockItems.push({
              id,
              name: p.name || p.title || p.productName || '商品',
              stock: stockTotal,
              active: p.active === true
            });
          }
        }catch(_){}
      }
    }

    const isOrderPaid = (order)=>{
      const paymentStatusRaw = order?.payment?.status ?? '';
      const paymentStatus = String(paymentStatusRaw).trim().toUpperCase();
      const paymentOk = paymentStatus === 'PAID'
        || paymentStatus === 'SUCCESS'
        || paymentStatus === 'SUCCESSFUL'
        || paymentStatus === 'CONFIRMED'
        || paymentStatus === 'COMPLETED'
        || paymentStatus === 'OK'
        || paymentStatus === '1'
        || paymentStatusRaw === 1
        || order?.payment?.paid === true
        || order?.payment?.isPaid === true
        || !!order?.payment?.paidAt
        || !!order?.payment?.paid_at
        || !!order?.paidAt
        || !!order?.paid_at;
      return statusIsPaid(order?.status) || paymentOk;
    };
    const normalizeServiceStatus = (status)=>{
      const raw = String(status || '').replace(/\s+/g, '').trim();
      if (!raw) return '';
      if (raw.includes('取消') || raw.includes('退款') || raw.includes('作廢') || raw.includes('失敗')) return 'CANCELED';
      if (raw.includes('祈福完成') || raw.includes('已完成') || raw.includes('成果') || raw.includes('完成')) return 'DONE';
      if (raw.includes('已確認付款') || raw.includes('已付款') || raw.includes('祈福進行中') || raw.includes('進行中')) return 'PAID';
      if (raw.includes('待處理') || raw.includes('待付款') || raw.includes('未付款') || raw.includes('待確認')) return 'PENDING';
      return '';
    };
    const isServiceDone = (order)=> normalizeServiceStatus(order?.status) === 'DONE';
    const isServiceCanceled = (order)=> normalizeServiceStatus(order?.status) === 'CANCELED';
    const isServicePaid = (order)=>{
      if (!order) return false;
      const key = normalizeServiceStatus(order.status);
      if (key === 'DONE' || key === 'PAID') return true; // 祈福完成/已確認付款 視為已收款
      return isOrderPaid(order);
    };

    // Orders
    if (env.ORDERS){
      let ids = [];
      try{
        const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
        ids = idxRaw ? JSON.parse(idxRaw) : [];
        if (!Array.isArray(ids)) ids = [];
      }catch(_){ ids = []; }
      const scanAll = ids.length <= scanLimit;
      const scanIds = scanAll ? ids : ids.slice(0, scanLimit);
      if (!scanAll && ids.length > scanIds.length) stats.orders.approx = true;
      const aliveIds = [];
      for (const oid of scanIds){
        const raw = await env.ORDERS.get(oid);
        if (!raw) continue;
        if (scanAll) aliveIds.push(oid);
        try{
          const o = JSON.parse(raw);
          const statusKey = normalizeStatus(o.status);
          const isDone = statusKey === CANONICAL_STATUS.COMPLETED;
          const isShipped = statusKey === CANONICAL_STATUS.SHIPPED;
          const isReady = statusKey === CANONICAL_STATUS.READY_TO_SHIP;
          const isCanceled = statusKey === CANONICAL_STATUS.CANCELED;
          const isPaid = isOrderPaid(o);
          if (isDone) stats.orders.done++;
          else if (isShipped) stats.orders.shipped++;
          else if (isReady) stats.orders.paid++;
          else if (isCanceled) stats.orders.canceled++;
          else stats.orders.pending++;

          if (isDone) reports.physical.status.done++;
          else if (isShipped) reports.physical.status.shipped++;
          else if (isReady) reports.physical.status.paid++;
          else if (isCanceled) reports.physical.status.canceled++;
          else reports.physical.status.pending++;

          const createdTs = getOrderCreatedTs(o);
          addPeriods(reports.physical.orders, createdTs, 1);

          if (isPaid){
            const paidTs = getOrderPaidTs(o) || createdTs;
            const amount = getOrderAmount(o);
            if (amount > 0) addPeriods(reports.physical.revenue, paidTs, amount);
            const items = getOrderItems(o);
            if (items.length){
              for (const it of items){
                const qty = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
                const unit = Number(it.price ?? it.unitPrice ?? it.amount ?? 0) || 0;
                let total = Number(it.total ?? it.amountTotal ?? 0) || 0;
                if (!total && unit) total = unit * qty;
                const name = it.productName || it.name || o.productName || o.name || '商品';
                const id = it.productId || it.id || '';
                const image = it.image || it.cover || it.thumb || '';
                addTop(topPhysicalMap, String(id || name), {
                  id: String(id || ''),
                  name,
                  qty,
                  amount: total || 0,
                  image
                });
              }
            } else {
              const qty = Math.max(1, Number(o.qty ?? 1));
              const unit = Number(o.price ?? 0) || 0;
              let total = Number(o.amount ?? 0) || 0;
              if (!total && unit) total = unit * qty;
              const name = o.productName || o.name || '商品';
              const id = o.productId || o.id || '';
              const image = o.image || o.cover || o.thumb || '';
              addTop(topPhysicalMap, String(id || name), {
                id: String(id || ''),
                name,
                qty,
                amount: total || 0,
                image
              });
            }
          }
        }catch(_){}
      }
      if (scanAll){
        stats.orders.total = aliveIds.length;
        if (aliveIds.length !== ids.length){
          try{ await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(aliveIds)); }catch(_){}
        }
      }else{
        stats.orders.total = ids.length;
      }
    }

    // Service orders
    {
      const svcStore = env.SERVICE_ORDERS || env.ORDERS;
      if (svcStore){
        let ids = [];
        try{
          const idxRaw = await svcStore.get('SERVICE_ORDER_INDEX');
          ids = idxRaw ? JSON.parse(idxRaw) : [];
          if (!Array.isArray(ids)) ids = [];
        }catch(_){ ids = []; }
        const scanAll = ids.length <= scanLimit;
        const scanIds = scanAll ? ids : ids.slice(0, scanLimit);
        if (!scanAll && ids.length > scanIds.length) stats.serviceOrders.approx = true;
        const aliveIds = [];
        for (const oid of scanIds){
          const raw = await svcStore.get(oid);
          if (!raw) continue;
          if (scanAll) aliveIds.push(oid);
        try{
          const o = JSON.parse(raw);
          const isDone = isServiceDone(o);
          const isPaid = isServicePaid(o);
          const isCanceled = isServiceCanceled(o);
          if (isDone) stats.serviceOrders.done++;
          else if (isPaid) stats.serviceOrders.paid++;
          else if (isCanceled) stats.serviceOrders.canceled++;
          else stats.serviceOrders.pending++;
          if (isDone) reports.service.status.done++;
          else if (isPaid) reports.service.status.paid++;
          else if (isCanceled) reports.service.status.canceled++;
          else reports.service.status.pending++;

            const createdTs = getOrderCreatedTs(o);
            addPeriods(reports.service.orders, createdTs, 1);

            if (isPaid){
              const paidTs = getOrderPaidTs(o) || createdTs;
              const amount = getOrderAmount(o);
              if (amount > 0) addPeriods(reports.service.revenue, paidTs, amount);
              const rawItems = getOrderItems(o);
              if (rawItems.length){
                for (const it of rawItems){
                  const qty = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
                  const unit = Number(it.price ?? it.unitPrice ?? it.amount ?? 0) || 0;
                  let total = Number(it.total ?? it.amountTotal ?? 0) || 0;
                  if (!total && unit) total = unit * qty;
                  if (!total && amount) total = amount / rawItems.length;
                  const name = it.name || o.serviceName || o.productName || '服務商品';
                  const id = o.serviceId || it.serviceId || '';
                  const image = it.image || it.cover || o.cover || '';
                  addTop(topServiceMap, String(id || name), {
                    id: String(id || ''),
                    name,
                    qty,
                    amount: total || 0,
                    image
                  });
                }
              } else {
                const qty = Math.max(1, Number(o.qty ?? 1));
                const unit = Number(o.price ?? 0) || 0;
                let total = Number(o.amount ?? 0) || 0;
                if (!total && unit) total = unit * qty;
                const name = o.serviceName || o.productName || '服務商品';
                const id = o.serviceId || o.id || '';
                const image = o.image || o.cover || '';
                addTop(topServiceMap, String(id || name), {
                  id: String(id || ''),
                  name,
                  qty,
                  amount: total || 0,
                  image
                });
              }
            }
          }catch(_){}
        }
        if (scanAll){
          stats.serviceOrders.total = aliveIds.length;
          if (aliveIds.length !== ids.length){
            try{ await svcStore.put('SERVICE_ORDER_INDEX', JSON.stringify(aliveIds)); }catch(_){}
          }
        }else{
          stats.serviceOrders.total = ids.length;
        }
      }
    }

    // Members
    {
      const store = getUserStore(env);
      if (store && store.list){
        try{
          const iter = await store.list({ prefix:'USER:' });
          const keys = Array.isArray(iter.keys) ? iter.keys : [];
          stats.members.total = keys.length;
          if (keys.length >= scanLimit) stats.members.approx = true;
        }catch(_){}
      }
    }

    // Coupons (approx via list)
    if (env.COUPONS && env.COUPONS.list){
      try{
        const iter = await env.COUPONS.list({ prefix:'COUPON:' });
        const keys = Array.isArray(iter.keys) ? iter.keys.slice(0, scanLimit) : [];
        stats.coupons.total = keys.length;
        if (iter.keys && iter.keys.length > keys.length) stats.coupons.approx = true;
        for (const k of keys){
          const raw = await env.COUPONS.get(k.name);
          if (!raw) continue;
          try{
            const c = JSON.parse(raw);
            const issuedAtTs = c.issuedAt ? Date.parse(c.issuedAt) : 0;
            if (issuedAtTs && issuedAtTs >= last7Ts) stats.coupons.total7++;
            if (c.used) stats.coupons.used++;
            const usedAtTs = c.usedAt ? Date.parse(c.usedAt) : 0;
            if (usedAtTs && usedAtTs >= last7Ts) stats.coupons.used7++;
          }catch(_){}
        }
      }catch(_){}
    }
    reports.physical.approx = stats.orders.approx || stats.products.approx;
    reports.service.approx = reports.service.approx || stats.serviceOrders.approx;
    reports.physical.topItems = Array.from(topPhysicalMap.values())
      .sort((a,b)=> (b.qty - a.qty) || (b.amount - a.amount))
      .slice(0, 10);
    reports.physical.lowStock = lowStockItems
      .sort((a,b)=> (a.stock - b.stock) || String(a.name).localeCompare(String(b.name), 'zh-Hant'))
      .slice(0, 10);
    reports.service.topItems = Array.from(topServiceMap.values())
      .sort((a,b)=> (b.qty - a.qty) || (b.amount - a.amount))
      .slice(0, 10);

    return { stats, reports, limits: { scanLimit, lowStockThreshold }, updatedAt: new Date().toISOString() };
  }

  function extractKeyFromProxyUrl(u) {
    try {
      const url = new URL(u);
      const m = url.pathname.match(/^\/api\/file\/(.+)$/);
      return m ? decodeURIComponent(m[1]) : "";
    } catch { return ""; }
  }

  /* ========== R2 代理讀檔 ========== */
  async function proxyR2File(key, env) {
    const obj = await env.R2_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status:404 });

    const headers = new Headers();
    const meta = obj.httpMetadata || {};
    if (meta.contentType) headers.set("Content-Type", meta.contentType);
    if (meta.contentDisposition) headers.set("Content-Disposition", meta.contentDisposition);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(obj.body, { headers });
  }

  /* ========== 工具 ========== */
  // ==== Coupon Object Schema (Unified) ====
  // 統一後端對優惠券物件的預期格式說明，方便後續所有 coupon 相關邏輯共用。
  // 優惠券一般會儲存在 COUPONS / ORDERS KV 或由外部服務回傳時套用。
  //
  // {
  //   code: string,            // 優惠券代碼，例如 UC-XZ-251112-HYHB-AWYV
  //   deity: string,           // 對應守護神代碼，例如 XZ（同商品 deity）
  //   amount: number,          // 單次折扣金額，例如 200
  //   used: boolean,           // 是否已被使用（單次券為 true 即不可再用）
  //   usedAt?: string,         // 使用時間（ISO 字串）
  //   orderId?: string,        // 綁定使用此券的訂單編號
  //   maxUseCount: number,     // 此券最多可使用幾次（單次券為 1）
  //   remaining: number,       // 剩餘可使用次數（0 則代表已無法再次使用）
  //   failed?: boolean,        // 本次檢查 / 兌換是否失敗
  //   reason?: string          // 失敗原因，例如 already_used / invalid / deity_not_match 等
  // }

  return {
    templeKey,
    buildTempleGeocodeQuery,
    resolveTempleCoords,
    resolveTempleHours,
    readTemple,
    saveTemple,
    deleteTemple,
    resetTemplesListMemoryCache,
    getTemplesListCache,
    getTemplesListCacheRaw,
    saveTemplesListCache,
    deleteTemplesListCache,
    listTemples,
    recordTempleMapStat
  };
}

export { createTempleUtils };
