(function(){
  var form = document.getElementById('admin2faForm');
  var input = document.getElementById('admin2faCode');
  var btn = document.getElementById('admin2faSubmit');
  var errorEl = document.getElementById('admin2faError');
  var statusEl = document.getElementById('admin2faStatus');
  var params = new URLSearchParams(location.search);
  var next = params.get('next') || '/admin/';

  function setError(msg){
    if (!errorEl) return;
    errorEl.textContent = msg || 'Verification failed.';
    errorEl.hidden = false;
  }
  function clearError(){
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  function setStatus(msg){
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.hidden = !msg;
  }

  async function refreshStatus(){
    if (!statusEl) return;
    try{
      const res = await fetch('/api/auth/admin/2fa/status', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(function(){ return {}; });
      if (res.ok && data && data.ok && data.remainingSeconds >= 0){
        const mins = Math.floor(data.remainingSeconds / 60);
        const secs = Math.floor(data.remainingSeconds % 60);
        setStatus(`目前已驗證，可用 ${mins}m ${String(secs).padStart(2,'0')}s`);
      }else{
        setStatus('尚未完成 2FA 驗證');
      }
    }catch(_){
      setStatus('');
    }
  }

  if (form){
    form.addEventListener('submit', async function(ev){
      ev.preventDefault();
      clearError();
      var code = (input && input.value ? input.value : '').trim();
      if (!/^[0-9]{6}$/.test(code)){
        setError('Please enter a valid 6-digit code.');
        return;
      }
      if (btn){
        btn.classList.add('is-loading');
        btn.disabled = true;
      }
      try{
        var res = await fetch('/api/auth/admin/2fa/verify', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          credentials:'include',
          body: JSON.stringify({ code: code, next: next })
        });
        var data = await res.json().catch(function(){ return {}; });
        if (!res.ok || !data || data.ok !== true){
          setError(data && data.error === 'INVALID_CODE' ? 'Invalid code. Please try again.' : 'Verification failed.');
        }else{
          setStatus('');
          location.href = data.next || next || '/admin/';
        }
      }catch(_){
        setError('Verification failed.');
      }finally{
        if (btn){
          btn.classList.remove('is-loading');
          btn.disabled = false;
        }
      }
    });
  }

  refreshStatus();
})();
