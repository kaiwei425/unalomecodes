function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createCouponUtils(deps){
  requireDeps(deps, ['makeToken'], 'coupon-utils.js');
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
