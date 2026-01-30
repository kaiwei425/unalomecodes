(function(){
  var path = String(location.pathname || '');
  if (path === '/en' || path === '/en/' || path.startsWith('/en/')) return;
  var pageKey = document.body ? document.body.getAttribute('data-page-key') : '';
  if (!pageKey) return;

  var editableNodes = Array.from(document.querySelectorAll('[data-edit-key]'));
  var inputNodes = Array.from(document.querySelectorAll('[data-edit-input]'));
  var uploadNodes = Array.from(document.querySelectorAll('[data-upload-target]'));
  if (!editableNodes.length && !inputNodes.length) return;

  function applyMeta(meta){
    if (!meta) return;
    editableNodes.forEach(function(node){
      var key = node.getAttribute('data-edit-key');
      if (!key) return;
      if (Object.prototype.hasOwnProperty.call(meta, key)){
        var attr = node.getAttribute('data-edit-attr');
        if (attr){
          node.setAttribute(attr, String(meta[key]));
        }else{
          node.textContent = String(meta[key]);
        }
      }
    });
    inputNodes.forEach(function(node){
      var key = node.getAttribute('data-edit-input');
      if (!key) return;
      if (Object.prototype.hasOwnProperty.call(meta, key)){
        node.value = String(meta[key]);
      }
    });
  }

  function collectMeta(){
    var payload = {};
    editableNodes.forEach(function(node){
      var key = node.getAttribute('data-edit-key');
      if (!key) return;
      var attr = node.getAttribute('data-edit-attr');
      payload[key] = attr ? String(node.getAttribute(attr) || '').trim() : node.textContent.trim();
    });
    inputNodes.forEach(function(node){
      var key = node.getAttribute('data-edit-input');
      if (!key) return;
      payload[key] = String(node.value || '').trim();
    });
    return payload;
  }

  function setEditing(enabled){
    document.body.classList.toggle('is-editing', enabled);
    editableNodes.forEach(function(node){
      if (node.getAttribute('data-edit-attr')) return;
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

  function syncPreview(key, value){
    editableNodes.forEach(function(node){
      if (node.getAttribute('data-edit-key') !== key) return;
      var attr = node.getAttribute('data-edit-attr');
      if (attr){
        node.setAttribute(attr, value);
      }else{
        node.textContent = value;
      }
    });
  }

  function bindInputs(){
    inputNodes.forEach(function(input){
      input.addEventListener('input', function(){
        syncPreview(input.getAttribute('data-edit-input'), input.value);
      });
    });
  }

  function bindUploads(){
    if (!uploadNodes.length) return;
    uploadNodes.forEach(function(input){
      input.addEventListener('change', async function(){
        var targetKey = input.getAttribute('data-upload-target');
        if (!targetKey) return;
        var file = input.files && input.files[0];
        if (!file) return;
        var form = new FormData();
        form.append('files[]', file);
        try{
          var res = await fetch('/api/upload', { method:'POST', body: form, credentials:'include' });
          var data = await res.json().catch(function(){ return {}; });
          if (!res.ok || !data || !data.ok || !data.files || !data.files[0]){
            alert('上傳失敗：' + (data && data.error ? data.error : '未知錯誤'));
            return;
          }
          var url = data.files[0].url || '';
          inputNodes.forEach(function(node){
            if (node.getAttribute('data-edit-input') === targetKey){
              node.value = url;
            }
          });
          syncPreview(targetKey, url);
        }catch(err){
          alert('上傳失敗：' + err.message);
        }
      });
    });
  }

  var adminBar = null;
  function initAdminMode(){
    if (!window.authState || typeof window.authState.onAdmin !== 'function') return;
    window.authState.onAdmin(function(isAdmin){
      if (!isAdmin) return;
      if (typeof window.authState.hasAdminPermission === 'function'){
        if (!window.authState.hasAdminPermission('page_meta_edit')) return;
      }
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

  if (pageKey === 'home'){
    fetch('/api/page-meta?page=about', { credentials: 'include' })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (data && data.ok){
          applyMeta(data.meta || {});
        }
      })
      .catch(function(){});
  }

  bindInputs();
  bindUploads();
  initAdminMode();
})();
