// functions/[[path]].handler.js
import {
  getMahaTaksa,
  getThaiDayColor,
  toWeekdayKey,
  deriveTabooColor
} from '../lib/mahataksa.js';
import { getYamUbakong } from '../lib/ubakong.js';
import { createSplitHandler } from './_handlers/index.js';
const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
  'Cache-Control': 'no-store'
};

const FOODS_LIST_TTL = 60 * 1000;
const FOODS_LIST_KV_TTL = 60 * 10;
const FOODS_LIST_KEY = 'FOODS:LIST';
const FOODS_LIST_CACHE = { ts: 0, items: null };
const TEMPLES_LIST_TTL = 60 * 1000;
const TEMPLES_LIST_KV_TTL = 60 * 10;
const TEMPLES_LIST_KEY = 'TEMPLES:LIST';
const TEMPLES_LIST_CACHE = { ts: 0, items: null };

const ORDER_INDEX_KEY = 'ORDER_INDEX';
const ORDER_ID_PREFIX = 'OD';
const ORDER_ID_LEN = 10;
const SERVICE_ORDER_ID_PREFIX = 'SV';
const SERVICE_ORDER_ID_LEN = 10;
const FORTUNE_FORMAT_VERSION = '2.0.0';
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

async function findOrderByIdForQna(env, orderId){
  const id = String(orderId || '').trim();
  if (!id) return null;
  const candidates = [];
  if (env.ORDERS) candidates.push({ store: env.ORDERS, type: 'physical' });
  if (env.SERVICE_ORDERS && env.SERVICE_ORDERS !== env.ORDERS) {
    candidates.push({ store: env.SERVICE_ORDERS, type: 'service' });
  }
  if (env.SERVICE_ORDERS && env.SERVICE_ORDERS === env.ORDERS) {
    candidates.push({ store: env.SERVICE_ORDERS, type: 'service' });
  }
  for (const entry of candidates){
    if (!entry.store) continue;
    try{
      const raw = await entry.store.get(id);
      if (!raw) continue;
      const order = JSON.parse(raw);
      const derivedType = String(order?.type || '').toLowerCase() === 'service' ? 'service' : entry.type;
      return { order, store: entry.store, type: derivedType };
    }catch(_){}
  }
  return null;
}

function orderBelongsToUser(order, record){
  if (!order || !record) return false;
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
}

function sanitizeQnaItem(item){
  return {
    id: item.id,
    role: item.role,
    text: item.text,
    ts: item.ts,
    updatedAt: item.updatedAt || undefined,
    edited: item.edited === true,
    name: item.name || ''
  };
}

async function loadOrderQna(store, orderId){
  if (!store) return [];
  try{
    const raw = await store.get(`QNA:${orderId}`);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  }catch(_){
    return [];
  }
}

async function saveOrderQna(store, orderId, items){
  if (!store) return;
  const list = Array.isArray(items) ? items.slice(0, 200) : [];
  await store.put(`QNA:${orderId}`, JSON.stringify(list));
}

async function maybeSendOrderQnaEmail(env, opts){
  const result = { ok:false, skipped:false, error:'' };
  try{
    const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
    const fromDefault = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
    const toList = Array.isArray(opts.to) ? opts.to.filter(Boolean) : [opts.to].filter(Boolean);
    if (!apiKey || !fromDefault || !toList.length){
      result.skipped = true;
      return result;
    }
    const esc = (val)=>{
      const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
      return String(val || '').replace(/[&<>"']/g, m => map[m] || m);
    };
    const sender = (typeof sendEmailMessage === 'function')
      ? (msg)=> sendEmailMessage(env, msg)
      : async (msg)=>{
          const endpoint = (env.RESEND_ENDPOINT || 'https://api.resend.com/emails').trim() || 'https://api.resend.com/emails';
          const replyTo = msg.replyTo || 'bkkaiwei@gmail.com';
          const payload = {
            from: msg.from || fromDefault,
            to: Array.isArray(msg.to) ? msg.to : [msg.to].filter(Boolean),
            subject: msg.subject || 'Order Q&A',
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
      to: toList,
      subject: opts.subject || 'Order Q&A',
      html: opts.html || undefined,
      text: opts.text || undefined,
      replyTo: opts.replyTo || undefined
    });
    result.ok = true;
    return result;
  }catch(err){
    result.error = String(err && err.message || err);
    return result;
  }
}

function getQnaMetaStore(env, fallback){
  return env.QNA_META || env.ORDERS || env.SERVICE_ORDERS || fallback || null;
}

async function getAdminQnaUnread(env, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store) return 0;
  try{
    const raw = await store.get('QNA_META:ADMIN_UNREAD');
    const num = Number(raw || 0);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  }catch(_){
    return 0;
  }
}

async function incrementAdminQnaUnread(env, fallback, delta){
  const store = getQnaMetaStore(env, fallback);
  if (!store) return 0;
  const add = Number(delta || 1) || 1;
  const current = await getAdminQnaUnread(env, store);
  const next = Math.max(0, current + add);
  try{
    await store.put('QNA_META:ADMIN_UNREAD', String(next));
  }catch(_){}
  return next;
}

async function clearAdminQnaUnread(env, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store) return 0;
  try{
    await store.put('QNA_META:ADMIN_UNREAD', '0');
  }catch(_){}
  return 0;
}

function userUnreadKey(userId){
  return `QNA_USER_UNREAD:${userId}`;
}

function userOrderUnreadKey(userId, orderId){
  return `QNA_USER_ORDER_UNREAD:${userId}:${orderId}`;
}

async function getUserUnreadTotal(env, userId, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store || !userId) return 0;
  try{
    const raw = await store.get(userUnreadKey(userId));
    const num = Number(raw || 0);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  }catch(_){
    return 0;
  }
}

async function getUserUnreadForOrder(env, userId, orderId, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store || !userId || !orderId) return 0;
  try{
    const raw = await store.get(userOrderUnreadKey(userId, orderId));
    const num = Number(raw || 0);
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  }catch(_){
    return 0;
  }
}

async function incrementUserUnreadForOrder(env, userId, orderId, delta, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store || !userId || !orderId) return 0;
  const add = Number(delta || 1) || 1;
  const total = await getUserUnreadTotal(env, userId, store);
  const orderCount = await getUserUnreadForOrder(env, userId, orderId, store);
  const nextTotal = Math.max(0, total + add);
  const nextOrder = Math.max(0, orderCount + add);
  try{
    await store.put(userUnreadKey(userId), String(nextTotal));
    await store.put(userOrderUnreadKey(userId, orderId), String(nextOrder));
  }catch(_){}
  return nextTotal;
}

async function findUserIdByEmail(env, email){
  const val = String(email || '').trim().toLowerCase();
  if (!val) return '';
  const store = getUserStore(env);
  if (!store || !store.list) return '';
  try{
    const iter = await store.list({ prefix:'USER:' });
    for (const key of (iter.keys || [])){
      if (!key || !key.name) continue;
      try{
        const raw = await store.get(key.name);
        if (!raw) continue;
        const obj = JSON.parse(raw);
        const e = String(obj && obj.email || '').trim().toLowerCase();
        if (e && e === val){
          return String(obj.id || key.name.replace(/^USER:/,'')).trim();
        }
      }catch(_){}
    }
  }catch(_){}
  return '';
}

async function clearUserUnreadForOrder(env, userId, orderId, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store || !userId || !orderId) return 0;
  const total = await getUserUnreadTotal(env, userId, store);
  const orderCount = await getUserUnreadForOrder(env, userId, orderId, store);
  const nextTotal = Math.max(0, total - orderCount);
  try{
    await store.put(userUnreadKey(userId), String(nextTotal));
    await store.put(userOrderUnreadKey(userId, orderId), '0');
  }catch(_){}
  return nextTotal;
}

async function clearUserUnreadAll(env, userId, fallback){
  const store = getQnaMetaStore(env, fallback);
  if (!store || !userId) return 0;
  try{
    await store.put(userUnreadKey(userId), '0');
  }catch(_){}
  if (store.list){
    try{
      const prefix = `QNA_USER_ORDER_UNREAD:${userId}:`;
      const iter = await store.list({ prefix });
      for (const key of (iter.keys || [])){
        if (key && key.name){
          await store.put(key.name, '0');
        }
      }
    }catch(_){}
  }
  return 0;
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
function getAdminSecret(env){
  try{
    return env.ADMIN_JWT_SECRET || env.SESSION_SECRET || '';
  }catch(_){
    return '';
  }
}
async function getAdminSession(request, env){
  if (!env) return null;
  const secret = getAdminSecret(env);
  if (!secret) return null;
  const cookies = parseCookies(request);
  const token = cookies.admin_session || '';
  if (!token) return null;
  try{
    const payload = await verifySessionToken(token, secret);
    if (!payload) return null;
    const email = (payload.email || '').toLowerCase();
    if (!email) return null;
    const allowed = parseAdminEmails(env);
    if (allowed.length && !allowed.includes(email)) return null;
    return payload;
  }catch(_){ return null; }
}

function getAdminRoleFromMap(email, env){
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return '';
  const raw = String(env && env.ADMIN_ROLE_MAP || '').trim();
  if (!raw) return '';
  // Format: "email1:role1,email2:role2"
  const pairs = raw.split(',').map(s=>s.trim()).filter(Boolean);
  for (const pair of pairs){
    const idx = pair.indexOf(':');
    if (idx === -1) continue;
    const e = pair.slice(0, idx).trim().toLowerCase();
    const role = pair.slice(idx + 1).trim();
    if (!e || !role) continue;
    if (e === normalizedEmail) return role;
  }
  return '';
}

async function getAdminRole(email, env){
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return '';
  const kv = env && env.ADMIN_ROLE_KV;
  if (kv){
    try{
      const kvRole = await kv.get(`admin:role:${normalizedEmail}`);
      if (kvRole) return String(kvRole).trim();
    }catch(_){}
  }
  const envRole = getAdminRoleFromMap(normalizedEmail, env);
  if (envRole) return envRole;
  if (!String(env && env.ADMIN_ROLE_MAP || '').trim() && !kv){
    return 'owner';
  }
  return '';
}

function getAdminPermissions(role){
  const r = String(role || '').trim().toLowerCase();
  if (r === 'owner'){
    return ['*'];
  }
  if (r === 'fulfillment'){
    return ['orders.view','orders.status_update','orders.qna.view','proof.view','service_orders.result_upload'];
  }
  if (r === 'booking'){
    return ['slots.view','slots.manage'];
  }
  // default deny for unknown/empty roles
  return [];
}
function normalizeRole(role){
  return String(role || '').trim().toLowerCase();
}
function sanitizePermissionsForRole(role, perms){
  const r = normalizeRole(role);
  const list = Array.isArray(perms) ? perms.map(p=>String(p || '').trim()).filter(Boolean) : [];
  if (r === 'owner'){
    return ['*'];
  }
  if (r === 'booking'){
    const allow = new Set(['slots.view','slots.manage']);
    return list.filter(p => allow.has(p));
  }
  if (r === 'fulfillment'){
    const allow = new Set(['orders.view','orders.status_update','orders.qna.view','proof.view','service_orders.result_upload']);
    return list.filter(p => allow.has(p));
  }
  if (r === 'custom'){
    return list.filter(p => p !== '*');
  }
  return [];
}
async function getAdminPermissionsForEmail(email, env, roleOverride){
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const role = roleOverride || await getAdminRole(normalizedEmail, env);
  if (!role) return [];
  if (String(role).trim().toLowerCase() === 'owner'){
    return ['*'];
  }
  if (String(role).trim().toLowerCase() === 'fulfillment'){
    return getAdminPermissions(role);
  }
  const kv = env && env.ADMIN_ROLE_KV;
  if (kv && normalizedEmail){
    try{
      const raw = await kv.get(`admin:perms:${normalizedEmail}`);
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) return list.filter(Boolean);
    }catch(_){}
  }
  return getAdminPermissions(role);
}

async function hasAdminPermission(adminSession, env, perm){
  if (!adminSession || !adminSession.email) return true;
  const perms = await getAdminPermissionsForEmail(adminSession.email, env);
  if (!Array.isArray(perms) || !perms.length) return false;
  if (perms.includes('*')) return true;
  return perms.includes(perm);
}

async function isOwnerAdmin(request, env){
  if (!(await isAdmin(request, env))) return false;
  const adminSession = await getAdminSession(request, env);
  if (!adminSession || !adminSession.email) return true;
  const role = await getAdminRole(adminSession.email, env);
  return role === 'owner';
}

