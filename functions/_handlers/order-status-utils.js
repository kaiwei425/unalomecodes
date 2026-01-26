function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createOrderStatusUtils(deps){
  requireDeps(deps, ['ORDER_INDEX_KEY', 'markCouponUsageOnce', 'releaseCouponUsage', 'decStockCounters', 'restoreStockCounters', 'bumpSoldCounters', 'decSoldCounters'], 'order-status-utils.js');
  const {
    ORDER_INDEX_KEY,
    markCouponUsageOnce,
    releaseCouponUsage,
    decStockCounters,
    restoreStockCounters,
    bumpSoldCounters,
    decSoldCounters
  } = deps;

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
  function statusIsPaidOrReady(s){
    return statusIsPaid(s);
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
      try { await decStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){ }
      order.stockDeducted = true;
      changed = true;
    }
    if (order.soldCounted === false) {
      try { await bumpSoldCounters(env, order.items, order.productId, order.qty); } catch(_){ }
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
        try { await releaseCouponUsage(env, code, order.id); } catch(_){ }
      }
      if (order.coupon.locked || order.coupon.reserved){
        order.coupon.locked = false;
        order.coupon.reserved = false;
        changed = true;
      }
    }
    if (order.stockDeducted === true) {
      try { await restoreStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){ }
      order.stockDeducted = false;
      changed = true;
    }
    if (order.soldCounted === true) {
      try { await decSoldCounters(env, order.items, order.productId, order.qty); } catch(_){ }
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
  function statusIsWaitingVerify(status){
    return isWaitingVerifyStatus(status);
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

  return {
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
  };
}

export { createOrderStatusUtils };
