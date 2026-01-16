(function(){
  var chart;
  var daysInput = document.getElementById('daysInput');
  var reloadBtn = document.getElementById('reloadBtn');
  var totalEl = document.getElementById('totalCount');
  var todayEl = document.getElementById('todayCount');
  var weekEl = document.getElementById('weekCount');
  var monthEl = document.getElementById('monthCount');
  var tableBody = document.getElementById('trafficTableBody');
  var sourceList = document.getElementById('sourceList');
  var campaignList = document.getElementById('campaignList');
  var eventName = 'home_view';

  function fmt(num){
    return new Intl.NumberFormat('zh-Hant').format(num || 0);
  }
  function escapeHtml(str){
    return String(str||'').replace(/[&<>"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
    });
  }

  function clampDays(value){
    var n = parseInt(value, 10);
    if (!Number.isFinite(n)) return 14;
    return Math.max(1, Math.min(90, n));
  }

  function renderList(el, items){
    if (!el) return;
    if (!items || !items.length){
      el.innerHTML = '<div class="muted">目前沒有資料</div>';
      return;
    }
    el.innerHTML = items.map(function(item){
      var name = item && item.name ? item.name : 'direct';
      return '<div class="traffic-list-item"><span>' + escapeHtml(name) + '</span><strong>' + fmt(item.count) + '</strong></div>';
    }).join('');
  }

  function renderTable(stats){
    if (!tableBody) return;
    if (!stats || !stats.length){
      tableBody.innerHTML = '<tr><td colspan="2" class="muted">尚無資料</td></tr>';
      return;
    }
    tableBody.innerHTML = stats.map(function(row){
      return '<tr><td>' + escapeHtml(row.date) + '</td><td>' + fmt(row.count) + '</td></tr>';
    }).join('');
  }

  function renderChart(labels, values){
    var ctx = document.getElementById('trafficChart');
    if (!ctx || !window.Chart) return;
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#f97316'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15,23,42,0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { stepSize: 1, font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  function updateStats(stats, total){
    var today = stats.length ? stats[stats.length - 1].count : 0;
    var last7 = stats.slice(-7).reduce(function(sum, item){ return sum + (item.count || 0); }, 0);
    var last30 = stats.reduce(function(sum, item){ return sum + (item.count || 0); }, 0);
    if (totalEl) totalEl.textContent = fmt(total);
    if (todayEl) todayEl.textContent = fmt(today);
    if (weekEl) weekEl.textContent = fmt(last7);
    if (monthEl) monthEl.textContent = fmt(last30);
  }

  function loadStats(){
    var days = clampDays(daysInput ? daysInput.value : 14);
    if (daysInput) daysInput.value = String(days);
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="2" class="muted">載入中…</td></tr>';
    fetch('/api/admin/track-stats?event=' + encodeURIComponent(eventName) + '&days=' + days, {
      credentials: 'include',
      cache: 'no-store'
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (!data || !data.ok) return;
        var stats = data.stats || [];
        updateStats(stats, data.total || 0);
        renderTable(stats);
        renderList(sourceList, data.sources || []);
        renderList(campaignList, data.campaigns || []);
        renderChart(stats.map(function(row){ return row.date.slice(5); }), stats.map(function(row){ return row.count || 0; }));
      })
      .catch(function(){
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="2" class="muted">載入失敗</td></tr>';
      });
  }

  if (reloadBtn){
    reloadBtn.addEventListener('click', loadStats);
  }

  if (daysInput){
    daysInput.addEventListener('change', loadStats);
  }

  loadStats();
  if (!window.__adminTrafficTimer){
    window.__adminTrafficTimer = setInterval(loadStats, 60000);
  }
})();
