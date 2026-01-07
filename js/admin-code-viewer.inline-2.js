const API_BASE = window.__SHOP_ORIGIN || 'https://shop.unalomecodes.com';
function authHeaders(extra){
  const base = {};
  if (extra) return Object.assign(base, extra);
  return base;
}
const $ = (s)=>document.querySelector(s);
function toast(msg){ $('#log').textContent = msg; }
function esc(s){ return String(s||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }

function toDeityCode(name=''){
  const s = String(name||'').trim();
  if (!s) return '';
  const u = s.toUpperCase();
  if (/^[A-Z]{2}$/.test(u)) return u;
  if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/.test(s)) return 'FM';
  if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/.test(s))   return 'GA';
  if (/崇迪|SOMDEJ|SOMDET/.test(s))                      return 'CD';
  if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/.test(s))  return 'KP';
  if (/哈魯曼|H(AN|AR)UMAN/.test(s))                     return 'HM';
  if (/拉胡|RAHU/.test(s))                                return 'RH';
  if (/迦樓羅|GARUDA|K(AR|AL)UDA/.test(s))               return 'JL';
  if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/.test(s)) return 'ZD';
  if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/.test(s))          return 'ZF';
  if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/.test(s)) return 'WE';
  if (/徐祝|XU\s*ZHU|XUZHU/.test(s))                     return 'XZ';
  if (/魂魄勇|HUN\s*PO\s*YONG|HPY/.test(s))              return 'HP';
  return '';
}

function storyCodeFromProduct(p){
  if (p && p.deityCode) {
    const c = String(p.deityCode).trim().toUpperCase();
    if (c) return c;
  }
  const guess = toDeityCode((p && (p.deity || p.name)) || '');
  if (guess) return guess;
  if (p && p.id) return String(p.id).trim().toUpperCase();
  return '';
}

function storyCodeFromService(s){
  if (!s) return '';
  if (s.reviewCode) {
    const rc = String(s.reviewCode).trim().toUpperCase();
    if (rc) return rc;
  }
  if (s.deityCode) {
    const dc = String(s.deityCode).trim().toUpperCase();
    if (dc) return dc;
  }
  const guess = toDeityCode((s && (s.deity || s.name)) || '');
  if (guess) return guess;
  if (s.id) return String(s.id).trim().toUpperCase();
  return '';
}

async function loadProducts(){
  const list = $('#productList');
  list.textContent = '載入中...';
  try{
    const fetchProducts = fetch(API_BASE + '/api/products',{cache:'no-store', headers: authHeaders(), credentials:'include'})
      .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .catch(err=>({ error: err.message, items: [] }));
    const fetchServices = fetch(API_BASE + '/api/service/products',{cache:'no-store', headers: authHeaders(), credentials:'include'})
      .then(r=> r.ok ? r.json() : ({ items: [] }))
      .catch(()=>({ items: [] }));
    const [prodData, svcData] = await Promise.all([fetchProducts, fetchServices]);
    const combined = [];
    (Array.isArray(prodData.items) ? prodData.items : []).forEach(p=>{
      combined.push({ type:'physical', raw:p, code: storyCodeFromProduct(p) });
    });
    (Array.isArray(svcData.items) ? svcData.items : []).forEach(s=>{
      combined.push({ type:'service', raw:s, code: storyCodeFromService(s) });
    });
    if (!combined.length){
      list.textContent = '目前沒有可用的商品或服務';
      return;
    }
    list.innerHTML = combined.map(item => {
      const p = item.raw || {};
      const typeLabel = item.type === 'service'
        ? '<span class="badge">服務商品</span>'
        : '<span class="badge">實體商品</span>';
      return `
        <div class="item" data-type="${esc(item.type)}" data-id="${esc(p.id||'')}" data-name="${esc(p.name||'')}" data-deity-code="${esc(item.code)}">
          <div class="title">${p.name ? esc(p.name) : '（未命名）'}</div>
          <div class="id">ID：${esc(p.id||'(無 ID)')}</div>
          <div class="row" style="margin:4px 0 6px;gap:6px;flex-wrap:wrap;">
            ${typeLabel}
            ${p.deity ? `<span class="badge">神祇：${esc(p.deity)}</span>` : ''}
          </div>
          <div class="row">
            <button class="btn primary" data-act="open">查看留言</button>
          </div>
        </div>
      `;
    }).join('');
    list.onclick = handleListAction;
  }catch(e){
    $('#productList').textContent = '讀取失敗：' + e.message;
  }
}

