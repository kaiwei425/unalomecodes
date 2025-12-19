(function(){
  const state = { ids: [], ready: false };
  const listeners = [];

  function notify(){
    listeners.forEach(fn=>{
      try{ fn(state.ids.slice()); }catch(_){}
    });
  }

  async function fetchWishlist(){
    if (!window.authState || !window.authState.isLoggedIn()){
      state.ids = [];
      state.ready = true;
      notify();
      return;
    }
    try{
      const res = await fetch('/api/me/wishlist', { credentials:'include' });
      if (res.ok){
        const data = await res.json().catch(()=>({}));
        if (data && data.ok !== false && Array.isArray(data.wishlist)){
          state.ids = data.wishlist;
        }else{
          state.ids = [];
        }
      }else{
        state.ids = [];
      }
    }catch(_){
      state.ids = [];
    }
    state.ready = true;
    notify();
  }

  function toggle(productId){
    if (!productId) return Promise.reject(new Error('missing productId'));
    if (!window.authState || !window.authState.isLoggedIn()){
      if (window.authState && typeof window.authState.promptLogin === 'function'){
        window.authState.promptLogin('請先登入後再收藏商品。');
      }
      return Promise.reject(new Error('login_required'));
    }
    return fetch('/api/me/wishlist', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ productId, action:'toggle' })
    }).then(async res=>{
      const data = await res.json().catch(()=>({}));
      if (!res.ok || (data && data.ok === false)){
        throw new Error((data && data.error) || '更新收藏失敗');
      }
      state.ids = Array.isArray(data.wishlist) ? data.wishlist : [];
      fetchWishlist(); // refresh items for account page
      notify();
      return state.ids;
    });
  }

  window.wishlist = {
    getIds: ()=>state.ids.slice(),
    has(id){
      if (!id) return false;
      const target = String(id);
      return state.ids.includes(target);
    },
    toggle,
    subscribe(fn){
      if (typeof fn === 'function'){
        listeners.push(fn);
        if (state.ready){
          try{ fn(state.ids.slice()); }catch(_){}
        }
      }
    }
  };

  if (window.authState){
    window.authState.subscribe(user=>{
      if (user){
        fetchWishlist();
      }else{
        state.ids = [];
        notify();
      }
    });
    window.authState.onProfile(profile=>{
      if (profile && Array.isArray(profile.wishlist)){
        state.ids = profile.wishlist;
        state.ready = true;
        notify();
      }
    });
  }
})();
