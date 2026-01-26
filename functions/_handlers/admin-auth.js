function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

export function createAdminAuthHandler(deps) {
  requireDeps(deps, ['json', 'getAdminSession', 'getAdminRole', 'getAdminPermissionsForEmail'], 'admin-auth.js');
  const {
    json,
    getAdminSession,
    getAdminRole,
    getAdminPermissionsForEmail
  } = deps;

  return async function handleAdminAuth(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/auth/admin/me') return null;
    const admin = await getAdminSession(request, env);
    if (!admin){
      return json({ ok:false, error:'unauthorized' }, 401);
    }
    const role = await getAdminRole(admin.email || '', env);
    const permissions = await getAdminPermissionsForEmail(admin.email || '', env, role);
    return json({
      ok:true,
      admin:true,
      email: admin.email || '',
      name: admin.name || admin.email || '',
      role,
      permissions
    });
  };
}
