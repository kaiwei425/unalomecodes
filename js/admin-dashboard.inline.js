(function(){
  var guard = document.getElementById('dashboardGuard');
  var content = document.getElementById('dashboardContent');
  var serviceIdInput = document.getElementById('serviceIdInput');
  var svcSelect = document.getElementById('svcSelect');
  var btnLoad = document.getElementById('btnLoadDashboard');
  var dashboardStatus = document.getElementById('dashboardStatus');
  var kpiGrid = document.getElementById('kpiGrid');
  var healthBox = document.getElementById('healthBox');
  var slotSummary = document.getElementById('slotSummary');
  var slotFutureList = document.getElementById('slotFutureList');
  var activityList = document.getElementById('activityList');
  var servicesCache = [];

  function showGuard(){
    if (guard) guard.style.display = '';
    if (content) content.style.display = 'none';
  }
  function showContent(){
    if (guard) guard.style.display = 'none';
    if (content) content.style.display = '';
  }
  function setStatus(msg){
    if (dashboardStatus) dashboardStatus.textContent = msg || '';
  }
  function localTime(ts){
    if (!ts) return '';
    try{ return new Date(ts).toLocaleString(); }catch(_){ return String(ts); }
  }
  function isSameLocalDate(a, b){
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }
  function parseSlotDateTime(dateStr, timeStr, slotKey){
    if (dateStr && timeStr){
      var d = new Date(dateStr + 'T' + timeStr);
      if (!isNaN(d.getTime())) return d;
    }
    if (slotKey){
      var m = String(slotKey).match(/(\d{4}-\d{2}-\d{2}):?(\d{4})/);
      if (m){
        var t = m[2];
        var d2 = new Date(m[1] + 'T' + t.slice(0,2) + ':' + t.slice(2));
        if (!isNaN(d2.getTime())) return d2;
      }
    }
    return null;
  }
  function getServiceIdFromUrl(){
    try{
      var url = new URL(location.href);
      return String(url.searchParams.get('serviceId') || '').trim();
    }catch(_){
      return '';
    }
  }
  function readServiceId(){
    var urlId = getServiceIdFromUrl();
    if (urlId) return urlId;
    try{
      return String(localStorage.getItem('adminDashboardServiceId') || '').trim();
    }catch(_){
      return '';
    }
  }
  function saveServiceId(value){
    try{
      localStorage.setItem('adminDashboardServiceId', value || '');
    }catch(_){}
  }
  function setSelectOptions(services, selectedId){
    if (!svcSelect) return;
    svcSelect.innerHTML = '';
    if (!services.length){
      svcSelect.style.display = 'none';
      return;
    }
    svcSelect.style.display = '';
    services.forEach(function(svc){
      var opt = document.createElement('option');
      opt.value = svc.id;
      opt.textContent = (svc.name || 'Service') + ' (' + svc.id + ')';
      if (selectedId && svc.id === selectedId) opt.selected = true;
      svcSelect.appendChild(opt);
    });
  }
  function syncSelectWithInput(){
    if (!svcSelect || !serviceIdInput) return;
    var val = serviceIdInput.value.trim();
    if (!val) return;
    var found = servicesCache.find(function(svc){ return svc.id === val; });
    if (found){
      svcSelect.value = found.id;
    }
  }
  function normalizeServices(data){
    var items = [];
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.items)) items = data.items;
    else if (data && Array.isArray(data.services)) items = data.services;
    return items.map(function(item){
      var id = item && (item.id || item.serviceId || item._id || item.sid);
      var name = item && (item.name || item.title || item.serviceName);
      if (!id) return null;
      return { id: String(id), name: String(name || '').trim(), meta: item.meta || item.metadata || {} };
    }).filter(function(x){ return x && x.id; });
  }
  function fetchServiceList(){
    var candidates = ['/api/service/products','/api/services','/api/service/list','/api/service/products/list'];
    var idx = 0;
    function next(){
      if (idx >= candidates.length) return Promise.resolve({ ok:false, items:[] });
      var url = candidates[idx++];
      return fetch(url, { credentials:'include', cache:'no-store' })
        .then(function(res){
          if (!res.ok) throw new Error('bad');
          return res.json().catch(function(){ return null; }).then(function(data){
            var list = normalizeServices(data);
            if (list.length) return { ok:true, items:list };
            throw new Error('empty');
          });
        })
        .catch(function(){ return next(); });
    }
    return next();
  }
  function fetchAdmin(){
    return fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .catch(function(){ return { ok:false, data:{} }; });
  }
  function fetchSlots(serviceId, days){
    var qs = new URLSearchParams();
    qs.set('serviceId', serviceId);
    qs.set('days', String(days || 7));
    return fetch('/api/service/slots?' + qs.toString(), { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .catch(function(){ return { ok:false, data:{} }; });
  }
  function fetchReschedules(){
    return fetch('/api/admin/service/reschedule-requests?status=pending&limit=200', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .catch(function(){ return { ok:false, data:{} }; });
  }
  function fetchPhoneConsultConfig(){
    return fetch('/api/service/phone-consult/config', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .catch(function(){ return { ok:false, data:{} }; });
  }
  function fetchAudit(){
    return fetch('/api/admin/audit-logs?limit=30', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .catch(function(){ return { ok:false, data:{} }; });
  }
  function fetchServiceOrders(serviceId){
    var urls = [
      '/api/service/orders?serviceId=' + encodeURIComponent(serviceId) + '&limit=500',
      '/api/service/orders?limit=500',
      '/api/service/orders'
    ];
    var idx = 0;
    function next(){
      if (idx >= urls.length) return Promise.resolve({ ok:false, data:{} });
      var url = urls[idx++];
      return fetch(url, { credentials:'include', cache:'no-store' })
        .then(function(res){
          if (!res.ok) throw new Error('bad');
          return res.json().catch(function(){ return {}; }).then(function(data){
            return { ok:true, data: data || {} };
          });
        })
        .catch(function(){ return next(); });
    }
    return next();
  }
  function extractOrders(data){
    var items = [];
    if (Array.isArray(data)) items = data;
    else if (data && Array.isArray(data.items)) items = data.items;
    else if (data && Array.isArray(data.orders)) items = data.orders;
    return items;
  }
  function renderKpis(cards){
    if (!kpiGrid) return;
    kpiGrid.innerHTML = '';
    (cards || []).forEach(function(card){
      var el = document.createElement('div');
      el.className = 'kpi-card';
      el.innerHTML = '<div class="kpi-title">' + card.title + '</div>' +
        '<div class="kpi-value">' + card.value + '</div>' +
        '<div class="kpi-sub">' + card.sub + '</div>';
      kpiGrid.appendChild(el);
    });
  }
  function renderHealth(items){
    if (!healthBox) return;
    if (!items || !items.length){
      healthBox.textContent = '資料暫時無法載入';
      return;
    }
    healthBox.innerHTML = '';
    items.forEach(function(item){
      var div = document.createElement('div');
      div.className = 'health-item ' + (item.level || 'ok');
      div.innerHTML = '<div>' + item.zh + '</div><span class="en">' + item.en + '</span>';
      healthBox.appendChild(div);
    });
  }
  function renderActivities(items){
    if (!activityList) return;
    if (!Array.isArray(items) || !items.length){
      activityList.textContent = '資料暫時無法載入';
      return;
    }
    activityList.innerHTML = '';
    items.slice(0,10).forEach(function(item){
      var row = document.createElement('div');
      row.className = 'card';
      row.style.marginBottom = '8px';
      row.innerHTML = '<div style="font-weight:700;">' + (item.action || '-') + '</div>' +
        '<div class="muted">' + (item.targetId || '') + '</div>' +
        '<div class="muted">' + localTime(item.ts || item.timestamp || '') + '</div>';
      activityList.appendChild(row);
    });
  }
  function renderSlotSummary(items){
    if (!slotSummary || !slotFutureList) return;
    if (!Array.isArray(items) || !items.length){
      slotSummary.textContent = '資料暫時無法載入';
      slotFutureList.textContent = '';
      return;
    }
    var today = items[0];
    var counts = { free:0, booked:0, blocked:0 };
    (today.slots || []).forEach(function(s){
      var status = String(s.status || 'free');
      if (status === 'booked') counts.booked++;
      else if (status === 'blocked') counts.blocked++;
      else if (status === 'held') counts.booked++;
      else if (s.enabled === true) counts.free++;
    });
    slotSummary.textContent = '今日 slots：可用 ' + counts.free + '｜已預約 ' + counts.booked + '｜關閉 ' + counts.blocked;
    var list = items.slice(0,7).map(function(day){
      var total = (day.slots || []).length;
      return day.date + '：' + total;
    }).join('、');
    slotFutureList.textContent = '未來 7 天 slot 數量：' + list;
  }
  function calcOrderStats(orders){
    var now = new Date();
    var todayCount = 0;
    var pendingCount = 0;
    var completedCount = 0;
    orders.forEach(function(o){
      var createdAt = o.createdAt || o.created_at || o.created || o.ts;
      var d = createdAt ? new Date(createdAt) : null;
      if (d && !isNaN(d.getTime()) && isSameLocalDate(d, now)) todayCount++;
      var status = String(o.status || o.state || '').toLowerCase();
      if (status.indexOf('pending') >= 0 || status.indexOf('待') >= 0) pendingCount++;
      if (status.indexOf('completed') >= 0 || status.indexOf('完成') >= 0) completedCount++;
    });
    return { todayCount: todayCount, pendingCount: pendingCount, completedCount: completedCount, total: orders.length };
  }
  function calcSlotStats(items){
    var now = new Date();
    var stats = { free:0, held:0, booked:0, blocked:0, enabled:false, hasSlots:false };
    if (!Array.isArray(items)) return stats;
    items.forEach(function(day){
      (day.slots || []).forEach(function(s){
        stats.hasSlots = true;
        var status = String(s.status || 'free');
        if (s.enabled === true) stats.enabled = true;
        var d = parseSlotDateTime(day.date, s.time, s.slotKey);
        var isFuture = d ? d.getTime() > now.getTime() : true;
        if (status === 'held') stats.held++;
        else if (status === 'booked') stats.booked++;
        else if (status === 'blocked') stats.blocked++;
        else if (status === 'free' && s.enabled === true && isFuture) stats.free++;
      });
    });
    return stats;
  }
  function calcFutureFreeSlots(items){
    var now = Date.now();
    var free = 0;
    var hasEnabled = false;
    (items || []).forEach(function(day){
      (day.slots || []).forEach(function(s){
        if (s.enabled === true) hasEnabled = true;
        var status = String(s.status || '');
        if (status !== 'free' || s.enabled !== true) return;
        var ts = parseSlotDateTime(day.date, s.time, s.slotKey);
        if (!ts || ts.getTime() >= now) free++;
      });
    });
    return { free: free, hasEnabled: hasEnabled };
  }

  function loadDashboard(serviceId){
    if (!serviceId){
      setStatus('請先選擇 Service / Please select a service');
      slotSummary.textContent = '資料暫時無法載入';
      slotFutureList.textContent = '';
      activityList.textContent = '資料暫時無法載入';
      renderKpis([]);
      renderHealth([{ level:'warn', zh:'請先選擇 Service', en:'Please select a service' }]);
      return;
    }
    setStatus('載入中... / Loading...');
    Promise.all([
      fetchSlots(serviceId, 7),
      fetchReschedules(),
      fetchAudit(),
      fetchServiceOrders(serviceId),
      fetchPhoneConsultConfig()
    ]).then(function(results){
      var slotsRes = results[0] || { ok:false, data:{} };
      var resRes = results[1] || { ok:false, data:{} };
      var auditRes = results[2] || { ok:false, data:{} };
      var ordersRes = results[3] || { ok:false, data:{} };
      var cfgRes = results[4] || { ok:false, data:{} };
      var items = (slotsRes.data && (slotsRes.data.items || slotsRes.data.slots)) || [];
      var orders = extractOrders(ordersRes.data);
      if (ordersRes.ok && serviceId){
        orders = orders.filter(function(o){
          var sid = o.serviceId || o.service_id || o.sid;
          return String(sid || '') === String(serviceId);
        });
      }
      renderSlotSummary(items);
      renderActivities(auditRes.data && auditRes.data.items ? auditRes.data.items : []);
      var orderStats = calcOrderStats(orders || []);
      var slotStats = calcSlotStats(items);
      var resItems = resRes.data && resRes.data.items ? resRes.data.items : [];
      var resCount = Array.isArray(resItems) ? resItems.length : 0;
      renderKpis([
        { title:'今日訂單', value: orderStats.todayCount || '0', sub:'Orders Today' },
        { title:'待處理', value: orderStats.pendingCount || '0', sub:'Pending' },
        { title:'改期待處理', value: resCount || '0', sub:'Reschedule Pending' },
        { title:'可預約時段', value: slotStats.free || '0', sub:'Free Slots' },
        { title:'已預約', value: slotStats.booked || '0', sub:'Booked' },
        { title:'Slot 狀態', value: slotStats.hasSlots ? (slotStats.enabled ? 'ON' : 'OFF') : '—', sub:'Slot Enabled' }
      ]);
      var healthItems = [];
      if (!slotsRes.ok || !ordersRes.ok){
        healthItems.push({ level:'err', zh:'資料暫時無法載入', en:'Data unavailable' });
      }
      if (slotStats.hasSlots && slotStats.free === 0){
        healthItems.push({ level:'warn', zh:'目前沒有可預約時段', en:'No available slots' });
      }
      if (!slotStats.hasSlots){
        healthItems.push({ level:'warn', zh:'尚未取得 slots 資料', en:'Slots data not loaded' });
      }
      if (resCount > 0){
        healthItems.push({ level:'warn', zh:'有改期申請待處理', en:'Pending reschedule requests' });
      }
      if (orderStats.pendingCount > 0){
        healthItems.push({ level:'ok', zh:'待處理訂單：' + orderStats.pendingCount, en:'Pending orders: ' + orderStats.pendingCount });
      }
      if (cfgRes.ok){
        var mode = String(cfgRes.data.mode || '').toUpperCase();
        if (mode) healthItems.push({ level:'ok', zh:'Phone Consult 上線模式：' + mode, en:'Launch mode: ' + mode });
      }
      var phoneReadyPromise = null;
      if (!cfgRes.ok){
        healthItems.push({ level:'warn', zh:'Phone consult：無法取得狀態', en:'Phone consult: Data unavailable' });
      }else if (cfgRes.data && cfgRes.data.enabled === false){
        if (cfgRes.data.reason === 'missing_service_id'){
          healthItems.push({ level:'err', zh:'Phone consult：尚未設定服務ID', en:'Phone consult: Not configured' });
        }else if (cfgRes.data.reason === 'invalid_launch_mode'){
          healthItems.push({ level:'err', zh:'Phone consult：模式設定錯誤', en:'Phone consult: Invalid mode' });
        }else{
          healthItems.push({ level:'warn', zh:'Phone consult：尚未啟用', en:'Phone consult: Not enabled' });
        }
      }else if (cfgRes.data && cfgRes.data.serviceId){
        phoneReadyPromise = fetchSlots(cfgRes.data.serviceId, 7);
      }
      var finalizeHealth = function(){
        if (!healthItems.length){
          healthItems.push({ level:'ok', zh:'狀態正常', en:'All systems normal' });
        }
        renderHealth(healthItems);
      };
      if (phoneReadyPromise){
        phoneReadyPromise.then(function(res){
          if (!res || !res.ok){
            healthItems.push({ level:'warn', zh:'Phone consult：無法取得狀態', en:'Phone consult: Data unavailable' });
            finalizeHealth();
            return;
          }
          var itemsForReady = (res.data && (res.data.items || res.data.slots)) || [];
          var ready = calcFutureFreeSlots(itemsForReady);
          if (!ready.hasEnabled || ready.free <= 0){
            healthItems.push({ level:'warn', zh:'Phone consult：目前無可預約時段', en:'Phone consult: No available slots' });
          }else{
            healthItems.push({ level:'ok', zh:'Phone consult：可上線', en:'Phone consult: Ready' });
          }
          finalizeHealth();
        }).catch(function(){
          healthItems.push({ level:'warn', zh:'Phone consult：無法取得狀態', en:'Phone consult: Data unavailable' });
          finalizeHealth();
        });
      }else{
        finalizeHealth();
      }
      setStatus('已更新 / Updated');
    }).catch(function(){
      setStatus('資料暫時無法載入 / Data unavailable');
      slotSummary.textContent = '資料暫時無法載入';
      slotFutureList.textContent = '';
      activityList.textContent = '資料暫時無法載入';
      renderKpis([]);
      renderHealth([{ level:'err', zh:'資料暫時無法載入', en:'Data unavailable' }]);
    });
  }

  fetchAdmin().then(function(result){
    var role = String((result.data && result.data.role) || '').trim().toLowerCase();
    if (!result.ok || role !== 'owner'){
      showGuard();
      return;
    }
    showContent();
    var serviceId = readServiceId();
    if (serviceIdInput) serviceIdInput.value = serviceId || '';
    if (serviceIdInput){
      serviceIdInput.addEventListener('blur', function(){
        syncSelectWithInput();
      });
      serviceIdInput.addEventListener('keydown', function(e){
        if (e.key === 'Enter'){
          saveServiceId(serviceIdInput.value.trim());
          syncSelectWithInput();
          loadDashboard(serviceIdInput.value.trim());
        }
      });
    }
    fetchServiceList().then(function(res){
      servicesCache = res.items || [];
      setSelectOptions(servicesCache, serviceId);
      if (svcSelect){
        svcSelect.addEventListener('change', function(){
          var val = svcSelect.value;
          if (serviceIdInput) serviceIdInput.value = val;
          saveServiceId(val);
          loadDashboard(val);
        });
      }
      if (serviceId){
        syncSelectWithInput();
      }
    }).catch(function(){
      if (svcSelect) svcSelect.style.display = 'none';
    });
    if (btnLoad){
      btnLoad.addEventListener('click', function(){
        var value = serviceIdInput ? serviceIdInput.value.trim() : '';
        saveServiceId(value);
        loadDashboard(value);
      });
    }
    if (serviceId){
      loadDashboard(serviceId);
    } else {
      setStatus('請先選擇 Service / Please select a service');
      slotSummary.textContent = '資料暫時無法載入';
      slotFutureList.textContent = '';
      activityList.textContent = '資料暫時無法載入';
      renderKpis([]);
      renderHealth([{ level:'warn', zh:'請先選擇 Service', en:'Please select a service' }]);
    }
  });
})();
