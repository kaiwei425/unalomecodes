(function(){
  const state = { user:null, ready:false, loading:false, profile:null, admin:false, adminReady:false };
  const listeners = [];
  const profileListeners = [];
  const adminListeners = [];
  const loginUrl = '/api/auth/google/login';

  function notify(){
    listeners.forEach(fn=>{
      try{ fn(state.user); }catch(_){}
    });
  }

  function updateWidgets(){
    const logged = !!state.user;
    document.querySelectorAll('[data-auth-widget]').forEach(el=>{
      el.classList.toggle('is-authed', logged);
    });
    document.querySelectorAll('[data-auth-status]').forEach(el=>{
      if (!state.ready && state.loading){
        el.textContent = '登入狀態載入中…';
      }else{
        el.textContent = logged
          ? (state.user.name || state.user.email || '已登入')
          : '尚未登入';
      }
    });
    document.querySelectorAll('[data-auth-btn]').forEach(btn=>{
      if (logged){
        btn.textContent = '登出';
        btn.dataset.authAction = 'logout';
      }else{
        btn.textContent = '使用 Google 登入';
        btn.dataset.authAction = 'login';
      }
      if (!state.loading || state.ready){
        btn.disabled = false;
      }
    });
    document.querySelectorAll('[data-admin-only]').forEach(el=>{
      el.style.display = state.admin ? '' : 'none';
    });
  }

  function notifyProfile(){
    profileListeners.forEach(fn=>{
      try{ fn(state.profile); }catch(_){}
    });
  }

  async function refreshProfile(){
    if (!state.user){
      state.profile = null;
      notifyProfile();
      return;
    }
    try{
      const res = await fetch('/api/me/profile', { credentials:'include' });
      if (res.ok){
        const data = await res.json().catch(()=>null);
        state.profile = data && data.profile ? data.profile : null;
      }else{
        state.profile = null;
      }
    }catch(_){
      state.profile = null;
    }
    notifyProfile();
  }

  async function refreshAdmin(){
    try{
      const res = await fetch('/api/auth/admin/me', { credentials:'include' });
      if (res.ok){
        state.admin = true;
      }else{
        state.admin = false;
      }
    }catch(_){
      state.admin = false;
    }
    state.adminReady = true;
    updateWidgets();
    adminListeners.forEach(fn=>{ try{ fn(state.admin); }catch(_){ } });
  }

  async function refreshUser(){
    state.loading = true;
    updateWidgets();
    try{
      const res = await fetch('/api/auth/me', { credentials:'include' });
      if (res.ok){
        const data = await res.json().catch(()=>null);
        if (data && data.ok && data.user){
          state.user = data.user;
        }else{
          state.user = null;
        }
      }else{
        state.user = null;
      }
    }catch(_){
      state.user = null;
    }
    state.loading = false;
    state.ready = true;
    updateWidgets();
    notify();
    refreshProfile();
    refreshAdmin();
  }

  function login(){
    try{
      const path = window.location.pathname + window.location.search + window.location.hash;
      const redirectParam = encodeURIComponent(path || '/shop.html');
      window.location.href = `${loginUrl}?redirect=${redirectParam}`;
    }catch(_){
      window.location.href = `${loginUrl}?redirect=%2Fshop.html`;
    }
  }

  async function logout(){
    try{
      await fetch('/api/logout', { method:'POST', credentials:'include' });
    }catch(_){}
    state.user = null;
    state.profile = null;
    updateWidgets();
    notifyProfile();
    window.location.reload();
  }

  function promptLogin(message){
    const msg = message || '請先登入以使用完整功能。';
    if (window.confirm(msg)){
      login();
    }
  }

  function isLoggedIn(){
    return !!state.user;
  }

  function requireLogin(message){
    if (state.user){
      return Promise.resolve(state.user);
    }
    promptLogin(message);
    return Promise.reject(new Error('login_required'));
  }

  document.addEventListener('click', ev=>{
    const btn = ev.target.closest('[data-auth-btn]');
    if (!btn) return;
    ev.preventDefault();
    if (btn.disabled) return;
    if (state.user){
      btn.disabled = true;
      logout();
    }else{
      btn.disabled = true;
      login();
    }
  });

  window.authState = {
    getUser: ()=>state.user,
    getProfile: ()=>state.profile,
    isAdmin: ()=>state.admin,
    isLoggedIn,
    login,
    logout,
    promptLogin,
    requireLogin,
    refreshProfile,
    refreshAdmin,
    subscribe(fn){
      if (typeof fn === 'function'){
        listeners.push(fn);
        if (state.ready){
          try{ fn(state.user); }catch(_){}
        }
      }
    },
    onProfile(fn){
      if (typeof fn === 'function'){
        profileListeners.push(fn);
        if (state.ready){
          try{ fn(state.profile); }catch(_){}
        }
      }
    },
    onAdmin(fn){
      if (typeof fn === 'function'){
        adminListeners.push(fn);
        if (state.adminReady){
          try{ fn(state.admin); }catch(_){}
        }
      }
    }
  };

  refreshUser();
})();
