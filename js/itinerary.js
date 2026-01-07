(function(){
  var output = document.getElementById('queryOutput');
  var previewTemple = document.getElementById('previewTemple');
  var previewFood = document.getElementById('previewFood');
  var previewService = document.getElementById('previewService');
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  var clean = (q && q.trim()) ? q.trim() : '不限';

  if (output){
    output.textContent = clean;
  }

  function withQuery(url){
    if (!clean || clean === '不限') return url;
    return url + '?q=' + encodeURIComponent(clean);
  }

  if (previewTemple) previewTemple.href = withQuery('/templemap');
  if (previewFood) previewFood.href = withQuery('/food-map');
  if (previewService) previewService.href = withQuery('/service');

  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  var navDrawer = document.getElementById('navDrawer');

  function updateHeader(){
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setDrawer(open){
    if (!navDrawer || !navToggle) return;
    document.body.classList.toggle('nav-open', open);
    navDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (navToggle && navDrawer){
    navToggle.addEventListener('click', function(){
      var isOpen = document.body.classList.contains('nav-open');
      setDrawer(!isOpen);
    });

    navDrawer.addEventListener('click', function(event){
      var target = event.target;
      if (!target) return;
      if (target.matches('[data-nav-close]')){
        setDrawer(false);
        return;
      }
      if (target.tagName === 'A'){
        setDrawer(false);
      }
    });

    window.addEventListener('keydown', function(event){
      if (event.key === 'Escape'){
        setDrawer(false);
      }
    });
  }
})();
