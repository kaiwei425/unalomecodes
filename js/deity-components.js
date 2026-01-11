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

  function getSavedState(){
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try{
      const raw = window.localStorage.getItem('__uc_savedState__');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.deity) return null;
      return parsed;
    }catch(_){
      return null;
    }
  }

  function buildSavedStateHint({ currentDeity, lang }){
    const saved = getSavedState();
    if (!saved) return '';
    if (String(saved.deity || '').trim().toUpperCase() === String(currentDeity || '').trim().toUpperCase()){
      return '';
    }
    const textByLang = {
      zh: '你曾保存過另一個狀態，對應不同的守護神',
      en: 'You previously saved a different state linked to another guardian'
    };
    const div = document.createElement('div');
    div.className = 'deity-memory-hint';
    div.textContent = textByLang[lang] || textByLang.en;
    return div.outerHTML;
  }

  function buildSavedStateCompare({ currentDeity, lang }){
    try{
      if (typeof window === 'undefined' || !window.localStorage) return '';
      const raw = window.localStorage.getItem('__uc_savedState__');
      if (!raw) return '';
      const saved = JSON.parse(raw);
      if (!saved || !saved.deity) return '';
      const savedCode = String(saved.deity || '').trim().toUpperCase();
      const currentCode = String(currentDeity || '').trim().toUpperCase();
      if (!savedCode || savedCode === currentCode) return '';
      const isEn = lang === 'en';
      const title = isEn ? 'You previously saved a different state' : '你曾保存過另一個狀態';
      const labelSaved = isEn ? 'Saved' : '之前';
      const labelNow = isEn ? 'Now' : '現在';
      const esc = s => String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `
        <div class="deity-saved-compare">
          <div class="compare-title">${title}</div>
          <div class="compare-row">
            <span class="label">${labelSaved}</span>
            <span class="value">${esc(savedCode)}</span>
          </div>
          <div class="compare-row">
            <span class="label">${labelNow}</span>
            <span class="value">${esc(currentCode)}</span>
          </div>
        </div>
      `;
    }catch(_){
      return '';
    }
  }

  function buildSavedStateDirectionHint({ currentDeity, currentIntent, lang }){
    try{
      if (typeof window === 'undefined' || !window.localStorage) return '';
      const raw = window.localStorage.getItem('__uc_savedState__');
      if (!raw) return '';
      const saved = JSON.parse(raw);
      if (!saved || !saved.deity || !saved.intent) return '';
      const savedCode = String(saved.deity || '').trim().toUpperCase();
      const currentCode = String(currentDeity || '').trim().toUpperCase();
      if (!savedCode || savedCode === currentCode) return '';
      const savedIntent = String(saved.intent || '').trim();
      const currentIntentText = String(currentIntent || '').trim();
      if (!savedIntent || !currentIntentText) return '';
      const sentence = lang === 'en'
        ? `Your focus appears to shift from “${savedIntent}” to “${currentIntentText}”, suggesting a change in your current phase.`
        : `你的關注似乎從「${savedIntent}」轉向「${currentIntentText}」，代表你正在經歷不同階段的需求。`;
      return `<div class="deity-saved-direction">${sentence}</div>`;
    }catch(_){
      return '';
    }
  }

  function buildQuizContextFlag({ intentParam }){
    return Boolean(intentParam);
  }

  function buildQuietClosureHint({ lang }){
    const text = lang === 'en'
      ? 'This moment of understanding is complete on its own; there is no rush to move further.'
      : '此刻的理解已自成一章，暫時停在這裡也同樣踏實。';
    return `<div class="deity-quiet-closure">${text}</div>`;
  }

  function getCurrentUserState({ now = Date.now() } = {}){
    try{
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const savedRaw = window.localStorage.getItem('__uc_savedState__');
      if (savedRaw){
        const saved = JSON.parse(savedRaw);
        if (saved && saved.deity && saved.intent){
          return {
            source: 'saved',
            deity: String(saved.deity).trim(),
            intent: String(saved.intent || '').trim(),
            time: saved.ts || now
          };
        }
      }
      const lastRaw = window.localStorage.getItem('uc:lastResult');
      if (lastRaw){
        const last = JSON.parse(lastRaw);
        if (last && last.deity){
          const time = last.ts || last.time || now;
          const age = now - (Number(time) || now);
          if (Number.isFinite(age) && age >= 0 && age <= 7 * 24 * 60 * 60 * 1000){
            return {
              source: 'recent',
              deity: String(last.deity).trim(),
              intent: String(last.intent || last.intentParam || '').trim(),
              time
            };
          }
        }
      }
    }catch(_){
      return null;
    }
    return null;
  }

  function compareWithCurrentState({ currentDeity, currentIntent, now = Date.now() } = {}){
    if (!currentDeity) return null;
    const userState = getCurrentUserState({ now });
    if (!userState) return null;
    const normalizedCurrentDeity = String(currentDeity || '').trim().toUpperCase();
    const normalizedPreviousDeity = String(userState.deity || '').trim().toUpperCase();
    const result = {
      isSame: normalizedPreviousDeity === normalizedCurrentDeity,
      source: userState.source,
      previous: userState,
      current: {
        deity: normalizedCurrentDeity,
        intent: currentIntent ? String(currentIntent).trim() : ''
      }
    };
    return result;
  }

