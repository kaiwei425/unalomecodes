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
function isAdmin(request, env){
  try{
    const key = (request.headers.get('x-admin-key') || request.headers.get('X-Admin-Key') || '').trim();
    return !!(env.ADMIN_KEY && key && key === env.ADMIN_KEY);
  }catch(e){ return false; }
}

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

async function generateServiceOrderId(env){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const prefix = `${y}${m}${d}`;
  const seqKey = `SERVICE_ORDER_SEQ_${prefix}`;
  const store = env.SERVICE_ORDERS || env.ORDERS;
  let seq = 0;
  if (store){
    const raw = await store.get(seqKey);
    seq = Number(raw||0) || 0;
    seq += 1;
    await store.put(seqKey, String(seq));
  } else {
    seq = Math.floor(Math.random()*99999);
  }
  const tail = String(seq).padStart(4,'0');
  return `SV${prefix}${tail}`;
}

const DEFAULT_SERVICE_PRODUCTS = [
  {
    id: 'svc-candle-basic',
    name: '蠟燭祈福｜基本祈請',
    category: '服務型',
    description: '老師於指定吉日時為您點燃蠟燭祈願，並以泰文逐一祝禱所託願望。',
    duration: '約 7 天',
    includes: ['蠟燭祈請一次', '祈福祝禱錄音節錄'],
    price: 799,
    cover: 'https://shop.unalomecodes.com/api/file/mock/candle-basic.png',
    options: [
      { name: '基礎蠟燭', price: 0 },
      { name: '祈願蠟燭 + 供品', price: 300 }
    ]
  },
  {
    id: 'svc-candle-plus',
    name: '蠟燭祈福｜進階供品組',
    category: '服務型',
    description: '加上供品與祈福儀式照片回傳，適合需要長期加持的願望。',
    duration: '約 14 天',
    includes: ['蠟燭祈請三次', '供品與祝禱紀錄', '祈福成果照片'],
    price: 1299,
    cover: 'https://shop.unalomecodes.com/api/file/mock/candle-plus.png',
    options: [
      { name: '進階供品組', price: 0 },
      { name: '供品＋特別祈禱', price: 500 }
    ]
  }
];

function normalizeTWPhoneStrict(raw){
  const digits = String(raw||'').replace(/\D+/g,'');
  if (!digits) return '';
  if (digits.startsWith('886') && digits.length >= 11){
    const rest = digits.slice(3);
    if (rest.startsWith('9')) return '0' + rest.slice(0,9);
    return rest;
  }
  if (digits.startsWith('09') && digits.length === 10) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return '0' + digits;
  return digits.slice(-10);
}

function lastDigits(str, count=5){
  return String(str||'').replace(/\D+/g,'').slice(-count);
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

// ======== ECPay helpers ========
function ecpayEndpoint(env){
  const flag = String(env?.ECPAY_STAGE || env?.ECPAY_MODE || "").toLowerCase();
  const isStage = flag === "stage" || flag === "test" || flag === "sandbox" || flag === "1" || flag === "true";
  return isStage
    ? "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
    : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
}

function ecpayNormalize(str=""){
  return encodeURIComponent(str)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2a/g, "*");
}

async function ecpayCheckMac(params, hashKey, hashIV){
  const sorted = Object.keys(params).sort((a,b)=> a.localeCompare(b));
  const query = sorted.map(k => `${k}=${params[k]}`).join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
  const normalized = ecpayNormalize(raw);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
}

function looksLikeCandleItem(it){
  if (!it) return false;
  try{
    const parts = [
      it.category, it.cat, it.type,
      it.name, it.title, it.productName,
      it.deity, it.variantName, it.spec
    ].filter(Boolean).join(" ").toLowerCase();
    return /蠟燭|candle/.test(parts);
  }catch(_){
    return false;
  }
}
function needShippingFee(items, fallbackText){
  if (Array.isArray(items) && items.length){
    return items.some(it => !looksLikeCandleItem(it));
  }
  if (fallbackText){
    return !/蠟燭|candle/i.test(String(fallbackText));
  }
  return false;
}
function resolveShippingFee(env){
  const val = Number(env?.SHIPPING_FEE || env?.DEFAULT_SHIPPING_FEE || 0);
  if (Number.isFinite(val) && val > 0) return val;
  return 60;
}
function parseCouponAssignment(raw){
  if (!raw) return null;
  try{
    if (typeof raw === 'string') return JSON.parse(raw);
    if (typeof raw === 'object') return raw;
  }catch(_){}
  return null;
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
  
  
if (url.pathname === '/payment-result' && request.method === 'POST') {
    try {
      const form = await request.formData();
      const oid =
        form.get('CustomField1') ||
        form.get('customfield1') ||
        form.get('orderId') ||
        form.get('order_id') || '';
      const target = new URL(url.origin + '/payment-result' + (oid ? ('?orderId=' + encodeURIComponent(oid)) : ''));
      return Response.redirect(target.toString(), 302);
    } catch (e) {
      return Response.redirect(url.origin + '/payment-result', 302);
    }
  }

const { pathname, origin } = url;

    // =================================================================
    //  主要 API 路由 (提前處理，避免被 fallback 攔截)
    // =================================================================

    // 商品列表 / 新增
  if ((pathname === "/api/products" || pathname === "/products") && request.method === "GET") {
    return listProducts(url, env);
  }
  if (pathname === "/api/products" && request.method === "POST") {
    if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
    return createProduct(request, env);
  }

    // 商品單筆
    const prodIdMatch = pathname.match(/^\/api\/products\/([^/]+)$/) || pathname.match(/^\/products\/([^/]+)$/);
    if (prodIdMatch) {
      const id = decodeURIComponent(prodIdMatch[1]);
      if (request.method === "GET")   return getProduct(id, env);
      if (request.method === "PUT")   { if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders }); return putProduct(id, request, env); }
      if (request.method === "PATCH") { if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders }); return patchProduct(id, request, env); }
      if (request.method === "DELETE"){ if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders }); return deleteProduct(id, env); }
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
      if (typeof body.coupons === 'string') {
        try { body.coupons = JSON.parse(body.coupons); } catch {}
      }
      if (typeof body.coupon_assignment === 'string') {
        try { body.coupon_assignment = JSON.parse(body.coupon_assignment); } catch {}
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
    const rawCoupons = Array.isArray(body.coupons) ? body.coupons : [];
    const normalizedCoupons = rawCoupons.map(c => ({
      code: String((c && c.code) || '').trim().toUpperCase(),
      deity: String((c && c.deity) || '').trim().toUpperCase()
    })).filter(c => c.code);
    const couponInputs = normalizedCoupons.length ? normalizedCoupons : (couponCode ? [{ code: couponCode, deity: couponDeity }] : []);
    const firstCoupon = couponInputs[0] || null;
    const clientAssignment = parseCouponAssignment(body.coupon_assignment || body.couponAssignment);
    const clientCouponTotal = Number(body.coupon_total ?? body.couponTotal ?? 0) || 0;
    let couponApplied = null;
    function tryApplyClientCouponFallback(reason){
      if (!(clientCouponTotal > 0)) return false;
      amount = Math.max(0, Number(amount || 0) - clientCouponTotal);
      couponApplied = {
        code: (firstCoupon && firstCoupon.code) || '',
        deity: firstCoupon?.deity || '',
        codes: couponInputs.length ? couponInputs.map(c=>c.code) : undefined,
        discount: clientCouponTotal,
        redeemedAt: Date.now(),
        lines: clientAssignment && Array.isArray(clientAssignment.lines) ? clientAssignment.lines : undefined,
        clientProvided: true,
        reason: reason || undefined
      };
      return true;
    }

    if (couponInputs.length) {
      if (Array.isArray(items) && items.length) {
        try {
          const discInfo = await computeServerDiscount(env, items, couponInputs, newId);
          const totalDisc = Math.max(0, Number(discInfo?.total || 0));
          if (totalDisc > 0) {
            const codesToLock = Array.from(new Set(
              (discInfo.lines || []).map(l => String(l.code||'').toUpperCase()).filter(Boolean)
            ));
            if (!codesToLock.length && firstCoupon && firstCoupon.code) codesToLock.push(firstCoupon.code);
            let lockError = null;
            for (const code of codesToLock){
              const locked = await markCouponUsageOnce(env, code, newId);
              if (!locked.ok){
                lockError = locked;
                break;
              }
            }
            if (lockError){
              couponApplied = {
                code: (firstCoupon && firstCoupon.code) || '',
                deity: firstCoupon?.deity || '',
                codes: couponInputs.map(c=>c.code),
                failed: true,
                reason: lockError.reason || 'already_used'
              };
            }else{
              amount = Math.max(0, Number(amount || 0) - totalDisc);
              couponApplied = {
                code: (firstCoupon && firstCoupon.code) || '',
                deity: firstCoupon?.deity || '',
                codes: couponInputs.map(c=>c.code),
                discount: totalDisc,
                redeemedAt: Date.now(),
                lines: Array.isArray(discInfo.lines) ? discInfo.lines : [],
                multi: couponInputs.length > 1
              };
            }
          } else if (!tryApplyClientCouponFallback('client_fallback_no_server_discount')) {
            couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'invalid_or_not_applicable' };
          }
        } catch (e) {
          console.error('computeServerDiscount error', e);
          if (!tryApplyClientCouponFallback('client_fallback_error')) {
            couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'error' };
          }
        }
      } else if (firstCoupon && firstCoupon.code) {
        try {
          const r = await redeemCoupon(env, { code: firstCoupon.code, deity: firstCoupon.deity, orderId: newId });
          if (r && r.ok) {
            const locked = await markCouponUsageOnce(env, firstCoupon.code, newId);
            if (!locked.ok) {
              couponApplied = {
                code: firstCoupon.code,
                deity: firstCoupon.deity,
                failed: true,
                reason: locked.reason || 'already_used'
              };
            } else {
              const disc = Math.max(0, Number(r.amount || 200) || 200);
              amount = Math.max(0, Number(amount || 0) - disc);
              couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now() };
            }
          } else if (!tryApplyClientCouponFallback('client_fallback_invalid')) {
            couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: (r && r.reason) || 'invalid' };
          }
        } catch (e) {
          console.error('redeemCoupon error', e);
          if (!tryApplyClientCouponFallback('client_fallback_error')) {
            couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: 'error' };
          }
        }
      }
    } else if (!couponApplied) {
      tryApplyClientCouponFallback('client_fallback_no_coupon_inputs');
    }

    // Optional candle ritual metadata
    const shippingHint = Number(body.shipping ?? body.shippingFee ?? body.shipping_fee ?? body.shippingAmount ?? 0) || 0;
    const fallbackText = `${body?.category || ''} ${productName || body?.productName || ''}`.trim();
    const shippingNeeded = needShippingFee(items, fallbackText);
    const baseShipping = resolveShippingFee(env);
    let shippingFee = 0;
    if (shippingHint > 0){
      shippingFee = shippingHint;
    } else if (shippingNeeded){
      shippingFee = baseShipping;
    } else {
      shippingFee = 0;
    }
    amount = Math.max(0, Number(amount || 0)) + shippingFee;

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
      shippingFee: shippingFee || 0,
      shipping: shippingFee || 0,
      status: 'pending',
      createdAt: now, updatedAt: now,
      ritual_photo_url: ritualPhotoUrl || undefined,
      ritualPhotoUrl: ritualPhotoUrl || undefined,
      resultToken: makeToken(32),
      results: [],
      coupon: couponApplied || undefined,
      couponAssignment: clientAssignment || undefined,
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
    try {
      await maybeSendOrderEmails(env, order, { origin, channel: 'bank' });
    } catch (err) {
      console.error('sendOrderEmails(bank) error', err);
    }

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

