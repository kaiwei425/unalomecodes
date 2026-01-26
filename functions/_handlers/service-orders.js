function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createServiceOrderHandlers(deps){
  requireDeps(deps, ['jsonHeadersFor', 'jsonHeaders', 'cleanupExpiredHolds', 'getSlotConfig', 'applyScheduledSlotPublish', 'getServiceSlotMode', 'getServiceSlotWindow', 'closeExpiredWindowIfNeeded', 'isSlotWindowActive', 'nowMs', 'addDaysDateStr', 'parseDailyWindows', 'minutesToHHMM', 'buildSlotKey', 'resolveSlotEnabled', 'resolveSlotStatus', 'BOOKING_MODE_WINDOWED', 'getTodayDateStr', 'parseSlotKey', 'getSessionUser', 'resolveHoldUserId', 'hasActiveHoldForUser', 'auditAppend', 'getClientIp', 'makeToken', 'getRescheduleConfig', 'parseSlotStartToMs', 'normalizeTWPhoneStrict', 'updateRescheduleIndex', 'buildRescheduleId', 'buildAuditActor', 'getRescheduleNotifyEmails', 'buildRescheduleEmail', 'getPhoneConsultConfig', 'isOwnerOrAdminSession', 'getViewerEmailFromSession', 'isAllowlisted', 'sendEmailMessage', 'generateServiceOrderId', 'ensureUserRecord', 'isPhoneConsultServiceRecord', 'resolvePhoneConsultOptionPrices', 'getPhoneConsultPromoInfo', 'isPromoActive', 'getPhoneConsultTotalForOption', 'getPhoneConsultPromoTotalForOption', 'maybeSendOrderEmails', 'updateUserDefaultContact', 'isAllowedFileUrl'], 'service-orders.js');
  const {
    jsonHeadersFor,
    jsonHeaders,
    cleanupExpiredHolds,
    getSlotConfig,
    applyScheduledSlotPublish,
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
  } = deps;

  async function handleServiceOrders(request, env, url, origin, pathname){
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

  if (pathname === '/api/service/slots' && request.method === 'GET') {
      cleanupExpiredHolds(env).catch(()=>{});
      if (!env?.SERVICE_SLOTS_KV){
        return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
      }
      const serviceId = String(url.searchParams.get('serviceId') || '').trim();
      if (!serviceId){
        return new Response(JSON.stringify({ ok:false, error:'missing_service_id' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      await applyScheduledSlotPublish(env, serviceId);
      const cfg = getSlotConfig(env);
      const bookingMode = await getServiceSlotMode(env, serviceId);
      let windowInfo = bookingMode === BOOKING_MODE_WINDOWED ? await getServiceSlotWindow(env, serviceId) : null;
      if (windowInfo){
        windowInfo = await closeExpiredWindowIfNeeded(env, serviceId, windowInfo);
      }
      const windowActive = bookingMode === BOOKING_MODE_WINDOWED ? isSlotWindowActive(windowInfo, nowMs()) : false;
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
        const bookable = enabled && status === 'free' && (bookingMode !== BOOKING_MODE_WINDOWED || windowActive);
        slots.push({ slotKey, time, status, enabled, bookable });
      }
      items.push({ date: dateStr, slots });
    }
    const publishWindow = bookingMode === BOOKING_MODE_WINDOWED
      ? { openFrom: Number(windowInfo?.openFrom || 0), openUntil: Number(windowInfo?.openUntil || 0), active: windowActive }
      : null;
    return new Response(JSON.stringify({ ok:true, serviceId, dateFrom, days, items, bookingMode, publishWindow }), { status:200, headers: jsonHeadersFor(request, env) });
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
      const bookingMode = await getServiceSlotMode(env, serviceId);
      if (bookingMode === BOOKING_MODE_WINDOWED){
        const windowInfo = await getServiceSlotWindow(env, serviceId);
        if (!isSlotWindowActive(windowInfo, nowMs())){
          return new Response(JSON.stringify({ ok:false, error:'SLOT_NOT_PUBLISHED' }), { status:409, headers: jsonHeadersFor(request, env) });
        }
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

    return null;
  }

  return { handleServiceOrders };
}

export { createServiceOrderHandlers };
