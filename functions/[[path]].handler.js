// functions/[[path]].handler.js
import {
  getMahaTaksa,
  getThaiDayColor,
  toWeekdayKey,
  deriveTabooColor
} from '../lib/mahataksa.js';
import { getYamUbakong } from '../lib/ubakong.js';
import { createSplitHandler } from './_handlers/index.js';
import { createProductHandlers } from './_handlers/products.js';
import { createOrderQnaHandlers } from './_handlers/order-qna.js';
import { createOrderFlowHandlers } from './_handlers/order-flow.js';
import { createPaymentHandlers } from './_handlers/payment.js';
import { createServiceOrderHandlers } from './_handlers/service-orders.js';
import { createCouponHandlers } from './_handlers/coupons.js';
import { createServiceProductsHandlers } from './_handlers/service-products.js';
import { createFileHandlers } from './_handlers/files.js';
import { createMiscApiHandlers } from './_handlers/misc-apis.js';
import { createUploadHandlers } from './_handlers/upload.js';
import { createAdminHandlers } from './_handlers/admin.js';
import { createAuthHandlers } from './_handlers/auth.js';
import { createStatsUtils } from './_handlers/stats-utils.js';
import { createProofStoreUtils } from './_handlers/proof-store.js';
import { createProofAccessUtils } from './_handlers/proof-access.js';
import { createFileUtils } from './_handlers/file-utils.js';
import { createCoreSharedUtils } from './_handlers/core-shared.js';
import { createOrderEmailUtils } from './_handlers/order-email-utils.js';
import {
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
} from './_handlers/core-utils.js';

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

const coreShared = createCoreSharedUtils({
  getAny,
  arrayBufferToBase64,
  signSession,
  verifySessionToken,
  makeToken,
  ORDER_INDEX_KEY,
  decStockCounters,
  restoreStockCounters,
  bumpSoldCounters,
  decSoldCounters
});

const {
  inferCouponDeity,
  couponKey,
  makeCouponCode,
  markCouponUsageOnce,
  reserveCouponUsage,
  releaseCouponUsage,
  readCoupon,
  saveCoupon,
  generateUniqueCouponCode,
  issueWelcomeCoupon,
  getUserCouponUnread,
  revokeUserCoupons,
  redeemCoupon,
  proofSecret,
  signProofToken,
  verifyProofToken,
  extractProofKeyFromUrl,
  isAllowedFileUrl,
  parseCookies,
  getSessionUser,
  ensureUserRecord,
  loadUserRecord,
  updateUserDefaultContact,
  updateUserDefaultStore,
  resolveTotalStockForProduct,
  resolveAvailableStock,
  readProductById,
  getUserStore,
  getSessionUserRecord,
  saveUserRecord,
  buildOrderItems,
  resolveOrderSelection,
  needShippingFee,
  resolveShippingFee,
  buildBilingualOrderEmail,
  getSlotConfig,
  BOOKING_MODE_WINDOWED,
  buildSlotKey,
  parseSlotKey,
  parseTimeToMinutes,
  minutesToHHMM,
  getTodayDateStr,
  addDaysDateStr,
  parseDailyWindows,
  isSlotWindowActive,
  resolveSlotEnabled,
  resolveSlotStatus,
  resolveHoldUserId,
  cleanupExpiredHolds,
  hasActiveHoldForUser,
  getServiceSlotMode,
  setServiceSlotMode,
  getServiceSlotWindow,
  setServiceSlotWindow,
  nowMs,
  getServiceSlotPublishSchedule,
  setServiceSlotPublishSchedule,
  clearServiceSlotPublishSchedule,
  publishSlotKeys,
  unpublishSlotKeys,
  applyScheduledSlotPublish,
  closeExpiredWindowIfNeeded,
  parsePublishAt,
  getRescheduleConfig,
  getRescheduleNotifyEmails,
  parseSlotStartToMs,
  buildRescheduleId,
  updateRescheduleIndex,
  buildRescheduleEmail,
  ecpayEndpoint,
  ecpayCheckMac,
  orderAmount,
  orderItemsSummary,
  normalizeReceiptUrl,
  CANONICAL_STATUS,
  normalizeStatus,
  statusIsPaid,
  statusIsPaidOrReady,
  statusIsWaitingVerify,
  statusIsCompleted,
  statusIsCanceled,
  isFulfillmentOrderTransitionAllowed,
  getOrderCreatedTs,
  getOrderPaidTs,
  getOrderAmount,
  extractCouponCodes,
  ensureOrderPaidResources,
  releaseOrderResources,
  parseOrderTimestamp,
  resolveOrderHoldTtlSec,
  isWaitingVerifyStatus,
  isHoldReleaseCandidate,
  releaseExpiredOrderHolds
} = coreShared;

