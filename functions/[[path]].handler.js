// functions/[[path]].handler.js
// 標準化所有樣式來源：於表單頁面載入時呼叫，統一欄位樣式，避免多重 CSS 衝突
function resetFormStyles() {
  const style = document.createElement('style');
  style.textContent = `
    form * {
      box-sizing: border-box !important;
      font-family: inherit !important;
      font-size: 16px !important;
      line-height: 1.5 !important;
      margin: 0 !important;
      padding: 6px 10px !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    input, textarea, select {
      display: block !important;
      border: 1px solid #ccc !important;
      border-radius: 6px !important;
      background: #fff !important;
    }
  `;
  document.head.appendChild(style);
}
const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key',
  'Cache-Control': 'no-store'
};

const ORDER_INDEX_KEY = 'ORDER_INDEX';

// === Coupon Service config ===
function getCouponAPI(env){
  // Prefer env.COUPON_API_BASE, fallback to your workers.dev
  const base = (env && env.COUPON_API_BASE) ? String(env.COUPON_API_BASE).trim() : "https://coupon-service.kaiwei425.workers.dev";
  return /\/$/.test(base) ? base.slice(0,-1) : base;
}
async function redeemCoupon(env, { code, deity, orderId }){
  const api = getCouponAPI(env);
  if (!code) return { ok:false, reason:"missing_code" };
  try{
    const resp = await fetch(api + "/redeem", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // SHOP_SHARED_TOKEN must be configured in this Worker (Variables → Secret)
        "x-shop-token": String(env.SHOP_SHARED_TOKEN || "")
      },
      body: JSON.stringify({ code: String(code||"").toUpperCase(), deity: String(deity||"").toUpperCase(), orderId: orderId ? String(orderId) : undefined })
    });
    const j = await resp.json().catch(()=>({ ok:false }));
    if (!j || !j.ok) return { ok:false, reason: (j && (j.reason||j.error)) || "redeem_failed" };
    return { ok:true, amount: Number(j.amount||200)||200, deity: String(j.deity||"").toUpperCase() };
  }catch(e){
    return { ok:false, reason: "fetch_error" };
  }
}

async function generateOrderId(env){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const prefix = `${y}${m}${d}`;
  const seqKey = `ORDER_SEQ_${prefix}`;
  let seqRaw = await env.ORDERS.get(seqKey);
  let seq = Number(seqRaw || 0) || 0;
  seq += 1;
  await env.ORDERS.put(seqKey, String(seq));
  const tail = String(seq).padStart(5,'0'); // 00001
  return prefix + tail; // e.g. 2025103000001
}

// Generate a public-share token for ritual results
function makeToken(len=32){
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues){
    const buf = new Uint8Array(len);
    crypto.getRandomValues(buf);
    for (let i=0;i<len;i++) s += abc[buf[i] % abc.length];
    return s;
  }
  for (let i=0;i<len;i++) s += abc[Math.floor(Math.random()*abc.length)];
  return s;
}

// === Helper: unified proof retriever (R2 first, then KV) ===
async function getProofFromStore(env, rawKey) {
  const k = String(rawKey || '');
  if (!k) return null;

  // 1. Try exact or decoded key from R2 bucket
  const tryKeys = [k];
  try { tryKeys.push(decodeURIComponent(k)); } catch {}
  for (const key of tryKeys) {
    try {
      const obj = await env.R2_BUCKET.get(key);
      if (obj) {
        const bin = await obj.arrayBuffer();
        const contentType = (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg';
        return { source: 'r2', key, bin, metadata: { contentType } };
      }
    } catch (e) {
      console.log('R2 get failed for', key, e);
    }
  }

  // 2. Fallback: try KV (RECEIPTS)
  try {
    const res = env.RECEIPTS.getWithMetadata
      ? await env.RECEIPTS.getWithMetadata(k)
      : { value: await env.RECEIPTS.get(k, { type: 'arrayBuffer' }), metadata: {} };
    const bin = res && res.value;
    if (bin instanceof ArrayBuffer || (bin && typeof bin.byteLength === 'number')) {
      return { source: 'kv', key: k, bin, metadata: res.metadata || {} };
    }
  } catch (e) {
    console.log('KV get failed for', k, e);
  }

  return null;
}

export async function onRequest(context) {
  // The context object contains request, env, and other properties.
  // We can destructure it to get what we need.
  const { request, env, next } = context;

  const url = new URL(request.url);
    /*__CVS_CALLBACK_MERGE_FINAL__*/
    try{
      const _u = new URL(request.url);
      if (_u.pathname === "/cvs_callback" && (request.method === "GET" || request.method === "POST")) {
        let source;
        if (request.method === "POST") {
          source = await request.formData();
        } else { // GET
          source = _u.searchParams;
        }

        const pick = (src, ...keys) => {
          for (const k of keys) {
            const v = src.get(k);
            if (v) return String(v);
          }
          return "";
        };

        const data = {
          __cvs_store__: true,
          storeid:   pick(source, "storeid", "StoreId", "stCode", "code", "store"),
          storename: pick(source, "storename", "StoreName", "stName", "name"),
          storeaddress: pick(source, "storeaddress", "StoreAddress", "address", "Addr"),
          storetel: pick(source, "storetel", "StoreTel", "tel", "TEL")
        };
        const dataJson = JSON.stringify(data);

        const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>處理中...</title></head>
<body>
  <p>已選擇門市，正在返回...</p>
  <script>
    (function(){
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(${dataJson}, "*");
        }
      } catch(e) { console.error(e); }
      try { window.close(); } catch(e) {}
    })();
  </script>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
    }catch(e){ /* ignore and continue */ }
    
    
const { pathname, origin } = url;

    // =================================================================
    //  主要 API 路由 (提前處理，避免被 fallback 攔截)
    // =================================================================

    // 商品列表 / 新增
  if ((pathname === "/api/products" || pathname === "/products") && request.method === "GET") {
    return listProducts(url, env);
  }
  if (pathname === "/api/products" && request.method === "POST") {
    return createProduct(request, env);
  }

    // 商品單筆
    const prodIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/) || pathname.match(/^\/products\/([^/]+)$/);
    if (prodIdMatch) {
      const id = decodeURIComponent(prodIdMatch[1]);
      if (request.method === "GET")   return getProduct(id, env);
      if (request.method === "PUT")   return putProduct(id, request, env);
      if (request.method === "PATCH") return patchProduct(id, request, env);
      if (request.method === "DELETE") return deleteProduct(id, env);
    }
// ======== Bank Transfer Additions (non-breaking) ========
if (request.method === 'OPTIONS' && (pathname === '/api/payment/bank' || pathname === '/api/order/confirm-transfer')) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key',
      'Cache-Control': 'no-store'
    }
  });
}

function __headersJSON__() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key',
    'Cache-Control': 'no-store'
  };
}

if (pathname === '/api/order/store-select' && request.method === 'POST') {
  try {
    const body = await request.json();
    const store = String(body.store || body.storeid || body.storeId || '').trim();
    if (!store) {
      return new Response(
        JSON.stringify({ ok:false, error:'Missing store' }),
        { status:400, headers: jsonHeaders }
      );
    }
    // 目前僅回傳門市資訊；未來若要綁暫存訂單，可在此處擴充
    return new Response(
      JSON.stringify({ ok:true, store }),
      { status:200, headers: jsonHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok:false, error:String(e) }),
      { status:500, headers: jsonHeaders }
    );
  }
}

