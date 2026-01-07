(function(){
  var form = document.getElementById('heroForm');
  var input = document.getElementById('heroQuery');
  var header = document.getElementById('siteHeader');
  var navToggle = document.getElementById('navToggle');
  var navDrawer = document.getElementById('navDrawer');
  var navCtas = Array.from(document.querySelectorAll('[data-nav-cta]'));

  function handleSubmit(event){
    event.preventDefault();
    var value = (input && input.value || '').trim();
    var target = '/itinerary?q=' + encodeURIComponent(value || '不限');
    window.location.href = target;
  }

  if (form && input){
    form.addEventListener('submit', handleSubmit);
  }

  if (navCtas.length && input){
    navCtas.forEach(function(btn){
      btn.addEventListener('click', function(){
        setDrawer(false);
        setTimeout(function(){
          input.focus();
        }, 150);
      });
    });
  }

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
