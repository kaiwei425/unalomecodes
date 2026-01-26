function createAdminHandlers(deps){
  const {
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
    getRescheduleConfig,
    getPhoneConsultConfig,
    getPhoneConsultTemplate,
    setPhoneConsultTemplate,
    getPhoneConsultPromoInfo,
    setPhoneConsultPromoInfo,
    resolvePhoneConsultOptionPrices,
    resolvePhoneConsultPayload,
    resolveServiceSlotMode,
    buildSlotKey,
    parseSlotKey,
    resolveSlotStatus,
    resolveSlotEnabled,
    cleanupExpiredHolds,
    getSlotConfig,
    applyScheduledSlotPublish,
    ensureScheduledSlotPublish,
    cancelScheduledSlotPublish,
    applyServiceSlotPublish,
    applyServiceSlotBlock,
    applyServiceSlotRelease,
    applyServiceSlotConfig,
    resolveSlotConfigPayload,
    resolveSlotWindowPayload,
    getServiceSlotMode,
    getServiceSlotWindow,
    closeExpiredWindowIfNeeded,
    isSlotWindowActive,
    nowMs,
    getSessionUserRecord,
    loadUserRecord,
    saveUserRecord,
    ensureUserRecord,
    listUsers,
    listUsersByPrefix,
    deleteUserRecord,
    resetUserGuardian,
    canAdminDeleteUser,
    sendEmailMessage,
    buildRescheduleEmail,
    getRescheduleNotifyEmails,
    buildRescheduleId,
    updateRescheduleIndex,
    parseSlotStartToMs,
    normalizeTWPhoneStrict,
    getClientIp,
    generateServiceOrderId,
    attachSignedProofs,
    listOrdersByIndex,
    listServiceOrdersByIndex,
    getServiceOrderById,
    getOrderById,
    updateOrderStatus,
    updateServiceOrderStatus,
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
    resolveAdminQnaStore,
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
  } = deps;

  async function handleAdminApis(request, env, url, pathname, origin){
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
      let mailStatus = { customer: null, admin: null, booking: null };
      try{
        const origin = new URL(request.url).origin;
        const sendWithRetry = async (sendFn)=>{
          let result = await sendFn();
          if (isRateLimitResult(result)){
            await sleepMs(1200);
            result = await sendFn();
          }
          return result;
        };
        const fromDefault = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
        if (stage === 'payment_confirmed'){
          const bookingEmails = await getBookingNotifyEmails(env);
          const extraBookingRaw = String(env?.BOOKING_NOTIFY_EMAIL || env?.BOOKING_EMAIL || env?.BOOKING_ALERT_EMAIL || env?.BOOKING_TO || '').trim();
          const extraBooking = extraBookingRaw ? extraBookingRaw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : [];
          const bookingSet = new Set((bookingEmails || []).concat(extraBooking).map(s => String(s || '').trim()).filter(Boolean));
          const baseAdmins = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '')
            .split(',').map(s => s.trim()).filter(Boolean);
          const ownerAdmins = [];
          await Promise.all(baseAdmins.map(async (email)=>{
            const normalized = String(email || '').trim();
            if (!normalized) return;
            try{
              const role = await getAdminRole(normalized, env);
              if (bookingSet.has(normalized) && role === 'booking') return;
            }catch(_){}
            ownerAdmins.push(normalized);
          }));
          const customerResult = await sendWithRetry(()=> maybeSendOrderEmails(env, order, {
            origin,
            channel:'服務型商品',
            notifyAdmin: false,
            notifyCustomer: true,
            emailContext:'status_update',
            bilingual:false,
            serialSend: true
          }));
          mailStatus.customer = customerResult || { ok:false, reason:'no_result' };
          await sleepMs(650);
          if (fromDefault && customerResult && !customerResult.sentCustomer){
            const customerEmail = getOrderCustomerEmail(order);
            if (customerEmail){
              const payload = buildStatusUpdateEmailPayload(order, env, { admin:false, channel:'服務型商品' });
              await sendEmailWithRetry(env, {
                from: fromDefault,
                to: [customerEmail],
                subject: payload.subject,
                html: payload.html,
                text: payload.text
              });
              mailStatus.customer = Object.assign({}, mailStatus.customer || {}, { fallback:true, fallbackOk:true });
            }
          }
          const adminResult = await sendWithRetry(()=> maybeSendOrderEmails(env, order, {
            origin,
            channel:'服務型商品',
            notifyAdmin: true,
            notifyCustomer: false,
            adminEmails: ownerAdmins,
            emailContext:'status_update',
            bilingual:false,
            serialSend: true
          }));
          mailStatus.admin = adminResult || { ok:false, reason:'no_result' };
          await sleepMs(650);
          if (fromDefault && adminResult && !adminResult.sentAdmin && ownerAdmins.length){
            const payload = buildStatusUpdateEmailPayload(order, env, { admin:true, channel:'服務型商品' });
            await sendEmailWithRetry(env, {
              from: fromDefault,
              to: ownerAdmins,
              subject: payload.subject,
              html: payload.html,
              text: payload.text
            });
            mailStatus.admin = Object.assign({}, mailStatus.admin || {}, { fallback:true, fallbackOk:true });
          }
          await sleepMs(650);
          const msg = buildBookingNotifyEmail(order, env);
          const internal = Array.from(new Set((bookingEmails || []).concat(extraBooking))).filter(Boolean);
          if (internal.length){
            try{
              await sendEmailMessage(env, {
                from: (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim(),
                to: internal,
                subject: msg.subject,
                html: msg.html,
                text: msg.text
              });
            }catch(err){
              if (isRateLimitError(err)){
                await sleepMs(1200);
                await sendEmailMessage(env, {
                  from: (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim(),
                  to: internal,
                  subject: msg.subject,
                  html: msg.html,
                  text: msg.text
                });
                mailStatus.booking = { ok:true, count: internal.length, retried:true };
              }else{
                throw err;
              }
            }
            if (!mailStatus.booking){
              mailStatus.booking = { ok:true, count: internal.length };
            }
          }else{
            mailStatus.booking = { ok:false, reason:'no_recipients' };
            console.warn('[booking] notify skipped: no recipients resolved');
          }
        }else{
          const baseAdmins = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '')
            .split(',').map(s => s.trim()).filter(Boolean);
          const ownerAdmins = [];
          await Promise.all(baseAdmins.map(async (email)=>{
            const normalized = String(email || '').trim();
            if (!normalized) return;
            try{
              const role = await getAdminRole(normalized, env);
              if (role === 'booking') return;
            }catch(_){}
            ownerAdmins.push(normalized);
          }));
          const customerResult = await sendWithRetry(()=> maybeSendOrderEmails(env, order, {
            origin,
            channel:'服務型商品',
            notifyAdmin: false,
            notifyCustomer: true,
            emailContext:'status_update',
            bilingual:false,
            serialSend:true
          }));
          mailStatus.customer = customerResult || { ok:false, reason:'no_result' };
          await sleepMs(650);
          if (fromDefault && customerResult && !customerResult.sentCustomer){
            const customerEmail = getOrderCustomerEmail(order);
            if (customerEmail){
              const payload = buildStatusUpdateEmailPayload(order, env, { admin:false, channel:'服務型商品' });
              await sendEmailWithRetry(env, {
                from: fromDefault,
                to: [customerEmail],
                subject: payload.subject,
                html: payload.html,
                text: payload.text
              });
              mailStatus.customer = Object.assign({}, mailStatus.customer || {}, { fallback:true, fallbackOk:true });
            }
          }
          const adminResult = await sendWithRetry(()=> maybeSendOrderEmails(env, order, {
            origin,
            channel:'服務型商品',
            notifyAdmin: true,
            notifyCustomer: false,
            adminEmails: ownerAdmins,
            emailContext:'status_update',
            bilingual:false,
            serialSend:true
          }));
          mailStatus.admin = adminResult || { ok:false, reason:'no_result' };
          await sleepMs(650);
          if (fromDefault && adminResult && !adminResult.sentAdmin && ownerAdmins.length){
            const payload = buildStatusUpdateEmailPayload(order, env, { admin:true, channel:'服務型商品' });
            await sendEmailWithRetry(env, {
              from: fromDefault,
              to: ownerAdmins,
              subject: payload.subject,
              html: payload.html,
              text: payload.text
            });
            mailStatus.admin = Object.assign({}, mailStatus.admin || {}, { fallback:true, fallbackOk:true });
          }
        }
      }catch(err){
        console.error('consult stage email error', err);
        mailStatus.error = String(err || '');
      }
      console.log('consult stage mail status', { orderId: id, stage, mailStatus });
      return new Response(JSON.stringify({ ok:true, consultStage: stage, mailStatus }), { status:200, headers: jsonHeadersFor(request, env) });
    }

    if (pathname === '/api/admin/service/slots/config' && (request.method === 'GET' || request.method === 'POST')) {
      const guard = await requireAdminSlotsManage(request, env);
      if (guard) return guard;
      const now = nowMs();
      if (!env?.SERVICE_SLOTS_KV){
        return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
      }
      let serviceId = String(url.searchParams.get('serviceId') || '').trim();
      let body = {};
      if (request.method === 'POST'){
        try{ body = await request.json(); }catch(_){ body = {}; }
        if (!serviceId) serviceId = String(body.serviceId || '').trim();
      }
      if (!serviceId){
        return new Response(JSON.stringify({ ok:false, error:'missing_service_id' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      await applyScheduledSlotPublish(env, serviceId);
      if (request.method === 'POST'){
        if (Object.prototype.hasOwnProperty.call(body, 'bookingMode')){
          await setServiceSlotMode(env, serviceId, body.bookingMode);
        }
        const slotKeys = Array.isArray(body.slotKeys) ? body.slotKeys.map(k=>String(k||'').trim()).filter(Boolean) : [];
        const adminSession = await getAdminSession(request, env);
        const actorEmail = adminSession && adminSession.email ? String(adminSession.email || '').trim() : '';
        const openWindowMinutes = Number(body.openWindowMinutes || 0);
        const closeWindow = body.closeWindow === true;
        if (Number.isFinite(openWindowMinutes) && openWindowMinutes > 0){
          const minutes = Math.min(24 * 60, Math.max(1, Math.round(openWindowMinutes)));
          const openFrom = now;
          const openUntil = now + minutes * 60 * 1000;
          await setServiceSlotWindow(env, serviceId, {
            serviceId,
            openFrom,
            openUntil,
            createdAt: new Date().toISOString(),
            createdBy: actorEmail,
            slotKeys: slotKeys
          });
        }else if (closeWindow){
          const prev = await getServiceSlotWindow(env, serviceId);
          const openFrom = prev && Number(prev.openFrom || 0) ? Number(prev.openFrom || 0) : now;
          const prevSlotKeys = prev && Array.isArray(prev.slotKeys) ? prev.slotKeys : [];
          if (prevSlotKeys.length){
            await unpublishSlotKeys(env, prevSlotKeys);
          }
          await setServiceSlotWindow(env, serviceId, {
            serviceId,
            openFrom,
            openUntil: now,
            createdAt: prev && prev.createdAt ? String(prev.createdAt) : new Date().toISOString(),
            createdBy: actorEmail,
            slotKeys: [],
            closedAt: new Date().toISOString(),
            closedBy: actorEmail
          });
        }
      }
      const bookingMode = await getServiceSlotMode(env, serviceId);
      let windowInfo = await getServiceSlotWindow(env, serviceId);
      windowInfo = await closeExpiredWindowIfNeeded(env, serviceId, windowInfo);
      const publishSchedule = await getServiceSlotPublishSchedule(env, serviceId);
      const active = bookingMode === BOOKING_MODE_WINDOWED ? isSlotWindowActive(windowInfo, now) : false;
      const publishWindow = bookingMode === BOOKING_MODE_WINDOWED
        ? { openFrom: Number(windowInfo?.openFrom || 0), openUntil: Number(windowInfo?.openUntil || 0), active }
        : null;
      return new Response(JSON.stringify({ ok:true, serviceId, bookingMode, publishWindow, publishSchedule }), { status:200, headers: jsonHeadersFor(request, env) });
    }

    if (pathname === '/api/admin/service/slots/publish-schedule' && request.method === 'POST') {
      await cleanupExpiredHolds(env);
      const guard = await requireAdminSlotsManage(request, env);
      if (guard) return guard;
      if (!env?.SERVICE_SLOTS_KV){
        return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
      }
      let body = null;
      try{ body = await request.json(); }catch(_){ body = {}; }
      const serviceId = String(body.serviceId || '').trim();
      const slotKeys = Array.isArray(body.slotKeys) ? body.slotKeys.map(k=>String(k||'').trim()).filter(Boolean) : [];
      if (!serviceId || !slotKeys.length){
        return new Response(JSON.stringify({ ok:false, error:'invalid_payload' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      const publishAt = parsePublishAt(body.publishAt);
      if (!publishAt){
        return new Response(JSON.stringify({ ok:false, error:'invalid_publish_at' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      const openWindowMinutes = Number(body.openWindowMinutes || 0);
      const minutes = Number.isFinite(openWindowMinutes) && openWindowMinutes > 0
        ? Math.min(24 * 60, Math.max(1, Math.round(openWindowMinutes)))
        : 0;
      const adminSession = await getAdminSession(request, env);
      const actorEmail = adminSession && adminSession.email ? String(adminSession.email || '').trim() : '';
      const now = nowMs();
      if (publishAt <= now){
        const result = await publishSlotKeys(env, slotKeys);
        if (minutes > 0){
          await setServiceSlotWindow(env, serviceId, {
            serviceId,
            openFrom: publishAt,
            openUntil: publishAt + minutes * 60 * 1000,
            createdAt: new Date().toISOString(),
            createdBy: actorEmail,
            slotKeys: slotKeys
          });
        }
        await clearServiceSlotPublishSchedule(env, serviceId);
        return new Response(JSON.stringify({ ok:true, executed:true, updated: result.updated, skipped: result.skipped }), { status:200, headers: jsonHeadersFor(request, env) });
      }
      await setServiceSlotPublishSchedule(env, serviceId, {
        serviceId,
        slotKeys,
        publishAt,
        openWindowMinutes: minutes,
        createdAt: new Date().toISOString(),
        createdBy: actorEmail
      });
      return new Response(JSON.stringify({ ok:true, scheduled:true, serviceId, publishAt, slotCount: slotKeys.length, openWindowMinutes: minutes }), { status:200, headers: jsonHeadersFor(request, env) });
    }

    if (pathname === '/api/admin/service/slots/publish-schedule/cancel' && request.method === 'POST') {
      const guard = await requireAdminSlotsManage(request, env);
      if (guard) return guard;
      if (!env?.SERVICE_SLOTS_KV){
        return new Response(JSON.stringify({ ok:false, error:'slots_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
      }
      let body = null;
      try{ body = await request.json(); }catch(_){ body = {}; }
      const serviceId = String(body.serviceId || '').trim();
      if (!serviceId){
        return new Response(JSON.stringify({ ok:false, error:'missing_service_id' }), { status:400, headers: jsonHeadersFor(request, env) });
      }
      await clearServiceSlotPublishSchedule(env, serviceId);
      return new Response(JSON.stringify({ ok:true, serviceId }), { status:200, headers: jsonHeadersFor(request, env) });
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
      const result = await publishSlotKeys(env, targets);
      const updated = result.updated || [];
      const skippedAll = skipped.concat(result.skipped || []);
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
      return new Response(JSON.stringify({ ok:true, updated, skipped: skippedAll }), { status:200, headers: jsonHeadersFor(request, env) });
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
      return orderQnaHandlers.handleMeOrders(request, env, url);
    }

    if (pathname === '/api/order/qna') {
      return orderQnaHandlers.handleOrderQna(request, env, url, origin);
    }

    if (pathname === '/api/admin/qna/unread') {
      return orderQnaHandlers.handleAdminQnaUnread(request, env, url);
    }

    if (pathname === '/api/me/qna/unread') {
      return orderQnaHandlers.handleUserQnaUnread(request, env, url);
    }

    if (pathname === '/api/me/coupons/unread') {
      return orderQnaHandlers.handleUserCouponUnread(request, env, url);
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

  {
    const handled = await orderFlowHandlers.handleOrderFlow(request, env, url, origin, pathname);
    if (handled) return handled;
  }

  {
    const handled = await paymentHandlers.handlePayment(request, env, url, origin, pathname);
    if (handled) return handled;
  }

  {
    const handled = await couponHandlers.handleCoupons(request, env, url, pathname);
    if (handled) return handled;
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
      const overrideAdmins = Array.isArray(ctx.adminEmails) ? ctx.adminEmails.map(s => String(s || '').trim()).filter(Boolean) : null;
      if (overrideAdmins && overrideAdmins.length){
        adminRaw = overrideAdmins.slice();
        forceAdmin = true;
      }
      if (!overrideAdmins && isPhoneConsult && emailContext === 'status_update'){
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
      if (adminRaw.length){
        try{
          const bookingEmails = await getBookingNotifyEmails(env);
          const extraBookingRaw = String(env?.BOOKING_NOTIFY_EMAIL || env?.BOOKING_EMAIL || env?.BOOKING_ALERT_EMAIL || env?.BOOKING_TO || '').trim();
          const extraBooking = extraBookingRaw ? extraBookingRaw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : [];
          const bookingSet = new Set((bookingEmails || []).concat(extraBooking).map(s => String(s || '').trim()).filter(Boolean));
          if (bookingSet.size){
            const next = [];
            await Promise.all(adminRaw.map(async (email)=>{
              const normalized = String(email || '').trim();
              if (!normalized) return;
              if (!bookingSet.has(normalized)){
                next.push(normalized);
                return;
              }
              try{
                const role = await getAdminRole(normalized, env);
                if (role && role !== 'booking'){
                  next.push(normalized);
                }
              }catch(_){}
            }));
            adminRaw = next;
          }
        }catch(_){}
      }
      const notifyAdmin = forceAdmin
        ? adminRaw.length > 0
        : (ctx.notifyAdmin === false ? false : adminRaw.length > 0);
      const statusLabel = (order.status || '').trim();
      const isBlessingDone = statusLabel === '祈福完成';
      const customerSubject = emailContext === 'status_update'
        ? `${siteName} 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
        : `${siteName} 訂單成立通知 #${order.id}`;
      const adminSubject = emailContext === 'status_update'
        ? `[${siteName}] 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
        : `[${siteName}] 系統通知：新訂單 #${order.id}`;
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
      const settled = ctx.serialSend
        ? await (async ()=>{
            const results = [];
            for (const task of labeled){
              try{
                const value = await task.promise;
                results.push({ status:'fulfilled', value });
              }catch(error){
                results.push({ status:'rejected', reason: error });
              }
            }
            return results;
          })()
        : await Promise.allSettled(labeled.map(task => task.promise));
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
    const isPhoneConsultServiceOrder = isServiceOrder && String(order?.serviceId || '').trim() === 'SVT409059d4';
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
    const serviceFeedbackUrl = order?.serviceId
      ? `https://unalomecodes.com/service?id=${encodeURIComponent(String(order.serviceId))}`
      : 'https://unalomecodes.com/service';
    const productFeedbackId = (order && order.productId && String(order.productId) !== 'CART')
      ? String(order.productId)
      : (Array.isArray(order?.items) && order.items[0] && (order.items[0].productId || order.items[0].id))
        ? String(order.items[0].productId || order.items[0].id)
        : '';
    const productFeedbackUrl = productFeedbackId
      ? `https://unalomecodes.com/shop?productId=${encodeURIComponent(productFeedbackId)}`
      : 'https://unalomecodes.com/shop';
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
        ? (isPhoneConsultServiceOrder
          ? '<p>如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。</p>'
          : '<p>如需調整服務時間或內容，請聯繫官方 LINE 客服協助。</p>')
        : (isPhoneConsultServiceOrder
          ? '<div style="margin-top:12px;padding:12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;">如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。</div>'
          : '<div style="margin-top:12px;padding:12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;">如需調整服務時間或內容，請聯繫官方 LINE 客服協助。</div>'))
      : '';
    const serviceCallNote = '';
    const isBlessingDone = opts.blessingDone || (order.status === '祈福完成');
    let customerIntro = (context === 'status_update')
      ? `<p>親愛的 ${esc(buyerName)} 您好：</p>
        <p>${(isServiceOrder && consultStage === 'appointment_confirmed')
          ? (isPhoneConsultServiceOrder
            ? `您的預約已確認完成。請加入官方 LINE <a href="https://line.me/R/ti/p/@427oaemj" target="_blank" rel="noopener">https://line.me/R/ti/p/@427oaemj</a> 或搜尋 ID @427oaemj，後續將由專人與您聯繫安排實際通話時間與流程說明。您也可以至會員中心－我的訂單－問與答留下想詢問的問題（中文即可，將協助翻譯給老師）。`
            : `您的服務已完成安排／預約。如需進一步協助，請聯繫客服 Email：${esc(supportEmail)} 或 LINE：${lineLabel}。`)
          : (!isServiceOrder && /已完成|完成/.test(String(status || '')))
            ? `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，您的訂單 ${esc(order.id || '')} 已順利完成 🙏<br><br>
  我們很榮幸能夠為您提供這次的服務，也希望這次的體驗能為您帶來正面的能量與幫助。<br><br>
  <strong>✨ 邀請您留下寶貴的回饋</strong><br>
  您的回饋對我們非常重要，<br>
  不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。<br>
  👉 點此留下您的評價：<br>
  <a href="${esc(productFeedbackUrl)}" target="_blank" rel="noopener">${esc(productFeedbackUrl)}</a>`
          : (isServiceOrder && consultStage === 'done' && !isPhoneConsultServiceOrder)
            ? `感謝您選擇 unalomecodes 的服務，您的訂單已順利完成。若您對本次服務有任何心得或建議，誠摯邀請您留下回饋（<a href="${esc(serviceFeedbackUrl)}" target="_blank" rel="noopener">${esc(serviceFeedbackUrl)}</a>）。再次感謝您的支持，期待未來再次為您服務。`
          : (isServiceOrder && consultStage === 'done')
            ? `感謝您選擇 ${esc(opts.siteName || 'unalomecodes')} 的服務，您的訂單已順利完成。若您對本次服務有任何心得或建議，誠摯邀請您留下回饋（<a href="https://unalomecodes.com/service?id=SVT409059d4" target="_blank" rel="noopener">https://unalomecodes.com/service?id=SVT409059d4</a>），讓更多人也能看到這項服務，對自己的命運更加瞭解，讓未來更美好。再次感謝您的支持，期待未來再次為您服務。`
            : (isBlessingDone ? '' : `您的訂單狀態已更新為 <strong>${esc(status)}</strong>。我們將依流程持續處理，如有進一步安排會以 Email 通知您。`)
        }</p>
        ${isBlessingDone ? '' : `<p>Please do not reply to this email. For assistance, contact ${esc(supportEmail)} or add LINE ID: ${lineLabel}.</p>`}`
      : `<p>親愛的 ${esc(buyerName)} 您好：</p>
        <p>${isServiceOrder
          ? (isPhoneConsultServiceOrder ? `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，我們已成功收到您的訂單。` : '')
          : `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，我們已成功收到您的訂單。`
        }</p>
        ${isServiceOrder
          ? (isPhoneConsultServiceOrder
            ? `<p>目前正在確認付款與預約資訊，完成後將協助安排與老師的電話諮詢時間；預約確認完成後，系統會再次寄送通知信給您，請留意電子郵件。</p>
        <p>您可至會員中心－我的訂單查詢最新狀態；如需改期，請於預約時間 48 小時前聯繫客服。</p>
        <p>客服 LINE：${lineLabel}</p>
        <p>Dear ${esc(buyerName)},</p>
        <p>Thank you for choosing ${esc(opts.siteName || 'Unalomecodes')}. We have received your order successfully.</p>
        <p>We are now verifying the payment and preparing the appointment. You will receive another email once the schedule is confirmed.</p>
        <p>You can check the latest status in My Orders. To reschedule, please contact us at least 48 hours in advance.</p>
        <p>LINE Support: ${lineLabel}</p>`
            : `<p>感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，我們已成功收到您的服務訂單。</p>
        <p>我們正在核對付款與服務需求，確認無誤後將安排服務流程。</p>
        <p>安排完成後會再寄送通知信給您，請留意電子郵件。</p>
        <p>您可至會員中心－我的訂單查看最新狀態；如需調整服務時間或內容，請聯繫客服協助。</p>
        <p>客服 LINE：${lineLabel}</p>
        <p>Dear ${esc(buyerName)},</p>
        <p>Thank you for choosing ${esc(opts.siteName || 'Unalomecodes')}. We have received your service order.</p>
        <p>We are verifying the payment and service details. Once confirmed, we will arrange the service.</p>
        <p>You will receive another email once the schedule is confirmed.</p>
        <p>You can check the latest status in My Orders. For changes, please contact support.</p>
        <p>LINE Support: ${lineLabel}</p>`)
          : `<p>目前正在核對付款與訂單資料，確認無誤後將安排出貨。</p>
        <p>若為 7-11 店到店，出貨後將另行寄送物流通知。</p>
        <p>如需協助請聯繫客服：${esc(supportEmail)} 或 LINE ID：${lineLabel}。</p>
        <p>Dear ${esc(buyerName)},</p>
        <p>Thank you for shopping with ${esc(opts.siteName || 'Unalomecodes')}. We have received your order.</p>
        <p>We are verifying the payment and order details. Once confirmed, we will arrange shipment.</p>
        <p>For 7-ELEVEN pickup orders, a shipping notification will be sent after dispatch.</p>
        <p>If you need assistance, please contact us via Email or LINE.</p>`
        }
        <p>Please do not reply to this email. For assistance, contact ${esc(supportEmail)} or add LINE ID: ${lineLabel}.</p>`;
    if (context === 'status_update' && isBlessingDone){
      const serviceName = esc(order?.serviceName || (Array.isArray(order?.items) && order.items[0] && order.items[0].name) || '服務');
      const lookupLine = `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，您的${serviceName}已順利完成 🙏<br><br>
  我們已完成本次服務流程，相關成果與進度可至會員中心查看。<br>
  希望這次的服務能為您帶來正向的力量與安定。<br><br>
  <strong>✨ 邀請您留下寶貴的回饋</strong><br>
  您的回饋對我們非常重要，<br>
  不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。<br>
  👉 點此留下您的評價：<br>
  <a href="${esc(serviceFeedbackUrl)}" target="_blank" rel="noopener">${esc(serviceFeedbackUrl)}</a>`;
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
    const adminIntro = `<p>系統通知：${esc(opts.siteName || '商城')} 有一筆新的訂單建立或訂單狀態更新。</p>
      <p>System notification: A new order or status update is recorded on ${esc(opts.siteName || '商城')}.</p>`;
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
      if (consultStage === 'appointment_confirmed') {
        if (isPhoneConsultServiceOrder) {
          textParts.push(`您的預約已確認完成。請加入官方 LINE https://line.me/R/ti/p/@427oaemj 或搜尋 ID @427oaemj，後續將由專人與您聯繫安排實際通話時間與流程說明。您也可以至會員中心－我的訂單－問與答留下想詢問的問題（中文即可，將協助翻譯給老師）。`);
          textParts.push(`Your appointment has been confirmed. Please add our official LINE https://line.me/R/ti/p/@427oaemj or search ID @427oaemj. Our staff will contact you shortly to arrange the call and explain the next steps.`);
        } else {
          textParts.push('您的服務已完成安排／預約。');
          textParts.push(`如需協助請聯繫 ${supportEmail} 或 LINE ID：${lineLabel}。`);
          textParts.push('Your service schedule has been confirmed.');
          textParts.push(`For assistance, contact ${supportEmail} or LINE ID: ${lineLabel}.`);
        }
      } else if (!isServiceOrder && /已完成|完成/.test(String(status || ''))) {
        textParts.push(`感謝您選擇 ${opts.siteName || 'Unalomecodes'}，您的訂單 ${order.id || ''} 已順利完成。`);
        textParts.push('我們很榮幸能夠為您提供這次的服務，也希望這次的體驗能為您帶來正面的能量與幫助。');
        textParts.push('✨ 邀請您留下寶貴的回饋');
        textParts.push('您的回饋對我們非常重要，不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。');
        textParts.push(`👉 點此留下您的評價：${productFeedbackUrl}`);
      } else if (consultStage === 'done' && !isPhoneConsultServiceOrder) {
        textParts.push(`感謝您選擇 unalomecodes 的服務，您的訂單已順利完成。若您對本次服務有任何心得或建議，誠摯邀請您留下回饋(${serviceFeedbackUrl})。再次感謝您的支持，期待未來再次為您服務。`);
      } else if (consultStage === 'done') {
        textParts.push(`感謝您選擇 ${opts.siteName || 'unalomecodes'} 的服務，您的訂單已順利完成。`);
        textParts.push('若您對本次服務有任何心得或建議，誠摯邀請您留下回饋(https://unalomecodes.com/service?id=SVT409059d4)，讓更多人也能看到這項服務，讓更多人也能對於自己的命運更加瞭解，讓未來更美好。');
        textParts.push('再次感謝您的支持，期待未來再次為您服務。');
      } else {
        if (!isBlessingDone){
          textParts.push(`您的訂單狀態已更新為「${status}」。我們會依照流程持續處理，如有進一步安排，系統將以電子郵件通知您。`);
          textParts.push(`Your order status has been updated to ${status}. We will continue processing your order and notify you by email if there are further updates.`);
        }
      }
      textParts.push(`如需協助請聯繫 ${supportEmail} 或 LINE ID：${lineLabel}。`);
      if (!isBlessingDone){
        textParts.push(`For assistance, contact ${supportEmail} or LINE ID: ${lineLabel}.`);
      }
      if (isBlessingDone){
        const serviceName = order?.serviceName || (Array.isArray(order?.items) && order.items[0] && order.items[0].name) || '服務';
        textParts.push(`感謝您選擇 ${opts.siteName || 'Unalomecodes'}，您的${serviceName}已順利完成 🙏`);
        textParts.push('我們已完成本次服務流程，相關成果與進度可至會員中心查看。');
        textParts.push('希望這次的服務能為您帶來正向的力量與安定。');
        textParts.push('✨ 邀請您留下寶貴的回饋');
        textParts.push('您的回饋對我們非常重要，不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。');
        textParts.push(`👉 點此留下您的評價：${serviceFeedbackUrl}`);
      }
    } else {
      if (isServiceOrder){
        if (isPhoneConsultServiceOrder){
          textParts.push(`親愛的 ${buyerName} 您好：感謝您選擇 ${opts.siteName || 'Unalomecodes'}，我們已成功收到您的訂單。`);
          textParts.push('目前我們正在確認付款與預約資訊，完成後將協助安排與老師的電話諮詢時間。');
          textParts.push('預約確認完成後，系統將再次寄送通知信給您，請留意電子郵件。');
          textParts.push('您可至 會員中心 我的訂單 查詢最新狀態。');
          textParts.push(`如需改期，請於預約時間 48 小時前聯繫客服。客服 LINE：${lineLabel}`);
          textParts.push(`Dear ${buyerName}, Thank you for choosing ${opts.siteName || 'Unalomecodes'}. We have received your order successfully.`);
          textParts.push('We are now verifying the payment and preparing the appointment with the consultant.');
          textParts.push('You will receive another email once the schedule is confirmed.');
          textParts.push('You can check the latest status in My Orders.');
          textParts.push(`To reschedule, please contact us at least 48 hours in advance. LINE Support: ${lineLabel}`);
        } else {
          textParts.push(`親愛的 ${buyerName} 您好：感謝您選擇 ${opts.siteName || 'Unalomecodes'}，我們已成功收到您的訂單。`);
          textParts.push('目前正在核對付款與服務需求，確認無誤後將安排服務流程。');
          textParts.push('完成安排後會再寄送通知信給您，請留意電子郵件。');
          textParts.push('您可至 會員中心 我的訂單 查詢最新狀態。');
          textParts.push(`如需調整服務時間或內容，請聯繫客服。客服 LINE：${lineLabel}`);
          textParts.push(`Dear ${buyerName}, Thank you for choosing ${opts.siteName || 'Unalomecodes'}. We have received your service order successfully.`);
          textParts.push('We are verifying the payment and service details. Once confirmed, we will arrange the service.');
          textParts.push('You will receive another email once the schedule is confirmed.');
          textParts.push('You can check the latest status in My Orders. For changes, please contact support.');
          textParts.push(`LINE Support: ${lineLabel}`);
        }
      }else{
        textParts.push(`親愛的 ${buyerName} 您好：感謝您選擇 ${opts.siteName || 'Unalomecodes'}，我們已成功收到您的訂單。`);
        textParts.push('目前正在核對付款與訂單資料，確認無誤後將安排出貨。');
        textParts.push('若為 7-11 店到店，出貨後會再寄送通知與物流資訊。');
        textParts.push(`如需協助請聯繫客服：${supportEmail} 或 LINE ID：${lineLabel}。`);
        textParts.push(`Dear ${buyerName}, Thank you for shopping with ${opts.siteName || 'Unalomecodes'}. We have received your order.`);
        textParts.push('We are verifying the payment and order details. Once confirmed, we will arrange shipment.');
        textParts.push('For 7-ELEVEN pickup orders, a shipping notification will be sent after dispatch.');
        textParts.push('If you need assistance, please contact us via Email or LINE.');
      }
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
    let attempt = 0;
    while (attempt < 2){
      attempt += 1;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok){
        let data = {};
        try { data = await res.json(); } catch(_){}
        return data;
      }
      const errText = await res.text().catch(()=> '');
      if (res.status === 429 && attempt < 2){
        await new Promise(resolve => setTimeout(resolve, 1100));
        continue;
      }
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

    return null;
  }

  return { handleAdminApis };
}

export { createAdminHandlers };
