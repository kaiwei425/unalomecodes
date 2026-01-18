(function(){
  function resolveRole(){
    var meta = document.querySelector('.admin-topbar-user__meta');
    if (meta && meta.textContent) return meta.textContent.trim().toLowerCase();
    return '';
  }
  function applyGuard(){
    var guard = document.getElementById('staffManualGuard');
    var content = document.getElementById('staffManualContent');
    var role = resolveRole();
    if (role === 'owner' || role === 'booking'){
      if (guard) guard.style.display = 'none';
      if (content) content.style.display = '';
      return true;
    }
    if (guard) guard.style.display = '';
    if (content) content.style.display = 'none';
    return false;
  }
  function waitForRole(retries){
    if (applyGuard()) return;
    if (retries <= 0) return;
    setTimeout(function(){ waitForRole(retries - 1); }, 300);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ waitForRole(10); });
  }else{
    waitForRole(10);
  }
})();
