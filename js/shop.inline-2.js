(function(){
  const CATS = [
    { key: "佛牌/聖物", label: "佛牌/聖物" },
    { key: "蠟燭加持祈福", label: "連線算命 / 捐棺行善" },
    { key: "跑廟行程", label: "跑廟行程" },
    { key: "eSIM", label: "eSIM 上網卡" },
    { key: "其他", label: "泰國推薦好物" }
  ];
  let selectedCat = "佛牌/聖物";

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

  function buildCats(){
    const side = document.getElementById('sideDeities');
    if(!side || side.querySelector('.cats')) return;
    const box = document.createElement('div');
    box.className = 'cats';
    box.innerHTML = '<h4>商品分類</h4><div class="list"></div>';
    const list = box.querySelector('.list');
    CATS.forEach(cat=>{
      const b = document.createElement('button');
      b.textContent = cat.label; b.dataset.cat = cat.key;
      b.classList.add('side-cat-btn');
      if(cat.key === selectedCat) b.classList.add('active');
      if (cat.key === '蠟燭加持祈福') {
        b.addEventListener('click', function(){
          window.location.href = 'https://unalomecodes.com/service';
        });
      } else {
        b.addEventListener('click', ()=>{
          if (selectedCat === cat.key) {
            selectedCat = null;
          } else {
            selectedCat = cat.key;
          }
          [...list.children].forEach(x=> x.classList.toggle('active', x===b));
          window.__currentCategoryFilter = selectedCat;
          if(typeof applyFilter === 'function') applyFilter();
        });
      }
      list.appendChild(b);
    });
    const hotBtn = document.createElement('button');
    hotBtn.id = 'hotToggle';
    hotBtn.className = 'side-cat-btn';
    hotBtn.type = 'button';
    hotBtn.textContent = '熱賣中商品';
    if (selectedCat === '__hot__') hotBtn.classList.add('active');
    hotBtn.addEventListener('click', ()=>{
      if (selectedCat === '__hot__') {
        selectedCat = null;
      } else {
        selectedCat = '__hot__';
      }
      [...list.children].forEach(x=> x.classList.toggle('active', x===hotBtn));
      window.__currentCategoryFilter = selectedCat;
      if(typeof applyFilter === 'function') applyFilter();
    });
    side.appendChild(box);
    list.appendChild(hotBtn);
  }

  document.addEventListener('DOMContentLoaded', buildCats);
})();
