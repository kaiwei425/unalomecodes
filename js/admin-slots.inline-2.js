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
      btn_unpublish: '取消選取時段',
      btn_release_booked: '解除已預約時段',
      btn_select_all: '全選',
      btn_clear: '清除',
      label_service: '服務',
      label_range: '日期範圍',
      label_day: '日期',
      label_slots: '時段',
      label_service_auto: '已自動帶入 serviceId',
      label_service_id: '服務 ID',
      label_select: '選取',
      label_release: '解除',
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
      btn_published_refresh: '重新整理已開放時段',
      published_empty: '目前沒有已開放時段。',
      consult_title: '電話算命預約 / Consult Queue',
      btn_consult_reload: '重新整理',
      consult_empty: '目前沒有待處理的電話算命預約。',
      consult_need_service: '請先選擇 serviceId。',
      consult_stage: '階段',
      consult_action_booked: '已完成預約',
      consult_action_done: '訂單完成',
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
      status_blocked: '未開放',
      status_not_published: '未開放',
      slot_tz_hint: '時段顯示：曼谷時間（UTC+7），台北時間請 +1 小時。',
      booking_mode_label: '預約模式',
      booking_mode_legacy: '原本模式（一直可預約）',
      booking_mode_windowed: '限時模式（手動開放）',
      booking_window_minutes: '開放時長（分鐘）',
      booking_publish_window: '一鍵上架 + 開放',
      booking_publish_schedule: '排程上架 + 開放',
      booking_cancel_schedule: '取消排程',
      booking_close_window: '立即關閉預約',
      booking_status_loading: '載入中…',
      booking_status_legacy: '目前為原本模式（不限制預約時間窗）',
      booking_status_active: '目前可預約：{from} - {until}（台灣時間）',
      booking_status_inactive: '目前未開放預約（上次時間窗：{from} - {until}）',
      booking_status_none: '目前未開放預約（尚未設定時間窗）',
      booking_status_unavailable: '無法取得預約設定',
      booking_confirm_publish: '確定要執行【一鍵上架 + 開放】？',
      booking_confirm_schedule: '確定要排程【上架 + 開放】？',
      booking_confirm_cancel_schedule: '確定要取消排程上架？',
      booking_confirm_switch: '目前為原本模式，是否切換為限時模式並開放？',
      booking_confirm_close: '確定要立即關閉預約？',
      booking_invalid_minutes: '請輸入開放時長（分鐘）',
      booking_invalid_publish_time: '請選擇排程時間',
      booking_publish_in_progress: '已上架，設定開放中…',
      booking_schedule_set: '已排程上架：{time}（{count} 個時段）',
      booking_schedule_none: '尚未設定排程上架',
      booking_view_schedule: '查看已排程時段',
      scheduled_list_title: '已排程時段',
      scheduled_list_empty: '目前沒有已排程時段。',
      schedule_close: '關閉',
      schedule_title: '排程開放時間',
      schedule_time_label: '預約開放時間（泰國時間，台灣時間+1）',
      schedule_time_hint: '請選擇要上架並開放預約的時間',
      schedule_confirm: '確認排程',
      schedule_cancel: '取消',
      selected_title: '已選取時段',
      selected_empty: '尚未選取時段。',
      selected_clear: '清空選取',
      selected_remove: '移除',
      selected_count: '共 {count} 個時段',
      selected_need_publish: '請先選取要上架的時段'
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
      btn_release_booked: 'Release booked slots',
      btn_select_all: 'Select all',
      btn_clear: 'Clear',
      label_service: 'Service',
      label_range: 'Date range',
      label_day: 'Date',
      label_slots: 'Slots',
      label_service_auto: 'serviceId auto-filled',
      label_service_id: 'Service ID',
      label_select: 'Select',
      label_release: 'Release',
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
      btn_published_refresh: 'Refresh published slots',
      published_empty: 'No published slots.',
      consult_title: 'Phone Consult Queue',
      btn_consult_reload: 'Refresh',
      consult_empty: 'No pending phone consult orders.',
      consult_need_service: 'Please select a serviceId first.',
      consult_stage: 'Stage',
      consult_action_booked: 'Booking confirmed',
      consult_action_done: 'Order completed',
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
      status_blocked: 'Not published',
      status_not_published: 'Not published',
      slot_tz_hint: 'Slot times are Bangkok time (UTC+7); Taipei is +1 hour.',
      booking_mode_label: 'Booking mode',
      booking_mode_legacy: 'Legacy (always open)',
      booking_mode_windowed: 'Windowed (manual open)',
      booking_window_minutes: 'Open duration (minutes)',
      booking_publish_window: 'Publish + Open',
      booking_publish_schedule: 'Schedule publish + open',
      booking_cancel_schedule: 'Cancel schedule',
      booking_close_window: 'Close booking now',
      booking_status_loading: 'Loading…',
      booking_status_legacy: 'Legacy mode (no booking window limit)',
      booking_status_active: 'Booking open: {from} - {until} (Taipei time)',
      booking_status_inactive: 'Booking closed (last window: {from} - {until})',
      booking_status_none: 'Booking closed (no window configured)',
      booking_status_unavailable: 'Unable to load booking config',
      booking_confirm_publish: 'Run "Publish + Open" now?',
      booking_confirm_schedule: 'Schedule "Publish + Open"?',
      booking_confirm_cancel_schedule: 'Cancel scheduled publish?',
      booking_confirm_switch: 'Currently in legacy mode. Switch to windowed and open now?',
      booking_confirm_close: 'Close booking immediately?',
      booking_invalid_minutes: 'Please enter open duration (minutes)',
      booking_invalid_publish_time: 'Please choose a schedule time',
      booking_publish_in_progress: 'Published. Opening window...',
      booking_schedule_set: 'Scheduled: {time} ({count} slots)',
      booking_schedule_none: 'No scheduled publish',
      booking_view_schedule: 'View scheduled slots',
      scheduled_list_title: 'Scheduled slots',
      scheduled_list_empty: 'No scheduled slots.',
      schedule_close: 'Close',
      schedule_title: 'Schedule publish time',
      schedule_time_label: 'Publish time (Bangkok time, Taipei +1)',
      schedule_time_hint: 'Choose when to publish and open booking',
      schedule_confirm: 'Confirm',
      schedule_cancel: 'Cancel',
      selected_title: 'Selected slots',
      selected_empty: 'No slots selected.',
      selected_clear: 'Clear selection',
      selected_remove: 'Remove',
      selected_count: '{count} slots selected',
      selected_need_publish: 'Please select slots to publish'
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
      var key = node.getAttribute('data-i18n');
      if (!key) return;
      var next = t(key);
      if (next && next !== key) node.textContent = next;
    });
    if (schedulePublishAtInput){
      schedulePublishAtInput.setAttribute('lang', ADMIN_LANG === 'en' ? 'en' : 'zh-TW');
    }
    var consultTitle = document.querySelector('[data-i18n="consult_title"]');
    if (consultTitle) consultTitle.textContent = t('consult_title');
    var consultReload = document.getElementById('btnConsultReload');
    if (consultReload) consultReload.textContent = t('btn_consult_reload');
    var svcInput = document.getElementById('serviceIdInput') || document.querySelector('input[name="serviceId"]');
    if (svcInput) svcInput.placeholder = t('ph_service_id');
    var svcDisplay = document.getElementById('serviceIdDisplay');
    if (svcDisplay && svcDisplay.dataset.auto === '1') svcDisplay.textContent = t('label_service_id') + ': ' + (svcDisplay.dataset.value || '');
    var svcHint = document.getElementById('serviceIdHint');
    if (svcHint && svcHint.dataset.auto === '1') svcHint.textContent = t('label_service_auto');
    var btnZh = document.getElementById('langZh');
    var btnEn = document.getElementById('langEn');
    if (btnZh) btnZh.classList.toggle('is-active', ADMIN_LANG === 'zh');
    if (btnEn) btnEn.classList.toggle('is-active', ADMIN_LANG === 'en');
    renderBookingWindowStatus();
    renderBookingScheduleStatus();
    renderSelectedSlots();
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

  function ensureDateInput(){ return; }

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
  var slotDateLabel = document.getElementById('slotDateLabel');
  var slotPrevDay = document.getElementById('slotPrevDay');
  var slotNextDay = document.getElementById('slotNextDay');
  var slotTzHint = document.getElementById('slotTzHint');
  var btnPublish = document.getElementById('btnPublish');
  var btnUnpublish = document.getElementById('btnUnpublish');
  var btnReleaseBooked = document.getElementById('btnReleaseBooked');
  var btnPublishedRefresh = document.getElementById('btnPublishedRefresh');
  var btnSelectAll = document.getElementById('btnSelectAll');
  var btnClearSel = document.getElementById('btnClearSel');
  var slotGrid = document.getElementById('slotGrid');
  var publishedSlots = document.getElementById('publishedSlots');
  var consultList = document.getElementById('consultList');
  var btnConsultReload = document.getElementById('btnConsultReload');
  var adminSlotsWarning = document.getElementById('adminSlotsWarning');
  var langZh = document.getElementById('langZh');
  var langEn = document.getElementById('langEn');
  var bookingModeBtns = Array.from(document.querySelectorAll('.booking-mode-toggle .mode-btn'));
  var bookingWindowMinutes = document.getElementById('bookingWindowMinutes');
  var bookingWindowStatus = document.getElementById('bookingWindowStatus');
  var btnPublishWindow = document.getElementById('btnPublishWindow');
  var bookingScheduleStatus = document.getElementById('bookingScheduleStatus');
  var btnViewScheduled = document.getElementById('btnViewScheduled');
  var btnPublishSchedule = document.getElementById('btnPublishSchedule');
  var btnCancelSchedule = document.getElementById('btnCancelSchedule');
  var btnCloseWindow = document.getElementById('btnCloseWindow');
  var selectedSlotsList = document.getElementById('selectedSlotsList');
  var selectedSlotsCount = document.getElementById('selectedSlotsCount');
  var btnClearSelectedAll = document.getElementById('btnClearSelectedAll');
  var slotBookingControls = document.querySelector('.slot-booking-controls');
  var scheduleDialog = document.getElementById('scheduleDialog');
  var schedulePublishAtInput = document.getElementById('schedulePublishAtInput');
  var scheduleConfirmBtn = document.getElementById('scheduleConfirm');
  var scheduleCancelBtn = document.getElementById('scheduleCancel');
  var scheduleListDialog = document.getElementById('scheduleListDialog');
  var scheduleListContent = document.getElementById('scheduleListContent');
  var scheduleListClose = document.getElementById('scheduleListClose');
  var currentSlotConfig = { bookingMode:'legacy', publishWindow:null, publishSchedule:null };
  var selectedSlotKeys = new Set();
  var selectedSlotMeta = new Map();
  var selectedServiceId = '';
  var scheduleContext = null;

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
    return fetch('/api/service/phone-consult/config', { credentials:'include', cache:'no-store' })
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
        loadPublishedSlots(svcId);
        autoLoadTodayIfReady();
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

  function formatTaipeiTime(ts){
    if (!ts) return '';
    try{
      return new Date(ts).toLocaleString('zh-TW', { timeZone:'Asia/Taipei', hour12:false });
    }catch(_){
      return new Date(ts).toLocaleString('zh-TW', { hour12:false });
    }
  }

  function formatBangkokTime(ts){
    if (!ts) return '';
    try{
      return new Date(ts).toLocaleString('zh-TW', { timeZone:'Asia/Bangkok', hour12:false });
    }catch(_){
      return new Date(ts).toLocaleString('zh-TW', { hour12:false });
    }
  }

  function formatBangkokDateTimeLocal(ts){
    var date = ts ? new Date(ts) : new Date();
    try{
      var fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone:'Asia/Bangkok',
        year:'numeric',
        month:'2-digit',
        day:'2-digit',
        hour:'2-digit',
        minute:'2-digit',
        hour12:false
      });
      var parts = fmt.formatToParts(date);
      var pick = function(type){
        var found = parts.find(function(p){ return p.type === type; });
        return found ? found.value : '';
      };
      var yy = pick('year');
      var mm = pick('month');
      var dd = pick('day');
      var hh = pick('hour');
      var mi = pick('minute');
      if (yy && mm && dd && hh && mi) return yy + '-' + mm + '-' + dd + 'T' + hh + ':' + mi;
    }catch(_){}
    var fallback = new Date(date.getTime());
    var yyf = fallback.getFullYear();
    var mmf = String(fallback.getMonth() + 1).padStart(2,'0');
    var ddf = String(fallback.getDate()).padStart(2,'0');
    var hhf = String(fallback.getHours()).padStart(2,'0');
    var mif = String(fallback.getMinutes()).padStart(2,'0');
    return yyf + '-' + mmf + '-' + ddf + 'T' + hhf + ':' + mif;
  }

  function setScheduleChipState(state){
    if (!bookingScheduleStatus) return;
    bookingScheduleStatus.classList.remove('is-active', 'is-inactive', 'is-none');
    if (state) bookingScheduleStatus.classList.add(state);
  }

  function setWindowChipState(state){
    if (!bookingWindowStatus) return;
    bookingWindowStatus.classList.remove('is-active', 'is-inactive', 'is-none');
    if (state) bookingWindowStatus.classList.add(state);
  }

  function renderBookingWindowStatus(){
    if (!bookingWindowStatus) return;
    var mode = (currentSlotConfig && currentSlotConfig.bookingMode) ? currentSlotConfig.bookingMode : 'legacy';
    if (mode !== 'windowed'){
      bookingWindowStatus.textContent = t('booking_status_legacy');
      setWindowChipState('is-none');
      return;
    }
    var win = currentSlotConfig && currentSlotConfig.publishWindow ? currentSlotConfig.publishWindow : null;
    if (!win || !win.openFrom || !win.openUntil){
      bookingWindowStatus.textContent = t('booking_status_none');
      setWindowChipState('is-none');
      return;
    }
    var now = Date.now();
    var openFrom = Number(win.openFrom || 0);
    var openUntil = Number(win.openUntil || 0);
    var active = now >= openFrom && now < openUntil;
    var fromText = formatTaipeiTime(openFrom);
    var untilText = formatTaipeiTime(openUntil);
    if (active){
      bookingWindowStatus.textContent = t('booking_status_active').replace('{from}', fromText).replace('{until}', untilText);
      setWindowChipState('is-active');
    }else{
      bookingWindowStatus.textContent = t('booking_status_inactive').replace('{from}', fromText).replace('{until}', untilText);
      setWindowChipState('is-inactive');
    }
  }

  function renderBookingScheduleStatus(){
    if (!bookingScheduleStatus) return;
    var schedule = currentSlotConfig && currentSlotConfig.publishSchedule ? currentSlotConfig.publishSchedule : null;
    if (!schedule || !schedule.publishAt){
      bookingScheduleStatus.textContent = t('booking_schedule_none');
      setScheduleChipState('is-none');
      if (btnViewScheduled) btnViewScheduled.style.display = 'none';
      return;
    }
    var timeText = formatBangkokTime(schedule.publishAt);
    var count = Array.isArray(schedule.slotKeys) ? schedule.slotKeys.length : Number(schedule.slotCount || 0);
    bookingScheduleStatus.textContent = t('booking_schedule_set')
      .replace('{time}', timeText)
      .replace('{count}', String(count || 0));
    setScheduleChipState(Date.now() < Number(schedule.publishAt || 0) ? 'is-inactive' : 'is-active');
    if (btnViewScheduled) btnViewScheduled.style.display = '';
  }

  function getSelectionStorageKey(serviceId){
    return 'adminSlotSelection:' + String(serviceId || '');
  }

  function loadSelection(serviceId){
    selectedSlotKeys.clear();
    selectedSlotMeta.clear();
    if (!serviceId) return;
    try{
      var raw = localStorage.getItem(getSelectionStorageKey(serviceId));
      if (!raw) return;
      var list = JSON.parse(raw);
      if (Array.isArray(list)){
        list.forEach(function(key){
          var slotKey = String(key || '').trim();
          if (slotKey) selectedSlotKeys.add(slotKey);
        });
      }
    }catch(_){}
  }

  function saveSelection(serviceId){
    if (!serviceId) return;
    try{
      localStorage.setItem(getSelectionStorageKey(serviceId), JSON.stringify(Array.from(selectedSlotKeys)));
    }catch(_){}
  }

  function ensureSelectionForService(serviceId){
    var next = String(serviceId || '').trim();
    if (!next || next === selectedServiceId) return;
    selectedServiceId = next;
    loadSelection(next);
    renderSelectedSlots();
  }

  function formatSlotKeyLabel(slotKey){
    return formatSlotKey(slotKey);
  }

  function renderSelectedSlots(){
    if (!selectedSlotsList) return;
    var list = Array.from(selectedSlotKeys);
    if (selectedSlotsCount){
      selectedSlotsCount.textContent = t('selected_count').replace('{count}', String(list.length));
    }
    if (!list.length){
      selectedSlotsList.textContent = t('selected_empty');
      return;
    }
    list.sort(function(a,b){
      return String(a).localeCompare(String(b));
    });
    selectedSlotsList.innerHTML = '';
    list.forEach(function(slotKey){
      var row = document.createElement('div');
      row.className = 'slot-selected-item';
      var label = document.createElement('div');
      label.textContent = formatSlotKeyLabel(slotKey);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = t('selected_remove');
      btn.setAttribute('data-slot-key', slotKey);
      row.appendChild(label);
      row.appendChild(btn);
      selectedSlotsList.appendChild(row);
    });
  }

  function updateSelection(slotKey, checked){
    if (!slotKey) return;
    if (checked){
      selectedSlotKeys.add(slotKey);
    }else{
      selectedSlotKeys.delete(slotKey);
    }
    saveSelection(selectedServiceId);
    renderSelectedSlots();
  }

  function bindSelectionRowActions(){
    if (!selectedSlotsList || selectedSlotsList.__bound) return;
    selectedSlotsList.__bound = true;
    selectedSlotsList.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-slot-key]');
      if (!btn) return;
      var slotKey = btn.getAttribute('data-slot-key');
      if (!slotKey) return;
      updateSelection(slotKey, false);
      if (slotGrid){
        var checkbox = slotGrid.querySelector('input[type="checkbox"][data-slot-key="' + slotKey + '"]');
        if (checkbox) checkbox.checked = false;
      }
    });
  }

  function clearSelectedAll(){
    selectedSlotKeys.clear();
    saveSelection(selectedServiceId);
    renderSelectedSlots();
    if (slotGrid){
      var nodes = slotGrid.querySelectorAll('input[type="checkbox"][data-action="publish"]');
      nodes.forEach(function(node){ node.checked = false; });
    }
  }

  function setBookingModeUI(mode){
    var next = mode === 'windowed' ? 'windowed' : 'legacy';
    bookingModeBtns.forEach(function(btn){
      btn.classList.toggle('is-active', btn.dataset.mode === next);
    });
    if (slotBookingControls){
      slotBookingControls.classList.toggle('is-windowed', next === 'windowed');
      slotBookingControls.classList.toggle('is-legacy', next !== 'windowed');
    }
    document.body.classList.toggle('is-windowed-mode', next === 'windowed');
  }

  function loadSlotConfig(serviceId){
    if (!serviceId) return;
    ensureSelectionForService(serviceId);
    if (bookingWindowStatus) bookingWindowStatus.textContent = t('booking_status_loading');
    fetch('/api/admin/service/slots/config?serviceId=' + encodeURIComponent(serviceId), { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok){
          currentSlotConfig = { bookingMode:'legacy', publishWindow:null, publishSchedule:null };
          if (bookingWindowStatus) bookingWindowStatus.textContent = t('booking_status_unavailable');
          if (bookingScheduleStatus) bookingScheduleStatus.textContent = t('booking_schedule_none');
          return;
        }
        currentSlotConfig = result.data || { bookingMode:'legacy', publishWindow:null, publishSchedule:null };
        setBookingModeUI(currentSlotConfig.bookingMode || 'legacy');
        renderBookingWindowStatus();
        renderBookingScheduleStatus();
      })
      .catch(function(){
        currentSlotConfig = { bookingMode:'legacy', publishWindow:null, publishSchedule:null };
        if (bookingWindowStatus) bookingWindowStatus.textContent = t('booking_status_unavailable');
        if (bookingScheduleStatus) bookingScheduleStatus.textContent = t('booking_schedule_none');
      });
  }

  function autoLoadTodayIfReady(){
    var serviceId = getServiceIdValue();
    if (!serviceId) return;
    var today = todayStr();
    setCurrentDate(today);
    loadSlots(today);
    loadSlotConfig(serviceId);
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

  var currentDate = '';
  var todayISO = '';
  var PUBLISHED_CACHE_KEY = 'adminSlotsPublishedCache';
  var DEBUG_DATE_NAV = false;

  function todayStr(){
    var d = new Date();
    var yy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yy + '-' + mm + '-' + dd;
  }

  function setDateLabel(dateStr){
    if (!slotDateLabel) return;
    slotDateLabel.textContent = dateStr || '—';
    slotDateLabel.dataset.date = dateStr || '';
  }

  function clampToToday(dateStr){
    if (!todayISO) todayISO = todayStr();
    return dateStr < todayISO ? todayISO : dateStr;
  }

  function setCurrentDate(dateStr){
    const next = clampToToday(dateStr || todayStr());
    if (currentDate !== next){
      currentDate = next;
    }
    setDateLabel(currentDate);
  }

  function initDateNav(){
    todayISO = todayStr();
    if (!currentDate) setCurrentDate(todayISO);
    setTzHint();
  }

  function bindDateNav(){
    if (slotPrevDay && !slotPrevDay.__bound){
      slotPrevDay.__bound = true;
      slotPrevDay.type = 'button';
      slotPrevDay.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        var next = addDays(getDateValue(), -1);
        if (DEBUG_DATE_NAV){
          console.log('[slots][prev]', { from: getDateValue(), next: next });
        }
        setCurrentDate(next);
        loadSlots(next);
      });
    }
    if (slotNextDay && !slotNextDay.__bound){
      slotNextDay.__bound = true;
      slotNextDay.type = 'button';
      slotNextDay.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        var next = addDays(getDateValue(), 1);
        if (DEBUG_DATE_NAV){
          console.log('[slots][next]', { from: getDateValue(), next: next });
        }
        setCurrentDate(next);
        loadSlots(next);
      });
    }
  }

  function addDays(dateStr, delta){
    var raw = String(dateStr || '');
    var match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (DEBUG_DATE_NAV){
      console.log('[slots][addDays]', { raw: raw, delta: delta });
    }
    if (!match) return todayStr();
    var y = Number(match[1]);
    var m = Number(match[2]);
    var d = Number(match[3]);
    if (!y || !m || !d) return todayStr();
    var baseMs = Date.UTC(y, m - 1, d);
    if (!Number.isFinite(baseMs)) return todayStr();
    var next = new Date(baseMs + Number(delta || 0) * 86400000);
    return next.toISOString().slice(0, 10);
  }

  function setTzHint(){
    if (!slotTzHint) return;
    slotTzHint.textContent = t('slot_tz_hint');
  }

  function getDateValue(){
    if (slotDateLabel && slotDateLabel.dataset.date){
      return slotDateLabel.dataset.date;
    }
    if (!currentDate) setCurrentDate(todayStr());
    return currentDate;
  }

  function renderPublishedList(list){
    if (!publishedSlots) return;
    if (!Array.isArray(list) || !list.length){
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
  }

  function loadPublishedCache(){
    try{
      var raw = localStorage.getItem(PUBLISHED_CACHE_KEY);
      if (!raw) raw = sessionStorage.getItem(PUBLISHED_CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    }catch(_){
      return null;
    }
  }

  function savePublishedCache(list){
    try{
      localStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify(list || []));
      sessionStorage.setItem(PUBLISHED_CACHE_KEY, JSON.stringify(list || []));
    }catch(_){}
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
        badge.className += ' free-disabled';
        label = t('status_not_published');
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
      if (status === 'booked'){
        action = 'release';
      }else if (status === 'free' && !enabled){
        action = 'publish';
      }else if (status === 'free' && enabled){
        action = 'block';
      }else if (status === 'blocked'){
        action = 'publish';
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
        if (action === 'publish'){
          var slotKey = String(slot.slotKey || '');
          if (selectedSlotKeys.has(slotKey)) checkbox.checked = true;
          if (!checkbox.__bound){
            checkbox.__bound = true;
            checkbox.addEventListener('change', function(){
              updateSelection(slotKey, checkbox.checked);
            });
          }
        }
        var text = document.createElement('span');
        text.textContent = action === 'release' ? t('label_release') : t('label_select');
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

  var CONSULT_STAGE_LABELS = {
    payment_pending: '訂單成立待確認付款 / Payment pending confirmation',
    payment_confirmed: '已確認付款，預約中 / Payment confirmed, scheduling',
    appointment_confirmed: '已完成預約 / Booking confirmed',
    done: '已完成訂單 / Order completed'
  };

  function isPhoneConsultOrder(order){
    if (!order) return false;
    if (order.consultStage) return true;
    var name = String(order.serviceName || '').toLowerCase();
    return /phone|電話|consult|占卜|算命/.test(name);
  }

  function consultStageLabel(stage){
    var key = String(stage || '').trim().toLowerCase();
    return CONSULT_STAGE_LABELS[key] || stage || '';
  }

  function renderConsultList(items){
    if (!consultList) return;
    if (!items.length){
      consultList.innerHTML = '<div class="muted">' + t('consult_empty') + '</div>';
      return;
    }
    consultList.innerHTML = items.map(function(o){
      var stage = String(o.consultStage || '').trim().toLowerCase();
      var slotStart = String(o.slotStart || o.requestDate || '').trim();
      var name = (o.buyer && o.buyer.name) ? o.buyer.name : '';
      var phone = (o.buyer && o.buyer.phone) ? o.buyer.phone : '';
      var meta = [name, phone].filter(Boolean).join('｜');
      var canBooked = stage === 'payment_confirmed';
      var canDone = stage === 'appointment_confirmed';
      return (
        '<div class="slot-row" data-id="' + (o.id || '') + '">' +
          '<div class="slot-row-main">' +
            '<div><strong>#' + (o.id || '') + '</strong></div>' +
            '<div class="muted">' + (meta || '—') + '</div>' +
            '<div class="muted">' + t('consult_stage') + '：' + consultStageLabel(stage) + '</div>' +
            '<div class="muted">' + (slotStart || '—') + '</div>' +
          '</div>' +
          '<div class="slot-row-actions">' +
            '<button class="btn" data-act="consult-booked" data-id="' + (o.id || '') + '"' + (canBooked ? '' : ' disabled') + '>' + t('consult_action_booked') + '</button>' +
            '<button class="btn" data-act="consult-done" data-id="' + (o.id || '') + '"' + (canDone ? '' : ' disabled') + '>' + t('consult_action_done') + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function loadConsultQueue(){
    if (!consultList) return;
    var serviceId = getServiceIdValue();
    if (!serviceId){
      consultList.innerHTML = '<div class="muted">' + t('consult_need_service') + '</div>';
      return;
    }
    consultList.innerHTML = '<div class="muted">' + t('msg_loading') + '</div>';
    fetch('/api/service/orders?limit=200', { credentials:'include', cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok){
          consultList.innerHTML = '<div class="muted">' + t('msg_failed') + '</div>';
          return;
        }
        var items = Array.isArray(result.data.items) ? result.data.items : [];
        var filtered = items.filter(function(o){
          if (!o) return false;
          if (o.serviceId && o.serviceId !== serviceId) return false;
          return isPhoneConsultOrder(o) && o.consultStage;
        });
        renderConsultList(filtered);
      })
      .catch(function(){
        consultList.innerHTML = '<div class="muted">' + t('msg_failed') + '</div>';
      });
  }

  function updateConsultStage(id, stage, btn){
    if (!id || !stage) return;
    if (btn) setButtonBusy(btn, true);
    fetch('/api/admin/service/consult-stage', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify({ id: id, consultStage: stage })
    })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok){
          setStatus(t('msg_failed'), true);
          return;
        }
        setStatus(t('msg_saved'));
        loadConsultQueue();
      })
      .catch(function(){
        setStatus(t('msg_failed'), true);
      })
      .finally(function(){
        if (btn) setButtonBusy(btn, false);
      });
  }

  function collectSlotKeys(action){
    if (action === 'publish'){
      return Array.from(selectedSlotKeys).filter(Boolean);
    }
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

  function clearSelectionAfterPublish(){
    selectedSlotKeys.clear();
    saveSelection(selectedServiceId);
    renderSelectedSlots();
    if (slotGrid){
      var nodes = slotGrid.querySelectorAll('input[type="checkbox"][data-action="publish"]');
      nodes.forEach(function(node){ node.checked = false; });
    }
  }

  function getServiceIdValue(){
    var val = serviceIdInput ? serviceIdInput.value.trim() : '';
    if (val) return val;
    return autoServiceId || '';
  }

  function loadSlots(dateOverride){
    var serviceId = getServiceIdValue();
    var date = dateOverride || getDateValue();
    if (!serviceId){
      setStatus('缺少 serviceId', true);
      return;
    }
    ensureSelectionForService(serviceId);
    if (!date){
      setStatus('請選擇日期', true);
      return;
    }
    setStatus(t('msg_loading'));
    var url = '/api/service/slots?serviceId=' + encodeURIComponent(serviceId) + '&days=1&dateFrom=' + encodeURIComponent(date);
    if (DEBUG_DATE_NAV){
      console.log('[slots][load]', { date: date, url: url });
    }
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
        var shownDate = (day && day.date) ? day.date : date;
        if (shownDate) setCurrentDate(shownDate);
        renderSlots(day ? day.slots : []);
        setStatus('已更新');
        setTimeout(function(){ setStatus(''); }, 1800);
        loadPublishedSlots(serviceId);
        loadConsultQueue();
        loadSlotConfig(serviceId);
      })
      .catch(function(){
        setStatus(t('msg_failed'), true);
      });
  }

  function loadPublishedSlots(serviceId, done){
    if (!publishedSlots) return;
    if (!serviceId){
      publishedSlots.innerHTML = '<div class="muted">' + t('published_empty') + '</div>';
      if (typeof done === 'function') done();
      return;
    }
    var cached = loadPublishedCache();
    if (cached !== null){
      if (cached.length){
        renderPublishedList(cached);
      }else{
        publishedSlots.innerHTML = '<div class="muted">' + t('published_empty') + '</div>';
      }
    }else{
      publishedSlots.innerHTML = '<div class="muted">' + t('msg_loading') + '</div>';
    }
    var url = '/api/service/slots?serviceId=' + encodeURIComponent(serviceId) + '&days=14&dateFrom=' + encodeURIComponent(todayStr());
    if (DEBUG_DATE_NAV){
      console.log('[slots][published-load]', { url: url });
    }
    fetch(url, { cache:'no-store' })
      .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
      .then(function(result){
        if (!result.ok){
          publishedSlots.innerHTML = '<div class="muted">' + t('msg_failed') + '</div>';
          if (typeof done === 'function') done();
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
          savePublishedCache([]);
          if (typeof done === 'function') done();
          return;
        }
        savePublishedCache(list);
        renderPublishedList(list);
        if (typeof done === 'function') done();
      })
      .catch(function(){
        publishedSlots.innerHTML = '<div class="muted">' + t('msg_failed') + '</div>';
        if (typeof done === 'function') done();
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
        clearSelectionAfterPublish();
        loadSlots();
      })
      .catch(function(){
        setButtonBusy(btnPublish, false);
        setStatus(t('msg_failed'), true);
      });
  }

  function updateSlotConfig(payload, onDone){
    postAction('/api/admin/service/slots/config', payload)
      .then(function(result){
        if (!result.ok){
          setStatus(t('msg_failed'), true);
          if (typeof onDone === 'function') onDone(false);
          return;
        }
        currentSlotConfig = result.data || currentSlotConfig;
        setBookingModeUI(currentSlotConfig.bookingMode || 'legacy');
        renderBookingWindowStatus();
        if (typeof onDone === 'function') onDone(true);
      })
      .catch(function(){
        setStatus(t('msg_failed'), true);
        if (typeof onDone === 'function') onDone(false);
      });
  }

  function handlePublishWithWindow(){
    if (!btnPublishWindow) return;
    var slotKeys = collectSlotKeys('publish');
    if (!slotKeys.length){
      setStatus(t('msg_failed'), true);
      return;
    }
    if (!confirm(t('booking_confirm_publish'))) return;
    var serviceId = getServiceIdValue();
    var minutes = Number(bookingWindowMinutes && bookingWindowMinutes.value || 0);
    if (!Number.isFinite(minutes) || minutes <= 0){
      setStatus(t('booking_invalid_minutes'), true);
      return;
    }
    var nextMode = (bookingModeBtns || []).find(function(btn){ return btn.classList.contains('is-active'); });
    nextMode = nextMode ? nextMode.dataset.mode : 'legacy';
    if (nextMode !== 'windowed'){
      var confirmSwitch = confirm(t('booking_confirm_switch'));
      if (!confirmSwitch) return;
      nextMode = 'windowed';
    }
    setStatus(t('msg_loading'));
    setButtonBusy(btnPublishWindow, true);
    postAction('/api/admin/service/slots/publish', { slotKeys: slotKeys })
      .then(function(result){
        if (!result.ok){
          setButtonBusy(btnPublishWindow, false);
          setStatus(t('msg_failed'), true);
          return;
        }
        setStatus(t('booking_publish_in_progress'));
        updateSlotConfig({ serviceId: serviceId, bookingMode: nextMode, openWindowMinutes: minutes, slotKeys: slotKeys }, function(){
          setButtonBusy(btnPublishWindow, false);
          clearSelectionAfterPublish();
          loadSlots();
        });
      })
      .catch(function(){
        setButtonBusy(btnPublishWindow, false);
        setStatus(t('msg_failed'), true);
      });
  }

  function parsePublishAtInput(raw){
    var input = String(raw || '').trim();
    if (!input) return 0;
    var match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match){
      var direct = Date.parse(input);
      return Number.isNaN(direct) ? 0 : direct;
    }
    var y = Number(match[1]);
    var m = Number(match[2]);
    var d = Number(match[3]);
    var hh = Number(match[4]);
    var mm = Number(match[5]);
    if (!y || !m || !d || !Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
    return Date.UTC(y, m - 1, d, hh - 7, mm);
  }

  function handlePublishSchedule(){
    if (!btnPublishSchedule) return;
    var slotKeys = collectSlotKeys('publish');
    if (!slotKeys.length){
      setStatus(t('selected_need_publish'), true);
      if (selectedSlotsList && selectedSlotsList.scrollIntoView){
        selectedSlotsList.scrollIntoView({ behavior:'smooth', block:'center' });
      }
      return;
    }
    var serviceId = getServiceIdValue();
    var minutes = Number(bookingWindowMinutes && bookingWindowMinutes.value || 0);
    if (!Number.isFinite(minutes) || minutes <= 0){
      setStatus(t('booking_invalid_minutes'), true);
      return;
    }
    scheduleContext = { serviceId: serviceId, slotKeys: slotKeys, minutes: minutes };
    if (schedulePublishAtInput){
      schedulePublishAtInput.value = formatBangkokDateTimeLocal(Date.now());
    }
    if (scheduleDialog && typeof scheduleDialog.showModal === 'function'){
      scheduleDialog.showModal();
    }else if (scheduleDialog){
      scheduleDialog.setAttribute('open', '');
    }
  }

  function handleCancelSchedule(){
    if (!btnCancelSchedule) return;
    var serviceId = getServiceIdValue();
    if (!serviceId) return;
    if (!confirm(t('booking_confirm_cancel_schedule'))) return;
    setStatus(t('msg_loading'));
    setButtonBusy(btnCancelSchedule, true);
    postAction('/api/admin/service/slots/publish-schedule/cancel', { serviceId: serviceId })
      .then(function(result){
        setButtonBusy(btnCancelSchedule, false);
        if (!result.ok){
          setStatus(t('msg_failed'), true);
          return;
        }
        setStatus(t('msg_saved'));
        loadSlotConfig(serviceId);
      })
      .catch(function(){
        setButtonBusy(btnCancelSchedule, false);
        setStatus(t('msg_failed'), true);
      });
  }

  function closeScheduleDialog(){
    if (!scheduleDialog) return;
    if (typeof scheduleDialog.close === 'function'){
      scheduleDialog.close();
    }else{
      scheduleDialog.removeAttribute('open');
    }
    scheduleContext = null;
  }

  function openScheduleListDialog(){
    if (!scheduleListDialog || !scheduleListContent) return;
    var schedule = currentSlotConfig && currentSlotConfig.publishSchedule ? currentSlotConfig.publishSchedule : null;
    if (!schedule || !Array.isArray(schedule.slotKeys) || !schedule.slotKeys.length){
      scheduleListContent.textContent = t('scheduled_list_empty');
    }else{
      var list = schedule.slotKeys.slice().sort(function(a,b){
        return String(a).localeCompare(String(b));
      });
      scheduleListContent.innerHTML = '';
      list.forEach(function(slotKey){
        var row = document.createElement('div');
        row.className = 'schedule-list-item';
        row.textContent = formatSlotKey(slotKey);
        scheduleListContent.appendChild(row);
      });
    }
    if (typeof scheduleListDialog.showModal === 'function'){
      scheduleListDialog.showModal();
    }else{
      scheduleListDialog.setAttribute('open', '');
    }
  }

  function closeScheduleListDialog(){
    if (!scheduleListDialog) return;
    if (typeof scheduleListDialog.close === 'function'){
      scheduleListDialog.close();
    }else{
      scheduleListDialog.removeAttribute('open');
    }
  }

  function confirmScheduleDialog(){
    if (!scheduleContext) return;
    var raw = String(schedulePublishAtInput && schedulePublishAtInput.value || '').trim();
    var publishAt = parsePublishAtInput(raw);
    if (!publishAt){
      setStatus(t('booking_invalid_publish_time'), true);
      return;
    }
    if (!confirm(t('booking_confirm_schedule'))) return;
    var nextMode = (bookingModeBtns || []).find(function(btn){ return btn.classList.contains('is-active'); });
    nextMode = nextMode ? nextMode.dataset.mode : 'legacy';
    if (nextMode !== 'windowed'){
      var confirmSwitch = confirm(t('booking_confirm_switch'));
      if (!confirmSwitch) return;
      nextMode = 'windowed';
    }
    setStatus(t('msg_loading'));
    setButtonBusy(btnPublishSchedule, true);
    postAction('/api/admin/service/slots/publish-schedule', {
      serviceId: scheduleContext.serviceId,
      slotKeys: scheduleContext.slotKeys,
      publishAt: publishAt,
      openWindowMinutes: scheduleContext.minutes
    })
      .then(function(result){
        if (!result.ok){
          setButtonBusy(btnPublishSchedule, false);
          setStatus(t('msg_failed'), true);
          return;
        }
        var scheduleText = result.data && result.data.publishAt ? formatBangkokTime(result.data.publishAt) : '';
        if (result.data && result.data.executed){
          setStatus(t('booking_publish_in_progress'));
        }else if (scheduleText){
          setStatus(t('booking_schedule_set').replace('{time}', scheduleText).replace('{count}', String(scheduleContext.slotKeys.length)));
        }else{
          setStatus(t('msg_saved'));
        }
        var finish = function(){
          setButtonBusy(btnPublishSchedule, false);
          clearSelectionAfterPublish();
          loadSlotConfig(scheduleContext.serviceId);
          loadSlots();
        };
        if (nextMode !== (currentSlotConfig && currentSlotConfig.bookingMode)){
          updateSlotConfig({ serviceId: scheduleContext.serviceId, bookingMode: nextMode }, finish);
          return;
        }
        finish();
      })
      .catch(function(){
        setButtonBusy(btnPublishSchedule, false);
        setStatus(t('msg_failed'), true);
      })
      .finally(function(){
        closeScheduleDialog();
      });
  }

  function handleCloseWindow(){
    var serviceId = getServiceIdValue();
    if (!serviceId) return;
    if (!confirm(t('booking_confirm_close'))) return;
    setStatus(t('msg_loading'));
    setButtonBusy(btnCloseWindow, true);
    updateSlotConfig({ serviceId: serviceId, closeWindow: true }, function(){
      setButtonBusy(btnCloseWindow, false);
      loadSlots();
    });
  }

  function handleBlock(blocked){
    if (!confirm(blocked ? '確定要執行【取消選取時段】？此動作無法復原' : '確定要執行【重新開放】？此動作無法復原')) return;
    var action = blocked ? 'block' : 'unblock';
    var slotKeys = collectSlotKeys(action);
    if (!slotKeys.length){
      setStatus(t('msg_failed'), true);
      return;
    }
    setStatus(t('msg_loading'));
    if (blocked) setButtonBusy(btnUnpublish, true);
    postAction('/api/admin/service/slots/block', { slotKeys: slotKeys, blocked: blocked })
      .then(function(result){
        setButtonBusy(btnUnpublish, false);
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
        setStatus(t('msg_failed'), true);
      });
  }

  function handleReleaseBooked(){
    if (!confirm('確定要解除已預約時段？此動作會清空該時段的預約並重新開放。')) return;
    var slotKeys = collectSlotKeys('release');
    if (!slotKeys.length){
      setStatus(t('msg_failed'), true);
      return;
    }
    setStatus(t('msg_loading'));
    setButtonBusy(btnReleaseBooked, true);
    postAction('/api/admin/service/slots/release', { slotKeys: slotKeys })
      .then(function(result){
        setButtonBusy(btnReleaseBooked, false);
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
        setButtonBusy(btnReleaseBooked, false);
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
    initDateNav();
    if (btnPublish) btnPublish.addEventListener('click', handlePublish);
    if (btnUnpublish) btnUnpublish.addEventListener('click', function(){ handleBlock(true); });
    if (btnReleaseBooked) btnReleaseBooked.addEventListener('click', handleReleaseBooked);
    if (btnPublishWindow) btnPublishWindow.addEventListener('click', handlePublishWithWindow);
    if (btnPublishSchedule) btnPublishSchedule.addEventListener('click', handlePublishSchedule);
    if (btnCancelSchedule) btnCancelSchedule.addEventListener('click', handleCancelSchedule);
    if (btnCloseWindow) btnCloseWindow.addEventListener('click', handleCloseWindow);
    if (scheduleCancelBtn) scheduleCancelBtn.addEventListener('click', closeScheduleDialog);
    if (scheduleConfirmBtn) scheduleConfirmBtn.addEventListener('click', confirmScheduleDialog);
    if (btnViewScheduled) btnViewScheduled.addEventListener('click', openScheduleListDialog);
    if (scheduleListClose) scheduleListClose.addEventListener('click', closeScheduleListDialog);
    if (btnClearSelectedAll) btnClearSelectedAll.addEventListener('click', clearSelectedAll);
    bindSelectionRowActions();
    if (bookingModeBtns.length){
      bookingModeBtns.forEach(function(btn){
        btn.addEventListener('click', function(){
          var mode = btn.dataset.mode || 'legacy';
          setBookingModeUI(mode);
          var serviceId = getServiceIdValue();
          if (!serviceId) return;
          updateSlotConfig({ serviceId: serviceId, bookingMode: mode });
        });
      });
    }
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
    if (btnConsultReload) btnConsultReload.addEventListener('click', function(){ loadConsultQueue(); });
    if (consultList){
      consultList.addEventListener('click', function(e){
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        var act = btn.getAttribute('data-act');
        if (act === 'consult-booked'){
          updateConsultStage(id, 'appointment_confirmed', btn);
        }else if (act === 'consult-done'){
          updateConsultStage(id, 'done', btn);
        }
      });
    }
    if (btnPublishedRefresh) btnPublishedRefresh.addEventListener('click', function(){
      setButtonBusy(btnPublishedRefresh, true);
      loadPublishedSlots(getServiceIdValue(), function(){
        setButtonBusy(btnPublishedRefresh, false);
      });
    });
    if (serviceIdInput){
      serviceIdInput.addEventListener('change', function(){
        loadConsultQueue();
        loadPublishedSlots(getServiceIdValue());
        loadSlotConfig(getServiceIdValue());
      });
    }
    bindDateNav();
    autoLoadTodayIfReady();
    loadPublishedSlots(getServiceIdValue());
    loadConsultQueue();
  });

})();
