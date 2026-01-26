function createServiceProductsHandlers(deps){
  const {
    jsonHeaders,
    jsonHeadersFor,
    requireAdminWrite,
    forbidIfFulfillmentAdmin,
    normalizeLimitedUntil,
    autoDeactivateExpiredItem,
    isLimitedExpired,
    DEFAULT_SERVICE_PRODUCTS
  } = deps;

  async function handleServiceProducts(request, env, url, pathname){
    if (pathname === '/api/service/products' && request.method === 'GET') {
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store){
        return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
      }
      const activeParam = String(url.searchParams.get('active') || '').toLowerCase();
      const activeOnly = activeParam === 'true' || activeParam === '1';
      const nowMs = Date.now();
      if (url.searchParams.get('id')){
        const id = String(url.searchParams.get('id'));
        const raw = await store.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
        const item = JSON.parse(raw);
        await autoDeactivateExpiredItem(store, item, id, nowMs);
        return new Response(JSON.stringify({ ok:true, item }), { status:200, headers: jsonHeaders });
      }
      let list = [];
      try{
        const idxRaw = await store.get('SERVICE_PRODUCT_INDEX');
        if (idxRaw){
          list = JSON.parse(idxRaw) || [];
        }
      }catch(_){ }
      if (!Array.isArray(list) || !list.length){
        // fallback: list by prefix
        if (store.list){
          const iter = await store.list({ prefix:'svc:' });
          list = iter.keys.map(k => k.name);
        }
      }
      const items = [];
      for (const key of list){
        const raw = await store.get(key);
        if (!raw) continue;
        try{
          const obj = JSON.parse(raw);
          if (!obj.id) obj.id = key;
          await autoDeactivateExpiredItem(store, obj, key, nowMs);
          items.push(obj);
        }catch(_){ }
      }
      const baseItems = items.length ? items : DEFAULT_SERVICE_PRODUCTS;
      const finalItems = activeOnly
        ? baseItems.filter(obj => obj && obj.active !== false && !isLimitedExpired(obj, nowMs))
        : baseItems;
      return new Response(JSON.stringify({ ok:true, items: finalItems }), { status:200, headers: jsonHeaders });
    }

    if (pathname === '/api/service/products' && request.method === 'POST') {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store){
        return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
      }
      const body = await request.json();
      const name = String(body.name||'').trim();
      const price = Number(body.price||0);
      const id = body.id ? String(body.id).trim() : ('svc-' + crypto.randomUUID().slice(0,8));
      if (!name || !price){
        return new Response(JSON.stringify({ ok:false, error:'缺少名稱或價格' }), { status:400, headers: jsonHeaders });
      }
      const bodyData = Object.assign({}, body);
      if (!bodyData.id) delete bodyData.id;
      const payload = Object.assign({}, bodyData, {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (Object.prototype.hasOwnProperty.call(bodyData, 'limitedUntil')) {
        payload.limitedUntil = normalizeLimitedUntil(bodyData.limitedUntil);
      }
      await store.put(id, JSON.stringify(payload));
      const idxKey = 'SERVICE_PRODUCT_INDEX';
      let list = [];
      try{
        const idxRaw = await store.get(idxKey);
        if (idxRaw){
          list = JSON.parse(idxRaw) || [];
        }
      }catch(_){ }
      list = [id].concat(list.filter(x=> x !== id)).slice(0,200);
      await store.put(idxKey, JSON.stringify(list));
      return new Response(JSON.stringify({ ok:true, item: payload }), { status:200, headers: jsonHeaders });
    }

    if (pathname === '/api/service/products' && request.method === 'PUT') {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store) return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
      const body = await request.json();
      const id = String(body.id||'').trim();
      if (!id){
        return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
      }
      const raw = await store.get(id);
      if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
      const prev = JSON.parse(raw);
      if (Object.prototype.hasOwnProperty.call(body, 'limitedUntil')) {
        body.limitedUntil = normalizeLimitedUntil(body.limitedUntil);
      }
      const next = Object.assign({}, prev, body, { id, updatedAt: new Date().toISOString() });
      await store.put(id, JSON.stringify(next));
      return new Response(JSON.stringify({ ok:true, item: next }), { status:200, headers: jsonHeaders });
    }

    if (pathname === '/api/service/products' && request.method === 'DELETE') {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
      if (!store) return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
      const id = String(url.searchParams.get('id')||'').trim();
      if (!id){
        return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
      }
      await store.delete(id);
      const idxKey = 'SERVICE_PRODUCT_INDEX';
      try{
        const idxRaw = await store.get(idxKey);
        if (idxRaw){
          let list = JSON.parse(idxRaw) || [];
          list = list.filter(x=> x !== id);
          await store.put(idxKey, JSON.stringify(list));
        }
      }catch(_){ }
      return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeaders });
    }

    return null;
  }

  return { handleServiceProducts };
}

export { createServiceProductsHandlers };
