function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createOrderQnaHandlers(deps){
  requireDeps(deps, ['json', 'corsPreflight', 'getSessionUserRecord', 'attachSignedProofs', 'ORDER_INDEX_KEY', 'getAdminSession', 'isAdmin', 'getAdminRole', 'findOrderByIdForQna', 'orderBelongsToUser', 'loadOrderQna', 'saveOrderQna', 'sanitizeQnaItem', 'incrementAdminQnaUnread', 'clearUserUnreadForOrder', 'maybeSendOrderQnaEmail', 'buildOrderItems', 'findUserIdByEmail', 'incrementUserUnreadForOrder', 'requireAdminWrite', 'forbidIfFulfillmentAdmin', 'getAdminQnaUnread', 'clearAdminQnaUnread', 'getQnaMetaStore', 'getUserUnreadTotal', 'clearUserUnreadAll', 'getUserCouponUnread', 'saveUserRecord'], 'order-qna.js');
  const {
    json,
    corsPreflight,
    getSessionUserRecord,
    attachSignedProofs,
    ORDER_INDEX_KEY,
    getAdminSession,
    isAdmin,
    getAdminRole,
    findOrderByIdForQna,
    orderBelongsToUser,
    loadOrderQna,
    saveOrderQna,
    sanitizeQnaItem,
    incrementAdminQnaUnread,
    clearUserUnreadForOrder,
    maybeSendOrderQnaEmail,
    buildOrderItems,
    findUserIdByEmail,
    incrementUserUnreadForOrder,
    requireAdminWrite,
    forbidIfFulfillmentAdmin,
    getAdminQnaUnread,
    clearAdminQnaUnread,
    getQnaMetaStore,
    getUserUnreadTotal,
    clearUserUnreadAll,
    getUserCouponUnread,
    saveUserRecord
  } = deps;

  async function handleMeOrders(request, env, url){
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    const ordersStore = env.ORDERS;
    const svcStore = env.SERVICE_ORDERS || env.ORDERS;
    const out = { physical: [], service: [] };
    const matchOrder = (order)=>{
      if (!order) return false;
      if (order.buyer && order.buyer.uid && order.buyer.uid === record.id) return true;
      if (record.email){
        const emails = [
          order?.buyer?.email,
          order?.buyer?.contact,
          order?.email,
          order?.contact
        ].filter(Boolean);
        if (emails.some(e => String(e).toLowerCase() === record.email.toLowerCase())) return true;
      }
      return false;
    };
    if (ordersStore) {
      try{
        const idxRaw = await ordersStore.get(ORDER_INDEX_KEY);
        const ids = idxRaw ? JSON.parse(idxRaw) : [];
        for (const id of ids.slice(0, 200)){
          const raw = await ordersStore.get(id);
          if (!raw) continue;
          try{
            const order = JSON.parse(raw);
            if (matchOrder(order)){
              const merged = Object.assign({ id }, order);
              out.physical.push(await attachSignedProofs(merged, env));
            }
          }catch(_){}
        }
      }catch(_){}
    }
    if (svcStore){
      try{
        const idxRaw = await svcStore.get('SERVICE_ORDER_INDEX');
        const ids = idxRaw ? JSON.parse(idxRaw) : [];
        for (const id of ids.slice(0, 200)){
          const raw = await svcStore.get(id);
          if (!raw) continue;
          try{
            const order = JSON.parse(raw);
            if (matchOrder(order)){
              const merged = Object.assign({ id }, order);
              out.service.push(await attachSignedProofs(merged, env));
            }
          }catch(_){}
        }
      }catch(_){}
    }
    return json({ ok:true, orders: out });
  }

  async function handleOrderQna(request, env, url, origin){
    if (request.method === 'OPTIONS') return corsPreflight();
    const adminSession = await getAdminSession(request, env);
    const adminKeyOk = await isAdmin(request, env);
    const isAdminUser = !!adminSession || adminKeyOk;
    const adminRole = adminSession && adminSession.email ? await getAdminRole(adminSession.email, env) : '';
    let body = {};
    if (request.method !== 'GET') {
      try{ body = await request.json(); }catch(_){ body = {}; }
    }
    const orderId = String(
      (request.method === 'GET' ? url.searchParams.get('orderId') : (body.orderId || body.id || ''))
      || url.searchParams.get('orderId')
      || ''
    ).trim();
    if (!orderId) return json({ ok:false, error:'missing orderId' }, 400);
    const found = await findOrderByIdForQna(env, orderId);
    if (!found || !found.order) return json({ ok:false, error:'order not found' }, 404);
    const order = found.order;
    const store = found.store;
    const orderType = found.type || 'physical';
    let record = null;
    if (!isAdminUser){
      record = await getSessionUserRecord(request, env);
      if (!record) return json({ ok:false, error:'unauthorized' }, 401);
      if (!orderBelongsToUser(order, record)) return json({ ok:false, error:'forbidden' }, 403);
    }
    if (request.method === 'GET'){
      const items = await loadOrderQna(store, orderId);
      if (!isAdminUser && record){
        if (!order?.buyer?.uid){
          order.buyer = order.buyer || {};
          order.buyer.uid = record.id;
          try{ await store.put(orderId, JSON.stringify(order)); }catch(_){}
        }
        await clearUserUnreadForOrder(env, record.id, orderId, store);
      }
      return json({ ok:true, orderId, items: items.map(sanitizeQnaItem) });
    }
    const items = await loadOrderQna(store, orderId);
    if (request.method === 'POST'){
      const text = String(body.text || '').trim();
      if (!text) return json({ ok:false, error:'empty text' }, 400);
      if (text.length > 1000) return json({ ok:false, error:'text too long' }, 400);
      const now = new Date().toISOString();
      const role = isAdminUser ? 'admin' : 'user';
      const name = isAdminUser
        ? (adminSession && (adminSession.name || adminSession.email)) || '客服'
        : (record && (record.name || record.email)) || (order?.buyer?.name || '會員');
      const item = {
        id: crypto.randomUUID(),
        role,
        text,
        ts: now,
        name,
        uid: isAdminUser ? '' : (record ? record.id : '')
      };
      items.push(item);
      await saveOrderQna(store, orderId, items);
      if (role === 'user') {
        await incrementAdminQnaUnread(env, store, 1);
      }

      try{
        const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
        const originUrl = env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://unalomecodes.com';
        const base = originUrl.replace(/\/$/, '');
        const orderLinkAdmin = `${base}/${orderType === 'service' ? 'admin/service-orders' : 'admin/orders'}`;
        const orderLinkCustomer = `${base}/account-orders`;
        const buyerEmail = String(order?.buyer?.email || order?.buyer_email || order?.email || '').trim();
        const adminRaw = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
        const adminTo = Array.from(new Set(['bkkaiwei@gmail.com', ...adminRaw]));
        const itemsList = buildOrderItems(order).map(it=>{
          const spec = it.spec ? `（${it.spec}）` : '';
          return `${it.name}${spec} × ${it.qty}`;
        }).join('、') || (order?.serviceName || order?.productName || '');
        const emailName = role === 'admin' ? '賣家' : name;
        const esc = (val)=>{
          const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
          return String(val || '').replace(/[&<>"']/g, m => map[m] || m);
        };
        const htmlBase = `
          <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px;background:#f5f7fb;">
            <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
              <p style="margin:0 0 12px;font-weight:700;font-size:18px;">${esc(siteName)}</p>
              <p>訂單編號：${esc(orderId)}</p>
              ${itemsList ? `<p>商品：${esc(itemsList)}</p>` : ''}
              <div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
                <p style="margin:0 0 6px;"><strong>留言人：</strong>${esc(emailName)}</p>
                <p style="margin:0;"><strong>內容：</strong><br>${esc(text)}</p>
              </div>
            </div>
          </div>
        `;
        if (role === 'user'){
          await maybeSendOrderQnaEmail(env, {
            to: adminTo,
            subject: `[${siteName}] 訂單新留言 ${orderId}`,
            html: htmlBase,
            text: `${siteName} 訂單新留言\n訂單編號：${orderId}\n商品：${itemsList}\n留言人：${emailName}\n內容：${text}\n管理頁：${orderLinkAdmin}`
          });
        }else if (buyerEmail){
          await maybeSendOrderQnaEmail(env, {
            to: [buyerEmail],
            subject: `[${siteName}] 訂單回覆 ${orderId}`,
            html: htmlBase,
            text: `${siteName} 訂單回覆\n訂單編號：${orderId}\n商品：${itemsList}\n回覆人：${emailName}\n內容：${text}\n查詢訂單：${orderLinkCustomer}`
          });
        }
      }catch(_){}

      if (role === 'admin') {
        let uid = order?.buyer?.uid || '';
        if (!uid && buyerEmail){
          uid = await findUserIdByEmail(env, buyerEmail);
          if (uid){
            order.buyer = order.buyer || {};
            order.buyer.uid = uid;
            try{ await store.put(orderId, JSON.stringify(order)); }catch(_){}
          }
        }
        if (uid) await incrementUserUnreadForOrder(env, uid, orderId, 1, store);
      }

      return json({ ok:true, item: sanitizeQnaItem(item) });
    }
    if (request.method === 'PATCH'){
      const msgId = String(body.id || '').trim();
      const text = String(body.text || '').trim();
      if (!msgId) return json({ ok:false, error:'missing id' }, 400);
      if (!text) return json({ ok:false, error:'empty text' }, 400);
      if (text.length > 1000) return json({ ok:false, error:'text too long' }, 400);
      const idx = items.findIndex(it => it && it.id === msgId);
      if (idx === -1) return json({ ok:false, error:'not found' }, 404);
      const target = items[idx];
      if (!isAdminUser){
        if (target.role !== 'user' || !record || target.uid !== record.id) return json({ ok:false, error:'forbidden' }, 403);
      }
      target.text = text;
      target.updatedAt = new Date().toISOString();
      target.edited = true;
      items[idx] = target;
      await saveOrderQna(store, orderId, items);
      return json({ ok:true, item: sanitizeQnaItem(target) });
    }
    if (request.method === 'DELETE'){
      if (isAdminUser && adminRole === 'fulfillment'){
        return json({ ok:false, error:'forbidden_role' }, 403);
      }
      const msgId = String(body.id || url.searchParams.get('id') || '').trim();
      if (!msgId) return json({ ok:false, error:'missing id' }, 400);
      const idx = items.findIndex(it => it && it.id === msgId);
      if (idx === -1) return json({ ok:false, error:'not found' }, 404);
      const target = items[idx];
      if (!isAdminUser){
        if (target.role !== 'user' || !record || target.uid !== record.id) return json({ ok:false, error:'forbidden' }, 403);
      }
      items.splice(idx, 1);
      await saveOrderQna(store, orderId, items);
      return json({ ok:true });
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  async function handleAdminQnaUnread(request, env, url){
    const guard = await requireAdminWrite(request, env);
    if (guard) return guard;
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    if (request.method === 'GET') {
      const unread = await getAdminQnaUnread(env, env.ORDERS || env.SERVICE_ORDERS || null);
      return json({ ok:true, unread }, 200, request, env);
    }
    if (request.method === 'POST') {
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const action = String(body.action || body.mode || '').toLowerCase();
      if (action === 'clear' || action === 'reset' || action === 'read') {
        const unread = await clearAdminQnaUnread(env, env.ORDERS || env.SERVICE_ORDERS || null);
        return json({ ok:true, unread }, 200, request, env);
      }
      return json({ ok:false, error:'invalid action' }, 400, request, env);
    }
    return json({ ok:false, error:'method not allowed' }, 405, request, env);
  }

  async function handleUserQnaUnread(request, env, url){
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    const store = getQnaMetaStore(env, env.ORDERS || env.SERVICE_ORDERS || null);
    if (request.method === 'GET') {
      const total = await getUserUnreadTotal(env, record.id, store);
      const detail = String(url.searchParams.get('detail') || '') === '1';
      if (!detail || !store || !store.list){
        return json({ ok:true, total });
      }
      const prefix = `QNA_USER_ORDER_UNREAD:${record.id}:`;
      const iter = await store.list({ prefix });
      const map = {};
      for (const key of (iter.keys || [])){
        if (!key || !key.name) continue;
        const orderId = key.name.replace(prefix, '');
        try{
          const raw = await store.get(key.name);
          const num = Number(raw || 0);
          if (Number.isFinite(num) && num > 0) map[orderId] = Math.floor(num);
        }catch(_){}
      }
      return json({ ok:true, total, orders: map });
    }
    if (request.method === 'POST') {
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const action = String(body.action || body.mode || '').toLowerCase();
      const orderId = String(body.orderId || body.id || '').trim();
      if (action === 'clear' && orderId){
        const total = await clearUserUnreadForOrder(env, record.id, orderId, store);
        return json({ ok:true, total });
      }
      if (action === 'clear' || action === 'reset' || action === 'read'){
        const total = await clearUserUnreadAll(env, record.id, store);
        return json({ ok:true, total });
      }
      return json({ ok:false, error:'invalid action' }, 400);
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  async function handleUserCouponUnread(request, env, url){
    const record = await getSessionUserRecord(request, env);
    if (!record) return json({ ok:false, error:'unauthorized' }, 401);
    if (request.method === 'GET') {
      const total = await getUserCouponUnread(env, record);
      return json({ ok:true, total });
    }
    if (request.method === 'POST') {
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const action = String(body.action || body.mode || '').toLowerCase();
      if (action === 'clear' || action === 'reset' || action === 'read') {
        record.couponsSeenAt = new Date().toISOString();
        await saveUserRecord(env, record);
        return json({ ok:true, total: 0 });
      }
      return json({ ok:false, error:'invalid action' }, 400);
    }
    return json({ ok:false, error:'method not allowed' }, 405);
  }

  return {
    handleMeOrders,
    handleOrderQna,
    handleAdminQnaUnread,
    handleUserQnaUnread,
    handleUserCouponUnread
  };
}

export { createOrderQnaHandlers };
