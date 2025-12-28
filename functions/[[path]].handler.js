// functions/[[path]].handler.js
// 標準化所有樣式來源：於表單頁面載入時呼叫，統一欄位樣式，避免多重 CSS 衝突
function resetFormStyles() {
  const style = document.createElement('style');
  style.textContent = `
    form * {
      box-sizing: border-box !important;
      font-family: inherit !important;
      font-size: 16px !important;
      line-height: 1.5 !important;
      margin: 0 !important;
      padding: 6px 10px !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    input, textarea, select {
      display: block !important;
      border: 1px solid #ccc !important;
      border-radius: 6px !important;
      background: #fff !important;
    }
  `;
  document.head.appendChild(style);
}
const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
  'Cache-Control': 'no-store'
};

const ORDER_INDEX_KEY = 'ORDER_INDEX';
const ORDER_ID_PREFIX = 'OD';
const ORDER_ID_LEN = 10;
const SERVICE_ORDER_ID_PREFIX = 'SV';
const SERVICE_ORDER_ID_LEN = 10;
const FORTUNE_FORMAT_VERSION = 5;
const FORTUNE_STATS_PREFIX = 'FORTUNE_STATS:';
const FORTUNE_STATS_SEEN_PREFIX = 'FORTUNE_STATS:SEEN:';
const RATE_LIMIT_CACHE = new Map();

