(function(){
  try{
    if (window.fetch && !window.__adminFetch2faPatched){
      window.__adminFetch2faPatched = true;
      const originalFetch = window.fetch.bind(window);
      window.fetch = function(input, init){
        return originalFetch(input, init).then(async function(res){
          if (res && res.status === 401){
            try{
              const data = await res.clone().json();
              if (data && data.error === '2FA_REQUIRED' && data.next){
                location.href = data.next;
              }
            }catch(_){}
          }
          return res;
        });
      };
    }
    var root = document.documentElement;
    if (!root) return;
    var redirect = encodeURIComponent(location.pathname + location.search + location.hash);
    fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
      .then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){
          return { ok: res.ok && data && data.ok };
        });
      })
      .then(function(result){
        if (result && result.ok){
          root.classList.remove('admin-guard-hide');
          return;
        }
        location.href = '/admin/login?redirect=' + redirect;
      })
      .catch(function(){
        location.href = '/admin/login?redirect=' + redirect;
      });
  }catch(_){
    // ignore
  }
})();