const { computeServerDiscount, buildOrderDraft, maybeSendOrderEmails, sendEmailMessage, shouldNotifyStatus } = createOrderEmailUtils({
  inferCouponDeity,
  redeemCoupon,
  markCouponUsageOnce,
  reserveCouponUsage,
  resolveOrderSelection,
  generateOrderId,
  needShippingFee,
  resolveShippingFee,
  makeToken,
  getBookingNotifyEmails,
  getAdminRole,
  isPhoneConsultOrder,
  buildBilingualOrderEmail,
  buildOrderItems,
  getConsultStageLabel
});

const { updateDashboardStats } = createStatsUtils({
  orderAmount,
  orderItemsSummary,
  resolveTotalStockForProduct,
  resolveAvailableStock,
  statusIsPaid,
  statusIsCanceled,
  statusIsPaidOrReady,
  statusIsWaitingVerify,
  taipeiDateKey,
  isLimitedExpired,
  readProductById,
  normalizeStatus,
  CANONICAL_STATUS,
  ORDER_INDEX_KEY,
  getUserStore,
  getOrderCreatedTs,
  getOrderPaidTs,
  getOrderAmount
});

const { getProofFromStore } = createProofStoreUtils({
  extractProofKeyFromUrl
});

const { canAccessProof } = createProofAccessUtils({
  getAny,
  verifyProofToken,
  isAdmin
});

const { deleteR2FileByKey, deleteR2FileViaBody, extractKeyFromProxyUrl, proxyR2File } = createFileUtils({
  withCORS,
  json
});

const productHandlers = createProductHandlers({
  isAdmin,
  getDeityCodeFromName,
  inferCategory,
  autoDeactivateExpiredItem,
  isLimitedExpired,
  withCorsOrigin,
  withCORS,
  json,
  normalizeProduct,
  normalizeLimitedUntil,
  pick
});

const orderQnaHandlers = createOrderQnaHandlers({
  json,
  corsPreflight,
  getSessionUserRecord,
  attachSignedProofs,
  ORDER_INDEX_KEY,
  getAdminSession,
  isAdmin,
  getAdminRole,
  findOrderByIdForQna,
  orderBelongsToUser,
  loadOrderQna,
  saveOrderQna,
  sanitizeQnaItem,
  incrementAdminQnaUnread,
  clearUserUnreadForOrder,
  maybeSendOrderQnaEmail,
  buildOrderItems,
  findUserIdByEmail,
  incrementUserUnreadForOrder,
  requireAdminWrite,
  forbidIfFulfillmentAdmin,
  getAdminQnaUnread,
  clearAdminQnaUnread,
  getQnaMetaStore,
  getUserUnreadTotal,
  clearUserUnreadAll,
  getUserCouponUnread,
  saveUserRecord
});

const orderFlowHandlers = createOrderFlowHandlers({
  json,
  requireAdminWrite,
  isAllowedFileUrl
});

