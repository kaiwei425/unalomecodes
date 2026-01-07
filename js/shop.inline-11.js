(function(){
  if (window.__cvsAutoFillStrict) return; window.__cvsAutoFillStrict = true;

  function pick(sp, keys){
    for (var i=0;i<keys.length;i++){
      var v = sp.get(keys[i]);
      if (v) return v;
    }
    return '';
  }
  function parseFromURL(u){
    try{
      var sp = new URLSearchParams((u && u.search) || location.search || '');
      var id   = pick(sp, ['storeid','StoreId','stCode','code','store']);
      var name = pick(sp, ['storename','StoreName','stName','name']);
      var addr = pick(sp, ['storeaddress','StoreAddress','address','Addr']);
      var tel  = pick(sp, ['storetel','StoreTel','tel','TEL']);
      return {id:id||'', name:name||'', addr:addr||'', tel:tel||''};
    }catch(e){ return {id:'',name:'',addr:'',tel:''}; }
  }
  function composeText(d){
    var t = '';
    if (d.name && d.id) t = d.name + ' (' + d.id + ')';
    else if (d.name)    t = d.name;
    else if (d.id)      t = d.id;
    // 若需要可加地址電話：
    // if (d.addr) t += (t?' · ':'') + d.addr;
    // if (d.tel)  t += (t?' · ':'') + d.tel;
    return t;
  }
  function openBankIfPossible(){
    // 新規：不自動開啟任何付款視窗，留在步驟 2 讓使用者自行按下一步
    return;
  }
  function fillIntoField(d){
    var text = composeText(d);
    if (!text) return false;
    var el = document.getElementById('bfStore');
    if (!el) return false;
    try{
      el.value = text;
      el.setAttribute('data-storeid', d.id||'');
      el.setAttribute('data-storename', d.name||'');
      el.setAttribute('data-storeaddress', d.addr||'');
      el.setAttribute('data-storetel', d.tel||'');
      el.dispatchEvent(new Event('input', {bubbles:true}));
      el.dispatchEvent(new Event('change', {bubbles:true}));
      return true;
    }catch(e){ return false; }
  }
  function whenFieldReady(cb){
    if (document.getElementById('bfStore')){ cb(); return; }
    var mo = new MutationObserver(function(){
      if (document.getElementById('bfStore')){ mo.disconnect(); cb(); }
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  // 1) DOM ready: 若 URL 已有門市資料，等待欄位出現後回填
  document.addEventListener('DOMContentLoaded', function(){
    var data = parseFromURL(location);
    var has = data.id || data.name || data.addr || data.tel;
    if (!has) return;
    whenFieldReady(function(){
      fillIntoField(data);
      // 不自動跳下一步
    });
  });

  // 2) postMessage：若 popup/新視窗回傳，照樣回填
  window.addEventListener('message', function(ev){
    try{
      var d = ev.data || {};
      if (!d.__cvs_store__) return;
      var got = { id: d.storeid||'', name: d.storename||'', addr: d.storeaddress||'', tel: d.storetel||'' };
      whenFieldReady(function(){
        fillIntoField(got);
        // 不自動跳下一步，讓使用者確認後再按
      });
    }catch(e){}
  });
})();
