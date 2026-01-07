function needCandleExtras(){
  // Simplified flow: no extra required fields; use 備註 + 額外照片
  return false;
}
function ensureCandleFields(required){
  // Keep legacy extra block hidden, but allow ritual photo block to be controlled by toggleCandleUI()
  var legacy = document.getElementById('candleExtra');
  if (legacy) legacy.style.display = 'none';
  // Do not touch bfRitualPhoto requirements (not required by default)
  var nameEn = document.getElementById('bfNameEn');
  var bday  = document.getElementById('bfBirthday');
  var photo = document.getElementById('bfPhoto');
  if (nameEn) nameEn.required = false;
  if (bday)  bday.required = false;
  if (photo) photo.required = false;
}
