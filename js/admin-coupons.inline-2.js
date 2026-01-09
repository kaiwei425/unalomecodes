  const DEITY_LABELS = {
    FM:'四面神（FM）',
    GA:'象神（GA）',
    CD:'崇迪（CD）',
    KP:'坤平（KP）',
    HM:'哈魯曼（HM）',
    RH:'拉胡（RH）',
    JL:'迦樓羅（JL）',
    ZD:'澤度金（ZD）',
    ZF:'招財女神（ZF）',
    WE:'五眼四耳（WE）',
    XZ:'徐祝老人（XZ）',
    HP:'魂魄勇（HP）'
  };
  const NAME_TO_CODE = {};
  Object.entries(DEITY_LABELS).forEach(([code,label])=>{
    const plain = label.replace(/（.*?）/g,'').trim().replace(/\s+/g,'');
    NAME_TO_CODE[plain] = code;
  });
  const TYPE_LABELS = { DEITY:'神祇券', ALL:'全館券', SHIP:'免運券' };
  function escapeHtml(input){
    return String(input ?? '').replace(/[&<>"']/g, (m)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }
  function toISO(val){
    if (!val) return undefined;
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return undefined;
    return dt.toISOString();
  }
  const FALLBACK_DEITIES = Object.keys(DEITY_LABELS);
  function fmtDate(val){
    if (!val) return '';
    try{ return new Date(val).toLocaleString('zh-TW'); }catch(_){ return ''; }
  }
  async function loadDeities(){
    const sel = document.getElementById('cpnDeity');
    sel.innerHTML = '<option value="">載入中...</option>';
    const set = new Set(FALLBACK_DEITIES);
    try{
      const res = await fetch('/api/products?active=true',{cache:'no-store'});
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach(p=>{
        const candidates = [];
        if (p && p.deity) candidates.push(String(p.deity));
        if (p && p.deityCode) candidates.push(String(p.deityCode));
        candidates.forEach(raw=>{
          let code = '';
          const up = raw.trim().toUpperCase();
          if (/^[A-Z]{2}$/.test(up)) code = up;
          else if (DEITY_LABELS[up]) code = up;
          else {
            const flat = raw.replace(/\s+/g,'');
            if (NAME_TO_CODE[flat]) code = NAME_TO_CODE[flat];
          }
          if (code) set.add(code);
        });
      });
      const list = Array.from(set).filter(v=>/^[A-Z]{2}$/.test(v)).sort(); // 僅保留兩碼代碼，避免重複中文名稱
      if (!list.length){
        sel.innerHTML = '<option value="">尚未找到守護神代碼</option>';
      }else{
        sel.innerHTML = '<option value="">請選擇守護神</option>';
        list.forEach(code=>{
          const opt = document.createElement('option');
          opt.value = code;
          opt.textContent = DEITY_LABELS[code] || code;
          sel.appendChild(opt);
        });
      }
    }catch(_){
      sel.innerHTML = '<option value="">無法載入守護神</option>';
    }
  }
  const typeSelect = document.getElementById('cpnType');
  const deitySelect = document.getElementById('cpnDeity');
  function syncDeityDisabled(){
    const t = (typeSelect.value||'DEITY').toUpperCase();
    const disable = t !== 'DEITY';
    deitySelect.disabled = disable;
    if (disable){
      deitySelect.value = '';
    }
  }
  typeSelect.addEventListener('change', syncDeityDisabled);
  async function issue(){
    const type = (typeSelect.value||'DEITY').toUpperCase();
    const deityRaw = (document.getElementById('cpnDeity').value||'').trim().toUpperCase();
    const deity = type === 'DEITY' ? deityRaw : type;
    const amount = Number(document.getElementById('cpnAmount').value||200)||200;
    const startAtVal = document.getElementById('cpnStart').value;
    const expireVal = document.getElementById('cpnExpire').value;
    const resBox = document.getElementById('cpnResult');
    const errBox = document.getElementById('cpnError');
    resBox.style.display='none'; errBox.style.display='none';
    if (!deity){
      errBox.textContent = '請輸入守護神代碼（如 FM / GA / XZ）';
      errBox.style.display='block';
      return;
    }
    try{
      const resp = await fetch('/api/coupons/issue', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          deity,
          type,
          amount,
          startAt: toISO(startAtVal),
          expireAt: toISO(expireVal)
        }),
        credentials:'include'
      });
      const data = await resp.json().catch(()=>({}));
      if (!resp.ok || !data || !data.code){
        const msg = (data && (data.error || data.reason)) || ('HTTP '+resp.status);
        throw new Error(msg);
      }
      resBox.innerHTML = [
        `優惠碼：${escapeHtml(data.code)}`,
        `類型：${escapeHtml(TYPE_LABELS[type]||type)}｜守護神：${escapeHtml(data.deity || deity)}｜折抵：NT$ ${Number(data.amount||amount)}`
      ].join('<br>');
      resBox.style.display='block';
      try{ navigator.clipboard.writeText(data.code); }catch(_){}
    }catch(err){
      errBox.textContent = err.message || '發券失敗';
      errBox.style.display='block';
    }
  }
  document.getElementById('btnIssue').addEventListener('click', issue);
  document.getElementById('btnClear').addEventListener('click', ()=>{
    document.getElementById('cpnResult').style.display='none';
    document.getElementById('cpnError').style.display='none';
  });
  async function issueBatch(){
    const type = (document.getElementById('batchType').value||'ALL').toUpperCase();
    const amount = Number(document.getElementById('batchAmount').value||0)||0;
    const startAt = document.getElementById('batchStart').value;
    const expireAt = document.getElementById('batchExpire').value;
    const target = (document.getElementById('batchTarget').value||'all').toLowerCase();
    const box = document.getElementById('batchMsg');
    box.style.display='none';
    if (amount<=0){
      alert('請輸入折抵金額');
      return;
    }
    try{
      const resp = await fetch('/api/coupons/issue-batch', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({
          type,
          amount,
          target,
          startAt: toISO(startAt),
          expireAt: toISO(expireAt)
        })
      });
      const data = await resp.json().catch(()=>({}));
      if (!resp.ok || !data.ok){
        throw new Error(data.error || ('HTTP '+resp.status));
      }
      box.textContent = `已發放 ${data.issued || 0} / ${data.total || 0} 位會員。`;
      box.style.display='block';
      await loadList();
    }catch(err){
      alert('批次發放失敗：'+(err.message||err));
    }
  }
  document.getElementById('btnBatch').addEventListener('click', issueBatch);
  // 列表
  const qInput = document.getElementById('q');
  const usedSel = document.getElementById('filterUsed');
  const listBody = document.getElementById('cpnList');
  const globalPanel = document.getElementById('globalPanel');
  const globalList = document.getElementById('globalList');
  let lastFetched = [];
  async function loadList(){
    if (listBody) listBody.innerHTML = '<tr><td colspan="10" class="muted">載入中…</td></tr>';
    const q = (qInput.value||'').trim();
    const used = usedSel.value;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (used) params.set('used', used);
    params.set('limit','300');
    try{
      const res = await fetch('/api/coupons/list?'+params.toString(), { credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if (res.status === 401){
        listBody.innerHTML = `<tr><td colspan="10" class="error">請重新以管理員登入後台，再試一次。（需白名單 Google 帳號）</td></tr>`;
        return;
      }
      if (!res.ok || !data.ok){
        throw new Error(data && data.error ? data.error : ('HTTP '+res.status));
      }
      const items = Array.isArray(data.items) ? data.items : [];
      lastFetched = items;
      const deityOnly = items.filter(c=> {
        const t = (c.type||'').toUpperCase();
        return !(t === 'ALL' || t === 'SHIP');
      });
      if (!deityOnly.length){
        listBody.innerHTML = '<tr><td colspan="10" class="muted">目前沒有符合條件的神祇券（此處僅顯示神祇券，ALL/SHIP 請點下方按鈕）</td></tr>';
        return;
      }
      listBody.innerHTML = deityOnly.map(c=>{
        const usedText = c.used ? '已使用' : '未使用';
        const usedCls = c.used ? 'status-used' : 'status-new';
        const issued = fmtDate(c.issuedAt);
        const usedAt = fmtDate(c.usedAt);
        return `<tr>
          <td style="font-weight:800;">${escapeHtml(c.code||'')}</td>
          <td>${escapeHtml(TYPE_LABELS[(c.type||'DEITY').toUpperCase()] || (c.type||'DEITY'))}</td>
          <td>${escapeHtml(c.deity||'')}</td>
          <td>NT$ ${Number(c.amount||0)}</td>
          <td>${fmtDate(c.startAt)||''}</td>
          <td>${fmtDate(c.expireAt)||''}</td>
          <td>${issued}</td>
          <td class="${usedCls}">${usedText}</td>
          <td>${escapeHtml(c.orderId||'')}</td>
          <td>${usedAt||''}</td>
        </tr>`;
      }).join('');
    }catch(err){
      if (listBody) listBody.innerHTML = `<tr><td colspan="10" class="error">讀取失敗：${escapeHtml(err.message||err)}</td></tr>`;
    }
  }
  function renderGlobal(){
    if (!globalList) return;
    const src = Array.isArray(lastFetched) ? lastFetched : [];
    const filtered = src.filter(c=> (c.type||'').toUpperCase()==='ALL' || (c.type||'').toUpperCase()==='SHIP');
    if (!filtered.length){
      globalList.innerHTML = '<tr><td colspan="9" class="muted">目前沒有全館或免運券</td></tr>';
      return;
    }
    globalList.innerHTML = filtered.map(c=>{
      const usedText = c.used ? '已使用' : '未使用';
      const usedCls = c.used ? 'status-used' : 'status-new';
      return `<tr>
        <td style="font-weight:800;">${escapeHtml(c.code||'')}</td>
        <td>${escapeHtml(TYPE_LABELS[(c.type||'').toUpperCase()]||c.type||'')}</td>
        <td>NT$ ${Number(c.amount||0)}</td>
        <td>${fmtDate(c.issuedAt)||''}</td>
        <td>${fmtDate(c.startAt)||''}</td>
        <td>${fmtDate(c.expireAt)||''}</td>
        <td class="${usedCls}">${usedText}</td>
        <td>${escapeHtml(c.orderId||'')}</td>
        <td>${fmtDate(c.usedAt)||''}</td>
      </tr>`;
    }).join('');
  }
  function toggleGlobal(open){
    if (!globalPanel) return;
    globalPanel.style.display = open ? '' : 'none';
    if (open) renderGlobal();
  }
  document.getElementById('btnShowGlobal').addEventListener('click', ()=> toggleGlobal(true));
  document.getElementById('btnCloseGlobal').addEventListener('click', ()=> toggleGlobal(false));
  document.getElementById('btnReload').addEventListener('click', loadList);
  qInput.addEventListener('input', ()=>{ clearTimeout(qInput._t); qInput._t=setTimeout(loadList,300); });
  usedSel.addEventListener('change', loadList);
  loadDeities();
  syncDeityDisabled();
  loadList();
