  (function(){
    const contentEl = document.getElementById('guideContent');
    const editBtn = document.getElementById('guideEditBtn');
    const saveBtn = document.getElementById('guideSaveBtn');
    const cancelBtn = document.getElementById('guideCancelBtn');
    if (!contentEl || !editBtn || !saveBtn || !cancelBtn) return;
    let originalHtml = '';

    function setEditing(isEditing){
      contentEl.contentEditable = isEditing ? 'true' : 'false';
      contentEl.classList.toggle('is-editing', isEditing);
      editBtn.style.display = isEditing ? 'none' : '';
      saveBtn.style.display = isEditing ? '' : 'none';
      cancelBtn.style.display = isEditing ? '' : 'none';
    }

    function applyAdminState(isAdmin){
      if (typeof window.authState !== 'undefined' && typeof window.authState.hasAdminPermission === 'function'){
        isAdmin = isAdmin && window.authState.hasAdminPermission('service_guide_edit');
      }
      editBtn.style.display = isAdmin ? '' : 'none';
      if (!isAdmin){
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        contentEl.contentEditable = 'false';
        contentEl.classList.remove('is-editing');
      }
    }

    if (window.authState && typeof window.authState.onAdmin === 'function'){
      window.authState.onAdmin(applyAdminState);
    } else {
      applyAdminState(false);
    }

    function safeSetHtml(el, html){
      const raw = String(html || '').trim();
      if (window.DOMPurify){
        el.innerHTML = DOMPurify.sanitize(raw, {
          ALLOWED_TAGS: ['b','i','em','strong','u','a','p','br','ul','ol','li','h1','h2','h3','blockquote','span'],
          ALLOWED_ATTR: ['href','target','rel','style']
        });
        return;
      }
      // fallback: strip script tags
      el.innerHTML = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    editBtn.addEventListener('click', () => {
      originalHtml = contentEl.innerHTML;
      setEditing(true);
    });

    cancelBtn.addEventListener('click', () => {
      if (originalHtml){
        safeSetHtml(contentEl, originalHtml);
      }
      setEditing(false);
    });

    saveBtn.addEventListener('click', async () => {
      const html = contentEl.innerHTML.trim();
      if (!html){
        alert('內容不能為空');
        return;
      }
      try{
        const res = await fetch('/api/service-guide/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ html })
        });
        const data = await res.json().catch(()=>({}));
        if (data && data.ok){
          setEditing(false);
        }else{
          alert('儲存失敗：' + (data.error || '未知錯誤'));
        }
      }catch(err){
        alert('儲存失敗：' + err.message);
      }
    });

    fetch('/api/service-guide/content', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.ok && data.html){
          safeSetHtml(contentEl, data.html);
        }
      })
      .catch(()=>{});
  })();
  
