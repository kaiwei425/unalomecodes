function createCouponUtils(deps){
  const { makeToken } = deps;

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

  return {
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
    redeemCoupon
  };
}

export { createCouponUtils };