if (pathname === '/api/payment/bank' && request.method === 'POST') {

  // ==== PATCH MARKER START: BANK_PAYMENT_HANDLER (for coupon block replacement) ====
  
  
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  try {
    // Accept JSON or FormData
    let body = {};
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      body = await request.json();
      if (body && body.remark && !body.note) body.note = String(body.remark);
      if (body && body.buyer_note && !body.note) body.note = String(body.buyer_note);
    } else {
      const fd = await request.formData();
      // DEBUG holder for receipt upload info
      let __dbg_proof_info = null;
      // === Save uploaded proof into R2 (preferred) ===
      let __receipt_url_from_file = "";
      try {
        const f = fd.get('proof') || fd.get('receipt') || fd.get('upload') || fd.get('file') || fd.get('screenshot');
        if (f && typeof f !== 'string' && (f.stream || f.arrayBuffer)) {
          const day = new Date();
          const y = day.getFullYear();
          const m = String(day.getMonth()+1).padStart(2,'0');
          const d = String(day.getDate()).padStart(2,'0');
          // normalize ext & content type
          const ext0 = (f.type && f.type.split('/')[1]) || (safeExt(f.name) || 'jpg');
          const ext = ext0 === 'jpeg' ? 'jpg' : ext0;
          const key = `receipts/${y}${m}${d}/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;

          // Prefer streaming to R2 to avoid memory spikes, fallback to arrayBuffer
          if (typeof f.stream === 'function') {
            await env.R2_BUCKET.put(key, f.stream(), {
              httpMetadata: { contentType: f.type || 'image/jpeg', contentDisposition: 'inline' }
            });
          } else {
            const buf = await f.arrayBuffer();
            const size = buf ? buf.byteLength : 0;
            if (!size) {
              return new Response(
                JSON.stringify({ ok:false, error:'Empty file uploaded，請改傳 JPG/PNG 或重新選擇檔案' }),
                { status:400, headers: jsonHeaders }
              );
            }
            await env.R2_BUCKET.put(key, buf, {
              httpMetadata: { contentType: f.type || 'image/jpeg', contentDisposition: 'inline' }
            });
          }

          const originUrl = new URL(request.url).origin;
          // 重要：仍維持 /api/proof/<key> 一致給後台使用（/api/proof 會先讀 R2）
          __receipt_url_from_file = `${originUrl}/api/proof/${encodeURIComponent(key)}`;
        }
      } catch {}

      // === Save ritual photo (for candle ritual) into R2, optional ===
      let __ritual_photo_url_from_file = "";
      try {
        const rf = fd.get('ritual_photo') || fd.get('candle_photo') || fd.get('photo');
        if (rf && typeof rf !== 'string' && (rf.stream || rf.arrayBuffer)) {
          const day2 = new Date();
          const y2 = day2.getFullYear();
          const m2 = String(day2.getMonth()+1).padStart(2,'0');
          const d2 = String(day2.getDate()).padStart(2,'0');
          const ext0b = (rf.type && rf.type.split('/')[1]) || (safeExt(rf.name) || 'jpg');
          const extb = ext0b === 'jpeg' ? 'jpg' : ext0b;
          const rkey = `rituals/${y2}${m2}${d2}/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extb}`;

          if (typeof rf.stream === 'function') {
            await env.R2_BUCKET.put(rkey, rf.stream(), {
              httpMetadata: { contentType: rf.type || 'image/jpeg', contentDisposition: 'inline' }
            });
          } else {
            const rbuf = await rf.arrayBuffer();
            if (!rbuf || !rbuf.byteLength) {
              // ignore empty ritual photo
            } else {
              await env.R2_BUCKET.put(rkey, rbuf, {
                httpMetadata: { contentType: rf.type || 'image/jpeg', contentDisposition: 'inline' }
              });
            }
          }
          const originUrl2 = new URL(request.url).origin;
          __ritual_photo_url_from_file = `${originUrl2}/api/proof/${encodeURIComponent(rkey)}`;
        }
      } catch {}

      // Convert FormData to plain object; File -> keep filename only
      body = Object.fromEntries(
        Array.from(fd.entries()).map(([k, v]) => [k, (v && typeof v === 'object' && 'name' in v) ? v.name : String(v)])
      );
      if (__receipt_url_from_file) {
        // Always prefer the KV-served URL to avoid using a bare filename
        body.receiptUrl = __receipt_url_from_file;
        body.receipt = __receipt_url_from_file;
      }
      if (__ritual_photo_url_from_file) {
        body.ritual_photo_url = __ritual_photo_url_from_file;
      }
      // Normalize note/remark from form fields
      if (!body.note && body.remark) body.note = String(body.remark);
      if (!body.note && body.buyer_note) body.note = String(body.buyer_note);
      // DEBUG: final receiptUrl that will be saved on order
      if (body && body.receiptUrl) {
        console.log('[RECEIPT_URL]', body.receiptUrl, __dbg_proof_info);
      }
      // Parse cart JSON if provided
      if (typeof body.cart === 'string') {
        try { body.cart = JSON.parse(body.cart); } catch {}
      }
      // Flat fields -> buyer
      const b = body.buyer && typeof body.buyer === 'object' ? body.buyer : {};
      body.buyer = {
        name:  String(b.name  ?? body.name  ?? body.buyer_name  ?? body.bfName    ?? ''),
        email: String(b.email ?? body.email ?? body.buyer_email ?? body.bfEmail   ?? ''),
        line:  String(b.line  ?? body.line  ?? body.buyer_line  ?? ''),
        phone: String(b.phone ?? body.phone ?? body.contact ?? body.buyer_phone ?? body.bfContact ?? ''),
        store: String(b.store ?? body.store ?? body.buyer_store ?? body.storeid   ?? '')
      };
      if (!body.transferLast5 && body.last5) body.transferLast5 = String(body.last5);
    }

    // ---- source detection: cart vs direct-buy (do not mix) ----
    function isTruthy(x){ return x === true || x === 1 || x === '1' || x === 'true' || x === 'yes' || x === 'on'; }
    const hintMode   = (body.mode || '').toLowerCase();           // 'cart' | 'direct' (if provided)
    const directHint = isTruthy(body.directBuy) || isTruthy(body.single) || hintMode === 'direct';
    const hasCart    = Array.isArray(body.cart) && body.cart.length > 0;
    const cartHint   = hasCart && (isTruthy(body.fromCart) || isTruthy(body.useCart) || hintMode === 'cart');

    // 一律直購優先（只要有 productId 就當 direct），除非明確宣告 mode='cart'
    const preferDirect = (hintMode !== 'cart') && (directHint || !!body.productId);
    const useCartOnly  = !preferDirect && cartHint;

    // Build items strictly from cart if we are in cart-mode；直購模式強制忽略 cart
    let items = [];
    if (useCartOnly) {
      const cartArr = Array.isArray(body.cart) ? body.cart : [];
      items = cartArr.map(it => ({
        productId:   String(it.id || it.productId || ''),
        productName: String(it.name || it.title || it.productName || '商品'),
        deity:       String(it.deity || ''),
        variantName: String(it.variantName || it.variant || ''),
        price:       Number(it.price ?? it.unitPrice ?? 0),
        qty:         Math.max(1, Number(it.qty ?? it.quantity ?? 1)),
        image:       String(it.image || '')
      }));
    } else {
      // 直購模式不使用 cart 內容，但也不要去清空 body.cart，避免影響其他邏輯
      items = [];
    }

    // Fallback single-product fields（direct-buy 用）；cart 模式下不套用單品欄位
    let productId   = useCartOnly ? '' : String(body.productId || '');
    let productName = useCartOnly ? '' : String(body.productName || '');
    let price       = useCartOnly ? 0  : Number(body.price ?? 0);
    let qty         = useCartOnly ? 0  : Number(body.qty   ?? 1);
    let deity       = useCartOnly ? '' : String(body.deity || '');
    let variantName = useCartOnly ? '' : String(body.variantName || '');

    // 若是 cart 模式，單品欄位由購物車彙總；若是 direct 模式，保持單品不動
    if (useCartOnly && items.length) {
      const total = items.reduce((s, it) => s + (Number(it.price||0) * Math.max(1, Number(it.qty||1))), 0);
      const totalQty = items.reduce((s, it) => s + Math.max(1, Number(it.qty||1)), 0);
      productId   = items[0].productId || 'CART';
      productName = items[0].productName || `購物車共 ${items.length} 項`;
      price = total;
      qty = totalQty;
      deity = items[0].deity || '';
      variantName = items[0].variantName || '';
    }

    const buyer = {
      name:  String((body?.buyer?.name)  || body?.name  || body?.buyer_name  || body?.bfName    || ''),
      email: String((body?.buyer?.email) || body?.email || body?.buyer_email || body?.bfEmail   || ''),
      line:  String((body?.buyer?.line)  || body?.line  || body?.buyer_line  || ''),
      phone: String((body?.buyer?.phone) || body?.phone || body?.contact || body?.buyer_phone || body?.bfContact || ''),
      store: String((body?.buyer?.store) || body?.store || body?.buyer_store || body?.storeid   || '')
    };
    const transferLast5 = String(body?.transferLast5 || body?.last5 || body?.bfLast5 || '').trim();
    const receiptUrl = (() => {
      let u = body?.receiptUrl || body?.receipt || body?.proof || body?.proofUrl || body?.screenshot || body?.upload || '';
      if (u && !/^https?:\/\//i.test(u) && !u.startsWith(origin)) u = `${origin}/api/proof/${encodeURIComponent(u)}`;
      return String(u);
    })();
    const noteVal = String(
      body?.note ??
      body?.remark ??
      body?.buyer?.note ??
      body?.buyer_note ??
      body?.bfNote ??
      ''
    ).trim();
    if ((!productId || !productName) && !items.length) {
      // Graceful fallback: create a minimal bank transfer order
      productId = 'BANK';
      productName = '匯款通知';
      price = Number(body.amount ?? 0);
      qty = 1;
    }

    // Compute order amount (server-trust: always從商品金額重新計算，只有在沒有商品資訊時才吃 body.amount)
    let amount = 0;
    if (Array.isArray(items) && items.length) {
      // 購物車模式：所有品項小計相加
      amount = items.reduce((s, it) => {
        const unit = Number(it.price ?? it.unitPrice ?? 0) || 0;
        const q    = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
        return s + unit * q;
      }, 0);
    } else if (productId || productName) {
      // 單品模式：單價 * 數量
      amount = Number(price || 0) * Math.max(1, Number(qty || 1));
    } else {
      // 純匯款通知或無商品資訊時，才使用前端傳入的 amount
      amount = Number(body.amount || 0) || 0;
    }

    // New order id (YYYYMMDD + 5-digit sequence) – generated early so coupon redeem can bind to this order
    const newId = await generateOrderId(env);

    // === Coupon (optional): server-verified discount, bound to this order ===
    const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
    let couponDeity   = String(body.coupon_deity || body.deity || "").trim().toUpperCase();
    if (!couponDeity && items.length) {
      // 若購物車只有單一守護神，推論其代碼；多種則留空交由券服務驗證 eligible
      const set = new Set(items.map(it => String(it.deity||'').toUpperCase()).filter(Boolean));
      couponDeity = (set.size === 1) ? Array.from(set)[0] : '';
    }
    let couponApplied = null;

    if (couponCode) {
      if (Array.isArray(items) && items.length) {
        // cart 模式：使用 computeServerDiscount，一張券配一個商品
        const couponInputs = [{ code: couponCode, deity: couponDeity }];
        try {
          const discInfo = await computeServerDiscount(env, items, couponInputs, newId);
          const totalDisc = Math.max(0, Number(discInfo?.total || 0));
          if (totalDisc > 0) {
            // 檢查此優惠券是否已被其他訂單使用過，避免重複折抵
            const lock = await markCouponUsageOnce(env, couponCode, newId);
            if (!lock.ok) {
              couponApplied = {
                code: couponCode,
                deity: couponDeity,
                failed: true,
                reason: lock.reason || 'already_used'
              };
            } else {
              amount = Math.max(0, Number(amount || 0) - totalDisc);
              couponApplied = {
                code: couponCode,
                deity: couponDeity,
                discount: totalDisc,
                redeemedAt: Date.now(),
                lines: Array.isArray(discInfo.lines) ? discInfo.lines : []
              };
            }
          } else {
            couponApplied = { code: couponCode, deity: couponDeity, failed: true, reason: 'invalid_or_not_applicable' };
          }
        } catch (e) {
          console.error('computeServerDiscount error', e);
          couponApplied = { code: couponCode, deity: couponDeity, failed: true, reason: 'error' };
        }
      } else {
        // direct-buy / 單品模式：使用 redeemCoupon 綁定到此 orderId
        try {
          const r = await redeemCoupon(env, { code: couponCode, deity: couponDeity, orderId: newId });
          if (r && r.ok) {
            // 檢查此優惠券是否已被其他訂單使用過，避免重複折抵
            const lock = await markCouponUsageOnce(env, couponCode, newId);
            if (!lock.ok) {
              couponApplied = {
                code: couponCode,
                deity: couponDeity,
                failed: true,
                reason: lock.reason || 'already_used'
              };
            } else {
              const disc = Math.max(0, Number(r.amount || 200) || 200);
              amount = Math.max(0, Number(amount || 0) - disc);
              couponApplied = { code: couponCode, deity: r.deity || couponDeity, discount: disc, redeemedAt: Date.now() };
            }
          } else {
            couponApplied = { code: couponCode, deity: couponDeity, failed: true, reason: (r && r.reason) || 'invalid' };
          }
        } catch (e) {
          console.error('redeemCoupon error', e);
          couponApplied = { code: couponCode, deity: couponDeity, failed: true, reason: 'error' };
        }
      }
    }

    // Optional candle ritual metadata
    const ritualNameEn   = String(body.ritual_name_en || body.ritualNameEn || body.candle_name_en || '').trim();
    const ritualBirthday = String(body.ritual_birthday || body.ritualBirthday || body.candle_birthday || '').trim();
    const ritualPhotoUrl = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
    const extra = {};
    if (ritualNameEn || ritualBirthday || ritualPhotoUrl) {
      extra.candle = {
        nameEn: ritualNameEn || undefined,
        birthday: ritualBirthday || undefined,
        photoUrl: ritualPhotoUrl || undefined
      };
    }

    const now = new Date().toISOString();
    const order = {
      id: newId,
      productId, productName, price, qty,
      deity, variantName,
      items: useCartOnly && items.length ? items : undefined,
      method: '轉帳匯款',
      buyer, transferLast5, receiptUrl,
      note: noteVal,
      amount,
      status: 'pending',
      createdAt: now, updatedAt: now,
      ritual_photo_url: ritualPhotoUrl || undefined,
      ritualPhotoUrl: ritualPhotoUrl || undefined,
      resultToken: makeToken(32),
      results: [],
      coupon: couponApplied || undefined,
      ...(Object.keys(extra).length ? { extra } : {})
    };

    await env.ORDERS.put(order.id, JSON.stringify(order));
    const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
    let ids = [];
    if (idxRaw) {
      try {
        const parsed = JSON.parse(idxRaw);
        if (Array.isArray(parsed)) ids = parsed;
      } catch (e) {
        // Index is corrupted, start a new one.
      }
    }
    ids.unshift(order.id);
    if (ids.length > 1000) ids.length = 1000;
    await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));

    // Auto-increment product sold counters
    try { await bumpSoldCounters(env, items, productId, qty); } catch(_){}
    // Decrement inventory (variants 或 product-level)
    try { await decStockCounters(env, items, productId, (body.variantName||body.variant||''), qty); } catch(_){}

    return new Response(JSON.stringify({ ok:true, id: order.id, order }), { status:200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }

}

if (pathname === '/api/order/confirm-transfer' && request.method === 'POST') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: __headersJSON__() });
  }
  try {
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: __headersJSON__() });
    const raw = await env.ORDERS.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: __headersJSON__() });
    const obj = JSON.parse(raw);
    obj.transferLast5 = String(body.transferLast5 || obj.transferLast5 || '');
    
    obj.receiptUrl = String(body.receipt || body.receiptUrl || body.proof || body.proofUrl || body.screenshot || body.upload || obj.receiptUrl || '');
    if (obj.receiptUrl && !/^https?:\/\//i.test(obj.receiptUrl) && !obj.receiptUrl.startsWith(origin)) {
      obj.receiptUrl = `${origin}/api/proof/${encodeURIComponent(obj.receiptUrl)}`;
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
    const rPhoto = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
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
    obj.status = 'waiting_verify';
    obj.updatedAt = new Date().toISOString();
    await env.ORDERS.put(id, JSON.stringify(obj));
    return new Response(JSON.stringify({ ok:true, order: obj }), { status:200, headers: __headersJSON__() });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: __headersJSON__() });
  }
}
// ======== End of Bank Transfer Additions ========


// 檢查優惠券是否可用（只檢查，不鎖券、不扣次數）
if (pathname === '/api/coupons/check' && request.method === 'POST') {
  try {
    const body = await request.json().catch(() => ({}));

    const codeRaw  = body.coupon || body.couponCode || body.code;
    const deityRaw = body.coupon_deity || body.deity || '';

    const code  = String(codeRaw  || '').trim().toUpperCase();
    const deity = String(deityRaw || '').trim().toUpperCase();

    if (!code) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing coupon code' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!env.ORDERS) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ORDERS KV not bound' }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Step 1：先看這張券有沒有被任何訂單用過（COUPON_USED:<CODE>）
    const lockKey = `COUPON_USED:${code}`;
    const existing = await env.ORDERS.get(lockKey);
    if (existing) {
      let parsed = null;
      try { parsed = JSON.parse(existing); } catch {}
      return new Response(
        JSON.stringify({
          ok: false,
          code,
          deity,
          used: true,
          reason: 'already_used',
          usage: parsed || null
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Step 2：沒被用過 → 呼叫 redeemCoupon 做資格檢查（不佔用）
    let result;
    try {
      // orderId 用固定 '__CHECK__' 表示僅檢查，不綁定實際訂單
      result = await redeemCoupon(env, { code, deity, orderId: '__CHECK__' });
    } catch (e) {
      console.error('redeemCoupon /api/coupons/check error', e);
      return new Response(
        JSON.stringify({
          ok: false,
          code,
          deity,
          reason: 'error'
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    if (!result || !result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          code,
          deity,
          reason: (result && result.reason) || 'invalid'
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const amount = Math.max(0, Number(result.amount || 200) || 200);

    return new Response(
      JSON.stringify({
        ok: true,
        valid: true,
        code,
        deity: result.deity || deity,
        amount
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
}

// === Simple FX proxy (THB -> target currency) with fallbacks ===
if (pathname === "/api/fx" && request.method === "GET") {
  try {
    const base = (url.searchParams.get("base") || "THB").toUpperCase();
    const symbol = (url.searchParams.get("symbol") || url.searchParams.get("symbols") || "TWD").toUpperCase();
    const sources = [
      {
        url: `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbol)}`,
        pick: (j)=> j && j.rates && j.rates[symbol]
      },
      {
        url: `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`,
        pick: (j)=> j && j.rates && j.rates[symbol]
      }
    ];
    let rate = null;
    let raw = null;
    for (const s of sources){
      try{
        const r = await fetch(s.url);
        raw = await r.text();
        if (!r.ok) continue;
        const j = JSON.parse(raw);
        const val = s.pick(j);
        if (val) { rate = Number(val); break; }
      }catch(_){}
    }
    const headers = { ...jsonHeaders, 'Access-Control-Allow-Origin':'*', 'Cache-Control':'no-store' };
    if (!rate) {
      return new Response(JSON.stringify({ ok:false, error:"RATE_NOT_FOUND", base, symbol }), { status:502, headers });
    }
    return new Response(JSON.stringify({ ok:true, base, symbol, rate, rates:{ [symbol]: rate } }), { status:200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers:{...jsonHeaders,'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'} });
  }
}

// Proxy coupon issue to coupon service to bypass browser CORS
if (pathname === '/api/coupons/issue' && request.method === 'POST') {
  try {
    const body = await request.json().catch(() => ({}));
    const deity  = String(body.deity || body.code || '').trim().toUpperCase();
    const amount = Number(body.amount || 200) || 200;
    const token  = String(body.quizToken || body.token || body['x-quiz-token'] || '').trim();
    if (!deity) {
      return new Response(JSON.stringify({ ok:false, error:'Missing deity' }), { status:400, headers: jsonHeaders });
    }
    const api = getCouponAPI(env);
    const headers = { 'content-type':'application/json' };
    if (token) headers['X-Quiz-Token'] = token;
    const upstream = await fetch(`${api}/issue`, {
      method:'POST',
      headers,
      body: JSON.stringify({ deity, amount })
    });
    const text = await upstream.text();
    const resHeaders = { ...jsonHeaders };
    // override to allow browser access
    resHeaders['Access-Control-Allow-Origin'] = '*';
    return new Response(text, { status: upstream.status, headers: resHeaders });
  } catch (e) {
    const resHeaders = { ...jsonHeaders, 'Access-Control-Allow-Origin':'*' };
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: resHeaders });
  }
}

// ======== Coupon one-time usage lock (per code) ========
async function markCouponUsageOnce(env, code, orderId) {
  const c = (code || "").toUpperCase().trim();
  if (!c) return { ok: false, reason: "missing_code" };
  if (!env.ORDERS) return { ok: false, reason: "ORDERS_not_bound" };

  const key = `COUPON_USED:${c}`;
  try {
    const existing = await env.ORDERS.get(key);
    if (existing) {
      let parsed = null;
      try { parsed = JSON.parse(existing); } catch {}
      return { ok: false, reason: "already_used", existing: parsed || null };
    }
    const payload = { code: c, orderId: String(orderId || ""), ts: new Date().toISOString() };
    await env.ORDERS.put(key, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    console.error("markCouponUsageOnce error", e);
    return { ok: false, reason: "error" };
  }
}

// ======== Coupon/Discount helpers (NEW: one coupon per item, allow multiple same deity) ========
/**
 * 計算優惠券折扣（新版：每個商品一張券，允許同神祇多商品分開用券）
 * @param {*} env
 * @param {Array} items 商品陣列
 * @param {Array} couponInputs [{ code, deity }]
 * @param {string} orderId
 * @returns {Promise<{total: number, lines: Array<{code, amount, productId}>}>}
 */
async function computeServerDiscount(env, items, couponInputs, orderId) {
  const FIXED = 200;
  const usedIdx = new Set();
  const results = [];
  let total = 0;

  for (const c of (couponInputs || [])) {
    const code = (c.code || '').toUpperCase();
    const deity = (c.deity || '').toUpperCase();
    if (!code) continue;

    try {
      const r = await redeemCoupon(env, { code, deity, orderId });
      if (!r.ok) continue;

      // 找出第一個還沒用過的商品
      const targetIdx = items.findIndex((it, i) => !usedIdx.has(i));
      if (targetIdx === -1) continue;
      const target = items[targetIdx];

      const discountAmount = Math.min(Number(r.amount || FIXED), Number(target.price || 0));
      total += discountAmount;
      usedIdx.add(targetIdx);

      results.push({
        code,
        amount: discountAmount,
        productId: target.productId || target.id || null
      });
    } catch (e) {
      console.error('discount error', e);
      continue;
    }
  }

  return { total, lines: results };
}

/* ========== CSV helpers ========== */
function csvEscape(v) {
  const s = (v === undefined || v === null) ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function orderAmount(o){
  if (typeof o?.amount === 'number' && !Number.isNaN(o.amount)) return o.amount;
  if (Array.isArray(o?.items) && o.items.length){
    return o.items.reduce((s,it)=> s + (Number(it.price||0) * Math.max(1, Number(it.qty||1))), 0);
  }
  return Number(o?.price||0) * Math.max(1, Number(o?.qty||1));
}
function orderItemsSummary(o){
  if (Array.isArray(o?.items) && o.items.length){
    return o.items.map(it => {
      const vn = it.variantName ? `（${it.variantName}）` : '';
      return `${it.productName||""}${vn}×${Math.max(1, Number(it.qty||1))}`;
    }).join(" / ");
  }
  const name = o?.productName || "";
  const vn = o?.variantName ? `（${o.variantName}）` : '';
  const q = Math.max(1, Number(o?.qty||1));
  return `${name}${vn}×${q}`;
}
function normalizeReceiptUrl(o, origin){
  let u = o?.receiptUrl || o?.receipt || "";
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith(origin)) return u;
  return `${origin}/api/proof/${encodeURIComponent(u)}`;
}
// --- 訂單 API：/api/order /api/order/status ---
// CORS/預檢
if (request.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key',
      'Cache-Control': 'no-store'
    }
  });
}

// 7-11 門市 callback：將選取的門市資訊回傳給 opener 視窗（shop.html）
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
        if (window.opener && !window.opener.closed){
          window.opener.postMessage(data, "*");
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
        if (window.opener && !window.opener.closed){
          window.opener.postMessage(data, "*");
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

// Back-compat alias: GET /api/orders and /api/orders/lookup -> { ok:true, orders:[...] }
if ((pathname === '/api/orders' || pathname === '/api/orders/lookup') && request.method === 'GET') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  const qPhoneRaw = getAny(url.searchParams, ['phone','mobile','contact','tel','qPhone','qP']);
  const qLast5Raw = getAny(url.searchParams, ['last5','last','l5','code','transferLast5','bankLast5','qLast5']);
  const qPhone = normalizePhone(qPhoneRaw);
  const qLast5 = (String(qLast5Raw).replace(/\D/g, '') || '').slice(-5);
  const needFilter = !!(qPhone && qLast5);
  const isPartialLookup = !!(qPhone || qLast5) && !needFilter;

  if (isPartialLookup) {
    // If only one of the two is provided, return empty list, as per user request to require both.
    return new Response(JSON.stringify({ ok:true, orders: [] }), { status:200, headers: jsonHeaders });
  }
  try {
    const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const out = [];
    for (const oid of ids.slice(0, limit)) {
      const raw = await env.ORDERS.get(oid);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        // Multi-candidate tolerant filtering
        const phoneCandidates = [
          obj?.buyer?.phone, obj?.buyer?.contact, obj?.phone, obj?.contact, obj?.recipientPhone
        ].filter(Boolean);
        const last5Candidates = [
          obj?.transferLast5, obj?.last5, obj?.payment?.last5, obj?.bank?.last5
        ].filter(Boolean);

        if (needFilter) {
          const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
          const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
          if (!pOK || !lOK) continue;
        }
        (()=>{
          const rec = normalizeReceiptUrl(obj, origin);
          const ritualUrl =
            obj.ritualPhotoUrl ||
            obj.ritual_photo_url ||
            (obj?.extra?.candle?.photoUrl || "");
          const merged = Object.assign({ id: oid }, obj, {
            receiptUrl: rec || "",
            proofUrl: rec || "",
            ritualPhotoUrl: ritualUrl || "",
            ritualPhoto: ritualUrl || ""
          });
          out.push(merged);
        })();
      } catch {}
    }
    // Fallback: rebuild from KV if INDEX empty (scan ORDERS KV)
    if (!ids.length && env.ORDERS?.list) {
      try {
        const l = await env.ORDERS.list(); // list ALL keys
        const allKeys = Array.isArray(l.keys) ? l.keys.map(k => k.name) : [];
        // Keep only 13-digit numeric IDs, exclude INDEX / ORDER_SEQ_*
        const discovered = allKeys.filter(name => /^\d{13}$/.test(name));
        // newest first (IDs are YYYYMMDD + seq)
        discovered.sort().reverse();

        // Build response
        for (const oid of discovered.slice(0, limit)) {
          const raw2 = await env.ORDERS.get(oid);
          if (!raw2) continue;
          try {
            const obj2 = JSON.parse(raw2);
            const phoneCandidates = [
              obj2?.buyer?.phone, obj2?.buyer?.contact, obj2?.phone, obj2?.contact, obj2?.recipientPhone
            ].filter(Boolean);
            const last5Candidates = [
              obj2?.transferLast5, obj2?.last5, obj2?.payment?.last5, obj2?.bank?.last5
            ].filter(Boolean);

            if (needFilter) {
              if (qPhone) {
                const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
                if (!pOK) continue;
              }
              if (qLast5) {
                const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
                if (!lOK) continue;
              }
            }
            (()=>{
              const rec2 = normalizeReceiptUrl(obj2, origin);
              const ritualUrl2 =
                obj2.ritualPhotoUrl ||
                obj2.ritual_photo_url ||
                (obj2?.extra?.candle?.photoUrl || "");
              const merged2 = Object.assign({ id: oid }, obj2, {
                receiptUrl: rec2 || "",
                proofUrl: rec2 || "",
                ritualPhotoUrl: ritualUrl2 || "",
                ritualPhoto: ritualUrl2 || ""
              });
              out.push(merged2);
            })();
          } catch {}
        }

        // Rebuild INDEX for future fast loads
        if (!idxRaw && discovered.length) {
          await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(discovered.slice(0, 1000)));
        }
      } catch {}
    }
    return new Response(JSON.stringify({ ok:true, orders: out }), { status:200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}
/* --- Export selected orders to CSV: GET /api/orders/export --- */
if (pathname === '/api/orders/export' && request.method === 'GET') {
  if (!env.ORDERS) {
    return new Response('ORDERS KV not bound', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
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
      const rec = normalizeReceiptUrl(o, origin);
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
    h.set('Access-Control-Allow-Origin', '*');
    return new Response(csv, { status: 200, headers: h });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
  }
}
    /* --- Public: get ritual results with token
       GET /api/orders/:id/results?token=xxxx
    --- */
    {
      const m = pathname.match(/^\/api\/orders\/([^/]+)\/results$/);
      if (m && request.method === "GET"){
        if (!env.ORDERS) {
          return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
        }
        const id = decodeURIComponent(m[1]);
        const token = String(url.searchParams.get("token") || "");
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
        const order = JSON.parse(raw);
        if (!token || token !== order.resultToken){
          return new Response(JSON.stringify({ ok:false, error:'Forbidden' }), { status:403, headers: jsonHeaders });
        }
        return new Response(JSON.stringify({ ok:true, results: Array.isArray(order.results)? order.results: [] }), { status:200, headers: jsonHeaders });
      }
    }

    /* --- Public: simple gallery page
       GET /o/:id?token=xxxx
    --- */
    {
      const m = pathname.match(/^\/o\/([^/]+)$/);
      if (m && request.method === "GET"){
        if (!env.ORDERS) {
          return new Response("ORDERS KV not bound", { status:500, headers: { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" } });
        }
        const id = decodeURIComponent(m[1]);
        const token = String(url.searchParams.get("token") || "");
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response("Not found", { status:404, headers: { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" } });
        const order = JSON.parse(raw);
        if (!token || token !== order.resultToken){
          return new Response("Forbidden", { status:403, headers: { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" } });
        }
        const resultsAll = Array.isArray(order.results) ? order.results : [];
        const results = resultsAll.filter(r => {
          const t = (r && r.type || '').toString().toLowerCase();
          const u = (r && r.url  || '').toString();
          if (t === 'video') return false;
          if (/\.(mp4|mov|m4v|avi|webm)(\?|#|$)/i.test(u)) return false;
          return true;
        });
        const esc = (s)=> String(s||"").replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
        function renderLineBanner(){
          return `
  <div id="resultLineBanner" style="padding:14px 16px 12px;margin:12px auto;max-width:860px">
    <a href="https://line.me/R/ti/p/@427oaemj" target="_blank" rel="noopener"
       class="line-support-btn"
       style="display:block;text-align:center;font-weight:700;color:#fff;background:linear-gradient(90deg,#00B900 0%, #00a600 100%);padding:10px 14px;border-radius:10px;border:1px solid rgba(0,0,0,.04);text-decoration:none;transition:transform .2s ease, box-shadow .2s ease, filter .2s ease;">
      💬 官方LINE客服
    </a>
    <div style="margin-top:10px;color:#9ca3af;font-size:14px;line-height:1.7">
      若要觀看完整祈福影片片段，請加入上方 <b>官方 LINE</b>，並提供 <b>訂單編號</b> 或 <b>手機號碼</b>，我會將影片傳給您。
    </div>
  </div>`;
        }
        const itemsHTML = results.map(r => {
          const cap = r.caption ? `<div class="cap">${esc(r.caption)}</div>` : "";
          if (r.type === "video"){
            return `<div class="card"><video controls playsinline preload="metadata" src="${esc(r.url)}"></video>${cap}</div>`;
          }
          return `<div class="card"><img loading="lazy" src="${esc(r.url)}" />${cap}</div>`;
        }).join("");
        const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>祈福成果 | ${esc(id)}</title>
<style>
:root{--bg:#0b1022;--fg:#e5e7eb;--muted:#9ca3af;--card:#121735;--acc:#06C755}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui}
.wrap{max-width:920px;margin:0 auto;padding:16px}
.hd{display:flex;align-items:baseline;gap:12px;margin:8px 0 16px}
.hd h1{font-size:18px;margin:0}
.hd .sub{font-size:12px;color:var(--muted)}
.grid{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:680px){.grid{grid-template-columns:1fr 1fr}}
.card{background:var(--card);border-radius:12px;padding:8px;overflow:hidden;border:1px solid rgba(255,255,255,.04)}
.card img,.card video{width:100%;height:auto;border-radius:8px;display:block;background:#000}
.cap{font-size:12px;color:var(--muted);padding:6px 2px}
.btn{display:inline-block;background:linear-gradient(90deg,#00B900,#00A600);color:#fff;padding:8px 12px;border-radius:10px;text-decoration:none;font-weight:700}
.line-support-btn:hover{ transform:translateY(-2px); box-shadow:0 6px 14px rgba(0,185,0,.28); filter:saturate(1.05); }
.line-support-btn:active{ transform:translateY(0); box-shadow:0 2px 6px rgba(0,185,0,.25); filter:saturate(1); }
.line-support-btn:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,185,0,.15), 0 6px 14px rgba(0,185,0,.28); }
</style></head>
<body>
${renderLineBanner()}
<div class="wrap">
  <div class="hd">
    <h1>祈福成果</h1>
    <span class="sub">訂單編號：${esc(id)}</span>
  </div>
  ${results.length ? `<div class="grid">${itemsHTML}</div>` : `<p class="sub">尚未上傳祈福成果，請稍後再試。</p>`}
</div>
</body></html>`;
        return new Response(html, { status:200, headers: { "Content-Type":"text/html; charset=utf-8", "Cache-Control":"no-store", "Access-Control-Allow-Origin":"*" } });
      }
    }

    /* --- Admin: append ritual results to an order
       POST /api/orders/:id/results
       Headers: X-Admin-Key: <env.ADMIN_KEY>
       Body: { items: [{type:"image"|"video", url:"https://...", caption?: "...", ts?: number}], replace?: false }
    --- */
    {
      const m = pathname.match(/^\/api\/orders\/([^/]+)\/results$/);
      if (m && request.method === "POST"){
        if (!env.ORDERS) {
          return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
        }
        const adminKey = request.headers.get("x-admin-key") || request.headers.get("X-Admin-Key") || url.searchParams.get("admin_key");
        if (env.ADMIN_KEY) {
          if (adminKey !== env.ADMIN_KEY) {
            return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
          }
        } else {
          // Dev fallback: require a non-empty adminKey
          if (!adminKey) {
            return new Response(JSON.stringify({ ok:false, error:'Unauthorized (missing admin_key and no ADMIN_KEY set)' }), { status:401, headers: jsonHeaders });
          }
        }
        try{
          const id = decodeURIComponent(m[1]);
          const raw = await env.ORDERS.get(id);
          if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
          const order = JSON.parse(raw);
          const body = await request.json();
          const items = Array.isArray(body.items) ? body.items : [];
          const norm = items.map(it => ({
            type: (it.type === "video" ? "video" : "image"),
            url: String(it.url || ""),
            caption: typeof it.caption === "string" ? it.caption : "",
            ts: Number(it.ts || Date.now())
          })).filter(it => it.url);
          if (!order.resultToken) order.resultToken = makeToken(32);
          if (body.replace === true){
            order.results = norm;
          }else{
            order.results = Array.isArray(order.results) ? order.results.concat(norm) : norm;
          }
          order.updatedAt = new Date().toISOString();
          await env.ORDERS.put(id, JSON.stringify(order));
          return new Response(JSON.stringify({ ok:true, results: order.results || [], token: order.resultToken }), { status:200, headers: jsonHeaders });
        }catch(e){
          return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
        }
      }
    }

    /* --- Admin (alias): append ritual results without conflicting routes
       POST /api/order.results/:id
    --- */
    {
      const m = pathname.match(/^\/api\/order\.results\/([^/]+)$/);
      if (m && request.method === "POST"){
        if (!env.ORDERS) {
          return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
        }
        const adminKey = request.headers.get("x-admin-key") || request.headers.get("X-Admin-Key") || url.searchParams.get("admin_key");
        if (env.ADMIN_KEY) {
          if (adminKey !== env.ADMIN_KEY) {
            return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
          }
        } else {
          if (!adminKey) {
            return new Response(JSON.stringify({ ok:false, error:'Unauthorized (missing admin_key and no ADMIN_KEY set)' }), { status:401, headers: jsonHeaders });
          }
        }
        try{
          const id = decodeURIComponent(m[1]);
          const raw = await env.ORDERS.get(id);
          if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
          const order = JSON.parse(raw);
          const body = await request.json();
          const items = Array.isArray(body.items) ? body.items : [];
          const norm = items.map(it => ({
            type: (it.type === "video" ? "video" : "image"),
            url: String(it.url || ""),
            caption: typeof it.caption === "string" ? it.caption : "",
            ts: Number(it.ts || Date.now())
          })).filter(it => it.url);
          if (!order.resultToken) order.resultToken = makeToken(32);
          if (body.replace === true){
            order.results = norm;
          }else{
            order.results = Array.isArray(order.results) ? order.results.concat(norm) : norm;
          }
          order.updatedAt = new Date().toISOString();
          await env.ORDERS.put(id, JSON.stringify(order));
          return new Response(JSON.stringify({ ok:true, results: order.results || [], token: order.resultToken }), { status:200, headers: jsonHeaders });
        }catch(e){
          return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
        }
      }
    }

    /* --- Admin: simple ritual result uploader (single endpoint)
       POST /api/ritual_result
       Headers: X-Admin-Key: <env.ADMIN_KEY>  OR  ?admin_key=...
       Body (Content-Type: application/json OR text/plain OR form-data):
         {
           orderId: "2025103000001",
           // either raw fields or items[]
           photoUrl?: "https://...", // treated as image
           videoUrl?: "https://...", // treated as video
           caption?:  "...",
           items?: [{ type:"image"|"video", url:"https://...", caption?:"...", ts?: number }],
           replace?: false
         }
    --- */
    if (pathname === "/api/ritual_result" && request.method === "POST") {
      if (!env.ORDERS) {
        return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
      }
      const adminKey = request.headers.get("x-admin-key") || request.headers.get("X-Admin-Key") || url.searchParams.get("admin_key");
      if (env.ADMIN_KEY) {
        if (adminKey !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
        }
      } else {
        if (!adminKey) {
          return new Response(JSON.stringify({ ok:false, error:'Unauthorized (missing admin_key and no ADMIN_KEY set)' }), { status:401, headers: jsonHeaders });
        }
      }
      try {
        const ct = (request.headers.get('content-type') || '').toLowerCase();
        let payload = {};
        if (ct.includes('application/json') || ct.includes('text/plain')) {
          const raw = await request.text();
          try { payload = JSON.parse(raw||'{}'); } catch { payload = {}; }
        } else if (ct.includes('form')) {
          const fd = await request.formData();
          payload = Object.fromEntries(Array.from(fd.entries()).map(([k,v])=>[k, typeof v==='string'? v : (v?.name||'')]));
          if (payload.items && typeof payload.items === 'string') {
            try { payload.items = JSON.parse(payload.items); } catch {}
          }
        }

        const orderId = String(payload.orderId || payload.id || '').trim();
        if (!orderId) return new Response(JSON.stringify({ ok:false, error:'Missing orderId' }), { status:400, headers: jsonHeaders });
        const raw = await env.ORDERS.get(orderId);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
        const order = JSON.parse(raw);

        // Normalize to items[]
        let items = Array.isArray(payload.items) ? payload.items : [];
        const cap = typeof payload.caption === 'string' ? payload.caption : '';
        const stamp = Date.now();
        const add = [];
        const toAbs = (u)=>{
          const s = String(u||'').trim();
          if (!s) return '';
          if (/^https?:\/\//i.test(s)) return s;
          if (s.startsWith('/')) return s;
          // treat as proof key
          return `${url.origin}/api/proof/${encodeURIComponent(s)}`;
        };
        if (payload.photoUrl) add.push({ type:'image', url: toAbs(payload.photoUrl), caption: cap, ts: stamp });
        if (payload.videoUrl) add.push({ type:'video', url: toAbs(payload.videoUrl), caption: cap, ts: stamp });
        items = add.length ? add : items;
        items = (items||[]).map(it=>({
          type: (it.type === 'video' ? 'video' : 'image'),
          url:  String(it.url||'').trim(),
          caption: typeof it.caption==='string'? it.caption : '',
          ts: Number(it.ts || Date.now())
        })).filter(it=>it.url);

        if (!items.length) {
          return new Response(JSON.stringify({ ok:false, error:'No items to append' }), { status:400, headers: jsonHeaders });
        }

        if (!order.resultToken) order.resultToken = makeToken(32);
        if (payload.replace === true) {
          order.results = items;
        } else {
          order.results = Array.isArray(order.results) ? order.results.concat(items) : items;
        }
        // 若有第一張 image，順便同步一份到 ritualPhotoUrl 以利後台縮圖
        const firstImg = order.results.find(x=>x.type==='image');
        if (firstImg && firstImg.url) {
          order.ritual_photo_url = firstImg.url;
          order.ritualPhotoUrl = firstImg.url;
        }
        order.updatedAt = new Date().toISOString();
        await env.ORDERS.put(orderId, JSON.stringify(order));
        return new Response(JSON.stringify({ ok:true, id: orderId, token: order.resultToken, results: order.results||[] }), { status:200, headers: jsonHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
      }
    }

    // === 支援 /api/proof?key=... ===
    if (pathname === '/api/proof' && request.method === 'GET') {
      const key = decodeURIComponent(url.searchParams.get('key') || '').trim();
      if (!key) return new Response(JSON.stringify({ ok:false, error:'Missing key' }), { status:400 });
      try {
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



if (pathname === '/api/order') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const productId   = String(body.productId || '');
      const productName = String(body.productName || '');
      const price       = Number(body.price ?? 0);
      const qty         = Number(body.qty ?? 1);
      const method      = String(body.method || '7-11賣貨便');
      const buyer = {
        name:  String(body?.buyer?.name  || '訪客'),
        email: String(body?.buyer?.email || ''),
        line:  String(body?.buyer?.line  || '')
      };
      if (!productId || !productName || !(price >= 0)) {
        return new Response(JSON.stringify({ ok:false, error:'Missing product info' }), { status:400, headers: jsonHeaders });
      }
      // Optional coupon from simple order flow (one-time usage)
      const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
      const couponDeity = String(body.coupon_deity || body.deity || "").trim().toUpperCase();
      let couponApplied = null;
      let amount = Number(price||0) * Math.max(1, Number(qty||1));

      // Generate order id early so we can bind coupon usage to this order
      const id = await generateOrderId(env);

      if (couponCode) {
        try {
          const r = await redeemCoupon(env, { code: couponCode, deity: couponDeity, orderId: id });
          if (r && r.ok) {
            // Ensure this coupon code can only be used once across all orders
            const lock = await markCouponUsageOnce(env, couponCode, id);
            if (!lock.ok) {
              couponApplied = {
                code: couponCode,
                deity: couponDeity,
                failed: true,
                reason: lock.reason || 'already_used'
              };
            } else {
              const disc = Math.max(0, Number(r.amount || 200) || 200);
              amount = Math.max(0, amount - disc);
              couponApplied = {
                code: couponCode,
                deity: r.deity || couponDeity,
                discount: disc,
                redeemedAt: Date.now()
              };
            }
          } else {
            couponApplied = {
              code: couponCode,
              deity: couponDeity,
              failed: true,
              reason: (r && r.reason) || 'invalid'
            };
          }
        } catch (e) {
          console.error('redeemCoupon /api/order error', e);
          couponApplied = {
            code: couponCode,
            deity: couponDeity,
            failed: true,
            reason: 'error'
          };
        }
      }
      const now = new Date().toISOString();
      const order = {
        id, productId, productName, price, qty, method, buyer,
        amount,
        status:'pending',
        createdAt:now, updatedAt:now,
        resultToken: makeToken(32),
        results: [],
        coupon: couponApplied || undefined
      };

      await env.ORDERS.put(id, JSON.stringify(order));
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      ids.unshift(id);
      if (ids.length > 500) ids.length = 500;
      await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));

      // Auto-increment product sold counter for this order
      try { await bumpSoldSingle(env, productId, qty); } catch(_){}
      // Decrement inventory for this order (variant-aware if provided)
      try { await decStockSingle(env, productId, body.variantName || body.variant || '', qty); } catch(_){}

      return new Response(JSON.stringify({ ok:true, id }), { status:200, headers: jsonHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
    }
  }

  if (request.method === 'GET') {
    try {
      const id = url.searchParams.get('id');
      if (id) {
        const raw = await env.ORDERS.get(id);
        if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
        const one = JSON.parse(raw);
        const rec = normalizeReceiptUrl(one, origin);
        const ritualUrl =
          one.ritualPhotoUrl ||
          one.ritual_photo_url ||
          (one?.extra?.candle?.photoUrl || "");
        const merged = Object.assign({}, one, {
          receiptUrl: rec || "",
          proofUrl: rec || "",
          ritualPhotoUrl: ritualUrl || "",
          ritualPhoto: ritualUrl || ""
        });
        return new Response(JSON.stringify({ ok:true, order: merged }), { status:200, headers: jsonHeaders });
      }
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
      const out = [];
      for (const oid of ids.slice(0, limit)) {
        const raw = await env.ORDERS.get(oid);
        if (!raw) continue;
        try { out.push(JSON.parse(raw)); } catch {}
      }
      return new Response(JSON.stringify({ ok:true, items: out }), { status:200, headers: jsonHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
    }
  }

  if (request.method === 'DELETE') {
    try {
      const id = url.searchParams.get('id');
      if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });
      await env.ORDERS.delete(id);
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const next = ids.filter(x => x !== id);
      await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(next));
      return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
    }
  }

  return new Response(JSON.stringify({ ok:false, error:'Method Not Allowed' }), { status:405, headers: jsonHeaders });
}

if (pathname === '/api/order/status' && request.method === 'POST') {
  if (!env.ORDERS) {
    return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
  }
  try {
    
    const body = await request.json();
    const id = String(body.id || '');
    const action = String(body.action || '').toLowerCase();
    const status = String(body.status || '');
    if (!id) return new Response(JSON.stringify({ ok:false, error:'Missing id' }), { status:400, headers: jsonHeaders });

    if (action === 'delete') {
      const raw0 = await env.ORDERS.get(id);
      if (!raw0) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
      await env.ORDERS.delete(id);
      const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
      const ids = idxRaw ? JSON.parse(idxRaw) : [];
      const next = ids.filter(x => x !== id);
      await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(next));
      return new Response(JSON.stringify({ ok:true, deleted:1 }), { status:200, headers: jsonHeaders });
    }

    if (action === 'set' || (!action && status)) {
      const raw = await env.ORDERS.get(id);
      if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
      const obj = JSON.parse(raw);
      if (status) obj.status = status;
      obj.updatedAt = new Date().toISOString();
      await env.ORDERS.put(id, JSON.stringify(obj));
      return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok:false, error:'Missing action/status' }), { status:400, headers: jsonHeaders });
    } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}
    // 圖片上傳
    if (pathname === "/api/upload" && request.method === "POST") {
      return handleUpload(request, env, origin);
    }

    // 圖片刪除
    if (pathname.startsWith("/api/file/") && request.method === "DELETE") {
      const key = decodeURIComponent(pathname.replace("/api/file/", ""));
      return deleteR2FileByKey(key, env);
    }
    if (pathname === "/api/deleteFile" && request.method === "POST") {
      return deleteR2FileViaBody(request, env);
    }

    // CORS Preflight for all /api/ routes
    if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
      return corsPreflight();
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
        const found = await getProofFromStore(env, decodeURIComponent(rawKey));
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
        const found = await getProofFromStore(env, decodeURIComponent(rawKey));
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
// Stories (reviews) endpoints
if (pathname === "/api/stories" && request.method === "GET") {
  return listStories(url, env);
}
if (pathname === "/api/stories" && request.method === "POST") {
  // Support method override: POST + _method=DELETE
  const _m = (url.searchParams.get("_method") || "").toUpperCase();
  if (_m === "DELETE") {
    return deleteStories(url, env);
  }
  return createStory(request, env);
}
if (pathname === "/api/stories" && request.method === "DELETE") {
  return deleteStories(url, env);
}
    // Image resize proxy
    if (pathname === "/api/img" && request.method === "GET") {
      return resizeImage(url, env, origin);
    }

    // 預設回退: 如果請求路徑不是以 /api/ 開頭，則交給靜態資源處理
    if (!pathname.startsWith("/api/")) {
      return next();
    }

    // 如果是未匹配的 /api/ 路由，回傳 404
    return next();
}

