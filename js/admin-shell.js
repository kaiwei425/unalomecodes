(function(){
  try{
    var body = document.body;
    if (!body) return;
    var wrap = body.querySelector('.wrap');
    if (!wrap || wrap.dataset.adminShellApplied) return;

    var navItems = [
      { href: '/admin', label: '總覽', icon: '🏠' },
      { href: '/admin/products', label: '商品', icon: '📦' },
      { href: '/admin/orders', label: '訂單', icon: '🧾' },
      { href: '/admin/members', label: '會員', icon: '👤' },
      { href: '/admin/coupons', label: '優惠券', icon: '🎟️' },
      { href: '/admin/code-viewer', label: '留言', icon: '💬' },
      { href: '/admin/fortune-stats', label: '日籤統計', icon: '📊' },
      { href: '/admin/service-products', label: '服務商品', icon: '🕯️' },
      { href: '/admin/service-orders', label: '服務訂單', icon: '🧿' }
    ];

    var path = location.pathname.replace(/\/$/, '');
    if (path === '/admin') path = '/admin';

    var shell = document.createElement('div');
    shell.className = 'admin-shell';

    var side = document.createElement('aside');
    side.className = 'admin-sidebar';

    var brand = document.createElement('div');
    brand.className = 'admin-brand';
    brand.innerHTML = '<div class="badge">UA</div>' +
      '<div><div class="title">unalomecodes</div><div class="subtitle">Admin Center</div></div>';

    var nav = document.createElement('nav');
    nav.className = 'admin-nav';
    navItems.forEach(function(item){
      var a = document.createElement('a');
      a.href = item.href;
      a.setAttribute('data-nav', item.href);
      a.textContent = item.icon + ' ' + item.label;
      if (path === item.href) a.classList.add('active');
      nav.appendChild(a);
    });

    var foot = document.createElement('div');
    foot.className = 'admin-foot';
    foot.textContent = '已啟用安全防護與權限驗證';

    side.appendChild(brand);
    side.appendChild(nav);
    side.appendChild(foot);

    var main = document.createElement('main');
    main.className = 'admin-main';
    wrap.dataset.adminShellApplied = '1';
    main.appendChild(wrap);

    shell.appendChild(side);
    shell.appendChild(main);
    body.prepend(shell);
  }catch(_){
    // ignore
  }
})();
