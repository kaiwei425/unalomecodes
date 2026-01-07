(function(){
  try {
    const ua = navigator.userAgent || '';
    const isLine = /Line\//i.test(ua);
    if (!isLine) return;
    if (sessionStorage.getItem('line-warning-shown')) return;
    sessionStorage.setItem('line-warning-shown', '1');
    const overlay = document.createElement('div');
    overlay.id = 'lineWarning';
    overlay.innerHTML = `
      <div class="line-card">
        <div class="line-icon">⚠️</div>
        <div class="line-title">建議於瀏覽器中開啟</div>
        <p>偵測到您正透過 LINE 內建瀏覽器瀏覽。為確保結帳功能與通知正常運作，請改用 Safari 或 Google Chrome 開啟此頁。</p>
        <p class="line-tip">請點選右下角「⋮」後選擇「Open in browser」(或中文「於瀏覽器開啟」)，以外部瀏覽器開啟本頁。</p>
        <div class="line-actions">
          <button type="button" class="btn ghost" data-act="dismiss">我知道了</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev)=>{
      if (ev.target.matches('[data-act="dismiss"]')) {
        overlay.remove();
      }
    }, false);
  } catch (_) {}
})();
