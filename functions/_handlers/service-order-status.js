function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

export function createServiceOrderStatusHandler(deps){
  requireDeps(deps, ['jsonHeaders', 'requireAdminWrite', 'forbidIfFulfillmentAdmin', 'buildAuditActor', 'auditAppend', 'shouldNotifyStatus', 'maybeSendOrderEmails'], 'service-order-status.js');
  const {
    jsonHeaders,
    requireAdminWrite,
    forbidIfFulfillmentAdmin,
    buildAuditActor,
    auditAppend,
    shouldNotifyStatus,
    maybeSendOrderEmails
  } = deps;

  return async function handleServiceOrderStatus(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/service/order/status' || request.method !== 'POST') return null;
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
    }
    try{
      const body = await request.json();
      const id = String(body.id||'').trim();
      const status = String(body.status||'').trim();
      const action = String(body.action||'').trim();
      if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
      const raw = await store.get(id);
      if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
      const order = JSON.parse(raw);
      if (action === 'delete'){
        const confirm = String(body.confirm||'').trim();
        if (confirm !== '刪除') return new Response(JSON.stringify({ ok:false, error:'確認文字不符' }), { status:400, headers: jsonHeaders });
        await store.delete(id);
        try{
          const idxKey = 'SERVICE_ORDER_INDEX';
          const idxRaw = await store.get(idxKey);
          if (idxRaw){
            const list = JSON.parse(idxRaw) || [];
            const next = list.filter(x=> String(x)!==id);
            await store.put(idxKey, JSON.stringify(next));
          }
        }catch(_){}
        return new Response(JSON.stringify({ ok:true, deleted:true }), { status:200, headers: jsonHeaders });
      }
      if (!status) return new Response(JSON.stringify({ ok:false, error:'Missing status' }), { status:400, headers: jsonHeaders });
      order.status = status;
      order.updatedAt = new Date().toISOString();
      await store.put(id, JSON.stringify(order));
      try{
        const actor = await buildAuditActor(request, env);
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'service_order_status_update',
          ...actor,
          targetType: 'service_order',
          targetId: id,
          meta: { prevStatus, nextStatus: order.status || '' }
        });
      }catch(_){}
      let notified = false;
      if (shouldNotifyStatus(status)){
        try{
          await maybeSendOrderEmails(env, order, { channel:'服務型商品', notifyAdmin:false, emailContext:'status_update' });
          notified = true;
        }catch(err){ console.error('service status email err', err); }
      }
      return new Response(JSON.stringify({ ok:true, notified }), { status:200, headers: jsonHeaders });
    }catch(e){
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
    }
  };
}
