(function(){
  const btnGoogle = document.getElementById('btnAdminGoogle');
  const btnLine = document.getElementById('btnAdminLine');
  const langZh = document.getElementById('langZh');
  const langEn = document.getElementById('langEn');
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || '/admin';

  const I18N = {
    zh: {
      title: '管理員登入',
      subtitle: '請使用已授權的帳號登入後台。',
      method_label: '登入方式',
      forgot: '忘記權限？',
      btn_google: '使用 Google 登入',
      btn_line: '使用 LINE 登入（未開放）',
      hint: '若登入後顯示權限不足，請聯繫 Owner 開通。'
    },
    en: {
      title: 'Admin sign in',
      subtitle: 'Sign in with an authorized admin account.',
      method_label: 'Sign-in method',
      forgot: 'Forgot access?',
      btn_google: 'Continue with Google',
      btn_line: 'Continue with LINE (disabled)',
      hint: 'If you see “not authorized”, contact the Owner to grant access.'
    }
  };

  function detectLang(){
    try{
      const saved = localStorage.getItem('adminLang');
      if (saved === 'zh' || saved === 'en') return saved;
    }catch(_){}
    const nav = String(navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  let ADMIN_LANG = detectLang();

  function t(key){
    const dict = I18N[ADMIN_LANG] || I18N.zh;
    return dict[key] || I18N.zh[key] || key;
  }

  function applyI18n(){
    document.documentElement.lang = (ADMIN_LANG === 'en') ? 'en' : 'zh-Hant';
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) return;
      const next = t(key);
      if (next) node.textContent = next;
    });
    if (btnGoogle){
      const label = btnGoogle.querySelector('.btn-label');
      if (label) label.textContent = t('btn_google');
      else btnGoogle.textContent = t('btn_google');
    }
    if (btnLine){
      const label = btnLine.querySelector('.btn-label');
      if (label) label.textContent = t('btn_line');
      else btnLine.textContent = t('btn_line');
    }
    if (langZh) langZh.classList.toggle('is-active', ADMIN_LANG === 'zh');
    if (langEn) langEn.classList.toggle('is-active', ADMIN_LANG === 'en');
  }

  function setLang(lang){
    ADMIN_LANG = (lang === 'en') ? 'en' : 'zh';
    try{ localStorage.setItem('adminLang', ADMIN_LANG); }catch(_){}
    applyI18n();
  }

  async function checkAdmin(){
    try{
      const res = await fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' });
      const data = await res.json().catch(()=>null);
      if (res.ok && data && data.ok){
        location.href = redirect;
        return true;
      }
    }catch(_){
      // ignore
    }
    return false;
  }

  if (langZh) langZh.addEventListener('click', () => setLang('zh'));
  if (langEn) langEn.addEventListener('click', () => setLang('en'));
  applyI18n();

  if (btnGoogle){
    btnGoogle.addEventListener('click', () => {
      btnGoogle.classList.add('is-loading');
      btnGoogle.setAttribute('aria-busy', 'true');
      const url = `/api/auth/google/admin/start?redirect=${encodeURIComponent(redirect)}`;
      location.href = url;
    });
  }
  if (btnLine){
    btnLine.addEventListener('click', () => {
      alert(ADMIN_LANG === 'en' ? 'Only Google admin sign-in is available.' : '目前僅支援 Google 管理員登入');
    });
  }

  checkAdmin();
})();
