(() => {
  const listEl = document.getElementById('svcList');
  const emptyEl = document.getElementById('svcListEmpty');
  const lookupBtn = document.getElementById('svcLookupBtn');
  const lookupDialog = document.getElementById('svcLookup');
  const lookupClose = document.getElementById('svcLookupClose');
  const lookupForm = document.getElementById('svcLookupForm');

  async function fetchServices(){
    try{
      const res = await fetch('/api/service/products', { cache:'no-store' });
      const j = await res.json().catch(()=>({}));
      if (!res.ok || !j || !j.ok) throw new Error(j && j.error || 'error');
      return Array.isArray(j.items) ? j.items : [];
    }catch(err){
      console.error('[service] fetch error', err);
      return [];
    }
  }

  function renderList(items){
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!items.length){
      const placeholder = document.createElement('div');
      placeholder.id = 'svcListEmpty';
      placeholder.textContent = '目前尚未上架服務，請稍後再試。';
      listEl.appendChild(placeholder);
      return;
    }
    items.forEach(service => {
      const card = document.createElement('div');
      card.className = 'svc-card';
      card.innerHTML = `
        <div style="font-size:18px;font-weight:700;">${service.name}</div>
        <div class="meta">
          <span>建議準備：${service.duration || '—'}</span>
          <span>費用：NT$ ${Number(service.price || 0).toLocaleString('zh-TW')}</span>
        </div>
        <p style="margin:0;color:#cbd5f5;line-height:1.6;">${service.desc || ''}</p>
        <button data-service="${service.id}">查看並下單</button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        alert('後續會跳出服務專用的購物車與結帳流程。\n目前為骨架階段。');
      });
      listEl.appendChild(card);
    });
  }

  function initLookupDialog(){
    if (lookupBtn && lookupDialog){
      lookupBtn.addEventListener('click', () => {
        lookupDialog.showModal();
      });
    }
    if (lookupClose && lookupDialog){
      lookupClose.addEventListener('click', () => lookupDialog.close());
    }
    if (lookupForm){
      lookupForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        alert('祈福進度查詢 API 尚未接線，後續會實作。');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    (async ()=>{
      try{
        const data = await fetchServices();
        renderList(data);
        initLookupDialog();
        if (emptyEl) emptyEl.remove();
      }catch(err){
        console.error('[service] init error', err);
      }
    })();
  });
})();
