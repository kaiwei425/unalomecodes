const PHUM_ORDER = ['BORIWAN','AYU','DECH','SRI','MULA','UTSAHA','MONTRI','KALAKINI'];
const WEEKDAY_KEYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const DAY_COLOR = {
  SUN:'Red',
  MON:'Yellow',
  TUE:'Pink',
  WED:'Green/Grey',
  THU:'Orange',
  FRI:'Blue',
  SAT:'Purple'
};
const TAKSA_MAP = {
  SUN:[1,2,3,4,7,5,8,6],
  MON:[2,3,4,7,5,8,6,1],
  TUE:[3,4,7,5,8,6,1,2],
  WED:[4,7,5,8,6,1,2,3],
  THU:[5,8,6,1,2,3,4,7],
  FRI:[6,1,2,3,4,7,5,8],
  SAT:[7,5,8,6,1,2,3,4],
  WED_NIGHT:[8,6,1,2,3,4,7,5]
};

function toWeekdayKey(dowIndex){
  if (Number.isInteger(dowIndex)){
    if (dowIndex >= 0 && dowIndex <= 6) return WEEKDAY_KEYS[dowIndex] || '';
    if (dowIndex >= 1 && dowIndex <= 7) return WEEKDAY_KEYS[(dowIndex - 1) % 7] || '';
  }
  return '';
}

function getDayPlanetNo(todayWeekdayKey){
  const key = String(todayWeekdayKey || '').toUpperCase();
  if (key === 'SUN') return 1;
  if (key === 'MON') return 2;
  if (key === 'TUE') return 3;
  if (key === 'WED') return 4;
  if (key === 'THU') return 5;
  if (key === 'FRI') return 6;
  if (key === 'SAT') return 7;
  if (key === 'WED_NIGHT') return 8;
  return 0;
}

function getMahaTaksa(birthDayKey, todayWeekdayKey){
  const birthKey = String(birthDayKey || '').toUpperCase();
  const todayKey = String(todayWeekdayKey || '').toUpperCase();
  const dayPlanetNo = getDayPlanetNo(todayKey);
  const row = TAKSA_MAP[birthKey];
  const idx = row ? row.indexOf(dayPlanetNo) : -1;
  const phum = idx >= 0 ? PHUM_ORDER[idx] : '';
  return {
    birthDayKey: birthKey,
    todayWeekdayKey: todayKey,
    dayPlanetNo,
    phum,
    isWarning: phum === 'KALAKINI'
  };
}

function deriveTabooColor(birthDayKey){
  const key = String(birthDayKey || '').toUpperCase();
  const row = TAKSA_MAP[key];
  if (!row) return '';
  const kalIndex = PHUM_ORDER.indexOf('KALAKINI');
  const kalStar = row[kalIndex];
  if (kalStar === 8) return 'Green/Grey';
  if (kalStar >= 1 && kalStar <= 7){
    const weekdayKey = WEEKDAY_KEYS[kalStar - 1];
    return DAY_COLOR[weekdayKey] || '';
  }
  return '';
}

function getThaiDayColor(todayWeekdayKey){
  const key = String(todayWeekdayKey || '').toUpperCase();
  return DAY_COLOR[key] || '';
}

export {
  PHUM_ORDER,
  WEEKDAY_KEYS,
  DAY_COLOR,
  TAKSA_MAP,
  toWeekdayKey,
  getDayPlanetNo,
  getMahaTaksa,
  deriveTabooColor,
  getThaiDayColor
};
