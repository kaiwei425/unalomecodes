function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createProductHandlers(deps){
  requireDeps(deps, ['isAdmin', 'getDeityCodeFromName', 'inferCategory', 'autoDeactivateExpiredItem', 'isLimitedExpired', 'withCorsOrigin', 'withCORS', 'json', 'normalizeProduct', 'normalizeLimitedUntil', 'pick'], 'products.js');
  const {
    isAdmin,
    getDeityCodeFromName,
    inferCategory,
    autoDeactivateExpiredItem,
    isLimitedExpired,
    withCorsOrigin,
    withCORS,
    json,
    normalizeProduct,
    normalizeLimitedUntil,
    pick
  } = deps;

  async function listProducts(request, url, env) {
    let active = url.searchParams.get("active");
    const category = url.searchParams.get("category");
    const isAdminUser = await isAdmin(request, env);
    if (!isAdminUser && active !== "true") active = "true";
    let ids = [];
    try{
      const indexRaw = await env.PRODUCTS.get("INDEX");
      ids = indexRaw ? JSON.parse(indexRaw) : [];
      if (!Array.isArray(ids)) ids = [];
    }catch(_){ ids = []; }
    const nowMs = Date.now();

    const items = [];
    for (const id of ids) {
      const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
      if (!raw) continue;
      const p = JSON.parse(raw);

      // --- FIX: Ensure deityCode exists for backward compatibility ---
      if (!p.deityCode && p.deity) {
        p.deityCode = getDeityCodeFromName(p.deity);
      }

      // 使用智慧分類函式來補全或修正舊資料的分類
      p.category = inferCategory(p);
      await autoDeactivateExpiredItem(env.PRODUCTS, p, `PRODUCT:${id}`, nowMs);
      if (active === "true" && p.active !== true) continue;
      if (active === "true" && isLimitedExpired(p, nowMs)) continue;
      // 分類篩選
      if (category && p.category !== category) continue;
      items.push(p);
    }
    return withCorsOrigin(json({ ok:true, items }), request, env);
  }

  async function createProduct(request, env) {
    try {
      const body = await request.json();
      if (!body || !body.name || !Array.isArray(body.images) || !body.images.length) {
        return withCORS(json({ ok:false, error:"Invalid payload" }, 400));
      }
      const id = body.id || crypto.randomUUID();
      const now = new Date().toISOString();

      // 確保 category 被傳入 normalizeProduct
      const product = normalizeProduct({ ...body, id, category: body.category }, now);
      await env.PRODUCTS.put(`PRODUCT:${id}`, JSON.stringify(product));

      const indexRaw = await env.PRODUCTS.get("INDEX");
      const ids = indexRaw ? JSON.parse(indexRaw) : [];
      if (!ids.includes(id)) {
        ids.unshift(id);
        await env.PRODUCTS.put("INDEX", JSON.stringify(ids));
      }
      return withCORS(json({ ok:true, id, product }));
    } catch (err) {
      return withCORS(json({ ok:false, error:String(err) }, 500));
    }
  }

  async function getProduct(id, env) {
    const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
    if (!raw) return withCORS(json({ ok:false, error:"Not found" }, 404));
    const product = JSON.parse(raw);
    await autoDeactivateExpiredItem(env.PRODUCTS, product, `PRODUCT:${id}`, Date.now());
    return withCORS(json({ ok:true, product }));
  }

  async function putProduct(id, request, env) {
    try {
      const body = await request.json();
      if (!body || !body.name || !Array.isArray(body.images) || !body.images.length) {
        return withCORS(json({ ok:false, error:"Invalid payload" }, 400));
      }
      const now = new Date().toISOString();
      // 確保 category 被傳入 normalizeProduct
      const product = normalizeProduct({ ...body, id, category: body.category }, now);
      await env.PRODUCTS.put(`PRODUCT:${id}`, JSON.stringify(product));

      const indexRaw = await env.PRODUCTS.get("INDEX");
      const ids = indexRaw ? JSON.parse(indexRaw) : [];
      if (!ids.includes(id)) {
        ids.unshift(id);
        await env.PRODUCTS.put("INDEX", JSON.stringify(ids));
      }
      return withCORS(json({ ok:true, product }));
    } catch (e) {
      return withCORS(json({ ok:false, error:String(e) }, 500));
    }
  }

  async function patchProduct(id, request, env) {
    try {
      const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
      if (!raw) return withCORS(json({ ok:false, error:"Not found" }, 404));
      const curr = JSON.parse(raw);
      const patch = await request.json();

      const next = {
        ...curr,
        ...pick(patch, ["name","deity","basePrice","sold","stock","description","active","instagram"]),
      };

      if (Array.isArray(patch.images)) {
        next.images = patch.images.map(String);
      }
      if (Array.isArray(patch.variants)) {
        next.variants = patch.variants.map(v => ({
          name: String(v.name || ""),
          priceDiff: Number(v.priceDiff ?? 0),
          stock: Number(v.stock ?? 0)
        }));
      }
      // 若 patch 有 category，則覆蓋
      if (typeof patch.category !== "undefined") {
        next.category = String(patch.category);
      }
      if (Object.prototype.hasOwnProperty.call(patch, "limitedUntil")) {
        next.limitedUntil = normalizeLimitedUntil(patch.limitedUntil);
      }

      next.updatedAt = new Date().toISOString();
      await env.PRODUCTS.put(`PRODUCT:${id}`, JSON.stringify(next));

      const indexRaw = await env.PRODUCTS.get("INDEX");
      const ids = indexRaw ? JSON.parse(indexRaw) : [];
      if (!ids.includes(id)) {
        ids.unshift(id);
        await env.PRODUCTS.put("INDEX", JSON.stringify(ids));
      }

      return withCORS(json({ ok:true, product: next }));
    } catch (e) {
      return withCORS(json({ ok:false, error:String(e) }, 500));
    }
  }

  async function deleteProduct(id, env) {
    try {
      await env.PRODUCTS.delete(`PRODUCT:${id}`);
      const indexRaw = await env.PRODUCTS.get("INDEX");
      const ids = indexRaw ? JSON.parse(indexRaw) : [];
      const next = ids.filter(x => x !== id);
      await env.PRODUCTS.put("INDEX", JSON.stringify(next));
      return withCORS(json({ ok:true, id }));
    } catch (e) {
      return withCORS(json({ ok:false, error:String(e) }, 500));
    }
  }

  return {
    listProducts,
    createProduct,
    getProduct,
    putProduct,
    patchProduct,
    deleteProduct
  };
}

export { createProductHandlers };
