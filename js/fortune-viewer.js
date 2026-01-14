(function(){
  function open(payload){
    if (!payload || !payload.fortune) return false;
    try{
      const ev = new CustomEvent('fortune:open', { detail: payload });
      window.dispatchEvent(ev);
      return true;
    }catch(_){
      return false;
    }
  }

  window.FortuneViewer = {
    open
  };
})();
