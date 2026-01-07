(function(){
  var pageKey = document.body ? document.body.getAttribute('data-page-key') : '';
  if (!pageKey) return;

  var editableNodes = Array.from(document.querySelectorAll('[data-edit-key]'));
  if (!editableNodes.length) return;

  function applyMeta(meta){
    if (!meta) return;
    editableNodes.forEach(function(node){
      var key = node.getAttribute('data-edit-key');
      if (!key) return;
      if (Object.prototype.hasOwnProperty.call(meta, key)){
        node.textContent = String(meta[key]);
      }
    });
  }

  function collectMeta(){
    var payload = {};
    editableNodes.forEach(function(node){
      var key = node.getAttribute('data-edit-key');
      if (!key) return;
      payload[key] = node.textContent.trim();
    });
    return payload;
  }

  function setEditing(enabled){
    document.body.classList.toggle('is-editing', enabled);
    editableNodes.forEach(function(node){
      if (enabled){
        node.setAttribute('contenteditable', 'true');
        node.setAttribute('spellcheck', 'false');
        node.classList.add('is-admin-edit');
      }else{
        node.removeAttribute('contenteditable');
        node.classList.remove('is-admin-edit');
      }
    });
  }

  function createAdminBar(){
    var bar = document.createElement('div');
    bar.className = 'admin-bar';
    bar.innerHTML = '\n      <div class="admin-bar__title">管理員編輯模式</div>\n      <button type="button" class="admin-bar__toggle" id="adminEditToggle">開始編輯</button>\n      <button type="button" class="admin-bar__save" id="adminEditSave">儲存變更</button>\n    ';
    document.body.appendChild(bar);
    return bar;
  }

  function bindAdminBar(){
    var bar = createAdminBar();
    var toggleBtn = bar.querySelector('#adminEditToggle');
    var saveBtn = bar.querySelector('#adminEditSave');
    var editing = false;

    toggleBtn.addEventListener('click', function(){
      editing = !editing;
      toggleBtn.textContent = editing ? '結束編輯' : '開始編輯';
      setEditing(editing);
    });

    saveBtn.addEventListener('click', async function(){
      try{
        var res = await fetch('/api/page-meta?page=' + encodeURIComponent(pageKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ meta: collectMeta() })
        });
        var data = await res.json().catch(function(){ return {}; });
        if (!res.ok || !data || !data.ok){
          alert('儲存失敗：' + (data && data.error ? data.error : '未知錯誤'));
          return;
        }
        alert('已儲存');
      }catch(err){
        alert('儲存失敗：' + err.message);
      }
    });

    return bar;
  }

  var adminBar = null;
  function initAdminMode(){
    if (!window.authState || typeof window.authState.onAdmin !== 'function') return;
    window.authState.onAdmin(function(isAdmin){
      if (!isAdmin) return;
      if (adminBar) return;
      adminBar = bindAdminBar();
    });
  }

  fetch('/api/page-meta?page=' + encodeURIComponent(pageKey), { credentials: 'include' })
    .then(function(res){ return res.json(); })
    .then(function(data){
      if (data && data.ok){
        applyMeta(data.meta || {});
      }
    })
    .catch(function(){});

  initAdminMode();
})();
