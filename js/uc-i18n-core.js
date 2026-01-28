(function(){
  if (window.UC_I18N) return;

  var LANG_KEY = 'uc_lang';
  var DEFAULT_LANG = 'zh';

  function detectLang(){
    // Always default to Chinese on fresh visits. English only applies after an explicit
    // user switch (we keep that choice in sessionStorage for this tab/session).
    var stored = '';
    try{ stored = sessionStorage.getItem(LANG_KEY) || ''; }catch(_){}
    if (stored === 'zh' || stored === 'en') return stored;
    try{ sessionStorage.setItem(LANG_KEY, 'zh'); }catch(_){}
    try{ localStorage.setItem(LANG_KEY, 'zh'); }catch(_){}
    return 'zh';
  }

  function getLang(){
    return detectLang();
  }

  function setLang(lang){
    var next = (lang === 'en') ? 'en' : 'zh';
    try{ sessionStorage.setItem(LANG_KEY, next); }catch(_){}
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
      var keepZh = el.hasAttribute('data-i18n-keep-zh');
      if (keepZh){
        // Capture the current ZH copy before any EN overwrite. When switching back from EN,
        // restore the captured ZH so custom/edited copy won't be replaced by default dict text.
        if (!el.dataset.ucZhText) el.dataset.ucZhText = el.textContent;
        var last = el.dataset.ucLangApplied || '';
        if (lang === 'zh'){
          if (last === 'en' && el.dataset.ucZhText){
            el.textContent = el.dataset.ucZhText;
          }else{
            // Treat current DOM as the source-of-truth for zh (e.g. admin-edited content).
            el.dataset.ucZhText = el.textContent;
          }
          el.dataset.ucLangApplied = 'zh';
          return;
        }
      }
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = (pack && Object.prototype.hasOwnProperty.call(pack, key)) ? pack[key] : null;
      if (val === null || typeof val === 'undefined'){
        var fallback = dict.zh || {};
        if (Object.prototype.hasOwnProperty.call(fallback, key)) val = fallback[key];
      }
      if ((val === null || typeof val === 'undefined') && keepZh){
        val = el.dataset.ucZhText || el.textContent;
      }
      if (val === null || typeof val === 'undefined') return;
      el.textContent = String(val);
      if (keepZh) el.dataset.ucLangApplied = 'en';
    });

    scope.querySelectorAll('[data-i18n-html]').forEach(function(el){
      var keepZh = el.hasAttribute('data-i18n-keep-zh');
      if (keepZh){
        if (!el.dataset.ucZhHtml) el.dataset.ucZhHtml = el.innerHTML;
        var last = el.dataset.ucLangApplied || '';
        if (lang === 'zh'){
          if (last === 'en' && el.dataset.ucZhHtml){
            el.innerHTML = el.dataset.ucZhHtml;
          }else{
            el.dataset.ucZhHtml = el.innerHTML;
          }
          el.dataset.ucLangApplied = 'zh';
          return;
        }
      }
      var key = el.getAttribute('data-i18n-html');
      if (!key) return;
      var val = (pack && Object.prototype.hasOwnProperty.call(pack, key)) ? pack[key] : null;
      if (val === null || typeof val === 'undefined'){
        var fallback = dict.zh || {};
        if (Object.prototype.hasOwnProperty.call(fallback, key)) val = fallback[key];
      }
      if ((val === null || typeof val === 'undefined') && keepZh){
        val = el.dataset.ucZhHtml || el.innerHTML;
      }
      if (val === null || typeof val === 'undefined') return;
      el.innerHTML = String(val);
      if (keepZh) el.dataset.ucLangApplied = 'en';
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

  function startKeepZhObserver(){
    if (startKeepZhObserver._started) return;
    startKeepZhObserver._started = true;
    if (typeof MutationObserver !== 'function') return;

    function attach(){
      if (!document.body) return;
      var obs = new MutationObserver(function(mutations){
        // Only track updates while we're in zh so the stored ZH stays in sync with admin edits / fetched copy.
        if (getLang() !== 'zh') return;
        mutations.forEach(function(m){
          var node = m.target && m.target.nodeType === 1 ? m.target : (m.target && m.target.parentElement);
          var el = node;
          while (el && el.nodeType === 1){
            if (el.hasAttribute && el.hasAttribute('data-i18n-keep-zh')){
              if (el.hasAttribute('data-i18n')) el.dataset.ucZhText = el.textContent;
              if (el.hasAttribute('data-i18n-html')) el.dataset.ucZhHtml = el.innerHTML;
              el.dataset.ucLangApplied = 'zh';
              break;
            }
            el = el.parentElement;
          }
        });
      });
      obs.observe(document.body, { subtree:true, childList:true, characterData:true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once:true });
    else attach();
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

  startKeepZhObserver();
})();
