(function(){
  var output = document.getElementById('queryOutput');
  if (!output) return;
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q && q.trim()) {
    output.textContent = q.trim();
  } else {
    output.textContent = '不限';
  }
})();
