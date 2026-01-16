export function createAdminAuditHandler(deps){
  const {
    jsonHeadersFor,
    isAdmin,
    getAdminSession,
    getAdminRole
  } = deps;

  return async function handleAdminAudit(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/admin/audit-logs' || request.method !== 'GET') return null;
    if (!(await isAdmin(request, env))) {
      return new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status:401, headers: jsonHeadersFor(request, env) });
    }
    const adminSession = await getAdminSession(request, env);
    if (adminSession && adminSession.email) {
      const role = await getAdminRole(adminSession.email, env);
      if (role !== 'owner') {
        return new Response(JSON.stringify({ ok:false, error:'forbidden_role' }), { status:403, headers: jsonHeadersFor(request, env) });
      }
    }
    if (!env.ADMIN_AUDIT_KV){
      return new Response(JSON.stringify({ ok:false, error:'audit_kv_not_configured' }), { status:501, headers: jsonHeadersFor(request, env) });
    }
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50) || 50));
    const cursorRaw = url.searchParams.get('cursor');
    const actionFilter = String(url.searchParams.get('action') || '').trim();
    const offset = Math.max(0, Number(cursorRaw || 0) || 0);
    let idxRaw = await env.ADMIN_AUDIT_KV.get('audit:index');
    let ids = idxRaw ? String(idxRaw).split('\n').filter(Boolean) : [];
    if (ids.length >= 2){
      const a = parseInt(String(ids[0]).split('_')[0] || '0', 10);
      const b = parseInt(String(ids[ids.length - 1]).split('_')[0] || '0', 10);
      if (a && b && a < b) ids = ids.slice().reverse();
    }
    const items = [];
    let i = offset;
    for (; i < ids.length && items.length < limit; i++){
      const id = ids[i];
      const raw = await env.ADMIN_AUDIT_KV.get(`audit:${id}`);
      if (!raw) continue;
      let entry = null;
      try{ entry = JSON.parse(raw); }catch(_){ entry = null; }
      if (!entry) continue;
      if (actionFilter && String(entry.action || '') !== actionFilter) continue;
      items.push(entry);
    }
    const nextCursor = i < ids.length ? String(i) : null;
    return new Response(JSON.stringify({ ok:true, items, nextCursor }), { status:200, headers: jsonHeadersFor(request, env) });
  };
}
