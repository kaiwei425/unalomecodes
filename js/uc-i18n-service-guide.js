(function(){
  if (!window.UC_I18N) return;
  if (location.pathname.indexOf('/admin') === 0) return;

  window.UC_I18N.setDict({
    zh: {
      'common.lang': 'ZH/EN',
      'common.save': '儲存',
      'common.cancel': '取消',
      'sg.brand': '泰國寺廟map ©️ unalomecodes',
      'sg.title': '服務介紹',
      'sg.back_service': '← 返回服務專區',
      'sg.edit': '編輯內容',
      'sg.hero_title': '蠟燭祈福與義德善堂捐棺服務介紹',
      'sg.hero_desc': '服務型商品包含蠟燭祈福、法會祈福與義德善堂捐棺等項目，請依需求挑選最合適的服務。',
      'sg.card1_title': '蠟燭祈福',
      'sg.card1_desc': '適合希望加強心願或守護能量的朋友，通常會搭配個人資料與祈福需求。',
      'sg.card2_title': '法會祈福',
      'sg.card2_desc': '以寺廟法會流程進行祈福，適合需要集體儀式與完整祝禱的需求。',
      'sg.card3_title': '代捐棺服務',
      'sg.card3_desc': '代為完成捐棺功德需求，可搭配固定車馬費設定，方便集中處理。',
      'sg.step1_title': '下單流程',
      'sg.step1_desc': '選擇服務 → 填寫資料 → 完成付款 → 等待後續通知與安排。',
      'sg.step2_title': '資料準備',
      'sg.step2_desc': '若該服務需要照片或特定資料，會在商品頁面標示提醒，請依指示上傳。',
      'sg.step3_title': '進度查詢',
      'sg.step3_desc': '可在「我的訂單」查看服務進度或留言詢問。',
      'sg.note': '法會祈福與服務型商品一旦成立訂單即安排流程，恕不提供退款。',
      'sg.action_service': '查看服務商品',
      'sg.action_faq': '常見問題',

      'sg.alert_empty': '內容不能為空',
      'sg.alert_save_failed': '儲存失敗：{msg}'
    },
    en: {
      'common.lang': 'ZH/EN',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'sg.brand': 'Thailand Temple map © unalomecodes',
      'sg.title': 'Service Guide',
      'sg.back_service': '← Back to services',
      'sg.edit': 'Edit',
      'sg.hero_title': 'Service Guide: Candle Blessing & Yi De Charity Coffin Donation',
      'sg.hero_desc': 'Service products include candle blessings, temple ceremonies, and Yi De charity coffin donations. Choose the service that best fits your needs.',
      'sg.card1_title': 'Candle Blessing',
      'sg.card1_desc': 'For those who want to strengthen wishes or protective energy. Usually includes personal info and blessing requests.',
      'sg.card2_title': 'Temple Ceremony Blessing',
      'sg.card2_desc': 'Blessings performed through a temple ceremony process, suitable for those who need a complete ritual and prayers.',
      'sg.card3_title': 'Coffin Donation Service',
      'sg.card3_desc': 'A service to fulfill donation merits. Can be configured with a fixed fee for easier handling.',
      'sg.step1_title': 'Order flow',
      'sg.step1_desc': 'Choose a service → Fill in details → Complete payment → Wait for updates and arrangements.',
      'sg.step2_title': 'Prepare info',
      'sg.step2_desc': 'If photos or specific details are required, the product page will indicate it. Please upload as instructed.',
      'sg.step3_title': 'Check progress',
      'sg.step3_desc': 'You can view service progress or leave messages in “My orders”.',
      'sg.note': 'Service products are scheduled once the order is placed and are non-refundable.',
      'sg.action_service': 'View services',
      'sg.action_faq': 'FAQ',

      'sg.alert_empty': 'Content cannot be empty.',
      'sg.alert_save_failed': 'Save failed: {msg}'
    }
  });

  function init(){
    try{ window.UC_I18N.apply(document); }catch(_){}
    try{
      var btn = document.getElementById('btnLang');
      if (btn) window.UC_I18N.bindToggle(btn);
    }catch(_){}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

