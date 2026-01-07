(function(){
  const box = document.getElementById('adminStats');
  if (!box) return;
  const maxDashboardAttempts = 3;
  const retryDelay = (attempt) => 1400 * (attempt + 1);
  const set = (key, value) => {
    const el = box.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = value;
  };
  const setSub = (key, value) => {
    const el = box.querySelector(`[data-stat-sub="${key}"]`);
    if (el) el.textContent = value;
  };
  const fmtNum = (n)=> Number(n || 0).toLocaleString('zh-TW');
  const fmtMoney = (n)=> `NT$ ${fmtNum(Math.round(Number(n || 0) || 0))}`;
  const esc = (val)=>{
    const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    return String(val || '').replace(/[&<>"']/g, m => map[m] || m);
  };
  const setReport = (key, value)=>{
    const el = document.querySelector(`[data-report="${key}"]`);
    if (el) el.textContent = value;
  };
  const renderList = (key, items, formatter)=>{
    const el = document.querySelector(`[data-report-list="${key}"]`);
    if (!el) return;
    if (!items || !items.length){
      el.innerHTML = '<li class="empty">尚無資料</li>';
      return;
    }
    el.innerHTML = items.map(formatter).join('');
  };
  const renderUtmList = (key, items)=>{
    renderList(key, items, (item)=>{
      const name = esc(item.name || 'direct');
      const count = fmtNum(item.count || 0);
      return `<li><span class="name">${name}</span><span>${count} 筆</span></li>`;
    });
  };
  const markReportLoading = ()=>{
    setSub('products-sub', '統計更新中…');
    setSub('orders-sub', '統計更新中…');
    setSub('service-orders-sub', '統計更新中…');
    setSub('members-sub', '統計更新中…');
    setSub('coupons-sub', '統計更新中…');
    setReport('physical-status', '統計更新中…');
    setReport('service-status', '統計更新中…');
    setReport('physical-scan', '統計更新中…');
    setReport('service-scan', '統計更新中…');
  };
  const applyDashboard = (data)=>{
    const s = data.stats || {};
    set('products-total', s.products ? s.products.total : '—');
    setSub('products-sub', s.products ? `上架 ${s.products.active || 0}｜低庫存 ${s.products.lowStock || 0}` : '—');
    set('orders-total', s.orders ? s.orders.total : '—');
    setSub('orders-sub', s.orders ? `訂單待處理 ${s.orders.pending || 0}｜待出貨 ${s.orders.paid || 0}｜已取件（訂單完成） ${s.orders.done || 0}` : '—');
    set('service-orders-total', s.serviceOrders ? s.serviceOrders.total : '—');
    setSub('service-orders-sub', s.serviceOrders ? `新訂單 ${s.serviceOrders.pending || 0}｜已確認付款 ${s.serviceOrders.paid || 0}｜已完成訂單 ${s.serviceOrders.done || 0}` : '—');
    set('members-total', s.members ? s.members.total : '—');
    setSub('members-sub', s.members && s.members.approx ? '資料量較大，顯示估算' : '同步完成');
    if (s.coupons){
      set('coupons-used', `${s.coupons.used7 || 0}/${s.coupons.total7 || 0}`);
      setSub('coupons-sub', s.coupons.approx ? '資料量較大，顯示估算' : '近 7 日使用 / 發放');
    }

    const r = data.reports || {};
    const limits = data.limits || {};
    const physical = r.physical || {};
    const service = r.service || {};
    setReport('physical-rev-today', fmtMoney(physical.revenue?.today));
    setReport('physical-rev-7', fmtMoney(physical.revenue?.last7));
    setReport('physical-rev-30', fmtMoney(physical.revenue?.last30));
    setReport('physical-ord-today', fmtNum(physical.orders?.today));
    setReport('physical-ord-7', fmtNum(physical.orders?.last7));
    setReport('physical-ord-30', fmtNum(physical.orders?.last30));
    setReport('physical-status', `訂單待處理 ${fmtNum(physical.status?.pending)}｜待出貨 ${fmtNum(physical.status?.paid)}｜已取件（訂單完成） ${fmtNum(physical.status?.done)}`);
    setReport('physical-scan', physical.approx ? `資料量較大，統計前 ${fmtNum(limits.scanLimit || 0)} 筆` : '完整統計');

    setReport('service-rev-today', fmtMoney(service.revenue?.today));
    setReport('service-rev-7', fmtMoney(service.revenue?.last7));
    setReport('service-rev-30', fmtMoney(service.revenue?.last30));
    setReport('service-ord-today', fmtNum(service.orders?.today));
    setReport('service-ord-7', fmtNum(service.orders?.last7));
    setReport('service-ord-30', fmtNum(service.orders?.last30));
    setReport('service-status', `新訂單 ${fmtNum(service.status?.pending)}｜已確認付款 ${fmtNum(service.status?.paid)}｜已完成訂單 ${fmtNum(service.status?.done)}`);
    setReport('service-scan', service.approx ? `資料量較大，統計前 ${fmtNum(limits.scanLimit || 0)} 筆` : '完整統計');

    renderList('physical-top', physical.topItems, (item)=>{
      const name = esc(item.name || '商品');
      const qty = fmtNum(item.qty || 0);
      return `<li><span class="name">${name}</span><span>× ${qty}</span></li>`;
    });
    renderList('physical-low', physical.lowStock, (item)=>{
      const name = esc(item.name || '商品');
      const stock = fmtNum(item.stock || 0);
      return `<li><span class="name">${name}</span><span>庫存 ${stock}</span></li>`;
    });
    renderList('service-top', service.topItems, (item)=>{
      const name = esc(item.name || '服務商品');
      const qty = fmtNum(item.qty || 0);
      return `<li><span class="name">${name}</span><span>× ${qty}</span></li>`;
    });
  };
  const loadDashboard = (attempt = 0, forceFresh = false)=>{
    const url = forceFresh ? '/api/admin/dashboard?fresh=1' : '/api/admin/dashboard';
    return fetch(url, { credentials:'include', cache:'no-store' })
      .then(res => res.json().catch(()=>({})).then(data => ({ ok: res.ok, data })))
      .then(({ ok, data })=>{
        if (!ok || !data || data.ok === false) throw new Error((data && data.error) || 'load_failed');
        const hasStats = data && data.stats && Object.keys(data.stats).length > 0;
        if (data && data.fromCache === false && !hasStats){
          markReportLoading();
          if (attempt < maxDashboardAttempts){
            setTimeout(()=> loadDashboard(attempt + 1, forceFresh), retryDelay(attempt));
          }
          return;
        }
        applyDashboard(data);
      })
      .catch(()=>{
        const subs = box.querySelectorAll('[data-stat-sub]');
        subs.forEach(el => { el.textContent = '暫時無法載入'; });
      });
  };
  loadDashboard();

  const refreshBtn = document.getElementById('refreshDashboardStats');
  if (refreshBtn){
    const label = refreshBtn.textContent || '重新整理';
    refreshBtn.addEventListener('click', ()=>{
      refreshBtn.disabled = true;
      refreshBtn.textContent = '更新中…';
      markReportLoading();
      loadDashboard(0, true)
        .finally(()=>{
          refreshBtn.disabled = false;
          refreshBtn.textContent = label;
        });
    });
  }

  // Load Food Map Stats
  const ctx = document.getElementById('foodMapChart');
  const totalEl = document.getElementById('foodMapTotal');
  if (ctx) {
    fetch('/api/admin/food-stats?days=14', { credentials:'include', cache:'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;
        if (totalEl) totalEl.textContent = (data.total || 0).toLocaleString() + ' 人';
        
        const labels = (data.stats || []).map(s => s.date.slice(5)); // MM-DD
        const counts = (data.stats || []).map(s => s.count);
        
        if (!window.Chart) return;
        try{
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: '每日不重複訪客',
                data: counts,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2563eb',
                pointRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(15,23,42,0.9)',
                  titleColor: '#e2e8f0',
                  bodyColor: '#e2e8f0',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0,0,0,0.05)' },
                  ticks: { stepSize: 1, font: { size: 11 } }
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { size: 11 } }
                }
              },
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              }
            }
          });
        }catch(err){
          console.error(err);
        }
      })
      .catch(console.error);
  }

  // Load Temple Map Stats
  const templeCtx = document.getElementById('templeMapChart');
  const templeTotalEl = document.getElementById('templeMapTotal');
  if (templeCtx) {
    fetch('/api/admin/temple-stats?days=14', { credentials:'include', cache:'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;
        if (templeTotalEl) templeTotalEl.textContent = (data.total || 0).toLocaleString() + ' 人';

        const labels = (data.stats || []).map(s => s.date.slice(5));
        const counts = (data.stats || []).map(s => s.count);

        if (!window.Chart) return;
        try{
          new Chart(templeCtx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: '每日不重複訪客',
                data: counts,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.12)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(15,23,42,0.9)',
                  titleColor: '#e2e8f0',
                  bodyColor: '#e2e8f0',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: 'rgba(0,0,0,0.05)' },
                  ticks: { stepSize: 1, font: { size: 11 } }
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { size: 11 } }
                }
              },
              interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
              }
            }
          });
        }catch(err){
          console.error(err);
        }
      })
      .catch(console.error);
  }

  const loadUtmStats = (eventName, totalKey, listKey)=>{
    fetch(`/api/admin/track-stats?event=${encodeURIComponent(eventName)}&days=14`, { credentials:'include', cache:'no-store' })
      .then(r => r.json())
      .then(data => {
        if (!data || !data.ok) return;
        setReport(totalKey, `${fmtNum(data.total || 0)} 筆`);
        renderUtmList(listKey, data.sources || []);
      })
      .catch(console.error);
  };
  loadUtmStats('order_submit', 'utm-physical-total', 'utm-physical-source');
  loadUtmStats('service_order_submit', 'utm-service-total', 'utm-service-source');
})();
