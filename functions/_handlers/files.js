function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createFileHandlers(deps){
  requireDeps(deps, ['requireAdminWrite', 'forbidIfFulfillmentAdmin', 'requireAdminPermission', 'buildAuditActor', 'parseRate', 'checkAdminRateLimit', 'buildRateKey', 'auditAppend', 'jsonHeadersFor', 'jsonHeaders', 'deleteR2FileByKey', 'deleteR2FileViaBody', 'extractKeyFromProxyUrl', 'proxyR2File', 'canAccessProof', 'getProofFromStore', 'arrayBufferToBase64'], 'files.js');
  const {
    requireAdminWrite,
    forbidIfFulfillmentAdmin,
    requireAdminPermission,
    buildAuditActor,
    parseRate,
    checkAdminRateLimit,
    buildRateKey,
    auditAppend,
    jsonHeadersFor,
    jsonHeaders,
    deleteR2FileByKey,
    deleteR2FileViaBody,
    extractKeyFromProxyUrl,
    proxyR2File,
    canAccessProof,
    getProofFromStore,
    arrayBufferToBase64
  } = deps;

  async function handleFileRoutes(request, env, pathname){
  // 圖片刪除
      if (pathname.startsWith("/api/file/") && request.method === "DELETE") {
        {
          const guard = await requireAdminWrite(request, env);
          if (guard) return guard;
        }
        {
          const guard = await forbidIfFulfillmentAdmin(request, env);
          if (guard) return guard;
        }
        {
          const guard = await requireAdminPermission(request, env, 'file.delete');
          if (guard) return guard;
        }
        {
          const actor = await buildAuditActor(request, env);
          const rule = parseRate(env.ADMIN_DELETE_RATE_LIMIT || '30/10m');
          const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'file_delete'), rule);
          if (!rate.allowed){
            try{
              await auditAppend(env, {
                ts: new Date().toISOString(),
                action: 'rate_limited',
                ...actor,
                targetType: 'file',
                targetId: 'bulk',
                meta: { rule: env.ADMIN_DELETE_RATE_LIMIT || '30/10m' }
              });
            }catch(_){}
            return new Response(
              JSON.stringify({ ok:false, error:'rate_limited' }),
              { status: 429, headers: jsonHeadersFor(request, env) }
            );
          }
        }
        const key = decodeURIComponent(pathname.replace("/api/file/", ""));
        const resp = await deleteR2FileByKey(key, env);
        // Manual test: owner delete file -> audit logs include action=file_delete
        if (resp && resp.ok){
          try{
            const actor = await buildAuditActor(request, env);
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'file_delete',
              ...actor,
              targetType: 'file',
              targetId: key,
              meta: { endpoint: '/api/file/*' }
            });
          }catch(_){}
        }
        return resp;
      }
      if (pathname === "/api/deleteFile" && request.method === "POST") {
        {
          const guard = await requireAdminWrite(request, env);
          if (guard) return guard;
        }
        {
          const guard = await forbidIfFulfillmentAdmin(request, env);
          if (guard) return guard;
        }
        {
          const guard = await requireAdminPermission(request, env, 'file.delete');
          if (guard) return guard;
        }
        {
          const actor = await buildAuditActor(request, env);
          const rule = parseRate(env.ADMIN_DELETE_RATE_LIMIT || '30/10m');
          const rate = await checkAdminRateLimit(env, buildRateKey(actor, 'file_delete'), rule);
          if (!rate.allowed){
            try{
              await auditAppend(env, {
                ts: new Date().toISOString(),
                action: 'rate_limited',
                ...actor,
                targetType: 'file',
                targetId: 'bulk',
                meta: { rule: env.ADMIN_DELETE_RATE_LIMIT || '30/10m' }
              });
            }catch(_){}
            return new Response(
              JSON.stringify({ ok:false, error:'rate_limited' }),
              { status: 429, headers: jsonHeadersFor(request, env) }
            );
          }
        }
        let body = {};
        try{ body = await request.json(); }catch(_){ body = {}; }
        let key = body?.key;
        if (!key && body?.url) key = extractKeyFromProxyUrl(body.url);
        const resp = await deleteR2FileViaBody(request, env, body);
        // Manual test: owner delete file -> audit logs include action=file_delete
        if (resp && resp.ok){
          try{
            const actor = await buildAuditActor(request, env);
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'file_delete',
              ...actor,
              targetType: 'file',
              targetId: key || '',
              meta: { endpoint: '/api/deleteFile' }
            });
          }catch(_){}
        }
        return resp;
      }

      // 公開讀取 R2 檔案
      if (pathname.startsWith("/api/file/") && request.method === "GET") {
        const key = decodeURIComponent(pathname.replace("/api/file/", ""));
        return proxyR2File(key, env);
      }

      // === 憑證圖片讀取：優先從 R2_BUCKET，其次 RECEIPTS KV，修復遞迴與跨域問題 ===
      // Serve proof image (R2_BUCKET or RECEIPTS)
      if (pathname.startsWith('/api/proof/') && request.method === 'GET') {
        const key = decodeURIComponent(pathname.replace('/api/proof/', '').trim());
        if (!key) return new Response(JSON.stringify({ ok:false, error:'Missing key' }), { status:400 });
        if (!(await canAccessProof(request, env, key))) {
          return new Response(JSON.stringify({ ok:false, error:'Forbidden' }), { status:403, headers: jsonHeaders });
        }
        try {
          // 使用 getProofFromStore 取得圖片，避免遞迴呼叫
          const found = await getProofFromStore(env, key);
          if (found && found.bin) {
            const { bin, metadata } = found;
            let contentType = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
            if (!/^image\//i.test(contentType)) contentType = 'image/jpeg';
            return new Response(bin, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          return new Response(JSON.stringify({ ok:false, error:'Not found', key }), { status:404 });
        } catch (e) {
          return new Response(JSON.stringify({ ok:false, error:String(e), key }), { status:500 });
        }
      }
      // === Proof data URL for inline preview (returns data: URL as text) ===
      if (pathname.startsWith("/api/proof.data/") && request.method === "GET") {
        try {
          const rawKey = pathname.replace("/api/proof.data/", "");
          const accessKey = decodeURIComponent(rawKey);
          if (!(await canAccessProof(request, env, accessKey))) {
            return new Response('Forbidden', { status: 403 });
          }
          const found = await getProofFromStore(env, accessKey);
          if (!found) return new Response('Not found', { status: 404 });
          const { bin, metadata } = found;
          let ctype = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
          if (!/^image\//i.test(ctype)) ctype = 'image/jpeg';
          const b64 = arrayBufferToBase64(bin);
          const dataUrl = `data:${ctype};base64,${b64}`;
          return new Response(dataUrl, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (e) {
          return new Response(JSON.stringify({ ok:false, error:String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }
      // === Proof preview with browser-friendly format (webp) ===
      if (pathname.startsWith("/api/proof.view/") && request.method === "GET") {
        const rawKey = pathname.replace("/api/proof.view/", "");
        const key = decodeURIComponent(rawKey);
        if (!(await canAccessProof(request, env, key))) {
          return new Response('Forbidden', { status: 403 });
        }
        // 直接從 store 取得圖片
        const found = await getProofFromStore(env, key);
        if (!found || !found.bin) return new Response('Not found', { status: 404 });
        // 轉換圖片格式 (webp) via Cloudflare Images
        const imageRequest = new Request("https://dummy", {
          headers: { "Accept": "image/*" },
          cf: { image: { format: "webp", quality: 85, fit: "scale-down" } }
        });
        // Cloudflare Workers 不支援直接以 buffer 傳給 cf:image，但 fetch 只作用於 URL。
        // 所以這裡 fallback: 直接回傳原始圖片（webp 需求可於前端處理或 Cloudflare Images 方案）
        let ctype = (found.metadata && (found.metadata.contentType || found.metadata['content-type'])) || 'image/jpeg';
        if (!/^image\//i.test(ctype)) ctype = 'image/webp';
        const h = new Headers();
        h.set("Content-Type", ctype);
        h.set("Access-Control-Allow-Origin", "*");
        h.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(found.bin, { status: 200, headers: h });
      }
      // === Proof inline HTML (data URL) to bypass strict image loading issues ===
      if (pathname.startsWith("/api/proof.inline/") && request.method === "GET") {
        try {
          const rawKey = pathname.replace("/api/proof.inline/", "");
          const accessKey = decodeURIComponent(rawKey);
          if (!(await canAccessProof(request, env, accessKey))) {
            return new Response('Forbidden', { status: 403 });
          }
          const found = await getProofFromStore(env, accessKey);
          if (!found) return new Response('Not found', { status: 404 });
          const { key: realKey, bin, metadata } = found;
          let ctype = (metadata && (metadata.contentType || metadata['content-type'])) || 'image/jpeg';
          if (!/^image\//i.test(ctype)) ctype = 'image/jpeg';
          const b64 = arrayBufferToBase64(bin);
          const html = `<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Proof: ${realKey}</title>
  <style>html,body{margin:0;padding:0;background:#0b1022;color:#e5e7eb;font-family:ui-sans-serif,system-ui} .wrap{padding:12px} img{max-width:100%;height:auto;display:block;margin:0 auto}</style>
  </head><body><div class="wrap">
  <p style="font-size:12px;opacity:.7">${realKey}</p>
  <img alt="proof" src="data:${ctype};base64,${b64}" />
  </div></body></html>`;
          return new Response(html, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (e) {
          return new Response(JSON.stringify({ ok:false, error:String(e) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }

    return null;
  }

  return { handleFileRoutes };
}

export { createFileHandlers };
