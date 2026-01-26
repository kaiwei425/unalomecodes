function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

export function createServiceOrdersExportHandler(deps){
  requireDeps(deps, ['isAdmin', 'forbidIfFulfillmentAdmin', 'buildAuditActor', 'parseRate', 'checkAdminRateLimit', 'buildRateKey', 'auditAppend', 'jsonHeadersFor', 'csvEscape', 'formatTZ'], 'service-orders-export.js');
  const {
    isAdmin,
    forbidIfFulfillmentAdmin,
    buildAuditActor,
    parseRate,
    checkAdminRateLimit,
    buildRateKey,
    auditAppend,
    jsonHeadersFor,
    csvEscape,
    formatTZ
  } = deps;

  return async function handleServiceOrdersExport(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/service/orders/export' || request.method !== 'GET') return null;

    if (!(await isAdmin(request, env))) return new Response('Unauthorized', { status:401, headers:{'Content-Type':'text/plain'} });
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    {
      const actor = await buildAuditActor(request, env);
      const rule = parseRate(env.ADMIN_EXPORT_RATE_LIMIT || '10/5m');
      const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'export'), rule);
      if (!rate.allowed){
        try{
          await auditAppend(env, {
            ts: new Date().toISOString(),
            action: 'rate_limited',
            ...actor,
            targetType: 'export',
            targetId: 'orders',
            meta: { rule: env.ADMIN_EXPORT_RATE_LIMIT || '10/5m' }
          });
        }catch(_){}
        return new Response(
          JSON.stringify({ ok:false, error:'rate_limited' }),
          { status: 429, headers: jsonHeadersFor(request, env) }
        );
      }
    }
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response('SERVICE_ORDERS 未綁定', { status:500, headers:{'Content-Type':'text/plain'} });
    }
    const idxKey = 'SERVICE_ORDER_INDEX';
    try{
      const limit = Math.min(Number(url.searchParams.get('limit')||200), 500);
      const idxRaw = await store.get(idxKey);
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const rows = [];
      const header = [
        '訂單編號','建立時間(UTC+7)','狀態','服務名稱','選項','總金額',
        '匯款末五碼','聯絡人姓名','英文姓名','電話','Email','生日','指定日期','備註','匯款憑證'
      ];
      rows.push(header.map(csvEscape).join(','));
      for (const id of ids.slice(0, limit)){
        const raw = await store.get(id);
        if (!raw) continue;
        let o = null;
        try{ o = JSON.parse(raw); }catch(_){}
        if (!o) continue;
        const created = formatTZ(o.createdAt || o.updatedAt || '', 7);
        const opts = Array.isArray(o.selectedOptions) ? o.selectedOptions : (o.selectedOption ? [o.selectedOption] : []);
        const optText = opts.length ? opts.map(x=> `${x.name||''}${x.price?`(+${x.price})`:''}`).join('、') : '標準服務';
        const proof = o?.transfer?.receiptUrl || o?.transferReceiptUrl || '';
        const row = [
          o.id || '',
          created,
          o.status || '',
          o.serviceName || '',
          optText,
          o.amount || '',
          (o.transfer && o.transfer.last5) || o.transferLast5 || '',
          o.buyer?.name || '',
          o.buyer?.nameEn || '',
          o.buyer?.phone || '',
          o.buyer?.email || '',
          o.buyer?.birth || '',
          o.requestDate || '',
          o.note || '',
          proof
        ];
        rows.push(row.map(csvEscape).join(','));
      }
      const csv = rows.join('\n');
      try{
        const actor = await buildAuditActor(request, env);
        await auditAppend(env, {
          ts: new Date().toISOString(),
          action: 'service_orders_export',
          ...actor,
          targetType: 'orders',
          targetId: 'bulk',
          meta: { kind:'service', count: Math.max(0, rows.length - 1) }
        });
      }catch(_){}
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="service-orders.csv"',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }catch(e){
      return new Response(String(e), { status:500, headers:{'Content-Type':'text/plain'} });
    }
  };
}
