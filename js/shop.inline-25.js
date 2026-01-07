// This function will be called to load and display stories/reviews.
// It's designed to override any existing `loadReviews` function.
window.loadReviews = async function(productCode) {
  const listEl = document.getElementById('rvList');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center; color:#9ca3af; padding:10px;">讀取中...</div>';

  try {
    const code = (productCode || '').toString().trim().toUpperCase();
    if (!code) throw new Error('無法取得留言代碼');
    const cacheBust = new Date().getTime();
    const res = await fetch(`/api/stories?code=${encodeURIComponent(code)}&_=${cacheBust}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error('無法讀取留言');

    listEl.innerHTML = ''; // Clear loading message

    if (!data.items || data.items.length === 0) {
      // The empty state is now handled by the CSS :empty::before pseudo-element
      return;
    }

    data.items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'rvItem';

      // 1. Create image element (if imageUrl exists)
      if (item.imageUrl) {
        const link = document.createElement('a');
        link.href = escapeHtml(item.imageUrl);
        link.target = '_blank';
        link.rel = 'noopener';
        link.innerHTML = `<img src="${escapeHtml(item.imageUrl)}" class="rvImage" loading="lazy" alt="顧客分享的圖片">`;
        itemEl.appendChild(link);
      }

      // 2. Create a container for all text content
      const contentEl = document.createElement('div');
      contentEl.className = 'rvContent';

      // Format date to YYYY-MM-DD HH:mm:ss (24h)
      const date = new Date(item.ts).toLocaleString('zh-TW', {
        year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit',
        hour12:false
      });

      contentEl.innerHTML = `
        <div class="rvHead">
          <strong class="rvNick">${escapeHtml(item.nick)}</strong>
          <span class="rvDate">${date}</span>
        </div>
        <div class="rvMsg">${escapeHtml(item.msg)}</div>
      `;
      itemEl.appendChild(contentEl);

      listEl.appendChild(itemEl);
    });

  } catch (err) {
    listEl.innerHTML = `<div style="text-align:center; color:#ef4444; padding:10px;">${err.message || '讀取失敗'}</div>`;
  }
};

// Helper to escape HTML to prevent XSS
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
