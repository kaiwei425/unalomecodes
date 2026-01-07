// 統一處理 7-11 門市回填：同時寫入「選擇門市」步驟與匯款表單
// 並支援新後端傳入的欄位名稱（storename/storeid/storeaddress/storetel）
// 以及舊版 7-11 物件欄位（stName/storeName、stCode/code、stAddr/storeAddr...）
function fillStoreIntoForm(p){
  if (!p) return false;

  // 1) 正規化欄位名稱
  var name = '';
  var id   = '';
  var addr = '';
  var tel  = '';

  try{
    name = (p.storename || p.storeName || p.stName || '').toString().trim();
  }catch(e){ name = ''; }
  try{
    id   = (p.storeid   || p.storeId   || p.stCode || p.code || '').toString().trim();
  }catch(e){ id = ''; }
  try{
    addr = (p.storeaddress || p.storeAddr || p.stAddr || '').toString().trim();
  }catch(e){ addr = ''; }
  try{
    tel  = (p.storetel || p.storeTel || p.stTel || '').toString().trim();
  }catch(e){ tel = ''; }

  // 2) 顯示用文字：優先「門市名稱 + (門市代號)」，沒有代號再退而求其次
  var text = '';
  if (name && id){
    text = name + ' (' + id + ')';
  } else if (name){
    text = name;
  } else if (addr){
    text = addr;
  } else if (id){
    text = id;
  }

  if (!text) return false;

  // 3) Step 2 預覽欄位（選擇門市對話框）
  var preview = document.getElementById('dlgStoreInput') || document.getElementById('bfStorePreview');
  if (preview){
    preview.value = text;
  }

  // 4) Step 3 匯款表單欄位（收件 7-11 門市）＋ data-* 屬性（給後端用）
  var bank = document.getElementById('bfStore');
  if (bank){
    bank.value = text;
    // 將原始資訊塞進 data-*，方便匯款送單時附帶給後端
    bank.setAttribute('data-storeid',      id   || '');
    bank.setAttribute('data-storename',    name || '');
    bank.setAttribute('data-storeaddress', addr || '');
    bank.setAttribute('data-storetel',     tel  || '');
  }

  // 5) 信用卡付款的門市欄位（若有）
  var cc = document.getElementById('ccStore');
  if (cc){
    cc.value = text;
    cc.setAttribute('data-storeid',      id   || '');
    cc.setAttribute('data-storename',    name || '');
    cc.setAttribute('data-storeaddress', addr || '');
    cc.setAttribute('data-storetel',     tel  || '');
  }

  return true;
}