/* ========== /api/upload ========== */
async function handleUpload(request, env, origin) {
  try {
    const form = await request.formData();
    let files = form.getAll("files[]");
    if (!files.length) files = form.getAll("file");
    if (!files.length) return json({ ok:false, error:"No files provided" }, 400);

    const out = [];
    const day = new Date();
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const d = String(day.getDate()).padStart(2, "0");

    for (const f of files) {
      if (typeof f.stream !== "function") continue;
      if (f.size && f.size > 3 * 1024 * 1024) {
        return json({ ok:false, error:"File too large (>3MB)" }, 413);
      }
      const ext = guessExt(f.type) || safeExt(f.name) || "bin";
      const key = `uploads/${y}${m}${d}/${crypto.randomUUID()}.${ext}`;

      await env.R2_BUCKET.put(key, f.stream(), {
        httpMetadata: {
          contentType: f.type || "application/octet-stream",
          contentDisposition: "inline"
        }
      });

      const url = `${origin}/api/file/${encodeURIComponent(key)}`;
      out.push({ url, key });
    }

    return withCORS(json({ ok:true, files: out }));
  } catch (err) {
    return withCORS(json({ ok:false, error:String(err) }, 500));
  }
}

/* ========== R2 刪檔 ========== */
async function deleteR2FileByKey(key, env) {
  try {
    await env.R2_BUCKET.delete(key);
    return withCORS(json({ ok:true, key }));
  } catch (e) {
    return withCORS(json({ ok:false, error:String(e) }, 500));
  }
}