// ======== ECPay Credit Card ========
if (request.method === 'OPTIONS' && (pathname === '/api/payment/ecpay/create' || pathname === '/api/payment/ecpay/notify')) {
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

if (pathname === '/api/payment/ecpay/create' && request.method === 'POST') {
  try {
    if (!env.ORDERS) {
      return new Response(JSON.stringify({ ok:false, error:'ORDERS KV not bound' }), { status:500, headers: jsonHeaders });
    }
    if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
      return new Response(JSON.stringify({ ok:false, error:'Missing ECPay config' }), { status:500, headers: jsonHeaders });
    }
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    const body = ct.includes('application/json') ? (await request.json()) : {};

    const draft = await buildOrderDraft(env, body, origin, { method:'信用卡/綠界', status:'待付款', lockCoupon:true });
    const order = draft.order;
    const totalAmount = Math.max(1, Math.round(order.amount || 0));

    const gateway = ecpayEndpoint(env);
    const merchantId = String(env.ECPAY_MERCHANT_ID);
    const hashKey   = String(env.ECPAY_HASH_KEY);
    const hashIV    = String(env.ECPAY_HASH_IV);

    const tradeNoBase = (order.id || '').replace(/[^A-Za-z0-9]/g,'');
    const merchantTradeNo = (env.ECPAY_PREFIX ? String(env.ECPAY_PREFIX) : 'U') + tradeNoBase;
    const tradeNo = merchantTradeNo.slice(-20);

    const now = new Date();
    const ts = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const itemsStr = (order.items && order.items.length)
      ? order.items.map(it => `${it.productName||''}x${Math.max(1, Number(it.qty||1))}`).join('#')
      : `${order.productName || '訂單'}x${Math.max(1, Number(order.qty||1))}`;

    const params = {
      MerchantID: merchantId,
      MerchantTradeNo: tradeNo,
      MerchantTradeDate: ts,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: '聖物訂單',
      ItemName: itemsStr,
      ReturnURL: `${origin}/api/payment/ecpay/notify`,
      OrderResultURL: `${origin}/payment-result`,
      ClientBackURL: `${origin}/payment-result?orderId=${encodeURIComponent(order.id)}`,
      ChoosePayment: 'Credit',
      EncryptType: 1,
      CustomField1: order.id
    };
    params.CheckMacValue = await ecpayCheckMac(params, hashKey, hashIV);

    order.payment = {
      gateway: 'ecpay',
      tradeNo,
      amount: totalAmount,
      createdAt: new Date().toISOString(),
      status: 'INIT'
    };

    await env.ORDERS.put(order.id, JSON.stringify(order));
    const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
    let ids = [];
    if (idxRaw) { try { const parsed = JSON.parse(idxRaw); if (Array.isArray(parsed)) ids = parsed; } catch{} }
    ids.unshift(order.id);
    if (ids.length > 1000) ids.length = 1000;
    await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));
    try { await bumpSoldCounters(env, draft.items, order.productId, order.qty); } catch(_){}
    try { await decStockCounters(env, draft.items, order.productId, order.variantName, order.qty); } catch(_){}
    try {
      await maybeSendOrderEmails(env, order, { origin, channel: 'credit' });
    } catch (err) {
      console.error('sendOrderEmails(credit) error', err);
    }

    return new Response(JSON.stringify({
      ok:true,
      orderId: order.id,
      action: gateway,
      params,
      stage: String(env.ECPAY_STAGE || env.ECPAY_MODE || '').toLowerCase()
    }), { status:200, headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/payment/ecpay/notify' && request.method === 'POST') {
  try {
    if (!env.ORDERS) {
      return new Response('0|ORDERS_NOT_BOUND', { status:500, headers:{'Content-Type':'text/plain'} });
    }
    const hashKey   = String(env.ECPAY_HASH_KEY || '');
    const hashIV    = String(env.ECPAY_HASH_IV || '');
    if (!hashKey || !hashIV) {
      return new Response('0|CONFIG_MISSING', { status:500, headers:{'Content-Type':'text/plain'} });
    }

    const ct = (request.headers.get('content-type') || '').toLowerCase();
    let formObj = {};
    if (ct.includes('application/json')) {
      formObj = await request.json().catch(()=>({}));
    } else {
      const fd = await request.formData();
      formObj = Object.fromEntries(Array.from(fd.entries()).map(([k,v])=>[k, typeof v === 'string' ? v : String(v)]));
    }

    const receivedMac = String(formObj.CheckMacValue || formObj.checkmacvalue || '').toUpperCase();
    const macParams = { ...formObj };
    delete macParams.CheckMacValue;
    delete macParams.checkmacvalue;
    const calcMac = await ecpayCheckMac(macParams, hashKey, hashIV);
    if (!receivedMac || receivedMac !== calcMac) {
      return new Response('0|MAC_INVALID', { status:400, headers:{'Content-Type':'text/plain'} });
    }

    const rtnCode = Number(formObj.RtnCode || formObj.rtncode || 0);
    const orderId = String(formObj.CustomField1 || formObj.customfield1 || formObj.MerchantTradeNo || '').trim();
    if (!orderId) {
      return new Response('0|NO_ORDER', { status:400, headers:{'Content-Type':'text/plain'} });
    }
    const raw = await env.ORDERS.get(orderId);
    if (!raw) {
      return new Response('0|ORDER_NOT_FOUND', { status:404, headers:{'Content-Type':'text/plain'} });
    }
    const order = JSON.parse(raw);
    if (!order.payment) order.payment = {};
    order.payment.gateway = 'ecpay';
    order.payment.tradeNo = String(formObj.TradeNo || order.payment.tradeNo || '');
    order.payment.merchantTradeNo = String(formObj.MerchantTradeNo || order.payment.merchantTradeNo || '');
    order.payment.rtnCode = rtnCode;
    order.payment.message = String(formObj.RtnMsg || formObj.rtnmsg || '');
    order.payment.paidAt = new Date().toISOString();
    order.payment.amount = Number(formObj.TradeAmt || formObj.TotalAmount || order.payment.amount || order.amount || 0);
    order.status = rtnCode === 1 ? '已付款待出貨' : '付款失敗';
    order.updatedAt = new Date().toISOString();

    if (rtnCode === 1 && order.coupon && !order.coupon.locked && !order.coupon.failed) {
      try {
        const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
          ? order.coupon.codes
          : (order.coupon.code ? [order.coupon.code] : []);
        for (const code of codes){
          if (!code) continue;
          try{
            await markCouponUsageOnce(env, code, order.id);
          }catch(_){}
        }
        order.coupon.locked = true;
      } catch(_){}
    }

    await env.ORDERS.put(orderId, JSON.stringify(order));
    if (rtnCode === 1 && shouldNotifyStatus(order.status)) {
      try {
        await maybeSendOrderEmails(env, order, { origin, channel: order.method || '信用卡/綠界', notifyAdmin:false, emailContext:'status_update' });
      } catch (err) {
        console.error('status email (credit) error', err);
      }
    }
    return new Response('1|OK', { status:200, headers:{'Content-Type':'text/plain'} });
  } catch (e) {
    return new Response('0|ERROR', { status:500, headers:{'Content-Type':'text/plain'} });
  }
}


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

// 共用：將前端傳入的訂單資料標準化，計算金額與優惠
async function buildOrderDraft(env, body, origin, opts = {}) {
  function isTruthy(x){ return x === true || x === 1 || x === '1' || String(x).toLowerCase() === 'true' || String(x).toLowerCase() === 'yes' || x === 'on'; }
  const hintMode   = (body.mode || '').toLowerCase();
  const directHint = isTruthy(body.directBuy) || isTruthy(body.single) || hintMode === 'direct';
  const hasCart    = Array.isArray(body.cart) && body.cart.length > 0;
  const cartHint   = hasCart && (isTruthy(body.fromCart) || isTruthy(body.useCart) || hintMode === 'cart');

  const preferDirect = (hintMode !== 'cart') && (directHint || !!body.productId);
  const useCartOnly  = !preferDirect && cartHint;

  let items = [];
  if (useCartOnly) {
    const cartArr = Array.isArray(body.cart) ? body.cart : [];
    items = cartArr.map(it => ({
      productId:   String(it.id || it.productId || ''),
      productName: String(it.name || it.title || it.productName || '商品'),
      category:    String(it.category || it.cat || ''),
      deity:       String(it.deity || ''),
      variantName: String(it.variantName || it.variant || ''),
      price:       Number(it.price ?? it.unitPrice ?? 0),
      qty:         Math.max(1, Number(it.qty ?? it.quantity ?? 1)),
      image:       String(it.image || '')
    }));
  }

  let productId   = useCartOnly ? '' : String(body.productId || '');
  let productName = useCartOnly ? '' : String(body.productName || '');
  let price       = useCartOnly ? 0  : Number(body.price ?? 0);
  let qty         = useCartOnly ? 0  : Number(body.qty   ?? 1);
  let deity       = useCartOnly ? '' : String(body.deity || '');
  let variantName = useCartOnly ? '' : String(body.variantName || '');

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

  const noteVal = String(
    body?.note ??
    body?.remark ??
    body?.buyer?.note ??
    body?.buyer_note ??
    body?.bfNote ??
    ''
  ).trim();

  let amount = 0;
  if (Array.isArray(items) && items.length) {
    amount = items.reduce((s, it) => {
      const unit = Number(it.price ?? it.unitPrice ?? 0) || 0;
      const q    = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
      return s + unit * q;
    }, 0);
  } else if (productId || productName) {
    amount = Number(price || 0) * Math.max(1, Number(qty || 1));
  } else {
    amount = Number(body.amount || 0) || 0;
  }

  const newId = await generateOrderId(env);

  const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
  let couponDeity   = String(body.coupon_deity || body.deity || "").trim().toUpperCase();
  if (!couponDeity && items.length) {
    const set = new Set(items.map(it => String(it.deity||'').toUpperCase()).filter(Boolean));
    couponDeity = (set.size === 1) ? Array.from(set)[0] : '';
  }
  const rawCoupons = Array.isArray(body.coupons) ? body.coupons : [];
  const normalizedCoupons = rawCoupons.map(c => ({
    code: String((c && c.code) || '').trim().toUpperCase(),
    deity: String((c && c.deity) || '').trim().toUpperCase()
  })).filter(c => c.code);
  const couponInputs = normalizedCoupons.length ? normalizedCoupons : (couponCode ? [{ code: couponCode, deity: couponDeity }] : []);
  const firstCoupon = couponInputs[0] || null;
  const clientAssignment = parseCouponAssignment(body.coupon_assignment || body.couponAssignment);
  const clientCouponTotal = Number(body.coupon_total ?? body.couponTotal ?? 0) || 0;
  let couponApplied = null;
  function tryApplyClientCouponFallback(reason){
    if (!(clientCouponTotal > 0)) return false;
    amount = Math.max(0, Number(amount || 0) - clientCouponTotal);
    couponApplied = {
      code: (firstCoupon && firstCoupon.code) || '',
      deity: firstCoupon?.deity || '',
      codes: couponInputs.length ? couponInputs.map(c=>c.code) : undefined,
      discount: clientCouponTotal,
      redeemedAt: Date.now(),
      lines: clientAssignment && Array.isArray(clientAssignment.lines) ? clientAssignment.lines : undefined,
      clientProvided: true,
      reason: reason || undefined
    };
    return true;
  }

  if (couponInputs.length) {
    if (Array.isArray(items) && items.length) {
      try {
        const discInfo = await computeServerDiscount(env, items, couponInputs, newId);
        const totalDisc = Math.max(0, Number(discInfo?.total || 0));
        if (totalDisc > 0) {
          let lockError = null;
          if (opts.lockCoupon) {
            const codesToLock = Array.from(new Set(
              (discInfo.lines || []).map(l => String(l.code||'').toUpperCase()).filter(Boolean)
            ));
            if (!codesToLock.length && firstCoupon && firstCoupon.code) codesToLock.push(firstCoupon.code);
            for (const code of codesToLock){
              const locked = await markCouponUsageOnce(env, code, newId);
              if (!locked.ok){
                lockError = locked;
                break;
              }
            }
          }
          if (lockError) {
            couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: lockError.reason || 'already_used' };
          } else {
            amount = Math.max(0, Number(amount || 0) - totalDisc);
            couponApplied = {
              code: (firstCoupon && firstCoupon.code) || '',
              deity: firstCoupon?.deity || '',
              codes: couponInputs.map(c=>c.code),
              discount: totalDisc,
              redeemedAt: Date.now(),
              lines: Array.isArray(discInfo.lines) ? discInfo.lines : [],
              multi: couponInputs.length > 1,
              locked: !!opts.lockCoupon
            };
          }
        } else if (!tryApplyClientCouponFallback('client_fallback_no_server_discount')) {
          couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'invalid_or_not_applicable' };
        }
      } catch (e) {
        console.error('computeServerDiscount error', e);
        if (!tryApplyClientCouponFallback('client_fallback_error')) {
          couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'error' };
        }
      }
    } else if (firstCoupon && firstCoupon.code) {
      try {
        const r = await redeemCoupon(env, { code: firstCoupon.code, deity: firstCoupon.deity, orderId: newId });
        if (r && r.ok) {
          let locked = { ok:true };
          if (opts.lockCoupon) locked = await markCouponUsageOnce(env, firstCoupon.code, newId);
          if (!locked.ok) {
            couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: locked.reason || 'already_used' };
          } else {
            const disc = Math.max(0, Number(r.amount || 200) || 200);
            amount = Math.max(0, Number(amount || 0) - disc);
            couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now(), locked: !!opts.lockCoupon };
          }
        } else if (!tryApplyClientCouponFallback('client_fallback_invalid')) {
          couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: (r && r.reason) || 'invalid' };
        }
      } catch (e) {
        console.error('redeemCoupon error', e);
        if (!tryApplyClientCouponFallback('client_fallback_error')) {
          couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: 'error' };
        }
      }
    }
  } else if (!couponApplied) {
    tryApplyClientCouponFallback('client_fallback_no_coupon_inputs');
  }

  const shippingHint = Number(body.shipping ?? body.shippingFee ?? body.shipping_fee ?? body.shippingAmount ?? 0) || 0;
  const fallbackText = `${body?.category || ''} ${productName || body?.productName || ''}`.trim();
  const shippingNeeded = needShippingFee(items, fallbackText);
  const baseShipping = resolveShippingFee(env);
  let shippingFee = 0;
  if (shippingHint > 0){
    shippingFee = shippingHint;
  } else if (shippingNeeded){
    shippingFee = baseShipping;
  } else {
    shippingFee = 0;
  }
  amount = Math.max(0, Number(amount || 0)) + shippingFee;

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
    method: opts.method || '信用卡/綠界',
    buyer,
    note: noteVal,
    amount: Math.max(0, Math.round(amount)),
    shippingFee: shippingFee || 0,
    shipping: shippingFee || 0,
    status: opts.status || '待付款',
    createdAt: now, updatedAt: now,
    ritual_photo_url: ritualPhotoUrl || undefined,
    ritualPhotoUrl: ritualPhotoUrl || undefined,
    resultToken: makeToken(32),
    results: [],
    coupon: couponApplied || undefined,
    couponAssignment: clientAssignment || undefined,
    ...(Object.keys(extra).length ? { extra } : {})
  };

  return { order, items, couponApplied, couponCode, couponDeity, useCartOnly };
}