const paymentHandlers = createPaymentHandlers({
  json,
  getSessionUser,
  ensureUserRecord,
  resolveOrderSelection,
  generateOrderId,
  inferCouponDeity,
  computeServerDiscount,
  markCouponUsageOnce,
  redeemCoupon,
  needShippingFee,
  resolveShippingFee,
  makeToken,
  decStockCounters,
  trimOrderIndex,
  ORDER_INDEX_KEY,
  maybeSendOrderEmails,
  updateUserDefaultContact,
  safeExt,
  guessExt,
  isAllowedFileUrl,
  buildOrderDraft,
  ecpayEndpoint,
  ecpayCheckMac,
  releaseCouponUsage,
  restoreStockCounters,
  bumpSoldCounters,
  decSoldCounters,
  shouldNotifyStatus
});

const serviceOrderHandlers = createServiceOrderHandlers({
  jsonHeadersFor,
  jsonHeaders,
  cleanupExpiredHolds,
  getSlotConfig,
  getServiceSlotMode,
  getServiceSlotWindow,
  closeExpiredWindowIfNeeded,
  isSlotWindowActive,
  nowMs,
  addDaysDateStr,
  parseDailyWindows,
  minutesToHHMM,
  buildSlotKey,
  resolveSlotEnabled,
  resolveSlotStatus,
  BOOKING_MODE_WINDOWED,
  getTodayDateStr,
  parseSlotKey,
  getSessionUser,
  resolveHoldUserId,
  hasActiveHoldForUser,
  auditAppend,
  getClientIp,
  makeToken,
  getRescheduleConfig,
  parseSlotStartToMs,
  normalizeTWPhoneStrict,
  updateRescheduleIndex,
  buildRescheduleId,
  buildAuditActor,
  getRescheduleNotifyEmails,
  buildRescheduleEmail,
  getPhoneConsultConfig,
  isOwnerOrAdminSession,
  getViewerEmailFromSession,
  isAllowlisted,
  sendEmailMessage,
  generateServiceOrderId,
  ensureUserRecord,
  isPhoneConsultServiceRecord,
  resolvePhoneConsultOptionPrices,
  getPhoneConsultPromoInfo,
  isPromoActive,
  getPhoneConsultTotalForOption,
  getPhoneConsultPromoTotalForOption,
  maybeSendOrderEmails,
  updateUserDefaultContact,
  isAllowedFileUrl
});

const couponHandlers = createCouponHandlers({
  json,
  jsonHeaders,
  jsonHeadersFor,
  requireAdminWrite,
  forbidIfFulfillmentAdmin,
  getAdminSession,
  hasAdminPermission,
  readCoupon,
  inferCouponDeity,
  taipeiDateKey,
  getClientIp,
  checkRateLimit,
  getSessionUserRecord,
  saveUserRecord,
  isAdmin,
  getUserStore,
  loadUserRecord,
  makeCouponCode,
  couponKey,
  saveCoupon,
  ORDER_INDEX_KEY
});

const serviceProductsHandlers = createServiceProductsHandlers({
  jsonHeaders,
  jsonHeadersFor,
  requireAdminWrite,
  forbidIfFulfillmentAdmin,
  normalizeLimitedUntil,
  autoDeactivateExpiredItem,
  isLimitedExpired,
  DEFAULT_SERVICE_PRODUCTS
});

const fileHandlers = createFileHandlers({
  requireAdminWrite,
  forbidIfFulfillmentAdmin,
  requireAdminPermission,
  buildAuditActor,
  parseRate,
  checkAdminRateLimit,
  buildRateKey,
  auditAppend,
  jsonHeadersFor,
  jsonHeaders,
  deleteR2FileByKey,
  deleteR2FileViaBody,
  extractKeyFromProxyUrl,
  proxyR2File,
  canAccessProof,
  getProofFromStore,
  arrayBufferToBase64
});

const miscApiHandlers = createMiscApiHandlers({
  listStories,
  createStory,
  deleteStories,
  requireAdminWrite,
  forbidIfFulfillmentAdmin,
  getMapsKey,
  geocodePlace,
  proxyTat,
  resizeImage
});

