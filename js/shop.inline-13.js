(function(){
  if (window.__bankCouponBridgeUnified__) return;
  window.__bankCouponBridgeUnified__ = true;

  function hasUnified(){
    return typeof window.getUnifiedCartTotals === 'function';
  }

  function formatTW(n){
    try{
      return 'NT$ ' + Number(n||0).toLocaleString('zh-TW');
    }catch(e){
      var num = Number(n||0);
      if (!isFinite(num)) num = 0;
      return 'NT$ ' + num.toFixed(0);
    }
  }


  // 讓匯款頁面的金額與優惠券顯示，完全吃 unified totals
  function refreshBankFromUnified(){
    // --- renderBankOrderItems helper, nested inside refreshBankFromUnified ---
    function renderBankOrderItems(totals){
      var candleFlowActive = false;
      try{
        candleFlowActive = (sessionStorage.getItem('__candle_flow') === '1');
        if (!candleFlowActive && totals && Array.isArray(totals.items) && totals.items.length){
          candleFlowActive = totals.items.every(function(it){
            return typeof window.isCandleItemLike === 'function'
              ? window.isCandleItemLike(it)
              : /蠟燭/.test(String((it && it.category)||'') + String((it && (it.name||it.title||''))||''));
          });
        }
      }catch(_){}
      var dlg = document.getElementById('dlgBank');
      if (!dlg) return;

      var items = totals && Array.isArray(totals.items) ? totals.items : [];
      var discountMap = {};
      if (totals && totals.assignment && Array.isArray(totals.assignment.lines)){
        totals.assignment.lines.forEach(function(line){
          var idx = Number(line.itemIndex);
          if (!isNaN(idx)){
            discountMap[idx] = (discountMap[idx] || 0) + Number(line.amount||0);
          }
        });
      }
      var html = '';

      // 標題 + 表格 HTML
      html += '<div style="font-weight:800;font-size:18px;margin-bottom:8px;">訂單內容確認</div>';

      if (!items.length){
        html += '<div style="padding:8px 0;color:#6b7280;">目前沒有任何商品。</div>';
      }else{
        html += '<div style="overflow-x:auto;">';
        html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
        html += '<thead><tr>';
        html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #e5e7eb;">商品圖片</th>';
        html += '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #e5e7eb;">商品名稱</th>';
        html += '<th style="text-align:right;padding:6px 4px;border-bottom:1px solid #e5e7eb;">單價</th>';
        html += '<th style="text-align:center;padding:6px 4px;border-bottom:1px solid #e5e7eb;">數量</th>';
        html += '<th style="text-align:right;padding:6px 4px;border-bottom:1px solid #e5e7eb;">小計</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < items.length; i++){
          var it = items[i] || {};
          var imgSrc = it.img || it.image || it.picture || '';
          var name   = it.name || it.title || it.productName || '商品';
          var spec   = it.variantName || it.spec || it.deity || '';
          var unit   = Number(it.price != null ? it.price : (it.unit != null ? it.unit : 0)) || 0;
          var qty    = Math.max(1, Number(it.qty != null ? it.qty : (it.quantity != null ? it.quantity : 1)) || 1);
          var subtotal = unit * qty;

          html += '<tr>';
          html += '<td style="padding:6px 4px;text-align:center;vertical-align:top;">';
          if (imgSrc){
            html += '<img src="' + String(imgSrc).replace(/"/g,'&quot;') + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;background:#f3f4f6;" />';
          }else{
            html += '<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#9ca3af;border-radius:8px;font-size:12px;">No Image</div>';
          }
          html += '</td>';

          html += '<td style="padding:6px 4px;vertical-align:top;">'
               +  '<div style="font-weight:600;">' + escapeHtml(name) + '</div>';
          if (spec){
            html += '<div style="color:#6b7280;font-size:12px;">規格：' + escapeHtml(spec) + '</div>';
          }
          html += '</td>';

          html += '<td style="padding:6px 4px;text-align:right;vertical-align:top;">' + tw(unit) + '</td>';
          html += '<td style="padding:6px 4px;text-align:center;vertical-align:top;">' + qty + '</td>';
          html += '<td style="padding:6px 4px;text-align:right;vertical-align:top;">';
          var discount = Number(discountMap[i] || 0);
          var finalSubtotal = Math.max(0, subtotal - discount);
          if (discount > 0){
            html += '<div style="text-decoration:line-through;color:#9ca3af;">' + tw(subtotal) + '</div>';
            html += '<div style="color:#dc2626;font-weight:700;">' + tw(finalSubtotal) + '</div>';
          } else {
            html += tw(subtotal);
          }
          html += '</td>';
          html += '</tr>';
        }

        html += '</tbody></table></div>';
      }

      // 找到或建立專用容器：#bankOrderItemsBox
      var box = document.getElementById('bankOrderItemsBox');
      if (!box){
        box = document.createElement('div');
        box.id = 'bankOrderItemsBox';
        box.style.margin = '0 0 12px 0';

        // 優先放在匯款表單之前，整個 dialog 只保留這一份訂單內容
        var form = dlg.querySelector('form');
        if (form && form.parentNode){
          form.parentNode.insertBefore(box, form);
        }else{
          dlg.insertBefore(box, dlg.firstChild);
        }
      }

      if (candleFlowActive){
        box.innerHTML = '';
        return;
      }

      box.innerHTML = html;
    }
    // --- end renderBankOrderItems ---
    function hideLegacyOrderSections(dlg){
      if (!dlg) return;
      try{
        var nodes = dlg.querySelectorAll('*');
        for (var i = 0; i < nodes.length; i++){
          var el = nodes[i];
          if (!el) continue;
          var txt = (el.textContent || '').trim();
          if (!txt) continue;
          if (txt.indexOf('訂單內容確認') !== -1){
            var container = el.closest('section,fieldset,table,tbody,tr,div');
            if (container && container !== dlg){
              container.style.display = 'none';
            }
          }
        }
      }catch(_){ }
    }
    if (!hasUnified()) return;
    var dlg = document.getElementById('dlgBank');
    if (!dlg) return;

    function ensureBankBackButton(dlg){
      if (!dlg || dlg.__hasBackButton) return;
      dlg.__hasBackButton = true;

      var form = dlg.querySelector('form');
      var host = form || dlg;

      var wrapper = document.createElement('div');
      wrapper.style.margin = '0 0 10px 0';

      // 下方返回按鈕列
      var btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.justifyContent = 'flex-end';

      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.id = 'bankBackBtn';
      backBtn.textContent = '返回上一頁';
      backBtn.style.padding = '6px 12px';
      backBtn.style.borderRadius = '999px';
      backBtn.style.border = '1px solid #e5e7eb';
      backBtn.style.background = '#ffffff';
      backBtn.style.color = '#374151';
      backBtn.style.fontSize = '13px';
      backBtn.style.cursor = 'pointer';

      btnRow.appendChild(backBtn);
      wrapper.appendChild(btnRow);

      var nameInput = dlg.querySelector('#bfName');
      if (nameInput && nameInput.parentNode){
        nameInput.parentNode.parentNode.insertBefore(wrapper, nameInput.parentNode);
      } else {
        host.insertBefore(wrapper, host.firstChild);
      }

      // 綁定返回邏輯：關閉匯款 Dialog，返回訂單確認頁
      if (!window.__bankBackBtnHandler__){
        window.__bankBackBtnHandler__ = true;

        document.addEventListener('click', function(e){
          var t = e.target;
          if (!t || t.id !== 'bankBackBtn') return;
          e.preventDefault();

          try{
            var bankDlg = document.getElementById('dlgBank');
            if (bankDlg && bankDlg.open){ bankDlg.close(); }
          }catch(_){ }

          try{
            if (typeof window.__openOrderConfirmDialogUnified === 'function'){
              window.__openOrderConfirmDialogUnified();
            }else{
              var orderDlg = document.getElementById('dlgOrderConfirm');
              if (orderDlg && typeof orderDlg.showModal === 'function'){
                orderDlg.showModal();
              }
            }
          }catch(_){ }
        });
      }
    }

    ensureBankBackButton(dlg);

    function resolveCheckoutChannel(){
      try{
        if (window.__checkoutChannelRef && typeof window.__checkoutChannelRef.get === 'function'){
          return window.__checkoutChannelRef.get();
        }
      }catch(_){}
      try{
        var v = sessionStorage.getItem('__checkout_channel');
        if (v) return v;
      }catch(_){}
      return 'bank';
    }
    function resolveCheckoutShippingFee(){
      return resolveCheckoutChannel() === 'cc'
        ? (window.__shippingFee || 60)
        : (window.__codShippingFee || 38);
    }
    var totals = window.getUnifiedCartTotals({ includeShipping:true, shippingFee: resolveCheckoutShippingFee() });
    // Render order items section
    renderBankOrderItems(totals);
    var amtInput = document.getElementById('bfAmount');
    if (amtInput && totals){
      var target = Number(totals.grand || 0);
      if (isFinite(target) && target >= 0){
        // 舊腳本若寫入原價，我們直接覆蓋回統一金額
        if (Number(amtInput.value || 0) !== target){
          amtInput.value = target;
        }
      }
    }

    // 匯款頁只需要顯示提示文字與已套用的優惠券清單，不再提供輸入功能
    var hint   = document.getElementById('bfCouponHint');
    var listBox = ensureBankCouponListBox();

    var coupons = (totals && totals.coupons) || [];
    // --- recompute off from assignment lines if possible ---
    var off = 0;
    if (totals && totals.assignment && Array.isArray(totals.assignment.lines)){
      totals.assignment.lines.forEach(function(l){ off += Number(l.amount||0); });
    } else if (totals && typeof totals.off === 'number'){
      off = Number(totals.off)||0;
    }

    if (hint){
      if (coupons.length){
        hint.style.display = '';
        hint.textContent = '已套用 ' + coupons.length + ' 張購物車優惠券，總折抵 ' +
                           formatTW(off).replace(/^NT\$\s*/, 'NT$ ');
      }else{
        hint.style.display = '';
        hint.textContent = '若欲使用優惠券，請返回上一頁輸入優惠碼並套用。';
      }
    }


    // 在匯款頁下方顯示「已套用優惠券清單」，方便在這裡直接移除
    if (listBox){
      listBox.innerHTML = '';
      if (!coupons.length){
        listBox.style.display = 'none';
      }else{
        listBox.style.display = '';
        var assign = (totals && totals.assignment) || { lines: [] };
        var items  = totals.items || [];
        coupons.forEach(function(cpn){
          var code = String(cpn.code || '');
          var line = (assign.lines || []).find(function(l){
            return String(l.code||'').toUpperCase() === code.toUpperCase();
          });
          var usage = describeCouponUsage(cpn, line, items);

          var row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.gap = '8px';
          row.style.padding = '6px 8px';
          row.style.border = '1px solid #e5e7eb';
          row.style.borderRadius = '8px';
          row.style.marginTop = '4px';

          var left = document.createElement('div');
          left.style.fontSize = '13px';
          left.style.lineHeight = '1.5';
          left.innerHTML =
            '<div style="font-weight:700">優惠碼：' + code + '</div>' +
            '<div style="color:'+ (usage.color || '#6b7280') +'">' +
            escapeHtml(usage.message || '') + '</div>';

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = '移除';
          btn.setAttribute('data-coupon-code', code);
          btn.style.fontSize = '12px';
          btn.style.padding = '4px 8px';
          btn.style.borderRadius = '8px';
          btn.style.border = '1px solid #ef4444';
          btn.style.background = '#fff';
          btn.style.color = '#ef4444';
          btn.style.cursor = 'pointer';

          row.appendChild(left);
          row.appendChild(btn);
          listBox.appendChild(row);
        });
      }
    }
    // --- escapeHtml and tw helpers for renderBankOrderItems ---
    function escapeHtml(s){
      return String(s||'').replace(/[&<>\"']/g, function(m){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m;
      });
    }
    function tw(n){
      try{ return 'NT$ ' + Number(n||0).toLocaleString('zh-TW'); }
      catch(e){ return 'NT$ ' + (Number(n||0).toFixed(0)); }
    }
  }

  function ensureBankCouponListBox(){
    var box = document.getElementById('bfCouponList');
    if (box) return box;

    var dlg = document.getElementById('dlgBank');
    var hintEl = document.getElementById('bfCouponBackHint');

    box = document.createElement('div');
    box.id = 'bfCouponList';
    box.style.marginTop = '10px';
    box.style.fontSize = '13px';
    box.style.lineHeight = '1.5';

    // 將優惠券列表插入到提示文字的下方
    if (hintEl && hintEl.parentNode) {
      hintEl.parentNode.insertBefore(box, hintEl.nextSibling);
    } else if (dlg) {
      // Fallback: 如果找不到提示文字，就加到 dialog 的最下方
      dlg.appendChild(box);
    }
    return box;
  }


  // 當購物車或優惠券狀態變動時，自動刷新匯款頁顯示
  window.addEventListener('storage', function(ev){
    if (!ev) return;
    if (ev.key === 'cart' || ev.key === '__cartCoupons__'){
      setTimeout(refreshBankFromUnified, 150);
    }
  });

  // 每當匯款視窗打開 & 填寫表單欄位時，都重新套用 unified 金額，避免舊腳本改回原價
  function tick(){
    var dlg = document.getElementById('dlgBank');
    if (!dlg) return;
    if (dlg.open){
      refreshBankFromUnified();
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    // 定時守門員：就算有舊腳本寫入 bfAmount，我們也會在下一個 interval 把它改回 unified 結果
    try{
      setInterval(tick, 500);
    }catch(_){}
  });
})();
