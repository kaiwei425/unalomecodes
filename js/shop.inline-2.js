(function(){
  const CATS = [
    { key: "佛牌/聖物", i18n: "shop.cat_amulet", fallback: "佛牌/聖物" },
    // This is a nav shortcut to /service, not a true product category filter.
    { key: "蠟燭加持祈福", i18n: "shop.cat_service", fallback: "連線算命 / 捐棺行善", isServiceLink: true },
    { key: "跑廟行程", i18n: "shop.cat_trip", fallback: "跑廟行程" },
    { key: "eSIM", i18n: "shop.cat_esim", fallback: "eSIM 上網卡" },
    { key: "其他", i18n: "shop.cat_other", fallback: "泰國推薦好物" }
  ];
  let selectedCat = null;

  function t(key, fallback){
    try{
      if (window.UC_I18N && typeof window.UC_I18N.t === 'function'){
        const v = window.UC_I18N.t(key);
        if (v && v !== key) return String(v);
      }
    }catch(_){}
    return String(fallback || key || '');
  }

  function normalizeCat(cat){
    if (!cat) return "";
    // 接受後台直接填四種分類名稱（完全比對）
    if (CATS.some(item => item.key === cat)) return cat;
    return "";
  }

  function classify(p){
    // 僅使用後台正式分類；未提供時預設為「佛牌/聖物」
    const explicit = normalizeCat(p && p.category);
    return explicit || "佛牌/聖物";
  }

  function renderCats(){
    const side = document.getElementById('sideDeities');
    if(!side) return;

    if (!selectedCat && typeof window.__currentCategoryFilter !== 'undefined'){
      selectedCat = window.__currentCategoryFilter || null;
    }

    let box = side.querySelector('.cats');
    if (!box){
      box = document.createElement('div');
      box.className = 'cats';
      box.innerHTML = '<h4></h4><div class="list"></div>';
      side.appendChild(box);
    }

    const head = box.querySelector('h4');
    if (head) head.textContent = t('shop.categories_title', '商品分類');

    const list = box.querySelector('.list');
    if (!list) return;
    list.innerHTML = '';

    CATS.forEach(cat=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t(cat.i18n, cat.fallback);
      b.dataset.cat = cat.key;
      b.classList.add('side-cat-btn');
      if(cat.key === selectedCat) b.classList.add('active');

      if (cat.isServiceLink){
        b.addEventListener('click', function(){
          window.location.href = 'https://unalomecodes.com/service';
        });
      }else{
        b.addEventListener('click', ()=>{
          if (selectedCat === cat.key) {
            selectedCat = null;
          } else {
            selectedCat = cat.key;
          }
          // Update active state after rebuilding.
          window.__currentCategoryFilter = selectedCat;
          if(typeof applyFilter === 'function') applyFilter();
          renderCats();
        });
      }
      list.appendChild(b);
    });

    const hotBtn = document.createElement('button');
    hotBtn.id = 'hotToggle';
    hotBtn.className = 'side-cat-btn';
    hotBtn.type = 'button';
    hotBtn.textContent = t('shop.hot_title', '熱賣中商品');
    if (selectedCat === '__hot__') hotBtn.classList.add('active');
    hotBtn.addEventListener('click', ()=>{
      if (selectedCat === '__hot__') {
        selectedCat = null;
      } else {
        selectedCat = '__hot__';
      }
      window.__currentCategoryFilter = selectedCat;
      if(typeof applyFilter === 'function') applyFilter();
      renderCats();
    });
    list.appendChild(hotBtn);
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderCats();
    try{
      // Allow other scripts (or debugging) to force rerender.
      window.__renderShopCats = renderCats;
    }catch(_){}
  });

  try{
    window.addEventListener('uc_lang_change', function(){ renderCats(); });
  }catch(_){}
})();