const uploadHandlers = createUploadHandlers({
  withCORS,
  json,
  isAllowedOrigin,
  getSessionUser,
  getAdminSession,
  getAdminRole,
  getClientIp,
  checkRateLimit,
  guessExt,
  safeExt
});

const adminHandlers = createAdminHandlers({
  json,
  jsonHeadersFor,
  jsonHeaders,
  requireAdminWrite,
  forbidIfFulfillmentAdmin,
  requireAdminPermission,
  getAdminSession,
  getAdminRole,
  getAdminPermissionsForEmail,
  hasAdminPermission,
  getAdminPermissions,
  sanitizePermissionsForRole,
  normalizeRole,
  buildAuditActor,
  auditAppend,
  parseRate,
  checkAdminRateLimit,
  buildRateKey,
  updateDashboardStats,
  pickTrackStore,
  normalizeTrackEvent,
  formatTZ,
  taipeiDateKey,
  computeServerDiscount,
  getRescheduleConfig,
  getPhoneConsultConfig,
  getPhoneConsultPromoInfo,
  resolvePhoneConsultOptionPrices,
  buildSlotKey,
  parseSlotKey,
  resolveSlotStatus,
  resolveSlotEnabled,
  cleanupExpiredHolds,
  getSlotConfig,
  applyScheduledSlotPublish,
  getServiceSlotMode,
  setServiceSlotMode,
  getServiceSlotWindow,
  setServiceSlotWindow,
  getServiceSlotPublishSchedule,
  setServiceSlotPublishSchedule,
  clearServiceSlotPublishSchedule,
  closeExpiredWindowIfNeeded,
  isSlotWindowActive,
  nowMs,
  parsePublishAt,
  publishSlotKeys,
  unpublishSlotKeys,
  parseTimeToMinutes,
  minutesToHHMM,
  getSessionUserRecord,
  loadUserRecord,
  saveUserRecord,
  ensureUserRecord,
  sendEmailMessage,
  sendEmailWithRetry,
  buildStatusUpdateEmailPayload,
  buildRescheduleEmail,
  getRescheduleNotifyEmails,
  buildRescheduleId,
  updateRescheduleIndex,
  parseSlotStartToMs,
  getBookingNotifyEmails,
  getConsultStageLabel,
  normalizeTWPhoneStrict,
  getClientIp,
  generateServiceOrderId,
  attachSignedProofs,
  statusIsPaid,
  statusIsCanceled,
  releaseOrderResources,
  ensureOrderPaidResources,
  releaseExpiredOrderHolds,
  isFulfillmentOrderTransitionAllowed,
  shouldNotifyStatus,
  maybeSendOrderEmails,
  orderAmount,
  orderItemsSummary,
  csvEscape,
  normalizeOrderSuffix,
  normalizeStatus,
  statusIsPaidOrReady,
  statusIsWaitingVerify,
  getAdminQnaUnread,
  clearAdminQnaUnread,
  getUserUnreadTotal,
  clearUserUnreadAll,
  clearUserUnreadForOrder,
  getQnaMetaStore,
  getUserUnreadForOrder,
  getUserCouponUnread,
  requireCronOrAdmin,
  getAny,
  orderBelongsToUser,
  findOrderByIdForQna,
  sanitizeQnaItem,
  loadOrderQna,
  saveOrderQna,
  incrementAdminQnaUnread,
  incrementUserUnreadForOrder,
  findUserIdByEmail,
  buildOrderItems,
  isOwnerAdmin,
  getBookingNotifyFlag,
  setBookingNotifyFlag,
  orderQnaHandlers,
  orderFlowHandlers,
  paymentHandlers,
  couponHandlers
});

const authHandlers = createAuthHandlers({
  json,
  jsonHeadersFor,
  makeToken,
  makeSignedState,
  verifySignedState,
  parseCookies,
  ensureUserRecord,
  signSession,
  verifyLineIdToken,
  getSessionUser,
  parseAdminEmails,
  getAdminSecret,
  redirectWithBody,
  base64UrlDecodeToBytes
});

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

