(function(){
  const btnGoogle = document.getElementById('btnAdminGoogle');
  const btnLine = document.getElementById('btnAdminLine');
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || '/admin';

  async function checkAdmin(){
    try{
      const res = await fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>null);
      if (res.ok && data && data.ok){
        location.href = redirect;
        return true;
      }
    }catch(_){
      // ignore
    }
    return false;
  }

  if (btnGoogle){
    btnGoogle.addEventListener('click', () => {
      const url = `/api/auth/google/admin/start?redirect=${encodeURIComponent(redirect)}`;
      location.href = url;
    });
  }
  if (btnLine){
    btnLine.addEventListener('click', () => {
      alert('目前僅支援 Google 管理員登入');
    });
  }

  checkAdmin();
})();