async function deleteR2FileViaBody(request, env) {
  try {
    const body = await request.json();
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

/* ========== /api/products ========== */
// 商品列表 API 支援分類查詢，可用 ?category=佛牌 只查該分類
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
async function listProducts(url, env) {
  const active = url.searchParams.get("active");
  const category = url.searchParams.get("category");
  const indexRaw = await env.PRODUCTS.get("INDEX");
  const ids = indexRaw ? JSON.parse(indexRaw) : [];

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
    if (active === "true" && p.active !== true) continue;
    // 分類篩選
    if (category && p.category !== category) continue;
    items.push(p);
  }
  return withCORS(json({ ok:true, items }));
}

// 新增商品時，若前端傳送 category，會一併存入
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
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

/* ========== /api/products/:id ========== */
async function getProduct(id, env) {
  const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
  if (!raw) return withCORS(json({ ok:false, error:"Not found" }, 404));
  return withCORS(json({ ok:true, product: JSON.parse(raw) }));
}

// 編輯商品時，若前端傳送 category，會一併存入
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
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

// 修改商品時，若前端傳送 category，會一併存入
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
async function patchProduct(id, request, env) {
  try {
    const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
    if (!raw) return withCORS(json({ ok:false, error:"Not found" }, 404));
    const curr = JSON.parse(raw);
    const patch = await request.json();

    const next = {
      ...curr,
      ...pick(patch, ["name","deity","basePrice","sold","stock","description","active"]),
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
function arrayBufferToBase64(bin){
  const bytes = new Uint8Array(bin);
  const chunk = 0x8000; // 32k per slice to avoid stack overflow
  let ascii = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    ascii += String.fromCharCode.apply(null, slice);
  }
  return btoa(ascii);
}

// --- 智慧商品分類輔助函式 ---
function inferCategory(body) {
  // 1. 優先使用前端明確指定的分類
  if (body && body.category && ["佛牌/聖物", "蠟燭加持祈福", "跑廟行程", "其他"].includes(body.category)) {
    return body.category;
  }
  // 2. 若無指定，則根據商品名稱中的關鍵字推斷
  const name = String(body.name || "").toLowerCase();
  if (name.includes("蠟燭")) return "蠟燭加持祈福";
  if (name.includes("跑廟")) return "跑廟行程";
  // 3. 預設分類
  return "佛牌/聖物";
}

function getAny(sp, keys){
  for (const k of keys){
    const v = sp.get(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function normalizePhone(s = '') {
  const digits = String(s || '').replace(/\D/g, '');
  if (!digits) return '';
  // handle +88609..., 8869..., 09...
  if (digits.startsWith('886')) {
    const tail = digits.slice(3);
    if (tail.startsWith('0')) return tail; // already 0-leading
    return '0' + tail;
  }
  if (digits.startsWith('9') && digits.length === 9) return '0' + digits;
  if (digits.length >= 10 && digits.startsWith('0')) return digits.slice(0, 10);
  return digits;
}

// --- 神祇代碼推斷輔助函式 ---
function getDeityCodeFromName(name) {
  if (!name) return '';
  const s = String(name).toUpperCase();
  if (/^[A-Z]{2}$/.test(s)) return s; // Already a code
  if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/i.test(name)) return 'FM';
  if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/i.test(name)) return 'GA';
  if (/崇迪|SOMDEJ|SOMDET/i.test(name)) return 'CD';
  if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/i.test(name)) return 'KP';
  if (/哈魯曼|H(AN|AR)UMAN/i.test(name)) return 'HM';
  if (/拉胡|RAHU/i.test(name)) return 'RH';
  if (/迦樓羅|GARUDA|K(AR|AL)UDA/i.test(name)) return 'JL';
  if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/i.test(name)) return 'ZD';
  if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/i.test(name)) return 'ZF';
  if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/i.test(name)) return 'WE';
  if (/徐祝|XU\s*ZHU|XUZHU/i.test(name)) return 'XZ';
  if (/魂魄勇|HUN\s*PO\s*YONG|HPY/i.test(name)) return 'HP';
  return ''; // Fallback
}
// 商品資料標準化，預設 category 為「佛牌」，並確保回傳
// 前端可於管理端提供分類下拉式選單（佛牌、蠟燭、靈符、服飾）供選擇
function normalizeProduct(body, nowIso) {
  return {
    id: String(body.id || crypto.randomUUID()),
    name: String(body.name),
    deityCode: String(body.deityCode || ""),
    deity: String(body.deity || ""),
    basePrice: Number(body.basePrice ?? 0),
    sold: Number(body.sold ?? 0),
    stock: Number(body.stock ?? 0),
    description: String(body.description || ""),
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    variants: Array.isArray(body.variants) ? body.variants.map(v => ({
      name: String(v.name || ""),
      priceDiff: Number(v.priceDiff ?? 0),
      stock: Number(v.stock ?? 0)
    })) : [],
    category: inferCategory(body), // 改為使用智慧分類函式
    active: body.active !== false,
    createdAt: body.createdAt || nowIso,
    updatedAt: nowIso
  };
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function withCORS(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key, x-admin-key");
  h.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return new Response(res.body, { status: res.status, headers: h });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key, x-admin-key",
      "Access-Control-Max-Age": "86400"
    }
  });
}

