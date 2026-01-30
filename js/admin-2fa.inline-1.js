(function(){
  var form = document.getElementById('admin2faForm');
  var input = document.getElementById('admin2faCode');
  var btn = document.getElementById('admin2faSubmit');
  var errorEl = document.getElementById('admin2faError');
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
})();
