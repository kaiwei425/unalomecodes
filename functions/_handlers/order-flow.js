function createOrderFlowHandlers(deps){
  const { json, requireAdminWrite, isAllowedFileUrl } = deps;

  function headersJSON() {
    return {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
      'Cache-Control': 'no-store'
    };
  }

  async function handleOrderFlow(request, env, url, origin, pathname){
    if (pathname === '/api/order/store-select' && request.method === 'POST') {
      try {
        const body = await request.json();
        const store = String(body.store || body.storeid || body.storeId || '').trim();
        if (!store) {
          return json({ ok:false, error:'Missing store' }, 400, request, env);
        }
        // 目前僅回傳門市資訊；未來若要綁暫存訂單，可在此處擴充
        return json({ ok:true, store }, 200, request, env);
      } catch (e) {
        return json({ ok:false, error:String(e) }, 500, request, env);
      }
    }

    if (pathname === '/api/order/confirm-transfer' && request.method === 'POST') {
      if (!env.ORDERS) {
        return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: headersJSON() });
      }
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      try {
        const body = await request.json();
        const id = String(body.id || '');
        if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: headersJSON() });
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: headersJSON() });
        const obj = JSON.parse(raw);
        obj.transferLast5 = String(body.transferLast5 || obj.transferLast5 || '');
        
        obj.receiptUrl = String(body.receipt || body.receiptUrl || body.proof || body.proofUrl || body.screenshot || body.upload || obj.receiptUrl || '');
        if (obj.receiptUrl) {
          let u = obj.receiptUrl;
          if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
            u = `${origin}/api/proof/${encodeURIComponent(u)}`;
          }
          if (!isAllowedFileUrl(u, env, origin)) {
            u = '';
          } else if (!/^https?:\/\//i.test(u) && u.startsWith('/')) {
            u = `${origin}${u}`;
          }
          obj.receiptUrl = u;
        }
        // Update note/remark if provided
        {
          const notePatch = String(
            body?.note ??
            body?.remark ??
            body?.buyer?.note ??
            body?.buyer_note ??
            ''
          ).trim();
          if (notePatch) obj.note = notePatch;
        }
        // Patch amount if provided
        if (typeof body.amount !== 'undefined') {
          const a = Number(body.amount);
          if (!Number.isNaN(a)) obj.amount = a;
        }
        // Patch candle ritual metadata
        const rName = String(body.ritual_name_en || body.ritualNameEn || '').trim();
        const rBirth = String(body.ritual_birthday || body.ritualBirthday || '').trim();
        const rPhoto = (() => {
          let u = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
          if (!u) return '';
          if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
            u = `${origin}/api/proof/${encodeURIComponent(u)}`;
          }
          if (!isAllowedFileUrl(u, env, origin)) return '';
          if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
          return u;
        })();
        if (rName || rBirth || rPhoto) {
          obj.extra = obj.extra || {};
          obj.extra.candle = Object.assign({}, obj.extra.candle || {}, {
            nameEn: rName || obj?.extra?.candle?.nameEn,
            birthday: rBirth || obj?.extra?.candle?.birthday,
            photoUrl: rPhoto || obj?.extra?.candle?.photoUrl
          });
        }
        if (rPhoto) {
          obj.ritual_photo_url = rPhoto;
          obj.ritualPhotoUrl = rPhoto;
        }
        obj.buyer = {
          name:  String(body?.buyer?.name  || obj?.buyer?.name  || ''),
          email: String(body?.buyer?.email || obj?.buyer?.email || ''),
          line:  String(body?.buyer?.line  || obj?.buyer?.line  || ''),
          phone: String(body?.buyer?.phone || body?.phone || body?.contact || obj?.buyer?.phone || ''),
          store: String(body?.buyer?.store || obj?.buyer?.store || ''),
          note:  String(body?.buyer?.note  || obj?.buyer?.note  || '')
        };
        obj.status = '訂單待處理';
        obj.updatedAt = new Date().toISOString();
        await env.ORDERS.put(id, JSON.stringify(obj));
        return new Response(JSON.stringify({ ok:true, order: obj }), { status:200, headers: headersJSON() });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: headersJSON() });
      }
    }

    if (pathname === '/cvs_callback' && request.method === 'POST') {
      const form = await request.formData();
      const pick = (src, ...keys) => {
        for (const k of keys) {
          const v = src.get(k);
          if (v) return String(v);
        }
        return '';
      };

      const storeId   = pick(form, 'storeid','StoreId','stCode','code','store');
      const storeName = pick(form, 'storename','StoreName','stName','name');
      const address   = pick(form, 'storeaddress','StoreAddress','address','Addr');
      const tel       = pick(form, 'storetel','StoreTel','tel','TEL');

      const data = {
        __cvs_store__: true,
        storename: storeName || '',
        storeid: storeId || '',
        storeaddress: address || '',
        storetel: tel || ''
      };
      const dataJson = JSON.stringify(data);

      const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>7-11 門市選擇完成</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px;text-align:center;color:#111827;background:#f9fafb}
    p{margin:0 0 12px;font-size:14px;color:#374151}
    small{font-size:12px;color:#9ca3af}
  </style>
</head>
<body>
  <p>已成功選擇門市，您可以關閉此視窗並回到原頁面。</p>
  <small>如果視窗沒有自動關閉，請手動關閉此頁面。</small>
  <script>
    (function(){
      try{
        var data = ${dataJson};
        var targetOrigin = ${JSON.stringify(origin)};
        if (window.opener && !window.opener.closed){
          window.opener.postMessage(data, targetOrigin);
        }
      }catch(e){}
      try{ window.close(); }catch(e){}
    })();
  </script>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    if (pathname === '/cvs_callback' && request.method === 'GET') {
      const params = url.searchParams;
      const pick = (src, ...keys) => {
        for (const k of keys) {
          const v = src.get(k);
          if (v) return String(v);
        }
        return '';
      };

      const storeId   = pick(params, 'storeid','StoreId','stCode','code','store');
      const storeName = pick(params, 'storename','StoreName','stName','name');
      const address   = pick(params, 'storeaddress','StoreAddress','address','Addr');
      const tel       = pick(params, 'storetel','StoreTel','tel','TEL');

      const data = {
        __cvs_store__: true,
        storename: storeName || '',
        storeid: storeId || '',
        storeaddress: address || '',
        storetel: tel || ''
      };
      const dataJson = JSON.stringify(data);

      const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>7-11 門市選擇完成</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px;text-align:center;color:#111827;background:#f9fafb}
    p{margin:0 0 12px;font-size:14px;color:#374151}
    small{font-size:12px;color:#9ca3af}
  </style>
</head>
<body>
  <p>已成功選擇門市，您可以關閉此視窗並回到原頁面。</p>
  <small>如果視窗沒有自動關閉，請手動關閉此頁面。</small>
  <script>
    (function(){
      try{
        var data = ${dataJson};
        var targetOrigin = ${JSON.stringify(origin)};
        if (window.opener && !window.opener.closed){
          window.opener.postMessage(data, targetOrigin);
        }
      }catch(e){}
      try{ window.close(); }catch(e){}
    })();
  </script>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    return null;
  }

  return { handleOrderFlow };
}

export { createOrderFlowHandlers };
