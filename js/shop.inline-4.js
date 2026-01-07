(function(){
  function addQuizSideLink(){
    var side = document.getElementById('sideDeities');
    if (!side) return;
    if (document.getElementById('quizSideLink')) return; // avoid duplicate
    var tools = side.querySelector('.tools-box');
    var a = document.createElement('a');
    a.id = 'quizSideLink';
    a.href = '/quiz';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'side-link quiz-link-btn';
    a.textContent = '🔮 測驗與您有緣的守護神';
    if (tools){
      tools.appendChild(a);
    } else {
      side.appendChild(a);
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', addQuizSideLink);
  } else {
    addQuizSideLink();
  }
})();
