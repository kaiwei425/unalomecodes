function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createPaymentHandlers(deps){
  requireDeps(deps, ['json', 'getSessionUser', 'ensureUserRecord', 'resolveOrderSelection', 'generateOrderId', 'inferCouponDeity', 'computeServerDiscount', 'markCouponUsageOnce', 'redeemCoupon', 'needShippingFee', 'resolveShippingFee', 'makeToken', 'decStockCounters', 'trimOrderIndex', 'ORDER_INDEX_KEY', 'maybeSendOrderEmails', 'updateUserDefaultContact', 'safeExt', 'guessExt', 'isAllowedFileUrl', 'buildOrderDraft', 'ecpayEndpoint', 'ecpayCheckMac', 'releaseCouponUsage', 'restoreStockCounters', 'bumpSoldCounters', 'decSoldCounters', 'shouldNotifyStatus'], 'payment.js');
  const {
    json,
    getSessionUser,
    ensureUserRecord,
    resolveOrderSelection,
    generateOrderId,
    inferCouponDeity,
    computeServerDiscount,
    markCouponUsageOnce,
    redeemCoupon,
    needShippingFee,
    resolveShippingFee,
    makeToken,
    decStockCounters,
    trimOrderIndex,
    ORDER_INDEX_KEY,
    maybeSendOrderEmails,
    updateUserDefaultContact,
    safeExt,
    guessExt,
    isAllowedFileUrl,
    buildOrderDraft,
    ecpayEndpoint,
    ecpayCheckMac,
    releaseCouponUsage,
    restoreStockCounters,
    bumpSoldCounters,
    decSoldCounters,
    shouldNotifyStatus
  } = deps;

  async function handlePayment(request, env, url, origin, pathname){
    if (request.method === 'OPTIONS' && (pathname === '/api/payment/ecpay/create' || pathname === '/api/payment/ecpay/notify')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, x-admin-key, X-Cron-Key, x-cron-key, X-Quiz-Key, x-quiz-key',
          'Cache-Control': 'no-store'
        }
      });
    }

    if (pathname === '/api/payment/bank' && request.method === 'POST') {

      // ==== PATCH MARKER START: BANK_PAYMENT_HANDLER (for coupon block replacement) ====
      
      
      if (!env.ORDERS) {
        return json({ ok:false, error:'ORDERS KV not bound' }, 500, request, env);
      }
      const bankUser = await getSessionUser(request, env);
      if (!bankUser) {
        return json({ ok:false, error:'請先登入後再送出訂單' }, 401, request, env);
      }
      const bankUserRecord = await ensureUserRecord(env, bankUser);
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
          const maxUploadBytes = Number(env.PROOF_MAX_BYTES || 8 * 1024 * 1024) || 8 * 1024 * 1024;
          const allowedProofMime = new Set([
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/pdf'
          ]);
          const allowedProofExt = new Set(['jpg','jpeg','png','webp','gif','pdf']);
          const mimeByExt = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
            pdf: 'application/pdf'
          };
          const validateUploadFile = (file) => {
            const mime = String(file.type || '').toLowerCase();
            const extFromName = safeExt(file.name || '').toLowerCase();
            let ext = (guessExt(mime) || extFromName || '').toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            const mimeOk = mime ? allowedProofMime.has(mime) : false;
            const extOk = ext ? allowedProofExt.has(ext) : false;
            if (!mimeOk && !extOk) return { ok:false, error:'只支援 JPG/PNG/WebP/GIF/PDF 檔案' };
            if (mime && !mimeOk) return { ok:false, error:'檔案類型不支援' };
            if (ext && !extOk) return { ok:false, error:'檔案副檔名不支援' };
            const size = Number(file.size || 0);
            if (size && size > maxUploadBytes) {
              const limitMb = Math.round(maxUploadBytes / 1024 / 1024);
              return { ok:false, error:`檔案過大（上限 ${limitMb}MB）` };
            }
            if (!ext) ext = 'jpg';
            const contentType = mimeOk ? mime : (mimeByExt[ext] || 'application/octet-stream');
            return { ok:true, ext, contentType };
          };
          // === Save uploaded proof into R2 (preferred) ===
          let __receipt_url_from_file = "";
          try {
            const f = fd.get('proof') || fd.get('receipt') || fd.get('upload') || fd.get('file') || fd.get('screenshot');
            if (f && typeof f !== 'string' && (f.stream || f.arrayBuffer)) {
              const check = validateUploadFile(f);
              if (!check.ok) {
                return json({ ok:false, error: check.error }, 400, request, env);
              }
              const day = new Date();
              const y = day.getFullYear();
              const m = String(day.getMonth()+1).padStart(2,'0');
              const d = String(day.getDate()).padStart(2,'0');
              // normalize ext & content type
              const ext = check.ext;
              const key = `receipts/${y}${m}${d}/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;

              if (typeof f.stream === 'function') {
                await env.R2_BUCKET.put(key, f.stream(), {
                  httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
                });
              } else {
                const buf = await f.arrayBuffer();
                if (!buf || !buf.byteLength) {
                  return json({ ok:false, error:'Empty file' }, 400, request, env);
                }
                await env.R2_BUCKET.put(key, buf, {
                  httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
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
              const check = validateUploadFile(rf);
              if (!check.ok) {
                return json({ ok:false, error: check.error }, 400, request, env);
              }
              const day2 = new Date();
              const y2 = day2.getFullYear();
              const m2 = String(day2.getMonth()+1).padStart(2,'0');
              const d2 = String(day2.getDate()).padStart(2,'0');
              const extb = check.ext;
              const rkey = `rituals/${y2}${m2}${d2}/${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extb}`;

              if (typeof rf.stream === 'function') {
                await env.R2_BUCKET.put(rkey, rf.stream(), {
                  httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
                });
              } else {
                const rbuf = await rf.arrayBuffer();
                if (!rbuf || !rbuf.byteLength) {
                  // ignore empty ritual photo
                } else {
                  await env.R2_BUCKET.put(rkey, rbuf, {
                    httpMetadata: { contentType: check.contentType, contentDisposition: 'inline' }
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

        const selection = await resolveOrderSelection(env, body);
        if (!selection.ok){
          const reason = selection.error || 'invalid_product';
          const msg = reason === 'product_not_found' ? '找不到商品'
            : reason === 'product_inactive' ? '商品已下架'
            : reason === 'invalid_variant' ? '商品規格無效'
            : reason === 'out_of_stock' ? '庫存不足'
            : '缺少商品資訊';
          return json({ ok:false, error: msg }, 400, request, env);
        }
        const useCartOnly = selection.useCartOnly;
        const items = selection.items;
        const productId = selection.productId;
        const productName = selection.productName;
        const price = selection.price;
        const qty = selection.qty;
        const deity = selection.deity;
        const variantName = selection.variantName;

        const methodToken = String(body?.method || body?.paymentMethod || body?.payment || '').trim();
        const methodKey = methodToken.toLowerCase();
        const isCod711 = methodKey.includes('cod') || methodKey.includes('貨到付款') || methodKey.includes('711');
        const methodLabel = isCod711 ? '貨到付款(7-11)' : '轉帳匯款';

        const buyer = {
          name:  String((body?.buyer?.name)  || body?.name  || body?.buyer_name  || body?.bfName    || ''),
          email: String((body?.buyer?.email) || body?.email || body?.buyer_email || body?.bfEmail   || ''),
          line:  String((body?.buyer?.line)  || body?.line  || body?.buyer_line  || ''),
          phone: String((body?.buyer?.phone) || body?.phone || body?.contact || body?.buyer_phone || body?.bfContact || ''),
          store: String((body?.buyer?.store) || body?.store || body?.buyer_store || body?.storeid   || '')
        };
        if (bankUserRecord && bankUserRecord.defaultContact){
          if (!buyer.name) buyer.name = bankUserRecord.defaultContact.name || '';
          if (!buyer.phone) buyer.phone = bankUserRecord.defaultContact.phone || '';
          if (!buyer.email) buyer.email = bankUserRecord.defaultContact.email || '';
        }
        if (bankUser){
          if (!buyer.name) buyer.name = bankUser.name || '';
          if (!buyer.email) buyer.email = bankUser.email || '';
          buyer.uid = bankUser.id;
        }
        const transferLast5 = String(body?.transferLast5 || body?.last5 || body?.bfLast5 || '').trim();
        const receiptUrl = (() => {
          let u = String(body?.receiptUrl || body?.receipt || body?.proof || body?.proofUrl || body?.screenshot || body?.upload || '').trim();
          if (!u) return '';
          if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
            u = `${origin}/api/proof/${encodeURIComponent(u)}`;
          }
          if (!isAllowedFileUrl(u, env, origin)) return '';
          if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
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
        if (!isCod711) {
          if (!receiptUrl) {
            return json({ ok:false, error:'缺少匯款憑證' }, 400, request, env);
          }
          if (!/^\d{5}$/.test(transferLast5)) {
            return json({ ok:false, error:'請輸入匯款末五碼' }, 400, request, env);
          }
        }
        let amount = items.reduce((s, it) => {
          const unit = Number(it.price ?? it.unitPrice ?? 0) || 0;
          const q    = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
          return s + unit * q;
        }, 0);

        // New order id (random alphanumeric) – generated early so coupon redeem can bind to this order
        const newId = await generateOrderId(env);

        // === Coupon (optional): server-verified discount, bound to this order ===
        const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
        let couponDeity   = inferCouponDeity(couponCode, body.coupon_deity || body.deity || "");
        if (!couponDeity && items.length) {
          // 若購物車只有單一守護神，推論其代碼；多種則留空交由券服務驗證 eligible
          const set = new Set(items.map(it => String(it.deity||'').toUpperCase()).filter(Boolean));
          couponDeity = (set.size === 1) ? Array.from(set)[0] : '';
        }
        const rawCoupons = Array.isArray(body.coupons) ? body.coupons : [];
        const normalizedCoupons = rawCoupons.map(c => {
          const code = String((c && c.code) || '').trim().toUpperCase();
          const deity = inferCouponDeity(code, c && c.deity);
          return { code, deity };
        }).filter(c => c.code);
        const couponInputs = normalizedCoupons.length ? normalizedCoupons : (couponCode ? [{ code: couponCode, deity: couponDeity }] : []);
        const firstCoupon = couponInputs[0] || null;
        let couponApplied = null;

        if (couponInputs.length) {
          if (Array.isArray(items) && items.length) {
            try {
              const discInfo = await computeServerDiscount(env, items, couponInputs, newId);
              const totalDisc = Math.max(0, Number(discInfo?.total || 0));
              const shippingDisc = Math.max(0, Number(discInfo?.shippingDiscount || 0));
              if (totalDisc > 0 || shippingDisc > 0) {
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
                    shippingDiscount: shippingDisc || undefined,
                    redeemedAt: Date.now(),
                    lines: Array.isArray(discInfo.lines) ? discInfo.lines : [],
                    multi: couponInputs.length > 1,
                    locked: true
                  };
                }
              } else {
                couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'invalid_or_not_applicable' };
              }
            } catch (e) {
              console.error('computeServerDiscount error', e);
              couponApplied = { code: (firstCoupon && firstCoupon.code) || '', deity: firstCoupon?.deity || '', codes: couponInputs.map(c=>c.code), failed: true, reason: 'error' };
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
                  couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now(), locked: true };
                }
              } else {
                couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: (r && r.reason) || 'invalid' };
              }
            } catch (e) {
              console.error('redeemCoupon error', e);
              couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: 'error' };
            }
          }
        }

        // Optional candle ritual metadata
        const fallbackText = `${body?.category || ''} ${productName || body?.productName || ''}`.trim();
        const shippingNeeded = needShippingFee(items, fallbackText);
        const codShippingFee = Number(env.COD_711_SHIPPING_FEE || 38) || 38;
        const baseShipping = isCod711 ? codShippingFee : resolveShippingFee(env);
        let shippingFee = shippingNeeded ? baseShipping : 0;
        const shippingDiscount = Math.max(0, Number((couponApplied && couponApplied.shippingDiscount) || 0));
        if (shippingDiscount > 0){
          shippingFee = Math.max(0, shippingFee - shippingDiscount);
        }
        amount = Math.max(0, Number(amount || 0)) + shippingFee;

        const ritualNameEn   = String(body.ritual_name_en || body.ritualNameEn || body.candle_name_en || '').trim();
        const ritualBirthday = String(body.ritual_birthday || body.ritualBirthday || body.candle_birthday || '').trim();
        const ritualPhotoUrl = (() => {
          let u = String(body.ritual_photo_url || body.ritualPhotoUrl || '').trim();
          if (!u) return '';
          if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
            u = `${origin}/api/proof/${encodeURIComponent(u)}`;
          }
          if (!isAllowedFileUrl(u, env, origin)) return '';
          if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
          return u;
        })();
        const extra = {};
        if (ritualNameEn || ritualBirthday || ritualPhotoUrl) {
          extra.candle = {
            nameEn: ritualNameEn || undefined,
            birthday: ritualBirthday || undefined,
            photoUrl: ritualPhotoUrl || undefined
          };
        }

        // 會員折扣暫時關閉
        let memberDiscount = 0;
        let perkInfo = null;

        const now = new Date().toISOString();
        const order = {
          id: newId,
          productId, productName, price, qty,
          deity, variantName,
          items: useCartOnly && items.length ? items : undefined,
          method: methodLabel,
          buyer,
          ...(isCod711 ? {} : { transferLast5, receiptUrl }),
          note: noteVal,
          amount: Math.max(0, Math.round(amount || 0)),
          shippingFee: shippingFee || 0,
          shipping: shippingFee || 0,
          status: '訂單待處理',
          createdAt: now, updatedAt: now,
          ritual_photo_url: ritualPhotoUrl || undefined,
          ritualPhotoUrl: ritualPhotoUrl || undefined,
          resultToken: makeToken(32),
          results: [],
          coupon: couponApplied || undefined,
          couponAssignment: (couponApplied && couponApplied.lines) ? couponApplied.lines : undefined,
          stockDeducted: false,
          soldCounted: false,
          // memberDiscount: 暫不使用
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
        trimOrderIndex(ids, env);
        await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));

        // Decrement inventory (variants 或 product-level)
        try {
          await decStockCounters(env, items, productId, (body.variantName||body.variant||''), qty);
          order.stockDeducted = true;
          await env.ORDERS.put(order.id, JSON.stringify(order));
        } catch(_){ }
        try {
          await maybeSendOrderEmails(env, order, { origin, channel: order.method || methodLabel });
        } catch (err) {
          console.error('sendOrderEmails(bank) error', err);
        }

        // 會員折扣暫不啟用，因此不需標記使用狀態
        try{
          await updateUserDefaultContact(env, bankUser.id, {
            name: buyer.name || '',
            phone: buyer.phone || '',
            email: buyer.email || ''
          });
        }catch(_){ }

        return json({ ok:true, id: order.id, order }, 200, request, env);
      } catch (e) {
        return json({ ok:false, error:String(e) }, 500, request, env);
      }

    }

    // ======== End of Bank Transfer Additions ========

    // ======== ECPay Credit Card ========
    if (pathname === '/api/payment/ecpay/create' && request.method === 'POST') {
      try {
        if (!env.ORDERS) {
          return json({ ok:false, error:'ORDERS KV not bound' }, 500, request, env);
        }
        const orderUser = await getSessionUser(request, env);
        if (!orderUser) {
          return json({ ok:false, error:'請先登入後再送出訂單' }, 401, request, env);
        }
        if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
          return json({ ok:false, error:'Missing ECPay config' }, 500, request, env);
        }
        const ct = (request.headers.get('content-type') || '').toLowerCase();
        const body = ct.includes('application/json') ? (await request.json()) : {};

        let draft;
        try{
          draft = await buildOrderDraft(env, body, origin, { method:'信用卡/綠界', status:'訂單待處理', reserveCoupon:true, reserveTtlSec: Number(env.CC_COUPON_HOLD_TTL_SEC || 900) || 900 });
        }catch(e){
          const reason = e && e.code ? String(e.code) : 'invalid_product';
          const msg = reason === 'product_not_found' ? '找不到商品'
            : reason === 'product_inactive' ? '商品已下架'
            : reason === 'invalid_variant' ? '商品規格無效'
            : reason === 'out_of_stock' ? '庫存不足'
            : '缺少商品資訊';
          return json({ ok:false, error: msg }, 400, request, env);
        }
        const order = draft.order;
        try{
          const orderUserRecord = await ensureUserRecord(env, orderUser);
          if (orderUser){
            order.buyer = order.buyer || {};
            order.buyer.uid = orderUser.id || order.buyer.uid || '';
            if (!order.buyer.name) order.buyer.name = orderUser.name || '';
            if (!order.buyer.email) order.buyer.email = orderUser.email || '';
            if (orderUserRecord && orderUserRecord.defaultContact){
              if (!order.buyer.name) order.buyer.name = orderUserRecord.defaultContact.name || '';
              if (!order.buyer.phone) order.buyer.phone = orderUserRecord.defaultContact.phone || '';
              if (!order.buyer.email) order.buyer.email = orderUserRecord.defaultContact.email || '';
            }
          }
        }catch(_){ }
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
          OrderResultURL: `${origin}/payment-result?orderId=${encodeURIComponent(order.id)}`,
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
        order.stockDeducted = false;
        order.soldCounted = false;

        await env.ORDERS.put(order.id, JSON.stringify(order));
        const idxRaw = (await env.ORDERS.get(ORDER_INDEX_KEY)) || (await env.ORDERS.get('INDEX'));
        let ids = [];
        if (idxRaw) { try { const parsed = JSON.parse(idxRaw); if (Array.isArray(parsed)) ids = parsed; } catch{} }
        ids.unshift(order.id);
        trimOrderIndex(ids, env);
        await env.ORDERS.put(ORDER_INDEX_KEY, JSON.stringify(ids));
        try {
          await decStockCounters(env, draft.items, order.productId, order.variantName, order.qty);
          order.stockDeducted = true;
          await env.ORDERS.put(order.id, JSON.stringify(order));
        } catch(_){ }
        try {
          await maybeSendOrderEmails(env, order, { origin, channel: 'credit' });
        } catch (err) {
          console.error('sendOrderEmails(credit) error', err);
        }

        return json({
          ok:true,
          orderId: order.id,
          action: gateway,
          params,
          stage: String(env.ECPAY_STAGE || env.ECPAY_MODE || '').toLowerCase()
        }, 200, request, env);
      } catch (e) {
        return json({ ok:false, error:String(e) }, 500, request, env);
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
        const prevStatus = order.status || '';
        const paidAmount = Number(formObj.TradeAmt || formObj.TotalAmount || 0);
        const orderAmount = Number(order.amount || 0);
        if (!order.payment) order.payment = {};
        order.payment.gateway = 'ecpay';
        order.payment.tradeNo = String(formObj.TradeNo || order.payment.tradeNo || '');
        order.payment.merchantTradeNo = String(formObj.MerchantTradeNo || order.payment.merchantTradeNo || '');
        order.payment.rtnCode = rtnCode;
        order.payment.message = String(formObj.RtnMsg || formObj.rtnmsg || '');
        order.payment.paidAt = new Date().toISOString();
        order.payment.amount = paidAmount || Number(order.payment.amount || order.amount || 0);
        if (rtnCode === 1 && orderAmount && Math.round(paidAmount) !== Math.round(orderAmount)) {
          order.status = '付款逾期';
          order.payment.status = 'AMOUNT_MISMATCH';
          if (order.coupon && !order.coupon.failed) {
            try{
              const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
                ? order.coupon.codes
                : (order.coupon.code ? [order.coupon.code] : []);
              for (const code of codes){
                if (!code) continue;
                await releaseCouponUsage(env, code, order.id);
              }
              order.coupon.locked = false;
              order.coupon.reserved = false;
            }catch(_){ }
          }
          if (order.stockDeducted === true) {
            try { await restoreStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){ }
            order.stockDeducted = false;
          }
          if (order.soldCounted === true) {
            try { await decSoldCounters(env, order.items, order.productId, order.qty); } catch(_){ }
            order.soldCounted = false;
          }
          order.updatedAt = new Date().toISOString();
          await env.ORDERS.put(orderId, JSON.stringify(order));
          return new Response('0|AMOUNT_MISMATCH', { status:400, headers:{'Content-Type':'text/plain'} });
        }
        order.status = rtnCode === 1 ? '待出貨' : '付款逾期';
        order.updatedAt = new Date().toISOString();

        if (rtnCode === 1) {
          if (order.coupon && !order.coupon.locked && !order.coupon.failed) {
            try {
              const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
                ? order.coupon.codes
                : (order.coupon.code ? [order.coupon.code] : []);
              for (const code of codes){
                if (!code) continue;
                try{
                  await markCouponUsageOnce(env, code, order.id);
                }catch(_){ }
              }
              order.coupon.locked = true;
              order.coupon.reserved = false;
            } catch(_){ }
          }
          if (!order.stockDeducted) {
            try { await decStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){ }
            order.stockDeducted = true;
          }
          if (!order.soldCounted) {
            try { await bumpSoldCounters(env, order.items, order.productId, order.qty); } catch(_){ }
            order.soldCounted = true;
          }
        } else {
          if (order.coupon && !order.coupon.failed) {
            try {
              const codes = Array.isArray(order.coupon.codes) && order.coupon.codes.length
                ? order.coupon.codes
                : (order.coupon.code ? [order.coupon.code] : []);
              for (const code of codes){
                if (!code) continue;
                await releaseCouponUsage(env, code, order.id);
              }
              order.coupon.locked = false;
              order.coupon.reserved = false;
            } catch(_){ }
          }
          if (order.stockDeducted === true) {
            try { await restoreStockCounters(env, order.items, order.productId, order.variantName, order.qty); } catch(_){ }
            order.stockDeducted = false;
          }
          if (order.soldCounted === true) {
            try { await decSoldCounters(env, order.items, order.productId, order.qty); } catch(_){ }
            order.soldCounted = false;
          }
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

    return null;
  }

  return { handlePayment };
}

export { createPaymentHandlers };
