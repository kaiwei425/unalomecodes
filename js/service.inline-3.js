    (function(){
      const badge = document.getElementById('guardianBadgeSvc');
      const fortuneDialog = document.getElementById('fortuneDialog');
      const fortuneClose = document.getElementById('fortuneClose');
      const fortuneLoading = document.getElementById('fortuneLoading');
      const fortuneError = document.getElementById('fortuneError');
      const fortuneCard = document.getElementById('fortuneCard');
      const fortuneDate = document.getElementById('fortuneDate');
      const fortuneStars = document.getElementById('fortuneStars');
      const fortuneSummary = document.getElementById('fortuneSummary');
      const fortuneAdvice = document.getElementById('fortuneAdvice');
      const fortuneRitual = document.getElementById('fortuneRitual');
      const fortuneMeta = document.getElementById('fortuneMeta');
      const fortuneRitualLabel = document.getElementById('fortuneRitualLabel');
      const fortuneShareBtn = document.getElementById('fortuneShareBtn');
      let lastFortune = null;
      let lastGuardianName = '';
      const map = {FM:'四面神',GA:'象神',CD:'崇迪佛',KP:'坤平',HP:'魂魄勇',XZ:'徐祝老人',WE:'五眼四耳',HM:'猴神哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神'};
      const badgeIcon = (function(){
        if (window.GUARDIAN_BADGE_ICON) return window.GUARDIAN_BADGE_ICON;
        return '/img/guardian-emblem.png';
      })();
      function showDialog(dlg){
        if (!dlg) return;
        if (typeof dlg.showModal === 'function') dlg.showModal();
        else dlg.setAttribute('open', 'open');
      }
      function closeDialog(dlg){
        if (!dlg) return;
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
      }
      function setFortuneLoading(){
        if (fortuneLoading) fortuneLoading.style.display = '';
        if (fortuneError) fortuneError.style.display = 'none';
        if (fortuneCard) fortuneCard.style.display = 'none';
      }
      function setFortuneError(message){
        if (fortuneError){
          fortuneError.textContent = message || '暫時無法取得日籤，請稍後再試。';
          fortuneError.style.display = '';
        }
        if (fortuneLoading) fortuneLoading.style.display = 'none';
        if (fortuneCard) fortuneCard.style.display = 'none';
      }
      function renderFortune(fortune){
        if (!fortune) return;
        lastFortune = fortune;
        if (fortuneDate) fortuneDate.textContent = fortune.date || '';
        if (fortuneStars){
          const stars = fortune.stars || '';
          fortuneStars.textContent = stars;
          fortuneStars.style.display = stars ? '' : 'none';
        }
        if (fortuneSummary) fortuneSummary.textContent = fortune.summary || '';
        if (fortuneAdvice) fortuneAdvice.textContent = fortune.advice || '';
        if (fortuneRitual) fortuneRitual.textContent = fortune.ritual || '';
        if (fortuneMeta){
          const meta = fortune.meta || {};
          const tags = [];
          if (meta.userZodiac){
            const zodiacLabel = meta.userZodiacElement ? `${meta.userZodiac}（${meta.userZodiacElement}象）` : meta.userZodiac;
            tags.push(`星座 ${zodiacLabel}`);
          }
          if (meta.moonPhase) tags.push(`月相 ${meta.moonPhase}`);
          if (meta.iching) tags.push(`易經 ${meta.iching}`);
          if (meta.todayDow) tags.push(`今日星期${meta.todayDow}`);
          if (meta.thaiDayColor) tags.push(`泰國星期色 ${meta.thaiDayColor}`);
          if (meta.buddhistYear) tags.push(`佛曆 ${meta.buddhistYear}`);
          fortuneMeta.innerHTML = tags.map(t=>`<span>${t}</span>`).join('');
        }
        if (fortuneRitualLabel){
          const gName = (fortune.meta && fortune.meta.guardianName) || '';
          lastGuardianName = gName || lastGuardianName;
          fortuneRitualLabel.textContent = gName ? `守護神 ${gName} 想對你說` : '守護神想對你說';
        }
        if (fortuneLoading) fortuneLoading.style.display = 'none';
        if (fortuneError) fortuneError.style.display = 'none';
        if (fortuneCard) fortuneCard.style.display = '';
      }
      async function fetchFortune(){
        setFortuneLoading();
        try{
          const res = await fetch('/api/fortune', { cache:'no-store', credentials:'include' });
          const data = await res.json().catch(()=>({}));
          if (!res.ok || !data || data.ok === false){
            if (data && data.needQuiz) throw new Error('請先完成守護神測驗後再領取日籤。');
            throw new Error((data && data.error) || '取得日籤失敗');
          }
          renderFortune(data.fortune || null);
        }catch(err){
          setFortuneError(err && err.message ? err.message : '暫時無法取得日籤');
        }
      }
      async function openFortuneDialog(){
        if (!fortuneDialog) return;
        const loggedIn = window.authState && typeof window.authState.isLoggedIn==='function' ? window.authState.isLoggedIn() : false;
        if (!loggedIn){
          if (window.authState && typeof window.authState.promptLogin === 'function'){
            window.authState.promptLogin('請先登入後再領取日籤。');
          }
          return;
        }
        showDialog(fortuneDialog);
        await fetchFortune();
      }
      function drawRoundRect(ctx, x, y, w, h, r){
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      }
      function wrapText(ctx, text, x, y, maxWidth, lineHeight){
        const words = String(text || '').split('');
        let line = '';
        for (let i = 0; i < words.length; i++) {
          const test = line + words[i];
          const metrics = ctx.measureText(test);
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i];
            y += lineHeight;
          } else {
            line = test;
          }
        }
        if (line) ctx.fillText(line, x, y);
        return y;
      }
      async function loadImageFromUrl(url){
        try{
          const img = new Image();
          img.crossOrigin = 'anonymous';
          return await new Promise(resolve=>{
            img.onload = ()=> resolve(img);
            img.onerror = ()=> resolve(null);
            img.src = url;
          });
        }catch(_){ return null; }
      }
      async function buildFortuneShareImage(){
        const canvas = document.createElement('canvas');
        const w = 1080;
        const h = 1920;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0b1022';
        ctx.fillRect(0,0,w,h);
        ctx.fillStyle = 'rgba(253,224,71,0.08)';
        ctx.beginPath();
        ctx.arc(200, 160, 220, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(245,158,11,0.08)';
        ctx.beginPath();
        ctx.arc(900, 180, 240, 0, Math.PI * 2);
        ctx.fill();
        const pad = 80;
        ctx.fillStyle = 'rgba(15,23,42,0.9)';
        ctx.strokeStyle = 'rgba(148,163,184,0.25)';
        ctx.lineWidth = 3;
        drawRoundRect(ctx, pad, 150, w - pad * 2, h - 260, 36);
        ctx.fill();
        ctx.stroke();
        const brandImg = document.querySelector('.brand img');
        const preferredLogo = window.UNALOME_LOGO || '/logo.png';
        let logo = await loadImageFromUrl(preferredLogo);
        if (!logo && brandImg && brandImg.src){
          logo = await loadImageFromUrl(brandImg.src);
        }
        if (!logo){
          logo = await loadImageFromUrl('/img/guardian-emblem.png');
        }
        if (logo){
          ctx.drawImage(logo, pad + 40, 190, 88, 88);
        }
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText('unalomecodes', pad + 140, 240);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '800 42px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText('今日專屬日籤', pad + 40, 320);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 24px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText(lastFortune.date || '', pad + 40, 360);
        let summaryStart = lastGuardianName ? 460 : 440;
        if (lastGuardianName){
          ctx.fillStyle = '#cbd5f5';
          ctx.font = '600 24px system-ui, -apple-system, "Segoe UI", sans-serif';
          ctx.fillText(`守護神：${lastGuardianName}`, pad + 40, 398);
        }
        const starLine = lastFortune.stars || '';
        if (starLine){
          ctx.fillStyle = '#fbbf24';
          ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", sans-serif';
          ctx.fillText(starLine, pad + 40, summaryStart);
          summaryStart += 52;
        }
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 32px system-ui, -apple-system, "Segoe UI", sans-serif';
        const summaryEnd = wrapText(ctx, lastFortune.summary || '', pad + 40, summaryStart, w - pad * 2 - 80, 44);
        let y = summaryEnd + 70;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText('生活小建議', pad + 40, y);
        y += 50;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '500 28px system-ui, -apple-system, "Segoe UI", sans-serif';
        const adviceEnd = wrapText(ctx, lastFortune.advice || '', pad + 40, y, w - pad * 2 - 80, 40);
        y = adviceEnd + 70;
        const label = lastGuardianName ? `守護神 ${lastGuardianName} 想對你說` : '守護神想對你說';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 22px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText(label, pad + 40, y);
        y += 50;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '500 28px system-ui, -apple-system, "Segoe UI", sans-serif';
        wrapText(ctx, lastFortune.ritual || '', pad + 40, y, w - pad * 2 - 80, 40);
        return new Promise(resolve=>{
          canvas.toBlob(b=> resolve(b), 'image/png');
        });
      }
      async function shareFortuneImage(){
        if (!lastFortune) return;
        if (fortuneShareBtn) {
          fortuneShareBtn.disabled = true;
          fortuneShareBtn.textContent = '產生中…';
        }
        try{
          const blob = await buildFortuneShareImage();
          if (!blob) throw new Error('圖片產生失敗');
          const fileName = `fortune-${(lastFortune.date || '').replace(/\//g,'-') || 'today'}.png`;
          const file = new File([blob], fileName, { type:'image/png' });
          if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
            await navigator.share({ title:'我的今日日籤', files:[file] });
          }else{
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(()=> URL.revokeObjectURL(url), 500);
          }
        }catch(err){
          if (fortuneError){
            fortuneError.textContent = err && err.message ? err.message : '分享失敗，請稍後再試。';
            fortuneError.style.display = '';
          }
        }finally{
          if (fortuneShareBtn) {
            fortuneShareBtn.disabled = false;
            fortuneShareBtn.textContent = '自動截圖分享';
          }
        }
      }
      function readGuardian(){
        try{
          const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
            ? window.authState.isLoggedIn()
            : false;
          if (loggedIn && window.authState && typeof window.authState.getProfile === 'function'){
            const p = window.authState.getProfile();
            if (p && p.guardian) return p.guardian;
            return null;
          }
          const raw = localStorage.getItem('__lastQuizGuardian__');
          if (raw){
            const obj = JSON.parse(raw);
            if (obj && obj.code) return obj;
          }
          return null;
        }catch(_){ return null; }
      }
      function render(){
        if (!badge) return;
        const loggedIn = window.authState && typeof window.authState.isLoggedIn==='function' ? window.authState.isLoggedIn() : false;
        if (!loggedIn){
          badge.style.display = 'none';
          return;
        }
        const g = readGuardian();
        if (!g){
          badge.style.display = 'none';
          return;
        }
        const code = String(g.code||'').toUpperCase();
        const name = map[code] || '守護神';
        badge.innerHTML = `<img src="${badgeIcon}" alt="守護神"><div class="guardian-meta"><strong>守護神：${name}</strong><button type="button" class="fortune-btn" data-fortune-btn>領取日籤</button></div>`;
        badge.style.display = 'flex';
        const btn = badge.querySelector('[data-fortune-btn]');
        if (btn){
          btn.addEventListener('click', openFortuneDialog);
        }
      }
      if (window.authState && typeof window.authState.onProfile === 'function'){
        window.authState.onProfile(()=>render());
      }
      setTimeout(render, 800);
      render();
      if (fortuneClose){
        fortuneClose.addEventListener('click', ()=> closeDialog(fortuneDialog));
      }
      if (fortuneShareBtn){
        fortuneShareBtn.addEventListener('click', shareFortuneImage);
      }
    })();
  
