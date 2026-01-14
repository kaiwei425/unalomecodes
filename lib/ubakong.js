const WEEKDAY_KEYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const YAM_SLOTS = [
  { key:'MORNING', start:'06:01', end:'08:24' },
  { key:'LATE_MORNING', start:'08:25', end:'10:48' },
  { key:'MIDDAY', start:'10:49', end:'13:12' },
  { key:'AFTERNOON', start:'13:13', end:'15:36' },
  { key:'LATE_AFTERNOON', start:'15:37', end:'18:00' }
];

const YAM_TABLE = {
  SUN:{ MORNING:'BEST', LATE_MORNING:'GOOD', MIDDAY:'CAUTION', AFTERNOON:'FORBIDDEN', LATE_AFTERNOON:'GOOD' },
  MON:{ MORNING:'GOOD', LATE_MORNING:'BEST', MIDDAY:'CAUTION', AFTERNOON:'GOOD', LATE_AFTERNOON:'FORBIDDEN' },
  TUE:{ MORNING:'CAUTION', LATE_MORNING:'GOOD', MIDDAY:'BEST', AFTERNOON:'FORBIDDEN', LATE_AFTERNOON:'GOOD' },
  WED:{ MORNING:'GOOD', LATE_MORNING:'CAUTION', MIDDAY:'GOOD', AFTERNOON:'BEST', LATE_AFTERNOON:'FORBIDDEN' },
  THU:{ MORNING:'BEST', LATE_MORNING:'GOOD', MIDDAY:'FORBIDDEN', AFTERNOON:'GOOD', LATE_AFTERNOON:'CAUTION' },
  FRI:{ MORNING:'GOOD', LATE_MORNING:'BEST', MIDDAY:'CAUTION', AFTERNOON:'GOOD', LATE_AFTERNOON:'FORBIDDEN' },
  SAT:{ MORNING:'CAUTION', LATE_MORNING:'GOOD', MIDDAY:'BEST', AFTERNOON:'FORBIDDEN', LATE_AFTERNOON:'GOOD' }
};

const LEVEL_MAP = {
  BEST: 'BEST',
  GOOD: 'GOOD',
  NEUTRAL: 'NEUTRAL',
  BAD: 'BAD',
  CAUTION: 'NEUTRAL',
  FORBIDDEN: 'BAD'
};

const LEVEL_LABEL = {
  BEST: '適合主動推進與重要決策',
  GOOD: '適合會議、拜訪、出行',
  NEUTRAL: '可例行處理、維持節奏',
  BAD: '避免開新局、避免簽約與衝突'
};

function normalizeLevel(level){
  const key = String(level || '').toUpperCase();
  return LEVEL_MAP[key] || 'NEUTRAL';
}

function getYamUbakong(todayWeekdayKey){
  const key = String(todayWeekdayKey || '').toUpperCase();
  if (!WEEKDAY_KEYS.includes(key)){
    return { best:[], forbidden:[], slots:[] };
  }
  const table = YAM_TABLE[key] || {};
  const slots = YAM_SLOTS.map(slot=>{
    const raw = table[slot.key] || 'NEUTRAL';
    const level = normalizeLevel(raw);
    return {
      start: slot.start,
      end: slot.end,
      level,
      label: LEVEL_LABEL[level]
    };
  });
  const best = slots.filter(s=> s.level === 'BEST');
  const forbidden = slots.filter(s=> s.level === 'BAD');
  return { best, forbidden, slots };
}

export {
  WEEKDAY_KEYS,
  YAM_SLOTS,
  YAM_TABLE,
  getYamUbakong
};
