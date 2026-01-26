const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
  'Cache-Control': 'no-store'
};

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
    let mailStatus = { customer: null, admin: null, booking: null };
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

function decodeHtmlEntities(val){
  return String(val || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractMetaImage(html){
  const text = String(html || '');
  const patterns = [
    /property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image:secure_url["']/i,
    /name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+name=["']twitter:image["']/i
  ];
  for (const re of patterns){
    const m = text.match(re);
    if (m && m[1]) return decodeHtmlEntities(m[1]);
  }
  return '';
}

function normalizeInstagramPostUrl(raw){
  const input = String(raw || '').trim();
  if (!input) return '';
  try{
    const u = new URL(input);
    const host = (u.hostname || '').toLowerCase();
    if (!host.endsWith('instagram.com')) return '';
    if (!/^\/(p|reel|tv)\//.test(u.pathname)) return '';
    u.search = '';
    u.hash = '';
    return u.origin + u.pathname;
  }catch(_){
    return '';
  }
}

export {
  jsonHeaders,
  resolveOrderIndexLimit,
  trimOrderIndex,
  resolveCorsOrigin,
  jsonHeadersFor,
  isAllowedOrigin,
  getClientIp,
  checkRateLimit,
  maskName,
  maskPhone,
  maskEmail,
  decodeHtmlEntities,
  extractMetaImage,
  normalizeInstagramPostUrl
};
