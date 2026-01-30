function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function safeJsonParse(raw){
  try{ return JSON.parse(raw); }catch(_){ return null; }
}

function clampInt(v, min, max, fallback){
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeDocType(v){
  const t = String(v || '').trim().toLowerCase();
  return t === 'quotation' ? 'quotation' : 'invoice';
}

function sanitizeInvoice(input, id){
  const obj = (input && typeof input === 'object') ? input : {};
  const now = Date.now();
  const items = Array.isArray(obj.items) ? obj.items.slice(0, 50).map(it => ({
    id: String(it && it.id || '').slice(0, 120),
    presetId: String(it && it.presetId || '').slice(0, 60),
    desc: String(it && it.desc || '').slice(0, 240),
    qty: Number(it && it.qty) || 0,
    unitPrice: Number(it && it.unitPrice) || 0
  })) : [];

  return {
    id: String(id || obj.id || obj.no || '').trim().slice(0, 64),
    docType: normalizeDocType(obj.docType || obj.type),
    date: String(obj.date || '').trim().slice(0, 20),
    no: String(obj.no || '').trim().slice(0, 64),
    issuedBy: String(obj.issuedBy || '').slice(0, 5000),
    invoiceFor: String(obj.invoiceFor || '').slice(0, 5000),
    items,
    taxPercent: obj.taxPercent === '' ? '' : (Number(obj.taxPercent) || 0),
    discountAmount: obj.discountAmount === '' ? '' : (Number(obj.discountAmount) || 0),
    notes: String(obj.notes || '').slice(0, 5000),
    createdAt: Number(obj.createdAt) || now,
    updatedAt: now
  };
}

export function createInvoicesHandler(deps){
  requireDeps(deps, ['json', 'jsonHeadersFor', 'isAdmin', 'requireAdminWrite'], 'invoices.js');
  const { json, jsonHeadersFor, isAdmin, requireAdminWrite } = deps;

  return async function invoicesHandler(request, env){
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '');

    if (!pathname.startsWith('/api/admin/invoices')) return null;

    const store = env && (env.INVOICES || env.KV);
    if (!store){
      return json({ ok:false, error:'INVOICES KV not bound (bind INVOICES or KV)' }, 500, request, env);
    }

    if (!(await isAdmin(request, env))){
      return new Response('Unauthorized', { status:401, headers: jsonHeadersFor(request, env) });
    }

    const base = '/api/admin/invoices';

    // List
    if (pathname === base && request.method === 'GET'){
      const limit = clampInt(url.searchParams.get('limit'), 1, 200, 120);
      let cursor = undefined;
      const keys = [];
      while (keys.length < limit){
        const batch = await store.list({ prefix:'INVOICE:', cursor, limit: Math.min(1000, limit - keys.length) });
        const list = (batch && batch.keys) ? batch.keys : [];
        list.forEach(k => {
          if (k && k.name) keys.push(k.name);
        });
        cursor = batch && batch.cursor ? batch.cursor : undefined;
        if (!batch || batch.list_complete || !cursor) break;
      }

      const items = [];
      for (const name of keys){
        const raw = await store.get(name);
        if (!raw) continue;
        const obj = safeJsonParse(raw);
        if (!obj || typeof obj !== 'object') continue;
        items.push(obj);
      }

      items.sort((a,b) => (Number(b && b.updatedAt) || 0) - (Number(a && a.updatedAt) || 0));
      return json({ ok:true, items: items.slice(0, limit) }, 200, request, env);
    }

    // Get / Put / Delete
    const m = pathname.match(/^\/api\/admin\/invoices\/([^\/]+)$/);
    if (m){
      const id = decodeURIComponent(m[1] || '').trim();
      const key = `INVOICE:${id}`;

      if (request.method === 'GET'){
        const raw = await store.get(key);
        if (!raw) return json({ ok:false, error:'not_found' }, 404, request, env);
        const obj = safeJsonParse(raw);
        if (!obj) return json({ ok:false, error:'bad_data' }, 500, request, env);
        return json({ ok:true, item: obj }, 200, request, env);
      }

      if (request.method === 'PUT'){
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
        const body = await request.json().catch(() => ({}));
        const item = sanitizeInvoice(body, id);
        if (!item.id){
          return json({ ok:false, error:'missing_id' }, 400, request, env);
        }
        await store.put(key, JSON.stringify(item));
        return json({ ok:true, item }, 200, request, env);
      }

      if (request.method === 'DELETE'){
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
        await store.delete(key);
        return json({ ok:true }, 200, request, env);
      }
    }

    return json({ ok:false, error:'not_found' }, 404, request, env);
  };
}

