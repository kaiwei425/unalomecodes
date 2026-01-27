    (function(){
      function t(key, fallback){
        try{
          var fn = window.UC_I18N && typeof window.UC_I18N.t === 'function' ? window.UC_I18N.t : null;
          if (!fn) return fallback;
          var v = fn(key);
          if (!v || v === key) return fallback;
          return v;
        }catch(_){
          return fallback;
        }
      }
      function tf(key, vars, fallback){
        var out = String(t(key, fallback) || '');
        var obj = vars && typeof vars === 'object' ? vars : {};
        try{
          Object.keys(obj).forEach(function(k){
            out = out.split('{' + k + '}').join(String(obj[k]));
          });
        }catch(_){}
        return out;
      }

      const subEl = document.getElementById('pageSubtitle');
      const btn = document.getElementById('btnEditSubtitle');
      if (!subEl || !btn) return;
      function applyAdminState(isAdmin){
        if (typeof window.authState !== 'undefined' && typeof window.authState.hasAdminPermission === 'function'){
          isAdmin = isAdmin && window.authState.hasAdminPermission('service_meta_edit');
        }
        btn.style.display = isAdmin ? 'inline-block' : 'none';
      }
      if (window.authState && typeof window.authState.onAdmin === 'function'){
        window.authState.onAdmin(applyAdminState);
      } else {
        applyAdminState(false);
      }
      btn.addEventListener('click', async () => {
        const oldVal = subEl.textContent;
        const newVal = prompt(t('svc.subtitle_edit_prompt','編輯副標題'), oldVal);
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
            alert(tf('svc.subtitle_save_failed', { msg: (data && data.error) ? data.error : t('common.unknown_error','未知錯誤') }, '儲存失敗：{msg}'));
          }
        }catch(err){
          alert(tf('svc.subtitle_save_failed', { msg: err && err.message ? err.message : t('common.unknown_error','未知錯誤') }, '儲存失敗：{msg}'));
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
  
