(function(){
  var form = document.getElementById('heroForm');
  var input = document.getElementById('heroQuery');
  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  var navDrawer = document.getElementById('navDrawer');
  var navCtas = Array.from(document.querySelectorAll('[data-nav-cta]'));
  var langToggle = document.getElementById('langToggle');
  var heroQuizCta = document.querySelector('[data-hero-quiz-cta]');
  var heroTempleCta = document.querySelector('[data-hero-temple-cta]');

  var LANG_KEY = 'uc_lang';
  var I18N = {
    zh: {
      'nav-title': 'unalomecodes | 懂玩泰國',
      'home-nav-temple': '寺廟地圖',
      'home-nav-food': '美食地圖',
      'home-nav-shop': '商城',
      'home-nav-about': '關於我們',
      'home-nav-service': '祈福及代捐棺服務',
      'drawer-label': '探索入口',
      'drawer-temple-desc': '用地圖探索寺廟與文化',
      'drawer-food-desc': '用地圖探索在地美食',
      'drawer-service-desc': '提供祈福服務及代捐棺木',
      'drawer-shop-desc': '精選服務與商品',
      'drawer-about-desc': 'unalomecodes品牌介紹',
      'home-hero-kicker': '入口首頁',
      'home-hero-title': '最懂玩泰國的入口',
      'home-hero-subtitle': '懂拜拜、懂美食、懂在地，把泰國整理成你用得上的資訊。',
      'home-hero-cta-primary': '1 分鐘找到你的守護神',
      'home-hero-cta-secondary': '探索寺廟地圖',
      'home-hero-cta-note': '完成後會得到命中指引、行動建議與可下載的守護卡',
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
      'home-section-title': '入口導覽',
      'home-section-note': '跟我一起探索泰國',
      'home-entry-quiz-title': '神祇測驗',
      'home-entry-quiz-desc': '用狀態與生日線索，快速匹配此刻最適合你的守護神',
      'home-entry-quiz-tag-1': '個人化',
      'home-entry-quiz-tag-2': '行動建議',
      'home-entry-quiz-tag-3': '守護卡',
      'home-entry-temple-title': '開運寺廟地圖',
      'home-entry-temple-desc': '精選泰國必拜寺廟，直接找出與您心靈共鳴的地方',
      'home-entry-temple-tag-1': '祈福',
      'home-entry-temple-tag-2': '開運',
      'home-entry-food-title': '在地美食地圖',
      'home-entry-food-desc': '一鍵顯示與您最近的美食地圖，方便規劃及安排行程',
      'home-entry-food-tag-1': '隱藏在地美食',
      'home-entry-food-tag-2': '泰國必吃',
      'home-entry-service-title': '祈福服務及義德善堂捐棺',
      'home-entry-service-desc': '提供泰國蠟燭、法會祈福及義德善堂代捐棺木行善等服務，都會提供影片及照片。',
      'home-entry-service-tag-1': '服務',
      'home-entry-service-tag-2': '影片及照片',
      'home-entry-shop-title': 'Unalomecodes商城',
      'home-entry-shop-desc': '可先點選測驗與您有緣的神祇，找到與您共鳴的守護神，精選泰國佛牌及聖物。未來也會推出泰國必買/代購商品。',
      'home-entry-shop-tag-1': '精選',
      'home-entry-shop-tag-2': '服務',
      'home-creator-title': '創作者簡介',
      'about-creator-label': '作者介紹',
      'about-creator-name': 'Kaiwei｜曼谷讀書人',
      'about-creator-bio': '📍 Taiwanese in Bangkok | MA student at Chula\n🧭 Exploring local life, hidden gems & food\n✉️ bkkaiwei@gmail.com',
      'about-creator-tag-1': '曼谷常駐',
      'about-creator-tag-2': '在地生活',
      'about-creator-tag-3': '在地美食寺廟介紹',
      'about-back': '返回上一頁'
    },
    en: {
      'nav-title': 'unalomecodes | Thailand Portal',
      'home-nav-temple': 'Temple Map',
      'home-nav-food': 'Food Map',
      'home-nav-shop': 'Shop',
      'home-nav-about': 'About',
      'home-nav-service': 'Blessing Services',
      'drawer-label': 'Explore',
      'drawer-temple-desc': 'Discover temples and culture on the map',
      'drawer-food-desc': 'Explore local food picks on the map',
      'drawer-service-desc': 'Blessing services & donation assistance',
      'drawer-shop-desc': 'Curated services and products',
      'drawer-about-desc': 'About unalomecodes',
      'home-hero-kicker': 'Home',
      'home-hero-title': 'Your Gateway to Thailand',
      'home-hero-subtitle': 'Temples, food, and local culture—organized into what you need.',
      'home-hero-cta-primary': 'Find your deity in 1 minute',
      'home-hero-cta-secondary': 'Explore the temple map',
      'home-hero-cta-note': 'You’ll get insights, next-step actions, and a downloadable protection card.',
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
      'home-section-title': 'Portal Guide',
      'home-section-note': 'Explore Thailand with me',
      'home-entry-quiz-title': 'Deity Quiz',
      'home-entry-quiz-desc': 'A quick match based on your current state and birth cues.',
      'home-entry-quiz-tag-1': 'Personalized',
      'home-entry-quiz-tag-2': 'Next steps',
      'home-entry-quiz-tag-3': 'Shareable card',
      'home-entry-temple-title': 'Temple Map',
      'home-entry-temple-desc': 'Curated must-visit temples so you can find places that resonate with you.',
      'home-entry-temple-tag-1': 'Blessing',
      'home-entry-temple-tag-2': 'Good Fortune',
      'home-entry-food-title': 'Local Food Map',
      'home-entry-food-desc': 'Show nearby food spots at a glance to plan and route your trip.',
      'home-entry-food-tag-1': 'Hidden Local Eats',
      'home-entry-food-tag-2': 'Thailand Must-Eats',
      'home-entry-service-title': 'Blessing Services & Yi De Charity Coffin Donation',
      'home-entry-service-desc': 'We provide Thai candle rituals, blessing ceremonies, and Yi De charity coffin donations—with video and photo proof.',
      'home-entry-service-tag-1': 'Services',
      'home-entry-service-tag-2': 'Video & Photos',
      'home-entry-shop-title': 'Unalomecodes Shop',
      'home-entry-shop-desc': 'Take the quiz to find the deity that resonates with you, then explore curated Thai amulets and sacred items. More Thailand must-buys and sourcing services are coming.',
      'home-entry-shop-tag-1': 'Curated',
      'home-entry-shop-tag-2': 'Services',
      'home-creator-title': 'Creator',
      'about-creator-label': 'Creator',
      'about-creator-name': 'Kaiwei | Bangkok Scholar',
      'about-creator-bio': '📍 Taiwanese in Bangkok | MA student at Chula\n🧭 Exploring local life, hidden gems & food\n✉️ bkkaiwei@gmail.com',
      'about-creator-tag-1': 'Based in Bangkok',
      'about-creator-tag-2': 'Local Life',
      'about-creator-tag-3': 'Local Food & Temples',
      'about-back': 'Back'
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

  if (typeof window.track === 'function'){
    if (heroQuizCta){
      heroQuizCta.addEventListener('click', function(){
        window.track('home_quiz_cta_click');
      });
    }
    if (heroTempleCta){
      heroTempleCta.addEventListener('click', function(){
        window.track('home_temple_cta_click');
      });
    }
  }

  if (window.trackEvent){
    window.trackEvent('home_view', { pageType: 'home' });
  }
})();