function guessExt(mime = "") {
  if (mime.startsWith("image/")) {
    const t = mime.split("/")[1].toLowerCase();
    if (t === "jpeg") return "jpg";
    if (t === "svg+xml") return "svg";
    return t;
  }
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/plain") return "txt";
  return "";
}

function safeExt(name = "") {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/* ========== SOLD counters ========== */
async function bumpSoldSingle(env, pid, qty){
  try{
    const id = String(pid||'').trim();
    const add = Math.max(1, Number(qty||1));
    if (!id) return;
    const key = `PRODUCT:${id}`;
    const raw = await env.PRODUCTS.get(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    const curr = Number(p.sold||0) || 0;
    p.sold = curr + add;
    p.updatedAt = new Date().toISOString();
    await env.PRODUCTS.put(key, JSON.stringify(p));
  }catch(_){}
}
async function bumpSoldCounters(env, items, fallbackProductId, fallbackQty){
  try{
    if (Array.isArray(items) && items.length){
      for (const it of items){
        const pid = it && (it.productId || it.id);
        const q   = it && (it.qty || it.quantity || 1);
        await bumpSoldSingle(env, pid, q);
      }
      return;
    }
    // fallback single
    if (fallbackProductId){
      await bumpSoldSingle(env, fallbackProductId, fallbackQty || 1);
    }
  }catch(_){}
}

/* ========== STOCK decrement helpers ========== */
function cleanVariantName(s){
  if (!s) return '';
  // 去掉變體名字尾端的加價資訊：例如 （+200）或(+200)
  return String(s).replace(/（\+[^）]*）/g,'').replace(/\(\+[^)]*\)/g,'').trim();
}
async function decStockSingle(env, pid, variantName, qty){
  try{
    const id = String(pid||'').trim();
    const dec = Math.max(1, Number(qty||1));
    if (!id) return;
    const key = `PRODUCT:${id}`;
    const raw = await env.PRODUCTS.get(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    let touched = false;

    // 1) 以變體庫存為主（若有）
    const vn = cleanVariantName(variantName);
    if (Array.isArray(p.variants) && p.variants.length){
      let idx = -1;
      if (vn){
        idx = p.variants.findIndex(v => cleanVariantName(v?.name) === vn);
      }
      // 未指定變體但只有一個變體 → 視為該變體
      if (idx < 0 && p.variants.length === 1) idx = 0;
      if (idx >= 0){
        const v = p.variants[idx];
        const curr = Number(v.stock||0) || 0;
        v.stock = Math.max(0, curr - dec);
        touched = true;
      }
    }

    // 2) 若沒有變體或找不到對應變體，但產品有頂層 stock，就扣頂層
    if (!touched && typeof p.stock !== 'undefined'){
      const curr = Number(p.stock||0) || 0;
      p.stock = Math.max(0, curr - dec);
      touched = true;
    }

    if (touched){
      p.updatedAt = new Date().toISOString();
      await env.PRODUCTS.put(key, JSON.stringify(p));
    }
  }catch(_){}
}
async function decStockCounters(env, items, fallbackProductId, fallbackVariantName, fallbackQty){
  try{
    if (Array.isArray(items) && items.length){
      for (const it of items){
        const pid = it && (it.productId || it.id);
        const vn  = it && (it.variantName || it.variant || '');
        const q   = it && (it.qty || it.quantity || 1);
        await decStockSingle(env, pid, vn, q);
      }
      return;
    }
    // 單品備援
    if (fallbackProductId){
      await decStockSingle(env, fallbackProductId, fallbackVariantName || '', fallbackQty || 1);
    }
  }catch(_){}
}

/* ========== /api/stories ========== */
async function listStories(url, env){
  const code = (url.searchParams.get("code")||"").toUpperCase();
  if (!code) return withCORS(json({ok:false, error:"Missing code"}, 400));
  const idxRaw = await env.STORIES.get(`IDX:${code}`);
  const ids = idxRaw ? JSON.parse(idxRaw) : [];
  const items = [];
  for (const id of ids.slice(0, 120)){
    const raw = await env.STORIES.get(`STORY:${id}`);
    if (!raw) continue;
    try{ items.push(JSON.parse(raw)); }catch{}
  }
  items.sort((a,b)=> new Date(b.ts||0) - new Date(a.ts||0));
  return withCORS(json({ok:true, items}));
}

async function createStory(request, env){
  try{
    const body = await request.json();
    const code = String((body.code||"").toUpperCase());
    const nick = String(body.nick||"訪客").slice(0, 20);
    const msg  = String(body.msg||"").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    if (!code) return withCORS(json({ok:false, error:"Missing code"}, 400));
    if (!msg || msg.length < 2) return withCORS(json({ok:false, error:"Message too short"}, 400));
    if (msg.length > 800) return withCORS(json({ok:false, error:"Message too long"}, 400));
    const now = new Date().toISOString();
    const id = `${code}:${now}:${crypto.randomUUID()}`;
    const item = { id, code, nick, msg, ts: now, imageUrl: imageUrl || undefined };
    await env.STORIES.put(`STORY:${id}`, JSON.stringify(item));
    const idxKey = `IDX:${code}`;
    const idxRaw = await env.STORIES.get(idxKey);
    const ids = idxRaw ? JSON.parse(idxRaw) : [];
    ids.unshift(id);
    if (ids.length > 300) ids.length = 300;
    await env.STORIES.put(idxKey, JSON.stringify(ids));
    return withCORS(json({ok:true, item}));
  }catch(e){
    return withCORS(json({ok:false, error:String(e)}, 500));
  }
}

/* ========== /api/stories: DELETE (single or bulk) ========== */
// Modes:
//   A) ?code=XXXX&id=STORYID -> delete single story
//   B) ?code=XXXX            -> delete all stories under this code (capped at 200)
async function deleteStories(url, env){
  const code = (url.searchParams.get("code")||"").toUpperCase();
  const id   = url.searchParams.get("id") || "";
  if (!code) return withCORS(json({ ok:false, error:"Missing code" }, 400));

  const idxKey = `IDX:${code}`;
  const idxRaw = await env.STORIES.get(idxKey);
  const ids = idxRaw ? JSON.parse(idxRaw) : [];

  if (id) {
    // delete single item
    await env.STORIES.delete(`STORY:${id}`);
    const next = ids.filter(x => x !== id);
    await env.STORIES.put(idxKey, JSON.stringify(next));
    return withCORS(json({ ok:true, deleted: 1 }));
  }

  // bulk delete (cap to avoid long-running)
  let n = 0;
  for (const sid of ids.slice(0, 200)) {
    await env.STORIES.delete(`STORY:${sid}`);
    n++;
  }
  await env.STORIES.put(idxKey, JSON.stringify([]));
  return withCORS(json({ ok:true, deleted: n }));
}



/* ========== /api/img (Image resize proxy) ========== */
async function resizeImage(url, env, origin){
  try{
    const u = url.searchParams.get("u") || "";
    const key = url.searchParams.get("key") || "";
    const w = Math.max(1, Math.min(4096, Number(url.searchParams.get("w")||800)|0));
    const q = Math.max(10, Math.min(95, Number(url.searchParams.get("q")||75)|0));
    const fmt = (url.searchParams.get("fmt")||"webp").toLowerCase(); // webp/avif/jpg/png

    let target = u;
    if (!target && key){
      target = `${origin}/api/file/${encodeURIComponent(key)}`;
    }
    if (!target) return withCORS(json({ok:false, error:"Missing u or key"}, 400));

    const req = new Request(target, {
      headers: { 'Accept': 'image/*' },
      cf: { image: { width: w, quality: q, fit: 'scale-down', format: fmt } }
    });
    const resp = await fetch(req);
    // add long cache
    const h = new Headers(resp.headers);
    h.set('Cache-Control', 'public, max-age=31536000, immutable');
    h.set('Access-Control-Allow-Origin','*');
    return new Response(resp.body, { status: resp.status, headers: h });
  }catch(e){
    return withCORS(json({ok:false, error:String(e)}, 500));
  }
}

// Helper: tolerant phone and last5 match functions
function matchPhone(candidate, query) {
  if (!candidate || !query) return false;
  return normalizePhone(candidate) === normalizePhone(query);
}
function matchLast5(candidate, query) {
  if (!candidate || !query) return false;
  return String(candidate).replace(/\D/g,'').slice(-5) === String(query).replace(/\D/g,'').slice(-5);
}
