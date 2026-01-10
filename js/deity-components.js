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

    return `
      <div class="card deity-profile" data-deity-code="${escapeHtml(deity.code)}">
        <div class="imgbox">${imgHtml}</div>
        <div class="meta">
          <div class="row">
            <div class="deity">${escapeHtml(name)}</div>
            <span class="deity-code">${escapeHtml(deity.code)}</span>
          </div>
        </div>
        <div class="desc">${escapeHtml(desc || '')}</div>
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
