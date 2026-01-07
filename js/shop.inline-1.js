  window.__shippingFee = window.__shippingFee || 60;
  window.__codShippingFee = window.__codShippingFee || 38;
  window.__disableBankTransferUI = true;
  window.isCandleItemLike = window.isCandleItemLike || function(obj){
    try{
      var text = '';
      if (obj && obj.category) text += String(obj.category);
      var nm = (obj && (obj.name || obj.title || obj.productName || obj.deity)) || '';
      text += ' ' + String(nm);
      return /蠟燭/.test(text);
    }catch(_){ return false; }
  };
