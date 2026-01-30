(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function cssEscape(v){
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(v);
    return String(v || '').replace(/[^a-zA-Z0-9_\\-]/g, function(m){ return '\\\\' + m; });
  }

  var els = {
    invDate: $('invDate'),
    invNo: $('invNo'),
    btnGenNo: $('btnGenNo'),
    issuedBy: $('issuedBy'),
    invoiceFor: $('invoiceFor'),
    presetGrid: $('presetGrid'),
    itemsEditorBody: $('itemsEditorBody'),
    customItemName: $('customItemName'),
    btnAddCustom: $('btnAddCustom'),
    taxPercent: $('taxPercent'),
    discountAmount: $('discountAmount'),
    notes: $('notes'),
    btnReset: $('btnReset'),
    btnDownloadPng: $('btnDownloadPng'),
    btnDownloadPdf: $('btnDownloadPdf'),
    btnPrint: $('btnPrint'),
    status: $('status'),
    invoicePaper: $('invoicePaper'),
    pvDate: $('pvDate'),
    pvNo: $('pvNo'),
    pvIssuedBy: $('pvIssuedBy'),
    pvInvoiceFor: $('pvInvoiceFor'),
    pvItems: $('pvItems'),
    pvSubtotal: $('pvSubtotal'),
    pvTax: $('pvTax'),
    pvDiscount: $('pvDiscount'),
    pvTotal: $('pvTotal'),
    pvNotes: $('pvNotes')
  };

  var PREVIEW_BASE_W = 794;

  var PRESETS = [
    { id:'ig_reel', name:'Instagram Reel', meta:'短影音 / Reels' },
    { id:'fb_post', name:'Facebook Post', meta:'貼文曝光' },
    { id:'rednotes_post', name:'Rednotes Post', meta:'小紅書 / Red' },
    { id:'tiktok_video', name:'Tiktok video', meta:'短影音 / TikTok' }
  ];

  function escapeHtml(s){
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNumber(v){
    var n = Number(String(v || '').trim());
    return Number.isFinite(n) ? n : 0;
  }

  function formatTHB(amount){
    var n = Math.round(toNumber(amount));
    try{
      return new Intl.NumberFormat('th-TH', { style:'currency', currency:'THB', maximumFractionDigits:0, minimumFractionDigits:0 }).format(n);
    }catch(_){
      var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return '฿' + s;
    }
  }

  function formatLongDate(dateStr){
    if (!dateStr) return '—';
    try{
      var d = new Date(dateStr + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    }catch(_){
      return dateStr;
    }
  }

  function yyyymmdd(dateStr){
    return String(dateStr || '').replace(/-/g, '').slice(0, 8);
  }

  function generateInvoiceNoFor(dateStr){
    var key = 'invoiceNoSeq:' + yyyymmdd(dateStr || '');
    var seq = 0;
    try{ seq = Number(localStorage.getItem(key) || '0') || 0; }catch(_){ seq = 0; }
    seq += 1;
    try{ localStorage.setItem(key, String(seq)); }catch(_){}
    return yyyymmdd(dateStr) + String(seq).padStart(2, '0');
  }

  var state = {
    date: '',
    no: '',
    issuedBy: 'KV',
    invoiceFor: '',
    items: [],
    presetChecked: {},
    taxPercent: '',
    discountAmount: '',
    notes: 'THANK YOU FOR YOUR BUSINESS.\nIf you have any questions, please contact us at bkkkaiwei@gmail.com'
  };

  function setStatus(msg, kind){
    if (!els.status) return;
    els.status.classList.remove('is-error', 'is-ok');
    if (kind === 'error') els.status.classList.add('is-error');
    if (kind === 'ok') els.status.classList.add('is-ok');
    els.status.textContent = msg || '';
  }

  function computeTotals(){
    var subtotal = state.items.reduce(function(sum, it){
      return sum + (toNumber(it.qty) * toNumber(it.unitPrice));
    }, 0);

    var taxPercent = String(state.taxPercent || '').trim() === '' ? 0 : toNumber(state.taxPercent);
    var tax = subtotal * (taxPercent / 100);
    var discount = String(state.discountAmount || '').trim() === '' ? 0 : toNumber(state.discountAmount);
    var total = Math.max(0, subtotal + tax - discount);

    return {
      subtotal: subtotal,
      tax: tax,
      discount: discount,
      total: total
    };
  }

  function renderPresets(){
    if (!els.presetGrid) return;
    els.presetGrid.innerHTML = PRESETS.map(function(p){
      return (
        '<label class="preset">' +
          '<input type="checkbox" data-preset="' + escapeHtml(p.id) + '">' +
          '<div>' +
            '<div class="name">' + escapeHtml(p.name) + '</div>' +
            '<div class="meta">' + escapeHtml(p.meta || '') + '</div>' +
          '</div>' +
        '</label>'
      );
    }).join('');

    els.presetGrid.addEventListener('change', function(e){
      var t = e && e.target;
      if (!t || t.tagName !== 'INPUT' || t.type !== 'checkbox') return;
      var id = t.getAttribute('data-preset');
      if (!id) return;
      if (t.checked) addItemFromPreset(id);
      else removeItemByPreset(id);
      state.presetChecked[id] = !!t.checked;
      renderItemsEditor();
      renderPreview();
      persist();
    });
  }

  function addItemFromPreset(presetId){
    var preset = PRESETS.find(function(p){ return p.id === presetId; });
    if (!preset) return;
    var exists = state.items.some(function(it){ return it.presetId === presetId; });
    if (exists) return;
    state.items.push({
      id: 'preset:' + presetId,
      presetId: presetId,
      desc: preset.name,
      qty: 1,
      unitPrice: ''
    });
  }

  function removeItemByPreset(presetId){
    state.items = state.items.filter(function(it){ return it.presetId !== presetId; });
  }

  function addCustomItem(name){
    var clean = String(name || '').trim();
    if (!clean) return;
    state.items.push({
      id: 'custom:' + Date.now() + ':' + Math.random().toString(16).slice(2),
      presetId: '',
      desc: clean,
      qty: 1,
      unitPrice: ''
    });
  }

  function renderItemsEditor(){
    if (!els.itemsEditorBody) return;

    if (!state.items.length){
      els.itemsEditorBody.innerHTML =
        '<tr><td colspan="5" style="padding:14px;color:#64748b;font-size:13px;">先用上方勾選快速加入，或新增自訂項目。</td></tr>';
      return;
    }

    els.itemsEditorBody.innerHTML = state.items.map(function(it, idx){
      var sub = toNumber(it.qty) * toNumber(it.unitPrice);
      var isPreset = !!it.presetId;
      var badge = isPreset ? ('<div style="margin-top:6px;font-size:11px;color:#64748b;font-weight:900;">Preset</div>') : '';
      return (
        '<tr data-item-row="' + escapeHtml(it.id) + '">' +
          '<td>' +
            '<input type="text" data-field="desc" value="' + escapeHtml(it.desc || '') + '" placeholder="項目名稱">' +
            badge +
          '</td>' +
          '<td><input type="number" min="0" step="1" data-field="qty" value="' + escapeHtml(it.qty) + '"></td>' +
          '<td><input type="number" min="0" step="1" data-field="unitPrice" value="' + escapeHtml(it.unitPrice) + '" placeholder="例如：15000"></td>' +
          '<td><div class="subcell">' + escapeHtml(formatTHB(sub)) + '</div></td>' +
          '<td style="text-align:center;"><button type="button" class="remove" data-action="remove" title="移除">×</button></td>' +
        '</tr>'
      );
    }).join('');

    els.itemsEditorBody.onclick = function(e){
      var t = e && e.target;
      if (!t) return;
      if (t.getAttribute('data-action') === 'remove'){
        var tr = t.closest('tr');
        if (!tr) return;
        var itemId = tr.getAttribute('data-item-row');
        var item = state.items.find(function(x){ return x.id === itemId; });
        state.items = state.items.filter(function(x){ return x.id !== itemId; });
        if (item && item.presetId){
          state.presetChecked[item.presetId] = false;
          var cb = els.presetGrid && els.presetGrid.querySelector('input[data-preset="' + cssEscape(item.presetId) + '"]');
          if (cb) cb.checked = false;
        }
        renderItemsEditor();
        renderPreview();
        persist();
      }
    };

    els.itemsEditorBody.oninput = function(e){
      var t = e && e.target;
      if (!t) return;
      var tr = t.closest('tr');
      if (!tr) return;
      var itemId = tr.getAttribute('data-item-row');
      var field = t.getAttribute('data-field');
      if (!itemId || !field) return;
      var item = state.items.find(function(x){ return x.id === itemId; });
      if (!item) return;
      item[field] = t.value;
      if (field === 'qty' || field === 'unitPrice'){
        var qty = toNumber(item.qty);
        var unit = toNumber(item.unitPrice);
        var sub = qty * unit;
        var subCell = tr.querySelector('.subcell');
        if (subCell) subCell.textContent = formatTHB(sub);
      }
      renderPreview();
      persist();
    };
  }

  function renderPreview(){
    if (!els.invoicePaper) return;
    els.pvDate.textContent = formatLongDate(state.date);
    els.pvNo.textContent = state.no ? String(state.no).trim() : '—';
    els.pvIssuedBy.textContent = String(state.issuedBy || '').trim() || '—';
    els.pvInvoiceFor.textContent = String(state.invoiceFor || '').trim() || '—';
    els.pvNotes.textContent = String(state.notes || '').trim() || '—';

    var totals = computeTotals();
    els.pvSubtotal.textContent = formatTHB(totals.subtotal);
    els.pvTax.textContent = formatTHB(totals.tax);
    els.pvDiscount.textContent = formatTHB(totals.discount);
    els.pvTotal.textContent = formatTHB(totals.total);

    var rows = state.items.map(function(it){
      var qty = toNumber(it.qty);
      var unit = toNumber(it.unitPrice);
      var sub = qty * unit;
      return (
        '<div class="trow">' +
          '<div class="c1">' + escapeHtml(String(it.desc || '').trim() || '—') + '</div>' +
          '<div class="c2">' + (qty ? escapeHtml(String(qty)) : '') + '</div>' +
          '<div class="c3">' + (unit ? escapeHtml(formatTHB(unit)) : '') + '</div>' +
          '<div class="c4">' + (sub ? escapeHtml(formatTHB(sub)) : '') + '</div>' +
        '</div>'
      );
    });
    var minRows = 10;
    while (rows.length < minRows){
      rows.push(
        '<div class="trow empty">' +
          '<div class="c1">—</div><div class="c2">—</div><div class="c3">—</div><div class="c4">—</div>' +
        '</div>'
      );
    }
    els.pvItems.innerHTML = rows.join('');
  }

  function persist(){
    try{
      var payload = {
        date: state.date,
        no: state.no,
        issuedBy: state.issuedBy,
        invoiceFor: state.invoiceFor,
        items: state.items,
        presetChecked: state.presetChecked,
        taxPercent: state.taxPercent,
        discountAmount: state.discountAmount,
        notes: state.notes
      };
      localStorage.setItem('adminInvoiceDraft:v1', JSON.stringify(payload));
    }catch(_){}
  }

  function hydrate(){
    var raw = '';
    try{ raw = localStorage.getItem('adminInvoiceDraft:v1') || ''; }catch(_){ raw = ''; }
    if (!raw) return;
    try{
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      state.date = data.date || state.date;
      state.no = data.no || state.no;
      state.issuedBy = typeof data.issuedBy === 'string' ? data.issuedBy : state.issuedBy;
      state.invoiceFor = typeof data.invoiceFor === 'string' ? data.invoiceFor : state.invoiceFor;
      state.items = Array.isArray(data.items) ? data.items : state.items;
      state.presetChecked = (data.presetChecked && typeof data.presetChecked === 'object') ? data.presetChecked : state.presetChecked;
      state.taxPercent = (data.taxPercent != null) ? data.taxPercent : state.taxPercent;
      state.discountAmount = (data.discountAmount != null) ? data.discountAmount : state.discountAmount;
      state.notes = typeof data.notes === 'string' ? data.notes : state.notes;
    }catch(_){}
  }

  function syncInputsFromState(){
    if (els.invDate) els.invDate.value = state.date || '';
    if (els.invNo) els.invNo.value = state.no || '';
    if (els.issuedBy) els.issuedBy.value = state.issuedBy || '';
    if (els.invoiceFor) els.invoiceFor.value = state.invoiceFor || '';
    if (els.taxPercent) els.taxPercent.value = state.taxPercent || '';
    if (els.discountAmount) els.discountAmount.value = state.discountAmount || '';
    if (els.notes) els.notes.value = state.notes || '';

    if (els.presetGrid){
      Object.keys(state.presetChecked || {}).forEach(function(id){
        var checked = !!state.presetChecked[id];
        var cb = els.presetGrid.querySelector('input[data-preset="' + cssEscape(id) + '"]');
        if (cb) cb.checked = checked;
      });
    }
  }

  function bindInputs(){
    if (els.invDate){
      els.invDate.addEventListener('change', function(){
        state.date = els.invDate.value || '';
        if (!String(els.invNo.value || '').trim()){
          state.no = generateInvoiceNoFor(state.date);
          els.invNo.value = state.no;
        }
        renderPreview();
        persist();
      });
    }

    if (els.invNo){
      els.invNo.addEventListener('input', function(){
        state.no = els.invNo.value || '';
        renderPreview();
        persist();
      });
    }

    if (els.btnGenNo){
      els.btnGenNo.addEventListener('click', function(){
        if (!state.date && els.invDate) state.date = els.invDate.value || '';
        state.no = generateInvoiceNoFor(state.date);
        if (els.invNo) els.invNo.value = state.no;
        renderPreview();
        persist();
      });
    }

    if (els.issuedBy){
      els.issuedBy.addEventListener('input', function(){
        state.issuedBy = els.issuedBy.value || '';
        renderPreview();
        persist();
      });
    }

    if (els.invoiceFor){
      els.invoiceFor.addEventListener('input', function(){
        state.invoiceFor = els.invoiceFor.value || '';
        renderPreview();
        persist();
      });
    }

    if (els.taxPercent){
      els.taxPercent.addEventListener('input', function(){
        state.taxPercent = els.taxPercent.value;
        renderPreview();
        persist();
      });
    }

    if (els.discountAmount){
      els.discountAmount.addEventListener('input', function(){
        state.discountAmount = els.discountAmount.value;
        renderPreview();
        persist();
      });
    }

    if (els.notes){
      els.notes.addEventListener('input', function(){
        state.notes = els.notes.value || '';
        renderPreview();
        persist();
      });
    }

    if (els.btnAddCustom){
      els.btnAddCustom.addEventListener('click', function(){
        addCustomItem(els.customItemName ? els.customItemName.value : '');
        if (els.customItemName) els.customItemName.value = '';
        renderItemsEditor();
        renderPreview();
        persist();
      });
    }

    if (els.customItemName){
      els.customItemName.addEventListener('keydown', function(e){
        if (e.key === 'Enter'){
          e.preventDefault();
          addCustomItem(els.customItemName.value);
          els.customItemName.value = '';
          renderItemsEditor();
          renderPreview();
          persist();
        }
      });
    }

    if (els.btnReset){
      els.btnReset.addEventListener('click', function(){
        try{ localStorage.removeItem('adminInvoiceDraft:v1'); }catch(_){}
        state = {
          date: '',
          no: '',
          issuedBy: 'KV',
          invoiceFor: '',
          items: [],
          presetChecked: {},
          taxPercent: '',
          discountAmount: '',
          notes: 'THANK YOU FOR YOUR BUSINESS.\nIf you have any questions, please contact us at bkkkaiwei@gmail.com'
        };
        initDefaults();
        renderItemsEditor();
        renderPreview();
        setStatus('已重設。', 'ok');
      });
    }

    if (els.btnPrint){
      els.btnPrint.addEventListener('click', function(){
        setStatus('');
        window.print();
      });
    }

    if (els.btnDownloadPng){
      els.btnDownloadPng.addEventListener('click', function(){
        downloadPng();
      });
    }

    if (els.btnDownloadPdf){
      els.btnDownloadPdf.addEventListener('click', function(){
        downloadPdf();
      });
    }
  }

  function initDefaults(){
    if (!state.date){
      var d = new Date();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      state.date = d.getFullYear() + '-' + mm + '-' + dd;
    }
    if (!state.no){
      state.no = generateInvoiceNoFor(state.date);
    }
    syncInputsFromState();
  }

  function ensureExportLibs(){
    if (typeof window.html2canvas !== 'function'){
      throw new Error('html2canvas 未載入（可能是網路阻擋 CDN）。');
    }
    var jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF){
      throw new Error('jsPDF 未載入（可能是網路阻擋 CDN）。');
    }
    return { jsPDF: jspdf.jsPDF };
  }

  function safeFileName(){
    var base = 'invoice';
    var d = yyyymmdd(state.date);
    var no = String(state.no || '').trim();
    if (d) base += '-' + d;
    if (no) base += '-' + no;
    return base.replace(/[^a-zA-Z0-9\\-_.]+/g, '_');
  }

  function applyResponsivePreviewScale(){
    if (!els.invoicePaper) return;
    var canvas = $('previewCanvas');
    if (!canvas) return;

    var padding = 24; // preview-canvas has 12px padding on each side
    var availableW = Math.max(320, (canvas.clientWidth || 0) - padding);
    var scale = Math.min(1, availableW / PREVIEW_BASE_W);

    // Prefer zoom because it affects layout size, avoiding horizontal clipping/scrollbars.
    try{
      els.invoicePaper.style.zoom = String(scale);
      els.invoicePaper.style.transform = 'none';
      els.invoicePaper.style.transformOrigin = 'top center';
      return;
    }catch(_){}

    // Fallback: transform scale (may still allow scrollbars but will visually fit).
    els.invoicePaper.style.transform = 'scale(' + scale + ')';
    els.invoicePaper.style.transformOrigin = 'top center';
    els.invoicePaper.style.zoom = '';
  }

  function bindResponsivePreview(){
    if (!els.invoicePaper) return;
    var canvas = $('previewCanvas');
    if (!canvas) return;

    applyResponsivePreviewScale();
    try{
      canvas.scrollTop = 0;
      canvas.scrollLeft = 0;
    }catch(_){}

    if (window.ResizeObserver){
      try{
        var ro = new ResizeObserver(function(){
          applyResponsivePreviewScale();
        });
        ro.observe(canvas);
      }catch(_){}
    } else {
      window.addEventListener('resize', function(){
        applyResponsivePreviewScale();
      });
    }
  }

  function renderCanvasForExport(){
    setStatus('正在產出影像…');
    var target = els.invoicePaper;
    var scale = 2;
    var prevZoom = '';
    var prevTransform = '';
    try{
      prevZoom = target.style.zoom || '';
      prevTransform = target.style.transform || '';
      target.style.zoom = '1';
      target.style.transform = 'none';
    }catch(_){}

    return window.html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: scale,
      useCORS: true,
      logging: false
    }).finally(function(){
      try{
        target.style.zoom = prevZoom;
        target.style.transform = prevTransform;
      }catch(_){}
    });
  }

  function downloadPng(){
    try{
      ensureExportLibs();
    }catch(err){
      setStatus(String(err && err.message ? err.message : err), 'error');
      return;
    }

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

  function downloadPdf(){
    var jsPDF;
    try{
      jsPDF = ensureExportLibs().jsPDF;
    }catch(err){
      setStatus(String(err && err.message ? err.message : err), 'error');
      return;
    }

    renderCanvasForExport()
      .then(function(canvas){
        var imgData = canvas.toDataURL('image/png');
        var pdf = new jsPDF({ orientation:'p', unit:'mm', format:'a4' });
        var pageW = pdf.internal.pageSize.getWidth();
        var pageH = pdf.internal.pageSize.getHeight();

        var imgW = canvas.width;
        var imgH = canvas.height;
        var ratio = Math.min(pageW / imgW, pageH / imgH);
        var w = imgW * ratio;
        var h = imgH * ratio;
        var x = (pageW - w) / 2;
        var y = (pageH - h) / 2;
        pdf.addImage(imgData, 'PNG', x, y, w, h, undefined, 'FAST');
        pdf.save(safeFileName() + '.pdf');
        setStatus('PDF 已下載。', 'ok');
      })
      .catch(function(err){
        setStatus('產出 PDF 失敗：' + String(err && err.message ? err.message : err), 'error');
      });
  }

  function boot(){
    if (!els.invoicePaper){
      return;
    }
    renderPresets();
    hydrate();
    initDefaults();
    renderItemsEditor();
    renderPreview();
    bindInputs();
    bindResponsivePreview();
    setStatus('');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
