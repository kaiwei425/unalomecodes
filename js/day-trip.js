(function(){
  const statusEl = document.getElementById('statusText');
  const resultEl = document.getElementById('resultPanel');
  const startInput = document.getElementById('startLocation');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const modeSelect = document.getElementById('modeSelect');
  const transportSelect = document.getElementById('transportSelect');
  const mealBreakfast = document.getElementById('mealBreakfast');
  const mealLunch = document.getElementById('mealLunch');
  const mealSnack = document.getElementById('mealSnack');
  const mealDinner = document.getElementById('mealDinner');
  const includeTempleToggle = document.getElementById('includeTempleToggle');
  const allowClosedToggle = document.getElementById('allowClosedToggle');
  const adjustDialog = document.getElementById('adjustDialog');
  const btnAdjustPlan = document.getElementById('btnAdjustPlan');
  const btnAdjustClose = document.getElementById('btnAdjustClose');
  const btnAdjustApply = document.getElementById('btnAdjustApply');
  const btnLocate = document.getElementById('btnLocate');
  const btnGenerate = document.getElementById('btnGenerate');
  const btnSavePlan = document.getElementById('btnSavePlan');
  const btnPrint = document.getElementById('btnPrint');
  const btnShareLine = document.getElementById('btnShareLine');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const btnCopyShare = document.getElementById('btnCopyShare');

  const stepper = document.getElementById('stepper');
  const stepPills = Array.from(document.querySelectorAll('[data-step-pill]'));
  const stepSections = Array.from(document.querySelectorAll('[data-step-section]'));
  const btnStep1Next = document.getElementById('btnStep1Next');
  const btnStep2Back = document.getElementById('btnStep2Back');
  const btnStep2Next = document.getElementById('btnStep2Next');
  const btnStep3Back = document.getElementById('btnStep3Back');
  const btnStep3Next = document.getElementById('btnStep3Next');
  const btnStep4Back = document.getElementById('btnStep4Back');

  const mustSearchInput = document.getElementById('mustSearchInput');
  const mustSearchResults = document.getElementById('mustSearchResults');
  const mustList = document.getElementById('mustList');
  const recommendList = document.getElementById('recommendList');
  const favFoodList = document.getElementById('favFoodList');
  const favTempleList = document.getElementById('favTempleList');
  const candidateSummary = document.getElementById('candidateSummary');
  const btnClearFilters = document.getElementById('btnClearFilters');

  const foodCatFilter = document.getElementById('foodCatFilter');
  const foodAreaFilter = document.getElementById('foodAreaFilter');
  const foodPriceFilter = document.getElementById('foodPriceFilter');
  const foodTagFilters = document.getElementById('foodTagFilters');

  const templeAreaFilter = document.getElementById('templeAreaFilter');
  const templeTagFilters = document.getElementById('templeTagFilters');
  const templeWishFilters = document.getElementById('templeWishFilters');

  const mapSearchInput = document.getElementById('mapSearchInput');
  const mapPlaceType = document.getElementById('mapPlaceType');
  const btnAddMapPlace = document.getElementById('btnAddMapPlace');
  const mapPlaceInfo = document.getElementById('mapPlaceInfo');
  const mapCanvas = document.getElementById('mapCanvas');

  const modeCards = document.getElementById('modeCards');
  const routeSelect = document.getElementById('routeSelect');
  const routeHint = document.getElementById('routeHint');

  const savedList = document.getElementById('savedList');

  const DEFAULT_STAY = { food: 60, temple: 45, spot: 50 };
  const POPULAR_STAY_BONUS = { food: 10, temple: 15, spot: 20 };
  const DISPLAY_TIME_ROUND_STEP = 10;
  const COVER_THUMB_WIDTH = 140;
  const COMMONS_THUMB_WIDTH = 240;
  const COMMONS_SEARCH_LIMIT = 4;
  const COMMONS_LICENSE_ALLOW = ['Public domain', 'CC0', 'CC BY', 'CC BY-SA', 'PD'];
  const MODE_DEFAULT_STAY = {
    battle: { food: 45, temple: 35, spot: 40 },
    balance: { food: 60, temple: 45, spot: 50 },
    chill: { food: 80, temple: 60, spot: 70 }
  };
  const CLOSED_REGEX = /(休息|公休|店休|暫停營業|歇業|closed)/i;
  const ALL_DAY_REGEX = /(24\s*小時|24\s*hr|24\s*h|24\/7|24-7|all\s*day|全天|全日)/i;
  const FOOD_SLOT_ORDER = ['morning', 'noon', 'afternoon', 'evening', 'night'];
  const TEMPLE_SLOT_ORDER = ['morning', 'afternoon', 'evening'];
  const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];
  const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', snack: '下午茶', dinner: '晚餐' };
  const MEAL_WINDOWS = {
    breakfast: [420, 600],
    lunch: [660, 840],
    snack: [840, 1020],
    dinner: [1020, 1200]
  };
  const STORAGE_KEY = 'day_trip_saved_plans_v1';
  const RECOMMENDED_SPOTS = [
    { name:'恰圖恰市集', kind:'spot', lat:13.8002651, lng:100.5511228, area:'曼谷', category:'市集', group:'夜市/市集' },
    { name:'Asiatique 河濱夜市', kind:'spot', lat:13.7042168, lng:100.5028259, area:'曼谷', category:'夜市', group:'夜市/市集' },
    { name:'喬德夜市（Rama 9）', kind:'spot', lat:13.7581533, lng:100.5670256, area:'曼谷', category:'夜市', group:'夜市/市集' },
    { name:'火車夜市（席娜卡琳）', kind:'spot', lat:13.6946657, lng:100.6510865, area:'曼谷', category:'夜市', group:'夜市/市集' },
    { name:'Patpong 夜市', kind:'spot', lat:13.730987, lng:100.529651, area:'曼谷', category:'夜市', group:'夜市/市集' },
    { name:'耀華力路（唐人街）', kind:'spot', lat:13.7400474, lng:100.5104603, area:'曼谷', category:'美食街', group:'夜市/市集' },
    { name:'巴空花市', kind:'spot', lat:13.7417086, lng:100.4963295, area:'曼谷', category:'花市', group:'夜市/市集' },
    { name:'水門市場', kind:'spot', lat:13.751109, lng:100.540969, area:'曼谷', category:'市集', group:'夜市/市集' },
    { name:'ICONSIAM', kind:'spot', lat:13.7268226, lng:100.510294, area:'曼谷', category:'購物', group:'曼谷市區' },
    { name:'暹羅百麗宮', kind:'spot', lat:13.7463659, lng:100.5347712, area:'曼谷', category:'購物', group:'曼谷市區' },
    { name:'CentralWorld', kind:'spot', lat:13.7465986, lng:100.5393167, area:'曼谷', category:'購物', group:'曼谷市區' },
    { name:'Terminal 21 Asok', kind:'spot', lat:13.7378796, lng:100.5606087, area:'曼谷', category:'購物', group:'曼谷市區' },
    { name:'暹羅廣場', kind:'spot', lat:13.745718, lng:100.533997, area:'曼谷', category:'散步', group:'曼谷市區' },
    { name:'考山路', kind:'spot', lat:13.7587665, lng:100.4975792, area:'曼谷', category:'夜生活', group:'曼谷市區' },
    { name:'倫披尼公園', kind:'spot', lat:13.7306004, lng:100.5415377, area:'曼谷', category:'公園', group:'曼谷市區' },
    { name:'班嘉奇蒂公園', kind:'spot', lat:13.7301846, lng:100.5593081, area:'曼谷', category:'公園', group:'曼谷市區' },
    { name:'班哲希利公園', kind:'spot', lat:13.7302061, lng:100.5693937, area:'曼谷', category:'公園', group:'曼谷市區' },
    { name:'Mahanakhon SkyWalk', kind:'spot', lat:13.7231503, lng:100.5280809, area:'曼谷', category:'觀景', group:'曼谷市區' },
    { name:'四面佛', kind:'spot', lat:13.7446127, lng:100.5400004, area:'曼谷', category:'地標', group:'曼谷市區' },
    { name:'暹羅海洋世界', kind:'spot', lat:13.7460079, lng:100.5348824, area:'曼谷', category:'景點', group:'曼谷市區' },
    { name:'Jim Thompson House', kind:'spot', lat:13.7492268, lng:100.5282811, area:'曼谷', category:'博物館', group:'歷史文化' },
    { name:'曼谷藝術文化中心', kind:'spot', lat:13.746778, lng:100.5302625, area:'曼谷', category:'藝文', group:'歷史文化' },
    { name:'湄南河河畔夜景', kind:'spot', lat:13.723563, lng:100.506354, area:'曼谷', category:'觀景', group:'曼谷市區' },
    { name:'丹嫩莎朵水上市場', kind:'spot', lat:13.5190148, lng:99.959346, area:'叻丕府', category:'水上市場', group:'水上市場' },
    { name:'安帕瓦水上市場', kind:'spot', lat:13.4248722, lng:99.9554592, area:'夜功府', category:'水上市場', group:'水上市場' },
    { name:'塔卡水上市場', kind:'spot', lat:13.4526684, lng:99.9533106, area:'叻丕府', category:'水上市場', group:'水上市場' },
    { name:'美功鐵道市場', kind:'spot', lat:13.4077308, lng:100.0009031, area:'夜功府', category:'鐵道市場', group:'近郊一日' },
    { name:'瑪哈猜海鮮市場', kind:'spot', lat:13.5451019, lng:100.2761542, area:'龍仔厝府', category:'海鮮市場', group:'近郊一日' },
    { name:'大城古城', kind:'spot', lat:14.3535461, lng:100.5622548, area:'大城', category:'古城', group:'近郊一日' },
    { name:'邦芭茵皇宮', kind:'spot', lat:14.2326451, lng:100.5794291, area:'大城', category:'皇宮', group:'近郊一日' },
    { name:'古城（Muang Boran）', kind:'spot', lat:13.5405466, lng:100.6239998, area:'北欖府', category:'歷史園區', group:'近郊一日' },
    { name:'三頭象神博物館', kind:'spot', lat:13.6299759, lng:100.5891358, area:'北欖府', category:'博物館', group:'近郊一日' },
    { name:'愛侶灣瀑布', kind:'spot', lat:14.3693371, lng:99.1385158, area:'北碧府', category:'自然景點', group:'近郊一日' },
    { name:'芭達雅海灘', kind:'spot', lat:12.936583, lng:100.8859605, area:'芭達雅', category:'海灘', group:'海邊' },
    { name:'真理寺', kind:'spot', lat:12.972777, lng:100.8891503, area:'芭達雅', category:'景點', group:'海邊' },
    { name:'東芭樂園（Nong Nooch）', kind:'spot', lat:12.7646849, lng:100.9361187, area:'芭達雅', category:'花園', group:'海邊' },
    { name:'桂河大橋', kind:'spot', lat:14.0404105, lng:99.503463, area:'北碧府', category:'歷史景點', group:'近郊一日' },
    { name:'華欣海灘', kind:'spot', lat:12.570583, lng:99.957564, area:'華欣', category:'海灘', group:'海邊' },
    { name:'華欣夜市', kind:'spot', lat:12.568633, lng:99.957852, area:'華欣', category:'夜市', group:'海邊' }
  ];

  const ROUTE_SPOTS = {
    grandPalace: { name:'大皇宮', kind:'temple', lat:13.7500, lng:100.4913, area:'曼谷', category:'皇宮寺廟', hours:'08:30-15:30' },
    watPho: { name:'臥佛寺', kind:'temple', lat:13.7467, lng:100.4927, area:'曼谷', category:'寺廟', hours:'08:00-18:30' },
    watArun: { name:'鄭王廟', kind:'temple', lat:13.7436, lng:100.4889, area:'曼谷', category:'寺廟', hours:'08:00-18:00' },
    watSaket: { name:'金山寺', kind:'temple', lat:13.7538, lng:100.5066, area:'曼谷', category:'寺廟', hours:'07:30-19:00' },
    giantSwing: { name:'大鞦韆', kind:'spot', lat:13.7513, lng:100.5018, area:'曼谷', category:'地標', hours:'全天' },
    erawanShrine: { name:'四面佛', kind:'temple', lat:13.7446, lng:100.5400, area:'曼谷', category:'寺廟', hours:'06:00-23:00' },
    siamSquare: { name:'暹羅廣場', kind:'spot', lat:13.7457, lng:100.5340, area:'曼谷', category:'散步', hours:'10:00-22:00' },
    siamParagon: { name:'暹羅百麗宮', kind:'spot', lat:13.7464, lng:100.5348, area:'曼谷', category:'購物', hours:'10:00-22:00' },
    centralWorld: { name:'CentralWorld', kind:'spot', lat:13.7466, lng:100.5393, area:'曼谷', category:'購物', hours:'10:00-22:00' },
    terminal21: { name:'Terminal 21 Asok', kind:'spot', lat:13.7379, lng:100.5606, area:'曼谷', category:'購物', hours:'10:00-22:00' },
    bacc: { name:'曼谷藝術文化中心', kind:'spot', lat:13.7468, lng:100.5303, area:'曼谷', category:'藝文', hours:'10:00-20:00' },
    jimThompson: { name:'Jim Thompson House', kind:'spot', lat:13.7492, lng:100.5283, area:'曼谷', category:'博物館', hours:'10:00-18:00' },
    mahanakhon: { name:'Mahanakhon SkyWalk', kind:'spot', lat:13.7232, lng:100.5281, area:'曼谷', category:'觀景', hours:'10:00-22:00' },
    iconSiam: { name:'ICONSIAM', kind:'spot', lat:13.7268, lng:100.5103, area:'曼谷', category:'購物', hours:'10:00-22:00' },
    asiatique: { name:'Asiatique 河濱夜市', kind:'spot', lat:13.7042, lng:100.5028, area:'曼谷', category:'夜市', hours:'16:00-24:00' },
    khaoSan: { name:'考山路', kind:'spot', lat:13.7588, lng:100.4976, area:'曼谷', category:'夜生活', hours:'16:00-24:00' },
    yaowarat: { name:'耀華力路（唐人街）', kind:'spot', lat:13.7400, lng:100.5105, area:'曼谷', category:'美食街', hours:'16:00-24:00' },
    pakKhlong: { name:'巴空花市', kind:'spot', lat:13.7417, lng:100.4963, area:'曼谷', category:'花市', hours:'全天' },
    chatuchak: { name:'恰圖恰市集', kind:'spot', lat:13.8003, lng:100.5511, area:'曼谷', category:'市集', hours:'09:00-18:00' },
    joddFairs: { name:'喬德夜市（Rama 9）', kind:'spot', lat:13.7581, lng:100.5670, area:'曼谷', category:'夜市', hours:'16:00-23:00' },
    trainMarket: { name:'火車夜市（席娜卡琳）', kind:'spot', lat:13.6947, lng:100.6511, area:'曼谷', category:'夜市', hours:'16:00-24:00' },
    watergate: { name:'水門市場', kind:'spot', lat:13.7511, lng:100.5410, area:'曼谷', category:'市集', hours:'10:00-20:00' },
    lumphini: { name:'倫披尼公園', kind:'spot', lat:13.7306, lng:100.5415, area:'曼谷', category:'公園', hours:'04:30-21:00' },
    benjakitti: { name:'班嘉奇蒂公園', kind:'spot', lat:13.7302, lng:100.5593, area:'曼谷', category:'公園', hours:'05:00-21:00' },
    benchasiri: { name:'班哲希利公園', kind:'spot', lat:13.7302, lng:100.5694, area:'曼谷', category:'公園', hours:'05:00-21:00' },
    damnoen: { name:'丹嫩莎朵水上市場', kind:'spot', lat:13.5190, lng:99.9593, area:'叻丕府', category:'水上市場', hours:'07:00-12:00' },
    amphawa: { name:'安帕瓦水上市場', kind:'spot', lat:13.4249, lng:99.9555, area:'夜功府', category:'水上市場', hours:'14:00-20:00' },
    maeklong: { name:'美功鐵道市場', kind:'spot', lat:13.4077, lng:100.0009, area:'夜功府', category:'鐵道市場', hours:'07:00-17:00' },
    ayutthaya: { name:'大城古城', kind:'spot', lat:14.3535, lng:100.5623, area:'大城', category:'古城', hours:'08:00-18:00' },
    watMahathat: { name:'瑪哈泰寺', kind:'temple', lat:14.3571, lng:100.5690, area:'大城', category:'寺廟', hours:'08:00-18:00' },
    watChaiwatthanaram: { name:'柴瓦塔那蘭寺', kind:'temple', lat:14.3449, lng:100.4887, area:'大城', category:'寺廟', hours:'08:00-18:00' },
    bangPaIn: { name:'邦芭茵皇宮', kind:'spot', lat:14.2326, lng:100.5794, area:'大城', category:'皇宮', hours:'08:30-16:30' },
    muangBoran: { name:'古城（Muang Boran）', kind:'spot', lat:13.5405, lng:100.6240, area:'北欖府', category:'歷史園區', hours:'09:00-18:00' },
    erawanMuseum: { name:'三頭象神博物館', kind:'spot', lat:13.6299, lng:100.5891, area:'北欖府', category:'博物館', hours:'09:00-18:00' },
    mahachai: { name:'瑪哈猜海鮮市場', kind:'spot', lat:13.5451, lng:100.2762, area:'龍仔厝府', category:'海鮮市場', hours:'06:00-17:00' },
    riverKwai: { name:'桂河大橋', kind:'spot', lat:14.0404, lng:99.5035, area:'北碧府', category:'歷史景點', hours:'全天' },
    erawanFalls: { name:'愛侶灣瀑布', kind:'spot', lat:14.3693, lng:99.1385, area:'北碧府', category:'自然景點', hours:'08:00-16:30' },
    pattayaBeach: { name:'芭達雅海灘', kind:'spot', lat:12.9366, lng:100.8860, area:'芭達雅', category:'海灘', hours:'全天' },
    sanctuaryTruth: { name:'真理寺', kind:'spot', lat:12.9728, lng:100.8892, area:'芭達雅', category:'景點', hours:'08:00-18:00' },
    nongNooch: { name:'東芭樂園（Nong Nooch）', kind:'spot', lat:12.7647, lng:100.9361, area:'芭達雅', category:'花園', hours:'08:00-18:00' },
    pattayaWalking: { name:'Walking Street', kind:'spot', lat:12.9277, lng:100.8762, area:'芭達雅', category:'夜生活', hours:'18:00-24:00' },
    huaHinBeach: { name:'華欣海灘', kind:'spot', lat:12.5706, lng:99.9576, area:'華欣', category:'海灘', hours:'全天' },
    huaHinNight: { name:'華欣夜市', kind:'spot', lat:12.5686, lng:99.9579, area:'華欣', category:'夜市', hours:'17:00-23:00' },
    cicada: { name:'Cicada Market', kind:'spot', lat:12.5312, lng:99.9659, area:'華欣', category:'市集', hours:'16:00-23:00' }
  };

  const ROUTE_TEMPLATES = [
    {
      id: 'bkk-riverside',
      name: '曼谷河岸寺廟經典',
      group: '曼谷市區',
      desc: '大皇宮・臥佛寺・鄭王廟・ICONSIAM・河濱夜市',
      stops: [ROUTE_SPOTS.grandPalace, ROUTE_SPOTS.watPho, ROUTE_SPOTS.watArun, ROUTE_SPOTS.iconSiam, ROUTE_SPOTS.asiatique]
    },
    {
      id: 'bkk-oldtown',
      name: '曼谷老城文化路線',
      group: '曼谷市區',
      desc: '金山寺・大鞦韆・考山路・唐人街・花市',
      stops: [ROUTE_SPOTS.watSaket, ROUTE_SPOTS.giantSwing, ROUTE_SPOTS.khaoSan, ROUTE_SPOTS.yaowarat, ROUTE_SPOTS.pakKhlong]
    },
    {
      id: 'bkk-shopping',
      name: '曼谷購物夜景線',
      group: '曼谷市區',
      desc: '暹羅・百麗宮・CentralWorld・四面佛・Mahanakhon',
      stops: [ROUTE_SPOTS.siamSquare, ROUTE_SPOTS.siamParagon, ROUTE_SPOTS.centralWorld, ROUTE_SPOTS.erawanShrine, ROUTE_SPOTS.mahanakhon]
    },
    {
      id: 'bkk-art',
      name: '曼谷藝文文青線',
      group: '曼谷市區',
      desc: 'BACC・Jim Thompson・暹羅・河畔夜景',
      stops: [ROUTE_SPOTS.bacc, ROUTE_SPOTS.jimThompson, ROUTE_SPOTS.siamSquare, ROUTE_SPOTS.iconSiam]
    },
    {
      id: 'bkk-parks',
      name: '曼谷公園慢遊',
      group: '曼谷市區',
      desc: '倫披尼・班嘉奇蒂・班哲希利・Terminal 21',
      stops: [ROUTE_SPOTS.lumphini, ROUTE_SPOTS.benjakitti, ROUTE_SPOTS.benchasiri, ROUTE_SPOTS.terminal21]
    },
    {
      id: 'bkk-night',
      name: '曼谷夜市巡禮',
      group: '曼谷市區',
      desc: '喬德夜市・席娜卡琳・河濱夜市・唐人街',
      stops: [ROUTE_SPOTS.joddFairs, ROUTE_SPOTS.trainMarket, ROUTE_SPOTS.asiatique, ROUTE_SPOTS.yaowarat]
    },
    {
      id: 'bkk-chatuchak',
      name: '恰圖恰北區一日',
      group: '曼谷市區',
      desc: '恰圖恰・水門市場・BACC',
      stops: [ROUTE_SPOTS.chatuchak, ROUTE_SPOTS.watergate, ROUTE_SPOTS.bacc]
    },
    {
      id: 'floating-markets',
      name: '水上市場經典線',
      group: '近郊一日',
      desc: '丹嫩莎朵・美功鐵道市場・安帕瓦',
      stops: [ROUTE_SPOTS.damnoen, ROUTE_SPOTS.maeklong, ROUTE_SPOTS.amphawa]
    },
    {
      id: 'maeklong-amphawa',
      name: '美功＋安帕瓦夕陽',
      group: '近郊一日',
      desc: '美功鐵道市場・安帕瓦',
      stops: [ROUTE_SPOTS.maeklong, ROUTE_SPOTS.amphawa]
    },
    {
      id: 'ayutthaya',
      name: '大城古城一日',
      group: '近郊一日',
      desc: '邦芭茵・大城古城・瑪哈泰寺・柴瓦塔那蘭寺',
      stops: [ROUTE_SPOTS.bangPaIn, ROUTE_SPOTS.ayutthaya, ROUTE_SPOTS.watMahathat, ROUTE_SPOTS.watChaiwatthanaram]
    },
    {
      id: 'samutprakan',
      name: '北欖府古城＋象神博物館',
      group: '近郊一日',
      desc: '古城・三頭象神博物館',
      stops: [ROUTE_SPOTS.muangBoran, ROUTE_SPOTS.erawanMuseum]
    },
    {
      id: 'mahachai',
      name: '瑪哈猜海鮮市場一日',
      group: '近郊一日',
      desc: '海鮮市場・曼谷市區晚餐',
      stops: [ROUTE_SPOTS.mahachai, ROUTE_SPOTS.yaowarat]
    },
    {
      id: 'kanchanaburi',
      name: '北碧府桂河自然',
      group: '近郊一日',
      desc: '桂河大橋・愛侶灣瀑布',
      stops: [ROUTE_SPOTS.riverKwai, ROUTE_SPOTS.erawanFalls]
    },
    {
      id: 'pattaya',
      name: '芭達雅海邊一日',
      group: '海邊一日',
      desc: '芭達雅海灘・真理寺・東芭樂園・Walking Street',
      stops: [ROUTE_SPOTS.pattayaBeach, ROUTE_SPOTS.sanctuaryTruth, ROUTE_SPOTS.nongNooch, ROUTE_SPOTS.pattayaWalking]
    },
    {
      id: 'huahin',
      name: '華欣海灘慢旅',
      group: '海邊一日',
      desc: '華欣海灘・Cicada Market・華欣夜市',
      stops: [ROUTE_SPOTS.huaHinBeach, ROUTE_SPOTS.cicada, ROUTE_SPOTS.huaHinNight]
    }
  ];

  const state = {
    foods: [],
    temples: [],
    popularItems: [],
    customItems: [],
    favoriteFoodIds: [],
    favoriteTempleIds: [],
    favoritesLoaded: false,
    favoritesLoading: false,
    ready: false,
    startCoords: null,
    startLabel: '',
    mustIds: new Set(),
    currentPlan: [],
    currentSummary: null,
    planStale: false,
    savedPlans: [],
    selectedRouteId: 'auto',
    selectedMapPlace: null,
    popularCoverCache: new Map(),
    popularCoverPending: new Set(),
    googleReady: false,
    googleMap: null,
    googleMarker: null,
    googleAutocomplete: null,
    googleStartAutocomplete: null,
    googleMapsKey: '',
    googleLoadingPromise: null
  };

  function setStatus(text, isError){
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? '#b91c1c' : '';
  }

  function markPlanStale(message, silent){
    if (!state.currentSummary || !state.currentSummary.plan || !state.currentSummary.plan.length) return;
    state.planStale = true;
    renderPlan(state.currentSummary, { skipGoogle: true });
    if (silent) return;
    setStatus(message || '行程設定已變更，請重新產生');
  }

  function clearPlanStale(){
    state.planStale = false;
  }

  let currentStep = 1;
  let maxStep = 1;
  function updateMaxStep(step){
    if (Number.isFinite(step)) maxStep = Math.max(maxStep, step);
  }
  function showStep(step){
    currentStep = step;
    stepSections.forEach(section => {
      section.classList.toggle('is-active', section.getAttribute('data-step-section') === String(step));
    });
    stepPills.forEach(pill => {
      pill.classList.toggle('is-active', pill.getAttribute('data-step-pill') === String(step));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep1(){
    const startVal = (startInput && startInput.value || '').trim();
    if (!startVal){
      setStatus('請先輸入起點位置', true);
      return false;
    }
    const startMin = timeInputToMinutes(startTimeInput && startTimeInput.value);
    const endMin = timeInputToMinutes(endTimeInput && endTimeInput.value);
    if (startMin === null || endMin === null){
      setStatus('請填寫出發與回程時間', true);
      return false;
    }
    if (endMin <= startMin){
      setStatus('回程時間需晚於出發時間', true);
      return false;
    }
    return true;
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

  function timeInputToMinutes(input){
    const val = String(input || '').trim();
    const out = parseTimeMinutes(val);
    return Number.isFinite(out) ? out : null;
  }

  function formatMinutes(minutes){
    const m = Math.max(0, Math.round(minutes));
    if (m === 1440) return '24:00';
    const wrapped = m % 1440;
    const h = Math.floor(wrapped / 60);
    const mm = wrapped % 60;
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  function formatMinutesApprox(minutes){
    const step = DISPLAY_TIME_ROUND_STEP;
    const rounded = Math.round(minutes / step) * step;
    return formatMinutes(rounded);
  }

  function safeObjectPosition(input){
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (/^[\d.%+-]+\s+[\d.%+-]+$/.test(raw)) return raw;
    return '';
  }

  function buildThumbUrl(raw, width){
    const safe = sanitizeImageUrl(raw);
    if (!safe) return '';
    const w = Math.max(80, Math.min(320, Number(width) || COVER_THUMB_WIDTH));
    if (safe.startsWith('data:image/')) return safe;
    return `/api/img?u=${encodeURIComponent(safe)}&w=${w}&q=58&fmt=webp`;
  }

  function getCoverKey(item){
    if (!item) return '';
    return String(item.googlePlaceId || item.id || item.name || '').trim();
  }

  function buildDetailUrl(item){
    if (!item || item.isCustom || item.isPopular) return '';
    const id = String(item.id || '').trim();
    if (!id) return '';
    if (item.kind === 'food') return `/food-map?id=${encodeURIComponent(id)}`;
    if (item.kind === 'temple') return `/templemap?id=${encodeURIComponent(id)}`;
    return '';
  }

  function setTimeInput(input, value){
    if (!input) return;
    input.value = value || '';
    if (!input.value && value === '24:00'){
      input.value = '23:59';
    }
  }

  function formatPlaceLabel(label, fallback){
    const raw = String(label || '').trim();
    if (!raw) return String(fallback || '').trim();
    const first = raw.split(',')[0].trim();
    if (first && !/^[\d\s-]+$/.test(first)) return first;
    return raw;
  }

  function pickCommonsLicense(meta){
    const name = meta && meta.LicenseShortName && meta.LicenseShortName.value
      ? String(meta.LicenseShortName.value).replace(/<[^>]*>/g, '').trim()
      : '';
    if (!name) return '';
    return COMMONS_LICENSE_ALLOW.find(allow => name.includes(allow)) ? name : '';
  }

  async function fetchCommonsCover(query){
    const q = String(query || '').trim();
    if (!q) return null;
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&srlimit=${COMMONS_SEARCH_LIMIT}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json().catch(()=>null);
    const hits = searchData && searchData.query && Array.isArray(searchData.query.search)
      ? searchData.query.search
      : [];
    const titles = hits.map(hit => hit.title).filter(Boolean);
    if (!titles.length) return null;
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${COMMONS_THUMB_WIDTH}&titles=${encodeURIComponent(titles.join('|'))}&format=json&origin=*`;
    const infoRes = await fetch(infoUrl);
    if (!infoRes.ok) return null;
    const infoData = await infoRes.json().catch(()=>null);
    const pages = infoData && infoData.query && infoData.query.pages ? infoData.query.pages : {};
    const pageList = Object.values(pages);
    for (const page of pageList){
      const info = page && page.imageinfo && page.imageinfo[0] ? page.imageinfo[0] : null;
      if (!info) continue;
      const license = pickCommonsLicense(info.extmetadata || {});
      if (!license) continue;
      const url = sanitizeImageUrl(info.thumburl || info.url || '');
      if (!url) continue;
      const sourceUrl = sanitizeImageUrl(info.descriptionurl || '');
      return { url, sourceUrl, license };
    }
    return null;
  }

  function getCoverInfo(item){
    const coverRaw = item && (item.cover || item.coverUrl || item.cover_url || '');
    const coverPos = item && safeObjectPosition(item.coverPos || item.cover_pos);
    const coverUrl = coverRaw ? buildThumbUrl(coverRaw, COVER_THUMB_WIDTH) : '';
    if (coverUrl) {
      return { url: coverUrl, pos: coverPos, sourceUrl: '', key: '', domKey: '' };
    }
    if (!item || !item.isPopular) return { url: '', pos: '', sourceUrl: '', key: '', domKey: '' };
    const key = getCoverKey(item);
    if (!key) return { url: '', pos: '', sourceUrl: '', key: '', domKey: '' };
    const cached = state.popularCoverCache.get(key);
    if (cached && cached.url) {
      return { url: cached.url, pos: '', sourceUrl: cached.sourceUrl || '', key, domKey: encodeURIComponent(key) };
    }
    if (!state.popularCoverPending.has(key)) {
      state.popularCoverPending.add(key);
      const baseName = String(item.name || '').trim();
      const query = `${baseName} Thailand`.trim();
      fetchCommonsCover(query)
        .then((cover)=>{
          if (!cover && baseName) return fetchCommonsCover(baseName);
          return cover;
        })
        .then((cover)=>{
          state.popularCoverPending.delete(key);
          state.popularCoverCache.set(key, cover || null);
          if (cover && cover.url) applyCoverToDom(key, cover);
        })
        .catch(()=>{
          state.popularCoverPending.delete(key);
          state.popularCoverCache.set(key, null);
        });
    }
    return { url: '', pos: '', sourceUrl: '', key, domKey: encodeURIComponent(key) };
  }

  function applyCoverToDom(key, cover){
    if (!resultEl || !key || !cover || !cover.url) return;
    const domKey = encodeURIComponent(key);
    const nodes = resultEl.querySelectorAll(`[data-cover-key="${domKey}"]`);
    nodes.forEach(node=>{
      const img = node.querySelector('img');
      if (img){
        img.src = cover.url;
        node.classList.remove('is-placeholder');
        return;
      }
      node.innerHTML = `<img src="${escapeHtml(cover.url)}" alt="" loading="lazy" decoding="async">`;
      node.classList.remove('is-placeholder');
    });
    if (cover.sourceUrl){
      resultEl.querySelectorAll(`[data-cover-source="${domKey}"]`).forEach(link=>{
        link.setAttribute('href', cover.sourceUrl);
        link.style.display = '';
      });
    }
  }

  function isClosedText(raw){
    return CLOSED_REGEX.test(String(raw || '').trim());
  }

  function isAllDayText(raw){
    return ALL_DAY_REGEX.test(String(raw || '').trim());
  }

  function haversineKm(a, b){
    if (!a || !b) return 9999;
    const toRad = (deg)=>deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
    return 6371 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
  }

  function parseHoursRanges(raw){
    const text = String(raw || '').trim();
    if (!text) return [];
    const ranges = [];
    const rangeRegex = /(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?\s*(?:-|–|—|~|～|〜|到|至|－)\s*(\d{1,2})(?:\s*[:：.]\s*(\d{2}))?/g;
    let match;
    while ((match = rangeRegex.exec(text)) !== null) {
      const start = parseTimeMinutes(`${match[1]}:${match[2] || '00'}`);
      const end = parseTimeMinutes(`${match[3]}:${match[4] || '00'}`);
      if (start === null || end === null) continue;
      if (start === end) continue;
      ranges.push([start, end]);
    }
    return ranges;
  }

  function parseOpenInfo(raw){
    const text = String(raw || '').trim();
    if (!text) return { ranges: [], allDay: false, hasHours: false, closedAllDay: false };
    if (isAllDayText(text)) return { ranges: [], allDay: true, hasHours: true, closedAllDay: false };
    if (isClosedText(text)) return { ranges: [], allDay: false, hasHours: true, closedAllDay: true };
    return { ranges: parseHoursRanges(text), allDay: false, hasHours: true, closedAllDay: false };
  }

  function inferSlotsFromHours(raw, slotWindows, slotOrder, allDayKey){
    const text = String(raw || '').trim();
    if (!text) return [];
    if (isAllDayText(text)) {
      return allDayKey ? [allDayKey] : slotOrder.slice();
    }
    if (isClosedText(text)) return [];
    const ranges = parseHoursRanges(text);
    if (!ranges.length) return [];
    const chosen = new Set();
    const overlaps = (aStart, aEnd, bStart, bEnd) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
    ranges.forEach(([start, end])=>{
      const segments = end > start ? [[start, end]] : [[start, 1440], [0, end]];
      segments.forEach(([segStart, segEnd])=>{
        slotOrder.forEach((slot)=>{
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

  function resolveFoodSlots(item){
    const raw = normalizeListField(item.openSlots || item.open_slots);
    if (raw.length) {
      const mapped = raw.map(s=>String(s).trim());
      if (mapped.some(s=>/^(all_day|24h|24hours|全天)$/i.test(s))) return FOOD_SLOT_ORDER.slice();
      return mapped;
    }
    const windows = {
      morning: [[360, 600]],
      noon: [[600, 840]],
      afternoon: [[840, 1080]],
      evening: [[1080, 1320]],
      night: [[1320, 1440], [0, 180]]
    };
    return inferSlotsFromHours(item.hours, windows, FOOD_SLOT_ORDER, null);
  }

  function resolveTempleSlots(item){
    const raw = normalizeListField(item.openSlots || item.open_slots);
    if (raw.length) {
      const mapped = raw.map((slot)=>{
        if (slot === 'night') return 'evening';
        if (/^(all_day|24h|24hours|全天)$/i.test(slot)) return 'all_day';
        return slot;
      });
      if (mapped.includes('all_day')) return ['all_day'];
      return mapped.filter(slot=>slot !== 'all_day');
    }
    const windows = {
      morning: [[360, 720]],
      afternoon: [[720, 1080]],
      evening: [[1080, 1440]]
    };
    const inferred = inferSlotsFromHours(item.hours, windows, TEMPLE_SLOT_ORDER, 'all_day');
    if (inferred.includes('all_day')) return ['all_day'];
    return inferred;
  }

  function getFoodSlotForTime(minutes){
    if (minutes >= 1320 || minutes < 180) return 'night';
    if (minutes >= 1080) return 'evening';
    if (minutes >= 840) return 'afternoon';
    if (minutes >= 600) return 'noon';
    return 'morning';
  }

  function getTempleSlotForTime(minutes){
    if (minutes >= 1080 && minutes < 1440) return 'evening';
    if (minutes >= 720) return 'afternoon';
    if (minutes >= 360) return 'morning';
    return '';
  }

  function isOpenAt(item, minutes){
    if (!item) return false;
    if (item.closedAllDay) return false;
    if (item.openAllDay) return true;
    const ranges = item.openRanges || [];
    if (ranges.length){
      return ranges.some(([start, end])=>{
        if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
        if (start === end) return false;
        if (end > start) return minutes >= start && minutes < end;
        return minutes >= start || minutes < end;
      });
    }
    const slots = item.openSlotsResolved || [];
    if (!slots.length) return true;
    if (slots.includes('all_day')) return true;
    const slot = item.kind === 'temple' ? getTempleSlotForTime(minutes) : getFoodSlotForTime(minutes);
    if (!slot) return false;
    return slots.includes(slot);
  }

  function readCoords(item){
    const lat = Number(item.lat ?? item.latitude);
    const lng = Number(item.lng ?? item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  function normalizeItems(list, kind){
    return (Array.isArray(list) ? list : [])
      .filter(item => item && !item.deleted)
      .map(item => {
        const coords = readCoords(item);
        if (!coords) return null;
        const stayMinRaw = item.stayMin || item.stay_min;
        const stayMinVal = Number(stayMinRaw);
        const stayMinIsDefault = !Number.isFinite(stayMinVal);
        const stayMin = stayMinIsDefault ? DEFAULT_STAY[kind] : stayMinVal;
        const openInfo = parseOpenInfo(item.hours);
        const openSlotsResolved = kind === 'temple' ? resolveTempleSlots(item) : resolveFoodSlots(item);
        const openAllDay = openInfo.allDay || openSlotsResolved.includes('all_day');
        const closedAllDay = openInfo.closedAllDay && !openAllDay;
        return {
          id: String(item.id || ''),
          name: item.name || '',
          category: item.category || '',
          area: item.area || '',
          price: item.price || '',
          rating: item.rating || '',
          maps: item.maps || '',
          googlePlaceId: item.googlePlaceId || item.google_place_id || '',
          hours: item.hours || '',
          tags: normalizeListField(item.tags),
          wishTags: normalizeListField(item.wishTags || item.wish_tags),
          kind,
          coords,
          cover: item.cover || item.coverUrl || item.cover_url || '',
          coverPos: item.coverPos || item.cover_pos || '',
          intro: item.intro || '',
          detail: item.detail || '',
          ctaText: item.ctaText || item.cta_text || '',
          ctaUrl: item.ctaUrl || item.cta_url || '',
          stayMin,
          stayMinIsDefault,
          openSlotsResolved,
          openRanges: openInfo.ranges || [],
          openAllDay,
          closedAllDay,
          hasHours: openInfo.hasHours,
          isCustom: false,
          isPopular: false,
          group: ''
        };
      })
      .filter(Boolean);
  }

  function dedupeItems(list){
    const seen = new Set();
    return (Array.isArray(list) ? list : []).filter(item => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function getPopularItems(){
    if (!state.popularItems.length){
      state.popularItems = RECOMMENDED_SPOTS.map(buildPresetItem);
    }
    return state.popularItems.slice();
  }

  function buildRouteItem(spot, routeId){
    const item = buildPresetItem(spot);
    item.isRoute = true;
    item.routeId = routeId || '';
    item.isPopular = true;
    return item;
  }

  function buildRouteItems(route, includeTemples){
    if (!route || !Array.isArray(route.stops)) return [];
    return route.stops
      .filter(stop => includeTemples || stop.kind !== 'temple')
      .map(stop => buildRouteItem(stop, route.id));
  }

  function getRouteById(routeId){
    if (!routeId) return null;
    return ROUTE_TEMPLATES.find(route => route.id === routeId) || null;
  }

  function updateRouteHint(route){
    if (!routeHint) return;
    if (!route){
      routeHint.textContent = '自動挑選熱門路線主軸，依時間安排。';
      return;
    }
    const names = route.stops.map(stop => stop.name).filter(Boolean);
    const preview = names.slice(0, 6).join('・');
    const extra = names.length > 6 ? `等 ${names.length} 個` : '';
    const desc = route.desc || route.name;
    routeHint.textContent = `${desc}：${preview}${extra}`;
  }

  function renderRouteOptions(){
    if (!routeSelect) return;
    const current = routeSelect.value || state.selectedRouteId || 'auto';
    routeSelect.innerHTML = '';
    const autoOpt = document.createElement('option');
    autoOpt.value = 'auto';
    autoOpt.textContent = '自動挑選熱門路線';
    routeSelect.appendChild(autoOpt);

    const groups = new Map();
    ROUTE_TEMPLATES.forEach(route => {
      const group = route.group || '其他';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(route);
    });
    groups.forEach((routes, group) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group;
      routes.forEach(route => {
        const opt = document.createElement('option');
        opt.value = route.id;
        opt.textContent = route.name;
        optgroup.appendChild(opt);
      });
      routeSelect.appendChild(optgroup);
    });

    if (routeSelect.querySelector(`option[value="${current}"]`)) {
      routeSelect.value = current;
    } else {
      routeSelect.value = 'auto';
    }
    state.selectedRouteId = routeSelect.value;
    updateRouteHint(getRouteById(routeSelect.value));
  }


  function resolvePopularGroups(origin, popularItems){
    if (!origin || !popularItems || !popularItems.length) return [];
    const groups = new Map();
    popularItems.forEach(item => {
      if (!item.group) return;
      const dist = haversineKm(origin, item.coords);
      if (!Number.isFinite(dist)) return;
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(dist);
    });
    const ranked = Array.from(groups.entries()).map(([group, dists]) => {
      const avg = dists.reduce((sum, val)=>sum + val, 0) / dists.length;
      return { group, avg };
    }).sort((a, b)=>a.avg - b.avg);
    return ranked.slice(0, 3).map(entry => entry.group);
  }

  function uniqueValues(list, selector){
    const set = new Set();
    list.forEach(item => {
      const val = typeof selector === 'function' ? selector(item) : item[selector];
      if (val) set.add(String(val).trim());
    });
    return Array.from(set).filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  }

  function fillSelect(select, values){
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">全部</option>';
    values.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
    if (values.includes(current)) select.value = current;
  }

  function renderTagFilters(container, tags, dataAttr){
    if (!container) return;
    container.innerHTML = '';
    tags.forEach(tag => {
      const label = document.createElement('label');
      label.className = 'tag-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute(dataAttr, tag);
      const span = document.createElement('span');
      span.textContent = tag;
      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  function getCheckedValues(container, dataAttr){
    if (!container) return [];
    return Array.from(container.querySelectorAll(`input[${dataAttr}]`))
      .filter(el => el.checked)
      .map(el => el.getAttribute(dataAttr))
      .filter(Boolean);
  }

  function renderFilterOptions(){
    const foodCats = uniqueValues(state.foods, 'category');
    const foodAreas = uniqueValues(state.foods, 'area');
    fillSelect(foodCatFilter, foodCats);
    fillSelect(foodAreaFilter, foodAreas);

    const foodTags = uniqueValues(state.foods.flatMap(item => item.tags || []), v => v);
    renderTagFilters(foodTagFilters, foodTags, 'data-food-tag');

    const templeAreas = uniqueValues(state.temples, 'area');
    fillSelect(templeAreaFilter, templeAreas);

    const templeTags = uniqueValues(state.temples.flatMap(item => item.tags || []), v => v);
    renderTagFilters(templeTagFilters, templeTags, 'data-temple-tag');

    const wishTagsBase = ['轉運','財運','健康','事業','愛情','人緣','許願','算命','特殊儀式'];
    const wishTagsExtra = uniqueValues(state.temples.flatMap(item => item.wishTags || []), v => v);
    const wishTags = Array.from(new Set(wishTagsBase.concat(wishTagsExtra)));
    renderTagFilters(templeWishFilters, wishTags, 'data-wish-tag');
  }

  function hasActiveFilters(){
    const foodCat = foodCatFilter ? foodCatFilter.value : '';
    const foodArea = foodAreaFilter ? foodAreaFilter.value : '';
    const foodPrice = foodPriceFilter ? foodPriceFilter.value : '';
    const foodTags = getCheckedValues(foodTagFilters, 'data-food-tag');
    const templeArea = templeAreaFilter ? templeAreaFilter.value : '';
    const templeTags = getCheckedValues(templeTagFilters, 'data-temple-tag');
    const wishTags = getCheckedValues(templeWishFilters, 'data-wish-tag');
    return Boolean(foodCat || foodArea || foodPrice || templeArea || foodTags.length || templeTags.length || wishTags.length);
  }

  function updateCandidateSummary(){
    if (!candidateSummary) return;
    if (!state.ready){
      candidateSummary.textContent = '候選：載入中…';
      return;
    }
    const filtered = applyFilters(state.foods.concat(state.temples));
    const foodCount = filtered.filter(item => item.kind === 'food').length;
    const templeCount = filtered.filter(item => item.kind === 'temple').length;
    const popularCount = getPopularItems().length;
    const customCount = state.customItems.length;
    const customText = customCount ? ` / 自訂 ${customCount}` : '';
    const filterNote = hasActiveFilters() ? '（已套用篩選）' : '';
    candidateSummary.textContent = `候選：美食 ${foodCount} / 寺廟 ${templeCount} / 熱門 ${popularCount}${customText} ${filterNote}`.trim();
  }

  function renderMustList(){
    if (!mustList) return;
    if (!state.mustIds.size){
      mustList.innerHTML = '<span class="planner-hint">尚未加入必去點。</span>';
      return;
    }
    const items = Array.from(state.mustIds).map(id => findItemById(id)).filter(Boolean);
    mustList.innerHTML = items.map(item => {
      const meta = [getKindLabel(item.kind), item.area].filter(Boolean).join(' · ');
      return `
        <div class="must-chip">
          <span>${escapeHtml(item.name || '')}</span>
          <span style="color:#64748b;">${escapeHtml(meta)}</span>
          <button type="button" data-must-remove="${escapeHtml(item.id)}">✕</button>
        </div>
      `;
    }).join('');
    mustList.querySelectorAll('[data-must-remove]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-must-remove') || '';
        removeMustItem(id);
      });
    });
  }

  function renderMustSearchResults(query){
    if (!mustSearchResults) return;
    const q = String(query || '').trim().toLowerCase();
    if (!q){
      mustSearchResults.innerHTML = '';
      return;
    }
    const items = state.foods.concat(state.temples)
      .filter(item => item.name && item.name.toLowerCase().includes(q))
      .slice(0, 8);
    if (!items.length){
      mustSearchResults.innerHTML = '<div class="planner-hint">找不到符合的資料。</div>';
      return;
    }
    mustSearchResults.innerHTML = items.map(item => {
      const meta = [getKindLabel(item.kind), item.area, item.category].filter(Boolean).join(' · ');
      return `
        <div class="search-item">
          <div>
            <div class="search-item-title">${escapeHtml(item.name || '')}</div>
            <div class="search-item-meta">${escapeHtml(meta)}</div>
          </div>
          <button class="pill-btn" type="button" data-add-must="${escapeHtml(item.id)}">加入必去</button>
        </div>
      `;
    }).join('');
    mustSearchResults.querySelectorAll('[data-add-must]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-add-must') || '';
        const item = findItemById(id);
        if (item) addMustItem(item);
      });
    });
  }

  function renderRecommendedList(){
    if (!recommendList) return;
    const groups = {};
    RECOMMENDED_SPOTS.forEach(spot => {
      const group = spot.group || '熱門景點';
      if (!groups[group]) groups[group] = [];
      groups[group].push(spot);
    });
    recommendList.innerHTML = Object.keys(groups).map((group, idx) => {
      const items = groups[group] || [];
      const listHtml = items.map(spot => {
        const meta = [getKindLabel(spot.kind), spot.area, spot.category].filter(Boolean).join(' · ');
        return `
          <div class="search-item">
            <div>
              <div class="search-item-title">${escapeHtml(spot.name)}</div>
              <div class="search-item-meta">${escapeHtml(meta)}</div>
            </div>
            <button class="pill-btn" type="button" data-add-reco="${escapeHtml(spot.name)}">加入</button>
          </div>
        `;
      }).join('');
      return `
        <details ${idx === 0 ? 'open' : ''}>
          <summary style="font-weight:800;cursor:pointer;">${escapeHtml(group)}</summary>
          <div class="search-results" style="margin-top:8px;">${listHtml}</div>
        </details>
      `;
    }).join('');

    recommendList.querySelectorAll('[data-add-reco]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-add-reco') || '';
        const spot = RECOMMENDED_SPOTS.find(item => item.name === name);
        if (!spot) return;
        const popular = getPopularItems();
        const item = popular.find(entry => entry.name === spot.name) || buildPresetItem(spot);
        addMustItem(item);
        updateCandidateSummary();
      });
    });
  }

  function renderFavoritesList(list, container, emptyText){
    if (!container) return;
    if (!list || !list.length){
      container.innerHTML = `<div class="planner-hint">${escapeHtml(emptyText || '目前沒有收藏。')}</div>`;
      return;
    }
    container.innerHTML = list.map(item => {
      const meta = [getKindLabel(item.kind), item.area, item.category].filter(Boolean).join(' · ');
      return `
        <div class="search-item">
          <div>
            <div class="search-item-title">${escapeHtml(item.name || '')}</div>
            <div class="search-item-meta">${escapeHtml(meta)}</div>
          </div>
          <button class="pill-btn" type="button" data-add-fav="${escapeHtml(item.id)}">加入</button>
        </div>
      `;
    }).join('');
    container.querySelectorAll('[data-add-fav]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-add-fav') || '';
        const item = findItemById(id);
        if (item) addMustItem(item);
      });
    });
  }

  async function loadFavorites(){
    if (state.favoritesLoading) return;
    state.favoritesLoading = true;
    if (favFoodList) favFoodList.innerHTML = '<div class="planner-hint">載入中…</div>';
    if (favTempleList) favTempleList.innerHTML = '<div class="planner-hint">載入中…</div>';
    try{
      const [foodRes, templeRes] = await Promise.all([
        fetch('/api/me/food-favs', { credentials:'include', cache:'no-store' }),
        fetch('/api/me/temple-favs', { credentials:'include', cache:'no-store' })
      ]);
      if (foodRes.status === 401 || templeRes.status === 401){
        const msg = '請先登入會員以查看收藏清單。';
        renderFavoritesList([], favFoodList, msg);
        renderFavoritesList([], favTempleList, msg);
        state.favoritesLoading = false;
        return;
      }
      const foodData = await foodRes.json().catch(()=>({}));
      const templeData = await templeRes.json().catch(()=>({}));
      state.favoriteFoodIds = Array.isArray(foodData.favorites) ? foodData.favorites.map(id => String(id)) : [];
      state.favoriteTempleIds = Array.isArray(templeData.favorites) ? templeData.favorites.map(id => String(id)) : [];
      const foodMap = new Map(state.foods.map(item => [String(item.id), item]));
      const templeMap = new Map(state.temples.map(item => [String(item.id), item]));
      const foodItems = state.favoriteFoodIds.map(id => foodMap.get(id)).filter(Boolean);
      const templeItems = state.favoriteTempleIds.map(id => templeMap.get(id)).filter(Boolean);
      renderFavoritesList(foodItems, favFoodList, '目前沒有收藏美食。');
      renderFavoritesList(templeItems, favTempleList, '目前沒有收藏寺廟。');
      state.favoritesLoaded = true;
    }catch(_){
      renderFavoritesList([], favFoodList, '載入失敗，請稍後再試。');
      renderFavoritesList([], favTempleList, '載入失敗，請稍後再試。');
    }finally{
      state.favoritesLoading = false;
    }
  }

  function findItemById(id){
    if (!id) return null;
    const all = state.foods.concat(state.temples, getPopularItems(), state.customItems);
    return all.find(item => item.id === id) || null;
  }

  function addMustItem(item){
    if (!item || !item.id) return;
    state.mustIds.add(item.id);
    renderMustList();
    markPlanStale(null, true);
  }

  function removeMustItem(id){
    if (!id) return;
    state.mustIds.delete(id);
    state.customItems = state.customItems.filter(item => item.id !== id);
    renderMustList();
    updateCandidateSummary();
    markPlanStale(null, true);
  }

  function buildCustomItem(place, type){
    const kind = type === 'temple' ? 'temple' : (type === 'food' ? 'food' : 'spot');
    const coords = { lat: place.lat, lng: place.lng };
    const name = place.name || '自訂地點';
    const area = place.address || '';
    const mapsUrl = place.mapsUrl
      || (place.placeId ? `https://www.google.com/maps/search/?api=1&query=place_id:${encodeURIComponent(place.placeId)}` : '')
      || (name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}` : '');
    const id = place.placeId ? `custom:${place.placeId}` : `custom:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
    const openInfo = parseOpenInfo(place.hours);
    const openAllDay = openInfo.allDay;
    const closedAllDay = openInfo.closedAllDay && !openAllDay;
    return {
      id,
      name,
      category: kind === 'spot' ? '自訂景點' : (kind === 'food' ? '自訂美食' : '自訂寺廟'),
      area,
      price: '',
      rating: place.rating || '',
      maps: mapsUrl,
      googlePlaceId: place.placeId || '',
      hours: place.hours || '',
      tags: [],
      wishTags: [],
      kind,
      coords,
      stayMin: DEFAULT_STAY[kind] || 60,
      stayMinIsDefault: true,
      openSlotsResolved: [],
      openRanges: openInfo.ranges || [],
      openAllDay,
      closedAllDay,
      hasHours: openInfo.hasHours,
      isCustom: true,
      isPopular: false,
      group: ''
    };
  }

  function buildPresetItem(spot){
    const kind = spot.kind === 'temple' ? 'temple' : 'spot';
    const coords = { lat: spot.lat, lng: spot.lng };
    const id = `preset:${spot.name}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name)}`;
    const openInfo = parseOpenInfo(spot.hours);
    const openAllDay = openInfo.allDay;
    const closedAllDay = openInfo.closedAllDay && !openAllDay;
    return {
      id,
      name: spot.name,
      category: spot.category || (kind === 'temple' ? '寺廟' : '景點'),
      area: spot.area || '',
      price: '',
      rating: '',
      maps: mapsUrl,
      googlePlaceId: '',
      hours: spot.hours || '',
      tags: [],
      wishTags: [],
      kind,
      coords,
      cover: spot.cover || '',
      coverPos: spot.coverPos || '',
      stayMin: DEFAULT_STAY[kind] || 50,
      stayMinIsDefault: true,
      openSlotsResolved: [],
      openRanges: openInfo.ranges || [],
      openAllDay,
      closedAllDay,
      hasHours: openInfo.hasHours,
      isCustom: true,
      isPopular: true,
      group: spot.group || ''
    };
  }

  function applyModeSettings(mode){
    if (mode === 'battle') return { stayMultiplier: 0.9, stopFactor: 60, stayByKind: MODE_DEFAULT_STAY.battle };
    if (mode === 'chill') return { stayMultiplier: 1.1, stopFactor: 115, stayByKind: MODE_DEFAULT_STAY.chill };
    return { stayMultiplier: 1.0, stopFactor: 85, stayByKind: MODE_DEFAULT_STAY.balance };
  }

  function computeStayMin(item, modeSettings){
    if (!item) return 20;
    const stayByKind = (modeSettings && modeSettings.stayByKind) || {};
    const baseStay = item.stayMinIsDefault && Number.isFinite(stayByKind[item.kind])
      ? stayByKind[item.kind]
      : (Number.isFinite(item.stayMin) ? item.stayMin : (DEFAULT_STAY[item.kind] || 60));
    const multiplier = modeSettings && Number.isFinite(modeSettings.stayMultiplier) ? modeSettings.stayMultiplier : 1;
    let stay = Math.round(baseStay * multiplier);
    if (item.isPopular && item.stayMinIsDefault){
      const bonus = Number(POPULAR_STAY_BONUS[item.kind]) || 15;
      stay += bonus;
    }
    return Math.max(20, stay);
  }

  function getModeLabel(mode){
    if (mode === 'battle') return '戰鬥模式';
    if (mode === 'chill') return '散步模式';
    return '平衡模式';
  }

  function getMealSelections(){
    return {
      breakfast: mealBreakfast ? mealBreakfast.checked : true,
      lunch: mealLunch ? mealLunch.checked : true,
      snack: mealSnack ? mealSnack.checked : true,
      dinner: mealDinner ? mealDinner.checked : true
    };
  }

  function getMealLabel(meals){
    const labels = [];
    MEAL_ORDER.forEach(key => {
      if (meals && meals[key]) labels.push(MEAL_LABELS[key]);
    });
    return labels.length ? labels.join('・') : '不含餐';
  }

  function getMealKeyForTime(minutes, meals, mealStatus){
    if (!meals) return '';
    for (const key of MEAL_ORDER){
      if (!meals[key] || mealStatus[key]) continue;
      const win = MEAL_WINDOWS[key];
      if (minutes >= win[0] && minutes < win[1]) return key;
    }
    return '';
  }

  function mealWindowOverlaps(startMin, endMin, window){
    const start = Number(startMin);
    const end = Number(endMin);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
    return Math.max(start, window[0]) < Math.min(end, window[1]);
  }

  function buildMealSlots(meals, startMin, endMin){
    const slots = [];
    MEAL_ORDER.forEach(key => {
      if (!meals[key]) return;
      const window = MEAL_WINDOWS[key];
      if (!window) return;
      if (!mealWindowOverlaps(startMin, endMin, window)) return;
      slots.push({ key, start: window[0], end: window[1] });
    });
    return slots;
  }

  function getDueMealSlot(slots, status, currentTime){
    return slots.find(slot => !status[slot.key] && currentTime >= slot.start && currentTime < slot.end) || null;
  }

  function markMissedMeals(slots, status, currentTime, skippedMeals){
    slots.forEach(slot => {
      if (!status[slot.key] && currentTime >= slot.end){
        status[slot.key] = true;
        skippedMeals.add(slot.key);
      }
    });
  }

  function getDetourLimitMin(slackMin){
    const slack = Math.max(0, Number(slackMin) || 0);
    return Math.max(15, Math.min(60, Math.round(slack * 0.2)));
  }

  function getTransportLabel(mode){
    if (mode === 'walking') return '步行';
    if (mode === 'transit') return '大眾運輸';
    if (mode === 'mixed') return '混合搭配';
    return '開車/叫車';
  }

  function getKindLabel(kind){
    if (kind === 'temple') return '寺廟';
    if (kind === 'food') return '美食';
    return '景點';
  }

  function getTransportSettings(mode){
    if (mode === 'walking') return { mode, speedMinPerKm: 12, travelMode: 'walking' };
    if (mode === 'transit') return { mode, speedMinPerKm: 6, travelMode: 'transit' };
    if (mode === 'mixed') return { mode, speedMinPerKm: 6, travelMode: 'driving' };
    return { mode: 'driving', speedMinPerKm: 4, travelMode: 'driving' };
  }

  function estimateTravelMinutes(distKm, transport){
    const distance = Number(distKm) || 0;
    if (!transport || !transport.mode) return Math.max(10, Math.round(distance * 4));
    if (transport.mode === 'mixed') {
      if (distance <= 1.2) return Math.max(10, Math.round(distance * 12));
      if (distance <= 4) return Math.max(10, Math.round(distance * 6));
      return Math.max(10, Math.round(distance * 4));
    }
    return Math.max(10, Math.round(distance * transport.speedMinPerKm));
  }

  function estimateRouteTime(startCoords, routeStops, startIdx, transport, modeSettings){
    if (!startCoords || !Array.isArray(routeStops) || startIdx >= routeStops.length) return 0;
    let total = 0;
    let prev = startCoords;
    for (let i = startIdx; i < routeStops.length; i++){
      const stop = routeStops[i];
      if (!stop || !stop.coords) continue;
      const distKm = haversineKm(prev, stop.coords);
      total += estimateTravelMinutes(distKm, transport);
      total += computeStayMin(stop, modeSettings);
      prev = stop.coords;
    }
    return total;
  }

  function countFittableStops(origin, startMin, endMin, routeStops, settings){
    if (!origin || !Array.isArray(routeStops) || !routeStops.length) return 0;
    let time = startMin;
    let coords = origin;
    let count = 0;
    const transport = settings.transport;
    const modeSettings = settings.modeSettings;
    for (const stop of routeStops){
      if (!stop || !stop.coords) continue;
      const distKm = haversineKm(coords, stop.coords);
      const travelMin = estimateTravelMinutes(distKm, transport);
      const stayMin = computeStayMin(stop, modeSettings);
      const arrive = time + travelMin;
      const depart = arrive + stayMin;
      if (depart > endMin) break;
      time = depart;
      coords = stop.coords;
      count += 1;
    }
    return count;
  }

  function resolveRouteSelection(origin, startMin, endMin, settings){
    const routeId = routeSelect ? routeSelect.value : (state.selectedRouteId || 'auto');
    if (routeId && routeId !== 'auto'){
      const picked = getRouteById(routeId);
      const routeItems = buildRouteItems(picked, settings.includeTemples);
      return { route: picked, routeItems, auto: false };
    }
    let best = null;
    ROUTE_TEMPLATES.forEach(route => {
      const items = buildRouteItems(route, settings.includeTemples);
      const count = countFittableStops(origin, startMin, endMin, items, settings);
      const est = estimateRouteTime(origin, items, 0, settings.transport, settings.modeSettings);
      const score = (count * 1000) - est;
      if (!best || score > best.score){
        best = { route, routeItems: items, score };
      }
    });
    if (!best) return { route: null, routeItems: [], auto: true };
    return { route: best.route, routeItems: best.routeItems, auto: true };
  }

  function itemMatchesTags(item, selectedTags){
    if (!selectedTags.length) return true;
    const tags = item.tags || [];
    return selectedTags.some(tag => tags.includes(tag));
  }

  function itemMatchesWishTags(item, selectedTags){
    if (!selectedTags.length) return true;
    const tags = item.wishTags || [];
    return selectedTags.some(tag => tags.includes(tag));
  }

  function applyFilters(items){
    const foodCat = foodCatFilter ? foodCatFilter.value : '';
    const foodArea = foodAreaFilter ? foodAreaFilter.value : '';
    const foodPrice = foodPriceFilter ? foodPriceFilter.value : '';
    const foodTags = getCheckedValues(foodTagFilters, 'data-food-tag');

    const templeArea = templeAreaFilter ? templeAreaFilter.value : '';
    const templeTags = getCheckedValues(templeTagFilters, 'data-temple-tag');
    const wishTags = getCheckedValues(templeWishFilters, 'data-wish-tag');

    return items.filter(item => {
      if (item.kind === 'food'){
        if (foodCat && item.category !== foodCat) return false;
        if (foodArea && item.area !== foodArea) return false;
        if (foodPrice && item.price !== foodPrice) return false;
        if (!itemMatchesTags(item, foodTags)) return false;
      }
      if (item.kind === 'temple'){
        if (templeArea && item.area !== templeArea) return false;
        if (!itemMatchesTags(item, templeTags)) return false;
        if (!itemMatchesWishTags(item, wishTags)) return false;
      }
      return true;
    });
  }

  function handleFiltersChange(){
    updateCandidateSummary();
    markPlanStale('篩選已變更，請重新產生');
  }

  function clearFilters(){
    if (foodCatFilter) foodCatFilter.value = '';
    if (foodAreaFilter) foodAreaFilter.value = '';
    if (foodPriceFilter) foodPriceFilter.value = '';
    if (templeAreaFilter) templeAreaFilter.value = '';
    [foodTagFilters, templeTagFilters, templeWishFilters].forEach(container => {
      if (!container) return;
      container.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = false;
      });
    });
    handleFiltersChange();
  }

  function openAdjustDialog(){
    if (!adjustDialog) return;
    if (typeof adjustDialog.showModal === 'function') adjustDialog.showModal();
    else adjustDialog.setAttribute('open', '');
    if (mustSearchInput) {
      mustSearchInput.value = '';
      renderMustSearchResults('');
    }
    if (mapSearchInput) {
      mapSearchInput.value = '';
    }
    state.selectedMapPlace = null;
    if (btnAddMapPlace) btnAddMapPlace.disabled = true;
    updateMapPlaceInfo(null);
    renderMustList();
    renderRecommendedList();
    updateCandidateSummary();
    loadFavorites();
    ensureGoogleMaps().then(()=>{
      if (!state.googleMap || !window.google || !window.google.maps) return;
      window.setTimeout(()=>{
        try{
          google.maps.event.trigger(state.googleMap, 'resize');
          if (state.googleMap.getCenter) state.googleMap.setCenter(state.googleMap.getCenter());
        }catch(_){}
      }, 200);
    });
  }

  function closeAdjustDialog(){
    if (!adjustDialog) return;
    if (typeof adjustDialog.close === 'function') adjustDialog.close();
    else adjustDialog.removeAttribute('open');
  }

  function getPreferredKind(minutes, counts, settings, lastKinds){
    if (!settings || !settings.includeTemples) return 'spot';
    const targetTempleRatio = Number.isFinite(settings.templeRatio) ? settings.templeRatio : 0.25;
    const totalNonFood = counts.spot + counts.temple + 1;
    const currentTempleRatio = counts.temple / totalNonFood;
    const hour = minutes / 60;
    const templeWindow = hour >= 9 && hour < 17;
    if (templeWindow && currentTempleRatio < targetTempleRatio) return 'temple';
    if (lastKinds && lastKinds[lastKinds.length - 1] === 'temple') return 'spot';
    return 'spot';
  }

  function pickNextItem(candidates, currentCoords, preferredKind, mustSet, preferredIds, options){
    let pool = candidates;
    const mustCandidates = candidates.filter(item => mustSet.has(item.id));
    if (mustCandidates.length) pool = mustCandidates;
    else if (preferredIds && preferredIds.size) {
      const preferredPool = candidates.filter(item => preferredIds.has(item.id));
      if (preferredPool.length) pool = preferredPool;
    } else if (preferredKind) {
      const preferredPool = candidates.filter(item => item.kind === preferredKind);
      if (preferredPool.length) pool = preferredPool;
    }
    let best = null;
    let bestScore = Infinity;
    pool.forEach(item => {
      const dist = haversineKm(currentCoords, item.coords);
      const rating = Number(item.rating) || 0;
      const mustBoost = mustSet.has(item.id) ? -0.6 : 0;
      const bias = options && typeof options.getBias === 'function' ? options.getBias(item) : 0;
      const score = dist - (rating * 0.02) + mustBoost + bias;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    });
    return best;
  }

  function buildPlan(origin, startMin, endMin, pools, settings){
    const plan = [];
    const used = new Set();
    const routeStops = pools && Array.isArray(pools.routeStops) ? pools.routeStops.slice() : [];
    const foodPool = pools && Array.isArray(pools.foods) ? pools.foods : [];
    const templePool = pools && Array.isArray(pools.temples) ? pools.temples : [];
    const modeSettings = settings.modeSettings;
    const transport = settings.transport;
    const meals = settings.meals || {};
    const mustSet = settings.mustSet || new Set();
    const includeTemples = settings.includeTemples !== false;
    const allowClosed = settings.allowClosed !== false;
    const skippedMeals = new Set();
    const mealSlots = buildMealSlots(meals, startMin, endMin);
    const mealStatus = {};
    mealSlots.forEach(slot => { mealStatus[slot.key] = false; });
    MEAL_ORDER.forEach(key => {
      if (meals[key] && !mealWindowOverlaps(startMin, endMin, MEAL_WINDOWS[key])) skippedMeals.add(key);
    });

    const totalMinutes = Math.max(0, endMin - startMin);
    const maxStops = Math.max(1, Math.floor(totalMinutes / modeSettings.stopFactor));
    const maxExtraStops = Math.max(0, maxStops - routeStops.length);
    let extraStopsUsed = 0;

    let usedClosedFallback = false;
    let currentTime = startMin;
    let currentCoords = origin;
    let routeIdx = 0;
    let optionalTempleInserted = false;
    const skippedRoute = [];

    const scheduleItem = (item, arrive, stayMin, travelMin, distKm, wasClosed)=>{
      const depart = arrive + stayMin;
      plan.push({ item, arrive, depart, travelMin, distKm, stayMin });
      used.add(item.id);
      currentCoords = item.coords;
      currentTime = depart;
      if (wasClosed) usedClosedFallback = true;
    };

    const pickCandidate = (pool, nextCoords, options)=>{
      let best = null;
      let bestScore = Infinity;
      const directDist = nextCoords ? haversineKm(currentCoords, nextCoords) : 0;
      const detourLimitMin = getDetourLimitMin(endMin - currentTime);
      pool.forEach(item => {
        if (!item || !item.id || used.has(item.id)) return;
        if (options && options.mustOnly && !mustSet.has(item.id)) return;
        if (options && options.filter && !options.filter(item)) return;
        const distKm = haversineKm(currentCoords, item.coords);
        const travelMin = estimateTravelMinutes(distKm, transport);
        const arrive = currentTime + travelMin;
        if (arrive >= endMin) return;
        const wasClosed = !isOpenAt(item, arrive);
        if (wasClosed && !allowClosed) return;
        const stayMin = computeStayMin(item, modeSettings);
        const depart = arrive + stayMin;
        if (depart > endMin) return;

        if (nextCoords){
          const remaining = estimateRouteTime(item.coords, routeStops, routeIdx, transport, modeSettings);
          if (depart + remaining > endMin) return;
          const distToNext = haversineKm(item.coords, nextCoords);
          const detourKm = (distKm + distToNext - directDist);
          const detourMin = estimateTravelMinutes(Math.max(0, detourKm), transport);
          if (!mustSet.has(item.id) && detourMin > detourLimitMin) return;
          const rating = Number(item.rating) || 0;
          let score = detourKm + (distKm * 0.2) - (rating * 0.05);
          if (mustSet.has(item.id)) score -= 1.2;
          if (score < bestScore) {
            bestScore = score;
            best = { item, arrive, depart, travelMin, distKm, stayMin, wasClosed };
          }
        } else {
          const detourMin = estimateTravelMinutes(distKm, transport);
          if (!mustSet.has(item.id) && detourMin > detourLimitMin) return;
          const rating = Number(item.rating) || 0;
          let score = distKm + (distKm * 0.2) - (rating * 0.05);
          if (mustSet.has(item.id)) score -= 1.2;
          if (score < bestScore) {
            bestScore = score;
            best = { item, arrive, depart, travelMin, distKm, stayMin, wasClosed };
          }
        }
      });
      return best;
    };

    while (routeIdx < routeStops.length){
      markMissedMeals(mealSlots, mealStatus, currentTime, skippedMeals);
      const nextRoute = routeStops[routeIdx];
      if (!nextRoute || !nextRoute.coords){
        routeIdx += 1;
        continue;
      }

      const dueMeal = getDueMealSlot(mealSlots, mealStatus, currentTime);
      if (dueMeal){
        const pick = pickCandidate(foodPool, nextRoute.coords);
        if (pick){
          scheduleItem(pick.item, pick.arrive, pick.stayMin, pick.travelMin, pick.distKm, pick.wasClosed);
          mealStatus[dueMeal.key] = true;
          continue;
        }
      }

      if (includeTemples){
        let pick = null;
        if (templePool.some(item => mustSet.has(item.id))) {
          pick = pickCandidate(templePool, nextRoute.coords, { mustOnly: true });
        }
        if (!pick && !optionalTempleInserted && extraStopsUsed < maxExtraStops){
          pick = pickCandidate(templePool, nextRoute.coords);
        }
        if (pick){
          scheduleItem(pick.item, pick.arrive, pick.stayMin, pick.travelMin, pick.distKm, pick.wasClosed);
          optionalTempleInserted = true;
          if (!mustSet.has(pick.item.id)) extraStopsUsed += 1;
          continue;
        }
      }

      const distKm = haversineKm(currentCoords, nextRoute.coords);
      const travelMin = estimateTravelMinutes(distKm, transport);
      const arrive = currentTime + travelMin;
      if (arrive > endMin) break;
      const wasClosed = !isOpenAt(nextRoute, arrive);
      if (wasClosed && !allowClosed){
        skippedRoute.push(nextRoute.id);
        routeIdx += 1;
        optionalTempleInserted = false;
        continue;
      }
      const stayMin = computeStayMin(nextRoute, modeSettings);
      const depart = arrive + stayMin;
      if (depart > endMin){
        skippedRoute.push(nextRoute.id);
        routeIdx += 1;
        optionalTempleInserted = false;
        continue;
      }
      scheduleItem(nextRoute, arrive, stayMin, travelMin, distKm, wasClosed);
      routeIdx += 1;
      optionalTempleInserted = false;
    }

    let safety = 0;
    while (currentTime < endMin && safety < 10){
      safety += 1;
      markMissedMeals(mealSlots, mealStatus, currentTime, skippedMeals);
      const dueMeal = getDueMealSlot(mealSlots, mealStatus, currentTime);
      if (dueMeal){
        const pick = pickCandidate(foodPool, null);
        if (pick){
          scheduleItem(pick.item, pick.arrive, pick.stayMin, pick.travelMin, pick.distKm, pick.wasClosed);
        } else {
          mealStatus[dueMeal.key] = true;
          skippedMeals.add(dueMeal.key);
        }
        continue;
      }
      if (includeTemples){
        const pick = pickCandidate(templePool, null, { mustOnly: true });
        if (pick){
          scheduleItem(pick.item, pick.arrive, pick.stayMin, pick.travelMin, pick.distKm, pick.wasClosed);
          continue;
        }
      }
      break;
    }

    mealSlots.forEach(slot => {
      if (!mealStatus[slot.key]) skippedMeals.add(slot.key);
    });
    const skippedMust = Array.from(mustSet).filter(id => !plan.some(entry => entry.item.id === id));
    return {
      plan,
      skippedMust,
      skippedMeals: Array.from(skippedMeals),
      startMin,
      endMin,
      usedClosedFallback,
      skippedRoute
    };
  }

  function recomputeTravelStats(plan, origin, transport){
    let prev = origin;
    plan.forEach(entry => {
      const distKm = haversineKm(prev, entry.item.coords);
      entry.distKm = distKm;
      entry.travelMin = estimateTravelMinutes(distKm, transport);
      prev = entry.item.coords;
    });
  }

  function recomputeTimes(plan, startMin){
    let current = startMin;
    plan.forEach(entry => {
      const travelMin = Number(entry.travelMin) || 0;
      entry.arrive = current + travelMin;
      entry.depart = entry.arrive + (Number(entry.stayMin) || 0);
      current = entry.depart;
    });
    return current;
  }

  function buildMultiStopUrl(origin, plan, travelMode){
    if (!origin || !plan.length) return '';
    const base = 'https://www.google.com/maps/dir/?api=1';
    const params = new URLSearchParams();
    params.set('origin', `${origin.lat},${origin.lng}`);

    const getLoc = (entry) => {
      const item = entry.item;
      const pid = item.googlePlaceId;
      if (pid) return `place_id:${pid}`;
      if (item.name) {
        let q = item.name;
        if (item.area) q += ` ${item.area}`;
        return q;
      }
      return `${item.coords.lat},${item.coords.lng}`;
    };

    params.set('destination', getLoc(plan[plan.length - 1]));
    if (plan.length > 1) {
      const waypoints = plan.slice(0, -1).map(getLoc).join('|');
      params.set('waypoints', waypoints);
    }
    params.set('travelmode', travelMode || 'driving');
    return `${base}&${params.toString()}`;
  }

  function getRouteKey(planData){
    const ids = (planData.plan || []).map(entry => entry.item && entry.item.id).join(',');
    const mode = planData.travelMode || 'driving';
    return `${mode}:${ids}`;
  }

  function maybeApplyGoogleTimes(planData){
    if (!planData || !planData.plan || planData.plan.length < 1) return;
    if (!state.googleReady || !window.google || !window.google.maps) return;
    const origin = planData.startCoords || state.startCoords;
    if (!origin) return;
    const routeKey = getRouteKey(planData);
    if (planData.googleKey === routeKey && (planData.googleApplied || planData.googlePending)) return;
    planData.googleKey = routeKey;
    planData.googlePending = true;

    const service = new google.maps.DirectionsService();
    const waypoints = planData.plan.slice(0, -1).map(entry => {
      const item = entry.item;
      if (item.googlePlaceId) return { location: { placeId: item.googlePlaceId }, stopover: true };
      return { location: { lat: item.coords.lat, lng: item.coords.lng }, stopover: true };
    });
    const last = planData.plan[planData.plan.length - 1].item;
    const destination = last.googlePlaceId
      ? { placeId: last.googlePlaceId }
      : { lat: last.coords.lat, lng: last.coords.lng };
    const travelMode = (planData.travelMode || 'driving').toUpperCase();

    service.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination,
      waypoints,
      travelMode: google.maps.TravelMode[travelMode] || google.maps.TravelMode.DRIVING
    }, (result, status)=>{
      planData.googlePending = false;
      if (status !== 'OK' || !result || !result.routes || !result.routes.length) {
        planData.googleApplied = false;
        return;
      }
      const legs = result.routes[0].legs || [];
      if (!legs.length) return;
      planData.plan.forEach((entry, idx)=>{
        const leg = legs[idx];
        if (!leg) return;
        const durationMin = leg.duration ? Math.round(leg.duration.value / 60) : entry.travelMin;
        const distKm = leg.distance ? leg.distance.value / 1000 : entry.distKm;
        entry.travelMin = Math.max(1, durationMin || 0);
        entry.distKm = distKm || entry.distKm;
      });
      recomputeTimes(planData.plan, planData.startMin || 0);
      planData.googleApplied = true;
      renderPlan(planData, { skipGoogle: true });
    });
  }

  function buildPlaceLink(item){
    if (item.maps) return item.maps;
    if (item.googlePlaceId) {
      return `https://www.google.com/maps/search/?api=1&query=place_id:${encodeURIComponent(item.googlePlaceId)}`;
    }
    if (item.name) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + (item.area ? ' ' + item.area : ''))}`;
    }
    return '';
  }

  function renderPlan(planData, opts){
    if (!resultEl) return;
    const plan = planData.plan || [];
    if (!plan.length){
      resultEl.innerHTML = '<div class="result-empty">找不到符合時間的行程，請調整時間或地點再試一次。</div>';
      return;
    }
    const modeLabel = getModeLabel(planData.mode || (modeSelect ? modeSelect.value : 'balance'));
    const mealLabel = getMealLabel(planData.meals || getMealSelections());
    const templeLabel = (planData.includeTemples ?? (includeTempleToggle ? includeTempleToggle.checked : true)) ? '加入寺廟' : '不含寺廟';
    const transportLabel = getTransportLabel(planData.transportMode || (transportSelect ? transportSelect.value : 'driving'));
    const routeLabel = planData.routeLabel || '自動';
    const startTimeLabel = Number.isFinite(planData.startMin)
      ? formatMinutesApprox(planData.startMin)
      : (startTimeInput ? startTimeInput.value : '');
    const endTimeLabel = Number.isFinite(planData.endMin)
      ? formatMinutesApprox(planData.endMin)
      : (endTimeInput ? endTimeInput.value : '');
    const today = new Date().toLocaleDateString('zh-TW', { month:'2-digit', day:'2-digit', weekday:'short' });
    const foodCount = plan.filter(p => p.item.kind === 'food').length;
    const templeCount = plan.filter(p => p.item.kind === 'temple').length;
    const spotCount = plan.filter(p => p.item.kind === 'spot').length;
    const popularCount = plan.filter(p => p.item.isPopular || (p.item.id && p.item.id.startsWith('preset:'))).length;
    const totalStay = plan.reduce((sum, p)=> sum + p.stayMin, 0);
    const totalTravel = plan.reduce((sum, p)=> sum + p.travelMin, 0);
    const origin = planData.startCoords || state.startCoords;
    const startLabel = planData.startLabel || state.startLabel || '自訂位置';
    const routeUrl = buildMultiStopUrl(origin, plan, planData.travelMode);
    const endOverrun = Number.isFinite(planData.endMin) && plan.length
      ? Math.max(0, plan[plan.length - 1].depart - planData.endMin)
      : 0;

    const bucketDefs = [
      { id: 'morning', label: '早上', range: '06:00-11:00' },
      { id: 'noon', label: '中午', range: '11:00-14:00' },
      { id: 'afternoon', label: '下午', range: '14:00-18:00' },
      { id: 'evening', label: '晚上', range: '18:00-23:59' }
    ];
    const bucketMap = Object.fromEntries(bucketDefs.map(bucket => [bucket.id, []]));
    const resolveBucket = (minutes)=>{
      if (!Number.isFinite(minutes)) return 'morning';
      if (minutes < 660) return 'morning';
      if (minutes < 840) return 'noon';
      if (minutes < 1080) return 'afternoon';
      return 'evening';
    };

    plan.forEach((entry, idx)=>{
      const item = entry.item;
      const kindLabel = getKindLabel(item.kind);
      const kindClass = item.kind === 'temple' ? 'plan-kind temple' : 'plan-kind';
      const isPopular = item.isPopular || (item.id && item.id.startsWith('preset:'));
      const timeText = `${formatMinutesApprox(entry.arrive)} - ${formatMinutesApprox(entry.depart)}`;
      const meta = [item.area, item.category].filter(Boolean).join(' · ');
      const mapLink = buildPlaceLink(item);
      const distanceText = `${entry.distKm.toFixed(1)} km / 約 ${entry.travelMin} 分`;
      const coverInfo = getCoverInfo(item);
      const coverKeyAttr = coverInfo.domKey ? ` data-cover-key="${escapeHtml(coverInfo.domKey)}"` : '';
      const coverText = (item.name || kindLabel || '').slice(0, 2);
      const coverPosStyle = coverInfo.pos ? ` style="object-position:${escapeHtml(coverInfo.pos)};"` : '';
      const coverHtml = coverInfo.url
        ? `<div class="plan-thumb"${coverKeyAttr}><img src="${escapeHtml(coverInfo.url)}" alt="${escapeHtml(item.name || '')}"${coverPosStyle} loading="lazy" decoding="async"></div>`
        : `<div class="plan-thumb is-placeholder"${coverKeyAttr}><span>${escapeHtml(coverText || '行程')}</span></div>`;
      const detailUrl = buildDetailUrl(item);
      const detailLink = detailUrl ? `<a class="pill-btn" href="${escapeHtml(detailUrl)}" target="_blank" rel="noopener">詳細介紹</a>` : '';
      const coverSourceAttr = coverInfo.domKey ? ` data-cover-source="${escapeHtml(coverInfo.domKey)}"` : '';
      const coverSourceLink = coverInfo.sourceUrl
        ? `<a class="pill-btn" href="${escapeHtml(coverInfo.sourceUrl)}" target="_blank" rel="noopener"${coverSourceAttr}>圖源</a>`
        : (coverInfo.domKey ? `<a class="pill-btn" href="#" style="display:none;"${coverSourceAttr}>圖源</a>` : '');
      const cardHtml = `
        <div class="plan-card" data-kind="${escapeHtml(item.kind || '')}">
          <div class="plan-row">
            ${coverHtml}
            <div class="plan-time">${escapeHtml(timeText)}</div>
            <div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <h3 class="plan-title">${escapeHtml(item.name || '')}</h3>
                <span class="${kindClass}">${escapeHtml(kindLabel)}</span>
                ${item.isRoute ? '<span class="plan-kind" style="background:#e0f2fe;border-color:#bae6fd;color:#0369a1;">路線主軸</span>' : ''}
                ${state.mustIds.has(item.id) ? '<span class="plan-kind" style="background:#f1f5f9;border-color:#cbd5f5;color:#475569;">必去</span>' : ''}
                ${isPopular ? '<span class="plan-kind" style="background:#fef3c7;border-color:#fde68a;color:#b45309;">熱門景點</span>' : ''}
              </div>
              ${meta ? `<div class="plan-meta">${escapeHtml(meta)}</div>` : ''}
              <div class="plan-meta">移動：${escapeHtml(distanceText)} · 停留 ${escapeHtml(String(entry.stayMin))} 分</div>
              <div class="plan-actions">
                ${detailLink}
                ${mapLink ? `<a class="pill-btn" href="${escapeHtml(mapLink)}" target="_blank" rel="noopener">地圖</a>` : ''}
                ${coverSourceLink}
                <button class="pill-btn" type="button" data-move="up" data-idx="${idx}">上移</button>
                <button class="pill-btn" type="button" data-move="down" data-idx="${idx}">下移</button>
              </div>
              <div class="plan-edit">
                <label>停留(分)</label>
                <input type="number" min="10" step="5" value="${escapeHtml(String(entry.stayMin))}" data-stay-input="${idx}">
                <button class="pill-btn" type="button" data-stay-update="${idx}">更新</button>
              </div>
            </div>
          </div>
        </div>
      `;
      const bucketId = resolveBucket(entry.arrive);
      if (!bucketMap[bucketId]) bucketMap[bucketId] = [];
      bucketMap[bucketId].push(cardHtml);
    });

    const boardHtml = bucketDefs.map(bucket=>{
      const cards = bucketMap[bucket.id] || [];
      return `
        <div class="plan-column" data-bucket="${bucket.id}">
          <div class="plan-column-header">
            <div>
              <div class="plan-column-title">${escapeHtml(bucket.label)}</div>
              <div class="plan-column-sub">${escapeHtml(bucket.range)}</div>
            </div>
            <div class="plan-column-count">${cards.length}</div>
          </div>
          <div class="plan-column-list">
            ${cards.length ? cards.join('') : '<div class="plan-column-empty">尚未安排</div>'}
          </div>
        </div>
      `;
    }).join('');

    const skippedItems = (planData.skippedMust || [])
      .map(id => findItemById(id))
      .filter(Boolean);
    const warning = skippedItems.length
      ? `<div class="must-warning">
          必去點未排入（${skippedItems.length}）：請延長時間或調整條件。
          <div class="must-warning-list">
            ${skippedItems.map(item => `<span class="must-warning-chip">${escapeHtml(item.name || '')}</span>`).join('')}
          </div>
        </div>`
      : '';

    const timeSourceTag = planData.googleApplied
      ? '<span class="tag">時間：Google ETA</span>'
      : (planData.googlePending ? '<span class="tag">時間：Google ETA 計算中</span>' : '<span class="tag">時間：估算</span>');
    const skippedMeals = (planData.skippedMeals || []).map(key => MEAL_LABELS[key]).filter(Boolean);
    const mealWarning = skippedMeals.length
      ? `<div class="planner-hint" style="color:#b45309;">未排入：${escapeHtml(skippedMeals.join('、'))}，可調整時間或放寬條件。</div>`
      : '';
    const closedNote = planData.usedClosedFallback
      ? '<div class="planner-hint" style="color:#b45309;">行程已包含非營業時段候選（可在設定中關閉）。</div>'
      : '';
    const staleNote = state.planStale
      ? '<div class="planner-hint" style="color:#b45309;">設定已變更，請重新產生以更新行程。</div>'
      : '';

    resultEl.innerHTML = `
      <div class="plan-cover">
        <div>
          <div class="plan-cover-title">泰國一日行程</div>
          <div class="plan-cover-sub">${escapeHtml(today)} · ${escapeHtml(startTimeLabel)} - ${escapeHtml(endTimeLabel)}</div>
        </div>
        <div class="plan-cover-grid">
          <div class="plan-cover-badge">
            <span>起點</span>
            ${escapeHtml(startLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>路線</span>
            ${escapeHtml(routeLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>模式</span>
            ${escapeHtml(modeLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>餐別</span>
            ${escapeHtml(mealLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>寺廟</span>
            ${escapeHtml(templeLabel)}
          </div>
          <div class="plan-cover-badge">
            <span>交通</span>
            ${escapeHtml(transportLabel)}
          </div>
        </div>
      </div>
      <div class="plan-summary">
        <span class="tag">起點：${escapeHtml(startLabel)}</span>
        <span class="tag">路線：${escapeHtml(routeLabel)}</span>
        <span class="tag">美食 ${foodCount} / 寺廟 ${templeCount}${spotCount ? ` / 景點 ${spotCount}` : ''}</span>
        ${popularCount ? `<span class="tag">熱門景點 ${popularCount}</span>` : ''}
        <span class="tag">餐別：${escapeHtml(mealLabel)}</span>
        <span class="tag">寺廟：${escapeHtml(templeLabel)}</span>
        <span class="tag">停留 ${totalStay} 分 / 移動 ${totalTravel} 分</span>
        ${timeSourceTag}
        ${routeUrl ? `<a class="pill-btn" href="${escapeHtml(routeUrl)}" target="_blank" rel="noopener">開啟路線</a>` : ''}
      </div>
      ${staleNote}
      ${closedNote}
      ${endOverrun ? `<div class="planner-hint" style="color:#b91c1c;">依目前預估會超過結束時間約 ${Math.ceil(endOverrun)} 分鐘。</div>` : ''}
      ${mealWarning}
      ${warning}
      <div class="plan-board-header">
        <div>
          <div class="plan-board-title">行程安排</div>
          <div class="plan-board-hint">時間已四捨五入到 10 分，依時段分欄，可用上移/下移微調順序。</div>
        </div>
      </div>
      <div class="plan-board">
        ${boardHtml}
      </div>
    `;

    resultEl.querySelectorAll('[data-move]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.getAttribute('data-idx'));
        const dir = btn.getAttribute('data-move');
        movePlanItem(idx, dir === 'up' ? -1 : 1);
      });
    });
    resultEl.querySelectorAll('[data-stay-update]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.getAttribute('data-stay-update'));
        const input = resultEl.querySelector(`[data-stay-input="${idx}"]`);
        if (!input) return;
        const val = parseInt(input.value, 10);
        if (!Number.isFinite(val) || val <= 0) return;
        applyStayChange(idx, val);
      });
    });

    state.currentPlan = plan;
    state.currentSummary = planData;
    updateShareLink(planData);
    if (!opts || !opts.skipGoogle) maybeApplyGoogleTimes(planData);
  }

  function movePlanItem(idx, delta){
    if (!state.currentPlan || !state.currentPlan.length) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= state.currentPlan.length) return;
    const plan = state.currentPlan.slice();
    const temp = plan[idx];
    plan[idx] = plan[nextIdx];
    plan[nextIdx] = temp;
    const planData = Object.assign({}, state.currentSummary || {}, { plan });
    const transport = planData.transport || getTransportSettings(planData.transportMode || 'driving');
    recomputeTravelStats(plan, planData.startCoords || state.startCoords, transport);
    recomputeTimes(plan, planData.startMin || 0);
    renderPlan(planData);
  }

  function applyStayChange(idx, newVal){
    if (!state.currentSummary || !state.currentSummary.plan) return;
    const plan = state.currentSummary.plan.slice();
    if (!plan[idx]) return;
    plan[idx].stayMin = newVal;
    recomputeTimes(plan, state.currentSummary.startMin || 0);
    const planData = Object.assign({}, state.currentSummary, { plan });
    renderPlan(planData, { skipGoogle: true });
  }

  async function geocodeQuery(query){
    const q = String(query || '').trim();
    if (!q) return null;
    const res = await fetch(`/api/geo?q=${encodeURIComponent(q)}`, { credentials:'include' });
    const data = await res.json().catch(()=>({}));
    if (!data || !data.ok || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
    const label = formatPlaceLabel(data.display_name, q);
    return { lat: data.lat, lng: data.lng, label };
  }

  async function resolveStartCoords(){
    if (state.startCoords) return state.startCoords;
    const query = (startInput && startInput.value || '').trim();
    if (!query){
      setStatus('請輸入起點位置', true);
      return null;
    }
    setStatus('定位中…');
    const geo = await geocodeQuery(query);
    if (!geo){
      setStatus('找不到此位置，請換個關鍵字', true);
      return null;
    }
    state.startCoords = { lat: geo.lat, lng: geo.lng };
    state.startLabel = geo.label;
    if (startInput) startInput.value = geo.label || query;
    setStatus(`已定位：${geo.label}`);
    return state.startCoords;
  }

  function getActiveItems(){
    const base = applyFilters(state.foods.concat(state.temples));
    const custom = state.customItems || [];
    const popular = getPopularItems();
    return dedupeItems(base.concat(popular, custom));
  }

  async function generatePlan(){
    if (!state.ready){
      setStatus('資料尚未載入完成，請稍後再試', true);
      return false;
    }
    const startMin = timeInputToMinutes(startTimeInput && startTimeInput.value);
    const endMin = timeInputToMinutes(endTimeInput && endTimeInput.value);
    if (startMin === null || endMin === null){
      setStatus('請填寫開始與結束時間', true);
      return false;
    }
    if (endMin <= startMin){
      setStatus('結束時間需大於開始時間', true);
      return false;
    }
    const origin = await resolveStartCoords();
    if (!origin) return false;

    const modeValue = modeSelect ? modeSelect.value : 'balance';
    const transportMode = transportSelect ? transportSelect.value : 'driving';
    const allowClosed = allowClosedToggle ? allowClosedToggle.checked : true;
    const meals = getMealSelections();
    if (startMin >= MEAL_WINDOWS.breakfast[1]) {
      meals.breakfast = false;
    }
    const includeTemples = includeTempleToggle ? includeTempleToggle.checked : true;
    const modeSettings = applyModeSettings(modeValue);
    const transport = getTransportSettings(transportMode);
    const settings = {
      modeSettings,
      transport,
      mustSet: new Set(state.mustIds),
      allowClosed,
      meals,
      includeTemples
    };
    const routeSelection = resolveRouteSelection(origin, startMin, endMin, settings);
    const routeItems = routeSelection.routeItems || [];
    const routeIds = new Set(routeItems.map(item => item.id));
    const activeItems = getActiveItems();
    const foodPool = activeItems.filter(item => item.kind === 'food' && !routeIds.has(item.id));
    const templePool = activeItems.filter(item => item.kind === 'temple' && !routeIds.has(item.id));
    const planData = buildPlan(origin, startMin, endMin, { routeStops: routeItems, foods: foodPool, temples: templePool }, settings);
    const routeLabel = routeSelection.route
      ? (routeSelection.auto ? `自動：${routeSelection.route.name}` : routeSelection.route.name)
      : '自動';
    planData.travelMode = transport.travelMode;
    planData.transport = transport;
    planData.transportMode = transportMode;
    planData.mode = modeValue;
    planData.meals = meals;
    planData.includeTemples = includeTemples;
    planData.allowClosed = allowClosed;
    planData.startLabel = state.startLabel;
    planData.startCoords = state.startCoords;
    planData.routeId = routeSelection.route ? routeSelection.route.id : 'auto';
    planData.routeLabel = routeLabel;
    planData.routeAuto = !!routeSelection.auto;
    renderPlan(planData);
    if (planData.plan && planData.plan.length){
      clearPlanStale();
      setStatus('已產生行程');
    }
    return true;
  }

  function encodePayload(payload){
    const json = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return encoded;
  }

  function decodePayload(input){
    try{
      const pad = input.length % 4;
      const base64 = (input + (pad ? '='.repeat(4 - pad) : ''))
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json);
    }catch(_){
      return null;
    }
  }

  function buildSharePayload(planData){
    const plan = planData.plan || [];
    const startTime = Number.isFinite(planData.startMin)
      ? formatMinutes(planData.startMin)
      : (startTimeInput ? startTimeInput.value : '');
    const endTime = Number.isFinite(planData.endMin)
      ? formatMinutes(planData.endMin)
      : (endTimeInput ? endTimeInput.value : '');
    const startLabel = planData.startLabel || state.startLabel;
    const startCoords = planData.startCoords || state.startCoords;
    const mode = planData.mode || (modeSelect ? modeSelect.value : 'balance');
    const routeId = planData.routeId || (routeSelect ? routeSelect.value : 'auto');
    const routeLabel = planData.routeLabel || '';
    const routeAuto = planData.routeAuto || false;
    const meals = planData.meals || getMealSelections();
    const includeTemples = planData.includeTemples ?? (includeTempleToggle ? includeTempleToggle.checked : true);
    const allowClosed = planData.allowClosed ?? (allowClosedToggle ? allowClosedToggle.checked : true);
    const transport = planData.transportMode || (transportSelect ? transportSelect.value : 'driving');
    return {
      startLabel,
      startCoords,
      startTime,
      endTime,
      mode,
      meals,
      includeTemples,
      allowClosed,
      transport,
      routeId,
      routeLabel,
      routeAuto,
      plan: plan.map(entry => ({
        item: {
          id: entry.item.id,
          name: entry.item.name,
          kind: entry.item.kind,
          area: entry.item.area,
          category: entry.item.category,
          coords: entry.item.coords,
          maps: entry.item.maps,
          googlePlaceId: entry.item.googlePlaceId
        },
        arrive: entry.arrive,
        depart: entry.depart,
        travelMin: entry.travelMin,
        distKm: entry.distKm,
        stayMin: entry.stayMin
      }))
    };
  }

  function updateShareLink(planData){
    if (!shareLinkInput) return;
    const payload = buildSharePayload(planData);
    const encoded = encodePayload(payload);
    const url = `${location.origin}${location.pathname}?plan=${encoded}`;
    shareLinkInput.value = url;
  }

  function applySharedPlan(payload){
    if (!payload) return;
    state.startCoords = payload.startCoords || null;
    state.startLabel = payload.startLabel || '';
    if (startInput && payload.startLabel) startInput.value = payload.startLabel;
    if (payload.startTime) setTimeInput(startTimeInput, payload.startTime);
    if (payload.endTime) setTimeInput(endTimeInput, payload.endTime);
    if (modeSelect && payload.mode) modeSelect.value = payload.mode;
    if (transportSelect && payload.transport) transportSelect.value = payload.transport;
    if (payload.meals){
      if (mealBreakfast) mealBreakfast.checked = !!payload.meals.breakfast;
      if (mealLunch) mealLunch.checked = !!payload.meals.lunch;
      if (mealSnack && Object.prototype.hasOwnProperty.call(payload.meals, 'snack')) {
        mealSnack.checked = !!payload.meals.snack;
      }
      if (mealDinner) mealDinner.checked = !!payload.meals.dinner;
    }
    if (includeTempleToggle) includeTempleToggle.checked = payload.includeTemples !== false;
    if (allowClosedToggle) allowClosedToggle.checked = payload.allowClosed !== false;
    if (payload.mode) selectMode(payload.mode, true);
    let resolvedRouteLabel = payload.routeLabel || '';
    if (routeSelect){
      routeSelect.value = payload.routeId && routeSelect.querySelector(`option[value="${payload.routeId}"]`)
        ? payload.routeId
        : 'auto';
      state.selectedRouteId = routeSelect.value;
      const routeInfo = getRouteById(routeSelect.value);
      updateRouteHint(routeInfo);
      if (!resolvedRouteLabel) {
        resolvedRouteLabel = routeInfo ? routeInfo.name : '自動';
      }
    }

    const plan = (payload.plan || []).map(entry => ({
      item: Object.assign({}, entry.item, {
        coords: entry.item.coords || null,
        stayMin: entry.stayMin || DEFAULT_STAY[entry.item.kind] || 60,
        isCustom: true
      }),
      arrive: entry.arrive,
      depart: entry.depart,
      travelMin: entry.travelMin || 0,
      distKm: entry.distKm || 0,
      stayMin: entry.stayMin || DEFAULT_STAY[entry.item.kind] || 60
    }));

    state.currentPlan = plan;
    const transportMode = payload.transport || 'driving';
    const transport = getTransportSettings(transportMode);
    const startMin = payload.startTime ? timeInputToMinutes(payload.startTime) : null;
    const endMin = payload.endTime ? timeInputToMinutes(payload.endTime) : null;
    if (state.startCoords) recomputeTravelStats(plan, state.startCoords, transport);
    if (Number.isFinite(startMin)) recomputeTimes(plan, startMin);
    state.currentSummary = {
      plan,
      travelMode: transport.travelMode,
      transport,
      transportMode,
      mode: payload.mode || 'balance',
      meals: payload.meals || getMealSelections(),
      includeTemples: payload.includeTemples !== false,
      allowClosed: payload.allowClosed !== false,
      startMin: Number.isFinite(startMin) ? startMin : 0,
      endMin: Number.isFinite(endMin) ? endMin : 0,
      startLabel: payload.startLabel || state.startLabel,
      startCoords: payload.startCoords || state.startCoords,
      routeId: payload.routeId || (routeSelect ? routeSelect.value : 'auto'),
      routeLabel: resolvedRouteLabel || '',
      routeAuto: payload.routeAuto || false,
      skippedMust: [],
      skippedMeals: []
    };
    if (payload.startCoords && payload.startLabel) setStatus(`已載入分享行程：${payload.startLabel}`);
    clearPlanStale();
    updateMaxStep(4);
    renderPlan(state.currentSummary);
    showStep(4);
  }

  function shareToLine(){
    if (!state.currentSummary || !state.currentSummary.plan || !state.currentSummary.plan.length){
      setStatus('請先產生行程', true);
      return;
    }
    if (state.planStale){
      const ok = window.confirm('設定已變更，仍要分享目前行程嗎？');
      if (!ok) return;
    }
    const foodCount = state.currentSummary.plan.filter(p => p.item.kind === 'food').length;
    const templeCount = state.currentSummary.plan.filter(p => p.item.kind === 'temple').length;
    const spotCount = state.currentSummary.plan.filter(p => p.item.kind === 'spot').length;
    const startLabel = state.currentSummary.startLabel || state.startLabel || '自訂位置';
    const shareUrl = shareLinkInput ? shareLinkInput.value : location.href;
    const spotText = spotCount ? ` / 景點 ${spotCount}` : '';
    const text = `泰國一日行程：美食 ${foodCount} / 寺廟 ${templeCount}${spotText}\n起點：${startLabel}\n${shareUrl}`;
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank');
  }

  function saveCurrentPlan(){
    if (!state.currentSummary || !state.currentSummary.plan || !state.currentSummary.plan.length){
      setStatus('請先產生行程', true);
      return;
    }
    if (state.planStale){
      const ok = window.confirm('設定已變更，仍要儲存目前行程嗎？');
      if (!ok) return;
    }
    const defaultName = `${new Date().toLocaleDateString('zh-TW')} 行程`;
    const name = prompt('請輸入行程名稱', defaultName) || '';
    if (!name) return;
    const summary = state.currentSummary || {};
    const startLabel = summary.startLabel || state.startLabel;
    const startCoords = summary.startCoords || state.startCoords;
    const startTime = Number.isFinite(summary.startMin)
      ? formatMinutes(summary.startMin)
      : (startTimeInput ? startTimeInput.value : '');
    const endTime = Number.isFinite(summary.endMin)
      ? formatMinutes(summary.endMin)
      : (endTimeInput ? endTimeInput.value : '');
    const modeValue = summary.mode || (modeSelect ? modeSelect.value : 'balance');
    const mealsValue = summary.meals || getMealSelections();
    const includeTemplesValue = summary.includeTemples ?? (includeTempleToggle ? includeTempleToggle.checked : true);
    const allowClosedValue = summary.allowClosed ?? (allowClosedToggle ? allowClosedToggle.checked : true);
    const transportValue = summary.transportMode || (transportSelect ? transportSelect.value : 'driving');
    const routeId = summary.routeId || (routeSelect ? routeSelect.value : 'auto');
    const routeLabel = summary.routeLabel || '';
    const routeAuto = summary.routeAuto || false;
    const record = {
      id: `plan_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      startLabel,
      startCoords,
      startTime,
      endTime,
      mode: modeValue,
      meals: mealsValue,
      includeTemples: includeTemplesValue,
      allowClosed: allowClosedValue,
      transport: transportValue,
      routeId,
      routeLabel,
      routeAuto,
      plan: state.currentSummary.plan
    };
    state.savedPlans.unshift(record);
    persistSavedPlans();
    renderSavedPlans();
    setStatus(`已儲存：${name}`);
  }

  function persistSavedPlans(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedPlans));
    }catch(_){ }
  }

  function loadSavedPlans(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) state.savedPlans = list;
    }catch(_){ }
  }

  function renderSavedPlans(){
    if (!savedList) return;
    if (!state.savedPlans.length){
      savedList.innerHTML = '<div class="planner-hint">尚未儲存行程。</div>';
      return;
    }
    savedList.innerHTML = state.savedPlans.map(plan => {
      const created = plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('zh-TW') : '';
      const meta = [created, plan.startLabel].filter(Boolean).join(' · ');
      return `
        <div class="saved-item">
          <div>
            <div class="saved-title">${escapeHtml(plan.name || '')}</div>
            <div class="saved-meta">${escapeHtml(meta)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="pill-btn" type="button" data-load-plan="${escapeHtml(plan.id)}">載入</button>
            <button class="pill-btn" type="button" data-delete-plan="${escapeHtml(plan.id)}">刪除</button>
          </div>
        </div>
      `;
    }).join('');

    savedList.querySelectorAll('[data-load-plan]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-load-plan') || '';
        const plan = state.savedPlans.find(p => p.id === id);
        if (plan) applySavedPlan(plan);
      });
    });
    savedList.querySelectorAll('[data-delete-plan]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-delete-plan') || '';
        state.savedPlans = state.savedPlans.filter(p => p.id !== id);
        persistSavedPlans();
        renderSavedPlans();
      });
    });
  }

  function applySavedPlan(plan){
    state.startCoords = plan.startCoords || null;
    state.startLabel = plan.startLabel || '';
    if (startInput && plan.startLabel) startInput.value = plan.startLabel;
    if (plan.startTime) setTimeInput(startTimeInput, plan.startTime);
    if (plan.endTime) setTimeInput(endTimeInput, plan.endTime);
    if (modeSelect && plan.mode) modeSelect.value = plan.mode;
    if (transportSelect && plan.transport) transportSelect.value = plan.transport;
    if (plan.meals){
      if (mealBreakfast) mealBreakfast.checked = !!plan.meals.breakfast;
      if (mealLunch) mealLunch.checked = !!plan.meals.lunch;
      if (mealSnack && Object.prototype.hasOwnProperty.call(plan.meals, 'snack')) {
        mealSnack.checked = !!plan.meals.snack;
      }
      if (mealDinner) mealDinner.checked = !!plan.meals.dinner;
    }
    if (includeTempleToggle) includeTempleToggle.checked = plan.includeTemples !== false;
    if (allowClosedToggle) allowClosedToggle.checked = plan.allowClosed !== false;
    if (plan.mode) selectMode(plan.mode, true);
    let resolvedRouteLabel = plan.routeLabel || '';
    if (routeSelect){
      routeSelect.value = plan.routeId && routeSelect.querySelector(`option[value="${plan.routeId}"]`)
        ? plan.routeId
        : 'auto';
      state.selectedRouteId = routeSelect.value;
      const routeInfo = getRouteById(routeSelect.value);
      updateRouteHint(routeInfo);
      if (!resolvedRouteLabel) {
        resolvedRouteLabel = routeInfo ? routeInfo.name : '自動';
      }
    }
    const transportMode = plan.transport || 'driving';
    const transport = getTransportSettings(transportMode);
    const startMin = plan.startTime ? timeInputToMinutes(plan.startTime) : null;
    const endMin = plan.endTime ? timeInputToMinutes(plan.endTime) : null;
    const planItems = (plan.plan || []).map(entry => ({
      item: entry.item,
      arrive: entry.arrive,
      depart: entry.depart,
      travelMin: entry.travelMin || 0,
      distKm: entry.distKm || 0,
      stayMin: entry.stayMin || entry.item.stayMin || DEFAULT_STAY[entry.item.kind] || 60
    }));
    if (state.startCoords) recomputeTravelStats(planItems, state.startCoords, transport);
    if (Number.isFinite(startMin)) recomputeTimes(planItems, startMin);
    state.currentSummary = {
      plan: planItems,
      travelMode: transport.travelMode,
      transport,
      transportMode,
      mode: plan.mode || 'balance',
      meals: plan.meals || getMealSelections(),
      includeTemples: plan.includeTemples !== false,
      allowClosed: plan.allowClosed !== false,
      startMin: Number.isFinite(startMin) ? startMin : 0,
      endMin: Number.isFinite(endMin) ? endMin : 0,
      startLabel: plan.startLabel || state.startLabel,
      startCoords: plan.startCoords || state.startCoords,
      routeId: plan.routeId || (routeSelect ? routeSelect.value : 'auto'),
      routeLabel: resolvedRouteLabel || '',
      routeAuto: plan.routeAuto || false,
      skippedMust: [],
      skippedMeals: []
    };
    clearPlanStale();
    updateMaxStep(4);
    renderPlan(state.currentSummary);
    showStep(4);
  }

  function updateMapPlaceInfo(place){
    if (!mapPlaceInfo) return;
    if (!place){
      mapPlaceInfo.textContent = '尚未選擇地點。';
      return;
    }
    const lines = [place.name, place.address].filter(Boolean).join(' · ');
    mapPlaceInfo.textContent = lines || '已選擇地點';
  }

  function addCustomPlace(){
    if (!state.selectedMapPlace) return;
    const type = mapPlaceType ? mapPlaceType.value : 'spot';
    const existing = state.foods.concat(state.temples).find(item => {
      if (state.selectedMapPlace.placeId && item.googlePlaceId) {
        return item.googlePlaceId === state.selectedMapPlace.placeId;
      }
      return item.name === state.selectedMapPlace.name;
    });
    if (existing){
      addMustItem(existing);
      setStatus(`已加入：${existing.name}`);
      updateCandidateSummary();
      return;
    }
    const item = buildCustomItem(state.selectedMapPlace, type);
    const exists = state.customItems.find(x => x.id === item.id);
    if (!exists){
      state.customItems.push(item);
    }
    addMustItem(item);
    setStatus(`已加入：${item.name}`);
    updateCandidateSummary();
  }

  function initGoogleMaps(){
    if (!window.google || !window.google.maps || !mapCanvas) return;
    state.googleReady = true;
    mapCanvas.textContent = '';
    state.googleMap = new google.maps.Map(mapCanvas, {
      center: { lat: 13.7563, lng: 100.5018 },
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy'
    });
    state.googleMarker = new google.maps.Marker({ map: state.googleMap });
    if (mapSearchInput){
      state.googleAutocomplete = new google.maps.places.Autocomplete(mapSearchInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'th' }
      });
      state.googleAutocomplete.addListener('place_changed', ()=>{
        const place = state.googleAutocomplete.getPlace();
        const loc = place && place.geometry && place.geometry.location;
        if (!loc) return;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        const label = place.formatted_address || place.name || mapSearchInput.value.trim();
        state.googleMap.setCenter(coords);
        state.googleMap.setZoom(14);
        state.googleMarker.setPosition(coords);
        state.selectedMapPlace = {
          name: place.name || label,
          address: label,
          lat: coords.lat,
          lng: coords.lng,
          placeId: place.place_id || '',
          rating: place.rating || ''
        };
        if (btnAddMapPlace) btnAddMapPlace.disabled = false;
        updateMapPlaceInfo(state.selectedMapPlace);
      });
    }
    if (startInput){
      state.googleStartAutocomplete = new google.maps.places.Autocomplete(startInput, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'th' }
      });
      state.googleStartAutocomplete.addListener('place_changed', ()=>{
        const place = state.googleStartAutocomplete.getPlace();
        const loc = place && place.geometry && place.geometry.location;
        if (!loc) return;
        const coords = { lat: loc.lat(), lng: loc.lng() };
        const label = place.name || formatPlaceLabel(place.formatted_address || '', startInput.value.trim());
        state.startCoords = coords;
        state.startLabel = label;
        startInput.value = label || startInput.value;
        setStatus(`已選擇起點：${label}`);
        markPlanStale(null, true);
      });
    }
  }

  async function getGoogleMapsKey(){
    if (state.googleMapsKey) return state.googleMapsKey;
    try{
      const res = await fetch('/api/maps-key', { cache:'no-store' });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data && data.ok && data.key){
        state.googleMapsKey = data.key;
        return state.googleMapsKey;
      }
      if (mapPlaceInfo){
        mapPlaceInfo.textContent = res.status ? `地圖載入失敗（${res.status}）` : '地圖載入失敗';
      }
    }catch(_){ }
    return '';
  }

  async function ensureGoogleMaps(){
    if (state.googleReady && window.google && window.google.maps) return true;
    if (state.googleLoadingPromise) return state.googleLoadingPromise;
    state.googleLoadingPromise = new Promise(async (resolve) => {
      if (mapPlaceInfo) mapPlaceInfo.textContent = '地圖載入中…';
      const key = await getGoogleMapsKey();
      if (!key){
        if (mapPlaceInfo) mapPlaceInfo.textContent = '未設定 Google Maps Key';
        resolve(false);
        return;
      }
      if (window.google && window.google.maps) {
        initGoogleMaps();
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=initDayTripMaps`;
      window.initDayTripMaps = () => {
        initGoogleMaps();
        resolve(true);
      };
      script.onerror = () => {
        if (mapPlaceInfo) mapPlaceInfo.textContent = '地圖載入失敗';
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return state.googleLoadingPromise;
  }

  async function loadData(){
    setStatus('資料載入中…');
    try{
      const [foodsRes, templesRes] = await Promise.all([
        fetch('/api/foods', { credentials:'include' }),
        fetch('/api/temples', { credentials:'include' })
      ]);
      const foodsData = await foodsRes.json().catch(()=>({}));
      const templesData = await templesRes.json().catch(()=>({}));
      state.foods = normalizeItems(foodsData.items || [], 'food');
      state.temples = normalizeItems(templesData.items || [], 'temple');
      state.ready = true;
      renderFilterOptions();
      updateCandidateSummary();
      setStatus(`已載入 ${state.foods.length} 家美食、${state.temples.length} 間寺廟`);
    }catch(err){
      setStatus(`資料載入失敗：${err.message}`, true);
      state.ready = false;
    }
  }

  if (mustSearchInput){
    mustSearchInput.addEventListener('input', (e)=>{
      renderMustSearchResults(e.target.value);
    });
  }
  [foodCatFilter, foodAreaFilter, foodPriceFilter, templeAreaFilter].forEach(el => {
    if (!el) return;
    el.addEventListener('change', handleFiltersChange);
  });
  [foodTagFilters, templeTagFilters, templeWishFilters].forEach(container => {
    if (!container) return;
    container.addEventListener('change', handleFiltersChange);
  });
  if (btnClearFilters){
    btnClearFilters.addEventListener('click', clearFilters);
  }

  function selectMode(mode, silent){
    if (modeSelect) modeSelect.value = mode;
    if (modeCards){
      modeCards.querySelectorAll('.mode-card').forEach(card=>{
        card.classList.toggle('is-selected', card.getAttribute('data-mode') === mode);
      });
    }
    if (!silent) markPlanStale('行程模式已變更，請重新產生');
  }

  if (modeCards){
    modeCards.querySelectorAll('.mode-card').forEach(card=>{
      card.addEventListener('click', ()=>{
        const mode = card.getAttribute('data-mode') || 'balance';
        selectMode(mode);
      });
    });
  }
  if (routeSelect){
    routeSelect.addEventListener('change', ()=>{
      state.selectedRouteId = routeSelect.value;
      updateRouteHint(getRouteById(routeSelect.value));
      markPlanStale('路線已變更，請重新產生');
    });
  }

  if (stepper){
    stepPills.forEach(pill=>{
      pill.addEventListener('click', ()=>{
        const step = Number(pill.getAttribute('data-step-pill'));
        if (!Number.isFinite(step)) return;
        if (step > maxStep){
          setStatus('請先完成前一步', true);
          return;
        }
        showStep(step);
      });
    });
  }

  if (btnLocate){
    btnLocate.addEventListener('click', () => {
      if (!navigator.geolocation){
        setStatus('瀏覽器不支援定位', true);
        return;
      }
      setStatus('定位中…');
      navigator.geolocation.getCurrentPosition((pos)=>{
        state.startCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.startLabel = '我的位置';
        if (startInput) startInput.value = '我的位置';
        setStatus('已取得定位');
        markPlanStale(null, true);
      }, ()=>{
        setStatus('定位失敗，請允許定位權限', true);
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }
  if (startInput){
    startInput.addEventListener('input', ()=>{
      state.startCoords = null;
      state.startLabel = '';
      markPlanStale('起點已變更，請重新產生');
    });
  }
  if (startTimeInput){
    startTimeInput.addEventListener('change', ()=>{
      markPlanStale('時間已變更，請重新產生');
    });
  }
  if (endTimeInput){
    endTimeInput.addEventListener('change', ()=>{
      markPlanStale('時間已變更，請重新產生');
    });
  }
  if (transportSelect){
    transportSelect.addEventListener('change', ()=>{
      markPlanStale('交通方式已變更，請重新產生');
    });
  }
  [mealBreakfast, mealLunch, mealSnack, mealDinner].forEach(el => {
    if (!el) return;
    el.addEventListener('change', ()=>{
      markPlanStale('餐別已變更，請重新產生');
    });
  });
  if (includeTempleToggle){
    includeTempleToggle.addEventListener('change', ()=>{
      markPlanStale('寺廟設定已變更，請重新產生');
    });
  }
  if (allowClosedToggle){
    allowClosedToggle.addEventListener('change', ()=>{
      markPlanStale('行程設定已變更，請重新產生');
    });
  }

  if (btnGenerate){
    btnGenerate.addEventListener('click', ()=>{ generatePlan(); });
  }
  if (btnStep1Next){
    btnStep1Next.addEventListener('click', ()=>{
      if (!validateStep1()) return;
      updateMaxStep(2);
      showStep(2);
    });
  }
  if (btnStep2Back){
    btnStep2Back.addEventListener('click', ()=>{ showStep(1); });
  }
  if (btnStep2Next){
    btnStep2Next.addEventListener('click', ()=>{
      updateMaxStep(3);
      showStep(3);
    });
  }
  if (btnStep3Back){
    btnStep3Back.addEventListener('click', ()=>{ showStep(2); });
  }
  if (btnStep3Next){
    btnStep3Next.addEventListener('click', async ()=>{
      if (!validateStep1()) return;
      const ok = await generatePlan();
      if (ok){
        updateMaxStep(4);
        showStep(4);
      }
    });
  }
  if (btnStep4Back){
    btnStep4Back.addEventListener('click', ()=>{ showStep(3); });
  }
  if (btnSavePlan){
    btnSavePlan.addEventListener('click', saveCurrentPlan);
  }
  if (btnPrint){
    btnPrint.addEventListener('click', ()=>{ window.print(); });
  }
  if (btnShareLine){
    btnShareLine.addEventListener('click', shareToLine);
  }
  if (btnCopyShare){
    btnCopyShare.addEventListener('click', ()=>{
      if (shareLinkInput && shareLinkInput.value){
        if (typeof copyToClipboard === 'function') copyToClipboard(shareLinkInput.value);
        setStatus('已複製分享連結');
      }
    });
  }
  if (btnAddMapPlace){
    btnAddMapPlace.addEventListener('click', addCustomPlace);
  }
  if (btnAdjustPlan){
    btnAdjustPlan.addEventListener('click', openAdjustDialog);
  }
  if (btnAdjustClose){
    btnAdjustClose.addEventListener('click', closeAdjustDialog);
  }
  if (btnAdjustApply){
    btnAdjustApply.addEventListener('click', async ()=>{
      if (!validateStep1()) return;
      const ok = await generatePlan();
      if (ok){
        closeAdjustDialog();
        showStep(4);
      }
    });
  }
  if (adjustDialog){
    adjustDialog.addEventListener('click', (event)=>{
      if (event.target === adjustDialog) closeAdjustDialog();
    });
    adjustDialog.addEventListener('cancel', (event)=>{
      event.preventDefault();
      closeAdjustDialog();
    });
  }

  loadSavedPlans();
  renderSavedPlans();
  loadData().then(()=>{
    renderMustList();
    renderRecommendedList();
    renderRouteOptions();
    selectMode(modeSelect ? modeSelect.value : 'balance', true);
    ensureGoogleMaps().then(()=>{
      if (state.currentSummary) maybeApplyGoogleTimes(state.currentSummary);
    });
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('plan');
    let showInitialStep = true;
    if (encoded){
      const payload = decodePayload(encoded);
      if (payload){
        applySharedPlan(payload);
        showInitialStep = false;
      }
    }
    if (showInitialStep) showStep(1);
  });
})();
