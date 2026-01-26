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
    getUserStore,
    isAdmin,
    checkRateLimit,
    isPhoneConsultOrder,
    normalizeConsultStage,
    buildBookingNotifyEmail,
    getOrderCustomerEmail,
    isRateLimitError,
    isRateLimitResult,
    requireAdminSlotsManage,
    sleepMs,
    pickTrackStore,
    normalizeTrackEvent,
    recordTrackEvent,
    formatTZ,
    taipeiDateKey,
    taipeiDateParts,
    formatTaipeiDate,
    toWeekdayKey,
    toBirthWeekdayKey,
    getMahaTaksa,
    getYamUbakong,
    getThaiDayColor,
    deriveTabooColor,
    zodiacInfoByKey,
    sunSignByDate,
    moonPhaseInfo,
    fnv1aHash,
    buildLuckyNumbers,
    buildUserSignals,
    buildAdviceLine,
    buildStarText,
    pickPersonalTask,
    buildLocalFortuneV2,
    normalizeFortunePayloadV2,
    normalizeSummaryStars,
    normalizeAdviceWithLine,
    sanitizeRitual,
    callOpenAIFortune,
    ensureFortuneIndex,
    recordFortuneStat,
    isTooSimilar,
    FORTUNE_FORMAT_VERSION,
    PHUM_LABEL,
    MANTRA_LIST,
    GUARDIAN_TONE,
    ICHING_NAMES,
    computeServerDiscount,
    maybeSendOrderEmails,
    sendEmailMessage,
    shouldNotifyStatus,
    sendEmailWithRetry,
    buildStatusUpdateEmailPayload,
    getBookingNotifyEmails,
    getConsultStageLabel,
    getRescheduleConfig,
    getPhoneConsultConfig,
    getPhoneConsultPromoInfo,
    resolvePhoneConsultOptionPrices,
    buildSlotKey,
    parseSlotKey,
    parseTimeToMinutes,
    minutesToHHMM,
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
    getSessionUser,
    getSessionUserRecord,
    loadUserRecord,
    saveUserRecord,
    ensureUserRecord,
    buildRescheduleEmail,
    getRescheduleNotifyEmails,
    buildRescheduleId,
    updateRescheduleIndex,
    parseSlotStartToMs,
    normalizeQuizInput,
    resolveCreatorName,
    hasCreatorTermsAccepted,
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
    orderAmount,
    orderItemsSummary,
    csvEscape,
    normalizeOrderSuffix,
    normalizeStatus,
    statusIsPaidOrReady,
    statusIsWaitingVerify,
    isFoodCreator,
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
    readCoupon,
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
    couponHandlers,
    creatorInviteKey,
    normalizeCreatorCode,
    generateCreatorInviteCode,
    jsonWithHeaders,
    recordFoodMapStat,
    recordTempleMapStat,
    listTemples,
    mergeTempleRecord,
    normalizeTemplePayload,
    readTemple,
    readTemplesListCache,
    resetTemplesListMemoryCache,
    resolveTempleCoords,
    resolveTempleHours,
    saveTemple,
    upsertTemplesListCache,
    writeTemplesListCache,
    deleteTemplesListCache
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
      const ichingNames = Array.isArray(ICHING_NAMES) ? ICHING_NAMES : [];
      const iching = ichingNames.length ? ichingNames[ichSeed % ichingNames.length] : '—';
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
      const safePersonalTask = (personalTask && personalTask.task)
        ? personalTask
        : { task:'列出今天三個待辦，先完成最重要的一件。', why:'先完成一件可控的小步驟，讓節奏回正。' };
      const hasPersonalTask = !!safePersonalTask.task;
      let fortune = null;
      let source = 'local';
      const phumLabelMap = (PHUM_LABEL && typeof PHUM_LABEL === 'object') ? PHUM_LABEL : {};
      const taksaLabel = phumLabelMap[taksa.phum] || taksa.phum || '—';
      const timingBest = (yam.best || []).map(s=>({ start:s.start, end:s.end, level:s.level }));
      const timingAvoid = (yam.forbidden || []).map(s=>({ start:s.start, end:s.end, level:s.level }));
      const guardianToneMap = (GUARDIAN_TONE && typeof GUARDIAN_TONE === 'object') ? GUARDIAN_TONE : {};
      const guardianTone = guardianToneMap[ctx.guardianCode] || '穩定、行動導向';
      const mantraList = Array.isArray(MANTRA_LIST) ? MANTRA_LIST : [];
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
        `可用短咒語清單（擇一）：${mantraList.length ? mantraList.join(' / ') : '—'}`,
        `規則：只回傳 JSON，欄位必須符合 schema，禁止新增欄位；不得使用模糊巴納姆語句。`,
        `summary 第一個句子必須點名「今天是 ${taksaLabel} 日」，不可改寫骨架事實。`,
        `core/timing/lucky 必須與輸入骨架一致，不可改寫；若不一致視為無效輸出。`,
        `action.task 必須完全等於「${safePersonalTask.task}」，不得改寫或換詞。`,
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
      ctx.personalTask = safePersonalTask;
      if (!forceLocal && hasPersonalTask){
        try{
          fortune = normalizeFortunePayloadV2(await callOpenAIFortune(env, prompt, seed, systemPrompt), ctx);
          source = fortune ? 'openai' : 'local';
        }catch(_){
          fortune = null;
          source = 'local';
        }
      }
      if (fortune && isTooSimilar(fortune, history)){
        if (!forceLocal){
          const personalAlt = pickPersonalTask({
            phum: taksa.phum,
            signals,
            seed: seed + 1,
            avoidTasks
          });
          const safeAlt = (personalAlt && personalAlt.task)
            ? personalAlt
            : safePersonalTask;
          const promptAlt = prompt + `\naction.task 與 avoidTasks 重複，請更換成新的可勾選任務，且必須等於「${safeAlt.task}」。其餘骨架保持不變。`;
          const altCtx = Object.assign({}, ctx, { personalTask: safeAlt });
          try{
            const alt = normalizeFortunePayloadV2(await callOpenAIFortune(env, promptAlt, seed + 1, systemPrompt), altCtx);
            if (alt && !isTooSimilar(alt, history)){
              fortune = alt;
              source = 'openai';
            }else{
              fortune = buildLocalFortuneV2(ctx, seed + 17, avoidTasks, signals);
              source = 'local';
            }
          }catch(_){
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
