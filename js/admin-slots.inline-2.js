(function(){
  var I18N = {
    zh: {
      slots_title: '時段管理',
      slots_sub: '管理可預約時段的開放狀態',
      lang_zh: '中文',
      lang_en: 'EN',
      hint_owner_booking_only: '此頁僅限 owner/booking',
      hint_kv_missing: '尚未設定 KV 綁定',
      btn_load: '載入時段',
      btn_publish: '開放選取時段',
      btn_unpublish: '取消開放',
      btn_block: '關閉選取時段',
      btn_unblock: '解除關閉',
      btn_select_all: '全選',
      btn_clear: '清除',
      label_service: '服務',
      label_range: '日期範圍',
      label_day: '日期',
      label_slots: '時段',
      label_service_auto: '已自動帶入 serviceId',
      label_service_id: 'Service ID',
      label_select: '選取',
      msg_loading: '載入中…',
      msg_done: '完成',
      msg_saved: '已儲存',
      msg_failed: '操作失敗',
      msg_no_slots: '尚無可顯示的時段。',
      msg_forbidden: '權限不足',
      msg_rate_limited: '操作太頻繁，請稍後再試',
      msg_slot_not_published: '此時段尚未開放',
      msg_slot_unavailable: '此時段不可用或已被選走',
      ph_service_id: '輸入 serviceId（例如: SVC123）',
      reschedule_title: '改期申請 / Reschedule Requests',
      reschedule_status_all: '全部',
      reschedule_status_pending: '待審核',
      reschedule_status_approved: '已核准',
      reschedule_status_rejected: '已婉拒',
      btn_reschedule_load: '載入申請',
      btn_reschedule_more: '更多',
      published_title: '已開放時段（含日期）',
      published_empty: '目前沒有已開放時段。',
      reschedule_empty: '目前沒有改期申請。',
      reschedule_note: '備註',
      reschedule_customer: '客戶',
      reschedule_slot_change: '時段',
      reschedule_current: '原時段',
      reschedule_desired: '申請改期',
      reschedule_created: '申請時間',
      reschedule_action_approve: '核准',
      reschedule_action_reject: '拒絕',
      reschedule_status_pending_badge: '待審核',
      reschedule_status_approved_badge: '已核准',
      reschedule_status_rejected_badge: '已婉拒',
      reschedule_handler: '處理人',
      reschedule_handled_at: '處理時間',
      status_free: '可預約',
      status_held: '暫鎖',
      status_booked: '已預約',
      status_blocked: '關閉',
      status_not_published: '未開放'
    },
    en: {
      slots_title: 'Slot Management',
      slots_sub: 'Manage published slots for booking',
      lang_zh: '中文',
      lang_en: 'EN',
      hint_owner_booking_only: 'This page is only for owner/booking',
      hint_kv_missing: 'KV binding is not configured',
      btn_load: 'Load slots',
      btn_publish: 'Publish selected',
      btn_unpublish: 'Unpublish selected',
      btn_block: 'Block selected',
      btn_unblock: 'Unblock selected',
      btn_select_all: 'Select all',
      btn_clear: 'Clear',
      label_service: 'Service',
      label_range: 'Date range',
      label_day: 'Date',
      label_slots: 'Slots',
      label_service_auto: 'serviceId auto-filled',
      label_service_id: 'Service ID',
      label_select: 'Select',
      msg_loading: 'Loading…',
      msg_done: 'Done',
      msg_saved: 'Saved',
      msg_failed: 'Action failed',
      msg_no_slots: 'No slots to display.',
      msg_forbidden: 'Permission denied',
      msg_rate_limited: 'Too many requests. Please try again.',
      msg_slot_not_published: 'Slot is not published',
      msg_slot_unavailable: 'Slot is unavailable',
      ph_service_id: 'Enter serviceId (e.g., SVC123)',
      reschedule_title: 'Reschedule Requests',
      reschedule_status_all: 'All',
      reschedule_status_pending: 'Pending',
      reschedule_status_approved: 'Approved',
      reschedule_status_rejected: 'Rejected',
      btn_reschedule_load: 'Load requests',
      btn_reschedule_more: 'More',
      published_title: 'Published Slots (with dates)',
      published_empty: 'No published slots.',
      reschedule_empty: 'No reschedule requests.',
      reschedule_note: 'Note',
      reschedule_customer: 'Customer',
      reschedule_slot_change: 'Slot',
      reschedule_current: 'Current slot',
      reschedule_desired: 'Requested slot',
      reschedule_created: 'Requested at',
      reschedule_action_approve: 'Approve',
      reschedule_action_reject: 'Reject',
      reschedule_status_pending_badge: 'Pending',
      reschedule_status_approved_badge: 'Approved',
      reschedule_status_rejected_badge: 'Rejected',
      reschedule_handler: 'Handled by',
      reschedule_handled_at: 'Handled at',
      status_free: 'Available',
      status_held: 'Held',
      status_booked: 'Booked',
      status_blocked: 'Blocked',
      status_not_published: 'Not published'
    }
  };
  var ADMIN_LANG = 'zh';

  function detectDefaultLang(){
    try{
      var saved = localStorage.getItem('adminLang');
      if (saved === 'zh' || saved === 'en') return saved;
    }catch(_){}
    var nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  function t(key){
    var dict = I18N[ADMIN_LANG] || I18N.zh;
    return dict[key] || I18N.zh[key] || key;
  }

  function applyI18n(){
    document.querySelectorAll('[data-i18n]').forEach(function(node){
      if (node.children && node.children.length) return;
      var key = node.getAttribute('data-i18n');
      if (key) node.textContent = t(key);
    });
    var svcInput = document.getElementById('serviceIdInput') || document.querySelector('input[name="serviceId"]');
    if (svcInput) svcInput.placeholder = t('ph_service_id');
    var svcDisplay = document.getElementById('serviceIdDisplay');
    if (svcDisplay && svcDisplay.dataset.auto === '1') svcDisplay.textContent = t('label_service_id') + ': ' + (svcDisplay.dataset.value || '');
    var svcHint = document.getElementById('serviceIdHint');
    if (svcHint && svcHint.dataset.auto === '1') svcHint.textContent = t('label_service_auto');
    var dateEl = document.getElementById('dateInput');
    if (dateEl) dateEl.setAttribute('aria-label', t('label_day'));
    var btnZh = document.getElementById('langZh');
    var btnEn = document.getElementById('langEn');
    if (btnZh) btnZh.classList.toggle('is-active', ADMIN_LANG === 'zh');
    if (btnEn) btnEn.classList.toggle('is-active', ADMIN_LANG === 'en');
  }

  function ensureServiceIdInput(){
    if (document.getElementById('serviceIdInput')) return;
    var wrap = document.querySelector('.slot-controls');
    if (!wrap) return;
    var field = document.createElement('div');
    field.className = 'slot-field';
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'serviceIdInput';
    input.name = 'serviceId';
    input.placeholder = '輸入 serviceId';
    field.appendChild(input);
    var hint = document.createElement('div');
    hint.id = 'serviceIdHint';
    hint.className = 'muted';
    hint.style.marginTop = '4px';
    field.appendChild(hint);
    wrap.insertBefore(field, wrap.firstChild);
  }

  function ensureDateInput(){
    var existing = document.getElementById('dateInput');
    var wrap = document.querySelector('.slot-controls');
    if (!wrap) return;
    if (existing){
      try{
        var rect = existing.getBoundingClientRect();
        if (rect.width < 40){
          existing.style.minWidth = '220px';
          existing.style.display = 'block';
          existing.style.visibility = 'visible';
        }
        existing.removeAttribute('min');
        existing.removeAttribute('max');
      }catch(_){}
      return;
    }
    var field = document.createElement('div');
    field.className = 'slot-field';
    var input = document.createElement('input');
    input.type = 'date';
    input.id = 'dateInput';
    input.removeAttribute('min');
    input.removeAttribute('max');
    input.setAttribute('aria-label', t('label_day'));
    field.appendChild(input);
    var btn = document.getElementById('btnLoad');
    if (btn && btn.parentNode === wrap){
      wrap.insertBefore(field, btn);
    }else{
      wrap.appendChild(field);
    }
  }

  function setLang(lang){
    ADMIN_LANG = (lang === 'en') ? 'en' : 'zh';
    try{ localStorage.setItem('adminLang', ADMIN_LANG); }catch(_){}
    applyI18n();
  }
  ADMIN_LANG = detectDefaultLang();
  ensureServiceIdInput();
  ensureDateInput();
  applyI18n();
  var guardEl = document.getElementById('slotsGuard');
  var statusEl = document.getElementById('slotStatus');
  var serviceIdInput = document.getElementById('serviceIdInput');
  var autoServiceId = '';
  var dateInput = document.getElementById('dateInput');
  var btnLoad = document.getElementById('btnLoad');
  var btnPublish = document.getElementById('btnPublish');
  var btnUnpublish = document.getElementById('btnUnpublish');
  var btnUnblock = document.getElementById('btnUnblock');
  var btnSelectAll = document.getElementById('btnSelectAll');
  var btnClearSel = document.getElementById('btnClearSel');
  var slotGrid = document.getElementById('slotGrid');
  var rescheduleStatus = document.getElementById('rescheduleStatus');
  var rescheduleList = document.getElementById('rescheduleList');
  var publishedSlots = document.getElementById('publishedSlots');
  var btnRescheduleLoad = document.getElementById('btnRescheduleLoad');
  var btnRescheduleMore = document.getElementById('btnRescheduleMore');
  var adminSlotsWarning = document.getElementById('adminSlotsWarning');
  var langZh = document.getElementById('langZh');
  var langEn = document.getElementById('langEn');
  var rescheduleCursor = '';
  var rescheduleBusy = false;

  function ensureServiceIdDisplay(){
    var wrap = document.querySelector('.slot-controls');
    if (!wrap) return null;
    var display = document.getElementById('serviceIdDisplay');
    if (display) return display;
    display = document.createElement('div');
    display.id = 'serviceIdDisplay';
    display.className = 'muted';
    display.style.fontWeight = '700';
    display.style.marginTop = '4px';
    wrap.insertBefore(display, wrap.firstChild);
    return display;
  }

  function applyServiceIdAutoFill(){
    fetch('/api/service/phone-consult/config', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok) return;
        var svcId = String(result.data.serviceId || '').trim();
        if (!svcId) return;
        autoServiceId = svcId;
        if (serviceIdInput){
          serviceIdInput.value = svcId;
          serviceIdInput.readOnly = true;
          serviceIdInput.dataset.auto = '1';
          var hint = document.getElementById('serviceIdHint');
          if (hint){
            hint.dataset.auto = '1';
            hint.textContent = t('label_service_auto');
          }
        }
        var display = ensureServiceIdDisplay();
        if (display){
          display.dataset.auto = '1';
          display.dataset.value = svcId;
          display.textContent = t('label_service_id') + ': ' + svcId;
        }
      })
      .catch(function(){});
  }

  if (langZh) langZh.addEventListener('click', function(){ setLang('zh'); });
  if (langEn) langEn.addEventListener('click', function(){ setLang('en'); });
  applyServiceIdAutoFill();

  function setStatus(msg, isError){
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = isError ? '#b91c1c' : '';
    statusEl.classList.toggle('err', !!isError);
    statusEl.classList.toggle('ok', !isError && !!msg);
  }

  function setStatusOk(msg){
    setStatus(msg, false);
  }

  function setButtonBusy(btn, busy){
    if (!btn) return;
    if (busy){
      if (!btn.dataset.label) btn.dataset.label = btn.textContent;
      btn.textContent = t('msg_loading');
      btn.disabled = true;
    }else{
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
      btn.disabled = false;
    }
  }

  function setGuard(msg){
    if (!guardEl) return;
    guardEl.textContent = msg;
    guardEl.style.display = '';
  }

  function todayStr(){
    return new Date().toISOString().split('T')[0];
  }

  function getDateValue(){
    var val = dateInput ? dateInput.value : '';
    if (!val){
      val = todayStr();
      if (dateInput) dateInput.value = val;
    }
    return val;
  }

  function fetchAdmin(){
    return fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .catch(function(){ return { ok:false, data:{} }; });
  }

  function isAllowedRole(role){
    return role === 'owner' || role === 'booking';
  }

  function renderSlots(list){
    if (!slotGrid) return;
    slotGrid.innerHTML = '';
    if (!Array.isArray(list) || !list.length){
      slotGrid.innerHTML = '<div class="muted">' + t('msg_no_slots') + '</div>';
      return;
    }
    list.forEach(function(slot){
      var status = slot.status || 'free';
      var enabled = slot.enabled === true;
      var card = document.createElement('div');
      card.className = 'slot-card';
      var time = document.createElement('div');
      time.className = 'time';
      time.textContent = slot.time || '--:--';
      var badge = document.createElement('div');
      badge.className = 'status';
      var label = '';
      if (status === 'booked'){
        badge.className += ' booked';
        label = t('status_booked');
      }else if (status === 'held'){
        badge.className += ' held';
        label = t('status_held');
      }else if (status === 'blocked'){
        badge.className += ' blocked';
        label = t('status_blocked');
      }else if (enabled){
        badge.className += ' free-enabled';
        label = t('status_free');
      }else{
        badge.className += ' free-disabled';
        label = t('status_not_published');
      }
      badge.textContent = label;
      card.appendChild(time);
      card.appendChild(badge);

      var action = '';
      if (status === 'free' && !enabled){
        action = 'publish';
      }else if (status === 'free' && enabled){
        action = 'block';
      }
      if (action){
        var labelWrap = document.createElement('label');
        labelWrap.style.display = 'inline-flex';
        labelWrap.style.alignItems = 'center';
        labelWrap.style.gap = '6px';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('data-slot-key', slot.slotKey || '');
        checkbox.setAttribute('data-action', action);
        var text = document.createElement('span');
        text.textContent = t('label_select');
        labelWrap.appendChild(checkbox);
        labelWrap.appendChild(text);
        card.appendChild(labelWrap);
      }

      slotGrid.appendChild(card);
    });
  }

  function formatSlotKey(slotKey){
    var raw = String(slotKey || '');
    var match = raw.match(/slot:[^:]+:(\d{4}-\d{2}-\d{2}):(\d{4})/);
    if (match){
      return match[1] + ' ' + match[2].slice(0,2) + ':' + match[2].slice(2);
    }
    return raw;
  }

  function renderRescheduleList(items, append){
    if (!rescheduleList) return;
    if (!append) rescheduleList.innerHTML = '';
    if (!Array.isArray(items) || !items.length){
      if (!append) rescheduleList.innerHTML = '<div class="muted">' + t('reschedule_empty') + '</div>';
      return;
    }
    items.forEach(function(item){
      var row = document.createElement('div');
      row.style.border = '1px solid rgba(15,23,42,.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px 12px';
      row.style.marginBottom = '10px';
      var status = String(item.status || 'pending');
      var statusLabel = status === 'approved'
        ? t('reschedule_status_approved_badge')
        : status === 'rejected'
          ? t('reschedule_status_rejected_badge')
          : t('reschedule_status_pending_badge');
      var header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.gap = '10px';
      var title = document.createElement('div');
      title.style.display = 'flex';
      title.style.alignItems = 'center';
      title.style.gap = '8px';
      var idText = document.createElement('div');
      idText.textContent = item.orderId || '';
      idText.style.fontWeight = '700';
      var badge = document.createElement('span');
      badge.className = 'reschedule-badge status-' + status;
      badge.textContent = statusLabel;
      title.appendChild(idText);
      title.appendChild(badge);
      var created = document.createElement('div');
      created.className = 'muted';
      created.textContent = item.createdAt || '';
      header.appendChild(title);
      header.appendChild(created);
      var detail = document.createElement('div');
      detail.style.marginTop = '8px';
      detail.innerHTML = ''
        + (item.customerName ? '<div><strong>' + t('reschedule_customer') + '：</strong>' + String(item.customerName || '') + '</div>' : '')
        + '<div><strong>' + t('reschedule_slot_change') + '：</strong>' + formatSlotKey(item.currentSlotKey || '') + ' → ' + formatSlotKey(item.desiredSlotKey || '') + '</div>'
        + (item.note ? '<div><strong>' + t('reschedule_note') + '：</strong>' + String(item.note || '') + '</div>' : '')
        + (status !== 'pending' ? '<div><strong>' + t('reschedule_handler') + '：</strong>' + String(item.approvedBy || item.rejectedBy || '—') + '</div>' : '')
        + (status !== 'pending' ? '<div><strong>' + t('reschedule_handled_at') + '：</strong>' + String(item.updatedAt || '—') + '</div>' : '');
      row.appendChild(header);
      row.appendChild(detail);
      if (status === 'pending'){
        var actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.marginTop = '8px';
        var btnApprove = document.createElement('button');
        btnApprove.className = 'btn primary';
        btnApprove.type = 'button';
        btnApprove.textContent = t('reschedule_action_approve');
        btnApprove.addEventListener('click', function(){
          if (!confirm('確定要執行【核准改期】？此動作無法復原')) return;
          if (!item.desiredSlotKey){
            setStatus(t('msg_failed'), true);
            return;
          }
          setStatus(t('msg_loading'));
          setButtonBusy(btnApprove, true);
          postAction('/api/admin/service/reschedule-approve', {
            requestId: item.id,
            orderId: item.orderId,
            newSlotKey: item.desiredSlotKey
          }).then(function(result){
            setButtonBusy(btnApprove, false);
            if (!result.ok){
              setStatus(t('msg_failed'), true);
              return;
            }
            setStatus(t('msg_saved'));
            loadReschedules(true);
          }).catch(function(){
            setButtonBusy(btnApprove, false);
            setStatus(t('msg_failed'), true);
          });
        });
        var btnReject = document.createElement('button');
        btnReject.className = 'btn';
        btnReject.type = 'button';
        btnReject.textContent = t('reschedule_action_reject');
        btnReject.addEventListener('click', function(){
          if (!confirm('確定要執行【拒絕改期】？此動作無法復原')) return;
          var reason = prompt(t('reschedule_action_reject'));
          setStatus(t('msg_loading'));
          setButtonBusy(btnReject, true);
          postAction('/api/admin/service/reschedule-reject', {
            requestId: item.id,
            orderId: item.orderId,
            reason: reason || ''
          }).then(function(result){
            setButtonBusy(btnReject, false);
            if (!result.ok){
              setStatus(t('msg_failed'), true);
              return;
            }
            setStatus(t('msg_saved'));
            loadReschedules(true);
          }).catch(function(){
            setButtonBusy(btnReject, false);
            setStatus(t('msg_failed'), true);
          });
        });
        actions.appendChild(btnApprove);
        actions.appendChild(btnReject);
        row.appendChild(actions);
      }
      rescheduleList.appendChild(row);
    });
  }

  function loadReschedules(reset){
    if (rescheduleBusy) return;
    rescheduleBusy = true;
    if (reset) rescheduleCursor = '';
    var status = rescheduleStatus ? rescheduleStatus.value : '';
    var url = '/api/admin/service/reschedule-requests?limit=20';
    if (status) url += '&status=' + encodeURIComponent(status);
    if (rescheduleCursor) url += '&cursor=' + encodeURIComponent(rescheduleCursor);
    fetch(url, { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        rescheduleBusy = false;
        if (!result.ok){
          setStatus(t('msg_failed'), true);
          return;
        }
        renderRescheduleList(result.data.items || [], !!rescheduleCursor);
        rescheduleCursor = result.data.nextCursor || '';
        if (btnRescheduleMore){
          btnRescheduleMore.style.display = rescheduleCursor ? '' : 'none';
        }
      })
      .catch(function(){
        rescheduleBusy = false;
        setStatus(t('msg_failed'), true);
      });
  }

  function collectSlotKeys(action){
    if (!slotGrid) return [];
    var nodes = slotGrid.querySelectorAll('input[type="checkbox"][data-action="'+action+'"]:checked');
    return Array.from(nodes).map(function(node){ return node.getAttribute('data-slot-key'); }).filter(Boolean);
  }

  function getSelectableSlotButtons(){
    if (!slotGrid) return [];
    var nodes = slotGrid.querySelectorAll('input[type="checkbox"][data-slot-key]:not(:disabled)');
    return Array.from(nodes);
  }

  function selectSlotButton(btn, on){
    if (!btn || btn.disabled) return;
    btn.checked = !!on;
  }

  function clearSelectedSlots(){
    if (!slotGrid) return;
    var nodes = slotGrid.querySelectorAll('input[type="checkbox"][data-slot-key]');
    Array.from(nodes).forEach(function(node){ node.checked = false; });
  }

  function getServiceIdValue(){
    var val = serviceIdInput ? serviceIdInput.value.trim() : '';
    if (val) return val;
    return autoServiceId || '';
  }

  function loadSlots(){
    var serviceId = getServiceIdValue();
    var date = getDateValue();
    if (!serviceId){
      setStatus('缺少 serviceId', true);
      return;
    }
    if (!date){
      setStatus('請選擇日期', true);
      return;
    }
    setStatus(t('msg_loading'));
    var url = '/api/service/slots?serviceId=' + encodeURIComponent(serviceId) + '&days=1&dateFrom=' + encodeURIComponent(date);
    fetch(url, { cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok){
          var err = (result.data && result.data.error) || '';
          if (result.data && result.data.error === 'slots_kv_not_configured'){
            setStatus(t('hint_kv_missing'), true);
          }else if (result.data && result.data.error === 'missing_service_id'){
            setStatus('缺少 serviceId', true);
          }else if (result.data && result.data.error === 'forbidden_role'){
            setStatus(t('msg_forbidden'), true);
          }else{
            setStatus(t('msg_failed'), true);
          }
          renderSlots([]);
          return;
        }
        var day = result.data.items && result.data.items[0];
        renderSlots(day ? day.slots : []);
        setStatus(t('msg_done') + (day && day.date ? ' ' + day.date : ''));
        loadPublishedSlots(serviceId);
      })
      .catch(function(){
        setStatus(t('msg_failed'), true);
      });
  }

  function loadPublishedSlots(serviceId){
    if (!publishedSlots) return;
    if (!serviceId){
      publishedSlots.innerHTML = '<div class="muted">' + t('published_empty') + '</div>';
      return;
    }
    publishedSlots.innerHTML = '<div class="muted">' + t('msg_loading') + '</div>';
    var url = '/api/service/slots?serviceId=' + encodeURIComponent(serviceId) + '&days=14&dateFrom=' + encodeURIComponent(todayStr());
    fetch(url, { cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok){
          publishedSlots.innerHTML = '<div class="muted">' + t('msg_failed') + '</div>';
          return;
        }
        var items = Array.isArray(result.data.items) ? result.data.items : [];
        var list = [];
        items.forEach(function(day){
          var date = day.date || '';
          (day.slots || []).forEach(function(slot){
            if (slot.enabled === true && String(slot.status || 'free') === 'free'){
              list.push({ date: date, time: slot.time || '', slotKey: slot.slotKey || '' });
            }
          });
        });
        if (!list.length){
          publishedSlots.innerHTML = '<div class="muted">' + t('published_empty') + '</div>';
          return;
        }
        publishedSlots.innerHTML = '';
        list.forEach(function(item){
          var row = document.createElement('div');
          row.className = 'published-item';
          var left = document.createElement('div');
          left.innerHTML = '<strong>' + item.date + '</strong> ' + item.time;
          var right = document.createElement('div');
          right.className = 'muted';
          right.textContent = t('status_free');
          row.appendChild(left);
          row.appendChild(right);
          publishedSlots.appendChild(row);
        });
      })
      .catch(function(){
        publishedSlots.innerHTML = '<div class="muted">' + t('msg_failed') + '</div>';
      });
  }

  function postAction(path, payload){
    return fetch(path, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify(payload)
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; });
    });
  }

  function handlePublish(){
    if (!confirm('確定要執行【開放時段】？此動作無法復原')) return;
    var slotKeys = collectSlotKeys('publish');
    if (!slotKeys.length){
      setStatus(t('msg_failed'), true);
      return;
    }
    setStatus(t('msg_loading'));
    setButtonBusy(btnPublish, true);
    postAction('/api/admin/service/slots/publish', { slotKeys: slotKeys })
      .then(function(result){
        setButtonBusy(btnPublish, false);
        if (!result.ok){
          var err = (result.data && result.data.error) || '';
          if (err === 'forbidden_role'){
            setStatus(t('msg_forbidden'), true);
          }else if (err === 'rate_limited'){
            setStatus(t('msg_rate_limited'), true);
          }else if (err === 'slots_kv_not_configured'){
            setStatus(t('hint_kv_missing'), true);
          }else{
            setStatus(t('msg_failed'), true);
          }
          return;
        }
        setStatus(t('msg_saved') + ' ' + (result.data.updated || []).length);
        loadSlots();
      })
      .catch(function(){
        setButtonBusy(btnPublish, false);
        setStatus(t('msg_failed'), true);
      });
  }

  function handleBlock(blocked){
    if (!confirm(blocked ? '確定要執行【關閉時段】？此動作無法復原' : '確定要執行【解除關閉】？此動作無法復原')) return;
    var action = blocked ? 'block' : 'unblock';
    var slotKeys = collectSlotKeys(action);
    if (!slotKeys.length){
      setStatus(t('msg_failed'), true);
      return;
    }
    setStatus(t('msg_loading'));
    if (blocked) setButtonBusy(btnUnpublish, true);
    if (!blocked) setButtonBusy(btnUnblock, true);
    postAction('/api/admin/service/slots/block', { slotKeys: slotKeys, blocked: blocked })
      .then(function(result){
        setButtonBusy(btnUnpublish, false);
        setButtonBusy(btnUnblock, false);
        if (!result.ok){
          var err = (result.data && result.data.error) || '';
          if (err === 'forbidden_role'){
            setStatus(t('msg_forbidden'), true);
          }else if (err === 'rate_limited'){
            setStatus(t('msg_rate_limited'), true);
          }else if (err === 'slots_kv_not_configured'){
            setStatus(t('hint_kv_missing'), true);
          }else{
            setStatus(t('msg_failed'), true);
          }
          return;
        }
        setStatus(t('msg_saved') + ' ' + (result.data.updated || []).length);
        loadSlots();
      })
      .catch(function(){
        setButtonBusy(btnUnpublish, false);
        setButtonBusy(btnUnblock, false);
        setStatus(t('msg_failed'), true);
      });
  }

  fetchAdmin().then(function(result){
    if (!result.ok){
      setGuard(t('hint_owner_booking_only'));
      return;
    }
    var role = String((result.data && result.data.role) || '').trim().toLowerCase();
    if (!isAllowedRole(role)){
      setGuard(t('hint_owner_booking_only'));
      return;
    }
    try{
      if (adminSlotsWarning){
        var warned = localStorage.getItem('adminSlotWarningSeen') === 'true';
        if (!warned){
          adminSlotsWarning.style.display = '';
          localStorage.setItem('adminSlotWarningSeen', 'true');
        }
      }
    }catch(_){}
    if (dateInput && !dateInput.value){
      dateInput.value = todayStr();
    }
    if (btnLoad) btnLoad.addEventListener('click', loadSlots);
    if (btnPublish) btnPublish.addEventListener('click', handlePublish);
    if (btnUnpublish) btnUnpublish.addEventListener('click', function(){ handleBlock(true); });
    if (btnSelectAll) btnSelectAll.addEventListener('click', function(){
      getSelectableSlotButtons().forEach(function(btn){
        selectSlotButton(btn, true);
      });
      setStatusOk(t('msg_done'));
    });
    if (btnClearSel) btnClearSel.addEventListener('click', function(){
      clearSelectedSlots();
      setStatusOk(t('msg_done'));
    });
    if (btnRescheduleLoad) btnRescheduleLoad.addEventListener('click', function(){ loadReschedules(true); });
    if (btnRescheduleMore) btnRescheduleMore.addEventListener('click', function(){ loadReschedules(false); });
    if (rescheduleStatus) rescheduleStatus.addEventListener('change', function(){ loadReschedules(true); });
    loadReschedules(true);
  });
})();
