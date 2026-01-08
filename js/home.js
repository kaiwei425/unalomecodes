(function(){
  var form = document.getElementById('heroForm');
  var input = document.getElementById('heroQuery');
  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  var navDrawer = document.getElementById('navDrawer');
  var navCtas = Array.from(document.querySelectorAll('[data-nav-cta]'));
  var langToggle = document.getElementById('langToggle');

  var LANG_KEY = 'uc_lang';
  var I18N = {
    zh: {
      'about-brand': 'unalomecodes | 懂玩泰國',
      'about-nav-temple': '寺廟地圖',
      'about-nav-food': '美食地圖',
      'about-nav-shop': '商城',
      'about-hero-title': '關於 unalomecodes',
      'about-hero-desc': '我們專注在泰國旅遊 × 信仰 × 在地文化的入口整理，讓你先理解、再探索。',
      'about-trust-1-title': '在地整理',
      'about-trust-1-desc': '把寺廟、在地美食與路線脈絡整理成清晰可用的探索體系，讓每一次旅程不再碎片，而是有脈絡、有方向的在地體驗。',
      'about-trust-2-title': '品牌立場',
      'about-trust-2-desc': '我們不簡化文化，也不神化它。提供參拜禮儀、風俗提醒與背景解讀，讓你帶著理解而不是好奇，去接觸泰國文化與在地生活。',
      'about-trust-3-title': '清晰可查的資訊來源',
      'about-trust-3-desc': '所有內容與服務資訊均有來源與背景標示，讓每一個選擇建立在理解之上，而不是疑問與不確定。',
      'nav-title': 'unalomecodes | 懂玩泰國',
      'drawer-label': '探索入口',
      'drawer-temple-desc': '用地圖探索寺廟與文化',
      'drawer-food-desc': '用地圖探索在地美食',
      'drawer-service-desc': '提供祈福服務及代捐棺木',
      'drawer-shop-desc': '精選服務與商品',
      'drawer-about-desc': 'unalomecodes品牌介紹',
      'home-nav-temple': '寺廟地圖',
      'home-nav-food': '美食地圖',
      'home-nav-shop': '商城',
      'home-nav-about': '關於我們',
      'home-nav-service': '祈福及代捐棺服務',
      'home-hero-kicker': '入口首頁',
      'home-hero-title': '最懂玩泰國的入口',
      'home-hero-subtitle': '懂拜拜、懂美食、懂在地，把泰國整理成你用得上的資訊。',
      'home-section-title': '入口導覽',
      'home-section-desc': '從地圖開始探索泰國文化與在地風味。',
      'home-entry-temple-title': '開運寺廟地圖',
      'home-entry-temple-desc': '用地圖探索寺廟與參拜重點。',
      'home-entry-temple-tag-1': '祈福',
      'home-entry-temple-tag-2': '路線',
      'home-entry-food-title': '在地美食地圖',
      'home-entry-food-desc': '用地圖整理夜市與口袋名單。',
      'home-entry-food-tag-1': '夜市',
      'home-entry-food-tag-2': '咖啡',
      'home-entry-service-title': '祈福服務',
      'home-entry-service-desc': '了解服務流程與在地安排細節。',
      'home-entry-service-tag-1': '服務',
      'home-entry-service-tag-2': '可追溯',
      'home-entry-shop-title': '商城',
      'home-entry-shop-desc': '精選服務與商品整理入口。',
      'home-entry-shop-tag-1': '精選',
      'home-entry-shop-tag-2': '服務',
      'home-creator-title': '創作者簡介',
      'about-creator-label': '創作者介紹',
      'about-creator-name': 'Kaiwei｜在地探索整理者',
      'about-creator-bio': '長期整理泰國寺廟與美食地圖，專注把繁雜資訊轉成可操作的旅遊路線。',
      'about-creator-tag-1': '曼谷常駐',
      'about-creator-tag-2': '信仰文化整理',
      'about-creator-tag-3': '路線規劃',
      'about-creator-ig-label': 'Instagram',
      'about-creator-yt-label': 'YouTube',
      'about-creator-fb-label': 'Facebook',
      'about-creator-line-label': 'LINE',
      'about-creator-tiktok-label': 'TikTok',
      'home-footer-left': 'Unalomecodes · 泰國入口網 STEP 1',
      'home-footer-right': '探索入口、整理在地、尊重文化'
    },
    en: {
      'about-brand': 'unalomecodes | Thailand Portal',
      'about-nav-temple': 'Temple Map',
      'about-nav-food': 'Food Map',
      'about-nav-shop': 'Shop',
      'about-hero-title': 'About unalomecodes',
      'about-hero-desc': 'We curate Thailand travel, belief, and local culture into a clear starting point.',
      'about-trust-1-title': 'Local Context',
      'about-trust-1-desc': 'We connect temples, local food, and route context into a clear exploration system so every trip feels coherent and directional.',
      'about-trust-2-title': 'Brand Stance',
      'about-trust-2-desc': 'We neither simplify culture nor mythologize it. We offer ritual etiquette, local customs, and background context so you engage with understanding, not curiosity.',
      'about-trust-3-title': 'Traceable Sources',
      'about-trust-3-desc': 'All content and service information includes sources and context, so every choice is grounded in understanding rather than uncertainty.',
      'nav-title': 'unalomecodes | Thailand Portal',
      'drawer-label': 'Explore',
      'drawer-temple-desc': 'Discover temples and culture on the map',
      'drawer-food-desc': 'Explore local food picks on the map',
      'drawer-service-desc': 'Blessing services & donation assistance',
      'drawer-shop-desc': 'Curated services and products',
      'drawer-about-desc': 'About unalomecodes',
      'home-nav-temple': 'Temple Map',
      'home-nav-food': 'Food Map',
      'home-nav-shop': 'Shop',
      'home-nav-about': 'About',
      'home-nav-service': 'Blessing Services',
      'home-hero-kicker': 'Home',
      'home-hero-title': 'Your Gateway to Thailand',
      'home-hero-subtitle': 'Temples, food, and local culture—organized into what you need.',
      'home-section-title': 'Explore',
      'home-section-desc': 'Start with maps to discover Thailand’s culture and flavors.',
      'home-entry-temple-title': 'Temple Map',
      'home-entry-temple-desc': 'Explore temples and key worship tips.',
      'home-entry-temple-tag-1': 'Blessing',
      'home-entry-temple-tag-2': 'Routes',
      'home-entry-food-title': 'Food Map',
      'home-entry-food-desc': 'Curated night markets and local picks.',
      'home-entry-food-tag-1': 'Night Market',
      'home-entry-food-tag-2': 'Cafe',
      'home-entry-service-title': 'Blessing Services',
      'home-entry-service-desc': 'See the service flow and local arrangements.',
      'home-entry-service-tag-1': 'Service',
      'home-entry-service-tag-2': 'Traceable',
      'home-entry-shop-title': 'Shop',
      'home-entry-shop-desc': 'A curated entry for services and products.',
      'home-entry-shop-tag-1': 'Curated',
      'home-entry-shop-tag-2': 'Service',
      'home-creator-title': 'Creator',
      'about-creator-label': 'Creator',
      'about-creator-name': 'Kaiwei | Local Explorer',
      'about-creator-bio': 'Curating temple and food maps in Thailand, turning complex info into usable routes.',
      'about-creator-tag-1': 'Based in Bangkok',
      'about-creator-tag-2': 'Spiritual Culture',
      'about-creator-tag-3': 'Route Design',
      'about-creator-ig-label': 'Instagram',
      'about-creator-yt-label': 'YouTube',
      'about-creator-fb-label': 'Facebook',
      'about-creator-line-label': 'LINE',
      'about-creator-tiktok-label': 'TikTok',
      'home-footer-left': 'Unalomecodes · Thailand Portal STEP 1',
      'home-footer-right': 'Explore, organize local life, respect culture'
    }
  };

  function applyLang(lang){
    var dict = I18N[lang] || I18N.zh;
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
    document.querySelectorAll('[data-edit-key]').forEach(function(el){
      if (el.dataset.editAttr) return;
      var key = el.dataset.editKey;
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    if (langToggle){
      langToggle.textContent = 'ZH/EN';
      langToggle.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切換英文');
      langToggle.dataset.lang = lang;
    }
  }

  function resolveLang(){
    var stored = '';
    try{ stored = localStorage.getItem(LANG_KEY) || ''; }catch(_){}
    if (stored === 'zh' || stored === 'en') return stored;
    var browser = (navigator.language || '').toLowerCase();
    return browser.startsWith('en') ? 'en' : 'zh';
  }

  function setLang(lang){
    try{ localStorage.setItem(LANG_KEY, lang); }catch(_){}
    applyLang(lang);
  }

  function handleSubmit(event){
    event.preventDefault();
    var value = (input && input.value || '').trim();
    var target = '/itinerary?q=' + encodeURIComponent(value || '不限');
    window.location.href = target;
  }

  if (form && input){
    form.addEventListener('submit', handleSubmit);
  }

  if (navCtas.length && input){
    navCtas.forEach(function(btn){
      btn.addEventListener('click', function(){
        setDrawer(false);
        setTimeout(function(){
          input.focus();
        }, 150);
      });
    });
  }

  function updateHeader(){
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setDrawer(open){
    if (!navDrawer || !navToggle) return;
    document.body.classList.toggle('nav-open', open);
    navDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (navToggle && navDrawer){
    navToggle.addEventListener('click', function(){
      var isOpen = document.body.classList.contains('nav-open');
      setDrawer(!isOpen);
    });

    navDrawer.addEventListener('click', function(event){
      var target = event.target;
      if (!target) return;
      if (target.matches('[data-nav-close]')){
        setDrawer(false);
        return;
      }
      if (target.tagName === 'A'){
        setDrawer(false);
      }
    });

    window.addEventListener('keydown', function(event){
      if (event.key === 'Escape'){
        setDrawer(false);
      }
    });
  }

  if (langToggle){
    langToggle.addEventListener('click', function(){
      var next = (langToggle.dataset.lang === 'en') ? 'zh' : 'en';
      setLang(next);
    });
  }

  applyLang(resolveLang());

  if (window.trackEvent){
    window.trackEvent('home_view', { pageType: 'home' });
  }
})();
