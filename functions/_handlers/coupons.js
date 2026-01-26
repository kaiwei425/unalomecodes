function createCouponHandlers(deps){
  const {
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
  } = deps;

  async function handleCoupons(request, env, url, pathname){
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

    return null;
  }

  return { handleCoupons };
}

export { createCouponHandlers };
