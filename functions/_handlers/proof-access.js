function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createProofAccessUtils(deps){
  requireDeps(deps, ['getAny', 'verifyProofToken', 'isAdmin'], 'proof-access.js');
  const {
    getAny,
    verifyProofToken,
    isAdmin
  } = deps;

  async function canAccessProof(request, env, key){
    if (await isAdmin(request, env)) return true;
    const url = new URL(request.url);
    const token = String(url.searchParams.get('token') || '').trim();
    if (!token) return false;
    return await verifyProofToken(env, key, token);
  }

  const CANONICAL_STATUS = {
    PENDING: 'PENDING',
    READY_TO_SHIP: 'READY_TO_SHIP',
    SHIPPED: 'SHIPPED',
    COMPLETED: 'COMPLETED',
    OVERDUE: 'OVERDUE',
    CANCELED: 'CANCELED'
  };

  return { canAccessProof };
}

export { createProofAccessUtils };
