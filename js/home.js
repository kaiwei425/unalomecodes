(function(){
  var form = document.getElementById('heroForm');
  var input = document.getElementById('heroQuery');

  if (!form || !input) return;

  form.addEventListener('submit', function(event){
    event.preventDefault();
    var value = (input.value || '').trim();
    var target = '/itinerary';
    if (value) {
      target += '?q=' + encodeURIComponent(value);
    }
    window.location.href = target;
  });
})();
