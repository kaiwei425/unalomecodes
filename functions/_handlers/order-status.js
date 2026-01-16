export function createOrderStatusHandler(deps){
  const {
    ORDER_INDEX_KEY,
    jsonHeadersFor,
    requireAdminWrite,
    getAdminSession,
    getAdminRole,
    normalizeStatus,
    isFulfillmentOrderTransitionAllowed,
    statusIsPaid,
    statusIsCanceled,
    releaseOrderResources,
    ensureOrderPaidResources,
    buildAuditActor,
    auditAppend,
    shouldNotifyStatus,
    maybeSendOrderEmails
  } = deps;

  return async function handleOrderStatus(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/order/status' || request.method !== 'POST') return null;
    if (!env.ORDERS) {
      return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    try {
      const body = await request.json();
      const id = String(body.id || '');
      const action = String(body.action || '').toLowerCase();
      const status = String(body.status || '');
      const trackingNo = String(body.trackingNo || body.tracking || body.trackingNumber || '').trim();
      if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeadersFor(request, env) });

      if (action === 'delete') {
        const raw0 = await env.ORDERS.get(id);
        if (!raw0) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeadersFor(request, env) });
        try{
          const obj0 = JSON.parse(raw0);
          if (!statusIsPaid(obj0.status) || statusIsCanceled(obj0.status)){
            await releaseOrderResources(env, obj0);
          }
        }catch(_){}
        await env.ORDERS.delete(id);
        const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
        const ids = idxRaw ? JSON.parse(idxRaw) : [];
        const next = ids.filter(x => x !== id);
        await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(next));
        return new Response(JSON.stringify({ ok:true, deleted:1 }), { status:200, headers: jsonHeadersFor(request, env) });
      }

      if (action === 'set' || (!action && status)) {
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeadersFor(request, env) });
        const obj = JSON.parse(raw);
        const adminSession = await getAdminSession(request, env);
        const isFulfillment = !!(adminSession && adminSession.email && (await getAdminRole(adminSession.email, env)) === 'fulfillment');
        if (isFulfillment && status){
          const prevKey = normalizeStatus(obj.status || '');
          const nextKey = normalizeStatus(status || '');
          if (!nextKey || !isFulfillmentOrderTransitionAllowed(prevKey, nextKey)){
            return new Response(JSON.stringify({ ok:false, error:'invalid_status_transition' }), { status:403, headers: jsonHeadersFor(request, env) });
          }
        }
        const prevStatus = obj.status || '';
        let statusChanged = false;
        const wantsShipped = /已寄件|已寄出|已出貨|寄出/.test(status);
        const existingTracking = String(obj.shippingTracking || obj.trackingNo || obj.tracking || obj.trackingNumber || '').trim();
        if (wantsShipped && !trackingNo && !existingTracking){
          return new Response(JSON.stringify({ ok:false, error:'missing_tracking_no' }), { status:400, headers: jsonHeadersFor(request, env) });
        }
        if (wantsShipped && trackingNo){
          obj.shippingTracking = trackingNo;
        }
        if (status && status !== prevStatus) {
          obj.status = status;
          statusChanged = true;
        }
        const nextStatus = obj.status || '';
        const prevPaid = statusIsPaid(prevStatus);
        const nextPaid = statusIsPaid(nextStatus);
        const nextCanceled = statusIsCanceled(nextStatus);
        if (statusChanged) {
          if (nextPaid) {
            await ensureOrderPaidResources(env, obj);
          } else if (nextCanceled || (prevPaid && !nextPaid)) {
            await releaseOrderResources(env, obj);
          }
        }
        obj.updatedAt = new Date().toISOString();
        await env.ORDERS.put(id, JSON.stringify(obj));
        try{
          const actor = await buildAuditActor(request, env);
          await auditAppend(env, {
            ts: new Date().toISOString(),
            action: 'order_status_update',
            ...actor,
            targetType: 'order',
            targetId: id,
            meta: { prevStatus, nextStatus: obj.status || '', op: action || 'set' }
          });
        }catch(_){}
        let emailNotified = false;
        if (statusChanged && shouldNotifyStatus(obj.status)) {
          try {
            await maybeSendOrderEmails(env, obj, { origin: new URL(request.url).origin, channel: obj.method || '轉帳匯款', notifyAdmin:false, emailContext:'status_update' });
            emailNotified = true;
          } catch (err) {
            console.error('status update email error', err);
          }
        }
        return new Response(JSON.stringify({ ok:true, status: obj.status, notified: emailNotified }), { status:200, headers: jsonHeadersFor(request, env) });
      }

      return new Response(JSON.stringify({ ok:false, error:'Missing action/status' }), { status:400, headers: jsonHeadersFor(request, env) });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeadersFor(request, env) });
    }
  };
}
