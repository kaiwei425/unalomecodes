(function(){
  try{
    var body = document.body;
    if (!body) return;
    var wrap = body.querySelector('.wrap');
    if (!wrap || wrap.dataset.adminShellApplied) return;

    var navItems = [
      { href: '/admin', label: '總覽', icon: '🏠', group: 'extra' },
      { href: '/admin/orders', label: '訂單管理', icon: '🧾', group: 'primary' },
      { href: '/admin/products', label: '商品管理', icon: '📦', group: 'primary' },
      { href: '/admin/service-products', label: '服務商品', icon: '🕯️', group: 'extra' },
      { href: '/admin/service-orders', label: '服務訂單', icon: '🧿', group: 'primary' },
      { href: '/admin/members', label: '會員', icon: '👤', group: 'extra' },
      { href: '/admin/coupons', label: '優惠券', icon: '🎟️', group: 'extra' },
      { href: '/admin/code-viewer', label: '留言', icon: '💬', group: 'extra' },
      { href: '/admin/fortune-stats', label: '日籤統計', icon: '📊', group: 'extra' }
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
      if (item.group) a.setAttribute('data-nav-group', item.group);
      a.innerHTML = '<span class="nav-icon">' + item.icon + '</span>' +
        '<span class="nav-label">' + item.label + '</span>';
      if (path === item.href) a.classList.add('active');
      nav.appendChild(a);
    });

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.innerHTML = '<span class="nav-icon">⋯</span><span class="nav-label">更多</span>';
    toggle.addEventListener('click', function(){
      var expanded = nav.classList.toggle('is-expanded');
      var label = toggle.querySelector('.nav-label');
      if (label) label.textContent = expanded ? '收合' : '更多';
    });
    nav.appendChild(toggle);

    var foot = document.createElement('div');
    foot.className = 'admin-foot';
    foot.textContent = '已啟用安全防護與權限驗證';

    side.appendChild(brand);
    side.appendChild(nav);
    side.appendChild(foot);

    var main = document.createElement('main');
    main.className = 'admin-main';

    var topbar = document.createElement('div');
    topbar.className = 'admin-topbar';
    var topbarTitle = document.createElement('div');
    topbarTitle.className = 'admin-topbar-title';
    var h1 = wrap.querySelector('h1');
    topbarTitle.textContent = (h1 && h1.textContent) ? h1.textContent.trim() : (document.title || '後台管理');
    var topbarActions = document.createElement('div');
    topbarActions.className = 'admin-topbar-actions';
    var linkShop = document.createElement('a');
    linkShop.href = '/shop';
    linkShop.textContent = '前台首頁';
    var linkHome = document.createElement('a');
    linkHome.href = '/admin';
    linkHome.textContent = '後台總覽';
    topbarActions.appendChild(linkHome);
    topbarActions.appendChild(linkShop);
    topbar.appendChild(topbarTitle);
    topbar.appendChild(topbarActions);

    wrap.dataset.adminShellApplied = '1';
    main.appendChild(topbar);
    main.appendChild(wrap);

    shell.appendChild(side);
    shell.appendChild(main);
    body.prepend(shell);
    body.classList.add('admin-shell-applied');
  }catch(_){
    // ignore
  }
})();