function resolveOrderIndexLimit(env){
  const raw = Number(env?.ORDER_INDEX_MAX || env?.ORDER_INDEX_LIMIT || 5000);
  const limit = Number.isFinite(raw) ? raw : 5000;
  return Math.max(200, Math.min(limit, 20000));
}
function trimOrderIndex(ids, env){
  const max = resolveOrderIndexLimit(env);
  if (Array.isArray(ids) && ids.length > max) ids.length = max;
  return ids;
}
function resolveCorsOrigin(request, env){
  const originHeader = (request.headers.get('Origin') || '').trim();
  let selfOrigin = '';
  try{ selfOrigin = new URL(request.url).origin; }catch(_){}
  const allow = new Set();
  const addOrigin = (val)=>{
    if (!val) return;
    try{
      const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
      allow.add(u.origin);
    }catch(_){}
  };
  if (selfOrigin) allow.add(selfOrigin);
  addOrigin(env.SITE_URL);
  addOrigin(env.PUBLIC_SITE_URL);
  addOrigin(env.PUBLIC_ORIGIN);
  const extra = (env.CORS_ORIGINS || env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  extra.forEach(addOrigin);
  if (originHeader && allow.has(originHeader)) return originHeader;
  return selfOrigin || '';
}
function jsonHeadersFor(request, env){
  const h = Object.assign({}, jsonHeaders);
  const origin = resolveCorsOrigin(request, env);
  if (origin) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Vary'] = 'Origin';
  } else {
    delete h['Access-Control-Allow-Origin'];
  }
  return h;
}
function isAllowedOrigin(request, env, extraOriginsRaw){
  const originHeader = (request.headers.get('Origin') || '').trim();
  if (!originHeader) return true;
  let selfOrigin = '';
  try{ selfOrigin = new URL(request.url).origin; }catch(_){}
  const allow = new Set();
  const addOrigin = (val)=>{
    if (!val) return;
    try{
      const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
      allow.add(u.origin);
    }catch(_){}
  };
  if (selfOrigin) allow.add(selfOrigin);
  addOrigin(env.SITE_URL);
  addOrigin(env.PUBLIC_SITE_URL);
  addOrigin(env.PUBLIC_ORIGIN);
  const extra = (env.CORS_ORIGINS || env.ALLOWED_ORIGINS || extraOriginsRaw || '')
    .split(',').map(s=>s.trim()).filter(Boolean);
  extra.forEach(addOrigin);
  return allow.has(originHeader);
}
function getClientIp(request){
  const raw = request.headers.get('CF-Connecting-IP')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || '';
  return String(raw).split(',')[0].trim();
}
async function checkRateLimit(env, key, limit, windowSec){
  const now = Date.now();
  const store = env.RATE_LIMIT || env.RATE_LIMITS || env.RATELIMIT || null;
  if (store && typeof store.get === 'function'){
    try{
      const raw = await store.get(key);
      let data = raw ? JSON.parse(raw) : null;
      if (!data || !data.ts || (now - data.ts) > windowSec * 1000){
        data = { count: 0, ts: now };
      }
      data.count += 1;
      await store.put(key, JSON.stringify(data), { expirationTtl: windowSec });
      return data.count <= limit;
    }catch(_){
      return true;
    }
  }
  const prev = RATE_LIMIT_CACHE.get(key);
  let next = prev;
  if (!next || (now - next.ts) > windowSec * 1000){
    next = { count: 0, ts: now };
  }
  next.count += 1;
  RATE_LIMIT_CACHE.set(key, next);
  return next.count <= limit;
}
function maskName(val){
  const s = String(val || '').trim();
  if (!s) return '';
  if (s.length === 1) return s + '*';
  if (s.length === 2) return s[0] + '*';
  return s[0] + '*'.repeat(Math.min(2, s.length - 2)) + s.slice(-1);
}
function maskPhone(val){
  const digits = String(val || '').replace(/\D+/g,'');
  if (!digits) return '';
  if (digits.length <= 4) return '*'.repeat(digits.length);
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  return head + '*'.repeat(Math.max(3, digits.length - 5)) + tail;
}
function maskEmail(val){
  const s = String(val || '').trim();
  const idx = s.indexOf('@');
  if (idx <= 1) return s ? s[0] + '***' : '';
  const head = s.slice(0, 1);
  const domain = s.slice(idx);
  return head + '***' + domain;
}
function redactOrderForPublic(order){
  const out = Object.assign({}, order || {});
  if (out.buyer){
    out.buyer = Object.assign({}, out.buyer, {
      name: maskName(out.buyer.name),
      phone: maskPhone(out.buyer.phone),
      email: maskEmail(out.buyer.email),
      store: '',
      line: '',
      uid: ''
    });
  }
  delete out.receiptUrl;
  delete out.receipt;
  delete out.proofUrl;
  delete out.transfer;
  delete out.transferLast5;
  delete out.payment;
  delete out.resultToken;
  delete out.adminNote;
  delete out.couponAssignment;
  if (out.coupon){
    const coupon = {};
    if (out.coupon.discount != null) coupon.discount = out.coupon.discount;
    if (out.coupon.amount != null) coupon.amount = out.coupon.amount;
    if (out.coupon.shippingDiscount != null) coupon.shippingDiscount = out.coupon.shippingDiscount;
    if (out.coupon.failed === true) coupon.failed = true;
    out.coupon = Object.keys(coupon).length ? coupon : undefined;
  }
  out.publicView = true;
  return out;
}
async function attachSignedProofs(order, env){
  const out = Object.assign({}, order || {});
  if (out.ritualPhotoUrl){
    out.ritualPhotoUrl = await signProofUrl(env, out.ritualPhotoUrl);
  }
  if (out.ritual_photo_url){
    out.ritual_photo_url = await signProofUrl(env, out.ritual_photo_url);
  }
  if (out.ritualPhoto){
    out.ritualPhoto = await signProofUrl(env, out.ritualPhoto);
  }
  if (Array.isArray(out.results)){
    const next = [];
    for (const r of out.results){
      if (!r) continue;
      const item = Object.assign({}, r);
      if (item.url) item.url = await signProofUrl(env, item.url);
      if (item.imageUrl) item.imageUrl = await signProofUrl(env, item.imageUrl);
      if (item.image) item.image = await signProofUrl(env, item.image);
      next.push(item);
    }
    out.results = next;
  }
  return out;
}
function parseAdminEmails(env){
  try{
    const raw = env.ADMIN_ALLOWED_EMAILS || '';
    return raw.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  }catch(_){ return []; }
}
async function getAdminSession(request, env){
  if (!env || !env.ADMIN_JWT_SECRET) return null;
  const cookies = parseCookies(request);
  const token = cookies.admin_session || '';
  if (!token) return null;
  try{
    const payload = await verifySessionToken(token, env.ADMIN_JWT_SECRET);
    if (!payload) return null;
    const email = (payload.email || '').toLowerCase();
    if (!email) return null;
    const allowed = parseAdminEmails(env);
    if (allowed.length && !allowed.includes(email)) return null;
    return payload;
  }catch(_){ return null; }
}
async function isAdmin(request, env){
  try{
    const fromCookie = await getAdminSession(request, env);
    if (fromCookie) return true;
    const key = (request.headers.get('x-admin-key') || request.headers.get('X-Admin-Key') || '').trim();
    return !!(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
  }catch(e){ return false; }
}
function collectAllowedOrigins(env, request, extraRaw){
  const allow = new Set();
  let selfOrigin = '';
  try{ selfOrigin = new URL(request.url).origin; }catch(_){}
  const addOrigin = (val)=>{
    if (!val) return;
    try{
      const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
      allow.add(u.origin);
    }catch(_){}
  };
  if (selfOrigin) allow.add(selfOrigin);
  addOrigin(env.SITE_URL);
  addOrigin(env.PUBLIC_SITE_URL);
  addOrigin(env.PUBLIC_ORIGIN);
  const extra = (env.CORS_ORIGINS || env.ALLOWED_ORIGINS || extraRaw || '')
    .split(',').map(s=>s.trim()).filter(Boolean);
  extra.forEach(addOrigin);
  return allow;
}
function isAllowedAdminOrigin(request, env){
  const allow = collectAllowedOrigins(env, request, env.ADMIN_ORIGINS || '');
  const originHeader = (request.headers.get('Origin') || '').trim();
  if (originHeader) return allow.has(originHeader);
  const ref = (request.headers.get('Referer') || '').trim();
  if (!ref) return true;
  try{
    const refOrigin = new URL(ref).origin;
    return allow.has(refOrigin);
  }catch(_){
    return false;
  }
}
async function requireAdminWrite(request, env){
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
  }
  if (!isAllowedAdminOrigin(request, env)) {
    return new Response(JSON.stringify({ ok:false, error:'Forbidden origin' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  return null;
}
async function requireCronOrAdmin(request, env){
  if (await isAdmin(request, env)) return null;
  const secret = String(env.CRON_SECRET || env.CRON_KEY || env.ADMIN_CRON_KEY || '').trim();
  if (!secret) {
    return new Response(JSON.stringify({ ok:false, error:'Cron key not configured' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  const h = (request.headers.get('x-cron-key') || request.headers.get('X-Cron-Key') || '').trim();
  let q = '';
  try{
    q = new URL(request.url).searchParams.get('key') || '';
  }catch(_){}
  if (h === secret || q === secret) return null;
  return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
}
async function verifyLineIdToken(idToken, env){
  if (!idToken || !env || !env.LINE_CHANNEL_ID) return null;
  try{
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: String(idToken || ''),
        client_id: String(env.LINE_CHANNEL_ID || '')
      })
    });
    const text = await res.text();
    let data = null;
    try{ data = JSON.parse(text); }catch(_){ data = null; }
    if (!res.ok || !data || !data.sub){
      console.error('line verify error', res.status, text);
      return null;
    }
    return data;
  }catch(err){
    console.error('line verify exception', err);
    return null;
  }
}

// === Coupon helpers (new in-house system) ===
function inferCouponDeity(code, hint){
  try{
    const h = String(hint || '').trim().toUpperCase();
    if (h) return h;
    const c = String(code || '').trim().toUpperCase();
    const m = c.match(/UC-([A-Z]{2,4})-/);
    if (m && m[1]) return m[1];
    return '';
  }catch(e){ return ''; }
}
function couponKey(code){ return `COUPON:${String(code||'').toUpperCase()}`; }
function makeCouponCode(deity){
  const d = String(deity||'').trim().toUpperCase() || 'XX';
  const rand = makeToken(6).toUpperCase();
  return `UC-${d}-${rand}`;
}

// Foods helpers (for food map)
function foodKey(id){ return `FOOD:${id}`; }
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
async function listFoods(env, limit){
  const out = [];
  if (!env.FOODS || !env.FOODS.list) return out;
  const iter = await env.FOODS.list({ prefix:'FOOD:' });
  const keys = Array.isArray(iter.keys) ? iter.keys.slice(0, limit||200) : [];
  for (const k of keys){
    const raw = await env.FOODS.get(k.name);
    if (!raw) continue;
    try{
      const obj = JSON.parse(raw);
      if (obj && obj.id) out.push(obj);
    }catch(_){}
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
    cover: 'https://shop.unalomecodes.com/api/file/mock/candle-basic.png',
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
    cover: 'https://shop.unalomecodes.com/api/file/mock/candle-plus.png',
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
function isTooSimilar(fortune, history){
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
function parseJsonFromText(text){
  if (!text) return null;
  try{ return JSON.parse(text); }catch(_){}
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try{ return JSON.parse(m[0]); }catch(_){ return null; }
}
async function callOpenAIFortune(env, prompt, seed){
  const apiKey = env.OPENAI_API_KEY || env.OPENAI_KEY || '';
  if (!apiKey) return null;
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const payload = {
    model,
    messages: [
      { role:'system', content:'你是資深命理顧問，請以繁體中文輸出。只回傳 JSON，不要任何多餘文字。' },
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
  record.email = profile.email || record.email || '';
  record.name = profile.name || record.name || '';
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
  try{
    const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && !p.deityCode && p.deity) p.deityCode = getDeityCodeFromName(p.deity);
    if (p) p.category = inferCategory(p);
    return p;
  }catch(_){
    return null;
  }
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
async function buildItemFromProduct(env, productId, variantName, qty){
  const pid = String(productId || '').trim();
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
  const hintMode   = (body.mode || '').toLowerCase();
  const directHint = isTruthy(body.directBuy) || isTruthy(body.single) || hintMode === 'direct';
  const hasCart    = Array.isArray(body.cart) && body.cart.length > 0;
  const cartHint   = hasCart && (isTruthy(body.fromCart) || isTruthy(body.useCart) || hintMode === 'cart');
  const preferDirect = (hintMode !== 'cart') && (directHint || !!body.productId);
  let useCartOnly = !preferDirect && cartHint;
  let items = [];
  if (useCartOnly){
    const cartArr = Array.isArray(body.cart) ? body.cart : [];
    for (const it of cartArr){
      const res = await buildItemFromProduct(env, it.id || it.productId || '', it.variantName || it.variant || '', it.qty || it.quantity || 1);
      if (!res.ok) return { ok:false, error: res.error || 'invalid_item' };
      items.push(res.item);
    }
  } else {
    const res = await buildItemFromProduct(env, body.productId || '', body.variantName || body.variant || '', body.qty || 1);
    if (!res.ok){
      if (hasCart){
        useCartOnly = true;
        items = [];
        const cartArr = Array.isArray(body.cart) ? body.cart : [];
        for (const it of cartArr){
          const r = await buildItemFromProduct(env, it.id || it.productId || '', it.variantName || it.variant || '', it.qty || it.quantity || 1);
          if (!r.ok) return { ok:false, error: r.error || 'invalid_item' };
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

function normalizeStatus(s){
  return String(s || '').trim();
}
function statusIsPaid(s){
  const v = normalizeStatus(s);
  if (!v) return false;
  const lower = v.toLowerCase();
  const unpaidHints = ['待付款','未付款','pending','waiting','待處理','待確認'];
  if (unpaidHints.some(k => lower.includes(k))) return false;
  const paidHints = ['已付款','已寄件','已出貨','已完成','完成訂單','完成','出貨'];
  if (paidHints.some(k => v.includes(k))) return true;
  return /\bpaid\b/i.test(v);
}
function statusIsCanceled(s){
  const v = normalizeStatus(s);
  if (!v) return false;
  const cancelHints = ['取消','作廢','退款','退貨','失敗','金額不符','拒收','逾期','未取','無效','撤單'];
  if (cancelHints.some(k => v.includes(k))) return true;
  return /\b(cancel|failed|void|refund|chargeback)\b/i.test(v);
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
          lockOk = false;
          break;
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
  const v = normalizeStatus(status);
  if (!v) return false;
  if (v === 'waiting_verify') return true;
  return v.includes('待確認') || v.includes('待查帳');
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

export async function onRequest(context) {
  const { request, env, next } = context;

  const url = new URL(request.url);
  const origin = url.origin;
  const pathname = url.pathname;
  /*__CVS_CALLBACK_MERGE_FINAL__*/
  try{
    const _u = new URL(request.url);
    if (_u.pathname === "/cvs_callback" && (request.method === "GET" || request.method === "POST")) {
        let source;
        if (request.method === "POST") {
          source = await request.formData();
        } else { // GET
          source = _u.searchParams;
        }

        const pick = (src, ...keys) => {
          for (const k of keys) {
            const v = src.get(k);
            if (v) return String(v);
          }
          return "";
        };

        const data = {
          __cvs_store__: true,
          storeid:   pick(source, "storeid", "StoreId", "stCode", "code", "store"),
          storename: pick(source, "storename", "StoreName", "stName", "name"),
          storeaddress: pick(source, "storeaddress", "StoreAddress", "address", "Addr"),
          storetel: pick(source, "storetel", "StoreTel", "tel", "TEL")
        };
        const dataJson = JSON.stringify(data);

        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>處理中...</title></head>
<body>
  <p>已選擇門市，正在返回...</p>
  <script>
    (function(){
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${dataJson}, "*");
        }
      } catch(e) { console.error(e); }
      try { window.close(); } catch(e) {}
    })();
  </script>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
  }catch(e){ /* ignore and continue */ }
  
  
  if (url.pathname === '/payment-result' && request.method === 'POST') {
    try {
      const form = await request.formData();
      const oid =
        form.get('CustomField1') ||
        form.get('customfield1') ||
        form.get('orderId') ||
        form.get('order_id') || '';
      let token = '';
      if (env.ORDERS && oid) {
        try {
          const raw = await env.ORDERS.get(String(oid));
          if (raw) {
            const order = JSON.parse(raw);
            if (!order.resultToken) {
              order.resultToken = makeToken(32);
              await env.ORDERS.put(String(oid), JSON.stringify(order));
            }
            token = String(order.resultToken || '');
          }
        } catch (_) {}
      }
      const target = new URL(url.origin + '/payment-result');
      if (oid) target.searchParams.set('orderId', String(oid));
      if (token) target.searchParams.set('token', token);
      return Response.redirect(target.toString(), 302);
    } catch (e) {
      return Response.redirect(url.origin + '/payment-result', 302);
    }
  }

  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && (request.method === 'GET' || request.method === 'HEAD')) {
    const admin = await isAdmin(request, env);
    if (!admin) {
      const redirectPath = pathname + url.search;
      const target = `${origin}/api/auth/google/admin/start?redirect=${encodeURIComponent(redirectPath)}`;
      return Response.redirect(target, 302);
    }
  }

    // =================================================================
    //  主要 API 路由 (提前處理，避免被 fallback 攔截)
    // =================================================================

    // 商品列表 / 新增
  if ((pathname === "/api/products" || pathname === "/products") && request.method === "GET") {
    return listProducts(url, env);
  }
  if (pathname === "/api/products" && request.method === "POST") {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    return createProduct(request, env);
  }

    // 商品單筆
    const prodIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/) || pathname.match(/^\/products\/([^/]+)$/);
    if (prodIdMatch) {
      const id = decodeURIComponent(prodIdMatch[1]);
      if (request.method === "GET")   return getProduct(id, env);
      if (request.method === "PUT")   { const guard = await requireAdminWrite(request, env); if (guard) return guard; return putProduct(id, request, env); }
      if (request.method === "PATCH") { const guard = await requireAdminWrite(request, env); if (guard) return guard; return patchProduct(id, request, env); }
      if (request.method === "DELETE"){ const guard = await requireAdminWrite(request, env); if (guard) return guard; return deleteProduct(id, env); }
    }
// ======== Bank Transfer Additions (non-breaking) ========
if (request.method === 'OPTIONS' && (pathname === '/api/payment/bank' || pathname === '/api/order/confirm-transfer')) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
      'Cache-Control': 'no-store'
    }
  });
}

  if (pathname === '/api/auth/google/login') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return new Response('Google OAuth not configured', { status:500 });
    }
    const state = makeToken(24);
    const redirectRaw = url.searchParams.get('redirect') || '';
    let redirectPath = '/shop.html';
    if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
      redirectPath = redirectRaw;
    }
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state
    });
    const headers = new Headers({
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    });
    headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
    headers.append('Set-Cookie', `oauth_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status:302, headers });
  }

  if (pathname === '/api/auth/line/login') {
    if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET) {
      return new Response('LINE OAuth not configured', { status:500 });
    }
    const redirectRaw = url.searchParams.get('redirect') || '';
    let redirectPath = '/shop.html';
    if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
      redirectPath = redirectRaw;
    }
    const stateSecret = env.LINE_CHANNEL_SECRET || env.OAUTH_STATE_SECRET || env.SESSION_SECRET || '';
    const statePayload = { t: Math.floor(Date.now() / 1000), n: makeToken(12), r: redirectPath };
    let state = await makeSignedState(statePayload, stateSecret);
    if (!state) state = makeToken(24);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: String(env.LINE_CHANNEL_ID || ''),
      redirect_uri: `${origin}/api/auth/line/callback`,
      state,
      scope: 'openid profile email'
    });
    const headers = new Headers({
      Location: `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
    });
    headers.append('Set-Cookie', `line_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
    headers.append('Set-Cookie', `line_oauth_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status:302, headers });
  }

  if (pathname === '/api/auth/line/callback') {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const cookies = parseCookies(request);
    const expectedState = cookies.line_oauth_state || '';
    const clearStateCookie = 'line_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
    const clearRedirectCookie = 'line_oauth_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
    const stateSecret = env.LINE_CHANNEL_SECRET || env.OAUTH_STATE_SECRET || env.SESSION_SECRET || '';
    const signedPayload = await verifySignedState(state, stateSecret, 600);
    const stateValid = !!expectedState && state === expectedState;
    const redirectPath = (()=> {
      const raw = cookies.line_oauth_redirect || '';
      if (raw) {
        try{
          const decoded = decodeURIComponent(raw);
          if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
        }catch(_){}
      }
      const signedRedirect = signedPayload && signedPayload.r;
      if (signedRedirect && typeof signedRedirect === 'string' && signedRedirect.startsWith('/') && !signedRedirect.startsWith('//')){
        return signedRedirect;
      }
      return '/shop.html';
    })();
    if (!code || !state || (!stateValid && !signedPayload)) {
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('Invalid OAuth state', { status:400, headers: h });
    }
    if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET) {
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('LINE OAuth not configured', { status:500, headers: h });
    }
    try{
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method:'POST',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${origin}/api/auth/line/callback`,
          client_id: String(env.LINE_CHANNEL_ID || ''),
          client_secret: String(env.LINE_CHANNEL_SECRET || '')
        })
      });
      const tokenText = await tokenRes.text();
      let tokens = null;
      try{ tokens = JSON.parse(tokenText); }catch(_){}
      if (!tokenRes.ok || !tokens || !tokens.id_token){
        console.error('line token error', tokenRes.status, tokenText);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('LINE OAuth error', { status:500, headers: h });
      }
      const info = await verifyLineIdToken(tokens.id_token, env);
      if (!info){
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('LINE ID token invalid', { status:401, headers: h });
      }
      const sub = String(info.sub || '').trim();
      const user = {
        id: `line:${sub}`,
        email: info.email || '',
        name: info.name || info.email || 'LINE 使用者',
        picture: info.picture || '',
        provider: 'line',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      await ensureUserRecord(env, user);
      const token = await signSession(user, env.SESSION_SECRET || '');
      const headers = new Headers({
        'Set-Cookie': `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      });
      headers.append('Set-Cookie', clearStateCookie);
      headers.append('Set-Cookie', clearRedirectCookie);
      headers.append('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
      headers.append('Location', `${origin}${redirectPath}`);
      return new Response(null, { status:302, headers });
    }catch(err){
      console.error('LINE OAuth error', err);
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('OAuth error', { status:500, headers: h });
    }
  }

  if (pathname === '/api/auth/line/liff' && request.method === 'POST') {
    const headers = jsonHeadersFor(request, env);
    if (!env.LINE_CHANNEL_ID){
      return new Response(JSON.stringify({ ok:false, error:'LINE not configured' }), { status:500, headers });
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const idToken = String(body.id_token || body.idToken || '').trim();
    if (!idToken){
      return new Response(JSON.stringify({ ok:false, error:'missing_id_token' }), { status:400, headers });
    }
    const info = await verifyLineIdToken(idToken, env);
    if (!info){
      return new Response(JSON.stringify({ ok:false, error:'invalid_id_token' }), { status:401, headers });
    }
    const sub = String(info.sub || '').trim();
    const user = {
      id: `line:${sub}`,
      email: info.email || '',
      name: info.name || info.email || 'LINE 使用者',
      picture: info.picture || '',
      provider: 'line',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    await ensureUserRecord(env, user);
    const token = await signSession(user, env.SESSION_SECRET || '');
    const h = new Headers(headers);
    h.append('Set-Cookie', `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    h.append('Set-Cookie', `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
    return new Response(JSON.stringify({ ok:true, user:{
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      provider: user.provider
    }}), { status:200, headers: h });
  }

  if (pathname === '/api/auth/google/callback') {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const cookies = parseCookies(request);
    const expectedState = cookies.oauth_state || '';
    const clearStateCookie = 'oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
    const clearRedirectCookie = 'oauth_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
    const redirectPath = (()=> {
      const raw = cookies.oauth_redirect || '';
      if (raw) {
        try{
          const decoded = decodeURIComponent(raw);
          if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
        }catch(_){}
      }
      return '/shop.html';
    })();
    if (!code || !state || !expectedState || state !== expectedState) {
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('Invalid OAuth state', { status:400, headers: h });
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return new Response('Google OAuth not configured', {
        status:500,
        headers:{ 'Set-Cookie': clearStateCookie }
      });
    }
    try{
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${origin}/api/auth/google/callback`,
          grant_type: 'authorization_code'
        })
      });
      const tokenText = await tokenRes.text();
      let tokens = null;
      try{ tokens = JSON.parse(tokenText); }catch(_){}
      if (!tokenRes.ok || !tokens || !tokens.access_token){
        console.error('google token error', tokenRes.status, tokenText);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('無法取得 Google token', { status:500, headers: h });
      }
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers:{ Authorization: `Bearer ${tokens.access_token}` }
      });
      const infoText = await infoRes.text();
      let profile = null;
      try{ profile = JSON.parse(infoText); }catch(_){}
      if (!infoRes.ok || !profile || !profile.sub){
        console.error('google userinfo error', infoRes.status, infoText);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('取得使用者資訊失敗', { status:500, headers: h });
      }
      const user = {
        id: profile.sub,
        email: profile.email || '',
        name: profile.name || profile.email || '使用者',
        picture: profile.picture || '',
        provider: 'google',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      await ensureUserRecord(env, user);
      const token = await signSession(user, env.SESSION_SECRET || '');
      const headers = new Headers({
        'Set-Cookie': `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      });
      // 移除可能存在的 admin session，避免一般登入沿用先前的管理員憑證
      headers.append('Set-Cookie', `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
      // 若為管理員白名單且已設定 ADMIN_JWT_SECRET，直接簽發 admin_session，免二次登入
      try{
        const allowed = parseAdminEmails(env);
        const mail = (user.email || '').toLowerCase();
        if (allowed.length && allowed.includes(mail) && env.ADMIN_JWT_SECRET){
          const adminPayload = {
            sub: user.id || mail,
            email: mail,
            name: user.name || mail,
            role: 'admin',
            exp: Date.now() + 60 * 60 * 1000 // 1 小時
          };
          const adminToken = await signSession(adminPayload, env.ADMIN_JWT_SECRET);
          headers.append('Set-Cookie', `admin_session=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`);
        }
      }catch(_){}
      headers.append('Set-Cookie', clearStateCookie);
      headers.append('Set-Cookie', clearRedirectCookie);
      headers.append('Location', `${origin}${redirectPath}`);
      return new Response(null, { status:302, headers });
    }catch(err){
      console.error('OAuth error', err);
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('OAuth error', { status:500, headers: h });
    }
  }

  // === Admin OAuth (Google) ===
  if (pathname === '/api/auth/google/admin/start') {
    if (!env.GOOGLE_ADMIN_CLIENT_ID || !env.GOOGLE_ADMIN_CLIENT_SECRET) {
      return new Response('Admin Google OAuth not configured', { status:500 });
    }
    const redirectRaw = url.searchParams.get('redirect') || '';
    let redirectPath = '/admin/';
    if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
      redirectPath = redirectRaw;
    }
    const stateSecret = env.GOOGLE_ADMIN_CLIENT_SECRET || env.OAUTH_STATE_SECRET || env.ADMIN_JWT_SECRET || env.SESSION_SECRET || '';
    const statePayload = { t: Math.floor(Date.now() / 1000), n: makeToken(12), r: redirectPath };
    let state = await makeSignedState(statePayload, stateSecret);
    if (!state) state = makeToken(24);
    const params = new URLSearchParams({
      client_id: env.GOOGLE_ADMIN_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/google/admin/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state
    });
    const headers = new Headers({
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    });
    headers.append('Set-Cookie', `admin_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
    headers.append('Set-Cookie', `admin_oauth_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status:302, headers });
  }

  if (pathname === '/api/auth/google/admin/callback') {
    const code = url.searchParams.get('code') || '';
    const state = url.searchParams.get('state') || '';
    const cookies = parseCookies(request);
    const expectedState = cookies.admin_oauth_state || '';
    const clearStateCookie = 'admin_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
    const clearRedirectCookie = 'admin_oauth_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
    const stateSecret = env.GOOGLE_ADMIN_CLIENT_SECRET || env.OAUTH_STATE_SECRET || env.ADMIN_JWT_SECRET || env.SESSION_SECRET || '';
    const signedPayload = await verifySignedState(state, stateSecret, 600);
    const stateValid = !!expectedState && state === expectedState;
    const redirectPath = (()=> {
      const raw = cookies.admin_oauth_redirect || '';
      if (raw) {
        try{
          const decoded = decodeURIComponent(raw);
          if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
        }catch(_){}
      }
      const signedRedirect = signedPayload && signedPayload.r;
      if (signedRedirect && typeof signedRedirect === 'string' && signedRedirect.startsWith('/') && !signedRedirect.startsWith('//')){
        return signedRedirect;
      }
      return '/admin/';
    })();
    if (!code || !state || (!stateValid && !signedPayload)) {
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('Invalid OAuth state', { status:400, headers: h });
    }
    if (!env.GOOGLE_ADMIN_CLIENT_ID || !env.GOOGLE_ADMIN_CLIENT_SECRET) {
      return new Response('Admin Google OAuth not configured', {
        status:500,
        headers:{ 'Set-Cookie': clearStateCookie }
      });
    }
    try{
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_ADMIN_CLIENT_ID,
          client_secret: env.GOOGLE_ADMIN_CLIENT_SECRET,
          redirect_uri: `${origin}/api/auth/google/admin/callback`,
          grant_type: 'authorization_code'
        })
      });
      const tokenText = await tokenRes.text();
      let tokens = null;
      try{ tokens = JSON.parse(tokenText); }catch(_){}
      if (!tokenRes.ok || !tokens || !tokens.id_token){
        console.error('admin google token error', tokenRes.status, tokenText);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('無法取得 Google token', { status:500, headers: h });
      }
      const parts = String(tokens.id_token||'').split('.');
      if (parts.length < 2){
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('無法解析 id_token', { status:500, headers: h });
      }
      let profile = null;
      try{
        const payloadBytes = base64UrlDecodeToBytes(parts[1]);
        profile = JSON.parse(new TextDecoder().decode(payloadBytes));
      }catch(_){}
      if (!profile || !profile.email){
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('無法取得使用者資訊', { status:500, headers: h });
      }
      const email = (profile.email || '').toLowerCase();
      const emailVerified = profile.email_verified === true || profile.email_verified === 'true';
      const aud = profile.aud || '';
      const iss = profile.iss || '';
      const allowedIss = ['https://accounts.google.com', 'accounts.google.com'];
      const allowedEmails = parseAdminEmails(env);
      if (!emailVerified || !allowedEmails.includes(email) || aud !== env.GOOGLE_ADMIN_CLIENT_ID || !allowedIss.includes(iss)){
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('非授權的管理員帳號', { status:403, headers: h });
      }
      const adminPayload = {
        sub: profile.sub || email,
        email,
        name: profile.name || email,
        role: 'admin',
        exp: Date.now() + 60 * 60 * 1000
      };
      const adminToken = await signSession(adminPayload, env.ADMIN_JWT_SECRET || '');
      const headers = new Headers({
        'Set-Cookie': `admin_session=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
      });
      headers.append('Set-Cookie', clearStateCookie);
      headers.append('Set-Cookie', clearRedirectCookie);
      const redirectUrl = `${origin}${redirectPath}`;
      return redirectWithBody(redirectUrl, headers);
    }catch(err){
      console.error('Admin OAuth error', err);
      const h = new Headers();
      h.append('Set-Cookie', clearStateCookie);
      h.append('Set-Cookie', clearRedirectCookie);
      return new Response('OAuth error', { status:500, headers: h });
    }
  }

  if (pathname === '/api/auth/me') {
    const user = await getSessionUser(request, env);
    if (!user){
      return json({ ok:false, error:'unauthenticated' }, 401);
    }
    return json({ ok:true, user });
  }
  if (pathname === '/api/auth/admin/me') {
    const admin = await getAdminSession(request, env);
    if (!admin){
      return json({ ok:false, error:'unauthorized' }, 401);
    }
    return json({ ok:true, admin:true, email: admin.email || '', name: admin.name || admin.email || '' });
  }

  if (pathname === '/api/admin/fortune-stats' && request.method === 'GET') {
    if (!(await isAdmin(request, env))){
      return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
    }
    if (!env.FORTUNES){
      return new Response(JSON.stringify({ ok:false, error:'FORTUNES KV not bound' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    const daysRaw = parseInt(url.searchParams.get('days') || '14', 10);
    const days = Math.max(1, Math.min(90, Number.isFinite(daysRaw) ? daysRaw : 14));
    const out = [];
    for (let i = days - 1; i >= 0; i--){
      const dateKey = taipeiDateKey(Date.now() - i * 86400000);
      let count = 0;
      try{
        const raw = await env.FORTUNES.get(`${FORTUNE_STATS_PREFIX}${dateKey}`);
        count = parseInt(raw || '0', 10) || 0;
      }catch(_){}
      out.push({ date: dateKey, count });
    }
    return new Response(JSON.stringify({ ok:true, days: out }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  // Admin: list users / profiles
  if (pathname === '/api/admin/users' && request.method === 'GET') {
    if (!(await isAdmin(request, env))){
      return json({ ok:false, error:'unauthorized' }, 401);
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500);
    }
    if (!store.list){
      return json({ ok:false, error:'list_not_supported_on_store' }, 500);
    }
    try{
      const qRaw = (url.searchParams.get('q') || '').trim().toLowerCase();
      const limit = Math.min(Number(url.searchParams.get('limit') || 200), 500);
      const iter = await store.list({ prefix:'USER:' });
      const keys = Array.isArray(iter.keys) ? iter.keys.map(k=>k.name) : [];
      const out = [];
      for (const key of keys.slice(0, limit)){
        const raw = await store.get(key);
        if (!raw) continue;
        try{
          const obj = JSON.parse(raw);
          obj.id = obj.id || key.replace(/^USER:/,'');
          if (qRaw){
            const hay = JSON.stringify(obj).toLowerCase();
            if (!hay.includes(qRaw)) continue;
          }
          out.push(obj);
        }catch(_){}
      }
      out.sort((a,b)=>{
        const la = new Date(a.lastLoginAt || a.updatedAt || a.createdAt || 0).getTime();
        const lb = new Date(b.lastLoginAt || b.updatedAt || b.createdAt || 0).getTime();
        return lb - la;
      });
      return json({ ok:true, items: out.slice(0, limit) });
    }catch(e){
      return json({ ok:false, error:String(e) }, 500);
    }
  }
  if (pathname === '/api/admin/dashboard' && request.method === 'GET') {
    if (!(await isAdmin(request, env))){
      return json({ ok:false, error:'unauthorized' }, 401);
    }
    const scanLimit = Math.max(50, Math.min(Number(env.ADMIN_STATS_LIMIT || 800) || 800, 2000));
    const lowStockThreshold = Math.max(0, Number(env.LOW_STOCK_THRESHOLD || 3) || 3);
    const stats = {
      products: { total: 0, active: 0, lowStock: 0, approx: false },
      orders: { total: 0, paid: 0, pending: 0, canceled: 0, approx: false },
      members: { total: 0, approx: false },
      coupons: { total: 0, used: 0, approx: false }
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
          if (stockTotal !== null && stockTotal <= lowStockThreshold) stats.products.lowStock++;
        }catch(_){}
      }
    }

    // Orders
    if (env.ORDERS){
      let ids = [];
      try{
        const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
        ids = idxRaw ? JSON.parse(idxRaw) : [];
        if (!Array.isArray(ids)) ids = [];
      }catch(_){ ids = []; }
      stats.orders.total = ids.length;
      const slice = ids.slice(0, scanLimit);
      if (ids.length > slice.length) stats.orders.approx = true;
      for (const oid of slice){
        const raw = await env.ORDERS.get(oid);
        if (!raw) continue;
        try{
          const o = JSON.parse(raw);
          if (statusIsPaid(o.status)) stats.orders.paid++;
          else if (statusIsCanceled(o.status)) stats.orders.canceled++;
          else stats.orders.pending++;
        }catch(_){}
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
            if (c.used) stats.coupons.used++;
          }catch(_){}
        }
      }catch(_){}
    }
    return json({ ok:true, stats, limits: { scanLimit, lowStockThreshold } });
  }
  if (pathname === '/api/admin/users/reset-guardian' && request.method === 'POST') {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500);
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const id = String(body.id || body.userId || '').trim();
    if (!id){
      return json({ ok:false, error:'missing_user_id' }, 400);
    }
    const record = await loadUserRecord(env, id);
    if (!record){
      return json({ ok:false, error:'user_not_found' }, 404);
    }
    delete record.guardian;
    delete record.quiz;
    await saveUserRecord(env, record);
    if (env.FORTUNES){
      try{
        await env.FORTUNES.delete(`FORTUNE:${record.id}:${taipeiDateKey()}`);
      }catch(_){}
    }
    return json({ ok:true, id });
  }
  if (pathname === '/api/admin/users/delete' && request.method === 'POST') {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500);
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const id = String(body.id || body.userId || '').trim();
    const confirm = String(body.confirm || '').trim();
    if (!id){
      return json({ ok:false, error:'missing_user_id' }, 400);
    }
    if (confirm !== '刪除'){
      return json({ ok:false, error:'confirm_required' }, 400);
    }
    const record = await loadUserRecord(env, id);
    if (!record){
      return json({ ok:false, error:'user_not_found' }, 404);
    }
    let revokedCoupons = null;
    try{
      revokedCoupons = await revokeUserCoupons(env, record, { reason:'user_deleted' });
    }catch(e){
      revokedCoupons = { error: String(e) };
    }
    await store.delete(userKey(id));
    return json({ ok:true, id, revokedCoupons });
  }

  if (pathname === '/api/me/store') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (request.method === 'GET') {
      return json({ ok:true, store: record.defaultStore || null });
    }
    if (request.method === 'POST' || request.method === 'PATCH') {
      try{
        const raw = await request.text();
        let body = {};
        try{ body = JSON.parse(raw||'{}'); }catch(_){ body = {}; }
        const store = {
          id: String(body.id || body.storeid || '').trim(),
          name: String(body.name || body.storename || '').trim(),
          address: String(body.address || body.storeaddress || '').trim(),
          tel: String(body.tel || body.storetel || '').trim()
        };
        await updateUserDefaultStore(env, record.id, store);
        const refreshed = await loadUserRecord(env, record.id);
        return json({ ok:true, store: refreshed.defaultStore || store });
      }catch(_){
        return json({ ok:false, error:'invalid payload' }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/logout' && request.method === 'POST') {
    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    headers.append('Set-Cookie', 'auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
    headers.append('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
    return new Response(JSON.stringify({ ok:true }), { status:200, headers });
  }

  if (pathname === '/api/me/profile') {
    const record = await getSessionUserRecord(request, env);
    if (!record){
      if (request.method === 'GET') {
        return json({ ok:true, profile:null }, 200);
      }
      return json({ ok:false, error:'unauthorized' }, 401);
    }
    if (request.method === 'PATCH') {
      try{
        const body = await request.json();
        let changed = false;
        const prevGuardianCode = String(record.guardian?.code || '').toUpperCase();
        if (body && body.profile){
          if (Object.prototype.hasOwnProperty.call(body.profile, 'name')){
            record.name = String(body.profile.name || '').trim();
            changed = true;
          }
          if (Object.prototype.hasOwnProperty.call(body.profile, 'email')){
            record.email = String(body.profile.email || '').trim();
            changed = true;
          }
        }
        if (body && (Object.prototype.hasOwnProperty.call(body, 'name') || Object.prototype.hasOwnProperty.call(body, 'email'))){
          if (Object.prototype.hasOwnProperty.call(body, 'name')){
            record.name = String(body.name || '').trim();
            changed = true;
          }
          if (Object.prototype.hasOwnProperty.call(body, 'email')){
            record.email = String(body.email || '').trim();
            changed = true;
          }
        }
        if (body && body.defaultContact){
          record.defaultContact = Object.assign({}, record.defaultContact || {}, {
            name: String(body.defaultContact.name || '').trim(),
            phone: String(body.defaultContact.phone || '').trim(),
            email: String(body.defaultContact.email || '').trim()
          });
          changed = true;
        }
        if (body && body.defaultStore){
          record.defaultStore = Object.assign({}, record.defaultStore || {}, {
            id: String(body.defaultStore.id || body.defaultStore.storeid || '').trim(),
            name: String(body.defaultStore.name || body.defaultStore.storename || '').trim(),
            address: String(body.defaultStore.address || body.defaultStore.storeaddress || '').trim(),
            tel: String(body.defaultStore.tel || body.defaultStore.storetel || '').trim()
          });
          changed = true;
        }
        if (body && body.guardian){
          const payload = {
            code: String(body.guardian.code||'').trim().toUpperCase(),
            name: String(body.guardian.name||'').trim(),
            ts: body.guardian.ts ? new Date(body.guardian.ts).toISOString() : new Date().toISOString()
          };
          record.guardian = payload;
          changed = true;
        }
        if (body && body.quiz){
          const quiz = normalizeQuizInput(body.quiz);
          if (quiz){
            record.quiz = quiz;
            changed = true;
          }
        }
        if (changed){
          await saveUserRecord(env, record);
          const refreshed = await loadUserRecord(env, record.id);
          const nextGuardianCode = String(refreshed?.guardian?.code || '').toUpperCase();
          if (env.FORTUNES && prevGuardianCode !== nextGuardianCode){
            try{
              await env.FORTUNES.delete(`FORTUNE:${record.id}:${taipeiDateKey()}`);
            }catch(_){}
          }
          return json({ ok:true, profile: {
            id: refreshed.id,
            name: refreshed.name,
            email: refreshed.email,
            picture: refreshed.picture,
            defaultContact: refreshed.defaultContact || null,
            defaultStore: refreshed.defaultStore || null,
            memberPerks: refreshed.memberPerks || {},
            wishlist: Array.isArray(refreshed.wishlist) ? refreshed.wishlist : [],
            guardian: refreshed.guardian || null,
            quiz: refreshed.quiz || null
          }});
        }
      }catch(_){}
      return json({ ok:false, error:'invalid payload' }, 400);
    }
    return json({ ok:true, profile: {
      id: record.id,
      name: record.name,
      email: record.email,
      picture: record.picture,
      defaultContact: record.defaultContact || null,
      defaultStore: record.defaultStore || null,
      memberPerks: record.memberPerks || {},
      wishlist: Array.isArray(record.wishlist) ? record.wishlist : [],
      guardian: record.guardian || null,
      quiz: record.quiz || null
    }});
  }

  if (pathname === '/api/fortune' && request.method === 'GET') {
    const record = await getSessionUserRecord(request, env);
    const headers = jsonHeadersFor(request, env);
    if (!record){
      return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status:401, headers });
    }
    if (!env.FORTUNES){
      return new Response(JSON.stringify({ ok:false, error:'FORTUNES KV not bound' }), { status:500, headers });
    }
    const todayKey = taipeiDateKey();
    const cacheKey = `FORTUNE:${record.id}:${todayKey}`;
    try{
      const cached = await env.FORTUNES.get(cacheKey);
      if (cached){
        let parsed = null;
        try{ parsed = JSON.parse(cached); }catch(_){ parsed = null; }
        const cachedCode = String(parsed?.fortune?.meta?.guardianCode || '').toUpperCase();
        const currentCode = String(record?.guardian?.code || '').toUpperCase();
        const cachedVersion = Number(parsed?.version || 0);
        if (cachedCode && currentCode && cachedCode === currentCode && cachedVersion === FORTUNE_FORMAT_VERSION){
          await recordFortuneStat(env, todayKey, record.id);
          return new Response(cached, { status:200, headers });
        }
      }
    }catch(_){}
    const guardian = record.guardian || null;
    const quiz = record.quiz || null;
    if (!guardian || !guardian.code){
      return new Response(JSON.stringify({ ok:false, error:'missing_guardian', needQuiz:true }), { status:400, headers });
    }
    if (!quiz || (!quiz.dow && !quiz.job && !quiz.zod)){
      return new Response(JSON.stringify({ ok:false, error:'missing_quiz', needQuiz:true }), { status:400, headers });
    }
    const parts = taipeiDateParts();
    const dateText = formatTaipeiDate();
    const zodiacInfo = zodiacInfoByKey((quiz && (quiz.zodLabel || quiz.zod)) || '') || sunSignByDate(parts.month, parts.day);
    const userZodiac = (zodiacInfo && zodiacInfo.name) || (quiz && (quiz.zodLabel || quiz.zod)) || '';
    const userZodiacElement = (zodiacInfo && zodiacInfo.element) || '';
    const moon = moonPhaseInfo(Date.now());
    const ichSeed = fnv1aHash(`${todayKey}`);
    const iching = ICHING_NAMES[ichSeed % ICHING_NAMES.length];
    const thaiColor = thaiDayColor(parts.dow);
    const buddhistYear = parts.year + 543;
    const traitList = Array.isArray(quiz.traits) ? quiz.traits : [];
    const meta = {
      dateKey: todayKey,
      userZodiac,
      userZodiacElement,
      moonPhase: moon.name,
      iching,
      todayDow: ['日','一','二','三','四','五','六'][parts.dow] || '',
      thaiDayColor: thaiColor,
      buddhistYear,
      guardianName: guardian.name || guardian.code || '守護神',
      guardianCode: String(guardian.code || '').toUpperCase()
    };
    const ctx = {
      dateText,
      guardianName: guardian.name || guardian.code || '守護神',
      guardianCode: String(guardian.code || '').toUpperCase(),
      quiz,
      meta
    };
    const history = [];
    for (let i=1;i<=7;i++){
      const dk = taipeiDateKey(Date.now() - i * 86400000);
      const hk = `FORTUNE:${record.id}:${dk}`;
      try{
        const raw = await env.FORTUNES.get(hk);
        if (raw){
          const parsed = JSON.parse(raw);
          if (parsed && parsed.fortune) history.push(parsed.fortune);
        }
      }catch(_){}
    }
    const seedStr = [
      record.id,
      todayKey,
      guardian.code || '',
      quiz.dow || '',
      quiz.zod || '',
      quiz.job || '',
      (quiz.answers && Object.values(quiz.answers).join('')) || ''
    ].join('|');
    const seed = fnv1aHash(seedStr);
    const adviceLine = buildAdviceLine(seed);
    const starText = buildStarText(seed);
    const avoidSummaries = history.map(h=>h.summary).filter(Boolean).slice(0, 5);
    const avoidAdvice = history.map(h=>h.advice).filter(Boolean).slice(0, 5);
    const prompt = [
      `今天日期：${dateText}（台灣時間）`,
      `當日天象：月相 ${moon.name}，易經 ${iching}`,
      `泰國元素：今日星期色 ${thaiColor || '—'}，佛曆 ${buddhistYear} 年`,
      `使用者資料：守護神 ${ctx.guardianName}（${ctx.guardianCode}）`,
      `出生星期：${quiz.dowLabel || quiz.dow || '—'}${quiz.color ? `（幸運色：${quiz.color}）` : ''}`,
      `使用者星座：${userZodiac || '—'}${userZodiacElement ? `（${userZodiacElement}象）` : ''}`,
      `工作類型：${quiz.jobLabel || quiz.job || '—'}`,
      `個人性格關鍵詞：${traitList.join('、') || '—'}`,
      `請輸出 JSON：{"date":"","summary":"","advice":"","ritual":""}`,
      `summary 用 2~3 句描述感情/人際、工作/學習、財運，語氣像每日運勢解析。`,
      `advice 為生活小建議（1~2 句），請不要再寫「今日運勢偏向...」這句，系統會自動加在前面。`,
      `ritual 是「守護神想對你說」的鼓勵或實用金句（1~2 句），避免提到點香、蠟燭、供品。`,
      `只使用以上提供的天象/日期/泰國元素資訊，不要捏造其他星體或數據。`,
      avoidSummaries.length ? `避免與過去 summary 太相似：${avoidSummaries.join(' / ')}` : '',
      avoidAdvice.length ? `避免與過去 advice 太相似：${avoidAdvice.join(' / ')}` : ''
    ].filter(Boolean).join('\n');
    let fortune = normalizeFortunePayload(await callOpenAIFortune(env, prompt, seed), ctx);
    let source = fortune ? 'openai' : 'local';
    if (fortune && isTooSimilar(fortune, history)){
      const promptAlt = prompt + '\n請換一組新的角度與語彙，避免雷同。';
      const alt = normalizeFortunePayload(await callOpenAIFortune(env, promptAlt, seed + 1), ctx);
      if (alt && !isTooSimilar(alt, history)){
        fortune = alt;
        source = 'openai';
      }else{
        fortune = buildLocalFortune(ctx, seed + 17);
        source = 'local';
      }
    }
    if (!fortune){
      fortune = buildLocalFortune(ctx, seed + 17);
      source = 'local';
    }
    if (fortune && fortune.summary){
      fortune.summary = normalizeSummaryStars(fortune.summary);
    }
    if (fortune && !fortune.summary){
      const fallback = buildLocalFortune(ctx, seed + 53);
      fortune.summary = fallback.summary || '';
    }
    if (fortune && !fortune.stars){
      fortune.stars = starText;
    }
    if (fortune && adviceLine && adviceLine.line){
      fortune.advice = normalizeAdviceWithLine(fortune.advice || '', adviceLine.line);
    }
    if (fortune && fortune.ritual){
      fortune.ritual = sanitizeRitual(fortune.ritual, ctx);
    }
    if (isTooSimilar(fortune, history)){
      fortune = buildLocalFortune(ctx, seed + 37);
      source = 'local';
    }
    const payload = {
      ok:true,
      fortune,
      dateKey: todayKey,
      version: FORTUNE_FORMAT_VERSION,
      source,
      createdAt: new Date().toISOString()
    };
    try{
      await env.FORTUNES.put(cacheKey, JSON.stringify(payload));
    }catch(_){}
    await recordFortuneStat(env, todayKey, record.id);
    return new Response(JSON.stringify(payload), { status:200, headers });
  }

  // Food map favorites (member)
  if (pathname === '/api/me/food-favs') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (request.method === 'GET'){
      return json({ ok:true, favorites: Array.isArray(record.favoritesFoods) ? record.favoritesFoods : [] });
    }
    if (request.method === 'POST'){
      try{
        const body = await request.json().catch(()=>({}));
        const id = String(body.id||'').trim();
        if (!id) return json({ ok:false, error:'missing id' }, 400);
        const action = (body.action || 'toggle').toLowerCase();
        const list = Array.isArray(record.favoritesFoods) ? record.favoritesFoods.slice() : [];
        const idx = list.indexOf(id);
        if (action === 'remove'){ if (idx!==-1) list.splice(idx,1); }
        else if (action === 'add'){ if (idx===-1) list.unshift(id); }
        else { if (idx===-1) list.unshift(id); else list.splice(idx,1); }
        record.favoritesFoods = list.slice(0, 500);
        await saveUserRecord(env, record);
        return json({ ok:true, favorites: record.favoritesFoods });
      }catch(_){
        return json({ ok:false, error:'invalid payload' }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  // Food map data (list / admin upsert)
  if (pathname === '/api/foods') {
    if (request.method === 'GET'){
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      const items = await listFoods(env, 300);
      return json({ ok:true, items });
    }
    if (request.method === 'POST'){
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      try{
        const body = await request.json().catch(()=>({}));
        const id = String(body.id || `food-${Date.now()}`).trim();
        if (!id) return json({ ok:false, error:'missing id' }, 400);
        const now = new Date().toISOString();
        const obj = {
          id,
          name: String(body.name||'').trim(),
          category: String(body.category||'').trim(),
          area: String(body.area||'').trim(),
          price: String(body.price||'').trim(),
          address: String(body.address||'').trim(),
          maps: String(body.maps||'').trim(),
          ig: String(body.ig||'').trim(),
          cover: String(body.cover||'').trim(),
          highlights: Array.isArray(body.highlights) ? body.highlights : [],
          dishes: Array.isArray(body.dishes) ? body.dishes : [],
          updatedAt: now
        };
        await saveFood(env, obj);
        return json({ ok:true, item: obj });
      }catch(e){
        return json({ ok:false, error:String(e) }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/me/orders' && request.method === 'GET') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    const ordersStore = env.ORDERS;
    const svcStore = env.SERVICE_ORDERS || env.ORDERS;
    const out = { physical: [], service: [] };
    const matchOrder = (order)=>{
      if (!order) return false;
      if (order.buyer && order.buyer.uid && order.buyer.uid === record.id) return true;
      if (record.email){
        const emails = [
          order?.buyer?.email,
          order?.buyer?.contact,
          order?.email,
          order?.contact
        ].filter(Boolean);
        if (emails.some(e => String(e).toLowerCase() === record.email.toLowerCase())) return true;
      }
      return false;
    };
    if (ordersStore) {
      try{
        const idxRaw = await ordersStore.get(ORDER_INDEX_KEY);
        const ids = idxRaw ? JSON.parse(idxRaw) : [];
        for (const id of ids.slice(0, 200)){
          const raw = await ordersStore.get(id);
          if (!raw) continue;
          try{
            const order = JSON.parse(raw);
            if (matchOrder(order)){
              const merged = Object.assign({ id }, order);
              out.physical.push(await attachSignedProofs(merged, env));
            }
          }catch(_){}
        }
      }catch(_){}
    }
    if (svcStore){
      try{
        const idxRaw = await svcStore.get('SERVICE_ORDER_INDEX');
        const ids = idxRaw ? JSON.parse(idxRaw) : [];
        for (const id of ids.slice(0, 200)){
          const raw = await svcStore.get(id);
          if (!raw) continue;
          try{
            const order = JSON.parse(raw);
            if (matchOrder(order)){
              const merged = Object.assign({ id }, order);
              out.service.push(await attachSignedProofs(merged, env));
            }
          }catch(_){}
        }
      }catch(_){}
    }
    return json({ ok:true, orders: out });
  }

  if (pathname === '/api/me/wishlist') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    const store = getUserStore(env);
    if (request.method === 'POST') {
      try{
        const body = await request.json();
        const pid = String(body.productId || '').trim();
        if (!pid) return json({ ok:false, error:'missing productId' }, 400);
        const action = (body.action || 'toggle').toLowerCase();
        const list = Array.isArray(record.wishlist) ? record.wishlist.slice() : [];
        const idx = list.indexOf(pid);
        if (action === 'remove') {
          if (idx !== -1) list.splice(idx,1);
        } else if (action === 'toggle') {
          if (idx !== -1) {
            list.splice(idx,1);
          } else {
            list.unshift(pid);
          }
        } else {
          if (idx === -1) list.unshift(pid);
        }
        record.wishlist = list.slice(0, 200);
        await saveUserRecord(env, record);
        return json({ ok:true, wishlist: record.wishlist });
      }catch(_){
        return json({ ok:false, error:'invalid payload' }, 400);
      }
    }
    const wishlistIds = Array.isArray(record.wishlist) ? record.wishlist : [];
    const products = [];
    if (wishlistIds.length && env.PRODUCTS){
      for (const pid of wishlistIds.slice(0, 30)){
        const raw = await env.PRODUCTS.get(`PRODUCT:${pid}`);
        if (!raw) continue;
        try{ products.push(JSON.parse(raw)); }catch(_){}
      }
    }
    return json({ ok:true, wishlist: wishlistIds, items: products });
  }

  // 會員優惠券：儲存 / 讀取
  if (pathname === '/api/me/coupons') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (request.method === 'GET') {
      const codes = Array.isArray(record.coupons) ? record.coupons : [];
      const items = [];
      const nextCodes = [];
      let changed = false;
      const nowTs = Date.now();
      for (const code of codes){
        const rec = await readCoupon(env, code);
        if (rec){
          if (rec.expireAt){
            const exp = Date.parse(rec.expireAt);
            if (!Number.isNaN(exp) && exp <= nowTs){
              changed = true;
              continue;
            }
          }
          items.push({
            code: rec.code,
            deity: rec.deity || inferCouponDeity(rec.code),
            type: rec.type || 'DEITY',
            amount: rec.amount || 0,
            issuedAt: rec.issuedAt || null,
            startAt: rec.startAt || null,
            expireAt: rec.expireAt || null,
            issuedFrom: rec.issuedFrom || '',
            used: !!rec.used,
            usedAt: rec.usedAt || null,
            orderId: rec.orderId || ''
          });
          nextCodes.push(code);
        } else {
          changed = true;
        }
      }
      if (changed){
        record.coupons = nextCodes.slice(0, 200);
        await saveUserRecord(env, record);
      }
      return json({ ok:true, items });
    }
    if (request.method === 'POST') {
      try{
        const body = await request.json();
        const code = String(body.code||'').trim().toUpperCase();
        if (!code) return json({ ok:false, error:'missing code' }, 400);
        const list = Array.isArray(record.coupons) ? record.coupons.slice() : [];
        if (!list.includes(code)){
          list.unshift(code);
          record.coupons = list.slice(0, 200);
          await saveUserRecord(env, record);
        }
        const rec = await readCoupon(env, code);
        return json({ ok:true, coupon: rec || { code } });
      }catch(_){
        return json({ ok:false, error:'invalid payload' }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

function __headersJSON__() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
    'Cache-Control': 'no-store'
  };
}

if (pathname === '/api/order/store-select' && request.method === 'POST') {
  try {
    const body = await request.json();
    const store = String(body.store || body.storeid || body.storeId || '').trim();
    if (!store) {
      return new Response(
        JSON.stringify({ ok:false, error:'Missing store' }),
        { status:400, headers: jsonHeaders }
      );
    }
    // 目前僅回傳門市資訊；未來若要綁暫存訂單，可在此處擴充
    return new Response(
      JSON.stringify({ ok:true, store }),
      { status:200, headers: jsonHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok:false, error:String(e) }),
      { status:500, headers: jsonHeaders }
    );
  }
}

if (pathname === '/api/payment/bank' && request.method === 'POST') {

  // ==== PATCH MARKER START: BANK_PAYMENT_HANDLER (for coupon block replacement) ====
  
  
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  const bankUser = await getSessionUser(request, env);
  if (!bankUser) {
    return new Response(JSON.stringify({ ok:false, error:'請先登入後再送出訂單' }), { status:401, headers: jsonHeaders });
  }
  const bankUserRecord = await ensureUserRecord(env, bankUser);
  try {
    // Accept JSON or FormData
    let body = {};
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      body = await request.json();
      if (body && body.remark && !body.note) body.note = String(body.remark);
      if (body && body.buyer_note && !body.note) body.note = String(body.buyer_note);
    } else {
      const fd = await request.formData();
      const maxUploadBytes = Number(env.PROOF_MAX_BYTES || 8 * 1024 * 1024) || 8 * 1024 * 1024;
      const allowedProofMime = new Set([
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf'
      ]);
      const allowedProofExt = new Set(['jpg','jpeg','png','webp','gif','pdf']);
      const mimeByExt = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        pdf: 'application/pdf'
      };
      const validateUploadFile = (file) => {
        const mime = String(file.type || '').toLowerCase();
        const extFromName = safeExt(file.name || '').toLowerCase();
        let ext = (guessExt(mime) || extFromName || '').toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const mimeOk = mime ? allowedProofMime.has(mime) : false;
        const extOk = ext ? allowedProofExt.has(ext) : false;
        if (!mimeOk && !extOk) return { ok:false, error:'只支援 JPG/PNG/WebP/GIF/PDF 檔案' };
        if (mime && !mimeOk) return { ok:false, error:'檔案類型不支援' };
        if (ext && !extOk) return { ok:false, error:'檔案副檔名不支援' };
        const size = Number(file.size || 0);
        if (size && size > maxUploadBytes) {
          const limitMb = Math.round(maxUploadBytes / 1024 / 1024);
          return { ok:false, error:`檔案過大（上限 ${limitMb}MB）` };
        }
        if (!ext) ext = 'jpg';
        const contentType = mimeOk ? mime : (mimeByExt[ext] || 'application/octet-stream');
        return { ok:true, ext, contentType };
      };
      // DEBUG holder for receipt upload info
      let __dbg_proof_info = null;
      // === Save uploaded proof into R2 (preferred) ===
      let __receipt_url_from_file = "";
      try {
        const f = fd.get('proof') || fd.get('receipt') || fd.get('upload') || fd.get('file') || fd.get('screenshot');
        if (f && typeof f !== 'string' && (f.stream || f.arrayBuffer)) {
          const check = validateUploadFile(f);
          if (!check.ok) {
            return new Response(JSON.stringify({ ok:false, error: check.error }), { status:400, headers: jsonHeaders });
          }
          const day = new Date();
          const y = day.getFullYear();
          const m = String(day.getMonth()+1).padStart(2,'0');
          const d = String(day.getDate()).padStart(2,'0');
          // normalize ext & content type
          const ext = check.ext;
          const key = `receipts/${y}${m}${d}/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;

          // Prefer streaming to R2 to avoid memory spikes, fallback to arrayBuffer
          if (typeof f.stream === 'function') {
            await env.R2_BUCKET.put(key, f.stream(), {
              httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
            });
          } else {
            const buf = await f.arrayBuffer();
            const size = buf ? buf.byteLength : 0;
            if (!size) {
              return new Response(
                JSON.stringify({ ok:false, error:'Empty file uploaded，請改傳 JPG/PNG 或重新選擇檔案' }),
                { status:400, headers: jsonHeaders }
              );
            }
            await env.R2_BUCKET.put(key, buf, {
              httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
            });
          }

          const originUrl = new URL(request.url).origin;
          // 重要：仍維持 /api/proof/<key> 一致給後台使用（/api/proof 會先讀 R2）
          __receipt_url_from_file = `${originUrl}/api/proof/${encodeURIComponent(key)}`;
        }
      } catch {}

      // === Save ritual photo (for candle ritual) into R2, optional ===
      let __ritual_photo_url_from_file = "";
      try {
        const rf = fd.get('ritual_photo') || fd.get('candle_photo') || fd.get('photo');
        if (rf && typeof rf !== 'string' && (rf.stream || rf.arrayBuffer)) {
          const check = validateUploadFile(rf);
          if (!check.ok) {
            return new Response(JSON.stringify({ ok:false, error: check.error }), { status:400, headers: jsonHeaders });
          }
          const day2 = new Date();
          const y2 = day2.getFullYear();
          const m2 = String(day2.getMonth()+1).padStart(2,'0');
          const d2 = String(day2.getDate()).padStart(2,'0');
          const extb = check.ext;
          const rkey = `rituals/${y2}${m2}${d2}/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extb}`;

          if (typeof rf.stream === 'function') {
            await env.R2_BUCKET.put(rkey, rf.stream(), {
              httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
            });
          } else {
            const rbuf = await rf.arrayBuffer();
            if (!rbuf || !rbuf.byteLength) {
              // ignore empty ritual photo
            } else {
              await env.R2_BUCKET.put(rkey, rbuf, {
                httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
              });
            }
          }
          const originUrl2 = new URL(request.url).origin;
          __ritual_photo_url_from_file = `${originUrl2}/api/proof/${encodeURIComponent(rkey)}`;
        }
      } catch {}

      // Convert FormData to plain object; File -> keep filename only
      body = Object.fromEntries(
        Array.from(fd.entries()).map(([k, v]) => [k, (v && typeof v === 'object' && 'name' in v) ? v.name : String(v)])
      );
      if (__receipt_url_from_file) {
        // Always prefer the KV-served URL to avoid using a bare filename
        body.receiptUrl = __receipt_url_from_file;
        body.receipt = __receipt_url_from_file;
      }
      if (__ritual_photo_url_from_file) {
        body.ritual_photo_url = __ritual_photo_url_from_file;
      }
      // Normalize note/remark from form fields
      if (!body.note && body.remark) body.note = String(body.remark);
      if (!body.note && body.buyer_note) body.note = String(body.buyer_note);
      // DEBUG: final receiptUrl that will be saved on order
      if (body && body.receiptUrl) {
        console.log('[RECEIPT_URL]', body.receiptUrl, __dbg_proof_info);
      }
      // Parse cart JSON if provided
      if (typeof body.cart === 'string') {
        try { body.cart = JSON.parse(body.cart); } catch {}
      }
      if (typeof body.coupons === 'string') {
        try { body.coupons = JSON.parse(body.coupons); } catch {}
      }
      if (typeof body.coupon_assignment === 'string') {
        try { body.coupon_assignment = JSON.parse(body.coupon_assignment); } catch {}
      }
      // Flat fields -> buyer
      const b = body.buyer && typeof body.buyer === 'object' ? body.buyer : {};
      body.buyer = {
        name:  String(b.name  ?? body.name  ?? body.buyer_name  ?? body.bfName    ?? ''),
        email: String(b.email ?? body.email ?? body.buyer_email ?? body.bfEmail   ?? ''),
        line:  String(b.line  ?? body.line  ?? body.buyer_line  ?? ''),
        phone: String(b.phone ?? body.phone ?? body.contact ?? body.buyer_phone ?? body.bfContact ?? ''),
        store: String(b.store ?? body.store ?? body.buyer_store ?? body.storeid   ?? '')
      };
      if (!body.transferLast5 && body.last5) body.transferLast5 = String(body.last5);
    }

    const selection = await resolveOrderSelection(env, body);
    if (!selection.ok){
      const reason = selection.error || 'invalid_product';
      const msg = reason === 'product_not_found' ? '找不到商品'
        : reason === 'product_inactive' ? '商品已下架'
        : reason === 'invalid_variant' ? '商品規格無效'
        : reason === 'out_of_stock' ? '庫存不足'
        : '缺少商品資訊';
      return new Response(JSON.stringify({ ok:false, error: msg }), { status:400, headers: jsonHeaders });
    }
    const useCartOnly = selection.useCartOnly;
    const items = selection.items;
    const productId = selection.productId;
    const productName = selection.productName;
    const price = selection.price;
    const qty = selection.qty;
    const deity = selection.deity;
    const variantName = selection.variantName;

    const buyer = {
      name:  String((body?.buyer?.name)  || body?.name  || body?.buyer_name  || body?.bfName    || ''),
      email: String((body?.buyer?.email) || body?.email || body?.buyer_email || body?.bfEmail   || ''),
      line:  String((body?.buyer?.line)  || body?.line  || body?.buyer_line  || ''),
      phone: String((body?.buyer?.phone) || body?.phone || body?.contact || body?.buyer_phone || body?.bfContact || ''),
      store: String((body?.buyer?.store) || body?.store || body?.buyer_store || body?.storeid   || '')
    };
    if (bankUserRecord && bankUserRecord.defaultContact){
      if (!buyer.name) buyer.name = bankUserRecord.defaultContact.name || '';
      if (!buyer.phone) buyer.phone = bankUserRecord.defaultContact.phone || '';
      if (!buyer.email) buyer.email = bankUserRecord.defaultContact.email || '';
    }
    if (bankUser){
      if (!buyer.name) buyer.name = bankUser.name || '';
      if (!buyer.email) buyer.email = bankUser.email || '';
      buyer.uid = bankUser.id;
    }
    const transferLast5 = String(body?.transferLast5 || body?.last5 || body?.bfLast5 || '').trim();
    const receiptUrl = (() => {
      let u = String(body?.receiptUrl || body?.receipt || body?.proof || body?.proofUrl || body?.screenshot || body?.upload || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
        u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      }
      if (!isAllowedFileUrl(u, env, origin)) return '';
      if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
      return String(u);
    })();
    const noteVal = String(
      body?.note ??
      body?.remark ??
      body?.buyer?.note ??
      body?.buyer_note ??
      body?.bfNote ??
      ''
    ).trim();
    if (!receiptUrl) {
      return new Response(JSON.stringify({ ok:false, error:'缺少匯款憑證' }), { status:400, headers: jsonHeaders });
    }
    if (!/^\d{5}$/.test(transferLast5)) {
      return new Response(JSON.stringify({ ok:false, error:'請輸入匯款末五碼' }), { status:400, headers: jsonHeaders });
    }
    let amount = items.reduce((s, it) => {
      const unit = Number(it.price ?? it.unitPrice ?? 0) || 0;
      const q    = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
      return s + unit * q;
    }, 0);

    // New order id (random alphanumeric) – generated early so coupon redeem can bind to this order
    const newId = await generateOrderId(env);

    // === Coupon (optional): server-verified discount, bound to this order ===
    const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
    let couponDeity   = inferCouponDeity(couponCode, body.coupon_deity || body.deity || "");
    if (!couponDeity && items.length) {
      // 若購物車只有單一守護神，推論其代碼；多種則留空交由券服務驗證 eligible
      const set = new Set(items.map(it => String(it.deity||'').toUpperCase()).filter(Boolean));
      couponDeity = (set.size === 1) ? Array.from(set)[0] : '';
    }
    const rawCoupons = Array.isArray(body.coupons) ? body.coupons : [];
    const normalizedCoupons = rawCoupons.map(c => {
      const code = String((c && c.code) || '').trim().toUpperCase();
      const deity = inferCouponDeity(code, c && c.deity);
      return { code, deity };
    }).filter(c => c.code);
    const couponInputs = normalizedCoupons.length ? normalizedCoupons : (couponCode ? [{ code: couponCode, deity: couponDeity }] : []);
    const firstCoupon = couponInputs[0] || null;
    let couponApplied = null;

    if (couponInputs.length) {
      if (Array.isArray(items) && items.length) {
        try {
          const discInfo = await computeServerDiscount(env, items, couponInputs, newId);
          const totalDisc = Math.max(0, Number(discInfo?.total || 0));
          const shippingDisc = Math.max(0, Number(discInfo?.shippingDiscount || 0));
          if (totalDisc > 0 || shippingDisc > 0) {
            const codesToLock = Array.from(new Set(
              (discInfo.lines || []).map(l => String(l.code||'').toUpperCase()).filter(Boolean)
            ));
            if (!codesToLock.length && firstCoupon && firstCoupon.code) codesToLock.push(firstCoupon.code);
            let lockError = null;
            for (const code of codesToLock){
              const locked = await markCouponUsageOnce(env, code, newId);
              if (!locked.ok){
                lockError = locked;
                break;
              }
            }
            if (lockError){
              couponApplied = {
                code: (firstCoupon && firstCoupon.code) || '',
                deity: firstCoupon?.deity || '',
                codes: couponInputs.map(c=>c.code),
                failed: true,
                reason: lockError.reason || 'already_used'
              };
            }else{
              amount = Math.max(0, Number(amount || 0) - totalDisc);
              couponApplied = {
                code: (firstCoupon && firstCoupon.code) || '',
                deity: firstCoupon?.deity || '',
                codes: couponInputs.map(c=>c.code),
                discount: totalDisc,
                shippingDiscount: shippingDisc || undefined,
                redeemedAt: Date.now(),
                lines: Array.isArray(discInfo.lines) ? discInfo.lines : [],
                multi: couponInputs.length > 1
              };
            }
          } else {
            couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'invalid_or_not_applicable' };
          }
        } catch (e) {
          console.error('computeServerDiscount error', e);
          couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'error' };
        }
      } else if (firstCoupon && firstCoupon.code) {
        try {
          const r = await redeemCoupon(env, { code: firstCoupon.code, deity: firstCoupon.deity, orderId: newId });
          if (r && r.ok) {
            const locked = await markCouponUsageOnce(env, firstCoupon.code, newId);
            if (!locked.ok) {
              couponApplied = {
                code: firstCoupon.code,
                deity: firstCoupon.deity,
                failed: true,
                reason: locked.reason || 'already_used'
              };
            } else {
              const disc = Math.max(0, Number(r.amount || 200) || 200);
              amount = Math.max(0, Number(amount || 0) - disc);
              couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now() };
            }
          } else {
            couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: (r && r.reason) || 'invalid' };
          }
        } catch (e) {
          console.error('redeemCoupon error', e);
          couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: 'error' };
        }
      }
    }

    // Optional candle ritual metadata
    const fallbackText = `${body?.category || ''} ${productName || body?.productName || ''}`.trim();
    const shippingNeeded = needShippingFee(items, fallbackText);
    const baseShipping = resolveShippingFee(env);
    let shippingFee = shippingNeeded ? baseShipping : 0;
    const shippingDiscount = Math.max(0, Number((couponApplied && couponApplied.shippingDiscount) || 0));
    if (shippingDiscount > 0){
      shippingFee = Math.max(0, shippingFee - shippingDiscount);
    }
    amount = Math.max(0, Number(amount || 0)) + shippingFee;

    const ritualNameEn   = String(body.ritual_name_en || body.ritualNameEn || body.candle_name_en || '').trim();
    const ritualBirthday = String(body.ritual_birthday || body.ritualBirthday || body.candle_birthday || '').trim();
    const ritualPhotoUrl = (() => {
      let u = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
        u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      }
      if (!isAllowedFileUrl(u, env, origin)) return '';
      if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
      return u;
    })();
    const extra = {};
    if (ritualNameEn || ritualBirthday || ritualPhotoUrl) {
      extra.candle = {
        nameEn: ritualNameEn || undefined,
        birthday: ritualBirthday || undefined,
        photoUrl: ritualPhotoUrl || undefined
      };
    }

    // 會員折扣暫時關閉
    let memberDiscount = 0;
    let perkInfo = null;

    const now = new Date().toISOString();
    const order = {
      id: newId,
      productId, productName, price, qty,
      deity, variantName,
      items: useCartOnly && items.length ? items : undefined,
      method: '轉帳匯款',
      buyer, transferLast5, receiptUrl,
      note: noteVal,
      amount: Math.max(0, Math.round(amount || 0)),
      shippingFee: shippingFee || 0,
      shipping: shippingFee || 0,
      status: 'pending',
      createdAt: now, updatedAt: now,
      ritual_photo_url: ritualPhotoUrl || undefined,
      ritualPhotoUrl: ritualPhotoUrl || undefined,
      resultToken: makeToken(32),
      results: [],
      coupon: couponApplied || undefined,
      couponAssignment: (couponApplied && couponApplied.lines) ? couponApplied.lines : undefined,
      stockDeducted: false,
      soldCounted: false,
      // memberDiscount: 暫不使用
      ...(Object.keys(extra).length ? { extra } : {})
    };

    await env.ORDERS.put(order.id, JSON.stringify(order));
    const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
    let ids = [];
    if (idxRaw) {
      try {
        const parsed = JSON.parse(idxRaw);
        if (Array.isArray(parsed)) ids = parsed;
      } catch (e) {
        // Index is corrupted, start a new one.
      }
    }
    ids.unshift(order.id);
    trimOrderIndex(ids, env);
    await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));

    // Decrement inventory (variants 或 product-level)
    try {
      await decStockCounters(env, items, productId, (body.variantName||body.variant||''), qty);
      order.stockDeducted = true;
      await env.ORDERS.put(order.id, JSON.stringify(order));
    } catch(_){}
    try {
      await maybeSendOrderEmails(env, order, { origin, channel: 'bank' });
    } catch (err) {
      console.error('sendOrderEmails(bank) error', err);
    }

    // 會員折扣暫不啟用，因此不需標記使用狀態
    try{
      await updateUserDefaultContact(env, bankUser.id, {
        name: buyer.name || '',
        phone: buyer.phone || '',
        email: buyer.email || ''
      });
    }catch(_){}

    return new Response(JSON.stringify({ ok:true, id: order.id, order }), { status:200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }

}

if (pathname === '/api/order/confirm-transfer' && request.method === 'POST') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: __headersJSON__() });
  }
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: __headersJSON__() });
    const raw = await env.ORDERS.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: __headersJSON__() });
    const obj = JSON.parse(raw);
    obj.transferLast5 = String(body.transferLast5 || obj.transferLast5 || '');
    
    obj.receiptUrl = String(body.receipt || body.receiptUrl || body.proof || body.proofUrl || body.screenshot || body.upload || obj.receiptUrl || '');
    if (obj.receiptUrl) {
      let u = obj.receiptUrl;
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
        u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      }
      if (!isAllowedFileUrl(u, env, origin)) {
        u = '';
      } else if (!/^https?:\/\//i.test(u) && u.startsWith('/')) {
        u = `${origin}${u}`;
      }
      obj.receiptUrl = u;
    }
    // Update note/remark if provided
    {
      const notePatch = String(
        body?.note ??
        body?.remark ??
        body?.buyer?.note ??
        body?.buyer_note ??
        ''
      ).trim();
      if (notePatch) obj.note = notePatch;
    }
    // Patch amount if provided
    if (typeof body.amount !== 'undefined') {
      const a = Number(body.amount);
      if (!Number.isNaN(a)) obj.amount = a;
    }
    // Patch candle ritual metadata
    const rName = String(body.ritual_name_en || body.ritualNameEn || '').trim();
    const rBirth = String(body.ritual_birthday || body.ritualBirthday || '').trim();
    const rPhoto = (() => {
      let u = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
        u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      }
      if (!isAllowedFileUrl(u, env, origin)) return '';
      if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
      return u;
    })();
    if (rName || rBirth || rPhoto) {
      obj.extra = obj.extra || {};
      obj.extra.candle = Object.assign({}, obj.extra.candle || {}, {
        nameEn: rName || obj?.extra?.candle?.nameEn,
        birthday: rBirth || obj?.extra?.candle?.birthday,
        photoUrl: rPhoto || obj?.extra?.candle?.photoUrl
      });
    }
    if (rPhoto) {
      obj.ritual_photo_url = rPhoto;
      obj.ritualPhotoUrl = rPhoto;
    }
    obj.buyer = {
      name:  String(body?.buyer?.name  || obj?.buyer?.name  || ''),
      email: String(body?.buyer?.email || obj?.buyer?.email || ''),
      line:  String(body?.buyer?.line  || obj?.buyer?.line  || ''),
      phone: String(body?.buyer?.phone || body?.phone || body?.contact || obj?.buyer?.phone || ''),
      store: String(body?.buyer?.store || obj?.buyer?.store || ''),
      note:  String(body?.buyer?.note  || obj?.buyer?.note  || '')
    };
    obj.status = 'waiting_verify';
    obj.updatedAt = new Date().toISOString();
    await env.ORDERS.put(id, JSON.stringify(obj));
    return new Response(JSON.stringify({ ok:true, order: obj }), { status:200, headers: __headersJSON__() });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: __headersJSON__() });
  }
}
// ======== End of Bank Transfer Additions ========

// ======== ECPay Credit Card ========
if (request.method === 'OPTIONS' && (pathname === '/api/payment/ecpay/create' || pathname === '/api/payment/ecpay/notify')) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
      'Cache-Control': 'no-store'
    }
  });
}

if (pathname === '/api/payment/ecpay/create' && request.method === 'POST') {
  try {
    if (!env.ORDERS) {
      return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
    }
    const orderUser = await getSessionUser(request, env);
    if (!orderUser) {
      return new Response(JSON.stringify({ ok:false, error:'請先登入後再送出訂單' }), { status:401, headers: jsonHeaders });
    }
    if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
      return new Response(JSON.stringify({ ok:false, error:'Missing ECPay config' }), { status:500, headers: jsonHeaders });
    }
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    const body = ct.includes('application/json') ? (await request.json()) : {};

    let draft;
    try{
      draft = await buildOrderDraft(env, body, origin, { method:'信用卡/綠界', status:'待付款', reserveCoupon:true, reserveTtlSec: Number(env.CC_COUPON_HOLD_TTL_SEC || 900) || 900 });
    }catch(e){
      const reason = e && e.code ? String(e.code) : 'invalid_product';
      const msg = reason === 'product_not_found' ? '找不到商品'
        : reason === 'product_inactive' ? '商品已下架'
        : reason === 'invalid_variant' ? '商品規格無效'
        : reason === 'out_of_stock' ? '庫存不足'
        : '缺少商品資訊';
      return new Response(JSON.stringify({ ok:false, error: msg }), { status:400, headers: jsonHeaders });
    }
    const order = draft.order;
    try{
      const orderUserRecord = await ensureUserRecord(env, orderUser);
      if (orderUser){
        order.buyer = order.buyer || {};
        order.buyer.uid = orderUser.id || order.buyer.uid || '';
        if (!order.buyer.name) order.buyer.name = orderUser.name || '';
        if (!order.buyer.email) order.buyer.email = orderUser.email || '';
        if (orderUserRecord && orderUserRecord.defaultContact){
          if (!order.buyer.name) order.buyer.name = orderUserRecord.defaultContact.name || '';
          if (!order.buyer.phone) order.buyer.phone = orderUserRecord.defaultContact.phone || '';
          if (!order.buyer.email) order.buyer.email = orderUserRecord.defaultContact.email || '';
        }
      }
    }catch(_){}
    const totalAmount = Math.max(1, Math.round(order.amount || 0));

    const gateway = ecpayEndpoint(env);
    const merchantId = String(env.ECPAY_MERCHANT_ID);
    const hashKey   = String(env.ECPAY_HASH_KEY);
    const hashIV    = String(env.ECPAY_HASH_IV);

    const tradeNoBase = (order.id || '').replace(/[^A-Za-z0-9]/g,'');
    const merchantTradeNo = (env.ECPAY_PREFIX ? String(env.ECPAY_PREFIX) : 'U') + tradeNoBase;
    const tradeNo = merchantTradeNo.slice(-20);

    const now = new Date();
    const ts = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const itemsStr = (order.items && order.items.length)
      ? order.items.map(it => `${it.productName||''}x${Math.max(1, Number(it.qty||1))}`).join('#')
      : `${order.productName || '訂單'}x${Math.max(1, Number(order.qty||1))}`;

    const tokenParam = order.resultToken ? `&token=${encodeURIComponent(order.resultToken)}` : '';
    const params = {
      MerchantID: merchantId,
      MerchantTradeNo: tradeNo,
      MerchantTradeDate: ts,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: '聖物訂單',
      ItemName: itemsStr,
      ReturnURL: `${origin}/api/payment/ecpay/notify`,
      OrderResultURL: `${origin}/payment-result?orderId=${encodeURIComponent(order.id)}${tokenParam}`,
      ClientBackURL: `${origin}/payment-result?orderId=${encodeURIComponent(order.id)}${tokenParam}`,
      ChoosePayment: 'Credit',
      EncryptType: 1,
      CustomField1: order.id
    };
    params.CheckMacValue = await ecpayCheckMac(params, hashKey, hashIV);

    order.payment = {
      gateway: 'ecpay',
      tradeNo,
      amount: totalAmount,
      createdAt: new Date().toISOString(),
      status: 'INIT'
    };
    order.stockDeducted = false;
    order.soldCounted = false;

    await env.ORDERS.put(order.id, JSON.stringify(order));
    const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
    let ids = [];
    if (idxRaw) { try { const parsed = JSON.parse(idxRaw); if (Array.isArray(parsed)) ids = parsed; } catch{} }
    ids.unshift(order.id);
    trimOrderIndex(ids, env);
    await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));
    try {
      await decStockCounters(env, draft.items, order.productId, order.variantName, order.qty);
      order.stockDeducted = true;
      await env.ORDERS.put(order.id, JSON.stringify(order));
    } catch(_){}
    try {
      await maybeSendOrderEmails(env, order, { origin, channel: 'credit' });
    } catch (err) {
      console.error('sendOrderEmails(credit) error', err);
    }

    return new Response(JSON.stringify({
      ok:true,
      orderId: order.id,
      action: gateway,
      params,
      stage: String(env.ECPAY_STAGE || env.ECPAY_MODE || '').toLowerCase()
    }), { status:200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/payment/ecpay/notify' && request.method === 'POST') {
  try {
    if (!env.ORDERS) {
      return new Response('0|ORDERS_NOT_BOUND', { status:500, headers:{'Content-Type':'text/plain'} });
    }
    const hashKey   = String(env.ECPAY_HASH_KEY || '');
    const hashIV    = String(env.ECPAY_HASH_IV || '');
    if (!hashKey || !hashIV) {
      return new Response('0|CONFIG_MISSING', { status:500, headers:{'Content-Type':'text/plain'} });
    }

    const ct = (request.headers.get('content-type') || '').toLowerCase();
    let formObj = {};
    if (ct.includes('application/json')) {
      formObj = await request.json().catch(()=>({}));
    } else {
      const fd = await request.formData();
      formObj = Object.fromEntries(Array.from(fd.entries()).map(([k,v])=>[k, typeof v === 'string' ? v : String(v)]));
    }

    const receivedMac = String(formObj.CheckMacValue || formObj.checkmacvalue || '').toUpperCase();
    const macParams = { ...formObj };
    delete macParams.CheckMacValue;
    delete macParams.checkmacvalue;
    const calcMac = await ecpayCheckMac(macParams, hashKey, hashIV);
    if (!receivedMac || receivedMac !== calcMac) {
      return new Response('0|MAC_INVALID', { status:400, headers:{'Content-Type':'text/plain'} });
    }

    const rtnCode = Number(formObj.RtnCode || formObj.rtncode || 0);
    const orderId = String(formObj.CustomField1 || formObj.customfield1 || formObj.MerchantTradeNo || '').trim();
    if (!orderId) {
      return new Response('0|NO_ORDER', { status:400, headers:{'Content-Type':'text/plain'} });
    }
    const raw = await env.ORDERS.get(orderId);
    if (!raw) {
      return new Response('0|ORDER_NOT_FOUND', { status:404, headers:{'Content-Type':'text/plain'} });
    }
    const order = JSON.parse(raw);
    const paidAmount = Number(formObj.TradeAmt || formObj.TotalAmount || 0);
    const orderAmount = Number(order.amount || 0);
    if (!order.payment) order.payment = {};
    order.payment.gateway = 'ecpay';
    order.payment.tradeNo = String(formObj.TradeNo || order.payment.tradeNo || '');
    order.payment.merchantTradeNo = String(formObj.MerchantTradeNo || order.payment.merchantTradeNo || '');
    order.payment.rtnCode = rtnCode;
    order.payment.message = String(formObj.RtnMsg || formObj.rtnmsg || '');
    order.payment.paidAt = new Date().toISOString();
    order.payment.amount = paidAmount || Number(order.payment.amount || order.amount || 0);
    if (rtnCode === 1 && orderAmount && Math.round(paidAmount) !== Math.round(orderAmount)) {
      order.status = '付款金額不符';
      order.payment.status = 'AMOUNT_MISMATCH';
      if (order.coupon && !order.coupon.failed) {
        try{
          const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
            ? order.coupon.codes
            : (order.coupon.code ? [order.coupon.code] : []);
          for (const code of codes){
            if (!code) continue;
            await releaseCouponUsage(env, code, order.id);
          }
          order.coupon.locked = false;
          order.coupon.reserved = false;
        }catch(_){}
      }
      if (order.stockDeducted === true) {
        try { await restoreStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){}
        order.stockDeducted = false;
      }
      if (order.soldCounted === true) {
        try { await decSoldCounters(env, order.items, order.productId, order.qty); } catch(_){}
        order.soldCounted = false;
      }
      order.updatedAt = new Date().toISOString();
      await env.ORDERS.put(orderId, JSON.stringify(order));
      return new Response('0|AMOUNT_MISMATCH', { status:400, headers:{'Content-Type':'text/plain'} });
    }
    order.status = rtnCode === 1 ? '已付款待出貨' : '付款失敗';
    order.updatedAt = new Date().toISOString();

    if (rtnCode === 1) {
      if (order.coupon && !order.coupon.locked && !order.coupon.failed) {
        try {
          const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
            ? order.coupon.codes
            : (order.coupon.code ? [order.coupon.code] : []);
          for (const code of codes){
            if (!code) continue;
            try{
              await markCouponUsageOnce(env, code, order.id);
            }catch(_){}
          }
          order.coupon.locked = true;
          order.coupon.reserved = false;
        } catch(_){}
      }
      if (!order.stockDeducted) {
        try { await decStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){}
        order.stockDeducted = true;
      }
      if (!order.soldCounted) {
        try { await bumpSoldCounters(env, order.items, order.productId, order.qty); } catch(_){}
        order.soldCounted = true;
      }
    } else {
      if (order.coupon && !order.coupon.failed) {
        try {
          const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
            ? order.coupon.codes
            : (order.coupon.code ? [order.coupon.code] : []);
          for (const code of codes){
            if (!code) continue;
            await releaseCouponUsage(env, code, order.id);
          }
          order.coupon.locked = false;
          order.coupon.reserved = false;
        } catch(_){}
      }
      if (order.stockDeducted === true) {
        try { await restoreStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){}
        order.stockDeducted = false;
      }
      if (order.soldCounted === true) {
        try { await decSoldCounters(env, order.items, order.productId, order.qty); } catch(_){}
        order.soldCounted = false;
      }
    }

    await env.ORDERS.put(orderId, JSON.stringify(order));
    if (rtnCode === 1 && shouldNotifyStatus(order.status)) {
      try {
        await maybeSendOrderEmails(env, order, { origin, channel: order.method || '信用卡/綠界', notifyAdmin:false, emailContext:'status_update' });
      } catch (err) {
        console.error('status email (credit) error', err);
      }
    }
    return new Response('1|OK', { status:200, headers:{'Content-Type':'text/plain'} });
  } catch (e) {
    return new Response('0|ERROR', { status:500, headers:{'Content-Type':'text/plain'} });
  }
}


// 檢查優惠券是否可用（只檢查，不鎖券、不扣次數）
if (pathname === '/api/coupons/check' && request.method === 'POST') {
  try {
    const body = await request.json().catch(() => ({}));

    const codeRaw  = body.coupon || body.couponCode || body.code;
    const deityRaw = body.coupon_deity || body.deity || '';

    const code  = String(codeRaw  || '').trim().toUpperCase();
    const deity = String(deityRaw || '').trim().toUpperCase();

    if (!code) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing coupon code' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!env.COUPONS) {
      return new Response(
        JSON.stringify({ ok: false, error: 'COUPONS KV not bound' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const rec = await readCoupon(env, code);
    if (!rec){
      return new Response(JSON.stringify({ ok:false, code, reason:'not_found' }), { status:200, headers: jsonHeaders });
    }
    if (rec.used){
      return new Response(JSON.stringify({ ok:false, code, reason:'already_used', orderId: rec.orderId||'' }), { status:200, headers: jsonHeaders });
    }
    const nowTs = Date.now();
    if (rec.reservedUntil){
      const reservedUntil = Date.parse(rec.reservedUntil);
      if (!Number.isNaN(reservedUntil) && reservedUntil > nowTs){
        return new Response(JSON.stringify({ ok:false, code, reason:'reserved' }), { status:200, headers: jsonHeaders });
      }
    }
    if (rec.startAt && nowTs < Date.parse(rec.startAt)){
      return new Response(JSON.stringify({ ok:false, code, reason:'not_started', startAt: rec.startAt }), { status:200, headers: jsonHeaders });
    }
    if (rec.expireAt && nowTs > Date.parse(rec.expireAt)){
      return new Response(JSON.stringify({ ok:false, code, reason:'expired', expireAt: rec.expireAt }), { status:200, headers: jsonHeaders });
    }
    const targetDeity = String(rec.deity||'').toUpperCase();
    if (rec.type !== 'SHIP' && rec.type !== 'ALL' && targetDeity && deity && targetDeity !== deity){
      return new Response(JSON.stringify({ ok:false, code, reason:'deity_not_match', deity: targetDeity }), { status:200, headers: jsonHeaders });
    }
    const amount = Math.max(0, Number(rec.amount||200) || 200);
    return new Response(
      JSON.stringify({
        ok: true,
        valid: true,
        code,
        deity: targetDeity || deity,
        amount,
        type: rec.type || 'DEITY',
        startAt: rec.startAt || null,
        expireAt: rec.expireAt || null
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
}


// Issue coupon (new in-house system)
if (pathname === '/api/coupons/issue' && request.method === 'POST') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  if (!env.COUPONS){
    return new Response(JSON.stringify({ ok:false, error:'COUPONS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const typeRaw = String(body.type||'').trim().toUpperCase();
    const deityRaw  = String(body.deity || body.code || '').trim().toUpperCase();
    const deity = typeRaw === 'ALL' ? 'ALL' : (typeRaw === 'SHIP' ? 'SHIP' : deityRaw);
    const ctype = (typeRaw === 'ALL' || typeRaw === 'SHIP') ? typeRaw : 'DEITY';
    const amount = Number(body.amount || 200) || 200;
    const startDt = body.startAt ? new Date(body.startAt) : null;
    const expireDt = body.expireAt ? new Date(body.expireAt) : null;
    if (!deity) {
      return new Response(JSON.stringify({ ok:false, error:'Missing deity' }), { status:400, headers: jsonHeaders });
    }
    let code = '';
    for (let i=0;i<5;i++){
      const cand = makeCouponCode(deity);
      const exists = await env.COUPONS.get(couponKey(cand));
      if (!exists){ code = cand; break; }
    }
    if (!code) code = makeCouponCode(deity);
    const now = new Date().toISOString();
    const rec = {
      code,
      deity,
      type: ctype,
      amount,
      issuedAt: now,
      startAt: startDt && !isNaN(startDt.getTime()) ? startDt.toISOString() : undefined,
      expireAt: expireDt && !isNaN(expireDt.getTime()) ? expireDt.toISOString() : undefined,
      used: false
    };
    await saveCoupon(env, rec);
    return new Response(JSON.stringify({
      ok:true,
      code,
      deity,
      type: ctype,
      amount,
      startAt: rec.startAt || null,
      expireAt: rec.expireAt || null
    }), { status:200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

// Public issuance for quiz flow (no admin key, but deity/amount limited)
if (pathname === '/api/coupons/issue-quiz' && request.method === 'POST') {
  if (!env.COUPONS){
    return new Response(JSON.stringify({ ok:false, error:'COUPONS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  try{
    const body = await request.json().catch(()=>({}));
    const record = await getSessionUserRecord(request, env);
    if (!record){
      return new Response(JSON.stringify({ ok:false, error:'login_required' }), { status:401, headers: jsonHeaders });
    }
    const todayKey = taipeiDateKey();
    const lastTs = Date.parse(record.quizCouponIssuedAt || record.quizCoupon?.ts || '');
    if (!Number.isNaN(lastTs)){
      const lastKey = taipeiDateKey(lastTs);
      if (lastKey === todayKey){
        return new Response(JSON.stringify({ ok:false, error:'daily_limit', dateKey: todayKey }), { status:429, headers: jsonHeaders });
      }
    }
    const ip = getClientIp(request) || 'unknown';
    const rateLimit = Math.max(1, Number(env.QUIZ_COUPON_RATE_LIMIT || 10) || 10);
    const windowSec = Math.max(30, Number(env.QUIZ_COUPON_WINDOW_SEC || 300) || 300);
    const rlKey = `rl:quiz_coupon:${record.id || ip}`;
    const ok = await checkRateLimit(env, rlKey, rateLimit, windowSec);
    if (!ok){
      return new Response(JSON.stringify({ ok:false, error:'Too many requests' }), { status:429, headers: jsonHeaders });
    }
    const secret = String(env.QUIZ_COUPON_SECRET || env.QUIZ_COUPON_KEY || '').trim();
    if (secret){
      const headerKey = (request.headers.get('x-quiz-key') || request.headers.get('X-Quiz-Key') || '').trim();
      const queryKey = (url.searchParams.get('key') || '').trim();
      const bodyKey = String(body.key || body.secret || body.quizKey || body.token || '').trim();
      if (headerKey !== secret && queryKey !== secret && bodyKey !== secret){
        return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
      }
    }
    const deityRaw = String(body.deity || body.code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(deityRaw)){
      return new Response(JSON.stringify({ ok:false, error:'Missing or invalid deity' }), { status:400, headers: jsonHeaders });
    }
    const amount = Math.min(500, Math.max(1, Number(body.amount || 200) || 200)); // 上限 500，避免濫用
    let code = '';
    for (let i=0;i<5;i++){
      const cand = makeCouponCode(deityRaw);
      const exists = await env.COUPONS.get(couponKey(cand));
      if (!exists){ code = cand; break; }
    }
    if (!code) code = makeCouponCode(deityRaw);
    const now = new Date().toISOString();
    const rec = {
      code,
      deity: deityRaw,
      type: 'DEITY',
      amount,
      issuedAt: now,
      issuedFrom: 'quiz',
      used: false
    };
    await saveCoupon(env, rec);
    try{
      if (body && body.quiz){
        const quiz = normalizeQuizInput(body.quiz);
        if (quiz) record.quiz = quiz;
      }
      record.quizCouponIssuedAt = now;
      record.quizCouponIssuedKey = todayKey;
      record.quizCouponIssuedCode = code;
      record.quizCouponIssuedDeity = deityRaw;
      await saveUserRecord(env, record);
    }catch(_){}
    return new Response(JSON.stringify({ ok:true, code, deity: deityRaw, amount }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

// List coupons (admin)
if (pathname === '/api/coupons/list' && request.method === 'GET') {
  if (!(await isAdmin(request, env))){
    return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
  }
  if (!env.COUPONS){
    return new Response(JSON.stringify({ ok:false, error:'COUPONS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  try{
    const q = (url.searchParams.get('q') || '').trim().toUpperCase();
    const usedParam = url.searchParams.get('used');
    const limit = Math.min(Number(url.searchParams.get('limit')||200), 500);
    let items = [];
    if (env.COUPONS.list){
      const iter = await env.COUPONS.list({ prefix:'COUPON:' });
      const keys = Array.isArray(iter.keys) ? iter.keys : [];
      for (const k of keys){
        const name = k && k.name;
        if (!name) continue;
        const raw = await env.COUPONS.get(name);
        if (!raw) continue;
        try{
          const obj = JSON.parse(raw);
          if (obj && obj.code){
            items.push(obj);
          }
        }catch(_){}
      }
    }
    // sort by issuedAt desc
    items.sort((a,b)=> new Date(b.issuedAt||0) - new Date(a.issuedAt||0));
    let out = items;
    if (q){
      out = out.filter(c=> String(c.code||'').toUpperCase().includes(q) || String(c.deity||'').toUpperCase().includes(q));
    }
    if (usedParam === 'true'){
      out = out.filter(c=> !!c.used);
    }else if (usedParam === 'false'){
      out = out.filter(c=> !c.used);
    }
    out = out.slice(0, limit);
    return new Response(JSON.stringify({ ok:true, items: out }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

// 批次發放：全館券/免運券
if (pathname === '/api/coupons/issue-batch' && request.method === 'POST') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  if (!env.COUPONS){
    return new Response(JSON.stringify({ ok:false, error:'COUPONS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  const store = getUserStore(env);
  if (!store || !store.list){
    return new Response(JSON.stringify({ ok:false, error:'USER_STORE list not supported' }), { status:500, headers: jsonHeaders });
  }
  try{
    const body = await request.json().catch(()=>({}));
    const type = String(body.type||'').trim().toUpperCase(); // ALL | SHIP
    const amount = Number(body.amount||0) || 0;
    const startDt = body.startAt ? new Date(body.startAt) : null;
    const expireDt = body.expireAt ? new Date(body.expireAt) : null;
    const startAt = startDt && !isNaN(startDt.getTime()) ? startDt.toISOString() : undefined;
    const expireAt = expireDt && !isNaN(expireDt.getTime()) ? expireDt.toISOString() : undefined;
    const target = String(body.target||'all').toLowerCase(); // all | buyers
    if (!(type === 'ALL' || type === 'SHIP')){
      return new Response(JSON.stringify({ ok:false, error:'type must be ALL or SHIP' }), { status:400, headers: jsonHeaders });
    }
    if (amount <=0){
      return new Response(JSON.stringify({ ok:false, error:'amount must be > 0' }), { status:400, headers: jsonHeaders });
    }
    // 收集目標 user ids
    const userIds = [];
    const iter = await store.list({ prefix:'USER:' });
    (iter.keys||[]).forEach(k=>{ if (k && k.name) userIds.push(k.name.replace(/^USER:/,'')); });
    if (target === 'buyers'){
      try{
        const ordIdxRaw = await (env.ORDERS && env.ORDERS.get ? env.ORDERS.get(ORDER_INDEX_KEY) : null);
        if (ordIdxRaw){ const ids = JSON.parse(ordIdxRaw)||[]; for (const oid of ids.slice(0,500)){ const raw=await env.ORDERS.get(oid); if(!raw) continue; try{ const o=JSON.parse(raw); if (o?.buyer?.uid) userIds.push(o.buyer.uid); }catch(_){}} }
      }catch(_){}
      try{
        const svcIdxRaw = await (env.SERVICE_ORDERS && env.SERVICE_ORDERS.get ? env.SERVICE_ORDERS.get('SERVICE_ORDER_INDEX') : null);
        if (svcIdxRaw){ const ids=JSON.parse(svcIdxRaw)||[]; for (const oid of ids.slice(0,500)){ const raw=await env.SERVICE_ORDERS.get(oid); if(!raw) continue; try{ const o=JSON.parse(raw); if (o?.buyer?.uid) userIds.push(o.buyer.uid); }catch(_){}} }
      }catch(_){}
    }
    const uniqIds = Array.from(new Set(userIds.filter(Boolean)));
    let issued = 0;
    for (const uid of uniqIds){
      const rec = await loadUserRecord(env, uid);
      if (!rec) continue;
      let code = '';
      for (let i=0;i<5;i++){
        const cand = makeCouponCode(type);
        const exists = await env.COUPONS.get(couponKey(cand));
        if (!exists){ code = cand; break; }
      }
      if (!code) code = makeCouponCode(type);
      const now = new Date().toISOString();
      const couponRec = {
        code,
        deity: type,
        type,
        amount,
        issuedAt: now,
        startAt,
        expireAt,
        used:false
      };
      await saveCoupon(env, couponRec);
      const list = Array.isArray(rec.coupons) ? rec.coupons.slice() : [];
      list.unshift(code);
      rec.coupons = list.slice(0, 200);
      await saveUserRecord(env, rec);
      issued++;
    }
    return new Response(JSON.stringify({ ok:true, issued, total: uniqIds.length }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

// ======== Coupon one-time usage lock (per code) ========
async function markCouponUsageOnce(env, code, orderId) {
  const c = (code || "").toUpperCase().trim();
  if (!c) return { ok: false, reason: "missing_code" };
  if (!env.ORDERS) return { ok: false, reason: "ORDERS_not_bound" };

  const key = `COUPON_USED:${c}`;
  const holdKey = `COUPON_HOLD:${c}`;
  try {
    const existing = await env.ORDERS.get(key);
    if (existing) {
      let parsed = null;
      try { parsed = JSON.parse(existing); } catch {}
      return { ok: false, reason: "already_used", existing: parsed || null };
    }
    const payload = { code: c, orderId: String(orderId || ""), ts: new Date().toISOString() };
    await env.ORDERS.put(key, JSON.stringify(payload));
    try{
      if (env.COUPONS){
        const rec = await readCoupon(env, c);
        if (rec){
          rec.used = true;
          rec.usedAt = payload.ts;
          rec.orderId = payload.orderId;
          if (rec.reservedBy && rec.reservedBy === payload.orderId) {
            delete rec.reservedBy;
            delete rec.reservedAt;
            delete rec.reservedUntil;
          }
          await saveCoupon(env, rec);
        }
      }
    }catch(_){}
    try{
      await env.ORDERS.delete(holdKey);
    }catch(_){}
    return { ok: true };
  } catch (e) {
    console.error("markCouponUsageOnce error", e);
    return { ok: false, reason: "error" };
  }
}

async function reserveCouponUsage(env, code, orderId, ttlSec=900) {
  const c = (code || "").toUpperCase().trim();
  if (!c) return { ok:false, reason:'missing_code' };
  if (!env.ORDERS) return { ok:false, reason:'ORDERS_not_bound' };
  const usedKey = `COUPON_USED:${c}`;
  const holdKey = `COUPON_HOLD:${c}`;
  try{
    const used = await env.ORDERS.get(usedKey);
    if (used) return { ok:false, reason:'already_used' };
    const existing = await env.ORDERS.get(holdKey);
    if (existing){
      let parsed = null;
      try{ parsed = JSON.parse(existing); }catch(_){}
      if (parsed && parsed.orderId && String(parsed.orderId) === String(orderId)) {
        return { ok:true, reserved:true };
      }
      return { ok:false, reason:'reserved', existing: parsed || null };
    }
    const ttl = Math.max(60, Number(ttlSec || 0) || 900);
    const expTs = Date.now() + ttl * 1000;
    const payload = { code: c, orderId: String(orderId||''), ts: new Date().toISOString(), exp: expTs };
    await env.ORDERS.put(holdKey, JSON.stringify(payload), { expirationTtl: ttl });
    try{
      if (env.COUPONS){
        const rec = await readCoupon(env, c);
        if (rec && !rec.used){
          rec.reservedBy = payload.orderId;
          rec.reservedAt = payload.ts;
          rec.reservedUntil = new Date(expTs).toISOString();
          await saveCoupon(env, rec);
        }
      }
    }catch(_){}
    return { ok:true, reserved:true, exp: expTs };
  }catch(e){
    console.error('reserveCouponUsage error', e);
    return { ok:false, reason:'error' };
  }
}

async function releaseCouponUsage(env, code, orderId) {
  const c = (code || "").toUpperCase().trim();
  if (!c || !env.ORDERS) return { ok:false, reason:'missing_code' };
  const usedKey = `COUPON_USED:${c}`;
  const holdKey = `COUPON_HOLD:${c}`;
  try{
    const used = await env.ORDERS.get(usedKey);
    if (used){
      let parsed = null;
      try{ parsed = JSON.parse(used); }catch(_){}
      if (parsed && parsed.orderId && String(parsed.orderId) === String(orderId)){
        await env.ORDERS.delete(usedKey);
        if (env.COUPONS){
          try{
            const rec = await readCoupon(env, c);
            if (rec && String(rec.orderId||'') === String(orderId)){
              rec.used = false;
              delete rec.usedAt;
              delete rec.orderId;
              await saveCoupon(env, rec);
            }
          }catch(_){}
        }
      }
    }
    const hold = await env.ORDERS.get(holdKey);
    if (hold){
      let parsed = null;
      try{ parsed = JSON.parse(hold); }catch(_){}
      if (!parsed || !parsed.orderId || String(parsed.orderId) === String(orderId)){
        await env.ORDERS.delete(holdKey);
      }
    }
    if (env.COUPONS){
      try{
        const rec = await readCoupon(env, c);
        if (rec && (!rec.used || String(rec.orderId||'') === String(orderId))){
          if (!rec.reservedBy || String(rec.reservedBy||'') === String(orderId)){
            delete rec.reservedBy;
            delete rec.reservedAt;
            delete rec.reservedUntil;
            await saveCoupon(env, rec);
          }
        }
      }catch(_){}
    }
    return { ok:true };
  }catch(e){
    console.error('releaseCouponUsage error', e);
    return { ok:false, reason:'error' };
  }
}

// ======== Coupon/Discount helpers (NEW: one coupon per item, allow multiple same deity) ========
/**
 * 計算優惠券折扣（新版：每個商品一張券，允許同神祇多商品分開用券）
 * @param {*} env
 * @param {Array} items 商品陣列
 * @param {Array} couponInputs [{ code, deity }]
 * @param {string} orderId
 * @returns {Promise<{total: number, lines: Array<{code, amount, productId}>}>}
 */
async function computeServerDiscount(env, items, couponInputs, orderId) {
  const FIXED = 200;
  const usedIdx = new Set();
  const results = [];
  let total = 0;
  let shippingDiscount = 0;

  for (const c of (couponInputs || [])) {
    const code = (c.code || '').toUpperCase();
    const deity = inferCouponDeity(code, c.deity);
    if (!code) continue;

    try {
      const r = await redeemCoupon(env, { code, deity, orderId });
      if (!r.ok) continue;

      const type = String(r.type || '').toUpperCase();
      if (type === 'SHIP') {
        shippingDiscount += Math.max(0, Number(r.amount || FIXED) || FIXED);
        results.push({
          code,
          amount: 0,
          productId: null,
          type: 'SHIP'
        });
        continue;
      }

      // 找出第一個還沒用過的商品
      const targetIdx = items.findIndex((it, i) => !usedIdx.has(i));
      if (targetIdx === -1) continue;
      const target = items[targetIdx];

      const discountAmount = Math.min(Number(r.amount || FIXED), Number(target.price || 0));
      total += discountAmount;
      usedIdx.add(targetIdx);

      results.push({
        code,
        amount: discountAmount,
        productId: target.productId || target.id || null
      });
    } catch (e) {
      console.error('discount error', e);
      continue;
    }
  }

  return { total, lines: results, shippingDiscount };
}

// 共用：將前端傳入的訂單資料標準化，計算金額與優惠
async function buildOrderDraft(env, body, origin, opts = {}) {
  const selection = await resolveOrderSelection(env, body);
  if (!selection.ok){
    const err = new Error(selection.error || 'invalid_product');
    err.code = selection.error || 'invalid_product';
    throw err;
  }
  const useCartOnly = selection.useCartOnly;
  const items = selection.items;
  const productId = selection.productId;
  const productName = selection.productName;
  const price = selection.price;
  const qty = selection.qty;
  const deity = selection.deity;
  const variantName = selection.variantName;

  const buyer = {
    name:  String((body?.buyer?.name)  || body?.name  || body?.buyer_name  || body?.bfName    || ''),
    email: String((body?.buyer?.email) || body?.email || body?.buyer_email || body?.bfEmail   || ''),
    line:  String((body?.buyer?.line)  || body?.line  || body?.buyer_line  || ''),
    phone: String((body?.buyer?.phone) || body?.phone || body?.contact || body?.buyer_phone || body?.bfContact || ''),
    store: String((body?.buyer?.store) || body?.store || body?.buyer_store || body?.storeid   || '')
  };

  const noteVal = String(
    body?.note ??
    body?.remark ??
    body?.buyer?.note ??
    body?.buyer_note ??
    body?.bfNote ??
    ''
  ).trim();

  let amount = items.reduce((s, it) => {
    const unit = Number(it.price ?? it.unitPrice ?? 0) || 0;
    const q    = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
    return s + unit * q;
  }, 0);

  const newId = await generateOrderId(env);

  const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
  let couponDeity   = inferCouponDeity(couponCode, body.coupon_deity || body.deity || "");
  if (!couponDeity && items.length) {
    const set = new Set(items.map(it => String(it.deity||'').toUpperCase()).filter(Boolean));
    couponDeity = (set.size === 1) ? Array.from(set)[0] : '';
  }
  const rawCoupons = Array.isArray(body.coupons) ? body.coupons : [];
  const normalizedCoupons = rawCoupons.map(c => {
    const code = String((c && c.code) || '').trim().toUpperCase();
    const deity = inferCouponDeity(code, c && c.deity);
    return { code, deity };
  }).filter(c => c.code);
  const couponInputs = normalizedCoupons.length ? normalizedCoupons : (couponCode ? [{ code: couponCode, deity: couponDeity }] : []);
  const firstCoupon = couponInputs[0] || null;
  let couponApplied = null;

  if (couponInputs.length) {
    if (Array.isArray(items) && items.length) {
      try {
        const discInfo = await computeServerDiscount(env, items, couponInputs, newId);
        const totalDisc = Math.max(0, Number(discInfo?.total || 0));
        const shippingDisc = Math.max(0, Number(discInfo?.shippingDiscount || 0));
        if (totalDisc > 0 || shippingDisc > 0) {
          let lockError = null;
          if (opts.lockCoupon) {
            const codesToLock = Array.from(new Set(
              (discInfo.lines || []).map(l => String(l.code||'').toUpperCase()).filter(Boolean)
            ));
            if (!codesToLock.length && firstCoupon && firstCoupon.code) codesToLock.push(firstCoupon.code);
            for (const code of codesToLock){
              const locked = await markCouponUsageOnce(env, code, newId);
              if (!locked.ok){
                lockError = locked;
                break;
              }
            }
          }
          let reserveError = null;
          if (!lockError && opts.reserveCoupon) {
            const ttl = Number(opts.reserveTtlSec || env.COUPON_HOLD_TTL_SEC || 900) || 900;
            const codesToReserve = Array.from(new Set(
              (discInfo.lines || []).map(l => String(l.code||'').toUpperCase()).filter(Boolean)
            ));
            if (!codesToReserve.length && firstCoupon && firstCoupon.code) codesToReserve.push(firstCoupon.code);
            for (const code of codesToReserve){
              const reserved = await reserveCouponUsage(env, code, newId, ttl);
              if (!reserved.ok){
                reserveError = reserved;
                break;
              }
            }
          }
          if (lockError || reserveError) {
            couponApplied = {
              code: (firstCoupon && firstCoupon.code) || '',
              deity: firstCoupon?.deity || '',
              codes: couponInputs.map(c=>c.code),
              failed: true,
              reason: (lockError && (lockError.reason || 'already_used')) || (reserveError && (reserveError.reason || 'reserved')) || 'invalid'
            };
          } else {
            amount = Math.max(0, Number(amount || 0) - totalDisc);
            couponApplied = {
              code: (firstCoupon && firstCoupon.code) || '',
              deity: firstCoupon?.deity || '',
              codes: couponInputs.map(c=>c.code),
              discount: totalDisc,
              shippingDiscount: shippingDisc || undefined,
              redeemedAt: Date.now(),
              lines: Array.isArray(discInfo.lines) ? discInfo.lines : [],
              multi: couponInputs.length > 1,
              locked: !!opts.lockCoupon,
              reserved: !!opts.reserveCoupon
            };
          }
        } else {
          couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'invalid_or_not_applicable' };
        }
      } catch (e) {
        console.error('computeServerDiscount error', e);
        couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'error' };
      }
    } else if (firstCoupon && firstCoupon.code) {
      try {
        const r = await redeemCoupon(env, { code: firstCoupon.code, deity: firstCoupon.deity, orderId: newId });
        if (r && r.ok) {
          let locked = { ok:true };
          if (opts.lockCoupon) locked = await markCouponUsageOnce(env, firstCoupon.code, newId);
          let reserved = { ok:true };
          if (!locked.ok) {
            couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: locked.reason || 'already_used' };
          } else {
            if (opts.reserveCoupon) {
              const ttl = Number(opts.reserveTtlSec || env.COUPON_HOLD_TTL_SEC || 900) || 900;
              reserved = await reserveCouponUsage(env, firstCoupon.code, newId, ttl);
            }
            if (!reserved.ok) {
              couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: reserved.reason || 'reserved' };
            } else {
              const disc = Math.max(0, Number(r.amount || 200) || 200);
              amount = Math.max(0, Number(amount || 0) - disc);
              couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now(), locked: !!opts.lockCoupon, reserved: !!opts.reserveCoupon };
            }
          }
        } else {
          couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: (r && r.reason) || 'invalid' };
        }
      } catch (e) {
        console.error('redeemCoupon error', e);
        couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: 'error' };
      }
    }
  }

  const fallbackText = `${body?.category || ''} ${productName || body?.productName || ''}`.trim();
  const shippingNeeded = needShippingFee(items, fallbackText);
  const baseShipping = resolveShippingFee(env);
  let shippingFee = shippingNeeded ? baseShipping : 0;
  const shippingDiscountApplied = Math.max(
    0,
    Number((couponApplied && couponApplied.shippingDiscount) || 0)
  );
  if (shippingDiscountApplied > 0){
    shippingFee = Math.max(0, Number(shippingFee || baseShipping) - shippingDiscountApplied);
  }
  amount = Math.max(0, Number(amount || 0)) + shippingFee;

  const ritualNameEn   = String(body.ritual_name_en || body.ritualNameEn || body.candle_name_en || '').trim();
  const ritualBirthday = String(body.ritual_birthday || body.ritualBirthday || body.candle_birthday || '').trim();
  const ritualPhotoUrl = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
  const extra = {};
  if (ritualNameEn || ritualBirthday || ritualPhotoUrl) {
    extra.candle = {
      nameEn: ritualNameEn || undefined,
      birthday: ritualBirthday || undefined,
      photoUrl: ritualPhotoUrl || undefined
    };
  }

  const now = new Date().toISOString();
  const order = {
    id: newId,
    productId, productName, price, qty,
    deity, variantName,
    items: useCartOnly && items.length ? items : undefined,
    method: opts.method || '信用卡/綠界',
    buyer,
    note: noteVal,
    amount: Math.max(0, Math.round(amount)),
    shippingFee: shippingFee || 0,
    shipping: shippingFee || 0,
    status: opts.status || '待付款',
    createdAt: now, updatedAt: now,
    ritual_photo_url: ritualPhotoUrl || undefined,
    ritualPhotoUrl: ritualPhotoUrl || undefined,
    resultToken: makeToken(32),
    results: [],
    coupon: couponApplied || undefined,
    couponAssignment: (couponApplied && couponApplied.lines) ? couponApplied.lines : undefined,
    ...(Object.keys(extra).length ? { extra } : {})
  };

  // 最後保險：若已算出折扣但尚未鎖券，這裡再鎖一次，避免同券重複使用
  if (couponApplied && couponApplied.discount > 0 && !couponApplied.locked && !couponApplied.reserved) {
    try{
      const codesToLock = Array.from(new Set(
        (couponApplied.codes && couponApplied.codes.length ? couponApplied.codes : [couponApplied.code])
          .map(c=> String(c||'').toUpperCase())
          .filter(Boolean)
      ));
      for (const c of codesToLock){
        await markCouponUsageOnce(env, c, newId);
      }
      couponApplied.locked = true;
    }catch(_){}
  }

  return { order, items, couponApplied, couponCode, couponDeity, useCartOnly };
}

async function maybeSendOrderEmails(env, order, ctx = {}) {
  try {
    if (!order || !env) return;
    const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
    const fromDefault = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
    const hasTransport = apiKey && fromDefault;
    if (!hasTransport) {
      console.log('[mail] skip sending — missing config', { hasApiKey: !!apiKey, fromDefault });
      return;
    }
    const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
    const origin = (ctx.origin || '').replace(/\/$/, '');
    const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://shop.unalomecodes.com').replace(/\/$/, '');
    const serviceLookupBase = env.SERVICE_LOOKUP_URL
      ? env.SERVICE_LOOKUP_URL.replace(/\/$/, '')
      : `${primarySite}/service.html`;
    const defaultLookupBase = (env.ORDER_LOOKUP_URL || primarySite).replace(/\/$/, '');
    const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || String(order?.method||'').includes('服務');
    const lookupUrl = order.id
      ? isServiceOrder && serviceLookupBase
        ? `${serviceLookupBase}#lookup=${encodeURIComponent(order.id)}`
        : `${defaultLookupBase}/shop#lookup=${encodeURIComponent(order.id)}`
      : '';
    const channel = ctx.channel || order.method || '';
    const customerEmail = (
      order?.buyer?.email ||
      order?.email ||
      order?.contactEmail ||
      order?.buyer_email ||
      order?.recipientEmail ||
      ''
    ).trim();
    const adminRaw = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
    const channelLabel = channel ? channel : (order.method || '訂單');
    const emailContext = ctx.emailContext || 'order_created';
    const notifyCustomer = ctx.notifyCustomer === false ? false : !!customerEmail;
    const notifyAdmin = ctx.notifyAdmin === false ? false : adminRaw.length > 0;
    const statusLabel = (order.status || '').trim();
    const isBlessingDone = statusLabel === '祈福完成';
    const customerSubject = emailContext === 'status_update'
      ? `${siteName} 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
      : `${siteName} 訂單確認 #${order.id}`;
    const adminSubject = emailContext === 'status_update'
      ? `[${siteName}] 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
      : `[${siteName}] 新訂單通知 #${order.id}`;
    const defaultImageHost = env.EMAIL_IMAGE_HOST || env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://shop.unalomecodes.com';
    const imageHost = ctx.imageHost || defaultImageHost || origin;
    const composeOpts = { siteName, lookupUrl, channelLabel, imageHost, context: emailContext, blessingDone: isBlessingDone };
    const { html: customerHtml, text: customerText } = composeOrderEmail(order, Object.assign({ admin:false }, composeOpts));
    const { html: adminHtml, text: adminText } = composeOrderEmail(order, Object.assign({ admin:true }, composeOpts));
    const tasks = [];
    if (notifyCustomer && customerEmail) {
      tasks.push(sendEmailMessage(env, {
        from: fromDefault,
        to: [customerEmail],
        subject: customerSubject,
        html: customerHtml,
        text: customerText
      }));
    }
    if (notifyAdmin && adminRaw.length) {
      tasks.push(sendEmailMessage(env, {
        from: fromDefault,
        to: adminRaw,
        subject: adminSubject,
        html: adminHtml,
        text: adminText
      }));
    }
    if (!tasks.length) {
      console.log('[mail] skip sending — no recipients resolved');
      return;
    }
    const settled = await Promise.allSettled(tasks);
    settled.forEach((res, idx)=>{
      if (res.status === 'rejected'){
        console.error('[mail] send failed', idx, res.reason);
      }
    });
  } catch (err) {
    console.error('sendOrderEmails error', err);
  }
}

function composeOrderEmail(order, opts = {}) {
  const esc = escapeHtmlEmail;
  const fmt = formatCurrencyTWD;
  const brand = opts.siteName || 'Unalomecodes';
  const buyerName = (order?.buyer?.name || '').trim() || '貴賓';
  const phone = (order?.buyer?.phone || order?.buyer?.contact || order?.contact || '').trim();
  const email = (order?.buyer?.email || '').trim();
  const store = (order?.buyer?.store || order?.store || '').trim();
  const status = order.status || '處理中';
  const note = (order.note || '').trim();
  const methodRaw = opts.channelLabel || order.method || '訂單';
  const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || /服務/.test(String(order?.method||''));
  const method = (isServiceOrder && (!order.paymentMethod || /服務/.test(methodRaw))) ? '轉帳匯款' : methodRaw;
  const context = opts.context || 'order_created';
  const items = buildOrderItems(order);
  const shippingFee = Number(order.shippingFee ?? order.shipping ?? 0) || 0;
  const discountAmount = Math.max(0, Number(order?.coupon?.discount || 0));
  let subtotal = 0;
  if (items.length) {
    subtotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  } else if (order.price) {
    subtotal = Number(order.price || 0) * Math.max(1, Number(order.qty || 1) || 1);
  }
  if (!subtotal) subtotal = Math.max(0, Number(order.amount || 0) - shippingFee + discountAmount);
  const totalAmount = Math.max(0, Number(order.amount || 0));
  const supportEmail = 'bkkaiwei@gmail.com';
  const lineLabel = '@427oaemj';
  const lineInstruction = 'LINE ID：@427oaemj（請於官方 LINE 搜尋加入）';
  const couponLabelHtml = order?.coupon?.code ? `（${esc(order.coupon.code)}）` : '';
  const couponLabelText = order?.coupon?.code ? `（${order.coupon.code}）` : '';
  const plainMode = !!opts.plain;
  const itemsHtml = plainMode
    ? items.map(it => `• ${esc(it.name)}${it.spec ? `（${esc(it.spec)}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('<br>') || '<p>本次訂單明細將由客服另行確認。</p>'
    : items.length
      ? items.map((it, idx) => {
          const imgUrl = rewriteEmailImageUrl(it.image, opts.imageHost);
          const img = imgUrl
            ? `<img src="${esc(imgUrl)}" alt="${esc(it.name)}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;margin-right:16px;">`
            : `<div style="width:64px;height:64px;border-radius:12px;background:#e2e8f0;margin-right:16px;"></div>`;
          const dividerStyle = idx === items.length - 1 ? '' : 'border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;';
          return `<div style="display:flex;align-items:center;${dividerStyle}">
            ${img}
            <div style="flex:1;">
              <div style="font-weight:600;color:#0f172a;">${esc(it.name)}</div>
              ${it.spec ? `<div style="color:#475569;font-size:14px;margin:4px 0;">${esc(it.spec)}</div>` : ''}
              <div style="color:#0f172a;font-size:14px;">數量：${it.qty}</div>
            </div>
            <div style="font-weight:600;color:#0f172a;">${fmt(it.total)}</div>
          </div>`;
        }).join('')
      : '<p style="margin:0;color:#475569;">本次訂單明細將由客服另行確認。</p>';
  const itemsText = items.length
    ? items.map(it => `• ${it.name}${it.spec ? `（${it.spec}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('\n')
    : '（本次訂單明細將由客服另行確認）';
  const shippingNote = shippingFee ? `（含運費${fmt(shippingFee).replace('NT$ ', '')}）` : '';
  const baseInfoHtml = plainMode
    ? `<p>訂單編號：${esc(order.id || '')}<br>訂單狀態：${esc(status)}<br>付款方式：${esc(method)}<br>應付金額：${fmt(order.amount || 0)}${shippingNote}</p>`
    : [
        `<p><strong>訂單編號：</strong>${esc(order.id || '')}</p>`,
        `<p><strong>訂單狀態：</strong>${esc(status)}</p>`,
        `<p><strong>付款方式：</strong>${esc(method)}</p>`,
        `<p><strong>應付金額：</strong>${fmt(order.amount || 0)}${shippingNote}</p>`
      ].filter(Boolean).join('');
  const lookupHtml = opts.lookupUrl
    ? plainMode
      ? `<p>查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）</p>`
      : `<div style="margin-top:16px;padding:12px;border-radius:8px;background:#eef2ff;color:#312e81;font-size:13px;">
          查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）
        </div>`
    : '';
  let customerIntro = (context === 'status_update')
    ? `<p>親愛的 ${esc(buyerName)} 您好：</p>
      <p>您的訂單狀態已更新為 <strong>${esc(status)}</strong>。請勿直接回覆此信，如需協助可寫信至 ${esc(supportEmail)} 或加入官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`
    : `<p>親愛的 ${esc(buyerName)} 您好：</p>
      <p>我們已收到您的訂單，將在核對匯款資料無誤後，儘速安排出貨。請勿直接回覆此信，如需協助可寫信至 ${esc(supportEmail)} 或加入官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`;
  const isBlessingDone = opts.blessingDone || (order.status === '祈福完成');
  if (context === 'status_update' && isBlessingDone){
    const lookupLine = opts.lookupUrl
      ? `請至 <a href="${esc(opts.lookupUrl)}" target="_blank" rel="noopener">查詢祈福進度</a> 輸入手機號碼，並搭配訂單編號末五碼（英數）或匯款帳號末五碼，即可查看祈福完成的照片。`
      : '請至查詢祈福進度輸入手機號碼，並搭配訂單編號末五碼（英數）或匯款帳號末五碼，即可查看祈福完成的照片。';
    customerIntro += `<p>${lookupLine}</p>`;
  }
  const adminIntro = `<p>${esc(opts.siteName || '商城')} 有一筆新的訂單建立。</p>`;
  const contactRows = [
    buyerName ? `<p style="margin:0 0 8px;"><strong>收件人：</strong>${esc(buyerName)}</p>` : '',
    phone ? `<p style="margin:0 0 8px;"><strong>聯絡電話：</strong>${esc(phone)}</p>` : '',
    email ? `<p style="margin:0 0 8px;"><strong>Email：</strong>${esc(email)}</p>` : '',
    store ? `<p style="margin:0 0 8px;"><strong>7-11 門市：</strong>${esc(store)}</p>` : '',
    note ? `<p style="margin:0;"><strong>備註：</strong>${esc(note)}</p>` : ''
  ].filter(Boolean);
  const contactHtml = contactRows.length
    ? `<div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-size:14px;">${contactRows.join('')}</div>`
    : '';
  const amountHtml = plainMode
    ? `<p>商品金額：${fmt(subtotal)}${discountAmount ? `<br>優惠折抵：-${fmt(discountAmount)}` : ''}${shippingFee ? `<br>運費：${fmt(shippingFee)}` : ''}<br>合計應付：${fmt(totalAmount)}</p>`
    : `
      <div style="margin-top:24px;padding:20px;border-radius:12px;background:#0f172a;color:#f8fafc;">
        <h3 style="margin:0 0 12px;font-size:18px;">付款明細</h3>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>商品金額</span><span>${fmt(subtotal)}</span></div>
        ${discountAmount ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#fbbf24;"><span>優惠折抵</span><span>- ${fmt(discountAmount)}</span></div>` : ''}
        ${shippingFee ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>運費</span><span>${fmt(shippingFee)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px;margin-top:12px;"><span>合計應付</span><span>${fmt(totalAmount)}</span></div>
      </div>
    `;
  const customerFooter = opts.admin ? '' : plainMode
    ? `<p>本信件為系統自動發送，請勿直接回覆。客服信箱：${esc(supportEmail)}；官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`
    : `
      <div style="margin-top:24px;padding:16px;border-radius:12px;background:#f1f5f9;color:#475569;font-size:13px;line-height:1.6;">
        本信件為系統自動發送，請勿直接回覆。<br>
        客服信箱：${esc(supportEmail)}<br>
        官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）
      </div>
    `;
  const html = plainMode
    ? `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px;">
        <p style="font-weight:700;font-size:18px;">${esc(brand)}</p>
        ${opts.admin ? adminIntro : customerIntro}
        ${baseInfoHtml}
        ${amountHtml}
        <p>商品明細：</p>
        <p>${itemsHtml}</p>
        ${contactHtml ? `<p>聯絡資訊：<br>${contactHtml}</p>` : ''}
        ${lookupHtml}
        ${opts.admin ? '' : '<p>感謝您的支持，祝福一切順心圓滿！</p>'}
        ${customerFooter}
      </div>
    `
    : `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px 10px;background:#f5f7fb;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
          <p style="margin:0 0 12px;font-weight:700;font-size:18px;">${esc(brand)}</p>
          ${opts.admin ? adminIntro : customerIntro}
          <h3 style="font-size:16px;margin:18px 0 8px;">基本資訊</h3>
          ${baseInfoHtml}
          ${amountHtml}
          <h3 style="font-size:16px;margin:24px 0 10px;">商品明細</h3>
          ${itemsHtml}
          ${contactHtml ? `<h3 style="font-size:16px;margin:20px 0 10px;">聯絡資訊</h3>${contactHtml}` : ''}
          ${lookupHtml}
          ${opts.admin ? '' : '<p style="margin:18px 0 0;">感謝您的支持，祝福一切順心圓滿！</p>'}
          ${customerFooter}
        </div>
      </div>
    `;
  const textParts = [];
  if (opts.admin) {
    textParts.push(`${opts.siteName || '商城'} 有一筆新訂單：`);
  } else if (context === 'status_update') {
    textParts.push(`親愛的 ${buyerName} 您好：您的訂單狀態已更新為「${status}」。請勿直接回覆此信，可透過 ${supportEmail} 或 LINE ID：${lineLabel} 聯繫。`);
    if (isBlessingDone){
      const lookupText = opts.lookupUrl
        ? `請至 ${opts.lookupUrl} 查詢祈福進度，輸入手機號碼並搭配訂單編號末五碼（英數）或匯款帳號末五碼，即可查看祈福完成的照片。`
        : '請至查詢祈福進度輸入手機號碼並搭配訂單編號末五碼（英數）或匯款帳號末五碼，即可查看祈福完成的照片。';
      textParts.push(lookupText);
    }
  } else {
    textParts.push(`親愛的 ${buyerName} 您好：我們已收到您的訂單，將在核對匯款資料無誤後，儘速安排出貨。請勿直接回覆此信，如需協助可寫信至 ${supportEmail} 或加入官方 LINE ID：${lineLabel}。`);
  }
  textParts.push(`訂單編號：${order.id}`);
  textParts.push(`訂單狀態：${status}`);
  textParts.push(`付款方式：${method}`);
  textParts.push(`商品金額：${fmt(subtotal)}`);
  if (discountAmount) textParts.push(`優惠折抵：-${fmt(discountAmount)}`);
  if (shippingFee) textParts.push(`運費：${fmt(shippingFee)}`);
  textParts.push(`合計應付：${fmt(totalAmount)}${shippingNote}`);
  textParts.push('商品明細：');
  textParts.push(itemsText);
  if (phone) textParts.push(`聯絡電話：${phone}`);
  if (email) textParts.push(`Email：${email}`);
  if (store) textParts.push(`7-11 門市：${store}`);
  if (note) textParts.push(`備註：${note}`);
  if (opts.lookupUrl) textParts.push(`查詢訂單：${opts.lookupUrl}`);
  if (!opts.admin) textParts.push('感謝您的訂購！');
  return { html, text: textParts.join('\n') };
}

function rewriteEmailImageUrl(url, host) {
  if (!url || !host) return url;
  try {
    const base = host.startsWith('http') ? host : `https://${host.replace(/\/+$/, '')}`;
    const hostUrl = new URL(base);
    const imgUrl = new URL(url, base);
    imgUrl.protocol = hostUrl.protocol;
    imgUrl.hostname = hostUrl.hostname;
    imgUrl.port = hostUrl.port;
    return imgUrl.toString();
  } catch (_) {
    try {
      const base = host.startsWith('http') ? host : `https://${host}`;
      return new URL(url, base).toString();
    } catch {
      return url;
    }
  }
}

function buildOrderItems(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.map(it => ({
      name: String(it.productName || it.name || it.title || '商品'),
      spec: String(it.variantName || it.spec || it.deity || '').trim(),
      qty: Math.max(1, Number(it.qty || it.quantity || 1) || 1),
      total: Number(it.total || (Number(it.price || it.unitPrice || 0) * Math.max(1, Number(it.qty || it.quantity || 1) || 1)) || 0),
      image: String(it.image || it.picture || it.img || '')
    }));
  }
  if (order.productName) {
    const qty = Math.max(1, Number(order.qty || 1) || 1);
    const unit = Number(order.price || (order.amount || 0) / qty || 0);
    return [{
      name: String(order.productName),
      spec: String(order.variantName || '').trim(),
      qty,
      total: unit * qty,
      image: String(order.productImage || order.image || order.cover || '')
    }];
  }
  return [];
}

async function sendEmailMessage(env, message) {
  const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
  const fromEnv = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
  const from = (message.from || fromEnv).trim();
  const toList = Array.isArray(message.to) ? message.to.filter(Boolean) : [message.to].filter(Boolean);
  if (!apiKey || !from || !toList.length) {
    console.log('[mail] transport unavailable', { hasApiKey: !!apiKey, from, toCount: toList.length });
    return { ok:false, skipped:'missing_config' };
  }
  const endpoint = (env.RESEND_ENDPOINT || 'https://api.resend.com/emails').trim() || 'https://api.resend.com/emails';
  const defaultReplyTo = 'bkkaiwei@gmail.com';
  const replyTo = message.replyTo || defaultReplyTo;
  const payload = {
    from,
    to: toList,
    subject: message.subject || 'Order Notification',
    html: message.html || undefined,
    text: message.text || undefined
  };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text().catch(()=> '');
    throw new Error(`Email API ${res.status}: ${errText || res.statusText}`);
  }
  let data = {};
  try { data = await res.json(); } catch(_){}
  return data;
}

function shouldNotifyStatus(status) {
  const txt = String(status || '').trim();
  if (!txt) return false;
  if (txt === '待處理' || txt === '處理中') return false;
  if (/祈福進行中/.test(txt)) return true;
  if (/祈福完成/.test(txt)) return true;
  if (/成果已通知/.test(txt)) return true;
  if (/已付款/.test(txt) && /出貨|寄件|寄貨|出貨/.test(txt)) return true;
  if (/已寄件/.test(txt) || /已寄出/.test(txt) || /寄出/.test(txt)) return true;
  if (/已出貨/.test(txt)) return true;
  return txt === '已付款待出貨'
    || txt === '已寄件'
    || txt === '已寄出';
}

function escapeHtmlEmail(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str || '').replace(/[&<>"']/g, function(m){
    return map[m] || m;
  });
}

function formatCurrencyTWD(num) {
  try {
    return 'NT$ ' + Number(num || 0).toLocaleString('zh-TW');
  } catch (_) {
    return 'NT$ ' + (num || 0);
  }
}

/* ========== CSV helpers ========== */
function csvEscape(v) {
  const s = (v === undefined || v === null) ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function orderAmount(o){
  if (typeof o?.amount === 'number' && !Number.isNaN(o.amount)) return o.amount;
  if (Array.isArray(o?.items) && o.items.length){
    return o.items.reduce((s,it)=> s + (Number(it.price||0) * Math.max(1, Number(it.qty||1))), 0);
  }
  return Number(o?.price||0) * Math.max(1, Number(o?.qty||1));
}
function orderItemsSummary(o){
  if (Array.isArray(o?.items) && o.items.length){
    return o.items.map(it => {
      const vn = it.variantName ? `（${it.variantName}）` : '';
      return `${it.productName||""}${vn}×${Math.max(1, Number(it.qty||1))}`;
    }).join(" / ");
  }
  const name = o?.productName || "";
  const vn = o?.variantName ? `（${o.variantName}）` : '';
  const q = Math.max(1, Number(o?.qty||1));
  return `${name}${vn}×${q}`;
}
function normalizeReceiptUrl(o, origin, env){
  let u = o?.receiptUrl || o?.receipt || "";
  if (!u) return "";
  if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
    u = `${origin}/api/proof/${encodeURIComponent(u)}`;
  }
  if (!isAllowedFileUrl(u, env, origin)) return "";
  if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
  return u;
}
// --- 訂單 API：/api/order /api/order/status ---
// CORS/預檢
if (request.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
      'Cache-Control': 'no-store'
    }
  });
}

// 7-11 門市 callback：將選取的門市資訊回傳給 opener 視窗（shop.html）
if (pathname === '/cvs_callback' && request.method === 'POST') {
  const form = await request.formData();
  const pick = (src, ...keys) => {
    for (const k of keys) {
      const v = src.get(k);
      if (v) return String(v);
    }
    return '';
  };

  const storeId   = pick(form, 'storeid','StoreId','stCode','code','store');
  const storeName = pick(form, 'storename','StoreName','stName','name');
  const address   = pick(form, 'storeaddress','StoreAddress','address','Addr');
  const tel       = pick(form, 'storetel','StoreTel','tel','TEL');

  const data = {
    __cvs_store__: true,
    storename: storeName || '',
    storeid: storeId || '',
    storeaddress: address || '',
    storetel: tel || ''
  };
  const dataJson = JSON.stringify(data);

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>7-11 門市選擇完成</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px;text-align:center;color:#111827;background:#f9fafb}
    p{margin:0 0 12px;font-size:14px;color:#374151}
    small{font-size:12px;color:#9ca3af}
  </style>
</head>
<body>
  <p>已成功選擇門市，您可以關閉此視窗並回到原頁面。</p>
  <small>如果視窗沒有自動關閉，請手動關閉此頁面。</small>
  <script>
    (function(){
      try{
        var data = ${dataJson};
        var targetOrigin = ${JSON.stringify(origin)};
        if (window.opener && !window.opener.closed){
          window.opener.postMessage(data, targetOrigin);
        }
      }catch(e){}
      try{ window.close(); }catch(e){}
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

if (pathname === '/cvs_callback' && request.method === 'GET') {
  const params = url.searchParams;
  const pick = (src, ...keys) => {
    for (const k of keys) {
      const v = src.get(k);
      if (v) return String(v);
    }
    return '';
  };

  const storeId   = pick(params, 'storeid','StoreId','stCode','code','store');
  const storeName = pick(params, 'storename','StoreName','stName','name');
  const address   = pick(params, 'storeaddress','StoreAddress','address','Addr');
  const tel       = pick(params, 'storetel','StoreTel','tel','TEL');

  const data = {
    __cvs_store__: true,
    storename: storeName || '',
    storeid: storeId || '',
    storeaddress: address || '',
    storetel: tel || ''
  };
  const dataJson = JSON.stringify(data);

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>7-11 門市選擇完成</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px;text-align:center;color:#111827;background:#f9fafb}
    p{margin:0 0 12px;font-size:14px;color:#374151}
    small{font-size:12px;color:#9ca3af}
  </style>
</head>
<body>
  <p>已成功選擇門市，您可以關閉此視窗並回到原頁面。</p>
  <small>如果視窗沒有自動關閉，請手動關閉此頁面。</small>
  <script>
    (function(){
      try{
        var data = ${dataJson};
        var targetOrigin = ${JSON.stringify(origin)};
        if (window.opener && !window.opener.closed){
          window.opener.postMessage(data, targetOrigin);
        }
      }catch(e){}
      try{ window.close(); }catch(e){}
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

// Back-compat alias: GET /api/orders and /api/orders/lookup -> { ok:true, orders:[...] }
if ((pathname === '/api/orders' || pathname === '/api/orders/lookup') && request.method === 'GET') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeadersFor(request, env) });
  }
  const orderHeaders = jsonHeadersFor(request, env);
  const admin = await isAdmin(request, env);
  if (!admin){
    const ip = getClientIp(request) || 'unknown';
    const ok = await checkRateLimit(env, `rl:orders:${ip}`, 30, 300);
    if (!ok){
      return new Response(JSON.stringify({ ok:false, error:'Too many requests' }), { status:429, headers: orderHeaders });
    }
  }
  const qPhoneRaw = getAny(url.searchParams, ['phone','mobile','contact','tel','qPhone','qP']);
  const qLast5Raw = getAny(url.searchParams, ['last5','last','l5','code','transferLast5','bankLast5','qLast5']);
  const qOrdRaw  = getAny(url.searchParams, ['order','orderId','order_id','oid','qOrder']);
  const qPhone = normalizePhone(qPhoneRaw);
  const qLast5 = (String(qLast5Raw).replace(/\D/g, '') || '').slice(-5);
  const qOrdInput = String(qOrdRaw || '').trim();
  const qOrd   = normalizeOrderSuffix(qOrdRaw, 5);
  const qOrdValid = qOrd.length === 5;
  if (qOrdInput && !qOrdValid) {
    return new Response(JSON.stringify({ ok:false, error:'訂單編號末五碼需為 5 位英數' }), { status:400, headers: orderHeaders });
  }
  const hasOrderLookup = !!(qOrdValid && qPhone);
  const hasBankLookup = !!(qPhone && qLast5);
  const hasLookup = hasOrderLookup || hasBankLookup;
  const hasAnyLookup = !!(qPhone || qLast5 || qOrdInput);
  const needFilter = hasLookup;
  const isPartialLookup = !hasLookup && hasAnyLookup;

  if (isPartialLookup) {
    return new Response(JSON.stringify({ ok:true, orders: [] }), { status:200, headers: orderHeaders });
  }
  if (!admin && !hasLookup) {
    return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status:401, headers: orderHeaders });
  }
  try {
    const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const out = [];
    for (const oid of ids.slice(0, limit)) {
      const raw = await env.ORDERS.get(oid);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        // Multi-candidate tolerant filtering
        const phoneCandidates = [
          obj?.buyer?.phone, obj?.buyer?.contact, obj?.phone, obj?.contact, obj?.recipientPhone
        ].filter(Boolean);
        const last5Candidates = [
          obj?.transferLast5, obj?.last5, obj?.payment?.last5, obj?.bank?.last5
        ].filter(Boolean);
        if (needFilter) {
          if (qOrd){
            if (!String(oid||'').toUpperCase().endsWith(qOrd)) continue;
            if (qPhone){
              const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
              if (!pOK) continue;
            }
          }else{
            const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
            const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
            if (!pOK || !lOK) continue;
          }
        }
        const rec = normalizeReceiptUrl(obj, origin, env);
        const ritualUrl =
          obj.ritualPhotoUrl ||
          obj.ritual_photo_url ||
          (obj?.extra?.candle?.photoUrl || "");
        const merged = Object.assign({ id: oid }, obj, {
          receiptUrl: rec || "",
          proofUrl: rec || "",
          ritualPhotoUrl: ritualUrl || "",
          ritualPhoto: ritualUrl || ""
        });
        if (admin){
          out.push(merged);
        } else {
          const pub = redactOrderForPublic(merged);
          out.push(await attachSignedProofs(pub, env));
        }
      } catch {}
    }
    // Fallback: rebuild from KV if INDEX empty (scan ORDERS KV)
    if (!ids.length && env.ORDERS?.list) {
      try {
        const l = await env.ORDERS.list(); // list ALL keys
        const allKeys = Array.isArray(l.keys) ? l.keys.map(k => k.name) : [];
        // Keep only known order-id patterns, exclude INDEX / ORDER_SEQ_*
        const orderIdRe = new RegExp(`^${ORDER_ID_PREFIX}[A-Z0-9]{${ORDER_ID_LEN}}$`);
        const discovered = allKeys.filter(name => /^\d{13}$/.test(name) || orderIdRe.test(String(name||'').toUpperCase()));
        const fallbackItems = [];

        // Build response (collect then sort by createdAt if possible)
        for (const oid of discovered) {
          const raw2 = await env.ORDERS.get(oid);
          if (!raw2) continue;
          try {
            const obj2 = JSON.parse(raw2);
            const phoneCandidates = [
              obj2?.buyer?.phone, obj2?.buyer?.contact, obj2?.phone, obj2?.contact, obj2?.recipientPhone
            ].filter(Boolean);
            const last5Candidates = [
              obj2?.transferLast5, obj2?.last5, obj2?.payment?.last5, obj2?.bank?.last5
            ].filter(Boolean);

            if (needFilter) {
              if (qOrd){
                if (!String(oid||'').toUpperCase().endsWith(qOrd)) continue;
                if (qPhone) {
                  const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
                  if (!pOK) continue;
                }
              }else{
                if (qPhone) {
                  const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
                  if (!pOK) continue;
                }
                if (qLast5) {
                  const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
                  if (!lOK) continue;
                }
              }
            }
            const rec2 = normalizeReceiptUrl(obj2, origin, env);
            const ritualUrl2 =
              obj2.ritualPhotoUrl ||
              obj2.ritual_photo_url ||
              (obj2?.extra?.candle?.photoUrl || "");
            const merged2 = Object.assign({ id: oid }, obj2, {
              receiptUrl: rec2 || "",
              proofUrl: rec2 || "",
              ritualPhotoUrl: ritualUrl2 || "",
              ritualPhoto: ritualUrl2 || ""
            });
            const finalItem = admin ? merged2 : await attachSignedProofs(redactOrderForPublic(merged2), env);
            fallbackItems.push({ id: oid, createdAt: obj2.createdAt || '', item: finalItem });
          } catch {}
        }
        fallbackItems.sort((a,b)=> {
          const ta = Date.parse(a.createdAt || '') || 0;
          const tb = Date.parse(b.createdAt || '') || 0;
          return tb - ta;
        });
        fallbackItems.slice(0, limit).forEach(it => out.push(it.item));

        // Rebuild INDEX for future fast loads
        if (!idxRaw && fallbackItems.length) {
          const rebuilt = trimOrderIndex(fallbackItems.map(it => it.id), env);
          await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(rebuilt));
        }
      } catch {}
    }
    return new Response(JSON.stringify({ ok:true, orders: out }), { status:200, headers: orderHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: orderHeaders });
  }
}
/* --- Export selected orders to CSV: GET /api/orders/export --- */
if (pathname === '/api/orders/export' && request.method === 'GET') {
  if (!env.ORDERS) {
    return new Response('ORDERS KV not bound', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': resolveCorsOrigin(request, env) } });
  }
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
  }
  try {
    const origin = new URL(request.url).origin;
    const idsParam = (url.searchParams.get('ids') || '').trim();
    const qPhoneRaw = getAny(url.searchParams, ['phone','mobile','contact','tel','qPhone','qP']);
    const qLast5Raw = getAny(url.searchParams, ['last5','last','l5','code','transferLast5','bankLast5','qLast5']);
    const qPhone = normalizePhone(qPhoneRaw);
    const qLast5 = (String(qLast5Raw).replace(/\D/g, '') || '').slice(-5);
    const needFilter = !!(qPhone || qLast5);

    // gather candidates
    let candidates = [];
    if (idsParam) {
      const list = idsParam.split(',').map(s => s.trim()).filter(Boolean);
      for (const oid of list){
        const raw = await env.ORDERS.get(oid);
        if (!raw) continue;
        try { const obj = JSON.parse(raw); candidates.push({ id: oid, ...obj }); } catch {}
      }
    } else {
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      for (const oid of ids){
        const raw = await env.ORDERS.get(oid);
        if (!raw) continue;
        try {
          const obj = JSON.parse(raw);
          const phoneCandidates = [
            obj?.buyer?.phone, obj?.buyer?.contact, obj?.phone, obj?.contact, obj?.recipientPhone
          ].filter(Boolean);
          const last5Candidates = [
            obj?.transferLast5, obj?.last5, obj?.payment?.last5, obj?.bank?.last5
          ].filter(Boolean);

          if (needFilter) {
            let ok = true;
            if (qPhone) ok = phoneCandidates.some(p => matchPhone(p, qPhone));
            if (ok && qLast5) ok = last5Candidates.some(l => matchLast5(l, qLast5));
            if (!ok) continue;
          }
          candidates.push({ id: oid, ...obj });
        } catch {}
      }
    }

    // build CSV
    const header = [
      '訂單編號','建立時間','狀態',
      '商品摘要','總金額','轉帳末五碼',
      '買家姓名','買家電話','買家Email','取件門市',
      '備註','優惠券代碼','優惠折扣','憑證網址'
    ].map(csvEscape).join(',');
    const lines = [header];

    for (const o of candidates){
      const amt = orderAmount(o);
      const items = orderItemsSummary(o);
      const rec = normalizeReceiptUrl(o, origin, env);
      const line = [
        o.id || '',
        o.createdAt || '',
        o.status || '',
        items,
        amt,
        o.transferLast5 || '',
        o?.buyer?.name || '',
        o?.buyer?.phone || '',
        o?.buyer?.email || '',
        o?.buyer?.store || '',
        o?.note || '',
        o?.coupon?.code || '',
        (!o?.coupon || o?.coupon?.failed) ? '' : (o?.coupon?.discount ?? o?.coupon?.amount ?? ''),
        rec
      ].map(csvEscape).join(',');
      lines.push(line);
    }

    const csv = lines.join('\n');
    const h = new Headers();
    h.set('Content-Type', 'text/csv; charset=utf-8');
    h.set('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`);
    h.set('Cache-Control', 'no-store');
    h.set('Access-Control-Allow-Origin', resolveCorsOrigin(request, env));
    return new Response(csv, { status: 200, headers: h });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': resolveCorsOrigin(request, env) } });
  }
}
    /* --- Public: get ritual results with token
       GET /api/orders/:id/results?token=xxxx
    --- */
    {
      const m = pathname.match(/^\/api\/orders\/([^/]+)\/results$/);
      if (m && request.method === "GET"){
        if (!env.ORDERS) {
          return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
        }
        const id = decodeURIComponent(m[1]);
        const token = String(url.searchParams.get("token") || "");
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
        const order = JSON.parse(raw);
        if (!token || token !== order.resultToken){
          return new Response(JSON.stringify({ ok:false, error:'Forbidden' }), { status:403, headers: jsonHeaders });
        }
        const signed = await attachSignedProofs(order, env);
        return new Response(JSON.stringify({ ok:true, results: Array.isArray(signed.results)? signed.results: [] }), { status:200, headers: jsonHeaders });
      }
    }

    /* --- Public: simple gallery page
       GET /o/:id?token=xxxx
    --- */
    {
      const m = pathname.match(/^\/o\/([^/]+)$/);
      if (m && request.method === "GET"){
        if (!env.ORDERS) {
          return new Response("ORDERS KV not bound", { status:500, headers: { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" } });
        }
        const id = decodeURIComponent(m[1]);
        const token = String(url.searchParams.get("token") || "");
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response("Not found", { status:404, headers: { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" } });
        const order = JSON.parse(raw);
        if (!token || token !== order.resultToken){
          return new Response("Forbidden", { status:403, headers: { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" } });
        }
        const signed = await attachSignedProofs(order, env);
        const resultsAll = Array.isArray(signed.results) ? signed.results : [];
        const results = resultsAll.filter(r => {
          const t = (r && r.type || '').toString().toLowerCase();
          const u = (r && r.url  || '').toString();
          if (t === 'video') return false;
          if (/\.(mp4|mov|m4v|avi|webm)(\?|#|$)/i.test(u)) return false;
          return true;
        });
        const esc = (s)=> String(s||"").replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
        function renderLineBanner(){
          return `
  <div id="resultLineBanner" style="padding:14px 16px 12px;margin:12px auto;max-width:860px">
    <a href="https://line.me/R/ti/p/@427oaemj" target="_blank" rel="noopener"
       class="line-support-btn"
       style="display:block;text-align:center;font-weight:700;color:#fff;background:linear-gradient(90deg,#00B900 0%, #00a600 100%);padding:10px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.04);text-decoration:none;transition:transform .2s ease, box-shadow .2s ease, filter .2s ease;">
      💬 官方LINE客服
    </a>
    <div style="margin-top:10px;color:#9ca3af;font-size:14px;line-height:1.7">
      若要觀看完整祈福影片片段，請加入上方 <b>官方 LINE</b>，並提供 <b>訂單編號</b> 或 <b>手機號碼</b>，我會將影片傳給您。
    </div>
  </div>`;
        }
        const itemsHTML = results.map(r => {
          const cap = r.caption ? `<div class="cap">${esc(r.caption)}</div>` : "";
          if (r.type === "video"){
            return `<div class="card"><video controls playsinline preload="metadata" src="${esc(r.url)}"></video>${cap}</div>`;
          }
          return `<div class="card"><img loading="lazy" src="${esc(r.url)}" />${cap}</div>`;
        }).join("");
        const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>祈福成果 | ${esc(id)}</title>
<style>
:root{--bg:#0b1022;--fg:#e5e7eb;--muted:#9ca3af;--card:#121735;--acc:#06C755}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui}
.wrap{max-width:920px;margin:0 auto;padding:16px}
.hd{display:flex;align-items:baseline;gap:12px;margin:8px 0 16px}
.hd h1{font-size:18px;margin:0}
.hd .sub{font-size:12px;color:var(--muted)}
.grid{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:680px){.grid{grid-template-columns:1fr 1fr}}
.card{background:var(--card);border-radius:12px;padding:8px;overflow:hidden;border:1px solid rgba(255,255,255,.04)}
.card img,.card video{width:100%;height:auto;border-radius:8px;display:block;background:#000}
.cap{font-size:12px;color:var(--muted);padding:6px 2px}
.btn{display:inline-block;background:linear-gradient(90deg,#00B900,#00A600);color:#fff;padding:8px 12px;border-radius:10px;text-decoration:none;font-weight:700}
.line-support-btn:hover{ transform:translateY(-2px); box-shadow:0 6px 14px rgba(0,185,0,.28); filter:saturate(1.05); }
.line-support-btn:active{ transform:translateY(0); box-shadow:0 2px 6px rgba(0,185,0,.25); filter:saturate(1); }
.line-support-btn:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,185,0,.15), 0 6px 14px rgba(0,185,0,.28); }
</style></head>
<body>
${renderLineBanner()}
<div class="wrap">
  <div class="hd">
    <h1>祈福成果</h1>
    <span class="sub">訂單編號：${esc(id)}</span>
  </div>
  ${results.length ? `<div class="grid">${itemsHTML}</div>` : `<p class="sub">尚未上傳祈福成果，請稍後再試。</p>`}
</div>
</body></html>`;
        return new Response(html, { status:200, headers: { "Content-Type":"text/html; charset=utf-8", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" } });
      }
    }

    /* --- Admin: append ritual results to an order
       POST /api/orders/:id/results
       Headers: X-Admin-Key: <env.ADMIN_KEY>
       Body: { items: [{type:"image"|"video", url:"https://...", caption?: "...", ts?: number}], replace?: false }
    --- */
    {
      const m = pathname.match(/^\/api\/orders\/([^/]+)\/results$/);
      if (m && request.method === "POST"){
        if (!env.ORDERS) {
          return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
        }
        {
          const guard = await requireAdminWrite(request, env);
          if (guard) return guard;
        }
        try{
          const id = decodeURIComponent(m[1]);
          const raw = await env.ORDERS.get(id);
          if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
          const order = JSON.parse(raw);
          const body = await request.json();
          const items = Array.isArray(body.items) ? body.items : [];
          const norm = items.map(it => ({
            type: (it.type === "video" ? "video" : "image"),
            url: String(it.url || ""),
            caption: typeof it.caption === "string" ? it.caption : "",
            ts: Number(it.ts || Date.now())
          })).filter(it => it.url);
          if (!order.resultToken) order.resultToken = makeToken(32);
          if (body.replace === true){
            order.results = norm;
          }else{
            order.results = Array.isArray(order.results) ? order.results.concat(norm) : norm;
          }
          order.updatedAt = new Date().toISOString();
          await env.ORDERS.put(id, JSON.stringify(order));
          return new Response(JSON.stringify({ ok:true, results: order.results || [], token: order.resultToken }), { status:200, headers: jsonHeaders });
        }catch(e){
          return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
        }
      }
    }

    /* --- Admin (alias): append ritual results without conflicting routes
       POST /api/order.results/:id
    --- */
    {
      const m = pathname.match(/^\/api\/order\.results\/([^/]+)$/);
      if (m && request.method === "POST"){
        if (!env.ORDERS) {
          return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
        }
        {
          const guard = await requireAdminWrite(request, env);
          if (guard) return guard;
        }
        try{
          const id = decodeURIComponent(m[1]);
          const raw = await env.ORDERS.get(id);
          if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
          const order = JSON.parse(raw);
          const body = await request.json();
          const items = Array.isArray(body.items) ? body.items : [];
          const norm = items.map(it => ({
            type: (it.type === "video" ? "video" : "image"),
            url: String(it.url || ""),
            caption: typeof it.caption === "string" ? it.caption : "",
            ts: Number(it.ts || Date.now())
          })).filter(it => it.url);
          if (!order.resultToken) order.resultToken = makeToken(32);
          if (body.replace === true){
            order.results = norm;
          }else{
            order.results = Array.isArray(order.results) ? order.results.concat(norm) : norm;
          }
          order.updatedAt = new Date().toISOString();
          await env.ORDERS.put(id, JSON.stringify(order));
          return new Response(JSON.stringify({ ok:true, results: order.results || [], token: order.resultToken }), { status:200, headers: jsonHeaders });
        }catch(e){
          return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
        }
      }
    }

    /* --- Admin: simple ritual result uploader (single endpoint)
       POST /api/ritual_result
       Headers: X-Admin-Key: <env.ADMIN_KEY>
       Body (Content-Type: application/json OR text/plain OR form-data):
         {
           orderId: "2025103000001",
           // either raw fields or items[]
           photoUrl?: "https://...", // treated as image
           videoUrl?: "https://...", // treated as video
           caption?:  "...",
           items?: [{ type:"image"|"video", url:"https://...", caption?:"...", ts?: number }],
           replace?: false
         }
    --- */
    if (pathname === "/api/ritual_result" && request.method === "POST") {
      if (!env.ORDERS) {
        return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
      }
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      try {
        const ct = (request.headers.get('content-type') || '').toLowerCase();
        let payload = {};
        if (ct.includes('application/json') || ct.includes('text/plain')) {
          const raw = await request.text();
          try { payload = JSON.parse(raw||'{}'); } catch { payload = {}; }
        } else if (ct.includes('form')) {
          const fd = await request.formData();
          payload = Object.fromEntries(Array.from(fd.entries()).map(([k,v])=>[k, typeof v==='string'? v : (v?.name||'')]));
          if (payload.items && typeof payload.items === 'string') {
            try { payload.items = JSON.parse(payload.items); } catch {}
          }
        }

        const orderId = String(payload.orderId || payload.id || '').trim();
        if (!orderId) return new Response(JSON.stringify({ ok:false, error:'Missing orderId' }), { status:400, headers: jsonHeaders });
        const raw = await env.ORDERS.get(orderId);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
        const order = JSON.parse(raw);

        // Normalize to items[]
        let items = Array.isArray(payload.items) ? payload.items : [];
        const cap = typeof payload.caption === 'string' ? payload.caption : '';
        const stamp = Date.now();
        const add = [];
        const toAbs = (u)=>{
          const s = String(u||'').trim();
          if (!s) return '';
          if (/^https?:\/\//i.test(s)) return s;
          if (s.startsWith('/')) return s;
          // treat as proof key
          return `${url.origin}/api/proof/${encodeURIComponent(s)}`;
        };
        if (payload.photoUrl) add.push({ type:'image', url: toAbs(payload.photoUrl), caption: cap, ts: stamp });
        if (payload.videoUrl) add.push({ type:'video', url: toAbs(payload.videoUrl), caption: cap, ts: stamp });
        items = add.length ? add : items;
        items = (items||[]).map(it=>({
          type: (it.type === 'video' ? 'video' : 'image'),
          url:  String(it.url||'').trim(),
          caption: typeof it.caption==='string'? it.caption : '',
          ts: Number(it.ts || Date.now())
        })).filter(it=>it.url);

        if (!items.length) {
          return new Response(JSON.stringify({ ok:false, error:'No items to append' }), { status:400, headers: jsonHeaders });
        }

        if (!order.resultToken) order.resultToken = makeToken(32);
        if (payload.replace === true) {
          order.results = items;
        } else {
          order.results = Array.isArray(order.results) ? order.results.concat(items) : items;
        }
        // 若有第一張 image，順便同步一份到 ritualPhotoUrl 以利後台縮圖
        const firstImg = order.results.find(x=>x.type==='image');
        if (firstImg && firstImg.url) {
          order.ritual_photo_url = firstImg.url;
          order.ritualPhotoUrl = firstImg.url;
        }
        order.updatedAt = new Date().toISOString();
        await env.ORDERS.put(orderId, JSON.stringify(order));
        return new Response(JSON.stringify({ ok:true, id: orderId, token: order.resultToken, results: order.results||[] }), { status:200, headers: jsonHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
      }
    }

    // === 支援 /api/proof?key=... ===
    if (pathname === '/api/proof' && request.method === 'GET') {
      const key = decodeURIComponent(url.searchParams.get('key') || '').trim();
      if (!key) return new Response(JSON.stringify({ ok:false, error:'Missing key' }), { status:400 });
      if (!(await canAccessProof(request, env, key))) {
        return new Response(JSON.stringify({ ok:false, error:'Forbidden' }), { status:403, headers: jsonHeaders });
      }
      try {
        const found = await getProofFromStore(env, key);
        if (found && found.bin) {
          const { bin, metadata } = found;
          let contentType = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
          if (!/^image\//i.test(contentType)) contentType = 'image/jpeg';
          return new Response(bin, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        return new Response(JSON.stringify({ ok:false, error:'Not found', key }), { status:404 });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e), key }), { status:500 });
      }
    }



if (pathname === '/api/order') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeadersFor(request, env) });
  }
  const orderHeaders = jsonHeadersFor(request, env);

  if (request.method === 'POST') {
    const orderUser = await getSessionUser(request, env);
    if (!orderUser) {
      return new Response(JSON.stringify({ ok:false, error:'請先登入後再送出訂單' }), { status:401, headers: orderHeaders });
    }
    try {
      const body = await request.json();
      const itemRes = await buildItemFromProduct(env, body.productId || '', body.variantName || body.variant || '', body.qty || 1);
      if (!itemRes.ok){
        const reason = itemRes.error || 'invalid_product';
        const msg = reason === 'product_not_found' ? '找不到商品'
          : reason === 'product_inactive' ? '商品已下架'
          : reason === 'invalid_variant' ? '商品規格無效'
          : reason === 'out_of_stock' ? '庫存不足'
          : '缺少商品資訊';
        return new Response(JSON.stringify({ ok:false, error: msg }), { status:400, headers: orderHeaders });
      }
      const item = itemRes.item;
      const productId   = String(item.productId || '');
      const productName = String(item.productName || item.name || '');
      const price       = Number(item.price ?? 0);
      const qty         = Number(item.qty ?? 1);
      const method      = String(body.method || '7-11賣貨便');
      const buyer = {
        name:  String(body?.buyer?.name  || '訪客'),
        email: String(body?.buyer?.email || ''),
        line:  String(body?.buyer?.line  || '')
      };
      if (!productId || !productName) {
        return new Response(JSON.stringify({ ok:false, error:'Missing product info' }), { status:400, headers: orderHeaders });
      }
      // Optional coupon from simple order flow (one-time usage)
      const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
      const couponDeity = String(body.coupon_deity || body.deity || "").trim().toUpperCase();
      let couponApplied = null;
      let amount = Number(price||0) * Math.max(1, Number(qty||1));

      // Generate order id early so we can bind coupon usage to this order
      const id = await generateOrderId(env);

      if (couponCode) {
        try {
          const r = await redeemCoupon(env, { code: couponCode, deity: couponDeity, orderId: id });
          if (r && r.ok) {
            // Ensure this coupon code can only be used once across all orders
            const lock = await markCouponUsageOnce(env, couponCode, id);
            if (!lock.ok) {
              couponApplied = {
                code: couponCode,
                deity: couponDeity,
                failed: true,
                reason: lock.reason || 'already_used'
              };
            } else {
              const disc = Math.max(0, Number(r.amount || 200) || 200);
              amount = Math.max(0, amount - disc);
              couponApplied = {
                code: couponCode,
                deity: r.deity || couponDeity,
                discount: disc,
                redeemedAt: Date.now()
              };
            }
          } else {
            couponApplied = {
              code: couponCode,
              deity: couponDeity,
              failed: true,
              reason: (r && r.reason) || 'invalid'
            };
          }
        } catch (e) {
          console.error('redeemCoupon /api/order error', e);
          couponApplied = {
            code: couponCode,
            deity: couponDeity,
            failed: true,
            reason: 'error'
          };
        }
      }
      const now = new Date().toISOString();
      const order = {
        id, productId, productName, price, qty, method, buyer,
        amount,
        status:'pending',
        createdAt:now, updatedAt:now,
        resultToken: makeToken(32),
        results: [],
        coupon: couponApplied || undefined,
        stockDeducted: false,
        soldCounted: false
      };

      await env.ORDERS.put(id, JSON.stringify(order));
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      ids.unshift(id);
      if (ids.length > 500) ids.length = 500;
      await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));

      // Auto-increment product sold counter for this order
      try {
        await bumpSoldSingle(env, productId, qty);
        order.soldCounted = true;
      } catch(_){}
      // Decrement inventory for this order (variant-aware if provided)
      try {
        await decStockSingle(env, productId, body.variantName || body.variant || '', qty);
        order.stockDeducted = true;
      } catch(_){}
      if (order.soldCounted || order.stockDeducted) {
        await env.ORDERS.put(id, JSON.stringify(order));
      }

      return new Response(JSON.stringify({ ok:true, id }), { status:200, headers: orderHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: orderHeaders });
    }
  }

  if (request.method === 'GET') {
    try {
      const admin = await isAdmin(request, env);
      if (!admin){
        const ip = getClientIp(request) || 'unknown';
        const ok = await checkRateLimit(env, `rl:order:${ip}`, 30, 300);
        if (!ok){
          return new Response(JSON.stringify({ ok:false, error:'Too many requests' }), { status:429, headers: orderHeaders });
        }
      }
      const id = url.searchParams.get('id');
      const token = String(url.searchParams.get('token') || '').trim();
      const qPhoneRaw = getAny(url.searchParams, ['phone','mobile','contact','tel','qPhone','qP']);
      const qLast5Raw = getAny(url.searchParams, ['last5','last','l5','code','transferLast5','bankLast5','qLast5']);
      const qPhone = normalizePhone(qPhoneRaw);
      const qLast5 = (String(qLast5Raw).replace(/\D/g, '') || '').slice(-5);
      if (id) {
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: orderHeaders });
        const one = JSON.parse(raw);
        if (!admin) {
          let allowed = false;
          if (token && token === one.resultToken) {
            allowed = true;
          } else if (qPhone && qLast5) {
            const phoneCandidates = [
              one?.buyer?.phone, one?.buyer?.contact, one?.phone, one?.contact, one?.recipientPhone
            ].filter(Boolean);
            const last5Candidates = [
              one?.transferLast5, one?.last5, one?.payment?.last5, one?.bank?.last5
            ].filter(Boolean);
            const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
            const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
            allowed = pOK && lOK;
          }
          if (!allowed) {
            return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: orderHeaders });
          }
        }
        const rec = normalizeReceiptUrl(one, origin, env);
        const ritualUrl =
          one.ritualPhotoUrl ||
          one.ritual_photo_url ||
          (one?.extra?.candle?.photoUrl || "");
        const merged = Object.assign({}, one, {
          receiptUrl: rec || "",
          proofUrl: rec || "",
          ritualPhotoUrl: ritualUrl || "",
          ritualPhoto: ritualUrl || ""
        });
        if (admin){
          return new Response(JSON.stringify({ ok:true, order: merged }), { status:200, headers: orderHeaders });
        }
        const pub = await attachSignedProofs(redactOrderForPublic(merged), env);
        return new Response(JSON.stringify({ ok:true, order: pub }), { status:200, headers: orderHeaders });
      }
      if (!admin) {
        return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: orderHeaders });
      }
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
      const out = [];
      for (const oid of ids.slice(0, limit)) {
        const raw = await env.ORDERS.get(oid);
        if (!raw) continue;
        try { out.push(JSON.parse(raw)); } catch {}
      }
      return new Response(JSON.stringify({ ok:true, items: out }), { status:200, headers: orderHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: orderHeaders });
    }
  }

  if (request.method === 'DELETE') {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    try {
      const id = url.searchParams.get('id');
      if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: orderHeaders });
      const raw = await env.ORDERS.get(id);
      if (raw) {
        try{
          const obj = JSON.parse(raw);
          if (!statusIsPaid(obj.status) || statusIsCanceled(obj.status)){
            await releaseOrderResources(env, obj);
          }
        }catch(_){}
      }
      await env.ORDERS.delete(id);
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const next = ids.filter(x => x !== id);
      await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(next));
      return new Response(JSON.stringify({ ok:true }), { status:200, headers: orderHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: orderHeaders });
    }
  }

  return new Response(JSON.stringify({ ok:false, error:'Method Not Allowed' }), { status:405, headers: orderHeaders });
}

if (pathname === '/api/order/status' && request.method === 'POST') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeadersFor(request, env) });
  }
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  try {
    
    const body = await request.json();
    const id = String(body.id || '');
    const action = String(body.action || '').toLowerCase();
    const status = String(body.status || '');
    if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeadersFor(request, env) });

    if (action === 'delete') {
      const raw0 = await env.ORDERS.get(id);
      if (!raw0) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeadersFor(request, env) });
      try{
        const obj0 = JSON.parse(raw0);
        if (!statusIsPaid(obj0.status) || statusIsCanceled(obj0.status)){
          await releaseOrderResources(env, obj0);
        }
      }catch(_){}
      await env.ORDERS.delete(id);
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const next = ids.filter(x => x !== id);
      await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(next));
      return new Response(JSON.stringify({ ok:true, deleted:1 }), { status:200, headers: jsonHeadersFor(request, env) });
    }

    if (action === 'set' || (!action && status)) {
      const raw = await env.ORDERS.get(id);
      if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeadersFor(request, env) });
      const obj = JSON.parse(raw);
      const prevStatus = obj.status || '';
      let statusChanged = false;
      if (status && status !== prevStatus) {
        obj.status = status;
        statusChanged = true;
      }
      const nextStatus = obj.status || '';
      const prevPaid = statusIsPaid(prevStatus);
      const nextPaid = statusIsPaid(nextStatus);
      const nextCanceled = statusIsCanceled(nextStatus);
      if (statusChanged) {
        if (nextPaid) {
          await ensureOrderPaidResources(env, obj);
        } else if (nextCanceled || (prevPaid && !nextPaid)) {
          await releaseOrderResources(env, obj);
        }
      }
      obj.updatedAt = new Date().toISOString();
      await env.ORDERS.put(id, JSON.stringify(obj));
      let emailNotified = false;
      if (statusChanged && shouldNotifyStatus(obj.status)) {
        try {
          await maybeSendOrderEmails(env, obj, { origin, channel: obj.method || '轉帳匯款', notifyAdmin:false, emailContext:'status_update' });
          emailNotified = true;
        } catch (err) {
          console.error('status update email error', err);
        }
      }
      return new Response(JSON.stringify({ ok:true, status: obj.status, notified: emailNotified }), { status:200, headers: jsonHeadersFor(request, env) });
    }

    return new Response(JSON.stringify({ ok:false, error:'Missing action/status' }), { status:400, headers: jsonHeadersFor(request, env) });
    } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeadersFor(request, env) });
  }
}

if ((pathname === '/api/admin/cron/release-holds' || pathname === '/api/cron/release-holds') && (request.method === 'POST' || request.method === 'GET')) {
  {
    const guard = await requireCronOrAdmin(request, env);
    if (guard) return guard;
  }
  let body = {};
  if (request.method === 'POST') {
    try{ body = await request.json(); }catch(_){ body = {}; }
  }
  const limit = Number(body.limit || url.searchParams.get('limit') || env.ORDER_RELEASE_LIMIT || 300);
  const dryRun = String(body.dryRun || url.searchParams.get('dry') || '').toLowerCase() === 'true'
    || String(body.dryRun || url.searchParams.get('dry') || '') === '1';
  const includeWaitingVerify = String(body.includeWaitingVerify || url.searchParams.get('includeWaitingVerify') || '').toLowerCase() === 'true'
    || String(body.includeWaitingVerify || url.searchParams.get('includeWaitingVerify') || '') === '1';
  const result = await releaseExpiredOrderHolds(env, { limit, dryRun, includeWaitingVerify });
  return new Response(JSON.stringify(result), { status:200, headers: jsonHeadersFor(request, env) });
}

if (pathname === '/api/service/products' && request.method === 'GET') {
  const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  const activeParam = String(url.searchParams.get('active') || '').toLowerCase();
  const activeOnly = activeParam === 'true' || activeParam === '1';
  const nowMs = Date.now();
  if (url.searchParams.get('id')){
    const id = String(url.searchParams.get('id'));
    const raw = await store.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    const item = JSON.parse(raw);
    await autoDeactivateExpiredItem(store, item, id, nowMs);
    return new Response(JSON.stringify({ ok:true, item }), { status:200, headers: jsonHeaders });
  }
  let list = [];
  try{
    const idxRaw = await store.get('SERVICE_PRODUCT_INDEX');
    if (idxRaw){
      list = JSON.parse(idxRaw) || [];
    }
  }catch(_){}
  if (!Array.isArray(list) || !list.length){
    // fallback: list by prefix
    if (store.list){
      const iter = await store.list({ prefix:'svc:' });
      list = iter.keys.map(k => k.name);
    }
  }
  const items = [];
  for (const key of list){
    const raw = await store.get(key);
    if (!raw) continue;
    try{
      const obj = JSON.parse(raw);
      if (!obj.id) obj.id = key;
      await autoDeactivateExpiredItem(store, obj, key, nowMs);
      items.push(obj);
    }catch(_){}
  }
  const baseItems = items.length ? items : DEFAULT_SERVICE_PRODUCTS;
  const finalItems = activeOnly
    ? baseItems.filter(obj => obj && obj.active !== false && !isLimitedExpired(obj, nowMs))
    : baseItems;
  return new Response(JSON.stringify({ ok:true, items: finalItems }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/products' && request.method === 'POST') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  const body = await request.json();
  const name = String(body.name||'').trim();
  const price = Number(body.price||0);
  const id = body.id ? String(body.id).trim() : ('svc-' + crypto.randomUUID().slice(0,8));
  if (!name || !price){
    return new Response(JSON.stringify({ ok:false, error:'缺少名稱或價格' }), { status:400, headers: jsonHeaders });
  }
  const bodyData = Object.assign({}, body);
  if (!bodyData.id) delete bodyData.id;
  const payload = Object.assign({}, bodyData, {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  if (Object.prototype.hasOwnProperty.call(bodyData, 'limitedUntil')) {
    payload.limitedUntil = normalizeLimitedUntil(bodyData.limitedUntil);
  }
  await store.put(id, JSON.stringify(payload));
  const idxKey = 'SERVICE_PRODUCT_INDEX';
  let list = [];
  try{
    const idxRaw = await store.get(idxKey);
    if (idxRaw){
      list = JSON.parse(idxRaw) || [];
    }
  }catch(_){}
  list = [id].concat(list.filter(x=> x !== id)).slice(0,200);
  await store.put(idxKey, JSON.stringify(list));
  return new Response(JSON.stringify({ ok:true, item: payload }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/products' && request.method === 'PUT') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
  if (!store) return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
  const body = await request.json();
  const id = String(body.id||'').trim();
  if (!id){
    return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
  }
  const raw = await store.get(id);
  if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
  const prev = JSON.parse(raw);
  if (Object.prototype.hasOwnProperty.call(body, 'limitedUntil')) {
    body.limitedUntil = normalizeLimitedUntil(body.limitedUntil);
  }
  const next = Object.assign({}, prev, body, { id, updatedAt: new Date().toISOString() });
  await store.put(id, JSON.stringify(next));
  return new Response(JSON.stringify({ ok:true, item: next }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/products' && request.method === 'DELETE') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
  if (!store) return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
  const id = String(url.searchParams.get('id')||'').trim();
  if (!id){
    return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
  }
  await store.delete(id);
  const idxKey = 'SERVICE_PRODUCT_INDEX';
  try{
    const idxRaw = await store.get(idxKey);
    if (idxRaw){
      let list = JSON.parse(idxRaw) || [];
      list = list.filter(x=> x !== id);
      await store.put(idxKey, JSON.stringify(list));
    }
  }catch(_){}
  return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/order' && request.method === 'POST') {
  const svcUser = await getSessionUser(request, env);
  if (!svcUser) {
    return new Response(JSON.stringify({ ok:false, error:'請先登入後再送出訂單' }), { status:401, headers: jsonHeaders });
  }
  const svcUserRecord = await ensureUserRecord(env, svcUser);
  try{
    const body = await request.json();
    const serviceId = String(body.serviceId||'').trim();
    const name = String(body.name||'').trim();
    const phone = String(body.phone||'').trim();
    if (!serviceId || !name || !phone){
      return new Response(JSON.stringify({ ok:false, error:'缺少必要欄位' }), { status:400, headers: jsonHeaders });
    }
    const svcStore = env.SERVICE_PRODUCTS || env.PRODUCTS;
    let svc = null;
    if (svcStore){
      const rawSvc = await svcStore.get(serviceId);
      if (rawSvc){
        try{ svc = JSON.parse(rawSvc); }catch(_){}
      }
    }
    if (!svc) return new Response(JSON.stringify({ ok:false, error:'找不到服務項目' }), { status:404, headers: jsonHeaders });
    const transferLast5 = String(body.transferLast5||'').trim();
    const transferReceiptUrl = (() => {
      let u = String(body.transferReceiptUrl || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
        u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      }
      if (!isAllowedFileUrl(u, env, origin)) return '';
      if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
      return u;
    })();
    const ritualPhotoUrl = (() => {
      let u = String(body.ritualPhotoUrl || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
        u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      }
      if (!isAllowedFileUrl(u, env, origin)) return '';
      if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
      return u;
    })();
    if (!/^\d{5}$/.test(transferLast5) || !transferReceiptUrl){
      return new Response(JSON.stringify({ ok:false, error:'缺少匯款資訊' }), { status:400, headers: jsonHeaders });
    }
    const transferMemo = String(body.transferMemo||'').trim();
    const transferBank = String(body.transferBank||'').trim();
    const transferAccount = String(body.transferAccount||'').trim();
    const orderId = await generateServiceOrderId(env);
    const buyer = {
      name,
      nameEn: String(body.nameEn || body.buyer_name_en || body.buyer_nameEn || body.buyer?.nameEn || '').trim(),
      phone,
      email: String(body.email||'').trim(),
      birth: String(body.birth||'').trim(),
      line: String(body.line||'').trim()
    };
    if (svcUserRecord && svcUserRecord.defaultContact){
      if (!buyer.name) buyer.name = svcUserRecord.defaultContact.name || '';
      if (!buyer.phone) buyer.phone = svcUserRecord.defaultContact.phone || '';
      if (!buyer.email) buyer.email = svcUserRecord.defaultContact.email || '';
    }
    if (svcUser){
      buyer.uid = svcUser.id;
      if (!buyer.email) buyer.email = svcUser.email || '';
      if (!buyer.name) buyer.name = svcUser.name || buyer.name;
    }
    const options = Array.isArray(svc.options) ? svc.options : [];
    let baseCount = Number(body.baseCount || 0);
    if (!Number.isFinite(baseCount) || baseCount < 0) baseCount = 0;
    let requestedNames = [];
    if (Array.isArray(body.optionNames) && body.optionNames.length){
      requestedNames = body.optionNames.map(name => String(name||'').trim()).filter(Boolean);
    } else if (body.optionName) {
      requestedNames = [String(body.optionName||'').trim()];
    }
    const selectionList = [];
    if (requestedNames.length){
      for (const nm of requestedNames){
        const info = options.find(opt => opt && (String(opt.name||'').trim() === nm));
        if (!info){
          return new Response(JSON.stringify({ ok:false, error:'服務項目無效' }), { status:400, headers: jsonHeaders });
        }
        selectionList.push({ name: info.name, price: Number(info.price||0) });
      }
    }
    if (options.length && !selectionList.length){
      return new Response(JSON.stringify({ ok:false, error:'請至少選擇一個服務項目' }), { status:400, headers: jsonHeaders });
    }
    const basePrice = Number(svc.price||0);
    const fixedFee = Math.max(0, Number(svc.fixedFee ?? svc.serviceFee ?? svc.travelFee ?? svc.extraFee ?? 0) || 0);
    const feeLabel = String(svc.feeLabel || '車馬費').trim();
    let items = [];
    if (selectionList.length){
      items = selectionList.map(opt => ({
        name: `${svc.name}｜${opt.name}`,
        qty: 1,
        total: basePrice + Number(opt.price||0),
        image: svc.cover||''
      }));
    }
    if (!selectionList.length && !options.length && baseCount < 1){
      baseCount = 1;
    }
    if (baseCount > 0){
      items.push({
        name: svc.name,
        qty: baseCount,
        total: basePrice * baseCount,
        image: svc.cover||''
      });
    }
    let finalPrice = items.reduce((sum,it)=> sum + Number(it.total||0), 0) + fixedFee;
    const transfer = {
      amount: finalPrice,
      last5: transferLast5,
      receiptUrl: transferReceiptUrl,
      memo: transferMemo,
      bank: transferBank,
      account: transferAccount,
      uploadedAt: new Date().toISOString()
    };
    // 會員折扣暫不啟用
    let memberDiscount = 0;
    let perkInfo = null;

    const order = {
      id: orderId,
      type: 'service',
      serviceId,
      serviceName: svc.name,
      selectedOption: selectionList.length === 1 ? selectionList[0] : undefined,
      selectedOptions: selectionList.length > 1 ? selectionList : (selectionList.length ? selectionList : undefined),
      items,
      amount: finalPrice,
      serviceFee: fixedFee || 0,
      serviceFeeLabel: feeLabel || '車馬費',
      qtyEnabled: svc.qtyEnabled === true,
      qtyLabel: svc.qtyLabel || undefined,
      status: '待處理',
      buyer: Object.assign({}, buyer, {
        nameEn: String(body?.nameEn || body?.buyer?.nameEn || body?.buyer_name_en || body?.buyer_nameEn || '')
      }),
      note: String(body.note||'').trim(),
      requestDate: String(body.requestDate||'').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resultToken: makeToken(24),
      method: '服務型商品',
      channel: '服務型商品',
      transfer,
      transferLast5: transferLast5,
      ritualPhotoUrl: ritualPhotoUrl || undefined
    };
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
    }
    await store.put(order.id, JSON.stringify(order));
    const idxKey = 'SERVICE_ORDER_INDEX';
    let idxRaw = await store.get(idxKey);
    let list = [];
    if (idxRaw){
      try{ list = JSON.parse(idxRaw) || []; }catch(_){}
    }
    list = [order.id].concat(list.filter(id => id !== order.id)).slice(0,500);
    await store.put(idxKey, JSON.stringify(list));
    if (svcStore && svc){
      try{
        const soldUnits = items.reduce((sum, it)=> sum + Math.max(1, Number(it.qty||1)), 0) || 1;
        const currSold = Number(svc.sold || 0) || 0;
        const updatedSvc = Object.assign({}, svc, {
          sold: currSold + soldUnits,
          updatedAt: new Date().toISOString()
        });
        await svcStore.put(serviceId, JSON.stringify(updatedSvc));
        svc = updatedSvc;
      }catch(err){
        console.error('service sold counter update failed', err);
      }
    }
    try{
      await maybeSendOrderEmails(env, order, { channel:'服務型商品', notifyAdmin:true, emailContext:'service_created' });
    }catch(err){
      console.error('service order email error', err);
    }
    // 會員折扣關閉，無需記錄使用
    try{
      await updateUserDefaultContact(env, svcUser.id, {
        name: buyer.name || '',
        phone: buyer.phone || '',
        email: buyer.email || ''
      });
    }catch(_){}
    return new Response(JSON.stringify({ ok:true, orderId, order }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/orders' && request.method === 'GET') {
  if (!(await isAdmin(request, env))) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  const idQuery = url.searchParams.get('id');
  if (idQuery){
    const raw = await store.get(idQuery);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    return new Response(JSON.stringify({ ok:true, item: JSON.parse(raw) }), { status:200, headers: jsonHeaders });
  }
  const limit = Math.min(Number(url.searchParams.get('limit')||50), 300);
  let list = [];
  try{
    const idxRaw = await store.get('SERVICE_ORDER_INDEX');
    if (idxRaw) list = JSON.parse(idxRaw) || [];
  }catch(_){}
  const items = [];
  for (const id of list.slice(0, limit)){
    const raw = await store.get(id);
    if (!raw) continue;
    try{ items.push(JSON.parse(raw)); }catch(_){}
  }
  return new Response(JSON.stringify({ ok:true, items }), { status:200, headers: jsonHeaders });
}

// 匯出服務訂單 CSV
if (pathname === '/api/service/orders/export' && request.method === 'GET') {
  if (!(await isAdmin(request, env))) return new Response('Unauthorized', { status:401, headers:{'Content-Type':'text/plain'} });
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response('SERVICE_ORDERS 未綁定', { status:500, headers:{'Content-Type':'text/plain'} });
  }
  const idxKey = 'SERVICE_ORDER_INDEX';
  try{
    const limit = Math.min(Number(url.searchParams.get('limit')||200), 500);
    const idxRaw = await store.get(idxKey);
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    const rows = [];
    const header = [
      '訂單編號','建立時間(UTC+7)','狀態','服務名稱','選項','總金額',
      '匯款末五碼','聯絡人姓名','英文姓名','電話','Email','生日','指定日期','備註','匯款憑證'
    ];
    rows.push(header.map(csvEscape).join(','));
    for (const id of ids.slice(0, limit)){
      const raw = await store.get(id);
      if (!raw) continue;
      let o = null;
      try{ o = JSON.parse(raw); }catch(_){}
      if (!o) continue;
      const created = formatTZ(o.createdAt || o.updatedAt || '', 7);
      const opts = Array.isArray(o.selectedOptions) ? o.selectedOptions : (o.selectedOption ? [o.selectedOption] : []);
      const optText = opts.length ? opts.map(x=> `${x.name||''}${x.price?`(+${x.price})`:''}`).join('、') : '標準服務';
      const proof = o?.transfer?.receiptUrl || o?.transferReceiptUrl || '';
      const row = [
        o.id || '',
        created,
        o.status || '',
        o.serviceName || '',
        optText,
        o.amount || '',
        (o.transfer && o.transfer.last5) || o.transferLast5 || '',
        o.buyer?.name || '',
        o.buyer?.nameEn || '',
        o.buyer?.phone || '',
        o.buyer?.email || '',
        o.buyer?.birth || '',
        o.requestDate || '',
        o.note || '',
        proof
      ];
      rows.push(row.map(csvEscape).join(','));
    }
    const csv = rows.join('\n');
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="service-orders.csv"',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }catch(e){
    return new Response(String(e), { status:500, headers:{'Content-Type':'text/plain'} });
  }
}

if (pathname === '/api/service/order/status' && request.method === 'POST') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  try{
    const body = await request.json();
    const id = String(body.id||'').trim();
    const status = String(body.status||'').trim();
    const action = String(body.action||'').trim();
    if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
    const raw = await store.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    const order = JSON.parse(raw);
    if (action === 'delete'){
      const confirm = String(body.confirm||'').trim();
      if (confirm !== '刪除') return new Response(JSON.stringify({ ok:false, error:'確認文字不符' }), { status:400, headers: jsonHeaders });
      await store.delete(id);
      try{
        const idxKey = 'SERVICE_ORDER_INDEX';
        const idxRaw = await store.get(idxKey);
        if (idxRaw){
          const list = JSON.parse(idxRaw) || [];
          const next = list.filter(x=> String(x)!==id);
          await store.put(idxKey, JSON.stringify(next));
        }
      }catch(_){}
      return new Response(JSON.stringify({ ok:true, deleted:true }), { status:200, headers: jsonHeaders });
    }
    if (!status) return new Response(JSON.stringify({ ok:false, error:'Missing status' }), { status:400, headers: jsonHeaders });
    order.status = status;
    order.updatedAt = new Date().toISOString();
    await store.put(id, JSON.stringify(order));
    let notified = false;
    if (shouldNotifyStatus(status)){
      try{
        await maybeSendOrderEmails(env, order, { channel:'服務型商品', notifyAdmin:false, emailContext:'status_update' });
        notified = true;
      }catch(err){ console.error('service status email err', err); }
    }
    return new Response(JSON.stringify({ ok:true, notified }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/order/result-photo' && request.method === 'POST') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  try{
    const body = await request.json();
    const id = String(body.id||'').trim();
    const photo = String(body.photo||body.url||'').trim();
    if (!id || !photo){
      return new Response(JSON.stringify({ ok:false, error:'缺少必要欄位' }), { status:400, headers: jsonHeaders });
    }
    const raw = await store.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    const order = JSON.parse(raw);
    order.resultPhotoUrl = photo;
    const now = new Date().toISOString();
    const results = Array.isArray(order.results) ? order.results : [];
    const hasSame = results.some(r=>{
      if (!r) return false;
      const u = r.url || r.imageUrl || r.image || '';
      return u === photo;
    });
    if (!hasSame) {
      results.push({ type:'image', url: photo, ts: now });
    }
    order.results = results;
    order.updatedAt = new Date().toISOString();
    await store.put(id, JSON.stringify(order));
    return new Response(JSON.stringify({ ok:true, photo }), { status:200, headers: jsonHeaders });
  }catch(err){
    return new Response(JSON.stringify({ ok:false, error:String(err) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/orders/lookup' && request.method === 'GET') {
  const phone = normalizeTWPhoneStrict(url.searchParams.get('phone')||'');
  const orderRaw = String(url.searchParams.get('order')||'').trim();
  const orderDigits = normalizeOrderSuffix(orderRaw, 5);
  const bankDigits = lastDigits(url.searchParams.get('bank')||'', 5);
  if (orderRaw && orderDigits.length !== 5){
    return new Response(JSON.stringify({ ok:false, error:'訂單編號末五碼需為 5 位英數' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  if (!phone || (!orderDigits && !bankDigits)){
    return new Response(JSON.stringify({ ok:false, error:'缺少查詢條件' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  {
    const ip = getClientIp(request) || 'unknown';
    const ok = await checkRateLimit(env, `rl:svc_lookup:${ip}`, 20, 300);
    if (!ok){
      return new Response(JSON.stringify({ ok:false, error:'Too many requests' }), { status:429, headers: jsonHeadersFor(request, env) });
    }
  }
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeadersFor(request, env) });
  }
  let list = [];
  try{
    const idxRaw = await store.get('SERVICE_ORDER_INDEX');
    if (idxRaw) list = JSON.parse(idxRaw) || [];
  }catch(_){}
  const matches = [];
  for (const id of list.slice(0, 200)){
    const raw = await store.get(id);
    if (!raw) continue;
    let order = null;
    try{ order = JSON.parse(raw); }catch(_){}
    if (!order) continue;
    const buyerPhone = normalizeTWPhoneStrict(order?.buyer?.phone || '');
    const orderLast5 = normalizeOrderSuffix(order.id || '', 5);
    const transferLast5 = lastDigits(order?.transfer?.last5 || order?.transferLast5 || '', 5);
    if (buyerPhone && buyerPhone.endsWith(phone.slice(-9)) && ((orderDigits && orderLast5 === orderDigits) || (bankDigits && transferLast5 === bankDigits))){
      matches.push(order);
    }
  }
  const out = [];
  for (const order of matches){
    const pub = redactOrderForPublic(order);
    out.push(await attachSignedProofs(pub, env));
  }
  return new Response(JSON.stringify({ ok:true, orders: out }), { status:200, headers: jsonHeadersFor(request, env) });
}

    // 圖片上傳
    if (pathname === "/api/upload" && request.method === "POST") {
      return handleUpload(request, env, origin);
    }

    // 圖片刪除
    if (pathname.startsWith("/api/file/") && request.method === "DELETE") {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      const key = decodeURIComponent(pathname.replace("/api/file/", ""));
      return deleteR2FileByKey(key, env);
    }
    if (pathname === "/api/deleteFile" && request.method === "POST") {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      return deleteR2FileViaBody(request, env);
    }

    // CORS Preflight for all /api/ routes
    if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
      return corsPreflight();
    }

    // 公開讀取 R2 檔案
    if (pathname.startsWith("/api/file/") && request.method === "GET") {
      const key = decodeURIComponent(pathname.replace("/api/file/", ""));
      return proxyR2File(key, env);
    }

    // === 憑證圖片讀取：優先從 R2_BUCKET，其次 RECEIPTS KV，修復遞迴與跨域問題 ===
    // Serve proof image (R2_BUCKET or RECEIPTS)
    if (pathname.startsWith('/api/proof/') && request.method === 'GET') {
      const key = decodeURIComponent(pathname.replace('/api/proof/', '').trim());
      if (!key) return new Response(JSON.stringify({ ok:false, error:'Missing key' }), { status:400 });
      if (!(await canAccessProof(request, env, key))) {
        return new Response(JSON.stringify({ ok:false, error:'Forbidden' }), { status:403, headers: jsonHeaders });
      }
      try {
        // 使用 getProofFromStore 取得圖片，避免遞迴呼叫
        const found = await getProofFromStore(env, key);
        if (found && found.bin) {
          const { bin, metadata } = found;
          let contentType = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
          if (!/^image\//i.test(contentType)) contentType = 'image/jpeg';
          return new Response(bin, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        return new Response(JSON.stringify({ ok:false, error:'Not found', key }), { status:404 });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e), key }), { status:500 });
      }
    }
    // === Proof data URL for inline preview (returns data: URL as text) ===
    if (pathname.startsWith("/api/proof.data/") && request.method === "GET") {
      try {
        const rawKey = pathname.replace("/api/proof.data/", "");
        const accessKey = decodeURIComponent(rawKey);
        if (!(await canAccessProof(request, env, accessKey))) {
          return new Response('Forbidden', { status: 403 });
        }
        const found = await getProofFromStore(env, accessKey);
        if (!found) return new Response('Not found', { status: 404 });
        const { bin, metadata } = found;
        let ctype = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
        if (!/^image\//i.test(ctype)) ctype = 'image/jpeg';
        const b64 = arrayBufferToBase64(bin);
        const dataUrl = `data:${ctype};base64,${b64}`;
        return new Response(dataUrl, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    // === Proof preview with browser-friendly format (webp) ===
    if (pathname.startsWith("/api/proof.view/") && request.method === "GET") {
      const rawKey = pathname.replace("/api/proof.view/", "");
      const key = decodeURIComponent(rawKey);
      if (!(await canAccessProof(request, env, key))) {
        return new Response('Forbidden', { status: 403 });
      }
      // 直接從 store 取得圖片
      const found = await getProofFromStore(env, key);
      if (!found || !found.bin) return new Response('Not found', { status: 404 });
      // 轉換圖片格式 (webp) via Cloudflare Images
      const imageRequest = new Request("https://dummy", {
        headers: { "Accept": "image/*" },
        cf: { image: { format: "webp", quality: 85, fit: "scale-down" } }
      });
      // Cloudflare Workers 不支援直接以 buffer 傳給 cf:image，但 fetch 只作用於 URL。
      // 所以這裡 fallback: 直接回傳原始圖片（webp 需求可於前端處理或 Cloudflare Images 方案）
      let ctype = (found.metadata && (found.metadata.contentType || found.metadata['content-type'])) || 'image/jpeg';
      if (!/^image\//i.test(ctype)) ctype = 'image/webp';
      const h = new Headers();
      h.set("Content-Type", ctype);
      h.set("Access-Control-Allow-Origin", "*");
      h.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(found.bin, { status: 200, headers: h });
    }
    // === Proof inline HTML (data URL) to bypass strict image loading issues ===
    if (pathname.startsWith("/api/proof.inline/") && request.method === "GET") {
      try {
        const rawKey = pathname.replace("/api/proof.inline/", "");
        const accessKey = decodeURIComponent(rawKey);
        if (!(await canAccessProof(request, env, accessKey))) {
          return new Response('Forbidden', { status: 403 });
        }
        const found = await getProofFromStore(env, accessKey);
        if (!found) return new Response('Not found', { status: 404 });
        const { key: realKey, bin, metadata } = found;
        let ctype = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
        if (!/^image\//i.test(ctype)) ctype = 'image/jpeg';
        const b64 = arrayBufferToBase64(bin);
        const html = `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Proof: ${realKey}</title>
<style>html,body{margin:0;padding:0;background:#0b1022;color:#e5e7eb;font-family:ui-sans-serif,system-ui} .wrap{padding:12px} img{max-width:100%;height:auto;display:block;margin:0 auto}</style>
</head><body><div class="wrap">
<p style="font-size:12px;opacity:.7">${realKey}</p>
<img alt="proof" src="data:${ctype};base64,${b64}" />
</div></body></html>`;
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
// Stories (reviews) endpoints
if (pathname === "/api/stories" && request.method === "GET") {
  return listStories(url, env);
}
if (pathname === "/api/stories" && request.method === "POST") {
  // Support method override: POST + _method=DELETE
  const _m = (url.searchParams.get("_method") || "").toUpperCase();
  if (_m === "DELETE") {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    return deleteStories(url, env);
  }
  return createStory(request, env);
}
if (pathname === "/api/stories" && request.method === "DELETE") {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  return deleteStories(url, env);
}
    // Image resize proxy
    if (pathname === "/api/img" && request.method === "GET") {
      return resizeImage(url, env, origin);
    }

    // 預設回退: 如果請求路徑不是以 /api/ 開頭，則交給靜態資源處理
    if (!pathname.startsWith("/api/")) {
      return next();
    }

    // 如果是未匹配的 /api/ 路由，回傳 404
    return next();
}

/* ========== /api/upload ========== */
async function handleUpload(request, env, origin) {
  try {
    if (!env.R2_BUCKET) return withCORS(json({ ok:false, error:"R2 bucket not bound" }, 500));
    if (!isAllowedOrigin(request, env, env.UPLOAD_ORIGINS || '')) {
      return withCORS(json({ ok:false, error:"Forbidden origin" }, 403));
    }
    const uploader = await getSessionUser(request, env);
    const adminSession = await getAdminSession(request, env);
    const isAuthed = !!uploader || !!adminSession;
    const authTier = uploader ? 'user' : (adminSession ? 'admin' : 'anon');
    if (!isAuthed && String(env.UPLOAD_REQUIRE_AUTH || '') === '1') {
      return withCORS(json({ ok:false, error:"Login required" }, 401));
    }
    const ip = getClientIp(request) || 'unknown';
    const windowSec = Math.max(30, Number(env.UPLOAD_RATE_WINDOW_SEC || 300) || 300);
    const anonLimit = Math.max(1, Number(env.UPLOAD_ANON_LIMIT || 10) || 10);
    const authLimit = Math.max(1, Number(env.UPLOAD_AUTH_LIMIT || 60) || 60);
    const limit = isAuthed ? authLimit : anonLimit;
    const ok = await checkRateLimit(env, `rl:upload:${authTier}:${ip}`, limit, windowSec);
    if (!ok){
      return withCORS(json({ ok:false, error:"Too many requests" }, 429));
    }
    const form = await request.formData();
    let files = form.getAll("files[]");
    if (!files.length) files = form.getAll("file");
    if (!files.length) return json({ ok:false, error:"No files provided" }, 400);
    const maxFiles = Math.max(1, Number(env.UPLOAD_MAX_FILES || (isAuthed ? 10 : 3)) || (isAuthed ? 10 : 3));
    if (files.length > maxFiles){
      return json({ ok:false, error:`Too many files (max ${maxFiles})` }, 400);
    }

    const allowedMimes = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/heic",
      "image/heif",
      "application/pdf"
    ]);
    const allowedExts = new Set([
      "jpg","jpeg","png","webp","gif","avif","heic","heif","pdf"
    ]);
    const extMimeMap = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      heic: "image/heic",
      heif: "image/heif",
      pdf: "application/pdf"
    };
    const out = [];
    const day = new Date();
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const d = String(day.getDate()).padStart(2, "0");

    if (!isAuthed){
      allowedMimes.delete("application/pdf");
      allowedExts.delete("pdf");
    }
    const anonMaxMb = Math.max(1, Number(env.UPLOAD_ANON_MAX_MB || env.UPLOAD_MAX_MB || 10) || 10);
    const authMaxMb = Math.max(1, Number(env.UPLOAD_AUTH_MAX_MB || env.UPLOAD_MAX_MB || 20) || 20);
    const maxBytes = (isAuthed ? authMaxMb : anonMaxMb) * 1024 * 1024;
    for (const f of files) {
      if (typeof f.stream !== "function") continue;
      if (f.size && f.size > maxBytes) {
        const limitMb = Math.round(maxBytes / (1024 * 1024));
        return json({ ok:false, error:`File too large (>${limitMb}MB)` }, 413);
      }
      const mime = String(f.type || "").toLowerCase();
      const extGuess = (guessExt(mime) || safeExt(f.name) || "").toLowerCase();
      const isGenericMime = !mime || mime === "application/octet-stream";
      const mimeAllowed = mime && allowedMimes.has(mime);
      const extAllowed = extGuess && allowedExts.has(extGuess);
      if (!isGenericMime && !mimeAllowed) {
        return json({ ok:false, error:"Unsupported file type" }, 415);
      }
      if (!extAllowed && !mimeAllowed) {
        return json({ ok:false, error:"Unsupported file type" }, 415);
      }
      const ext = extGuess || "bin";
      const key = `uploads/${y}${m}${d}/${crypto.randomUUID()}.${ext}`;

      const contentType = mimeAllowed ? mime : (extMimeMap[ext] || mime || "application/octet-stream");
      await env.R2_BUCKET.put(key, f.stream(), {
        httpMetadata: {
          contentType,
          contentDisposition: "inline"
        }
      });

      const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://shop.unalomecodes.com';
      const base = publicHost.startsWith('http') ? publicHost.replace(/\/+$/,'') : `https://${publicHost.replace(/\/+$/,'')}`;
      const url = `${base}/api/file/${encodeURIComponent(key)}`;
      out.push({ url, key });
    }

    return withCORS(json({ ok:true, files: out }));
  } catch (err) {
    return withCORS(json({ ok:false, error:String(err) }, 500));
  }
}

/* ========== R2 刪檔 ========== */
async function deleteR2FileByKey(key, env) {
  try {
    await env.R2_BUCKET.delete(key);
    return withCORS(json({ ok:true, key }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

async function deleteR2FileViaBody(request, env) {
  try {
    const body = await request.json();
    let key = body?.key;
    if (!key && body?.url) key = extractKeyFromProxyUrl(body.url);
    if (!key) return withCORS(json({ ok:false, error:"Missing key or url" }, 400));

    await env.R2_BUCKET.delete(key);
    return withCORS(json({ ok:true, key }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

function extractKeyFromProxyUrl(u) {
  try {
    const url = new URL(u);
    const m = url.pathname.match(/^\/api\/file\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch { return ""; }
}

/* ========== /api/products ========== */
// 商品列表 API 支援分類查詢，可用 ?category=佛牌 只查該分類
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
async function listProducts(url, env) {
  const active = url.searchParams.get("active");
  const category = url.searchParams.get("category");
  const indexRaw = await env.PRODUCTS.get("INDEX");
  const ids = indexRaw ? JSON.parse(indexRaw) : [];
  const nowMs = Date.now();

  const items = [];
  for (const id of ids) {
    const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
    if (!raw) continue;
    const p = JSON.parse(raw);

    // --- FIX: Ensure deityCode exists for backward compatibility ---
    if (!p.deityCode && p.deity) {
      p.deityCode = getDeityCodeFromName(p.deity);
    }

    // 使用智慧分類函式來補全或修正舊資料的分類
    p.category = inferCategory(p);
    await autoDeactivateExpiredItem(env.PRODUCTS, p, `PRODUCT:${id}`, nowMs);
    if (active === "true" && p.active !== true) continue;
    if (active === "true" && isLimitedExpired(p, nowMs)) continue;
    // 分類篩選
    if (category && p.category !== category) continue;
    items.push(p);
  }
  return withCORS(json({ ok:true, items }));
}

// 新增商品時，若前端傳送 category，會一併存入
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
async function createProduct(request, env) {
  try {
    const body = await request.json();
    if (!body || !body.name || !Array.isArray(body.images) || !body.images.length) {
      return withCORS(json({ ok:false, error:"Invalid payload" }, 400));
    }
    const id = body.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // 確保 category 被傳入 normalizeProduct
    const product = normalizeProduct({ ...body, id, category: body.category }, now);
    await env.PRODUCTS.put(`PRODUCT:${id}`, JSON.stringify(product));

    const indexRaw = await env.PRODUCTS.get("INDEX");
    const ids = indexRaw ? JSON.parse(indexRaw) : [];
    if (!ids.includes(id)) {
      ids.unshift(id);
      await env.PRODUCTS.put("INDEX", JSON.stringify(ids));
    }
    return withCORS(json({ ok:true, id, product }));
  } catch (err) {
    return withCORS(json({ ok:false, error:String(err) }, 500));
  }
}

/* ========== /api/products/:id ========== */
async function getProduct(id, env) {
  const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
  if (!raw) return withCORS(json({ ok:false, error:"Not found" }, 404));
  const product = JSON.parse(raw);
  await autoDeactivateExpiredItem(env.PRODUCTS, product, `PRODUCT:${id}`, Date.now());
  return withCORS(json({ ok:true, product }));
}

// 編輯商品時，若前端傳送 category，會一併存入
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
async function putProduct(id, request, env) {
  try {
    const body = await request.json();
    if (!body || !body.name || !Array.isArray(body.images) || !body.images.length) {
      return withCORS(json({ ok:false, error:"Invalid payload" }, 400));
    }
    const now = new Date().toISOString();
    // 確保 category 被傳入 normalizeProduct
    const product = normalizeProduct({ ...body, id, category: body.category }, now);
    await env.PRODUCTS.put(`PRODUCT:${id}`, JSON.stringify(product));

    const indexRaw = await env.PRODUCTS.get("INDEX");
    const ids = indexRaw ? JSON.parse(indexRaw) : [];
    if (!ids.includes(id)) {
      ids.unshift(id);
      await env.PRODUCTS.put("INDEX", JSON.stringify(ids));
    }
    return withCORS(json({ ok:true, product }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

// 修改商品時，若前端傳送 category，會一併存入
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
async function patchProduct(id, request, env) {
  try {
    const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
    if (!raw) return withCORS(json({ ok:false, error:"Not found" }, 404));
    const curr = JSON.parse(raw);
    const patch = await request.json();

    const next = {
      ...curr,
      ...pick(patch, ["name","deity","basePrice","sold","stock","description","active","instagram"]),
    };

    if (Array.isArray(patch.images)) {
      next.images = patch.images.map(String);
    }
    if (Array.isArray(patch.variants)) {
      next.variants = patch.variants.map(v => ({
        name: String(v.name || ""),
        priceDiff: Number(v.priceDiff ?? 0),
        stock: Number(v.stock ?? 0)
      }));
    }
    // 若 patch 有 category，則覆蓋
    if (typeof patch.category !== "undefined") {
      next.category = String(patch.category);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "limitedUntil")) {
      next.limitedUntil = normalizeLimitedUntil(patch.limitedUntil);
    }

    next.updatedAt = new Date().toISOString();
    await env.PRODUCTS.put(`PRODUCT:${id}`, JSON.stringify(next));

    const indexRaw = await env.PRODUCTS.get("INDEX");
    const ids = indexRaw ? JSON.parse(indexRaw) : [];
    if (!ids.includes(id)) {
      ids.unshift(id);
      await env.PRODUCTS.put("INDEX", JSON.stringify(ids));
    }

    return withCORS(json({ ok:true, product: next }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

async function deleteProduct(id, env) {
  try {
    await env.PRODUCTS.delete(`PRODUCT:${id}`);
    const indexRaw = await env.PRODUCTS.get("INDEX");
    const ids = indexRaw ? JSON.parse(indexRaw) : [];
    const next = ids.filter(x => x !== id);
    await env.PRODUCTS.put("INDEX", JSON.stringify(next));
    return withCORS(json({ ok:true, id }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
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
function arrayBufferToBase64(bin){
  const bytes = new Uint8Array(bin);
  const chunk = 0x8000; // 32k per slice to avoid stack overflow
  let ascii = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    ascii += String.fromCharCode.apply(null, slice);
  }
  return btoa(ascii);
}

// --- 智慧商品分類輔助函式 ---
function inferCategory(body) {
  // 1. 優先使用前端明確指定的分類
  if (body && body.category && ["佛牌/聖物", "蠟燭加持祈福", "跑廟行程", "其他"].includes(body.category)) {
    return body.category;
  }
  // 2. 若無指定，則根據商品名稱中的關鍵字推斷
  const name = String(body.name || "").toLowerCase();
  if (name.includes("蠟燭")) return "蠟燭加持祈福";
  if (name.includes("跑廟")) return "跑廟行程";
  // 3. 預設分類
  return "佛牌/聖物";
}

function getAny(sp, keys){
  for (const k of keys){
    const v = sp.get(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function normalizePhone(s = '') {
  const digits = String(s || '').replace(/\D/g, '');
  if (!digits) return '';
  // handle +88609..., 8869..., 09...
  if (digits.startsWith('886')) {
    const tail = digits.slice(3);
    if (tail.startsWith('0')) return tail; // already 0-leading
    return '0' + tail;
  }
  if (digits.startsWith('9') && digits.length === 9) return '0' + digits;
  if (digits.length >= 10 && digits.startsWith('0')) return digits.slice(0, 10);
  return digits;
}

// --- 神祇代碼推斷輔助函式 ---
function getDeityCodeFromName(name) {
  if (!name) return '';
  const s = String(name).toUpperCase();
  if (/^[A-Z]{2}$/.test(s)) return s; // Already a code
  if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/i.test(name)) return 'FM';
  if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/i.test(name)) return 'GA';
  if (/崇迪|SOMDEJ|SOMDET/i.test(name)) return 'CD';
  if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/i.test(name)) return 'KP';
  if (/哈魯曼|H(AN|AR)UMAN/i.test(name)) return 'HM';
  if (/拉胡|RAHU/i.test(name)) return 'RH';
  if (/迦樓羅|GARUDA|K(AR|AL)UDA/i.test(name)) return 'JL';
  if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/i.test(name)) return 'ZD';
  if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/i.test(name)) return 'ZF';
  if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/i.test(name)) return 'WE';
  if (/徐祝|XU\s*ZHU|XUZHU/i.test(name)) return 'XZ';
  if (/魂魄勇|HUN\s*PO\s*YONG|HPY/i.test(name)) return 'HP';
  return ''; // Fallback
}
// 商品資料標準化，預設 category 為「佛牌」，並確保回傳
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
function normalizeLimitedUntil(value){
  const raw = String(value || "").trim();
  if (!raw) return "";
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return "";
  return new Date(ts).toISOString();
}

function parseLimitedUntil(value){
  const raw = String(value || "").trim();
  if (!raw) return null;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : null;
}

function isLimitedExpired(item, nowMs){
  const ts = parseLimitedUntil(item && item.limitedUntil);
  if (!ts) return false;
  return ts <= nowMs;
}

async function autoDeactivateExpiredItem(store, item, key, nowMs){
  if (!store || !item || item.active === false) return false;
  if (!isLimitedExpired(item, nowMs)) return false;
  try{
    const next = Object.assign({}, item, { active:false, updatedAt: new Date().toISOString() });
    await store.put(key, JSON.stringify(next));
    Object.assign(item, next);
    return true;
  }catch(err){
    console.error('autoDeactivateExpiredItem failed', err);
  }
  return false;
}

function normalizeProduct(body, nowIso) {
  return {
    id: String(body.id || crypto.randomUUID()),
    name: String(body.name),
    deityCode: String(body.deityCode || ""),
    deity: String(body.deity || ""),
    basePrice: Number(body.basePrice ?? 0),
    sold: Number(body.sold ?? 0),
    stock: Number(body.stock ?? 0),
    description: String(body.description || ""),
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    variants: Array.isArray(body.variants) ? body.variants.map(v => ({
      name: String(v.name || ""),
      priceDiff: Number(v.priceDiff ?? 0),
      stock: Number(v.stock ?? 0)
    })) : [],
    instagram: String(body.instagram || body.ig || body.instagramUrl || body.igUrl || ""),
    category: inferCategory(body), // 改為使用智慧分類函式
    limitedUntil: normalizeLimitedUntil(body.limitedUntil),
    active: body.active !== false,
    createdAt: body.createdAt || nowIso,
    updatedAt: nowIso
  };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function withCORS(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key");
  h.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return new Response(res.body, { status: res.status, headers: h });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key",
      "Access-Control-Max-Age": "86400"
    }
  });
}

function guessExt(mime = "") {
  if (mime.startsWith("image/")) {
    const t = mime.split("/")[1].toLowerCase();
    if (t === "jpeg") return "jpg";
    if (t === "svg+xml") return "svg";
    return t;
  }
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/plain") return "txt";
  return "";
}

function safeExt(name = "") {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/* ========== SOLD counters ========== */
async function bumpSoldSingle(env, pid, qty){
  try{
    const id = String(pid||'').trim();
    const add = Math.max(1, Number(qty||1));
    if (!id) return;
    const key = `PRODUCT:${id}`;
    const raw = await env.PRODUCTS.get(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    const curr = Number(p.sold||0) || 0;
    p.sold = curr + add;
    p.updatedAt = new Date().toISOString();
    await env.PRODUCTS.put(key, JSON.stringify(p));
  }catch(_){}
}
async function bumpSoldCounters(env, items, fallbackProductId, fallbackQty){
  try{
    if (Array.isArray(items) && items.length){
      for (const it of items){
        const pid = it && (it.productId || it.id);
        const q   = it && (it.qty || it.quantity || 1);
        await bumpSoldSingle(env, pid, q);
      }
      return;
    }
    // fallback single
    if (fallbackProductId){
      await bumpSoldSingle(env, fallbackProductId, fallbackQty || 1);
    }
  }catch(_){}
}
async function decSoldSingle(env, pid, qty){
  try{
    const id = String(pid||'').trim();
    const dec = Math.max(1, Number(qty||1));
    if (!id) return;
    const key = `PRODUCT:${id}`;
    const raw = await env.PRODUCTS.get(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    const curr = Number(p.sold||0) || 0;
    p.sold = Math.max(0, curr - dec);
    p.updatedAt = new Date().toISOString();
    await env.PRODUCTS.put(key, JSON.stringify(p));
  }catch(_){}
}
async function decSoldCounters(env, items, fallbackProductId, fallbackQty){
  try{
    if (Array.isArray(items) && items.length){
      for (const it of items){
        const pid = it && (it.productId || it.id);
        const q   = it && (it.qty || it.quantity || 1);
        await decSoldSingle(env, pid, q);
      }
      return;
    }
    if (fallbackProductId){
      await decSoldSingle(env, fallbackProductId, fallbackQty || 1);
    }
  }catch(_){}
}

/* ========== STOCK decrement helpers ========== */
function cleanVariantName(s){
  if (!s) return '';
  // 去掉變體名字尾端的加價資訊：例如 （+200）或(+200)
  return String(s).replace(/（\+[^）]*）/g,'').replace(/\(\+[^)]*\)/g,'').trim();
}
async function decStockSingle(env, pid, variantName, qty){
  try{
    const id = String(pid||'').trim();
    const dec = Math.max(1, Number(qty||1));
    if (!id) return;
    const key = `PRODUCT:${id}`;
    const raw = await env.PRODUCTS.get(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    let touched = false;

    // 1) 以變體庫存為主（若有）
    const vn = cleanVariantName(variantName);
    if (Array.isArray(p.variants) && p.variants.length){
      let idx = -1;
      if (vn){
        idx = p.variants.findIndex(v => cleanVariantName(v?.name) === vn);
      }
      // 未指定變體但只有一個變體 → 視為該變體
      if (idx < 0 && p.variants.length === 1) idx = 0;
      if (idx >= 0){
        const v = p.variants[idx];
        const curr = Number(v.stock||0) || 0;
        v.stock = Math.max(0, curr - dec);
        touched = true;
      }
    }

    // 2) 若沒有變體或找不到對應變體，但產品有頂層 stock，就扣頂層
    if (!touched && typeof p.stock !== 'undefined'){
      const curr = Number(p.stock||0) || 0;
      p.stock = Math.max(0, curr - dec);
      touched = true;
    }

    if (touched){
      p.updatedAt = new Date().toISOString();
      await env.PRODUCTS.put(key, JSON.stringify(p));
    }
  }catch(_){}
}
async function decStockCounters(env, items, fallbackProductId, fallbackVariantName, fallbackQty){
  try{
    if (Array.isArray(items) && items.length){
      for (const it of items){
        const pid = it && (it.productId || it.id);
        const vn  = it && (it.variantName || it.variant || '');
        const q   = it && (it.qty || it.quantity || 1);
        await decStockSingle(env, pid, vn, q);
      }
      return;
    }
    // 單品備援
    if (fallbackProductId){
      await decStockSingle(env, fallbackProductId, fallbackVariantName || '', fallbackQty || 1);
    }
  }catch(_){}
}

async function incStockSingle(env, pid, variantName, qty){
  try{
    const id = String(pid||'').trim();
    const inc = Math.max(1, Number(qty||1));
    if (!id) return;
    const key = `PRODUCT:${id}`;
    const raw = await env.PRODUCTS.get(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    let touched = false;

    const vn = cleanVariantName(variantName);
    if (Array.isArray(p.variants) && p.variants.length){
      let idx = -1;
      if (vn){
        idx = p.variants.findIndex(v => cleanVariantName(v?.name) === vn);
      }
      if (idx < 0 && p.variants.length === 1) idx = 0;
      if (idx >= 0){
        const v = p.variants[idx];
        if (v.stock !== undefined && v.stock !== null){
          const curr = Number(v.stock||0) || 0;
          v.stock = curr + inc;
          touched = true;
        }
      }
    }

    if (!touched && typeof p.stock !== 'undefined'){
      const curr = Number(p.stock||0) || 0;
      p.stock = curr + inc;
      touched = true;
    }

    if (touched){
      p.updatedAt = new Date().toISOString();
      await env.PRODUCTS.put(key, JSON.stringify(p));
    }
  }catch(_){}
}
async function restoreStockCounters(env, items, fallbackProductId, fallbackVariantName, fallbackQty){
  try{
    if (Array.isArray(items) && items.length){
      for (const it of items){
        const pid = it && (it.productId || it.id);
        const vn  = it && (it.variantName || it.variant || '');
        const q   = it && (it.qty || it.quantity || 1);
        await incStockSingle(env, pid, vn, q);
      }
      return;
    }
    if (fallbackProductId){
      await incStockSingle(env, fallbackProductId, fallbackVariantName || '', fallbackQty || 1);
    }
  }catch(_){}
}

/* ========== /api/stories ========== */
async function listStories(url, env){
  const code = (url.searchParams.get("code")||"").toUpperCase();
  if (!code) return withCORS(json({ok:false, error:"Missing code"}, 400));
  const idxRaw = await env.STORIES.get(`IDX:${code}`);
  const ids = idxRaw ? JSON.parse(idxRaw) : [];
  const items = [];
  for (const id of ids.slice(0, 120)){
    const raw = await env.STORIES.get(`STORY:${id}`);
    if (!raw) continue;
    try{ items.push(JSON.parse(raw)); }catch{}
  }
  items.sort((a,b)=> new Date(b.ts||0) - new Date(a.ts||0));
  return withCORS(json({ok:true, items}));
}

function normalizeStoryImageUrl(raw, requestUrl, env){
  const val = String(raw || '').trim();
  if (!val) return '';
  if (val.length > 500) return '';
  if (val.startsWith('/api/file/') || val.startsWith('/api/proof/')) return val;
  let base = '';
  try{ base = new URL(requestUrl).origin; }catch(_){}
  let url = null;
  try{
    url = base ? new URL(val, base) : new URL(val);
  }catch(_){
    return '';
  }
  const protocol = String(url.protocol || '').toLowerCase();
  if (protocol !== 'https:' && protocol !== 'http:') return '';
  const allow = new Set();
  const addOrigin = (input)=>{
    if (!input) return;
    try{
      const u = input.startsWith('http') ? new URL(input) : new URL(`https://${input}`);
      allow.add(u.origin);
    }catch(_){}
  };
  if (base) allow.add(base);
  addOrigin(env?.SITE_URL);
  addOrigin(env?.PUBLIC_SITE_URL);
  addOrigin(env?.PUBLIC_ORIGIN);
  addOrigin(env?.R2_PUBLIC_URL);
  addOrigin(env?.FILE_HOST);
  addOrigin(env?.PUBLIC_FILE_HOST);
  const extra = (env?.STORY_IMAGE_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
  extra.forEach(addOrigin);
  if (!allow.has(url.origin)) return '';
  return url.toString();
}

async function maybeSendStoryEmail(env, item, requestUrl){
  const result = { ok:false, skipped:false, error:'' };
  try{
    const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
    const fromDefault = (env.STORY_EMAIL_FROM || env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
    const toList = (env.STORY_NOTIFY_EMAIL || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
    const fallbackTo = 'bkkaiwei@gmail.com';
    const finalTo = Array.from(new Set([fallbackTo, ...toList]));
    if (!apiKey || !fromDefault || !finalTo.length) {
      result.skipped = true;
      console.log('[mail] story notify skipped', { hasApiKey: !!apiKey, fromDefault, toCount: finalTo.length });
      return result;
    }
    const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
    let origin = '';
    try{ origin = new URL(requestUrl).origin; }catch(_){}
    const base = (env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://shop.unalomecodes.com').replace(/\/$/, '');
    const adminLink = `${base}/admin/code-viewer.html?code=${encodeURIComponent(item.code || '')}`;
    const nick = String(item.nick || '訪客').trim();
    const msg = String(item.msg || '').trim();
    const ts = item.ts ? new Date(item.ts).toLocaleString('zh-TW', { hour12:false }) : '';
    const imageHost = env.EMAIL_IMAGE_HOST || env.FILE_HOST || env.PUBLIC_FILE_HOST || base;
    const imgUrl = item.imageUrl ? rewriteEmailImageUrl(item.imageUrl, imageHost) : '';
    const esc = (val)=>{
      const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
      return String(val || '').replace(/[&<>"']/g, m => map[m] || m);
    };
    const subject = `[${siteName}] 新留言通知：${nick}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px;background:#f5f7fb;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
          <p style="margin:0 0 12px;font-weight:700;font-size:18px;">${esc(siteName)}</p>
          <p>收到一則新的商品留言：</p>
          <div style="padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
            <p style="margin:0 0 6px;"><strong>留言人：</strong>${esc(nick)}</p>
            ${ts ? `<p style="margin:0 0 6px;"><strong>時間：</strong>${esc(ts)}</p>` : ''}
            <p style="margin:0 0 6px;"><strong>代碼：</strong>${esc(item.code || '')}</p>
            <p style="margin:0;"><strong>內容：</strong><br>${esc(msg)}</p>
          </div>
          ${imgUrl ? `<div style="margin-top:14px;"><a href="${esc(imgUrl)}" target="_blank" rel="noopener">查看留言圖片</a></div>` : ''}
          <div style="margin-top:16px;">
            <a href="${esc(adminLink)}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 14px;border-radius:999px;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:13px;">前往留言管理</a>
          </div>
        </div>
      </div>
    `;
    const text = [
      `${siteName} 新留言通知`,
      `留言人：${nick}`,
      ts ? `時間：${ts}` : '',
      `代碼：${item.code || ''}`,
      `內容：${msg}`,
      imgUrl ? `圖片：${imgUrl}` : '',
      `管理連結：${adminLink}`
    ].filter(Boolean).join('\n');
    const sender = (typeof sendEmailMessage === 'function')
      ? (msg)=> sendEmailMessage(env, msg)
      : async (msg)=>{
          const endpoint = (env.RESEND_ENDPOINT || 'https://api.resend.com/emails').trim() || 'https://api.resend.com/emails';
          const replyTo = msg.replyTo || 'bkkaiwei@gmail.com';
          const payload = {
            from: msg.from || fromDefault,
            to: Array.isArray(msg.to) ? msg.to : [msg.to].filter(Boolean),
            subject: msg.subject || 'Order Notification',
            html: msg.html || undefined,
            text: msg.text || undefined
          };
          if (replyTo) payload.reply_to = replyTo;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const errText = await res.text().catch(()=> '');
            throw new Error(`Email API ${res.status}: ${errText || res.statusText}`);
          }
          try{ return await res.json(); }catch(_){ return {}; }
        };
    await sender({
      from: fromDefault,
      to: finalTo,
      subject,
      html,
      text
    });
    result.ok = true;
    return result;
  }catch(err){
    console.error('[mail] story notify failed', err);
    result.error = String(err && err.message || err);
    return result;
  }
}

async function createStory(request, env){
  try{
    const reqUrl = new URL(request.url);
    const originHeader = (request.headers.get('Origin') || '').trim();
    if (originHeader){
      const allow = new Set([reqUrl.origin]);
      const addOrigin = (val)=>{
        if (!val) return;
        try{
          const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
          allow.add(u.origin);
        }catch(_){}
      };
      addOrigin(env.SITE_URL);
      const extraOrigins = (env.STORY_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
      extraOrigins.forEach(addOrigin);
      if (!allow.has(originHeader)) {
        return withCORS(json({ ok:false, error:"Forbidden origin" }, 403));
      }
    }
    const body = await request.json();
    const code = String((body.code||"").toUpperCase());
    const nick = String(body.nick||"訪客").slice(0, 20);
    const msg  = String(body.msg||"").trim();
    const imageUrlRaw = String(body.imageUrl || "").trim();
    const imageUrl = normalizeStoryImageUrl(imageUrlRaw, request.url, env);
    if (!code) return withCORS(json({ok:false, error:"Missing code"}, 400));
    if (!msg || msg.length < 2) return withCORS(json({ok:false, error:"Message too short"}, 400));
    if (msg.length > 800) return withCORS(json({ok:false, error:"Message too long"}, 400));
    if (imageUrlRaw && !imageUrl) return withCORS(json({ ok:false, error:"Invalid imageUrl" }, 400));
    try{
      const ipRaw = (request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').toString();
      const ip = ipRaw.split(',')[0].trim();
      if (ip){
        const rlKey = `RL:${code}:${ip}`;
        const lastRaw = await env.STORIES.get(rlKey);
        const nowTs = Date.now();
        const lastTs = Number(lastRaw || 0) || 0;
        if (nowTs - lastTs < 15000){
          return withCORS(json({ ok:false, error:"Too many requests" }, 429));
        }
        await env.STORIES.put(rlKey, String(nowTs), { expirationTtl: 120 });
      }
    }catch(_){}
    const now = new Date().toISOString();
    const id = `${code}:${now}:${crypto.randomUUID()}`;
    const item = { id, code, nick, msg, ts: now, imageUrl: imageUrl || undefined };
    await env.STORIES.put(`STORY:${id}`, JSON.stringify(item));
    const idxKey = `IDX:${code}`;
    const idxRaw = await env.STORIES.get(idxKey);
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    ids.unshift(id);
    if (ids.length > 300) ids.length = 300;
    await env.STORIES.put(idxKey, JSON.stringify(ids));
    const mail = await maybeSendStoryEmail(env, item, request.url);
    return withCORS(json({ok:true, item, mail}));
  }catch(e){
    return withCORS(json({ok:false, error:String(e)}, 500));
  }
}

/* ========== /api/stories: DELETE (single or bulk) ========== */
// Modes:
//   A) ?code=XXXX&id=STORYID -> delete single story
//   B) ?code=XXXX            -> delete all stories under this code (capped at 200)
async function deleteStories(url, env){
  const code = (url.searchParams.get("code")||"").toUpperCase();
  const id   = url.searchParams.get("id") || "";
  if (!code) return withCORS(json({ ok:false, error:"Missing code" }, 400));

  const idxKey = `IDX:${code}`;
  const idxRaw = await env.STORIES.get(idxKey);
  const ids = idxRaw ? JSON.parse(idxRaw) : [];

  if (id) {
    // delete single item
    await env.STORIES.delete(`STORY:${id}`);
    const next = ids.filter(x => x !== id);
    await env.STORIES.put(idxKey, JSON.stringify(next));
    return withCORS(json({ ok:true, deleted: 1 }));
  }

  // bulk delete (cap to avoid long-running)
  let n = 0;
  for (const sid of ids.slice(0, 200)) {
    await env.STORIES.delete(`STORY:${sid}`);
    n++;
  }
  await env.STORIES.put(idxKey, JSON.stringify([]));
  return withCORS(json({ ok:true, deleted: n }));
}



/* ========== /api/img (Image resize proxy) ========== */
async function resizeImage(url, env, origin){
  try{
    const u = url.searchParams.get("u") || "";
    const key = url.searchParams.get("key") || "";
    const w = Math.max(1, Math.min(4096, Number(url.searchParams.get("w")||800)|0));
    const q = Math.max(10, Math.min(95, Number(url.searchParams.get("q")||75)|0));
    const fmt = (url.searchParams.get("fmt")||"webp").toLowerCase(); // webp/avif/jpg/png

    let target = u;
    if (!target && key){
      const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://shop.unalomecodes.com';
      const base = publicHost.startsWith('http') ? publicHost.replace(/\/+$/,'') : `https://${publicHost.replace(/\/+$/,'')}`;
      target = `${base}/api/file/${encodeURIComponent(key)}`;
    }
    if (!target) return withCORS(json({ok:false, error:"Missing u or key"}, 400));

    let targetUrl;
    try {
      targetUrl = new URL(target, origin);
    } catch (_) {
      return withCORS(json({ ok:false, error:"Invalid target url" }, 400));
    }
    if (!/^https?:$/.test(targetUrl.protocol)) {
      return withCORS(json({ ok:false, error:"Invalid target protocol" }, 400));
    }
    const allowHosts = new Set();
    const addHost = (val)=>{
      if (!val) return;
      try{
        const u0 = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
        if (u0.host) allowHosts.add(u0.host);
      }catch(_){}
    };
    addHost(origin);
    addHost(env.FILE_HOST);
    addHost(env.PUBLIC_FILE_HOST);
    addHost(env.SITE_URL);
    const extraHosts = (env.IMG_PROXY_HOSTS || env.IMG_PROXY_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);
    extraHosts.forEach(addHost);
    if (allowHosts.size && !allowHosts.has(targetUrl.host)) {
      return withCORS(json({ ok:false, error:"Target host not allowed" }, 400));
    }

    const req = new Request(targetUrl.toString(), {
      headers: { 'Accept': 'image/*' },
      cf: { image: { width: w, quality: q, fit: 'scale-down', format: fmt } }
    });
    const resp = await fetch(req);
    // add long cache
    const h = new Headers(resp.headers);
    h.set('Cache-Control', 'public, max-age=31536000, immutable');
    h.set('Access-Control-Allow-Origin','*');
    return new Response(resp.body, { status: resp.status, headers: h });
  }catch(e){
    return withCORS(json({ok:false, error:String(e)}, 500));
  }
}

// Helper: tolerant phone and last5 match functions
function matchPhone(candidate, query) {
  if (!candidate || !query) return false;
  return normalizePhone(candidate) === normalizePhone(query);
}
function matchLast5(candidate, query) {
  if (!candidate || !query) return false;
  return String(candidate).replace(/\D/g,'').slice(-5) === String(query).replace(/\D/g,'').slice(-5);
}
