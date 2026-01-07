const API_BASE = window.__SHOP_ORIGIN || 'https://shop.unalomecodes.com';
const tbody = document.getElementById('tbody');
const totalEl = document.getElementById('total');
const daysInput = document.getElementById('daysInput');
const gate = document.getElementById('loginGate');

async function authedFetch(url, options){
  const opts = Object.assign({}, options || {});
  opts.credentials = 'include';
  const target = /^https?:/i.test(url) ? url : API_BASE + url;
  const res = await fetch(target, opts);
  if (res.status === 401){
    throw new Error('unauthorized');
  }
  return res;
}

function render(rows){
  const total = rows.reduce((sum, r)=> sum + (Number(r.count)||0), 0);
  if (totalEl) totalEl.textContent = `合計 ${total} 人`;
  tbody.innerHTML = rows.map(r=>(
    `<tr><td>${r.date}</td><td>${r.count}</td></tr>`
  )).join('') || '<tr><td colspan="2" class="muted">目前沒有資料</td></tr>';
}

async function loadStats(){
  if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="muted">載入中…</td></tr>';
  const days = Math.max(1, Math.min(90, parseInt(daysInput.value || '14', 10) || 14));
  try{
    const res = await authedFetch(`/api/admin/fortune-stats?days=${days}`, { cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'load_failed');
    if (gate) gate.style.display = 'none';
    render(Array.isArray(data.days) ? data.days : []);
  }catch(err){
    if (String(err && err.message) === 'unauthorized'){
      if (gate) gate.style.display = 'flex';
      return;
    }
    if (tbody) tbody.innerHTML = `<tr><td colspan="2" class="muted">讀取失敗：${(err && err.message) || err}</td></tr>`;
  }
}

const reloadBtn = document.getElementById('reload');
if (reloadBtn) reloadBtn.addEventListener('click', loadStats);
if (daysInput) daysInput.addEventListener('change', loadStats);

const loginGo = document.getElementById('loginGo');
if (loginGo){
  loginGo.addEventListener('click', ()=>{
    const redirect = encodeURIComponent('/admin/fortune-stats');
    window.location.href = `${API_BASE}/api/auth/google/admin/start?redirect=${redirect}`;
  });
}

loadStats();
