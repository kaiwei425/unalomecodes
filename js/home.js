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
      'deity-state-template': '適合正在「{k1}、{k2}」階段的人，尤其當你需要更穩的「{s1}」時',
      'deity-state-fallback': '適合在關鍵轉換期尋求更穩定守護的人',
      'about-brand': 'unalomecodes | 懂玩泰國',
      'about-nav-temple': '寺廟地圖',
      'about-nav-food': '美食地圖',
      'about-nav-shop': '商城',
      'about-hero-title': '關於 unalomecodes',
      'about-hero-desc': '我們專注在泰國旅遊 × 信仰 × 在地文化的入口整理，讓你先理解、再探索。',
      'about-method-line-1': '不是占卜，也不替你做決定。',
      'about-method-line-2': '我們關心的是你此刻的狀態與可行動的方向。',
      'about-method-line-3': '透過狀態對位守護，讓行動更有節奏與依據。',
      'about-method-steps': '看懂狀態 → 找到對位 → 採取行動',
      'about-method-line-4': '守護不是依賴，而是一種更清晰的自我選擇。',
      'about-trust-1-title': '在地整理',
      'about-trust-1-desc': '把寺廟、在地美食與路線脈絡整理成清晰可用的探索體系，讓每一次旅程不再碎片，而是有脈絡、有方向的在地體驗。',
      'about-trust-2-title': '品牌立場',
      'about-trust-2-desc': '我們不簡化文化，也不神化它。提供參拜禮儀、風俗提醒與背景解讀，讓你帶著理解而不是好奇，去接觸泰國文化與在地生活。',
      'about-trust-3-title': '清晰可查的資訊來源',
      'about-trust-3-desc': '所有內容與服務資訊均有來源與背景標示，讓每一個選擇建立在理解之上，而不是疑問與不確定。',
      'home-section-title': '入口導覽',
      'home-section-note': '跟我一起探索泰國',
      'home-testimonial-kicker': '信任足跡',
      'home-testimonial-title': '信任見證',
      'home-testimonial-subtitle': '實體商品與祈福服務的即時回饋，讓你更信任下一步。',
      'home-testimonial-product-link': '瀏覽實體商品',
      'home-testimonial-service-link': '了解祈福服務',
      'home-testimonial-cta': '查看更多顧客心得',
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
      'deity-state-template': 'Best for phases of “{k1}, {k2}”, especially when you need steadier “{s1}”.',
      'deity-state-fallback': 'A good fit when you’re in a transition and want steadier protection.',
      'about-brand': 'unalomecodes | Thailand Portal',
      'about-nav-temple': 'Temple Map',
      'about-nav-food': 'Food Map',
      'about-nav-shop': 'Shop',
      'about-hero-title': 'About unalomecodes',
      'about-hero-desc': 'We curate Thailand travel, belief, and local culture into a clear starting point.',
      'about-method-line-1': 'It’s not fortune-telling, and it doesn’t decide for you.',
      'about-method-line-2': 'We care about your current state and the actions you can take now.',
      'about-method-line-3': 'By matching your state with the right protection, your actions gain rhythm and clarity.',
      'about-method-steps': 'Understand → Match → Take action',
      'about-method-line-4': 'Protection isn’t dependence; it’s a clearer way to choose.',
      'about-trust-1-title': 'Local Context',
      'about-trust-1-desc': 'We connect temples, local food, and route context into a clear exploration system so every trip feels coherent and directional.',
      'about-trust-2-title': 'Brand Stance',
      'about-trust-2-desc': 'We neither simplify culture nor mythologize it. We offer ritual etiquette, local customs, and background context so you engage with understanding, not curiosity.',
      'about-trust-3-title': 'Traceable Sources',
      'about-trust-3-desc': 'All content and service information includes sources and context, so every choice is grounded in understanding rather than uncertainty.',
      'home-section-title': 'Portal Guide',
      'home-section-note': 'Explore Thailand with me',
      'home-testimonial-kicker': 'Trust Signals',
      'home-testimonial-title': 'Trust Chronicles',
      'home-testimonial-subtitle': 'Real feedback on goods and blessings so you can explore with confidence.',
      'home-testimonial-product-link': 'Browse physical products',
      'home-testimonial-service-link': 'Explore blessing services',
      'home-testimonial-cta': 'Read more stories',
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

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }
  function formatStoryDate(timestamp){
    try{
      if (!timestamp) return '';
      var date = new Date(timestamp);
      return date.toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'zh-TW', {
        year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit',
        hour12:false
      });
    }catch(_){
      return '';
    }
  }
  function normalizeStoryCode(raw){
    try{
      var val = String(raw || '').trim();
      return val ? val.toUpperCase() : '';
    }catch(_){
      return '';
    }
  }
  function toDeityCode(name){
    const s = String(name||'').trim();
    if (!s) return '';
    const u = s.toUpperCase();
    if (/^[A-Z]{2}$/.test(u)) return u;
    if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/.test(s)) return 'FM';
    if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/.test(s))   return 'GA';
    if (/崇迪|SOMDEJ|SOMDET/.test(s))                      return 'CD';
    if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/.test(s))  return 'KP';
    if (/哈魯曼|H(AN|AR)UMAN/.test(s))                     return 'HM';
    if (/拉胡|RAHU/.test(s))                                return 'RH';
    if (/迦樓羅|GARUDA|K(AR|AL)UDA/.test(s))               return 'JL';
    if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/.test(s)) return 'ZD';
    if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/.test(s))          return 'ZF';
    if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/.test(s)) return 'WE';
    if (/徐祝|XU\s*ZHU|XUZHU/.test(s))                     return 'XZ';
    if (/魂魄勇|HUN\s*PO\s*YONG|HPY/.test(s))              return 'HP';
    return '';
  }
  function kvOnlyCode(id){
    try{
      return String(id||'').trim().toUpperCase();
    }catch(_){
      return '';
    }
  }
  function storyCodeFromProduct(p){
    if (!p) return '';
    if (p.deityCode){
      return normalizeStoryCode(p.deityCode);
    }
    if (p.code){
      var codeField = normalizeStoryCode(p.code);
      if (codeField) return codeField;
    }
    if (p.reviewCode){
      var reviewField = normalizeStoryCode(p.reviewCode);
      if (reviewField) return reviewField;
    }
    var guess = toDeityCode(p.deity || p.name || '');
    if (guess) return guess;
    if (p.id) return kvOnlyCode(p.id);
    return '';
  }
  function storyCodeFromService(s){
    if (!s) return '';
    if (s.reviewCode){
      return normalizeStoryCode(s.reviewCode);
    }
    if (s.deityCode){
      return normalizeStoryCode(s.deityCode);
    }
    var guess = toDeityCode(s.deity || s.name || '');
    if (guess) return guess;
    if (s.id) return kvOnlyCode(s.id);
    return '';
  }
  async function collectStoryCodes(){
    var endpoints = [
      { url:'/api/products?active=true', extractor: storyCodeFromProduct },
      { url:'/api/service/products?active=true', extractor: storyCodeFromService }
    ];
    var unique = new Set();
    await Promise.all(endpoints.map(async function(entry){
      try{
        var res = await fetch(entry.url, { cache:'no-store' });
        if (!res.ok) return;
        var json = await res.json().catch(function(){ return null; });
        if (!json) return;
        var items = Array.isArray(json.items) ? json.items : [];
        items.forEach(function(item){
          var code = entry.extractor(item);
          if (code) unique.add(code);
        });
      }catch(_){}
    }));
    return Array.from(unique);
  }
  async function fetchStoryItems(code){
    if (!code) return [];
    var cacheBust = Date.now();
    var res = await fetch('/api/stories?code=' + encodeURIComponent(code) + '&_=' + cacheBust, { cache:'no-store' });
    if (!res.ok) throw new Error('讀取失敗 (' + res.status + ')');
    var payload = await res.json().catch(function(){ return {}; });
    if (!payload || payload.ok === false) throw new Error(payload && payload.error ? payload.error : '讀取失敗');
    var items = Array.isArray(payload.items) ? payload.items : [];
    return items.slice(0, 3);
  }
  function setPanelStatus(el, text){
    if (!el) return;
    el.textContent = text || '';
  }
  function renderStoryCards(items, label){
    return items.map(function(item){
      var quote = escapeHtml(item.msg || '');
      var nick = escapeHtml(item.nick || (document.documentElement.lang === 'en' ? 'Anonymous' : '匿名'));
      var date = escapeHtml(formatStoryDate(item.ts));
      var productInfo = item.productName ? '<div class="testimonial-item__hint">' + escapeHtml((document.documentElement.lang === 'en' ? 'Product' : '商品') + '：' + item.productName) + '</div>' : '';
      return (
        '<article class="testimonial-item">' +
          '<p class="testimonial-item__quote">' + quote + '</p>' +
          '<div class="testimonial-item__meta">' +
            '<strong>' + nick + '</strong>' +
            '<span>' + date + '</span>' +
          '</div>' +
          productInfo +
          '<div class="testimonial-item__row">' +
            '<span class="testimonial-item__tag">' + escapeHtml(label) + '</span>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }
  function setPanelPlaceholder(bodyEl, message){
    if (!bodyEl) return;
    bodyEl.innerHTML = '<div class="testimonial-panel__placeholder">' + escapeHtml(message) + '</div>';
  }
  async function initTestimonialSection(){
    var section = document.querySelector('[data-testimonial-section]');
    if (!section) return;
    var locale = document.documentElement.lang === 'en' ? 'en' : 'zh';
    var panel = section.querySelector('[data-story-panel]');
    if (!panel) return;
    var body = panel.querySelector('[data-story-body]');
    var status = panel.querySelector('[data-story-status]');
    if (!body){
      return;
    }
    var label = panel.dataset.storyLabel || (locale === 'en' ? 'Customer feedback' : '真實分享');
    setPanelPlaceholder(body, locale === 'en' ? 'Loading verified feedback…' : '載入真實留言中…');
    var manualCodes = (section.dataset.storyCodes || '').split(',').map(function(code){ return normalizeStoryCode(code); }).filter(Boolean);
    var codes = manualCodes.length ? manualCodes : await collectStoryCodes();
    if (!codes.length){
      setPanelStatus(status, locale === 'en' ? 'No code configured' : '尚未設定留言代碼');
      setPanelPlaceholder(body, locale === 'en' ? '請在 data-story-codes 中添加 KV 代碼。' : '請在 data-story-codes 中填入 KV 代碼。');
      return;
    }
    try{
      var aggregated = [];
      var maxItems = 4;
      for (var i = 0; i < codes.length; i++){
        if (aggregated.length >= maxItems) break;
        var code = codes[i];
        if (!code) continue;
        var fetched = await fetchStoryItems(code);
        if (fetched.length){
          aggregated = aggregated.concat(fetched.map(function(item){
            return Object.assign({}, item, { sourceCode: code });
          }));
        }
      }
      if (!aggregated.length){
        setPanelStatus(status, locale === 'en' ? 'No testimonials yet' : '目前尚無留言');
        setPanelPlaceholder(body, locale === 'en' ? 'Be the first to share your feedback.' : '暫時還沒有分享，歡迎先留下一則好評。');
        return;
      }
      aggregated.sort(function(a,b){
        return (b.ts || 0) - (a.ts || 0);
      });
      var limited = aggregated.slice(0, maxItems);
      setPanelStatus(status, locale === 'en'
        ? limited.length + ' verified stories'
        : limited.length + ' 則真實分享');
      body.innerHTML = '<div class="testimonial-panel__grid">' + renderStoryCards(limited, label) + '</div>';
    }catch(err){
      setPanelStatus(status, locale === 'en' ? 'Failed to load' : '讀取失敗');
      setPanelPlaceholder(body, (err && err.message) ? err.message : (locale === 'en' ? 'Unable to load testimonials.' : '無法載入留言。'));
    }
  }

  applyLang(resolveLang());
  initTestimonialSection();
  window.APP_I18N = I18N;
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
