  const listEl = document.getElementById('list');
  const q = document.getElementById('q');
  const addCode = document.getElementById('addCode');
  const tabs = document.getElementById('couponTabs');
  const usedHint = document.getElementById('usedHint');
  let items = [];
  let activeTab = 'unused';

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c)); }

  function typeLabel(c){
    const t = (c.type||'DEITY').toUpperCase();
    if (t === 'ALL') return '全館折扣券（全站適用，每次限用一張）';
    if (t === 'SHIP') return '免運券（折抵運費，每次限用一張）';
    return '神祇券';
  }
  function deityLabel(c){
    const map = {FM:'四面神',GA:'象神',CD:'崇迪',KP:'坤平',HM:'哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神',WE:'五眼四耳',XZ:'徐祝老人',HP:'魂魄勇'};
    const d = (c.deity||'').toUpperCase();
    if (!d || d==='ALL' || d==='SHIP') return '';
    return map[d] ? `${map[d]}（${d}）` : d;
  }
  function usageText(c){
    const t = (c.type||'DEITY').toUpperCase();
    const d = (c.deity||'').toUpperCase();
    const map = {FM:'四面神',GA:'象神',CD:'崇迪',KP:'坤平',HM:'哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神',WE:'五眼四耳',XZ:'徐祝老人',HP:'魂魄勇'};
    if (t === 'ALL') return '可用於全館任一商品；全館券與神祇券擇一使用（不可同時套用）。';
    if (t === 'SHIP') return '折抵運費，可搭配折扣券使用。';
    if (d && map[d]) return `可用於「${map[d]}」系列商品。`;
    return '可用於指定守護神商品。';
  }
  function isUsedExpired(c, days){
    if (!c || !c.used) return false;
    const raw = c.usedAt || c.used_at || c.usedTime || '';
    const ts = Date.parse(raw);
    if (!Number.isFinite(ts)) return false;
    return (Date.now() - ts) > (Number(days||7) * 86400000);
  }
  function render(){
    const key = (q.value||'').trim().toLowerCase();
    let list = items.slice();
    if (activeTab === 'unused'){
      list = list.filter(c=> !c.used);
    } else if (activeTab === 'used'){
      list = list.filter(c=> c.used && !isUsedExpired(c, 7));
    }
    if (key){ list = list.filter(x=> JSON.stringify(x).toLowerCase().includes(key)); }
    if (!list.length){ listEl.innerHTML = '<div class="muted">目前沒有優惠券</div>'; return; }
    listEl.innerHTML = list.map(c=>{
      const used = !!c.used;
      const chips = [
        `<span class="chip">類型：${escapeHtml(typeLabel(c))}</span>`
      ];
      const dLabel = deityLabel(c);
      if (dLabel){
        chips.push(`<span class="chip">守護神：${escapeHtml(dLabel)}</span>`);
      }else if ((c.deity||'').toUpperCase()==='ALL'){
        chips.push(`<span class="chip">適用範圍：全館</span>`);
      }else if ((c.deity||'').toUpperCase()==='SHIP'){
        chips.push(`<span class="chip">適用範圍：運費</span>`);
      }
      chips.push(`<span class="chip ${used?'warn':'ok'}">${used?'已使用':'未使用'}</span>`);
      return `<div class="coupon">
        <div>
          <h3>${escapeHtml(c.code||'')}</h3>
          <div class="muted">折抵：NT$ ${Number(c.amount||0)}｜${escapeHtml(typeLabel(c))}</div>
          <div class="muted">發放：${c.issuedAt ? new Date(c.issuedAt).toLocaleString('zh-TW') : '—'}</div>
          <div class="muted">${escapeHtml(usageText(c))}</div>
          ${c.startAt ? `<div class="muted">生效：${new Date(c.startAt).toLocaleString('zh-TW')}</div>` : ''}
          ${c.expireAt ? `<div class="muted">到期：${new Date(c.expireAt).toLocaleString('zh-TW')}</div>` : ''}
          ${c.usedAt ? `<div class="muted">使用時間：${new Date(c.usedAt).toLocaleString('zh-TW')}</div>` : ''}
          ${c.orderId ? `<div class="muted">使用訂單：${escapeHtml(c.orderId)}</div>` : ''}
          <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;">${chips.join('')}</div>
        </div>
        <div class="actions">
          <button class="btn" data-act="copy" data-code="${escapeHtml(c.code||'')}">複製</button>
          ${used ? '' : `<button class="btn primary" data-act="apply" data-code="${escapeHtml(c.code||'')}" data-deity="${escapeHtml(c.deity||'')}" data-amount="${Number(c.amount||0)}" data-type="${escapeHtml(c.type||'DEITY')}">套用到購物車</button>`}
        </div>
      </div>`;
    }).join('');
  }

  async function load(){
    listEl.innerHTML = '<div class="muted">載入中…</div>';
    try{
      const res = await fetch('/api/me/coupons?mark=1',{credentials:'include',cache:'no-store'});
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok) throw new Error(data.error||('HTTP '+res.status));
      items = Array.isArray(data.items) ? data.items : [];
      render();
    }catch(err){
      listEl.innerHTML = `<div class="muted">讀取失敗：${escapeHtml(err.message||err)}</div>`;
    }
  }

  async function add(){
    const code = (addCode.value||'').trim();
    if (!code){ addCode.focus(); return; }
    try{
      const res = await fetch('/api/me/coupons',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({code})});
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok) throw new Error(data.error||('HTTP '+res.status));
      addCode.value='';
      await load();
    }catch(err){ alert('加入失敗：'+(err.message||err)); }
  }

  function applyToCart(code,deity,amount){
    try{
      const payload = {
        code:String(code||'').toUpperCase(),
        deity:String(deity||'').toUpperCase(),
        amount:Number(amount||0)||200,
        type: (arguments[3]||'').toUpperCase() || 'DEITY'
      };
      const coupons = [payload];
      try{ localStorage.setItem('__cartCoupons__', JSON.stringify(coupons)); }catch(_){ }
      try{ window.__cartCouponState = window.__cartCouponState || {}; window.__cartCouponState.coupons = coupons.slice(); }catch(_){ }
      alert('已將優惠券套用到購物車，請回購物車查看金額。');
    }catch(_){ alert('套用失敗，請回購物車重試。'); }
  }

  listEl.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const code = btn.dataset.code;
    if (act === 'copy'){
      navigator.clipboard && navigator.clipboard.writeText(code).catch(()=>{});
      btn.textContent = '已複製'; setTimeout(()=> btn.textContent='複製', 800);
      return;
    }
    if (act === 'apply'){
      applyToCart(code, btn.dataset.deity, btn.dataset.amount, btn.dataset.type);
      return;
    }
  });

  document.getElementById('btnReload').addEventListener('click', load);
  document.getElementById('btnAdd').addEventListener('click', add);
  q.addEventListener('input', ()=>{ clearTimeout(q._t); q._t=setTimeout(render,200); });
  if (tabs){
    tabs.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      activeTab = btn.getAttribute('data-tab') || 'unused';
      tabs.querySelectorAll('button[data-tab]').forEach(b=> b.classList.toggle('active', b === btn));
      if (usedHint) usedHint.style.display = (activeTab === 'used') ? '' : 'none';
      render();
    });
  }
  load();
