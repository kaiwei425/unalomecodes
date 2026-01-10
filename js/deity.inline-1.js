(function(){
  const DATA = window.DEITY_DATA || {};
  const LOCAL_IMG = DATA.images || {};
  const LOCAL_STORIES = DATA.stories || {};
  const LOCAL_DESC = DATA.desc || {};
  const NAME_MAP = DATA.names || {};
  const NAME_MAP_EN = DATA.namesEn || {};
  const DESC_EN = DATA.descEn || {};
  const WEAR_GUIDE = DATA.wear || {};
  const TEMPLE_GUIDES = DATA.templeGuides || {};
  const DEITY_ORDER = DATA.order || [];

  const hasDeityPage = document.getElementById('deityListSection') || document.getElementById('deityName');
  if (!hasDeityPage) return;

  const params = new URLSearchParams(location.search);
  // temple guide rendering function
  function renderTempleGuide(code){
    const box = document.getElementById('templeGuide');
    const data = TEMPLE_GUIDES[code];
    if (!box || !data) { if (box) box.style.display='none'; return; }

    const li = arr => (arr||[]).map(t => `<li>${escapeHtml(t)}</li>`).join('');
    const vids = (data.videos||[]).map(v => `
      <a href="${v.url}" target="_blank" rel="noopener"
         style="display:inline-block;background:#eab308;color:#111827;padding:10px 14px;border-radius:10px;
                text-decoration:none;font-weight:800;margin-right:10px;margin-top:8px;">
        ${escapeHtml(v.label)}
      </a>
    `).join('');

    let inner = `
      <h2>🛕 跑廟指南</h2>
      <div class="muted" style="margin:6px 0 10px">${escapeHtml(data.place)}</div>
      <div class="row" style="gap:8px;align-items:flex-start;margin:8px 0 6px">
        <div class="badge">交通方式</div>
        <div>${escapeHtml(data.transport || '—')}</div>
      </div>
    `;

    if (data.desc) {
      inner += `
        <div style="margin:10px 0 4px;font-weight:700">寺院介紹：</div>
        <div style="line-height:1.8;white-space:pre-wrap">${escapeHtml(data.desc)}</div>
      `;
    }

    if (Array.isArray(data.etiquette) && data.etiquette.length){
      inner += `
        <div style="margin:10px 0 4px;font-weight:700">禮儀提醒：</div>
        <ul style="margin:6px 0 12px;padding-left:18px;line-height:1.8">${li(data.etiquette)}</ul>
      `;
    }

    if (Array.isArray(data.steps) && data.steps.length){
      inner += `
        <div style="margin:10px 0 4px;font-weight:700">建議流程：</div>
        <ol style="margin:6px 0 8px;padding-left:18px;line-height:1.8">${li(data.steps)}</ol>
      `;
    }

    if (vids) {
      inner += `<div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">${vids}</div>`;
    }

    box.innerHTML = inner;
    box.style.display = 'block';
  }
  const code = (params.get('code')||'').toUpperCase();
  const API_BASE = ((params.get('api')||'').replace(/\/$/,'') || location.origin);
  const API = API_BASE.endsWith('/api') ? API_BASE : (API_BASE + '/api');
  const $ = s => document.querySelector(s);
  const ADMIN_MODE = !!params.get('admin');
  const HIDE_KEY = 'hideStories';
  function getHidden(){ try{ return JSON.parse(localStorage.getItem(HIDE_KEY)||'{}'); }catch{return {}} }
  function setHidden(obj){ localStorage.setItem(HIDE_KEY, JSON.stringify(obj)); }

  let toastTimer=null;
  function showToast(t){
    const el = $('#toast');
    el.textContent = t || 'OK';
    el.style.display='block';
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=> el.style.display='none',1600);
  }

  async function fetchJson(url, opt){
    const r = await fetch(url, opt);
    if (!r.ok) throw new Error('bad');
    return await r.json();
  }

  async function loadDeity(){
    if (!code){
      const listSection = document.getElementById('deityListSection');
      const heroSection = document.querySelector('.hero');
      const gridSection = document.querySelector('.grid');
      if (heroSection) heroSection.style.display = 'none';
      if (gridSection) gridSection.style.display = 'none';
      if (listSection) listSection.style.display = 'block';
      renderDeityList();
      return;
    }
    const listSection = document.getElementById('deityListSection');
    const heroSection = document.querySelector('.hero');
    const gridSection = document.querySelector('.grid');
    if (listSection) listSection.style.display = 'none';
    if (heroSection) heroSection.style.display = '';
    if (gridSection) gridSection.style.display = '';
    try{
      let j=null;
      try{ j = await fetchJson(`${API_BASE}/getDeity?code=${encodeURIComponent(code)}&detail=full`); }
      catch{
        try{ j = await fetchJson(`${API}/getDeity?code=${encodeURIComponent(code)}&detail=full`); }
        catch{ try{ j = await fetchJson(`${API_BASE}/deityMeta?code=${encodeURIComponent(code)}`); }catch{} }
      }
      const local = LOCAL_DESC[code] || '';
      const name  = (j && j.name) || guessName(code);
      const img   = LOCAL_IMG[code] || ((j && j.img)  || '');
      const full  = local || (j && (j.desc_full || j.desc)) || '—';
      $('#deityName').textContent = name || '守護神';
      if (img){
        const hero = document.getElementById('heroImg');
        hero.setAttribute('crossorigin','anonymous');
        hero.setAttribute('referrerpolicy','no-referrer');
        // 嘗試載入，若失敗則移除 CORS 再重試一次
        hero.onerror = () => {
          hero.removeAttribute('crossorigin');
          const retry = img + (img.includes('?') ? '&' : '?') + 't=' + Date.now();
          hero.src = retry;
          hero.onerror = () => {
            showToast('圖片載入失敗，將以文字卡顯示');
          };
        };
        hero.src = img;
      }
      $('#deityDesc').textContent = full;
      document.title = (name||'神祇介紹') + '｜神祇介紹';
      renderTempleGuide(code);
    }catch(e){
      $('#deityName').textContent='載入失敗';
      $('#deityDesc').textContent= LOCAL_DESC[code] || '請稍後再試';
      renderTempleGuide(code);
    }
  }
  function guessName(code){
    return NAME_MAP[code] || '守護神';
  }
  function shortDesc(text, len=88){
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '點擊查看完整介紹與故事分享。';
    return clean.length > len ? clean.slice(0, len) + '…' : clean;
  }
  function renderDeityList(){
    const grid = document.getElementById('deityListGrid');
    if (!grid) return;
    const items = DEITY_ORDER.map(code=>({
      code,
      name: guessName(code),
      img: LOCAL_IMG[code] || '',
      desc: shortDesc(LOCAL_DESC[code] || '')
    }));
    if (!items.length){
      grid.innerHTML = '<div class="muted">尚無神祇資料</div>';
      return;
    }
    grid.innerHTML = items.map(it=>{
      const img = it.img ? `<img src="${it.img}" alt="${escapeHtml(it.name)}">` : '';
      return `
        <a class="list-card" href="/deity?code=${encodeURIComponent(it.code)}">
          <div class="list-img">${img}</div>
          <div class="list-title">
            <span>${escapeHtml(it.name)}</span>
            <span class="list-code">${escapeHtml(it.code)}</span>
          </div>
          <div class="list-desc">${escapeHtml(it.desc)}</div>
        </a>
      `;
    }).join('');
  }

  // 產生卡片截圖並顯示在下方（長按可存）
  async function captureCardToImage(){
    try{
      const name = (document.getElementById('deityName').textContent||'').trim();
      const desc = (document.getElementById('deityDesc').textContent||'').trim();
      const imgEl = document.getElementById('heroImg');
      const card = document.getElementById('heroCard');
      const rect = card.getBoundingClientRect();

      const scale = 2; // 高解析輸出
      const pad = 24;  // 內距
      const W = Math.max(720, Math.round(rect.width));
      const H = Math.max(900, Math.round(rect.height));

      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // 背景漸層
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#0b1022');
      g.addColorStop(1,'#0f172a');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,W,H);

      // 繪製卡片底
      const radius = 16;
      function roundRect(x,y,w,h,r){
        ctx.beginPath();
        ctx.moveTo(x+r,y);
        ctx.arcTo(x+w,y,x+w,y+h,r);
        ctx.arcTo(x+w,y+h,x,y+h,r);
        ctx.arcTo(x,y+h,x,y,r);
        ctx.arcTo(x,y,x+w,y,r);
        ctx.closePath();
      }
      ctx.fillStyle = 'rgba(17,24,39,0.85)';
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      roundRect(8,8,W-16,H-16,radius);
      ctx.fill();
      ctx.stroke();

      // 圖片
      let imgDrawn = false;
      if (imgEl && imgEl.src){
        const tmp = new Image();
        tmp.crossOrigin = 'anonymous';
        const loaded = await new Promise(res=>{ tmp.onload=()=>res(true); tmp.onerror=()=>res(false); tmp.src = imgEl.src; });
        if (loaded){
          const boxW = W - pad*2;
          const boxH = Math.round((boxW) * 9/16);
          // 圖片置中等比
          const r = Math.min(boxW/tmp.naturalWidth, boxH/tmp.naturalHeight);
          const dw = Math.round(tmp.naturalWidth * r);
          const dh = Math.round(tmp.naturalHeight * r);
          const dx = Math.round((W - dw)/2);
          const dy = pad + 8;
          ctx.drawImage(tmp, dx, dy, dw, dh);
          imgDrawn = true;
        }
      }

      // 標題
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '700 24px ui-sans-serif, system-ui, -apple-system';
      ctx.textBaseline = 'top';
      ctx.fillText(name||'守護神', pad, (imgDrawn ? Math.round(pad + 8 + (W - pad*2) * 9/16 + 12) : pad+12));

      // 內文換行繪製
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '16px ui-sans-serif, system-ui, -apple-system';
      const textX = pad;
      const textY = (imgDrawn ? Math.round(pad + 8 + (W - pad*2) * 9/16 + 44) : pad + 44);
      const textMaxW = W - pad*2;
      const lineH = 26;
      function wrapText(text){
        const words = text.replace(/\s+/g,' ').split(' ');
        let line = '', lines = [];
        for (let w of words){
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > textMaxW){
            if (line) lines.push(line);
            line = w;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        return lines;
      }
      const lines = wrapText(desc);
      let y = textY;
      for (let i=0; i<lines.length && y < H - pad - lineH; i++){
        ctx.fillText(lines[i], textX, y);
        y += lineH;
      }

      // 產出圖並顯示
      const dataURL = canvas.toDataURL('image/png');
      const out = document.createElement('img');
      out.alt = '長按儲存圖片';
      out.src = dataURL;
      const boxOut = document.getElementById('shotBox');
      boxOut.innerHTML = '';
      boxOut.appendChild(out);
      // 下載連結備用（部分 LINE 版本長按儲存會不穩定）
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = (name||'blessing') + '.png';
      a.textContent = '如果無法長按儲存，點此下載圖片';
      a.style.display = 'inline-block';
      a.style.marginTop = '8px';
      a.style.fontSize = '12px';
      a.style.color = '#93c5fd';
      boxOut.appendChild(a);
      showToast('已準備好圖片，長按即可儲存');
    }catch(err){
      showToast('產生圖片時發生問題，請再試一次');
    }
  }

  const shareBtn = document.getElementById('shareBtn'); if (shareBtn) shareBtn.addEventListener('click', captureCardToImage);

  async function loadStories(){
    if (!code) return;
    const inlineBox = document.getElementById('storyListInline');
    const fallbackBox = document.getElementById('storyList');
    const box = inlineBox || fallbackBox;
    if (fallbackBox && inlineBox) { fallbackBox.style.display = 'none'; }
    box.innerHTML = '<div class="muted">載入中…</div>';
    try{
      let j;
      j = await fetchJson(`${API}/stories?code=${encodeURIComponent(code)}`);
      j = { items: (j.items||[]).map(it => ({ id: it.id || it._id || it.ts, nick: it.nick || it.user || '匿名', msg: it.msg || it.text || '', ts: it.ts })) };
      const localList = Array.isArray(LOCAL_STORIES[code]) ? LOCAL_STORIES[code] : [];
      const apiList = (j && Array.isArray(j.items)) ? j.items : [];
      const list = (apiList.length || localList.length) ? localList.concat(apiList) : [];
      const hidden = getHidden();
      const hiddenSet = new Set((hidden[code]||[]).map(String));
      const visible = list.filter(it => !hiddenSet.has(String(it.ts || it.id)));
      if (!visible.length){
        const none = LOCAL_STORIES[code] || [];
        if (none.length){
          box.innerHTML = '';
          none.forEach(it=>{
            const d = new Date(it.ts||Date.now());
            const t = d.toLocaleString('zh-TW',{hour12:false});
            const div = document.createElement('div');
            div.className='bubble';
            div.innerHTML = `
              <div class="nick">👤 ${escapeHtml(it.nick||'匿名')}</div>
              <div class="msg">${escapeHtml(it.msg||'')}</div>
              <div class="time">🕰 ${t}</div>`;
            box.appendChild(div);
          });
          return;
        }
        box.innerHTML = '<div class="muted">還沒有分享，成為第一位與大家說說你與祂的小故事吧！</div>';
        return;
      }
      box.innerHTML='';
      visible.forEach(it=>{
        const d = new Date(it.ts||Date.now());
        const t = d.toLocaleString('zh-TW',{hour12:false});
        const div = document.createElement('div');
        div.className='bubble';
        div.innerHTML = `
          <div class="row"><div class="nick">👤 ${escapeHtml(it.nick||'匿名')}</div>${ADMIN_MODE?'<button class="delBtn">刪除</button>':'<button class="delBtn">隱藏</button>'}</div>
          <div class="msg">${escapeHtml(it.msg||'')}</div>
          <div class="time">🕰 ${t}${ADMIN_MODE?`<span class="delWarn">管理模式</span> <span class="muted">#${escapeHtml(String(it.id||it.ts||''))}</span>`:''}</div>`;
        box.appendChild(div);
        const btn = div.querySelector('.delBtn');
        btn.addEventListener('click', async ()=>{
          if (ADMIN_MODE){
            if (!confirm('確定要刪除此則留言嗎？')) return;
            await deleteStory(it);
          }else{
            hideStoryLocal(it);
          }
        });
      });
    }catch{ (inlineBox || document.getElementById('storyList')).innerHTML='<div class="muted">載入失敗</div>'; }
  }
  async function deleteStory(it){
    const id = it.id || it.ts;
    const payload = { code, id, ts: it.ts };
    const headers = { 'Content-Type':'application/json' };

    async function tryOne(url, method='POST'){
      try{
        const r = await fetch(url, { method, headers, body: JSON.stringify(payload), credentials: 'include' });
        if (r.ok) return true;
      }catch{}
      return false;
    }

    let ok = false;
    // 舊路徑兼容
    ok = ok || await tryOne(`${API_BASE}/story/delete`, 'POST');
    ok = ok || await tryOne(`${API_BASE}/story/delete`, 'DELETE');
    ok = ok || await tryOne(`${API_BASE}/stories/delete`, 'POST');
    ok = ok || await tryOne(`${API_BASE}/stories?code=${encodeURIComponent(code)}&delete=1`, 'POST');
    // 新 API
    if (!ok && id){
      try{
        const r = await fetch(`${API}/stories?code=${encodeURIComponent(code)}&id=${encodeURIComponent(String(id))}`, { method:'DELETE', credentials:'include' });
        ok = r.ok;
      }catch{}
    }
    // REST 風格
    if (!ok && id){
      try{ const r = await fetch(`${API_BASE}/story/${encodeURIComponent(String(id))}`, { method:'DELETE', credentials:'include' }); ok = r.ok; }catch{}
    }
    // 極端相容：GET 刪除（不建議，但有些舊 API 這樣做）
    if (!ok && id){
      try{ const r = await fetch(`${API_BASE}/story/delete?id=${encodeURIComponent(String(id))}&code=${encodeURIComponent(code)}&ts=${encodeURIComponent(String(it.ts||''))}`, { method:'GET', credentials:'include' }); ok = r.ok; }catch{}
    }

    if (ok){ showToast('已刪除'); loadStories(); }
    else { showToast('刪除失敗，後端未提供相容的刪除端點'); }
  }

  function hideStoryLocal(it){
    const h = getHidden();
    const arr = h[code] || [];
    const key = String(it.ts || it.id);
    if (!arr.includes(key)) arr.push(key);
    h[code] = arr;
    setHidden(h);
    showToast('此則已在本機隱藏');
    loadStories();
  }

  document.getElementById('sendBtn').addEventListener('click', async () => {
    const nick = document.getElementById('nick').value.trim().slice(0,20) || '匿名';
    const msg  = document.getElementById('msg').value.trim();
    if (msg.length < 6){ showToast('再多寫一點點吧（至少6字）'); return; }
    if (msg.length > 280){ showToast('太長啦（最多280字）'); return; }
    try{
      try{
        const r = await fetch(`${API}/stories`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ code, nick, msg })
        });
        const j = await r.json();
        if (!r.ok) throw j;
      }catch{
        const r = await fetch(`${API_BASE}/story/add`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ code, user:nick, text:msg })
        });
        const j = await r.json();
        if (!r.ok) throw j;
      }
      document.getElementById('msg').value='';
      showToast('已送出');
      loadStories();
    }catch(e){
      const err = (e&&e.error)||'送出失敗';
      showToast(err==='too_fast'?'稍等一下再送唷':(err==='too_short'?'再多寫一點點吧':'送出失敗'));
    }
  });

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  loadDeity();
  loadStories();
})();
