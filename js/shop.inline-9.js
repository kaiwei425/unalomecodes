(function(){
  // Disabled: previously this script stripped inline styles from the bank dialog,
  // which removed necessary paddings and caused the form to look cropped on the edges.
  // Keep the guard flag to avoid re-injection, but perform no mutations.
  if (window.__bankUnifiedReset__) return;
  window.__bankUnifiedReset__ = true;
})();