async function maybeSendOrderEmails(env, order, ctx = {}) {
  try {
    if (!order || !env) return;
    const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
    const fromDefault = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
    const hasTransport = apiKey && fromDefault;
    if (!hasTransport) {
      console.log('[mail] skip sending — missing config', { hasApiKey: !!apiKey, fromDefault });
      return;
    }
    const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
    const origin = (ctx.origin || '').replace(/\/$/, '');
    const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://shop.unalomecodes.com').replace(/\/$/, '');
    const serviceLookupBase = env.SERVICE_LOOKUP_URL
      ? env.SERVICE_LOOKUP_URL.replace(/\/$/, '')
      : `${primarySite}/service.html`;
    const defaultLookupBase = (env.ORDER_LOOKUP_URL || primarySite).replace(/\/$/, '');
    const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || String(order?.method||'').includes('服務');
    const lookupUrl = order.id
      ? isServiceOrder && serviceLookupBase
        ? `${serviceLookupBase}#lookup=${encodeURIComponent(order.id)}`
        : `${defaultLookupBase}/shop#lookup=${encodeURIComponent(order.id)}`
      : '';
    const channel = ctx.channel || order.method || '';
    const customerEmail = (
      order?.buyer?.email ||
      order?.email ||
      order?.contactEmail ||
      order?.buyer_email ||
      order?.recipientEmail ||
      ''
    ).trim();
    const adminRaw = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
    const channelLabel = channel ? channel : (order.method || '訂單');
    const emailContext = ctx.emailContext || 'order_created';
    const notifyCustomer = ctx.notifyCustomer === false ? false : !!customerEmail;
    const notifyAdmin = ctx.notifyAdmin === false ? false : adminRaw.length > 0;
    const statusLabel = (order.status || '').trim();
    const isBlessingDone = statusLabel === '祈福完成';
    const customerSubject = emailContext === 'status_update'
      ? `${siteName} 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
      : `${siteName} 訂單確認 #${order.id}`;
    const adminSubject = emailContext === 'status_update'
      ? `[${siteName}] 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
      : `[${siteName}] 新訂單通知 #${order.id}`;
    const defaultImageHost = env.EMAIL_IMAGE_HOST || env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://shop.unalomecodes.com';
    const imageHost = ctx.imageHost || defaultImageHost || origin;
    const composeOpts = { siteName, lookupUrl, channelLabel, imageHost, context: emailContext, blessingDone: isBlessingDone };
    const { html: customerHtml, text: customerText } = composeOrderEmail(order, Object.assign({ admin:false }, composeOpts));
    const { html: adminHtml, text: adminText } = composeOrderEmail(order, Object.assign({ admin:true }, composeOpts));
    const tasks = [];
    if (notifyCustomer && customerEmail) {
      tasks.push(sendEmailMessage(env, {
        from: fromDefault,
        to: [customerEmail],
        subject: customerSubject,
        html: customerHtml,
        text: customerText
      }));
    }
    if (notifyAdmin && adminRaw.length) {
      tasks.push(sendEmailMessage(env, {
        from: fromDefault,
        to: adminRaw,
        subject: adminSubject,
        html: adminHtml,
        text: adminText
      }));
    }
    if (!tasks.length) {
      console.log('[mail] skip sending — no recipients resolved');
      return;
    }
    const settled = await Promise.allSettled(tasks);
    settled.forEach((res, idx)=>{
      if (res.status === 'rejected'){
        console.error('[mail] send failed', idx, res.reason);
      }
    });
  } catch (err) {
    console.error('sendOrderEmails error', err);
  }
}

