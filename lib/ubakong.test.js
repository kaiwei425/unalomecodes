import {
  WEEKDAY_KEYS,
  YAM_SLOTS,
  getYamUbakong
} from './ubakong.js';

function assert(condition, message){
  if (!condition){
    throw new Error(message || 'Assertion failed');
  }
}

export function runUbakongTests(){
  const validLevels = ['BEST','GOOD','NEUTRAL','BAD'];

  WEEKDAY_KEYS.forEach(key=>{
    const yam = getYamUbakong(key);
    assert(Array.isArray(yam.slots) && yam.slots.length === 5, `slots length should be 5 for ${key}`);
    yam.slots.forEach((slot, idx)=>{
      const def = YAM_SLOTS[idx];
      assert(slot.start === def.start, `start mismatch for ${key} ${def.key}`);
      assert(slot.end === def.end, `end mismatch for ${key} ${def.key}`);
      assert(validLevels.includes(slot.level), `invalid level for ${key} ${def.key}`);
    });
    assert(yam.best.every(s=> s.level === 'BEST'), `best must be BEST for ${key}`);
    assert(yam.forbidden.every(s=> s.level === 'BAD'), `forbidden must be BAD for ${key}`);
  });

  const invalid = getYamUbakong('XXX');
  assert(Array.isArray(invalid.slots) && invalid.slots.length === 0, 'invalid key should return empty slots');
  assert(Array.isArray(invalid.best) && invalid.best.length === 0, 'invalid key should return empty best');
  assert(Array.isArray(invalid.forbidden) && invalid.forbidden.length === 0, 'invalid key should return empty forbidden');

  return true;
}
