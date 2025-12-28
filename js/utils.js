function showToast(msg){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg || '✅ 已加入購物車';
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> el.classList.remove('show'), 2000);
}

function formatPrice(n){ return (Math.round(n)).toLocaleString('zh-TW'); }

function sanitizeImageUrl(raw){
  try{
    const val = String(raw || '').trim();
    if (!val) return '';
    if (/^data:image\//i.test(val)) return val;
    const u = new URL(val, window.location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  }catch(_){}
  return '';
}

const NAME_TO_CODE = {
  '招財女神':'ZF','魂魄勇':'HP','象神':'GA','四面神':'FM','坤平':'KP','澤度金':'ZD','迦樓羅':'JL',
  '徐祝老人':'XZ','五眼四耳':'WE','哈魯曼':'HM','猴神哈魯曼':'HM','拉胡':'RH','拉胡天神':'RH','崇迪':'CD','崇迪佛':'CD'
};

function toDeityCode(input){
  try{
    var s = (input||'').toString().trim();
    if (!s) return '';
    if (/^[A-Z]{2}$/.test(s)) return s.toUpperCase();
    // direct map
    if (typeof NAME_TO_CODE === 'object' && NAME_TO_CODE){
      if (NAME_TO_CODE[s]) return String(NAME_TO_CODE[s]).toUpperCase();
      var k = s.replace(/\s+/g,'');
      if (NAME_TO_CODE[k]) return String(NAME_TO_CODE[k]).toUpperCase();
      for (var key in NAME_TO_CODE){
        if (!Object.prototype.hasOwnProperty.call(NAME_TO_CODE, key)) continue;
        if (s.indexOf(key) !== -1) return String(NAME_TO_CODE[key]).toUpperCase();
      }
    }
    var u = s.toUpperCase();
    if (/四面神|BRAHMA|PHRA\s*PHROM|PHROM|ERAWAN/.test(s)) return 'FM';
    if (/象神|GANESHA|PHIKANET|PHIKANES|PIKANES/.test(s))   return 'GA';
    if (/崇迪|SOMDEJ|SOMDET/.test(s))                      return 'CD';
    if (/坤平|KHUN\s*PHAEN|KHUN\s*PAEN|K\.?P\.?/.test(s))  return 'KP';
    if (/哈魯曼|H(AN|AR)UMAN/.test(s))                     return 'HM';
    if (/拉胡|RAHU/.test(s))                                return 'RH';
    if (/迦樓羅|GARUDA|K(AR|AL)UDA/.test(s))               return 'JL';
    if (/澤度金|JATUKAM|R(AM|A)MATHEP|ZEDO(G|K)ON|ZEDUKIN/.test(s)) return 'ZD';
    if (/招財女神|LAKSHMI|LAXSHMI|LAMSI/.test(s))          return 'ZF';
    if (/五眼四耳|FIVE[\-\s]*EYES|5EYES|FIVEEYES/.test(s)) return 'WE';
    if (/徐祝|XU\s*ZHU|XUZHU/.test(s))                     return 'XZ';
    if (/魂魄勇|HUN\s*PO\s*YONG|HPY/.test(s))              return 'HP';
    return '';
  }catch(e){ return ''; }
}

function __kvOnlyCode(pid){ try{ return String(pid||'').trim().toUpperCase(); }catch(e){ return ''; } }

function copyToClipboard(text){
  try{ navigator.clipboard.writeText(text); }catch(e){
    const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
}

function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
