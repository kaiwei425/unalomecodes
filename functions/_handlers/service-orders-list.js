function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

export function createServiceOrdersListHandler(deps){
  requireDeps(deps, ['jsonHeadersFor', 'isAdmin'], 'service-orders-list.js');
  const { jsonHeadersFor, isAdmin } = deps;

  return async function handleServiceOrdersList(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/service/orders' || request.method !== 'GET') return null;
    if (!(await isAdmin(request, env))) {
      return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
    }
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeadersFor(request, env) });
    }
    const idQuery = url.searchParams.get('id');
    if (idQuery){
      const raw = await store.get(idQuery);
      if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeadersFor(request, env) });
      return new Response(JSON.stringify({ ok:true, item: JSON.parse(raw) }), { status:200, headers: jsonHeadersFor(request, env) });
    }
    const limit = Math.min(Number(url.searchParams.get('limit')||50), 300);
    let list = [];
    try{
      const idxRaw = await store.get('SERVICE_ORDER_INDEX');
      if (idxRaw) list = JSON.parse(idxRaw) || [];
    }catch(_){}
    const items = [];
    for (const id of list.slice(0, limit)){
      const raw = await store.get(id);
      if (!raw) continue;
      try{ items.push(JSON.parse(raw)); }catch(_){}
    }
    return new Response(JSON.stringify({ ok:true, items }), { status:200, headers: jsonHeadersFor(request, env) });
  };
}
