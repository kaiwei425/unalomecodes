(function(){
  const emailInput = document.getElementById('adminEmail');
  const roleSel = document.getElementById('adminRole');
  const permGrid = document.getElementById('permGrid');
  const permWrap = document.getElementById('permWrap');
  const statusText = document.getElementById('statusText');
  const bookingNotify = document.getElementById('bookingNotify');
  const btnLoad = document.getElementById('btnLoad');
  const btnSave = document.getElementById('btnSave');
  const btnRemove = document.getElementById('btnRemove');

  const PERMISSIONS = [
    { key:'admin_panel_view', label:'後台入口/管理連結' },
    { key:'page_meta_edit', label:'入口頁/頁面編輯' },
    { key:'food_map_edit', label:'美食地圖編輯' },
    { key:'temple_map_edit', label:'寺廟地圖編輯' },
    { key:'shop_meta_edit', label:'商城文字編輯' },
    { key:'service_meta_edit', label:'服務頁文字編輯' },
    { key:'service_guide_edit', label:'服務指南編輯' },
    { key:'orders.view', label:'訂單檢視' },
    { key:'orders.status_update', label:'訂單狀態更新' },
    { key:'orders.export', label:'訂單匯出' },
    { key:'service_orders.export', label:'服務訂單匯出' },
    { key:'service_orders.result_upload', label:'服務成果上傳' },
    { key:'slots.view', label:'時段檢視' },
    { key:'slots.manage', label:'時段管理' },
    { key:'members.manage', label:'會員管理' },
    { key:'coupons.manage', label:'優惠券管理' },
    { key:'products.manage', label:'商品管理' },
    { key:'service_products.manage', label:'服務商品管理' },
    { key:'content.manage', label:'內容管理/留言' },
    { key:'maps.manage', label:'地圖資料維護' },
    { key:'cron.run', label:'維運任務' },
    { key:'file.delete', label:'檔案刪除' },
    { key:'audit.view', label:'審計日誌' }
  ];

  const ROLE_PRESETS = {
    owner: { role:'owner', permissions:['*'] },
    fulfillment: { role:'fulfillment', permissions:['orders.view','orders.status_update','orders.qna.view','proof.view','service_orders.result_upload'] },
    booking: { role:'booking', permissions:['slots.view','slots.manage'] }
  };

  function setStatus(msg){
    if (statusText) statusText.textContent = msg;
  }

  function normalizeRole(val){
    return String(val || '').trim().toLowerCase();
  }

  function normalizeEmail(){
    return String(emailInput && emailInput.value || '').trim().toLowerCase();
  }

  function renderPerms(selected, locked){
    if (!permGrid) return;
    permGrid.innerHTML = '';
    const selectedSet = new Set(Array.isArray(selected) ? selected : []);
    PERMISSIONS.forEach(item => {
      const wrap = document.createElement('label');
      wrap.className = 'perm-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = item.key;
      input.checked = selectedSet.has(item.key);
      input.disabled = !!locked;
      const span = document.createElement('span');
      span.textContent = item.label + ' (' + item.key + ')';
      wrap.appendChild(input);
      wrap.appendChild(span);
      permGrid.appendChild(wrap);
    });
  }

  function collectPerms(){
    if (!permGrid) return [];
    const out = [];
    permGrid.querySelectorAll('input[type="checkbox"]').forEach(input => {
      if (input.checked) out.push(input.value);
    });
    return out;
  }

  function getPresetPerms(role){
    const preset = ROLE_PRESETS[role];
    if (!preset) return [];
    if (preset.permissions.includes('*')){
      return PERMISSIONS.map(item => item.key);
    }
    return preset.permissions.slice();
  }

  function updateRoleView(role, perms){
    const r = normalizeRole(role);
    if (!permWrap) return;
    if (bookingNotify){
      const enableNotify = (r === 'booking');
      bookingNotify.disabled = !enableNotify;
      if (!enableNotify) bookingNotify.checked = false;
    }
    if (ROLE_PRESETS[r]){
      permWrap.style.display = '';
      renderPerms(getPresetPerms(r), true);
      if (r === 'booking'){
        setStatus('booking 只能管理時段');
      }else if (r === 'fulfillment'){
        setStatus('fulfillment 權限已鎖定');
      }else if (r === 'owner'){
        setStatus('owner 擁有全權限');
      }
      return;
    }
    if (r === 'custom'){
      permWrap.style.display = '';
      renderPerms(perms || [], false);
      return;
    }
    permWrap.style.display = 'none';
  }

  async function loadRole(){
    const email = normalizeEmail();
    if (!email){
      setStatus('請輸入 Email。');
      return;
    }
    try{
      const res = await fetch(`/api/admin/roles?email=${encodeURIComponent(email)}`, { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || !data.ok){
        setStatus('讀取失敗：' + (data && data.error ? data.error : '未知錯誤'));
        return;
      }
      roleSel.value = data.role || '';
      const normalizedRole = normalizeRole(roleSel.value);
      updateRoleView(normalizedRole, data.permissions || []);
      if (bookingNotify){
        bookingNotify.checked = !!data.bookingNotify;
        if (normalizedRole !== 'booking') bookingNotify.checked = false;
      }
      if (!ROLE_PRESETS[normalizedRole]){
        setStatus('已載入權限設定。');
      }
    }catch(err){
      setStatus('讀取失敗：' + err.message);
    }
  }

  async function saveRole(){
    const email = normalizeEmail();
    if (!email){
      setStatus('請輸入 Email。');
      return;
    }
    const role = normalizeRole(roleSel.value);
    const perms = ROLE_PRESETS[role]
      ? ROLE_PRESETS[role].permissions.slice()
      : (role === 'custom' ? collectPerms() : []);
    const bookingNotifyOn = role === 'booking' && bookingNotify ? !!bookingNotify.checked : false;
    try{
      const res = await fetch('/api/admin/roles', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ email, role, permissions: perms, bookingNotify: bookingNotifyOn })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || !data.ok){
        setStatus('儲存失敗：' + (data && data.error ? data.error : '未知錯誤'));
        return;
      }
      setStatus('已儲存設定。');
    }catch(err){
      setStatus('儲存失敗：' + err.message);
    }
  }

  async function removeRole(){
    const email = normalizeEmail();
    if (!email){
      setStatus('請輸入 Email。');
      return;
    }
    try{
      const res = await fetch(`/api/admin/roles?email=${encodeURIComponent(email)}`, {
        method:'DELETE',
        credentials:'include'
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || !data.ok){
        setStatus('移除失敗：' + (data && data.error ? data.error : '未知錯誤'));
        return;
      }
      roleSel.value = '';
      renderPerms([]);
      updateRoleView('', []);
      if (bookingNotify) bookingNotify.checked = false;
      setStatus('已移除設定。');
    }catch(err){
      setStatus('移除失敗：' + err.message);
    }
  }

  if (roleSel){
    roleSel.addEventListener('change', function(){
      updateRoleView(roleSel.value, []);
    });
  }
  if (btnLoad) btnLoad.addEventListener('click', loadRole);
  if (btnSave) btnSave.addEventListener('click', saveRole);
  if (btnRemove) btnRemove.addEventListener('click', removeRole);

  renderPerms([]);
  updateRoleView(roleSel ? roleSel.value : '', []);
})();
