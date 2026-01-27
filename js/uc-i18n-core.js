(function(){
  if (window.UC_I18N) return;

  var LANG_KEY = 'uc_lang';
  var DEFAULT_LANG = 'zh';

  function detectLang(){
    var stored = '';
    try{ stored = localStorage.getItem(LANG_KEY) || ''; }catch(_){}
    if (stored === 'zh' || stored === 'en') return stored;
    // Force default to Chinese unless user explicitly switches to English.
    return 'zh';
  }

  function getLang(){
    return detectLang();
  }

  function setLang(lang){
    var next = (lang === 'en') ? 'en' : 'zh';
    try{ localStorage.setItem(LANG_KEY, next); }catch(_){}
    try{
      window.dispatchEvent(new CustomEvent('uc_lang_change', { detail:{ lang: next } }));
    }catch(_){}
    return next;
  }

  var dict = { zh:{}, en:{} };

  function setDict(next){
    if (!next || typeof next !== 'object') return;
    dict = {
      zh: (next.zh && typeof next.zh === 'object') ? next.zh : {},
      en: (next.en && typeof next.en === 'object') ? next.en : {}
    };
  }

  function t(key){
    var lang = getLang();
    var pack = dict[lang] || dict[DEFAULT_LANG] || {};
    if (pack && Object.prototype.hasOwnProperty.call(pack, key)) return pack[key];
    var z = dict.zh || {};
    if (Object.prototype.hasOwnProperty.call(z, key)) return z[key];
    return key;
  }

  function apply(root){
    var lang = getLang();
    var pack = dict[lang] || dict[DEFAULT_LANG] || {};
    var scope = root || document;
    try{ document.documentElement.lang = (lang === 'en') ? 'en' : 'zh-Hant'; }catch(_){}

    scope.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = (pack && Object.prototype.hasOwnProperty.call(pack, key)) ? pack[key] : null;
      if (val === null || typeof val === 'undefined'){
        var fallback = dict.zh || {};
        if (Object.prototype.hasOwnProperty.call(fallback, key)) val = fallback[key];
      }
      if (val === null || typeof val === 'undefined') return;
      el.textContent = String(val);
    });

    scope.querySelectorAll('[data-i18n-html]').forEach(function(el){
      var key = el.getAttribute('data-i18n-html');
      if (!key) return;
      var val = (pack && Object.prototype.hasOwnProperty.call(pack, key)) ? pack[key] : null;
      if (val === null || typeof val === 'undefined'){
        var fallback = dict.zh || {};
        if (Object.prototype.hasOwnProperty.call(fallback, key)) val = fallback[key];
      }
      if (val === null || typeof val === 'undefined') return;
      el.innerHTML = String(val);
    });

    scope.querySelectorAll('[data-i18n-attr]').forEach(function(el){
      var spec = String(el.getAttribute('data-i18n-attr') || '').trim();
      if (!spec) return;
      // Format: "placeholder:key" or "aria-label:key"
      var parts = spec.split(':');
      if (parts.length < 2) return;
      var attr = parts.shift().trim();
      var key = parts.join(':').trim();
      if (!attr || !key) return;
      var val = (pack && Object.prototype.hasOwnProperty.call(pack, key)) ? pack[key] : null;
      if (val === null || typeof val === 'undefined'){
        var fallback = dict.zh || {};
        if (Object.prototype.hasOwnProperty.call(fallback, key)) val = fallback[key];
      }
      if (val === null || typeof val === 'undefined') return;
      try{ el.setAttribute(attr, String(val)); }catch(_){}
    });
  }

  function bindToggle(btn){
    if (!btn) return;
    function refresh(){
      btn.textContent = 'ZH/EN';
      btn.setAttribute('aria-label', getLang() === 'en' ? 'Switch to Chinese' : '切換英文');
    }
    btn.addEventListener('click', function(){
      var next = getLang() === 'en' ? 'zh' : 'en';
      setLang(next);
      apply();
      refresh();
    });
    window.addEventListener('uc_lang_change', function(){
      apply();
      refresh();
    });
    refresh();
  }

  window.UC_I18N = {
    LANG_KEY: LANG_KEY,
    getLang: getLang,
    setLang: setLang,
    setDict: setDict,
    t: t,
    apply: apply,
    bindToggle: bindToggle
  };
})();