function handleListAction(e){
  const t = e.target;
  if (!(t instanceof Element)) return;
  const act = t.getAttribute('data-act');
  if (!act) return;
  const wrap = t.closest('.item');
  if (!wrap) return;
  const deityCode = (wrap.getAttribute('data-deity-code')||'').trim().toUpperCase();
  const name = wrap.getAttribute('data-name') || '';
  if (!deityCode) return toast('找不到此商品的神祇代碼 (deityCode)');

  if (act === 'open'){
    openOverlay(deityCode, name);
  }
}

async function fetchStories(code){
  const realCode = (code || '').toString().trim().toUpperCase();
  if (!realCode) throw new Error('缺少神祇代碼');
  const r = await fetch(API_BASE + '/api/stories?code=' + encodeURIComponent(realCode), { cache:'no-store', headers: authHeaders(), credentials:'include' });
  const js = await r.json();
  return js;
}

/* overlay logic */
const overlay = $('#overlay');
const ovCode = $('#ovCode');
const ovTitle = $('#ovTitle');
const ovList = $('#ovList');

$('#ovClose').onclick = ()=> overlay.style.display = 'none';

async function openOverlay(code, name){
  ovCode.textContent = code;
  if (ovTitle){
    ovTitle.textContent = name ? `留言管理｜${name}` : '留言管理';
  }
  ovList.textContent = '載入中…';
  overlay.style.display = 'block';
  try{
    const data = await fetchStories(code);
    renderMessages(code, data);
  }catch(e){
    ovList.textContent = '讀取留言失敗：' + e.message;
  }
}

function renderMessages(code, data){
    const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    if (!arr.length){
      ovList.innerHTML = ''; // Let CSS handle the empty state message
      return;
    }
    ovList.innerHTML = arr.map(m => `
      <div class="msg" data-id="${esc(m.id||'')}">
        ${m.imageUrl ? `<div class="msg-left"><img src="${esc(m.imageUrl)}" class="msg-img" alt="留言圖片"></div>` : ''}
        <div class="msg-body">
          <div class="msg-head">
            <div class="msg-nick">${esc(m.nick || '匿名')}</div>
            <div class="msg-date">${m.ts ? new Date(m.ts).toLocaleString() : '-'}</div>
          </div>
          <div class="msg-text">${esc(m.msg||m.text||'')}</div>
          <div class="msg-actions"><button class="btn danger del-one" data-act="del-one">刪除此則</button></div>
        </div>
      </div>
    `).join('');

    // Add event listener for image lightbox
    ovList.querySelectorAll('.msg-img').forEach(img => {
      img.addEventListener('click', (e) => {
        const lightbox = document.getElementById('imageLightbox');
        const lightboxImg = document.getElementById('imageLightboxImg');
        lightboxImg.src = e.target.src;
        lightbox.style.display = 'flex';
      });
    });

    ovList.onclick = async (e)=>{
      const t = e.target;
      if (!(t instanceof Element) || !t.classList.contains('del-one')) return;
      const msgEl = t.closest('.msg');
      const mid = msgEl && msgEl.getAttribute('data-id');
      if (!mid) return alert('找不到留言ID');
      if (!confirm('確定要刪除此則留言？')) return;
      t.disabled = true;
      try{
        const rr = await fetch(API_BASE + '/api/stories?code=' + encodeURIComponent(code) + '&id=' + encodeURIComponent(mid) + '&_method=DELETE', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ _method: 'DELETE' }),
          credentials:'include'
        });
        if (!rr.ok) throw new Error('HTTP '+rr.status);
        // After deletion, re-fetch and re-render to update the list
        const updatedData = await fetchStories(code);
        renderMessages(code, updatedData);
      }catch(err){
        alert('刪除失敗：'+err.message);
      }finally{
        t.disabled = false;
      }
    };
}

document.addEventListener('DOMContentLoaded', loadProducts);

// Close image lightbox when clicking it
document.getElementById('imageLightbox').addEventListener('click', (e) => {
  e.currentTarget.style.display = 'none';
});
