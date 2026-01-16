export function createServiceResultPhotoHandler(deps){
  const {
    jsonHeaders,
    jsonHeadersFor,
    requireAdminWrite,
    getAdminSession,
    hasAdminPermission,
    getAdminRole,
    auditAppend,
    getClientIp
  } = deps;

  return async function handleServiceResultPhoto(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/service/order/result-photo' || request.method !== 'POST') return null;
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const adminSession = await getAdminSession(request, env);
      if (adminSession && !(await hasAdminPermission(adminSession, env, 'service_orders.result_upload'))) {
        return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
      }
    }
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
    }
    try{
      const body = await request.json();
      const id = String(body.id||'').trim();
      const photo = String(body.photo||body.url||'').trim();
      if (!id || !photo){
        return new Response(JSON.stringify({ ok:false, error:'缺少必要欄位' }), { status:400, headers: jsonHeaders });
      }
      const raw = await store.get(id);
      if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
      const order = JSON.parse(raw);
      order.resultPhotoUrl = photo;
      const now = new Date().toISOString();
      const results = Array.isArray(order.results) ? order.results : [];
      const hasSame = results.some(r=>{
        if (!r) return false;
        const u = r.url || r.imageUrl || r.image || '';
        return u === photo;
      });
      if (!hasSame) {
        results.push({ type:'image', url: photo, ts: now });
      }
      order.results = results;
      order.updatedAt = new Date().toISOString();
      await store.put(id, JSON.stringify(order));
      try{
        const adminSession = await getAdminSession(request, env);
        const email = (adminSession && adminSession.email) ? String(adminSession.email) : '';
        const role = email ? await getAdminRole(email, env) : 'admin_key';
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          adminEmail: email,
          role,
          action: 'service_result_upload',
          orderId: id,
          photo
        }));
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'service_result_upload',
          actorEmail: email,
          actorRole: role,
          ip: getClientIp(request) || '',
          ua: request.headers.get('User-Agent') || '',
          targetType: 'service_order',
          targetId: id,
          meta: { photo }
        });
      }catch(_){}
      return new Response(JSON.stringify({ ok:true, photo }), { status:200, headers: jsonHeaders });
    }catch(err){
      return new Response(JSON.stringify({ ok:false, error:String(err) }), { status:500, headers: jsonHeaders });
    }
  };
}