function sleepMs(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getOrderCustomerEmail(order){
  return (
    order?.buyer?.email ||
    order?.email ||
    order?.contactEmail ||
    order?.buyer_email ||
    order?.recipientEmail ||
    ''
  ).trim();
}

function isRateLimitError(err){
  if (!err) return false;
  const msg = typeof err === 'string'
    ? err
    : (err.message || (()=>{ try{ return JSON.stringify(err); }catch(_){ return String(err); } })());
  return /429|rate_limit|too many requests/i.test(msg);
}

function isRateLimitResult(result){
  if (!result || result.ok) return false;
  if (isRateLimitError(result.error) || isRateLimitError(result.reason)) return true;
  const errors = Array.isArray(result.errors) ? result.errors : [];
  return errors.some((entry)=> isRateLimitError(entry && (entry.error || entry.reason || entry)));
}

async function sendEmailWithRetry(env, payload){
  try{
    return await sendEmailMessage(env, payload);
  }catch(err){
    if (isRateLimitError(err)){
      await sleepMs(1200);
      return sendEmailMessage(env, payload);
    }
    throw err;
  }
}

function buildStatusUpdateEmailPayload(order, env, opts = {}){
  const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
  const statusLabel = (order.status || '').trim();
  const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || 'https://unalomecodes.com').replace(/\/$/, '');
  const serviceLookupBase = env.SERVICE_LOOKUP_URL
    ? env.SERVICE_LOOKUP_URL.replace(/\/$/, '')
    : `${primarySite}/service`;
  const defaultLookupBase = (env.ORDER_LOOKUP_URL || primarySite).replace(/\/$/, '');
  const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || String(order?.method||'').includes('服務');
  const lookupUrl = order.id
    ? isServiceOrder
      ? `${serviceLookupBase}#lookup=${encodeURIComponent(order.id)}`
      : `${defaultLookupBase}/shop#lookup=${encodeURIComponent(order.id)}`
    : '';
  const channelLabel = opts.channel || order.method || '';
  const imageHost = env.EMAIL_IMAGE_HOST || env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || primarySite;
  const subjectPrefix = opts.admin ? `[${siteName}]` : siteName;
  const subject = `${subjectPrefix} 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`;
  const composeOpts = {
    siteName,
    lookupUrl,
    channelLabel,
    imageHost,
    context: 'status_update',
    blessingDone: statusLabel === '祈福完成'
  };
  if (typeof composeOrderEmail !== 'function'){
    const orderId = String(order.id || '').trim();
    const slotStart = String(order.slotStart || order.requestDate || '').trim();
    const lines = [
      `訂單狀態更新`,
      `訂單編號：${orderId || '—'}`,
      `狀態：${statusLabel || '—'}`,
      slotStart ? `預約時段：${slotStart}` : '',
      lookupUrl ? `查詢訂單：${lookupUrl}` : ''
    ].filter(Boolean);
    const text = lines.join('\n');
    const html = lines.join('<br>');
    return { subject, html, text };
  }
  const composed = composeOrderEmail(order, Object.assign({ admin: !!opts.admin }, composeOpts));
  return { subject, html: composed.html, text: composed.text };
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
  const fallbackRaw = String(env?.BOOKING_NOTIFY_EMAIL || env?.BOOKING_EMAIL || env?.BOOKING_ALERT_EMAIL || env?.BOOKING_TO || '').trim();
  const fallback = fallbackRaw ? fallbackRaw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : [];
  if (!kv) return Array.from(new Set(fallback));
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
  const merged = out.length ? out : bookingAll;
  return Array.from(new Set(merged.concat(fallback)));
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
    '系統通知｜訂單狀態更新',
    `訂單編號：${orderId}`,
    `預約時段：${slotStart || '—'}`,
    `目前階段：${label.zh || stage}`,
    `後台連結：${adminUrl}`
  ].join('<br>');
  const en = [
    '[English]',
    'System Notification | Order Status Update',
    `Order ID: ${orderId}`,
    `Slot: ${slotStart || '—'}`,
    `Stage: ${label.en || stage}`,
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
  const subject = `[${siteName}] 新訂單待預約 / Booking Required #${orderId}`;
  const zh = [
    '【中文】',
    '有一筆新訂單需要安排預約',
    `訂單編號：${orderId}`,
    `預約時間（曼谷時間）：${slotStart || '—'}`,
    '請盡快完成預約安排；完成後至後台點選「已完成預約」以更新訂單狀態。',
    `後台：${adminUrl}`
  ].join('<br>');
  const en = [
    '[English]',
    'A new booking requires scheduling.',
    `Order ID: ${orderId}`,
    `Appointment time (Bangkok time): ${slotStart || '—'}`,
    'Please complete the booking ASAP, then click "Booking confirmed" in the admin panel to update the order status.',
    `Admin: ${adminUrl}`
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
    normalizeTWPhoneStrict,
    lastDigits,
    hasAdminPermission,
    updateDashboardStats,
    pickTrackStore,
    normalizeTrackEvent,
    taipeiDateKey,
    withCORS,
    isAllowedOrigin,
    getSessionUser,
    guessExt,
    safeExt
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

  // 商品列表 / 新增
  if ((pathname === "/api/products" || pathname === "/products") && request.method === "GET") {
    return productHandlers.listProducts(request, url, env);
  }
  if (pathname === "/api/products" && request.method === "POST") {
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    const roleGuard = await forbidIfFulfillmentAdmin(request, env);
    if (roleGuard) return roleGuard;
    return productHandlers.createProduct(request, env);
  }

  // 商品單筆
  const prodIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/) || pathname.match(/^\/products\/([^/]+)$/);
  if (prodIdMatch) {
    const id = decodeURIComponent(prodIdMatch[1]);
    if (request.method === "GET") return productHandlers.getProduct(id, env);
    if (request.method === "PUT") {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      const roleGuard = await forbidIfFulfillmentAdmin(request, env);
      if (roleGuard) return roleGuard;
      return productHandlers.putProduct(id, request, env);
    }
    if (request.method === "PATCH") {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      const roleGuard = await forbidIfFulfillmentAdmin(request, env);
      if (roleGuard) return roleGuard;
      return productHandlers.patchProduct(id, request, env);
    }
    if (request.method === "DELETE") {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
      const roleGuard = await forbidIfFulfillmentAdmin(request, env);
      if (roleGuard) return roleGuard;
      return productHandlers.deleteProduct(id, env);
    }
  }

  {
    const handled = await authHandlers.handleAuth(request, env, url, pathname, origin);
    if (handled) return handled;
  }

  {
    const handled = await adminHandlers.handleAdminApis(request, env, url, pathname, origin);
    if (handled) return handled;
  }

  {
    const handled = await serviceProductsHandlers.handleServiceProducts(request, env, url, pathname);
    if (handled) return handled;
  }

  {
    const handled = await serviceOrderHandlers.handleServiceOrders(request, env, url, origin, pathname);
    if (handled) return handled;
  }

  {
    const handled = await fileHandlers.handleFileRoutes(request, env, pathname);
    if (handled) return handled;
  }

  // CORS Preflight for all /api/ routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return corsPreflight();
  }

  {
    const handled = await miscApiHandlers.handleMiscApis(request, env, url, pathname, origin);
    if (handled) return handled;
  }

  {
    const handled = await uploadHandlers.handleUploadRoute(request, env, url, origin, pathname);
    if (handled) return handled;
  }

  // 預設回退: 如果請求路徑不是以 /api/ 開頭，則交給靜態資源處理
  if (!pathname.startsWith("/api/")) {
    return next();
  }

  // 如果是未匹配的 /api/ 路由，回傳 404
  return next();
}
