  const API = (window.__SHOP_ORIGIN || 'https://unalomecodes.com') + '/api/admin/users';
  const API_RESET = (window.__SHOP_ORIGIN || 'https://unalomecodes.com') + '/api/admin/users/reset-guardian';
  const API_DELETE = (window.__SHOP_ORIGIN || 'https://unalomecodes.com') + '/api/admin/users/delete';
  const API_CREATOR_INVITE = (window.__SHOP_ORIGIN || 'https://unalomecodes.com') + '/api/admin/users/creator-invite';
  const API_CREATOR_LINK = (window.__SHOP_ORIGIN || 'https://unalomecodes.com') + '/api/admin/creator/invite';
  const q = document.getElementById('q');
  const tbody = document.getElementById('tbody');
  const sortSel = document.getElementById('sortSel');
  const countEl = document.getElementById('count');
  let items = [];

  function render(){
    let list = items.slice();
    const key = (q.value||'').trim().toLowerCase();
    if (key){
      list = list.filter(u=> JSON.stringify(u).toLowerCase().includes(key));
    }
    const sort = sortSel.value;
    list.sort((a,b)=>{
      if (sort === 'name') return String(a.name||'').localeCompare(String(b.name||''));
      if (sort === 'created'){
        return new Date(b.createdAt||0) - new Date(a.createdAt||0);
      }
      return new Date(b.lastLoginAt||b.updatedAt||b.createdAt||0) - new Date(a.lastLoginAt||a.updatedAt||a.createdAt||0);
    });
    if (countEl) countEl.textContent = `共 ${list.length} 位`;
    tbody.innerHTML = list.map(u=>{
      const store = u.defaultStore || {};
      const storeText = store.name ? `${store.name}${store.id ? '（'+store.id+'）' : ''}` : '';
      const guardianName = (u.guardian && (u.guardian.name || u.guardian.code)) ? (u.guardian.name || u.guardian.code) : '';
      const creatorBadge = u.creatorFoods ? '<span class="badge green">創作者</span>' : (u.creatorInviteAllowed ? '<span class="badge blue">可輸入邀請碼</span>' : '<span class="muted">未開放</span>');
      const creatorAction = u.creatorFoods ? '<span class="muted">已是創作者</span>' : `<button class="action-btn" data-creator-id="${escapeHtml(u.id||'')}" data-creator-name="${escapeHtml(u.name||u.email||'')}" data-creator-allow="${u.creatorInviteAllowed ? '0' : '1'}">${u.creatorInviteAllowed ? '取消邀請權限' : '開放邀請權限'}</button>`;
      return `<tr>
        <td>
          <div style="font-weight:700">${escapeHtml(u.name||'（未填寫）')}</div>
          <div class="muted">${escapeHtml(u.email||'')}</div>
        </td>
        <td>${escapeHtml((u.defaultContact && u.defaultContact.phone) || '')}</td>
        <td>${escapeHtml(storeText)}</td>
        <td>${guardianName ? `<span class="badge blue">${escapeHtml(guardianName)}</span>` : '<span class="muted">未設定</span>'}</td>
        <td>
          <div class="muted">登入：${fmt(u.lastLoginAt)}</div>
          <div class="muted">建立：${fmt(u.createdAt)}</div>
        </td>
        <td>${creatorBadge}</td>
        <td>
          ${creatorAction}
          <button class="action-btn" data-reset-id="${escapeHtml(u.id||'')}" data-reset-name="${escapeHtml(u.name||u.email||'')}">重置守護神</button>
          <button class="action-btn danger" data-del-id="${escapeHtml(u.id||'')}" data-del-name="${escapeHtml(u.name||u.email||'')}">刪除會員</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="muted">目前沒有資料</td></tr>';
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]||c));
  }
  function fmt(ts){
    if (!ts) return '';
    try{ return new Date(ts).toLocaleString(); }catch(_){ return ts; }
  }

  async function load(){
    tbody.innerHTML = '<tr><td colspan="6" class="muted">載入中…</td></tr>';
    try{
      const res = await fetch(API, { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok){
        throw new Error(data.error || ('HTTP '+res.status));
      }
      items = Array.isArray(data.items) ? data.items : [];
      render();
    }catch(err){
      tbody.innerHTML = `<tr><td colspan="6" style="color:#f87171;">讀取失敗：${escapeHtml(err.message||err)}</td></tr>`;
    }
  }

  document.getElementById('reload').addEventListener('click', load);
  q.addEventListener('input', ()=>{ clearTimeout(q._t); q._t=setTimeout(render,200); });
  sortSel.addEventListener('change', render);
  const creatorLinkBtn = document.getElementById('btnCreatorLink');
  if (creatorLinkBtn){
    creatorLinkBtn.addEventListener('click', async ()=>{
      try{
        const res = await fetch(API_CREATOR_LINK, {
          method:'POST',
          credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ mode:'link' })
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
        const origin = window.__SHOP_ORIGIN || window.location.origin;
        const link = data.link || (data.code ? `${origin}/food-map?creator_invite=${encodeURIComponent(data.code)}` : '');
        if (!link) throw new Error('missing link');
        try{
          if (navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(link);
            alert('創作者連結已複製（24 小時內有效）');
          }else{
            window.prompt('創作者連結（24 小時內有效）', link);
          }
        }catch(_){
          window.prompt('創作者連結（24 小時內有效）', link);
        }
      }catch(err){
        alert('產生連結失敗：' + (err.message || err));
      }
    });
  }

  tbody.addEventListener('click', async e=>{
    const creatorBtn = e.target.closest('[data-creator-id]');
    if (creatorBtn){
      const id = creatorBtn.getAttribute('data-creator-id');
      const name = creatorBtn.getAttribute('data-creator-name') || '';
      const allow = creatorBtn.getAttribute('data-creator-allow') === '1';
      if (!id) return;
      const confirmText = allow ? '開放邀請權限' : '取消邀請權限';
      if (!confirm(`確定要${confirmText}${name ? '給 ' + name : ''}？`)) return;
      try{
        const res = await fetch(API_CREATOR_INVITE, {
          method:'POST',
          credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ id, allow })
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
        await load();
        alert(allow ? '已開放邀請權限' : '已取消邀請權限');
      }catch(err){
        alert('更新失敗：' + (err.message || err));
      }
      return;
    }
    const resetBtn = e.target.closest('[data-reset-id]');
    if (resetBtn){
      const id = resetBtn.getAttribute('data-reset-id');
      const name = resetBtn.getAttribute('data-reset-name') || '';
      if (!id) return;
      if (!confirm(`確定要重置 ${name ? name + ' 的' : ''}守護神？`)) return;
      try{
        const res = await fetch(API_RESET, {
          method:'POST',
          credentials:'include',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ id })
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
        await load();
        alert('已重置守護神');
      }catch(err){
        alert('重置失敗：' + (err.message || err));
      }
      return;
    }
    const delBtn = e.target.closest('[data-del-id]');
    if (!delBtn) return;
    const id = delBtn.getAttribute('data-del-id');
    const name = delBtn.getAttribute('data-del-name') || '';
    if (!id) return;
    const confirmText = prompt(`確定要刪除會員「${name || id}」嗎？\n此動作不可復原。\n請輸入「刪除」確認`);
    if (confirmText !== '刪除') return;
    try{
      const res = await fetch(API_DELETE, {
        method:'POST',
        credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ id, confirm:'刪除' })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
      await load();
      alert('已刪除會員');
    }catch(err){
      alert('刪除失敗：' + (err.message || err));
    }
  });
  load();
