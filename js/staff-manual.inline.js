(function(){
  var guard = document.getElementById('staffManualGuard');
  var content = document.getElementById('staffManualContent');
  var toc = document.getElementById('manualToc');

  function resolveRoleFromDom(){
    var meta = document.querySelector('.admin-topbar-user__meta');
    if (meta && meta.textContent) return meta.textContent.trim().toLowerCase();
    return '';
  }

  function fetchAdminRole(){
    return fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' })
      .then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){
          var role = String((data && data.role) || '').trim().toLowerCase();
          return { ok: res.ok && data && data.ok, role: role, data: data || {} };
        });
      })
      .catch(function(){ return { ok:false, role:'', data:{} }; });
  }

  function applyGuardByRole(role){
    var ok = (role === 'owner' || role === 'booking');
    if (guard) guard.style.display = ok ? 'none' : '';
    if (content) content.style.display = ok ? '' : 'none';
    return ok;
  }

  function safeText(s){
    return String(s || '').replace(/[&<>"]/g, function(ch){
      if (ch === '&') return '&amp;';
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      return '&quot;';
    });
  }

  function ensureId(node){
    if (!node || node.id) return node && node.id;
    var text = String(node.textContent || '').trim().toLowerCase();
    var base = text.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g,'').slice(0,80);
    node.id = base || ('sec-' + Math.random().toString(36).slice(2));
    return node.id;
  }

  function buildToc(){
    if (!toc) return;
    var scope = content || document;
    var headings = Array.from(scope.querySelectorAll('h2, h3'))
      .filter(function(h){
        // Only include headings inside the main manual content.
        return !!h.closest && !!h.closest('.manual-main');
      });
    toc.innerHTML = '';
    headings.forEach(function(h){
      var id = ensureId(h);
      if (!id) return;
      var a = document.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + id;
      var indent = (h.tagName || '').toLowerCase() === 'h3' ? '↳' : '•';
      a.innerHTML = '<span class="toc-indent">' + indent + '</span><span>' + safeText(h.textContent || '') + '</span>';
      toc.appendChild(a);
    });

    function setActiveByHash(){
      var hash = String(location.hash || '').replace(/^#/, '');
      if (!hash) return;
      var links = toc.querySelectorAll('a.toc-link');
      links.forEach(function(l){
        l.classList.toggle('is-active', l.getAttribute('href') === ('#' + hash));
      });
    }

    setActiveByHash();
    window.addEventListener('hashchange', setActiveByHash);

    if ('IntersectionObserver' in window){
      var map = new Map();
      toc.querySelectorAll('a.toc-link').forEach(function(a){
        var href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        map.set(href.slice(1), a);
      });
      var last = '';
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          var id = entry.target && entry.target.id;
          if (!id || !map.has(id)) return;
          last = id;
        });
        if (!last) return;
        map.forEach(function(a, id){
          a.classList.toggle('is-active', id === last);
        });
      }, { root:null, rootMargin:'-20% 0px -75% 0px', threshold:[0,1] });
      headings.forEach(function(h){
        if (!h.id) return;
        obs.observe(h);
      });
    }
  }

  function initIfAllowed(){
    buildToc();
  }

  function waitForRole(retries){
    var role = resolveRoleFromDom();
    if (role){
      if (applyGuardByRole(role)) initIfAllowed();
      return;
    }
    if (retries <= 0){
      fetchAdminRole().then(function(r){
        if (applyGuardByRole(r.role)) initIfAllowed();
      });
      return;
    }
    setTimeout(function(){ waitForRole(retries - 1); }, 250);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ waitForRole(10); });
  }else{
    waitForRole(10);
  }
})();