function composeOrderEmail(order, opts = {}) {
  const esc = escapeHtmlEmail;
  const fmt = formatCurrencyTWD;
  const brand = opts.siteName || 'Unalomecodes';
  const buyerName = (order?.buyer?.name || '').trim() || '貴賓';
  const phone = (order?.buyer?.phone || order?.buyer?.contact || order?.contact || '').trim();
  const email = (order?.buyer?.email || '').trim();
  const store = (order?.buyer?.store || order?.store || '').trim();
  const status = order.status || '處理中';
  const note = (order.note || '').trim();
  const methodRaw = opts.channelLabel || order.method || '訂單';
  const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || /服務/.test(String(order?.method||''));
  const method = (isServiceOrder && (!order.paymentMethod || /服務/.test(methodRaw))) ? '轉帳匯款' : methodRaw;
  const context = opts.context || 'order_created';
  const items = buildOrderItems(order);
  const shippingFee = Number(order.shippingFee ?? order.shipping ?? 0) || 0;
  const discountAmount = Math.max(0, Number(order?.coupon?.discount || 0));
  let subtotal = 0;
  if (items.length) {
    subtotal = items.reduce((s, it) => s + Number(it.total || 0), 0);
  } else if (order.price) {
    subtotal = Number(order.price || 0) * Math.max(1, Number(order.qty || 1) || 1);
  }
  if (!subtotal) subtotal = Math.max(0, Number(order.amount || 0) - shippingFee + discountAmount);
  const totalAmount = Math.max(0, Number(order.amount || 0));
  const supportEmail = 'bkkaiwei@gmail.com';
  const lineLabel = '@427oaemj';
  const lineInstruction = 'LINE ID：@427oaemj（請於官方 LINE 搜尋加入）';
  const couponLabelHtml = order?.coupon?.code ? `（${esc(order.coupon.code)}）` : '';
  const couponLabelText = order?.coupon?.code ? `（${order.coupon.code}）` : '';
  const plainMode = !!opts.plain;
  const itemsHtml = plainMode
    ? items.map(it => `• ${esc(it.name)}${it.spec ? `（${esc(it.spec)}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('<br>') || '<p>本次訂單明細將由客服另行確認。</p>'
    : items.length
      ? items.map((it, idx) => {
          const imgUrl = rewriteEmailImageUrl(it.image, opts.imageHost);
          const img = imgUrl
            ? `<img src="${esc(imgUrl)}" alt="${esc(it.name)}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;margin-right:16px;">`
            : `<div style="width:64px;height:64px;border-radius:12px;background:#e2e8f0;margin-right:16px;"></div>`;
          const dividerStyle = idx === items.length - 1 ? '' : 'border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;';
          return `<div style="display:flex;align-items:center;${dividerStyle}">
            ${img}
            <div style="flex:1;">
              <div style="font-weight:600;color:#0f172a;">${esc(it.name)}</div>
              ${it.spec ? `<div style="color:#475569;font-size:14px;margin:4px 0;">${esc(it.spec)}</div>` : ''}
              <div style="color:#0f172a;font-size:14px;">數量：${it.qty}</div>
            </div>
            <div style="font-weight:600;color:#0f172a;">${fmt(it.total)}</div>
          </div>`;
        }).join('')
      : '<p style="margin:0;color:#475569;">本次訂單明細將由客服另行確認。</p>';
  const itemsText = items.length
    ? items.map(it => `• ${it.name}${it.spec ? `（${it.spec}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('\n')
    : '（本次訂單明細將由客服另行確認）';
  const shippingNote = shippingFee ? `（含運費${fmt(shippingFee).replace('NT$ ', '')}）` : '';
  const baseInfoHtml = plainMode
    ? `<p>訂單編號：${esc(order.id || '')}<br>訂單狀態：${esc(status)}<br>付款方式：${esc(method)}<br>應付金額：${fmt(order.amount || 0)}${shippingNote}</p>`
    : [
        `<p><strong>訂單編號：</strong>${esc(order.id || '')}</p>`,
        `<p><strong>訂單狀態：</strong>${esc(status)}</p>`,
        `<p><strong>付款方式：</strong>${esc(method)}</p>`,
        `<p><strong>應付金額：</strong>${fmt(order.amount || 0)}${shippingNote}</p>`
      ].filter(Boolean).join('');
  const lookupHtml = opts.lookupUrl
    ? plainMode
      ? `<p>查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）</p>`
      : `<div style="margin-top:16px;padding:12px;border-radius:8px;background:#eef2ff;color:#312e81;font-size:13px;">
          查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）
        </div>`
    : '';
  let customerIntro = (context === 'status_update')
    ? `<p>親愛的 ${esc(buyerName)} 您好：</p>
      <p>您的訂單狀態已更新為 <strong>${esc(status)}</strong>。請勿直接回覆此信，如需協助可寫信至 ${esc(supportEmail)} 或加入官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`
    : `<p>親愛的 ${esc(buyerName)} 您好：</p>
      <p>我們已收到您的訂單。請勿直接回覆此信，如需協助可寫信至 ${esc(supportEmail)} 或加入官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`;
  const isBlessingDone = opts.blessingDone || (order.status === '祈福完成');
  if (context === 'status_update' && isBlessingDone){
    const lookupLine = opts.lookupUrl
      ? `請至 <a href="${esc(opts.lookupUrl)}" target="_blank" rel="noopener">查詢祈福進度</a> 輸入手機號碼，並搭配訂單編號末五碼或匯款帳號末五碼，即可查看祈福完成的照片。`
      : '請至查詢祈福進度輸入手機號碼，並搭配訂單編號末五碼或匯款帳號末五碼，即可查看祈福完成的照片。';
    customerIntro += `<p>${lookupLine}</p>`;
  }
  const adminIntro = `<p>${esc(opts.siteName || '商城')} 有一筆新的訂單建立。</p>`;
  const contactRows = [
    buyerName ? `<p style="margin:0 0 8px;"><strong>收件人：</strong>${esc(buyerName)}</p>` : '',
    phone ? `<p style="margin:0 0 8px;"><strong>聯絡電話：</strong>${esc(phone)}</p>` : '',
    email ? `<p style="margin:0 0 8px;"><strong>Email：</strong>${esc(email)}</p>` : '',
    store ? `<p style="margin:0 0 8px;"><strong>7-11 門市：</strong>${esc(store)}</p>` : '',
    note ? `<p style="margin:0;"><strong>備註：</strong>${esc(note)}</p>` : ''
  ].filter(Boolean);
  const contactHtml = contactRows.length
    ? `<div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-size:14px;">${contactRows.join('')}</div>`
    : '';
  const amountHtml = plainMode
    ? `<p>商品金額：${fmt(subtotal)}${discountAmount ? `<br>優惠折抵：-${fmt(discountAmount)}` : ''}${shippingFee ? `<br>運費：${fmt(shippingFee)}` : ''}<br>合計應付：${fmt(totalAmount)}</p>`
    : `
      <div style="margin-top:24px;padding:20px;border-radius:12px;background:#0f172a;color:#f8fafc;">
        <h3 style="margin:0 0 12px;font-size:18px;">付款明細</h3>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>商品金額</span><span>${fmt(subtotal)}</span></div>
        ${discountAmount ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#fbbf24;"><span>優惠折抵</span><span>- ${fmt(discountAmount)}</span></div>` : ''}
        ${shippingFee ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>運費</span><span>${fmt(shippingFee)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px;margin-top:12px;"><span>合計應付</span><span>${fmt(totalAmount)}</span></div>
      </div>
    `;
  const customerFooter = opts.admin ? '' : plainMode
    ? `<p>本信件為系統自動發送，請勿直接回覆。客服信箱：${esc(supportEmail)}；官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）。</p>`
    : `
      <div style="margin-top:24px;padding:16px;border-radius:12px;background:#f1f5f9;color:#475569;font-size:13px;line-height:1.6;">
        本信件為系統自動發送，請勿直接回覆。<br>
        客服信箱：${esc(supportEmail)}<br>
        官方 LINE ID：${lineLabel}（請於 LINE 搜尋加入）
      </div>
    `;
  const html = plainMode
    ? `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px;">
        <p style="font-weight:700;font-size:18px;">${esc(brand)}</p>
        ${opts.admin ? adminIntro : customerIntro}
        ${baseInfoHtml}
        ${amountHtml}
        <p>商品明細：</p>
        <p>${itemsHtml}</p>
        ${contactHtml ? `<p>聯絡資訊：<br>${contactHtml}</p>` : ''}
        ${lookupHtml}
        ${opts.admin ? '' : '<p>感謝您的支持，祝福一切順心圓滿！</p>'}
        ${customerFooter}
      </div>
    `
    : `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:15px;padding:16px 10px;background:#f5f7fb;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
          <p style="margin:0 0 12px;font-weight:700;font-size:18px;">${esc(brand)}</p>
          ${opts.admin ? adminIntro : customerIntro}
          <h3 style="font-size:16px;margin:18px 0 8px;">基本資訊</h3>
          ${baseInfoHtml}
          ${amountHtml}
          <h3 style="font-size:16px;margin:24px 0 10px;">商品明細</h3>
          ${itemsHtml}
          ${contactHtml ? `<h3 style="font-size:16px;margin:20px 0 10px;">聯絡資訊</h3>${contactHtml}` : ''}
          ${lookupHtml}
          ${opts.admin ? '' : '<p style="margin:18px 0 0;">感謝您的支持，祝福一切順心圓滿！</p>'}
          ${customerFooter}
        </div>
      </div>
    `;
  const textParts = [];
  if (opts.admin) {
    textParts.push(`${opts.siteName || '商城'} 有一筆新訂單：`);
  } else if (context === 'status_update') {
    textParts.push(`親愛的 ${buyerName} 您好：您的訂單狀態已更新為「${status}」。請勿直接回覆此信，可透過 ${supportEmail} 或 LINE ID：${lineLabel} 聯繫。`);
    if (isBlessingDone){
      const lookupText = opts.lookupUrl
        ? `請至 ${opts.lookupUrl} 查詢祈福進度，輸入手機號碼並搭配訂單編號末五碼或匯款帳號末五碼，即可查看祈福完成的照片。`
        : '請至查詢祈福進度輸入手機號碼並搭配訂單編號末五碼或匯款帳號末五碼，即可查看祈福完成的照片。';
      textParts.push(lookupText);
    }
  } else {
    textParts.push(`親愛的 ${buyerName} 您好：我們已收到您的訂單。請勿直接回覆此信，如需協助可寫信至 ${supportEmail} 或加入官方 LINE ID：${lineLabel}。`);
  }
  textParts.push(`訂單編號：${order.id}`);
  textParts.push(`訂單狀態：${status}`);
  textParts.push(`付款方式：${method}`);
  textParts.push(`商品金額：${fmt(subtotal)}`);
  if (discountAmount) textParts.push(`優惠折抵：-${fmt(discountAmount)}`);
  if (shippingFee) textParts.push(`運費：${fmt(shippingFee)}`);
  textParts.push(`合計應付：${fmt(totalAmount)}${shippingNote}`);
  textParts.push('商品明細：');
  textParts.push(itemsText);
  if (phone) textParts.push(`聯絡電話：${phone}`);
  if (email) textParts.push(`Email：${email}`);
  if (store) textParts.push(`7-11 門市：${store}`);
  if (note) textParts.push(`備註：${note}`);
  if (opts.lookupUrl) textParts.push(`查詢訂單：${opts.lookupUrl}`);
  if (!opts.admin) textParts.push('感謝您的訂購！');
  return { html, text: textParts.join('\n') };
}

function rewriteEmailImageUrl(url, host) {
  if (!url || !host) return url;
  try {
    const base = host.startsWith('http') ? host : `https://${host.replace(/\/+$/, '')}`;
    const hostUrl = new URL(base);
    const imgUrl = new URL(url, base);
    imgUrl.protocol = hostUrl.protocol;
    imgUrl.hostname = hostUrl.hostname;
    imgUrl.port = hostUrl.port;
    return imgUrl.toString();
  } catch (_) {
    try {
      const base = host.startsWith('http') ? host : `https://${host}`;
      return new URL(url, base).toString();
    } catch {
      return url;
    }
  }
}

function buildOrderItems(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.map(it => ({
      name: String(it.productName || it.name || it.title || '商品'),
      spec: String(it.variantName || it.spec || it.deity || '').trim(),
      qty: Math.max(1, Number(it.qty || it.quantity || 1) || 1),
      total: Number(it.total || (Number(it.price || it.unitPrice || 0) * Math.max(1, Number(it.qty || it.quantity || 1) || 1)) || 0),
      image: String(it.image || it.picture || it.img || '')
    }));
  }
  if (order.productName) {
    const qty = Math.max(1, Number(order.qty || 1) || 1);
    const unit = Number(order.price || (order.amount || 0) / qty || 0);
    return [{
      name: String(order.productName),
      spec: String(order.variantName || '').trim(),
      qty,
      total: unit * qty,
      image: String(order.productImage || order.image || order.cover || '')
    }];
  }
  return [];
}

async function sendEmailMessage(env, message) {
  const apiKey = (env.RESEND_API_KEY || env.RESEND_KEY || '').trim();
  const fromEnv = (env.ORDER_EMAIL_FROM || env.RESEND_FROM || env.EMAIL_FROM || '').trim();
  const from = (message.from || fromEnv).trim();
  const toList = Array.isArray(message.to) ? message.to.filter(Boolean) : [message.to].filter(Boolean);
  if (!apiKey || !from || !toList.length) {
    console.log('[mail] transport unavailable', { hasApiKey: !!apiKey, from, toCount: toList.length });
    return { ok:false, skipped:'missing_config' };
  }
  const endpoint = (env.RESEND_ENDPOINT || 'https://api.resend.com/emails').trim() || 'https://api.resend.com/emails';
  const defaultReplyTo = 'bkkaiwei@gmail.com';
  const replyTo = message.replyTo || defaultReplyTo;
  const payload = {
    from,
    to: toList,
    subject: message.subject || 'Order Notification',
    html: message.html || undefined,
    text: message.text || undefined
  };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text().catch(()=> '');
    throw new Error(`Email API ${res.status}: ${errText || res.statusText}`);
  }
  let data = {};
  try { data = await res.json(); } catch(_){}
  return data;
}

