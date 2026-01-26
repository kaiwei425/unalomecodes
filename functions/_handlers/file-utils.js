function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createFileUtils(deps){
  requireDeps(deps, ['withCORS', 'json'], 'file-utils.js');
  const { withCORS, json } = deps;

async function deleteR2FileByKey(key, env) {
  try {
    await env.R2_BUCKET.delete(key);
    return withCORS(json({ ok:true, key }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

async function deleteR2FileViaBody(request, env, bodyOverride) {
  try {
    const body = bodyOverride || await request.json();
    let key = body?.key;
    if (!key && body?.url) key = extractKeyFromProxyUrl(body.url);
    if (!key) return withCORS(json({ ok:false, error:"Missing key or url" }, 400));

    await env.R2_BUCKET.delete(key);
    return withCORS(json({ ok:true, key }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

function extractKeyFromProxyUrl(u) {
  try {
    const url = new URL(u);
    const m = url.pathname.match(/^\/api\/file\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : "";
  } catch { return ""; }
}

/* ========== R2 代理讀檔 ========== */
async function proxyR2File(key, env) {
  const obj = await env.R2_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status:404 });

  const headers = new Headers();
  const meta = obj.httpMetadata || {};
  if (meta.contentType) headers.set("Content-Type", meta.contentType);
  if (meta.contentDisposition) headers.set("Content-Disposition", meta.contentDisposition);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(obj.body, { headers });
}

/* ========== 工具 ========== */
// ==== Coupon Object Schema (Unified) ====
// 統一後端對優惠券物件的預期格式說明，方便後續所有 coupon 相關邏輯共用。
// 優惠券一般會儲存在 COUPONS / ORDERS KV 或由外部服務回傳時套用。
//
// {
//   code: string,            // 優惠券代碼，例如 UC-XZ-251112-HYHB-AWYV
//   deity: string,           // 對應守護神代碼，例如 XZ（同商品 deity）
//   amount: number,          // 單次折扣金額，例如 200
//   used: boolean,           // 是否已被使用（單次券為 true 即不可再用）
//   usedAt?: string,         // 使用時間（ISO 字串）
//   orderId?: string,        // 綁定使用此券的訂單編號
//   maxUseCount: number,     // 此券最多可使用幾次（單次券為 1）
//   remaining: number,       // 剩餘可使用次數（0 則代表已無法再次使用）
//   failed?: boolean,        // 本次檢查 / 兌換是否失敗
//   reason?: string          // 失敗原因，例如 already_used / invalid / deity_not_match 等
// }

  return {
    deleteR2FileByKey,
    deleteR2FileViaBody,
    extractKeyFromProxyUrl,
    proxyR2File
  };
}

export { createFileUtils };
