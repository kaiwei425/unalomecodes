function createStatsUtils(deps){
  const {
    orderAmount,
    orderItemsSummary,
    resolveTotalStockForProduct,
    resolveAvailableStock,
    statusIsPaid,
    statusIsCanceled,
    statusIsPaidOrReady,
    statusIsWaitingVerify,
    taipeiDateKey,
    isLimitedExpired,
    readProductById,
    normalizeStatus,
    CANONICAL_STATUS,
    ORDER_INDEX_KEY,
    getUserStore,
    getOrderCreatedTs,
    getOrderPaidTs,
    getOrderAmount
  } = deps;

async function updateDashboardStats(env) {
  const scanLimit = Math.max(50, Math.min(Number(env.ADMIN_STATS_LIMIT || 800) || 800, 2000));
  const lowStockThreshold = Math.max(0, Number(env.LOW_STOCK_THRESHOLD || 3) || 3);
  const stats = {
    products: { total: 0, active: 0, lowStock: 0, approx: false },
    orders: { total: 0, paid: 0, shipped: 0, pending: 0, done: 0, canceled: 0, approx: false },
    serviceOrders: { total: 0, paid: 0, pending: 0, done: 0, canceled: 0, approx: false },
    members: { total: 0, approx: false },
    coupons: { total: 0, used: 0, total7: 0, used7: 0, approx: false }
  };
  const nowTs = Date.now();
  const todayKey = taipeiDateKey(nowTs);
  const last7Ts = nowTs - 7 * 86400000;
  const last30Ts = nowTs - 30 * 86400000;
  const makePeriods = ()=>({ today: 0, last7: 0, last30: 0 });
  const addPeriods = (obj, ts, value = 1)=>{
    if (!ts) return;
    if (taipeiDateKey(ts) === todayKey) obj.today += value;
    if (ts >= last7Ts) obj.last7 += value;
    if (ts >= last30Ts) obj.last30 += value;
  };
  const topPhysicalMap = new Map();
  const topServiceMap = new Map();
  const lowStockItems = [];
  const reports = {
    physical: {
      revenue: makePeriods(),
      orders: makePeriods(),
      status: { paid: 0, shipped: 0, pending: 0, done: 0, canceled: 0 },
      topItems: [],
      lowStock: [],
      approx: false
    },
    service: {
      revenue: makePeriods(),
      orders: makePeriods(),
      status: { paid: 0, pending: 0, done: 0, canceled: 0 },
      topItems: [],
      approx: false
    }
  };
  const addTop = (map, key, payload)=>{
    if (!key) return;
    const current = map.get(key) || { id: payload.id || '', name: payload.name || key, qty: 0, amount: 0, image: payload.image || '' };
    current.qty += Number(payload.qty || 0) || 0;
    current.amount += Number(payload.amount || 0) || 0;
    if (!current.image && payload.image) current.image = payload.image;
    map.set(key, current);
  };
  const getOrderItems = (o)=>{
    if (Array.isArray(o?.items)) return o.items;
    if (Array.isArray(o?.products)) return o.products;
    if (Array.isArray(o?.cartItems)) return o.cartItems;
    if (Array.isArray(o?.orderItems)) return o.orderItems;
    return [];
  };

  // Products
  if (env.PRODUCTS){
    let ids = [];
    try{
      const indexRaw = await env.PRODUCTS.get('INDEX');
      ids = indexRaw ? JSON.parse(indexRaw) : [];
      if (!Array.isArray(ids)) ids = [];
    }catch(_){ ids = []; }
    stats.products.total = ids.length;
    const slice = ids.slice(0, scanLimit);
    if (ids.length > slice.length) stats.products.approx = true;
    for (const id of slice){
      const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
      if (!raw) continue;
      try{
        const p = JSON.parse(raw);
        if (p.active === true) stats.products.active++;
        const stockTotal = resolveTotalStockForProduct(p);
        if (stockTotal !== null && stockTotal <= lowStockThreshold){
          stats.products.lowStock++;
          lowStockItems.push({
            id,
            name: p.name || p.title || p.productName || '商品',
            stock: stockTotal,
            active: p.active === true
          });
        }
      }catch(_){}
    }
  }

  const isOrderPaid = (order)=>{
    const paymentStatusRaw = order?.payment?.status ?? '';
    const paymentStatus = String(paymentStatusRaw).trim().toUpperCase();
    const paymentOk = paymentStatus === 'PAID'
      || paymentStatus === 'SUCCESS'
      || paymentStatus === 'SUCCESSFUL'
      || paymentStatus === 'CONFIRMED'
      || paymentStatus === 'COMPLETED'
      || paymentStatus === 'OK'
      || paymentStatus === '1'
      || paymentStatusRaw === 1
      || order?.payment?.paid === true
      || order?.payment?.isPaid === true
      || !!order?.payment?.paidAt
      || !!order?.payment?.paid_at
      || !!order?.paidAt
      || !!order?.paid_at;
    return statusIsPaid(order?.status) || paymentOk;
  };
  const normalizeServiceStatus = (status)=>{
    const raw = String(status || '').replace(/\s+/g, '').trim();
    if (!raw) return '';
    if (raw.includes('取消') || raw.includes('退款') || raw.includes('作廢') || raw.includes('失敗')) return 'CANCELED';
    if (raw.includes('祈福完成') || raw.includes('已完成') || raw.includes('成果') || raw.includes('完成')) return 'DONE';
    if (raw.includes('已確認付款') || raw.includes('已付款') || raw.includes('祈福進行中') || raw.includes('進行中')) return 'PAID';
    if (raw.includes('待處理') || raw.includes('待付款') || raw.includes('未付款') || raw.includes('待確認')) return 'PENDING';
    return '';
  };
  const isServiceDone = (order)=> normalizeServiceStatus(order?.status) === 'DONE';
  const isServiceCanceled = (order)=> normalizeServiceStatus(order?.status) === 'CANCELED';
  const isServicePaid = (order)=>{
    if (!order) return false;
    const key = normalizeServiceStatus(order.status);
    if (key === 'DONE' || key === 'PAID') return true; // 祈福完成/已確認付款 視為已收款
    return isOrderPaid(order);
  };

  // Orders
  if (env.ORDERS){
    let ids = [];
    try{
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      ids = idxRaw ? JSON.parse(idxRaw) : [];
      if (!Array.isArray(ids)) ids = [];
    }catch(_){ ids = []; }
    const scanAll = ids.length <= scanLimit;
    const scanIds = scanAll ? ids : ids.slice(0, scanLimit);
    if (!scanAll && ids.length > scanIds.length) stats.orders.approx = true;
    const aliveIds = [];
    for (const oid of scanIds){
      const raw = await env.ORDERS.get(oid);
      if (!raw) continue;
      if (scanAll) aliveIds.push(oid);
      try{
        const o = JSON.parse(raw);
        const statusKey = normalizeStatus(o.status);
        const isDone = statusKey === CANONICAL_STATUS.COMPLETED;
        const isShipped = statusKey === CANONICAL_STATUS.SHIPPED;
        const isReady = statusKey === CANONICAL_STATUS.READY_TO_SHIP;
        const isCanceled = statusKey === CANONICAL_STATUS.CANCELED;
        const isPaid = isOrderPaid(o);
        if (isDone) stats.orders.done++;
        else if (isShipped) stats.orders.shipped++;
        else if (isReady) stats.orders.paid++;
        else if (isCanceled) stats.orders.canceled++;
        else stats.orders.pending++;

        if (isDone) reports.physical.status.done++;
        else if (isShipped) reports.physical.status.shipped++;
        else if (isReady) reports.physical.status.paid++;
        else if (isCanceled) reports.physical.status.canceled++;
        else reports.physical.status.pending++;

        const createdTs = getOrderCreatedTs(o);
        addPeriods(reports.physical.orders, createdTs, 1);

        if (isPaid){
          const paidTs = getOrderPaidTs(o) || createdTs;
          const amount = getOrderAmount(o);
          if (amount > 0) addPeriods(reports.physical.revenue, paidTs, amount);
          const items = getOrderItems(o);
          if (items.length){
            for (const it of items){
              const qty = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
              const unit = Number(it.price ?? it.unitPrice ?? it.amount ?? 0) || 0;
              let total = Number(it.total ?? it.amountTotal ?? 0) || 0;
              if (!total && unit) total = unit * qty;
              const name = it.productName || it.name || o.productName || o.name || '商品';
              const id = it.productId || it.id || '';
              const image = it.image || it.cover || it.thumb || '';
              addTop(topPhysicalMap, String(id || name), {
                id: String(id || ''),
                name,
                qty,
                amount: total || 0,
                image
              });
            }
          } else {
            const qty = Math.max(1, Number(o.qty ?? 1));
            const unit = Number(o.price ?? 0) || 0;
            let total = Number(o.amount ?? 0) || 0;
            if (!total && unit) total = unit * qty;
            const name = o.productName || o.name || '商品';
            const id = o.productId || o.id || '';
            const image = o.image || o.cover || o.thumb || '';
            addTop(topPhysicalMap, String(id || name), {
              id: String(id || ''),
              name,
              qty,
              amount: total || 0,
              image
            });
          }
        }
      }catch(_){}
    }
    if (scanAll){
      stats.orders.total = aliveIds.length;
      if (aliveIds.length !== ids.length){
        try{ await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(aliveIds)); }catch(_){}
      }
    }else{
      stats.orders.total = ids.length;
    }
  }

  // Service orders
  {
    const svcStore = env.SERVICE_ORDERS || env.ORDERS;
    if (svcStore){
      let ids = [];
      try{
        const idxRaw = await svcStore.get('SERVICE_ORDER_INDEX');
        ids = idxRaw ? JSON.parse(idxRaw) : [];
        if (!Array.isArray(ids)) ids = [];
      }catch(_){ ids = []; }
      const scanAll = ids.length <= scanLimit;
      const scanIds = scanAll ? ids : ids.slice(0, scanLimit);
      if (!scanAll && ids.length > scanIds.length) stats.serviceOrders.approx = true;
      const aliveIds = [];
      for (const oid of scanIds){
        const raw = await svcStore.get(oid);
        if (!raw) continue;
        if (scanAll) aliveIds.push(oid);
      try{
        const o = JSON.parse(raw);
        const isDone = isServiceDone(o);
        const isPaid = isServicePaid(o);
        const isCanceled = isServiceCanceled(o);
        if (isDone) stats.serviceOrders.done++;
        else if (isPaid) stats.serviceOrders.paid++;
        else if (isCanceled) stats.serviceOrders.canceled++;
        else stats.serviceOrders.pending++;
        if (isDone) reports.service.status.done++;
        else if (isPaid) reports.service.status.paid++;
        else if (isCanceled) reports.service.status.canceled++;
        else reports.service.status.pending++;

          const createdTs = getOrderCreatedTs(o);
          addPeriods(reports.service.orders, createdTs, 1);

          if (isPaid){
            const paidTs = getOrderPaidTs(o) || createdTs;
            const amount = getOrderAmount(o);
            if (amount > 0) addPeriods(reports.service.revenue, paidTs, amount);
            const rawItems = getOrderItems(o);
            if (rawItems.length){
              for (const it of rawItems){
                const qty = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
                const unit = Number(it.price ?? it.unitPrice ?? it.amount ?? 0) || 0;
                let total = Number(it.total ?? it.amountTotal ?? 0) || 0;
                if (!total && unit) total = unit * qty;
                if (!total && amount) total = amount / rawItems.length;
                const name = it.name || o.serviceName || o.productName || '服務商品';
                const id = o.serviceId || it.serviceId || '';
                const image = it.image || it.cover || o.cover || '';
                addTop(topServiceMap, String(id || name), {
                  id: String(id || ''),
                  name,
                  qty,
                  amount: total || 0,
                  image
                });
              }
            } else {
              const qty = Math.max(1, Number(o.qty ?? 1));
              const unit = Number(o.price ?? 0) || 0;
              let total = Number(o.amount ?? 0) || 0;
              if (!total && unit) total = unit * qty;
              const name = o.serviceName || o.productName || '服務商品';
              const id = o.serviceId || o.id || '';
              const image = o.image || o.cover || '';
              addTop(topServiceMap, String(id || name), {
                id: String(id || ''),
                name,
                qty,
                amount: total || 0,
                image
              });
            }
          }
        }catch(_){}
      }
      if (scanAll){
        stats.serviceOrders.total = aliveIds.length;
        if (aliveIds.length !== ids.length){
          try{ await svcStore.put('SERVICE_ORDER_INDEX', JSON.stringify(aliveIds)); }catch(_){}
        }
      }else{
        stats.serviceOrders.total = ids.length;
      }
    }
  }

  // Members
  {
    const store = getUserStore(env);
    if (store && store.list){
      try{
        const iter = await store.list({ prefix:'USER:' });
        const keys = Array.isArray(iter.keys) ? iter.keys : [];
        stats.members.total = keys.length;
        if (keys.length >= scanLimit) stats.members.approx = true;
      }catch(_){}
    }
  }

  // Coupons (approx via list)
  if (env.COUPONS && env.COUPONS.list){
    try{
      const iter = await env.COUPONS.list({ prefix:'COUPON:' });
      const keys = Array.isArray(iter.keys) ? iter.keys.slice(0, scanLimit) : [];
      stats.coupons.total = keys.length;
      if (iter.keys && iter.keys.length > keys.length) stats.coupons.approx = true;
      for (const k of keys){
        const raw = await env.COUPONS.get(k.name);
        if (!raw) continue;
        try{
          const c = JSON.parse(raw);
          const issuedAtTs = c.issuedAt ? Date.parse(c.issuedAt) : 0;
          if (issuedAtTs && issuedAtTs >= last7Ts) stats.coupons.total7++;
          if (c.used) stats.coupons.used++;
          const usedAtTs = c.usedAt ? Date.parse(c.usedAt) : 0;
          if (usedAtTs && usedAtTs >= last7Ts) stats.coupons.used7++;
        }catch(_){}
      }
    }catch(_){}
  }
  reports.physical.approx = stats.orders.approx || stats.products.approx;
  reports.service.approx = reports.service.approx || stats.serviceOrders.approx;
  reports.physical.topItems = Array.from(topPhysicalMap.values())
    .sort((a,b)=> (b.qty - a.qty) || (b.amount - a.amount))
    .slice(0, 10);
  reports.physical.lowStock = lowStockItems
    .sort((a,b)=> (a.stock - b.stock) || String(a.name).localeCompare(String(b.name), 'zh-Hant'))
    .slice(0, 10);
  reports.service.topItems = Array.from(topServiceMap.values())
    .sort((a,b)=> (b.qty - a.qty) || (b.amount - a.amount))
    .slice(0, 10);

  return { stats, reports, limits: { scanLimit, lowStockThreshold }, updatedAt: new Date().toISOString() };
}

  return { updateDashboardStats };
}

export { createStatsUtils };
