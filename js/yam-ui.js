(function(){
  const LEVEL_TEXT = {
    BEST: '大吉',
    GOOD: '吉',
    NEUTRAL: '平',
    BAD: '空亡'
  };
  const LEVEL_CLASS = {
    BEST: 'yam-best',
    GOOD: 'yam-good',
    NEUTRAL: 'yam-neutral',
    BAD: 'yam-bad'
  };
  const DEFAULT_SLOTS = [
    { start:'06:01', end:'08:24' },
    { start:'08:25', end:'10:48' },
    { start:'10:49', end:'13:12' },
    { start:'13:13', end:'15:36' },
    { start:'15:37', end:'18:00' }
  ];
  const FOCUS_MAP = {
    '工作':'work',
    '感情':'love',
    '財運':'money',
    '健康':'health',
    '人際':'social',
    '學業':'study'
  };
  const PHUM_FALLBACK = {
    AYU:'health',
    DECH:'work',
    SRI:'money',
    MULA:'money',
    UTSAHA:'work',
    MONTRI:'social',
    BORIWAN:'work',
    KALAKINI:'work'
  };
  const SLOT_HINTS = {
    work: {
      BEST:'適合：處理重要待辦',
      GOOD:'適合：安排會議溝通',
      NEUTRAL:'適合：整理待辦清單',
      BAD:'避免：倉促下結論'
    },
    love: {
      BEST:'適合：表達感謝關心',
      GOOD:'適合：安排輕鬆約會',
      NEUTRAL:'適合：正常互動交流',
      BAD:'避免：情緒化對話'
    },
    money: {
      BEST:'適合：盤點收支帳目',
      GOOD:'適合：確認付款細節',
      NEUTRAL:'適合：整理固定支出',
      BAD:'避免：衝動消費下單'
    },
    health: {
      BEST:'適合：做 10 分鐘伸展',
      GOOD:'適合：補水與放鬆',
      NEUTRAL:'適合：維持作息節奏',
      BAD:'避免：熬夜或硬撐'
    },
    social: {
      BEST:'適合：回覆重要訊息',
      GOOD:'適合：安排拜訪協調',
      NEUTRAL:'適合：例行回覆追蹤',
      BAD:'避免：正面衝突爭辯'
    },
    study: {
      BEST:'適合：專注讀 15 分鐘',
      GOOD:'適合：整理筆記重點',
      NEUTRAL:'適合：回顧既有內容',
      BAD:'避免：臨時抱佛腳'
    }
  };

  function toMinutes(hhmm){
    const parts = String(hhmm || '').split(':');
    if (parts.length !== 2) return NaN;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
    return h * 60 + m;
  }

  function getNowSlot(slots, nowHHMM){
    let nowValue = nowHHMM;
    if (!nowValue){
      const now = new Date();
      nowValue = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    }
    const nowMin = toMinutes(nowValue);
    if (Number.isNaN(nowMin)) return null;
    for (let i=0;i<slots.length;i++){
      const s = slots[i];
      const start = toMinutes(s.start);
      const end = toMinutes(s.end);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      if (nowMin >= start && nowMin < end) return s;
    }
    return null;
  }

  function buildFallbackSlots(payload){
    const timing = payload && payload.fortune ? payload.fortune.timing : null;
    if (!timing || (!Array.isArray(timing.best) && !Array.isArray(timing.avoid))) return [];
    const best = Array.isArray(timing.best) ? timing.best : [];
    const avoid = Array.isArray(timing.avoid) ? timing.avoid : [];
    return DEFAULT_SLOTS.map(slot=>{
      const isBest = best.some(s=> s && s.start === slot.start && s.end === slot.end);
      const isBad = avoid.some(s=> s && s.start === slot.start && s.end === slot.end);
      const level = isBest ? 'BEST' : (isBad ? 'BAD' : 'NEUTRAL');
      return {
        start: slot.start,
        end: slot.end,
        level,
        label: level === 'BEST'
          ? '適合主動推進與重要決策'
          : (level === 'BAD'
            ? '避免開新局、避免簽約與衝突'
            : '可例行處理、維持節奏')
      };
    });
  }

  function resolveSlots(payload){
    const metaSlots = payload && payload.meta && payload.meta.yam && Array.isArray(payload.meta.yam.slots)
      ? payload.meta.yam.slots
      : [];
    if (metaSlots.length === 5) return metaSlots;
    const nestedSlots = payload && payload.fortune && payload.fortune.meta && payload.fortune.meta.yam && Array.isArray(payload.fortune.meta.yam.slots)
      ? payload.fortune.meta.yam.slots
      : [];
    if (nestedSlots.length === 5) return nestedSlots;
    const fallback = buildFallbackSlots(payload);
    if (fallback.length === 5) return fallback;
    return [];
  }

  function resolveSignals(payload){
    if (payload && payload.meta){
      return payload.meta.userSignals || payload.meta.signals || null;
    }
    return null;
  }

  function pickBucket(phum, focus){
    if (focus && FOCUS_MAP[focus]) return FOCUS_MAP[focus];
    if (phum && PHUM_FALLBACK[phum]) return PHUM_FALLBACK[phum];
    return 'work';
  }

  function buildSlotHint(level, phum, focus, isWarning){
    const bucket = pickBucket(phum, focus);
    const hints = SLOT_HINTS[bucket] || SLOT_HINTS.work;
    let text = hints[level] || hints.NEUTRAL;
    if (level === 'BAD' && isWarning){
      if (bucket === 'money') text = '避免：冒進花費決策';
      else if (bucket === 'social') text = '避免：硬碰硬衝突';
      else if (bucket === 'work') text = '避免：倉促承諾';
      else if (bucket === 'love') text = '避免：翻舊帳爭執';
      else if (bucket === 'health') text = '避免：過度勉強';
      else if (bucket === 'study') text = '避免：分心多線';
    }
    return text;
  }

  function renderYamUbakong(opts){
    const containerEl = opts && opts.containerEl;
    const payload = opts && opts.payload;
    if (!containerEl) return false;
    const slots = resolveSlots(payload);
    if (!slots.length){
      containerEl.style.display = 'none';
      containerEl.innerHTML = '';
      return false;
    }
    const now = new Date();
    const nowHHMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const nowSlot = getNowSlot(slots, nowHHMM);
    const signals = resolveSignals(payload);
    const focus = signals && signals.focus && signals.focus[0] ? signals.focus[0] : '';
    const phum = payload && payload.fortune && payload.fortune.core ? payload.fortune.core.phum : '';
    const isWarning = payload && payload.fortune && payload.fortune.core ? !!payload.fortune.core.isWarning : false;
    const timeline = slots.map(s=>{
      const level = String(s.level || '').toUpperCase();
      const cls = LEVEL_CLASS[level] || LEVEL_CLASS.NEUTRAL;
      const nowCls = (nowSlot && nowSlot.start === s.start && nowSlot.end === s.end) ? ' yam-now' : '';
      return `<div class="yam-segment ${cls}${nowCls}" aria-hidden="true"></div>`;
    }).join('');
    const list = slots.map(s=>{
      const level = String(s.level || '').toUpperCase();
      const cls = LEVEL_CLASS[level] || LEVEL_CLASS.NEUTRAL;
      const status = LEVEL_TEXT[level] || LEVEL_TEXT.NEUTRAL;
      const isNow = nowSlot && nowSlot.start === s.start && nowSlot.end === s.end;
      const hint = buildSlotHint(level, phum, focus, isWarning);
      const hintText = isNow ? `現在：${hint}` : hint;
      return `
        <div class="yam-row">
          <div class="yam-time">${s.start}–${s.end}</div>
          <div class="yam-status ${cls}">${status}</div>
          <div class="yam-label">${s.label || ''}</div>
          <div class="yam-hint">${hintText}</div>
        </div>
      `;
    }).join('');
    const nowText = nowSlot ? `現在是：${LEVEL_TEXT[String(nowSlot.level || '').toUpperCase()] || '平'}` : '';
    containerEl.innerHTML = `
      <div class="yam-header">
        <div class="yam-title">⏰ 今日吉凶時段（Yam Ubakong）</div>
        <div class="yam-sub">依泰國「烏巴公時光」推算：選對時間做對事。</div>
      </div>
      <div class="yam-timeline">${timeline}</div>
      ${nowText ? `<div class="yam-now-text">${nowText}</div>` : ''}
      <div class="yam-list">${list}</div>
    `;
    containerEl.style.display = '';
    return true;
  }

  window.YamUbakongUI = {
    renderYamUbakong,
    getNowSlot
  };
})();
