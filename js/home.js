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
  var homeConsultEditBtn = document.getElementById('homeConsultEditBtn');
  var homeConsultStoryMsg = document.getElementById('homeConsultStoryMsg');
  var homeConsultStoryName = document.getElementById('homeConsultStoryName');
  var homeConsultStoryDate = document.getElementById('homeConsultStoryDate');

  var LANG_KEY = 'uc_lang';
  var I18N = {
    zh: {
      'nav-title': 'unalomecodes | 懂玩泰國',
      'home-nav-temple': '寺廟地圖',
      'home-nav-food': '美食地圖',
      'home-nav-shop': '商城',
      'home-nav-about': '關於我們',
      'home-nav-service': '祈福及代捐棺服務',
      'home-nav-consult': '連線算命',
      'drawer-label': '探索入口',
      'drawer-temple-desc': '用地圖探索寺廟與文化',
      'drawer-food-desc': '用地圖探索在地美食',
      'drawer-consult-desc': '泰國老師一對一電話算命',
      'drawer-service-desc': '提供祈福服務及代捐棺木',
      'drawer-shop-desc': '精選服務與商品',
      'drawer-about-desc': 'unalomecodes品牌介紹',
      'home-hero-kicker': '入口首頁',
      'home-hero-title': '最懂玩泰國的入口',
      'home-hero-subtitle': '懂拜拜、懂美食、懂在地，把泰國整理成你用得上的資訊。',
      'home-hero-cta-primary': '1 分鐘找到你的守護神',
      'home-hero-cta-consult': '立即預約連線泰國老師',
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
      'home-testimonial-title': '真實故事牆',
      'home-testimonial-subtitle': 'unalomecodes 服務即時回饋，讓你更信任下一步。',
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
      'home-entry-consult-title': '電話算命｜泰國老師',
      'home-entry-consult-desc': '一對一電話諮詢＋即時翻譯，選擇中文或英文翻譯方案即可預約。',
      'home-entry-consult-tag-1': '電話諮詢',
      'home-entry-consult-tag-2': '即時翻譯',
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
      'about-back': '返回上一頁',
      'home-consult-edit': '編輯'
    },
    en: {
      'nav-title': 'unalomecodes | Thailand Portal',
      'home-nav-temple': 'Temple Map',
      'home-nav-food': 'Food Map',
      'home-nav-shop': 'Shop',
      'home-nav-about': 'About',
      'home-nav-service': 'Blessing Services',
      'home-nav-consult': 'Phone Consult',
      'drawer-label': 'Explore',
      'drawer-temple-desc': 'Discover temples and culture on the map',
      'drawer-food-desc': 'Explore local food picks on the map',
      'drawer-consult-desc': '1:1 Thai master phone consult',
      'drawer-service-desc': 'Blessing services & donation assistance',
      'drawer-shop-desc': 'Curated services and products',
      'drawer-about-desc': 'About unalomecodes',
      'home-hero-kicker': 'Home',
      'home-hero-title': 'Your Gateway to Thailand',
      'home-hero-subtitle': 'Temples, food, and local culture—organized into what you need.',
      'home-hero-cta-primary': 'Find your deity in 1 minute',
      'home-hero-cta-consult': 'Book a Thai master call',
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
      'home-testimonial-title': 'Story wall',
      'home-testimonial-subtitle': 'Real-time feedback on unalomecodes services so you can explore with confidence.',
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
      'home-entry-consult-title': 'Phone Consult | Thai Master',
      'home-entry-consult-desc': '1:1 phone consult with live translation. Choose Chinese or English interpreting to book.',
      'home-entry-consult-tag-1': 'Phone Session',
      'home-entry-consult-tag-2': 'Live Translation',
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
      'about-back': 'Back',
      'home-consult-edit': 'Edit'
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
    return 'zh';
  }

  function setLang(lang){
    try{ localStorage.setItem(LANG_KEY, lang); }catch(_){}
    applyLang(lang);
  }

  function initHomeConsultEditor(){
    if (!homeConsultEditBtn) return;
    if (!window.authState || typeof window.authState.onAdmin !== 'function') return;
    window.authState.onAdmin(function(isAdmin){
      if (typeof window.authState.hasAdminPermission === 'function'){
        isAdmin = isAdmin && window.authState.hasAdminPermission('page_meta_edit');
      }
      homeConsultEditBtn.hidden = !isAdmin;
    });
    homeConsultEditBtn.addEventListener('click', function(){
      function trigger(){
        var toggle = document.getElementById('adminEditToggle');
        if (toggle) toggle.click();
      }
      trigger();
      setTimeout(trigger, 300);
    });
  }

  function initHomeConsultStories(){
    if (!homeConsultStoryMsg || !homeConsultStoryName || !homeConsultStoryDate) return;
    var source = document.querySelector('.home-story-source');
    if (!source) return;
    var items = Array.from(source.querySelectorAll('.home-story-source__item')).map(function(item){
      var msg = (item.querySelector('[data-edit-key$="-msg"]') || {}).textContent || '';
      var name = (item.querySelector('[data-edit-key$="-name"]') || {}).textContent || '';
      var date = (item.querySelector('[data-edit-key$="-date"]') || {}).textContent || '';
      return {
        msg: String(msg || '').trim(),
        name: String(name || '').trim(),
        date: String(date || '').trim()
      };
    }).filter(function(item){ return item.msg; });
    if (!items.length) return;
    var index = 0;
    function render(){
      var item = items[index % items.length];
      homeConsultStoryMsg.textContent = item.msg;
      homeConsultStoryName.textContent = item.name || '';
      homeConsultStoryDate.textContent = item.date || '';
      index = (index + 1) % items.length;
    }
    render();
    if (items.length > 1){
      setInterval(render, 6000);
    }
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
    var codeMeta = {};
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
          if (code && !codeMeta[code]){
            var label = item.productName || item.product || item.itemName || item.name || item.serviceName || item.title || '';
            if (label) codeMeta[code] = label;
          }
        });
      }catch(_){}
    }));
    return { codes:Array.from(unique), metadata: codeMeta };
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
  function renderStoryCards(items, locale, tagLabel){
    var hasSanitizer = typeof sanitizeImageUrl === 'function';
    var defaultTag = locale === 'en' ? 'Customer feedback' : '真實分享';
    return items.map(function(item){
      var quote = escapeHtml(item.msg || '');
      var nick = escapeHtml(item.nick || (document.documentElement.lang === 'en' ? 'Anonymous' : '匿名'));
      var date = escapeHtml(formatStoryDate(item.ts));
      var productHeading = locale === 'en' ? 'Product' : '商品';
      var fallbackHeading = locale === 'en' ? 'Code' : '代碼';
      var productLabel = item.productName
        || item.product
        || item.product_title
        || item.itemName
        || item.name
        || item.serviceName
        || item.title || '';
      var fallbackCode = item.sourceCode || item.code || item.reviewCode || item.deityCode || '';
      var productInfo = '';
      if (productLabel){
        productInfo = '<div class="testimonial-item__hint">' + escapeHtml(productHeading + '：' + productLabel) + '</div>';
      }else if (fallbackCode){
        productInfo = '<div class="testimonial-item__hint">' + escapeHtml(fallbackHeading + '：' + fallbackCode) + '</div>';
      }
      var rawImage = item.imageUrl || item.image;
      var safeImage = hasSanitizer ? sanitizeImageUrl(rawImage) : (rawImage || '');
      var image = safeImage ? '<div class="testimonial-item__media"><img src="' + escapeHtml(safeImage) + '" alt="" loading="lazy" decoding="async" fetchpriority="low"></div>' : '';
      var tagText = tagLabel || defaultTag;
      return (
        '<article class="testimonial-item">' +
          image +
          '<div class="testimonial-item__text">' +
            '<p class="testimonial-item__quote">' + quote + '</p>' +
            '<div class="testimonial-item__meta">' +
              '<strong>' + nick + '</strong>' +
              '<span>' + date + '</span>' +
            '</div>' +
            productInfo +
            '<div class="testimonial-item__row">' +
              '<span class="testimonial-item__tag">' + escapeHtml(tagText) + '</span>' +
            '</div>' +
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
    var codeMeta = {};
    var codes = manualCodes.length ? manualCodes : [];
    if (!codes.length){
      var collected = await collectStoryCodes();
      codes = collected.codes;
      codeMeta = collected.metadata;
    }
    if (!codes.length){
      setPanelStatus(status, locale === 'en' ? 'No code configured' : '尚未設定留言代碼');
      setPanelPlaceholder(body, locale === 'en' ? '請在 data-story-codes 中添加 KV 代碼。' : '請在 data-story-codes 中填入 KV 代碼。');
      return;
    }
    var STORY_CACHE_KEY = 'homeStoryCache';
    var STORY_CACHE_TTL = 1000 * 60 * 2;
    function loadStoryCache(){
      try{
        var raw = sessionStorage.getItem(STORY_CACHE_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || !Array.isArray(data.items)) return null;
        if (Number.isFinite(data.ts) && (Date.now() - data.ts) <= STORY_CACHE_TTL){
          return data;
        }
        return null;
      }catch(_){
        return null;
      }
    }
    function saveStoryCache(items, total){
      try{
        sessionStorage.setItem(STORY_CACHE_KEY, JSON.stringify({
          ts: Date.now(),
          total: total || items.length,
          items: items
        }));
      }catch(_){}
    }
    function renderCachedStories(items, totalCount){
      if (!items || !items.length) return;
      var statusCount = items.length;
      var overflowSuffix = totalCount > items.length ? '+' : '';
      setPanelStatus(status, locale === 'en'
        ? statusCount + overflowSuffix + ' verified stories'
        : statusCount + overflowSuffix + ' 則真實分享');
      body.innerHTML = '<div class="testimonial-panel__grid">' + renderStoryCards(items, locale, label) + '</div>';
      var showMore = panel.querySelector('[data-story-more]');
      if (showMore){
        showMore.style.display = 'none';
      }
    }
    var cached = loadStoryCache();
    if (cached){
      renderCachedStories(cached.items, cached.total);
    }
    try{
      var aggregated = [];
      var STORY_CARD_LIMIT = 24;
      var fetchPromises = codes.map(async function(code){
        if (!code) return [];
        var fetched = [];
        try{ fetched = await fetchStoryItems(code); }catch(_){}
        if (!fetched.length) return [];
        return fetched.map(function(item){
          var base = Object.assign({}, item, { sourceCode: code });
          if (!base.productName && codeMeta && codeMeta[code]){
            base.productName = codeMeta[code];
          }
          return base;
        });
      });
      var fetchedSets = await Promise.all(fetchPromises);
      fetchedSets.forEach(function(batch){
        aggregated = aggregated.concat(batch);
      });
      if (!aggregated.length){
        setPanelStatus(status, locale === 'en' ? 'No testimonials yet' : '目前尚無留言');
        setPanelPlaceholder(body, locale === 'en' ? 'Be the first to share your feedback.' : '暫時還沒有分享，歡迎先留下一則好評。');
        return;
      }
      aggregated.sort(function(a,b){
        return (b.ts || 0) - (a.ts || 0);
      });
      var limited = aggregated.slice(0, Math.min(STORY_CARD_LIMIT, aggregated.length));
      saveStoryCache(limited, aggregated.length);
      var statusCount = limited.length;
      var overflowSuffix = aggregated.length > STORY_CARD_LIMIT ? '+' : '';
      setPanelStatus(status, locale === 'en'
        ? statusCount + overflowSuffix + ' verified stories'
        : statusCount + overflowSuffix + ' 則真實分享');
      var visibleBatchSize = 2;
      var carouselIndex = 0;
      var rotationTimer = null;
      var rotationDelay = 8000;
      var expanded = false;
      var storyList = limited.slice();
      var showMoreBtn = panel.querySelector('[data-story-more]');
      var mql = window.matchMedia('(max-width:840px)');
      var showMoreCopy = locale === 'en'
        ? { more: 'Show more stories', less: 'Hide stories' }
        : { more: '顯示更多留言', less: '收起留言' };

      function getVisibleBatch(){
        if (expanded || storyList.length <= visibleBatchSize){
          return storyList;
        }
        var endIndex = carouselIndex + visibleBatchSize;
        var batch = storyList.slice(carouselIndex, endIndex);
        if (batch.length < visibleBatchSize){
          batch = batch.concat(storyList.slice(0, visibleBatchSize - batch.length));
        }
        return batch;
      }
      function stopRotation(){
        if (rotationTimer){
          clearInterval(rotationTimer);
          rotationTimer = null;
        }
      }
      function startRotation(){
        stopRotation();
        if (expanded || storyList.length <= visibleBatchSize) return;
        rotationTimer = setInterval(function(){
          carouselIndex = (carouselIndex + visibleBatchSize) % storyList.length;
          renderVisibleStories();
        }, rotationDelay);
      }
      function renderVisibleStories(){
        var isMobile = mql.matches;
        var toRender = expanded ? storyList : getVisibleBatch();
        body.innerHTML = '<div class="testimonial-panel__grid">' + renderStoryCards(toRender, locale, label) + '</div>';
        if (showMoreBtn){
          if (storyList.length <= visibleBatchSize){
            showMoreBtn.style.display = 'none';
          }else{
            showMoreBtn.style.display = 'inline-flex';
            showMoreBtn.textContent = expanded ? showMoreCopy.less : showMoreCopy.more;
          }
        }
      }
      if (showMoreBtn){
        showMoreBtn.addEventListener('click', function(){
          expanded = !expanded;
          if (!expanded){
            carouselIndex = 0;
            startRotation();
          }else{
            stopRotation();
          }
          renderVisibleStories();
        });
      }
      window.addEventListener('resize', renderVisibleStories);
      renderVisibleStories();
      startRotation();
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

  /* hero guardian badge */
  const heroBadge = document.getElementById('heroGuardianBadge');
  const heroBadgeMenu = heroBadge ? heroBadge.querySelector('[data-hero-guardian-menu]') : null;
  const heroBadgeLabel = heroBadge ? heroBadge.querySelector('[data-hero-guardian-label]') : null;
  let heroDailyAction = null;
  let heroDailyBadge = null;
  const heroCTA = document.querySelector('[data-hero-quiz-cta]');
  const heroNote = document.querySelector('.hero-cta__note');
  const dailyModal = document.getElementById('dailyFortuneModal');
  const dailyConfirm = document.getElementById('dailyFortuneConfirm');
  const dailyCancel = document.getElementById('dailyFortuneCancel');
  const historyDialog = document.getElementById('fortuneHistoryDialog');
  const historyList = document.getElementById('fortuneHistoryList');
  const historyError = document.getElementById('fortuneHistoryError');
  const heroInfoTrigger = document.getElementById('heroInfoTrigger');
  const heroInfoDialog = document.getElementById('heroInfoDialog');
  const fortuneDialog = document.getElementById('fortuneDialogHome');
  const fortuneClose = document.getElementById('fortuneCloseHome');
  const fortuneLoading = document.getElementById('fortuneLoadingHome');
  const fortuneError = document.getElementById('fortuneErrorHome');
  const fortuneCard = document.getElementById('fortuneCardHome');
  const fortuneDate = document.getElementById('fortuneDateHome');
  const fortuneStars = document.getElementById('fortuneStarsHome');
  const fortuneSummary = document.getElementById('fortuneSummaryHome');
  const fortuneExplain = document.getElementById('fortuneExplainHome');
  const fortuneExplainToggle = document.getElementById('fortuneExplainToggleHome');
  const fortuneExplainBody = document.getElementById('fortuneExplainBodyHome');
  const fortuneExplainTitle = document.getElementById('fortuneExplainTitleHome');
  const fortuneExplainDesc = document.getElementById('fortuneExplainDescHome');
  const fortuneExplainHow = document.getElementById('fortuneExplainHowHome');
  const fortuneAdvice = document.getElementById('fortuneAdviceHome');
  const fortuneYam = fortuneDialog ? fortuneDialog.querySelector('[data-yam-container]') : null;
  const fortuneTaskWrap = document.getElementById('fortuneTaskWrapHome');
  const fortuneTaskText = document.getElementById('fortuneTaskTextHome');
  const fortuneTaskToggle = document.getElementById('fortuneTaskToggleHome');
  const fortuneTaskStreak = document.getElementById('fortuneTaskStreakHome');
  const fortuneTaskFeedback = document.getElementById('fortuneTaskFeedbackHome');
  const fortuneRitual = document.getElementById('fortuneRitualHome');
  const fortuneMeta = document.getElementById('fortuneMetaHome');
  const fortuneRitualLabel = document.getElementById('fortuneRitualLabelHome');
  const FORTUNE_CACHE_KEY = '__fortune_payload__';
  let fortuneShareBtn = null;
  const PHUM_FEEDBACK = {
    AYU: { title:'續航回正', body:'Ayu 日重點在節奏與續航。你完成這個小任務，等於把能量拉回可持續狀態。' },
    DECH:{ title:'行動到位', body:'Dech 日主打行動與決斷。你完成這一步，能把卡關點推進。' },
    SRI:{ title:'順流啟動', body:'Sri 日偏向順流與收穫。這個小步驟會讓機會更容易到位。' },
    MULA:{ title:'根基穩固', body:'Mula 日重點在根基與秩序。你先完成這件事，整體會更穩。' },
    UTSAHA:{ title:'推進有力', body:'Utsaha 日強調推進與執行。這個任務能讓進度往前走。' },
    MONTRI:{ title:'協調順暢', body:'Montri 日聚焦協調與支援。你完成這一步，溝通會更順。' },
    BORIWAN:{ title:'節奏整理', body:'Boriwan 日著重安排與分配。完成這件事有助於聚焦。' },
    KALAKINI:{ title:'避險成功', body:'Kalakini 日重點是降低風險與誤判。你完成這步，等於先把地雷排掉。' }
  };
  const TASK_KEY_PREFIX = 'FORTUNE_TASK_DONE';
  const STREAK_COUNT_KEY = 'FORTUNE_STREAK_COUNT';
  const STREAK_LAST_KEY = 'FORTUNE_STREAK_LAST_DATE';
  function fnv1aHash(str){
    let h = 2166136261;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function simpleHash(str){
    return fnv1aHash(String(str || '')).toString(16);
  }
  function resolveDateKey(data, fortune){
    if (data && data.dateKey) return String(data.dateKey);
    if (fortune && fortune.date) return String(fortune.date).replace(/\s+/g,'');
    return '';
  }
  function getTaskDoneKey(dateKey, task){
    if (!dateKey || !task) return '';
    return `${TASK_KEY_PREFIX}:${dateKey}:${simpleHash(task)}`;
  }
  function isTaskDone(dateKey, task){
    const key = getTaskDoneKey(dateKey, task);
    if (!key) return false;
    try{ return localStorage.getItem(key) === '1'; }catch(_){ return false; }
  }
  function setTaskDone(dateKey, task, done){
    const key = getTaskDoneKey(dateKey, task);
    if (!key) return;
    try{
      if (done) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    }catch(_){}
  }
  function toggleTaskDone(dateKey, task){
    const next = !isTaskDone(dateKey, task);
    setTaskDone(dateKey, task, next);
    return next;
  }
  function normalizeDateKey(dateKey){
    if (!dateKey) return '';
    const key = String(dateKey).trim();
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(key)) return key.replace(/\//g, '-');
    return key;
  }
  function getLocalDateKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function getCurrentGuardianCode(){
    const guardian = getActiveGuardian();
    if (guardian && (guardian.code || guardian.id)){
      return String(guardian.code || guardian.id || '').toUpperCase();
    }
    const code = heroBadge && heroBadge.dataset ? heroBadge.dataset.guardianCode : '';
    return String(code || '').toUpperCase();
  }
  function readFortuneCache(){
    try{
      const raw = localStorage.getItem(FORTUNE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const dateKey = String(parsed && parsed.dateKey || '');
      const today = getLocalDateKey();
      if (!dateKey || dateKey !== today) return null;
      const cachedCode = String(parsed && parsed.meta && parsed.meta.guardianCode || '').toUpperCase();
      const currentCode = getCurrentGuardianCode();
      if (cachedCode && currentCode && cachedCode !== currentCode) return null;
      if (!parsed || !parsed.fortune) return null;
      return parsed;
    }catch(_){
      return null;
    }
  }
  function writeFortuneCache(payload){
    if (!payload || !payload.fortune) return;
    try{
      localStorage.setItem(FORTUNE_CACHE_KEY, JSON.stringify(payload));
    }catch(_){}
  }
  function isTodayKey(dateKey){
    const key = normalizeDateKey(dateKey);
    return key === getLocalDateKey();
  }
  function getYesterdayKey(dateKey){
    const key = normalizeDateKey(dateKey);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
    const [y,m,d] = key.split('-').map(n=> Number(n));
    const ts = Date.UTC(y, m - 1, d) - 86400000;
    return new Date(ts).toISOString().slice(0,10);
  }
  function getStreakState(){
    let count = 0;
    let last = '';
    try{
      count = Number(localStorage.getItem(STREAK_COUNT_KEY) || 0) || 0;
      last = String(localStorage.getItem(STREAK_LAST_KEY) || '');
    }catch(_){}
    return { count, last };
  }
  function setStreakState(count, last){
    try{
      localStorage.setItem(STREAK_COUNT_KEY, String(count));
      localStorage.setItem(STREAK_LAST_KEY, String(last || ''));
    }catch(_){}
  }
  function updateStreakOnComplete(dateKey){
    const key = normalizeDateKey(dateKey);
    if (!key) return 0;
    const { count, last } = getStreakState();
    if (last === key) return count;
    const yesterday = getYesterdayKey(key);
    const next = last === yesterday ? count + 1 : 1;
    setStreakState(next, key);
    return next;
  }
  function renderStreak(dateKey, done){
    if (!fortuneTaskStreak) return;
    if (!done){
      fortuneTaskStreak.style.display = 'none';
      return;
    }
    const { count } = getStreakState();
    if (!count){
      fortuneTaskStreak.style.display = 'none';
      return;
    }
    fortuneTaskStreak.textContent = `🔥 已連續完成 ${count} 天`;
    fortuneTaskStreak.style.display = '';
  }
  const TAKSA_EXPLAIN = {
    BORIWAN:{
      title:'為什麼今天是 Boriwan（日）？',
      description:'Boriwan（日）對應人際支持與團隊互動，代表「身邊的人」與你當下的連結品質。當今日落在 Boriwan，重點不是衝刺，而是把合作與互動調順。',
      howToUse:'今天適合主動建立連結、明確協調分工，讓事情更容易推進。'
    },
    AYU:{
      title:'為什麼今天是 Ayu（日）？',
      description:'Ayu（日）在泰國 Maha Taksa 中代表節奏與續航力。當今天落在 Ayu，命理上的重點是把步調調回可持續狀態，而不是急著求結果。',
      howToUse:'今天只要完成一件「恢復節奏的小事」（整理、減少干擾、調整作息）就很對。'
    },
    DECH:{
      title:'為什麼今天是 Dech（日）？',
      description:'Dech（日）象徵決斷力與推進力。當今天落在 Dech，適合做明確選擇與主動行動。',
      howToUse:'今天適合做決定、談判或推動卡關的事情。'
    },
    SRI:{
      title:'為什麼今天是 Sri（日）？',
      description:'Sri（日）代表好運與吸引力，屬於「順勢而為」的日子。重點是讓好事自然發生，而不是用力推進。',
      howToUse:'今天適合曝光、分享、談錢或接受他人的善意。'
    },
    MULA:{
      title:'為什麼今天是 Mula（日）？',
      description:'Mula（日）對應基礎與根源，提醒你先把地基打穩。當今天落在 Mula，重點是把資源與節奏整理好。',
      howToUse:'今天適合整理財務、盤點資源、修正基礎流程。'
    },
    UTSAHA:{
      title:'為什麼今天是 Utsaha（日）？',
      description:'Utsaha（日）代表努力與行動的推進力。當今天落在 Utsaha，適合用小步驟帶動進度。',
      howToUse:'今天適合設定短時間任務、快速完成一件小成果。'
    },
    MONTRI:{
      title:'為什麼今天是 Montri（日）？',
      description:'Montri（日）代表貴人與支援。當今天落在 Montri，重點是「求助與協調」會比單打獨鬥更有效。',
      howToUse:'今天適合請教、協調資源、尋求合作或建議。'
    },
    KALAKINI:{
      title:'為什麼今天是 Kalakini（日）？',
      description:'Kalakini（日）代表干擾與阻礙。這不是倒楣，而是提醒你避開衝突與過度耗損。',
      howToUse:'今天不宜硬碰硬，適合保守行事或做清理型行動。'
    }
  };

  const GUARDIAN_NAME_MAP = {FM:'四面神',GA:'象神',CD:'崇迪佛',KP:'坤平',HP:'魂魄勇',XZ:'徐祝老人',WE:'五眼四耳',HM:'猴神哈魯曼',RH:'拉胡',JL:'迦樓羅',ZD:'澤度金',ZF:'招財女神'};

  function readStoredGuardian(){
    try{
      const raw = localStorage.getItem('__lastQuizGuardian__');
      return raw ? JSON.parse(raw) : null;
    }catch(_){
      return null;
    }
  }

  function readStoredQuizProfile(){
    try{
      const raw = localStorage.getItem('__lastQuizProfile__');
      return raw ? JSON.parse(raw) : null;
    }catch(_){
      return null;
    }
  }

  const QUIZ_GUARDIAN_KEY = '__lastQuizGuardian__';
  const QUIZ_PROFILE_KEY = '__lastQuizProfile__';
  const QUIZ_GUARDIAN_BACKUP = '__lastQuizGuardianBackup__';
  const QUIZ_PROFILE_BACKUP = '__lastQuizProfileBackup__';

  function getAuthProfile(){
    if (!window.authState || typeof window.authState.getProfile !== 'function') return null;
    return window.authState.getProfile();
  }

  function getActiveGuardian(){
    const profile = getAuthProfile();
    if (profile && profile.guardian){
      return profile.guardian;
    }
    return readStoredGuardian();
  }

  function getActiveQuizProfile(){
    const profile = getAuthProfile();
    if (profile && profile.quiz){
      return profile.quiz;
    }
    return readStoredQuizProfile();
  }

  function syncLocalFromProfile(profile){
    if (!profile || !profile.guardian) return;
    const code = String(profile.guardian.code || '').trim().toUpperCase();
    if (!code) return;
    const name = String(profile.guardian.name || '').trim();
    const tsValue = profile.guardian.ts ? Date.parse(profile.guardian.ts) : NaN;
    const ts = Number.isNaN(tsValue) ? (profile.guardian.ts || Date.now()) : tsValue;
    const existing = readStoredGuardian();
    const existingTs = existing ? toTimestamp(existing.ts) : 0;
    if (!existingTs || ts >= existingTs){
      try{
        localStorage.setItem(QUIZ_GUARDIAN_KEY, JSON.stringify({ code, name, ts }));
      }catch(_){}
      if (profile.quiz){
        try{ localStorage.setItem(QUIZ_PROFILE_KEY, JSON.stringify(profile.quiz)); }catch(_){}
      }
    }
  }

  function isSameTaipeiDay(tsA, tsB){
    if (!tsA || !tsB) return false;
    const toDay = d=> (new Date(d + 8 * 3600000)).toISOString().slice(0,10);
    return toDay(tsA) === toDay(tsB);
  }

  function toTimestamp(value){
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function getLastQuizTimestamp(){
    const guardian = getActiveGuardian();
    const profile = getActiveQuizProfile();
    return toTimestamp((guardian && guardian.ts) || (profile && profile.ts) || 0);
  }

  function restoreHeroQuizCacheFromBackup(){
    try{
      if (!localStorage.getItem(QUIZ_GUARDIAN_KEY)){
        const guardianBackup = localStorage.getItem(QUIZ_GUARDIAN_BACKUP);
        if (guardianBackup){
          localStorage.setItem(QUIZ_GUARDIAN_KEY, guardianBackup);
        }
      }
      if (!localStorage.getItem(QUIZ_PROFILE_KEY)){
        const profileBackup = localStorage.getItem(QUIZ_PROFILE_BACKUP);
        if (profileBackup){
          localStorage.setItem(QUIZ_PROFILE_KEY, profileBackup);
        }
      }
    }catch(_){}
  }

  function shouldShowHeroBadge(){
    const guardian = getActiveGuardian();
    if (!guardian) return false;
    const code = String(guardian.code || guardian.id || '').toUpperCase();
    const name = String(guardian.name || '').trim();
    return Boolean(code || name);
  }

  function todayKey(){
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const FORTUNE_BADGE_KEY = '__heroDailyFortuneSeen__';

  function markDailyFortuneSeen(){
    try{
      localStorage.setItem(FORTUNE_BADGE_KEY, todayKey());
    }catch(_){}
    updateDailyBadgeIndicator();
  }

  function shouldShowFortuneBadge(){
    if (!heroBadge || heroBadge.hidden) return false;
    const guardian = getActiveGuardian();
    if (!guardian) return false;
    if (!guardian.code && !guardian.name) return false;
    try{
      const seen = localStorage.getItem(FORTUNE_BADGE_KEY);
      return seen !== todayKey();
    }catch(_){ return true; }
  }

  function updateDailyBadgeIndicator(){
    if (!heroDailyBadge) return;
    const show = shouldShowFortuneBadge();
    heroDailyBadge.style.display = show ? 'flex' : 'none';
    const heroAlert = heroBadge ? heroBadge.querySelector('[data-hero-guardian-alert]') : null;
    if (heroAlert){
      heroAlert.style.display = show ? 'flex' : 'none';
    }
  }

  function formatGuardianName(guardian){
    if (!guardian) return '';
    const code = String(guardian.code || guardian.id || '').toUpperCase();
    if (code && GUARDIAN_NAME_MAP[code]) return GUARDIAN_NAME_MAP[code];
    if (guardian.name) return guardian.name;
    return heroBadge ? (document.documentElement.lang === 'en' ? 'Guardian' : '守護神') : '守護神';
  }

  function setHeroCtaVisible(show){
    if (!heroCTA) return;
    heroCTA.hidden = !show;
    heroCTA.style.display = show ? '' : 'none';
  }

  function setHeroBadgeVisible(show){
    if (!heroBadge) return;
    heroBadge.hidden = !show;
    heroBadge.style.display = show ? 'flex' : 'none';
  }

  function showHeroBadge(){
    if (!heroBadge || !heroCTA) return;
    if (!shouldShowHeroBadge()) return;
    if (heroBadgeMenu && window.GuardianMenu && !heroBadgeMenu.dataset.menuReady){
      heroBadgeMenu.innerHTML = window.GuardianMenu.buildMenuHTML({ actionAttr:'data-hero-guardian-action' });
      heroBadgeMenu.dataset.menuReady = '1';
    }
    if (heroBadgeMenu){
      heroDailyAction = heroBadgeMenu.querySelector('[data-hero-guardian-action="daily"]');
      heroDailyBadge = heroDailyAction ? heroDailyAction.querySelector('.guardian-menu-badge') : null;
    }
    setHeroBadgeVisible(true);
    setHeroCtaVisible(false);
    if (heroNote) heroNote.style.display = 'none';
    const guardian = getActiveGuardian();
    const name = formatGuardianName(guardian);
    if (heroBadgeLabel) heroBadgeLabel.textContent = `守護神：${name}`;
    heroBadge.dataset.guardianCode = String(guardian.code || guardian.id || '').toUpperCase();
    heroBadge.dataset.guardianName = guardian.name || '';
    heroBadge.dataset.quizReady = '1';
    heroBadge.setAttribute('aria-expanded','false');
    if (heroBadgeMenu) heroBadgeMenu.setAttribute('aria-hidden','true');
    updateDailyBadgeIndicator();
  }

  function hideHeroBadge(){
    if (heroBadge) closeHeroMenu();
    setHeroBadgeVisible(false);
    setHeroCtaVisible(true);
    if (heroNote){
      heroNote.style.display = '';
    }
    updateDailyBadgeIndicator();
  }

  function toggleHeroVisibility(){
    if (shouldShowHeroBadge()){
      showHeroBadge();
    }else{
      hideHeroBadge();
    }
  }

  let heroMenuOpen = false;
  function openHeroMenu(){
    if (!heroBadge || !heroBadgeMenu) return;
    heroMenuOpen = true;
    heroBadge.setAttribute('aria-expanded','true');
    heroBadgeMenu.classList.add('guardian-menu--open');
    heroBadgeMenu.setAttribute('aria-hidden','false');
  }

  function closeHeroMenu(){
    if (!heroBadge || !heroBadgeMenu) return;
    heroMenuOpen = false;
    heroBadge.setAttribute('aria-expanded','false');
    heroBadgeMenu.classList.remove('guardian-menu--open');
    heroBadgeMenu.setAttribute('aria-hidden','true');
  }

  function toggleHeroMenu(){
    if (heroMenuOpen) closeHeroMenu();
    else openHeroMenu();
  }

  function handleHeroAction(type){
    const guardian = getActiveGuardian();
    const code = guardian ? String(guardian.code || guardian.id || '').toUpperCase() : '';
    if (type === 'daily'){
      const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
        ? window.authState.isLoggedIn()
        : false;
      if (!loggedIn){
        markDailyFortuneSeen();
        showDailyModal();
        return;
      }
      markDailyFortuneSeen();
      openFortuneDialog();
      return;
    }
    if (type === 'history'){
      const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function'
        ? window.authState.isLoggedIn()
        : false;
      if (!loggedIn){
        showDailyModal();
        return;
      }
      if (window.GuardianMenu && historyDialog){
        window.GuardianMenu.openHistoryDialog({
          dialog: historyDialog,
          listEl: historyList,
          errorEl: historyError
        });
      }
      return;
    }
    if (type === 'retake'){
      const lastTs = getLastQuizTimestamp();
      if (lastTs && isSameTaipeiDay(lastTs, Date.now())){
        alert('今日已完成測驗，請於台灣時間午夜 12 點後再重新測驗。');
        return;
      }
      window.location.href = '/quiz/?retake=1';
      return;
    }
    if (type === 'result'){
      if (window.GuardianMenu){
        window.GuardianMenu.persistLastQuizResult({
          guardian,
          quiz: getActiveQuizProfile()
        });
        window.location.href = window.GuardianMenu.buildResultUrl({ badgeEl: heroBadge });
        return;
      }
      window.location.href = '/quiz/';
      return;
    }
    if (type === 'intro'){
      if (code){
        window.location.href = `/deity?code=${encodeURIComponent(code)}`;
        return;
      }
      window.location.href = '/quiz/';
      return;
    }
    if (type === 'recommend'){
      window.location.href = '/shop/';
    }
  }

  function showDailyModal(){
    if (!dailyModal) return;
    dailyModal.hidden = false;
    dailyModal.classList.add('is-visible');
  }

  function hideDailyModal(){
    if (!dailyModal) return;
    dailyModal.hidden = true;
    dailyModal.classList.remove('is-visible');
  }

  function showDialog(dialogEl){
    if (!dialogEl) return;
    if (typeof dialogEl.showModal === 'function'){
      if (!dialogEl.open) dialogEl.showModal();
      return;
    }
    dialogEl.hidden = false;
    dialogEl.setAttribute('open', '');
  }

  function closeDialog(dialogEl){
    if (!dialogEl) return;
    if (typeof dialogEl.close === 'function' && dialogEl.open){
      dialogEl.close();
      return;
    }
    dialogEl.hidden = true;
    dialogEl.removeAttribute('open');
  }

  function setFortuneLoading(){
    if (fortuneLoading) fortuneLoading.style.display = '';
    if (fortuneError) fortuneError.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = 'none';
  }

  function setFortuneError(message){
    if (fortuneError){
      fortuneError.textContent = message || '暫時無法取得日籤，請稍後再試。';
      fortuneError.style.display = '';
    }
    if (fortuneLoading) fortuneLoading.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = 'none';
  }

  function renderExplain(fortune){
    if (!fortuneExplain || !fortuneExplainToggle || !fortuneExplainBody) return;
    const phum = fortune && fortune.core ? fortune.core.phum : '';
    const explain = phum ? TAKSA_EXPLAIN[phum] : null;
    if (!explain){
      fortuneExplain.style.display = 'none';
      return;
    }
    fortuneExplain.style.display = '';
    fortuneExplainToggle.textContent = `📖 為什麼今天是 ${phum} 日？`;
    if (fortuneExplainTitle) fortuneExplainTitle.textContent = explain.title;
    if (fortuneExplainDesc) fortuneExplainDesc.textContent = explain.description;
    if (fortuneExplainHow) fortuneExplainHow.textContent = explain.howToUse;
    fortuneExplainBody.hidden = true;
    fortuneExplainToggle.setAttribute('aria-expanded', 'false');
  }
  function renderTask(fortune, data){
    if (!fortuneTaskWrap || !fortuneTaskText || !fortuneTaskToggle) return;
    const task = fortune && fortune.action ? String(fortune.action.task || '').trim() : '';
    if (!task){
      fortuneTaskWrap.style.display = 'none';
      return;
    }
    const dateKey = resolveDateKey(data, fortune);
    const done = isTaskDone(dateKey, task);
    fortuneTaskText.textContent = task;
    fortuneTaskWrap.style.display = '';
    fortuneTaskWrap.dataset.dateKey = dateKey;
    fortuneTaskWrap.dataset.task = task;
    const isHistory = dateKey && !isTodayKey(dateKey);
    fortuneTaskWrap.dataset.isHistory = isHistory ? '1' : '';
    fortuneTaskToggle.setAttribute('aria-pressed', done ? 'true' : 'false');
    fortuneTaskToggle.textContent = done ? '✅ 已完成（+1 功德）' : '☐ 我完成了';
    renderStreak(dateKey, done);
    if (done) renderTaskFeedback(fortune, data);
    else if (fortuneTaskFeedback){
      fortuneTaskFeedback.style.display = 'none';
      fortuneTaskFeedback.innerHTML = '';
    }
  }
  function renderMetaTags(container, tags){
    if (!container) return;
    container.textContent = '';
    (tags || []).filter(Boolean).forEach(tag=>{
      const span = document.createElement('span');
      span.textContent = String(tag);
      container.appendChild(span);
    });
  }
  function renderFortune(fortune, meta, data){
    if (!fortune) return;
    lastFortunePayload = data || lastFortunePayload;
    if (fortuneDate) fortuneDate.textContent = fortune.date || '';
    if (fortuneStars){
      const stars = fortune.stars || '';
      fortuneStars.textContent = stars;
      fortuneStars.style.display = stars ? '' : 'none';
    }
    if (fortuneSummary) fortuneSummary.textContent = fortune.summary || '';
    renderExplain(fortune);
    if (fortuneAdvice) fortuneAdvice.textContent = fortune.advice || '';
    if (fortuneYam && window.YamUbakongUI){
      window.YamUbakongUI.renderYamUbakong({ containerEl: fortuneYam, payload: data || {} });
    }else if (fortuneYam){
      fortuneYam.style.display = 'none';
      fortuneYam.innerHTML = '';
    }
    renderTask(fortune, data);
    if (fortuneRitual) fortuneRitual.textContent = fortune.ritual || '';
    if (fortuneMeta){
      const payloadMeta = meta || fortune.meta || {};
      const tags = [];
      if (payloadMeta.guardianName) tags.push(payloadMeta.guardianName);
      if (payloadMeta.element) tags.push(payloadMeta.element);
      if (payloadMeta.focus) tags.push(payloadMeta.focus);
      renderMetaTags(fortuneMeta, tags);
    }
    if (fortuneRitualLabel){
      const gName = (meta && meta.guardianName) || (fortune.meta && fortune.meta.guardianName) || '';
      fortuneRitualLabel.textContent = gName ? `守護神 ${gName} 想對你說` : '守護神想對你說';
    }
    ensureShareButton();
    if (fortuneLoading) fortuneLoading.style.display = 'none';
    if (fortuneError) fortuneError.style.display = 'none';
    if (fortuneCard) fortuneCard.style.display = '';
  }

  function loadHtml2Canvas(){
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject)=>{
      const src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      const existing = document.querySelector('script[data-html2canvas="1"]');
      if (existing){
        existing.addEventListener('load', ()=> resolve(window.html2canvas));
        existing.addEventListener('error', ()=> reject(new Error('html2canvas_load_failed')));
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.html2canvas = '1';
      script.onload = ()=> resolve(window.html2canvas);
      script.onerror = ()=> reject(new Error('html2canvas_load_failed'));
      document.head.appendChild(script);
    });
  }
  async function shareFortuneCard(){
    if (!fortuneCard) return;
    if (fortuneShareBtn){
      fortuneShareBtn.disabled = true;
      fortuneShareBtn.textContent = '產生中…';
    }
    try{
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(fortuneCard, { backgroundColor:'#ffffff', scale:2, useCORS:true, allowTaint:false, imageTimeout:15000 });
      let blob = null;
      if (canvas.toBlob){
        blob = await new Promise(resolve=> canvas.toBlob(resolve, 'image/png'));
      }
      if (!blob){
        const dataUrl = canvas.toDataURL('image/png');
        blob = await fetch(dataUrl).then(res=>res.blob());
      }
      if (!blob) throw new Error('圖片產生失敗');
      const dateKey = (lastFortunePayload && lastFortunePayload.dateKey) || (lastFortunePayload && lastFortunePayload.fortune && lastFortunePayload.fortune.date) || 'today';
      const fileName = `fortune-${String(dateKey).replace(/\//g,'-')}.png`;
      const file = new File([blob], fileName, { type:'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
        await navigator.share({ title:'我的今日日籤', files:[file] });
      }else{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=> URL.revokeObjectURL(url), 500);
      }
    }catch(err){
      alert(err && err.message ? err.message : '分享失敗，請稍後再試。');
    }finally{
      if (fortuneShareBtn){
        fortuneShareBtn.disabled = false;
        fortuneShareBtn.textContent = '自動截圖分享';
      }
    }
  }
  function ensureShareButton(){
    if (!fortuneCard) return;
    if (!fortuneShareBtn){
      fortuneShareBtn = fortuneCard.querySelector('.fortune-share-btn');
    }
    if (!fortuneShareBtn){
      fortuneShareBtn = document.createElement('button');
      fortuneShareBtn.type = 'button';
      fortuneShareBtn.className = 'fortune-share-btn';
      fortuneShareBtn.textContent = '自動截圖分享';
      fortuneCard.appendChild(fortuneShareBtn);
      fortuneShareBtn.addEventListener('click', shareFortuneCard);
    }
  }

  async function fetchFortune(){
    try{
      setFortuneLoading();
      const res = await fetch('/api/fortune', { cache:'no-store', credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok){
        if (data && data.needQuiz) throw new Error('請先完成守護神測驗後再領取每日運勢。');
        throw new Error((data && data.error) || '取得日籤失敗');
      }
      renderFortune(data.fortune || null, data.meta || null, data || null);
      writeFortuneCache(data || null);
    }catch(err){
      setFortuneError(err && err.message ? err.message : '暫時無法取得日籤');
    }
  }

  async function openFortuneDialog(){
    if (!fortuneDialog) return;
    if (window.__fortuneClaimLock) return;
    window.__fortuneClaimLock = true;
    try{
      if (window.authState && typeof window.authState.syncPendingQuizToAccount === 'function'){
        const res = await window.authState.syncPendingQuizToAccount();
        if (res && res.ok === false){
          alert('同步失敗，請回到結果頁重新嘗試或重新測驗。');
          return;
        }
      }
      const cached = readFortuneCache();
      if (cached){
        renderFortune(cached.fortune, cached.meta || null, cached);
        showDialog(fortuneDialog);
        return;
      }
      showDialog(fortuneDialog);
      await fetchFortune();
    } finally {
      window.__fortuneClaimLock = false;
    }
  }

  if (heroBadge){
    heroBadge.addEventListener('click', (ev)=>{
      const actionEl = ev.target.closest('[data-hero-guardian-action]');
      if (actionEl){
        ev.stopPropagation();
        const type = actionEl.getAttribute('data-hero-guardian-action');
        closeHeroMenu();
        handleHeroAction(type);
        return;
      }
      if (ev.target.closest('[data-hero-guardian-menu]')) return;
      toggleHeroMenu();
    });
    heroBadge.addEventListener('keydown', (ev)=>{
      if (ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        toggleHeroMenu();
      }
      if (ev.key === 'Escape'){
        closeHeroMenu();
      }
    });
  }

  document.addEventListener('click', (ev)=>{
    if (!heroBadge) return;
    if (heroBadge.contains(ev.target)) return;
    closeHeroMenu();
  });

  if (dailyModal){
    dailyModal.addEventListener('click', (ev)=>{
      if (ev.target === dailyModal || ev.target.hasAttribute('data-hero-modal-close')){
        hideDailyModal();
      }
    });
  }

  if (dailyConfirm){
    dailyConfirm.addEventListener('click', ()=>{
      if (window.authState && typeof window.authState.login === 'function'){
        try{ sessionStorage.setItem('__homeFortunePending__', '1'); }catch(_){}
        window.authState.login();
        return;
      }
      window.location.href = '/account';
    });
  }
  if (dailyCancel){
    dailyCancel.addEventListener('click', hideDailyModal);
  }
  if (heroInfoTrigger && heroInfoDialog){
    heroInfoTrigger.addEventListener('click', ()=>{
      if (typeof heroInfoDialog.showModal === 'function'){
        if (!heroInfoDialog.open) heroInfoDialog.showModal();
      }else{
        heroInfoDialog.setAttribute('open','open');
      }
    });
    heroInfoDialog.addEventListener('click', (ev)=>{
      if (ev.target === heroInfoDialog || ev.target.closest('[data-hero-info-close]')){
        if (typeof heroInfoDialog.close === 'function') heroInfoDialog.close();
        else heroInfoDialog.removeAttribute('open');
      }
    });
  }
  if (historyDialog && window.GuardianMenu){
    window.GuardianMenu.bindHistoryDialog({
      dialog: historyDialog,
      listEl: historyList,
      errorEl: historyError
    });
  }

  if (fortuneClose){
    fortuneClose.addEventListener('click', ()=> closeDialog(fortuneDialog));
  }
  if (fortuneExplainToggle && fortuneExplainBody){
    fortuneExplainToggle.addEventListener('click', ()=>{
      const expanded = fortuneExplainToggle.getAttribute('aria-expanded') === 'true';
      fortuneExplainToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      fortuneExplainBody.hidden = expanded;
    });
  }
  if (fortuneDialog){
    fortuneDialog.addEventListener('click', (ev)=>{
      const toggleBtn = ev.target.closest('.fortune-task-toggle');
      if (!toggleBtn) return;
      const wrap = ev.target.closest('.fortune-task');
      const dateKey = wrap && wrap.dataset ? String(wrap.dataset.dateKey || '') : '';
      const task = wrap && wrap.dataset ? String(wrap.dataset.task || '') : '';
      if (!dateKey || !task) return;
      const next = toggleTaskDone(dateKey, task);
      toggleBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      toggleBtn.textContent = next ? '✅ 已完成（+1 功德）' : '☐ 我完成了';
      if (next && wrap && wrap.dataset && wrap.dataset.isHistory !== '1'){
        updateStreakOnComplete(dateKey);
      }
      renderStreak(dateKey, next);
      if (next){
        renderTaskFeedback(lastFortunePayload && lastFortunePayload.fortune, lastFortunePayload);
      }else if (fortuneTaskFeedback){
        fortuneTaskFeedback.style.display = 'none';
        fortuneTaskFeedback.innerHTML = '';
      }
    });
  }

  window.addEventListener('fortune:open', (ev)=>{
    const payload = ev && ev.detail ? ev.detail : null;
    if (!payload || !payload.fortune) return;
    renderFortune(payload.fortune, payload.meta || null, payload);
    showDialog(fortuneDialog);
  });

  function renderTaskFeedback(fortune, data){
    if (!fortuneTaskFeedback) return;
    const phum = fortune && fortune.core ? fortune.core.phum : '';
    const base = PHUM_FEEDBACK[phum];
    if (!base){
      fortuneTaskFeedback.style.display = 'none';
      fortuneTaskFeedback.innerHTML = '';
      return;
    }
    let body = base.body;
    const signals = (data && data.meta && (data.meta.userSignals || data.meta.signals)) || null;
    const focus = signals && Array.isArray(signals.focus) ? signals.focus[0] : '';
    const job = signals && signals.job ? String(signals.job) : '';
    if (focus){
      body = `${body} 尤其在「${focus}」上，先做可控的小步驟會更順。`;
    }else if (job){
      body = `${body} 對${job}來說，先完成可驗證的小步驟會更有效。`;
    }
    fortuneTaskFeedback.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = base.title;
    const br = document.createElement('br');
    const span = document.createElement('span');
    span.textContent = body;
    fortuneTaskFeedback.append(strong, br, span);
    fortuneTaskFeedback.style.display = '';
  }

  restoreHeroQuizCacheFromBackup();
  initHomeConsultEditor();
  initHomeConsultStories();
  const initialProfile = getAuthProfile();
  if (initialProfile) syncLocalFromProfile(initialProfile);
  toggleHeroVisibility();
  updateDailyBadgeIndicator();
  if (window.authState && typeof window.authState.onProfile === 'function'){
    window.authState.onProfile((profile)=>{
      if (profile) syncLocalFromProfile(profile);
      toggleHeroVisibility();
      updateDailyBadgeIndicator();
      const pending = sessionStorage.getItem('__homeFortunePending__');
      if (pending && window.authState && typeof window.authState.isLoggedIn === 'function' && window.authState.isLoggedIn()){
        try{ sessionStorage.removeItem('__homeFortunePending__'); }catch(_){}
        openFortuneDialog();
      }
    });
  }
})();
