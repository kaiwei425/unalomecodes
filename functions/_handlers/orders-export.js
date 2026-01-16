export function createOrdersExportHandler(deps){
  const {
    ORDER_INDEX_KEY,
    resolveCorsOrigin,
    isAdmin,
    forbidIfFulfillmentAdmin,
    buildAuditActor,
    parseRate,
    checkAdminRateLimit,
    buildRateKey,
    auditAppend,
    jsonHeadersFor,
    getAny,
    normalizePhone,
    matchPhone,
    matchLast5,
    orderAmount,
    orderItemsSummary,
    normalizeReceiptUrl,
    csvEscape
  } = deps;

  return async function handleOrdersExport(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/orders/export' || request.method !== 'GET') return null;

    if (!env.ORDERS) {
      return new Response('ORDERS KV not bound', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': resolveCorsOrigin(request, env) } });
    }
    if (!(await isAdmin(request, env))) {
      return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
    }
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
    try {
      const origin = new URL(request.url).origin;
      const idsParam = (url.searchParams.get('ids') || '').trim();
      const qPhoneRaw = getAny(url.searchParams, ['phone','mobile','contact','tel','qPhone','qP']);
      const qLast5Raw = getAny(url.searchParams, ['last5','last','l5','code','transferLast5','bankLast5','qLast5']);
      const qPhone = normalizePhone(qPhoneRaw);
      const qLast5 = (String(qLast5Raw).replace(/\D/g, '') || '').slice(-5);
      const needFilter = !!(qPhone || qLast5);

      // gather candidates
      let candidates = [];
      if (idsParam) {
        const list = idsParam.split(',').map(s => s.trim()).filter(Boolean);
        for (const oid of list){
          const raw = await env.ORDERS.get(oid);
          if (!raw) continue;
          try { const obj = JSON.parse(raw); candidates.push({ id: oid, ...obj }); } catch {}
        }
      } else {
        const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
        const ids = idxRaw ? JSON.parse(idxRaw) : [];
        for (const oid of ids){
          const raw = await env.ORDERS.get(oid);
          if (!raw) continue;
          try {
            const obj = JSON.parse(raw);
            const phoneCandidates = [
              obj?.buyer?.phone, obj?.buyer?.contact, obj?.phone, obj?.contact, obj?.recipientPhone
            ].filter(Boolean);
            const last5Candidates = [
              obj?.transferLast5, obj?.last5, obj?.payment?.last5, obj?.bank?.last5
            ].filter(Boolean);

            if (needFilter) {
              let ok = true;
              if (qPhone) ok = phoneCandidates.some(p => matchPhone(p, qPhone));
              if (ok && qLast5) ok = last5Candidates.some(l => matchLast5(l, qLast5));
              if (!ok) continue;
            }
            candidates.push({ id: oid, ...obj });
          } catch {}
        }
      }

      // build CSV
      const header = [
        '訂單編號','建立時間','狀態',
        '商品摘要','總金額','轉帳末五碼',
        '買家姓名','買家電話','買家Email','取件門市',
        '備註','優惠券代碼','優惠折扣','憑證網址'
      ].map(csvEscape).join(',');
      const lines = [header];

      for (const o of candidates){
        const amt = orderAmount(o);
        const items = orderItemsSummary(o);
        const rec = normalizeReceiptUrl(o, origin, env);
        const line = [
          o.id || '',
          o.createdAt || '',
          o.status || '',
          items,
          amt,
          o.transferLast5 || '',
          o?.buyer?.name || '',
          o?.buyer?.phone || '',
          o?.buyer?.email || '',
          o?.buyer?.store || '',
          o?.note || '',
          o?.coupon?.code || '',
          (!o?.coupon || o?.coupon?.failed) ? '' : (o?.coupon?.discount ?? o?.coupon?.amount ?? ''),
          rec
        ].map(csvEscape).join(',');
        lines.push(line);
      }

      const csv = lines.join('\n');
      const h = new Headers();
      h.set('Content-Type', 'text/csv; charset=utf-8');
      h.set('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`);
      h.set('Cache-Control', 'no-store');
      return new Response(csv, { status: 200, headers: h });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeadersFor(request, env) });
    }
  };
}
