document.addEventListener('DOMContentLoaded', function() {
  const submitBtn = document.getElementById('rvSubmit');
  if (!submitBtn) return;

  // 為了安全地覆蓋掉可能存在於外部 JS 檔案中的舊版點擊事件，
  // 我們複製按鈕並取代它，這樣可以清除所有舊的事件監聽器。
  const newBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newBtn, submitBtn);

  newBtn.addEventListener('click', async function(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const dlg = document.getElementById('dlg');
    // 留言是跟著「神祇」的，我們直接從商品視窗的資料屬性中取得神祇代碼
    // 後端 API 現在會確保所有商品都有 deityCode
    const productCode = (() => {
      if (!dlg) return '';
      const raw = dlg.getAttribute('data-product-deitycode')
        || dlg.getAttribute('data-product-deity')
        || dlg.getAttribute('data-deity')
        || dlg.dataset.productDeitycode
        || dlg.dataset.productDeityCode
        || dlg.getAttribute('data-product-name')
        || '';
      const code = (typeof toDeityCode === 'function') ? (toDeityCode(raw) || raw) : raw;
      return (code || '').toString().trim().toUpperCase();
    })();

    if (!productCode) {
      alert('無法取得商品資訊，請重新開啟商品視窗。');
      return;
    }

    const nickInput = document.getElementById('rvNick');
    const textInput = document.getElementById('rvText');
    const fileInput = document.getElementById('rvFile');

    const nick = nickInput ? nickInput.value.trim() : '';
    const msg = textInput ? textInput.value.trim() : '';
    const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (!nick) {
      alert('請輸入您的名字或暱稱。');
      nickInput.focus();
      return;
    }
    if (!msg) {
      alert('請分享您的體驗或故事。');
      textInput.focus();
      return;
    }

    newBtn.disabled = true;
    newBtn.textContent = '送出中...';

    try {
      let imageUrl = '';
      if (file) {
        const formData = new FormData();
        formData.append('files[]', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.ok || !uploadData.files || !uploadData.files.length) throw new Error(uploadData.error || '圖片上傳失敗');
        imageUrl = uploadData.files[0].url;
      }

      const productName = (function(){
        const dlg = document.getElementById('dlg');
        if (dlg){
          const raw = dlg.getAttribute('data-product-name') || '';
          if (raw) return raw;
        }
        const titleEl = document.getElementById('dlgTitle');
        return titleEl ? titleEl.textContent.trim() : '';
      })();
      const storyPayload = { code: productCode, nick: nick, msg: msg, imageUrl: imageUrl, productName: productName };
      const storyRes = await fetch('/api/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(storyPayload) });
      const storyData = await storyRes.json();
      if (!storyRes.ok || !storyData.ok) throw new Error(storyData.error || '送出分享失敗');

      alert('感謝您的分享！');
      if (nickInput) nickInput.value = '';
      if (textInput) textInput.value = '';
      if (fileInput) fileInput.value = '';
      if (typeof loadReviews === 'function') loadReviews(productCode);
    } catch (err) {
      alert('發生錯誤：' + err.message);
    } finally {
      newBtn.disabled = false;
      newBtn.textContent = '送出分享';
    }
  });
});