async function requireAdminPermission(request, env, perm){
  if (!(await isAdmin(request, env))) {
    return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
  }
  const adminSession = await getAdminSession(request, env);
  if (!adminSession || !adminSession.email) return null; // admin key full access
  const allowed = await hasAdminPermission(adminSession, env, perm);
  if (!allowed){
    return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  return null;
}
async function requireAdminSlotsManage(request, env){
  const guard = await requireAdminWrite(request, env);
  if (guard) return guard;
  const adminSession = await getAdminSession(request, env);
  if (!adminSession || !adminSession.email) return null;
  const role = await getAdminRole(adminSession.email, env);
  if (role === 'owner') return null;
  const allowed = await hasAdminPermission(adminSession, env, 'slots.manage');
  if (!allowed){
    return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  return null;
}
async function isAdmin(request, env){
  try{
    const fromCookie = await getAdminSession(request, env);
    if (fromCookie) return true;
    const key = (request.headers.get('x-admin-key') || request.headers.get('X-Admin-Key') || '').trim();
    return !!(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
  }catch(e){ return false; }
}
function normalizeEmail(val){
  return String(val || '').trim().toLowerCase();
}
async function getBookingNotifyFlag(email, env){
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const kv = env && env.ADMIN_ROLE_KV;
  if (!kv) return false;
  try{
    const raw = await kv.get(`admin:notify_booking:${normalizedEmail}`);
    return raw === '1' || raw === 'true';
  }catch(_){}
  return false;
}
async function setBookingNotifyFlag(email, enabled, env){
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  const kv = env && env.ADMIN_ROLE_KV;
  if (!kv) return;
  try{
    if (enabled){
      await kv.put(`admin:notify_booking:${normalizedEmail}`, '1');
    }else{
      await kv.delete(`admin:notify_booking:${normalizedEmail}`);
    }
  }catch(_){}
}
async function getBookingNotifyEmails(env){
  const kv = env && env.ADMIN_ROLE_KV;
  if (!kv) return [];
  let list = [];
  try{
    const raw = await kv.get('admin:role:index');
    list = raw ? (JSON.parse(raw) || []) : [];
  }catch(_){}
  if (!Array.isArray(list) || !list.length) return [];
  const out = [];
  const bookingAll = [];
  for (const item of list){
    const email = normalizeEmail(item);
    if (!email) continue;
    const role = await getAdminRole(email, env);
    if (String(role || '').trim().toLowerCase() !== 'booking') continue;
    bookingAll.push(email);
    let raw = '';
    try{ raw = await kv.get(`admin:notify_booking:${email}`) || ''; }catch(_){}
    if (raw === '1' || raw === 'true') out.push(email);
  }
  if (out.length) return Array.from(new Set(out));
  return Array.from(new Set(bookingAll));
}
function getPhoneConsultConfig(env){
  const modeRaw = String(env?.PHONE_CONSULT_LAUNCH_MODE || 'admin').trim().toLowerCase();
  const mode = (modeRaw === 'public' || modeRaw === 'allowlist' || modeRaw === 'admin') ? modeRaw : 'admin';
  const serviceId = String(env?.PHONE_CONSULT_SERVICE_ID || '').trim();
  const allowlistRaw = String(env?.PHONE_CONSULT_ALLOWLIST || '').trim();
  return { mode, serviceId, allowlistRaw };
}
function isPhoneConsultServiceRecord(svc, serviceId, env){
  if (!svc) return false;
  const cfg = getPhoneConsultConfig(env || {});
  if (cfg.serviceId && serviceId && cfg.serviceId === serviceId) return true;
  const metaType = String((svc.meta && svc.meta.type) || '').trim().toLowerCase();
  if (metaType === 'phone_consult') return true;
  const hay = `${svc.name || ''} ${svc.desc || ''}`.toLowerCase();
  return /phone|電話|consult|占卜|算命/.test(hay);
}
function parsePromoTime(raw){
  if (!raw) return 0;
  const val = String(raw || '').trim();
  if (!val) return 0;
  const normalized = val.replace(/\//g, '-');
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!hasTz && match){
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const hh = Number(match[4] || 0);
    const mm = Number(match[5] || 0);
    const ss = Number(match[6] || 0);
    const ms = Date.UTC(y, m - 1, d, hh - 7, mm, ss);
    return Number.isFinite(ms) ? ms : 0;
  }
  const dt = new Date(normalized);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : 0;
}
function getPhoneConsultPromoInfo(svc){
  const promo = (svc && svc.meta && svc.meta.promo) ? svc.meta.promo : {};
  const price = Number((promo && (promo.promoPrice ?? promo.price)) || 0);
  const startMs = parsePromoTime(promo && (promo.promoStart || promo.start || ''));
  const endMs = parsePromoTime(promo && (promo.promoEnd || promo.end || ''));
  return { price, startMs, endMs };
}
function isPromoActive(info, nowMs){
  if (!info || !Number.isFinite(info.price) || info.price <= 0) return false;
  if (info.startMs && nowMs < info.startMs) return false;
  if (info.endMs && nowMs > info.endMs) return false;
  return true;
}
function resolvePhoneConsultOptionPrices(options, basePrice){
  let en = 0;
  let zh = 0;
  if (Array.isArray(options)){
    for (const opt of options){
      if (!opt) continue;
      const name = String(opt.name || '').toLowerCase();
      const price = Number(opt.price || 0);
      if (!en && /英文|english|en/.test(name)) en = price;
      if (!zh && /中文|chinese|zh/.test(name)) zh = price;
    }
  }
  const base = (Number.isFinite(en) && en > 0) ? en : (Number.isFinite(basePrice) ? basePrice : 0);
  return { base, en: en || base, zh };
}
function isZhOption(opt, prices){
  const name = String(opt?.name || '').toLowerCase();
  if (/中文|chinese|zh/.test(name)) return true;
  const price = Number(opt?.price || 0);
  return !!(prices && prices.zh > 0 && price === prices.zh);
}
function isEnOption(opt, prices){
  const name = String(opt?.name || '').toLowerCase();
  if (/英文|english|en/.test(name)) return true;
  const price = Number(opt?.price || 0);
  return !!(prices && prices.en > 0 && price === prices.en);
}
function getPhoneConsultTotalForOption(opt, prices){
  if (!prices) return Number(opt?.price || 0) || 0;
  if (isZhOption(opt, prices) && prices.zh > 0){
    return prices.base + (prices.zh - prices.base);
  }
  if (isEnOption(opt, prices)){
    return prices.base;
  }
  const price = Number(opt?.price || 0);
  return price > 0 ? price : prices.base;
}
function getPhoneConsultPromoTotalForOption(opt, prices, promoBase){
  if (!Number.isFinite(promoBase) || promoBase <= 0) return 0;
  if (isZhOption(opt, prices) && prices.zh > 0){
    const delta = prices.zh - prices.base;
    return promoBase + Math.max(0, delta);
  }
  if (isEnOption(opt, prices)){
    return promoBase;
  }
  return promoBase;
}
function isPhoneConsultOrder(order, env){
  if (!order) return false;
  const cfg = getPhoneConsultConfig(env || {});
  if (cfg.serviceId && order.serviceId && cfg.serviceId === order.serviceId) return true;
  const name = String(order.serviceName || '').toLowerCase();
  return /phone|電話|consult|占卜|算命/.test(name);
}
const CONSULT_STAGE_LABELS = {
  payment_pending: { zh:'訂單成立待確認付款', en:'Payment pending confirmation' },
  payment_confirmed: { zh:'已確認付款，預約中', en:'Payment confirmed, scheduling' },
  appointment_confirmed: { zh:'已完成預約', en:'Booking confirmed' },
  done: { zh:'已完成訂單', en:'Order completed' }
};
function normalizeConsultStage(stage){
  return String(stage || '').trim().toLowerCase();
}
function getConsultStageLabel(stage){
  const key = normalizeConsultStage(stage);
  return CONSULT_STAGE_LABELS[key] || { zh: stage || '', en: stage || '' };
}
function buildConsultStageEmail(order, stage, env){
  const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
  const label = getConsultStageLabel(stage);
  const orderId = String(order.id || '').trim();
  const slotStart = String(order.slotStart || order.requestDate || '').trim();
  const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || 'https://unalomecodes.com').replace(/\/$/, '');
  const adminUrl = primarySite + '/admin/slots';
  const subject = `[${siteName}] 訂單狀態更新 / Order Status Update #${orderId}`;
  const zh = [
    '【中文】',
    `訂單編號：${orderId}`,
    `預約時段：${slotStart || '—'}`,
    `目前階段：${label.zh || stage}`,
    '如有需要請聯繫客服。',
    `後台連結：${adminUrl}`
  ].join('<br>');
  const en = [
    '[English]',
    `Order ID: ${orderId}`,
    `Slot: ${slotStart || '—'}`,
    `Stage: ${label.en || stage}`,
    'Please contact support if needed.',
    `Admin: ${adminUrl}`
  ].join('<br>');
  const html = `${zh}<br><br>${en}`;
  const text = html.replace(/<br>/g, '\n');
  return { subject, html, text };
}
function buildBookingNotifyEmail(order, env){
  const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
  const orderId = String(order.id || '').trim();
  const slotStart = String(order.slotStart || order.requestDate || '').trim();
  const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || 'https://unalomecodes.com').replace(/\/$/, '');
  const adminUrl = primarySite + '/admin/slots';
  const subject = `[${siteName}] 新訂單待預約 #${orderId}`;
  const zh = [
    '【中文】',
    '有新訂單成立',
    `訂單編號：${orderId}`,
    `預約時間（曼谷時間）：${slotStart || '—'}`,
    '請儘速完成預約。',
    `完成預約後至後台 ${adminUrl} 點選「已完成預約」，訂單才會同步更新狀態。`
  ].join('<br>');
  const en = [
    '[English]',
    'A new order has been created.',
    `Order ID: ${orderId}`,
    `Appointment time (Bangkok time): ${slotStart || '—'}`,
    'Please complete the booking as soon as possible.',
    `After booking, go to ${adminUrl} and click "Booking confirmed" so the order status updates.`
  ].join('<br>');
  const html = `${zh}<br><br>${en}`;
  const text = html.replace(/<br>/g, '\n');
  return { subject, html, text };
}
async function sendConsultStageEmails(env, order, stage, internalList){
  try{
    const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
    const fromDefault = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
    if (!apiKey || !fromDefault) return;
    const msg = buildConsultStageEmail(order, stage, env);
    const customerEmail = String(order?.buyer?.email || '').trim();
    const tasks = [];
    if (customerEmail){
      tasks.push(sendEmailMessage(env, {
        from: fromDefault,
        to: [customerEmail],
        subject: msg.subject,
        html: msg.html,
        text: msg.text
      }));
    }
    const internal = Array.from(new Set(internalList || [])).filter(Boolean);
    if (internal.length){
      tasks.push(sendEmailMessage(env, {
        from: fromDefault,
        to: internal,
        subject: msg.subject,
        html: msg.html,
        text: msg.text
      }));
    }
    if (tasks.length) await Promise.allSettled(tasks);
  }catch(err){
    console.error('consult stage email error', err);
  }
}
function isAllowlisted(email, env){
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const raw = String(env?.PHONE_CONSULT_ALLOWLIST || '').trim();
  if (!raw) return false;
  const list = raw.split(/[\n,]+/g).map(s => normalizeEmail(s)).filter(Boolean);
  return list.includes(normalized);
}
async function getViewerEmailFromSession(request, env){
  try{
    const user = await getSessionUser(request, env);
    return normalizeEmail(user && user.email ? user.email : '');
  }catch(_){
    return '';
  }
}
async function isOwnerOrAdminSession(request, env){
  return await isAdmin(request, env);
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

async function auditAppend(env, entry){
  const kv = env && env.ADMIN_AUDIT_KV;
  const safeEntry = entry || {};
  const ts = safeEntry.ts || new Date().toISOString();
  const id = `${Date.now()}_${crypto.randomUUID()}`;
  const payload = Object.assign({
    ts,
    action: '',
    actorEmail: '',
    actorRole: 'unknown',
    ip: '',
    ua: '',
    targetType: '',
    targetId: '',
    meta: undefined
  }, safeEntry);
  if (!kv){
    console.log(JSON.stringify({ audit: payload }));
    return false;
  }
  const ttlDays = Math.max(1, Number(env.ADMIN_AUDIT_TTL_DAYS || 90) || 90);
  const ttl = ttlDays * 86400;
  try{
    await kv.put(`audit:${id}`, JSON.stringify(payload), { expirationTtl: ttl });
    const idxKey = 'audit:index';
    let idxRaw = await kv.get(idxKey);
    idxRaw = idxRaw ? String(idxRaw) : '';
    const combined = idxRaw ? `${id}\n${idxRaw}` : id;
    const list = combined.split('\n').filter(Boolean);
    const trimmed = list.slice(0, 5000).join('\n');
    await kv.put(idxKey, trimmed);
    return true;
  }catch(err){
    console.warn('auditAppend_failed', err);
    console.log(JSON.stringify({ audit: payload }));
    return false;
  }
}

async function buildAuditActor(request, env){
  const adminSession = await getAdminSession(request, env);
  if (adminSession && adminSession.email){
    return {
      actorEmail: String(adminSession.email),
      actorRole: await getAdminRole(adminSession.email, env),
      ip: getClientIp(request) || '',
      ua: request.headers.get('User-Agent') || ''
    };
  }
  return {
    actorEmail: '',
    actorRole: 'admin_key',
    ip: getClientIp(request) || '',
    ua: request.headers.get('User-Agent') || ''
  };
}

function parseRate(input){
  const m = String(input || '').trim().match(/^(\d+)\s*\/\s*(\d+)\s*(s|m|h)$/i);
  if (!m) return null;
  const limit = Math.max(1, Number(m[1]) || 0);
  const n = Math.max(1, Number(m[2]) || 0);
  const unit = m[3].toLowerCase();
  const mult = unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
  return { limit, windowSec: n * mult };
}

function buildRateKey(actor, action){
  if (actor && actor.actorEmail){
    return `${action}:${actor.actorEmail}`;
  }
  return `${action}:admin_key`;
}

async function checkAdminRateLimit(env, key, rule){
  if (!env.ADMIN_GUARD_KV || !rule){
    return { allowed: true };
  }
  const now = Date.now();
  const windowMs = rule.windowSec * 1000;
  const bucket = Math.floor(now / windowMs);
  const kvKey = `rl:${key}:${bucket}`;
  const raw = await env.ADMIN_GUARD_KV.get(kvKey);
  const count = Number(raw) || 0;
  if (count >= rule.limit){
    return { allowed: false };
  }
  await env.ADMIN_GUARD_KV.put(
    kvKey,
    String(count + 1),
    { expirationTtl: rule.windowSec + 5 }
  );
  return { allowed: true };
}
function isAllowedAdminOrigin(request, env){
  const allow = collectAllowedOrigins(env, request, env.ADMIN_ORIGINS || '');
  const originHeader = (request.headers.get('Origin') || '').trim();
  if (originHeader) return allow.has(originHeader);
  const ref = (request.headers.get('Referer') || '').trim();
  if (!ref) {
    const key = (request.headers.get('x-admin-key') || request.headers.get('X-Admin-Key') || '').trim();
    return !!(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
  }
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
  if (await isAdmin(request, env)) {
    const adminSession = await getAdminSession(request, env);
    // If no cookie session (likely X-Admin-Key), allow full access.
    if (!adminSession || !adminSession.email) return null;
    const role = await getAdminRole(adminSession.email, env);
    if (role === 'fulfillment'){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
    const allowed = await hasAdminPermission(adminSession, env, 'cron.run');
    if (!allowed){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
    return null;
  }
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

async function forbidIfFulfillmentAdmin(request, env){
  const adminSession = await getAdminSession(request, env);
  // Only block cookie-session admins with fulfillment role.
  if (!adminSession || !adminSession.email) return null;
  const role = await getAdminRole(adminSession.email, env);
  if (role === 'fulfillment'){
    return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  return null;
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
  const windowsStr = String(env?.SLOT_DAILY_WINDOWS || '13:00-20:00');
  return { tz, holdTtlMin, daysAhead, stepMin, windowsStr };
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

export async function onRequest(context) {
  const { request, env, next } = context;

  const url = new URL(request.url);
  const origin = url.origin;
  const pathname = url.pathname;
  const split = createSplitHandler({
    json,
    jsonHeadersFor,
    isAdmin,
    getAdminSession,
    getAdminRole,
    getAdminPermissionsForEmail,
    ORDER_INDEX_KEY,
    resolveCorsOrigin,
    forbidIfFulfillmentAdmin,
    buildAuditActor,
    parseRate,
    checkAdminRateLimit,
    buildRateKey,
    auditAppend,
    getAny,
    normalizePhone,
    matchPhone,
    matchLast5,
    orderAmount,
    orderItemsSummary,
    normalizeReceiptUrl,
    csvEscape,
    formatTZ,
    ORDER_ID_PREFIX,
    ORDER_ID_LEN,
    getClientIp,
    checkRateLimit,
    normalizeOrderSuffix,
    redactOrderForPublic,
    attachSignedProofs,
    trimOrderIndex,
    requireAdminWrite,
    normalizeStatus,
    isFulfillmentOrderTransitionAllowed,
    statusIsPaid,
    statusIsCanceled,
    releaseOrderResources,
    ensureOrderPaidResources,
    shouldNotifyStatus,
    maybeSendOrderEmails,
    jsonHeaders,
    handleUpload,
    normalizeTWPhoneStrict,
    lastDigits,
    hasAdminPermission,
    updateDashboardStats,
    pickTrackStore,
    normalizeTrackEvent,
    taipeiDateKey
  });
  const splitResponse = await split.handle(request, env, context);
  if (splitResponse) return splitResponse;
  if (pathname === '/temple-map' || pathname === '/temple-map/') {
    return Response.redirect(`${origin}/templemap${url.search}`, 301);
  }
  if (url.pathname === '/payment-result' && request.method === 'POST') {
    try {
      const form = await request.formData();
      const oid =
        form.get('CustomField1') ||
        form.get('customfield1') ||
        form.get('orderId') ||
        form.get('order_id') || '';
      const target = new URL(url.origin + '/payment-result');
      if (oid) target.searchParams.set('orderId', String(oid));
      return Response.redirect(target.toString(), 302);
    } catch (e) {
      return Response.redirect(url.origin + '/payment-result', 302);
    }
  }

  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && (request.method === 'GET' || request.method === 'HEAD')) {
    // Allow admin shell CSS to load before login (otherwise it gets redirected and becomes HTML -> MIME error).
    if (pathname === '/admin/admin-ui.css') {
      // allow
    } else if (pathname === '/admin/login' || pathname === '/admin/login/') {
      // allow login page without admin session
    } else {
      const admin = await isAdmin(request, env);
      if (!admin) {
        const redirectPath = pathname + url.search;
        const target = `${origin}/admin/login?redirect=${encodeURIComponent(redirectPath)}`;
        return Response.redirect(target, 302);
      }
    }
  }

    // =================================================================
    //  主要 API 路由 (提前處理，避免被 fallback 攔截)
    // =================================================================

    // 商品列表 / 新增
  if ((pathname === "/api/products" || pathname === "/products") && request.method === "GET") {
    return listProducts(request, url, env);
  }
  if (pathname === "/api/products" && request.method === "POST") {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    return createProduct(request, env);
  }

    // 商品單筆
    const prodIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/) || pathname.match(/^\/products\/([^/]+)$/);
    if (prodIdMatch) {
      const id = decodeURIComponent(prodIdMatch[1]);
      if (request.method === "GET")   return getProduct(id, env);
      if (request.method === "PUT")   {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
        const roleGuard = await forbidIfFulfillmentAdmin(request, env);
        if (roleGuard) return roleGuard;
        return putProduct(id, request, env);
      }
      if (request.method === "PATCH") {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
        const roleGuard = await forbidIfFulfillmentAdmin(request, env);
        if (roleGuard) return roleGuard;
        return patchProduct(id, request, env);
      }
      if (request.method === "DELETE"){
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
        const roleGuard = await forbidIfFulfillmentAdmin(request, env);
        if (roleGuard) return roleGuard;
        return deleteProduct(id, env);
      }
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
    let redirectPath = '/shop';
    if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
      redirectPath = redirectRaw;
    }
    const prompt = url.searchParams.get('prompt') || 'select_account';
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt
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
    let redirectPath = '/shop';
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
      return '/shop';
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
      headers.append('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
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
    h.append('Set-Cookie', `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
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
      return '/shop';
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
      headers.append('Set-Cookie', `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
      // 若為管理員白名單且已設定 ADMIN_JWT_SECRET，直接簽發 admin_session，免二次登入
      try{
        const allowed = parseAdminEmails(env);
        const mail = (user.email || '').toLowerCase();
        const adminSecret = getAdminSecret(env);
        if (allowed.length && allowed.includes(mail) && adminSecret){
          const adminPayload = {
            sub: user.id || mail,
            email: mail,
            name: user.name || mail,
            role: 'admin',
            exp: Date.now() + 60 * 60 * 1000 // 1 小時
          };
          const adminToken = await signSession(adminPayload, adminSecret);
          headers.append('Set-Cookie', `admin_session=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`);
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
    let redirectPath = '/admin';
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
      return '/admin';
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
      const adminSecret = getAdminSecret(env);
      if (!adminSecret){
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('Admin session secret missing', { status:500, headers: h });
      }
      const adminPayload = {
        sub: profile.sub || email,
        email,
        name: profile.name || email,
        role: 'admin',
        exp: Date.now() + 60 * 60 * 1000
      };
      const adminToken = await signSession(adminPayload, adminSecret);
      const headers = new Headers({
        'Set-Cookie': `admin_session=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
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

  if (pathname === '/api/admin/roles') {
    if (!(await isOwnerAdmin(request, env))){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
    const kv = env.ADMIN_ROLE_KV;
    if (!kv){
      return new Response(JSON.stringify({ ok:false, error:'admin_role_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const emailParam = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (request.method === 'GET'){
      if (!emailParam){
        return new Response(JSON.stringify({ ok:false, error:'missing_email' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      const role = await getAdminRole(emailParam, env);
      const permissions = await getAdminPermissionsForEmail(emailParam, env, role);
      const bookingNotify = await getBookingNotifyFlag(emailParam, env);
      return new Response(JSON.stringify({ ok:true, email: emailParam, role, permissions, bookingNotify }), { status:200, headers: jsonHeadersFor(request, env) });
    }
    if (request.method === 'DELETE'){
      if (!emailParam){
        return new Response(JSON.stringify({ ok:false, error:'missing_email' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      try{
        await kv.delete(`admin:role:${emailParam}`);
        await kv.delete(`admin:perms:${emailParam}`);
        await kv.delete(`admin:notify_booking:${emailParam}`);
        const idxKey = 'admin:role:index';
        const raw = await kv.get(idxKey);
        const list = raw ? (JSON.parse(raw) || []) : [];
        const next = Array.isArray(list) ? list.filter(x=> String(x).toLowerCase() !== emailParam) : [];
        await kv.put(idxKey, JSON.stringify(next));
      }catch(_){}
      return new Response(JSON.stringify({ ok:true, email: emailParam }), { status:200, headers: jsonHeadersFor(request, env) });
    }
    if (request.method === 'POST'){
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const email = String(body.email || '').trim().toLowerCase();
      const role = normalizeRole(body.role);
      const safePerms = sanitizePermissionsForRole(role, body.permissions);
      const bookingNotify = !!body.bookingNotify;
      if (!email){
        return new Response(JSON.stringify({ ok:false, error:'missing_email' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      if (!role){
        try{
          await kv.delete(`admin:role:${email}`);
          await kv.delete(`admin:perms:${email}`);
          await kv.delete(`admin:notify_booking:${email}`);
        }catch(_){}
      }else{
        await kv.put(`admin:role:${email}`, role);
        if (safePerms.length){
          await kv.put(`admin:perms:${email}`, JSON.stringify(safePerms));
        }else{
          await kv.delete(`admin:perms:${email}`);
        }
        if (role === 'booking'){
          await setBookingNotifyFlag(email, bookingNotify, env);
        }else{
          await setBookingNotifyFlag(email, false, env);
        }
      }
      try{
        const idxKey = 'admin:role:index';
        const raw = await kv.get(idxKey);
        const list = raw ? (JSON.parse(raw) || []) : [];
        let next = Array.isArray(list) ? list.slice() : [];
        next = next.filter(x=> String(x).toLowerCase() !== email);
        if (role) next.unshift(email);
        await kv.put(idxKey, JSON.stringify(next.slice(0, 500)));
      }catch(_){}
      return new Response(JSON.stringify({ ok:true, email, role, permissions: role === 'custom' ? safePerms : [] }), { status:200, headers: jsonHeadersFor(request, env) });
    }
    return new Response(JSON.stringify({ ok:false, error:'method_not_allowed' }), { status:405, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/consult-stage' && request.method === 'POST') {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const id = String(body.id || '').trim();
    const stage = normalizeConsultStage(body.consultStage || body.stage || '');
    if (!id || !stage){
      return new Response(JSON.stringify({ ok:false, error:'missing_fields' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const allowedStages = ['payment_pending','payment_confirmed','appointment_confirmed','done'];
    if (!allowedStages.includes(stage)){
      return new Response(JSON.stringify({ ok:false, error:'invalid_stage' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const raw = await store.get(id);
    if (!raw){
      return new Response(JSON.stringify({ ok:false, error:'not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
    }
    const order = JSON.parse(raw);
    if (!isPhoneConsultOrder(order, env)){
      return new Response(JSON.stringify({ ok:false, error:'not_phone_consult' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const adminSession = await getAdminSession(request, env);
    const adminRole = adminSession && adminSession.email ? await getAdminRole(adminSession.email, env) : 'admin_key';
    if (adminRole && adminRole !== 'owner' && adminRole !== 'booking' && adminRole !== 'admin_key'){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
    if (adminRole === 'booking'){
      if (stage !== 'appointment_confirmed' && stage !== 'done'){
        return new Response(JSON.stringify({ ok:false, error:'forbidden_stage' }), { status:403, headers: jsonHeadersFor(request, env) });
      }
    }
    const currentStage = normalizeConsultStage(order.consultStage || 'payment_pending');
    const currentIdx = allowedStages.indexOf(currentStage);
    const nextIdx = allowedStages.indexOf(stage);
    if (currentIdx !== -1 && nextIdx < currentIdx){
      return new Response(JSON.stringify({ ok:false, error:'invalid_transition' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    if (adminRole === 'booking'){
      if (stage === 'appointment_confirmed' && currentStage !== 'payment_confirmed'){
        return new Response(JSON.stringify({ ok:false, error:'invalid_transition' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
      if (stage === 'done' && currentStage !== 'appointment_confirmed'){
        return new Response(JSON.stringify({ ok:false, error:'invalid_transition' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
    }
    if (order.consultStage && order.consultStage === stage){
      return new Response(JSON.stringify({ ok:true, unchanged:true }), { status:200, headers: jsonHeadersFor(request, env) });
    }
    order.consultStage = stage;
    order.consultStageAt = new Date().toISOString();
    order.consultStageBy = {
      email: adminSession && adminSession.email ? adminSession.email : '',
      role: adminRole || 'admin_key'
    };
    const stageLabel = getConsultStageLabel(stage);
    if (stageLabel && stageLabel.zh){
      order.status = stageLabel.zh;
    }
    order.updatedAt = new Date().toISOString();
    await store.put(id, JSON.stringify(order));
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'consult_stage_update',
        ...actor,
        targetType: 'service_order',
        targetId: id,
        orderId: id,
        slotKey: order.slotKey || '',
        meta: { consultStage: stage }
      });
    }catch(_){}
    try{
      const origin = new URL(request.url).origin;
      const notifyAdmin = stage === 'payment_confirmed' ? false : true;
      await maybeSendOrderEmails(env, order, { origin, channel:'服務型商品', notifyAdmin, emailContext:'status_update', bilingual:false });
      if (stage === 'payment_confirmed'){
        const bookingEmails = await getBookingNotifyEmails(env);
        const msg = buildBookingNotifyEmail(order, env);
        const internal = Array.from(new Set(bookingEmails || [])).filter(Boolean);
        if (internal.length){
          await sendEmailMessage(env, {
            from: (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim(),
            to: internal,
            subject: msg.subject,
            html: msg.html,
            text: msg.text
          });
        }
      }
    }catch(err){
      console.error('consult stage email error', err);
    }
    return new Response(JSON.stringify({ ok:true, consultStage: stage }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/slots/publish' && request.method === 'POST') {
    await cleanupExpiredHolds(env);
    const guard = await requireAdminSlotsManage(request, env);
    if (guard) return guard;
    if (!env?.SERVICE_SLOTS_KV){
      return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    let body = null;
    try{ body = await request.json(); }catch(_){ body = {}; }
    const updated = [];
    const skipped = [];
    let targets = [];
    if (Array.isArray(body.slotKeys) && body.slotKeys.length){
      targets = body.slotKeys.map(k=>String(k||'').trim()).filter(Boolean);
    }else{
      const serviceId = String(body.serviceId || '').trim();
      const date = String(body.date || '').trim();
      const times = Array.isArray(body.times) ? body.times : [];
      if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !times.length){
        return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      times.forEach(time=>{
        const minutes = parseTimeToMinutes(time);
        if (minutes === null){
          skipped.push({ slotKey:'', reason:'invalid_time' });
          return;
        }
        const hhmm = minutesToHHMM(minutes);
        const slotKey = buildSlotKey(serviceId, date, hhmm.replace(':',''));
        targets.push(slotKey);
      });
    }
    for (const slotKey of targets){
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
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'slots_publish',
        ...actor,
        targetType: 'service_slots',
        targetId: 'bulk',
        orderId: '',
        slotKey: '',
        meta: { count: updated.length }
      });
      const adminSession = await getAdminSession(request, env);
      if (!adminSession){
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'admin_override',
          actorEmail: '',
          actorRole: 'admin_key',
          ip: getClientIp(request) || '',
          ua: request.headers.get('User-Agent') || '',
          targetType: 'service_slots',
          targetId: 'bulk',
          orderId: '',
          slotKey: '',
          meta: { count: updated.length }
        });
      }
    }catch(err){
      console.warn('audit slots_publish failed', err);
    }
    return new Response(JSON.stringify({ ok:true, updated, skipped }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/slots/block' && request.method === 'POST') {
    await cleanupExpiredHolds(env);
    const guard = await requireAdminSlotsManage(request, env);
    if (guard) return guard;
    if (!env?.SERVICE_SLOTS_KV){
      return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    let body = null;
    try{ body = await request.json(); }catch(_){ body = {}; }
    const slotKeys = Array.isArray(body.slotKeys) ? body.slotKeys.map(k=>String(k||'').trim()).filter(Boolean) : [];
    if (!slotKeys.length){
      return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const blocked = body.blocked === true;
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
      if (status === 'booked'){
        skipped.push({ slotKey, reason:'booked' });
        continue;
      }
      if (status === 'held'){
        skipped.push({ slotKey, reason:'held' });
        continue;
      }
      const record = {
        serviceId: parsed.serviceId,
        slotKey,
        date: parsed.dateStr,
        time: parsed.hhmm,
        enabled: blocked ? false : true,
        status: blocked ? 'blocked' : 'free',
        heldUntil: 0,
        holdToken: '',
        bookedOrderId: ''
      };
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(record));
      updated.push(slotKey);
    }
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'slots_block',
        ...actor,
        targetType: 'service_slots',
        targetId: 'bulk',
        orderId: '',
        slotKey: '',
        meta: { blocked, count: updated.length }
      });
      const adminSession = await getAdminSession(request, env);
      if (!adminSession){
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'admin_override',
          actorEmail: '',
          actorRole: 'admin_key',
          ip: getClientIp(request) || '',
          ua: request.headers.get('User-Agent') || '',
          targetType: 'service_slots',
          targetId: 'bulk',
          orderId: '',
          slotKey: '',
          meta: { blocked, count: updated.length }
        });
      }
    }catch(err){
      console.warn('audit slots_block failed', err);
    }
    return new Response(JSON.stringify({ ok:true, updated, skipped }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/slots/release' && request.method === 'POST') {
    await cleanupExpiredHolds(env);
    const guard = await requireAdminSlotsManage(request, env);
    if (guard) return guard;
    if (!env?.SERVICE_SLOTS_KV){
      return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    let body = null;
    try{ body = await request.json(); }catch(_){ body = {}; }
    const slotKeys = Array.isArray(body.slotKeys) ? body.slotKeys.map(k=>String(k||'').trim()).filter(Boolean) : [];
    if (!slotKeys.length){
      return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
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
      if (!existing || existing.status !== 'booked'){
        skipped.push({ slotKey, reason:'not_booked' });
        continue;
      }
      const orderId = String(existing.bookedOrderId || '').trim();
      const record = Object.assign({}, existing, {
        serviceId: parsed.serviceId,
        slotKey,
        date: parsed.dateStr,
        time: parsed.hhmm,
        enabled: true,
        status: 'free',
        heldUntil: 0,
        holdToken: '',
        holdBy: '',
        holdExpiresAt: 0,
        bookedOrderId: ''
      });
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(record));
      if (orderId){
        const store = env.SERVICE_ORDERS || env.ORDERS;
        if (store){
          try{
            const rawOrder = await store.get(orderId);
            if (rawOrder){
              const order = JSON.parse(rawOrder);
              order.slotKey = '';
              order.slotStart = '';
              order.requestDate = '';
              order.updatedAt = new Date().toISOString();
              await store.put(orderId, JSON.stringify(order));
            }
          }catch(_){}
        }
      }
      updated.push(slotKey);
    }
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'slots_release',
        ...actor,
        targetType: 'service_slots',
        targetId: 'bulk',
        orderId: '',
        slotKey: '',
        meta: { count: updated.length }
      });
    }catch(err){
      console.warn('audit slots_release failed', err);
    }
    return new Response(JSON.stringify({ ok:true, updated, skipped }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/phone-consult-template' && request.method === 'POST') {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    const ownerOnly = await isOwnerAdmin(request, env);
    if (!ownerOnly){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
    const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const idxKey = 'SERVICE_PRODUCT_INDEX';
    const templateKey = 'SERVICE_PRODUCT_PHONE_CONSULT_ID';
    let pinnedId = '';
    try{
      pinnedId = String(await store.get(templateKey) || '').trim();
    }catch(_){}
    if (pinnedId){
      try{
        const raw = await store.get(pinnedId);
        if (raw){
          const item = JSON.parse(raw);
          const existedId = String(item.id || pinnedId).trim();
          try{
            const actor = await buildAuditActor(request, env);
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'phone_consult_template_create',
              ...actor,
              targetType: 'service_product',
              targetId: existedId,
              meta: { existed: true }
            });
          }catch(_){}
          return new Response(JSON.stringify({ ok:true, existed:true, serviceId: existedId }), { status:200, headers: jsonHeadersFor(request, env) });
        }
      }catch(_){}
    }
    let list = [];
    try{
      const idxRaw = await store.get(idxKey);
      if (idxRaw) list = JSON.parse(idxRaw) || [];
    }catch(_){}
    if ((!Array.isArray(list) || !list.length) && store.list){
      try{
        const iter = await store.list({ prefix:'svc:' });
        list = iter.keys.map(k => k.name);
      }catch(_){}
    }
    let existedItem = null;
    for (const key of list){
      try{
        const raw = await store.get(key);
        if (!raw) continue;
        const item = JSON.parse(raw);
        const name = String(item.name || '').toLowerCase();
        const metaType = String(item?.meta?.type || '').toLowerCase();
        if (metaType === 'phone_consult' || name.includes('phone consultation') || name.includes('電話算命')){
          existedItem = item;
          break;
        }
      }catch(_){}
    }
    if (existedItem){
      const existedId = String(existedItem.id || '').trim() || '';
      try{
        const actor = await buildAuditActor(request, env);
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'phone_consult_template_create',
          ...actor,
          targetType: 'service_product',
          targetId: existedId,
          meta: { existed: true }
        });
      }catch(_){}
      try{ await store.put(templateKey, existedId); }catch(_){}
      return new Response(JSON.stringify({ ok:true, existed:true, serviceId: existedId }), { status:200, headers: jsonHeadersFor(request, env) });
    }
    let newId = '';
    for (let i=0;i<5;i++){
      const candidate = 'SVT' + crypto.randomUUID().replace(/-/g,'').slice(0,8);
      const raw = await store.get(candidate);
      if (!raw){
        newId = candidate;
        break;
      }
    }
    if (!newId){
      return new Response(JSON.stringify({ ok:false, error:'cannot_generate_id' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    const nowIso = new Date().toISOString();
    const payload = {
      id: newId,
      name: '電話算命預約 Phone Consultation',
      description: '方案：中文翻譯 4000、英文翻譯 3500。可先整理想詢問的問題，通話時由翻譯人員協助老師回覆。改期需於 48 小時前申請。可自行全程錄音，可加購「轉譯加重點摘要整理」+500。\nPackages: Chinese translation 4000, English translation 3500. Prepare questions in advance; the interpreter will assist during the call. Reschedule at least 48 hours before. Call recording is allowed. Add-on: transcription + summary +500.',
      includes: [
        '方案：中文翻譯 4000、英文翻譯 3500',
        '說明：可先整理問題，通話時由翻譯協助向老師提問',
        '改期：48 小時前可申請改期',
        '錄音：可自行全程錄音；可加購「轉譯加重點摘要整理」+500',
        'Packages: Chinese 4000, English 3500',
        'Prepare questions in advance; interpreter assists during the call',
        'Reschedule at least 48 hours before',
        'Call recording allowed; add-on transcription + summary +500'
      ],
      price: 0,
      options: [
        { name:'中文翻譯', price:4000 },
        { name:'英文翻譯', price:3500 }
      ],
      meta: {
        type: 'phone_consult',
        version: 1,
        requiresSlot: true,
        rescheduleHours: 48
      },
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await store.put(newId, JSON.stringify(payload));
    try{
      let existing = [];
      const idxRaw = await store.get(idxKey);
      if (idxRaw) existing = JSON.parse(idxRaw) || [];
      existing = [newId].concat(existing.filter(x => x !== newId)).slice(0,200);
      await store.put(idxKey, JSON.stringify(existing));
    }catch(_){}
    try{ await store.put(templateKey, newId); }catch(_){}
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'phone_consult_template_create',
        ...actor,
        targetType: 'service_product',
        targetId: newId,
        meta: { existed: false }
      });
    }catch(_){}
    return new Response(JSON.stringify({ ok:true, existed:false, serviceId: newId }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/reschedule-requests' && request.method === 'GET') {
    const guard = await requireAdminSlotsManage(request, env);
    if (guard) return guard;
    if (!env?.SERVICE_RESCHEDULE_KV){
      return new Response(JSON.stringify({ ok:false, error:'reschedule_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const statusFilter = String(url.searchParams.get('status') || '').trim().toLowerCase();
    const cursor = String(url.searchParams.get('cursor') || '').trim();
    const limitRaw = Number(url.searchParams.get('limit') || 50);
    const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 50));
    const idxRaw = await env.SERVICE_RESCHEDULE_KV.get('reschedule:index');
    const ids = idxRaw ? String(idxRaw).split('\n').filter(Boolean) : [];
    let start = 0;
    if (cursor){
      const idx = ids.indexOf(cursor);
      if (idx >= 0) start = idx + 1;
    }
    const items = [];
    let nextCursor = '';
    for (let i = start; i < ids.length; i++){
      if (items.length >= limit){
        nextCursor = ids[i];
        break;
      }
      const id = ids[i];
      let raw = null;
      try{ raw = await env.SERVICE_RESCHEDULE_KV.get(`reschedule:${id}`); }catch(_){}
      if (!raw) continue;
      let rec = null;
      try{ rec = JSON.parse(raw); }catch(_){}
      if (!rec) continue;
      if (statusFilter && String(rec.status || '').toLowerCase() !== statusFilter) continue;
      items.push(rec);
    }
    return new Response(JSON.stringify({ ok:true, items, nextCursor }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/reschedule-approve' && request.method === 'POST') {
    await cleanupExpiredHolds(env);
    const guard = await requireAdminSlotsManage(request, env);
    if (guard) return guard;
    if (!env?.SERVICE_RESCHEDULE_KV){
      return new Response(JSON.stringify({ ok:false, error:'reschedule_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    if (!env?.SERVICE_SLOTS_KV){
      return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    let body = {};
    try{ body = await request.json(); }catch(_){}
    const requestId = String(body.requestId || '').trim();
    const orderId = String(body.orderId || '').trim();
    const newSlotKey = String(body.newSlotKey || '').trim();
    if (!requestId || !orderId || !newSlotKey){
      return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const reqRaw = await env.SERVICE_RESCHEDULE_KV.get(`reschedule:${requestId}`);
    if (!reqRaw){
      return new Response(JSON.stringify({ ok:false, error:'request_not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
    }
    let reqRec = null;
    try{ reqRec = JSON.parse(reqRaw); }catch(_){}
    if (!reqRec || String(reqRec.status || '') !== 'pending'){
      return new Response(JSON.stringify({ ok:false, error:'ALREADY_REQUESTED' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    if (String(reqRec.orderId || '') !== orderId){
      return new Response(JSON.stringify({ ok:false, error:'order_mismatch' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const orderRaw = await store.get(orderId);
    if (!orderRaw){
      return new Response(JSON.stringify({ ok:false, error:'order_not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
    }
    let order = null;
    try{ order = JSON.parse(orderRaw); }catch(_){}
    if (!order){
      return new Response(JSON.stringify({ ok:false, error:'order_not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
    }
    const cfg = getRescheduleConfig(env);
    const slotStartMs = parseSlotStartToMs(order.slotStart || '');
    if (!slotStartMs){
      return new Response(JSON.stringify({ ok:false, error:'missing_slot_start' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    if (Date.now() > (slotStartMs - cfg.ruleHours * 3600 * 1000)){
      return new Response(JSON.stringify({ ok:false, error:'TOO_LATE' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
    const parsed = parseSlotKey(newSlotKey);
    if (!parsed || String(parsed.serviceId) !== String(order.serviceId || '').trim()){
      return new Response(JSON.stringify({ ok:false, error:'invalid_slot' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const slotRaw = await env.SERVICE_SLOTS_KV.get(newSlotKey);
    if (!slotRaw){
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    let slotRec = null;
    try{ slotRec = JSON.parse(slotRaw); }catch(_){}
    const enabled = resolveSlotEnabled(slotRec);
    const nowSlot = nowMs();
    const status = resolveSlotStatus(slotRec, nowSlot);
    if (!enabled){
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    if (status === 'held'){
      if (Number(slotRec.heldUntil || 0) <= nowSlot){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_EXPIRED' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    if (status !== 'free'){
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    const oldSlotKey = String(order.slotKey || '').trim();
    if (oldSlotKey && oldSlotKey !== newSlotKey){
      try{
        const oldRaw = await env.SERVICE_SLOTS_KV.get(oldSlotKey);
        if (oldRaw){
          const oldRec = JSON.parse(oldRaw);
          oldRec.status = 'free';
          oldRec.bookedOrderId = '';
          oldRec.heldUntil = 0;
          oldRec.holdToken = '';
          oldRec.enabled = true;
          await env.SERVICE_SLOTS_KV.put(oldSlotKey, JSON.stringify(oldRec));
          try{
            const adminSession = await getAdminSession(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'slot_release',
        actorEmail: adminSession ? String(adminSession.email || '') : '',
        actorRole: adminSession ? await getAdminRole(adminSession.email, env) : 'admin_key',
        ip: getClientIp(request) || '',
        ua: request.headers.get('User-Agent') || '',
        targetType: 'service_slot',
        targetId: oldSlotKey,
        orderId,
        slotKey: oldSlotKey,
        meta: { orderId, slotKey: oldSlotKey }
      });
          }catch(err){
            console.warn('audit slot_release failed', err);
          }
        }
      }catch(_){}
    }
    slotRec.status = 'booked';
    slotRec.bookedOrderId = orderId;
    slotRec.heldUntil = 0;
    slotRec.holdToken = '';
    slotRec.enabled = true;
    await env.SERVICE_SLOTS_KV.put(newSlotKey, JSON.stringify(slotRec));
    order.slotKey = newSlotKey;
    order.slotStart = `${parsed.dateStr} ${parsed.hhmm}`;
    order.requestDate = order.slotStart;
    order.updatedAt = new Date().toISOString();
    await store.put(orderId, JSON.stringify(order));
    reqRec.status = 'approved';
    reqRec.updatedAt = new Date().toISOString();
    reqRec.desiredSlotKey = newSlotKey;
    const adminSession = await getAdminSession(request, env);
    reqRec.approvedBy = adminSession ? String(adminSession.email || '') : 'admin_key';
    await env.SERVICE_RESCHEDULE_KV.put(`reschedule:${requestId}`, JSON.stringify(reqRec));
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'reschedule_approved',
        ...actor,
        targetType: 'service_order',
        targetId: orderId,
        orderId,
        slotKey: newSlotKey,
        meta: { requestId, newSlotKey, slotKey: newSlotKey, orderId }
      });
      if (!adminSession){
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'admin_override',
          actorEmail: '',
          actorRole: 'admin_key',
          ip: getClientIp(request) || '',
          ua: request.headers.get('User-Agent') || '',
          targetType: 'service_order',
          targetId: orderId,
          orderId,
          slotKey: newSlotKey,
          meta: { requestId, slotKey: newSlotKey, orderId }
        });
      }
    }catch(err){
      console.warn('audit reschedule_approved failed', err);
    }
    const adminTo = getRescheduleNotifyEmails(env);
    const customerEmail = String(order?.buyer?.email || '').trim();
    const base = (env.SITE_URL || env.PUBLIC_SITE_URL || new URL(request.url).origin || '').replace(/\/$/, '');
    const adminUrl = base ? `${base}/admin/slots` : '';
    const email = buildRescheduleEmail({
      type: 'approved',
      orderId,
      currentSlot: reqRec.currentSlotKey || '',
      desiredSlot: newSlotKey,
      createdAt: reqRec.createdAt || '',
      note: reqRec.note || '',
      adminUrl
    });
    try{
      if (adminTo.length){
        await sendEmailMessage(env, { to: adminTo, subject: email.subject, html: email.html, text: email.text });
      }
      if (customerEmail){
        await sendEmailMessage(env, { to: [customerEmail], subject: email.subject, html: email.html, text: email.text });
      }
    }catch(err){
      console.error('reschedule approve email failed', err);
    }
    return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/service/reschedule-reject' && request.method === 'POST') {
    const guard = await requireAdminSlotsManage(request, env);
    if (guard) return guard;
    if (!env?.SERVICE_RESCHEDULE_KV){
      return new Response(JSON.stringify({ ok:false, error:'reschedule_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    let body = {};
    try{ body = await request.json(); }catch(_){}
    const requestId = String(body.requestId || '').trim();
    const orderId = String(body.orderId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!requestId || !orderId){
      return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const reqRaw = await env.SERVICE_RESCHEDULE_KV.get(`reschedule:${requestId}`);
    if (!reqRaw){
      return new Response(JSON.stringify({ ok:false, error:'request_not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
    }
    let reqRec = null;
    try{ reqRec = JSON.parse(reqRaw); }catch(_){}
    if (!reqRec || String(reqRec.status || '') !== 'pending'){
      return new Response(JSON.stringify({ ok:false, error:'ALREADY_REQUESTED' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    if (String(reqRec.orderId || '') !== orderId){
      return new Response(JSON.stringify({ ok:false, error:'order_mismatch' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    reqRec.status = 'rejected';
    reqRec.updatedAt = new Date().toISOString();
    reqRec.rejectedReason = reason;
    const adminSession = await getAdminSession(request, env);
    reqRec.rejectedBy = adminSession ? String(adminSession.email || '') : 'admin_key';
    await env.SERVICE_RESCHEDULE_KV.put(`reschedule:${requestId}`, JSON.stringify(reqRec));
    let order = null;
    try{
      const orderRaw = await store.get(orderId);
      order = orderRaw ? JSON.parse(orderRaw) : null;
    }catch(_){}
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'reschedule_rejected',
        ...actor,
        targetType: 'service_order',
        targetId: orderId,
        orderId,
        slotKey: String(reqRec.desiredSlotKey || ''),
        meta: { requestId, reason, orderId, slotKey: String(reqRec.desiredSlotKey || '') }
      });
      if (!adminSession){
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'admin_override',
          actorEmail: '',
          actorRole: 'admin_key',
          ip: getClientIp(request) || '',
          ua: request.headers.get('User-Agent') || '',
          targetType: 'service_order',
          targetId: orderId,
          orderId,
          slotKey: String(reqRec.desiredSlotKey || ''),
          meta: { requestId, orderId, slotKey: String(reqRec.desiredSlotKey || '') }
        });
      }
    }catch(err){
      console.warn('audit reschedule_rejected failed', err);
    }
    const adminTo = getRescheduleNotifyEmails(env);
    const customerEmail = String(order?.buyer?.email || '').trim();
    const base = (env.SITE_URL || env.PUBLIC_SITE_URL || new URL(request.url).origin || '').replace(/\/$/, '');
    const adminUrl = base ? `${base}/admin/slots` : '';
    const email = buildRescheduleEmail({
      type: 'rejected',
      orderId,
      currentSlot: reqRec.currentSlotKey || '',
      desiredSlot: reqRec.desiredSlotKey || '',
      createdAt: reqRec.createdAt || '',
      note: reqRec.note || '',
      reason,
      adminUrl
    });
    try{
      if (adminTo.length){
        await sendEmailMessage(env, { to: adminTo, subject: email.subject, html: email.html, text: email.text });
      }
      if (customerEmail){
        await sendEmailMessage(env, { to: [customerEmail], subject: email.subject, html: email.html, text: email.text });
      }
    }catch(err){
      console.error('reschedule reject email failed', err);
    }
    return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeadersFor(request, env) });
  }

  if (pathname === '/api/admin/fortune-stats' && request.method === 'GET') {
    if (!(await isAdmin(request, env))){
      return new Response(JSON.stringify({ ok:false, error:'unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
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
      return json({ ok:false, error:'unauthorized' }, 401, request, env);
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500, request, env);
    }
    if (!store.list){
      return json({ ok:false, error:'list_not_supported_on_store' }, 500, request, env);
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
      return json({ ok:true, items: out.slice(0, limit) }, 200, request, env);
    }catch(e){
      return json({ ok:false, error:String(e) }, 500, request, env);
    }
  }

  if (pathname === '/api/admin/home-stats' && request.method === 'GET') {
    if (!(await isAdmin(request, env))){
      return json({ ok:false, error:'unauthorized' }, 401, request, env);
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const base = String(env.ADMIN_STATS_API_BASE || env.ADMIN_STATS_BASE || 'https://coupon-service.kaiwei425.workers.dev').trim();
    const event = String(url.searchParams.get('event') || 'home_view').trim();
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get('days') || 14) || 14));
    if (!base) return json({ ok:false, error:'missing_stats_base' }, 500, request, env);
    const target = `${base.replace(/\/+$/, '')}/admin/stats/trend?event=${encodeURIComponent(event)}&days=${days}`;
    const headers = new Headers();
    const bearer = String(env.ADMIN_STATS_TOKEN || env.ADMIN_TOKEN || '').trim();
    const accessId = String(env.CF_ACCESS_CLIENT_ID || env.ACCESS_CLIENT_ID || '').trim();
    const accessSecret = String(env.CF_ACCESS_CLIENT_SECRET || env.ACCESS_CLIENT_SECRET || '').trim();
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    if (accessId && accessSecret){
      headers.set('CF-Access-Client-Id', accessId);
      headers.set('CF-Access-Client-Secret', accessSecret);
    }
    if (!bearer && !(accessId && accessSecret)){
      return json({ ok:false, error:'missing_admin_stats_credentials' }, 500, request, env);
    }
    try{
      const res = await fetch(target, { headers });
      const text = await res.text();
      let data = {};
      try{ data = JSON.parse(text); }catch(_){
        data = { ok:false, error:'invalid_upstream_json' };
      }
      if (!res.ok){
        return json({ ok:false, error: data && data.error ? data.error : `upstream_${res.status}` }, res.status, request, env);
      }
      return json(data, 200, request, env);
    }catch(e){
      return json({ ok:false, error:String(e) }, 500, request, env);
    }
  }

  if (pathname === '/api/admin/cron/update-dashboard' && request.method === 'POST') {
    const guard = await requireCronOrAdmin(request, env);
    if (guard) return guard;
    {
      const actor = await buildAuditActor(request, env);
      const rule = parseRate(env.ADMIN_CRON_RATE_LIMIT || '20/10m');
      const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'cron'), rule);
      if (!rate.allowed){
        try{
          await auditAppend(env, {
            ts: new Date().toISOString(),
            action: 'rate_limited',
            ...actor,
            targetType: 'cron',
            targetId: 'maintenance',
            meta: { rule: env.ADMIN_CRON_RATE_LIMIT || '20/10m' }
          });
        }catch(_){}
        return new Response(
          JSON.stringify({ ok:false, error:'rate_limited' }),
          { status: 429, headers: jsonHeadersFor(request, env) }
        );
      }
    }
    const store = env.ORDERS;
    if (!store) return json({ ok: false, error: 'STATS_CACHE_STORE not bound' }, 500);
    const result = await updateDashboardStats(env);
    const dashboardCacheTtl = Math.max(60, Math.min(Number(env.DASHBOARD_CACHE_TTL || 600) || 600, 3600));
    await store.put('DASHBOARD_STATS_CACHE', JSON.stringify(result), { expirationTtl: dashboardCacheTtl });
    // Manual test: owner cron update -> audit logs include action=cron_update_dashboard
    try{
      const actor = await buildAuditActor(request, env);
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'cron_update_dashboard',
        ...actor,
        targetType: 'cron',
        targetId: 'update-dashboard',
        meta: {}
      });
    }catch(_){}
    return json({ ok: true, ...result }, 200, request, env);
  }


  if (pathname === '/api/admin/users/reset-guardian' && request.method === 'POST') {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500, request, env);
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const id = String(body.id || body.userId || '').trim();
    if (!id){
      return json({ ok:false, error:'missing_user_id' }, 400, request, env);
    }
    const record = await loadUserRecord(env, id);
    if (!record){
      return json({ ok:false, error:'user_not_found' }, 404, request, env);
    }
    delete record.guardian;
    delete record.quiz;
    await saveUserRecord(env, record);
    if (env.FORTUNES){
      try{
        await env.FORTUNES.delete(`FORTUNE:${record.id}:${taipeiDateKey()}`);
      }catch(_){}
    }
    return json({ ok:true, id }, 200, request, env);
  }
  if (pathname === '/api/admin/users/delete' && request.method === 'POST') {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500, request, env);
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const id = String(body.id || body.userId || '').trim();
    const confirm = String(body.confirm || '').trim();
    if (!id){
      return json({ ok:false, error:'missing_user_id' }, 400, request, env);
    }
    if (confirm !== '刪除'){
      return json({ ok:false, error:'confirm_required' }, 400, request, env);
    }
    const record = await loadUserRecord(env, id);
    if (!record){
      return json({ ok:false, error:'user_not_found' }, 404, request, env);
    }
    let revokedCoupons = null;
    try{
      revokedCoupons = await revokeUserCoupons(env, record, { reason:'user_deleted' });
    }catch(e){
      revokedCoupons = { error: String(e) };
    }
    await store.delete(userKey(id));
    return json({ ok:true, id, revokedCoupons }, 200, request, env);
  }
  if (pathname === '/api/admin/users/creator-invite' && request.method === 'POST') {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store){
      return json({ ok:false, error:'USERS KV not bound' }, 500, request, env);
    }
    let body = {};
    try{ body = await request.json(); }catch(_){ body = {}; }
    const id = String(body.id || body.userId || '').trim();
    const allow = body.allow === true || body.allow === 'true' || body.allow === 1 || body.allow === '1';
    if (!id){
      return json({ ok:false, error:'missing_user_id' }, 400, request, env);
    }
    const record = await loadUserRecord(env, id);
    if (!record){
      return json({ ok:false, error:'user_not_found' }, 404, request, env);
    }
    record.creatorInviteAllowed = allow;
    await saveUserRecord(env, record);
    return json({ ok:true, id, allow }, 200, request, env);
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
    headers.append('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
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
            record.profileNameLocked = true;
            changed = true;
          }
          if (Object.prototype.hasOwnProperty.call(body.profile, 'email')){
            record.email = String(body.profile.email || '').trim();
            record.profileEmailLocked = true;
            changed = true;
          }
        }
        if (body && (Object.prototype.hasOwnProperty.call(body, 'name') || Object.prototype.hasOwnProperty.call(body, 'email'))){
          if (Object.prototype.hasOwnProperty.call(body, 'name')){
            record.name = String(body.name || '').trim();
            record.profileNameLocked = true;
            changed = true;
          }
          if (Object.prototype.hasOwnProperty.call(body, 'email')){
            record.email = String(body.email || '').trim();
            record.profileEmailLocked = true;
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
            quiz: refreshed.quiz || null,
            creatorFoods: !!refreshed.creatorFoods,
            creatorName: resolveCreatorName(refreshed),
            creatorInviteAllowed: !!refreshed.creatorInviteAllowed
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
      quiz: record.quiz || null,
      creatorFoods: !!record.creatorFoods,
      creatorName: resolveCreatorName(record),
      creatorInviteAllowed: !!record.creatorInviteAllowed
    }});
  }

  if (pathname === '/api/creator/status' && request.method === 'GET'){
    const record = await getSessionUserRecord(request, env);
    if (!record){
      return json({ ok:true, creator:false, inviteAllowed:false }, 200);
    }
    return json({ ok:true, creator: !!record.creatorFoods, id: record.id, name: resolveCreatorName(record), ig: record.creatorIg || '', youtube: record.creatorYoutube || '', facebook: record.creatorFacebook || '', tiktok: record.creatorTiktok || '', intro: record.creatorIntro || '', avatar: record.creatorAvatar || '', cover: record.creatorCover || '', coverPos: record.creatorCoverPos || '50% 50%', inviteAllowed: !!record.creatorInviteAllowed, termsAccepted: hasCreatorTermsAccepted(record), termsAcceptedAt: record.creatorTermsAcceptedAt || '' }, 200);
  }

  if (pathname === '/api/creator/profile' && request.method === 'POST'){
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (!isFoodCreator(record)) return json({ ok:false, error:'forbidden' }, 403);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){ body = {}; }
    const name = String(body.creatorName || body.name || '').trim().slice(0, 60);
    if (!name) return json({ ok:false, error:'missing_name' }, 400);
    record.creatorName = name;
    const hasIg = Object.prototype.hasOwnProperty.call(body, 'creatorIg') || Object.prototype.hasOwnProperty.call(body, 'ig');
    const hasIntro = Object.prototype.hasOwnProperty.call(body, 'creatorIntro') || Object.prototype.hasOwnProperty.call(body, 'intro') || Object.prototype.hasOwnProperty.call(body, 'bio');
    const hasYoutube = Object.prototype.hasOwnProperty.call(body, 'creatorYoutube') || Object.prototype.hasOwnProperty.call(body, 'youtube');
    const hasFacebook = Object.prototype.hasOwnProperty.call(body, 'creatorFacebook') || Object.prototype.hasOwnProperty.call(body, 'facebook');
    const hasTiktok = Object.prototype.hasOwnProperty.call(body, 'creatorTiktok') || Object.prototype.hasOwnProperty.call(body, 'tiktok');
    const hasAvatar = Object.prototype.hasOwnProperty.call(body, 'creatorAvatar') || Object.prototype.hasOwnProperty.call(body, 'avatar');
    const hasCover = Object.prototype.hasOwnProperty.call(body, 'creatorCover') || Object.prototype.hasOwnProperty.call(body, 'cover');
    const hasCoverPos = Object.prototype.hasOwnProperty.call(body, 'creatorCoverPos') || Object.prototype.hasOwnProperty.call(body, 'coverPos');
    if (hasIg){
      record.creatorIg = String(body.creatorIg ?? body.ig ?? '').trim().slice(0, 200);
    }
    if (hasIntro){
      record.creatorIntro = String(body.creatorIntro ?? body.intro ?? body.bio ?? '').trim().slice(0, 500);
    }
    if (hasYoutube){
      record.creatorYoutube = String(body.creatorYoutube ?? body.youtube ?? '').trim().slice(0, 200);
    }
    if (hasFacebook){
      record.creatorFacebook = String(body.creatorFacebook ?? body.facebook ?? '').trim().slice(0, 200);
    }
    if (hasTiktok){
      record.creatorTiktok = String(body.creatorTiktok ?? body.tiktok ?? '').trim().slice(0, 200);
    }
    if (hasAvatar){
      record.creatorAvatar = String(body.creatorAvatar ?? body.avatar ?? '').trim().slice(0, 300);
    }
    if (hasCover){
      record.creatorCover = String(body.creatorCover ?? body.cover ?? '').trim().slice(0, 300);
    }
    if (hasCoverPos){
      record.creatorCoverPos = String(body.creatorCoverPos ?? body.coverPos ?? '').trim().slice(0, 20) || '50% 50%';
    }
    await saveUserRecord(env, record);
    let updated = 0;
    if (env.FOODS && env.FOODS.list){
      try{
        const items = await listFoods(env, 2000, { cache:false });
        const now = new Date().toISOString();
        for (const item of items){
          if (!item || String(item.ownerId || '') !== String(record.id)) continue;
          if (String(item.ownerName || '') === name && item.creatorIg === record.creatorIg && item.creatorYoutube === record.creatorYoutube && item.creatorFacebook === record.creatorFacebook && item.creatorTiktok === record.creatorTiktok && item.creatorIntro === record.creatorIntro && item.creatorAvatar === record.creatorAvatar && item.creatorCover === record.creatorCover && item.creatorCoverPos === record.creatorCoverPos) continue;
          item.ownerName = name;
          item.creatorIg = record.creatorIg || '';
          item.creatorYoutube = record.creatorYoutube || '';
          item.creatorFacebook = record.creatorFacebook || '';
          item.creatorTiktok = record.creatorTiktok || '';
          item.creatorIntro = record.creatorIntro || '';
          item.creatorAvatar = record.creatorAvatar || '';
          item.creatorCover = record.creatorCover || '';
          item.creatorCoverPos = record.creatorCoverPos || '50% 50%';
          item.updatedAt = now;
          await saveFood(env, item);
          updated += 1;
        }
        if (updated){
          resetFoodsListMemoryCache();
          await deleteFoodsListCache(env);
        }
      }catch(_){}
    }
    return json({ ok:true, name, ig: record.creatorIg || '', youtube: record.creatorYoutube || '', facebook: record.creatorFacebook || '', tiktok: record.creatorTiktok || '', intro: record.creatorIntro || '', avatar: record.creatorAvatar || '', cover: record.creatorCover || '', coverPos: record.creatorCoverPos || '50% 50%', updated });
  }

  if (pathname === '/api/creator/terms' && request.method === 'POST'){
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (!isFoodCreator(record)) return json({ ok:false, error:'forbidden' }, 403);
    record.creatorTermsAccepted = true;
    record.creatorTermsAcceptedAt = new Date().toISOString();
    await saveUserRecord(env, record);
    return json({ ok:true, accepted:true, acceptedAt: record.creatorTermsAcceptedAt });
  }

  if (pathname === '/api/creator/claim' && request.method === 'POST'){
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    const store = getUserStore(env);
    if (!store) return json({ ok:false, error:'USER store not bound' }, 500);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const code = normalizeCreatorCode(body.code);
    if (!code) return json({ ok:false, error:'missing code' }, 400);
    const key = creatorInviteKey(code);
    let invite = null;
    try{
      const raw = await store.get(key);
      if (raw) invite = JSON.parse(raw);
    }catch(_){}
    if (!invite || !invite.code) return json({ ok:false, error:'invalid code' }, 400);
    if (invite.used) return json({ ok:false, error:'code used' }, 400);
    const inviteMode = String(invite.mode || '').toLowerCase();
    const linkMode = inviteMode === 'link';
    if (!linkMode && !record.creatorInviteAllowed){
      return json({ ok:false, error:'invite_not_allowed' }, 403);
    }
    invite.used = true;
    invite.usedBy = record.id;
    invite.usedAt = new Date().toISOString();
    try{
      await store.put(key, JSON.stringify(invite), { expirationTtl: linkMode ? CREATOR_INVITE_LINK_TTL : CREATOR_INVITE_TTL });
    }catch(_){}
    if (!record.creatorFoods){
      record.creatorFoods = true;
      if (!record.creatorName){
        record.creatorName = String(invite.label || record.name || record.email || '').trim();
      }
      record.creatorInviteCode = code;
      await saveUserRecord(env, record);
    }
    return json({ ok:true, creator:true, name: resolveCreatorName(record) }, 200, request, env);
  }

  if (pathname === '/api/admin/creator/invite' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const store = getUserStore(env);
    if (!store) return json({ ok:false, error:'USER store not bound' }, 500, request, env);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const label = String(body.label || '').trim().slice(0, 80);
    const modeRaw = String(body.mode || '').trim().toLowerCase();
    const mode = modeRaw === 'link' ? 'link' : 'code';
    let code = '';
    for (let i = 0; i < 5; i++){
      const candidate = generateCreatorInviteCode();
      const exists = await store.get(creatorInviteKey(candidate));
      if (!exists){
        code = candidate;
        break;
      }
    }
    if (!code) return json({ ok:false, error:'code_generation_failed' }, 500, request, env);
    const ttl = mode === 'link' ? CREATOR_INVITE_LINK_TTL : CREATOR_INVITE_TTL;
    const invite = {
      code,
      label,
      createdAt: new Date().toISOString(),
      used: false,
      mode
    };
    await store.put(creatorInviteKey(code), JSON.stringify(invite), { expirationTtl: ttl });
    const link = `${origin}/food-map?creator_invite=${encodeURIComponent(code)}`;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return json({ ok:true, code, label, mode, link, expiresAt }, 200, request, env);
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
    if (url.searchParams.get('history') === '1'){
      const indexKey = `FORTUNE_INDEX:${record.id}`;
      let keys = [];
      try{
        const raw = await env.FORTUNES.get(indexKey);
        if (raw){
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) keys = parsed.filter(Boolean).slice(0, 7);
        }
      }catch(_){}
      const history = [];
      for (const dateKey of keys){
        try{
          const raw = await env.FORTUNES.get(`FORTUNE:${record.id}:${dateKey}`);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed && parsed.fortune){
            history.push({
              dateKey,
              fortune: parsed.fortune,
              meta: parsed.meta,
              version: parsed.version,
              source: parsed.source,
              createdAt: parsed.createdAt
            });
          }
        }catch(_){}
      }
      history.sort((a,b)=> String(b.dateKey || '').localeCompare(String(a.dateKey || '')));
      return new Response(JSON.stringify({ ok:true, history }), { status:200, headers });
    }
    const todayKey = taipeiDateKey();
    const targetVersion = FORTUNE_FORMAT_VERSION;
    const cacheKey = `FORTUNE:${record.id}:${todayKey}`;
    try{
      const cached = await env.FORTUNES.get(cacheKey);
      if (cached){
        let parsed = null;
        try{ parsed = JSON.parse(cached); }catch(_){ parsed = null; }
        const cachedCode = String(parsed?.fortune?.meta?.guardianCode || parsed?.meta?.guardianCode || '').toUpperCase();
        const currentCode = String(record?.guardian?.code || '').toUpperCase();
        const cachedVersion = String(parsed?.version || '');
        if (cachedCode && currentCode && cachedCode === currentCode && cachedVersion === targetVersion){
          try{ await ensureFortuneIndex(env, record.id, todayKey); }catch(_){}
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
    const buddhistYear = parts.year + 543;
    const traitList = Array.isArray(quiz.traits) ? quiz.traits : [];
    const signals = buildUserSignals(quiz);
    const todayWeekdayKey = toWeekdayKey(parts.dow);
    const birthWeekdayKey = toBirthWeekdayKey(quiz) || todayWeekdayKey || '';
    const taksa = getMahaTaksa(birthWeekdayKey || todayWeekdayKey, todayWeekdayKey);
    const yam = getYamUbakong(todayWeekdayKey);
    const dayColor = getThaiDayColor(todayWeekdayKey);
    const tabooColor = deriveTabooColor(birthWeekdayKey);
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
    const luckyNumbers = buildLuckyNumbers(`${seedStr}|${seed}`);
    const meta = {
      dateKey: todayKey,
      userZodiac,
      userZodiacElement,
      moonPhase: moon.name,
      iching,
      todayDow: ['日','一','二','三','四','五','六'][parts.dow] || '',
      thaiDayColor: dayColor,
      buddhistYear,
      guardianName: guardian.name || guardian.code || '守護神',
      guardianCode: String(guardian.code || '').toUpperCase(),
      thaiTaksa: taksa,
      yam,
      lucky: { dayColor, tabooColor, numbers: luckyNumbers },
      signals
    };
    const ctx = {
      dateText,
      guardianName: guardian.name || guardian.code || '守護神',
      guardianCode: String(guardian.code || '').toUpperCase(),
      quiz,
      meta,
      thaiTaksa: taksa,
      yam,
      lucky: { dayColor, tabooColor, numbers: luckyNumbers }
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
    const forceLocal = String(env.FORTUNE_FORCE_LOCAL || '') === '1';
    const adviceLine = buildAdviceLine(seed);
    const starText = buildStarText(seed);
    const avoidSummaries = history.map(h=>h.summary).filter(Boolean).slice(0, 5);
    const avoidAdvice = history.map(h=>h.advice).filter(Boolean).slice(0, 5);
    const avoidTasks = history.map(h=>h.action && h.action.task).filter(Boolean).slice(0, 5);
    const personalTask = pickPersonalTask({
      phum: taksa.phum,
      signals,
      seed,
      avoidTasks
    });
    const hasPersonalTask = personalTask && personalTask.task;
    let fortune = null;
    let source = 'local';
    const taksaLabel = PHUM_LABEL[taksa.phum] || taksa.phum || '—';
    const timingBest = (yam.best || []).map(s=>({ start:s.start, end:s.end, level:s.level }));
    const timingAvoid = (yam.forbidden || []).map(s=>({ start:s.start, end:s.end, level:s.level }));
    const guardianTone = GUARDIAN_TONE[ctx.guardianCode] || '穩定、行動導向';
    const schema = `{"summary":"","advice":"","ritual":"","mantra":"","action":{"task":"","why":""},"core":{"phum":"","dayPlanetNo":0,"birthDayKey":"","todayWeekdayKey":"","isWarning":false},"timing":{"best":[{"start":"","end":"","level":""}],"avoid":[{"start":"","end":"","level":""}]},"lucky":{"color":"","tabooColor":"","numbers":[0,0]}}`;
    const prompt = [
      `今天日期：${dateText}（台灣時間）`,
      `當日天象：月相 ${moon.name}，易經 ${iching}`,
      `泰國骨架：Maha Taksa 今日宮位 ${taksa.phum}（${taksaLabel}），dayPlanetNo=${taksa.dayPlanetNo}，isWarning=${taksa.isWarning}`,
      `Yam Ubakong 時段：best=${JSON.stringify(timingBest)}，avoid=${JSON.stringify(timingAvoid)}`,
      `幸運色：${ctx.lucky.dayColor || '—'}，tabooColor：${ctx.lucky.tabooColor || '—'}，幸運數字：${ctx.lucky.numbers.join(', ')}`,
      `守護神：${ctx.guardianName}（${ctx.guardianCode}），語氣基調：${guardianTone}`,
      `出生星期：${quiz.dowLabel || quiz.dow || '—'}`,
      `使用者星座：${userZodiac || '—'}${userZodiacElement ? `（${userZodiacElement}象）` : ''}`,
      `工作類型：${quiz.jobLabel || quiz.job || '—'}`,
      `個人性格關鍵詞：${traitList.join('、') || '—'}`,
      `使用者訊號：${JSON.stringify(signals)}`,
      `可用短咒語清單（擇一）：${MANTRA_LIST.join(' / ')}`,
      `規則：只回傳 JSON，欄位必須符合 schema，禁止新增欄位；不得使用模糊巴納姆語句。`,
      `summary 第一個句子必須點名「今天是 ${taksaLabel} 日」，不可改寫骨架事實。`,
      `core/timing/lucky 必須與輸入骨架一致，不可改寫；若不一致視為無效輸出。`,
      `action.task 必須完全等於「${personalTask.task}」，不得改寫或換詞。`,
      `action.task 必須 15 分鐘內可完成、可打勾驗證，且不可與 avoidTasks 重複。`,
      `action.why 必須對應 ${taksa.phum} 與 ${signals.focus.join('、') || '工作'}。`,
      `timing.best / timing.avoid 必須使用上述 Yam 時段，不可自造。`,
      `lucky.color 與 lucky.numbers 必須等於以上骨架值，不可自造。`,
      `ritual 必須是微儀式，不可強迫、不危險、不含醫療或法律斷言。`,
      signals.keywords && signals.keywords.length
        ? `advice 必須包含下列任一關鍵詞：${signals.keywords.join('、')}`
        : `advice 必須提到工作類型或關注領域（${signals.job} / ${signals.focus.join('、') || '工作'}）`,
      `如果 advice 提到職業（signals.job 或 jobLabel），必須用方法論表達（例如「用管理/行政式的方法去整理、協調、請求資源」），禁止使用「{job}會是你今天的關鍵」這種身分直述句。`,
      avoidSummaries.length ? `避免與過去 summary 太相似：${avoidSummaries.join(' / ')}` : '',
      avoidAdvice.length ? `避免與過去 advice 太相似：${avoidAdvice.join(' / ')}` : '',
      avoidTasks.length ? `avoidTasks：${avoidTasks.join(' / ')}` : '',
      `JSON schema：${schema}`
    ].filter(Boolean).join('\n');
    const systemPrompt = '你是泰國 Maha Taksa + Mutelu 的祭司。請以繁體中文撰寫，嚴格遵守骨架事實與 JSON schema。';

    ctx.userSignals = signals;
    ctx.personalTask = personalTask;
    if (!forceLocal && hasPersonalTask){
      fortune = normalizeFortunePayloadV2(await callOpenAIFortune(env, prompt, seed, systemPrompt), ctx);
      source = fortune ? 'openai' : 'local';
    }
    if (fortune && isTooSimilar(fortune, history)){
      if (!forceLocal){
        const personalAlt = pickPersonalTask({
          phum: taksa.phum,
          signals,
          seed: seed + 1,
          avoidTasks
        });
        const promptAlt = prompt + `\naction.task 與 avoidTasks 重複，請更換成新的可勾選任務，且必須等於「${personalAlt.task}」。其餘骨架保持不變。`;
        const altCtx = Object.assign({}, ctx, { personalTask: personalAlt });
        const alt = normalizeFortunePayloadV2(await callOpenAIFortune(env, promptAlt, seed + 1, systemPrompt), altCtx);
        if (alt && !isTooSimilar(alt, history)){
          fortune = alt;
          source = 'openai';
        }else{
          fortune = buildLocalFortuneV2(ctx, seed + 17, avoidTasks, signals);
          source = 'local';
        }
      }else{
        fortune = buildLocalFortuneV2(ctx, seed + 17, avoidTasks, signals);
        source = 'local';
      }
    }
    if (!fortune){
      fortune = buildLocalFortuneV2(ctx, seed + 17, avoidTasks, signals);
      source = 'local';
    }
    if (fortune && fortune.summary){
      fortune.summary = normalizeSummaryStars(fortune.summary);
    }
    if (fortune && !fortune.summary){
      const fallback = buildLocalFortuneV2(ctx, seed + 53, avoidTasks, signals);
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
      fortune = buildLocalFortuneV2(ctx, seed + 37, avoidTasks, signals);
      source = 'local';
    }
    const payload = {
      ok:true,
      fortune,
      meta,
      dateKey: todayKey,
      version: targetVersion,
      source,
      createdAt: new Date().toISOString()
    };
    try{
      await env.FORTUNES.put(cacheKey, JSON.stringify(payload));
      await ensureFortuneIndex(env, record.id, todayKey);
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

  if (pathname === '/api/foods/meta') {
    if (request.method === 'GET'){
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      const raw = await env.FOODS.get('FOOD_MAP_META');
      const meta = raw ? JSON.parse(raw) : {};
      return json({ ok:true, meta });
    }
    if (request.method === 'POST'){
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      {
        const guard = await requireAdminPermission(request, env, 'food_map_edit');
        if (guard) return guard;
      }
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      const body = await request.json().catch(()=>({}));
      const prev = await env.FOODS.get('FOOD_MAP_META').then(r=>r?JSON.parse(r):{}).catch(()=>({}));
      const next = Object.assign({}, prev, body);
      await env.FOODS.put('FOOD_MAP_META', JSON.stringify(next));
      return json({ ok:true, meta: next });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  // Food map data (list / admin upsert)
  if (pathname === '/api/foods') {
    if (request.method === 'GET'){
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      const cached = await readFoodsListCache(env);
      if (cached){
        return jsonWithHeaders({ ok:true, items: cached }, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
      }
      const items = await listFoods(env, 2000, { cache: true }); // 提高讀取上限
      await writeFoodsListCache(env, items);
      return jsonWithHeaders({ ok:true, items }, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
    }
    if (request.method === 'DELETE'){
      const isAdminUser = await isAdmin(request, env);
      if (isAdminUser){
        const permGuard = await requireAdminPermission(request, env, 'food_map_edit');
        if (permGuard) return permGuard;
      }
      let creatorRecord = null;
      if (!isAdminUser){
        creatorRecord = await getSessionUserRecord(request, env);
        if (!isFoodCreator(creatorRecord)) return json({ ok:false, error:'unauthorized' }, 401);
        if (!hasCreatorTermsAccepted(creatorRecord)) return json({ ok:false, error:'terms_required' }, 403);
      }
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      let id = url.searchParams.get('id') || '';
      if (!id){
        try{
          const body = await request.json().catch(()=>({}));
          id = String(body.id || '').trim();
        }catch(_){}
      }
      if (!id) return json({ ok:false, error:'missing id' }, 400);
      if (!isAdminUser && creatorRecord){
        const existing = await readFood(env, id);
        if (!existing) return json({ ok:false, error:'not found' }, 404);
        if (String(existing.ownerId || '') !== String(creatorRecord.id)){
          return json({ ok:false, error:'forbidden' }, 403);
        }
      }
      const now = new Date().toISOString();
      await saveFood(env, { id, deleted:true, updatedAt: now });
      resetFoodsListMemoryCache();
      await upsertFoodsListCache(env, { id, deleted:true });
      return json({ ok:true, id, deleted:true });
    }
    if (request.method === 'POST'){
      const isAdminUser = await isAdmin(request, env);
      if (isAdminUser){
        const permGuard = await requireAdminPermission(request, env, 'food_map_edit');
        if (permGuard) return permGuard;
      }
      let creatorRecord = null;
      if (!isAdminUser){
        creatorRecord = await getSessionUserRecord(request, env);
        if (!isFoodCreator(creatorRecord)) return json({ ok:false, error:'unauthorized' }, 401);
        if (!hasCreatorTermsAccepted(creatorRecord)) return json({ ok:false, error:'terms_required' }, 403);
      }
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
      try{
        const body = await request.json().catch(()=>({}));
        const now = new Date().toISOString();
        const incoming = normalizeFoodPayload(body, `food-${Date.now()}`);
        if (!incoming) return json({ ok:false, error:'missing id' }, 400);
        const existing = await readFood(env, incoming.id);
        if (!isAdminUser && creatorRecord){
          if (existing && String(existing.ownerId || '') !== String(creatorRecord.id)){
            return json({ ok:false, error:'forbidden' }, 403);
          }
          incoming.ownerId = creatorRecord.id;
          if (!incoming.ownerName) incoming.ownerName = resolveCreatorName(creatorRecord);
        }
        const obj = mergeFoodRecord(existing, incoming);
        if (!isAdminUser && creatorRecord){
          obj.ownerId = creatorRecord.id;
          if (!obj.ownerName) obj.ownerName = resolveCreatorName(creatorRecord);
          obj.creatorIg = creatorRecord.creatorIg || '';
          obj.creatorYoutube = creatorRecord.creatorYoutube || '';
          obj.creatorFacebook = creatorRecord.creatorFacebook || '';
          obj.creatorTiktok = creatorRecord.creatorTiktok || '';
          obj.creatorIntro = creatorRecord.creatorIntro || '';
          obj.creatorAvatar = creatorRecord.creatorAvatar || '';
          obj.creatorCover = creatorRecord.creatorCover || '';
          obj.creatorCoverPos = creatorRecord.creatorCoverPos || '50% 50%';
        }
        obj.updatedAt = now;
        if (!parseLatLngPair(obj.lat, obj.lng)){
          const coords = await resolveFoodCoords(env, obj);
          if (coords){
            obj.lat = coords.lat;
            obj.lng = coords.lng;
          }
        }
        await saveFood(env, obj);
        resetFoodsListMemoryCache();
        await upsertFoodsListCache(env, obj);
        return json({ ok:true, item: obj });
      }catch(e){
        return json({ ok:false, error:String(e) }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/foods/geocode' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'food_map_edit');
      if (guard) return guard;
    }
    if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const ids = Array.isArray(body.ids) ? body.ids.map(v=>String(v||'').trim()).filter(Boolean) : [];
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 300) || 300));
    const force = String(url.searchParams.get('force') || '').toLowerCase() === 'true';
    let items = [];
    if (ids.length){
      for (const id of ids){
        const item = await readFood(env, id);
        if (item) items.push(item);
      }
    }else{
      items = await listFoods(env, limit, { cache: false });
    }
    let updated = 0;
    let checked = 0;
    let failed = 0;
    let skipped = 0;
    for (const item of items){
      checked += 1;
      if (!force && parseLatLngPair(item.lat, item.lng)){
        skipped += 1;
        continue;
      }
      const coords = await resolveFoodCoords(env, item);
      if (coords){
        item.lat = coords.lat;
        item.lng = coords.lng;
        item.updatedAt = new Date().toISOString();
        await saveFood(env, item);
        updated += 1;
      }else{
        failed += 1;
      }
    }
    if (updated){
      resetFoodsListMemoryCache();
      await deleteFoodsListCache(env);
    }
    return json({ ok:true, checked, updated, failed, skipped, total: items.length });
  }




  if (pathname === '/api/foods/rebuild-cache' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'food_map_edit');
      if (guard) return guard;
    }
    if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
    resetFoodsListMemoryCache();
    await deleteFoodsListCache(env);
    return json({ ok:true });
  }

  if (pathname === '/api/foods/sync' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'food_map_edit');
      if (guard) return guard;
    }
    if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ ok:false, error:'missing items' }, 400);
    const geocode = String(body.geocode || url.searchParams.get('geocode') || '').toLowerCase() === 'true';
    const limit = Math.min(items.length, 1000);
    let saved = 0;
    let updated = 0;
    let failed = 0;
    for (const raw of items.slice(0, limit)){
      try{
        const incoming = normalizeFoodPayload(raw);
        if (!incoming || !incoming.id){ failed += 1; continue; }
        const existing = await readFood(env, incoming.id);
        const obj = mergeFoodRecord(existing, incoming, { preserveExisting: true });
        if (geocode && !parseLatLngPair(obj.lat, obj.lng)){
          const coords = await resolveFoodCoords(env, obj);
          if (coords){
            obj.lat = coords.lat;
            obj.lng = coords.lng;
          }
        }
        obj.updatedAt = new Date().toISOString();
        await saveFood(env, obj);
        if (existing) updated += 1;
        else saved += 1;
      }catch(_){
        failed += 1;
      }
    }
    if (saved || updated){
      resetFoodsListMemoryCache();
      await deleteFoodsListCache(env);
    }
    return json({ ok:true, saved, updated, failed, total: limit, geocode });
  }

  if (pathname === '/api/track' && request.method === 'POST'){
    const store = pickTrackStore(env);
    if (!store) return json({ ok:false, error:'TRACK store not bound' }, 500);
    const ip = getClientIp(request) || 'unknown';
    const allowed = await checkRateLimit(env, `track:${ip}`, 90, 60);
    if (!allowed) return json({ ok:false, error:'Too many requests' }, 429);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const eventName = normalizeTrackEvent(body.event);
    if (!eventName) return json({ ok:false, error:'missing event' }, 400);
    const utm = body && body.utm && typeof body.utm === 'object' ? body.utm : {};
    await recordTrackEvent(env, eventName, utm);
    return json({ ok:true });
  }

  if (pathname === '/api/foods/track' && request.method === 'POST'){
    const ip = getClientIp(request) || 'unknown';
    let clientId = ip;
    try{
      const user = await getSessionUser(request, env);
      if (user && user.id) clientId = user.id;
    }catch(_){}
    const todayKey = taipeiDateKey();
    await recordFoodMapStat(env, todayKey, clientId);
    return json({ ok:true });
  }
if (pathname === '/api/me/temple-favs') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (request.method === 'GET'){
      return json({ ok:true, favorites: Array.isArray(record.favoritesTemples) ? record.favoritesTemples : [] });
    }
    if (request.method === 'POST'){
      try{
        const body = await request.json().catch(()=>({}));
        const id = String(body.id||'').trim();
        if (!id) return json({ ok:false, error:'missing id' }, 400);
        const action = (body.action || 'toggle').toLowerCase();
        const list = Array.isArray(record.favoritesTemples) ? record.favoritesTemples.slice() : [];
        const idx = list.indexOf(id);
        if (action === 'remove'){ if (idx!==-1) list.splice(idx,1); }
        else if (action === 'add'){ if (idx===-1) list.unshift(id); }
        else { if (idx===-1) list.unshift(id); else list.splice(idx,1); }
        record.favoritesTemples = list.slice(0, 500);
        await saveUserRecord(env, record);
        return json({ ok:true, favorites: record.favoritesTemples });
      }catch(_){
        return json({ ok:false, error:'invalid payload' }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/admin/status' && request.method === 'GET') {
    const admin = await isAdmin(request, env);
    return json({ ok:true, admin: !!admin }, 200, request, env);
  }

  if (pathname === '/api/ig/cover' && request.method === 'GET') {
    const headers = jsonHeadersFor(request, env);
    const targetRaw = url.searchParams.get('url') || url.searchParams.get('u') || '';
    const target = normalizeInstagramPostUrl(targetRaw);
    if (!target) {
      return new Response(JSON.stringify({ ok:false, error:'invalid_url' }), { status:400, headers });
    }
    const ip = getClientIp(request) || '0.0.0.0';
    const allowed = await checkRateLimit(env, `rl:igcover:${ip}`, 40, 60);
    if (!allowed) {
      return new Response(JSON.stringify({ ok:false, error:'rate_limited' }), { status:429, headers });
    }
    try{
      const resp = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (!resp.ok) {
        return new Response(JSON.stringify({ ok:false, error:'fetch_failed' }), { status:502, headers });
      }
      const html = await resp.text();
      const cover = extractMetaImage(html);
      if (!cover) {
        return new Response(JSON.stringify({ ok:false, error:'not_found' }), { status:404, headers });
      }
      headers['Cache-Control'] = 'public, max-age=3600';
      return new Response(JSON.stringify({ ok:true, cover }), { status:200, headers });
    }catch(err){
      return new Response(JSON.stringify({ ok:false, error:'fetch_error' }), { status:502, headers });
    }
  }

  if (pathname === '/api/temples/meta') {
    if (request.method === 'GET'){
      if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
      const raw = await env.TEMPLES.get('TEMPLE_MAP_META');
      const meta = raw ? JSON.parse(raw) : {};
      return json({ ok:true, meta });
    }
    if (request.method === 'POST'){
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      {
        const guard = await requireAdminPermission(request, env, 'temple_map_edit');
        if (guard) return guard;
      }
      if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
      const body = await request.json().catch(()=>({}));
      const prev = await env.TEMPLES.get('TEMPLE_MAP_META').then(r=>r?JSON.parse(r):{}).catch(()=>({}));
      const next = Object.assign({}, prev, body);
      await env.TEMPLES.put('TEMPLE_MAP_META', JSON.stringify(next));
      return json({ ok:true, meta: next });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/shop/meta') {
    if (request.method === 'GET'){
      if (!env.PRODUCTS) return json({ ok:false, error:'PRODUCTS KV not bound' }, 500);
      const raw = await env.PRODUCTS.get('SHOP_PAGE_META');
      const meta = raw ? JSON.parse(raw) : {};
      return json({ ok:true, meta });
    }
    if (request.method === 'POST'){
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      {
        const guard = await requireAdminPermission(request, env, 'shop_meta_edit');
        if (guard) return guard;
      }
      if (!env.PRODUCTS) return json({ ok:false, error:'PRODUCTS KV not bound' }, 500);
      const body = await request.json().catch(()=>({}));
      const prev = await env.PRODUCTS.get('SHOP_PAGE_META').then(r=>r?JSON.parse(r):{}).catch(()=>({}));
      const next = Object.assign({}, prev, body);
      await env.PRODUCTS.put('SHOP_PAGE_META', JSON.stringify(next));
      return json({ ok:true, meta: next });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/service/meta') {
    if (request.method === 'GET'){
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store) return json({ ok:false, error:'SERVICE_PRODUCTS/PRODUCTS KV not bound' }, 500);
      const raw = await store.get('SERVICE_PAGE_META');
      const meta = raw ? JSON.parse(raw) : {};
      return json({ ok:true, meta });
    }
    if (request.method === 'POST'){
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      {
        const guard = await requireAdminPermission(request, env, 'service_meta_edit');
        if (guard) return guard;
      }
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store) return json({ ok:false, error:'SERVICE_PRODUCTS/PRODUCTS KV not bound' }, 500);
      const body = await request.json().catch(()=>({}));
      const prev = await store.get('SERVICE_PAGE_META').then(r=>r?JSON.parse(r):{}).catch(()=>({}));
      const next = Object.assign({}, prev, body);
      await store.put('SERVICE_PAGE_META', JSON.stringify(next));
      return json({ ok:true, meta: next });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/page-meta') {
    const page = (url.searchParams.get('page') || '').trim();
    if (!page) return json({ ok:false, error:'missing page' }, 400);
    const store = env.PAGE_CONTENT || env.PRODUCTS || env.SERVICE_PRODUCTS;
    if (!store) return json({ ok:false, error:'PAGE_CONTENT/PRODUCTS KV not bound' }, 500);
    const key = `PAGE_META:${page}`;
    if (request.method === 'GET'){
      const raw = await store.get(key);
      const meta = raw ? JSON.parse(raw) : {};
      return json({ ok:true, meta });
    }
    if (request.method === 'POST'){
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      {
        const guard = await requireAdminPermission(request, env, 'page_meta_edit');
        if (guard) return guard;
      }
      const body = await request.json().catch(()=>({}));
      const meta = body && typeof body.meta === 'object' && body.meta ? body.meta : {};
      await store.put(key, JSON.stringify(meta));
      return json({ ok:true, meta });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/service-guide/content') {
    if (request.method === 'GET'){
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store) return json({ ok:false, error:'SERVICE_PRODUCTS/PRODUCTS KV not bound' }, 500);
      const raw = await store.get('SERVICE_GUIDE_CONTENT');
      const content = raw ? JSON.parse(raw) : {};
      return json({ ok:true, html: content.html || '' });
    }
    if (request.method === 'POST'){
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      {
        const guard = await requireAdminPermission(request, env, 'service_guide_edit');
        if (guard) return guard;
      }
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store) return json({ ok:false, error:'SERVICE_PRODUCTS/PRODUCTS KV not bound' }, 500);
      const body = await request.json().catch(()=>({}));
      const html = typeof body.html === 'string' ? body.html.trim() : '';
      if (!html) return json({ ok:false, error:'missing html' }, 400);
      const payload = { html, updatedAt: new Date().toISOString() };
      await store.put('SERVICE_GUIDE_CONTENT', JSON.stringify(payload));
      return json({ ok:true, html });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  // Temple map data (list / admin upsert)
  if (pathname === '/api/temples') {
    if (request.method === 'GET'){
      if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
      const cached = await readTemplesListCache(env);
      if (cached){
        return jsonWithHeaders({ ok:true, items: cached }, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
      }
      const items = await listTemples(env, 2000, { cache: true }); // 提高讀取上限
      await writeTemplesListCache(env, items);
      return jsonWithHeaders({ ok:true, items }, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
    }
    if (request.method === 'DELETE'){
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await requireAdminPermission(request, env, 'temple_map_edit');
        if (guard) return guard;
      }
      if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
      let id = url.searchParams.get('id') || '';
      if (!id){
        try{
          const body = await request.json().catch(()=>({}));
          id = String(body.id || '').trim();
        }catch(_){}
      }
      if (!id) return json({ ok:false, error:'missing id' }, 400);
      const now = new Date().toISOString();
      await saveTemple(env, { id, deleted:true, updatedAt: now });
      resetTemplesListMemoryCache();
      await upsertTemplesListCache(env, { id, deleted:true });
      return json({ ok:true, id, deleted:true });
    }
    if (request.method === 'POST'){
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await requireAdminPermission(request, env, 'temple_map_edit');
        if (guard) return guard;
      }
      if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
      try{
        const body = await request.json().catch(()=>({}));
        const now = new Date().toISOString();
        const incoming = normalizeTemplePayload(body, `temple-${Date.now()}`);
        if (!incoming) return json({ ok:false, error:'missing id' }, 400);
        const existing = await readTemple(env, incoming.id);
        const obj = mergeTempleRecord(existing, incoming);
        obj.updatedAt = now;
        if (!parseLatLngPair(obj.lat, obj.lng)){
          const coords = await resolveTempleCoords(env, obj);
          if (coords){
            obj.lat = coords.lat;
            obj.lng = coords.lng;
          }
        }
        await saveTemple(env, obj);
        resetTemplesListMemoryCache();
        await upsertTemplesListCache(env, obj);
        return json({ ok:true, item: obj });
      }catch(e){
        return json({ ok:false, error:String(e) }, 400);
      }
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/temples/geocode' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'temple_map_edit');
      if (guard) return guard;
    }
    if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const ids = Array.isArray(body.ids) ? body.ids.map(v=>String(v||'').trim()).filter(Boolean) : [];
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 300) || 300));
    const force = String(url.searchParams.get('force') || '').toLowerCase() === 'true';
    let items = [];
    if (ids.length){
      for (const id of ids){
        const item = await readTemple(env, id);
        if (item) items.push(item);
      }
    }else{
      items = await listTemples(env, limit, { cache: false });
    }
    let updated = 0;
    let checked = 0;
    let failed = 0;
    let skipped = 0;
    for (const item of items){
      checked += 1;
      if (!force && parseLatLngPair(item.lat, item.lng)){
        skipped += 1;
        continue;
      }
      const coords = await resolveTempleCoords(env, item);
      if (coords){
        item.lat = coords.lat;
        item.lng = coords.lng;
        item.updatedAt = new Date().toISOString();
        await saveTemple(env, item);
        updated += 1;
      }else{
        failed += 1;
      }
    }
    if (updated){
      resetTemplesListMemoryCache();
      await deleteTemplesListCache(env);
    }
    return json({ ok:true, checked, updated, failed, skipped, total: items.length });
  }




  if (pathname === '/api/temples/hours' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'temple_map_edit');
      if (guard) return guard;
    }
    if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
    const key = (env.GOOGLE_MAPS_KEY || env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAP_API_KEY || env.GOOGLE_API_KEY || env.MAPS_API_KEY || env.GMAPS_KEY || '').trim();
    if (!key) return json({ ok:false, error:'missing google maps key' }, 500);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){ }
    const ids = Array.isArray(body.ids) ? body.ids.map(v=>String(v||'').trim()).filter(Boolean) : [];
    const limit = Math.max(1, Math.min(300, Number(body.limit || url.searchParams.get('limit') || 100) || 100));
    const force = String(body.force || url.searchParams.get('force') || '').toLowerCase() === 'true';
    let items = [];
    if (ids.length){
      for (const id of ids){
        const item = await readTemple(env, id);
        if (item) items.push(item);
      }
    }else{
      items = await listTemples(env, limit, { cache: false });
    }
    let updated = 0;
    let checked = 0;
    let failed = 0;
    let skipped = 0;
    for (const item of items){
      checked += 1;
      if (!force && hasNormalizedHours(item.hours)){
        skipped += 1;
        continue;
      }
      let hours = await resolveTempleHours(env, item);
      if (!hours){
        hours = normalizeHoursFallback(item.hours);
      }
      if (hours && String(hours || '').trim()){
        item.hours = hours;
        item.updatedAt = new Date().toISOString();
        await saveTemple(env, item);
        updated += 1;
      }else{
        failed += 1;
      }
    }
    if (updated){
      resetTemplesListMemoryCache();
      await deleteTemplesListCache(env);
    }
    return json({ ok:true, checked, updated, failed, skipped, total: items.length });
  }

  if (pathname === '/api/temples/rebuild-cache' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'temple_map_edit');
      if (guard) return guard;
    }
    if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
    resetTemplesListMemoryCache();
    await deleteTemplesListCache(env);
    return json({ ok:true });
  }

  if (pathname === '/api/temples/sync' && request.method === 'POST'){
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await requireAdminPermission(request, env, 'temple_map_edit');
      if (guard) return guard;
    }
    if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500);
    let body = {};
    try{ body = await request.json().catch(()=>({})); }catch(_){}
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ ok:false, error:'missing items' }, 400);
    const geocode = String(body.geocode || url.searchParams.get('geocode') || '').toLowerCase() === 'true';
    const limit = Math.min(items.length, 1000);
    let saved = 0;
    let updated = 0;
    let failed = 0;
    for (const raw of items.slice(0, limit)){
      try{
        const incoming = normalizeTemplePayload(raw);
        if (!incoming || !incoming.id){ failed += 1; continue; }
        const existing = await readTemple(env, incoming.id);
        const obj = mergeTempleRecord(existing, incoming, { preserveExisting: true });
        if (geocode && !parseLatLngPair(obj.lat, obj.lng)){
          const coords = await resolveTempleCoords(env, obj);
          if (coords){
            obj.lat = coords.lat;
            obj.lng = coords.lng;
          }
        }
        obj.updatedAt = new Date().toISOString();
        await saveTemple(env, obj);
        if (existing) updated += 1;
        else saved += 1;
      }catch(_){
        failed += 1;
      }
    }
    if (saved || updated){
      resetTemplesListMemoryCache();
      await deleteTemplesListCache(env);
    }
    return json({ ok:true, saved, updated, failed, total: limit, geocode });
  }

  if (pathname === '/api/temples/track' && request.method === 'POST'){
    const ip = getClientIp(request) || 'unknown';
    let clientId = ip;
    try{
      const user = await getSessionUser(request, env);
      if (user && user.id) clientId = user.id;
    }catch(_){}
    const todayKey = taipeiDateKey();
    await recordTempleMapStat(env, todayKey, clientId);
    return json({ ok:true });
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

  if (pathname === '/api/order/qna') {
    if (request.method === 'OPTIONS') return corsPreflight();
    const adminSession = await getAdminSession(request, env);
    const adminKeyOk = await isAdmin(request, env);
    const isAdminUser = !!adminSession || adminKeyOk;
    const adminRole = adminSession && adminSession.email ? await getAdminRole(adminSession.email, env) : '';
    let body = {};
    if (request.method !== 'GET') {
      try{ body = await request.json(); }catch(_){ body = {}; }
    }
    const orderId = String(
      (request.method === 'GET' ? url.searchParams.get('orderId') : (body.orderId || body.id || ''))
      || url.searchParams.get('orderId')
      || ''
    ).trim();
    if (!orderId) return json({ ok:false, error:'missing orderId' }, 400);
    const found = await findOrderByIdForQna(env, orderId);
    if (!found || !found.order) return json({ ok:false, error:'order not found' }, 404);
    const order = found.order;
    const store = found.store;
    const orderType = found.type || 'physical';
    let record = null;
    if (!isAdminUser){
      record = await getSessionUserRecord(request, env);
      if (!record) return json({ ok:false, error:'unauthorized' }, 401);
      if (!orderBelongsToUser(order, record)) return json({ ok:false, error:'forbidden' }, 403);
    }
    if (request.method === 'GET'){
      const items = await loadOrderQna(store, orderId);
      if (!isAdminUser && record){
        if (!order?.buyer?.uid){
          order.buyer = order.buyer || {};
          order.buyer.uid = record.id;
          try{ await store.put(orderId, JSON.stringify(order)); }catch(_){}
        }
        await clearUserUnreadForOrder(env, record.id, orderId, store);
      }
      return json({ ok:true, orderId, items: items.map(sanitizeQnaItem) });
    }
    const items = await loadOrderQna(store, orderId);
    if (request.method === 'POST'){
      const text = String(body.text || '').trim();
      if (!text) return json({ ok:false, error:'empty text' }, 400);
      if (text.length > 1000) return json({ ok:false, error:'text too long' }, 400);
      const now = new Date().toISOString();
      const role = isAdminUser ? 'admin' : 'user';
      const name = isAdminUser
        ? (adminSession && (adminSession.name || adminSession.email)) || '客服'
        : (record && (record.name || record.email)) || (order?.buyer?.name || '會員');
      const item = {
        id: crypto.randomUUID(),
        role,
        text,
        ts: now,
        name,
        uid: isAdminUser ? '' : (record ? record.id : '')
      };
      items.push(item);
      await saveOrderQna(store, orderId, items);
      if (role === 'user') {
        await incrementAdminQnaUnread(env, store, 1);
      }

      try{
        const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
        const originUrl = env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://unalomecodes.com';
        const base = originUrl.replace(/\/$/, '');
        const orderLinkAdmin = `${base}/${orderType === 'service' ? 'admin/service-orders' : 'admin/orders'}`;
        const orderLinkCustomer = `${base}/account-orders`;
        const buyerEmail = String(order?.buyer?.email || order?.buyer_email || order?.email || '').trim();
        const adminRaw = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
        const adminTo = Array.from(new Set(['bkkaiwei@gmail.com', ...adminRaw]));
        const itemsList = buildOrderItems(order).map(it=>{
          const spec = it.spec ? `（${it.spec}）` : '';
          return `${it.name}${spec} × ${it.qty}`;
        }).join('、') || (order?.serviceName || order?.productName || '');
        const emailName = role === 'admin' ? '賣家' : name;
        const esc = (val)=>{
          const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
          return String(val || '').replace(/[&<>"']/g, m => map[m] || m);
        };
        const htmlBase = `
          <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px;background:#f5f7fb;">
            <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
              <p style="margin:0 0 12px;font-weight:700;font-size:18px;">${esc(siteName)}</p>
              <p>訂單編號：${esc(orderId)}</p>
              ${itemsList ? `<p>商品：${esc(itemsList)}</p>` : ''}
              <div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <p style="margin:0 0 6px;"><strong>留言人：</strong>${esc(emailName)}</p>
                <p style="margin:0;"><strong>內容：</strong><br>${esc(text)}</p>
              </div>
            </div>
          </div>
        `;
        if (role === 'user'){
          await maybeSendOrderQnaEmail(env, {
            to: adminTo,
            subject: `[${siteName}] 訂單新留言 ${orderId}`,
            html: htmlBase,
            text: `${siteName} 訂單新留言\n訂單編號：${orderId}\n商品：${itemsList}\n留言人：${emailName}\n內容：${text}\n管理頁：${orderLinkAdmin}`
          });
        }else if (buyerEmail){
          await maybeSendOrderQnaEmail(env, {
            to: [buyerEmail],
            subject: `[${siteName}] 訂單回覆 ${orderId}`,
            html: htmlBase,
            text: `${siteName} 訂單回覆\n訂單編號：${orderId}\n商品：${itemsList}\n回覆人：${emailName}\n內容：${text}\n查詢訂單：${orderLinkCustomer}`
          });
        }
      }catch(_){}

      if (role === 'admin') {
        let uid = order?.buyer?.uid || '';
        if (!uid && buyerEmail){
          uid = await findUserIdByEmail(env, buyerEmail);
          if (uid){
            order.buyer = order.buyer || {};
            order.buyer.uid = uid;
            try{ await store.put(orderId, JSON.stringify(order)); }catch(_){}
          }
        }
        if (uid) await incrementUserUnreadForOrder(env, uid, orderId, 1, store);
      }

      return json({ ok:true, item: sanitizeQnaItem(item) });
    }
    if (request.method === 'PATCH'){
      const msgId = String(body.id || '').trim();
      const text = String(body.text || '').trim();
      if (!msgId) return json({ ok:false, error:'missing id' }, 400);
      if (!text) return json({ ok:false, error:'empty text' }, 400);
      if (text.length > 1000) return json({ ok:false, error:'text too long' }, 400);
      const idx = items.findIndex(it => it && it.id === msgId);
      if (idx === -1) return json({ ok:false, error:'not found' }, 404);
      const target = items[idx];
      if (!isAdminUser){
        if (target.role !== 'user' || !record || target.uid !== record.id) return json({ ok:false, error:'forbidden' }, 403);
      }
      target.text = text;
      target.updatedAt = new Date().toISOString();
      target.edited = true;
      items[idx] = target;
      await saveOrderQna(store, orderId, items);
      return json({ ok:true, item: sanitizeQnaItem(target) });
    }
    if (request.method === 'DELETE'){
      if (isAdminUser && adminRole === 'fulfillment'){
        return json({ ok:false, error:'forbidden_role' }, 403);
      }
      const msgId = String(body.id || url.searchParams.get('id') || '').trim();
      if (!msgId) return json({ ok:false, error:'missing id' }, 400);
      const idx = items.findIndex(it => it && it.id === msgId);
      if (idx === -1) return json({ ok:false, error:'not found' }, 404);
      const target = items[idx];
      if (!isAdminUser){
        if (target.role !== 'user' || !record || target.uid !== record.id) return json({ ok:false, error:'forbidden' }, 403);
      }
      items.splice(idx, 1);
      await saveOrderQna(store, orderId, items);
      return json({ ok:true });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/admin/qna/unread') {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    if (request.method === 'GET') {
      const unread = await getAdminQnaUnread(env, env.ORDERS || env.SERVICE_ORDERS || null);
      return json({ ok:true, unread }, 200, request, env);
    }
    if (request.method === 'POST') {
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const action = String(body.action || body.mode || '').toLowerCase();
      if (action === 'clear' || action === 'reset' || action === 'read') {
        const unread = await clearAdminQnaUnread(env, env.ORDERS || env.SERVICE_ORDERS || null);
        return json({ ok:true, unread }, 200, request, env);
      }
      return json({ ok:false, error:'invalid action' }, 400, request, env);
    }
    return json({ ok:false, error:'method not allowed' }, 405, request, env);
  }

  if (pathname === '/api/me/qna/unread') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    const store = getQnaMetaStore(env, env.ORDERS || env.SERVICE_ORDERS || null);
    if (request.method === 'GET') {
      const total = await getUserUnreadTotal(env, record.id, store);
      const detail = String(url.searchParams.get('detail') || '') === '1';
      if (!detail || !store || !store.list){
        return json({ ok:true, total });
      }
      const prefix = `QNA_USER_ORDER_UNREAD:${record.id}:`;
      const iter = await store.list({ prefix });
      const map = {};
      for (const key of (iter.keys || [])){
        if (!key || !key.name) continue;
        const orderId = key.name.replace(prefix, '');
        try{
          const raw = await store.get(key.name);
          const num = Number(raw || 0);
          if (Number.isFinite(num) && num > 0) map[orderId] = Math.floor(num);
        }catch(_){}
      }
      return json({ ok:true, total, orders: map });
    }
    if (request.method === 'POST') {
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const action = String(body.action || body.mode || '').toLowerCase();
      const orderId = String(body.orderId || body.id || '').trim();
      if (action === 'clear' && orderId){
        const total = await clearUserUnreadForOrder(env, record.id, orderId, store);
        return json({ ok:true, total });
      }
      if (action === 'clear' || action === 'reset' || action === 'read'){
        const total = await clearUserUnreadAll(env, record.id, store);
        return json({ ok:true, total });
      }
      return json({ ok:false, error:'invalid action' }, 400);
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  if (pathname === '/api/me/coupons/unread') {
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (request.method === 'GET') {
      const total = await getUserCouponUnread(env, record);
      return json({ ok:true, total });
    }
    if (request.method === 'POST') {
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const action = String(body.action || body.mode || '').toLowerCase();
      if (action === 'clear' || action === 'reset' || action === 'read') {
        record.couponsSeenAt = new Date().toISOString();
        await saveUserRecord(env, record);
        return json({ ok:true, total: 0 });
      }
      return json({ ok:false, error:'invalid action' }, 400);
    }
    return json({ ok:false, error:'method not allowed' }, 405);
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
      let recordChanged = false;
      const markSeen = ['1','true','yes'].includes(String(url.searchParams.get('mark') || '').toLowerCase());
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
        recordChanged = true;
      }
      if (markSeen){
        record.couponsSeenAt = new Date().toISOString();
        recordChanged = true;
      }
      if (recordChanged){
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
      return json({ ok:false, error:'Missing store' }, 400, request, env);
    }
    // 目前僅回傳門市資訊；未來若要綁暫存訂單，可在此處擴充
    return json({ ok:true, store }, 200, request, env);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500, request, env);
  }
}

if (pathname === '/api/payment/bank' && request.method === 'POST') {

  // ==== PATCH MARKER START: BANK_PAYMENT_HANDLER (for coupon block replacement) ====
  
  
  if (!env.ORDERS) {
    return json({ ok:false, error:'ORDERS KV not bound' }, 500, request, env);
  }
  const bankUser = await getSessionUser(request, env);
  if (!bankUser) {
    return json({ ok:false, error:'請先登入後再送出訂單' }, 401, request, env);
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
      // === Save uploaded proof into R2 (preferred) ===
      let __receipt_url_from_file = "";
      try {
        const f = fd.get('proof') || fd.get('receipt') || fd.get('upload') || fd.get('file') || fd.get('screenshot');
        if (f && typeof f !== 'string' && (f.stream || f.arrayBuffer)) {
          const check = validateUploadFile(f);
          if (!check.ok) {
            return json({ ok:false, error: check.error }, 400, request, env);
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
              return json({ ok:false, error:'Empty file uploaded，請改傳 JPG/PNG 或重新選擇檔案' }, 400, request, env);
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
            return json({ ok:false, error: check.error }, 400, request, env);
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
      return json({ ok:false, error: msg }, 400, request, env);
    }
    const useCartOnly = selection.useCartOnly;
    const items = selection.items;
    const productId = selection.productId;
    const productName = selection.productName;
    const price = selection.price;
    const qty = selection.qty;
    const deity = selection.deity;
    const variantName = selection.variantName;

    const methodToken = String(body?.method || body?.paymentMethod || body?.payment || '').trim();
    const methodKey = methodToken.toLowerCase();
    const isCod711 = methodKey.includes('cod') || methodKey.includes('貨到付款') || methodKey.includes('711');
    const methodLabel = isCod711 ? '貨到付款(7-11)' : '轉帳匯款';

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
    if (!isCod711) {
      if (!receiptUrl) {
        return json({ ok:false, error:'缺少匯款憑證' }, 400, request, env);
      }
      if (!/^\d{5}$/.test(transferLast5)) {
        return json({ ok:false, error:'請輸入匯款末五碼' }, 400, request, env);
      }
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
                multi: couponInputs.length > 1,
                locked: true
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
              couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now(), locked: true };
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
    const codShippingFee = Number(env.COD_711_SHIPPING_FEE || 38) || 38;
    const baseShipping = isCod711 ? codShippingFee : resolveShippingFee(env);
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
      method: methodLabel,
      buyer,
      ...(isCod711 ? {} : { transferLast5, receiptUrl }),
      note: noteVal,
      amount: Math.max(0, Math.round(amount || 0)),
      shippingFee: shippingFee || 0,
      shipping: shippingFee || 0,
      status: '訂單待處理',
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
      await maybeSendOrderEmails(env, order, { origin, channel: order.method || methodLabel });
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

    return json({ ok:true, id: order.id, order }, 200, request, env);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500, request, env);
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
    obj.status = '訂單待處理';
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
      return json({ ok:false, error:'ORDERS KV not bound' }, 500, request, env);
    }
    const orderUser = await getSessionUser(request, env);
    if (!orderUser) {
      return json({ ok:false, error:'請先登入後再送出訂單' }, 401, request, env);
    }
    if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
      return json({ ok:false, error:'Missing ECPay config' }, 500, request, env);
    }
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    const body = ct.includes('application/json') ? (await request.json()) : {};

    let draft;
    try{
      draft = await buildOrderDraft(env, body, origin, { method:'信用卡/綠界', status:'訂單待處理', reserveCoupon:true, reserveTtlSec: Number(env.CC_COUPON_HOLD_TTL_SEC || 900) || 900 });
    }catch(e){
      const reason = e && e.code ? String(e.code) : 'invalid_product';
      const msg = reason === 'product_not_found' ? '找不到商品'
        : reason === 'product_inactive' ? '商品已下架'
        : reason === 'invalid_variant' ? '商品規格無效'
        : reason === 'out_of_stock' ? '庫存不足'
        : '缺少商品資訊';
      return json({ ok:false, error: msg }, 400, request, env);
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

    const params = {
      MerchantID: merchantId,
      MerchantTradeNo: tradeNo,
      MerchantTradeDate: ts,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: '聖物訂單',
      ItemName: itemsStr,
      ReturnURL: `${origin}/api/payment/ecpay/notify`,
      OrderResultURL: `${origin}/payment-result?orderId=${encodeURIComponent(order.id)}`,
      ClientBackURL: `${origin}/payment-result?orderId=${encodeURIComponent(order.id)}`,
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

    return json({
      ok:true,
      orderId: order.id,
      action: gateway,
      params,
      stage: String(env.ECPAY_STAGE || env.ECPAY_MODE || '').toLowerCase()
    }, 200, request, env);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500, request, env);
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
    const prevStatus = order.status || '';
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
      order.status = '付款逾期';
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
    order.status = rtnCode === 1 ? '待出貨' : '付款逾期';
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
      return json({ ok:false, code, reason:'not_found' }, 200, request, env);
    }
    if (rec.used){
      return json({ ok:false, code, reason:'already_used', orderId: rec.orderId||'' }, 200, request, env);
    }
    const nowTs = Date.now();
    if (rec.reservedUntil){
      const reservedUntil = Date.parse(rec.reservedUntil);
      if (!Number.isNaN(reservedUntil) && reservedUntil > nowTs){
        return json({ ok:false, code, reason:'reserved' }, 200, request, env);
      }
    }
    if (rec.startAt && nowTs < Date.parse(rec.startAt)){
      return json({ ok:false, code, reason:'not_started', startAt: rec.startAt }, 200, request, env);
    }
    if (rec.expireAt && nowTs > Date.parse(rec.expireAt)){
      return json({ ok:false, code, reason:'expired', expireAt: rec.expireAt }, 200, request, env);
    }
    const targetDeity = String(rec.deity||'').toUpperCase();
    if (rec.type !== 'SHIP' && rec.type !== 'ALL' && targetDeity && deity && targetDeity !== deity){
      return json({ ok:false, code, reason:'deity_not_match', deity: targetDeity }, 200, request, env);
    }
    const amount = Math.max(0, Number(rec.amount||200) || 200);
    return json({
      ok: true,
      valid: true,
      code,
      deity: targetDeity || deity,
      amount,
      type: rec.type || 'DEITY',
      startAt: rec.startAt || null,
      expireAt: rec.expireAt || null
    }, 200, request, env);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500, request, env);
  }
}


// Issue coupon (new in-house system)
if (pathname === '/api/coupons/issue' && request.method === 'POST') {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
    if (guard) return guard;
  }
  {
    const adminSession = await getAdminSession(request, env);
    if (adminSession && !(await hasAdminPermission(adminSession, env, 'service_orders.export'))){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
  }
  {
    const adminSession = await getAdminSession(request, env);
    if (adminSession && !(await hasAdminPermission(adminSession, env, 'orders.export'))){
      return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
  }
  if (!env.COUPONS){
    return json({ ok:false, error:'COUPONS KV not bound' }, 500, request, env);
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
      return json({ ok:false, error:'Missing deity' }, 400, request, env);
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
    return json({
      ok:true,
      code,
      deity,
      type: ctype,
      amount,
      startAt: rec.startAt || null,
      expireAt: rec.expireAt || null
    }, 200, request, env);
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500, request, env);
  }
}

// Public issuance for quiz flow (no admin key, but deity/amount limited)
if (pathname === '/api/coupons/issue-quiz' && request.method === 'POST') {
  if (!env.COUPONS){
    return json({ ok:false, error:'COUPONS KV not bound' }, 500, request, env);
  }
  try{
    const body = await request.json().catch(()=>({}));
    const record = await getSessionUserRecord(request, env);
    if (!record){
      return json({ ok:false, error:'login_required' }, 401, request, env);
    }
    const todayKey = taipeiDateKey();
    const lastTs = Date.parse(record.quizCouponIssuedAt || record.quizCoupon?.ts || '');
    if (!Number.isNaN(lastTs)){
      const lastKey = taipeiDateKey(lastTs);
      if (lastKey === todayKey){
        return json({ ok:false, error:'daily_limit', dateKey: todayKey }, 429, request, env);
      }
    }
    const ip = getClientIp(request) || 'unknown';
    const rateLimit = Math.max(1, Number(env.QUIZ_COUPON_RATE_LIMIT || 10) || 10);
    const windowSec = Math.max(30, Number(env.QUIZ_COUPON_WINDOW_SEC || 300) || 300);
    const rlKey = `rl:quiz_coupon:${record.id || ip}`;
    const ok = await checkRateLimit(env, rlKey, rateLimit, windowSec);
    if (!ok){
      return json({ ok:false, error:'Too many requests' }, 429, request, env);
    }
    if (!record.quiz && !record.guardian && !body.quiz){
      return json({ ok:false, error:'quiz_required' }, 400, request, env);
    }
    const deityRaw = String(body.deity || body.code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(deityRaw)){
      return json({ ok:false, error:'Missing or invalid deity' }, 400, request, env);
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
    return json({ ok:true, code, deity: deityRaw, amount }, 200, request, env);
  }catch(e){
    return json({ ok:false, error:String(e) }, 500, request, env);
  }
}

// List coupons (admin)
if (pathname === '/api/coupons/list' && request.method === 'GET') {
  if (!(await isAdmin(request, env))){
    return json({ ok:false, error:'Unauthorized' }, 401, request, env);
  }
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
    if (guard) return guard;
  }
  if (!env.COUPONS){
    return json({ ok:false, error:'COUPONS KV not bound' }, 500, request, env);
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
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
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
    status: opts.status || '訂單待處理',
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
      return { ok:false, reason:'missing_config', hasApiKey: !!apiKey, hasFrom: !!fromDefault };
    }
    const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
    const origin = (ctx.origin || '').replace(/\/$/, '');
    const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://unalomecodes.com').replace(/\/$/, '');
    const serviceLookupBase = env.SERVICE_LOOKUP_URL
      ? env.SERVICE_LOOKUP_URL.replace(/\/$/, '')
      : `${primarySite}/service`;
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
    const baseAdminRaw = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
    const channelLabel = channel ? channel : (order.method || '訂單');
    const emailContext = ctx.emailContext || 'order_created';
    const notifyCustomer = ctx.notifyCustomer === false ? false : !!customerEmail;
    const isPhoneConsult = isPhoneConsultOrder(order, env);
    let adminRaw = baseAdminRaw.slice();
    let forceAdmin = false;
    let wrapBilingual = !!ctx.bilingual;
    if (isPhoneConsult && emailContext === 'status_update'){
      const statusText = String(order.status || '').trim();
      const isScheduling = statusText.includes('已確認付款') && statusText.includes('預約中');
      const isBooked = statusText.includes('已完成預約');
      if (isScheduling){
        adminRaw = await getBookingNotifyEmails(env);
        forceAdmin = true;
      }else if (isBooked){
        adminRaw = baseAdminRaw.slice();
        forceAdmin = true;
      }else{
        adminRaw = [];
        forceAdmin = true;
      }
      wrapBilingual = !!ctx.bilingual;
    }
    adminRaw = Array.from(new Set(adminRaw)).filter(Boolean);
    const notifyAdmin = forceAdmin
      ? adminRaw.length > 0
      : (ctx.notifyAdmin === false ? false : adminRaw.length > 0);
    const statusLabel = (order.status || '').trim();
    const isBlessingDone = statusLabel === '祈福完成';
    const customerSubject = emailContext === 'status_update'
      ? `${siteName} 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
      : `${siteName} 訂單確認 #${order.id}`;
    const adminSubject = emailContext === 'status_update'
      ? `[${siteName}] 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
      : `[${siteName}] 新訂單通知 #${order.id}`;
    const defaultImageHost = env.EMAIL_IMAGE_HOST || env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://unalomecodes.com';
    const imageHost = ctx.imageHost || defaultImageHost || origin;
    const composeOpts = { siteName, lookupUrl, channelLabel, imageHost, context: emailContext, blessingDone: isBlessingDone };
    let { html: customerHtml, text: customerText } = composeOrderEmail(order, Object.assign({ admin:false }, composeOpts));
    let { html: adminHtml, text: adminText } = composeOrderEmail(order, Object.assign({ admin:true }, composeOpts));
    if (wrapBilingual){
      const wrappedCustomer = buildBilingualOrderEmail(order, customerHtml, customerText, { lookupUrl });
      const wrappedAdmin = buildBilingualOrderEmail(order, adminHtml, adminText, { lookupUrl });
      customerHtml = wrappedCustomer.html;
      customerText = wrappedCustomer.text;
      adminHtml = wrappedAdmin.html;
      adminText = wrappedAdmin.text;
    }
    const labeled = [];
    if (notifyCustomer && customerEmail) {
      labeled.push({ kind:'customer', promise: sendEmailMessage(env, {
        from: fromDefault,
        to: [customerEmail],
        subject: customerSubject,
        html: customerHtml,
        text: customerText
      }) });
    }
    if (notifyAdmin && adminRaw.length) {
      labeled.push({ kind:'admin', promise: sendEmailMessage(env, {
        from: fromDefault,
        to: adminRaw,
        subject: adminSubject,
        html: adminHtml,
        text: adminText
      }) });
    }
    if (!labeled.length) {
      console.log('[mail] skip sending — no recipients resolved');
      return { ok:false, reason:'no_recipients' };
    }
    const settled = await Promise.allSettled(labeled.map(task => task.promise));
    let failed = false;
    let sentCustomer = false;
    let sentAdmin = false;
    const errors = [];
    settled.forEach((res, idx)=>{
      const kind = labeled[idx] && labeled[idx].kind;
      if (res.status === 'rejected'){
        failed = true;
        const msg = res.reason ? String(res.reason) : 'send_failed';
        errors.push({ kind, error: msg });
        console.error('[mail] send failed', idx, res.reason);
      }else if (kind === 'customer'){
        sentCustomer = true;
      }else if (kind === 'admin'){
        sentAdmin = true;
      }
    });
    return { ok: !failed, reason: failed ? 'send_failed' : '', sentCustomer, sentAdmin, errors };
  } catch (err) {
    console.error('sendOrderEmails error', err);
    return { ok:false, reason:'exception', error: String(err || '') };
  }
}

function composeOrderEmail(order, opts = {}) {
  const esc = (typeof escapeHtmlEmail === 'function') ? escapeHtmlEmail : (s)=> String(s || '');
  const fmt = (typeof formatCurrencyTWD === 'function') ? formatCurrencyTWD : (n)=> `NT$ ${Number(n || 0)}`;
  const brand = opts.siteName || 'Unalomecodes';
  const buyerName = (order?.buyer?.name || '').trim() || '貴賓';
  const phone = (order?.buyer?.phone || order?.buyer?.contact || order?.contact || '').trim();
  const email = (order?.buyer?.email || '').trim();
  const store = (order?.buyer?.store || order?.store || '').trim();
  let status = order.status || '處理中';
  const consultStage = String(order?.consultStage || '').trim().toLowerCase();
  if (consultStage){
    const label = getConsultStageLabel(consultStage);
    if (label && label.zh) status = label.zh;
  }
  const trackingNo = String(
    order.shippingTracking || order.trackingNo || order.tracking || order.trackingNumber
    || (order.shipment && (order.shipment.tracking || order.shipment.trackingNo || order.shipment.trackingNumber))
    || ''
  ).trim();
  const trackingUrl = 'https://eservice.7-11.com.tw/E-Tracking/search.aspx';
  const isShipped = /已寄件|已寄出|已出貨|寄出/.test(status);
  const note = (order.note || '').trim();
  const methodRaw = opts.channelLabel || order.method || '訂單';
  const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || /服務/.test(String(order?.method||''));
  const method = (isServiceOrder && (!order.paymentMethod || /服務/.test(methodRaw))) ? '轉帳匯款' : methodRaw;
  const isCod711 = /貨到付款|cod|711/i.test(method || '');
  const context = opts.context || 'order_created';
  let items = buildOrderItems(order);
  let shippingFee = Number(order.shippingFee ?? order.shipping ?? 0) || 0;
  let discountAmount = Math.max(0, Number(order?.coupon?.discount || 0));
  const itemsSum = items.reduce((sum, it)=> sum + Number(it.total || 0), 0);
  let subtotal = 0;
  if (items.length) {
    subtotal = itemsSum;
  } else if (order.price) {
    subtotal = Number(order.price || 0) * Math.max(1, Number(order.qty || 1) || 1);
  }
  if (!subtotal) subtotal = Math.max(0, Number(order.amount || 0) - shippingFee + discountAmount);
  const totalAmount = Math.max(0, Number(order.amount || 0));
  if (isServiceOrder){
    const baseSum = itemsSum > 0 ? itemsSum : (subtotal > 0 ? subtotal : totalAmount);
    subtotal = baseSum;
    discountAmount = Math.max(0, baseSum - totalAmount);
    shippingFee = 0;
  }
  const supportEmail = 'bkkaiwei@gmail.com';
  const lineLabel = '@427oaemj';
  const lineInstruction = 'LINE ID：@427oaemj（請於官方 LINE 搜尋加入）';
  const couponLabelHtml = order?.coupon?.code ? `（${esc(order.coupon.code)}）` : '';
  const couponLabelText = order?.coupon?.code ? `（${order.coupon.code}）` : '';
  const plainMode = !!opts.plain;
  let itemsForRender = items;
  if (isServiceOrder && discountAmount > 0 && items.length){
    itemsForRender = items.map((it, idx)=>{
      if (idx !== 0) return Object.assign({}, it);
      const nextTotal = Math.max(0, Number(it.total || 0) - discountAmount);
      return Object.assign({}, it, { total: nextTotal });
    });
  }
  const itemsHtml = plainMode
    ? itemsForRender.map(it => `• ${esc(it.name)}${it.spec ? `（${esc(it.spec)}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('<br>') || '<p>本次訂單明細將由客服另行確認。</p>'
    : itemsForRender.length
      ? itemsForRender.map((it, idx) => {
          const imgUrl = rewriteEmailImageUrl(it.image, opts.imageHost);
          const img = imgUrl
            ? `<img src="${esc(imgUrl)}" alt="${esc(it.name)}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;margin-right:16px;">`
            : `<div style="width:64px;height:64px;border-radius:12px;background:#e2e8f0;margin-right:16px;"></div>`;
          const dividerStyle = idx === itemsForRender.length - 1 ? '' : 'border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;';
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
  const itemsText = itemsForRender.length
    ? itemsForRender.map(it => `• ${it.name}${it.spec ? `（${it.spec}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('\n')
    : '（本次訂單明細將由客服另行確認）';
  const shippingNote = shippingFee ? `（含運費${fmt(shippingFee).replace('NT$ ', '')}）` : '';
  const appointmentTw = isServiceOrder ? formatServiceAppointmentTaiwan(order) : '';
  const appointmentBkk = isServiceOrder ? String(order?.slotStart || order?.requestDate || '').trim() : '';
  const appointmentHtml = (appointmentTw || appointmentBkk)
    ? `<p><strong>預約時間：</strong>${appointmentBkk ? `${esc(appointmentBkk)}（曼谷）` : ''}${appointmentTw ? `${appointmentBkk ? '／' : ''}${esc(appointmentTw)}（台灣）` : ''}</p>`
    : '';
  const baseInfoHtml = plainMode
    ? `<p>訂單編號：${esc(order.id || '')}<br>訂單狀態：${esc(status)}<br>付款方式：${esc(method)}<br>應付金額：${fmt(order.amount || 0)}${shippingNote}${appointmentTw || appointmentBkk ? `<br>預約時間：${appointmentBkk ? `${esc(appointmentBkk)}（曼谷）` : ''}${appointmentTw ? `${appointmentBkk ? '／' : ''}${esc(appointmentTw)}（台灣）` : ''}` : ''}</p>`
    : [
        `<p><strong>訂單編號：</strong>${esc(order.id || '')}</p>`,
        `<p><strong>訂單狀態：</strong>${esc(status)}</p>`,
        `<p><strong>付款方式：</strong>${esc(method)}</p>`,
        `<p><strong>應付金額：</strong>${fmt(order.amount || 0)}${shippingNote}</p>`,
        appointmentHtml
      ].filter(Boolean).join('');
  const lookupHtml = opts.lookupUrl && !isServiceOrder
    ? plainMode
      ? `<p>查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）</p>`
      : `<div style="margin-top:16px;padding:12px;border-radius:8px;background:#eef2ff;color:#312e81;font-size:13px;">
          查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）
        </div>`
    : '';
  const serviceLookupNote = isServiceOrder
    ? (plainMode
      ? '<p>可至會員中心－我的訂單查詢最新進度。</p>'
      : '<div style="margin-top:16px;padding:12px;border-radius:8px;background:#ecfdf3;color:#166534;font-size:13px;">可至會員中心－我的訂單查詢最新進度。</div>')
    : '';
  const serviceRescheduleNote = isServiceOrder
    ? (plainMode
      ? '<p>如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。</p>'
      : '<div style="margin-top:12px;padding:12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;">如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。</div>')
    : '';
  const serviceCallNote = '';
  let customerIntro = (context === 'status_update')
    ? `<p>親愛的 ${esc(buyerName)} 您好：</p>
      <p>${(isServiceOrder && consultStage === 'appointment_confirmed')
        ? `您的訂單狀態已更新為 <strong>${esc(status)}</strong>，請加入官方LINE客服 <a href="https://line.me/R/ti/p/@427oaemj" target="_blank" rel="noopener">https://line.me/R/ti/p/@427oaemj</a> 或 LINE ID 搜尋輸入 @427oaemj，後續將由專人與您聯繫進行通話連線。`
        : `您的訂單狀態已更新為 <strong>${esc(status)}</strong>。`
      }請勿直接回覆此信，如需協助可寫信至 ${esc(supportEmail)} 或加入官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`
    : `<p>親愛的 ${esc(buyerName)} 您好：</p>
      <p>${isServiceOrder ? '我們已收到您的訂單，將在核對匯款資料無誤後，儘速與老師聯繫安排預約，預約完成後會再來信通知。' : (isCod711 ? '我們已收到您的訂單，將儘速安排出貨。' : '我們已收到您的訂單，將在核對匯款資料無誤後，儘速安排出貨。')}請勿直接回覆此信，如需協助可寫信至 ${esc(supportEmail)} 或加入官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`;
  const isBlessingDone = opts.blessingDone || (order.status === '祈福完成');
  if (context === 'status_update' && isBlessingDone){
    const lookupLine = opts.lookupUrl
      ? `請至 <a href="${esc(opts.lookupUrl)}" target="_blank" rel="noopener">查詢祈福進度</a> 輸入手機號碼，並搭配訂單編號末五碼（英數）或匯款帳號末五碼，即可查看祈福完成的照片。`
      : '請至查詢祈福進度輸入手機號碼，並搭配訂單編號末五碼（英數）或匯款帳號末五碼，即可查看祈福完成的照片。';
    customerIntro += `<p>${lookupLine}</p>`;
  }
  if (context === 'status_update' && isShipped && trackingNo){
    const trackingHtml = plainMode
      ? `<p>該商品已完成寄件，配送單號為：${esc(trackingNo)}。可至 7-11 貨態查詢系統查詢物流狀態：${esc(trackingUrl)}</p>`
      : `<div style="margin:16px 0;padding:12px;border-radius:10px;background:#ecfeff;color:#0f172a;font-size:14px;">
          該商品已完成寄件，配送單號為：<strong>${esc(trackingNo)}</strong><br>
          可至 <a href="${trackingUrl}" target="_blank" rel="noopener">7-11 貨態查詢系統 E-Tracking</a> 查詢物流狀態
        </div>`;
    customerIntro += trackingHtml;
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
        ${serviceLookupNote}
        ${serviceRescheduleNote}
        ${serviceCallNote}
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
          ${serviceLookupNote}
          ${serviceRescheduleNote}
          ${serviceCallNote}
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
    const waitLine = isServiceOrder
      ? `親愛的 ${buyerName} 您好：我們已收到您的訂單，將在核對匯款資料無誤後，儘速與老師聯繫安排預約，預約完成後會再來信通知。請勿直接回覆此信，如需協助可寫信至 ${supportEmail} 或加入官方 LINE ID：${lineLabel}。`
      : (isCod711
        ? `親愛的 ${buyerName} 您好：我們已收到您的訂單，將儘速安排出貨。請勿直接回覆此信，如需協助可寫信至 ${supportEmail} 或加入官方 LINE ID：${lineLabel}。`
        : `親愛的 ${buyerName} 您好：我們已收到您的訂單，將在核對匯款資料無誤後，儘速安排出貨。請勿直接回覆此信，如需協助可寫信至 ${supportEmail} 或加入官方 LINE ID：${lineLabel}。`);
    textParts.push(waitLine);
  }
  textParts.push(`訂單編號：${order.id}`);
  textParts.push(`訂單狀態：${status}`);
  if (context === 'status_update' && isShipped && trackingNo){
    textParts.push(`該商品已完成寄件，配送單號為：${trackingNo}`);
    textParts.push(`7-11 貨態查詢系統：${trackingUrl}`);
  }
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
  if (isServiceOrder){
    if (appointmentBkk) textParts.push(`預約時間（曼谷）：${appointmentBkk}`);
    if (appointmentTw) textParts.push(`預約時間（台灣）：${appointmentTw}`);
    textParts.push('可至會員中心－我的訂單查詢最新進度。');
    textParts.push('如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。');
    if (context === 'status_update' && consultStage === 'appointment_confirmed'){
      textParts.push(`您的訂單狀態已更新為 ${status}，請加入官方LINE客服 https://line.me/R/ti/p/@427oaemj 或 LINE ID 搜尋輸入 @427oaemj，後續將由專人與您聯繫進行通話連線。`);
    }
  } else if (opts.lookupUrl) {
    textParts.push(`查詢訂單：${opts.lookupUrl}`);
  }
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
  return !!txt;
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

function formatServiceAppointmentTaiwan(order) {
  const raw = String(order?.slotStart || order?.requestDate || '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (!match) return '';
  const datePart = match[1];
  const timePart = match[2];
  const [y, m, d] = datePart.split('-').map(v => Number(v));
  const [hh, mm] = timePart.split(':').map(v => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';
  const ms = Date.UTC(y, m - 1, d, hh + 1, mm);
  if (!Number.isFinite(ms)) return '';
  const dt = new Date(ms);
  const yyyy = dt.getUTCFullYear();
  const MM = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(dt.getUTCDate()).padStart(2, '0');
  const HH = String(dt.getUTCHours()).padStart(2, '0');
  const Min = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${DD} ${HH}:${Min}`;
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

if ((pathname === '/api/admin/cron/release-holds' || pathname === '/api/cron/release-holds') && (request.method === 'POST' || request.method === 'GET')) {
  {
    const guard = await requireCronOrAdmin(request, env);
    if (guard) return guard;
  }
  {
    const actor = await buildAuditActor(request, env);
    const rule = parseRate(env.ADMIN_CRON_RATE_LIMIT || '20/10m');
    const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'cron'), rule);
    if (!rate.allowed){
      try{
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'rate_limited',
          ...actor,
          targetType: 'cron',
          targetId: 'maintenance',
          meta: { rule: env.ADMIN_CRON_RATE_LIMIT || '20/10m' }
        });
      }catch(_){}
      return new Response(
        JSON.stringify({ ok:false, error:'rate_limited' }),
        { status: 429, headers: jsonHeadersFor(request, env) }
      );
    }
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
  // Manual test: owner cron release-holds -> audit logs include action=cron_release_holds
  try{
    const actor = await buildAuditActor(request, env);
    await auditAppend(env, {
      ts: new Date().toISOString(),
      action: 'cron_release_holds',
      ...actor,
      targetType: 'cron',
      targetId: 'release-holds',
      meta: {}
    });
  }catch(_){}
  return new Response(JSON.stringify(result), { status:200, headers: jsonHeadersFor(request, env) });
}

if (pathname === '/api/service/phone-consult/config' && request.method === 'GET') {
  const cfg = getPhoneConsultConfig(env);
  const rawMode = String(env?.PHONE_CONSULT_LAUNCH_MODE || '').trim().toLowerCase();
  const modeValid = rawMode === 'admin' || rawMode === 'allowlist' || rawMode === 'public';
  let enabled = true;
  let reason = null;
  if (!cfg.serviceId){
    enabled = false;
    reason = 'missing_service_id';
  }else if (!modeValid){
    enabled = false;
    reason = 'invalid_launch_mode';
  }
  const isAdminViewer = await isOwnerOrAdminSession(request, env);
  const viewerEmail = await getViewerEmailFromSession(request, env);
  const allowlisted = isAllowlisted(viewerEmail, env);
  const payload = {
    ok: true,
    mode: cfg.mode,
    serviceId: cfg.serviceId,
    isAdmin: !!isAdminViewer,
    allowlisted: !!allowlisted,
    enabled,
    reason
  };
  return new Response(JSON.stringify(payload), { status:200, headers: jsonHeadersFor(request, env) });
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
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
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
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
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
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
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

if (pathname === '/api/service/slots' && request.method === 'GET') {
  cleanupExpiredHolds(env).catch(()=>{});
  if (!env?.SERVICE_SLOTS_KV){
    return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
  }
  const serviceId = String(url.searchParams.get('serviceId') || '').trim();
  if (!serviceId){
    return new Response(JSON.stringify({ ok:false, error:'missing_service_id' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const cfg = getSlotConfig(env);
  const daysRaw = Number(url.searchParams.get('days') || cfg.daysAhead);
  const days = Math.max(1, Math.min(31, Number.isFinite(daysRaw) ? daysRaw : cfg.daysAhead));
  const dateFromParam = String(url.searchParams.get('dateFrom') || '').trim();
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(dateFromParam) ? dateFromParam : getTodayDateStr(cfg.tz);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)){
    return new Response(JSON.stringify({ ok:false, error:'invalid_date_from' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const windows = parseDailyWindows(cfg.windowsStr, cfg.stepMin);
  const now = nowMs();
  const items = [];
  for (let i=0;i<days;i++){
    const dateStr = addDaysDateStr(dateFrom, i);
    if (!dateStr) continue;
    const slots = [];
    const slotKeys = [];
    const slotTimes = [];
    for (const win of windows){
      for (let t=win.startMin; t<win.endMin; t+=cfg.stepMin){
        const time = minutesToHHMM(t);
        const hhmmNoColon = time.replace(':','');
        const slotKey = buildSlotKey(serviceId, dateStr, hhmmNoColon);
        slotKeys.push(slotKey);
        slotTimes.push(time);
      }
    }
    let rawList = [];
    try{
      rawList = await Promise.all(slotKeys.map(key => env.SERVICE_SLOTS_KV.get(key)));
    }catch(_){
      rawList = [];
    }
    for (let idx=0; idx<slotKeys.length; idx++){
      const slotKey = slotKeys[idx];
      const time = slotTimes[idx];
      let status = 'free';
      let enabled = false;
      try{
        const raw = rawList[idx];
        if (raw){
          const rec = JSON.parse(raw);
          enabled = resolveSlotEnabled(rec);
          status = resolveSlotStatus(rec, now);
        }
      }catch(_){}
      slots.push({ slotKey, time, status, enabled });
    }
    items.push({ date: dateStr, slots });
  }
  return new Response(JSON.stringify({ ok:true, serviceId, dateFrom, days, items }), { status:200, headers: jsonHeadersFor(request, env) });
}

if (pathname === '/api/service/slot/hold' && request.method === 'POST') {
  await cleanupExpiredHolds(env);
  if (!env?.SERVICE_SLOTS_KV){
    return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
  }
  if (!env?.SERVICE_SLOT_HOLDS_KV){
    return new Response(JSON.stringify({ ok:false, error:'holds_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
  }
  const svcUser = await getSessionUser(request, env);
  if (!svcUser) {
    return new Response(JSON.stringify({ ok:false, error:'UNAUTHORIZED' }), { status:401, headers: jsonHeadersFor(request, env) });
  }
  let body = null;
  try{
    body = await request.json();
  }catch(_){
    body = {};
  }
  const serviceId = String(body.serviceId || '').trim();
  const slotKey = String(body.slotKey || '').trim();
  if (!serviceId || !slotKey){
    return new Response(JSON.stringify({ ok:false, error:'INVALID_SLOT' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const parsed = parseSlotKey(slotKey);
  if (!parsed || parsed.serviceId !== serviceId){
    return new Response(JSON.stringify({ ok:false, error:'INVALID_SLOT' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const now = nowMs();
  const holdUserId = resolveHoldUserId(svcUser, request);
  const existingHold = await hasActiveHoldForUser(env, holdUserId);
  if (existingHold){
    try{
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'slot_hold_rejected',
        actorEmail: String(svcUser.email || ''),
        actorRole: 'user',
        ip: getClientIp(request) || '',
        ua: request.headers.get('User-Agent') || '',
        targetType: 'service_slot',
        targetId: slotKey,
        orderId: '',
        slotKey,
        meta: { slotKey, orderId:'', userId: holdUserId, reason: 'HOLD_LIMIT_REACHED' }
      });
    }catch(err){
      console.warn('audit slot_hold_rejected failed', err);
    }
    return new Response(JSON.stringify({ ok:false, error:'HOLD_LIMIT_REACHED' }), { status:409, headers: jsonHeadersFor(request, env) });
  }
  let enabled = false;
  try{
    const raw = await env.SERVICE_SLOTS_KV.get(slotKey);
    if (raw){
      const rec = JSON.parse(raw);
      enabled = resolveSlotEnabled(rec);
      const status = resolveSlotStatus(rec, now);
      if (status === 'blocked'){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
      if (!enabled){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
      if (status === 'booked'){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
      if (status === 'held'){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
    }else{
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
  }catch(_){}
  const cfg = getSlotConfig(env);
  const holdTtlMs = cfg.holdTtlMin * 60 * 1000;
  const heldUntil = now + holdTtlMs;
  const holdToken = (crypto && crypto.randomUUID) ? crypto.randomUUID() : makeToken(24);
  const slotRecord = {
    serviceId,
    slotKey,
    date: parsed.dateStr,
    time: parsed.hhmm,
    enabled: true,
    status: 'held',
    heldUntil,
    holdToken,
    bookedOrderId: '',
    holdBy: holdUserId,
    holdExpiresAt: heldUntil
  };
  await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(slotRecord));
  const holdKey = `hold:${holdToken}`;
  const holdRecord = { serviceId, slotKey, expiresAt: heldUntil, holdExpiresAt: heldUntil, holdBy: holdUserId, userId: holdUserId, createdAt: new Date().toISOString() };
  await env.SERVICE_SLOT_HOLDS_KV.put(holdKey, JSON.stringify(holdRecord), { expirationTtl: Math.ceil(cfg.holdTtlMin * 60) });
  try{
    await auditAppend(env, {
      ts: new Date().toISOString(),
      action: 'slot_hold_created',
      actorEmail: String(svcUser.email || ''),
      actorRole: 'user',
      ip: getClientIp(request) || '',
      ua: request.headers.get('User-Agent') || '',
      targetType: 'service_slot',
      targetId: slotKey,
      orderId: '',
      slotKey,
      meta: { orderId:'', slotKey, userId: holdUserId }
    });
  }catch(err){
    console.warn('audit slot_hold_created failed', err);
  }
  return new Response(JSON.stringify({
    ok:true,
    holdToken,
    slotKey,
    heldUntil,
    expiresInSec: Math.max(0, Math.floor((heldUntil - now) / 1000))
  }), { status:200, headers: jsonHeadersFor(request, env) });
}

if (pathname === '/api/service/slot/release' && request.method === 'POST') {
  await cleanupExpiredHolds(env);
  if (!env?.SERVICE_SLOTS_KV){
    return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
  }
  if (!env?.SERVICE_SLOT_HOLDS_KV){
    return new Response(JSON.stringify({ ok:false, error:'holds_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
  }
  const svcUser = await getSessionUser(request, env);
  if (!svcUser) {
    return new Response(JSON.stringify({ ok:false, error:'UNAUTHORIZED' }), { status:401, headers: jsonHeadersFor(request, env) });
  }
  let body = null;
  try{
    body = await request.json();
  }catch(_){
    body = {};
  }
  const serviceId = String(body.serviceId || '').trim();
  const slotKey = String(body.slotKey || '').trim();
  const slotHoldToken = String(body.slotHoldToken || body.holdToken || '').trim();
  if (!serviceId || !slotKey || !slotHoldToken){
    return new Response(JSON.stringify({ ok:false, error:'INVALID_SLOT' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const parsed = parseSlotKey(slotKey);
  if (!parsed || parsed.serviceId !== serviceId){
    return new Response(JSON.stringify({ ok:false, error:'INVALID_SLOT' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const holdKey = `hold:${slotHoldToken}`;
  const holdRaw = await env.SERVICE_SLOT_HOLDS_KV.get(holdKey);
  if (!holdRaw){
    return new Response(JSON.stringify({ ok:true, released:false, reason:'hold_not_found' }), { status:200, headers: jsonHeadersFor(request, env) });
  }
  let hold = null;
  try{ hold = JSON.parse(holdRaw); }catch(_){}
  const holdBy = String((hold && (hold.userId || hold.holdBy)) || '').toLowerCase();
  const requester = String(resolveHoldUserId(svcUser, request) || '').toLowerCase();
  if (!hold || !holdBy || holdBy !== requester){
    return new Response(JSON.stringify({ ok:false, error:'forbidden' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  if (String(hold.slotKey || '') !== slotKey){
    return new Response(JSON.stringify({ ok:false, error:'INVALID_SLOT' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  try{
    const slotRaw = await env.SERVICE_SLOTS_KV.get(slotKey);
    if (slotRaw){
      let slotRec = null;
      try{ slotRec = JSON.parse(slotRaw); }catch(_){}
      if (slotRec && slotRec.status === 'held' && slotRec.holdToken === slotHoldToken){
        slotRec.status = 'free';
        slotRec.holdToken = '';
        slotRec.heldUntil = 0;
        slotRec.holdExpiresAt = 0;
        slotRec.holdBy = '';
        slotRec.enabled = true;
        await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(slotRec));
      }
    }
  }catch(_){}
  try{ await env.SERVICE_SLOT_HOLDS_KV.delete(holdKey); }catch(_){}
  try{
    await auditAppend(env, {
      ts: new Date().toISOString(),
      action: 'slot_hold_released',
      actorEmail: String(svcUser.email || ''),
      actorRole: 'user',
      ip: getClientIp(request) || '',
      ua: request.headers.get('User-Agent') || '',
      targetType: 'service_slot',
      targetId: slotKey,
      orderId: '',
      slotKey,
      meta: { slotKey, orderId:'', userId: requester }
    });
  }catch(err){
    console.warn('audit slot_hold_released failed', err);
  }
  return new Response(JSON.stringify({ ok:true, released:true }), { status:200, headers: jsonHeadersFor(request, env) });
}

if (pathname === '/api/service/order/reschedule-request' && request.method === 'POST') {
  await cleanupExpiredHolds(env);
  if (!env?.SERVICE_RESCHEDULE_KV){
    return new Response(JSON.stringify({ ok:false, error:'reschedule_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
  }
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeadersFor(request, env) });
  }
  let body = {};
  try{
    body = await request.json();
  }catch(_){}
  const orderId = String(body.orderId || '').trim();
  if (!orderId){
    return new Response(JSON.stringify({ ok:false, error:'missing_order_id' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  const orderRaw = await store.get(orderId);
  if (!orderRaw){
    return new Response(JSON.stringify({ ok:false, error:'order_not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
  }
  let order = null;
  try{ order = JSON.parse(orderRaw); }catch(_){}
  if (!order){
    return new Response(JSON.stringify({ ok:false, error:'order_not_found' }), { status:404, headers: jsonHeadersFor(request, env) });
  }
  const svcUser = await getSessionUser(request, env);
  let authed = false;
  if (svcUser){
    const uid = String(svcUser.id || '').trim();
    const userEmail = String(svcUser.email || '').trim().toLowerCase();
    const orderUid = String(order?.buyer?.uid || '').trim();
    const orderEmail = String(order?.buyer?.email || order?.email || '').trim().toLowerCase();
    if (uid && orderUid && uid === orderUid) authed = true;
    if (!authed && userEmail && orderEmail && userEmail === orderEmail) authed = true;
  }
  if (!authed){
    const inputPhone = String(body.phone || '').trim();
    const transferLast5 = String(body.transferLast5 || '').trim();
    const normInput = normalizeTWPhoneStrict(inputPhone);
    const normOrder = normalizeTWPhoneStrict(order?.buyer?.phone || '');
    if (!inputPhone || !transferLast5 || !normInput || !normOrder || normInput !== normOrder || String(order.transferLast5 || '').trim() !== transferLast5){
      return new Response(JSON.stringify({ ok:false, error:'UNAUTHORIZED' }), { status:403, headers: jsonHeadersFor(request, env) });
    }
  }
  const statusLabel = String(order.status || '').trim();
  if (/已完成|完成|已取消|取消/i.test(statusLabel)){
    return new Response(JSON.stringify({ ok:false, error:'TOO_LATE' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  const cfg = getRescheduleConfig(env);
  const slotStartMs = parseSlotStartToMs(order.slotStart || '');
  if (!slotStartMs){
    return new Response(JSON.stringify({ ok:false, error:'missing_slot_start' }), { status:400, headers: jsonHeadersFor(request, env) });
  }
  if (Date.now() > (slotStartMs - cfg.ruleHours * 3600 * 1000)){
    return new Response(JSON.stringify({ ok:false, error:'TOO_LATE' }), { status:403, headers: jsonHeadersFor(request, env) });
  }
  try{
    const idxRaw = await env.SERVICE_RESCHEDULE_KV.get('reschedule:index');
    const ids = idxRaw ? String(idxRaw).split('\n').filter(Boolean) : [];
    for (const id of ids){
      const raw = await env.SERVICE_RESCHEDULE_KV.get(`reschedule:${id}`);
      if (!raw) continue;
      let rec = null;
      try{ rec = JSON.parse(raw); }catch(_){}
      if (!rec) continue;
      if (String(rec.orderId || '') === orderId && String(rec.status || '') === 'pending'){
        return new Response(JSON.stringify({ ok:false, error:'ALREADY_REQUESTED' }), { status:409, headers: jsonHeadersFor(request, env) });
      }
    }
  }catch(err){
    console.warn('reschedule duplicate check failed', err);
  }
  const desiredSlotKey = String(body.desiredSlotKey || body.slotKey || '').trim();
  if (desiredSlotKey){
    if (!env?.SERVICE_SLOTS_KV){
      return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const parsed = parseSlotKey(desiredSlotKey);
    if (!parsed || String(parsed.serviceId) !== String(order.serviceId || '').trim()){
      return new Response(JSON.stringify({ ok:false, error:'invalid_slot' }), { status:400, headers: jsonHeadersFor(request, env) });
    }
    const slotRaw = await env.SERVICE_SLOTS_KV.get(desiredSlotKey);
    if (!slotRaw){
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    let slotRec = null;
    try{ slotRec = JSON.parse(slotRaw); }catch(_){}
    const enabled = resolveSlotEnabled(slotRec);
    const status = resolveSlotStatus(slotRec, nowMs());
    if (!enabled){
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
    if (status !== 'free'){
      return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeadersFor(request, env) });
    }
  }
  const nowIso = new Date().toISOString();
  const actor = {
    email: svcUser ? String(svcUser.email || '') : '',
    phone: svcUser ? String(svcUser.phone || '') : String(body.phone || ''),
    uid: svcUser ? String(svcUser.id || '') : ''
  };
  const buyer = order && order.buyer ? order.buyer : {};
  const record = {
    id: buildRescheduleId(),
    orderId,
    serviceId: String(order.serviceId || '').trim(),
    currentSlotKey: String(order.slotKey || '').trim(),
    desiredSlotKey,
    note: String(body.note || '').trim(),
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
    customerName: String(buyer.name || '').trim(),
    customerEmail: String(buyer.email || '').trim(),
    customerPhone: String(buyer.phone || '').trim(),
    actor,
    approvedBy: '',
    rejectedBy: ''
  };
  await env.SERVICE_RESCHEDULE_KV.put(`reschedule:${record.id}`, JSON.stringify(record));
  await updateRescheduleIndex(env, record.id);
  try{
    const actorInfo = await buildAuditActor(request, env);
    await auditAppend(env, Object.assign({
      ts: nowIso,
      action: 'reschedule_requested',
      targetType: 'service_order',
      targetId: orderId,
      orderId,
      slotKey: desiredSlotKey,
      meta: { requestId: record.id, desiredSlotKey, slotKey: desiredSlotKey, orderId }
    }, actorInfo || { actorEmail: actor.email || '', actorRole: 'user', ip: getClientIp(request) || '', ua: request.headers.get('User-Agent') || '' }));
  }catch(err){
    console.warn('audit reschedule_requested failed', err);
  }
  const adminTo = getRescheduleNotifyEmails(env);
  if (adminTo.length){
    const base = (env.SITE_URL || env.PUBLIC_SITE_URL || new URL(request.url).origin || '').replace(/\/$/, '');
    const adminUrl = base ? `${base}/admin/slots` : '';
    const email = buildRescheduleEmail({
      type: 'requested',
      orderId,
      currentSlot: record.currentSlotKey || '',
      desiredSlot: record.desiredSlotKey || '',
      createdAt: record.createdAt,
      note: record.note,
      adminUrl
    });
    try{
      await sendEmailMessage(env, {
        to: adminTo,
        subject: email.subject,
        html: email.html,
        text: email.text
      });
    }catch(err){
      console.error('reschedule email failed', err);
    }
  }
  return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeadersFor(request, env) });
}

if (pathname === '/api/service/order' && request.method === 'POST') {
  await cleanupExpiredHolds(env);
  const svcUser = await getSessionUser(request, env);
  if (!svcUser) {
    return new Response(JSON.stringify({ ok:false, error:'UNAUTHORIZED' }), { status:401, headers: jsonHeaders });
  }
  const svcUserRecord = await ensureUserRecord(env, svcUser);
  try{
    const body = await request.json();
    const serviceId = String(body.serviceId||'').trim();
    const name = String(body.name||'').trim();
    const phone = String(body.phone||'').trim();
    const email = String(body.email||'').trim();
    if (!serviceId || !name || !phone || !email){
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
    const slotKey = String(body.slotKey||'').trim();
    const slotHoldToken = String(body.slotHoldToken||'').trim();
    let orderId = '';
    let slotStart = '';
    if (slotKey){
      const parsedSlot = parseSlotKey(slotKey);
      if (parsedSlot){
        slotStart = `${parsedSlot.dateStr} ${parsedSlot.hhmm}`;
      }
    }
    if (slotKey && slotHoldToken){
      if (!env?.SERVICE_SLOTS_KV || !env?.SERVICE_SLOT_HOLDS_KV){
        return new Response(JSON.stringify({ ok:false, error:'slot_required_but_not_configured' }), { status:400, headers: jsonHeaders });
      }
      const now = nowMs();
      const holdKey = `hold:${slotHoldToken}`;
      const holdRaw = await env.SERVICE_SLOT_HOLDS_KV.get(holdKey);
      if (!holdRaw){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_EXPIRED' }), { status:409, headers: jsonHeaders });
      }
      let hold = null;
      try{ hold = JSON.parse(holdRaw); }catch(_){}
      const holdExpires = Number(hold && (hold.holdExpiresAt || hold.expiresAt) || 0);
      if (!hold || hold.serviceId !== serviceId || hold.slotKey !== slotKey || holdExpires <= now){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_EXPIRED' }), { status:409, headers: jsonHeaders });
      }
      const slotRaw = await env.SERVICE_SLOTS_KV.get(slotKey);
      if (!slotRaw){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_EXPIRED' }), { status:409, headers: jsonHeaders });
      }
      let slotRec = null;
      try{ slotRec = JSON.parse(slotRaw); }catch(_){}
      if (!slotRec || slotRec.status !== 'held' || slotRec.holdToken !== slotHoldToken){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeaders });
      }
      if (Number(slotRec.holdExpiresAt || slotRec.heldUntil || 0) <= now){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_EXPIRED' }), { status:409, headers: jsonHeaders });
      }
      if (hold && slotRec.holdBy && hold.holdBy && String(slotRec.holdBy) !== String(hold.holdBy)){
        return new Response(JSON.stringify({ ok:false, error:'SLOT_CONFLICT' }), { status:409, headers: jsonHeaders });
      }
      orderId = await generateServiceOrderId(env);
      slotRec.status = 'booked';
      slotRec.bookedOrderId = orderId;
      slotRec.heldUntil = 0;
      slotRec.holdToken = '';
      slotRec.holdBy = '';
      slotRec.holdExpiresAt = 0;
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(slotRec));
      try{ await env.SERVICE_SLOT_HOLDS_KV.delete(holdKey); }catch(_){}
    }
    if (!orderId) orderId = await generateServiceOrderId(env);
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
    const isPhoneConsult = isPhoneConsultServiceRecord(svc, serviceId, env);
    const consultStage = isPhoneConsult ? 'payment_pending' : '';
    const phonePrices = isPhoneConsult ? resolvePhoneConsultOptionPrices(options, Number(svc.price||0)) : null;
    const promoInfo = isPhoneConsult ? getPhoneConsultPromoInfo(svc) : null;
    const promoActive = isPhoneConsult ? isPromoActive(promoInfo, nowMs()) : false;
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
    const basePriceForCalc = (isPhoneConsult && phonePrices) ? phonePrices.base : basePrice;
    const fixedFee = Math.max(0, Number(svc.fixedFee ?? svc.serviceFee ?? svc.travelFee ?? svc.extraFee ?? 0) || 0);
    const feeLabel = String(svc.feeLabel || '車馬費').trim();
    let items = [];
    if (selectionList.length){
      items = selectionList.map(opt => ({
        name: `${svc.name}｜${opt.name}`,
        qty: 1,
        total: (() => {
          let unitTotal = basePriceForCalc + Number(opt.price||0);
          if (isPhoneConsult && phonePrices){
            const normalTotal = getPhoneConsultTotalForOption(opt, phonePrices);
            unitTotal = normalTotal;
            if (promoActive && promoInfo && promoInfo.price > 0 && promoInfo.price < phonePrices.base){
              const promoTotal = getPhoneConsultPromoTotalForOption(opt, phonePrices, promoInfo.price);
              if (promoTotal > 0 && promoTotal < normalTotal) unitTotal = promoTotal;
            }
          }
          return unitTotal;
        })(),
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
        total: basePriceForCalc * baseCount,
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
      consultStage,
      consultStageAt: consultStage ? new Date().toISOString() : '',
      consultStageBy: consultStage ? { email: String(buyer.email || ''), role: 'customer' } : undefined,
      buyer: Object.assign({}, buyer, {
        nameEn: String(body?.nameEn || body?.buyer?.nameEn || body?.buyer_name_en || body?.buyer_nameEn || '')
      }),
      note: String(body.note||'').trim(),
      requestDate: String(body.requestDate||'').trim(),
      slotKey: slotKey || '',
      slotStart: slotStart || '',
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
    let mailStatus = null;
    try{
      mailStatus = await maybeSendOrderEmails(env, order, { origin, channel:'服務型商品', notifyAdmin:true, emailContext:'service_created', bilingual:false });
    }catch(err){
      console.error('service order email error', err);
    }
    try{
      await auditAppend(env, {
        ts: new Date().toISOString(),
        action: 'order_created',
        actorEmail: String(buyer.email || ''),
        actorRole: 'user',
        ip: getClientIp(request) || '',
        ua: request.headers.get('User-Agent') || '',
        targetType: 'service_order',
        targetId: order.id,
        orderId: order.id,
        slotKey: slotKey || '',
        meta: { orderId: order.id, slotKey: slotKey || '' }
      });
    }catch(err){
      console.warn('audit order_created failed', err);
    }
    if (slotKey){
      try{
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'slot_confirmed',
          actorEmail: String(buyer.email || ''),
          actorRole: 'user',
          ip: getClientIp(request) || '',
          ua: request.headers.get('User-Agent') || '',
          targetType: 'service_slot',
          targetId: slotKey,
          orderId: order.id,
          slotKey,
          meta: { orderId: order.id, slotKey }
        });
      }catch(err){
        console.warn('audit slot_confirmed failed', err);
      }
    }
    // 會員折扣關閉，無需記錄使用
    try{
      await updateUserDefaultContact(env, svcUser.id, {
        name: buyer.name || '',
        phone: buyer.phone || '',
        email: buyer.email || ''
      });
    }catch(_){}
    return new Response(JSON.stringify({ ok:true, orderId, order, mailStatus }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

// 圖片刪除
    if (pathname.startsWith("/api/file/") && request.method === "DELETE") {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      {
        const guard = await requireAdminPermission(request, env, 'file.delete');
        if (guard) return guard;
      }
      {
        const actor = await buildAuditActor(request, env);
        const rule = parseRate(env.ADMIN_DELETE_RATE_LIMIT || '30/10m');
        const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'file_delete'), rule);
        if (!rate.allowed){
          try{
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'rate_limited',
              ...actor,
              targetType: 'file',
              targetId: 'bulk',
              meta: { rule: env.ADMIN_DELETE_RATE_LIMIT || '30/10m' }
            });
          }catch(_){}
          return new Response(
            JSON.stringify({ ok:false, error:'rate_limited' }),
            { status: 429, headers: jsonHeadersFor(request, env) }
          );
        }
      }
      const key = decodeURIComponent(pathname.replace("/api/file/", ""));
      const resp = await deleteR2FileByKey(key, env);
      // Manual test: owner delete file -> audit logs include action=file_delete
      if (resp && resp.ok){
        try{
          const actor = await buildAuditActor(request, env);
          await auditAppend(env, {
            ts: new Date().toISOString(),
            action: 'file_delete',
            ...actor,
            targetType: 'file',
            targetId: key,
            meta: { endpoint: '/api/file/*' }
          });
        }catch(_){}
      }
      return resp;
    }
    if (pathname === "/api/deleteFile" && request.method === "POST") {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      {
        const guard = await requireAdminPermission(request, env, 'file.delete');
        if (guard) return guard;
      }
      {
        const actor = await buildAuditActor(request, env);
        const rule = parseRate(env.ADMIN_DELETE_RATE_LIMIT || '30/10m');
        const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'file_delete'), rule);
        if (!rate.allowed){
          try{
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'rate_limited',
              ...actor,
              targetType: 'file',
              targetId: 'bulk',
              meta: { rule: env.ADMIN_DELETE_RATE_LIMIT || '30/10m' }
            });
          }catch(_){}
          return new Response(
            JSON.stringify({ ok:false, error:'rate_limited' }),
            { status: 429, headers: jsonHeadersFor(request, env) }
          );
        }
      }
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      let key = body?.key;
      if (!key && body?.url) key = extractKeyFromProxyUrl(body.url);
      const resp = await deleteR2FileViaBody(request, env, body);
      // Manual test: owner delete file -> audit logs include action=file_delete
      if (resp && resp.ok){
        try{
          const actor = await buildAuditActor(request, env);
          await auditAppend(env, {
            ts: new Date().toISOString(),
            action: 'file_delete',
            ...actor,
            targetType: 'file',
            targetId: key || '',
            meta: { endpoint: '/api/deleteFile' }
          });
        }catch(_){}
      }
      return resp;
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
  return listStories(request, url, env);
}
if (pathname === "/api/stories" && request.method === "POST") {
  // Support method override: POST + _method=DELETE
  const _m = (url.searchParams.get("_method") || "").toUpperCase();
  if (_m === "DELETE") {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    return deleteStories(request, url, env);
  }
  return createStory(request, env);
}
if (pathname === "/api/stories" && request.method === "DELETE") {
  {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
  }
  {
    const guard = await forbidIfFulfillmentAdmin(request, env);
    if (guard) return guard;
  }
  return deleteStories(request, url, env);
}
    if (pathname === "/api/maps-key" && request.method === "GET") {
      return getMapsKey(request, env);
    }
    if (pathname === "/api/geo" && request.method === "GET") {
      return geocodePlace(request, url, env);
    }
    if (pathname.startsWith("/api/tat") && request.method === "GET") {
      return proxyTat(request, url, env);
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
    const adminEmail = (adminSession && adminSession.email) ? String(adminSession.email) : '';
    const adminRole = adminEmail ? await getAdminRole(adminEmail, env) : '';
    const isFulfillmentAdmin = !!adminEmail && adminRole === 'fulfillment';
    if (!isAuthed) {
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
    if (isFulfillmentAdmin){
      // Fulfillment: allow only image uploads, strict types.
      allowedMimes.clear();
      allowedExts.clear();
      ["image/jpeg","image/jpg","image/png","image/webp"].forEach(x=>allowedMimes.add(x));
      ["jpg","jpeg","png","webp"].forEach(x=>allowedExts.add(x));
      delete extMimeMap.pdf;
    }
    const anonMaxMb = Math.max(1, Number(env.UPLOAD_ANON_MAX_MB || env.UPLOAD_MAX_MB || 10) || 10);
    const authMaxMb = Math.max(1, Number(env.UPLOAD_AUTH_MAX_MB || env.UPLOAD_MAX_MB || 20) || 20);
    const maxBytes = (isAuthed ? authMaxMb : anonMaxMb) * 1024 * 1024;
    const fulfillmentMaxMb = Math.max(1, Number(env.UPLOAD_FULFILLMENT_MAX_MB || 10) || 10);
    const effectiveMaxBytes = isFulfillmentAdmin ? (fulfillmentMaxMb * 1024 * 1024) : maxBytes;
    for (const f of files) {
      if (typeof f.stream !== "function") continue;
      if (f.size && f.size > effectiveMaxBytes) {
        const limitMb = Math.round(effectiveMaxBytes / (1024 * 1024));
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

      const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://unalomecodes.com';
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

async function deleteR2FileViaBody(request, env, bodyOverride) {
  try {
    const body = bodyOverride || await request.json();
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
async function listProducts(request, url, env) {
  let active = url.searchParams.get("active");
  const category = url.searchParams.get("category");
  const isAdminUser = await isAdmin(request, env);
  if (!isAdminUser && active !== "true") active = "true";
  let ids = [];
  try{
    const indexRaw = await env.PRODUCTS.get("INDEX");
    ids = indexRaw ? JSON.parse(indexRaw) : [];
    if (!Array.isArray(ids)) ids = [];
  }catch(_){ ids = []; }
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
  return withCorsOrigin(json({ ok:true, items }), request, env);
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

// 统一的 JSON 响应函数（自动应用 CORS）
function json(data, status = 200, request = null, env = null) {
  const headers = (request && env) ? jsonHeadersFor(request, env) : jsonHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

function jsonWithHeaders(data, status = 200, headers = {}, request = null, env = null) {
  const baseHeaders = (request && env) ? jsonHeadersFor(request, env) : jsonHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({}, baseHeaders, headers)
  });
}

function withCorsOrigin(res, request, env, extraOriginsRaw) {
  const h = new Headers(res.headers);
  const originHeader = (request.headers.get('Origin') || '').trim();
  let selfOrigin = '';
  try{ selfOrigin = new URL(request.url).origin; }catch(_){}
  const allow = collectAllowedOrigins(env, request, extraOriginsRaw || '');
  const origin = (originHeader && allow.has(originHeader)) ? originHeader : '';
  if (origin || (selfOrigin && allow.has(selfOrigin))) {
    h.set("Access-Control-Allow-Origin", origin || selfOrigin);
    h.set("Vary", "Origin");
  } else {
    h.delete("Access-Control-Allow-Origin");
  }
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key");
  h.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return new Response(res.body, { status: res.status, headers: h });
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
async function listStories(request, url, env){
  const code = (url.searchParams.get("code")||"").toUpperCase();
  if (!code) return withCorsOrigin(json({ok:false, error:"Missing code"}, 400), request, env, env.STORY_ORIGINS || '');
  let ids = [];
  try{
    const idxRaw = await env.STORIES.get(`IDX:${code}`);
    ids = idxRaw ? JSON.parse(idxRaw) : [];
    if (!Array.isArray(ids)) ids = [];
  }catch(_){ ids = []; }
  const items = [];
  for (const id of ids.slice(0, 120)){
    const raw = await env.STORIES.get(`STORY:${id}`);
    if (!raw) continue;
    try{ items.push(JSON.parse(raw)); }catch{}
  }
  items.sort((a,b)=> new Date(b.ts||0) - new Date(a.ts||0));
  return withCorsOrigin(json({ok:true, items}), request, env, env.STORY_ORIGINS || '');
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
    const gatherEmails = (input)=> (input || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
    const toList = [
      ...gatherEmails(env.STORY_NOTIFY_EMAIL),
      ...gatherEmails(env.ORDER_NOTIFY_EMAIL),
      ...gatherEmails(env.ORDER_ALERT_EMAIL),
      ...gatherEmails(env.ADMIN_EMAIL)
    ];
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
    const base = (env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://unalomecodes.com').replace(/\/$/, '');
    const adminLink = `${base}/admin/code-viewer?code=${encodeURIComponent(item.code || '')}`;
    const nick = String(item.nick || '訪客').trim();
    const productName = String(item.productName || '').trim();
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
            ${productName ? `<p style="margin:0 0 6px;"><strong>商品：</strong>${esc(productName)}</p>` : ''}
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
      productName ? `商品：${productName}` : '',
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
    const refHeader = (request.headers.get('Referer') || '').trim();
    const originValue = originHeader || (refHeader ? (()=>{ try{ return new URL(refHeader).origin; }catch(_){ return ''; } })() : '');
    if (originValue){
      const allow = new Set([reqUrl.origin]);
      const addOrigin = (val)=>{
        if (!val) return;
        try{
          const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
          allow.add(u.origin);
        }catch(_){}
      };
      addOrigin(env.SITE_URL);
      addOrigin(env.PUBLIC_SITE_URL);
      addOrigin(env.PUBLIC_ORIGIN);
      const extraOrigins = (env.STORY_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
      extraOrigins.forEach(addOrigin);
      if (!allow.has(originValue)) {
        return withCorsOrigin(json({ ok:false, error:"Forbidden origin" }, 403), request, env, env.STORY_ORIGINS || '');
      }
    } else {
      return withCorsOrigin(json({ ok:false, error:"Forbidden origin" }, 403), request, env, env.STORY_ORIGINS || '');
    }
    const body = await request.json();
    const code = String((body.code||"").toUpperCase());
    const nick = String(body.nick||"訪客").slice(0, 20);
    const msg  = String(body.msg||"").trim();
    const productName = String(body.productName || body.product || body.itemName || body.name || '').trim().slice(0, 80);
    const imageUrlRaw = String(body.imageUrl || "").trim();
    const imageUrl = normalizeStoryImageUrl(imageUrlRaw, request.url, env);
    if (!code) return withCorsOrigin(json({ok:false, error:"Missing code"}, 400), request, env, env.STORY_ORIGINS || '');
    if (!msg || msg.length < 2) return withCorsOrigin(json({ok:false, error:"Message too short"}, 400), request, env, env.STORY_ORIGINS || '');
    if (msg.length > 800) return withCorsOrigin(json({ok:false, error:"Message too long"}, 400), request, env, env.STORY_ORIGINS || '');
    if (imageUrlRaw && !imageUrl) return withCorsOrigin(json({ ok:false, error:"Invalid imageUrl" }, 400), request, env, env.STORY_ORIGINS || '');
    try{
      const ipRaw = (request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').toString();
      const ip = ipRaw.split(',')[0].trim();
      if (ip){
        const rlKey = `RL:${code}:${ip}`;
        const lastRaw = await env.STORIES.get(rlKey);
        const nowTs = Date.now();
        const lastTs = Number(lastRaw || 0) || 0;
        if (nowTs - lastTs < 15000){
          return withCorsOrigin(json({ ok:false, error:"Too many requests" }, 429), request, env, env.STORY_ORIGINS || '');
        }
        await env.STORIES.put(rlKey, String(nowTs), { expirationTtl: 120 });
      }
    }catch(_){}
    const now = new Date().toISOString();
    const id = `${code}:${now}:${crypto.randomUUID()}`;
    const item = {
      id,
      code,
      nick,
      msg,
      ts: now,
      productName: productName || undefined,
      imageUrl: imageUrl || undefined
    };
    await env.STORIES.put(`STORY:${id}`, JSON.stringify(item));
    const idxKey = `IDX:${code}`;
    const idxRaw = await env.STORIES.get(idxKey);
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    ids.unshift(id);
    if (ids.length > 300) ids.length = 300;
    await env.STORIES.put(idxKey, JSON.stringify(ids));
    const mail = await maybeSendStoryEmail(env, item, request.url);
    return withCorsOrigin(json({ok:true, item, mail}), request, env, env.STORY_ORIGINS || '');
  }catch(e){
    return withCorsOrigin(json({ok:false, error:String(e)}, 500), request, env, env.STORY_ORIGINS || '');
  }
}

/* ========== /api/stories: DELETE (single or bulk) ========== */
// Modes:
//   A) ?code=XXXX&id=STORYID -> delete single story
//   B) ?code=XXXX            -> delete all stories under this code (capped at 200)
async function deleteStories(request, url, env){
  const code = (url.searchParams.get("code")||"").toUpperCase();
  const id   = url.searchParams.get("id") || "";
  if (!code) return withCorsOrigin(json({ ok:false, error:"Missing code" }, 400), request, env, env.STORY_ORIGINS || '');

  const idxKey = `IDX:${code}`;
  const idxRaw = await env.STORIES.get(idxKey);
  const ids = idxRaw ? JSON.parse(idxRaw) : [];

  if (id) {
    // delete single item
    await env.STORIES.delete(`STORY:${id}`);
    const next = ids.filter(x => x !== id);
    await env.STORIES.put(idxKey, JSON.stringify(next));
    return withCorsOrigin(json({ ok:true, deleted: 1 }), request, env, env.STORY_ORIGINS || '');
  }

  // bulk delete (cap to avoid long-running)
  let n = 0;
  for (const sid of ids.slice(0, 200)) {
    await env.STORIES.delete(`STORY:${sid}`);
    n++;
  }
  await env.STORIES.put(idxKey, JSON.stringify([]));
  return withCorsOrigin(json({ ok:true, deleted: n }), request, env, env.STORY_ORIGINS || '');
}

/* ========== /api/tat (TAT API proxy) ========== */
async function proxyTat(request, url, env){
  const key = (env.TAT_API_KEY || env.TAT_KEY || '').trim();
  if (!key) return withCORS(json({ ok:false, error:"Missing TAT API key" }, 500));
  const ip = getClientIp(request) || 'unknown';
  const ok = await checkRateLimit(env, `rl:tat:${ip}`, 120, 60);
  if (!ok) return withCORS(json({ ok:false, error:"Too many requests" }, 429));

  const params = new URLSearchParams(url.searchParams);
  const rawPath = params.get('path') || params.get('endpoint') || '';
  if (rawPath) {
    params.delete('path');
    params.delete('endpoint');
  }
  const normalizePath = (input)=>{
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (raw.includes('://') || raw.includes('..')) return '';
    const out = raw.startsWith('/') ? raw : `/${raw}`;
    if (!/^\/[a-z0-9/_-]+$/i.test(out)) return '';
    return out;
  };
  const pathFromRoute = url.pathname.replace(/^\/api\/tat/i, '');
  let tatPath = normalizePath(rawPath || pathFromRoute) || '/places';
  if (!/^\/api\/v2\//i.test(tatPath)) {
    tatPath = `/api/v2${tatPath.startsWith('/') ? tatPath : `/${tatPath}`}`;
  }

  const headerName = (env.TAT_API_HEADER || 'x-api-key').trim() || 'x-api-key';
  const prefix = (env.TAT_API_PREFIX || '').trim();
  let authValue = key;
  if (prefix) authValue = `${prefix}${key}`;
  const langParam = (params.get('lang') || params.get('language') || params.get('accept_language') || '').trim();
  if (langParam) params.delete('lang');
  if (langParam) params.delete('language');
  if (langParam) params.delete('accept_language');
  let acceptLanguage = langParam || 'en';
  if (/^(zh|zh-tw|zh-hant|zh-hans|cn)$/i.test(acceptLanguage)){
    acceptLanguage = 'en';
  }

  const base = (env.TAT_API_BASE || 'https://tatdataapi.io').replace(/\/+$/,'');
  const query = params.toString();
  const endpoint = query ? `${base}${tatPath}?${query}` : `${base}${tatPath}`;

  let resp;
  try{
    resp = await fetch(endpoint, {
      headers: {
        [headerName]: authValue,
        'Accept': 'application/json',
        'Accept-Language': acceptLanguage
      }
    });
  }catch(err){
    return withCORS(json({ ok:false, error:String(err) }, 502));
  }
  const contentType = resp.headers.get('content-type') || 'application/json; charset=utf-8';
  const body = await resp.text();
  const out = new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': contentType }
  });
  return withCORS(out);
}

/* ========== /api/geo (Geocode helper) ========== */
async function geocodePlace(request, url, env){
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return withCORS(json({ ok:false, error:"Missing q" }, 400));
  if (q.length > 180) return withCORS(json({ ok:false, error:"Query too long" }, 400));
  const ip = getClientIp(request) || 'unknown';
  const ok = await checkRateLimit(env, `rl:geo:${ip}`, 60, 60);
  if (!ok) return withCORS(json({ ok:false, error:"Too many requests" }, 429));

  const store = env.GEO_CACHE || env.GEOCODE_CACHE || null;
  const cacheKey = `GEO:${q.toLowerCase()}`;
  if (store && typeof store.get === "function"){
    try{
      const cached = await store.get(cacheKey);
      if (cached){
        const data = JSON.parse(cached);
        if (data && Number.isFinite(data.lat) && Number.isFinite(data.lng)){
          return withCORS(json({ ok:true, lat:data.lat, lng:data.lng, display_name:data.display_name || "", cached:true }));
        }
      }
    }catch(_){}
  }

  const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const ua = env.GEO_USER_AGENT || env.GEOCODE_USER_AGENT || "unalomecodes-food-map/1.0 (contact: support@unalomecodes.com)";
  const res = await fetch(endpoint, {
    headers: {
      "User-Agent": ua,
      "Accept": "application/json"
    }
  });
  if (!res.ok){
    return withCORS(json({ ok:false, error:"Geocode failed" }, 502));
  }
  const data = await res.json().catch(()=>null);
  if (!Array.isArray(data) || !data.length){
    return withCORS(json({ ok:false, error:"Not found" }, 404));
  }
  const first = data[0] || {};
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)){
    return withCORS(json({ ok:false, error:"Invalid response" }, 502));
  }
  const payload = { ok:true, lat, lng, display_name: first.display_name || "" };
  if (store && typeof store.put === "function"){
    try{
      await store.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 30 });
    }catch(_){}
  }
  return withCORS(json(payload));
}

/* ========== /api/maps-key (Frontend maps key) ========== */
async function getMapsKey(request, env){
  const key = (env.GOOGLE_MAPS_KEY || env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAP_API_KEY || env.GOOGLE_API_KEY || env.MAPS_API_KEY || env.GMAPS_KEY || "").trim();
  if (!key) return withCORS(json({ ok:false, error:"Missing key" }, 404));
  const allowed = isAllowedOrigin(request, env, env.MAPS_KEY_ORIGINS || "");
  if (!allowed) return withCORS(json({ ok:false, error:"Forbidden origin" }, 403));
  return withCORS(json({ ok:true, key }));
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
      const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://unalomecodes.com';
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
    const legacyHosts = ['shop.unalomecodes.com'];
    let originHost = '';
    let originProto = '';
    try{
      const originUrl = new URL(origin);
      originHost = originUrl.host || '';
      originProto = originUrl.protocol || '';
    }catch(_){}
    if (legacyHosts.includes(targetUrl.host) && originHost){
      const rewritten = new URL(targetUrl.toString());
      rewritten.host = originHost;
      if (originProto) rewritten.protocol = originProto;
      targetUrl = rewritten;
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
    legacyHosts.forEach(addHost);
    const extraHosts = (env.IMG_PROXY_HOSTS || env.IMG_PROXY_ALLOWLIST || '').split(',').map(s=>s.trim()).filter(Boolean);
    extraHosts.forEach(addHost);
    const allowSuffixes = [
      '.cdninstagram.com'
    ];
    const isAllowedSuffix = allowSuffixes.some(sfx => targetUrl.host.endsWith(sfx));
    if (allowHosts.size && !allowHosts.has(targetUrl.host) && !isAllowedSuffix) {
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
