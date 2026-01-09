(function(){
  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
  }
  const params = new URLSearchParams(location.search);
  const orderId = params.get('orderId') || params.get('id') || '';
  const statusEl = document.getElementById('status');
  const detailEl = document.getElementById('detail');
  const btnLookup = document.getElementById('btnLookup');
  if (orderId && btnLookup){
    btnLookup.href = `/shop#lookup=${encodeURIComponent(orderId)}`;
  }
  async function fetchOrder(){
    if (!orderId){
      statusEl.textContent = '未提供訂單編號，請回商品頁重新查詢。';
      statusEl.className = 'status warn';
      return;
    }
    try{
      const qs = new URLSearchParams();
      qs.set('id', orderId);
      const r = await fetch(`/api/order?${qs.toString()}`, { cache:'no-store' });
      const j = await r.json().catch(()=>({}));
      if (r.status === 401) {
        statusEl.textContent = '需要驗證才能查看訂單狀態，請登入或回商品頁以手機與訂單末五碼查詢。';
        statusEl.className = 'status warn';
        return;
      }
      if (!r.ok || !j.ok || !j.order){
        statusEl.textContent = '仍在確認付款，請稍後再試';
        statusEl.className = 'status warn';
        return;
      }
      const o = j.order;
      statusEl.textContent = (o.status === '已付款待出貨') ? '付款成功，已為您安排出貨' : (o.status || '處理中');
      statusEl.className = 'status ' + (o.status === '已付款待出貨' ? 'ok' : 'warn');
      const html = [
        `訂單編號：${escapeHtml(o.id || '')}`,
        `金額：NT$ ${Number(o.amount||0).toLocaleString('zh-TW')}`,
        `付款方式：${escapeHtml(o.method || '信用卡')}`,
        `狀態：${escapeHtml(o.status || '處理中')}`,
        o.buyer ? `聯絡人：${escapeHtml(o.buyer.name || '')}（${escapeHtml(o.buyer.phone || '')}）` : ''
      ].filter(Boolean).join('<br>');
      detailEl.style.display = 'block';
      detailEl.innerHTML = html;
    }catch(e){
      statusEl.textContent = '確認付款狀態時發生錯誤，請稍後再試';
      statusEl.className = 'status warn';
    }
  }
  fetchOrder();
})();
