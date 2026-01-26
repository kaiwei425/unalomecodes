function createOrderEmailUtils(deps){
  const {
    inferCouponDeity,
    redeemCoupon,
    markCouponUsageOnce,
    reserveCouponUsage,
    resolveOrderSelection,
    generateOrderId,
    needShippingFee,
    resolveShippingFee,
    makeToken,
    getBookingNotifyEmails,
    getAdminRole,
    isPhoneConsultOrder,
    buildBilingualOrderEmail,
    buildOrderItems,
    getConsultStageLabel
  } = deps;

  // ======== Coupon/Discount helpers (NEW: one coupon per item, allow multiple same deity) ========
  async function computeServerDiscount(env, items, couponInputs, orderId) {
    const FIXED = 200;
    const usedIdx = new Set();
    const results = [];
    let total = 0;
    let shippingDiscount = 0;

    for (const c of (couponInputs || [])) {
      const code = (c.code || '').toUpperCase();
      const deity = inferCouponDeity(code, c.deity);
      if (!code) continue;

      try {
        const r = await redeemCoupon(env, { code, deity, orderId });
        if (!r.ok) continue;

        const type = String(r.type || '').toUpperCase();
        if (type === 'SHIP') {
          shippingDiscount += Math.max(0, Number(r.amount || FIXED) || FIXED);
          results.push({
            code,
            amount: 0,
            productId: null,
            type: 'SHIP'
          });
          continue;
        }

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

    return { total, lines: results, shippingDiscount };
  }

  // 共用：將前端傳入的訂單資料標準化，計算金額與優惠
  async function buildOrderDraft(env, body, origin, opts = {}) {
    const selection = await resolveOrderSelection(env, body);
    if (!selection.ok){
      const err = new Error(selection.error || 'invalid_product');
      err.code = selection.error || 'invalid_product';
      throw err;
    }
    const useCartOnly = selection.useCartOnly;
    const items = selection.items;
    const productId = selection.productId;
    const productName = selection.productName;
    const price = selection.price;
    const qty = selection.qty;
    const deity = selection.deity;
    const variantName = selection.variantName;

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

    let amount = items.reduce((s, it) => {
      const unit = Number(it.price ?? it.unitPrice ?? 0) || 0;
      const q    = Math.max(1, Number(it.qty ?? it.quantity ?? 1));
      return s + unit * q;
    }, 0);

    const newId = await generateOrderId(env);

    const couponCode  = String(body.coupon || body.couponCode || "").trim().toUpperCase();
    let couponDeity   = inferCouponDeity(couponCode, body.coupon_deity || body.deity || "");
    if (!couponDeity && items.length) {
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
            let reserveError = null;
            if (!lockError && opts.reserveCoupon) {
              const ttl = Number(opts.reserveTtlSec || env.COUPON_HOLD_TTL_SEC || 900) || 900;
              const codesToReserve = Array.from(new Set(
                (discInfo.lines || []).map(l => String(l.code||'').toUpperCase()).filter(Boolean)
              ));
              if (!codesToReserve.length && firstCoupon && firstCoupon.code) codesToReserve.push(firstCoupon.code);
              for (const code of codesToReserve){
                const reserved = await reserveCouponUsage(env, code, newId, ttl);
                if (!reserved.ok){
                  reserveError = reserved;
                  break;
                }
              }
            }
            if (lockError || reserveError) {
              couponApplied = {
                code: (firstCoupon && firstCoupon.code) || '',
                deity: firstCoupon?.deity || '',
                codes: couponInputs.map(c=>c.code),
                failed: true,
                reason: (lockError && (lockError.reason || 'already_used')) || (reserveError && (reserveError.reason || 'reserved')) || 'invalid'
              };
            } else {
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
                locked: !!opts.lockCoupon,
                reserved: !!opts.reserveCoupon
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
            let locked = { ok:true };
            if (opts.lockCoupon) locked = await markCouponUsageOnce(env, firstCoupon.code, newId);
            let reserved = { ok:true };
            if (!locked.ok) {
              couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: locked.reason || 'already_used' };
            } else {
              if (opts.reserveCoupon) {
                const ttl = Number(opts.reserveTtlSec || env.COUPON_HOLD_TTL_SEC || 900) || 900;
                reserved = await reserveCouponUsage(env, firstCoupon.code, newId, ttl);
              }
              if (!reserved.ok) {
                couponApplied = { code: firstCoupon.code, deity: firstCoupon.deity, failed: true, reason: reserved.reason || 'reserved' };
              } else {
                const disc = Math.max(0, Number(r.amount || 200) || 200);
                amount = Math.max(0, Number(amount || 0) - disc);
                couponApplied = { code: firstCoupon.code, deity: r.deity || firstCoupon.deity, discount: disc, redeemedAt: Date.now(), locked: !!opts.lockCoupon, reserved: !!opts.reserveCoupon };
              }
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

    const fallbackText = `${body?.category || ''} ${productName || body?.productName || ''}`.trim();
    const shippingNeeded = needShippingFee(items, fallbackText);
    const baseShipping = resolveShippingFee(env);
    let shippingFee = shippingNeeded ? baseShipping : 0;
    const shippingDiscountApplied = Math.max(
      0,
      Number((couponApplied && couponApplied.shippingDiscount) || 0)
    );
    if (shippingDiscountApplied > 0){
      shippingFee = Math.max(0, Number(shippingFee || baseShipping) - shippingDiscountApplied);
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
      status: opts.status || '訂單待處理',
      createdAt: now, updatedAt: now,
      ritual_photo_url: ritualPhotoUrl || undefined,
      ritualPhotoUrl: ritualPhotoUrl || undefined,
      resultToken: makeToken(32),
      results: [],
      coupon: couponApplied || undefined,
      couponAssignment: (couponApplied && couponApplied.lines) ? couponApplied.lines : undefined,
      ...(Object.keys(extra).length ? { extra } : {})
    };

    if (couponApplied && couponApplied.discount > 0 && !couponApplied.locked && !couponApplied.reserved) {
      try{
        const codesToLock = Array.from(new Set(
          (couponApplied.codes && couponApplied.codes.length ? couponApplied.codes : [couponApplied.code])
            .map(c=> String(c||'').toUpperCase())
            .filter(Boolean)
        ));
        for (const c of codesToLock){
          await markCouponUsageOnce(env, c, newId);
        }
        couponApplied.locked = true;
      }catch(_){}
    }

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
        return { ok:false, reason:'missing_config', hasApiKey: !!apiKey, hasFrom: !!fromDefault };
      }
      const siteName = (env.EMAIL_BRAND || env.SITE_NAME || 'Unalomecodes').trim();
      const origin = (ctx.origin || '').replace(/\/$/, '');
      const primarySite = (env.SITE_URL || env.PUBLIC_SITE_URL || origin || 'https://unalomecodes.com').replace(/\/$/, '');
      const serviceLookupBase = env.SERVICE_LOOKUP_URL
        ? env.SERVICE_LOOKUP_URL.replace(/\/$/, '')
        : `${primarySite}/service`;
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
      const baseAdminRaw = (env.ORDER_NOTIFY_EMAIL || env.ORDER_ALERT_EMAIL || env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
      const channelLabel = channel ? channel : (order.method || '訂單');
      const emailContext = ctx.emailContext || 'order_created';
      const notifyCustomer = ctx.notifyCustomer === false ? false : !!customerEmail;
      const isPhoneConsult = isPhoneConsultOrder(order, env);
      let adminRaw = baseAdminRaw.slice();
      let forceAdmin = false;
      let wrapBilingual = !!ctx.bilingual;
      const overrideAdmins = Array.isArray(ctx.adminEmails) ? ctx.adminEmails.map(s => String(s || '').trim()).filter(Boolean) : null;
      if (overrideAdmins && overrideAdmins.length){
        adminRaw = overrideAdmins.slice();
        forceAdmin = true;
      }
      if (!overrideAdmins && isPhoneConsult && emailContext === 'status_update'){
        const statusText = String(order.status || '').trim();
        const isScheduling = statusText.includes('已確認付款') && statusText.includes('預約中');
        const isBooked = statusText.includes('已完成預約');
        if (isScheduling){
          adminRaw = await getBookingNotifyEmails(env);
          forceAdmin = true;
        }else if (isBooked){
          adminRaw = baseAdminRaw.slice();
          forceAdmin = true;
        }else{
          adminRaw = [];
          forceAdmin = true;
        }
        wrapBilingual = !!ctx.bilingual;
      }
      adminRaw = Array.from(new Set(adminRaw)).filter(Boolean);
      if (adminRaw.length){
        try{
          const bookingEmails = await getBookingNotifyEmails(env);
          const extraBookingRaw = String(env?.BOOKING_NOTIFY_EMAIL || env?.BOOKING_EMAIL || env?.BOOKING_ALERT_EMAIL || env?.BOOKING_TO || '').trim();
          const extraBooking = extraBookingRaw ? extraBookingRaw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean) : [];
          const bookingSet = new Set((bookingEmails || []).concat(extraBooking).map(s => String(s || '').trim()).filter(Boolean));
          if (bookingSet.size){
            const next = [];
            await Promise.all(adminRaw.map(async (email)=>{
              const normalized = String(email || '').trim();
              if (!normalized) return;
              if (!bookingSet.has(normalized)){
                next.push(normalized);
                return;
              }
              try{
                const role = await getAdminRole(normalized, env);
                if (role && role !== 'booking'){
                  next.push(normalized);
                }
              }catch(_){}
            }));
            adminRaw = next;
          }
        }catch(_){}
      }
      const notifyAdmin = forceAdmin
        ? adminRaw.length > 0
        : (ctx.notifyAdmin === false ? false : adminRaw.length > 0);
      const statusLabel = (order.status || '').trim();
      const isBlessingDone = statusLabel === '祈福完成';
      const customerSubject = emailContext === 'status_update'
        ? `${siteName} 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
        : `${siteName} 訂單成立通知 #${order.id}`;
      const adminSubject = emailContext === 'status_update'
        ? `[${siteName}] 訂單狀態更新 #${order.id}${statusLabel ? `｜${statusLabel}` : ''}`
        : `[${siteName}] 系統通知：新訂單 #${order.id}`;
      const defaultImageHost = env.EMAIL_IMAGE_HOST || env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://unalomecodes.com';
      const imageHost = ctx.imageHost || defaultImageHost || origin;
      const composeOpts = { siteName, lookupUrl, channelLabel, imageHost, context: emailContext, blessingDone: isBlessingDone };
      let { html: customerHtml, text: customerText } = composeOrderEmail(order, Object.assign({ admin:false }, composeOpts));
      let { html: adminHtml, text: adminText } = composeOrderEmail(order, Object.assign({ admin:true }, composeOpts));
      if (wrapBilingual){
        const wrappedCustomer = buildBilingualOrderEmail(order, customerHtml, customerText, { lookupUrl });
        const wrappedAdmin = buildBilingualOrderEmail(order, adminHtml, adminText, { lookupUrl });
        customerHtml = wrappedCustomer.html;
        customerText = wrappedCustomer.text;
        adminHtml = wrappedAdmin.html;
        adminText = wrappedAdmin.text;
      }
      const labeled = [];
      if (notifyCustomer && customerEmail) {
        labeled.push({ kind:'customer', promise: sendEmailMessage(env, {
          from: fromDefault,
          to: [customerEmail],
          subject: customerSubject,
          html: customerHtml,
          text: customerText
        }) });
      }
      if (notifyAdmin && adminRaw.length) {
        labeled.push({ kind:'admin', promise: sendEmailMessage(env, {
          from: fromDefault,
          to: adminRaw,
          subject: adminSubject,
          html: adminHtml,
          text: adminText
        }) });
      }
      if (!labeled.length) {
        console.log('[mail] skip sending — no recipients resolved');
        return { ok:false, reason:'no_recipients' };
      }
      const settled = ctx.serialSend
        ? await (async ()=>{
            const results = [];
            for (const task of labeled){
              try{
                const value = await task.promise;
                results.push({ status:'fulfilled', value });
              }catch(error){
                results.push({ status:'rejected', reason: error });
              }
            }
            return results;
          })()
        : await Promise.allSettled(labeled.map(task => task.promise));
      let failed = false;
      let sentCustomer = false;
      let sentAdmin = false;
      const errors = [];
      settled.forEach((res, idx)=>{
        const kind = labeled[idx] && labeled[idx].kind;
        if (res.status === 'rejected'){
          failed = true;
          const msg = res.reason ? String(res.reason) : 'send_failed';
          errors.push({ kind, error: msg });
          console.error('[mail] send failed', idx, res.reason);
        }else if (kind === 'customer'){
          sentCustomer = true;
        }else if (kind === 'admin'){
          sentAdmin = true;
        }
      });
      return { ok: !failed, reason: failed ? 'send_failed' : '', sentCustomer, sentAdmin, errors };
    } catch (err) {
      console.error('sendOrderEmails error', err);
      return { ok:false, reason:'exception', error: String(err || '') };
    }
  }

  function composeOrderEmail(order, opts = {}) {
    const esc = (typeof escapeHtmlEmail === 'function') ? escapeHtmlEmail : (s)=> String(s || '');
    const fmt = (typeof formatCurrencyTWD === 'function') ? formatCurrencyTWD : (n)=> `NT$ ${Number(n || 0)}`;
    const brand = opts.siteName || 'Unalomecodes';
    const buyerName = (order?.buyer?.name || '').trim() || '貴賓';
    const phone = (order?.buyer?.phone || order?.buyer?.contact || order?.contact || '').trim();
    const email = (order?.buyer?.email || '').trim();
    const store = (order?.buyer?.store || order?.store || '').trim();
    let status = order.status || '處理中';
    const consultStage = String(order?.consultStage || '').trim().toLowerCase();
    if (consultStage){
      const label = getConsultStageLabel(consultStage);
      if (label && label.zh) status = label.zh;
    }
    const trackingNo = String(
      order.shippingTracking || order.trackingNo || order.tracking || order.trackingNumber
      || (order.shipment && (order.shipment.tracking || order.shipment.trackingNo || order.shipment.trackingNumber))
      || ''
    ).trim();
    const trackingUrl = 'https://eservice.7-11.com.tw/E-Tracking/search.aspx';
    const isShipped = /已寄件|已寄出|已出貨|寄出/.test(status);
    const note = (order.note || '').trim();
    const methodRaw = opts.channelLabel || order.method || '訂單';
    const isServiceOrder = String(order?.type || '').toLowerCase() === 'service' || /服務/.test(String(order?.method||''));
    const isPhoneConsultServiceOrder = isServiceOrder && String(order?.serviceId || '').trim() === 'SVT409059d4';
    const method = (isServiceOrder && (!order.paymentMethod || /服務/.test(methodRaw))) ? '轉帳匯款' : methodRaw;
    const isCod711 = /貨到付款|cod|711/i.test(method || '');
    const context = opts.context || 'order_created';
    let items = buildOrderItems(order);
    let shippingFee = Number(order.shippingFee ?? order.shipping ?? 0) || 0;
    let discountAmount = Math.max(0, Number(order?.coupon?.discount || 0));
    const itemsSum = items.reduce((sum, it)=> sum + Number(it.total || 0), 0);
    let subtotal = 0;
    if (items.length) {
      subtotal = itemsSum;
    } else if (order.price) {
      subtotal = Number(order.price || 0) * Math.max(1, Number(order.qty || 1) || 1);
    }
    if (!subtotal) subtotal = Math.max(0, Number(order.amount || 0) - shippingFee + discountAmount);
    const totalAmount = Math.max(0, Number(order.amount || 0));
    if (isServiceOrder){
      const baseSum = itemsSum > 0 ? itemsSum : (subtotal > 0 ? subtotal : totalAmount);
      subtotal = baseSum;
      discountAmount = Math.max(0, baseSum - totalAmount);
      shippingFee = 0;
    }
    const supportEmail = 'bkkaiwei@gmail.com';
    const lineLabel = '@427oaemj';
    const lineInstruction = 'LINE ID：@427oaemj（請於官方 LINE 搜尋加入）';
    const serviceFeedbackUrl = order?.serviceId
      ? `https://unalomecodes.com/service?id=${encodeURIComponent(String(order.serviceId))}`
      : 'https://unalomecodes.com/service';
    const productFeedbackId = (order && order.productId && String(order.productId) !== 'CART')
      ? String(order.productId)
      : (Array.isArray(order?.items) && order.items[0] && (order.items[0].productId || order.items[0].id))
        ? String(order.items[0].productId || order.items[0].id)
        : '';
    const productFeedbackUrl = productFeedbackId
      ? `https://unalomecodes.com/shop?productId=${encodeURIComponent(productFeedbackId)}`
      : 'https://unalomecodes.com/shop';
    const couponLabelHtml = order?.coupon?.code ? `（${esc(order.coupon.code)}）` : '';
    const couponLabelText = order?.coupon?.code ? `（${order.coupon.code}）` : '';
    const plainMode = !!opts.plain;
    let itemsForRender = items;
    if (isServiceOrder && discountAmount > 0 && items.length){
      itemsForRender = items.map((it, idx)=>{
        if (idx !== 0) return Object.assign({}, it);
        const nextTotal = Math.max(0, Number(it.total || 0) - discountAmount);
        return Object.assign({}, it, { total: nextTotal });
      });
    }
    const itemsHtml = plainMode
      ? itemsForRender.map(it => `• ${esc(it.name)}${it.spec ? `（${esc(it.spec)}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('<br>') || '<p>本次訂單明細將由客服另行確認。</p>'
      : itemsForRender.length
        ? itemsForRender.map((it, idx) => {
            const imgUrl = rewriteEmailImageUrl(it.image, opts.imageHost);
            const img = imgUrl
              ? `<img src="${esc(imgUrl)}" alt="${esc(it.name)}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;margin-right:16px;">`
              : `<div style="width:64px;height:64px;border-radius:12px;background:#e2e8f0;margin-right:16px;"></div>`;
            const dividerStyle = idx === itemsForRender.length - 1 ? '' : 'border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;';
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
    const itemsText = itemsForRender.length
      ? itemsForRender.map(it => `• ${it.name}${it.spec ? `（${it.spec}）` : ''} × ${it.qty} ─ ${fmt(it.total)}`).join('\n')
      : '（本次訂單明細將由客服另行確認）';
    const shippingNote = shippingFee ? `（含運費${fmt(shippingFee).replace('NT$ ', '')}）` : '';
    const appointmentTw = isServiceOrder ? formatServiceAppointmentTaiwan(order) : '';
    const appointmentBkk = isServiceOrder ? String(order?.slotStart || order?.requestDate || '').trim() : '';
    const appointmentHtml = (appointmentTw || appointmentBkk)
      ? `<p><strong>預約時間：</strong>${appointmentBkk ? `${esc(appointmentBkk)}（曼谷）` : ''}${appointmentTw ? `${appointmentBkk ? '／' : ''}${esc(appointmentTw)}（台灣）` : ''}</p>`
      : '';
    const baseInfoHtml = plainMode
      ? `<p>訂單編號：${esc(order.id || '')}<br>訂單狀態：${esc(status)}<br>付款方式：${esc(method)}<br>應付金額：${fmt(order.amount || 0)}${shippingNote}${appointmentTw || appointmentBkk ? `<br>預約時間：${appointmentBkk ? `${esc(appointmentBkk)}（曼谷）` : ''}${appointmentTw ? `${appointmentBkk ? '／' : ''}${esc(appointmentTw)}（台灣）` : ''}` : ''}</p>`
      : [
          `<p><strong>訂單編號：</strong>${esc(order.id || '')}</p>`,
          `<p><strong>訂單狀態：</strong>${esc(status)}</p>`,
          `<p><strong>付款方式：</strong>${esc(method)}</p>`,
          `<p><strong>應付金額：</strong>${fmt(order.amount || 0)}${shippingNote}</p>`,
          appointmentHtml
        ].filter(Boolean).join('');
    const lookupHtml = opts.lookupUrl && !isServiceOrder
      ? plainMode
        ? `<p>查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）</p>`
        : `<div style="margin-top:16px;padding:12px;border-radius:8px;background:#eef2ff;color:#312e81;font-size:13px;">
            查詢訂單連結：${esc(opts.lookupUrl)}（請複製貼至瀏覽器開啟）
          </div>`
      : '';
    const serviceLookupNote = isServiceOrder
      ? (plainMode
        ? '<p>可至會員中心－我的訂單查詢最新進度。</p>'
        : '<div style="margin-top:16px;padding:12px;border-radius:8px;background:#ecfdf3;color:#166534;font-size:13px;">可至會員中心－我的訂單查詢最新進度。</div>')
      : '';
    const serviceRescheduleNote = isServiceOrder
      ? (plainMode
        ? (isPhoneConsultServiceOrder
          ? '<p>如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。</p>'
          : '<p>如需調整服務時間或內容，請聯繫官方 LINE 客服協助。</p>')
        : (isPhoneConsultServiceOrder
          ? '<div style="margin-top:12px;padding:12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;">如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。</div>'
          : '<div style="margin-top:12px;padding:12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;">如需調整服務時間或內容，請聯繫官方 LINE 客服協助。</div>'))
      : '';
    const serviceCallNote = '';
    const isBlessingDone = opts.blessingDone || (order.status === '祈福完成');
    let customerIntro = (context === 'status_update')
      ? `<p>親愛的 ${esc(buyerName)} 您好：</p>
        <p>${(isServiceOrder && consultStage === 'appointment_confirmed')
          ? (isPhoneConsultServiceOrder
            ? `您的預約已確認完成。請加入官方 LINE <a href="https://line.me/R/ti/p/@427oaemj" target="_blank" rel="noopener">https://line.me/R/ti/p/@427oaemj</a> 或搜尋 ID @427oaemj，後續將由專人與您聯繫安排實際通話時間與流程說明。您也可以至會員中心－我的訂單－問與答留下想詢問的問題（中文即可，將協助翻譯給老師）。`
            : `您的服務已完成安排／預約。如需進一步協助，請聯繫客服 Email：${esc(supportEmail)} 或 LINE：${lineLabel}。`)
          : (!isServiceOrder && /已完成|完成/.test(String(status || '')))
            ? `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，您的訂單 ${esc(order.id || '')} 已順利完成 🙏<br><br>
  我們很榮幸能夠為您提供這次的服務，也希望這次的體驗能為您帶來正面的能量與幫助。<br><br>
  <strong>✨ 邀請您留下寶貴的回饋</strong><br>
  您的回饋對我們非常重要，<br>
  不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。<br>
  👉 點此留下您的評價：<br>
  <a href="${esc(productFeedbackUrl)}" target="_blank" rel="noopener">${esc(productFeedbackUrl)}</a>`
          : (isServiceOrder && consultStage === 'done' && !isPhoneConsultServiceOrder)
            ? `感謝您選擇 unalomecodes 的服務，您的訂單已順利完成。若您對本次服務有任何心得或建議，誠摯邀請您留下回饋（<a href="${esc(serviceFeedbackUrl)}" target="_blank" rel="noopener">${esc(serviceFeedbackUrl)}</a>）。再次感謝您的支持，期待未來再次為您服務。`
          : (isServiceOrder && consultStage === 'done')
            ? `感謝您選擇 ${esc(opts.siteName || 'unalomecodes')} 的服務，您的訂單已順利完成。若您對本次服務有任何心得或建議，誠摯邀請您留下回饋（<a href="https://unalomecodes.com/service?id=SVT409059d4" target="_blank" rel="noopener">https://unalomecodes.com/service?id=SVT409059d4</a>），讓更多人也能看到這項服務，對自己的命運更加瞭解，讓未來更美好。再次感謝您的支持，期待未來再次為您服務。`
            : (isBlessingDone ? '' : `您的訂單狀態已更新為 <strong>${esc(status)}</strong>。我們將依流程持續處理，如有進一步安排會以 Email 通知您。`)
        }</p>
        ${isBlessingDone ? '' : `<p>Please do not reply to this email. For assistance, contact ${esc(supportEmail)} or add LINE ID: ${lineLabel}.</p>`}`
      : `<p>親愛的 ${esc(buyerName)} 您好：</p>
        <p>${isServiceOrder
          ? (isPhoneConsultServiceOrder
            ? `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，我們已成功收到您的電話諮詢訂單。<br>目前正在確認付款與預約資訊，完成後將協助安排與老師的電話諮詢時間。<br>預約確認完成後，系統將再次寄送通知信給您，請留意電子郵件。<br>您可至 會員中心 我的訂單 查詢最新狀態。<br>如需改期，請於預約時間 48 小時前聯繫客服。客服 LINE：${lineLabel}<br><br>
Dear ${esc(buyerName)}, Thank you for choosing ${esc(opts.siteName || 'Unalomecodes')}. We have received your phone consultation order. We are now verifying the payment and preparing the appointment with the consultant. You will receive another email once the schedule is confirmed. You can check the latest status in My Orders. To reschedule, please contact us at least 48 hours in advance. LINE Support: ${lineLabel}`
            : `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')} 的服務，我們已成功收到您的訂單。<br>目前正在核對付款與服務需求，確認無誤後將安排服務流程。<br>完成安排後會再寄送通知信給您，請留意電子郵件。<br>您可至 會員中心 我的訂單 查詢最新狀態。<br>如需調整服務時間或內容，請聯繫客服。客服 LINE：${lineLabel}<br><br>
Dear ${esc(buyerName)}, Thank you for choosing ${esc(opts.siteName || 'Unalomecodes')}. We have received your service order. We are verifying the payment and service details. Once confirmed, we will arrange the service. You will receive another email once the schedule is confirmed. You can check the latest status in My Orders. For changes, please contact support. LINE Support: ${lineLabel}`)
          : `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，我們已成功收到您的訂單。<br>目前正在核對付款與訂單資料，確認無誤後將安排出貨。<br>若為 7-11 店到店，出貨後會再寄送通知與物流資訊。<br>如需協助請聯繫客服：${esc(supportEmail)} 或 LINE ID：${lineLabel}。<br><br>
Dear ${esc(buyerName)}, Thank you for shopping with ${esc(opts.siteName || 'Unalomecodes')}. We have received your order. We are verifying the payment and order details. Once confirmed, we will arrange shipment. For 7-ELEVEN pickup orders, a shipping notification will be sent after dispatch. If you need assistance, please contact us via Email or LINE.`
        }</p>`;
    if (context === 'status_update' && isBlessingDone){
      const serviceName = esc(order?.serviceName || (Array.isArray(order?.items) && order.items[0] && order.items[0].name) || '服務');
      const lookupLine = `感謝您選擇 ${esc(opts.siteName || 'Unalomecodes')}，您的${serviceName}已順利完成 🙏<br><br>
  我們已完成本次服務流程，相關成果與進度可至會員中心查看。<br>
  希望這次的服務能為您帶來正向的力量與安定。<br><br>
  <strong>✨ 邀請您留下寶貴的回饋</strong><br>
  您的回饋對我們非常重要，<br>
  不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。<br>
  👉 點此留下您的評價：<br>
  <a href="${esc(serviceFeedbackUrl)}" target="_blank" rel="noopener">${esc(serviceFeedbackUrl)}</a>`;
      customerIntro += `<p>${lookupLine}</p>`;
    }
    if (context === 'status_update' && isShipped && trackingNo){
      const trackingHtml = plainMode
        ? `<p>該商品已完成寄件，配送單號為：${esc(trackingNo)}。可至 7-11 貨態查詢系統查詢物流狀態：${esc(trackingUrl)}</p>`
        : `<div style="margin:16px 0;padding:12px;border-radius:10px;background:#ecfeff;color:#0f172a;font-size:14px;">
            該商品已完成寄件，配送單號為：<strong>${esc(trackingNo)}</strong><br>
            可至 <a href="${trackingUrl}" target="_blank" rel="noopener">7-11 貨態查詢系統 E-Tracking</a> 查詢物流狀態
          </div>`;
      customerIntro += trackingHtml;
    }
    const adminIntro = `<p>系統通知：${esc(opts.siteName || '商城')} 有一筆新的訂單建立或訂單狀態更新。</p>
      <p>System notification: A new order or status update is recorded on ${esc(opts.siteName || '商城')}.</p>`;
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
          ${serviceLookupNote}
          ${serviceRescheduleNote}
          ${serviceCallNote}
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
            ${serviceLookupNote}
            ${serviceRescheduleNote}
            ${serviceCallNote}
            ${opts.admin ? '' : '<p style="margin:18px 0 0;">感謝您的支持，祝福一切順心圓滿！</p>'}
            ${customerFooter}
          </div>
        </div>
      `;
    const textParts = [];
    if (opts.admin) {
      textParts.push(`${opts.siteName || '商城'} 有一筆新訂單：`);
    } else if (context === 'status_update') {
      if (consultStage === 'appointment_confirmed') {
        if (isPhoneConsultServiceOrder) {
          textParts.push(`您的預約已確認完成。請加入官方 LINE https://line.me/R/ti/p/@427oaemj 或搜尋 ID @427oaemj，後續將由專人與您聯繫安排實際通話時間與流程說明。您也可以至會員中心－我的訂單－問與答留下想詢問的問題（中文即可，將協助翻譯給老師）。`);
          textParts.push(`Your appointment has been confirmed. Please add our official LINE https://line.me/R/ti/p/@427oaemj or search ID @427oaemj. Our staff will contact you shortly to arrange the call and explain the next steps.`);
        } else {
          textParts.push('您的服務已完成安排／預約。');
          textParts.push(`如需協助請聯繫 ${supportEmail} 或 LINE ID：${lineLabel}。`);
          textParts.push('Your service schedule has been confirmed.');
          textParts.push(`For assistance, contact ${supportEmail} or LINE ID: ${lineLabel}.`);
        }
      } else if (!isServiceOrder && /已完成|完成/.test(String(status || ''))) {
        textParts.push(`感謝您選擇 ${opts.siteName || 'Unalomecodes'}，您的訂單 ${order.id || ''} 已順利完成。`);
        textParts.push('我們很榮幸能夠為您提供這次的服務，也希望這次的體驗能為您帶來正面的能量與幫助。');
        textParts.push('✨ 邀請您留下寶貴的回饋');
        textParts.push('您的回饋對我們非常重要，不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。');
        textParts.push(`👉 點此留下您的評價：${productFeedbackUrl}`);
      } else if (consultStage === 'done' && !isPhoneConsultServiceOrder) {
        textParts.push(`感謝您選擇 unalomecodes 的服務，您的訂單已順利完成。若您對本次服務有任何心得或建議，誠摯邀請您留下回饋(${serviceFeedbackUrl})。再次感謝您的支持，期待未來再次為您服務。`);
      } else if (consultStage === 'done') {
        textParts.push(`感謝您選擇 ${opts.siteName || 'unalomecodes'} 的服務，您的訂單已順利完成。`);
        textParts.push('若您對本次服務有任何心得或建議，誠摯邀請您留下回饋(https://unalomecodes.com/service?id=SVT409059d4)，讓更多人也能看到這項服務，讓更多人也能對於自己的命運更加瞭解，讓未來更美好。');
        textParts.push('再次感謝您的支持，期待未來再次為您服務。');
      } else {
        if (!isBlessingDone){
          textParts.push(`您的訂單狀態已更新為「${status}」。我們會依照流程持續處理，如有進一步安排，系統將以電子郵件通知您。`);
          textParts.push(`Your order status has been updated to ${status}. We will continue processing your order and notify you by email if there are further updates.`);
        }
      }
      textParts.push(`如需協助請聯繫 ${supportEmail} 或 LINE ID: ${lineLabel}。`);
      if (!isBlessingDone){
        textParts.push(`For assistance, contact ${supportEmail} or LINE ID: ${lineLabel}.`);
      }
      if (isBlessingDone){
        const serviceName = order?.serviceName || (Array.isArray(order?.items) && order.items[0] && order.items[0].name) || '服務';
        textParts.push(`感謝您選擇 ${opts.siteName || 'Unalomecodes'}，您的${serviceName}已順利完成 🙏`);
        textParts.push('我們已完成本次服務流程，相關成果與進度可至會員中心查看。');
        textParts.push('希望這次的服務能為您帶來正向的力量與安定。');
        textParts.push('✨ 邀請您留下寶貴的回饋');
        textParts.push('您的回饋對我們非常重要，不僅能幫助我們持續優化服務品質，也能讓其他正在猶豫的使用者獲得更多參考。');
        textParts.push(`👉 點此留下您的評價：${serviceFeedbackUrl}`);
      }
    } else {
      if (isServiceOrder){
        if (isPhoneConsultServiceOrder){
          textParts.push(`親愛的 ${buyerName} 您好：感謝您選擇 ${opts.siteName || 'Unalomecodes'}，我們已成功收到您的訂單。`);
          textParts.push('目前我們正在確認付款與預約資訊，完成後將協助安排與老師的電話諮詢時間。');
          textParts.push('預約確認完成後，系統將再次寄送通知信給您，請留意電子郵件。');
          textParts.push('您可至 會員中心 我的訂單 查詢最新狀態。');
          textParts.push(`如需改期，請於預約時間 48 小時前聯繫客服。客服 LINE：${lineLabel}`);
          textParts.push(`Dear ${buyerName}, Thank you for choosing ${opts.siteName || 'Unalomecodes'}. We have received your order successfully.`);
          textParts.push('We are now verifying the payment and preparing the appointment with the consultant.');
          textParts.push('You will receive another email once the schedule is confirmed.');
          textParts.push('You can check the latest status in My Orders.');
          textParts.push(`To reschedule, please contact us at least 48 hours in advance. LINE Support: ${lineLabel}`);
        } else {
          textParts.push(`親愛的 ${buyerName} 您好：感謝您選擇 ${opts.siteName || 'Unalomecodes'}，我們已成功收到您的訂單。`);
          textParts.push('目前正在核對付款與服務需求，確認無誤後將安排服務流程。');
          textParts.push('完成安排後會再寄送通知信給您，請留意電子郵件。');
          textParts.push('您可至 會員中心 我的訂單 查詢最新狀態。');
          textParts.push(`如需調整服務時間或內容，請聯繫客服。客服 LINE：${lineLabel}`);
          textParts.push(`Dear ${buyerName}, Thank you for choosing ${opts.siteName || 'Unalomecodes'}. We have received your service order successfully.`);
          textParts.push('We are verifying the payment and service details. Once confirmed, we will arrange the service.');
          textParts.push('You will receive another email once the schedule is confirmed.');
          textParts.push('You can check the latest status in My Orders. For changes, please contact support.');
          textParts.push(`LINE Support: ${lineLabel}`);
        }
      }else{
        textParts.push(`親愛的 ${buyerName} 您好：感謝您選擇 ${opts.siteName || 'Unalomecodes'}，我們已成功收到您的訂單。`);
        textParts.push('目前正在核對付款與訂單資料，確認無誤後將安排出貨。');
        textParts.push('若為 7-11 店到店，出貨後會再寄送通知與物流資訊。');
        textParts.push(`如需協助請聯繫客服：${supportEmail} 或 LINE ID：${lineLabel}。`);
        textParts.push(`Dear ${buyerName}, Thank you for shopping with ${opts.siteName || 'Unalomecodes'}. We have received your order.`);
        textParts.push('We are verifying the payment and order details. Once confirmed, we will arrange shipment.');
        textParts.push('For 7-ELEVEN pickup orders, a shipping notification will be sent after dispatch.');
        textParts.push('If you need assistance, please contact us via Email or LINE.');
      }
    }
    textParts.push(`訂單編號：${order.id}`);
    textParts.push(`訂單狀態：${status}`);
    if (context === 'status_update' && isShipped && trackingNo){
      textParts.push(`該商品已完成寄件，配送單號為：${trackingNo}`);
      textParts.push(`7-11 貨態查詢系統：${trackingUrl}`);
    }
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
    if (isServiceOrder){
      if (appointmentBkk) textParts.push(`預約時間（曼谷）：${appointmentBkk}`);
      if (appointmentTw) textParts.push(`預約時間（台灣）：${appointmentTw}`);
      textParts.push('可至會員中心－我的訂單查詢最新進度。');
      textParts.push('如欲修改預約時段，請聯繫官方LINE客服，並於48小時前提出申請。');
      if (context === 'status_update' && consultStage === 'appointment_confirmed'){
        textParts.push(`您的訂單狀態已更新為 ${status}，請加入官方LINE客服 https://line.me/R/ti/p/@427oaemj 或 LINE ID 搜尋輸入 @427oaemj，後續將由專人與您聯繫進行通話連線。`);
      }
    } else if (opts.lookupUrl) {
      textParts.push(`查詢訂單：${opts.lookupUrl}`);
    }
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
    let attempt = 0;
    while (attempt < 2){
      attempt += 1;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok){
        let data = {};
        try { data = await res.json(); } catch(_){}
        return data;
      }
      const errText = await res.text().catch(()=> '');
      if (res.status === 429 && attempt < 2){
        await new Promise(resolve => setTimeout(resolve, 1100));
        continue;
      }
      throw new Error(`Email API ${res.status}: ${errText || res.statusText}`);
    }
    let data = {};
    try { data = await res.json(); } catch(_){}
    return data;
  }

  function shouldNotifyStatus(status) {
    const txt = String(status || '').trim();
    return !!txt;
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

  function formatServiceAppointmentTaiwan(order) {
    const raw = String(order?.slotStart || order?.requestDate || '').trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
    if (!match) return '';
    const datePart = match[1];
    const timePart = match[2];
    const [y, m, d] = datePart.split('-').map(v => Number(v));
    const [hh, mm] = timePart.split(':').map(v => Number(v));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';
    const ms = Date.UTC(y, m - 1, d, hh + 1, mm);
    if (!Number.isFinite(ms)) return '';
    const dt = new Date(ms);
    const yyyy = dt.getUTCFullYear();
    const MM = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const DD = String(dt.getUTCDate()).padStart(2, '0');
    const HH = String(dt.getUTCHours()).padStart(2, '0');
    const Min = String(dt.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${MM}-${DD} ${HH}:${Min}`;
  }

  return {
    computeServerDiscount,
    buildOrderDraft,
    maybeSendOrderEmails,
    sendEmailMessage,
    shouldNotifyStatus
  };
}

export { createOrderEmailUtils };
