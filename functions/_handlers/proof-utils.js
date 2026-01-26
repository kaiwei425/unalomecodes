function createProofUtils(deps){
  const {
    getAny,
    arrayBufferToBase64,
    signSession,
    verifySessionToken
  } = deps;

  function proofSecret(env){
    return String(env?.PROOF_TOKEN_SECRET || env?.SESSION_SECRET || '').trim();
  }
  async function signProofToken(env, key, ttlSec=900){
    const secret = proofSecret(env);
    if (!secret || !key) return '';
    const payload = { key: String(key), exp: Date.now() + (ttlSec * 1000) };
    return await signSession(payload, secret);
  }
  async function verifyProofToken(env, key, token){
    const secret = proofSecret(env);
    if (!secret || !key || !token) return false;
    const payload = await verifySessionToken(token, secret);
    if (!payload || payload.key !== String(key)) return false;
    return true;
  }
  function extractProofKey(val){
    const raw = String(val || '').trim();
    if (!raw) return '';
    if (raw.startsWith('/api/proof/')) return raw.replace('/api/proof/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/proof.view/')) return raw.replace('/api/proof.view/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/proof.data/')) return raw.replace('/api/proof.data/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/proof.inline/')) return raw.replace('/api/proof.inline/','').replace(/\?.*$/,'');
    if (raw.startsWith('/api/file/')) return raw.replace('/api/file/','').replace(/\?.*$/,'');
    if (/^https?:\/\//i.test(raw)){
      try{
        const u = new URL(raw);
        const path = u.pathname || '';
        if (path.startsWith('/api/proof/')) return path.replace('/api/proof/','');
        if (path.startsWith('/api/proof.view/')) return path.replace('/api/proof.view/','');
        if (path.startsWith('/api/proof.data/')) return path.replace('/api/proof.data/','');
        if (path.startsWith('/api/proof.inline/')) return path.replace('/api/proof.inline/','');
        if (path.startsWith('/api/file/')) return path.replace('/api/file/','');
      }catch(_){}
      return '';
    }
    if (raw.startsWith('/')) return raw.replace(/^\/+/,'');
    return raw;
  }
  const extractProofKeyFromUrl = extractProofKey;
  async function signProofUrl(env, val, ttlSec=900){
    const key = extractProofKey(val);
    if (!key) return String(val || '');
    const token = await signProofToken(env, key, ttlSec);
    if (!token) return String(val || '');
    return `/api/proof/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`;
  }
  function isAllowedFileUrl(raw, env, origin){
    if (!raw) return false;
    if (raw.startsWith('/')) return true;
    if (!/^https?:\/\//i.test(raw)) return true;
    try{
      const url = new URL(raw);
      const allow = new Set();
      const addHost = (val)=>{
        if (!val) return;
        try{
          const u = val.startsWith('http') ? new URL(val) : new URL(`https://${val}`);
          allow.add(u.host);
        }catch(_){}
      };
      addHost(origin);
      addHost(env?.SITE_URL);
      addHost(env?.PUBLIC_SITE_URL);
      addHost(env?.PUBLIC_ORIGIN);
      addHost(env?.FILE_HOST);
      addHost(env?.PUBLIC_FILE_HOST);
      return allow.has(url.host);
    }catch(_){
      return false;
    }
  }

  function parseCookies(request){
    const header = request.headers.get('cookie') || request.headers.get('Cookie') || '';
    const obj = {};
    header.split(';').forEach(part=>{
      const idx = part.indexOf('=');
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx+1).trim();
      if (key) obj[key] = decodeURIComponent(val);
    });
    return obj;
  }

  // === Slots: required KV bindings + env (Pages -> Settings -> Functions) ===
  // KV bindings: SERVICE_SLOTS_KV, SERVICE_SLOT_HOLDS_KV
  // Env (txt): SLOT_TZ=Asia/Bangkok, SLOT_HOLD_TTL_MIN=15, SLOT_DAYS_AHEAD=14, SLOT_STEP_MIN=30, SLOT_DAILY_WINDOWS="13:00-20:00"
  // Optional: PHONE_CONSULT_SERVICE_MATCH="電話|phone|翻譯|translation|泰文"
  // Manual tests:
  // (1) GET /api/service/slots => enabled=false unless published
  // (2) POST /api/service/slot/hold (logged-out) => 401
  // (3) POST /api/service/slot/hold on unpublished slot => 409 slot_not_published
  // (4) Hold same slot twice within TTL => 409 slot_unavailable
  // (5) POST /api/service/order with slotKey+slotHoldToken => booked
  // (6) Wait > TTL then order => 409 slot_hold_expired
  // (7) Admin publish/block/unblock via /api/admin/service/slots/* and verify status/enabled
  // === Reschedule: required KV + env ===
  // KV binding: SERVICE_RESCHEDULE_KV
  // Env (txt): RESCHEDULE_RULE_HOURS=48, RESCHEDULE_INDEX_LIMIT=2000, RESCHEDULE_NOTIFY_EMAIL (optional)
  function parseTimeToMinutes(input){
    const raw = String(input || '').trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  function minutesToHHMM(min){
    const total = Number(min);
    if (!Number.isFinite(total)) return '';
    const h = Math.floor(total / 60) % 24;
    const m = Math.floor(total % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  function getSlotConfig(env){
    const tz = String(env?.SLOT_TZ || 'Asia/Bangkok');
    const holdTtlMin = Math.max(5, Number(env?.SLOT_HOLD_TTL_MIN || 15) || 15);
    const daysAhead = Math.max(1, Math.min(31, Number(env?.SLOT_DAYS_AHEAD || 14) || 14));
    const stepMin = Math.max(5, Number(env?.SLOT_STEP_MIN || 30) || 30);
    const windowsStr = String(env?.SLOT_DAILY_WINDOWS || '13:00-20:00');
    return { tz, holdTtlMin, daysAhead, stepMin, windowsStr };
  }
  const SLOT_MODE_KEY_PREFIX = 'slot_mode:';
  const SLOT_WINDOW_KEY_PREFIX = 'slot_window:';
  const SLOT_PUBLISH_SCHEDULE_KEY_PREFIX = 'slot_publish_schedule:';
  const BOOKING_MODE_LEGACY = 'legacy';
  const BOOKING_MODE_WINDOWED = 'windowed';
  function normalizeBookingMode(input){
    const raw = String(input || '').trim().toLowerCase();
    if (raw === BOOKING_MODE_WINDOWED) return BOOKING_MODE_WINDOWED;
    return BOOKING_MODE_LEGACY;
  }
  function buildSlotModeKey(serviceId){
    return `${SLOT_MODE_KEY_PREFIX}${String(serviceId || '').trim()}`;
  }
  function buildSlotWindowKey(serviceId){
    return `${SLOT_WINDOW_KEY_PREFIX}${String(serviceId || '').trim()}`;
  }
  function buildSlotPublishScheduleKey(serviceId){
    return `${SLOT_PUBLISH_SCHEDULE_KEY_PREFIX}${String(serviceId || '').trim()}`;
  }
  async function getServiceSlotMode(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return BOOKING_MODE_LEGACY;
    try{
      const raw = await env.SERVICE_SLOTS_KV.get(buildSlotModeKey(serviceId));
      if (!raw) return BOOKING_MODE_LEGACY;
      return normalizeBookingMode(raw);
    }catch(_){
      return BOOKING_MODE_LEGACY;
    }
  }
  async function setServiceSlotMode(env, serviceId, mode){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return;
    const normalized = normalizeBookingMode(mode);
    const key = buildSlotModeKey(serviceId);
    try{
      if (normalized === BOOKING_MODE_LEGACY){
        await env.SERVICE_SLOTS_KV.delete(key);
      }else{
        await env.SERVICE_SLOTS_KV.put(key, normalized);
      }
    }catch(_){}
  }
  async function getServiceSlotWindow(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return null;
    try{
      const raw = await env.SERVICE_SLOTS_KV.get(buildSlotWindowKey(serviceId));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    }catch(_){
      return null;
    }
  }
  async function setServiceSlotWindow(env, serviceId, windowInfo){
    if (!env?.SERVICE_SLOTS_KV || !serviceId || !windowInfo) return;
    try{
      await env.SERVICE_SLOTS_KV.put(buildSlotWindowKey(serviceId), JSON.stringify(windowInfo));
    }catch(_){}
  }
  async function getServiceSlotPublishSchedule(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return null;
    try{
      const raw = await env.SERVICE_SLOTS_KV.get(buildSlotPublishScheduleKey(serviceId));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    }catch(_){
      return null;
    }
  }
  async function setServiceSlotPublishSchedule(env, serviceId, schedule){
    if (!env?.SERVICE_SLOTS_KV || !serviceId || !schedule) return;
    try{
      await env.SERVICE_SLOTS_KV.put(buildSlotPublishScheduleKey(serviceId), JSON.stringify(schedule));
    }catch(_){}
  }
  async function clearServiceSlotPublishSchedule(env, serviceId){
    if (!env?.SERVICE_SLOTS_KV || !serviceId) return;
    try{ await env.SERVICE_SLOTS_KV.delete(buildSlotPublishScheduleKey(serviceId)); }catch(_){}
  }
  function isSlotWindowActive(windowInfo, now){
    if (!windowInfo) return false;
    const openFrom = Number(windowInfo.openFrom || 0);
    const openUntil = Number(windowInfo.openUntil || 0);
    if (!openFrom || !openUntil) return false;
    if (openUntil <= openFrom) return false;
    return now >= openFrom && now < openUntil;
  }
  function buildSlotKey(serviceId, dateStr, hhmmNoColon){
    return `slot:${serviceId}:${dateStr}:${hhmmNoColon}`;
  }
  function parseSlotKey(slotKey){
    const raw = String(slotKey || '').trim();
    const match = raw.match(/^slot:([^:]+):(\d{4}-\d{2}-\d{2}):(\d{4})$/);
    if (!match) return null;
    const hh = match[3].slice(0,2);
    const mm = match[3].slice(2,4);
    return { serviceId: match[1], dateStr: match[2], hhmm: `${hh}:${mm}` };
  }
  function nowMs(){
    return Date.now();
  }
  function parsePublishAt(input){
    if (!input) return 0;
    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
    const raw = String(input || '').trim();
    if (!raw) return 0;
    const direct = Number(raw);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  async function publishSlotKeys(env, slotKeys){
    const updated = [];
    const skipped = [];
    for (const slotKey of slotKeys){
      const parsed = parseSlotKey(slotKey);
      if (!parsed){
        skipped.push({ slotKey, reason:'invalid_slot' });
        continue;
      }
      let existing = null;
      try{
        const raw = await env.SERVICE_SLOTS_KV.get(slotKey);
        if (raw) existing = JSON.parse(raw);
      }catch(_){}
      if (existing && (existing.status === 'booked' || existing.status === 'held')){
        skipped.push({ slotKey, reason: existing.status });
        continue;
      }
      const record = {
        serviceId: parsed.serviceId,
        slotKey,
        date: parsed.dateStr,
        time: parsed.hhmm,
        enabled: true,
        status: 'free',
        heldUntil: 0,
        holdToken: '',
        bookedOrderId: ''
      };
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(record));
      updated.push(slotKey);
    }
    return { updated, skipped };
  }
  async function unpublishSlotKeys(env, slotKeys){
    const updated = [];
    const skipped = [];
    const now = nowMs();
    for (const slotKey of slotKeys){
      const parsed = parseSlotKey(slotKey);
      if (!parsed){
        skipped.push({ slotKey, reason:'invalid_slot' });
        continue;
      }
      let existing = null;
      try{
        const raw = await env.SERVICE_SLOTS_KV.get(slotKey);
        if (raw) existing = JSON.parse(raw);
      }catch(_){}
      const status = resolveSlotStatus(existing, now);
      if (status === 'booked' || status === 'held'){
        skipped.push({ slotKey, reason: status });
        continue;
      }
      const record = {
        serviceId: parsed.serviceId,
        slotKey,
        date: parsed.dateStr,
        time: parsed.hhmm,
        enabled: false,
        status: 'blocked',
        heldUntil: 0,
        holdToken: '',
        bookedOrderId: ''
      };
      await env.SERVICE_SLOTS_KV.put(slotKey, JSON.stringify(record));
      updated.push(slotKey);
    }
    return { updated, skipped };
  }
  async function applyScheduledSlotPublish(env, serviceId){
    const schedule = await getServiceSlotPublishSchedule(env, serviceId);
    const scheduleAt = schedule ? Number(schedule.publishAt || 0) : 0;
    if (!schedule || !scheduleAt || nowMs() < scheduleAt) return schedule;
    const scheduleKeys = Array.isArray(schedule.slotKeys) ? schedule.slotKeys.map(k=>String(k||'').trim()).filter(Boolean) : [];
    if (scheduleKeys.length){
      await publishSlotKeys(env, scheduleKeys);
    }
    const minutes = Number(schedule.openWindowMinutes || 0);
    if (minutes > 0){
      await setServiceSlotWindow(env, serviceId, {
        serviceId,
        openFrom: scheduleAt,
        openUntil: scheduleAt + minutes * 60 * 1000,
        createdAt: new Date().toISOString(),
        createdBy: String(schedule.createdBy || ''),
        slotKeys: scheduleKeys
      });
    }
    await clearServiceSlotPublishSchedule(env, serviceId);
    return null;
  }
  async function closeExpiredWindowIfNeeded(env, serviceId, windowInfo){
    if (!windowInfo) return windowInfo;
    const openUntil = Number(windowInfo.openUntil || 0);
    if (!openUntil || nowMs() < openUntil) return windowInfo;
    const slotKeys = Array.isArray(windowInfo.slotKeys) ? windowInfo.slotKeys : [];
    if (slotKeys.length){
      await unpublishSlotKeys(env, slotKeys);
      const next = Object.assign({}, windowInfo, {
        slotKeys: [],
        closedAt: new Date().toISOString()
      });
      await setServiceSlotWindow(env, serviceId, next);
      return next;
    }
    return windowInfo;
  }
  function getTodayDateStr(tz){
    try{
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' });
      return fmt.format(new Date());
    }catch(_){
      return new Date().toISOString().split('T')[0];
    }
  }
  function addDaysDateStr(dateStr, offset){
    const base = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(base.getTime())) return '';
    base.setUTCDate(base.getUTCDate() + offset);
    return base.toISOString().split('T')[0];
  }
  function parseDailyWindows(windowsStr, stepMin){
    const list = String(windowsStr || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const out = [];
    list.forEach(range=>{
      const parts = range.split('-').map(s=>s.trim());
      if (parts.length !== 2) return;
      const startMin = parseTimeToMinutes(parts[0]);
      const endMin = parseTimeToMinutes(parts[1]);
      if (startMin === null || endMin === null) return;
      if (endMin <= startMin) return;
      out.push({ startMin, endMin, stepMin });
    });
    return out;
  }
  function resolveSlotEnabled(record){
    if (!record) return false;
    if (typeof record.enabled === 'boolean') return record.enabled;
    if (record.status === 'held' || record.status === 'booked') return true;
    return false;
  }
  function resolveSlotStatus(record, now){
    if (!record) return 'free';
    if (record.status === 'blocked') return 'blocked';
    if (record.status === 'booked') return 'booked';
    if (record.status === 'held'){
      const heldUntil = Number(record.heldUntil || 0);
      if (heldUntil > now) return 'held';
    }
    return 'free';
  }
  function resolveHoldUserId(svcUser, request){
    if (svcUser && svcUser.id) return String(svcUser.id);
    if (svcUser && svcUser.email) return String(svcUser.email).toLowerCase();
    return getClientIp(request) || '';
  }
  async function cleanupExpiredHolds(env){
    const holdsKv = env?.SERVICE_SLOT_HOLDS_KV;
    const slotsKv = env?.SERVICE_SLOTS_KV;
    if (!holdsKv || !slotsKv || typeof holdsKv.list !== 'function') return;
    const now = nowMs();
    let cursor = undefined;
    let loops = 0;
    try{
      do{
        const listing = await holdsKv.list({ prefix:'hold:', limit:100, cursor });
        const keys = listing && Array.isArray(listing.keys) ? listing.keys : [];
        for (const key of keys){
          const name = key && key.name ? key.name : '';
          if (!name) continue;
          let raw = null;
          try{ raw = await holdsKv.get(name); }catch(_){}
          if (!raw) continue;
          let rec = null;
          try{ rec = JSON.parse(raw); }catch(_){}
          if (!rec) continue;
          const exp = Number(rec.holdExpiresAt || rec.expiresAt || 0);
          if (!exp || exp > now) continue;
          const slotKey = String(rec.slotKey || '');
          const holdToken = name.replace(/^hold:/, '');
          if (slotKey){
            try{
              const slotRaw = await slotsKv.get(slotKey);
              if (slotRaw){
                const slotRec = JSON.parse(slotRaw);
                if (slotRec && slotRec.status === 'held' && slotRec.holdToken === holdToken){
                  slotRec.status = 'free';
                  slotRec.holdToken = '';
                  slotRec.heldUntil = 0;
                  slotRec.holdExpiresAt = 0;
                  slotRec.holdBy = '';
                  await slotsKv.put(slotKey, JSON.stringify(slotRec));
                  try{
                    await auditAppend(env, {
                      ts: new Date().toISOString(),
                      action: 'slot_hold_released',
                      actorEmail: '',
                      actorRole: 'system',
                      ip: '',
                      ua: '',
                      targetType: 'service_slot',
                      targetId: slotKey,
                      orderId: '',
                      slotKey,
                      meta: { slotKey, orderId:'', userId: rec.userId || rec.holdBy || '' }
                    });
                  }catch(err){
                    console.warn('audit slot_hold_released failed', err);
                  }
                }
              }
            }catch(_){}
          }
          try{ await holdsKv.delete(name); }catch(_){}
          try{
            await auditAppend(env, {
              ts: new Date().toISOString(),
              action: 'slot_hold_expired',
              actorEmail: '',
              actorRole: 'system',
              ip: '',
              ua: '',
              targetType: 'service_slot',
              targetId: slotKey,
              orderId: '',
              slotKey,
              meta: { slotKey, orderId:'', userId: rec.userId || rec.holdBy || '' }
            });
          }catch(err){
            console.warn('audit slot_hold_expired failed', err);
          }
        }
        cursor = listing && listing.cursor ? listing.cursor : '';
        loops++;
      }while(cursor && loops < 20);
    }catch(err){
      console.warn('cleanupExpiredHolds failed', err);
    }
  }
  async function hasActiveHoldForUser(env, userId){
    const holdsKv = env?.SERVICE_SLOT_HOLDS_KV;
    if (!holdsKv || typeof holdsKv.list !== 'function') return null;
    const now = nowMs();
    let cursor = undefined;
    let loops = 0;
    try{
      do{
        const listing = await holdsKv.list({ prefix:'hold:', limit:100, cursor });
        const keys = listing && Array.isArray(listing.keys) ? listing.keys : [];
        for (const key of keys){
          const name = key && key.name ? key.name : '';
          if (!name) continue;
          let raw = null;
          try{ raw = await holdsKv.get(name); }catch(_){}
          if (!raw) continue;
          let rec = null;
          try{ rec = JSON.parse(raw); }catch(_){}
          if (!rec) continue;
          const exp = Number(rec.holdExpiresAt || rec.expiresAt || 0);
          const holdUser = String(rec.userId || rec.holdBy || '').toLowerCase();
          if (exp > now && holdUser && userId && holdUser === String(userId).toLowerCase()){
            return rec;
          }
        }
        cursor = listing && listing.cursor ? listing.cursor : '';
        loops++;
      }while(cursor && loops < 20);
    }catch(err){
      console.warn('hasActiveHoldForUser failed', err);
    }
    return null;
  }
  function getRescheduleConfig(env){
    const ruleHours = Math.max(1, Number(env?.RESCHEDULE_RULE_HOURS || 48) || 48);
    const indexLimit = Math.max(100, Number(env?.RESCHEDULE_INDEX_LIMIT || 2000) || 2000);
    return { ruleHours, indexLimit };
  }
  function getRescheduleNotifyEmails(env){
    const raw = String(env?.RESCHEDULE_NOTIFY_EMAIL || env?.ORDER_NOTIFY_EMAIL || env?.ADMIN_EMAIL || '').trim();
    return raw.split(',').map(s=>s.trim()).filter(Boolean);
  }
  function parseSlotStartToMs(slotStart){
    const raw = String(slotStart || '').trim();
    if (!raw) return 0;
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? 0 : ms;
  }
  function buildRescheduleId(){
    return `rsch_${makeToken(12)}`;
  }
  async function updateRescheduleIndex(env, requestId){
    const kv = env?.SERVICE_RESCHEDULE_KV;
    if (!kv) return false;
    const cfg = getRescheduleConfig(env);
    const idxKey = 'reschedule:index';
    let idxRaw = await kv.get(idxKey);
    let list = [];
    if (idxRaw){
      try{ list = String(idxRaw).split('\n').filter(Boolean); }catch(_){}
    }
    list = [requestId].concat(list.filter(id => id !== requestId)).slice(0, cfg.indexLimit);
    await kv.put(idxKey, list.join('\n'));
    return true;
  }
  function buildRescheduleEmail(payload){
    const esc = (typeof escapeHtmlEmail === 'function') ? escapeHtmlEmail : (s)=> String(s || '');
    const type = payload?.type || 'requested';
    const orderId = payload?.orderId || '';
    const currentSlot = payload?.currentSlot || '';
    const desiredSlot = payload?.desiredSlot || '';
    const createdAt = payload?.createdAt || '';
    const note = payload?.note || '';
    const adminUrl = payload?.adminUrl || '';
    const reason = payload?.reason || '';
    const subjectBase = type === 'approved'
      ? '改期已核准 / Reschedule Approved'
      : type === 'rejected'
        ? '改期已婉拒 / Reschedule Rejected'
        : '改期申請通知 / Reschedule Request';
    const subject = `[Unalomecodes] ${subjectBase}`;
    const zhBlock = `
  ---\n【中文】
  訂單編號：${orderId}
  原時段：${currentSlot}
  申請改期至：${desiredSlot}
  申請時間：${createdAt}
  ${note ? `備註：${note}\n` : ''}${reason ? `原因：${reason}\n` : ''}${adminUrl ? `請至後台處理：\n${adminUrl}\n` : ''}`.trim();
    const enBlock = `
  ---
  [English]
  Order ID: ${orderId}
  Original slot: ${currentSlot}
  Requested slot: ${desiredSlot}
  Request time: ${createdAt}
  ${note ? `Note: ${note}\n` : ''}${reason ? `Reason: ${reason}\n` : ''}${adminUrl ? `Please review in admin panel:\n${adminUrl}\n` : ''}`.trim();
    const text = `${zhBlock}\n\n${enBlock}`.trim();
    const zhHtml = `
  <div style="margin:0 0 16px;">
    <strong>【中文】</strong><br>
    訂單編號：${esc(orderId)}<br>
    原時段：${esc(currentSlot)}<br>
    申請改期至：${esc(desiredSlot)}<br>
    申請時間：${esc(createdAt)}<br>
    ${note ? `備註：${esc(note)}<br>` : ''}${reason ? `原因：${esc(reason)}<br>` : ''}${adminUrl ? `請至後台處理：<br><a href="${esc(adminUrl)}" target="_blank" rel="noopener">${esc(adminUrl)}</a>` : ''}
  </div>`;
    const enHtml = `
  <div style="margin:16px 0 0;">
    <strong>[English]</strong><br>
    Order ID: ${esc(orderId)}<br>
    Original slot: ${esc(currentSlot)}<br>
    Requested slot: ${esc(desiredSlot)}<br>
    Request time: ${esc(createdAt)}<br>
    ${note ? `Note: ${esc(note)}<br>` : ''}${reason ? `Reason: ${esc(reason)}<br>` : ''}${adminUrl ? `Please review in admin panel:<br><a href="${esc(adminUrl)}" target="_blank" rel="noopener">${esc(adminUrl)}</a>` : ''}
  </div>`;
    const html = `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;line-height:1.6;font-size:14px;">${zhHtml}${enHtml}</div>`;
    return { subject, html, text };
  }
  function buildBilingualOrderEmail(order, zhHtml, zhText, opts = {}){
    return { html: zhHtml, text: zhText };
  }

  async function getSessionUser(request, env){
    if (!env || !env.SESSION_SECRET) return null;
    const cookies = parseCookies(request);
    const token = cookies.auth || '';
    if (!token) return null;
    const user = await verifySessionToken(token, env.SESSION_SECRET);
    if (!user) return null;
    const store = getUserStore(env);
    if (!store) return user;
    const record = await loadUserRecord(env, user.id);
    if (!record) return null;
    if (record.disabled || record.deleted) return null;
    return user;
  }

  function getUserStore(env){
    return env.USERS || env.USER_STORE || env.MEMBERS || env.PROFILES || env.ORDERS || null;
  }

  function userKey(id){
    return `USER:${id}`;
  }

  async function loadUserRecord(env, id){
    const store = getUserStore(env);
    if (!store || !id) return null;
    try{
      const raw = await store.get(userKey(id));
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(_){
      return null;
    }
  }

  async function saveUserRecord(env, data){
    const store = getUserStore(env);
    if (!store || !data || !data.id) return null;
    const now = new Date().toISOString();
    if (!data.createdAt) data.createdAt = now;
    data.updatedAt = now;
    await store.put(userKey(data.id), JSON.stringify(data));
    return data;
  }

  async function ensureUserRecord(env, profile){
    if (!profile || !profile.id) return null;
    let record = await loadUserRecord(env, profile.id);
    const isNew = !record;
    const now = new Date().toISOString();
    if (!record){
      record = {
        id: profile.id,
        createdAt: now,
        wishlist: [],
        favoritesFoods: [],
        coupons: [],
        memberPerks: {}
      };
    }
    if (profile.email && (!record.profileEmailLocked || !record.email)){
      record.email = profile.email || record.email || '';
    }
    if (profile.name && (!record.profileNameLocked || !record.name)){
      record.name = profile.name || record.name || '';
    }
    record.picture = profile.picture || record.picture || '';
    record.provider = profile.provider || record.provider || 'google';
    record.lastLoginAt = now;
    if (!record.memberPerks) record.memberPerks = {};
    if (!record.memberPerks.welcomeDiscount){
      record.memberPerks.welcomeDiscount = {
        amount: Number(env.MEMBER_DISCOUNT || env.MEMBER_BONUS || 100),
        used: false
      };
    }
    if (!Array.isArray(record.coupons)){
      record.coupons = [];
    }
    if (!Array.isArray(record.favoritesFoods)){
      record.favoritesFoods = [];
    }
    if (isNew){
      await issueWelcomeCoupon(env, record);
    }
    await saveUserRecord(env, record);
    return record;
  }

  async function updateUserDefaultContact(env, userId, contact){
    if (!userId || !contact) return;
    const record = await loadUserRecord(env, userId);
    if (!record) return;
    record.defaultContact = Object.assign({}, record.defaultContact || {}, contact);
    await saveUserRecord(env, record);
  }

  async function updateUserDefaultStore(env, userId, store){
    if (!userId || !store) return;
    const record = await loadUserRecord(env, userId);
    if (!record) return;
    record.defaultStore = Object.assign({}, record.defaultStore || {}, store);
    await saveUserRecord(env, record);
  }

  async function getSessionUserRecord(request, env){
    const session = await getSessionUser(request, env);
    if (!session) return null;
    return await ensureUserRecord(env, session);
  }

  function getAvailableMemberDiscount(record){
    const perk = record?.memberPerks?.welcomeDiscount;
    if (!perk) return null;
    const amount = Number(perk.amount || 0);
    if (!amount || perk.used) return null;
    return { key: 'welcomeDiscount', amount };
  }

  async function markMemberDiscountUsed(env, record, perkKey, orderId){
    if (!record || !record.memberPerks || !record.memberPerks[perkKey]) return;
    record.memberPerks[perkKey].used = true;
    record.memberPerks[perkKey].usedOrder = orderId;
    record.memberPerks[perkKey].usedAt = new Date().toISOString();
    await saveUserRecord(env, record);
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
  async function readProductById(env, id){
    if (!env || !env.PRODUCTS || !id) return null;
    try{
      const raw = await env.PRODUCTS.get(`PRODUCT:${id}`);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && !p.deityCode && p.deity) p.deityCode = getDeityCodeFromName(p.deity);
      if (p) p.category = inferCategory(p);
      return p;
    }catch(_){
      return null;
    }
  }
  function resolveVariant(product, variantName){
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length){
      return { ok:true, name:'', priceDiff:0 };
    }
    const vn = cleanVariantName(variantName || '');
    let idx = -1;
    if (vn){
      idx = variants.findIndex(v => cleanVariantName(v?.name) === vn);
    }
    if (idx < 0 && variants.length === 1){
      idx = 0;
    }
    if (idx < 0) return { ok:false, error:'invalid_variant' };
    const v = variants[idx] || {};
    return { ok:true, name: String(v.name || vn || ''), priceDiff: Number(v.priceDiff || 0) || 0 };
  }
  function resolveAvailableStock(product, variantName){
    if (!product) return null;
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length){
      const vn = cleanVariantName(variantName || '');
      let idx = -1;
      if (vn){
        idx = variants.findIndex(v => cleanVariantName(v?.name) === vn);
      }
      if (idx < 0 && variants.length === 1) idx = 0;
      if (idx >= 0){
        const v = variants[idx] || {};
        if (v.stock !== undefined && v.stock !== null){
          const n = Number(v.stock);
          return Number.isFinite(n) ? n : 0;
        }
      }
    }
    if (product.stock !== undefined && product.stock !== null){
      const n = Number(product.stock);
      return Number.isFinite(n) ? n : 0;
    }
    return null;
  }
  function resolveTotalStockForProduct(product){
    if (!product) return null;
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length){
      let hasStock = false;
      let sum = 0;
      for (const v of variants){
        if (v && v.stock !== undefined && v.stock !== null){
          const n = Number(v.stock);
          if (Number.isFinite(n)){
            hasStock = true;
            sum += n;
          }
        }
      }
      if (hasStock) return sum;
    }
    if (product.stock !== undefined && product.stock !== null){
      const n = Number(product.stock);
      return Number.isFinite(n) ? n : 0;
    }
    return null;
  }
  async function buildItemFromProduct(env, productId, variantName, qty){
    const pid = String(productId || '').trim();
    if (!pid) return { ok:false, error:'missing_product_id' };
    const product = await readProductById(env, pid);
    if (!product) return { ok:false, error:'product_not_found' };
    if (product.active === false) return { ok:false, error:'product_inactive' };
    const variantInfo = resolveVariant(product, variantName);
    if (!variantInfo.ok) return { ok:false, error:variantInfo.error || 'invalid_variant' };
    const base = Number(product.basePrice || 0) || 0;
    const unit = Math.max(0, base + Number(variantInfo.priceDiff || 0));
    const count = Math.max(1, Number(qty || 1));
    const available = resolveAvailableStock(product, variantInfo.name || variantName || '');
    if (available !== null && available < count){
      return { ok:false, error:'out_of_stock', available };
    }
    const item = {
      productId: pid,
      productName: String(product.name || ''),
      name: String(product.name || ''),
      deity: String(product.deity || ''),
      deityCode: String(product.deityCode || ''),
      variantName: String(variantInfo.name || ''),
      price: unit,
      unitPrice: unit,
      qty: count,
      image: (Array.isArray(product.images) && product.images[0]) ? String(product.images[0]) : '',
      category: String(product.category || '')
    };
    return { ok:true, item };
  }
  async function resolveOrderSelection(env, body){
    function isTruthy(x){ return x === true || x === 1 || x === '1' || String(x).toLowerCase() === 'true' || String(x).toLowerCase() === 'yes' || x === 'on'; }
    const hintMode   = (body.mode || '').toLowerCase();
    const directHint = isTruthy(body.directBuy) || isTruthy(body.single) || hintMode === 'direct';
    const hasCart    = Array.isArray(body.cart) && body.cart.length > 0;
    const cartHint   = hasCart && (isTruthy(body.fromCart) || isTruthy(body.useCart) || hintMode === 'cart');
    const preferDirect = (hintMode !== 'cart') && (directHint || !!body.productId);
    let useCartOnly = !preferDirect && cartHint;
    let items = [];
    if (useCartOnly){
      const cartArr = Array.isArray(body.cart) ? body.cart : [];
      for (const it of cartArr){
        const res = await buildItemFromProduct(env, it.id || it.productId || '', it.variantName || it.variant || '', it.qty || it.quantity || 1);
        if (!res.ok) return { ok:false, error: res.error || 'invalid_item' };
        items.push(res.item);
      }
    } else {
      const res = await buildItemFromProduct(env, body.productId || '', body.variantName || body.variant || '', body.qty || 1);
      if (!res.ok){
        if (hasCart){
          useCartOnly = true;
          items = [];
          const cartArr = Array.isArray(body.cart) ? body.cart : [];
          for (const it of cartArr){
            const r = await buildItemFromProduct(env, it.id || it.productId || '', it.variantName || it.variant || '', it.qty || it.quantity || 1);
            if (!r.ok) return { ok:false, error: r.error || 'invalid_item' };
            items.push(r.item);
          }
        } else {
          return { ok:false, error: res.error || 'missing_product' };
        }
      } else {
        items = [res.item];
      }
    }
    if (!items.length) return { ok:false, error:'missing_items' };
    const total = items.reduce((s, it)=> s + (Number(it.price || 0) * Math.max(1, Number(it.qty || 1))), 0);
    const totalQty = items.reduce((s, it)=> s + Math.max(1, Number(it.qty || 1)), 0);
    const first = items[0];
    const productId = useCartOnly ? (first.productId || 'CART') : first.productId;
    const productName = useCartOnly ? `購物車共 ${items.length} 項` : (first.productName || first.name || '');
    const price = useCartOnly ? total : Number(first.price || 0);
    const qty = useCartOnly ? totalQty : Math.max(1, Number(first.qty || 1));
    const deity = String(first.deity || '');
    const variantName = useCartOnly ? String(first.variantName || '') : String(first.variantName || '');
    return { ok:true, useCartOnly, items, productId, productName, price, qty, deity, variantName };
  }

  // === Helper: unified proof retriever (R2 first, then KV) ===

  return {
    proofSecret,
    signProofToken,
    verifyProofToken,
    extractProofKeyFromUrl,
    isAllowedFileUrl,
    resolveTotalStockForProduct,
    resolveAvailableStock,
    readProductById
  };
}

export { createProofUtils };
