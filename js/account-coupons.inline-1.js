  const listEl = document.getElementById('list');
  const q = document.getElementById('q');
  const addCode = document.getElementById('addCode');
  const tabs = document.getElementById('couponTabs');
  const usedHint = document.getElementById('usedHint');
  const t = (window.UC_I18N && typeof window.UC_I18N.t === 'function')
    ? window.UC_I18N.t
    : function(k){ return k; };
  let items = [];
  let activeTab = 'unused';

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c)); }

  function typeLabel(c){
    const typ = (c.type||'DEITY').toUpperCase();
    if (typ === 'ALL') return t('coupon_type_all');
    if (typ === 'SHIP') return t('coupon_type_ship');
    return t('coupon_type_deity');
  }
  function deityLabel(c){
    const isEn = (window.UC_I18N && window.UC_I18N.getLang && window.UC_I18N.getLang() === 'en');
    const map = isEn
      ? {FM:'Brahma',GA:'Ganesha',CD:'Somdej',KP:'Khun Paen',HM:'Hanuman',RH:'Rahu',JL:'Garuda',ZD:'Jatukam',ZF:'Lakshmi',WE:'Five Eyes Four Ears',XZ:'Elder Xu Zhu',HP:'Hun Po Yong'}
      : {FM:'四面神',GA:'象神',CD:'崇迪',KP:'坤平',HM:'哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神',WE:'五眼四耳',XZ:'徐祝老人',HP:'魂魄勇'};
    const d = (c.deity||'').toUpperCase();
    if (!d || d==='ALL' || d==='SHIP') return '';
    return map[d] ? `${map[d]}（${d}）` : d;
  }
  function usageText(c){
    const typ = (c.type||'DEITY').toUpperCase();
    const d = (c.deity||'').toUpperCase();
    const isEn = (window.UC_I18N && window.UC_I18N.getLang && window.UC_I18N.getLang() === 'en');
    const map = isEn
      ? {FM:'Brahma',GA:'Ganesha',CD:'Somdej',KP:'Khun Paen',HM:'Hanuman',RH:'Rahu',JL:'Garuda',ZD:'Jatukam',ZF:'Lakshmi',WE:'Five Eyes Four Ears',XZ:'Elder Xu Zhu',HP:'Hun Po Yong'}
      : {FM:'四面神',GA:'象神',CD:'崇迪',KP:'坤平',HM:'哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神',WE:'五眼四耳',XZ:'徐祝老人',HP:'魂魄勇'};
    if (typ === 'ALL') return t('coupon_usage_all');
    if (typ === 'SHIP') return t('coupon_usage_ship');
    if (d && map[d]) return isEn ? (`Applicable to "${map[d]}" products.`) : (`可用於「${map[d]}」系列商品。`);
    return t('coupon_usage_deity_fallback');
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
    if (!list.length){ listEl.innerHTML = '<div class="muted">' + escapeHtml(t('account_coupons.none')) + '</div>'; return; }
    listEl.innerHTML = list.map(c=>{
      const used = !!c.used;
      const chips = [
        `<span class="chip">${escapeHtml(t('account_coupons.type'))}：${escapeHtml(typeLabel(c))}</span>`
      ];
      const dLabel = deityLabel(c);
      if (dLabel){
        chips.push(`<span class="chip">${escapeHtml(t('account_coupons.deity'))}：${escapeHtml(dLabel)}</span>`);
      }else if ((c.deity||'').toUpperCase()==='ALL'){
        chips.push(`<span class="chip">${escapeHtml(t('account_coupons.scope'))}：${escapeHtml(t('account_coupons.scope_all'))}</span>`);
      }else if ((c.deity||'').toUpperCase()==='SHIP'){
        chips.push(`<span class="chip">${escapeHtml(t('account_coupons.scope'))}：${escapeHtml(t('account_coupons.scope_ship'))}</span>`);
      }
      chips.push(`<span class="chip ${used?'warn':'ok'}">${escapeHtml(used ? t('account_coupons.used') : t('account_coupons.unused'))}</span>`);
      return `<div class="coupon">
        <div>
          <h3>${escapeHtml(c.code||'')}</h3>
          <div class="muted">${escapeHtml(t('account_coupons.amount'))}：NT$ ${Number(c.amount||0)}｜${escapeHtml(typeLabel(c))}</div>
          <div class="muted">${escapeHtml(t('account_coupons.issued'))}：${c.issuedAt ? new Date(c.issuedAt).toLocaleString('zh-TW') : '—'}</div>
          <div class="muted">${escapeHtml(usageText(c))}</div>
          ${c.startAt ? `<div class="muted">${escapeHtml(t('account_coupons.starts'))}：${new Date(c.startAt).toLocaleString('zh-TW')}</div>` : ''}
          ${c.expireAt ? `<div class="muted">${escapeHtml(t('account_coupons.expires'))}：${new Date(c.expireAt).toLocaleString('zh-TW')}</div>` : ''}
          ${c.usedAt ? `<div class="muted">${escapeHtml(t('account_coupons.used_at'))}：${new Date(c.usedAt).toLocaleString('zh-TW')}</div>` : ''}
          ${c.orderId ? `<div class="muted">${escapeHtml(t('account_coupons.used_order'))}：${escapeHtml(c.orderId)}</div>` : ''}
          <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;">${chips.join('')}</div>
        </div>
        <div class="actions">
          <button class="btn" data-act="copy" data-code="${escapeHtml(c.code||'')}">${escapeHtml(t('account_coupons.copy'))}</button>
          ${used ? '' : `<button class="btn primary" data-act="apply" data-code="${escapeHtml(c.code||'')}" data-deity="${escapeHtml(c.deity||'')}" data-amount="${Number(c.amount||0)}" data-type="${escapeHtml(c.type||'DEITY')}">${escapeHtml(t('account_coupons.apply'))}</button>`}
        </div>
      </div>`;
    }).join('');
  }

  async function load(){
    listEl.innerHTML = '<div class="muted">' + escapeHtml(t('account.loading')) + '</div>';
    try{
      const res = await fetch('/api/me/coupons?mark=1',{credentials:'include',cache:'no-store'});
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data.ok) throw new Error(data.error||('HTTP '+res.status));
      items = Array.isArray(data.items) ? data.items : [];
      render();
    }catch(err){
      listEl.innerHTML = `<div class="muted">${escapeHtml(t('account_coupons.load_failed'))}：${escapeHtml(err.message||err)}</div>`;
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
    }catch(err){ alert(t('account_coupons.add_failed') + '：' + (err.message||err)); }
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
      alert(t('account_coupons.apply_ok'));
    }catch(_){ alert(t('account_coupons.apply_failed')); }
  }

  listEl.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const code = btn.dataset.code;
    if (act === 'copy'){
      navigator.clipboard && navigator.clipboard.writeText(code).catch(()=>{});
      btn.textContent = t('account_coupons.copied'); setTimeout(()=> btn.textContent=t('account_coupons.copy'), 800);
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
  if (window.UC_I18N){
    window.addEventListener('uc_lang_change', ()=>{ render(); });
  }
  load();
