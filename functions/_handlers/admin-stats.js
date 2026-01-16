export function createAdminStatsHandler(deps){
  const {
    json,
    isAdmin,
    forbidIfFulfillmentAdmin,
    updateDashboardStats,
    pickTrackStore,
    normalizeTrackEvent,
    taipeiDateKey
  } = deps;

  return async function handleAdminStats(request, env){
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/api/admin/dashboard' && request.method === 'GET') {
      if (!(await isAdmin(request, env))){
        return json({ ok:false, error:'unauthorized' }, 401, request, env);
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      const store = env.ORDERS;
      if (!store) return json({ ok: false, error: 'STATS_CACHE_STORE not bound' }, 500, request, env);
      const forceFresh = url.searchParams.get('fresh') === '1' || url.searchParams.get('refresh') === '1';
      const dashboardCacheTtl = Math.max(60, Math.min(Number(env.DASHBOARD_CACHE_TTL || 600) || 600, 3600));
      if (!forceFresh){
        const raw = await store.get('DASHBOARD_STATS_CACHE');
        if (raw) {
          try{
            const data = JSON.parse(raw);
            return json({ ok: true, ...data, fromCache: true }, 200, request, env);
          }catch(_){}
        }
      }
      const result = await updateDashboardStats(env);
      await store.put('DASHBOARD_STATS_CACHE', JSON.stringify(result), { expirationTtl: dashboardCacheTtl });
      return json({ ok: true, ...result, fromCache: false }, 200, request, env);
    }

    if (pathname === '/api/admin/food-stats' && request.method === 'GET'){
      if (!(await isAdmin(request, env))){
        return json({ ok:false, error:'unauthorized' }, 401, request, env);
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      if (!env.FOODS) return json({ ok:false, error:'FOODS KV not bound' }, 500, request, env);
      const daysRaw = parseInt(url.searchParams.get('days') || '14', 10);
      const days = Math.max(1, Math.min(90, Number.isFinite(daysRaw) ? daysRaw : 14));
      const out = [];
      for (let i = days - 1; i >= 0; i--){
        const dateKey = taipeiDateKey(Date.now() - i * 86400000);
        let count = 0;
        try{
          const raw = await env.FOODS.get(`FOOD_STATS:${dateKey}`);
          count = parseInt(raw || '0', 10) || 0;
        }catch(_){}
        out.push({ date: dateKey, count });
      }
      let totalUnique = 0;
      try {
        const rawTotal = await env.FOODS.get('FOOD_STATS:TOTAL_UNIQUE');
        totalUnique = parseInt(rawTotal || '0', 10) || 0;
      } catch(_) {}
      return json({ ok:true, stats: out, total: totalUnique }, 200, request, env);
    }

    if (pathname === '/api/admin/track-stats' && request.method === 'GET'){
      if (!(await isAdmin(request, env))){
        return json({ ok:false, error:'unauthorized' }, 401, request, env);
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      const store = pickTrackStore(env);
      if (!store) return json({ ok:false, error:'TRACK store not bound' }, 500, request, env);
      const eventName = normalizeTrackEvent(url.searchParams.get('event') || 'order_submit');
      const daysRaw = parseInt(url.searchParams.get('days') || '14', 10);
      const days = Math.max(1, Math.min(90, Number.isFinite(daysRaw) ? daysRaw : 14));
      const stats = [];
      const sourceTotals = {};
      const campaignTotals = {};
      let total = 0;
      for (let i = days - 1; i >= 0; i--){
        const dateKey = taipeiDateKey(Date.now() - i * 86400000);
        const key = `TRACK:${dateKey}:EVENT:${eventName}`;
        let count = 0;
        try{
          const raw = await store.get(key);
          if (raw){
            const data = JSON.parse(raw);
            count = parseInt(data.total || 0, 10) || 0;
            total += count;
            if (data.sources && typeof data.sources === 'object'){
              Object.entries(data.sources).forEach(([name, val])=>{
                sourceTotals[name] = (sourceTotals[name] || 0) + (parseInt(val || 0, 10) || 0);
              });
            }
            if (data.campaigns && typeof data.campaigns === 'object'){
              Object.entries(data.campaigns).forEach(([name, val])=>{
                campaignTotals[name] = (campaignTotals[name] || 0) + (parseInt(val || 0, 10) || 0);
              });
            }
          }
        }catch(_){}
        stats.push({ date: dateKey, count });
      }
      const topSources = Object.entries(sourceTotals)
        .sort((a,b)=> b[1]-a[1])
        .slice(0, 8)
        .map(([name, count])=>({ name, count }));
      const topCampaigns = Object.entries(campaignTotals)
        .sort((a,b)=> b[1]-a[1])
        .slice(0, 8)
        .map(([name, count])=>({ name, count }));
      return json({ ok:true, event: eventName, total, stats, sources: topSources, campaigns: topCampaigns }, 200, request, env);
    }

    if (pathname === '/api/admin/temple-stats' && request.method === 'GET'){
      if (!(await isAdmin(request, env))){
        return json({ ok:false, error:'unauthorized' }, 401, request, env);
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      if (!env.TEMPLES) return json({ ok:false, error:'TEMPLES KV not bound' }, 500, request, env);
      const daysRaw = parseInt(url.searchParams.get('days') || '14', 10);
      const days = Math.max(1, Math.min(90, Number.isFinite(daysRaw) ? daysRaw : 14));
      const out = [];
      for (let i = days - 1; i >= 0; i--){
        const dateKey = taipeiDateKey(Date.now() - i * 86400000);
        let count = 0;
        try{
          const raw = await env.TEMPLES.get(`TEMPLE_STATS:${dateKey}`);
          count = parseInt(raw || '0', 10) || 0;
        }catch(_){}
        out.push({ date: dateKey, count });
      }
      let totalUnique = 0;
      try {
        const rawTotal = await env.TEMPLES.get('TEMPLE_STATS:TOTAL_UNIQUE');
        totalUnique = parseInt(rawTotal || '0', 10) || 0;
      } catch(_) {}
      return json({ ok:true, stats: out, total: totalUnique }, 200, request, env);
    }

    return null;
  };
}
