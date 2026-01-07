    const AREA_LIST = [
      { id:'siam', name:'Siam / Chit Lom', lat:13.746, lng:100.535, tags:['BTS','商場'] },
      { id:'sukhumvit', name:'Asok / Sukhumvit', lat:13.737, lng:100.561, tags:['BTS','MRT'] },
      { id:'thonglor', name:'Thonglor / Ekkamai', lat:13.730, lng:100.575, tags:['咖啡','餐酒館'] },
      { id:'silom', name:'Silom / Sathon', lat:13.725, lng:100.532, tags:['BTS','夜生活'] },
      { id:'oldtown', name:'Old Town / Wat Pho', lat:13.746, lng:100.492, tags:['寺廟','河邊'] },
      { id:'riverside', name:'Riverside', lat:13.724, lng:100.491, tags:['河景','渡輪'] },
      { id:'ari', name:'Ari / Chatuchak', lat:13.799, lng:100.548, tags:['咖啡','市集'] },
      { id:'chinatown', name:'Yaowarat', lat:13.739, lng:100.513, tags:['夜市','小吃'] }
    ];

    const PLACES = [
      { id:'erawan', name:'四面佛 Erawan Shrine', type:'廟', area:'siam', indoor:false, rating:5, note:'市中心快速補運，一圈 5 分鐘就完成。', map:'https://maps.google.com/?q=Erawan+Shrine' },
      { id:'watarun', name:'鄭王廟 Wat Arun', type:'廟', area:'oldtown', indoor:false, rating:4, note:'黃昏超美，建議避開正中午。', map:'https://maps.google.com/?q=Wat+Arun' },
      { id:'watpho', name:'臥佛寺 Wat Pho', type:'廟', area:'oldtown', indoor:true, rating:4, note:'有冷氣區域，適合熱天休息。', map:'https://maps.google.com/?q=Wat+Pho' },
      { id:'iconsiam', name:'ICONSIAM', type:'商場', area:'riverside', indoor:true, rating:4, note:'下雨首選，食物選擇多。', map:'https://maps.google.com/?q=ICONSIAM' },
      { id:'sathorn', name:'Baan Suan Sathon', type:'咖啡', area:'silom', indoor:false, rating:4, note:'綠意滿滿，午後很放鬆。', map:'https://maps.google.com/?q=Baan+Suan+Sathon' },
      { id:'cataleya', name:'Cataleya Estate', type:'咖啡', area:'sukhumvit', indoor:true, rating:5, note:'拍照很好看，餐點水準穩。', map:'https://maps.google.com/?q=Cataleya+Estate' },
      { id:'ari-cafe', name:'Ari 咖啡巷', type:'咖啡', area:'ari', indoor:true, rating:4, note:'一條街就有好幾間特色咖啡。', map:'https://maps.google.com/?q=Ari+Bangkok+cafe' },
      { id:'jodd', name:'JODD FAIRS 夜市', type:'夜市', area:'sukhumvit', indoor:false, rating:4, note:'晚上最方便的夜市，交通友善。', map:'https://maps.google.com/?q=Jodd+Fairs' },
      { id:'yaowarat', name:'耀華力夜市', type:'夜市', area:'chinatown', indoor:false, rating:5, note:'小吃密度最高，越晚越熱鬧。', map:'https://maps.google.com/?q=Yaowarat' },
      { id:'chatuchak', name:'恰圖恰克市集', type:'市集', area:'ari', indoor:false, rating:4, note:'週末限定，怕熱記得早起。', map:'https://maps.google.com/?q=Chatuchak+Market' },
      { id:'asiatique', name:'Asiatique 河濱夜市', type:'夜市', area:'riverside', indoor:false, rating:4, note:'河邊散步很舒服，適合情侶。', map:'https://maps.google.com/?q=Asiatique' },
      { id:'lumpini', name:'倫披尼公園', type:'散步', area:'silom', indoor:false, rating:3, note:'涼爽傍晚走一圈最剛好。', map:'https://maps.google.com/?q=Lumpini+Park' }
    ];

    const state = {
      areaId:null,
      coords:null,
      weather:null
    };

    const locName = document.getElementById('locName');
    const locDetail = document.getElementById('locDetail');
    const areaSelect = document.getElementById('areaSelect');
    const locBtn = document.getElementById('locBtn');
    const weatherMain = document.getElementById('weatherMain');
    const weatherAdvice = document.getElementById('weatherAdvice');
    const weatherTags = document.getElementById('weatherTags');
    const transportMain = document.getElementById('transportMain');
    const transportAdvice = document.getElementById('transportAdvice');
    const transportTags = document.getElementById('transportTags');
    const dayPick = document.getElementById('dayPick');
    const placeList = document.getElementById('placeList');

    function kmDistance(a, b){
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const v = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
      return 2 * R * Math.asin(Math.sqrt(v));
    }

    function detectArea(coords){
      if (!coords) return null;
      let best = null;
      AREA_LIST.forEach(area=>{
        const dist = kmDistance({ lat:coords.lat, lng:coords.lng }, area);
        if (!best || dist < best.dist) best = { id: area.id, dist };
      });
      if (!best || best.dist > 30) return null;
      return best.id;
    }

    function setArea(areaId, reason){
      const area = AREA_LIST.find(a=>a.id===areaId);
      state.areaId = areaId;
      if (area){
        locName.textContent = area.name;
        locDetail.textContent = reason || ('根據定位判斷｜' + area.tags.join(' · '));
      }else{
        locName.textContent = '曼谷市區';
        locDetail.textContent = '尚未確認區域，可手動選擇。';
      }
      updateRecommendations();
    }

    function fillAreaSelect(){
      areaSelect.innerHTML = `<option value="">手動選擇地區</option>` +
        AREA_LIST.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
    }

    function weatherText(code){
      const map = {
        0:'晴朗',1:'晴時多雲',2:'多雲',3:'陰天',
        51:'毛毛雨',53:'小雨',55:'中雨',
        61:'小雨',63:'中雨',65:'大雨',
        80:'陣雨',81:'陣雨',82:'豪雨',
        95:'雷雨'
      };
      return map[code] || '天氣變化';
    }

    async function loadWeather(coords){
      if (!coords) return;
      try{
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`;
        const res = await fetch(url);
        const data = await res.json();
        const cur = data.current || {};
        state.weather = {
          temp: cur.temperature_2m,
          rain: cur.precipitation,
          code: cur.weather_code
        };
        renderWeather();
      }catch(_){
        weatherMain.textContent = '天氣暫時無法取得';
        weatherAdvice.textContent = '先用我的經驗建議：天熱避室外，傍晚再安排戶外。';
      }
    }

    function renderWeather(){
      const w = state.weather;
      if (!w){
        weatherMain.textContent = '—';
        return;
      }
      const isRain = Number(w.rain || 0) >= 0.6 || [61,63,65,80,81,82,95].includes(w.code);
      const isHot = Number(w.temp) >= 32;
      const isCool = Number(w.temp) <= 24;
      weatherMain.textContent = `${Math.round(w.temp)}°C · ${weatherText(w.code)}`;
      if (isRain){
        weatherAdvice.textContent = '下雨建議：室內廟、咖啡店或商場，避免遠距步行。';
      }else if (isHot){
        weatherAdvice.textContent = '太熱建議：先去冷氣咖啡或商場，傍晚再跑戶外。';
      }else if (isCool){
        weatherAdvice.textContent = '天氣舒服：安排河邊散步或戶外寺廟。';
      }else{
        weatherAdvice.textContent = '氣候穩定，適合安排 2–3 個短行程。';
      }
      weatherTags.innerHTML = '';
      const tags = [];
      if (isRain) tags.push({ text:'雨天模式', cls:'chip cool' });
      if (isHot) tags.push({ text:'高溫模式', cls:'chip hot' });
      if (!isRain && !isHot) tags.push({ text:'行程自由', cls:'chip good' });
      tags.forEach(t=>{
        const span = document.createElement('span');
        span.className = t.cls;
        span.textContent = t.text;
        weatherTags.appendChild(span);
      });
    }

    function buildTransportAdvice(){
      const w = state.weather || {};
      const hour = new Date().getHours();
      const isLate = hour >= 22 || hour <= 6;
      const isRain = Number(w.rain || 0) >= 0.6;
      let main = 'BTS / MRT';
      let tip = '市區移動首選軌道，節省塞車時間。';
      if (isLate){
        main = 'Grab / Bolt / 計程車';
        tip = '夜晚建議叫車移動，安全又省體力。';
      }else if (isRain){
        main = 'BTS / MRT + Grab';
        tip = '雨天先搭軌道，再用叫車補最後一段。';
      }
      transportMain.textContent = main;
      transportAdvice.textContent = '我的建議：' + tip;
      transportTags.innerHTML = '';
      ['BTS','MRT','Grab','Bolt','計程車'].forEach(name=>{
        const span = document.createElement('span');
        span.className = 'chip';
        span.textContent = name;
        if (main.includes(name)) span.classList.add('good');
        transportTags.appendChild(span);
      });
    }

    function buildDayPicks(){
      const w = state.weather || {};
      const hour = new Date().getHours();
      const picks = [];
      const isRain = Number(w.rain || 0) >= 0.6;
      const isHot = Number(w.temp || 0) >= 32;
      if (isRain){
        picks.push('室內廟靜心');
        picks.push('咖啡店休息');
        picks.push('商場吃飯');
      }else if (isHot){
        picks.push('冷氣咖啡廳');
        picks.push('傍晚夜市');
        picks.push('河邊散步');
      }else{
        picks.push('附近寺廟');
        picks.push('小巷咖啡');
        picks.push(hour >= 17 ? '夜市小吃' : '城市散步');
      }
      dayPick.innerHTML = '';
      picks.slice(0,3).forEach(text=>{
        const span = document.createElement('span');
        span.className = 'chip';
        span.textContent = text;
        dayPick.appendChild(span);
      });
    }

    function pickPlaces(){
      const areaId = state.areaId;
      const w = state.weather || {};
      const isRain = Number(w.rain || 0) >= 0.6;
      const pool = PLACES.filter(p => !areaId || p.area === areaId);
      const fallback = PLACES.filter(p => p.area !== areaId);
      const list = pool.length ? pool : fallback;
      const picked = [];
      ['廟','咖啡','夜市','市集'].forEach(type=>{
        const item = list.find(p=>p.type === type && !picked.includes(p));
        if (item) picked.push(item);
      });
      list.sort((a,b)=> b.rating - a.rating).forEach(item=>{
        if (picked.length >= 5) return;
        if (!picked.includes(item)){
          if (isRain && !item.indoor && item.type === '夜市') return;
          picked.push(item);
        }
      });
      return picked.slice(0,5);
    }

    function updateRecommendations(){
      buildTransportAdvice();
      buildDayPicks();
      const list = pickPlaces();
      placeList.innerHTML = '';
      list.forEach(place=>{
        const card = document.createElement('div');
        card.className = 'place-card';
        card.innerHTML = `
          <div class="badge">${place.type}</div>
          <div class="place-title">${place.name}</div>
          <div class="place-meta">${AREA_LIST.find(a=>a.id===place.area)?.name || '曼谷'}</div>
          <div class="place-note">${place.note}</div>
          <div class="place-actions">
            <a class="btn ghost" href="${place.map}" target="_blank" rel="noopener">地圖導航</a>
            <a class="btn ghost" href="/food-map">查看更多</a>
          </div>
        `;
        placeList.appendChild(card);
      });
    }

    function applyCoords(coords, reason){
      state.coords = coords;
      const areaId = detectArea(coords);
      setArea(areaId, reason);
      loadWeather(coords);
    }

    function locateNow(){
      if (!navigator.geolocation){
        locDetail.textContent = '此裝置不支援定位，請手動選擇地區。';
        return;
      }
      locName.textContent = '定位中…';
      navigator.geolocation.getCurrentPosition(
        pos=>{
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          applyCoords(coords, '根據定位判斷');
        },
        ()=>{
          locName.textContent = '定位失敗';
          locDetail.textContent = '請手動選擇地區。';
        },
        { enableHighAccuracy:true, timeout:8000 }
      );
    }

    fillAreaSelect();
    areaSelect.addEventListener('change', (ev)=>{
      const val = ev.target.value;
      if (!val) return;
      const area = AREA_LIST.find(a=>a.id===val);
      if (area){
        applyCoords({ lat: area.lat, lng: area.lng }, '手動選擇地區');
      }
    });
    locBtn.addEventListener('click', locateNow);
    locateNow();
  
