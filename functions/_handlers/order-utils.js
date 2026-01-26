function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createOrderUtils(deps){
  requireDeps(deps, ['isAllowedFileUrl'], 'order-utils.js');
  const { isAllowedFileUrl } = deps;

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

  function normalizeReceiptUrl(o, origin, env){
    let u = o?.receiptUrl || o?.receipt || "";
    if (!u) return "";
    if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
      u = `${origin}/api/proof/${encodeURIComponent(u)}`;
    }
    if (!isAllowedFileUrl(u, env, origin)) return "";
    if (!/^https?:\/\//i.test(u) && u.startsWith('/')) u = `${origin}${u}`;
    return u;
  }

  return {
    orderAmount,
    orderItemsSummary,
    normalizeReceiptUrl
  };
}

export { createOrderUtils };
