(function(){
  const state = { user:null, ready:false, loading:false, profile:null, admin:false, adminReady:false };
  const listeners = [];
  const profileListeners = [];
  const adminListeners = [];
  const loginUrl = '/api/auth/google/login';
  const lineLoginUrl = '/api/auth/line/login';
  const lineLoginEnabled = typeof window.LINE_LOGIN_ENABLED === 'boolean'
    ? window.LINE_LOGIN_ENABLED
    : true;
  const liffId = window.LIFF_ID || '';
  let liffReady = false;
  let liffInitPromise = null;
  function isLineWebView(){
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('line')) return true;
    try{
      return !!(window.liff && window.liff.isInClient && window.liff.isInClient());
    }catch(_){
      return false;
    }
  }

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
        btn.textContent = '登入會員';
        btn.dataset.authAction = 'login';
      }
      if (!state.loading || state.ready){
        btn.disabled = false;
      }
    });
    document.querySelectorAll('[data-admin-only]').forEach(el=>{
      el.style.display = state.admin ? '' : 'none';
      if (el.tagName === 'A'){
        if (state.admin){
          const target = el.getAttribute('data-admin-href') || '/admin/';
          el.setAttribute('href', target);
        }else{
          // 確保非 admin 時移除可能殘留的 href
          el.setAttribute('href', '#');
        }
      }
    });
  }

  async function initLiff(){
    if (!liffId || !window.liff || typeof window.liff.init !== 'function') return false;
    if (liffInitPromise) return liffInitPromise;
    liffInitPromise = (async ()=>{
      try{
        await window.liff.init({ liffId });
        liffReady = true;
        updateWidgets();
        return true;
      }catch(_){
        liffReady = false;
        return false;
      }
    })();
    return liffInitPromise;
  }

  async function liffLoginIfNeeded(){
    const ok = await initLiff();
    if (!ok) return false;
    try{
      if (!window.liff.isLoggedIn()){
        if (window.liff.isInClient && window.liff.isInClient()){
          window.liff.login({ redirectUri: window.location.href });
          return true;
        }
        return false;
      }
      const idToken = window.liff.getIDToken ? window.liff.getIDToken() : '';
      if (!idToken) return false;
      await fetch('/api/auth/line/liff', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ id_token: idToken })
      });
      return true;
    }catch(_){
      return false;
    }
  }

  function notifyProfile(){
    profileListeners.forEach(fn=>{
      try{ fn(state.profile); }catch(_){}
    });
  }

  let welcomeNoticeChecked = false;
  async function maybeNotifyWelcomeCoupon(){
    if (welcomeNoticeChecked) return;
    if (!state.user) return;
    welcomeNoticeChecked = true;
    if (typeof showToast !== 'function' || !document.getElementById('toast')) return;
    try{
      const res = await fetch('/api/me/coupons', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || !data.ok) return;
      const items = Array.isArray(data.items) ? data.items : [];
      const nowTs = Date.now();
      const welcome = items.find(c=>{
        if (!c) return false;
        const from = String(c.issuedFrom || '').toLowerCase();
        if (from !== 'welcome') return false;
        if (c.used) return false;
        if (c.expireAt){
          const exp = Date.parse(c.expireAt);
          if (!Number.isNaN(exp) && exp <= nowTs) return false;
        }
        return true;
      });
      if (!welcome) return;
      const code = String(welcome.code || '').trim().toUpperCase();
      const seenKey = '__welcome_coupon_seen__' + code;
      try{
        if (localStorage.getItem(seenKey)) return;
      }catch(_){}
      const amount = Number(welcome.amount || 200) || 200;
      showToast(`🎁 歡迎禮已發放：NT$${amount} 全館折價券（14天內有效）`);
      try{ localStorage.setItem(seenKey, String(Date.now())); }catch(_){}
    }catch(_){}
  }

  let bindingGuardian = false;
  const QUIZ_BIND_KEY = '__lastQuizBindPending__';
  const QUIZ_BIND_TTL = 2 * 60 * 60 * 1000;
  function clearLocalQuizCache(){
    try{
      localStorage.removeItem('__lastQuizGuardian__');
      localStorage.removeItem('__lastQuizProfile__');
      localStorage.removeItem(QUIZ_BIND_KEY);
    }catch(_){}
  }
  function readQuizBindPendingTs(){
    try{
      const raw = localStorage.getItem(QUIZ_BIND_KEY);
      if (!raw) return 0;
      const obj = JSON.parse(raw);
      const ts = Number(obj && obj.ts ? obj.ts : 0);
      if (!ts) return 0;
      if (Date.now() - ts > QUIZ_BIND_TTL){
        clearLocalQuizCache();
        return 0;
      }
      return ts;
    }catch(_){
      return 0;
    }
  }
  function readLocalQuizPayload(){
    let guardian = null;
    let quiz = null;
    if (!readQuizBindPendingTs()) return null;
    try{
      const raw = localStorage.getItem('__lastQuizGuardian__');
      if (raw){
        const obj = JSON.parse(raw);
        const code = String(obj.code || '').trim().toUpperCase();
        const name = String(obj.name || '').trim();
        if (/^[A-Z]{2}$/.test(code)){
          guardian = { code, name: name || code, ts: obj.ts ? new Date(obj.ts).toISOString() : new Date().toISOString() };
        }
      }
    }catch(_){}
    try{
      const raw = localStorage.getItem('__lastQuizProfile__');
      if (raw){
        const obj = JSON.parse(raw);
        if (obj && (obj.dow || obj.zod || obj.job)){
          quiz = obj;
        }
      }
    }catch(_){}
    if (!guardian) return null;
    return { guardian, quiz };
  }
  async function bindLocalGuardianIfNeeded(profile){
    if (bindingGuardian) return;
    if (!profile || profile.guardian){
      if (profile && profile.guardian) clearLocalQuizCache();
      return;
    }
    const local = readLocalQuizPayload();
    if (!local || !local.guardian) return;
    const guardianName = local.guardian.name || local.guardian.code || '守護神';
    const shouldBind = window.confirm(`您剛才的測驗結果為守護神 ${guardianName}，是否要自動帶入此帳號？`);
    if (!shouldBind){
      clearLocalQuizCache();
      return;
    }
    bindingGuardian = true;
    try{
      await fetch('/api/me/profile', {
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({
          guardian: local.guardian,
          quiz: local.quiz || undefined
        })
      });
      clearLocalQuizCache();
      await refreshProfile();
    }catch(_){}
    bindingGuardian = false;
  }

  async function refreshProfile(){
    if (!state.user){
      state.profile = null;
      notifyProfile();
      return;
    }
    try{
      const res = await fetch('/api/me/profile', { credentials:'include', cache:'no-store' });
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
    bindLocalGuardianIfNeeded(state.profile);
  }

  async function refreshAdmin(){
    if (!state.user){
      state.admin = false;
      state.adminReady = true;
      updateWidgets();
      adminListeners.forEach(fn=>{ try{ fn(state.admin); }catch(_){ } });
      return;
    }
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
    maybeNotifyWelcomeCoupon();
  }

  function lineLogin(){
    try{
      const path = window.location.pathname + window.location.search + window.location.hash;
      const redirectParam = encodeURIComponent(path || '/shop');
      window.location.href = `${lineLoginUrl}?redirect=${redirectParam}`;
    }catch(_){
      window.location.href = `${lineLoginUrl}?redirect=%2Fshop`;
    }
  }

  let loginDialog = null;
  let loginDialogResolve = null;
  function ensureLoginDialog(){
    if (loginDialog) return loginDialog;
    const style = document.createElement('style');
    style.textContent = `
      .auth-login-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:200000;}
      .auth-login-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.6);backdrop-filter:blur(2px);}
      .auth-login-panel{position:relative;background:linear-gradient(180deg,#ffffff,#f8fafc);color:#0f172a;border-radius:20px;padding:20px 18px;min-width:260px;width:min(360px,92%);box-shadow:0 30px 70px rgba(0,0,0,.35);border:1px solid rgba(148,163,184,.25);}
      .auth-login-title{font-size:18px;font-weight:800;margin-bottom:6px;letter-spacing:.3px;}
      .auth-login-desc{font-size:13px;color:#64748b;margin-bottom:14px;line-height:1.6;}
      .auth-login-legal{margin:0 0 16px;padding:12px 14px;border-radius:12px;border:1px solid #e2e8f0;background:#f1f5f9;font-size:12px;color:#475569;line-height:1.7;}
      .auth-login-legal ul{margin:6px 0 0;padding-left:18px;}
      .auth-login-legal li{margin:4px 0;}
      .auth-login-consent{margin-top:6px;color:#0f172a;font-weight:700;}
      .auth-login-actions{display:grid;gap:10px;margin:12px 0 4px;}
      .auth-login-btn{border:none;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 10px 24px rgba(15,23,42,.14);transition:transform .16s ease, box-shadow .16s ease;}
      .auth-login-btn:hover{transform:translateY(-1px);box-shadow:0 16px 30px rgba(15,23,42,.2);}
      .auth-login-icon{width:20px;height:20px;display:inline-block;background-size:contain;background-repeat:no-repeat;background-position:center;flex:0 0 auto;}
      .auth-login-icon.line{background-image:url(\"/img/brand/logo-line.png\");}
      .auth-login-icon.google{background-image:url(\"/img/google-logo.png\");}
      .auth-login-btn.line{background:#fff;color:#06c755;border:1px solid rgba(6,199,85,.4);}
      .auth-login-btn.google{background:#fff;color:#0f172a;border:1px solid rgba(59,130,246,.18);}
      .auth-login-cancel{margin-top:10px;font-size:12px;color:#94a3b8;text-align:center;cursor:pointer;}
    `;
    document.head.appendChild(style);
    const modal = document.createElement('div');
    modal.className = 'auth-login-modal';
    modal.innerHTML = `
      <div class="auth-login-backdrop" data-auth-login-close></div>
      <div class="auth-login-panel" role="dialog" aria-modal="true">
        <div class="auth-login-title">登入會員</div>
        <div class="auth-login-desc">請選擇登入方式</div>
        <div class="auth-login-legal">
          為完成會員登入與服務，我們會取得您的基本資料（姓名、Email、帳號識別碼、頭像），並僅用於：
          <ul>
            <li>會員身分識別與登入狀態維持</li>
            <li>訂單／日籤通知與查詢、客服聯繫</li>
            <li>必要的服務與系統通知</li>
          </ul>
          <div class="auth-login-consent">點擊登入代表您已閱讀並同意本網站之服務條款與隱私權政策。</div>
        </div>
        <div class="auth-login-actions">
          <button type="button" class="auth-login-btn line" data-auth-login-provider="line">
            <span class="auth-login-icon line" aria-hidden="true"></span>LINE 登入
          </button>
          <button type="button" class="auth-login-btn google" data-auth-login-provider="google">
            <span class="auth-login-icon google" aria-hidden="true"></span>Google 登入
          </button>
        </div>
        <div class="auth-login-cancel" data-auth-login-close>取消</div>
      </div>
    `;
    modal.addEventListener('click', ev=>{
      const providerBtn = ev.target.closest('[data-auth-login-provider]');
      if (providerBtn){
        const provider = providerBtn.getAttribute('data-auth-login-provider') || '';
        closeLoginDialog(provider);
        return;
      }
      if (ev.target.closest('[data-auth-login-close]')){
        closeLoginDialog('');
      }
    });
    document.body.appendChild(modal);
    loginDialog = modal;
    return loginDialog;
  }
  function openLoginDialog(){
    return new Promise(resolve=>{
      if (!lineLoginEnabled){
        resolve('google');
        return;
      }
      const dlg = ensureLoginDialog();
      loginDialogResolve = resolve;
      dlg.style.display = 'flex';
    });
  }
  function closeLoginDialog(provider){
    if (loginDialog){
      loginDialog.style.display = 'none';
    }
    if (loginDialogResolve){
      loginDialogResolve(provider || '');
      loginDialogResolve = null;
    }
  }

  async function login(){
    const liffOk = await initLiff();
    if (liffOk){
      try{
        const inClient = window.liff && window.liff.isInClient && window.liff.isInClient();
        if (inClient){
          if (!window.liff.isLoggedIn()){
            window.liff.login({ redirectUri: window.location.href });
            return;
          }
          const idToken = window.liff.getIDToken ? window.liff.getIDToken() : '';
          if (idToken){
            await fetch('/api/auth/line/liff', {
              method:'POST',
              headers:{ 'Content-Type':'application/json' },
              credentials:'include',
              body: JSON.stringify({ id_token: idToken })
            });
            window.location.reload();
            return;
          }
        }
      }catch(_){}
    }
    if (isLineWebView()){
      if (lineLoginEnabled){
        lineLogin();
      }else{
        alert('LINE 內建瀏覽器無法使用 Google 登入，請改用外部瀏覽器開啟。');
      }
      return;
    }
    if (lineLoginEnabled){
      const choice = await openLoginDialog();
      if (choice === 'line'){
        lineLogin();
        return;
      }
      if (choice === 'google'){
        // fall through to google
      }else{
        return;
      }
    }
    try{
      const path = window.location.pathname + window.location.search + window.location.hash;
      const redirectParam = encodeURIComponent(path || '/shop');
      window.location.href = `${loginUrl}?redirect=${redirectParam}`;
    }catch(_){
      window.location.href = `${loginUrl}?redirect=%2Fshop`;
    }
  }

  async function logout(){
    try{
      await fetch('/api/logout', { method:'POST', credentials:'include' });
    }catch(_){}
    state.user = null;
    state.profile = null;
    state.loading = false;
    state.ready = true;
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

  document.addEventListener('click', async ev=>{
    const btn = ev.target.closest('[data-auth-btn]');
    if (!btn) return;
    ev.preventDefault();
    if (btn.disabled) return;
    if (state.user){
      btn.disabled = true;
      try{
        await logout();
      }finally{
        btn.disabled = false;
      }
    }else{
      btn.disabled = true;
      try{
        await login();
      }finally{
        btn.disabled = false;
      }
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

  (async ()=>{
    await liffLoginIfNeeded();
    refreshUser();
  })();
})();
