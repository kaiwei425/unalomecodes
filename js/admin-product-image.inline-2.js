(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }

  var els = {
    title: $('imgTitle'),
    badge: $('imgBadge'),
    accent: $('accentColor'),
    bullets: $('bullets'),
    btnAddBullet: $('btnAddBullet'),
    brandText: $('brandText'),
    brandShowMark: $('brandShowMark'),
    productFile: $('productImageFile'),
    btnClearImage: $('btnClearProductImage'),
    removeBg: $('removeBg'),
    pedestalFile: $('pedestalImageFile'),
    btnClearPedestal: $('btnClearPedestalImage'),
    imageScale: $('imageScale'),
    imageRotate: $('imageRotate'),
    footerNote: $('footerNote'),
    btnReset: $('btnResetImageGen'),
    btnDownload: $('btnDownloadProductPng'),
    status: $('imgGenStatus'),
    card: $('imgCard'),
    pvTitle: $('pvImgTitle'),
    pvBadge: $('pvImgBadge'),
    pvBullets: $('pvBullets'),
    pvBrandText: $('pvBrandText'),
    pvBrandMark: $('pvBrandMark'),
    pvPedestal: $('pvPedestal'),
    pvProductImage: $('pvProductImage'),
    pvFooterNote: $('pvFooterNote')
  };

  var STORAGE_KEY = 'adminProductImageDraft:v1';

  var state = {
    title: '',
    badge: '防水殼版',
    accent: '#2e2b7a',
    brandText: 'unalomecodes',
    brandShowMark: true,
    bullets: [
      { h:'虎睡吃・招財法門', b:'主打躺著也能接住財氣\n適合想讓錢慢慢靠過來\n不是拚命追財的那種路線' },
      { h:'強悍東北十三流虎法', b:'源自泰國東北守護日派\n偏實戰型招財與成願法門\n好的進來 壞的自然出去' },
      { h:'穩定財運與貴人緣', b:'不只求錢\n也重視能不能留住資源\n適合需要人脈與助力的人' },
      { h:'擋險守運・長期佩戴型', b:'有助避開不必要的風險\n讓生活與運勢在安全線上\n屬於耐用型、陪伴型聖物' }
    ],
    imageDataUrl: '',
    removeBg: false,
    pedestalDataUrl: '',
    imageScale: 100,
    imageRotate: 0,
    imageX: 0,
    imageY: -16,
    footerNote: ''
  };

  function setStatus(msg, kind){
    if (!els.status) return;
    els.status.classList.remove('is-error','is-ok');
    if (kind === 'error') els.status.classList.add('is-error');
    if (kind === 'ok') els.status.classList.add('is-ok');
    els.status.textContent = msg || '';
  }

  function esc(s){
    return String(s || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function persist(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(_){}
  }

  function hydrate(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY) || '';
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      state.title = typeof data.title === 'string' ? data.title : state.title;
      state.badge = typeof data.badge === 'string' ? data.badge : state.badge;
      state.accent = typeof data.accent === 'string' ? data.accent : state.accent;
      state.brandText = typeof data.brandText === 'string' ? data.brandText : state.brandText;
      state.brandShowMark = (data.brandShowMark !== undefined) ? !!data.brandShowMark : state.brandShowMark;
      state.bullets = Array.isArray(data.bullets) ? data.bullets.slice(0, 10) : state.bullets;
      state.imageDataUrl = typeof data.imageDataUrl === 'string' ? data.imageDataUrl : '';
      state.removeBg = !!data.removeBg;
      state.pedestalDataUrl = typeof data.pedestalDataUrl === 'string' ? data.pedestalDataUrl : '';
      state.imageScale = Number(data.imageScale || 100) || 100;
      state.imageRotate = Number(data.imageRotate || 0) || 0;
      state.imageX = Number(data.imageX || 0) || 0;
      state.imageY = Number((data.imageY !== undefined ? data.imageY : -16)) || -16;
      state.footerNote = typeof data.footerNote === 'string' ? data.footerNote : '';
    }catch(_){}
  }

  function syncInputs(){
    if (els.title) els.title.value = state.title || '';
    if (els.badge) els.badge.value = state.badge || '';
    if (els.accent) els.accent.value = state.accent || '#2e2b7a';
    if (els.brandText) els.brandText.value = state.brandText || '';
    if (els.brandShowMark) els.brandShowMark.value = state.brandShowMark ? '1' : '0';
    if (els.removeBg) els.removeBg.checked = !!state.removeBg;
    if (els.imageScale) els.imageScale.value = String(state.imageScale || 100);
    if (els.imageRotate) els.imageRotate.value = String(state.imageRotate || 0);
    if (els.footerNote) els.footerNote.value = state.footerNote || '';
  }

  function applyImageTransform(){
    if (!els.pvProductImage) return;
    var sc = (Number(state.imageScale || 100) || 100) / 100;
    var rot = Number(state.imageRotate || 0) || 0;
    var x = Number(state.imageX || 0) || 0;
    var y = Number(state.imageY || 0) || 0;
    els.pvProductImage.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + rot + 'deg) scale(' + sc + ')';
  }

  function processRemoveBgIfNeeded(dataUrl){
    if (!state.removeBg) return Promise.resolve(dataUrl);
    return new Promise(function(resolve){
      try{
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function(){
          try{
            var c = document.createElement('canvas');
            c.width = img.naturalWidth || img.width;
            c.height = img.naturalHeight || img.height;
            var ctx = c.getContext('2d', { willReadFrequently:true });
            ctx.drawImage(img, 0, 0);
            var id = ctx.getImageData(0, 0, c.width, c.height);
            var d = id.data;
            for (var i=0;i<d.length;i+=4){
              var r = d[i], g = d[i+1], b = d[i+2];
              if (r > 245 && g > 245 && b > 245){
                d[i+3] = 0;
              } else if (r > 235 && g > 235 && b > 235){
                d[i+3] = Math.min(d[i+3], 80);
              }
            }
            ctx.putImageData(id, 0, 0);
            resolve(c.toDataURL('image/png'));
          }catch(_e){
            resolve(dataUrl);
          }
        };
        img.onerror = function(){ resolve(dataUrl); };
        img.src = dataUrl;
      }catch(_){
        resolve(dataUrl);
      }
    });
  }

  function renderBulletsEditor(){
    if (!els.bullets) return;
    var html = (state.bullets || []).map(function(it, idx){
      return (
        '<div class="bullet" data-idx="' + idx + '">' +
          '<div class="bullet-top">' +
            '<input type="text" data-field="h" value="' + esc(it && it.h || '') + '" placeholder="條列標題">' +
            '<button type="button" class="bullet-del" data-action="del" title="刪除">刪</button>' +
          '</div>' +
          '<textarea rows="3" data-field="b" placeholder="條列內容（可換行）">' + esc(it && it.b || '') + '</textarea>' +
        '</div>'
      );
    }).join('');
    els.bullets.innerHTML = html || '<div style="color:#64748b;font-size:13px;">尚未建立條列。</div>';
  }

  function renderPreview(){
    if (!els.card) return;
    var accent = String(state.accent || '#2e2b7a').trim() || '#2e2b7a';
    try{
      els.card.style.setProperty('--accent', accent);
    }catch(_){}

    if (els.pvTitle) els.pvTitle.textContent = String(state.title || '').trim() || '—';
    if (els.pvBadge) {
      els.pvBadge.textContent = String(state.badge || '').trim() || '—';
    }
    if (els.pvBrandText) els.pvBrandText.textContent = String(state.brandText || '').trim() || 'unalomecodes';
    if (els.pvBrandMark) els.pvBrandMark.style.display = state.brandShowMark ? '' : 'none';
    var brandWrap = els.pvBrandText && els.pvBrandText.parentElement ? els.pvBrandText.parentElement : null;
    if (brandWrap) brandWrap.style.color = accent;

    if (els.pvFooterNote){
      var note = String(state.footerNote || '').trim();
      if (note){
        els.pvFooterNote.textContent = note;
        els.pvFooterNote.style.display = '';
      } else {
        els.pvFooterNote.textContent = '';
        els.pvFooterNote.style.display = 'none';
      }
    }

    if (els.pvPedestal){
      if (state.pedestalDataUrl){
        els.pvPedestal.style.backgroundImage = 'url(' + JSON.stringify(state.pedestalDataUrl) + ')';
        els.pvPedestal.style.border = 'none';
        els.pvPedestal.style.boxShadow = 'none';
        // allow the uploaded PNG to define its own shadow; keep size/position rules from CSS
      } else {
        els.pvPedestal.style.backgroundImage = '';
        els.pvPedestal.style.border = '';
        els.pvPedestal.style.boxShadow = '';
      }
    }

    if (els.pvBullets){
      var list = (state.bullets || []).slice(0, 10);
      els.pvBullets.innerHTML = list.map(function(it){
        var h = String(it && it.h || '').trim();
        var b = String(it && it.b || '').trim();
        return (
          '<div class="pv-bullet">' +
            '<div class="icon">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="#0b1220" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M20 6L9 17l-5-5"></path>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<div class="h" style="color:' + esc(accent) + ';">' + esc(h || '—') + '</div>' +
              '<div class="b" style="color:' + esc(accent) + ';">' + esc(b || '—') + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    if (els.pvProductImage){
      if (state.imageDataUrl){
        els.pvProductImage.src = state.imageDataUrl;
        els.pvProductImage.style.display = '';
      } else {
        els.pvProductImage.removeAttribute('src');
        els.pvProductImage.style.display = 'none';
      }
      applyImageTransform();
    }
  }

  function bindEditor(){
    if (els.title){
      els.title.addEventListener('input', function(){
        state.title = els.title.value || '';
        renderPreview(); persist();
      });
    }
    if (els.badge){
      els.badge.addEventListener('input', function(){
        state.badge = els.badge.value || '';
        renderPreview(); persist();
      });
    }
    if (els.accent){
      els.accent.addEventListener('input', function(){
        state.accent = els.accent.value || '#2e2b7a';
        renderPreview(); persist();
      });
    }
    if (els.brandText){
      els.brandText.addEventListener('input', function(){
        state.brandText = els.brandText.value || '';
        renderPreview(); persist();
      });
    }
    if (els.brandShowMark){
      els.brandShowMark.addEventListener('change', function(){
        state.brandShowMark = els.brandShowMark.value === '1';
        renderPreview(); persist();
      });
    }
    if (els.footerNote){
      els.footerNote.addEventListener('input', function(){
        state.footerNote = els.footerNote.value || '';
        renderPreview(); persist();
      });
    }
    if (els.imageScale){
      els.imageScale.addEventListener('input', function(){
        state.imageScale = Number(els.imageScale.value || 100) || 100;
        applyImageTransform(); persist();
      });
    }
    if (els.imageRotate){
      els.imageRotate.addEventListener('input', function(){
        state.imageRotate = Number(els.imageRotate.value || 0) || 0;
        applyImageTransform(); persist();
      });
    }
    if (els.btnAddBullet){
      els.btnAddBullet.addEventListener('click', function(){
        state.bullets = state.bullets || [];
        state.bullets.push({ h:'', b:'' });
        renderBulletsEditor();
        renderPreview();
        persist();
      });
    }
    if (els.bullets){
      els.bullets.addEventListener('click', function(e){
        var t = e && e.target;
        if (!t) return;
        if (t.getAttribute('data-action') !== 'del') return;
        var box = t.closest('.bullet');
        if (!box) return;
        var idx = Number(box.getAttribute('data-idx'));
        if (!Number.isFinite(idx)) return;
        state.bullets.splice(idx, 1);
        renderBulletsEditor();
        renderPreview();
        persist();
      });
      els.bullets.addEventListener('input', function(e){
        var t = e && e.target;
        if (!t) return;
        var box = t.closest('.bullet');
        if (!box) return;
        var idx = Number(box.getAttribute('data-idx'));
        var field = t.getAttribute('data-field');
        if (!Number.isFinite(idx) || !field) return;
        var it = state.bullets[idx] || (state.bullets[idx] = {h:'',b:''});
        it[field] = t.value || '';
        renderPreview();
        persist();
      });
    }
    if (els.productFile){
      els.productFile.addEventListener('change', function(){
        var f = els.productFile.files && els.productFile.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function(){
          var rawUrl = String(reader.result || '');
          setStatus('圖片處理中…');
          processRemoveBgIfNeeded(rawUrl).then(function(out){
            state.imageDataUrl = String(out || rawUrl);
            renderPreview();
            persist();
            setStatus(state.removeBg ? '圖片已載入（已套用簡易去背）。' : '圖片已載入。', 'ok');
          });
        };
        reader.onerror = function(){
          setStatus('讀取圖片失敗。', 'error');
        };
        reader.readAsDataURL(f);
      });
    }
    if (els.removeBg){
      els.removeBg.addEventListener('change', function(){
        state.removeBg = !!els.removeBg.checked;
        if (!state.imageDataUrl){
          persist();
          setStatus(state.removeBg ? '已開啟簡易去背（下次載入圖片會套用）。' : '已關閉簡易去背。', 'ok');
          return;
        }
        setStatus('套用去背中…');
        processRemoveBgIfNeeded(state.imageDataUrl).then(function(out){
          state.imageDataUrl = String(out || state.imageDataUrl);
          renderPreview();
          persist();
          setStatus(state.removeBg ? '已套用簡易去背。' : '已關閉簡易去背。', 'ok');
        });
      });
    }
    if (els.btnClearImage){
      els.btnClearImage.addEventListener('click', function(){
        state.imageDataUrl = '';
        try{ if (els.productFile) els.productFile.value = ''; }catch(_){}
        renderPreview();
        persist();
        setStatus('已清除圖片。', 'ok');
      });
    }

    if (els.pedestalFile){
      els.pedestalFile.addEventListener('change', function(){
        var f = els.pedestalFile.files && els.pedestalFile.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function(){
          state.pedestalDataUrl = String(reader.result || '');
          renderPreview();
          persist();
          setStatus('展示台已載入。', 'ok');
        };
        reader.onerror = function(){
          setStatus('讀取展示台失敗。', 'error');
        };
        reader.readAsDataURL(f);
      });
    }
    if (els.btnClearPedestal){
      els.btnClearPedestal.addEventListener('click', function(){
        state.pedestalDataUrl = '';
        try{ if (els.pedestalFile) els.pedestalFile.value = ''; }catch(_){}
        renderPreview();
        persist();
        setStatus('已清除展示台。', 'ok');
      });
    }
    if (els.btnReset){
      els.btnReset.addEventListener('click', function(){
        try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
        state = {
          title: '',
          badge: '防水殼版',
          accent: '#2e2b7a',
          brandText: 'unalomecodes',
          brandShowMark: true,
          bullets: [
            { h:'虎睡吃・招財法門', b:'主打躺著也能接住財氣\n適合想讓錢慢慢靠過來\n不是拚命追財的那種路線' },
            { h:'強悍東北十三流虎法', b:'源自泰國東北守護日派\n偏實戰型招財與成願法門\n好的進來 壞的自然出去' }
          ],
          imageDataUrl: '',
          removeBg: false,
          pedestalDataUrl: '',
          imageScale: 100,
          imageRotate: 0,
          imageX: 0,
          imageY: -16,
          footerNote: ''
        };
        syncInputs();
        renderBulletsEditor();
        renderPreview();
        setStatus('已重設。', 'ok');
      });
    }
  }

  function bindDragRotate(){
    if (!els.pvProductImage) return;
    var img = els.pvProductImage;
    var dragging = false;
    var mode = 'move';
    var startX = 0;
    var startY = 0;
    var startImgX = 0;
    var startImgY = 0;
    var startRot = 0;
    var centerX = 0;
    var centerY = 0;
    var startAngle = 0;

    function getCenter(){
      try{
        var rect = img.getBoundingClientRect();
        return { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
      }catch(_){
        return { x: 0, y: 0 };
      }
    }
    function angleTo(cx, cy, px, py){
      return Math.atan2(py - cy, px - cx) * 180 / Math.PI;
    }

    img.addEventListener('pointerdown', function(ev){
      if (img.style.display === 'none') return;
      dragging = true;
      mode = ev.shiftKey ? 'rotate' : 'move';
      startX = ev.clientX;
      startY = ev.clientY;
      startImgX = Number(state.imageX || 0) || 0;
      startImgY = Number(state.imageY || 0) || 0;
      startRot = Number(state.imageRotate || 0) || 0;
      var c = getCenter();
      centerX = c.x; centerY = c.y;
      startAngle = angleTo(centerX, centerY, startX, startY);
      try{ img.setPointerCapture(ev.pointerId); }catch(_){}
      img.style.cursor = 'grabbing';
      ev.preventDefault();
    });

    img.addEventListener('pointermove', function(ev){
      if (!dragging) return;
      if (mode === 'move'){
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        state.imageX = startImgX + dx;
        state.imageY = startImgY + dy;
        applyImageTransform();
      } else {
        var a = angleTo(centerX, centerY, ev.clientX, ev.clientY);
        state.imageRotate = startRot + (a - startAngle);
        if (els.imageRotate) els.imageRotate.value = String(Math.round(state.imageRotate));
        applyImageTransform();
      }
    });

    function end(ev){
      if (!dragging) return;
      dragging = false;
      try{ img.releasePointerCapture(ev.pointerId); }catch(_){}
      img.style.cursor = 'grab';
      persist();
    }
    img.addEventListener('pointerup', end);
    img.addEventListener('pointercancel', end);
  }

  function ensureExportLibs(){
    if (typeof window.html2canvas !== 'function'){
      throw new Error('html2canvas 未載入（可能是網路阻擋 CDN）。');
    }
  }

  function safeFileName(){
    var title = String(state.title || '').trim().split('\n')[0] || 'product';
    return title.replace(/[\\s/\\\\?%*:|\"<>]+/g, '_').slice(0, 60) || 'product';
  }

  function renderCanvasForExport(){
    ensureExportLibs();
    setStatus('正在產出 PNG…');
    var target = els.card;
    var stage = document.createElement('div');
    stage.style.position = 'fixed';
    stage.style.left = '-100000px';
    stage.style.top = '0';
    stage.style.width = '0';
    stage.style.height = '0';
    stage.style.overflow = 'visible';
    stage.style.zIndex = '-1';

    var clone = target.cloneNode(true);
    try{
      clone.style.transform = 'none';
      clone.style.zoom = '1';
      clone.style.margin = '0';
    }catch(_){}
    stage.appendChild(clone);
    document.body.appendChild(stage);

    var w = 1080;
    var h = 1080;
    return window.html2canvas(clone, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      scrollX: 0,
      scrollY: 0
    }).finally(function(){
      try{ stage.remove(); }catch(_){}
    });
  }

  function downloadPng(){
    renderCanvasForExport()
      .then(function(canvas){
        var url = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url;
        a.download = safeFileName() + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStatus('PNG 已下載。', 'ok');
      })
      .catch(function(err){
        setStatus('產出 PNG 失敗：' + String(err && err.message ? err.message : err), 'error');
      });
  }

  function applyResponsivePreview(){
    var canvas = $('imgPreviewCanvas');
    if (!canvas || !els.card) return;
    var availableW = Math.max(320, (canvas.clientWidth || 0) - 24);
    var scale = Math.min(1, availableW / 1080);
    try{
      els.card.style.zoom = String(scale);
      els.card.style.transform = 'none';
      return;
    }catch(_){}
    els.card.style.transform = 'scale(' + scale + ')';
    els.card.style.transformOrigin = 'top center';
  }

  function boot(){
    hydrate();
    syncInputs();
    renderBulletsEditor();
    renderPreview();
    applyResponsivePreview();
    bindDragRotate();

    if (window.ResizeObserver){
      try{
        var ro = new ResizeObserver(function(){ applyResponsivePreview(); });
        var canvas = $('imgPreviewCanvas');
        if (canvas) ro.observe(canvas);
      }catch(_){}
    } else {
      window.addEventListener('resize', applyResponsivePreview);
    }

    bindEditor();

    if (els.btnDownload){
      els.btnDownload.addEventListener('click', function(){
        try{
          downloadPng();
        }catch(err){
          setStatus(String(err && err.message ? err.message : err), 'error');
        }
      });
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
