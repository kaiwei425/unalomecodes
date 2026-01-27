(function(){
  var guard = document.getElementById('staffManualGuard');
  var content = document.getElementById('staffManualContent');
  var toc = document.getElementById('manualToc');
  var main = document.getElementById('manualMain');
  var langZh = document.getElementById('langZh');
  var langEn = document.getElementById('langEn');
  var tocObserver = null;
  var tocBound = false;

  function resolveRoleFromDom(){
    var meta = document.querySelector('.admin-topbar-user__meta');
    if (meta && meta.textContent) return meta.textContent.trim().toLowerCase();
    return '';
  }

  function fetchAdminRole(){
    return fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
      .then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){
          var role = String((data && data.role) || '').trim().toLowerCase();
          return { ok: res.ok && data && data.ok, role: role, data: data || {} };
        });
      })
      .catch(function(){ return { ok:false, role:'', data:{} }; });
  }

  function applyGuardByRole(role){
    var ok = (role === 'owner' || role === 'booking');
    if (guard) guard.style.display = ok ? 'none' : '';
    if (content) content.style.display = ok ? '' : 'none';
    return ok;
  }

  var I18N = {
    zh: {
      manual_title: '工作人員操作手冊 / Staff Manual'
    },
    en: {
      manual_title: 'Staff Manual'
    }
  };

  var TEMPLATES = {
    zh: (
      '' +
      '<section class="panel" id="intro">' +
        '<h2>0. 你要做到的事（One-screen summary）</h2>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">每天開始（10 分鐘內）</div>' +
            '<ol class="mini-list">' +
              '<li>進入 <a href="/admin/slots">時段管理</a>，確認 <span class="kbd">預約模式</span>。</li>' +
              '<li>選取今日/近期時段 → <span class="kbd">開放選取時段</span> 或 <span class="kbd">一鍵上架 + 開放</span>。</li>' +
              '<li>確認 <span class="kbd">已開放時段</span> 列表有出現。</li>' +
              '<li>在 <span class="kbd">電話算命預約</span> 裡把階段推進（Booking confirmed / Done）。</li>' +
            '</ol>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">遇到突發狀況（先保護客人）</div>' +
            '<ul class="mini-list">' +
              '<li>想暫停預約：用 <span class="kbd">立即關閉預約</span>（限時模式）。</li>' +
              '<li>不要亂用 <span class="kbd danger">解除已預約時段</span>（會清空預約）。</li>' +
              '<li>改期：一律請客人透過客服 LINE 聯繫。</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="callout warn">' +
          '<div class="callout-title">重要觀念</div>' +
          '<div class="callout-body">後台所有按鈕都會直接影響客人的可預約時段、通知信與訂單狀態。看到任何確認視窗，請先再次核對日期、時段與 serviceId。</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="concepts">' +
        '<h2>1. 系統概念（先懂這些就不會做錯）</h2>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">serviceId 是你的「服務類別」</div>' +
            '<ul class="mini-list">' +
              '<li>沒有 serviceId：你看到的時段可能是空的。</li>' +
              '<li>後台可能會自動帶入 serviceId（唯讀）。</li>' +
              '<li>如果沒有自動帶入：請向 Owner 確認 phone consult 服務設定。</li>' +
            '</ul>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">四種時段狀態（跟前台體驗直接相關）</div>' +
            '<ul class="mini-list">' +
              '<li>🟢 可預約：客人看得到且可點。</li>' +
              '<li>🟡 保留中：有人正在結帳/填資料，短時間內他人不可搶。</li>' +
              '<li>🔴 已預約：已綁定訂單。</li>' +
              '<li>⚪ 未開放：後台存在但前台不可預約。</li>' +
            '</ul>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">時區（Schedule 尤其容易錯）</div>' +
            '<ul class="mini-list">' +
              '<li>排程視窗會提示：泰國時間（Asia/Bangkok），台灣時間 +1。</li>' +
              '<li>任何排程前，先跟團隊確認「以哪個地區時間對外公告」。</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="daily-sop">' +
        '<h2>2. 每日 SOP（Booking staff 日常流程）</h2>' +
        '<div class="sop-card">' +
          '<div class="sop-title">A) 開放今天/明天的預約時段</div>' +
          '<ol class="sop-steps">' +
            '<li>進入 <a href="/admin/slots">/admin/slots</a>。</li>' +
            '<li>確認上方的 <span class="kbd">serviceId</span> 是否正確。</li>' +
            '<li>用左右箭頭切到目標日期，勾選要開放的時段。</li>' +
            '<li>使用其中一種方式：' +
              '<div class="sop-variants">' +
                '<div class="variant">' +
                  '<div class="variant-title"><span class="kbd">開放選取時段</span>（一般）</div>' +
                  '<div class="muted">只做「上架」，不強制切換模式。</div>' +
                '</div>' +
                '<div class="variant">' +
                  '<div class="variant-title"><span class="kbd">一鍵上架 + 開放</span>（限時模式）</div>' +
                  '<div class="muted">上架 + 立即開放預約視窗（會用「開放時長」）。</div>' +
                '</div>' +
              '</div>' +
            '</li>' +
            '<li>確認 <span class="kbd">已開放時段（含日期）</span> 有出現新增的時段。</li>' +
          '</ol>' +
        '</div>' +

        '<div class="sop-card">' +
          '<div class="sop-title">B) 限時模式（Windowed）怎麼用</div>' +
          '<ol class="sop-steps">' +
            '<li>把 <span class="kbd">預約模式</span> 切到 <span class="kbd">限時模式（手動開放）</span>。</li>' +
            '<li>設定 <span class="kbd">開放時長（分鐘）</span>（例如 60）。</li>' +
            '<li>兩種開放方式擇一：' +
              '<div class="sop-variants">' +
                '<div class="variant">' +
                  '<div class="variant-title"><span class="kbd">一鍵上架 + 開放</span></div>' +
                  '<div class="muted">立即生效，適合「今天要開放」或臨時加開。</div>' +
                '</div>' +
                '<div class="variant">' +
                  '<div class="variant-title"><span class="kbd">排程上架 + 開放</span></div>' +
                  '<div class="muted">先排程，時間到才開放；可用 <span class="kbd">查看已排程時段</span> 檢查。</div>' +
                '</div>' +
              '</div>' +
            '</li>' +
            '<li>要提前關掉：按 <span class="kbd">立即關閉預約</span>。</li>' +
            '<li>要取消排程：按 <span class="kbd">取消排程</span>。</li>' +
          '</ol>' +
          '<div class="callout ok">' +
            '<div class="callout-title">適用情境</div>' +
            '<div class="callout-body">限時模式適合「每週固定開放時間」、「造成搶位時的公平性」或「配合直播引流」。</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="consult-queue">' +
        '<h2>3. 電話算命預約（Consult Queue）</h2>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">你要做的只有兩件事</div>' +
            '<ol class="mini-list">' +
              '<li>付款確認後 → 按 <span class="kbd">已完成預約</span>（appointment_confirmed）。</li>' +
              '<li>通話結束/結案 → 按 <span class="kbd">訂單完成</span>（done）。</li>' +
            '</ol>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">階段定義（系統文字）</div>' +
            '<ul class="mini-list">' +
              '<li>payment_pending：訂單成立待確認付款</li>' +
              '<li>payment_confirmed：已確認付款，預約中（此時可按「已完成預約」）</li>' +
              '<li>appointment_confirmed：已完成預約（此時可按「訂單完成」）</li>' +
              '<li>done：已完成訂單</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<details class="faq" id="consult-faq">' +
          '<summary>常見卡住點：按鈕為什麼是灰色？</summary>' +
          '<div class="faq-body">' +
            '<div class="muted">系統用階段鎖住流程：</div>' +
            '<ul class="mini-list">' +
              '<li>只有在 payment_confirmed 才能按「已完成預約」。</li>' +
              '<li>只有在 appointment_confirmed 才能按「訂單完成」。</li>' +
              '<li>如果不確定付款是否確認：先回到服務訂單頁或詢問 Owner。</li>' +
            '</ul>' +
          '</div>' +
        '</details>' +
      '</section>' +

      '<section class="panel" id="danger-zone">' +
        '<h2>4. 危險區（這些動作會改掉客人預約）</h2>' +
        '<div class="callout danger">' +
          '<div class="callout-title">解除已預約時段（Danger）</div>' +
          '<div class="callout-body">' +
            '<div>按下 <span class="kbd danger">解除已預約時段</span> 會把該時段的「已預約」清空並重新開放。</div>' +
            '<div class="muted">只在「確定該客人無法來、且你已經通知客人/團隊」時使用。</div>' +
          '</div>' +
        '</div>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">禁止事項（Hard rules）</div>' +
            '<ul class="mini-list danger-list">' +
              '<li>不可私下改 slot（改期一律走客服 LINE）。</li>' +
              '<li>不可代客人建立訂單。</li>' +
              '<li>不可刪除歷史訂單。</li>' +
              '<li>不可修改付款資料。</li>' +
            '</ul>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">你可以做的安全動作</div>' +
            '<ul class="mini-list">' +
              '<li>用「取消選取時段」把未預約的時段下架。</li>' +
              '<li>用「立即關閉預約」暫停搶位（限時模式）。</li>' +
              '<li>在「已開放時段」按重新整理核對清單。</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="reschedule">' +
        '<h2>5. 改期與異動（只走客服 LINE）</h2>' +
        '<div class="callout warn">' +
          '<div class="callout-title">原則</div>' +
          '<div class="callout-body">改期、取消、特殊例外一律請客人透過客服 LINE 聯繫，由客服統一對外說明與安排。Booking 人員不要在後台私自更動預約時段。</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="troubleshooting">' +
        '<h2>6. 疑難排解（症狀 → 原因 → 解法）</h2>' +
        '<div class="table-wrap">' +
          '<table class="manual-table">' +
            '<thead>' +
              '<tr><th>症狀</th><th>可能原因</th><th>建議處理</th></tr>' +
            '</thead>' +
            '<tbody>' +
              '<tr><td>看不到任何時段 / 無法操作</td><td>serviceId 不正確、權限不足、或 service 尚未設定</td><td>先確認你是 Booking/Owner → 再確認 serviceId 是否自動帶入/正確 → 仍不行請找 Owner 檢查設定</td></tr>' +
              '<tr><td>客人說「剛剛看到」但現在按不到</td><td>🟡 保留中（他人正在結帳）或限時視窗已關閉</td><td>請客人 30-120 秒後重試；若為限時模式，確認是否仍在開放時間</td></tr>' +
              '<tr><td>客人要改期 / 取消</td><td>需要統一對外口徑與安排</td><td>請客人透過客服 LINE 聯繫；Booking 人員不要在後台私自更動</td></tr>' +
              '<tr><td>客人要求「破例」或情緒升級</td><td>超出 Booking 可處理範圍</td><td>立即轉客服 LINE／Owner；先停止任何後台動作，避免造成更多誤會</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>'
    ),
    en: (
      '' +
      '<section class="panel" id="intro">' +
        '<h2>0. One-screen summary</h2>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">Daily start (under 10 minutes)</div>' +
            '<ol class="mini-list">' +
              '<li>Open <a href="/admin/slots">Slots</a> and confirm <span class="kbd">Booking mode</span>.</li>' +
              '<li>Select slots for today/near future → <span class="kbd">Publish selected slots</span> or <span class="kbd">Publish + Open</span>.</li>' +
              '<li>Verify the <span class="kbd">Published slots</span> list updates.</li>' +
              '<li>In <span class="kbd">Consult Queue</span>, move stages forward (Booking confirmed / Done).</li>' +
            '</ol>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">Incidents (protect customers first)</div>' +
            '<ul class="mini-list">' +
              '<li>Need to pause bookings: use <span class="kbd">Close booking now</span> (windowed mode).</li>' +
              '<li>Do not use <span class="kbd danger">Release booked slots</span> casually (it clears bookings).</li>' +
              '<li>Reschedule: always route customers to LINE support.</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="callout warn">' +
          '<div class="callout-title">Key principle</div>' +
          '<div class="callout-body">Admin actions directly impact availability, notifications, and order states. Always double-check date, time, and serviceId before confirming.</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="concepts">' +
        '<h2>1. Core concepts (avoid mistakes)</h2>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">serviceId = the service you are managing</div>' +
            '<ul class="mini-list">' +
              '<li>If serviceId is wrong/missing, slots may appear empty.</li>' +
              '<li>The admin may auto-fill serviceId (read-only).</li>' +
              '<li>If not auto-filled, ask the Owner to confirm phone consult configuration.</li>' +
            '</ul>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">Slot states (affects storefront)</div>' +
            '<ul class="mini-list">' +
              '<li>🟢 Free: visible and bookable.</li>' +
              '<li>🟡 Held: someone is checking out; temporarily locked.</li>' +
              '<li>🔴 Booked: bound to an order.</li>' +
              '<li>⚪ Unpublished: exists but not bookable.</li>' +
            '</ul>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">Time zones (especially scheduling)</div>' +
            '<ul class="mini-list">' +
              '<li>Scheduling hints: Bangkok time (Asia/Bangkok), Taipei is +1.</li>' +
              '<li>Align the public announcement time zone with the team.</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="daily-sop">' +
        '<h2>2. Daily SOP (booking staff)</h2>' +
        '<div class="sop-card">' +
          '<div class="sop-title">A) Publish bookable slots</div>' +
          '<ol class="sop-steps">' +
            '<li>Go to <a href="/admin/slots">/admin/slots</a>.</li>' +
            '<li>Confirm <span class="kbd">serviceId</span> at the top.</li>' +
            '<li>Navigate to the target date and select slots to publish.</li>' +
            '<li>Choose one:' +
              '<div class="sop-variants">' +
                '<div class="variant"><div class="variant-title"><span class="kbd">Publish selected slots</span></div><div class="muted">Publishes slots only.</div></div>' +
                '<div class="variant"><div class="variant-title"><span class="kbd">Publish + Open</span></div><div class="muted">Publishes and opens a booking window (uses window duration).</div></div>' +
              '</div>' +
            '</li>' +
            '<li>Verify the <span class="kbd">Published slots</span> list updates.</li>' +
          '</ol>' +
        '</div>' +

        '<div class="sop-card">' +
          '<div class="sop-title">B) Windowed mode</div>' +
          '<ol class="sop-steps">' +
            '<li>Switch <span class="kbd">Booking mode</span> to <span class="kbd">Windowed</span>.</li>' +
            '<li>Set <span class="kbd">Open duration (minutes)</span> (e.g., 60).</li>' +
            '<li>Open in one of two ways:' +
              '<div class="sop-variants">' +
                '<div class="variant"><div class="variant-title"><span class="kbd">Publish + Open</span></div><div class="muted">Immediate; best for today/urgent adds.</div></div>' +
                '<div class="variant"><div class="variant-title"><span class="kbd">Schedule publish + open</span></div><div class="muted">Set a future open time; review via <span class="kbd">View scheduled slots</span>.</div></div>' +
              '</div>' +
            '</li>' +
            '<li>To stop early: <span class="kbd">Close booking now</span>.</li>' +
            '<li>To cancel a schedule: <span class="kbd">Cancel schedule</span>.</li>' +
          '</ol>' +
          '<div class="callout ok"><div class="callout-title">When to use</div><div class="callout-body">Great for weekly drops, fairness during high demand, or live event traffic.</div></div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="consult-queue">' +
        '<h2>3. Phone consult queue</h2>' +
        '<div class="manual-grid">' +
          '<div class="mini-card">' +
            '<div class="mini-title">Your two actions</div>' +
            '<ol class="mini-list">' +
              '<li>After payment confirmation → click <span class="kbd">Booking confirmed</span>.</li>' +
              '<li>After the call is completed → click <span class="kbd">Order completed</span>.</li>' +
            '</ol>' +
          '</div>' +
          '<div class="mini-card">' +
            '<div class="mini-title">Stage keys (system)</div>' +
            '<ul class="mini-list">' +
              '<li>payment_pending</li>' +
              '<li>payment_confirmed</li>' +
              '<li>appointment_confirmed</li>' +
              '<li>done</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<details class="faq" id="consult-faq">' +
          '<summary>Why are buttons disabled?</summary>' +
          '<div class="faq-body"><div class="muted">Buttons unlock by stage:</div><ul class="mini-list"><li>Only <code>payment_confirmed</code> can move to booking confirmed.</li><li>Only <code>appointment_confirmed</code> can move to done.</li></ul></div>' +
        '</details>' +
      '</section>' +

      '<section class="panel" id="danger-zone">' +
        '<h2>4. Danger zone</h2>' +
        '<div class="callout danger"><div class="callout-title">Release booked slots</div><div class="callout-body"><div><span class="kbd danger">Release booked slots</span> clears an existing booking and reopens the slot.</div><div class="muted">Use only when the customer and team are aligned.</div></div></div>' +
        '<div class="manual-grid">' +
          '<div class="mini-card"><div class="mini-title">Hard rules</div><ul class="mini-list danger-list"><li>No private slot changes (reschedule via LINE support).</li><li>No creating orders for customers.</li><li>No deleting order history.</li><li>No editing payment data.</li></ul></div>' +
          '<div class="mini-card"><div class="mini-title">Safe actions</div><ul class="mini-list"><li>Unpublish unused slots.</li><li>Close booking now (windowed) to stop a rush.</li><li>Refresh published slots to verify.</li></ul></div>' +
        '</div>' +
      '</section>' +

      '<section class="panel" id="reschedule">' +
        '<h2>5. Reschedule & exceptions (LINE support only)</h2>' +
        '<div class="callout warn"><div class="callout-title">Policy</div><div class="callout-body">All reschedule/cancel/exception requests must go through LINE support for consistent messaging. Booking staff should not change booked slots in admin.</div></div>' +
      '</section>' +

      '<section class="panel" id="troubleshooting">' +
        '<h2>6. Troubleshooting</h2>' +
        '<div class="table-wrap"><table class="manual-table"><thead><tr><th>Symptom</th><th>Possible cause</th><th>Action</th></tr></thead><tbody>' +
          '<tr><td>No slots / cannot operate</td><td>Wrong serviceId, insufficient role, or service not configured</td><td>Confirm you are Booking/Owner → confirm serviceId → ask Owner if still blocked</td></tr>' +
          '<tr><td>Customer saw it but cannot click now</td><td>🟡 Held by someone else, or window closed</td><td>Ask them to retry in 30-120 seconds; confirm window status</td></tr>' +
          '<tr><td>Customer requests reschedule/cancel</td><td>Needs consistent policy and handling</td><td>Route to LINE support; do not change booked slots in admin</td></tr>' +
          '<tr><td>Escalation / exception request</td><td>Outside booking staff scope</td><td>Immediately involve LINE support / Owner; pause admin actions</td></tr>' +
        '</tbody></table></div>' +
      '</section>'
    )
  };

  function detectLang(){
    try{
      var saved = localStorage.getItem('adminLang');
      if (saved === 'zh' || saved === 'en') return saved;
    }catch(_){}
    var nav = String(navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  var ADMIN_LANG = detectLang();

  function applyLangUI(){
    document.documentElement.lang = (ADMIN_LANG === 'en') ? 'en' : 'zh-Hant';
    if (langZh) langZh.classList.toggle('is-active', ADMIN_LANG === 'zh');
    if (langEn) langEn.classList.toggle('is-active', ADMIN_LANG === 'en');
    var dict = I18N[ADMIN_LANG] || I18N.zh;
    document.querySelectorAll('[data-i18n]').forEach(function(node){
      var key = node.getAttribute('data-i18n');
      if (!key) return;
      var next = dict[key] || (I18N.zh && I18N.zh[key]) || '';
      if (next) node.textContent = next;
    });
  }

  function setLang(lang){
    ADMIN_LANG = (lang === 'en') ? 'en' : 'zh';
    try{ localStorage.setItem('adminLang', ADMIN_LANG); }catch(_){}
    renderManual();
    buildToc();
    applyLangUI();
  }

  function safeText(s){
    return String(s || '').replace(/[&<>"]/g, function(ch){
      if (ch === '&') return '&amp;';
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      return '&quot;';
    });
  }

  function ensureId(node){
    if (!node || node.id) return node && node.id;
    var text = String(node.textContent || '').trim().toLowerCase();
    var base = text.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g,'').slice(0,80);
    node.id = base || ('sec-' + Math.random().toString(36).slice(2));
    return node.id;
  }

  function buildToc(){
    if (!toc) return;
    var scope = content || document;
    var headings = Array.from(scope.querySelectorAll('h2, h3'))
      .filter(function(h){
        // Only include headings inside the main manual content.
        return !!h.closest && !!h.closest('.manual-main');
      });
    toc.innerHTML = '';
    headings.forEach(function(h){
      var id = ensureId(h);
      if (!id) return;
      var a = document.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + id;
      var indent = (h.tagName || '').toLowerCase() === 'h3' ? '↳' : '•';
      a.innerHTML = '<span class="toc-indent">' + indent + '</span><span>' + safeText(h.textContent || '') + '</span>';
      toc.appendChild(a);
    });

    function setActiveByHash(){
      var hash = String(location.hash || '').replace(/^#/, '');
      if (!hash) return;
      var links = toc.querySelectorAll('a.toc-link');
      links.forEach(function(l){
        l.classList.toggle('is-active', l.getAttribute('href') === ('#' + hash));
      });
    }

    setActiveByHash();
    if (!tocBound){
      tocBound = true;
      window.addEventListener('hashchange', setActiveByHash);
    }

    if ('IntersectionObserver' in window){
      if (tocObserver && typeof tocObserver.disconnect === 'function'){
        try{ tocObserver.disconnect(); }catch(_){}
      }
      var map = new Map();
      toc.querySelectorAll('a.toc-link').forEach(function(a){
        var href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        map.set(href.slice(1), a);
      });
      var last = '';
      tocObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          var id = entry.target && entry.target.id;
          if (!id || !map.has(id)) return;
          last = id;
        });
        if (!last) return;
        map.forEach(function(a, id){
          a.classList.toggle('is-active', id === last);
        });
      }, { root:null, rootMargin:'-20% 0px -75% 0px', threshold:[0,1] });
      headings.forEach(function(h){
        if (!h.id) return;
        tocObserver.observe(h);
      });
    }
  }

  function renderManual(){
    if (!main) return;
    main.innerHTML = (TEMPLATES[ADMIN_LANG] || TEMPLATES.zh || '');
  }

  function initIfAllowed(){
    if (langZh) langZh.addEventListener('click', function(){ setLang('zh'); });
    if (langEn) langEn.addEventListener('click', function(){ setLang('en'); });
    renderManual();
    buildToc();
    applyLangUI();
  }

  function waitForRole(retries){
    var role = resolveRoleFromDom();
    if (role){
      if (applyGuardByRole(role)) initIfAllowed();
      return;
    }
    if (retries <= 0){
      fetchAdminRole().then(function(r){
        if (applyGuardByRole(r.role)) initIfAllowed();
      });
      return;
    }
    setTimeout(function(){ waitForRole(retries - 1); }, 250);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ waitForRole(10); });
  }else{
    waitForRole(10);
  }
})();
