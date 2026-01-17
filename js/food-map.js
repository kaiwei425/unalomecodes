document.addEventListener('DOMContentLoaded', function() {
  const dropdowns = Array.from(document.querySelectorAll('.dropdown'));
  if (dropdowns.length) {
    dropdowns.forEach((dropdown) => {
      const dropdownButton = dropdown.querySelector('button');
      if (!dropdownButton) return;
      dropdownButton.addEventListener('click', function(event) {
        dropdowns.forEach(other => { if (other !== dropdown) other.classList.remove('active'); });
        dropdown.classList.toggle('active');
        event.stopPropagation();
      });
    });

    document.addEventListener('click', function() {
      dropdowns.forEach(d => d.classList.remove('active'));
    });
  }
  
  const btnBackToTop = document.getElementById('btnBackToTop');
  if (btnBackToTop) {
    window.addEventListener('scroll', () => {
      btnBackToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
    btnBackToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  if (btnLang){
    btnLang.addEventListener('click', () => {
      const nextLang = currentLang === 'en' ? 'zh' : 'en';
      setLanguage(nextLang);
    });
  }

  const authGroup = document.getElementById('authGroup');
  const mobileAuthSlot = document.getElementById('mobileAuthSlot');
  const authGroupSlot = document.getElementById('authGroupSlot');
  if (authGroup && mobileAuthSlot && authGroupSlot) {
    const mq = window.matchMedia('(max-width:720px)');
    const placeAuthGroup = () => {
      if (mq.matches) {
        if (authGroup.parentElement !== mobileAuthSlot) {
          mobileAuthSlot.appendChild(authGroup);
        }
      } else if (authGroup.parentElement !== authGroupSlot) {
        authGroupSlot.appendChild(authGroup);
      }
    };
    placeAuthGroup();
    if (mq.addEventListener) mq.addEventListener('change', placeAuthGroup);
    else mq.addListener(placeAuthGroup);
  }

  // 會員中心下拉 (同步 shop)
  (function(){
    const toggle = document.getElementById('memberMenuBtn');
    const panel = document.getElementById('memberMenuPanel');
    const arrow = document.getElementById('memberMenuArrow');
    const memberMenu = document.getElementById('memberMenuContainer');
    const profileLink = panel ? panel.querySelector('a[data-profile]') : null;
    const dlg = document.getElementById('profileDialog');
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const saveBtn = document.getElementById('profileSave');
    const closeBtn = document.getElementById('profileClose');
    const statusEl = document.getElementById('profileStatus');

    async function openProfile(){
      if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
        if (window.authState && typeof window.authState.promptLogin === 'function'){
          window.authState.promptLogin(t('loginEditProfile'));
        }
        return;
      }
      try{
        const res = await fetch('/api/me/profile',{credentials:'include',cache:'no-store'});
        const data = await res.json().catch(()=>({}));
        const profile = data.profile || data || {};
        if (nameInput) nameInput.value = profile.name || profile.defaultContact?.name || '';
        if (emailInput) emailInput.value = profile.email || profile.defaultContact?.email || '';
        if (phoneInput) phoneInput.value = profile.defaultContact?.phone || profile.phone || '';
        if (statusEl) statusEl.textContent = '';
        if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
        else if (dlg) dlg.setAttribute('open','');
      }catch(e){
        if (statusEl) statusEl.textContent = t('profileLoadFail');
      }
    }

    async function saveProfile(){
      if (!window.authState || !window.authState.isLoggedIn || !window.authState.isLoggedIn()){
        if (window.authState && typeof window.authState.promptLogin === 'function'){
          window.authState.promptLogin(t('loginSaveProfile'));
        }
        return;
      }
      if (statusEl) statusEl.style.color = '#ef4444';
      try{
        const body = {
          profile:{
            name: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : ''
          },
          defaultContact:{
            name: nameInput ? nameInput.value.trim() : '',
            email: emailInput ? emailInput.value.trim() : '',
            phone: phoneInput ? phoneInput.value.trim() : ''
          }
        };
        const res = await fetch('/api/me/profile',{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok){
          throw new Error(data.error || ('HTTP '+res.status));
        }
        if (statusEl){
          statusEl.style.color = '#16a34a';
          statusEl.textContent = t('profileSaveSuccess');
        }
        if (window.authState && typeof window.authState.refreshProfile === 'function'){
          window.authState.refreshProfile();
        }
        setTimeout(()=>{ if (closeBtn) closeBtn.click(); }, 800);
      }catch(err){
        if (statusEl) statusEl.textContent = err.message || t('profileSaveFail');
      }
    }

    if (toggle && panel){
      const setArrow = (isOpen)=>{
        if (arrow){
          arrow.textContent = isOpen ? '▴' : '▾';
        }
      };
      const close = ()=>{
        panel.style.display = 'none';
        setArrow(false);
      };
      const open = ()=>{
        panel.style.display = 'block';
        setArrow(true);
      };
      toggle.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        const isOpen = panel.style.display === 'block';
        if (isOpen) close(); else open();
      });
      if (profileLink){
        profileLink.addEventListener('click', ev=>{
          ev.preventDefault();
          close();
          openProfile();
        });
      }
      document.addEventListener('click', (ev)=>{
        if (!panel.contains(ev.target) && ev.target !== toggle){
          close();
        }
      });
    }

    const adminToolsToggle = document.getElementById('adminToolsToggle');
    const adminToolsPanel = document.getElementById('adminToolsPanel');
    if (adminToolsToggle && adminToolsPanel){
      const setAdminArrow = (isOpen)=>{
        adminToolsToggle.textContent = `${t('adminTools')} ${isOpen ? '▴' : '▾'}`;
      };
      const closeAdmin = ()=>{
        adminToolsPanel.style.display = 'none';
        setAdminArrow(false);
      };
      const openAdmin = ()=>{
        adminToolsPanel.style.display = 'grid';
        setAdminArrow(true);
      };
      setAdminArrow(false);
      adminToolsToggle.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        const isOpen = adminToolsPanel.style.display === 'grid';
        if (isOpen) closeAdmin(); else openAdmin();
      });
    }
    const creatorToolsToggle = document.getElementById('creatorToolsToggle');
    const creatorToolsPanel = document.getElementById('creatorToolsPanel');
    if (creatorToolsToggle && creatorToolsPanel){
      const setCreatorArrow = (isOpen)=>{
        creatorToolsToggle.textContent = `${t('creatorZone')} ${isOpen ? '▴' : '▾'}`;
      };
      const closeCreator = ()=>{
        creatorToolsPanel.style.display = 'none';
        setCreatorArrow(false);
      };
      const openCreator = ()=>{
        creatorToolsPanel.style.display = 'grid';
        setCreatorArrow(true);
      };
      setCreatorArrow(false);
      creatorToolsToggle.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        const isOpen = creatorToolsPanel.style.display === 'grid';
        if (isOpen) closeCreator(); else openCreator();
      });
    }

    if (closeBtn){
      closeBtn.addEventListener('click', ()=>{
        if (dlg && typeof dlg.close === 'function') dlg.close();
        else if (dlg) dlg.removeAttribute('open');
      });
    }
    if (saveBtn){
      saveBtn.addEventListener('click', saveProfile);
    }

    if (memberMenu){
      memberMenu.classList.remove('is-visible');
    }
    if (window.authState && typeof window.authState.subscribe === 'function'){
      window.authState.subscribe(user=>{
        if (!memberMenu) return;
        if (user){
          memberMenu.classList.add('is-visible');
          checkCreator();
        }else{
          memberMenu.classList.remove('is-visible');
          if (panel) panel.style.display = 'none';
          if (arrow) arrow.textContent = '▾';
          if (adminToolsPanel) adminToolsPanel.style.display = 'none';
          if (adminToolsToggle) adminToolsToggle.textContent = `${t('adminTools')} ▾`;
          if (creatorToolsPanel) creatorToolsPanel.style.display = 'none';
          if (creatorToolsToggle) creatorToolsToggle.textContent = `${t('creatorZone')} ▾`;
          isCreator = false;
          creatorId = '';
          creatorName = '';
          renderZoneTabs();
        }
      });
    }
  })();
});

// --- 補上缺少的變數宣告，避免 ReferenceError ---
const FOOD_CACHE_KEY = 'food_map_data_v1';
const FOOD_CACHE_TTL = 24 * 60 * 60 * 1000;
const GOOGLE_MAPS_LANG = 'zh-TW';
const DAY_TRIP_CATEGORY = '一日遊';

