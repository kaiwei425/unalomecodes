(function() {
  // 1. 從 meta 標籤讀取 API 的基礎路徑
  const meta = document.querySelector('meta[name="api-base"]');
  // 如果找不到 meta 標籤，預設使用相對路徑 "/"
  const apiBase = (meta ? meta.getAttribute('content') : '/').replace(/\/$/, '');

  // 如果基礎路徑只是根目錄 "/"，則不需要攔截，瀏覽器會自動處理
  if (apiBase === '' || apiBase === '/') {
    return;
  }

  // 2. 儲存原始的 fetch 函式
  const originalFetch = window.fetch;

  // 3. 建立一個新的 fetch 函式來覆蓋原始的
  window.fetch = function(input, init) {
    let url = input;

    // 4. 檢查請求的 URL 是否為指向我們 API 的相對路徑
    if (typeof input === 'string' && input.startsWith('/api/')) {
      // 5. 將相對路徑與基礎路徑組合，形成完整的 API 網址
      url = apiBase + input;
    }

    // 6. 使用修正後的 URL 呼叫原始的 fetch 函式
    return originalFetch.call(this, url, init);
  };
})();

// 確保在所有腳本（包含攔截器）都載入後才執行 main.js 的主要邏輯
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.runMain === 'function') {
    window.runMain();
  }
});
