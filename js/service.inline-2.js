    (function(){
      const subEl = document.getElementById('pageSubtitle');
      const btn = document.getElementById('btnEditSubtitle');
      if (!subEl || !btn) return;
      function applyAdminState(isAdmin){
        btn.style.display = isAdmin ? 'inline-block' : 'none';
      }
      if (window.authState && typeof window.authState.onAdmin === 'function'){
        window.authState.onAdmin(applyAdminState);
      } else {
        applyAdminState(false);
      }
      btn.addEventListener('click', async () => {
        const oldVal = subEl.textContent;
        const newVal = prompt('編輯副標題', oldVal);
        if (!newVal || newVal === oldVal) return;
        try{
          const res = await fetch('/api/service/meta', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({ subtitle: newVal })
          });
          const data = await res.json().catch(()=>({}));
          if (data.ok){
            subEl.textContent = newVal;
          } else {
            alert('儲存失敗：' + (data.error || '未知錯誤'));
          }
        }catch(err){
          alert('儲存失敗：' + err.message);
        }
      });
      fetch('/api/service/meta', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data && data.ok && data.meta && data.meta.subtitle){
            subEl.textContent = data.meta.subtitle;
          }
        })
        .catch(()=>{});
    })();
  