function shouldNotifyStatus(status) {
  const txt = String(status || '').trim();
  if (!txt) return false;
  if (txt === '待處理' || txt === '處理中') return false;
  if (/祈福進行中/.test(txt)) return true;
  if (/祈福完成/.test(txt)) return true;
  if (/成果已通知/.test(txt)) return true;
  if (/已付款/.test(txt) && /出貨|寄件|寄貨|出貨/.test(txt)) return true;
  if (/已寄件/.test(txt) || /已寄出/.test(txt) || /寄出/.test(txt)) return true;
  if (/已出貨/.test(txt)) return true;
  return txt === '已付款待出貨'
    || txt === '已寄件'
    || txt === '已寄出';
}

function escapeHtmlEmail(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(str || '').replace(/[&<>"']/g, function(m){
    return map[m] || m;
  });
}

function formatCurrencyTWD(num) {
  try {
    return 'NT$ ' + Number(num || 0).toLocaleString('zh-TW');
  } catch (_) {
    return 'NT$ ' + (num || 0);
  }
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
  const qOrdRaw  = getAny(url.searchParams, ['order','orderId','order_id','oid','qOrder']);
  const qPhone = normalizePhone(qPhoneRaw);
  const qLast5 = (String(qLast5Raw).replace(/\D/g, '') || '').slice(-5);
  const qOrd   = (String(qOrdRaw||'').replace(/\D/g, '') || '').slice(-5);
  const needFilter = !!((qPhone && qLast5) || qOrd);
  const isPartialLookup = (!qOrd) && (!!(qPhone || qLast5) && !(qPhone && qLast5));

  if (isPartialLookup) {
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
          if (qOrd){
            if (!String(oid||'').endsWith(qOrd)) continue;
            if (qPhone){
              const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
              if (!pOK) continue;
            }
          }else{
            const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
            const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
            if (!pOK || !lOK) continue;
          }
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
              if (qOrd){
                if (!String(oid||'').endsWith(qOrd)) continue;
                if (qPhone) {
                  const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
                  if (!pOK) continue;
                }
              }else{
                if (qPhone) {
                  const pOK = phoneCandidates.some(p => matchPhone(p, qPhone));
                  if (!pOK) continue;
                }
                if (qLast5) {
                  const lOK = last5Candidates.some(l => matchLast5(l, qLast5));
                  if (!lOK) continue;
                }
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
    if (!isAdmin(request, env)) {
      return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
    }
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
  if (!isAdmin(request, env)) {
    return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
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
      const prevStatus = obj.status || '';
      let statusChanged = false;
      if (status && status !== prevStatus) {
        obj.status = status;
        statusChanged = true;
      }
      obj.updatedAt = new Date().toISOString();
      await env.ORDERS.put(id, JSON.stringify(obj));
      let emailNotified = false;
      if (statusChanged && shouldNotifyStatus(obj.status)) {
        try {
          await maybeSendOrderEmails(env, obj, { origin, channel: obj.method || '轉帳匯款', notifyAdmin:false, emailContext:'status_update' });
          emailNotified = true;
        } catch (err) {
          console.error('status update email error', err);
        }
      }
      return new Response(JSON.stringify({ ok:true, status: obj.status, notified: emailNotified }), { status:200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok:false, error:'Missing action/status' }), { status:400, headers: jsonHeaders });
    } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/products' && request.method === 'GET') {
  const store = env.SERVICE_PRODUCTS || env.PRODUCTS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_PRODUCTS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  if (url.searchParams.get('id')){
    const id = String(url.searchParams.get('id'));
    const raw = await store.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    return new Response(JSON.stringify({ ok:true, item: JSON.parse(raw) }), { status:200, headers: jsonHeaders });
  }
  let list = [];
  try{
    const idxRaw = await store.get('SERVICE_PRODUCT_INDEX');
    if (idxRaw){
      list = JSON.parse(idxRaw) || [];
    }
  }catch(_){}
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
      items.push(obj);
    }catch(_){}
  }
  const finalItems = items.length ? items : DEFAULT_SERVICE_PRODUCTS;
  return new Response(JSON.stringify({ ok:true, items: finalItems }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/products' && request.method === 'POST') {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
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
  await store.put(id, JSON.stringify(payload));
  const idxKey = 'SERVICE_PRODUCT_INDEX';
  let list = [];
  try{
    const idxRaw = await store.get(idxKey);
    if (idxRaw){
      list = JSON.parse(idxRaw) || [];
    }
  }catch(_){}
  list = [id].concat(list.filter(x=> x !== id)).slice(0,200);
  await store.put(idxKey, JSON.stringify(list));
  return new Response(JSON.stringify({ ok:true, item: payload }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/products' && request.method === 'PUT') {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
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
  const next = Object.assign({}, prev, body, { id, updatedAt: new Date().toISOString() });
  await store.put(id, JSON.stringify(next));
  return new Response(JSON.stringify({ ok:true, item: next }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/products' && request.method === 'DELETE') {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
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
  }catch(_){}
  return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/order' && request.method === 'POST') {
  try{
    const body = await request.json();
    const serviceId = String(body.serviceId||'').trim();
    const name = String(body.name||'').trim();
    const phone = String(body.phone||'').trim();
    if (!serviceId || !name || !phone){
      return new Response(JSON.stringify({ ok:false, error:'缺少必要欄位' }), { status:400, headers: jsonHeaders });
    }
    const svcStore = env.SERVICE_PRODUCTS || env.PRODUCTS;
    let svc = null;
    if (svcStore){
      const rawSvc = await svcStore.get(serviceId);
      if (rawSvc){
        try{ svc = JSON.parse(rawSvc); }catch(_){}
      }
    }
    if (!svc) return new Response(JSON.stringify({ ok:false, error:'找不到服務項目' }), { status:404, headers: jsonHeaders });
    const transferLast5 = String(body.transferLast5||'').trim();
    const transferReceiptUrl = String(body.transferReceiptUrl||'').trim();
    const ritualPhotoUrl = String(body.ritualPhotoUrl||'').trim();
    if (!/^\d{5}$/.test(transferLast5) || !transferReceiptUrl){
      return new Response(JSON.stringify({ ok:false, error:'缺少匯款資訊' }), { status:400, headers: jsonHeaders });
    }
    const transferMemo = String(body.transferMemo||'').trim();
    const transferBank = String(body.transferBank||'').trim();
    const transferAccount = String(body.transferAccount||'').trim();
    const orderId = await generateServiceOrderId(env);
    const buyer = {
      name,
      phone,
      email: String(body.email||'').trim(),
      birth: String(body.birth||'').trim(),
      line: String(body.line||'').trim()
    };
    const options = Array.isArray(svc.options) ? svc.options : [];
    let baseCount = Number(body.baseCount || 0);
    if (!Number.isFinite(baseCount) || baseCount < 0) baseCount = 0;
    let requestedNames = [];
    if (Array.isArray(body.optionNames) && body.optionNames.length){
      requestedNames = body.optionNames.map(name => String(name||'').trim()).filter(Boolean);
    } else if (body.optionName) {
      requestedNames = [String(body.optionName||'').trim()];
    }
    const selectionList = [];
    if (requestedNames.length){
      for (const nm of requestedNames){
        const info = options.find(opt => opt && (String(opt.name||'').trim() === nm));
        if (!info){
          return new Response(JSON.stringify({ ok:false, error:'服務項目無效' }), { status:400, headers: jsonHeaders });
        }
        selectionList.push({ name: info.name, price: Number(info.price||0) });
      }
    }
    if (options.length && !selectionList.length){
      return new Response(JSON.stringify({ ok:false, error:'請至少選擇一個服務項目' }), { status:400, headers: jsonHeaders });
    }
    const basePrice = Number(svc.price||0);
    let items = [];
    if (selectionList.length){
      items = selectionList.map(opt => ({
        name: `${svc.name}｜${opt.name}`,
        qty: 1,
        total: basePrice + Number(opt.price||0),
        image: svc.cover||''
      }));
    }
    if (!selectionList.length && !options.length && baseCount < 1){
      baseCount = 1;
    }
    if (baseCount > 0){
      for (let i=0;i<baseCount;i++){
        items.push({
          name: svc.name,
          qty: 1,
          total: basePrice,
          image: svc.cover||''
        });
      }
    }
    const finalPrice = items.reduce((sum,it)=> sum + Number(it.total||0), 0);
    const transfer = {
      amount: Number(body.transferAmount || finalPrice) || finalPrice,
      last5: transferLast5,
      receiptUrl: transferReceiptUrl,
      memo: transferMemo,
      bank: transferBank,
      account: transferAccount,
      uploadedAt: new Date().toISOString()
    };
    const order = {
      id: orderId,
      type: 'service',
      serviceId,
      serviceName: svc.name,
      selectedOption: selectionList.length === 1 ? selectionList[0] : undefined,
      selectedOptions: selectionList.length > 1 ? selectionList : (selectionList.length ? selectionList : undefined),
      items,
      amount: finalPrice,
      status: '待處理',
      buyer,
      note: String(body.note||'').trim(),
      requestDate: String(body.requestDate||'').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resultToken: makeToken(24),
      method: '服務型商品',
      channel: '服務型商品',
      transfer,
      transferLast5: transferLast5,
      ritualPhotoUrl: ritualPhotoUrl || undefined
    };
    const store = env.SERVICE_ORDERS || env.ORDERS;
    if (!store){
      return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
    }
    await store.put(order.id, JSON.stringify(order));
    const idxKey = 'SERVICE_ORDER_INDEX';
    let idxRaw = await store.get(idxKey);
    let list = [];
    if (idxRaw){
      try{ list = JSON.parse(idxRaw) || []; }catch(_){}
    }
    list = [order.id].concat(list.filter(id => id !== order.id)).slice(0,500);
    await store.put(idxKey, JSON.stringify(list));
    if (svcStore && svc){
      try{
        const soldUnits = items.reduce((sum, it)=> sum + Math.max(1, Number(it.qty||1)), 0) || 1;
        const currSold = Number(svc.sold || 0) || 0;
        const updatedSvc = Object.assign({}, svc, {
          sold: currSold + soldUnits,
          updatedAt: new Date().toISOString()
        });
        await svcStore.put(serviceId, JSON.stringify(updatedSvc));
        svc = updatedSvc;
      }catch(err){
        console.error('service sold counter update failed', err);
      }
    }
    try{
      await maybeSendOrderEmails(env, order, { channel:'服務型商品', notifyAdmin:true, emailContext:'service_created' });
    }catch(err){
      console.error('service order email error', err);
    }
    return new Response(JSON.stringify({ ok:true, orderId }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/orders' && request.method === 'GET') {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  const idQuery = url.searchParams.get('id');
  if (idQuery){
    const raw = await store.get(idQuery);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    return new Response(JSON.stringify({ ok:true, item: JSON.parse(raw) }), { status:200, headers: jsonHeaders });
  }
  const limit = Math.min(Number(url.searchParams.get('limit')||50), 300);
  let list = [];
  try{
    const idxRaw = await store.get('SERVICE_ORDER_INDEX');
    if (idxRaw) list = JSON.parse(idxRaw) || [];
  }catch(_){}
  const items = [];
  for (const id of list.slice(0, limit)){
    const raw = await store.get(id);
    if (!raw) continue;
    try{ items.push(JSON.parse(raw)); }catch(_){}
  }
  return new Response(JSON.stringify({ ok:true, items }), { status:200, headers: jsonHeaders });
}

if (pathname === '/api/service/order/status' && request.method === 'POST') {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  try{
    const body = await request.json();
    const id = String(body.id||'').trim();
    const status = String(body.status||'').trim();
    if (!id || !status) return new Response(JSON.stringify({ ok:false, error:'Missing id/status' }), { status:400, headers: jsonHeaders });
    const raw = await store.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    const order = JSON.parse(raw);
    order.status = status;
    order.updatedAt = new Date().toISOString();
    await store.put(id, JSON.stringify(order));
    let notified = false;
    if (shouldNotifyStatus(status)){
      try{
        await maybeSendOrderEmails(env, order, { channel:'服務型商品', notifyAdmin:false, emailContext:'status_update' });
        notified = true;
      }catch(err){ console.error('service status email err', err); }
    }
    return new Response(JSON.stringify({ ok:true, notified }), { status:200, headers: jsonHeaders });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/order/result-photo' && request.method === 'POST') {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  try{
    const body = await request.json();
    const id = String(body.id||'').trim();
    const photo = String(body.photo||body.url||'').trim();
    if (!id || !photo){
      return new Response(JSON.stringify({ ok:false, error:'缺少必要欄位' }), { status:400, headers: jsonHeaders });
    }
    const raw = await store.get(id);
    if (!raw) return new Response(JSON.stringify({ ok:false, error:'Not found' }), { status:404, headers: jsonHeaders });
    const order = JSON.parse(raw);
    order.resultPhotoUrl = photo;
    order.updatedAt = new Date().toISOString();
    await store.put(id, JSON.stringify(order));
    return new Response(JSON.stringify({ ok:true, photo }), { status:200, headers: jsonHeaders });
  }catch(err){
    return new Response(JSON.stringify({ ok:false, error:String(err) }), { status:500, headers: jsonHeaders });
  }
}

if (pathname === '/api/service/orders/lookup' && request.method === 'GET') {
  const phone = normalizeTWPhoneStrict(url.searchParams.get('phone')||'');
  const orderDigits = lastDigits(url.searchParams.get('order')||'', 5);
  const bankDigits = lastDigits(url.searchParams.get('bank')||'', 5);
  if (!phone || (!orderDigits && !bankDigits)){
    return new Response(JSON.stringify({ ok:false, error:'缺少查詢條件' }), { status:400, headers: jsonHeaders });
  }
  const store = env.SERVICE_ORDERS || env.ORDERS;
  if (!store){
    return new Response(JSON.stringify({ ok:false, error:'SERVICE_ORDERS 未綁定' }), { status:500, headers: jsonHeaders });
  }
  let list = [];
  try{
    const idxRaw = await store.get('SERVICE_ORDER_INDEX');
    if (idxRaw) list = JSON.parse(idxRaw) || [];
  }catch(_){}
  const matches = [];
  for (const id of list.slice(0, 200)){
    const raw = await store.get(id);
    if (!raw) continue;
    let order = null;
    try{ order = JSON.parse(raw); }catch(_){}
    if (!order) continue;
    const buyerPhone = normalizeTWPhoneStrict(order?.buyer?.phone || '');
    const orderLast5 = lastDigits(order.id || '', 5);
    const transferLast5 = lastDigits(order?.transfer?.last5 || order?.transferLast5 || '', 5);
    if (buyerPhone && buyerPhone.endsWith(phone.slice(-9)) && ((orderDigits && orderLast5 === orderDigits) || (bankDigits && transferLast5 === bankDigits))){
      matches.push(order);
    }
  }
  return new Response(JSON.stringify({ ok:true, orders: matches }), { status:200, headers: jsonHeaders });
}

    // 圖片上傳
    if (pathname === "/api/upload" && request.method === "POST") {
      return handleUpload(request, env, origin);
    }

    // 圖片刪除
    if (pathname.startsWith("/api/file/") && request.method === "DELETE") {
      if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
      const key = decodeURIComponent(pathname.replace("/api/file/", ""));
      return deleteR2FileByKey(key, env);
    }
    if (pathname === "/api/deleteFile" && request.method === "POST") {
      if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
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
    if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
    return deleteStories(url, env);
  }
  return createStory(request, env);
}
if (pathname === "/api/stories" && request.method === "DELETE") {
  if (!isAdmin(request, env)) return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeaders });
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

      const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://shop.unalomecodes.com';
      const base = publicHost.startsWith('http') ? publicHost.replace(/\/+$/,'') : `https://${publicHost.replace(/\/+$/,'')}`;
      const url = `${base}/api/file/${encodeURIComponent(key)}`;
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
    instagram: String(body.instagram || body.ig || body.instagramUrl || body.igUrl || ""),
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
      const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://shop.unalomecodes.com';
      const base = publicHost.startsWith('http') ? publicHost.replace(/\/+$/,'') : `https://${publicHost.replace(/\/+$/,'')}`;
      target = `${base}/api/file/${encodeURIComponent(key)}`;
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