function buildUserStateContext({ currentDeity, currentIntent, now = Date.now() } = {}){
    if (!currentDeity) return null;
    try{
      if (typeof window === 'undefined' || !window.localStorage) return null;
    }catch(_){
      return null;
    }
    const userState = getCurrentUserState({ now });
    if (!userState) return null;
    const normalizedCurrentDeity = String(currentDeity || '').trim().toUpperCase();
    const normalizedCurrentIntent = currentIntent ? String(currentIntent).trim() : null;
    const normalizedPreviousDeity = String(userState.deity || '').trim().toUpperCase();
    const normalizedPreviousIntent = userState.intent ? String(userState.intent).trim() : null;
    return {
      hasHistory: true,
      source: userState.source,
      previous: {
        deity: normalizedPreviousDeity,
        intent: normalizedPreviousIntent,
        time: userState.time || now
      },
      current: {
        deity: normalizedCurrentDeity,
        intent: normalizedCurrentIntent
      },
      isSameDeity: normalizedPreviousDeity === normalizedCurrentDeity,
      isSameIntent: normalizedPreviousIntent && normalizedCurrentIntent
        ? normalizedPreviousIntent === normalizedCurrentIntent
        : false
    };
  }

  function buildStateContinuityHint({ currentDeity, currentIntent, lang, now, isQuizContext }){
    if (!isQuizContext) return '';
    const context = buildUserStateContext({ currentDeity, currentIntent, now });
    if (!context || !context.hasHistory) return '';
    const { isSameDeity, isSameIntent } = context;
    const text = (isSameDeity && isSameIntent)
      ? (lang === 'en'
        ? 'Your current state aligns with your previously saved state.'
        : '你目前的狀態，與先前保存的狀態一致。')
      : (lang === 'en'
        ? 'Your current state differs from your previously saved state.'
        : '你目前的狀態，與先前保存的狀態有所不同。');
    return `<div class="deity-state-continuity">${escapeHtml(text)}</div>`;
  }

  function buildStateRelationNarrative({ stateCompare, lang }){
    if (!stateCompare || stateCompare.isSame) return '';
    const sourceLabel = stateCompare.source === 'saved'
      ? { zh: '先前保存的狀態', en: 'previously saved state' }
      : { zh: '最近一次測驗的狀態', en: 'most recent quiz state' };
    const sentence = lang === 'en'
      ? `This deity differs from your ${sourceLabel.en}, offering another perspective on where you are now.`
      : `這尊神與你「${sourceLabel.zh}」不同，代表你正在觀看新的狀態面向。`;
    return `<div class="deity-state-relation">${sentence}</div>`;
  }

  function buildStateStabilityHint({ lang }){
    if (!lang) return '';
    const text = lang === 'zh'
      ? '此刻的狀態是可以被暫時停留與理解的，不需要立即做出改變。'
      : 'This state can be paused and understood for now. No immediate change is required.';
    return `<div class="deity-state-stability">${escapeHtml(text)}</div>`;
  }

  function buildStateConfirmationHint({ currentDeity, currentIntent, lang, now, isQuizContext }){
    if (!isQuizContext) return '';
    const context = buildUserStateContext({ currentDeity, currentIntent, now });
    if (!context || context.isSameDeity) return '';
    const text = lang === 'zh'
      ? '這代表你目前關注的狀態，已與先前保存的狀態不同。'
      : 'This reflects a state different from what you previously saved.';
    return `<div class="deity-state-confirmation">${escapeHtml(text)}</div>`;
  }

  function buildStateRelationshipNarrative({ currentDeity, currentIntent, lang, now }){
    const comparison = compareWithCurrentState({ currentDeity, currentIntent, now });
    if (!comparison || comparison.isSame) return '';
    if (lang !== 'en' && lang !== 'zh') return '';
    const text = lang === 'en'
      ? 'The guardian state appearing this time differs from your previous one. It does not replace it, but reflects a shift in what currently holds your focus.'
      : '這一次出現的守護狀態，與你先前所處的狀態不同。它並非取代，而是反映你當下關注的重心已產生變化。';
    return `<div class="deity-state-relationship">${text}</div>`;
  }

  function compareWithCurrentState({ currentDeity, currentIntent, now = Date.now() } = {}){
    if (!currentDeity) return null;
    const userState = getCurrentUserState({ now });
    if (!userState) return null;
    const normalizedCurrentDeity = String(currentDeity || '').trim().toUpperCase();
    const normalizedCurrentIntent = currentIntent ? String(currentIntent).trim() : '';
    const normalizedPreviousDeity = String(userState.deity || '').trim().toUpperCase();
    return {
      isSame: normalizedPreviousDeity === normalizedCurrentDeity,
      source: userState.source,
      previous: userState,
      current: {
        deity: normalizedCurrentDeity,
        intent: normalizedCurrentIntent
      }
    };
  }

  function buildOneLineStateNarrative({ deity, intent, c1Data, lang }){
    if (!intent || !c1Data) return '';
    const keyword = Array.isArray(c1Data.tags) && c1Data.tags[0] ? c1Data.tags[0] : '';
    const strength = (c1Data.tags && c1Data.tags[1]) || '';
    if (!keyword && !strength) return '';
    const clean = text => String(text || '').trim();
    const sanitizedIntent = clean(intent);
    const sanitizedKeyword = clean(keyword);
    const sanitizedStrength = clean(strength);
    if (!sanitizedIntent) return '';
    const text = lang === 'en'
      ? `You are currently in a phase centered on “${sanitizedIntent}”, where understanding yourself through ${sanitizedKeyword || 'focus'} and ${sanitizedStrength || 'awareness'} becomes important.`
      : `你正處於一個以「${sanitizedIntent}」為核心、需要結合「${sanitizedKeyword || '關注'}」與「${sanitizedStrength || '力量'}」來理解自己的階段。`;
    return `<div class="deity-state-narrative">${text}</div>`;
  }

  function buildQuizContextHint({ intent, lang }){
    if (!intent) return '';
    const text = lang === 'en'
      ? `This deity corresponds to the “${String(intent).trim()}” state reflected in your quiz results.`
      : `這尊神祇是根據你在測驗中呈現的「${String(intent).trim()}」狀態所對應。`;
    return `<div class="deity-quiz-context">${text}</div>`;
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
    const isQuizContext = buildQuizContextFlag({ intentParam });
    const quizContextHint = isQuizContext ? buildQuizContextHint({ intent: intentParam, lang }) : '';
    const stateCompare = isQuizContext
      ? compareWithCurrentState({ currentDeity: deity.code, currentIntent: intentParam, now: Date.now() })
      : null;
    return `
      <div class="card deity-profile" data-deity-code="${escapeHtml(deity.code)}">
        <div class="imgbox">${imgHtml}</div>
        <div class="meta">
          <div class="row">
            <div class="deity">${escapeHtml(name)}</div>
            <span class="deity-code">${escapeHtml(deity.code)}</span>
          </div>
        </div>
        ${quizContextHint}
        <div class="deity-micro-insight">
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
            text = tState(fallbackKey, lang) || (lang === 'en'
              ? 'Suitable for transitions needing steadier protection.'
              : '適合在關鍵轉換期尋求更穩定守護的人。');
          }
            return text;
          })()}</div>
          ${(function(){
            if (!isQuizContext) return '';
            const narrative = buildOneLineStateNarrative({ deity, intent: intentParam, c1Data, lang });
            return narrative || '';
          })()}
        </div>
        ${(function(){
          const pieces = [];
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
            pieces.push(html);
          }
          if (intentParam && isQuizContext){
            const hint = lang === 'en'
              ? `This deity is often chosen for “${intentParam}” states`
              : `這尊神常在「${intentParam}」狀態被選擇`;
            pieces.push(`<div class="deity-intent-hint">${escapeHtml(hint)}</div>`);
          }
          const memoryHint = buildSavedStateHint({ currentDeity: deity.code, lang });
          if (memoryHint){
            pieces.push(memoryHint);
          }
          if (isQuizContext){
            const savedCompare = buildSavedStateCompare({ currentDeity: deity.code, lang });
            if (savedCompare){
              pieces.push(savedCompare);
            }
            const directionHint = buildSavedStateDirectionHint({ currentDeity: deity.code, currentIntent: intentParam, lang });
            if (directionHint){
              pieces.push(directionHint);
            }
            const relation = buildStateRelationNarrative({ stateCompare, lang });
            if (relation){
              pieces.push(relation);
            }
          }
          if (!pieces.length) return '';
          const summaryLabel = lang === 'en' ? 'More context' : '更多狀態脈絡';
          return `<details class="deity-context-details"><summary>${summaryLabel}</summary>${pieces.join('')}</details>`;
        })()}
        ${(function(){
          if (!isQuizContext) return '';
          const paragraphs = [
            '你目前看到的守護神，',
            '代表的是你「此刻」最需要被穩定與承接的狀態。',
            '',
            '在先前的紀錄中，',
            '你曾經對應過不同的守護象徵。',
            '那並不衝突，也不代表錯誤。',
            '',
            '人的狀態會隨時間、壓力與選擇而變化，',
            '守護神的出現，只是對當下階段的一種映照。',
            '',
            '這不是唯一的答案，',
            '而是一個用來理解自己的參考點。'
          ];
          const html = paragraphs.map(line => line ? `<p>${escapeHtml(line)}</p>` : '').join('');
          return `<div class="deity-current-state-block">${html}</div>`;
        })()}
        ${(function(){
          if (!isQuizContext) return '';
          const relationship = buildStateRelationshipNarrative({
            currentDeity: deity.code,
            currentIntent: intentParam,
            lang,
            now: Date.now()
          });
          return relationship || '';
        })()}
        ${(function(){
          if (!isQuizContext) return '';
          return buildStateConfirmationHint({
            currentDeity: deity.code,
            currentIntent: intentParam,
            lang,
            now: Date.now(),
            isQuizContext
          }) || '';
        })()}
        ${(function(){
          if (!isQuizContext) return '';
          return buildStateStabilityHint({ lang }) || '';
        })()}
        ${(function(){
          if (!isQuizContext) return '';
          return buildStateContinuityHint({
            currentDeity: deity.code,
            currentIntent: intentParam,
            lang,
            now: Date.now(),
            isQuizContext
          }) || '';
        })()}
        ${(function(){
          let html = '';
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
          if (isQuizContext){
            const quietHint = buildQuietClosureHint({ lang });
            if (quietHint){
              html += quietHint;
            }
          }
          return html;
        })()}
        <div class="desc">${escapeHtml(desc || '')}</div>
        ${(function(){
          const flow = buildReturnFlow({ deity, intent: intentParam, lang });
          if (!flow || !flow.actions || !flow.actions.length) return '';
          const ctaLabel = '重新測驗目前狀態，看看是否出現不同的守護指引';
          return `<div class="deity-return-cta"><a class="deity-return-cta-link" href="${escapeHtml(flow.actions[0].url)}">${escapeHtml(ctaLabel)}</a></div>`;
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
