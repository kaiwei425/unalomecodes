(function(){
  function addLineSupportLink(){
    var side = document.getElementById('sideDeities');
    if (!side) return;
    // avoid duplicates if script runs multiple times
    if (document.getElementById('lineSupportLink')) return;
    var a = document.createElement('a');
    a.id = 'lineSupportLink';
    a.href = 'https://line.me/R/ti/p/@427oaemj';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'side-link line-support-btn';
    a.textContent = '官方LINE客服';
    // place the link at the end of the sidebar container
    side.appendChild(a);
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', addLineSupportLink);
  }else{
    addLineSupportLink();
  }
})();
