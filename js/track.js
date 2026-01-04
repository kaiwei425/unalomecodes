(() => {
  const UTM_FIRST_KEY = 'uc_utm_first';
  const UTM_LAST_KEY = 'uc_utm_last';
  const SID_KEY = 'uc_sid';
  const UTM_FIELDS = ['source', 'medium', 'campaign', 'content', 'term'];

  function safeParse(raw){
    if (!raw) return null;
    try{ return JSON.parse(raw); }catch(_){ return null; }
  }

  function readJson(key){
    try{ return safeParse(localStorage.getItem(key)); }catch(_){ return null; }
  }

  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){}
  }

  function normalizeUtmValue(value){
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.replace(/\s+/g, ' ').slice(0, 80);
  }

  function pickUtmFromUrl(){
    const params = new URLSearchParams(window.location.search || '');
    const out = {};
    UTM_FIELDS.forEach((field) => {
      const val = normalizeUtmValue(params.get(`utm_${field}`));
      if (val) out[field] = val;
    });
    return Object.keys(out).length ? out : null;
  }

  function getStoredUtm(){
    return readJson(UTM_LAST_KEY) || readJson(UTM_FIRST_KEY) || {};
  }

  function initUtm(){
    const fromUrl = pickUtmFromUrl();
    if (!fromUrl) return;
    writeJson(UTM_LAST_KEY, fromUrl);
    const first = readJson(UTM_FIRST_KEY);
    if (!first || !first.source){
      writeJson(UTM_FIRST_KEY, fromUrl);
    }
  }

  function getSessionId(){
    const existing = readJson(SID_KEY);
    if (existing && existing.id) return existing.id;
    const id = `sid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    writeJson(SID_KEY, { id, ts: Date.now() });
    return id;
  }

  function sendTrack(payload){
    if (!payload || !payload.event) return;
    const body = Object.assign({
      page: window.location.pathname,
      ts: Date.now(),
      referrer: document.referrer || '',
      utm: getStoredUtm(),
      sid: getSessionId()
    }, payload);
    const data = JSON.stringify(body);
    try{
      if (navigator.sendBeacon){
        const blob = new Blob([data], { type:'application/json' });
        navigator.sendBeacon('/api/track', blob);
        return;
      }
    }catch(_){}
    try{
      fetch('/api/track', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: data,
        keepalive: true
      }).catch(()=>{});
    }catch(_){}
  }

  window.trackEvent = sendTrack;
  window.getUtmData = getStoredUtm;
  initUtm();
})();
