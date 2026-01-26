function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

export function createOrdersListHandler(deps){
  requireDeps(deps, ['ORDER_INDEX_KEY', 'ORDER_ID_PREFIX', 'ORDER_ID_LEN', 'jsonHeadersFor', 'getClientIp', 'checkRateLimit', 'isAdmin', 'getAny', 'normalizePhone', 'normalizeOrderSuffix', 'matchPhone', 'matchLast5', 'normalizeReceiptUrl', 'redactOrderForPublic', 'attachSignedProofs', 'trimOrderIndex'], 'orders-list.js');
  const {
    ORDER_INDEX_KEY,
    ORDER_ID_PREFIX,
    ORDER_ID_LEN,
    jsonHeadersFor,
    getClientIp,
    checkRateLimit,
    isAdmin,
    getAny,
    normalizePhone,
    normalizeOrderSuffix,
    matchPhone,
    matchLast5,
    normalizeReceiptUrl,
    redactOrderForPublic,
    attachSignedProofs,
    trimOrderIndex
  } = deps;

  return async function handleOrdersList(request, env){
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (!((pathname === '/api/orders' || pathname === '/api/orders/lookup') && request.method === 'GET')) return null;
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
          const origin = new URL(request.url).origin;
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
        try{
          const path = new URL(request.url).pathname;
          console.warn('[orders] index missing, scanning KV', { path });
        }catch(_){}
        try {
          const l = await env.ORDERS.list(); // list ALL keys
          const allKeys = Array.isArray(l.keys) ? l.keys.map(k => k.name) : [];
          // Keep only known order-id patterns, exclude INDEX / ORDER_SEQ_*
          const orderIdRe = new RegExp(`^${ORDER_ID_PREFIX}[A-Z0-9]{${ORDER_ID_LEN}}$`);
          const discovered = allKeys.filter(name => /^\\d{13}$/.test(name) || orderIdRe.test(String(name||'').toUpperCase()));
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
              const origin = new URL(request.url).origin;
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
  };
}
