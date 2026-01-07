(function(){
  if (window.__productImageFix__) return; window.__productImageFix__ = true;
  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">\n'
    + '<rect width="100%" height="100%" fill="#f3f4f6"/>\n'
    + '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="20" font-family="-apple-system,system-ui,Segoe UI,Roboto">No Image</text>\n'
    + '</svg>'
  );

  function fixOne(img){
    if (!img || img.__fixed) return; img.__fixed = true;
    // lazy helpers
    img.loading = img.loading || 'lazy';
    img.decoding = 'async';
    // 若 src 空或只含空白，套 placeholder
    var s = (img.getAttribute('src')||'').trim();
    if (!s){ img.setAttribute('src', PLACEHOLDER); }
    // onerror fallback
    img.addEventListener('error', function(){
      if (img.getAttribute('src') !== PLACEHOLDER){ img.setAttribute('src', PLACEHOLDER); }
    });
  }

  function scan(){
    try{
      var list = document.querySelectorAll('.card .pic img');
      for (var i=0;i<list.length;i++) fixOne(list[i]);
    }catch(e){}
  }

  // 初次與後續刷新（商品重新渲染）
  document.addEventListener('DOMContentLoaded', scan);
  var mo; try{
    mo = new MutationObserver(function(){ scan(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }catch(e){ setInterval(scan, 1000); }
})();
