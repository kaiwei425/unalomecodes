function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

export function createServiceOrdersLookupHandler(deps){
  requireDeps(deps, ['jsonHeadersFor', 'normalizeTWPhoneStrict', 'normalizeOrderSuffix', 'lastDigits', 'getClientIp', 'checkRateLimit', 'redactOrderForPublic', 'attachSignedProofs'], 'service-orders-lookup.js');
  const {
    jsonHeadersFor,
    normalizeTWPhoneStrict,
    normalizeOrderSuffix,
    lastDigits,
    getClientIp,
    checkRateLimit,
    redactOrderForPublic,
    attachSignedProofs
  } = deps;

  return async function handleServiceOrdersLookup(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/service/orders/lookup' || request.method !== 'GET') return null;
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
  };
}
