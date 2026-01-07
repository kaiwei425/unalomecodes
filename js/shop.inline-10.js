(function(){
  if (window.__bankRestorePatched) return; window.__bankRestorePatched = true;
  if (window.__disableBankTransferUI){
    try{
      var dlg = document.getElementById('dlgBank');
      var box = document.getElementById('bankFourLines');
      if (box) box.remove();
      if (dlg){
        var title = dlg.querySelector('.bankHeader .bankTitle'); if (title) title.style.display='none';
        var grid  = dlg.querySelector('.bankInfoGrid'); if (grid) grid.style.display='none';
      }
    }catch(_){}
    return;
  }

  function digitsOnly(s){ return String(s||'').replace(/[^0-9]/g,''); }

  function restoreBankUI(){
    var dlg = document.getElementById('dlgBank');
    if (!dlg) return;

    // read values
    var bankVal = '中國信託 (822)';
    var acctVal = '148540417073';
    var bankEl = document.getElementById('bankBankVal');
    var noEl   = document.getElementById('bankNoVal');
    if (bankEl && bankEl.textContent.trim()) bankVal = bankEl.textContent.trim();
    if (noEl && noEl.textContent.trim()) acctVal = noEl.textContent.trim();

    // hide old header title and grid
    try{
      var title = dlg.querySelector('.bankHeader .bankTitle'); if (title) title.style.display='none';
      var grid  = dlg.querySelector('.bankInfoGrid'); if (grid) grid.style.display='none';
    }catch(e){}

    // inject four-line block
    var box = document.getElementById('bankFourLines');
    if (!box){
      box = document.createElement('div');
      box.id = 'bankFourLines';
      var header = dlg.querySelector('.bankHeader');
      if (header && header.parentNode){
        header.parentNode.insertBefore(box, header.nextSibling);
      }else{
        dlg.appendChild(box);
      }
    }
    box.innerHTML = ''
      + '<div class="line16">銀行名稱：</div>'
      + '<div class="line16" id="bankNameLine"></div>'
      + '<div class="line16">匯款帳號：</div>'
      + '<div class="line16" id="bankNoLine"></div>';

    var nameLine = document.getElementById('bankNameLine');
    var noLine   = document.getElementById('bankNoLine');
    if (nameLine) nameLine.textContent = bankVal;
    if (noLine)   noLine.textContent   = digitsOnly(acctVal) || acctVal;

    // shrink & rebind copy button
    var btn = document.getElementById('bankCopyAll');
    if (btn){
      btn.textContent = '複製帳號';
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '12px';
      btn.style.borderRadius = '8px';
      btn.onclick = function(ev){
        ev && ev.preventDefault && ev.preventDefault();
        var text = digitsOnly((document.getElementById('bankNoLine')||{}).textContent||acctVal);
        try{
          navigator.clipboard.writeText(text);
          alert('已複製帳號');
        }catch(e){
          var ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
          alert('已複製帳號');
        }
      };
    }

    // set amount readonly and hint
    var amt = document.getElementById('bfAmount');
    if (amt){
      amt.readOnly = true;
      var hint = document.getElementById('bfAmtHint');
      if (!hint){
        hint = document.createElement('div');
        hint.id = 'bfAmtHint';
        hint.textContent = '系統自動帶入金額，無需修改';
        // place right below amount input (same grid column)
        try{
          var parentCol = amt.parentNode;
          if (parentCol && parentCol.appendChild) parentCol.appendChild(hint);
        }catch(e){}
      }
    }

    // 根據購物車與優惠券重新計算實際應付金額，確保與購物車視窗顯示一致
    try{
      var cartRaw = localStorage.getItem('cart') || '[]';
      // --- 插入 twLocal helper ---
      function twLocal(n){
        try{
          return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
        }catch(e){
          var num = Number(n || 0);
          if (!isFinite(num)) num = 0;
          return 'NT$ ' + num.toFixed(0);
        }
      }
      var items = [];
      try{
        var parsed = JSON.parse(cartRaw);
        if (Array.isArray(parsed)) items = parsed;
      }catch(e){}

      function baseAmountOfItemForBank(it){
        if (!it) return 0;
        var unit = Number(it.price != null ? it.price : (it.unit != null ? it.unit : 0)) || 0;
        var qty  = Math.max(1, Number(it.qty != null ? it.qty : (it.quantity != null ? it.quantity : 1)) || 1);
        return unit * qty;
      }

      var sub = 0;
      for (var i = 0; i < items.length; i++){
        sub += baseAmountOfItemForBank(items[i]);
      }

      var off = 0;
      try{
        if (window.__cartCouponState && window.__cartCouponState.assignment){
          off = Number(window.__cartCouponState.assignment.total || 0) || 0;
        }
      }catch(e){}

      var grand = Math.max(0, sub - off);
      if (amt && grand > 0){
        amt.value = grand;
      }

      // Render a full cart item summary inside the bank dialog so
      // 「訂單內容確認」對應實際匯款金額（包含購物車所有商品）
      try{
        if (items && items.length){
          var dlgRoot = dlg;
          // Create or reuse a container for the cart summary
          var summaryBox = document.getElementById('bankCartSummary');
          if (!summaryBox){
            summaryBox = document.createElement('div');
            summaryBox.id = 'bankCartSummary';
            summaryBox.style.marginTop = '12px';
            summaryBox.style.padding = '10px 12px';
            summaryBox.style.borderRadius = '10px';
            summaryBox.style.background = '#f9fafb';
            summaryBox.style.fontSize = '13px';
            summaryBox.style.lineHeight = '1.6';

            // Try to insert the box right after the existing 「訂單內容確認」區塊，
            // 若找不到就加在 dialog 內文的最下方。
            var heading = dlgRoot.querySelector('.bankOrderTitle, .bankOrderHeader, .bank-order-title');
            if (!heading){
              // Fallback: try to locate a block containing the text "訂單內容確認"
              var labels = dlgRoot.querySelectorAll('div, h2, h3');
              for (var i = 0; i < labels.length; i++){
                if ((labels[i].textContent || '').indexOf('訂單內容確認') !== -1){
                  heading = labels[i];
                  break;
                }
              }
            }
            if (heading && heading.parentNode){
              heading.parentNode.insertBefore(summaryBox, heading.nextSibling);
            }else{
              dlgRoot.appendChild(summaryBox);
            }
          }

          summaryBox.innerHTML = "";
        }
      }catch(_){}
    }catch(e){}
  }

  function onOpen(){
    try{ restoreBankUI(); }catch(e){ console.error(e); }
  }

  // Trigger when bank dialog opens (respect existing logic, don't override)
  document.addEventListener('click', function(e){
    var t = e.target;
    var fire = t && (t.id==='pay711' || t.id==='cartGo711' || (t.closest && t.closest('#pay711,#cartGo711')));
    if (fire){ setTimeout(onOpen, 0); }
  }, true);

  // Also run on DOM ready (for cases where dialog is already present)
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(onOpen, 0);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(onOpen, 0); });
  }
})();
