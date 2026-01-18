(function(){
  var guard = document.getElementById('templateGuard');
  var content = document.getElementById('templateContent');
  var btn = document.getElementById('btnCreateTemplate');
  var statusEl = document.getElementById('templateStatus');
  var resultCard = document.getElementById('templateResult');
  var idEl = document.getElementById('templateServiceId');
  var noteEl = document.getElementById('templateNote');
  var copyBtn = document.getElementById('templateCopy');

  function showGuard(){
    if (guard) guard.style.display = '';
    if (content) content.style.display = 'none';
  }
  function showContent(){
    if (guard) guard.style.display = 'none';
    if (content) content.style.display = '';
  }
  function setStatus(msg){
    if (statusEl) statusEl.textContent = msg || '';
  }
  function setBusy(on){
    if (!btn) return;
    btn.disabled = !!on;
    btn.textContent = on ? '建立中...' : '一鍵建立模板 Create Template';
  }
  function showResult(serviceId, existed){
    if (!resultCard) return;
    resultCard.style.display = '';
    if (idEl) idEl.textContent = serviceId || '—';
    if (noteEl){
      noteEl.textContent = existed
        ? '已存在模板，未重複建立 / Template already exists.'
        : '已建立模板 / Template created.';
    }
  }
  function copyText(text){
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).catch(function(){});
      return;
    }
    try{
      var input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }catch(_){ }
  }

  if (copyBtn){
    copyBtn.addEventListener('click', function(){
      if (idEl) copyText(idEl.textContent || '');
    });
  }

  fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
    .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(data){ return { ok: res.ok && data && data.ok, data: data || {} }; }); })
    .then(function(result){
      var role = String((result.data && result.data.role) || '').trim().toLowerCase();
      if (!result.ok || role !== 'owner'){
        showGuard();
        return;
      }
      showContent();
    })
    .catch(function(){
      showGuard();
    });

  if (btn){
    btn.addEventListener('click', function(){
      setStatus('送出中...');
      setBusy(true);
      fetch('/api/admin/service/phone-consult-template', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){
          return { ok: res.ok && data && data.ok, status: res.status, data: data || {} };
        });
      }).then(function(result){
        if (result.status === 401 || result.status === 403){
          setStatus('無權限 / Unauthorized');
          return;
        }
        if (result.status === 501){
          setStatus('未綁定 SERVICE_PRODUCTS/PRODUCTS KV');
          return;
        }
        if (!result.ok){
          setStatus('建立失敗 / Failed to create');
          return;
        }
        showResult(result.data.serviceId || '', !!result.data.existed);
        setStatus('完成 / Done');
      }).catch(function(){
        setStatus('建立失敗 / Failed to create');
      }).finally(function(){
        setBusy(false);
      });
    });
  }
})();
