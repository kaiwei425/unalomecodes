(function(){
  const SITE_BASE = (function(){ try{ return location.origin; }catch(_){ return ''; }})();
  const API_BASE = (window.DEITY_API_BASE || SITE_BASE || '').replace(/\/$/, '');
  const API = API_BASE.endsWith('/api') ? API_BASE : (API_BASE ? API_BASE + '/api' : '');

  function getData(){
    return window.DEITY_DATA || {};
  }

  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
    });
  }

  function getLocaleArray(value, lang){
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object'){
      const candidate = (lang === 'en' ? value.en : value.zh) || value.zh || value.en;
      return Array.isArray(candidate) ? candidate : [];
    }
    return [];
  }

  function buildStateDescriptor(deity, lang){
    if (!deity) return '';
    const keywords = getLocaleArray(deity.keywords, lang);
    const strengths = getLocaleArray(deity.strengths, lang);
    if (!keywords.length && !strengths.length) return null;
    return {
      k1: keywords[0] || keywords[1] || '',
      k2: keywords[1] || keywords[0] || '',
      s1: strengths[0] || strengths[1] || ''
    };
  }

  // C1: derive status analysis data without affecting UI
  function handleC1Feature(deity, lang, intent){
    // C1: ensure keywords/strengths exist
    if (!deity) return null;
    const kw = getLocaleArray(deity.keywords, lang);
    const st = getLocaleArray(deity.strengths, lang);
    if (!kw.length && !st.length) return null;
    const tags = [];
    kw.slice(0, 3).forEach(k => { if (k) tags.push(String(k)); });
    st.slice(0, 2).forEach(s => { if (s && tags.length < 3) tags.push(String(s)); });
    const summary = lang === 'en'
      ? `Suitable when facing ${kw.slice(0,3).join(' / ') || 'shifts'}, especially for ${st[0] || 'steady focus'}.`
      : `適合在「${kw.slice(0,3).join('／') || '變動'}」時參拜，特別有助於「${st[0] || '穩定力量'}」。`;
    return {
      tags,
      summary,
      source: 'keywords+strengths'
    };
  }

  function formatTemplate(tpl, ctx){
    if (!tpl) return '';
    return tpl.replace(/\{(\w+)\}/g, function(_, key){
      if (!ctx) return '';
      return escapeHtml(ctx[key] || '');
    });
  }

  function buildNextStepSuggestion(opts){
    const deity = opts && opts.deity;
    const intent = (opts && opts.intent) ? String(opts.intent).trim() : '';
    const lang = opts && opts.lang === 'en' ? 'en' : 'zh';
    if (!intent) return null;
    let actionType = null;
    let actionUrl = null;
    const links = (deity && deity.links) || {};
    const txt = intent.toLowerCase();
    if (/stability|blockage|conflict/.test(txt)){
      if (links.templemap_url){
        actionType = 'temple';
        actionUrl = links.templemap_url;
      }
    } else if (/career|money|protection/.test(txt)){
      if (links.shop_url){
        actionType = 'wear';
        actionUrl = links.shop_url;
      }
    }
    const title = lang === 'en' ? 'Your next step' : '你現在可以做的下一步';
    let body;
    const nameZh = deity && deity.name && deity.name.zh ? deity.name.zh : '';
    const nameEn = deity && deity.name && deity.name.en ? deity.name.en : '';
    if (lang === 'en'){
      if (actionType === 'temple'){
        body = `If you’re facing “${intent}”, visiting a ${nameEn || 'related'} temple usually feels more grounded than just thinking about it.`;
      } else if (actionType === 'wear'){
        body = `In this phase, carrying ${nameEn || 'this guardian'} as protection helps steady you for the long run.`;
      } else {
        body = 'Observe this state for a few days and note how it shifts—clarity comes before bold moves.';
      }
    } else {
      if (actionType === 'temple'){
        body = `如果你最近正卡在「${intent}」狀態，實際走一趟與 ${nameZh || '此守護'} 有關的寺廟，通常會比只理解更有感。`;
      } else if (actionType === 'wear'){
        body = `在這個階段，將 ${nameZh || '此守護'} 作為隨身配戴，會更適合長時間調整狀態。`;
      } else {
        body = '先觀察這個狀態幾天，記下變化，會比立刻行動更清楚。';
      }
    }
    if (!actionUrl){
      actionType = null;
    }
    return {
      title,
      body,
      actionType,
      actionUrl
    };
  }

  function buildReturnFlow(opts){
    const lang = opts && opts.lang === 'en' ? 'en' : 'zh';
    const title = lang === 'en'
      ? 'This isn’t the only possible alignment'
      : '這不是唯一的可能';
    const body = lang === 'en'
      ? 'Different phases lead to different protectors. You can revisit your current state, or explore another perspective.'
      : '不同階段，會對應不同的守護狀態。你可以重新看看現在的自己，或換個角度理解。';
    const quizUrl = `/quiz/?lang=${lang}`;
    const deityUrl = `/deity?lang=${lang}`;
    return {
      title,
      body,
      actions: [
        {
          label: lang === 'en' ? 'Retake the quiz' : '重新測驗目前狀態',
          url: quizUrl
        },
        {
          label: lang === 'en' ? 'Explore other deities' : '看看其他守護神',
          url: deityUrl
        }
      ]
    };
  }

  function getLangDict(lang){
    if (!window.APP_I18N) return {};
    return window.APP_I18N[lang] || window.APP_I18N.zh || {};
  }

  function tState(key, lang){
    if (!key) return '';
    const dict = getLangDict(lang);
    if (dict && dict[key]) return dict[key];
    const fallbackDict = getLangDict('zh');
    return (fallbackDict && fallbackDict[key]) || '';
  }

  function getDeityById(id){
    const data = getData();
    const code = String(id || '').trim().toUpperCase();
    const nameZh = (data.names && data.names[code]) || code || '守護神';
    const nameEn = (data.namesEn && data.namesEn[code]) || nameZh;
    const descZh = (data.desc && data.desc[code]) || '';
    const descEn = (data.descEn && data.descEn[code]) || '';
    const wear = (data.wear && data.wear[code]) || {};
    const keywords = (data.keywords && data.keywords[code]) || {};
    const strengths = (data.strengths && data.strengths[code]) || [];
    const ritual = (data.ritual && data.ritual[code]) || [];
    const image = (data.images && data.images[code]) || '';
    const stories = (data.stories && data.stories[code]) || [];
    const linkPack = (data.links && data.links[code]) || {};
    const deityUrl = linkPack.deity_profile_url || (code ? `/deity?code=${encodeURIComponent(code)}` : '/deity');
    const shopUrl = linkPack.shop_url || (code ? `/shop?deity=${encodeURIComponent(code)}` : '/shop');
    const templeUrl = linkPack.templemap_url || '/templemap';
    return {
      id: code,
      code,
      name: { zh: nameZh, en: nameEn },
      desc: { zh: descZh, en: descEn },
      wear,
      keywords,
      strengths,
      ritual,
      image,
      stories,
      links: {
        deity_profile_url: deityUrl,
        shop_url: shopUrl,
        templemap_url: templeUrl
      }
    };
  }

  function renderDeityProfile(deity, lang){
    if (!deity || !deity.code) return '';
    const isEn = lang === 'en';
    const name = isEn ? deity.name.en : deity.name.zh;
    const desc = (isEn ? deity.desc.en : deity.desc.zh) || deity.desc.zh || deity.desc.en || '';
    const img = deity.image;
    const imgHtml = img
      ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="deity-placeholder">${escapeHtml(name)}</div>`;

    const params = (typeof window !== 'undefined' && window.location && window.location.search)
      ? new URLSearchParams(window.location.search)
      : null;
    const intentParam = params ? (params.get('intent') || '') : '';
    const stateData = buildStateDescriptor(deity, lang);
    const c1Data = handleC1Feature(deity, lang, intentParam); // C1: placeholder hook
    const lastResult = (function(){
      if (typeof window === 'undefined' || !window.localStorage) return null;
      try{
        const raw = window.localStorage.getItem('uc:lastResult');
        return raw ? JSON.parse(raw) : null;
      }catch(_){
        return null;
      }
    })();
    const lastCode = lastResult && lastResult.deity ? String(lastResult.deity).trim().toUpperCase() : '';
    const showMemoryHint = lastCode && lastCode !== deity.code;
    const memoryHintText = showMemoryHint
      ? (isEn
        ? 'Your last state aligned with a different protector.'
        : '你上一次的狀態，對應的是另一尊守護神。')
      : '';
    return `
      <div class="card deity-profile" data-deity-code="${escapeHtml(deity.code)}">
        <div class="imgbox">${imgHtml}</div>
        <div class="meta">
          <div class="row">
            <div class="deity">${escapeHtml(name)}</div>
            <span class="deity-code">${escapeHtml(deity.code)}</span>
          </div>
        </div>
        <div class="deity-state">${(function(){
          const templateKey = 'deity-state-template';
          const fallbackKey = 'deity-state-fallback';
          let text = '';
          if (stateData && stateData.k1 && stateData.s1){
            const tpl = tState(templateKey, lang);
            if (tpl){
              text = formatTemplate(tpl, stateData);
            }
          }
          if (!text){
            text = tState(fallbackKey, lang) || 'Suitable for transitions needing steadier protection.';
          }
          return text;
        })()}</div>
        ${(function(){
          if (c1Data && c1Data.summary){
            let html = `<div class="deity-c1-summary">${escapeHtml(c1Data.summary)}</div>`;
            const tags = Array.isArray(c1Data.tags) ? c1Data.tags.slice(0,3) : [];
            if (tags.length){
              html += '<div class="deity-c1-tags">';
              tags.forEach(tag => {
                html += `<span class="deity-c1-tag">${escapeHtml(tag)}</span>`;
              });
              html += '</div>';
            }
            if (intentParam){
              const hint = lang === 'en'
                ? `This deity is often chosen for “${intentParam}” states`
                : `這尊神常在「${intentParam}」狀態被選擇`;
              html += `<div class="deity-intent-hint">${escapeHtml(hint)}</div>`;
            }
            const suggestion = buildNextStepSuggestion({
              deity,
              intent: intentParam,
              c1Data,
              lang
            });
            if (suggestion){
              const linkHref = suggestion.actionUrl
                ? `${suggestion.actionUrl}${suggestion.actionUrl.includes('?') ? '&' : '?'}intent=${encodeURIComponent(intentParam)}&lang=${encodeURIComponent(lang)}`
                : '';
              html += `<div class="deity-next-step"><div class="next-step-title">${escapeHtml(suggestion.title)}</div><div class="next-step-body">${escapeHtml(suggestion.body)}</div>`;
              if (linkHref){
                const linkText = lang === 'en'
                  ? (suggestion.actionType === 'wear' ? 'View wear guidance' : 'Go to temple map')
                  : (suggestion.actionType === 'wear' ? '查看配戴建議' : '前往寺廟地圖');
                html += `<a class="next-step-link" href="${escapeHtml(linkHref)}">${escapeHtml(linkText)}</a>`;
              }
              html += '</div>';
            }
            return html;
          }
          return '';
        })()}
        <div class="desc">${escapeHtml(desc || '')}</div>
        ${(function(){
          const flow = buildReturnFlow({ deity, intent: intentParam, lang });
          if (!flow && !showMemoryHint) return '';
          let html = '<div class="deity-return-flow">';
          if (showMemoryHint){
            html += `<div class="deity-memory-hint">${escapeHtml(memoryHintText)}</div>`;
          }
          if (!flow){
            html += '</div>';
            return html;
          }
          html += `<div class="return-flow-title">${escapeHtml(flow.title)}</div><div class="return-flow-body">${escapeHtml(flow.body)}</div><div class="return-flow-actions">`;
          flow.actions.forEach(action => {
            html += `<a class="return-flow-link" href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a>`;
          });
          html += '</div></div>';
          return html;
        })()}
      </div>
    `;
  }

  function normalizeStoryItem(it){
    if (!it) return null;
    return {
      id: it.id || it._id || it.ts,
      nick: it.nick || it.user || it.name || '匿名',
      msg: it.msg || it.text || it.content || '',
      ts: it.ts || it.createdAt || Date.now()
    };
  }

  async function fetchStories(code){
    const data = getData();
    const local = Array.isArray(data.stories && data.stories[code]) ? data.stories[code] : [];
    if (!API) return local.slice();
    let apiItems = [];
    try{
      const res = await fetch(`${API}/stories?code=${encodeURIComponent(code)}`);
      if (res.ok){
        const json = await res.json();
        const items = (json && json.items) ? json.items : [];
        apiItems = items.map(normalizeStoryItem).filter(Boolean);
      }
    }catch(_){ }
    const list = (local.length || apiItems.length) ? local.concat(apiItems) : [];
    return list;
  }

  async function renderDeityStories(deityId, lang){
    const code = String(deityId || '').trim().toUpperCase();
    const list = await fetchStories(code);
    if (!list.length){
      return `<div class="muted" data-i18n="empty-stories"></div>`;
    }
    const locale = lang === 'en' ? 'en-US' : 'zh-TW';
    return list.map(it => {
      const d = new Date(it.ts || Date.now());
      const t = d.toLocaleString(locale, { hour12: false });
      return `
        <div class="bubble">
          <div class="nick">👤 ${escapeHtml(it.nick || (lang === 'en' ? 'Anonymous' : '匿名'))}</div>
          <div class="msg">${escapeHtml(it.msg || '')}</div>
          <div class="time">🕰 ${escapeHtml(t)}</div>
        </div>
      `;
    }).join('');
  }

  function renderUserStoriesSection(deityId, lang, opts){
    const isEn = lang === 'en';
    const collapsed = !!(opts && opts.collapsed);
    const summary = isEn ? 'User Stories' : '用戶分享';
    const hint = isEn ? 'Open to read community stories. Share yours on the deity page.' : '展開閱讀用戶分享，可在神祇頁面留下你的故事。';
    const openAttr = collapsed ? '' : ' open';
    const url = deityId ? `/deity?code=${encodeURIComponent(String(deityId).toUpperCase())}` : '/deity';

    return `
      <details class="user-stories"${openAttr}>
        <summary>${escapeHtml(summary)}</summary>
        <div class="muted user-stories-hint">${escapeHtml(hint)}</div>
        <div class="story-list" data-story-list="user"></div>
        <a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${isEn ? 'Go to deity page' : '前往神祇頁'}</a>
      </details>
    `;
  }

  window.getDeityById = getDeityById;
  window.renderDeityProfile = renderDeityProfile;
  window.renderDeityStories = renderDeityStories;
  window.renderUserStoriesSection = renderUserStoriesSection;
  window.deityComponents = {
    getDeityById,
    renderDeityProfile,
    renderDeityStories,
    renderUserStoriesSection
  };
})();
