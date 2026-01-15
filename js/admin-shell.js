(function(){
  try{
    var body = document.body;
    if (!body) return;
    var wrap = body.querySelector('.wrap');
    if (!wrap || wrap.dataset.adminShellApplied) return;

    var navItems = [
      { href: '/admin', label: '總覽', icon: '🏠', group: 'extra' },
      { href: '/admin/orders', label: '訂單管理', icon: '🧾', group: 'primary' },
      { href: '/admin/fulfillment', label: '出貨工作台', icon: '📦', group: 'main' },
      { href: '/admin/products', label: '商品管理', icon: '📦', group: 'primary' },
      { href: '/admin/service-products', label: '服務商品', icon: '🕯️', group: 'extra' },
      { href: '/admin/service-orders', label: '服務訂單', icon: '🧿', group: 'primary' },
      { href: '/admin/members', label: '會員', icon: '👤', group: 'extra' },
      { href: '/admin/coupons', label: '優惠券', icon: '🎟️', group: 'extra' },
      { href: '/admin/code-viewer', label: '留言', icon: '💬', group: 'extra' },
      { href: '/admin/audit-logs', label: '審計日誌', icon: '📋', group: 'extra' },
      { href: '/admin/admin-roles', label: '權限管理', icon: '🛡️', group: 'extra' },
      { href: '/admin/admin-guide', label: '管理員手冊', icon: '📘', group: 'extra' }
    ];

    function renderShell(items, adminInfo){
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
      items.forEach(function(item){
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
      if (adminInfo && (adminInfo.name || adminInfo.email)){
        var userWrap = document.createElement('div');
        userWrap.className = 'admin-topbar-user';
        var userName = document.createElement('div');
        userName.className = 'admin-topbar-user__name';
        userName.textContent = (adminInfo.name || adminInfo.email || '').trim();
        var userMeta = document.createElement('div');
        userMeta.className = 'admin-topbar-user__meta';
        userMeta.textContent = (adminInfo.role ? String(adminInfo.role).toLowerCase() : '');
        userWrap.appendChild(userName);
        userWrap.appendChild(userMeta);
        topbarActions.appendChild(userWrap);

        var btnLogout = document.createElement('button');
        btnLogout.type = 'button';
        btnLogout.className = 'admin-topbar-logout';
        btnLogout.textContent = '登出';
        btnLogout.addEventListener('click', function(){
          btnLogout.disabled = true;
          fetch('/api/logout', { method:'POST', credentials:'include' })
            .catch(function(){})
            .finally(function(){
              location.href = '/admin/login';
            });
        });
        topbarActions.appendChild(btnLogout);
      }
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
    }

    var authState = window.AUTH && typeof window.AUTH.getState === 'function' ? window.AUTH.getState() : null;
    var existingRole = authState && authState.adminReady && authState.admin ? authState.admin.role : '';
    var fetchAdminInfo = function(){
      return fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
        .then(function(res){ return res.ok ? res.json() : null; })
        .then(function(data){
          if (!data || data.ok === false) return { role:'', name:'', email:'' };
          return {
            role: String(data.role || '').trim().toLowerCase(),
            name: String(data.name || '').trim(),
            email: String(data.email || '').trim()
          };
        })
        .catch(function(){ return { role:'', name:'', email:'' }; });
    };

    var ready = existingRole
      ? Promise.resolve({ role: String(existingRole || '').trim().toLowerCase(), name:'', email:'' })
      : fetchAdminInfo();

    ready.then(function(info){
      var role = (info && info.role) ? info.role : '';
      var finalItems = navItems.slice();
      if (role === 'fulfillment'){
        var allow = new Set(['/admin/fulfillment','/admin/orders','/admin/service-orders']);
        finalItems = navItems.filter(function(item){
          return allow.has(item.href);
        });
      } else if (role === 'owner'){
        finalItems = navItems.filter(function(item){
          return item.href !== '/admin/fulfillment';
        });
      } else if (role !== 'owner'){
        finalItems = navItems.filter(function(item){
          return item.href !== '/admin/audit-logs' && item.href !== '/admin/fulfillment' && item.href !== '/admin/admin-guide' && item.href !== '/admin/admin-roles';
        });
      }
      renderShell(finalItems, info);
    });
  }catch(_){
    // ignore
  }
})();