let googleMapsKey = '';
let googleReady = false;
let googleMap = null;
let googleMarker = null;
let googleGeocoder = null;
let googleAutocomplete = null;
let googleLoadingPromise = null;
let isMapMode = false;
let mainMap = null;
let mainMarkers = [];
let mainInfoWindow = null;
const tripResultModal = document.getElementById('tripResultModal');
let currentLang = 'zh';
const TAG_OPTIONS = [
  { value:'aircon', zh:'有冷氣', en:'Air-con' },
  { value:'photo', zh:'拍照點', en:'Photo spot' },
  { value:'family', zh:'親子友善', en:'Family' },
  { value:'must_try', zh:'必吃', en:'Must try' },
  { value:'spicy_ok', zh:'可吃辣', en:'Spicy OK' },
  { value:'late_night', zh:'深夜', en:'Late night' },
  { value:'breakfast', zh:'早餐', en:'Breakfast' },
  { value:'dessert', zh:'甜點', en:'Dessert' },
  { value:'night_market', zh:'夜市', en:'Night market' },
  { value:'michelin', zh:'米其林', en:'Michelin' },
  { value:'vegetarian_ok', zh:'素食友善', en:'Vegetarian' }
];
const TAG_OPTION_VALUES = new Set(TAG_OPTIONS.map(t=>t.value));
const TRANSLATIONS = {
  zh: {
    title: '泰國美食地圖',
    subtitle: '精選ＩＧ美食REELS 一鍵找出來離你最近的餐廳',
    home: '返回首頁',
    fav: '收藏清單',
    memberLabel: '會員中心',
    profileInfo: '基本資料',
    myCoupons: '我的優惠券',
    myOrders: '我的訂單',
    storeDefault: '門市預設',
    adminQna: '訂單問答',
    adminPanel: '後台管理',
    authLoading: '登入狀態載入中…',
    langSwitch: '切換語言',
    langZh: '中文',
    langEn: '英文',
    adminTools: '美食地圖',
    member: '會員中心 ▾',
    login: '登入會員',
    logout: '登出',
    more: '更多',
    add: '新增餐廳',
    export: '匯出備份',
    import: '匯入救援檔',
    stats: '流量統計',
    searchPlaceholder: '搜尋店名 / 關鍵字',
    allCats: '全部分類',
    allAreas: '全部地區',
    allPrices: '全部價位',
    status: '營業狀態',
    openNow: '現在營業中',
    sort: '排序',
    distAsc: '距離 近→遠',
    ratingDesc: '評分 高→低',
    nameAsc: '店名 A→Z',
    priceAsc: '價位 低→高',
    priceDesc: '價位 高→低',
    nearbyTitle: '📍 附近推薦',
    useLoc: '使用我的位置',
    collapse: '收合',
    expand: '展開',
    nearbyPlaceholder: '輸入飯店 / 地址',
    searchNearby: '搜尋附近',
    mapMode: '地圖模式',
    listMode: '列表模式',
    mapSwitchTemple: '寺廟地圖',
    zoneAll: '全部',
    creatorZone: '創作者專區',
    myZone: '我的投稿',
    totalCount: '共 {n} 間',
    loadMore: '載入更多',
    details: '查看店家資訊',
    nav: '地圖導航',
    openGmaps: '開啟 Google Maps',
    viewIg: '在 IG 上查看',
    desc: '店家介紹',
    creatorPick: '精選',
    creatorProfile: '創作者資料',
    creatorProfileTitle: '創作者資料',
    creatorProfileName: '創作者名稱',
    creatorProfileAvatar: '創作者頭像',
    creatorProfileCover: '創作者封面',
    creatorProfileIg: '創作者 IG',
    creatorProfileYoutube: 'YouTube 頻道',
    creatorProfileFacebook: 'Facebook',
    creatorProfileTiktok: 'TikTok',
    creatorProfileIntro: '創作者簡介',
    creatorProfileSave: '儲存',
    creatorProfileSaved: '已更新創作者資料',
    creatorProfileFail: '更新失敗',
    creatorProfileNameEmpty: '請輸入創作者名稱',
    creatorProfilePreview: '預覽小卡',
    creatorProfileAvatarHint: '尚未上傳',
    creatorAvatarSpec: '建議尺寸 400 x 400',
    creatorCoverSpec: '建議尺寸 1200 x 400',
    creatorCoverDragHint: '可拖曳小卡封面調整位置',
    creatorProfileIgPlaceholder: 'https://instagram.com/xxx',
    creatorProfileYoutubePlaceholder: 'https://www.youtube.com/@xxx',
    creatorProfileFacebookPlaceholder: 'https://www.facebook.com/xxx',
    creatorProfileTiktokPlaceholder: 'https://www.tiktok.com/@xxx',
    creatorProfileIntroPlaceholder: '請輸入創作者簡介',
    creatorShare: '分享連結',
    creatorTerms: '創作者條款',
    creatorTermsHint: '請先同意',
    creatorTermsNeed: '請先同意創作者條款才能新增或編輯餐廳。',
    creatorTermsTitle: '創作者新增餐廳使用條款',
    creatorTermsAgree: '我同意',
    creatorTermsFail: '同意條款失敗：',
    creatorTermsAcceptedToast: '已同意創作者條款',
    creatorTermsAcceptedAt: '你已於 {time} 同意本條款',
    creatorTermsHtml: `<div class="terms-section">
      <div class="terms-title">一、目的與適用範圍</div>
      <p>本功能旨在邀請創作者協助補充美食地圖資訊，讓資料庫更完整。以下條款適用於你新增或編輯的所有內容。</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">二、內容真實性</div>
      <p>你應確保填寫內容為真實、可驗證且不具誤導性。如有錯誤或爭議內容，本網站得進行修正或下架。</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">三、權利與使用範圍（讓你安心的使用方式）</div>
      <p>你保證對上傳內容擁有必要權利（包含文字、圖片、連結等）。你同意本網站得在提供與維護美食地圖服務所必要的範圍內使用你的內容（例如：站內展示、分類、搜尋、站內推薦、備份、與改善使用者體驗）。</p>
      <p>本網站不會將你的內容用於獨立商業廣告或對外授權；若未來有其他用途，會事先取得你的同意。</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">四、禁止內容</div>
      <ul>
        <li>虛假、誤導、詐騙或重複垃圾內容</li>
        <li>侵犯第三方權利之內容</li>
        <li>違法、仇恨、歧視、暴力或成人內容</li>
        <li>未經同意的個人隱私資訊</li>
      </ul>
    </div>
    <div class="terms-section">
      <div class="terms-title">五、平台管理權</div>
      <p>本網站保留審查、調整、隱藏或下架內容之權利，包含但不限於違反條款、品質不佳、或收到申訴之情況。</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">六、第三方連結與責任限制</div>
      <p>你提供之 Google Map、YouTube、IG 等第三方連結，其可用性由第三方負責；本網站不對其變動或失效負責。</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">七、條款更新</div>
      <p>本網站可視需要調整條款，更新後於網站公告。你持續使用即視為同意更新內容。</p>
    </div>`,
    allCreators: '全部創作者',
    creatorInvite: '輸入邀請碼',
    creatorInvitePrompt: '請輸入邀請碼',
    creatorInviteSuccess: '已開通創作者權限',
    creatorInviteFail: '邀請碼無效或已使用',
    creatorInviteCreate: '產生邀請碼',
    creatorInviteLabel: '創作者名稱（可留空）',
    creatorInviteReady: '邀請碼已產生',
    creatorMode: '創作者模式：儲存後會直接寫入資料庫。',
    addr: '地址',
    reviews: 'Google 評分 & 評論',
    tripTitle: '半日吃喝路線',
    planTrip: '規劃收藏路線',
    addFav: '加入收藏',
    dayTripToggle: '一日遊類別',
    dayTripToggleHint: '同一部影片可新增多個地點',
    dayTripStopsLabel: '一日遊點位（可拖曳排序）',
    dayTripAddRow: '新增一列',
    dayTripBulkHint: '批次貼上：一行一個點，可貼 Google Maps 連結或「名稱 | 連結」',
    dayTripBulkApply: '批次新增',
    dayTripName: '地點名稱',
    dayTripMap: 'Google Maps 連結',
    dayTripNote: '備註',
    dayTripRemove: '刪除',
    dayTripDrag: '拖曳排序',
    dayTripListTitle: '一日遊行程點位',
    dayTripStopFallback: '未命名地點',
    distFromHere: '距離目前位置',
    distFromPrev: '距離上一站',
    openNav: '在 Google Maps 開啟導航',
    detailShort: '詳情',
    dayTripDetailsBtn: '查看完整一日遊行程',
    locating: '定位中...',
    locFailed: '定位失敗',
    searching: '搜尋中...',
    noResult: '找不到結果',
    emptyFav: '目前沒有收藏。',
    emptyList: '目前沒有符合的店家',
    clearFilter: '清除篩選',
    priceLabel: '價位',
    priceOpt1: '$（≤200）',
    priceOpt2: '$$（200-1000）',
    priceOpt3: '$$$（1000+）',
    stayMin: '建議停留時間（分鐘）',
    stayMinHint: '例：45 / 60 / 90',
    openSlotsLabel: '可去時段（參考）',
    slotMorning: '早上 06:00-10:00',
    slotNoon: '中午 10:00-14:00',
    slotAfternoon: '下午 14:00-18:00',
    slotEvening: '晚上 18:00-22:00',
    slotNight: '深夜 22:00-03:00',
    tagsInput: '標籤',
    tagsHint: '可勾選或自行輸入（以逗號分隔）',
    openLabel: '營業',
    igComment: 'IG 留言',
    close: '關閉',
    copy: '複製',
    copied: '已複製',
    share: '分享',
    shareCopied: '分享連結已複製',
    sharePrompt: '複製這個連結：',
    save: '儲存',
    cancel: '取消',
    delete: '刪除',
    edit: '編輯',
    syncG: '同步G',
    syncGHint: '輸入 Google Map 連結後按同步G，會帶入評分、地址、營業時間與座標',
    syncGUpdated: '已更新：{fields}',
    syncGNoChange: '沒有需要更新的欄位',
    syncGFail: '無法取得 Google 詳細資訊',
    coordsShort: '座標',
    placeIdLabel: 'Google Place ID',
    galleryLabel: '店家照片',
    galleryHint: '可上傳多張，會顯示在詳細資訊影片下方',
    galleryEmpty: '尚未上傳店家照片',
    featured: '精選',
    recommend: '推薦',
    newPlace: '（新餐廳）',
    actionsHint: '新增完成後會顯示操作按鈕',
    unknownAddr: '暫無地址',
    noIntro: '暫無介紹',
    noYt: '尚未提供 YouTube 影片',
    tripLimit: '行程最多只能加入 {n} 家店。',
    tripMin: '請至少選擇 2 家店才能規劃路線。',
    planning: '規劃中...',
    cantLocate: '無法取得您的位置，將以第一家店為起點。',
    tripFail: '路線規劃失敗：',
    loginReq: '請先登入會員才能使用此功能。',
    loginConfirm: '是否現在登入？',
    loginFav: '請先登入會員才能查看收藏清單。',
    loginAddFav: '請先登入會員才能加入收藏。',
    loginRemoveFav: '請先登入會員才能移除收藏。',
    loginEditProfile: '請先登入再編輯基本資料',
    loginSaveProfile: '請先登入再儲存',
    noPermission: '沒有權限執行此動作',
    profileLoadFail: '讀取失敗，請稍後再試',
    profileSaveSuccess: '已儲存，下次結帳自動帶入。',
    profileSaveFail: '儲存失敗',
    loadFailTitle: '載入失敗',
    loadFailDesc: '請重新整理或稍後再試。',
    loadingTitle: '載入中...',
    loadingDesc: '正在抓取最新資料。',
    importing: '匯入中...',
    importSuccess: '救援成功！資料已寫回資料庫。頁面將重新整理。',
    importFail: '匯入失敗：',
    importEmpty: '檔案內無資料',
    importConfirm: '準備匯入 {n} 筆資料，這將會覆蓋現有資料。確定嗎？',
    saveFail: '儲存失敗：',
    delConfirm: '確定要刪除這筆餐廳嗎？刪除後無法復原。',
    delSuccess: '已刪除',
    delFail: '刪除失敗：',
    uploading: '上傳中…',
    uploaded: '已上傳',
    uploadFail: '上傳失敗',
    coverFail: '封面圖上傳失敗：',
    needAdmin: '需要管理員權限。',
    syncing: '更新中...',
    synced: '已更新',
    syncFail: '更新失敗：',
    geoFail: '補定位失敗：',
    ratingFail: '無法取得 Google 評分',
    gmapFail: 'Google Maps 上找不到此地點',
    mapLoad: '正在載入地圖元件...',
    mapFail: '地圖載入失敗',
    noKey: '未設定 Google Maps Key',
    mapKeyFail: '無法讀取 Google Maps Key',
    mapKeyFailStatus: '無法讀取 Google Maps Key（HTTP {status}）',
    browserNoLoc: '此瀏覽器不支援定位',
    locPerm: '定位失敗，請允許位置權限',
    inputHotel: '請先輸入飯店名稱或地址',
    searchLoc: '搜尋位置中…',
    locNotFound: '找不到此位置，請換個關鍵字',
    nearbyEmpty: '附近沒有可用的推薦店家',
    nearbyFound: '已找到 {dist}km 內靠近「{label}」的 {n} 間店家',
    nearbyNone: '附近 {dist}km 內沒有可用的店家資料',
    nearbyFail: '附近搜尋失敗，請稍後再試',
    preparing: '正在整理 {dist}km 內的附近餐廳…',
    showing: '先顯示 {n} 間，正在補充附近餐廳…',
    locMy: '我的位置',
    locBtn: '📍 定位我的位置',
    nearbyIdle: '尚未搜尋附近餐廳',
    disclaimer: '營業時間與資訊可能變動，請以店家公告為準。',
    adminMode: '管理模式：儲存後會直接寫入資料庫。',
    dragHint: '拖曳圖片可調整顯示位置',
    autoUpload: '選擇圖片後會自動上傳',
    placeIdHint: '非必填，除非 Google 評論無法抓到正確來源',
    featuredLabel: '置頂推薦 (Featured)',
    igVideo: 'IG 影片',
    ytVideo: 'YouTube 影片',
    igLink: 'IG 連結',
    coordsInput: '座標（緯度, 經度）',
    coordsHelp: '使用說明',
    coordsHelpTitle: '座標使用說明',
    coordsHelpDesc: '依照以下步驟取得 Google Maps 座標：',
    coordsHelpStep1: '打開 Google Maps',
    coordsHelpStep2: '搜尋店家或長按地圖放置標記',
    coordsHelpStep3: '點選標記，底部會顯示座標',
    coordsHelpStep4: '複製成「緯度, 經度」格式，例如 13.7563, 100.5018',
    coordsHelpImageAlt: '座標查詢示意圖',
    coordsHelpText: '查詢緯度/經度方式：\n1. 打開 Google Maps\n2. 搜尋店家或長按地圖\n3. 點選標記，底部會顯示座標\n4. 複製成「緯度, 經度」格式，例如 13.7563, 100.5018',
    coordsInvalid: '座標格式錯誤，請輸入「緯度, 經度」',
    mapServiceWait: '地圖服務尚未載入，請稍候',
    noCover: '尚未上傳',
    saved: '已儲存',
    favFail: '收藏失敗：',
    removeFail: '移除失敗：',
    startLocFail: '無法取得起點位置',
    personUnit: '人',
    gMap: 'GOOGLE MAP連結',
    hours: '營業時間',
    lat: '緯度',
    lng: '經度',
    rating: '評分',
    priceInput: '價位',
    areaInput: '地區',
    catInput: '分類',
    nameInput: '店名',
    coverImg: '封面圖',
    profileName: '姓名',
    profilePhone: '手機號碼',
    profilePhonePlaceholder: '請輸入手機號碼',
    profileHint: '儲存後，實體商品與服務商品結帳會自動帶入這三項資料。',
    saveBtn: '儲存',
    cancelBtn: '取消',
    delBtn: '刪除',
    editBtn: '編輯',
    favBtn: '收藏',
    viewBtn: '查看',
    removeBtn: '移除',
    navBtn: '導航',
    seeMore: '查看更多 Google Maps 評論 →',
    noReviews: '暫無評論內容',
    loadingReviews: '正在載入 Google 評價...',
    failReviews: '無法取得詳細評價',
    failReviewsId: '無法取得詳細評價 (ID 無效)',
    gReviews: 'Google 評價',
    reviewsCount: '{n} 則評論',
    trafficStats: '流量統計',
    totalVisitors: '總累積不重複訪客',
    dailyVisitors: '每日不重複訪客',
    past14Days: '過去 14 天每日流量',
    reading: '讀取中...',
    readFail: '讀取失敗: ',
    editSub: '編輯副標題',
    editSubPrompt: '編輯副標題',
    backToTop: '回到頂部',
    unknownError: '未知',
    ok: '完成'
  },
  en: {
    title: 'Thailand Food Map',
    subtitle: 'Curated IG Reels & One-click to find nearest restaurants',
    home: 'Home',
    fav: 'Favorites',
    memberLabel: 'Member Center',
    profileInfo: 'Profile',
    myCoupons: 'My Coupons',
    myOrders: 'My Orders',
    storeDefault: 'Default Store',
    adminQna: 'Order Q&A',
    adminPanel: 'Admin',
    authLoading: 'Loading login status...',
    langSwitch: 'Language',
    langZh: 'Chinese',
    langEn: 'English',
    adminTools: 'Food Map',
    member: 'Member ▾',
    login: 'Login',
    logout: 'Logout',
    more: 'More',
    add: 'Add Place',
    export: 'Export',
    import: 'Import',
    stats: 'Stats',
    searchPlaceholder: 'Search name / keyword',
    allCats: 'All Categories',
    allAreas: 'All Areas',
    allPrices: 'All Prices',
    status: 'Status',
    openNow: 'Open Now',
    sort: 'Sort',
    distAsc: 'Distance (Near->Far)',
    ratingDesc: 'Rating (High->Low)',
    nameAsc: 'Name (A->Z)',
    priceAsc: 'Price (Low->High)',
    priceDesc: 'Price (High->Low)',
    nearbyTitle: '📍 Nearby',
    useLoc: 'Use My Location',
    collapse: 'Collapse',
    expand: 'Expand',
    nearbyPlaceholder: 'Enter hotel / address',
    searchNearby: 'Search Nearby',
    mapMode: 'Map Mode',
    listMode: 'List Mode',
    mapSwitchTemple: 'Temple Map',
    zoneAll: 'All',
    creatorZone: 'Creators',
    myZone: 'My Entries',
    totalCount: '{n} places',
    loadMore: 'Load More',
    details: 'Details',
    nav: 'Navigate',
    openGmaps: 'Open Google Maps',
    viewIg: 'View on IG',
    desc: 'Description',
    creatorPick: ' Picks',
    creatorProfile: 'Creator Profile',
    creatorProfileTitle: 'Creator Profile',
    creatorProfileName: 'Creator Name',
    creatorProfileAvatar: 'Creator Avatar',
    creatorProfileCover: 'Creator Cover',
    creatorProfileIg: 'Creator IG',
    creatorProfileYoutube: 'YouTube Channel',
    creatorProfileFacebook: 'Facebook',
    creatorProfileTiktok: 'TikTok',
    creatorProfileIntro: 'Creator Intro',
    creatorProfileSave: 'Save',
    creatorProfileSaved: 'Creator profile updated',
    creatorProfileFail: 'Update failed',
    creatorProfileNameEmpty: 'Please enter a creator name',
    creatorProfilePreview: 'Preview Card',
    creatorProfileAvatarHint: 'Not uploaded',
    creatorAvatarSpec: 'Suggested 400 x 400',
    creatorCoverSpec: 'Suggested 1200 x 400',
    creatorCoverDragHint: 'Drag cover to reposition',
    creatorProfileIgPlaceholder: 'https://instagram.com/xxx',
    creatorProfileYoutubePlaceholder: 'https://www.youtube.com/@xxx',
    creatorProfileFacebookPlaceholder: 'https://www.facebook.com/xxx',
    creatorProfileTiktokPlaceholder: 'https://www.tiktok.com/@xxx',
    creatorProfileIntroPlaceholder: 'Enter creator bio',
    creatorShare: 'Share link',
    creatorTerms: 'Creator Terms',
    creatorTermsHint: 'Please agree',
    creatorTermsNeed: 'Please agree to the creator terms before adding or editing restaurants.',
    creatorTermsTitle: 'Creator Add Restaurant Terms',
    creatorTermsAgree: 'I Agree',
    creatorTermsFail: 'Unable to agree: ',
    creatorTermsAcceptedToast: 'Creator terms accepted',
    creatorTermsAcceptedAt: 'Agreed to these terms on {time}',
    creatorTermsHtml: `<div class="terms-section">
      <div class="terms-title">1. Purpose & Scope</div>
      <p>This feature helps creators enrich the Food Map database. These terms apply to all content you add or edit.</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">2. Accuracy</div>
      <p>Please ensure all information is accurate and not misleading. We may correct or remove disputed content.</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">3. Rights & Limited Use</div>
      <p>You confirm you have the rights to the content you upload. You agree we may use it only as needed to operate and maintain the Food Map (on-site display, categorize, search, on-site recommendations, backup, and improve the service).</p>
      <p>We will not use your content for standalone commercial ads or third-party licensing. If any other use is needed, we will ask for your permission first.</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">4. Prohibited Content</div>
      <ul>
        <li>False, misleading, or spam content</li>
        <li>Content that infringes third-party rights</li>
        <li>Illegal, hateful, violent, adult, or discriminatory content</li>
        <li>Personal data shared without consent</li>
      </ul>
    </div>
    <div class="terms-section">
      <div class="terms-title">5. Moderation</div>
      <p>We may review, adjust, hide, or remove content that violates these terms or receives complaints.</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">6. Third-party Links</div>
      <p>Google Map, YouTube, or IG links are maintained by third parties. We are not responsible for their availability.</p>
    </div>
    <div class="terms-section">
      <div class="terms-title">7. Updates</div>
      <p>We may update these terms. Continued use means you accept the updates.</p>
    </div>`,
    allCreators: 'All Creators',
    creatorInvite: 'Enter Invite Code',
    creatorInvitePrompt: 'Enter invite code',
    creatorInviteSuccess: 'Creator access enabled',
    creatorInviteFail: 'Invalid or used code',
    creatorInviteCreate: 'Generate Invite Code',
    creatorInviteLabel: 'Creator name (optional)',
    creatorInviteReady: 'Invite code generated',
    creatorMode: 'Creator mode: Saves directly to DB.',
    addr: 'Address',
    reviews: 'Google Ratings & Reviews',
    tripTitle: 'Half-day Trip',
    planTrip: 'Plan Trip',
    addFav: 'Add to Favorites',
    distFromHere: 'Dist from here',
    distFromPrev: 'Dist from prev',
    openNav: 'Open Navigation',
    detailShort: 'Details',
    dayTripDetailsBtn: 'View full day trip',
    locating: 'Locating...',
    locFailed: 'Locating Failed',
    searching: 'Searching...',
    noResult: 'No results',
    emptyFav: 'No favorites yet.',
    emptyList: 'No matching places found.',
    clearFilter: 'Clear Filters',
    priceLabel: 'Price',
    priceOpt1: '$ (<=200)',
    priceOpt2: '$$ (200-1000)',
    priceOpt3: '$$$ (1000+)',
    stayMin: 'Suggested stay (min)',
    stayMinHint: 'e.g. 45 / 60 / 90',
    openSlotsLabel: 'Time slots (optional)',
    slotMorning: 'Morning 06:00-10:00',
    slotNoon: 'Midday 10:00-14:00',
    slotAfternoon: 'Afternoon 14:00-18:00',
    slotEvening: 'Evening 18:00-22:00',
    slotNight: 'Night 22:00-03:00',
    tagsInput: 'Tags',
    tagsHint: 'Select or enter custom (comma-separated)',
    openLabel: 'Open',
    igComment: 'IG Comment',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Share',
    shareCopied: 'Link copied',
    sharePrompt: 'Copy this link:',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    syncG: 'Sync G',
    syncGHint: 'Enter a Google Maps link, then click Sync G to pull rating, address, hours, and coordinates.',
    syncGUpdated: 'Updated: {fields}',
    syncGNoChange: 'No fields to update.',
    syncGFail: 'Unable to fetch Google details.',
    coordsShort: 'Coordinates',
    placeIdLabel: 'Google Place ID',
    galleryLabel: 'Photos',
    galleryHint: 'Upload multiple photos to show under the video.',
    galleryEmpty: 'No photos yet.',
    featured: 'Featured',
    recommend: 'Recommended',
    newPlace: '(New)',
    actionsHint: 'Actions are available after saving.',
    unknownAddr: 'No Address',
    noIntro: 'No Description',
    noYt: 'No YouTube Video',
    tripLimit: 'Max {n} places allowed.',
    tripMin: 'Select at least 2 places.',
    planning: 'Planning...',
    cantLocate: 'Cannot locate you, using first place as start.',
    tripFail: 'Planning failed: ',
    loginReq: 'Please login to use this feature.',
    loginConfirm: 'Login now?',
    loginFav: 'Please login to view favorites.',
    loginAddFav: 'Please login to add favorites.',
    loginRemoveFav: 'Please login to remove favorites.',
    loginEditProfile: 'Please log in to edit your profile.',
    loginSaveProfile: 'Please log in to save changes.',
    noPermission: 'No permission to perform this action',
    profileLoadFail: 'Failed to load. Please try again later.',
    profileSaveSuccess: 'Saved. We will auto-fill next checkout.',
    profileSaveFail: 'Save failed.',
    loadFailTitle: 'Load failed',
    loadFailDesc: 'Please refresh or try again later.',
    loadingTitle: 'Loading...',
    loadingDesc: 'Fetching the latest data.',
    importing: 'Importing...',
    importSuccess: 'Import success! Reloading...',
    importFail: 'Import failed: ',
    importEmpty: 'No data in file.',
    importConfirm: 'About to import {n} items. This will overwrite existing data. Continue?',
    saveFail: 'Save failed: ',
    delConfirm: 'Delete this place? Cannot be undone.',
    delSuccess: 'Deleted',
    delFail: 'Delete failed: ',
    uploading: 'Uploading...',
    uploaded: 'Uploaded',
    uploadFail: 'Upload failed',
    coverFail: 'Cover upload failed: ',
    needAdmin: 'Admin permission required.',
    syncing: 'Updating...',
    synced: 'Updated',
    syncFail: 'Update failed: ',
    geoFail: 'Geocode failed: ',
    ratingFail: 'Cannot get Google rating',
    gmapFail: 'Place not found on Google Maps',
    mapLoad: 'Loading map...',
    mapFail: 'Map load failed',
    noKey: 'Google Maps Key missing',
    mapKeyFail: 'Unable to load Google Maps key',
    mapKeyFailStatus: 'Unable to load Google Maps key (HTTP {status})',
    browserNoLoc: 'Browser does not support geolocation',
    locPerm: 'Geolocation failed, please allow permission',
    inputHotel: 'Please enter hotel or address',
    searchLoc: 'Searching location...',
    locNotFound: 'Location not found',
    nearbyEmpty: 'No nearby recommendations',
    nearbyFound: 'Found {n} places near "{label}" within {dist}km',
    nearbyNone: 'No data within {dist}km',
    nearbyFail: 'Nearby search failed',
    preparing: 'Preparing nearby places within {dist}km...',
    showing: 'Showing {n} places, loading more...',
    locMy: 'My Location',
    locBtn: '📍 Locate Me',
    nearbyIdle: 'No nearby search yet.',
    disclaimer: 'Hours and info may change. Please check store notices.',
    adminMode: 'Admin Mode: Saves directly to DB.',
    dayTripToggle: 'Day Trip',
    dayTripToggleHint: 'Add multiple places from one video',
    dayTripStopsLabel: 'Day trip stops (drag to reorder)',
    dayTripAddRow: 'Add row',
    dayTripBulkHint: 'Bulk paste: one per line, Google Maps link or "Name | Link"',
    dayTripBulkApply: 'Add from bulk',
    dayTripName: 'Place name',
    dayTripMap: 'Google Maps link',
    dayTripNote: 'Note',
    dayTripRemove: 'Remove',
    dayTripDrag: 'Drag to reorder',
    dayTripListTitle: 'Day trip stops',
    dayTripStopFallback: 'Untitled stop',
    dragHint: 'Drag image to adjust position',
    autoUpload: 'Auto upload on select',
    placeIdHint: 'Optional unless Google reviews cannot match the correct place.',
    featuredLabel: 'Featured',
    igVideo: 'IG Video',
    ytVideo: 'YouTube Video',
    igLink: 'Instagram link',
    coordsInput: 'Coordinates (lat, lng)',
    coordsHelp: 'How to',
    coordsHelpTitle: 'Coordinates Help',
    coordsHelpDesc: 'Follow these steps to get coordinates from Google Maps:',
    coordsHelpStep1: 'Open Google Maps',
    coordsHelpStep2: 'Search the place or long-press on the map',
    coordsHelpStep3: 'Tap the pin to reveal coordinates',
    coordsHelpStep4: 'Copy as \"lat, lng\" e.g. 13.7563, 100.5018',
    coordsHelpImageAlt: 'Coordinate lookup diagram',
    coordsHelpText: 'How to get coordinates:\n1. Open Google Maps\n2. Search the place or long-press on the map\n3. Tap the pin to reveal coordinates\n4. Copy as \"lat, lng\" e.g. 13.7563, 100.5018',
    coordsInvalid: 'Invalid coordinates. Use "lat, lng".',
    mapServiceWait: 'Map service is still loading. Please try again.',
    noCover: 'Not uploaded yet',
    saved: 'Saved',
    favFail: 'Favorite failed: ',
    removeFail: 'Remove failed: ',
    startLocFail: 'Unable to get the start location',
    personUnit: 'people',
    gMap: 'Google Maps Link',
    hours: 'Hours',
    lat: 'Lat',
    lng: 'Lng',
    rating: 'Rating',
    priceInput: 'Price',
    areaInput: 'Area',
    catInput: 'Category',
    nameInput: 'Name',
    coverImg: 'Cover',
    profileName: 'Name',
    profilePhone: 'Phone',
    profilePhonePlaceholder: 'Enter phone number',
    profileHint: 'Saved profile will auto-fill checkout for physical and service items.',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    delBtn: 'Delete',
    editBtn: 'Edit',
    favBtn: 'Fav',
    viewBtn: 'View',
    removeBtn: 'Remove',
    navBtn: 'Nav',
    seeMore: 'See more Google Maps reviews →',
    noReviews: 'No reviews',
    loadingReviews: 'Loading Google reviews...',
    failReviews: 'Failed to load reviews',
    failReviewsId: 'Failed to load reviews (Invalid ID)',
    gReviews: 'Google Reviews',
    reviewsCount: '{n} reviews',
    trafficStats: 'Traffic Stats',
    totalVisitors: 'Total Unique Visitors',
    dailyVisitors: 'Daily Unique Visitors',
    past14Days: 'Past 14 Days Traffic',
    reading: 'Reading...',
    readFail: 'Read failed: ',
    editSub: 'Edit Subtitle',
    editSubPrompt: 'Edit Subtitle',
    backToTop: 'Back to top',
    unknownError: 'unknown',
    ok: 'Done'
  }
};
function t(key, params){
  let str = (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS['zh'][key] || key;
  if (params) {
    Object.keys(params).forEach(k => {
      str = str.replace(`{${k}}`, params[k]);
    });
  }
  return str;
}

let userLocation = null;
let dataLoading = false;
let dataReady = false;
let pendingFoodId = '';
let pendingFoodSource = '';
let foodBooted = false;

// DOM Elements
const cardsEl = document.getElementById('cards');
const kwInput = document.getElementById('kw');
const fCat = document.getElementById('fCat');
const fArea = document.getElementById('fArea');
const fPrice = document.getElementById('fPrice');
const fStatus = document.getElementById('fStatus');
const fSort = document.getElementById('fSort');
const catTabs = document.getElementById('catTabs');
const totalCountEl = document.getElementById('totalCount');
const categoryCountsEl = document.getElementById('categoryCounts');
const countSyncEl = document.getElementById('countSync');
const modeToggle = document.getElementById('modeToggle');
const mainMapEl = document.getElementById('mainMap');
const zoneTabs = document.getElementById('zoneTabs');

const nearbyPanel = document.getElementById('nearbyPanel');
const nearbyBody = document.getElementById('nearbyBody');
const nearbyToggle = document.getElementById('nearbyToggle');
const nearbyList = document.getElementById('nearbyList');
const nearbyMapEl = document.getElementById('nearbyMap');
const nearbyInput = document.getElementById('nearbyInput');
const nearbySearch = document.getElementById('nearbySearch');
const nearbyUse = document.getElementById('nearbyUse');
const nearbyStatus = document.getElementById('nearbyStatus');

// Buttons
const btnBack = document.getElementById('btnBack');
const btnFav = document.getElementById('btnFav');
const btnLang = document.getElementById('btnLang');
const btnAdd = document.getElementById('btnAdd');
let btnExport = document.getElementById('btnExport');
let btnImport = document.getElementById('btnImport');
let btnStats = document.getElementById('btnStats');
const btnCreatorCode = document.getElementById('btnCreatorCode');
const fCreator = document.getElementById('fCreator');
const creatorToolsToggle = document.getElementById('creatorToolsToggle');
const creatorToolsPanel = document.getElementById('creatorToolsPanel');
const btnCreatorAdd = document.getElementById('btnCreatorAdd');
const btnCreatorInvite = document.getElementById('btnCreatorInvite');
const btnCreatorProfile = document.getElementById('btnCreatorProfile');
const btnCreatorShare = document.getElementById('btnCreatorShare');
const creatorProfileDialog = document.getElementById('creatorProfileDialog');
const creatorProfileNameLabel = document.getElementById('creatorProfileNameLabel');
const creatorProfileAvatarLabel = document.getElementById('creatorProfileAvatarLabel');
const creatorProfileCoverLabel = document.getElementById('creatorProfileCoverLabel');
const creatorProfileIgLabel = document.getElementById('creatorProfileIgLabel');
const creatorProfileYoutubeLabel = document.getElementById('creatorProfileYoutubeLabel');
const creatorProfileFacebookLabel = document.getElementById('creatorProfileFacebookLabel');
const creatorProfileTiktokLabel = document.getElementById('creatorProfileTiktokLabel');
const creatorProfileIntroLabel = document.getElementById('creatorProfileIntroLabel');
const creatorProfileName = document.getElementById('creatorProfileName');
const creatorProfileAvatarFile = document.getElementById('creatorProfileAvatarFile');
const creatorProfileAvatarUrl = document.getElementById('creatorProfileAvatarUrl');
const creatorProfileAvatarPreview = document.getElementById('creatorAvatarPreview');
const creatorProfileAvatarSize = document.getElementById('creatorAvatarSize');
const creatorProfileAvatarStatus = document.getElementById('creatorAvatarStatus');
const creatorAvatarSpecInline = document.getElementById('creatorAvatarSpecInline');
const creatorProfileCoverFile = document.getElementById('creatorProfileCoverFile');
const creatorProfileCoverUrl = document.getElementById('creatorProfileCoverUrl');
const creatorProfileCoverPos = document.getElementById('creatorProfileCoverPos');
const creatorProfileCoverPreview = document.getElementById('creatorCoverPreview');
const creatorProfileCoverSize = document.getElementById('creatorCoverSize');
const creatorProfileCoverStatus = document.getElementById('creatorCoverStatus');
const creatorCoverSpecInline = document.getElementById('creatorCoverSpecInline');
const creatorCoverHint = document.getElementById('creatorCoverHint');
const creatorProfileIg = document.getElementById('creatorProfileIg');
const creatorProfileYoutube = document.getElementById('creatorProfileYoutube');
const creatorProfileFacebook = document.getElementById('creatorProfileFacebook');
const creatorProfileTiktok = document.getElementById('creatorProfileTiktok');
const creatorProfileIntro = document.getElementById('creatorProfileIntro');
const creatorProfileStatus = document.getElementById('creatorProfileStatus');
const creatorProfilePreview = document.getElementById('creatorProfilePreview');
const creatorProfileClose = document.getElementById('creatorProfileClose');
const creatorProfileSave = document.getElementById('creatorProfileSave');
const creatorTermsRow = document.getElementById('creatorTermsRow');
const btnCreatorTerms = document.getElementById('btnCreatorTerms');
const creatorTermsHint = document.getElementById('creatorTermsHint');
const creatorTermsDialog = document.getElementById('creatorTermsDialog');
const creatorTermsTitle = document.getElementById('creatorTermsTitle');
const creatorTermsContent = document.getElementById('creatorTermsContent');
const creatorTermsStatus = document.getElementById('creatorTermsStatus');
const creatorTermsClose = document.getElementById('creatorTermsClose');
const creatorTermsAgree = document.getElementById('creatorTermsAgree');
const coordsHelpDialog = document.getElementById('coordsHelpDialog');
const coordsHelpTitle = document.getElementById('coordsHelpTitle');
const coordsHelpDesc = document.getElementById('coordsHelpDesc');
const coordsHelpImage = document.getElementById('coordsHelpImage');
const coordsHelpSteps = document.getElementById('coordsHelpSteps');
const coordsHelpClose = document.getElementById('coordsHelpClose');
const imageLightbox = document.getElementById('imageLightbox');
const imageLightboxImg = document.getElementById('imageLightboxImg');
const imageLightboxClose = document.getElementById('imageLightboxClose');
// ---------------------------

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}
function safeUrl(input){
  const raw = String(input || '').trim();
  if (!raw) return '';
  try{
    const u = new URL(raw, window.location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  }catch(_){}
  return '';
}
function safeImageUrl(input, opts){
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (opts && opts.allowBlob && raw.startsWith('blob:')) return raw;
  if (opts && opts.allowData && raw.startsWith('data:image/')) return raw;
  return safeUrl(raw);
}
function normalizeIgUrl(input){
  const raw = String(input || '').trim();
  if (!raw) return '';
  const trimmed = raw.replace(/^@/, '');
  if (/^https?:\/\//i.test(trimmed)) return safeUrl(trimmed);
  return safeUrl(`https://instagram.com/${trimmed.replace(/^\//,'')}`);
}
function openImageLightbox(src, altText){
  const url = safeUrl(src);
  if (!url) return;
  if (!imageLightbox || !imageLightboxImg){
    window.open(url, '_blank');
    return;
  }
  imageLightboxImg.src = url;
  imageLightboxImg.alt = altText || '';
  if (typeof imageLightbox.showModal === 'function') imageLightbox.showModal();
  else imageLightbox.setAttribute('open', '');
}
if (imageLightboxClose && imageLightbox){
  imageLightboxClose.onclick = () => {
    if (typeof imageLightbox.close === 'function') imageLightbox.close();
    else imageLightbox.removeAttribute('open');
  };
}
if (imageLightbox){
  imageLightbox.addEventListener('click', (e)=>{
    if (e.target === imageLightbox){
      if (typeof imageLightbox.close === 'function') imageLightbox.close();
      else imageLightbox.removeAttribute('open');
    }
  });
}
function normalizeYouTubeUrl(input){
  const raw = String(input || '').trim();
  if (!raw) return '';
  const trimmed = raw.replace(/^@/, '');
  if (/^https?:\/\//i.test(trimmed)) return safeUrl(trimmed);
  if (/(youtube\.com|youtu\.be)/i.test(trimmed)) return safeUrl(`https://${trimmed}`);
  const clean = trimmed.replace(/^\//, '');
  if (/^UC[0-9A-Za-z_-]{5,}$/.test(clean)) return safeUrl(`https://www.youtube.com/channel/${clean}`);
  return safeUrl(`https://www.youtube.com/@${clean}`);
}
function normalizeFacebookUrl(input){
  const raw = String(input || '').trim();
  if (!raw) return '';
  const trimmed = raw.replace(/^@/, '');
  if (/^https?:\/\//i.test(trimmed)) return safeUrl(trimmed);
  if (/(facebook\.com|fb\.com)/i.test(trimmed)) return safeUrl(`https://${trimmed}`);
  return safeUrl(`https://www.facebook.com/${trimmed.replace(/^\//,'')}`);
}
function normalizeTiktokUrl(input){
  const raw = String(input || '').trim();
  if (!raw) return '';
  const trimmed = raw.replace(/^@/, '');
  if (/^https?:\/\//i.test(trimmed)) return safeUrl(trimmed);
  if (/tiktok\.com/i.test(trimmed)) return safeUrl(`https://${trimmed}`);
  return safeUrl(`https://www.tiktok.com/@${trimmed.replace(/^\//,'')}`);
}
function renderCoordsHelpSteps(){
  if (!coordsHelpSteps) return;
  const keys = ['coordsHelpStep1', 'coordsHelpStep2', 'coordsHelpStep3', 'coordsHelpStep4'];
  coordsHelpSteps.innerHTML = keys.map(key => `<li>${escapeHtml(t(key))}</li>`).join('');
}
function formatTermsTime(raw){
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const opts = { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' };
  const locale = currentLang === 'en' ? 'en-US' : 'zh-TW';
  return d.toLocaleString(locale, opts);
}
function updateCreatorTermsUi(){
  if (creatorTermsRow) creatorTermsRow.style.display = isCreator ? 'flex' : 'none';
  if (btnCreatorTerms) btnCreatorTerms.style.display = isCreator ? 'inline-flex' : 'none';
  if (creatorTermsHint){
    const needs = isCreator && !creatorTermsAccepted;
    creatorTermsHint.textContent = t('creatorTermsHint');
    creatorTermsHint.style.display = needs ? 'inline' : 'none';
  }
}
function updateCreatorTermsDialogState(opts){
  if (creatorTermsAgree) creatorTermsAgree.style.display = creatorTermsAccepted ? 'none' : '';
  if (creatorTermsStatus){
    if (creatorTermsAccepted){
      const timeLabel = formatTermsTime(creatorTermsAcceptedAt) || t('unknown');
      creatorTermsStatus.textContent = t('creatorTermsAcceptedAt', { time: timeLabel });
      creatorTermsStatus.classList.add('ok');
    } else {
      if (opts && opts.clear){
        creatorTermsStatus.textContent = '';
      }
      creatorTermsStatus.classList.remove('ok');
    }
  }
}
function openCreatorTermsDialog(){
  if (creatorTermsStatus) creatorTermsStatus.textContent = '';
  updateCreatorTermsDialogState({ clear: true });
  if (creatorTermsDialog && typeof creatorTermsDialog.showModal === 'function') creatorTermsDialog.showModal();
  else if (creatorTermsDialog) creatorTermsDialog.setAttribute('open', '');
}
function setImagePreviewFromUrl(previewEl, sizeEl, url, emptyText){
  if (!previewEl) return;
  const safe = safeImageUrl(url, { allowBlob: true, allowData: true });
  if (!safe){
    previewEl.textContent = emptyText || '';
    if (sizeEl) sizeEl.textContent = '';
    return;
  }
  previewEl.innerHTML = `<img src="${escapeHtml(safe)}" alt="">`;
  if (sizeEl){
    const img = new Image();
    img.onload = ()=>{ sizeEl.textContent = `${img.naturalWidth} x ${img.naturalHeight}`; };
    img.onerror = ()=>{ sizeEl.textContent = ''; };
    img.src = safe;
  }
}
function setImagePreviewFromFile(previewEl, sizeEl, file){
  if (!previewEl || !file) return;
  const prev = previewEl.dataset.blobUrl;
  if (prev) URL.revokeObjectURL(prev);
  const blobUrl = URL.createObjectURL(file);
  previewEl.dataset.blobUrl = blobUrl;
  previewEl.textContent = '';
  const img = document.createElement('img');
  img.src = blobUrl;
  img.alt = '';
  previewEl.appendChild(img);
  if (sizeEl){
    const img = new Image();
    img.onload = ()=>{ sizeEl.textContent = `${img.naturalWidth} x ${img.naturalHeight}`; };
    img.onerror = ()=>{ sizeEl.textContent = ''; };
    img.src = blobUrl;
  }
}
function clearImagePreviewBlob(previewEl){
  if (!previewEl) return;
  const prev = previewEl.dataset.blobUrl;
  if (prev) URL.revokeObjectURL(prev);
  delete previewEl.dataset.blobUrl;
}
function applyCreatorCoverPos(pos){
  const safe = safeObjectPosition(pos || '50% 50%');
  creatorCoverPos = safe;
  if (creatorProfileCoverPos) creatorProfileCoverPos.value = safe;
  const previewImg = creatorProfileCoverPreview ? creatorProfileCoverPreview.querySelector('img') : null;
  if (previewImg) previewImg.style.objectPosition = safe;
  const cardImg = creatorProfilePreview ? creatorProfilePreview.querySelector('.creator-cover img') : null;
  if (cardImg) cardImg.style.objectPosition = safe;
}
function initCreatorCoverDrag(){
  if (!creatorProfilePreview) return;
  const img = creatorProfilePreview.querySelector('.creator-cover img');
  if (!img || img.dataset.dragReady === '1') return;
  img.dataset.dragReady = '1';
  img.style.cursor = 'grab';
  const coverEl = img.closest('.creator-cover');
  if (coverEl && !coverEl.querySelector('.creator-cover-hint')){
    const hint = document.createElement('div');
    hint.className = 'creator-cover-hint';
    hint.textContent = t('creatorCoverDragHint');
    coverEl.appendChild(hint);
  }
  img.draggable = false;
  let dragging = null;
  const startDrag = (clientX, clientY)=>{
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pos = safeObjectPosition(img.style.objectPosition || creatorCoverPos || '50% 50%');
    const [xStr,yStr] = pos.split(' ');
    dragging = {
      startX: clientX,
      startY: clientY,
      startPosX: parseFloat(xStr),
      startPosY: parseFloat(yStr),
      width: rect.width,
      height: rect.height
    };
    img.style.cursor = 'grabbing';
    if (coverEl) coverEl.classList.add('dragging');
  };
  const moveDrag = (clientX, clientY)=>{
    if (!dragging) return;
    const dx = clientX - dragging.startX;
    const dy = clientY - dragging.startY;
    const nx = Math.max(0, Math.min(100, dragging.startPosX + (dx / dragging.width) * 100));
    const ny = Math.max(0, Math.min(100, dragging.startPosY + (dy / dragging.height) * 100));
    applyCreatorCoverPos(`${nx.toFixed(1)}% ${ny.toFixed(1)}%`);
  };
  const endDrag = ()=>{
    if (!dragging) return;
    dragging = null;
    img.style.cursor = 'grab';
    if (coverEl) coverEl.classList.remove('dragging');
  };
  img.addEventListener('pointerdown', (e)=>{
    img.setPointerCapture(e.pointerId);
    startDrag(e.clientX, e.clientY);
  });
  img.addEventListener('pointermove', (e)=>{ moveDrag(e.clientX, e.clientY); });
  img.addEventListener('pointerup', endDrag);
  img.addEventListener('pointercancel', endDrag);
  img.addEventListener('pointerleave', endDrag);
}
const COVER_THUMB_QUALITY = 58;
function getCoverThumbWidth(){
  if (typeof window === 'undefined') return 520;
  const vw = Math.max(320, Math.min(1200, window.innerWidth || 1200));
  if (vw <= 520) return 360;
  if (vw <= 900) return 420;
  return 520;
}
function buildThumbUrl(input, width){
  const raw = safeUrl(input);
  if (!raw) return '';
  const w = Math.max(120, Math.min(1200, Number(width || getCoverThumbWidth()) || 520));
  return `/api/img?u=${encodeURIComponent(raw)}&w=${w}&q=${COVER_THUMB_QUALITY}&fmt=webp`;
}
function isIgCoverUrl(input){
  const raw = safeUrl(input);
  if (!raw) return false;
  try{
    const u = new URL(raw);
    return /cdninstagram\.com$/.test(u.hostname || '');
  }catch(_){
    return false;
  }
}
function safeObjectPosition(input){
  const raw = String(input || '').trim();
  const m = raw.match(/^(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/);
  if (!m) return '50% 50%';
  const x = Math.max(0, Math.min(100, Number(m[1])));
  const y = Math.max(0, Math.min(100, Number(m[2])));
  if (Number.isNaN(x) || Number.isNaN(y)) return '50% 50%';
  return `${x}% ${y}%`;
}
function escapeSelectorValue(input){
  const raw = String(input ?? '');
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(raw);
  return raw.replace(/["\\]/g, '\\$&').replace(/\s/g, '\\ ');
}
function buildInstagramEmbedUrl(input){
  const raw = safeUrl(input);
  if (!raw) return '';
  try{
    const u = new URL(raw);
    const host = (u.hostname || '').toLowerCase();
    if (!host.endsWith('instagram.com')) return '';
    if (!/^\/(p|reel|tv)\//.test(u.pathname)) return '';
    const cleanPath = u.pathname.replace(/\/?$/, '/');
    return `${u.origin}${cleanPath}embed`;
  }catch(_){ return ''; }
}
function buildYouTubeEmbedUrl(input){
  const rawInput = String(input || '').trim();
  if (!rawInput) return '';
  let raw = rawInput;
  const iframeMatch = raw.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) raw = iframeMatch[1];
  const urlMatch = raw.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) raw = urlMatch[0];
  if (!/^https?:\/\//i.test(raw)){
    if (/^(www\.)?(youtube\.com|youtu\.be)\//i.test(raw)){
      raw = `https://${raw.replace(/^www\./i, '')}`;
    }else if (/^[a-zA-Z0-9_-]{11}$/.test(raw)){
      raw = `https://youtu.be/${raw}`;
    }else{
      return '';
    }
  }
  try{
    const u = new URL(raw);
    const host = (u.hostname || '').toLowerCase();
    if (host === 'youtu.be'){
      const id = u.pathname.split('/').filter(Boolean)[0] || '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (!host.endsWith('youtube.com') && !host.endsWith('youtube-nocookie.com')) return '';
    const path = u.pathname || '';
    if (path.startsWith('/watch')){
      const id = u.searchParams.get('v') || '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (path.startsWith('/shorts/')){
      const id = path.split('/shorts/')[1]?.split('/')[0] || '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (path.startsWith('/embed/')){
      const id = path.split('/embed/')[1]?.split('/')[0] || '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (path.startsWith('/live/')){
      const id = path.split('/live/')[1]?.split('/')[0] || '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  }catch(_){}
  return '';
}
function buildIntroText(item){
  const intro = (item && item.intro) ? String(item.intro).trim() : '';
  if (intro) return intro;
  const parts = [];
  const highlights = Array.isArray(item && item.highlights) ? item.highlights.filter(Boolean) : [];
  if (highlights.length){
    parts.push(`${highlights.join('、')}`);
  }
  const dishes = Array.isArray(item && item.dishes) ? item.dishes.filter(d=>d && (d.name || d.price)) : [];
  if (dishes.length){
    const dishLine = dishes.map(d=>{
      const name = d.name ? String(d.name).trim() : '';
      const price = d.price ? `฿${String(d.price).trim()}` : '';
      return [name, price].filter(Boolean).join(' ');
    }).filter(Boolean).join('、');
    if (dishLine) parts.push(`${dishLine}`);
  }
  return parts.join('。');
}
function buildCardSnippet(item){
  const text = (item && item.intro) ? String(item.intro) : buildIntroText(item);
  if (!text) return '';
  const lines = text.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean);
  const cleaned = lines.filter(l=>{
    if (!l) return false;
    if (/^(#|@|🏠|📍|⏰)/.test(l)) return false;
    if (/^https?:\/\//i.test(l)) return false;
    return true;
  }).join(' ');
  if (!cleaned) return '';
  const withBreaks = cleaned.replace(/([。！？!?])\s*/g, '$1\n').replace(/(\.)\s+/g, '$1\n');
  const sentences = withBreaks.split('\n').map(s=>s.trim()).filter(Boolean);
  if (!sentences.length) return '';
  const keywords = ['必點','必吃','必訪','必來','推薦','超級','超好吃','最好','最愛','招牌','特色','值得','人氣','排隊','限定','只有','開到','便宜','高CP','氛圍','拍照','夜景','米其林','必比登'];
  const scored = sentences.map((s, idx)=>{
    let score = 0;
    keywords.forEach(k=>{ if (s.includes(k)) score += 3; });
    if (s.length >= 12 && s.length <= 60) score += 2;
    if (/[A-Za-z]/.test(s)) score -= 1;
    return { s, idx, score };
  }).sort((a,b)=> b.score - a.score);
  const picked = [];
  for (const it of scored){
    if (picked.length >= 2) break;
    if (!picked.find(p=>p.idx === it.idx)) picked.push(it);
  }
  const ordered = picked.sort((a,b)=> a.idx - b.idx).map(p=>p.s);
  const fallback = sentences.slice(0,2);
  const final = ordered.length ? ordered : fallback;
  let snippet = final.join(' ');
  snippet = snippet.replace(/\s+/g,' ').trim();
  if (!snippet) return '';
  if (snippet.length > 120) snippet = snippet.slice(0, 120) + '…';
  return snippet;
}
function buildDayTripRowHtml(stop){
  const name = stop && stop.name ? String(stop.name) : '';
  const maps = stop && stop.maps ? String(stop.maps) : '';
  const note = stop && stop.note ? String(stop.note) : '';
  return `
    <div class="daytrip-row" data-daytrip-row draggable="true">
      <div class="daytrip-handle" data-daytrip-handle title="${escapeHtml(t('dayTripDrag'))}">⋮⋮</div>
      <input class="admin-input" data-daytrip-name value="${escapeHtml(name)}" placeholder="${escapeHtml(t('dayTripName'))}">
      <input class="admin-input" data-daytrip-maps value="${escapeHtml(maps)}" placeholder="${escapeHtml(t('dayTripMap'))}">
      <input class="admin-input" data-daytrip-note value="${escapeHtml(note)}" placeholder="${escapeHtml(t('dayTripNote'))}">
      <button class="btn ghost pill" type="button" data-daytrip-remove>${escapeHtml(t('dayTripRemove'))}</button>
    </div>
  `;
}
function readDayTripStops(wrap){
  if (!wrap) return [];
  const rows = Array.from(wrap.querySelectorAll('[data-daytrip-row]'));
  return rows.map((row, idx)=>{
    const nameInput = row.querySelector('[data-daytrip-name]');
    const mapsInput = row.querySelector('[data-daytrip-maps]');
    const noteInput = row.querySelector('[data-daytrip-note]');
    const name = nameInput ? nameInput.value.trim() : '';
    const maps = mapsInput ? mapsInput.value.trim() : '';
    const note = noteInput ? noteInput.value.trim() : '';
    if (!name && !maps) return null;
    return { name, maps, note, order: idx + 1 };
  }).filter(Boolean);
}
function getDragAfterElement(container, y){
  const elements = Array.from(container.querySelectorAll('[data-daytrip-row]:not(.is-dragging)'));
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
  elements.forEach(child => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: child };
    }
  });
  return closest.element;
}
function initDayTripRow(row, list){
  if (!row || !list) return;
  const removeBtn = row.querySelector('[data-daytrip-remove]');
  if (removeBtn) {
    removeBtn.addEventListener('click', ()=>{
      row.remove();
    });
  }
  row.addEventListener('dragstart', (event)=>{
    row.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'daytrip');
    }
  });
  row.addEventListener('dragend', ()=>{
    row.classList.remove('is-dragging');
  });
}
function initDayTripEditors(root){
  if (!root) return;
  root.querySelectorAll('[data-admin-daytrip]').forEach(panel=>{
    const wrap = panel.closest('[data-admin-id]');
    if (!wrap) return;
    const toggle = wrap.querySelector('[data-admin-daytrip-toggle]');
    const categoryInput = wrap.querySelector('[data-admin-field="category"]');
    const list = panel.querySelector('[data-daytrip-list]');
    const addBtn = panel.querySelector('[data-daytrip-add]');
    const bulkInput = panel.querySelector('[data-daytrip-bulk]');
    const bulkBtn = panel.querySelector('[data-daytrip-apply]');

    const syncActive = ()=>{
      const active = toggle ? toggle.checked : true;
      panel.classList.toggle('is-active', active);
      if (active && list && !list.querySelector('[data-daytrip-row]')) {
        list.insertAdjacentHTML('beforeend', buildDayTripRowHtml({}));
        const newRow = list.lastElementChild;
        initDayTripRow(newRow, list);
      }
      if (active && categoryInput && !categoryInput.value.trim()) {
        categoryInput.value = DAY_TRIP_CATEGORY;
      }
    };

    if (toggle){
      toggle.addEventListener('change', syncActive);
    }
    if (categoryInput && toggle){
      categoryInput.addEventListener('input', ()=>{
        if (isDayTripCategory(categoryInput.value)) {
          toggle.checked = true;
          syncActive();
        }
      });
    }
    if (list){
      list.addEventListener('dragover', (event)=>{
        event.preventDefault();
        const dragging = list.querySelector('.is-dragging');
        if (!dragging) return;
        const after = getDragAfterElement(list, event.clientY);
        if (!after) list.appendChild(dragging);
        else list.insertBefore(dragging, after);
      });
      list.querySelectorAll('[data-daytrip-row]').forEach(row=> initDayTripRow(row, list));
    }
    if (addBtn && list){
      addBtn.addEventListener('click', ()=>{
        list.insertAdjacentHTML('beforeend', buildDayTripRowHtml({}));
        const newRow = list.lastElementChild;
        initDayTripRow(newRow, list);
        if (toggle && !toggle.checked){
          toggle.checked = true;
          syncActive();
        }
      });
    }
    if (bulkBtn && bulkInput && list){
      bulkBtn.addEventListener('click', ()=>{
        const stops = parseDayTripBulk(bulkInput.value);
        if (!stops.length) return;
        stops.forEach(stop => {
          list.insertAdjacentHTML('beforeend', buildDayTripRowHtml(stop));
          const newRow = list.lastElementChild;
          initDayTripRow(newRow, list);
        });
        bulkInput.value = '';
        if (toggle && !toggle.checked){
          toggle.checked = true;
          syncActive();
        }
      });
    }

    syncActive();
  });
}
let toastTimer = null;
function showToast(text){
  const el = document.getElementById('saveToast');
  if (!el) return;
  el.textContent = text || t('ok');
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.style.display = 'none'; }, 1600);
}

function buildFoodShareUrl(id){
  const base = window.location.origin + window.location.pathname;
  const url = new URL(base);
  if (id) url.searchParams.set('id', id);
  return url.toString();
}

function buildCreatorShareUrl(){
  const base = window.location.origin + '/food-map';
  const url = new URL(base);
  url.searchParams.set('zone', 'creator');
  if (creatorId) url.searchParams.set('creatorId', creatorId);
  if (creatorName) url.searchParams.set('creator', creatorName);
  return url.toString();
}

function buildCreatorProfileCard(profile, opts){
  if (!profile || !profile.name) return '';
  const allowBlob = !!(opts && opts.allowBlob);
  const name = escapeHtml(profile.name);
  const intro = escapeHtml(profile.intro || '');
  const igUrl = normalizeIgUrl(profile.ig || '');
  const ytUrl = normalizeYouTubeUrl(profile.youtube || '');
  const fbUrl = normalizeFacebookUrl(profile.facebook || '');
  const ttUrl = normalizeTiktokUrl(profile.tiktok || '');
  const avatarUrl = safeImageUrl(profile.avatar || '', { allowBlob });
  const coverUrl = safeImageUrl(profile.cover || '', { allowBlob });
  const coverPos = safeObjectPosition(profile.coverPos || '50% 50%');
  const coverStyle = coverPos ? ` style="object-position:${escapeHtml(coverPos)};"` : '';
  const initial = name ? name.trim().slice(0, 1) : 'C';
  const socials = [];
  if (igUrl) socials.push({ url: igUrl, icon: '/img/brand/logo-instagram.png', label: 'Instagram' });
  if (ytUrl) socials.push({ url: ytUrl, icon: '/img/brand/logo-youtube.svg', label: 'YouTube' });
  if (fbUrl) socials.push({ url: fbUrl, icon: '/img/brand/logo-facebook.svg', label: 'Facebook' });
  if (ttUrl) socials.push({ url: ttUrl, icon: '/img/brand/logo-tiktok.svg', label: 'TikTok' });
  const socialsHtml = socials.length
    ? `<div class="creator-socials">${socials.map(s => `<a class="creator-social" href="${escapeHtml(s.url)}" target="_blank" rel="noopener" title="${escapeHtml(s.label)}" aria-label="${escapeHtml(s.label)}"><img src="${escapeHtml(s.icon)}" alt="${escapeHtml(s.label)}"></a>`).join('')}</div>`
    : '';
  return `
    <div class="creator-card">
      ${coverUrl ? `<div class="creator-cover"><img src="${escapeHtml(coverUrl)}" alt="${name}"${coverStyle}></div>` : '<div class="creator-cover"></div>'}
      <div class="creator-card-body">
        <div class="creator-avatar">
          ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="${name}">` : `<span>${escapeHtml(initial)}</span>`}
        </div>
        <div class="creator-info">
          <div class="creator-name">${name}</div>
          ${intro ? `<div class="creator-intro">${intro}</div>` : ''}
        </div>
        ${socialsHtml}
      </div>
    </div>
  `;
}

function updateCreatorProfilePreview(){
  if (!creatorProfilePreview) return;
  const name = creatorProfileName ? creatorProfileName.value.trim() : '';
  const ig = creatorProfileIg ? creatorProfileIg.value.trim() : '';
  const youtube = creatorProfileYoutube ? creatorProfileYoutube.value.trim() : '';
  const facebook = creatorProfileFacebook ? creatorProfileFacebook.value.trim() : '';
  const tiktok = creatorProfileTiktok ? creatorProfileTiktok.value.trim() : '';
  const intro = creatorProfileIntro ? creatorProfileIntro.value.trim() : '';
  const avatar = creatorProfileAvatarUrl ? creatorProfileAvatarUrl.value.trim() : '';
  const cover = creatorProfileCoverUrl ? creatorProfileCoverUrl.value.trim() : '';
  const coverPos = creatorProfileCoverPos ? creatorProfileCoverPos.value.trim() : creatorCoverPos;
  creatorProfilePreview.innerHTML = buildCreatorProfileCard({
    name: name || creatorName || '',
    ig,
    youtube,
    facebook,
    tiktok,
    intro,
    avatar,
    cover,
    coverPos: coverPos || creatorCoverPos
  }, { allowBlob: true });
  applyCreatorCoverPos(coverPos || creatorCoverPos);
  initCreatorCoverDrag();
}

async function copyText(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text);
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.top = '-9999px';
  document.body.appendChild(input);
  input.focus();
  input.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(input);
  if (!ok) throw new Error('copy failed');
}

async function shareFood(item){
  if (!item || !item.id) return;
  try{
    if (window.trackEvent) window.trackEvent('food_share', { itemId: item.id });
  }catch(_){}
  const url = buildFoodShareUrl(item.id);
  const title = item.name ? String(item.name) : document.title;
  if (navigator.share){
    try{
      await navigator.share({ title, url });
      return;
    }catch(err){
      if (err && err.name === 'AbortError') return;
    }
  }
  try{
    await copyText(url);
    showToast(t('shareCopied'));
  }catch(_){
    window.prompt(t('sharePrompt'), url);
  }
}

function parseFoodIdFromSearch(){
  const params = new URLSearchParams(window.location.search || '');
  return params.get('id') || params.get('fid') || params.get('foodId') || '';
}

function parseFoodIdFromHash(){
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash || !hash.includes('=')) return '';
  try{
    const params = new URLSearchParams(hash);
    return params.get('id') || params.get('fid') || params.get('foodId') || '';
  }catch(_){
    return '';
  }
}

function clearFoodUrl(source){
  try{
    if (source === 'search'){
      const params = new URLSearchParams(window.location.search || '');
      params.delete('id');
      params.delete('fid');
      params.delete('foodId');
      const qs = params.toString();
      const next = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      if (history && typeof history.replaceState === 'function'){
        history.replaceState(null, document.title || '', next);
      }else{
        window.location.search = qs ? `?${qs}` : '';
      }
      return;
    }
    if (window.location.hash){
      if (history && typeof history.replaceState === 'function'){
        history.replaceState(null, document.title || '', window.location.pathname + window.location.search);
      }else{
        window.location.hash = '';
      }
    }
  }catch(_){}
}

function openFoodFromUrl(){
  const searchId = parseFoodIdFromSearch();
  const hashId = parseFoodIdFromHash();
  const fid = pendingFoodId || searchId || hashId;
  if (!fid) return;
  const source = pendingFoodId ? pendingFoodSource : (searchId ? 'search' : (hashId ? 'hash' : ''));
  if (!DATA || !DATA.length){
    pendingFoodId = fid;
    pendingFoodSource = source;
    return;
  }
  const item = DATA.find(it => String(it.id) === String(fid));
  pendingFoodId = '';
  pendingFoodSource = '';
  if (!item) return;
  openModal(item.id);
  clearFoodUrl(source);
}

function readCreatorShareParams(){
  try{
    const params = new URLSearchParams(window.location.search || '');
    return {
      zone: params.get('zone') || '',
      creatorId: params.get('creatorId') || params.get('creator_id') || '',
      creatorName: params.get('creator') || params.get('creatorName') || ''
    };
  }catch(_){
    return null;
  }
}

function readCreatorInviteParam(){
  try{
    const params = new URLSearchParams(window.location.search || '');
    return params.get('creator_invite') || params.get('creatorInvite') || '';
  }catch(_){
    return '';
  }
}

function clearCreatorInviteParam(){
  try{
    const url = new URL(window.location.href);
    url.searchParams.delete('creator_invite');
    url.searchParams.delete('creatorInvite');
    if (history && typeof history.replaceState === 'function'){
      history.replaceState(null, document.title || '', url.pathname + url.search + url.hash);
    }else{
      window.location.search = url.search;
    }
  }catch(_){}
}

async function applyCreatorInviteFromUrl(){
  if (creatorInviteApplied) return;
  const raw = readCreatorInviteParam();
  if (!raw) return;
  const code = String(raw || '').trim();
  if (!code) return;
  creatorInviteApplied = true;
  const claimInvite = async ()=>{
    try{
      const res = await fetch('/api/creator/claim', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ code })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok || !data || data.ok === false){
        throw new Error((data && data.error) || 'invalid');
      }
      showToast(t('creatorInviteSuccess'));
      await checkCreator();
    }catch(_){
      alert(t('creatorInviteFail'));
    }finally{
      clearCreatorInviteParam();
    }
  };
  const authed = window.authState && typeof window.authState.isLoggedIn === 'function'
    ? window.authState.isLoggedIn()
    : false;
  if (authed){
    claimInvite();
    return;
  }
  if (window.authState && typeof window.authState.subscribe === 'function'){
    let handled = false;
    window.authState.subscribe(user=>{
      if (handled) return;
      handled = true;
      if (user){
        claimInvite();
      }else if (window.authState && typeof window.authState.login === 'function'){
        window.authState.login();
      }
    });
    return;
  }
  if (window.authState && typeof window.authState.login === 'function'){
    window.authState.login();
  }
}

function syncCreatorShareFilter(){
  if (!fCreator) return;
  if (creatorShareName){
    const hasOption = Array.from(fCreator.options).some(opt=>opt.value === creatorShareName);
    if (hasOption){
      suppressCreatorShareClear = true;
      fCreator.value = creatorShareName;
      suppressCreatorShareClear = false;
    }
    return;
  }
  if (creatorShareId && Array.isArray(DATA)){
    const match = DATA.find(item=>String(item.ownerId || '') === String(creatorShareId));
    if (match){
      const name = getOwnerName(match);
      if (name){
        creatorShareName = name;
        const hasOption = Array.from(fCreator.options).some(opt=>opt.value === creatorShareName);
        if (hasOption){
          suppressCreatorShareClear = true;
          fCreator.value = creatorShareName;
          suppressCreatorShareClear = false;
        }
      }
    }
  }
}

function applyCreatorShareFromUrl(){
  if (creatorShareApplied) return;
  const params = readCreatorShareParams();
  if (!params) return;
  const zoneParam = String(params.zone || '').toLowerCase();
  const creatorIdParam = String(params.creatorId || '').trim();
  const creatorNameParam = String(params.creatorName || '').trim();
  if (!zoneParam && !creatorIdParam && !creatorNameParam) return;
  if (zoneParam === 'creator' || creatorIdParam || creatorNameParam){
    currentZone = 'creator';
  }
  if (creatorIdParam) creatorShareId = creatorIdParam;
  if (creatorNameParam) creatorShareName = creatorNameParam;
  creatorShareApplied = true;
  syncCreatorShareFilter();
  renderZoneTabs();
  if (dataReady) safeRender();
}

const nameCollator = (typeof Intl !== 'undefined' && Intl.Collator)
  ? new Intl.Collator('zh-Hant', { numeric:true, sensitivity:'base' })
  : null;
const priceRank = (val)=>{
  if (val === '$') return 1;
  if (val === '$$') return 2;
  if (val === '$$$') return 3;
  return 99;
};
const ALLOW_IG_COVER = false;
const coverCache = new Map();
const coverPending = new Set();
let coverRefreshTimer = null;

async function uploadCoverFile(file){
  const fd = new FormData();
  fd.append('file', file, file.name || 'cover.jpg');
  const res = await fetch('/api/upload', {
    method:'POST',
    body: fd,
    credentials:'include'
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
  const first = Array.isArray(data.files) ? data.files[0] : null;
  if (!first || !first.url) throw new Error('Upload failed');
  return first.url;
}

function initCoverPositionControls(scope){
  const getPreviews = (node)=>{
    if (!node) return Array.from(cardsEl.querySelectorAll('[data-admin-preview="cover"]'));
    if (node.matches && node.matches('[data-admin-preview="cover"]')) return [node];
    if (node.querySelectorAll) return Array.from(node.querySelectorAll('[data-admin-preview="cover"]'));
    return [];
  };
  const previews = getPreviews(scope);
  previews.forEach(previewEl=>{
    const img = previewEl.querySelector('img');
    if (!img) return;
    if (img.dataset.dragReady === '1') return;
    img.dataset.dragReady = '1';
    img.draggable = false;
    const wrap = previewEl.closest('[data-admin-id]');
    if (!wrap) return;
    const posInput = wrap.querySelector('[data-admin-field="coverPos"]');
    const setPos = (pos)=>{
      const safe = safeObjectPosition(pos);
      img.style.objectPosition = safe;
      if (posInput) posInput.value = safe;
    };
    setPos(posInput && posInput.value ? posInput.value : '50% 50%');
    let dragging = null;
    let dragMoved = false;
    const startDrag = (clientX, clientY)=>{
      const rect = previewEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const pos = safeObjectPosition(img.style.objectPosition || '50% 50%');
      const [xStr,yStr] = pos.split(' ');
      dragging = {
        startX: clientX,
        startY: clientY,
        startPosX: parseFloat(xStr),
        startPosY: parseFloat(yStr),
        width: rect.width,
        height: rect.height
      };
      dragMoved = false;
      previewEl.dataset.dragging = '0';
      previewEl.style.cursor = 'grabbing';
    };
    const moveDrag = (clientX, clientY)=>{
      if (!dragging) return;
      const dx = clientX - dragging.startX;
      const dy = clientY - dragging.startY;
      if (!dragMoved && (Math.abs(dx) + Math.abs(dy) > 2)) dragMoved = true;
      const nx = Math.max(0, Math.min(100, dragging.startPosX + (dx / dragging.width) * 100));
      const ny = Math.max(0, Math.min(100, dragging.startPosY + (dy / dragging.height) * 100));
      setPos(`${nx.toFixed(1)}% ${ny.toFixed(1)}%`);
    };
    const endDrag = ()=>{
      if (!dragging) return;
      dragging = null;
      previewEl.style.cursor = 'grab';
      if (dragMoved) {
        previewEl.dataset.dragging = '1';
        setTimeout(()=>{ previewEl.dataset.dragging = '0'; }, 0);
      }
      dragMoved = false;
    };
    const onClick = (ev)=>{
      if (previewEl.dataset.dragging === '1') {
        ev.preventDefault();
        ev.stopPropagation();
        previewEl.dataset.dragging = '0';
      }
    };
    previewEl.addEventListener('click', onClick);
    if (typeof window !== 'undefined' && 'PointerEvent' in window){
      previewEl.addEventListener('pointerdown', (ev)=>{
        if (ev.button !== undefined && ev.button !== 0) return;
        ev.preventDefault();
        startDrag(ev.clientX, ev.clientY);
        previewEl.setPointerCapture && previewEl.setPointerCapture(ev.pointerId);
      });
      previewEl.addEventListener('pointermove', (ev)=>{ if (dragging) moveDrag(ev.clientX, ev.clientY); });
      previewEl.addEventListener('pointerup', endDrag);
      previewEl.addEventListener('pointercancel', endDrag);
      previewEl.addEventListener('pointerleave', endDrag);
    }else{
      const onMouseMove = (ev)=>{ if (dragging) moveDrag(ev.clientX, ev.clientY); };
      const onMouseUp = ()=>{
        endDrag();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      previewEl.addEventListener('mousedown', (ev)=>{
        if (ev.button !== 0) return;
        ev.preventDefault();
        startDrag(ev.clientX, ev.clientY);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
      const onTouchMove = (ev)=>{
        if (!dragging) return;
        const t = ev.touches && ev.touches[0];
        if (t) moveDrag(t.clientX, t.clientY);
      };
      const onTouchEnd = ()=>{
        endDrag();
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      };
      previewEl.addEventListener('touchstart', (ev)=>{
        const t = ev.touches && ev.touches[0];
        if (!t) return;
        ev.preventDefault();
        startDrag(t.clientX, t.clientY);
        window.addEventListener('touchmove', onTouchMove, { passive:false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
      }, { passive:false });
    }
    previewEl.addEventListener('dragstart', (ev)=> ev.preventDefault());
  });
}

function findCardById(id){
  if (!cardsEl || !id) return null;
  const safe = escapeSelectorValue(id);
  return cardsEl.querySelector(`[data-card-id="${safe}"]`);
}

function applyCoverToDom(item, url){
  if (!item) return;
  const cover = safeUrl(url);
  if (!cover) return;
  item.cover = cover;
  const pos = safeObjectPosition(item.coverPos || item.cover_pos || '50% 50%');
  const coverThumb = buildThumbUrl(cover);
  const card = findCardById(item.id);
  if (!card) return;
  const coverBox = card.querySelector('.cover');
  if (coverBox){
    let img = coverBox.querySelector('img');
    if (!img){
      img = document.createElement('img');
      img.alt = item.name || '';
      coverBox.innerHTML = '';
      coverBox.appendChild(img);
    }
    img.src = coverThumb || cover;
    img.style.objectPosition = pos;
    img.loading = 'lazy';
    img.decoding = 'async';
  }
  const previewEl = card.querySelector('[data-admin-preview="cover"]');
  if (previewEl){
    const posInput = card.querySelector('[data-admin-field="coverPos"]');
    if (posInput && !posInput.value) posInput.value = pos;
    const hidden = card.querySelector('[data-admin-field="cover"]');
    if (hidden && !hidden.value) hidden.value = cover;
    previewEl.innerHTML = `<img src="${escapeHtml(cover)}" alt="" style="object-position:${escapeHtml(pos)};">`;
    initCoverPositionControls(previewEl);
  }
}

function ensureCover(item){
  if (!ALLOW_IG_COVER) return;
  if (!item || safeUrl(item.cover)) return;
  const igUrl = safeUrl(item.ig);
  if (!igUrl) return;
  let cacheKey = igUrl;
  try{
    const u = new URL(igUrl);
    u.search = '';
    u.hash = '';
    cacheKey = u.href;
  }catch(_){}
  if (coverCache.has(cacheKey)){
    const cached = coverCache.get(cacheKey);
    if (cached) applyCoverToDom(item, cached);
    return;
  }
  if (coverPending.has(cacheKey)) return;
  coverPending.add(cacheKey);
  fetch(`/api/ig/cover?url=${encodeURIComponent(cacheKey)}`, { cache:'no-store' })
    .then(async (res)=>{
      const data = await res.json().catch(()=>({}));
      const cover = data && data.cover ? safeUrl(data.cover) : '';
      if (res.ok && cover){
        coverCache.set(cacheKey, cover);
        applyCoverToDom(item, cover);
      }else{
        coverCache.set(cacheKey, '');
      }
    })
    .catch(()=>{ coverCache.set(cacheKey, ''); })
    .finally(()=>{ coverPending.delete(cacheKey); });
}

function loadCacheData(){
  try{
    const raw = localStorage.getItem(FOOD_CACHE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.items) || !cached.ts) return false;
    if ((Date.now() - cached.ts) > FOOD_CACHE_TTL) return false;
    DATA = cached.items.filter(it=>it && !it.deleted);
    dataReady = true;
    safeRender();
    openFoodFromUrl();
    return true;
  }catch(_){
    return false;
  }
}

function saveCacheData(items){
  try{
    localStorage.setItem(FOOD_CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      items
    }));
  }catch(_){}
}

function safeRender(){
  if (dataLoading && !dataReady){
    showLoadingState();
    return;
  }
  try{
    render();
  }catch(err){
    if (!cardsEl) return;
    cardsEl.innerHTML = `<div class="empty-state"><h3>${escapeHtml(t('loadFailTitle'))}</h3><p>${escapeHtml(t('loadFailDesc'))}</p></div>`;
  }
}

function showLoadingState(){
  if (!cardsEl) return;
  cardsEl.innerHTML = `<div class="empty-state"><h3>${escapeHtml(t('loadingTitle'))}</h3><p>${escapeHtml(t('loadingDesc'))}</p></div>`;
}

function setSyncIndicator(loading){
  if (!countSyncEl) return;
  countSyncEl.style.display = loading ? 'inline-flex' : 'none';
}

function setNearbyCollapsed(collapsed){
  if (!nearbyPanel) return;
  nearbyPanel.classList.toggle('collapsed', collapsed);
  if (nearbyBody) nearbyBody.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
  if (nearbyToggle){
    nearbyToggle.textContent = collapsed ? t('expand') : t('collapse');
    nearbyToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }
}
function showNearbyToggle(show){
  if (!nearbyToggle) return;
  nearbyToggle.style.display = show ? 'inline-flex' : 'none';
}
function isNearbyCollapsed(){
  return !!(nearbyPanel && nearbyPanel.classList.contains('collapsed'));
}

function updateMapPreview(coords, label){
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return;
  if (googleReady && googleMap && googleMarker){
    googleMap.setCenter(coords);
    googleMap.setZoom(14);
    googleMarker.setPosition(coords);
  }else if (nearbyMapEl){
    nearbyMapEl.textContent = label ? `${t('locating')} ${label}` : t('locating');
  }
}
function initGoogleMaps(){
  if (!window.google || !window.google.maps) return;
  googleReady = true;
  if (!nearbyMapEl) return;
  nearbyMapEl.textContent = '';
  googleMap = new google.maps.Map(nearbyMapEl, {
    center: { lat: 13.7563, lng: 100.5018 },
    zoom: 12,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy'
  });
  googleMarker = new google.maps.Marker({ map: googleMap });
  googleGeocoder = new google.maps.Geocoder();
  if (nearbyInput){
    googleAutocomplete = new google.maps.places.Autocomplete(nearbyInput, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'th' }
    });
    googleAutocomplete.addListener('place_changed', ()=>{
      const place = googleAutocomplete.getPlace();
      const loc = place && place.geometry && place.geometry.location;
      if (!loc) return;
      const coords = { lat: loc.lat(), lng: loc.lng() };
      const label = place.formatted_address || place.name || nearbyInput.value.trim();
      updateMapPreview(coords, label);
      runNearby(coords, label);
    });
  }
}
async function getGoogleMapsKey(){
  if (googleMapsKey) return googleMapsKey;
  try{
    const res = await fetch('/api/maps-key', { cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    if (res.ok && data && data.ok && data.key){
      googleMapsKey = data.key;
      return googleMapsKey;
    }
    if (nearbyMapEl){
      nearbyMapEl.textContent = res.status
        ? t('mapKeyFailStatus', { status: res.status })
        : t('mapKeyFail');
    }
  }catch(_){}
  return '';
}
async function ensureGoogleMaps(){
  if (googleReady && window.google && window.google.maps) return true;
  if (googleLoadingPromise) return googleLoadingPromise;
  
  googleLoadingPromise = new Promise(async (resolve) => {
    if (nearbyMapEl) nearbyMapEl.textContent = t('mapLoad');
    const key = await getGoogleMapsKey();
    if (!key){
      if (nearbyMapEl) nearbyMapEl.textContent = t('noKey');
      resolve(false);
      return;
    }
    if (window.google && window.google.maps) {
      initGoogleMaps();
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'googleMapsScript';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=initGoogleMaps&language=${encodeURIComponent(GOOGLE_MAPS_LANG)}`;
    
    // Hook callback
    const originalInit = window.initGoogleMaps;
    window.initGoogleMaps = () => {
      if (typeof originalInit === 'function') originalInit();
      resolve(true);
    };
    script.onerror = () => {
      if (nearbyMapEl) nearbyMapEl.textContent = t('mapFail');
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return googleLoadingPromise;
}
window.initGoogleMaps = initGoogleMaps;

function geocodeWithGoogle(query){
  if (!googleReady || !googleGeocoder) return Promise.resolve(null);
  return new Promise(resolve=>{
    googleGeocoder.geocode({ address: query }, (results, status)=>{
      if (status !== 'OK' || !results || !results[0]) return resolve(null);
      const loc = results[0].geometry.location;
      if (!loc) return resolve(null);
      resolve({ lat: loc.lat(), lng: loc.lng(), label: results[0].formatted_address || query });
    });
  });
}

let DATA = [];
let favs = [];
let isAdmin = false;
let isCreator = false;
let creatorInviteAllowed = false;
let creatorShareId = '';
let creatorShareName = '';
let creatorShareApplied = false;
let creatorInviteApplied = false;
let suppressCreatorShareClear = false;
let creatorId = '';
let creatorName = '';
let creatorIg = '';
let creatorYoutube = '';
let creatorFacebook = '';
let creatorTiktok = '';
let creatorIntro = '';
let creatorAvatar = '';
let creatorCover = '';
let creatorCoverPos = '50% 50%';
let creatorTermsAccepted = false;
let creatorTermsAcceptedAt = '';
let currentZone = 'all';
let editingId = '';
let newItem = null;
let currentLimit = 20;
const PAGE_SIZE = 20;
const CATEGORY_ORDER = [DAY_TRIP_CATEGORY,'日式料理','泰式料理','義式料理','中式料理','港點','餐酒館','酒吧','咖啡廳','早午餐','甜點','小吃','素食','buffet','其他'];
const CATEGORY_MAP_EN = {'一日遊':'Day Trip','日式料理':'Japanese','泰式料理':'Thai','義式料理':'Italian','中式料理':'Chinese','港點':'Dim Sum','餐酒館':'Bistro','酒吧':'Bar','咖啡廳':'Cafe','早午餐':'Brunch','甜點':'Dessert','小吃':'Street Food','素食':'Vegetarian','buffet':'Buffet','其他':'Other'};

function resetFilters(){
  currentLimit = PAGE_SIZE;
  if (kwInput) kwInput.value = '';
  if (fCat) fCat.value = '';
  if (fArea) fArea.value = '';
  if (fCreator) fCreator.value = '';
  if (fPrice) fPrice.value = '';
  if (fSort) fSort.value = '';
  if (fStatus) fStatus.value = '';
}

async function checkAdmin(){
  try{
    const res = await fetch('/api/auth/admin/me', { credentials:'include', cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    isAdmin = !!(data && data.ok && data.role === 'owner');
  }catch(_){
    isAdmin = false;
  }
  if (btnAdd) btnAdd.style.display = isAdmin ? 'inline-flex' : 'none';
  
  if (btnExport) btnExport.style.display = isAdmin ? 'inline-flex' : 'none';
  if (btnImport) btnImport.style.display = isAdmin ? 'inline-flex' : 'none';
  if (btnStats) btnStats.style.display = isAdmin ? 'inline-flex' : 'none';
  if (btnCreatorCode) btnCreatorCode.style.display = isAdmin ? 'inline-flex' : 'none';

  if (isAdmin) {
    // 匯出按鈕 (備份用)
    if (btnExport) {
      btnExport.onclick = () => {
        const json = JSON.stringify({ items: DATA, ts: Date.now() }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `food-map-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }

    // 匯入按鈕 (救援用)
    if (btnImport) {
      btnImport.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async ev => {
            try {
              let obj = JSON.parse(ev.target.result);
              // 處理從 console 複製時可能產生的雙重編碼字串 (例如 "{\"items\":...}")
              if (typeof obj === 'string') {
                try { obj = JSON.parse(obj); } catch(_) {}
              }
              const items = Array.isArray(obj) ? obj : (obj && obj.items || []);
              if (!items.length) return alert(t('importEmpty'));
              if (!confirm(t('importConfirm', { n: items.length }))) return;

              btnImport.textContent = t('importing');
              btnImport.disabled = true;
              
              // 使用批次同步接口寫入資料庫
              await fetch('/api/foods/sync', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({ items })
              });
              
              alert(t('importSuccess'));
              location.reload();
            } catch (err) {
              alert(t('importFail') + err.message);
              btnImport.textContent = t('import');
              btnImport.disabled = false;
            }
          };
          reader.readAsText(file);
        };
        input.click();
      };
    }

    // 副標題編輯按鈕
    const btnSub = document.getElementById('btnEditSubtitle');
    if (btnSub) {
      btnSub.style.display = 'inline-block';
      btnSub.onclick = async () => {
        const el = document.getElementById('pageSubtitle');
        const oldVal = el.textContent;
        const newVal = prompt(t('editSubPrompt'), oldVal);
        if (newVal && newVal !== oldVal) {
          try {
            const res = await fetch('/api/foods/meta', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              credentials: 'include',
              body: JSON.stringify({ subtitle: newVal })
            });
            const data = await res.json();
            if (data.ok) {
              el.textContent = newVal;
            } else {
              alert(t('saveFail') + (data.error || t('unknownError')));
            }
          } catch(e) {
            alert(t('saveFail') + e.message);
          }
        }
      };
    }

    // 流量統計按鈕
    if (btnStats) {
      btnStats.onclick = async () => {
        const statsModal = document.getElementById('statsModal');
        if (!statsModal) return;

        btnStats.disabled = true;
        btnStats.textContent = t('reading');
        try {
          // Ensure Chart.js is loaded
          if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }

          const res = await fetch('/api/admin/food-stats?days=14', { credentials: 'include' });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || t('readFail'));
          
          const statsModalBody = document.getElementById('statsModalBody');
          if (!statsModalBody) return;

          const labels = data.stats.map(s => s.date.slice(5));
          const counts = data.stats.map(s => s.count);
          const totalUsers = data.total || 0;

          statsModalBody.innerHTML = `
            <div style="padding:16px; display:grid; gap:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:18px; font-weight:800;">${escapeHtml(t('trafficStats'))}</div>
                <button class="modal-close" onclick="document.getElementById('statsModal').close()">${escapeHtml(t('close'))}</button>
              </div>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px;">
                <div style="font-size:12px; color:#64748b;">${escapeHtml(t('totalVisitors'))}</div>
                <div style="font-size:24px; font-weight:800; color:#0f172a;">${totalUsers.toLocaleString()} ${escapeHtml(t('personUnit'))}</div>
              </div>
              <div><canvas id="statsChartCanvas"></canvas></div>
            </div>
          `;
          
          statsModal.showModal();

          const ctx = document.getElementById('statsChartCanvas').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: t('dailyVisitors'), data: counts, backgroundColor: 'rgba(255, 90, 60, 0.6)', borderColor: 'rgba(255, 90, 60, 1)', borderWidth: 1 }] },
            options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false }, title: { display: true, text: t('past14Days') } } }
          });
        } catch (e) {
          alert(t('readFail') + e.message);
        } finally {
          btnStats.disabled = false;
          btnStats.textContent = t('stats');
        }
      };
    }
  }
}

function setLanguage(lang) {
  currentLang = lang;
  if (btnLang){
    btnLang.textContent = 'ZH/EN';
    btnLang.setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : 'Switch to English');
  }
  
  // Update static text
  document.querySelector('h1').textContent = t('title');
  const sub = document.getElementById('pageSubtitle');
  if (sub && (sub.textContent === TRANSLATIONS['zh']['subtitle'] || sub.textContent === TRANSLATIONS['en']['subtitle'])) {
    sub.textContent = t('subtitle');
  }
  if (btnBack) btnBack.textContent = t('home');
  if (btnFav) btnFav.textContent = t('fav');
  const memLabel = document.querySelector('.member-menu-label');
  if (memLabel) memLabel.textContent = t('memberLabel');
  const replaceLinkTextWithBadge = (link, text) => {
    if (!link) return;
    const badge = link.querySelector('span');
    link.textContent = '';
    link.append(document.createTextNode(text + (badge ? ' ' : '')));
    if (badge) link.appendChild(badge);
  };
  const profileLink = document.querySelector('a[data-profile]');
  if (profileLink) profileLink.textContent = t('profileInfo');
  replaceLinkTextWithBadge(document.getElementById('userCouponsLink'), t('myCoupons'));
  replaceLinkTextWithBadge(document.getElementById('userOrdersLink'), t('myOrders'));
  const storeLink = document.querySelector('a[href="/account-store"]');
  if (storeLink) storeLink.textContent = t('storeDefault');
  replaceLinkTextWithBadge(document.getElementById('adminQnaLink'), t('adminQna'));
  const adminPanelLink = document.querySelector('[data-admin-href="/admin"]');
  if (adminPanelLink) adminPanelLink.textContent = t('adminPanel');
  const authStatus = document.querySelector('[data-auth-status]');
  if (authStatus && (authStatus.textContent === TRANSLATIONS['zh']['authLoading'] || authStatus.textContent === TRANSLATIONS['en']['authLoading'] || !authStatus.textContent)) {
    authStatus.textContent = t('authLoading');
  }
  const authBtn = document.querySelector('[data-auth-btn]');
  if (authBtn) {
    const loggedIn = window.authState && typeof window.authState.isLoggedIn === 'function' && window.authState.isLoggedIn();
    authBtn.textContent = loggedIn ? t('logout') : t('login');
  }
  if (imageLightboxClose) imageLightboxClose.textContent = t('close');
  const adminToolsToggle = document.getElementById('adminToolsToggle');
  if (adminToolsToggle) {
    const adminPanel = document.getElementById('adminToolsPanel');
    const isOpen = adminPanel && adminPanel.style.display === 'block';
    adminToolsToggle.textContent = `${t('adminTools')} ${isOpen ? '▴' : '▾'}`;
  }
  const creatorToggle = document.getElementById('creatorToolsToggle');
  if (creatorToggle) {
    const creatorPanel = document.getElementById('creatorToolsPanel');
    const isOpen = creatorPanel && creatorPanel.style.display === 'grid';
    creatorToggle.textContent = `${t('creatorZone')} ${isOpen ? '▴' : '▾'}`;
  }
  
  // Dropdown
  const dropBtn = document.querySelector('#adminDropdown > button');
  if (dropBtn) dropBtn.textContent = t('more');
  if (btnAdd) btnAdd.textContent = t('add');
  if (btnExport) btnExport.textContent = t('export');
  if (btnImport) btnImport.textContent = t('import');
  if (btnStats) btnStats.textContent = t('stats');
  if (btnCreatorCode) btnCreatorCode.textContent = t('creatorInviteCreate');
  if (btnCreatorAdd) btnCreatorAdd.textContent = t('add');
  if (btnCreatorInvite) btnCreatorInvite.textContent = t('creatorInvite');
  if (btnCreatorProfile) btnCreatorProfile.textContent = t('creatorProfile');
  if (btnCreatorShare) btnCreatorShare.textContent = t('creatorShare');
  if (btnCreatorTerms) btnCreatorTerms.textContent = t('creatorTerms');
  const mapSwitchLink = document.querySelector('a[href="/templemap"]');
  if (mapSwitchLink) mapSwitchLink.textContent = t('mapSwitchTemple');
  const editSubtitleBtn = document.getElementById('btnEditSubtitle');
  if (editSubtitleBtn) editSubtitleBtn.title = t('editSub');
  const footerNote = document.querySelector('footer .footer-inner div:last-child');
  if (footerNote) footerNote.textContent = t('disclaimer');
  const toastEl = document.getElementById('saveToast');
  if (toastEl) toastEl.textContent = t('saved');
  if (countSyncEl) countSyncEl.textContent = t('syncing');
  const profileDialog = document.getElementById('profileDialog');
  if (profileDialog) {
    const header = profileDialog.querySelector('header');
    if (header) header.textContent = t('profileInfo');
    const labels = profileDialog.querySelectorAll('.body label');
    if (labels[0]) labels[0].textContent = t('profileName');
    if (labels[2]) labels[2].textContent = t('profilePhone');
    const profilePhoneEl = document.getElementById('profilePhone');
    if (profilePhoneEl) profilePhoneEl.placeholder = t('profilePhonePlaceholder');
    const hint = profileDialog.querySelector('.body .muted');
    if (hint) hint.textContent = t('profileHint');
    const profileCloseBtn = document.getElementById('profileClose');
    if (profileCloseBtn) profileCloseBtn.textContent = t('cancelBtn');
    const profileSaveBtn = document.getElementById('profileSave');
    if (profileSaveBtn) profileSaveBtn.textContent = t('saveBtn');
  }
  if (creatorProfileDialog){
    const header = creatorProfileDialog.querySelector('header');
    if (header) header.textContent = t('creatorProfileTitle');
    if (creatorProfileNameLabel) creatorProfileNameLabel.textContent = t('creatorProfileName');
    if (creatorProfileAvatarLabel) creatorProfileAvatarLabel.textContent = t('creatorProfileAvatar');
    if (creatorProfileCoverLabel) creatorProfileCoverLabel.textContent = t('creatorProfileCover');
    if (creatorProfileIgLabel) creatorProfileIgLabel.textContent = t('creatorProfileIg');
    if (creatorProfileYoutubeLabel) creatorProfileYoutubeLabel.textContent = t('creatorProfileYoutube');
    if (creatorProfileFacebookLabel) creatorProfileFacebookLabel.textContent = t('creatorProfileFacebook');
    if (creatorProfileTiktokLabel) creatorProfileTiktokLabel.textContent = t('creatorProfileTiktok');
    if (creatorProfileIntroLabel) creatorProfileIntroLabel.textContent = t('creatorProfileIntro');
    if (creatorProfileIg) creatorProfileIg.placeholder = t('creatorProfileIgPlaceholder');
    if (creatorProfileYoutube) creatorProfileYoutube.placeholder = t('creatorProfileYoutubePlaceholder');
    if (creatorProfileFacebook) creatorProfileFacebook.placeholder = t('creatorProfileFacebookPlaceholder');
    if (creatorProfileTiktok) creatorProfileTiktok.placeholder = t('creatorProfileTiktokPlaceholder');
    if (creatorProfileIntro) creatorProfileIntro.placeholder = t('creatorProfileIntroPlaceholder');
    if (creatorProfileClose) creatorProfileClose.textContent = t('cancelBtn');
    if (creatorProfileSave) creatorProfileSave.textContent = t('creatorProfileSave');
  }
  const previewTitle = document.querySelector('.creator-preview-title');
  if (previewTitle) previewTitle.textContent = t('creatorProfilePreview');
  if (creatorProfileAvatarPreview && !creatorProfileAvatarPreview.querySelector('img')) {
    creatorProfileAvatarPreview.textContent = t('creatorProfileAvatarHint');
  }
  if (creatorProfileCoverPreview && !creatorProfileCoverPreview.querySelector('img')) {
    creatorProfileCoverPreview.textContent = t('creatorProfileAvatarHint');
  }
  if (creatorAvatarSpecInline) creatorAvatarSpecInline.textContent = t('creatorAvatarSpec');
  if (creatorCoverSpecInline) creatorCoverSpecInline.textContent = t('creatorCoverSpec');
  if (creatorCoverHint) creatorCoverHint.textContent = t('creatorCoverDragHint');
  if (creatorTermsTitle) creatorTermsTitle.textContent = t('creatorTermsTitle');
  if (creatorTermsContent) creatorTermsContent.innerHTML = t('creatorTermsHtml');
  if (creatorTermsClose) creatorTermsClose.textContent = t('close');
  if (creatorTermsAgree) creatorTermsAgree.textContent = t('creatorTermsAgree');
  updateCreatorTermsUi();
  updateCreatorTermsDialogState();
  if (coordsHelpTitle) coordsHelpTitle.textContent = t('coordsHelpTitle');
  if (coordsHelpDesc) coordsHelpDesc.textContent = t('coordsHelpDesc');
  if (coordsHelpImage) coordsHelpImage.alt = t('coordsHelpImageAlt');
  if (coordsHelpClose) coordsHelpClose.textContent = t('close');
  renderCoordsHelpSteps();
  const backToTop = document.getElementById('btnBackToTop');
  if (backToTop) backToTop.title = t('backToTop');

  // Filters
  if (kwInput) kwInput.placeholder = t('searchPlaceholder');
  
  // Re-init filters to update options text
  initFilters();
  
  // Update select options text (hardcoded ones)
  if (fPrice && fPrice.options[0]) fPrice.options[0].textContent = t('allPrices');
  if (fStatus) {
    if (fStatus.options[0]) fStatus.options[0].textContent = t('status');
    if (fStatus.options[1]) fStatus.options[1].textContent = t('openNow');
  }
  if (fSort) {
    if (fSort.options[0]) fSort.options[0].textContent = t('sort');
    if (fSort.options[1]) fSort.options[1].textContent = t('distAsc');
    if (fSort.options[2]) fSort.options[2].textContent = t('ratingDesc');
    if (fSort.options[3]) fSort.options[3].textContent = t('nameAsc');
    if (fSort.options[4]) fSort.options[4].textContent = t('priceAsc');
    if (fSort.options[5]) fSort.options[5].textContent = t('priceDesc');
  }

  // Nearby
  const nearbyTitleEl = document.querySelector('.nearby-title');
  if (nearbyTitleEl) nearbyTitleEl.textContent = t('nearbyTitle');
  if (nearbyUse) nearbyUse.textContent = t('useLoc');
  if (nearbyToggle) nearbyToggle.textContent = isNearbyCollapsed() ? t('expand') : t('collapse');
  if (nearbyInput) nearbyInput.placeholder = t('nearbyPlaceholder');
  if (nearbySearch) nearbySearch.textContent = t('searchNearby');
  if (modeToggle) modeToggle.textContent = isMapMode ? t('listMode') : t('mapMode');
  if (nearbyStatus && (nearbyStatus.textContent === TRANSLATIONS['zh']['nearbyIdle'] || nearbyStatus.textContent === TRANSLATIONS['en']['nearbyIdle'] || !nearbyStatus.textContent)) {
    nearbyStatus.textContent = t('nearbyIdle');
  }
  if (nearbyMapEl && nearbyMapEl.childElementCount === 0) {
    nearbyMapEl.textContent = t('mapLoad');
  }

  safeRender();
}

function getOwnerName(item){
  return String(item && (item.ownerName || item.creatorName || item.creator || item.owner) || '').trim();
}

function updateCreatorFilterVisibility(){
  if (!fCreator) return;
  const showCreator = currentZone === 'creator';
  fCreator.style.display = showCreator ? '' : 'none';
  if (!showCreator) fCreator.value = '';
}

function renderZoneTabs(){
  if (!zoneTabs) return;
  zoneTabs.innerHTML = '';
  const zones = [
    { value: 'all', label: t('zoneAll') },
    { value: 'creator', label: t('creatorZone') }
  ];
  if (isCreator) zones.push({ value:'mine', label: t('myZone') });
  zones.forEach(z => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zone-tab';
    btn.textContent = z.label;
    btn.dataset.value = z.value;
    btn.addEventListener('click', ()=>{
      currentZone = z.value;
      currentLimit = PAGE_SIZE;
      updateCreatorFilterVisibility();
      safeRender();
    });
    zoneTabs.appendChild(btn);
  });
  zoneTabs.querySelectorAll('.zone-tab').forEach(btn=>{
    btn.classList.toggle('active', (btn.dataset.value || 'all') === currentZone);
  });
  updateCreatorFilterVisibility();
}

async function checkCreator(){
  try{
    const res = await fetch('/api/creator/status', { credentials:'include', cache:'no-store' });
    const data = await res.json().catch(()=>({}));
    isCreator = !!(data && data.creator);
    creatorInviteAllowed = !!(data && data.inviteAllowed);
    creatorId = data && data.id ? String(data.id) : '';
    creatorName = data && data.name ? String(data.name) : '';
    creatorIg = data && data.ig ? String(data.ig) : '';
    creatorYoutube = data && data.youtube ? String(data.youtube) : '';
    creatorFacebook = data && data.facebook ? String(data.facebook) : '';
    creatorTiktok = data && data.tiktok ? String(data.tiktok) : '';
    creatorIntro = data && data.intro ? String(data.intro) : '';
    creatorAvatar = data && data.avatar ? String(data.avatar) : '';
    creatorCover = data && data.cover ? String(data.cover) : '';
    creatorCoverPos = data && data.coverPos ? String(data.coverPos) : creatorCoverPos;
    creatorTermsAccepted = !!(data && data.termsAccepted);
    creatorTermsAcceptedAt = data && data.termsAcceptedAt ? String(data.termsAcceptedAt) : '';
  }catch(_){
    isCreator = false;
    creatorInviteAllowed = false;
    creatorId = '';
    creatorName = '';
    creatorIg = '';
    creatorYoutube = '';
    creatorFacebook = '';
    creatorTiktok = '';
    creatorIntro = '';
    creatorAvatar = '';
    creatorCover = '';
    creatorCoverPos = '50% 50%';
    creatorTermsAccepted = false;
    creatorTermsAcceptedAt = '';
  }
  if (btnCreatorAdd) btnCreatorAdd.style.display = isCreator ? 'inline-flex' : 'none';
  if (btnCreatorInvite) btnCreatorInvite.style.display = (!isCreator && creatorInviteAllowed) ? 'inline-flex' : 'none';
  if (btnCreatorProfile) btnCreatorProfile.style.display = isCreator ? 'inline-flex' : 'none';
  if (btnCreatorShare) btnCreatorShare.style.display = isCreator ? 'inline-flex' : 'none';
  if (isCreator){
    if (creatorProfileName) creatorProfileName.value = creatorName || '';
    if (creatorProfileAvatarUrl) creatorProfileAvatarUrl.value = creatorAvatar || '';
    if (creatorProfileCoverUrl) creatorProfileCoverUrl.value = creatorCover || '';
    if (creatorProfileCoverPos) creatorProfileCoverPos.value = creatorCoverPos || '50% 50%';
    if (creatorProfileIg) creatorProfileIg.value = creatorIg || '';
    if (creatorProfileYoutube) creatorProfileYoutube.value = creatorYoutube || '';
    if (creatorProfileFacebook) creatorProfileFacebook.value = creatorFacebook || '';
    if (creatorProfileTiktok) creatorProfileTiktok.value = creatorTiktok || '';
    if (creatorProfileIntro) creatorProfileIntro.value = creatorIntro || '';
    setImagePreviewFromUrl(creatorProfileAvatarPreview, creatorProfileAvatarSize, creatorAvatar, t('creatorProfileAvatarHint'));
    setImagePreviewFromUrl(creatorProfileCoverPreview, creatorProfileCoverSize, creatorCover, t('creatorProfileAvatarHint'));
    applyCreatorCoverPos(creatorCoverPos || '50% 50%');
    updateCreatorProfilePreview();
  }
  if (creatorToolsToggle){
    creatorToolsToggle.style.display = (isCreator || creatorInviteAllowed) ? 'block' : 'none';
    const panelOpen = creatorToolsPanel && creatorToolsPanel.style.display === 'grid';
    creatorToolsToggle.textContent = `${t('creatorZone')} ${panelOpen ? '▴' : '▾'}`;
  }
  updateCreatorTermsUi();
  updateCreatorTermsDialogState();
  if (!isCreator && !creatorInviteAllowed && creatorToolsPanel){
    creatorToolsPanel.style.display = 'none';
  }
  renderZoneTabs();
  safeRender();
}

function initFilters(){
  const source = Array.isArray(DATA) ? DATA.filter(item=>item && typeof item === 'object' && !item.deleted) : [];
  const prevCreator = fCreator ? fCreator.value : '';
  fCat.innerHTML = `<option value="">${escapeHtml(t('allCats'))}</option>`;
  fArea.innerHTML= `<option value="">${escapeHtml(t('allAreas'))}</option>`;
  if (fCreator) fCreator.innerHTML = `<option value="">${escapeHtml(t('allCreators'))}</option>`;
  const cats = Array.from(new Set(source.map(d=>mapCategory(d.category)).filter(Boolean)))
    .sort((a,b)=>{
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  if (catTabs){
    catTabs.innerHTML = '';
    const tabAll = document.createElement('button');
    tabAll.type = 'button';
    tabAll.className = 'cat-tab';
    tabAll.textContent = t('allCats');
    tabAll.dataset.value = '';
    catTabs.appendChild(tabAll);
    cats.forEach(c=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-tab';
      // Translate category if possible
      const displayC = currentLang === 'en' ? (CATEGORY_MAP_EN[c] || c) : c;
      btn.textContent = displayC;
      btn.dataset.value = c;
      catTabs.appendChild(btn);
    });
    catTabs.querySelectorAll('.cat-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        fCat.value = btn.dataset.value || '';
        currentLimit = PAGE_SIZE;
        safeRender();
      });
    });
  }
  fCat.options[0].textContent = t('allCats');
  cats.forEach(c=>{ 
    const opt=document.createElement('option');opt.value=c;
    opt.textContent= currentLang === 'en' ? (CATEGORY_MAP_EN[c] || c) : c;
    fCat.appendChild(opt); 
  });
  fArea.options[0].textContent = t('allAreas');
  const areas = Array.from(new Set(source.map(d=>d.area).filter(Boolean))).sort();
  areas.forEach(a=>{ const opt=document.createElement('option');opt.value=a;opt.textContent=a;fArea.appendChild(opt); });
  if (fCreator){
    const creators = Array.from(new Set(source.map(getOwnerName).filter(Boolean))).sort();
    creators.forEach(name=>{
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      fCreator.appendChild(opt);
    });
    if (prevCreator && creators.includes(prevCreator)) fCreator.value = prevCreator;
  }
  renderZoneTabs();
}

function mapCategory(value){
  const v = String(value || '');
  if (!v) return '';
  if (isDayTripCategory(v)) return DAY_TRIP_CATEGORY;
  if (v.toLowerCase().includes('buffet')) return 'buffet';
  if (v.includes('素食') || v.includes('蔬食')) return '素食';
  if (v.includes('日式')) return '日式料理';
  if (v.includes('泰式')) return '泰式料理';
  if (v.includes('義式')) return '義式料理';
  if (v.includes('中式')) return '中式料理';
  if (v.includes('港點')) return '港點';
  if (v.includes('餐酒')) return '餐酒館';
  if (v.includes('咖啡')) return '咖啡廳';
  if (v.includes('酒吧') || v.includes('精釀')) return '酒吧';
  if (v.includes('早午餐') || v.includes('全日')) return '早午餐';
  if (v.includes('甜點') || v.includes('果汁') || v.includes('烘焙')) return '甜點';
  if (v.includes('小吃') || v.includes('在地') || v.includes('麵店') || v.includes('宵夜')) return '小吃';
  if (v.includes('火鍋')) return '中式料理';
  if (v.includes('燒臘') || v.includes('烤鴨')) return '中式料理';
  if (v.includes('牛排')) return '餐酒館';
  return '其他';
}

function renderSummary(currentList){
  if (!totalCountEl || !categoryCountsEl) return;
  const allItems = Array.isArray(DATA) ? DATA.filter(item=>item && !item.deleted) : [];
  const totalAll = allItems.length;
  const shown = Array.isArray(currentList) ? currentList.length : totalAll;
  totalCountEl.textContent = (shown !== totalAll && totalAll)
    ? `${t('totalCount', {n: shown})} / ${totalAll}`
    : t('totalCount', {n: totalAll});

  const counts = new Map();
  allItems.forEach(item=>{
    const cat = mapCategory(item.category) || item.category || '其他';
    counts.set(cat, (counts.get(cat) || 0) + 1);
  });
  const cats = Array.from(counts.keys()).sort((a,b)=>{
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  categoryCountsEl.innerHTML = cats.map(cat=>{
    const count = counts.get(cat) || 0;
    const displayCat = currentLang === 'en' ? (CATEGORY_MAP_EN[cat] || cat) : cat;
    return `<span class="count-pill">${escapeHtml(displayCat)} ${count}/${totalAll}</span>`;
  }).join('');
}

const GEO_CACHE_KEY = 'food_map_geo_cache_v1';
const NEARBY_MAX_KM = 20;
const NEARBY_LOOKUP_LIMIT = 10;
const NEARBY_LOOKUP_MAX = 40;
const GEO_CACHE_TTL = 1000 * 60 * 60 * 24 * 45;
const geoCache = (()=>{ try{ return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}') || {}; }catch(_){ return {}; } })();
let geoSaveTimer = null;
const geoQueryCache = new Map();
const geoQueryPending = new Map();

function markGeoCacheDirty(){
  if (geoSaveTimer) return;
  geoSaveTimer = setTimeout(()=>{
    try{ localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoCache)); }catch(_){}
    geoSaveTimer = null;
  }, 1200);
}
function parseLatLngPair(lat, lng){
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;
  return { lat: latNum, lng: lngNum };
}
function parseLatLngInput(input){
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/，/g, ',');
  const parts = normalized.split(/[,\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  return parseLatLngPair(parts[0], parts[1]);
}
function normalizeListField(value){
  if (Array.isArray(value)) {
    return value.map(v=>String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,，]/).map(v=>v.trim()).filter(Boolean);
  }
  return [];
}
function isDayTripCategory(value){
  const raw = String(value || '').trim().toLowerCase();
  return raw.includes(DAY_TRIP_CATEGORY) || raw.includes('一日游') || raw.includes('day trip') || raw.includes('daytrip') || raw.includes('day_trip');
}
function normalizeDayTripStops(value){
  if (!value) return [];
  let list = value;
  if (typeof value === 'string') {
    try{
      list = JSON.parse(value);
    }catch(_){
      list = value.split(/\n+/).map(line => ({ maps: line }));
    }
  }
  if (!Array.isArray(list)) return [];
  const normalized = list.map((entry, idx)=>{
    if (typeof entry === 'string') {
      const maps = String(entry || '').trim();
      if (!maps) return null;
      return { name:'', maps, note:'', order: idx + 1 };
    }
    if (!entry || typeof entry !== 'object') return null;
    const name = String(entry.name || entry.title || '').trim();
    const maps = String(entry.maps || entry.mapsUrl || entry.map || entry.url || entry.link || entry.address || '').trim();
    const note = String(entry.note || entry.memo || '').trim();
    const orderRaw = Number(entry.order || entry.seq || entry.index);
    const order = Number.isFinite(orderRaw) ? orderRaw : idx + 1;
    if (!name && !maps) return null;
    return { name, maps, note, order };
  }).filter(Boolean);
  return normalized.sort((a, b)=> (a.order || 0) - (b.order || 0));
}
function parseDayTripBulk(text){
  const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  const stops = [];
  lines.forEach((line, idx)=>{
    let name = '';
    let maps = '';
    const urlMatch = line.match(/https?:\/\/\S+/);
    if (urlMatch) {
      maps = urlMatch[0];
      name = line.replace(urlMatch[0], '').replace(/[|｜]/g, '').trim();
    } else if (line.includes('|') || line.includes('｜')) {
      const parts = line.split(/[|｜]/).map(part => part.trim()).filter(Boolean);
      name = parts[0] || '';
      maps = parts[1] || '';
    } else {
      name = line;
    }
    if (!name && !maps) return;
    stops.push({ name, maps, note:'', order: idx + 1 });
  });
  return stops;
}
function normalizeGalleryItems(list){
  if (!Array.isArray(list)) return [];
  return list.map((entry)=>{
    if (!entry) return null;
    if (typeof entry === 'string') {
      const url = safeUrl(entry);
      if (!url) return null;
      return { url, pos: '50% 50%' };
    }
    if (typeof entry === 'object') {
      const url = safeUrl(entry.url || entry.src || entry.image || entry.link || entry.href || entry.value || '');
      if (!url) return null;
      const pos = safeObjectPosition(entry.pos || entry.position || entry.objectPosition || '50% 50%');
      return { url, pos };
    }
    return null;
  }).filter(Boolean);
}
function buildAdminGalleryItemHtml(item){
  if (!item || !item.url) return '';
  const pos = safeObjectPosition(item.pos || '50% 50%');
  return `
    <div class="admin-gallery-item" data-gallery-item data-gallery-url="${escapeHtml(item.url)}" data-gallery-pos="${escapeHtml(pos)}" draggable="true">
      <img src="${escapeHtml(item.url)}" alt="" style="object-position:${escapeHtml(pos)};">
      <button class="admin-gallery-handle" type="button" data-gallery-handle title="${escapeHtml(t('dayTripDrag'))}" aria-label="${escapeHtml(t('dayTripDrag'))}">⋮⋮</button>
      <button class="admin-gallery-remove" type="button" data-admin-gallery-remove title="${escapeHtml(t('removeBtn'))}" aria-label="${escapeHtml(t('removeBtn'))}">×</button>
    </div>
  `;
}
function getGalleryItemsFromList(listEl){
  if (!listEl) return [];
  return Array.from(listEl.querySelectorAll('[data-gallery-url]'))
    .map(el => ({
      url: el.getAttribute('data-gallery-url') || '',
      pos: el.getAttribute('data-gallery-pos') || ''
    }))
    .map(entry => ({
      url: safeUrl(entry.url),
      pos: safeObjectPosition(entry.pos || '50% 50%')
    }))
    .filter(entry => entry.url);
}
function renderAdminGalleryList(listEl, items){
  if (!listEl) return;
  const cleaned = normalizeGalleryItems(items);
  if (!cleaned.length){
    listEl.innerHTML = `<div class="admin-gallery-empty">${escapeHtml(t('galleryEmpty'))}</div>`;
    return;
  }
  listEl.innerHTML = cleaned.map(buildAdminGalleryItemHtml).join('');
}
function getGalleryAfterElement(container, x, y){
  const elements = Array.from(container.querySelectorAll('[data-gallery-item]:not(.is-dragging)'));
  let closest = { distance: Number.POSITIVE_INFINITY, element: null };
  elements.forEach(child => {
    const box = child.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < closest.distance) {
      closest = { distance: dist, element: child };
    }
  });
  return closest.element;
}
function initGalleryItem(item){
  if (!item || item.dataset.dragReady === '1') return;
  item.dataset.dragReady = '1';
  const img = item.querySelector('img');
  if (img){
    img.draggable = false;
    const setPos = (pos)=>{
      const safe = safeObjectPosition(pos || '50% 50%');
      img.style.objectPosition = safe;
      item.setAttribute('data-gallery-pos', safe);
    };
    setPos(item.getAttribute('data-gallery-pos') || '50% 50%');
    let dragging = null;
    let dragMoved = false;
    const startDrag = (clientX, clientY)=>{
      const rect = item.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const pos = safeObjectPosition(img.style.objectPosition || '50% 50%');
      const [xStr,yStr] = pos.split(' ');
      dragging = {
        startX: clientX,
        startY: clientY,
        startPosX: parseFloat(xStr),
        startPosY: parseFloat(yStr),
        width: rect.width,
        height: rect.height
      };
      dragMoved = false;
      item.dataset.dragging = '0';
      item.style.cursor = 'grabbing';
    };
    const moveDrag = (clientX, clientY)=>{
      if (!dragging) return;
      const dx = clientX - dragging.startX;
      const dy = clientY - dragging.startY;
      if (!dragMoved && (Math.abs(dx) + Math.abs(dy) > 2)) dragMoved = true;
      const nx = Math.max(0, Math.min(100, dragging.startPosX + (dx / dragging.width) * 100));
      const ny = Math.max(0, Math.min(100, dragging.startPosY + (dy / dragging.height) * 100));
      setPos(`${nx.toFixed(1)}% ${ny.toFixed(1)}%`);
    };
    const endDrag = ()=>{
      if (!dragging) return;
      dragging = null;
      item.style.cursor = '';
      if (dragMoved) {
        item.dataset.dragging = '1';
        setTimeout(()=>{ item.dataset.dragging = '0'; }, 0);
      }
      dragMoved = false;
    };
    const onClick = (ev)=>{
      if (item.dataset.dragging === '1') {
        ev.preventDefault();
        ev.stopPropagation();
        item.dataset.dragging = '0';
      }
    };
    item.addEventListener('click', onClick);
    if (typeof window !== 'undefined' && 'PointerEvent' in window){
      img.addEventListener('pointerdown', (ev)=>{
        if (ev.button !== undefined && ev.button !== 0) return;
        ev.preventDefault();
        startDrag(ev.clientX, ev.clientY);
        img.setPointerCapture && img.setPointerCapture(ev.pointerId);
      });
      img.addEventListener('pointermove', (ev)=>{ if (dragging) moveDrag(ev.clientX, ev.clientY); });
      img.addEventListener('pointerup', endDrag);
      img.addEventListener('pointercancel', endDrag);
      img.addEventListener('pointerleave', endDrag);
    }else{
      const onMouseMove = (ev)=>{ if (dragging) moveDrag(ev.clientX, ev.clientY); };
      const onMouseUp = ()=>{
        endDrag();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      img.addEventListener('mousedown', (ev)=>{
        if (ev.button !== 0) return;
        ev.preventDefault();
        startDrag(ev.clientX, ev.clientY);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
      const onTouchMove = (ev)=>{
        if (!dragging) return;
        const t = ev.touches && ev.touches[0];
        if (t) moveDrag(t.clientX, t.clientY);
      };
      const onTouchEnd = ()=>{
        endDrag();
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      };
      img.addEventListener('touchstart', (ev)=>{
        const t = ev.touches && ev.touches[0];
        if (!t) return;
        ev.preventDefault();
        startDrag(t.clientX, t.clientY);
        window.addEventListener('touchmove', onTouchMove, { passive:false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
      }, { passive:false });
    }
    img.addEventListener('dragstart', (ev)=> ev.preventDefault());
  }
  item.addEventListener('dragstart', (event)=>{
    if (!event.target.closest('[data-gallery-handle]')) {
      event.preventDefault();
      return;
    }
    item.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'gallery');
    }
  });
  item.addEventListener('dragend', ()=>{
    item.classList.remove('is-dragging');
  });
}
function parseTimeMinutes(value){
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 24 || minute < 0 || minute >= 60) return null;
  if (hour === 24 && minute !== 0) return null;
  return hour * 60 + minute;
}
function parsePlaceTime(value){
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{3,4}$/.test(raw)){
    const padded = raw.padStart(4, '0');
    return parseTimeMinutes(`${padded.slice(0,2)}:${padded.slice(2)}`);
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) return parseTimeMinutes(raw);
  return null;
}
function formatTimeMinutes(value){
  if (!Number.isFinite(value)) return '';
  const minutes = Math.round(value);
  if (minutes === 1440) return '24:00';
  const safe = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(safe / 60) % 24;
  const minute = Math.abs(safe % 60);
  return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}
function formatHoursFromOpening(opening){
  if (!opening) return '';
  const weekdayText = Array.isArray(opening.weekday_text) ? opening.weekday_text.join(' ') : '';
  if (/(Open 24 hours|24 hours|24 小時|24小時|24小时|24\s*hr|24\s*h|24\/7|24-7)/i.test(weekdayText)) {
    return currentLang === 'en' ? '24 hours' : '24 小時';
  }
  const periods = Array.isArray(opening.periods) ? opening.periods : [];
  if (!periods.length) return '';
  if (periods.some(p=>{
    const openMin = parsePlaceTime(p && p.open && p.open.time);
    const closeMin = parsePlaceTime(p && p.close && p.close.time);
    return openMin === 0 && closeMin === 0;
  })) {
    return currentLang === 'en' ? '24 hours' : '24 小時';
  }
  let minOpen = null;
  let maxClose = null;
  periods.forEach(p=>{
    const openMin = parsePlaceTime(p && p.open && p.open.time);
    const closeMin = parsePlaceTime(p && p.close && p.close.time);
    if (openMin === null || closeMin === null) return;
    if (minOpen === null || openMin < minOpen) minOpen = openMin;
    let closeVal = closeMin;
    if (closeVal < openMin) closeVal += 1440;
    if (maxClose === null || closeVal > maxClose) maxClose = closeVal;
  });
  if (minOpen === null || maxClose === null) return '';
  const endMin = maxClose > 1440 ? maxClose - 1440 : maxClose;
  return `${formatTimeMinutes(minOpen)}-${formatTimeMinutes(endMin)}`;
}
function inferOpenSlotsFromHours(hoursText){
  const raw = String(hoursText || '').trim();
  if (!raw) return [];
  if (/(24\s*小時|24\s*hr|24\s*h|24\/7|24-7|all\s*day|全天|全日)/i.test(raw)) {
    return ['morning', 'noon', 'afternoon', 'evening', 'night'];
  }
  if (/(休息|公休|店休|暫停營業|歇業|closed)/i.test(raw)) return [];

  const ranges = [];
  const rangeRegex = /(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?\s*(?:-|–|—|~|～|〜|到|至|－)\s*(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?/g;
  let match;
  while ((match = rangeRegex.exec(raw)) !== null) {
    const start = parseTimeMinutes(`${match[1]}:${match[2] || '00'}`);
    const end = parseTimeMinutes(`${match[3]}:${match[4] || '00'}`);
    if (start === null || end === null) continue;
    if (start === end) continue;
    ranges.push([start, end]);
  }
  if (!ranges.length) return [];

  const slotWindows = {
    morning: [[360, 600]],
    noon: [[600, 840]],
    afternoon: [[840, 1080]],
    evening: [[1080, 1320]],
    night: [[1320, 1440], [0, 180]]
  };
  const slotOrder = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const chosen = new Set();
  const overlaps = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

  ranges.forEach(([start, end])=>{
    const segments = end > start ? [[start, end]] : [[start, 1440], [0, end]];
    segments.forEach(([segStart, segEnd])=>{
      slotOrder.forEach(slot=>{
        const windows = slotWindows[slot] || [];
        windows.forEach(([winStart, winEnd])=>{
          if (overlaps(segStart, segEnd, winStart, winEnd)) {
            chosen.add(slot);
          }
        });
      });
    });
  });
  return slotOrder.filter(slot=>chosen.has(slot));
}
function parseItemTimestamp(value){
  if (!value) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value > 1e12 ? value : value * 1000;
  }
  const text = String(value || '').trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return parsed;
  const num = Number(text);
  if (!Number.isNaN(num)) return num > 1e12 ? num : num * 1000;
  return null;
}
function getItemTimestamp(item){
  if (!item) return 0;
  const created = parseItemTimestamp(item.createdAt || item.created_at || item.publishedAt || item.published_at);
  if (created) return created;
  const updated = parseItemTimestamp(item.updatedAt || item.updated_at || item.updated || item.ts || item.timestamp || item.time);
  return updated || 0;
}
function extractLatLngFromText(text){
  const m = String(text || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  return m ? parseLatLngPair(m[1], m[2]) : null;
}
function extractLatLngFromMaps(url){
  const raw = safeUrl(url);
  if (!raw) return null;
  try{
    const u = new URL(raw);
    const atMatch = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return parseLatLngPair(atMatch[1], atMatch[2]);
    const dataMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) return parseLatLngPair(dataMatch[1], dataMatch[2]);
    const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('ll') || '';
    const pair = extractLatLngFromText(q);
    if (pair) return pair;
    return null;
  }catch(_){
    return extractLatLngFromText(raw);
  }
}
function extractMapsQuery(url){
  const raw = safeUrl(url);
  if (!raw) return '';
  try{
    const u = new URL(raw);
    const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
    return q || '';
  }catch(_){
    return '';
  }
}
function extractPlaceIdFromMapsUrl(url){
  const raw = safeUrl(url);
  if (!raw) return '';
  try{
    const u = new URL(raw);
    const direct = u.searchParams.get('place_id') || u.searchParams.get('query_place_id') || '';
    if (direct) return direct;
    const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
    if (!q) return '';
    const match = q.match(/place_id:([^\s]+)/);
    return match ? match[1] : '';
  }catch(_){
    return '';
  }
}
function extractPlaceNameFromMapsUrl(url){
  const raw = safeUrl(url);
  if (!raw) return '';
  try{
    const u = new URL(raw);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('place');
    if (idx !== -1 && parts[idx + 1]){
      return decodeURIComponent(parts[idx + 1]).replace(/\+/g, ' ');
    }
  }catch(_){}
  return '';
}
function buildPlaceQueryFromInputs(maps, name, area){
  const fromMaps = extractMapsQuery(maps) || extractPlaceNameFromMapsUrl(maps);
  if (fromMaps) return fromMaps;
  const baseName = String(name || '').trim();
  if (!baseName) return '';
  const baseArea = String(area || '').trim();
  const suffix = baseArea ? ` ${baseArea} Thailand` : ' Thailand';
  return baseName + suffix;
}
function storeCoords(item, coords){
  if (!coords || !item) return null;
  if (item.id){
    geoCache[item.id] = { lat: coords.lat, lng: coords.lng, ts: Date.now() };
    markGeoCacheDirty();
  }
  item.lat = coords.lat;
  item.lng = coords.lng;
  return coords;
}
function getCachedCoords(item){
  if (!item) return null;
  const own = parseLatLngPair(item.lat, item.lng);
  if (own) return own;
  const cached = item.id ? geoCache[item.id] : null;
  if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)){
    if (!cached.ts || (Date.now() - cached.ts) < GEO_CACHE_TTL){
      return parseLatLngPair(cached.lat, cached.lng);
    }
  }
  const fromMaps = extractLatLngFromMaps(item.maps);
  if (fromMaps) return storeCoords(item, fromMaps);
  return null;
}
async function geocodeQuery(query){
  const q = String(query || '').trim();
  if (!q) return null;
  const key = q.toLowerCase();
  if (geoQueryCache.has(key)) return geoQueryCache.get(key);
  if (geoQueryPending.has(key)) return geoQueryPending.get(key);
  const controller = new AbortController();
  const timeout = setTimeout(()=> controller.abort(), 3500);
  const task = fetch(`/api/geo?q=${encodeURIComponent(q)}`, { cache:'no-store', signal: controller.signal })
    .then(res=>res.json().catch(()=>({ ok:false })))
    .then(data=>{
      clearTimeout(timeout);
      if (data && data.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)){
        const coords = { lat: Number(data.lat), lng: Number(data.lng) };
        geoQueryCache.set(key, coords);
        return coords;
      }
      return null;
    })
    .catch(()=>null)
    .finally(()=>{ geoQueryPending.delete(key); });
  geoQueryPending.set(key, task);
  return task;
}
function buildGeocodeQuery(item){
  const fromMap = extractMapsQuery(item.maps);
  if (fromMap) return fromMap;
  const place = extractPlaceNameFromMapsUrl(item.maps);
  if (place) return place;
  const addr = String(item.address || '').trim();
  if (addr) return addr;
  const name = String(item.name || '').trim();
  if (!name) return '';
  const area = String(item.area || '').trim();
  const suffix = area ? ` ${area} Thailand` : ' Thailand';
  return name + suffix;
}
async function resolveItemCoords(item){
  const cached = getCachedCoords(item);
  if (cached) return cached;
  const query = buildGeocodeQuery(item);
  if (!query) return null;
  const coords = await geocodeQuery(query);
  return coords ? storeCoords(item, coords) : null;
}
function haversineKm(a, b){
  const r = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
function formatDistance(km){
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
function filterRankByDistance(origin, entries){
  return entries
    .map(entry=>({
      item: entry.item,
      distance: haversineKm(origin, entry.coords)
    }))
    .filter(entry=>Number.isFinite(entry.distance) && entry.distance <= NEARBY_MAX_KM)
    .sort((a,b)=>a.distance - b.distance);
}
function getNearbyFromCached(origin, limit=5){
  const items = getActiveItems();
  const resolved = [];
  items.forEach(item=>{
    const coords = getCachedCoords(item);
    if (coords) resolved.push({ item, coords });
  });
  const ranked = filterRankByDistance(origin, resolved);
  return ranked.slice(0, limit);
}
function getActiveItems(){
  const source = Array.isArray(DATA) ? DATA : [];
  return source.filter(item=>item && !item.deleted);
}
async function getNearbyRestaurants(origin, limit=5){
  const items = getActiveItems();
  const resolved = [];
  const pending = [];
  items.forEach(item=>{
    const coords = getCachedCoords(item);
    if (coords) resolved.push({ item, coords });
    else pending.push(item);
  });
  let ranked = filterRankByDistance(origin, resolved);
  if (!pending.length) return ranked.slice(0, limit);

  let offset = 0;
  let looked = 0;
  const maxLookups = Math.max(NEARBY_LOOKUP_MAX, limit * 6);
  while (offset < pending.length && looked < maxLookups){
    const batch = pending.slice(offset, offset + NEARBY_LOOKUP_LIMIT);
    offset += NEARBY_LOOKUP_LIMIT;
    looked += batch.length;
    const coordsList = await Promise.all(batch.map(item=> resolveItemCoords(item)));
    coordsList.forEach((coords, idx)=>{
      if (coords) resolved.push({ item: batch[idx], coords });
    });
    ranked = filterRankByDistance(origin, resolved);
  }
  return ranked.slice(0, limit);
}
function renderNearbyList(list){
  if (!nearbyList) return 0;
  const source = Array.isArray(list) ? list.filter(entry=> entry && entry.item) : [];
  const deduped = [];
  const seen = new Set();
  source.forEach((entry)=>{
    const item = entry.item;
    const key = item && (item.id || item.name);
    if (key){
      if (seen.has(key)) return;
      seen.add(key);
    }
    deduped.push(entry);
  });
  if (!deduped.length){
    nearbyList.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'nearby-empty';
    empty.textContent = t('nearbyEmpty');
    nearbyList.appendChild(empty);
    return 0;
  }
  nearbyList.innerHTML = deduped.map(entry=>{
    const item = entry.item;
    const mapsUrl = safeUrl(item.maps);
    let displayCat = mapCategory(item.category) || item.category || '';
    if (currentLang === 'en') displayCat = CATEGORY_MAP_EN[displayCat] || displayCat;
    const distance = formatDistance(entry.distance);
    return `
      <div class="nearby-item">
        <div>
          <div class="nearby-name">${escapeHtml(item.name || '')}</div>
          <div class="nearby-meta">${escapeHtml(distance)} · ${escapeHtml(displayCat)} · ${escapeHtml(item.area || '')}</div>
        </div>
        <div class="nearby-actions">
          <button class="nearby-btn primary" type="button" data-nearby-open="${escapeHtml(item.id || '')}">${t('viewBtn')}</button>
          ${mapsUrl ? `<a class="nearby-btn" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">${t('navBtn')}</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
  nearbyList.querySelectorAll('[data-nearby-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-nearby-open');
      if (id) openModal(id);
    });
  });
  return deduped.length;
}

function isOpenNow(hoursStr) {
  if (!hoursStr) return false;
  const s = String(hoursStr).trim();
  if (s.includes('24 小時') || s.includes('24 hours')) return true;
  if (s.includes('休息') || s.includes('Closed')) return false;
  
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();

  if (s.includes('開始') || s.includes('Starts')) {
    const m = s.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      const start = parseInt(m[1])*60 + parseInt(m[2]);
      return current >= start;
    }
  }
  const ranges = s.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g);
  if (ranges) {
    for (const range of ranges) {
      const m = range.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (m) {
        const start = parseInt(m[1])*60 + parseInt(m[2]);
        let end = parseInt(m[3])*60 + parseInt(m[4]);
        if (end < start) end += 24 * 60;
        let c = current;
        if (c < start && (end > 24*60)) c += 24*60;
        if (c >= start && c <= end) return true;
      }
    }
    return false;
  }
  return true; 
}

function render(){
  const kw = (kwInput.value||'').trim().toLowerCase();
  const cat = fCat.value;
  const area= fArea.value;
  const price= fPrice.value;
  const status = fStatus ? fStatus.value : '';
  const sort = fSort ? fSort.value : '';
  const zone = currentZone || 'all';
  const creatorFilter = fCreator ? fCreator.value : '';
  const hasFilters = !!(kw || cat || area || price);
  const source = Array.isArray(DATA) ? DATA.filter(item=>item && typeof item === 'object') : [];
  let list = source.filter(item=>{
    const hay = [
      item.name,
      item.category,
      item.area,
      item.address,
      item.intro,
      item.ig,
      item.igComment,
      item.hours
    ].filter(Boolean).join(' ').toLowerCase();
    if (kw && !hay.includes(kw)) return false;
    if (cat && mapCategory(item.category) !== cat) return false;
    if (area && item.area !== area) return false;
    if (price && item.price !== price) return false;
    if (status === 'open' && !isOpenNow(item.hours)) return false;
    if (zone === 'creator'){
      const ownerName = getOwnerName(item);
      if (!ownerName) return false;
      if (creatorFilter && ownerName !== creatorFilter) return false;
      if (!creatorFilter){
        if (creatorShareId && String(item.ownerId || '') !== String(creatorShareId)) return false;
        if (!creatorShareId && creatorShareName && ownerName !== creatorShareName) return false;
      }
    }
    if (zone === 'mine'){
      if (!creatorId) return false;
      if (String(item.ownerId || '') !== String(creatorId)) return false;
    }
    return true;
  });
  
  // 排序邏輯
  list = list.slice().sort((a,b)=>{
    // 優先置頂
    const af = !!(a.featured || a.featured_);
    const bf = !!(b.featured || b.featured_);
    if (af !== bf) return af ? -1 : 1;

    if (!sort){
      const diff = getItemTimestamp(b) - getItemTimestamp(a);
      if (diff !== 0) return diff;
    }
    if (sort === 'name_asc'){
      const an = a.name || '';
      const bn = b.name || '';
      return nameCollator ? nameCollator.compare(an, bn) : an.localeCompare(bn);
    }
    if (sort === 'price_asc' || sort === 'price_desc'){
      const diff = priceRank(a.price) - priceRank(b.price);
      return sort === 'price_desc' ? -diff : diff;
    }
    if (sort === 'rating_desc'){
      return (Number(b.rating)||0) - (Number(a.rating)||0);
    }
    if (sort === 'dist_asc'){
      if (!userLocation) return 0;
      const da = haversineKm(userLocation, {lat:a.lat||0, lng:a.lng||0});
      const db = haversineKm(userLocation, {lat:b.lat||0, lng:b.lng||0});
      return da - db;
    }
    return 0;
  });

  // 若處於地圖模式，同步更新地圖標記
  if (isMapMode) {
    updateMapMarkers(list);
  }

  if (catTabs){
    catTabs.querySelectorAll('.cat-tab').forEach(btn=>{
      const val = btn.dataset.value || '';
      btn.classList.toggle('active', val === (fCat.value || ''));
    });
  }
  if (zoneTabs){
    zoneTabs.querySelectorAll('.zone-tab').forEach(btn=>{
      const val = btn.dataset.value || '';
      btn.classList.toggle('active', val === currentZone);
    });
  }
  const canAdd = isAdmin || isCreator;
  const renderList = (canAdd && newItem) ? [newItem, ...list] : list;
  const totalLen = renderList.length;
  const displayList = renderList.slice(0, currentLimit);
  const shouldShowCreatorCard = zone === 'creator' && (creatorFilter || creatorShareId || creatorShareName);
  let creatorCardHtml = '';
  if (shouldShowCreatorCard){
    let profileName = creatorFilter || creatorShareName || '';
    let profileSource = null;
    if (creatorShareId){
      profileSource = source.find(item => String(item.ownerId || '') === String(creatorShareId)) || null;
    }
    if (!profileSource && creatorFilter){
      profileSource = source.find(item => getOwnerName(item) === creatorFilter) || null;
    }
    if (!profileSource && creatorShareName){
      profileSource = source.find(item => getOwnerName(item) === creatorShareName) || null;
    }
    if (!profileSource && list.length){
      profileSource = list[0];
    }
    if (profileSource){
      if (!profileName) profileName = getOwnerName(profileSource);
      const profile = {
        name: profileName || getOwnerName(profileSource) || '',
        ig: profileSource.creatorIg || '',
        youtube: profileSource.creatorYoutube || '',
        facebook: profileSource.creatorFacebook || '',
        tiktok: profileSource.creatorTiktok || '',
        intro: profileSource.creatorIntro || '',
        avatar: profileSource.creatorAvatar || '',
        cover: profileSource.creatorCover || '',
        coverPos: profileSource.creatorCoverPos || '50% 50%'
      };
      if (isCreator && creatorId && String(profileSource.ownerId || '') === String(creatorId)){
        profile.name = profile.name || creatorName || '';
        profile.ig = profile.ig || creatorIg || '';
        profile.youtube = profile.youtube || creatorYoutube || '';
        profile.facebook = profile.facebook || creatorFacebook || '';
        profile.tiktok = profile.tiktok || creatorTiktok || '';
        profile.intro = profile.intro || creatorIntro || '';
        profile.avatar = profile.avatar || creatorAvatar || '';
        profile.cover = profile.cover || creatorCover || '';
        profile.coverPos = profile.coverPos || creatorCoverPos || '50% 50%';
      }
      creatorCardHtml = buildCreatorProfileCard(profile);
    }else if (profileName){
      creatorCardHtml = buildCreatorProfileCard({ name: profileName });
    }
  }
  if (!displayList.length){
    cardsEl.innerHTML = `
      ${creatorCardHtml}
      <div class="empty-state">
        <h3>${t('emptyList')}</h3>
        <button class="btn ghost pill" type="button" id="clearFiltersBtn">${t('clearFilter')}</button>
      </div>
    `;
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn){
      clearBtn.onclick = ()=>{ resetFilters(); safeRender(); };
    }
    return;
  }
  cardsEl.innerHTML = creatorCardHtml + displayList.map((item, idx)=>{
    let displayCat = mapCategory(item.category) || item.category;
    if (currentLang === 'en') displayCat = CATEGORY_MAP_EN[displayCat] || displayCat;
    const ratingTag = item.rating ? `<span class="tag" style="background:#fffbeb;color:#b45309;border-color:#fcd34d">★ ${escapeHtml(item.rating)}</span>` : '';
    const isFeatured = !!(item.featured || item.featured_);
    const featuredTag = isFeatured ? `<span class="tag" style="background:#fff1f2;color:#be123c;border-color:#fda4af">🔥 ${t('featured')}</span>` : '';
    const tags = [displayCat, item.area, item.price ? `${t('priceLabel')} ${item.price}` : '']
      .filter(Boolean)
      .map(t=>`<span class="tag">${escapeHtml(t)}</span>`)
      .join('');
    const liked = item.id ? favs.includes(item.id) : false;
    const safeId = escapeHtml(item.id || '');
    const isNew = !!item.__tempId;
    const editKey = item.__tempId || item.id || '';
    const safeName = escapeHtml(item.name || (isNew ? t('newPlace') : ''));
    let coverUrl = safeUrl(item.cover);
    const isIgCover = isIgCoverUrl(coverUrl);
    if (isIgCover && !ALLOW_IG_COVER) coverUrl = '';
    const coverThumb = coverUrl && !isIgCover ? buildThumbUrl(coverUrl) : '';
    const coverPos = safeObjectPosition(item.coverPos || item.cover_pos);
    const hasLat = item.lat !== undefined && item.lat !== null && String(item.lat).trim() !== '';
    const hasLng = item.lng !== undefined && item.lng !== null && String(item.lng).trim() !== '';
    const coordValue = (hasLat && hasLng) ? `${item.lat}, ${item.lng}` : '';
    const stayMinVal = item.stayMin || item.stay_min || '';
    const openSlotsRaw = normalizeListField(item.openSlots || item.open_slots);
    const inferredSlots = !openSlotsRaw.length ? inferOpenSlotsFromHours(item.hours || '') : [];
    const openSlots = inferredSlots.length ? inferredSlots : openSlotsRaw;
    const tagsList = normalizeListField(item.tags);
    const tagsCustomText = tagsList.filter(tag=>!TAG_OPTION_VALUES.has(tag)).join(', ');
    const dayTripStops = normalizeDayTripStops(item.dayTripStops || item.day_trip_stops);
    const isDayTrip = isDayTripCategory(item.category) || dayTripStops.length > 0;
    const dayTripRows = (dayTripStops.length ? dayTripStops : [{}]).map(buildDayTripRowHtml).join('');
    const galleryImages = normalizeGalleryItems(item.images || item.gallery || []);
    const galleryItems = galleryImages.length
      ? galleryImages.map(buildAdminGalleryItemHtml).join('')
      : `<div class="admin-gallery-empty">${escapeHtml(t('galleryEmpty'))}</div>`;
    const coverStyle = coverPos ? ` style="object-position:${escapeHtml(coverPos)};"` : '';
    const eager = idx < 2;
    const coverImg = coverThumb
      ? `<img src="${escapeHtml(coverThumb)}" alt="${safeName}"${coverStyle} loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`
      : '';
    const coverPreview = coverUrl
      ? `<img src="${escapeHtml(coverUrl)}" alt="${safeName}"${coverStyle}>`
      : `<div class="admin-preview-empty">${escapeHtml(t('noCover'))}</div>`;
    const mapsUrl = safeUrl(item.maps);
    const introText = buildIntroText(item);
    const snippet = buildCardSnippet(item);
    const ownerName = getOwnerName(item);
    const pickSuffix = String(t('creatorPick') || '');
    const pickTrim = pickSuffix.trim();
    let creatorText = '';
    if (ownerName){
      creatorText = ownerName;
      if (pickTrim && !creatorText.endsWith(pickTrim)){
        creatorText += pickSuffix;
      }
    }
    const creatorBadge = creatorText ? `<span class="badge-creator">${escapeHtml(creatorText)}</span>` : '';
    const canEditItem = isAdmin || (isCreator && creatorId && String(item.ownerId || '') === String(creatorId));
    const isEditing = canEditItem && editingId === editKey;
    
    const cardStyle = isFeatured ? 'style="border:2px solid #fda4af;background:#fff1f2;box-shadow:0 12px 32px rgba(251,113,133,0.12);"' : '';

    const adminPanel = isEditing ? `
      <div class="admin-panel" data-admin-id="${safeId}">
        <div class="admin-grid">
          <label style="display:flex;align-items:center;gap:6px;grid-column:1/-1;background:#fff7ed;padding:8px;border-radius:8px;border:1px dashed #fdba74;">
            <input type="checkbox" data-admin-field="featured" ${(item.featured || item.featured_) ? 'checked' : ''}>
            <span style="font-weight:700;color:#c2410c;font-size:12px;">${escapeHtml(t('featuredLabel'))}</span>
          </label>
          <label>${escapeHtml(t('nameInput'))}<input class="admin-input" data-admin-field="name" value="${escapeHtml(item.name || '')}"></label>
          <label>${escapeHtml(t('catInput'))}<input class="admin-input" data-admin-field="category" value="${escapeHtml(item.category || '')}"></label>
          <label>${escapeHtml(t('areaInput'))}<input class="admin-input" data-admin-field="area" value="${escapeHtml(item.area || '')}"></label>
          <label>${escapeHtml(t('priceInput'))}
            <select class="admin-input" data-admin-field="price">
              <option value="">-</option>
              <option value="$" ${item.price === '$' ? 'selected' : ''}>${escapeHtml(t('priceOpt1'))}</option>
              <option value="$$" ${item.price === '$$' ? 'selected' : ''}>${escapeHtml(t('priceOpt2'))}</option>
              <option value="$$$" ${item.price === '$$$' ? 'selected' : ''}>${escapeHtml(t('priceOpt3'))}</option>
            </select>
          </label>
          <div class="admin-field admin-cover">
            <label class="admin-daytrip-toggle">
              <input type="checkbox" data-admin-daytrip-toggle ${isDayTrip ? 'checked' : ''}>
              <span class="admin-daytrip-title">${escapeHtml(t('dayTripToggle'))}</span>
              <span class="admin-hint">${escapeHtml(t('dayTripToggleHint'))}</span>
            </label>
          </div>
          <div class="admin-daytrip ${isDayTrip ? 'is-active' : ''}" data-admin-daytrip>
            <div class="admin-daytrip-head">
              <div>${escapeHtml(t('dayTripStopsLabel'))}</div>
              <button class="btn ghost pill" type="button" data-daytrip-add>${escapeHtml(t('dayTripAddRow'))}</button>
            </div>
            <div class="admin-daytrip-list" data-daytrip-list>
              ${dayTripRows}
            </div>
            <div class="admin-daytrip-bulk">
              <textarea class="admin-textarea" data-daytrip-bulk placeholder="${escapeHtml(t('dayTripBulkHint'))}"></textarea>
              <button class="btn ghost pill" type="button" data-daytrip-apply>${escapeHtml(t('dayTripBulkApply'))}</button>
            </div>
          </div>
          <label>${escapeHtml(t('stayMin'))}
            <input class="admin-input" data-admin-field="stayMin" type="number" min="15" step="5" value="${escapeHtml(String(stayMinVal || ''))}">
            <span class="admin-hint">${escapeHtml(t('stayMinHint'))}</span>
          </label>
          <div class="admin-field admin-cover">
            <div>${escapeHtml(t('openSlotsLabel'))}</div>
            <div class="admin-slot-group">
              <label class="admin-slot-item"><input type="checkbox" data-admin-slot value="morning" ${openSlots.includes('morning') ? 'checked' : ''}>${escapeHtml(t('slotMorning'))}</label>
              <label class="admin-slot-item"><input type="checkbox" data-admin-slot value="noon" ${openSlots.includes('noon') ? 'checked' : ''}>${escapeHtml(t('slotNoon'))}</label>
              <label class="admin-slot-item"><input type="checkbox" data-admin-slot value="afternoon" ${openSlots.includes('afternoon') ? 'checked' : ''}>${escapeHtml(t('slotAfternoon'))}</label>
              <label class="admin-slot-item"><input type="checkbox" data-admin-slot value="evening" ${openSlots.includes('evening') ? 'checked' : ''}>${escapeHtml(t('slotEvening'))}</label>
              <label class="admin-slot-item"><input type="checkbox" data-admin-slot value="night" ${openSlots.includes('night') ? 'checked' : ''}>${escapeHtml(t('slotNight'))}</label>
            </div>
          </div>
          <div class="admin-field admin-cover">
            <div>${escapeHtml(t('tagsInput'))}</div>
            <div class="admin-tag-group">
              ${TAG_OPTIONS.map(tag=>{
                const label = currentLang === 'en' ? tag.en : tag.zh;
                const checked = tagsList.includes(tag.value) ? 'checked' : '';
                return `<label class="admin-tag-item"><input type="checkbox" data-admin-tag value="${escapeHtml(tag.value)}" ${checked}>${escapeHtml(label)}</label>`;
              }).join('')}
            </div>
            <input class="admin-input" data-admin-field="tagsCustom" value="${escapeHtml(tagsCustomText)}" placeholder="aircon,photo,must_try">
            <div class="admin-hint">${escapeHtml(t('tagsHint'))}</div>
          </div>
          <label>${escapeHtml(t('gMap'))}<input class="admin-input" data-admin-field="maps" value="${escapeHtml(item.maps || '')}"></label>
          <label>${escapeHtml(t('rating'))}
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              <input class="admin-input" data-admin-field="rating" value="${escapeHtml(item.rating || '')}" placeholder="0-5" style="max-width:120px;flex:1 1 90px;">
              <button class="btn pill" type="button" data-fetch-details="${safeId}" style="padding:0 8px;font-size:11px;white-space:nowrap">${escapeHtml(t('syncG'))}</button>
              <span class="admin-hint" style="flex:1 1 180px;min-width:160px;">${escapeHtml(t('syncGHint'))}</span>
              <span class="admin-msg" data-sync-msg style="flex-basis:100%;"></span>
            </div>
          </label>
          <label>${escapeHtml(t('addr'))}<input class="admin-input" data-admin-field="address" value="${escapeHtml(item.address || '')}"></label>
          <label>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span>${escapeHtml(t('coordsInput'))}</span>
              <button class="admin-help-link" type="button" data-coords-help>${escapeHtml(t('coordsHelp'))}</button>
            </div>
            <input class="admin-input" data-admin-field="coords" value="${escapeHtml(coordValue)}" placeholder="13.7563, 100.5018">
          </label>
          <label>${escapeHtml(t('hours'))}<input class="admin-input" data-admin-field="hours" value="${escapeHtml(item.hours || '')}"></label>
          <label>${escapeHtml(t('placeIdLabel'))}
            <input class="admin-input" data-admin-field="googlePlaceId" value="${escapeHtml(item.googlePlaceId || item.google_place_id || '')}">
            <span class="admin-hint">${escapeHtml(t('placeIdHint'))}</span>
          </label>
          <label>${escapeHtml(t('igVideo'))}<input class="admin-input" data-admin-field="ig" value="${escapeHtml(item.ig || '')}"></label>
          <label>${escapeHtml(t('ytVideo'))}<input class="admin-input" data-admin-field="youtube" value="${escapeHtml(item.youtube || '')}"></label>
          <label class="admin-cover">${escapeHtml(t('desc'))}
            <textarea class="admin-textarea admin-textarea-large" data-admin-field="intro">${escapeHtml(introText)}</textarea>
          </label>
          <div class="admin-field admin-cover">
            <div class="admin-gallery-head">
              <div>${escapeHtml(t('galleryLabel'))}</div>
              <div class="admin-hint">${escapeHtml(t('galleryHint'))}</div>
            </div>
            <div class="admin-gallery">
              <div class="admin-gallery-list" data-admin-gallery-list>
                ${galleryItems}
              </div>
              <div class="admin-gallery-actions">
                <input class="admin-file" data-admin-gallery-file type="file" accept="image/*" multiple>
                <div class="admin-upload-status" data-admin-status="gallery"></div>
              </div>
            </div>
          </div>
          <label class="admin-cover">${escapeHtml(t('coverImg'))}
            <div class="admin-upload">
              <div class="admin-preview" data-admin-preview="cover">${coverPreview}</div>
              <div>
                <input class="admin-file" data-admin-file="cover" type="file" accept="image/*">
                <input type="hidden" class="admin-input" data-admin-field="cover" value="${escapeHtml(item.cover || '')}">
                <input type="hidden" class="admin-input" data-admin-field="coverPos" value="${escapeHtml(coverPos)}">
                <div class="admin-upload-hint">${escapeHtml(t('autoUpload'))}</div>
                <div class="admin-upload-hint">${escapeHtml(t('dragHint'))}</div>
                <div class="admin-upload-status" data-admin-status="cover"></div>
              </div>
            </div>
          </label>
        </div>
        <div class="admin-actions">
          <button class="btn ghost" data-admin-save="${safeId}">${escapeHtml(t('saveBtn'))}</button>
          <button class="btn ghost" data-admin-cancel>${escapeHtml(t('cancelBtn'))}</button>
          ${item.id ? `<button class="btn ghost" data-admin-delete>${escapeHtml(t('delBtn'))}</button>` : ''}
          <span class="admin-msg" data-admin-msg></span>
        </div>
        <div class="admin-hint">${escapeHtml(isAdmin ? t('adminMode') : t('creatorMode'))}</div>
      </div>
    ` : '';
    return `<article class="card" ${cardStyle} data-card-id="${String(item.__tempId || item.id || '').replace(/"/g,'&quot;')}">
      <div class="cover">${coverImg}</div>
      <div class="card-body">
        <div class="card-head">
          <div>
            <div class="card-title">${safeName}</div>
            <div class="card-sub">${escapeHtml(displayCat || '')} · ${escapeHtml(item.area || '')}${item.price ? ` · ${escapeHtml(t('priceLabel'))} ${escapeHtml(item.price)}` : ''}</div>
          </div>
          <div class="card-head-actions">
            ${canEditItem ? `<button class="edit-btn" data-edit="${escapeHtml(editKey)}">${escapeHtml(t('edit'))}</button>` : ''}
            ${item.id ? `<button class="fav-btn" data-fav="${safeId}" title="${escapeHtml(t('favBtn'))}">${liked?'★':'☆'}</button>` : ''}
          </div>
        </div>
        <div class="card-tags">${featuredTag}${creatorBadge}${tags}${ratingTag}<span class="badge-hot">${escapeHtml(t('recommend'))}</span></div>
        <div class="card-addr">${escapeHtml(item.address || '')}</div>
        ${snippet ? `<div class="card-desc">${escapeHtml(snippet)}</div>` : ''}
        <div class="card-actions">
          ${item.id ? `
            <button class="btn primary${isDayTrip ? ' daytrip-btn' : ''}" data-open="${safeId}">${escapeHtml(isDayTrip ? t('dayTripDetailsBtn') : t('details'))}</button>
            ${isDayTrip ? '' : `<a class="btn ghost" href="${escapeHtml(mapsUrl || '#')}" target="_blank" rel="noopener">${escapeHtml(t('nav'))}</a>`}
          ` : `<span class="mini">${escapeHtml(t('actionsHint'))}</span>`}
        </div>
        ${adminPanel}
      </div>
    </article>`;
  }).join('') + (totalLen > currentLimit ? `
    <div style="grid-column:1/-1;text-align:center;padding:20px 0;">
      <button id="btnLoadMore" class="btn pill" style="background:#fff;border:1px solid #cbd5e1;padding:10px 24px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.05);margin:0 auto;">
        ${escapeHtml(t('loadMore'))} (${totalLen - currentLimit})
      </button>
    </div>` : '');

  if (totalLen > currentLimit) {
    document.getElementById('btnLoadMore').onclick = () => {
      currentLimit += PAGE_SIZE;
      safeRender();
    };
  }

  displayList.forEach(item=> ensureCover(item));
  renderSummary(displayList);
  // 綁定卡片按鈕
  cardsEl.querySelectorAll('button[data-open]').forEach(btn=>{
    btn.onclick = (ev)=>{
      const id = btn.getAttribute('data-open');
      openModal(id);
    };
  });
  cardsEl.querySelectorAll('button[data-fav]').forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute('data-fav');
      try{
        const action = favs.includes(id) ? 'remove' : 'add';
        const res = await fetch('/api/me/food-favs', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ id, action })
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
        favs = data.favorites || [];
        safeRender();
      }catch(err){
        alert(t('favFail') + (err.message||err));
      }
    };
  });
  cardsEl.querySelectorAll('[data-fetch-details]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.preventDefault();
      const wrap = btn.closest('[data-admin-id]');
      if (!wrap) return;

      if(!window.google || !window.google.maps || !window.google.maps.places){
        alert(t('mapServiceWait'));
        ensureGoogleMaps();
        return;
      }

      const readField = (field)=>{
        const el = wrap.querySelector(`[data-admin-field="${field}"]`);
        return el ? el.value.trim() : '';
      };

      const mapsVal = readField('maps');
      const nameVal = readField('name');
      const areaVal = readField('area');
      const ratingInput = wrap.querySelector('[data-admin-field="rating"]');
      const addrInput = wrap.querySelector('[data-admin-field="address"]');
      const hoursInput = wrap.querySelector('[data-admin-field="hours"]');
      const coordsInput = wrap.querySelector('[data-admin-field="coords"]');
      const placeIdInput = wrap.querySelector('[data-admin-field="googlePlaceId"]');
      const syncMsgEl = wrap.querySelector('[data-sync-msg]');
      const placeId = (placeIdInput && placeIdInput.value.trim()) || extractPlaceIdFromMapsUrl(mapsVal);

      btn.textContent = '...';
      btn.disabled = true;

      const setSyncMsg = (text)=>{
        if (!syncMsgEl) return;
        syncMsgEl.textContent = text || '';
        if (text) setTimeout(()=>{ if (syncMsgEl) syncMsgEl.textContent = ''; }, 2500);
      };

      const finish = ()=>{
        btn.textContent = t('syncG');
        btn.disabled = false;
      };

      const applyPlace = (place)=>{
        const updatedFields = [];
        const fieldSep = currentLang === 'en' ? ', ' : '、';
        const setField = (input, value, label)=>{
          if (!input) return;
          const next = String(value ?? '').trim();
          if (!next) return;
          if (input.value.trim() === next) return;
          input.value = next;
          updatedFields.push(label);
        };
        if (Number.isFinite(place.rating)) setField(ratingInput, place.rating, t('rating'));
        const address = place.formatted_address || place.vicinity || '';
        if (address) setField(addrInput, address, t('addr'));
        const hours = formatHoursFromOpening(place.opening_hours);
        if (hours) setField(hoursInput, hours, t('hours'));
        if (coordsInput && place.geometry && place.geometry.location){
          const loc = place.geometry.location;
          const lat = (typeof loc.lat === 'function') ? loc.lat() : loc.lat;
          const lng = (typeof loc.lng === 'function') ? loc.lng() : loc.lng;
          if (Number.isFinite(lat) && Number.isFinite(lng)){
            const coordValue = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setField(coordsInput, coordValue, t('coordsShort'));
          }
        }
        if (placeIdInput && place.place_id) setField(placeIdInput, place.place_id, t('placeIdLabel'));
        if (updatedFields.length){
          setSyncMsg(t('syncGUpdated', { fields: updatedFields.join(fieldSep) }));
        } else {
          setSyncMsg(t('syncGNoChange'));
        }
      };

      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const fields = ['place_id', 'rating', 'formatted_address', 'geometry', 'opening_hours'];

      const onDetails = (place, status)=>{
        finish();
        if (status === google.maps.places.PlacesServiceStatus.OK && place){
          applyPlace(place);
        } else {
          alert(t('syncGFail'));
        }
      };

      const loadDetails = (pid)=>{
        service.getDetails({ placeId: pid, fields }, onDetails);
      };

      if (placeId){
        loadDetails(placeId);
        return;
      }

      const query = buildPlaceQueryFromInputs(mapsVal, nameVal, areaVal);
      if (!query){
        finish();
        alert(t('gmapFail'));
        return;
      }

      service.findPlaceFromQuery({ query, fields: ['place_id'] }, (res, stat)=>{
        if (stat === google.maps.places.PlacesServiceStatus.OK && res && res[0] && res[0].place_id){
          loadDetails(res[0].place_id);
        } else {
          finish();
          alert(t('gmapFail'));
        }
      });
    };
  });
  const openCoordsHelp = () => {
    if (!coordsHelpDialog) {
      alert(t('coordsHelpText'));
      return;
    }
    if (typeof coordsHelpDialog.showModal === 'function') coordsHelpDialog.showModal();
    else coordsHelpDialog.setAttribute('open', '');
  };
  cardsEl.querySelectorAll('[data-coords-help]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.preventDefault();
      openCoordsHelp();
    };
  });
  if (isAdmin || isCreator){
    cardsEl.querySelectorAll('button[data-edit]').forEach(btn=>{
      btn.onclick = ()=>{
        if (!isAdmin && isCreator && !creatorTermsAccepted){
          alert(t('creatorTermsNeed'));
          openCreatorTermsDialog();
          return;
        }
        const id = btn.getAttribute('data-edit') || '';
        editingId = (editingId === id) ? '' : id;
        safeRender();
        const card = cardsEl.querySelector(`[data-card-id="${escapeSelectorValue(id)}"]`);
        if (card) card.scrollIntoView({ behavior:'smooth', block:'start' });
      };
    });
    cardsEl.querySelectorAll('[data-admin-save]').forEach(btn=>{
      btn.onclick = async ()=>{
        const wrap = btn.closest('[data-admin-id]');
        if (!wrap) return;
        const id = wrap.getAttribute('data-admin-id');
        const original = DATA.find(x => x.id === id) || {};

        const read = (field)=>{
          const el = wrap.querySelector(`[data-admin-field="${field}"]`);
          if (!el) return undefined;
          if (el.type === 'checkbox') return el.checked;
          return el.value.trim();
        };
        
        const getVal = (f) => { const v = read(f); return v !== undefined ? v : original[f]; };
        
        const introRaw = getVal('intro') || '';
        const introLines = introRaw ? introRaw.split(/\n+/).filter(Boolean) : (original.highlights || []);
        const slotEls = wrap.querySelectorAll('[data-admin-slot]');
        let openSlots = Array.from(slotEls).filter(el=>el.checked).map(el=>el.value);
        const hoursVal = getVal('hours');
        if (!openSlots.length){
          const inferred = inferOpenSlotsFromHours(hoursVal);
          if (inferred.length) openSlots = inferred;
        }
        const tagEls = wrap.querySelectorAll('[data-admin-tag]');
        const selectedTags = Array.from(tagEls).filter(el=>el.checked).map(el=>el.value);
        const toIntOrEmpty = (val)=>{
          const n = parseInt(val, 10);
          return Number.isFinite(n) ? n : '';
        };
        const stayMinVal = toIntOrEmpty(getVal('stayMin'));
        const customTags = normalizeListField(getVal('tagsCustom'));
        const tagsVal = Array.from(new Set(selectedTags.concat(customTags)));
        const dayTripToggle = wrap.querySelector('[data-admin-daytrip-toggle]');
        const dayTripEnabled = dayTripToggle ? dayTripToggle.checked : false;
        const dayTripStops = readDayTripStops(wrap);
        const galleryUrls = getGalleryItemsFromList(wrap.querySelector('[data-admin-gallery-list]'));
        const coordRaw = read('coords');
        const hasCoords = coordRaw !== undefined && String(coordRaw).trim() !== '';
        let latVal;
        let lngVal;
        if (hasCoords){
          const pair = parseLatLngInput(coordRaw);
          if (!pair){
            alert(t('coordsInvalid'));
            return;
          }
          latVal = pair.lat;
          lngVal = pair.lng;
        }

        const categoryVal = getVal('category');
        const payload = {
          ...original,
          id: id || original.id,
          name: getVal('name'),
          category: (dayTripEnabled && !String(categoryVal || '').trim()) ? DAY_TRIP_CATEGORY : categoryVal,
          area: getVal('area'),
          price: getVal('price'),
          stayMin: stayMinVal,
          openSlots,
          tags: tagsVal,
          dayTripStops: dayTripEnabled ? dayTripStops : [],
          day_trip_stops: dayTripEnabled ? dayTripStops : [],
          images: galleryUrls,
          featured: read('featured') ?? original.featured,
          featured_: read('featured') ?? original.featured_,
          rating: getVal('rating'),
          address: getVal('address'),
          lat: latVal,
          lng: lngVal,
          maps: getVal('maps'),
          googlePlaceId: getVal('googlePlaceId'),
          google_place_id: getVal('googlePlaceId'),
          hours: hoursVal,
          ig: getVal('ig'),
          youtube: getVal('youtube'),
          igComment: getVal('igComment'),
          cover: getVal('cover'),
          coverPos: getVal('coverPos'),
          intro: introRaw,
          highlights: introLines,
          dishes: original.dishes || []
        };
        const msgEl = wrap.querySelector('[data-admin-msg]');
        const setMsg = (text)=>{
          if (!msgEl) return;
          msgEl.textContent = text || '';
          if (text) setTimeout(()=>{ if (msgEl) msgEl.textContent = ''; }, 2000);
        };
        try{
          btn.disabled = true;
          const res = await fetch('/api/foods', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'include',
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(()=>({}));
          if (res.status === 401){
            alert(t('loginReq'));
            return;
          }
          if (res.status === 403){
            if (data && data.error === 'terms_required'){
              alert(t('creatorTermsNeed'));
              openCreatorTermsDialog();
              return;
            }
            alert(t('noPermission'));
            return;
          }
          if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
          setMsg(t('saved'));
          showToast(t('saved'));
          editingId = '';
          newItem = null;
          await loadRemote();
        }catch(err){
          alert(t('saveFail') + (err.message||err));
        }finally{
          btn.disabled = false;
        }
      };
    });
    cardsEl.querySelectorAll('[data-admin-delete]').forEach(btn=>{
      btn.onclick = async ()=>{
        const wrap = btn.closest('[data-admin-id]');
        if (!wrap) return;
        const id = wrap.getAttribute('data-admin-id');
        if (!id) return;
        if (!confirm(t('delConfirm'))) return;
        const msgEl = wrap.querySelector('[data-admin-msg]');
        const setMsg = (text)=>{
          if (!msgEl) return;
          msgEl.textContent = text || '';
          if (text) setTimeout(()=>{ if (msgEl) msgEl.textContent = ''; }, 2000);
        };
        try{
          btn.disabled = true;
          const res = await fetch(`/api/foods?id=${encodeURIComponent(id)}`, {
            method:'DELETE',
            credentials:'include'
          });
          const data = await res.json().catch(()=>({}));
          if (res.status === 401){
            alert(t('loginReq'));
            return;
          }
          if (res.status === 403){
            if (data && data.error === 'terms_required'){
              alert(t('creatorTermsNeed'));
              openCreatorTermsDialog();
              return;
            }
            alert(t('noPermission'));
            return;
          }
          if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
          setMsg(t('delSuccess'));
          showToast(t('delSuccess'));
          editingId = '';
          await loadRemote();
        }catch(err){
          alert(t('delFail') + (err.message||err));
        }finally{
          btn.disabled = false;
        }
      };
    });
    cardsEl.querySelectorAll('[data-admin-cancel]').forEach(btn=>{
      btn.onclick = ()=>{
        editingId = '';
        if (newItem) newItem = null;
        safeRender();
      };
    });
    cardsEl.querySelectorAll('[data-admin-file="cover"]').forEach(input=>{
      input.onchange = async ()=>{
        const file = input.files && input.files[0];
        if (!file) return;
        const wrap = input.closest('[data-admin-id]');
        if (!wrap) return;
        const previewEl = wrap.querySelector('[data-admin-preview="cover"]');
        const hidden = wrap.querySelector('[data-admin-field="cover"]');
        const posInput = wrap.querySelector('[data-admin-field="coverPos"]');
        const statusEl = wrap.querySelector('[data-admin-status="cover"]');
        const setStatus = (text)=>{ if (statusEl) statusEl.textContent = text || ''; };
        setStatus(t('uploading'));
        try{
          const url = await uploadCoverFile(file);
          if (hidden) hidden.value = url;
          if (posInput && !posInput.value) posInput.value = '50% 50%';
          const posVal = posInput ? posInput.value : '50% 50%';
          if (previewEl) previewEl.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="object-position:${escapeHtml(posVal)};">`;
          setStatus(t('uploaded'));
          const card = wrap.closest('.card');
          if (card){
            const coverImg = card.querySelector('.cover img');
            if (coverImg){
              coverImg.src = url;
              coverImg.style.objectPosition = posVal;
            }else{
              const coverBox = card.querySelector('.cover');
              if (coverBox) coverBox.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="object-position:${escapeHtml(posVal)};">`;
            }
          }
          const id = wrap.getAttribute('data-admin-id');
          const target = DATA.find(it=>it.id === id);
          if (target){
            target.cover = url;
            target.coverPos = posVal;
          }
          initCoverPositionControls(previewEl);
        }catch(err){
          setStatus(t('uploadFail'));
          alert(t('coverFail') + (err.message||err));
        }
      };
    });
    initCoverPositionControls();
    initDayTripEditors(cardsEl);
    initGalleryEditors(cardsEl);
  }
}

// --- 地圖模式相關邏輯 ---
if (modeToggle) {
  modeToggle.onclick = () => {
    isMapMode = !isMapMode;
    if (isMapMode) {
      modeToggle.textContent = t('listMode');
      cardsEl.style.display = 'none';
      mainMapEl.style.display = 'block';
      // 切換到地圖模式時，若地圖尚未初始化則初始化，否則觸發 resize 並更新標記
      if (!mainMap) {
        initMainMap();
      } else {
        google.maps.event.trigger(mainMap, 'resize');
        // 強制重新渲染以更新標記
        safeRender();
      }
    } else {
      modeToggle.textContent = t('mapMode');
      cardsEl.style.display = 'grid';
      mainMapEl.style.display = 'none';
    }
  };
}

function initMainMap() {
  if (!window.google || !window.google.maps) {
    ensureGoogleMaps().then(ok => { if(ok) initMainMap(); });
    return;
  }
  if (mainMap) return;

  mainMap = new google.maps.Map(mainMapEl, {
    center: { lat: 13.7563, lng: 100.5018 },
    zoom: 12,
    gestureHandling: 'greedy',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });
  mainInfoWindow = new google.maps.InfoWindow({ maxWidth: 280 });
  
  // 新增定位按鈕
  const locBtn = document.createElement("button");
  locBtn.className = "btn pill";
  locBtn.style.cssText = "background:#fff; color:#0f172a; border:1px solid #cbd5e1; box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-top:10px; font-weight:700; cursor:pointer; z-index: 5;";
  locBtn.innerHTML = t('locBtn');
  
  locBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
      locBtn.textContent = t('locating');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          userLocation = pos; // 更新全域位置變數
          mainMap.setCenter(pos);
          mainMap.setZoom(15);
          
          // 標示使用者位置
          new google.maps.Marker({
            position: pos,
            map: mainMap,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            },
            title: t('locMy')
          });
          locBtn.innerHTML = t('locBtn');
        },
        () => {
          alert(t('locPerm'));
          locBtn.innerHTML = t('locBtn');
        }
      );
    } else {
      alert(t('browserNoLoc'));
    }
  });
  
  mainMap.controls[google.maps.ControlPosition.TOP_CENTER].push(locBtn);
  
  // 初始化後立即更新標記
  safeRender();
}

function updateMapMarkers(list) {
  if (!mainMap) return;
  
  // 清除舊標記
  mainMarkers.forEach(m => m.setMap(null));
  mainMarkers = [];
  
  const bounds = new google.maps.LatLngBounds();
  let hasLoc = false;
  
  list.forEach(item => {
    const coords = getCachedCoords(item);
    if (coords) {
      hasLoc = true;
      const marker = new google.maps.Marker({
        position: coords,
        map: mainMap,
        title: item.name
      });
      
      marker.addListener('click', () => {
        const thumb = item.cover && !isIgCoverUrl(item.cover) ? buildThumbUrl(item.cover, 120) : '';
        const content = `
          <div style="display:flex; gap:10px; align-items:flex-start; padding:2px;">
            ${thumb ? `<img src="${escapeHtml(thumb)}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : ''}
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:14px; margin-bottom:4px; line-height:1.3;">${escapeHtml(item.name)}</div>
              <div style="font-size:12px; color:#64748b; margin-bottom:8px;">
                ${item.rating ? `<span style="color:#b45309;">★ ${item.rating}</span>` : ''} 
                ${item.price ? `· ${t('priceLabel')} ${escapeHtml(item.price)}` : ''}
              </div>
              <button onclick="openModal('${escapeHtml(item.id)}')" style="background:#0f172a; color:#fff; border:none; padding:5px 12px; border-radius:999px; font-size:12px; cursor:pointer; font-weight:600;">${t('detailShort')}</button>
            </div>
          </div>
        `;
        mainInfoWindow.setContent(content);
        mainInfoWindow.open(mainMap, marker);
      });
      
      mainMarkers.push(marker);
      bounds.extend(coords);
    }
  });
  
  if (hasLoc) {
    mainMap.fitBounds(bounds);
    // 避免只有一個點時縮放太大
    const listener = google.maps.event.addListener(mainMap, "idle", function() { 
      if (mainMap.getZoom() > 16) mainMap.setZoom(16); 
      google.maps.event.removeListener(listener); 
    });
  }
}

function sortTripItems(origin, items) {
  let remaining = items.map(it => ({ item: it, coords: getCachedCoords(it) })).filter(it => it.coords);
  let sorted = [];
  let currentPos = origin;

  while (remaining.length > 0) {
    remaining.sort((a, b) => haversineKm(currentPos, a.coords) - haversineKm(currentPos, b.coords));
    const next = remaining.shift();
    sorted.push(next);
    currentPos = next.coords;
  }
  return sorted;
}

function buildMultiStopUrl(origin, sortedItems) {
  if (!origin || !sortedItems.length) return '';
  const base = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams();
  params.set('origin', `${origin.lat},${origin.lng}`);
  
  const getLoc = (entry) => {
    const it = entry.item;
    const pid = it.googlePlaceId || it.google_place_id;
    if (pid) return `place_id:${pid}`;
    if (it.name) {
      let q = it.name.replace(/[|]/g, ' ');
      if (it.area) q += ` ${it.area}`;
      return q;
    }
    return `${entry.coords.lat},${entry.coords.lng}`;
  };

  params.set('destination', getLoc(sortedItems[sortedItems.length - 1]));
  if (sortedItems.length > 1) {
    const waypoints = sortedItems.slice(0, -1).map(it => getLoc(it)).join('|');
    params.set('waypoints', waypoints);
  }
  params.set('travelmode', 'driving');
  return `${base}&${params.toString()}`;
}

function renderTripResult(sortedItems, gmapsUrl, startCoords) {
  const body = tripResultModal.querySelector('#tripResultBody');
  if (!body) return;
  let lastCoords = startCoords;
  const itemsHtml = sortedItems.map((entry, index) => {
    const dist = haversineKm(lastCoords, entry.coords);
    lastCoords = entry.coords;
    const distLabel = index === 0 ? t('distFromHere') : t('distFromPrev');
    return `
      <div class="trip-result-item">
        <div class="trip-result-order">${index + 1}</div>
        <div>
          <div class="trip-result-name">${escapeHtml(entry.item.name)}</div>
          <div class="trip-result-meta">${escapeHtml(entry.item.area)} · ${escapeHtml(currentLang==='en'?(CATEGORY_MAP_EN[mapCategory(entry.item.category)]||mapCategory(entry.item.category)):mapCategory(entry.item.category))}</div>
          <div class="trip-result-dist">${distLabel}：${formatDistance(dist)}</div>
        </div>
        <div class="trip-result-actions">
          <button class="btn pill ghost" onclick="openModal('${escapeHtml(entry.item.id)}')">${t('detailShort')}</button>
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div style="padding:16px; display:grid; gap:12px;">
      <div class="modal-head">
        <div class="modal-title">${t('tripTitle')}</div>
        <button class="modal-close" onclick="tripResultModal.close()">${t('close')}</button>
      </div>
      <div>${itemsHtml}</div>
      <a href="${escapeHtml(gmapsUrl)}" target="_blank" rel="noopener" class="btn primary">${t('openNav')}</a>
    </div>
  `;
}

// 按鈕事件
[btnBack, btnFav, btnAdd].forEach(btn=>{
  if (!btn) return;
  if (btn.id === 'btnBack') btn.onclick = ()=> { window.location.href = '/'; };
});

function checkLoginOrRedirect(msg){
  if (window.authState && typeof window.authState.isLoggedIn === 'function' && window.authState.isLoggedIn()) {
    return true;
  }
  if (confirm((msg || t('loginReq')) + '\n\n' + t('loginConfirm'))) {
    // 修正：若店家資訊彈窗開啟中，需先關閉，否則登入畫面會被蓋住 (因為 dialog 在 top-layer)
    const dlg = document.getElementById('foodModal');
    if (dlg && dlg.open) {
      dlg.close();
    }
    if (window.authState && typeof window.authState.login === 'function') {
      window.authState.login();
    } else {
      window.location.href = '/shop'; 
    }
  }
  return false;
}

function openNewItem(){
  if (!isAdmin && !isCreator) return;
  if (!newItem){
    newItem = {
      __tempId: `new-${Date.now()}`,
      id: '',
      name: '',
      category: '',
      area: '',
      price: '',
      stayMin: '',
      openSlots: [],
      tags: [],
      dayTripStops: [],
      featured_: false,
      featured: false,
      rating: '',
      address: '',
      hours: '',
      maps: '',
      googlePlaceId: '',
      ig: '',
      youtube: '',
      igComment: '',
      images: [],
      cover: '',
      coverPos: '50% 50%',
      intro: '',
      ownerId: isCreator ? creatorId : '',
      ownerName: isCreator ? creatorName : ''
    };
  }else if (isCreator){
    newItem.ownerId = creatorId;
    newItem.ownerName = creatorName;
  }
  editingId = newItem.__tempId;
  safeRender();
  if (cardsEl) cardsEl.scrollIntoView({ behavior:'smooth', block:'start' });
}

if (btnFav) btnFav.onclick = ()=> {
  if (checkLoginOrRedirect(t('loginFav'))) {
    openFavList();
  }
};

if (btnAdd) btnAdd.onclick = ()=>{
  if (!isAdmin) return;
  openNewItem();
};
if (btnCreatorAdd) btnCreatorAdd.onclick = ()=> {
  if (!isCreator) return;
  if (!creatorTermsAccepted){
    alert(t('creatorTermsNeed'));
    openCreatorTermsDialog();
    return;
  }
  openNewItem();
};
if (btnCreatorInvite) btnCreatorInvite.onclick = async ()=>{
  if (!checkLoginOrRedirect(t('loginReq'))) return;
  const code = prompt(t('creatorInvitePrompt'));
  if (!code) return;
  try{
    const res = await fetch('/api/creator/claim', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify({ code })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || 'invalid');
    }
    showToast(t('creatorInviteSuccess'));
    await checkCreator();
  }catch(_){
    alert(t('creatorInviteFail'));
  }
};
if (btnCreatorTerms) btnCreatorTerms.onclick = ()=>{
  if (!checkLoginOrRedirect(t('loginReq'))) return;
  openCreatorTermsDialog();
};
if (btnCreatorProfile) btnCreatorProfile.onclick = ()=>{
  if (!isCreator) return;
  if (creatorProfileName) creatorProfileName.value = creatorName || '';
  if (creatorProfileAvatarUrl) creatorProfileAvatarUrl.value = creatorAvatar || '';
  if (creatorProfileCoverUrl) creatorProfileCoverUrl.value = creatorCover || '';
  if (creatorProfileCoverPos) creatorProfileCoverPos.value = creatorCoverPos || '50% 50%';
  setImagePreviewFromUrl(creatorProfileAvatarPreview, creatorProfileAvatarSize, creatorAvatar, t('creatorProfileAvatarHint'));
  setImagePreviewFromUrl(creatorProfileCoverPreview, creatorProfileCoverSize, creatorCover, t('creatorProfileAvatarHint'));
  applyCreatorCoverPos(creatorCoverPos || '50% 50%');
  if (creatorProfileIg) creatorProfileIg.value = creatorIg || '';
  if (creatorProfileYoutube) creatorProfileYoutube.value = creatorYoutube || '';
  if (creatorProfileFacebook) creatorProfileFacebook.value = creatorFacebook || '';
  if (creatorProfileTiktok) creatorProfileTiktok.value = creatorTiktok || '';
  if (creatorProfileIntro) creatorProfileIntro.value = creatorIntro || '';
  if (creatorProfileStatus) creatorProfileStatus.textContent = '';
  if (creatorProfileAvatarStatus) creatorProfileAvatarStatus.textContent = '';
  if (creatorProfileCoverStatus) creatorProfileCoverStatus.textContent = '';
  updateCreatorProfilePreview();
  if (creatorProfileDialog && typeof creatorProfileDialog.showModal === 'function') creatorProfileDialog.showModal();
  else if (creatorProfileDialog) creatorProfileDialog.setAttribute('open', '');
};
if (creatorProfileClose) creatorProfileClose.onclick = ()=>{
  if (creatorProfileDialog && typeof creatorProfileDialog.close === 'function') creatorProfileDialog.close();
  else if (creatorProfileDialog) creatorProfileDialog.removeAttribute('open');
  clearImagePreviewBlob(creatorProfileAvatarPreview);
  clearImagePreviewBlob(creatorProfileCoverPreview);
};
if (creatorTermsClose) creatorTermsClose.onclick = ()=>{
  if (creatorTermsDialog && typeof creatorTermsDialog.close === 'function') creatorTermsDialog.close();
  else if (creatorTermsDialog) creatorTermsDialog.removeAttribute('open');
};
if (coordsHelpClose) coordsHelpClose.onclick = ()=>{
  if (coordsHelpDialog && typeof coordsHelpDialog.close === 'function') coordsHelpDialog.close();
  else if (coordsHelpDialog) coordsHelpDialog.removeAttribute('open');
};
if (creatorProfileSave) creatorProfileSave.onclick = async ()=>{
  if (!isCreator) return;
  const nextName = creatorProfileName ? creatorProfileName.value.trim() : '';
  const nextAvatar = creatorProfileAvatarUrl ? creatorProfileAvatarUrl.value.trim() : '';
  const nextCover = creatorProfileCoverUrl ? creatorProfileCoverUrl.value.trim() : '';
  const nextCoverPos = creatorProfileCoverPos ? creatorProfileCoverPos.value.trim() : creatorCoverPos;
  const nextIg = creatorProfileIg ? creatorProfileIg.value.trim() : '';
  const nextYoutube = creatorProfileYoutube ? creatorProfileYoutube.value.trim() : '';
  const nextFacebook = creatorProfileFacebook ? creatorProfileFacebook.value.trim() : '';
  const nextTiktok = creatorProfileTiktok ? creatorProfileTiktok.value.trim() : '';
  const nextIntro = creatorProfileIntro ? creatorProfileIntro.value.trim() : '';
  if (!nextName){
    if (creatorProfileStatus) creatorProfileStatus.textContent = t('creatorProfileNameEmpty');
    return;
  }
  if (creatorProfileStatus) creatorProfileStatus.textContent = '';
  try{
    const res = await fetch('/api/creator/profile', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify({ creatorName: nextName, creatorAvatar: nextAvatar, creatorCover: nextCover, creatorCoverPos: nextCoverPos, creatorIg: nextIg, creatorYoutube: nextYoutube, creatorFacebook: nextFacebook, creatorTiktok: nextTiktok, creatorIntro: nextIntro })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || 'failed');
    }
    creatorName = data.name ? String(data.name) : nextName;
    creatorAvatar = data.avatar ? String(data.avatar) : nextAvatar;
    creatorCover = data.cover ? String(data.cover) : nextCover;
    creatorCoverPos = data.coverPos ? String(data.coverPos) : (nextCoverPos || creatorCoverPos);
    creatorIg = data.ig ? String(data.ig) : nextIg;
    creatorYoutube = data.youtube ? String(data.youtube) : nextYoutube;
    creatorFacebook = data.facebook ? String(data.facebook) : nextFacebook;
    creatorTiktok = data.tiktok ? String(data.tiktok) : nextTiktok;
    creatorIntro = data.intro ? String(data.intro) : nextIntro;
    if (creatorProfileName) creatorProfileName.value = creatorName;
    if (creatorProfileAvatarUrl) creatorProfileAvatarUrl.value = creatorAvatar;
    if (creatorProfileCoverUrl) creatorProfileCoverUrl.value = creatorCover;
    if (creatorProfileCoverPos) creatorProfileCoverPos.value = creatorCoverPos || '50% 50%';
    if (creatorProfileIg) creatorProfileIg.value = creatorIg;
    if (creatorProfileYoutube) creatorProfileYoutube.value = creatorYoutube;
    if (creatorProfileFacebook) creatorProfileFacebook.value = creatorFacebook;
    if (creatorProfileTiktok) creatorProfileTiktok.value = creatorTiktok;
    if (creatorProfileIntro) creatorProfileIntro.value = creatorIntro;
    setImagePreviewFromUrl(creatorProfileAvatarPreview, creatorProfileAvatarSize, creatorAvatar, t('creatorProfileAvatarHint'));
    setImagePreviewFromUrl(creatorProfileCoverPreview, creatorProfileCoverSize, creatorCover, t('creatorProfileAvatarHint'));
    applyCreatorCoverPos(creatorCoverPos || '50% 50%');
    updateCreatorProfilePreview();
    if (creatorId && Array.isArray(DATA)){
      DATA.forEach(item=>{
        if (String(item.ownerId || '') === String(creatorId)){
          item.ownerName = creatorName;
          item.creatorIg = creatorIg;
          item.creatorYoutube = creatorYoutube;
          item.creatorFacebook = creatorFacebook;
          item.creatorTiktok = creatorTiktok;
          item.creatorIntro = creatorIntro;
          item.creatorAvatar = creatorAvatar;
          item.creatorCover = creatorCover;
          item.creatorCoverPos = creatorCoverPos || '50% 50%';
        }
      });
    }
    initFilters();
    safeRender();
    showToast(t('creatorProfileSaved'));
    if (creatorProfileDialog && typeof creatorProfileDialog.close === 'function') creatorProfileDialog.close();
    else if (creatorProfileDialog) creatorProfileDialog.removeAttribute('open');
  }catch(err){
    if (creatorProfileStatus) creatorProfileStatus.textContent = t('creatorProfileFail') + (err && err.message ? '：' + err.message : '');
  }
};
if (creatorTermsAgree) creatorTermsAgree.onclick = async ()=>{
  if (!checkLoginOrRedirect(t('loginReq'))) return;
  if (!isCreator) return;
  if (creatorTermsStatus) creatorTermsStatus.textContent = '';
  creatorTermsAgree.disabled = true;
  try{
    const res = await fetch('/api/creator/terms', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify({ accept:true })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || ('HTTP '+res.status));
    }
    creatorTermsAccepted = true;
    creatorTermsAcceptedAt = data && data.acceptedAt ? String(data.acceptedAt) : new Date().toISOString();
    updateCreatorTermsUi();
    updateCreatorTermsDialogState();
    showToast(t('creatorTermsAcceptedToast'));
    if (creatorTermsDialog && typeof creatorTermsDialog.close === 'function') creatorTermsDialog.close();
    else if (creatorTermsDialog) creatorTermsDialog.removeAttribute('open');
  }catch(err){
    const msg = t('creatorTermsFail') + (err && err.message ? err.message : '');
    if (creatorTermsStatus) creatorTermsStatus.textContent = msg;
    else alert(msg);
    if (creatorTermsStatus) creatorTermsStatus.classList.remove('ok');
  }finally{
    creatorTermsAgree.disabled = false;
  }
};
if (creatorProfileAvatarFile){
  creatorProfileAvatarFile.addEventListener('change', async ()=>{
    const file = creatorProfileAvatarFile.files && creatorProfileAvatarFile.files[0];
    if (!file) return;
    setImagePreviewFromFile(creatorProfileAvatarPreview, creatorProfileAvatarSize, file);
    if (creatorProfileAvatarUrl) creatorProfileAvatarUrl.value = creatorProfileAvatarPreview?.dataset?.blobUrl || '';
    updateCreatorProfilePreview();
    if (creatorProfileAvatarStatus) creatorProfileAvatarStatus.textContent = t('uploading');
    try{
      const url = await uploadCoverFile(file);
      if (creatorProfileAvatarUrl) creatorProfileAvatarUrl.value = url;
      setImagePreviewFromUrl(creatorProfileAvatarPreview, creatorProfileAvatarSize, url, t('creatorProfileAvatarHint'));
      if (creatorProfileAvatarStatus) creatorProfileAvatarStatus.textContent = t('uploaded');
      updateCreatorProfilePreview();
    }catch(_){
      if (creatorProfileAvatarStatus) creatorProfileAvatarStatus.textContent = t('uploadFail');
    }
  });
}
function initGalleryEditors(root){
  if (!root) return;
  root.querySelectorAll('[data-admin-gallery-list]').forEach(listEl=>{
    if (listEl.dataset.galleryReady !== '1') {
      listEl.dataset.galleryReady = '1';
      listEl.addEventListener('dragover', (event)=>{
        event.preventDefault();
        const dragging = listEl.querySelector('.is-dragging');
        if (!dragging) return;
        const after = getGalleryAfterElement(listEl, event.clientX, event.clientY);
        if (!after) listEl.appendChild(dragging);
        else listEl.insertBefore(dragging, after);
      });
      listEl.addEventListener('click', (event)=>{
        const btn = event.target.closest('[data-admin-gallery-remove]');
        if (!btn) return;
        const item = btn.closest('[data-gallery-url]');
        if (item) item.remove();
        if (!listEl.querySelector('[data-gallery-url]')){
          renderAdminGalleryList(listEl, []);
        }
      });
    }
    listEl.querySelectorAll('[data-gallery-item]').forEach(item=> initGalleryItem(item));
  });
  root.querySelectorAll('[data-admin-gallery-file]').forEach(input=>{
    if (input.dataset.galleryReady === '1') return;
    input.dataset.galleryReady = '1';
    input.addEventListener('change', async ()=>{
      const files = Array.from(input.files || []);
      if (!files.length) return;
      const wrap = input.closest('[data-admin-id]');
      const listEl = wrap ? wrap.querySelector('[data-admin-gallery-list]') : null;
      const statusEl = wrap ? wrap.querySelector('[data-admin-status="gallery"]') : null;
      const setStatus = (text)=>{ if (statusEl) statusEl.textContent = text || ''; };
      const urls = getGalleryItemsFromList(listEl);
      let uploaded = 0;
      let failed = 0;
      input.disabled = true;
      setStatus(t('uploading'));
      for (const file of files){
        try{
          const url = await uploadCoverFile(file);
          if (url) {
            urls.push({ url, pos: '50% 50%' });
            uploaded += 1;
          }
        }catch(_){
          failed += 1;
        }
      }
      renderAdminGalleryList(listEl, urls);
      initGalleryEditors(wrap || root);
      if (uploaded) setStatus(t('uploaded'));
      else if (failed) setStatus(t('uploadFail'));
      if (failed) alert(t('uploadFail'));
      input.value = '';
      input.disabled = false;
    });
  });
}
if (creatorProfileCoverFile){
  creatorProfileCoverFile.addEventListener('change', async ()=>{
    const file = creatorProfileCoverFile.files && creatorProfileCoverFile.files[0];
    if (!file) return;
    setImagePreviewFromFile(creatorProfileCoverPreview, creatorProfileCoverSize, file);
    if (creatorProfileCoverUrl) creatorProfileCoverUrl.value = creatorProfileCoverPreview?.dataset?.blobUrl || '';
    applyCreatorCoverPos(creatorCoverPos || '50% 50%');
    updateCreatorProfilePreview();
    if (creatorProfileCoverStatus) creatorProfileCoverStatus.textContent = t('uploading');
    try{
      const url = await uploadCoverFile(file);
      if (creatorProfileCoverUrl) creatorProfileCoverUrl.value = url;
      setImagePreviewFromUrl(creatorProfileCoverPreview, creatorProfileCoverSize, url, t('creatorProfileAvatarHint'));
      if (creatorProfileCoverStatus) creatorProfileCoverStatus.textContent = t('uploaded');
      applyCreatorCoverPos(creatorCoverPos || '50% 50%');
      updateCreatorProfilePreview();
    }catch(_){
      if (creatorProfileCoverStatus) creatorProfileCoverStatus.textContent = t('uploadFail');
    }
  });
}
if (creatorProfileName) creatorProfileName.addEventListener('input', updateCreatorProfilePreview);
if (creatorProfileIg) creatorProfileIg.addEventListener('input', updateCreatorProfilePreview);
if (creatorProfileYoutube) creatorProfileYoutube.addEventListener('input', updateCreatorProfilePreview);
if (creatorProfileFacebook) creatorProfileFacebook.addEventListener('input', updateCreatorProfilePreview);
if (creatorProfileTiktok) creatorProfileTiktok.addEventListener('input', updateCreatorProfilePreview);
if (creatorProfileIntro) creatorProfileIntro.addEventListener('input', updateCreatorProfilePreview);
if (btnCreatorShare) btnCreatorShare.onclick = async ()=>{
  if (!isCreator) return;
  const url = buildCreatorShareUrl();
  try{
    await copyText(url);
    showToast(t('shareCopied'));
  }catch(_){
    window.prompt(t('sharePrompt'), url);
  }
};
if (btnCreatorCode) btnCreatorCode.onclick = async ()=>{
  try{
    const label = prompt(t('creatorInviteLabel')) || '';
    const res = await fetch('/api/admin/creator/invite', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify({ label })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data || data.ok === false){
      throw new Error((data && data.error) || 'failed');
    }
    window.prompt(t('creatorInviteReady'), data.code || '');
  }catch(_){
    alert(t('saveFail') + t('unknownError'));
  }
};

function bootFoodMap(){
  if (foodBooted) return;
  foodBooted = true;

  // 優化：優先讀取快取或預設資料，實現秒開
  if (loadCacheData()) {
    // loadCacheData 內部會設定 dataReady = true 並渲染
  } else if (DATA && DATA.length > 0) {
    dataReady = true;
    safeRender();
    openFoodFromUrl();
  } else {
    dataLoading = true;
    dataReady = false;
    showLoadingState();
  }

  setSyncIndicator(true);
  showNearbyToggle(false);
  setNearbyCollapsed(false);
  checkAdmin().then(()=>{ safeRender(); });
  checkCreator();
  applyCreatorInviteFromUrl();
  initFilters();
  resetFilters();
  applyCreatorShareFromUrl();
  syncCreatorShareFilter();
  [kwInput, fCat, fArea, fCreator, fPrice, fStatus].filter(Boolean).forEach(el=> el.addEventListener('input', () => {
    currentLimit = PAGE_SIZE;
    safeRender();
  }));
  if (fCreator){
    fCreator.addEventListener('change', ()=>{
      if (!suppressCreatorShareClear){
        creatorShareId = '';
        creatorShareName = '';
      }
    });
  }
  if (fSort) {
    fSort.addEventListener('change', ()=>{
      currentLimit = PAGE_SIZE;
      if (fSort.value === 'dist_asc' && !userLocation) {
        if (nearbyStatus) nearbyStatus.textContent = t('locating');
        navigator.geolocation.getCurrentPosition(
          (pos)=>{
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            updateMapPreview(userLocation, t('locMy'));
            safeRender();
          },
          ()=>{ alert(t('locPerm')); fSort.value = ''; safeRender(); }
        );
      } else {
        safeRender();
      }
    });
  }
  ensureGoogleMaps(); // 移除延遲，直接載入地圖
  loadRemote();
  loadMeta();
  fetch('/api/foods/track', { method:'POST' }).catch(()=>{});
  try{
    if (window.trackEvent) window.trackEvent('food_map_view');
  }catch(_){}
}

async function runNearby(origin, label){
  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) return;
  showNearbyToggle(true);
  setNearbyCollapsed(false);
  if (nearbyStatus) nearbyStatus.textContent = t('preparing', {dist: NEARBY_MAX_KM});
  if (nearbyList) nearbyList.innerHTML = '';
  const cachedList = getNearbyFromCached(origin, 5);
  if (cachedList.length){
    const shown = renderNearbyList(cachedList);
    if (nearbyStatus) nearbyStatus.textContent = t('showing', {n: shown});
  }
  try{
    const list = await getNearbyRestaurants(origin, 5);
    const shown = renderNearbyList(list);
    if (!shown && nearbyStatus){
      nearbyStatus.textContent = t('nearbyNone', {dist: NEARBY_MAX_KM});
    }else if (nearbyStatus && label){
      nearbyStatus.textContent = t('nearbyFound', {dist: NEARBY_MAX_KM, label, n: shown});
    }
  }catch(_){
    if (nearbyStatus) nearbyStatus.textContent = t('nearbyFail');
  }
}
if (nearbyUse){
  nearbyUse.addEventListener('click', ()=>{
    ensureGoogleMaps();
    if (!navigator.geolocation){
      if (nearbyStatus) nearbyStatus.textContent = t('browserNoLoc');
      return;
    }
    if (nearbyStatus) nearbyStatus.textContent = t('locating');
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        userLocation = coords;
        updateMapPreview(coords, t('locMy'));
        runNearby(coords, t('locMy'));
      },
      ()=>{
        if (nearbyStatus) nearbyStatus.textContent = t('locPerm');
      },
      { enableHighAccuracy:true, timeout: 8000, maximumAge: 60000 }
    );
  });
}
if (nearbySearch){
  const runSearch = async ()=>{
    await ensureGoogleMaps();
    const query = nearbyInput ? nearbyInput.value.trim() : '';
    if (!query){
      if (nearbyStatus) nearbyStatus.textContent = t('inputHotel');
      return;
    }
    if (nearbyStatus) nearbyStatus.textContent = t('searchLoc');
    let coords = null;
    let label = query;
    if (googleReady){
      const result = await geocodeWithGoogle(query);
      coords = result ? { lat: result.lat, lng: result.lng } : null;
      label = result && result.label ? result.label : query;
    }else{
      coords = await geocodeQuery(query);
    }
    if (!coords){
      if (nearbyStatus) nearbyStatus.textContent = t('locNotFound');
      return;
    }
    updateMapPreview(coords, label);
    runNearby(coords, label);
  };
  nearbySearch.addEventListener('click', runSearch);
  if (nearbyInput){
    nearbyInput.addEventListener('keydown', (ev)=>{
      ensureGoogleMaps();
      if (ev.key === 'Enter'){
        ev.preventDefault();
        runSearch();
      }
    });
  }
}
if (nearbyToggle){
  nearbyToggle.addEventListener('click', ()=>{
    ensureGoogleMaps();
    setNearbyCollapsed(!isNearbyCollapsed());
  });
}

async function loadMeta(){
  try{
    const res = await fetch('/api/foods/meta');
    const data = await res.json().catch(()=>({}));
    if(data && data.ok && data.meta && data.meta.subtitle){
      const el = document.getElementById('pageSubtitle');
      if(el) el.textContent = data.meta.subtitle;
    }
  }catch(_){}
}

// 讀取遠端資料與收藏
async function loadRemote(){
  dataLoading = true;
  setSyncIndicator(true);
  if (!dataReady) showLoadingState();
  try{
    const res = await fetch('/api/foods'); // 移除 no-store，允許瀏覽器快取 (需配合後端 Cache-Control)
    const data = await res.json().catch(()=>({}));
    if (res.ok && Array.isArray(data.items)){
      DATA = data.items.filter(it=>it && !it.deleted);
      saveCacheData(DATA);
    }
  }catch(err){
    console.error("Failed to load remote food data, using fallback.", err);
    if (loadCacheData()) {
      console.log("Loaded from local cache");
    }
  }
  dataReady = true;
  dataLoading = false;
  setSyncIndicator(false);
  await refreshFavorites();
  initFilters();
  applyCreatorShareFromUrl();
  syncCreatorShareFilter();
  safeRender();
  openFoodFromUrl();
}

function loadGooglePlaceDetails(item, container) {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    container.innerHTML = `
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; text-align:center;">
        <div style="color:#94a3b8; font-size:13px; display:flex; align-items:center; justify-content:center; gap:8px;">
          <span style="display:inline-block; width:14px; height:14px; border:2px solid #cbd5e1; border-top-color:#64748b; border-radius:50%; animation:spin 1s linear infinite;"></span>
          ${escapeHtml(t('loadingReviews'))}
        </div>
      </div>`;
    return;
  }
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  
  const placeId = item.googlePlaceId || item.google_place_id;
  if (placeId) {
    service.getDetails({
      placeId: placeId,
      fields: ['rating', 'user_ratings_total', 'reviews', 'url']
    }, (place, statusDet) => {
      if (statusDet === google.maps.places.PlacesServiceStatus.OK && place) {
        renderGoogleReviews(place, container);
      } else {
        container.innerHTML = `<div style="padding:15px;color:#94a3b8;font-size:13px;text-align:center;background:#f8fafc;border-radius:12px;">${escapeHtml(t('failReviewsId'))}</div>`;
      }
    });
    return;
  }

  // 優先嘗試從 Google Maps 連結中提取搜尋關鍵字，比單純用店名更準確
  let query = '';
  if (item.maps) {
    try {
      const u = new URL(item.maps);
      const qVal = u.searchParams.get('q') || u.searchParams.get('query');
      if (qVal) {
        query = qVal;
      } else if (u.pathname.includes('/place/')) {
        const parts = u.pathname.split('/');
        const idx = parts.indexOf('place');
        if (idx >= 0 && parts[idx + 1]) {
          query = decodeURIComponent(parts[idx + 1]).replace(/\+/g, ' ');
        }
      }
    } catch (e) {}
  }
  
  if (!query) {
    query = (item.name || '') + ' ' + (item.area || '') + ' Thailand';
  }
  
  service.findPlaceFromQuery({
    query: query,
    fields: ['place_id']
  }, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
      service.getDetails({
        placeId: results[0].place_id,
        fields: ['rating', 'user_ratings_total', 'reviews', 'url']
      }, (place, statusDet) => {
        if (statusDet === google.maps.places.PlacesServiceStatus.OK && place) {
          renderGoogleReviews(place, container);
        } else {
          container.innerHTML = `<div style="padding:15px;color:#94a3b8;font-size:13px;text-align:center;background:#f8fafc;border-radius:12px;">${escapeHtml(t('failReviews'))}</div>`;
        }
      });
    } else {
      container.innerHTML = `<div style="padding:15px;color:#94a3b8;font-size:13px;text-align:center;background:#f8fafc;border-radius:12px;">${escapeHtml(t('gmapFail'))}</div>`;
    }
  });
}

function renderGoogleReviews(place, container) {
  const rating = place.rating || 0;
  const total = place.user_ratings_total || 0;
  const reviews = place.reviews || [];
  
  // 產生星星 HTML
  const starHtml = (r) => {
    const full = Math.floor(r);
    const hasHalf = (r % 1) >= 0.5;
    let html = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) html += '<span style="color:#fbbc04;">★</span>';
      else if (i === full && hasHalf) html += '<span style="background:linear-gradient(90deg, #fbbc04 50%, #e2e8f0 50%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">★</span>';
      else html += '<span style="color:#e2e8f0;">★</span>';
    }
    return html;
  };

  let html = `
    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
      <div style="padding:14px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style="width:20px; height:20px;">
          <div>
            <div style="font-weight:700; font-size:13px; color:#0f172a; line-height:1.2;">${escapeHtml(t('gReviews'))}</div>
            <div style="font-size:11px; color:#64748b;">${escapeHtml(t('reviewsCount', { n: total.toLocaleString() }))}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:22px; font-weight:800; color:#0f172a; line-height:1;">${rating}</div>
          <div style="font-size:12px; letter-spacing:1px; margin-top:2px;">${starHtml(rating)}</div>
        </div>
      </div>
  `;
  
  if (reviews.length) {
    html += `<div style="display:flex; flex-direction:column;">`;
    reviews.slice(0, 3).forEach((r, idx) => {
      const txt = r.text || '';
      const isLong = txt.length > 85;
      const displayTxt = isLong ? txt.slice(0, 85) + '...' : txt;
      const border = idx === reviews.slice(0,3).length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;';
      
      html += `
        <div style="padding:14px 16px; ${border}">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <img src="${escapeHtml(safeUrl(r.profile_photo_url) || '')}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;">
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; font-weight:700; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.author_name)}</div>
              <div style="display:flex; align-items:center; gap:6px; font-size:10px; color:#94a3b8;">
                <span style="display:flex; color:#fbbc04; font-size:10px;">${'★'.repeat(Math.floor(r.rating))}</span>
                <span>${escapeHtml(r.relative_time_description || '')}</span>
              </div>
            </div>
          </div>
          ${txt ? `<div style="font-size:13px; color:#475569; line-height:1.6;">${escapeHtml(displayTxt)}</div>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  } else {
    html += `<div style="padding:20px; text-align:center; color:#94a3b8; font-size:13px;">${escapeHtml(t('noReviews'))}</div>`;
  }

  html += `
      <a href="${escapeHtml(safeUrl(place.url) || '#')}" target="_blank" rel="noopener" style="display:block; text-align:center; padding:12px; background:#f8fafc; border-top:1px solid #e2e8f0; font-size:13px; font-weight:600; color:#2563eb; text-decoration:none; transition:background 0.2s;">
        ${escapeHtml(t('seeMore'))}
      </a>
    </div>
  `;
  
  container.innerHTML = html;
}

// Modal：店家資訊
function openModal(id){
  const item = DATA.find(x=>x.id===id);
  if (!item) return;
  try{
    if (window.trackEvent) window.trackEvent('food_detail_open', { itemId: item.id });
  }catch(_){}
  const body = document.getElementById('foodModalBody');
  const dlg = document.getElementById('foodModal');
  const introText = buildIntroText(item);
  const ytEmbed = buildYouTubeEmbedUrl(item.youtube || item.ig);
  const iframe = ytEmbed ? `<iframe src="${escapeHtml(ytEmbed)}" allowfullscreen></iframe>` : '';
  const embedClass = ytEmbed ? 'modal-embed yt' : 'modal-embed';
  const hoursText = String(item.hours || '').trim();
  const mapsUrl = safeUrl(item.maps);
  const igUrl = safeUrl(item.ig);
  const safeId = escapeHtml(item.id || '');
  const dayTripStops = normalizeDayTripStops(item.dayTripStops || item.day_trip_stops);
  const isDayTrip = isDayTripCategory(item.category) || dayTripStops.length > 0;
  const galleryImages = normalizeGalleryItems(item.images || item.gallery || []);
  const galleryHtml = galleryImages.length
    ? `
      <div class="modal-gallery">
        <div class="modal-gallery-title">${escapeHtml(t('galleryLabel'))}</div>
        <div class="modal-gallery-grid">
          ${galleryImages.map(entry => `
            <button class="modal-gallery-thumb" type="button" data-gallery-src="${escapeHtml(entry.url)}" aria-label="${escapeHtml(t('galleryLabel'))}">
              <img src="${escapeHtml(entry.url)}" alt="${escapeHtml(item.name || '')}" style="object-position:${escapeHtml(entry.pos || '50% 50%')};">
            </button>
          `).join('')}
        </div>
      </div>
    `
    : '';
  const dayTripListHtml = dayTripStops.length
    ? `
      <div class="modal-section modal-daytrip">
        <strong>${escapeHtml(t('dayTripListTitle'))}</strong>
        <div class="modal-daytrip-list">
          ${dayTripStops.map((stop, idx)=>{
            const name = stop.name || extractPlaceNameFromMapsUrl(stop.maps) || extractMapsQuery(stop.maps) || t('dayTripStopFallback');
            const note = String(stop.note || '').trim();
            const navUrl = safeUrl(stop.maps);
            const navLink = navUrl
              ? `<a class="modal-daytrip-link" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener">${escapeHtml(t('navBtn'))}</a>`
              : '';
            return `
              <div class="modal-daytrip-item">
                <div class="modal-daytrip-index">${idx + 1}</div>
                <div class="modal-daytrip-body">
                  <div class="modal-daytrip-name">${escapeHtml(name)}</div>
                  ${note ? `<div class="modal-daytrip-note">${escapeHtml(note)}</div>` : ''}
                </div>
                ${navLink}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `
    : '';
  const shareBtn = item.id
    ? `<button id="foodShare" class="modal-icon-btn" title="${escapeHtml(t('share'))}" aria-label="${escapeHtml(t('share'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <path d="M8.7 13.5l6.4 3.2"></path>
          <path d="M15.1 7.3l-6.4 3.2"></path>
        </svg>
      </button>`
    : '';
  const displayCat = mapCategory(item.category) || item.category;
  const tags = [
    displayCat,
    item.area,
    item.price ? `${t('priceLabel')} ${item.price}` : ''
  ]
    .filter(Boolean)
    .map(t=>`<span class="modal-chip">${escapeHtml(t)}</span>`)
    .join('');
  const metaTags = [
    hoursText ? `${t('hours')} ${hoursText}` : ''
  ]
    .filter(Boolean)
    .map(t=>`<span class="modal-chip">${escapeHtml(t)}</span>`)
    .join('');
  body.innerHTML = `
    <div class="modal-body">
      <div class="modal-head">
        <div class="modal-title">${escapeHtml(item.name || '')}</div>
        <div class="modal-head-actions">
          ${shareBtn}
          <button id="foodClose" class="modal-close">${escapeHtml(t('close'))}</button>
        </div>
      </div>
      <div class="modal-tags">${tags}</div>
      <div class="${embedClass}">
        <div class="modal-embed-inner">
          ${iframe || `<div style="padding:20px;color:#94a3b8;text-align:center;">${escapeHtml(t('noYt'))}</div>`}
        </div>
      </div>
      ${galleryHtml}
      <div class="modal-section">
        <strong>${escapeHtml(t('desc'))}</strong>
        <div style="white-space:pre-wrap;line-height:1.8;color:#475569;">${escapeHtml(introText || t('noIntro'))}</div>
      </div>
      ${dayTripListHtml}
      ${isDayTrip ? '' : `
      <div class="modal-section">
        <div><strong>${escapeHtml(t('addr'))}：</strong>${escapeHtml(item.address || '') || escapeHtml(t('unknownAddr'))}</div>
        ${metaTags ? `<div class="modal-tags" style="margin-top:8px;">${metaTags}</div>` : ''}
      </div>
      `}
      ${isDayTrip ? '' : `
      <div class="modal-section">
        <strong>${escapeHtml(t('reviews'))}</strong>
        <div id="googleReviewsBox" style="margin-top:4px;"></div>
      </div>
      `}
      <div class="modal-actions">
        ${isDayTrip ? '' : `<a class="btn primary" href="${escapeHtml(mapsUrl || '#')}" target="_blank" rel="noopener">${escapeHtml(t('openGmaps'))}</a>`}
        ${igUrl ? `<a class="btn ghost" href="${escapeHtml(igUrl)}" target="_blank" rel="noopener" style="color:#d62976;border-color:#d62976;">${escapeHtml(t('viewIg'))}</a>` : ''}
        <button class="btn ghost" data-fav="${safeId}">${escapeHtml(t('addFav'))}</button>
      </div>
    </div>
  `;
  dlg.showModal();
  document.getElementById('foodClose').onclick = ()=> dlg.close();
  const shareBtnEl = document.getElementById('foodShare');
  if (shareBtnEl) shareBtnEl.onclick = ()=> shareFood(item);
  if (!isDayTrip){
    ensureGoogleMaps().then(() => {
      const box = document.getElementById('googleReviewsBox');
      if (box) loadGooglePlaceDetails(item, box);
    });
  }
  const favBtn = body.querySelector('button[data-fav]');
  if (favBtn){ favBtn.onclick = ()=> toggleFav(item.id); }
  body.querySelectorAll('[data-gallery-src]').forEach(btn=>{
    btn.onclick = ()=>{
      const src = btn.getAttribute('data-gallery-src') || '';
      openImageLightbox(src, item.name || '');
    };
  });
}

// 收藏清單與收藏 API
async function refreshFavorites(){
  try{
    const r = await fetch('/api/me/food-favs',{credentials:'include',cache:'no-store'});
    const j = await r.json().catch(()=>({}));
    if (r.ok && Array.isArray(j.favorites)){
      favs = j.favorites;
        safeRender();
    }
    return r.ok;
  }catch(_){ return false; }
}
async function toggleFav(id){
  if (!checkLoginOrRedirect(t('loginAddFav'))) return;
  try{
    const action = favs.includes(id) ? 'remove' : 'add';
    const res = await fetch('/api/me/food-favs',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ id, action })
    });
    const data = await res.json().catch(()=>({}));
    if (res.status === 401){ alert(t('loginAddFav')); return; }
    if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
    favs = data.favorites || [];
    safeRender();
  }catch(err){
    alert(t('favFail') + (err.message||err));
  }
}
function openFavList(){
  const dlg = document.getElementById('foodModal');
  const body = document.getElementById('foodModalBody');
  const list = DATA.filter(it=> favs.includes(it.id));
  
  const planButtonHtml = list.length >= 3 ? `
    <div style="margin-top:16px; padding-top:16px; border-top:1px solid #e2e8f0;">
      <button class="btn primary" id="planTripFromFavs" style="width:100%;">${escapeHtml(t('planTrip'))}</button>
    </div>
  ` : '';

  body.innerHTML = `
    <div style="padding:16px;display:grid;gap:12px;background:#fff;max-height:80vh;overflow:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:18px;font-weight:800;">${escapeHtml(t('fav'))}</div>
        <button id="foodClose" style="border:none;background:#f1f5f9;border-radius:10px;padding:6px 10px;cursor:pointer;">${escapeHtml(t('close'))}</button>
      </div>
      ${!list.length ? `<div style="color:#94a3b8; text-align:center; padding:20px 0;">${escapeHtml(t('emptyFav'))}</div>` : `
        <div style="display:grid;gap:8px;">
          ${list.map(it=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;">
            <div>
              <div style="font-weight:700;">${escapeHtml(it.name || '')}</div>
              <div style="color:#64748b;font-size:12px;">${escapeHtml(mapCategory(it.category) || it.category || '')}｜${escapeHtml(it.area || '')}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn ghost" style="padding:6px 10px;font-size:12px;" data-open="${escapeHtml(it.id || '')}">${escapeHtml(t('viewBtn'))}</button>
              <button class="btn" style="padding:6px 10px;font-size:12px;" data-remove="${escapeHtml(it.id || '')}">${escapeHtml(t('removeBtn'))}</button>
            </div>
          </div>`).join('')}
        </div>
      `}
      ${planButtonHtml}
    </div>
  `;
  dlg.showModal();
  document.getElementById('foodClose').onclick = ()=> dlg.close();
  body.querySelectorAll('button[data-open]').forEach(btn=>{
    btn.onclick = ()=> openModal(btn.getAttribute('data-open'));
  });
  body.querySelectorAll('button[data-remove]').forEach(btn=>{
    btn.onclick = ()=> removeFav(btn.getAttribute('data-remove'));
  });

  const planBtn = document.getElementById('planTripFromFavs');
  if (planBtn) {
    planBtn.onclick = async () => {
      planBtn.textContent = t('planning');
      planBtn.disabled = true;
      try {
        const startCoords = await new Promise((resolve, reject) => {
          if (userLocation) return resolve(userLocation);
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {
              alert(t('cantLocate'));
              const firstItem = DATA.find(it => it.id === favs[0]);
              const coords = getCachedCoords(firstItem);
              if (coords) resolve(coords);
              else reject(new Error(t('startLocFail')));
            }
          );
        });

        const selected = favs.map(id => DATA.find(it => it.id === id)).filter(Boolean);
        const sorted = sortTripItems(startCoords, selected);
        const gmapsUrl = buildMultiStopUrl(startCoords, sorted);

        renderTripResult(sorted, gmapsUrl, startCoords);
        tripResultModal.showModal();
      } catch (err) {
        alert(t('tripFail') + err.message);
      } finally {
        planBtn.textContent = t('planTrip');
        planBtn.disabled = false;
      }
    };
  }
}
async function removeFav(id){
  if (!checkLoginOrRedirect(t('loginRemoveFav'))) return;
  try{
    const res = await fetch('/api/me/food-favs',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ id, action:'remove' })
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok || !data.ok) throw new Error(data.error || ('HTTP '+res.status));
    favs = data.favorites || [];
    safeRender();
    const dlg = document.getElementById('foodModal');
    if (dlg.open) openFavList();
  }catch(err){
    alert(t('removeFail') + (err.message||err));
  }
}
document.addEventListener('DOMContentLoaded', bootFoodMap);
window.addEventListener('hashchange', openFoodFromUrl);
