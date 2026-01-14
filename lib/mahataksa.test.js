import {
  toWeekdayKey,
  deriveTabooColor,
  getMahaTaksa
} from './mahataksa.js';

function assert(condition, message){
  if (!condition){
    throw new Error(message || 'Assertion failed');
  }
}

export function runMahaTaksaTests(){
  // toWeekdayKey: 0..6 and 1..7 mapping
  assert(toWeekdayKey(0) === 'SUN', 'toWeekdayKey(0) should be SUN');
  assert(toWeekdayKey(6) === 'SAT', 'toWeekdayKey(6) should be SAT');
  assert(toWeekdayKey(1) === 'SUN', 'toWeekdayKey(1) should be SUN');
  assert(toWeekdayKey(7) === 'SAT', 'toWeekdayKey(7) should be SAT');

  // deriveTabooColor should return non-empty for valid birth day
  assert(deriveTabooColor('TUE') !== '', 'deriveTabooColor(TUE) should not be empty');

  // getMahaTaksa should match handler logic: TUE + FRI => UTSAHA
  const taksa = getMahaTaksa('TUE', 'FRI');
  assert(taksa.phum === 'UTSAHA', 'getMahaTaksa TUE/FRI should be UTSAHA');

  return true;
}
