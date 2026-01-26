function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createAuthHandlers(deps){
  requireDeps(deps, ['json', 'jsonHeadersFor', 'makeToken', 'makeSignedState', 'verifySignedState', 'parseCookies', 'ensureUserRecord', 'signSession', 'verifyLineIdToken', 'getSessionUser', 'parseAdminEmails', 'getAdminSecret', 'redirectWithBody', 'base64UrlDecodeToBytes'], 'auth.js');
  const {
    json,
    jsonHeadersFor,
    makeToken,
    makeSignedState,
    verifySignedState,
    parseCookies,
    ensureUserRecord,
    signSession,
    verifyLineIdToken,
    getSessionUser,
    parseAdminEmails,
    getAdminSecret,
    redirectWithBody,
    base64UrlDecodeToBytes
  } = deps;

  async function handleAuth(request, env, url, pathname, origin){
    if (pathname === '/api/auth/google/login') {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return new Response('Google OAuth not configured', { status:500 });
      }
      const state = makeToken(24);
      const redirectRaw = url.searchParams.get('redirect') || '';
      let redirectPath = '/shop';
      if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
        redirectPath = redirectRaw;
      }
      const prompt = url.searchParams.get('prompt') || 'select_account';
      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: `${origin}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt
      });
      const headers = new Headers({
        Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      });
      headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
      headers.append('Set-Cookie', `oauth_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      return new Response(null, { status:302, headers });
    }

    if (pathname === '/api/auth/line/login') {
      if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET) {
        return new Response('LINE OAuth not configured', { status:500 });
      }
      const redirectRaw = url.searchParams.get('redirect') || '';
      let redirectPath = '/shop';
      if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
        redirectPath = redirectRaw;
      }
      const stateSecret = env.LINE_CHANNEL_SECRET || env.OAUTH_STATE_SECRET || env.SESSION_SECRET || '';
      const statePayload = { t: Math.floor(Date.now() / 1000), n: makeToken(12), r: redirectPath };
      let state = await makeSignedState(statePayload, stateSecret);
      if (!state) state = makeToken(24);
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: String(env.LINE_CHANNEL_ID || ''),
        redirect_uri: `${origin}/api/auth/line/callback`,
        state,
        scope: 'openid profile email'
      });
      const headers = new Headers({
        Location: `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
      });
      headers.append('Set-Cookie', `line_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
      headers.append('Set-Cookie', `line_oauth_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      return new Response(null, { status:302, headers });
    }

    if (pathname === '/api/auth/line/callback') {
      const code = url.searchParams.get('code') || '';
      const state = url.searchParams.get('state') || '';
      const cookies = parseCookies(request);
      const expectedState = cookies.line_oauth_state || '';
      const clearStateCookie = 'line_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
      const clearRedirectCookie = 'line_oauth_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
      const stateSecret = env.LINE_CHANNEL_SECRET || env.OAUTH_STATE_SECRET || env.SESSION_SECRET || '';
      const signedPayload = await verifySignedState(state, stateSecret, 600);
      const stateValid = !!expectedState && state === expectedState;
      const redirectPath = (()=> {
        const raw = cookies.line_oauth_redirect || '';
        if (raw) {
          try{
            const decoded = decodeURIComponent(raw);
            if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
          }catch(_){}
        }
        const signedRedirect = signedPayload && signedPayload.r;
        if (signedRedirect && typeof signedRedirect === 'string' && signedRedirect.startsWith('/') && !signedRedirect.startsWith('//')){
          return signedRedirect;
        }
        return '/shop';
      })();
      if (!code || !state || (!stateValid && !signedPayload)) {
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('Invalid OAuth state', { status:400, headers: h });
      }
      if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET) {
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('LINE OAuth not configured', { status:500, headers: h });
      }
      try{
        const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
          method:'POST',
          headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${origin}/api/auth/line/callback`,
            client_id: String(env.LINE_CHANNEL_ID || ''),
            client_secret: String(env.LINE_CHANNEL_SECRET || '')
          })
        });
        const tokenText = await tokenRes.text();
        let tokens = null;
        try{ tokens = JSON.parse(tokenText); }catch(_){}
        if (!tokenRes.ok || !tokens || !tokens.id_token){
          console.error('line token error', tokenRes.status, tokenText);
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('LINE OAuth error', { status:500, headers: h });
        }
        const info = await verifyLineIdToken(tokens.id_token, env);
        if (!info){
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('LINE ID token invalid', { status:401, headers: h });
        }
        const sub = String(info.sub || '').trim();
        const user = {
          id: `line:${sub}`,
          email: info.email || '',
          name: info.name || info.email || 'LINE 使用者',
          picture: info.picture || '',
          provider: 'line',
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000
        };
        await ensureUserRecord(env, user);
        const token = await signSession(user, env.SESSION_SECRET || '');
        const headers = new Headers({
          'Set-Cookie': `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
        });
        headers.append('Set-Cookie', clearStateCookie);
        headers.append('Set-Cookie', clearRedirectCookie);
        headers.append('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
        headers.append('Location', `${origin}${redirectPath}`);
        return new Response(null, { status:302, headers });
      }catch(err){
        console.error('LINE OAuth error', err);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('OAuth error', { status:500, headers: h });
      }
    }

    if (pathname === '/api/auth/line/liff' && request.method === 'POST') {
      const headers = jsonHeadersFor(request, env);
      if (!env.LINE_CHANNEL_ID){
        return new Response(JSON.stringify({ ok:false, error:'LINE not configured' }), { status:500, headers });
      }
      let body = {};
      try{ body = await request.json(); }catch(_){ body = {}; }
      const idToken = String(body.id_token || body.idToken || '').trim();
      if (!idToken){
        return new Response(JSON.stringify({ ok:false, error:'missing_id_token' }), { status:400, headers });
      }
      const info = await verifyLineIdToken(idToken, env);
      if (!info){
        return new Response(JSON.stringify({ ok:false, error:'invalid_id_token' }), { status:401, headers });
      }
      const sub = String(info.sub || '').trim();
      const user = {
        id: `line:${sub}`,
        email: info.email || '',
        name: info.name || info.email || 'LINE 使用者',
        picture: info.picture || '',
        provider: 'line',
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      await ensureUserRecord(env, user);
      const token = await signSession(user, env.SESSION_SECRET || '');
      const h = new Headers(headers);
      h.append('Set-Cookie', `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
      h.append('Set-Cookie', `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
      return new Response(JSON.stringify({ ok:true, user:{
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        provider: user.provider
      }}), { status:200, headers: h });
    }

    if (pathname === '/api/auth/google/callback') {
      const code = url.searchParams.get('code') || '';
      const state = url.searchParams.get('state') || '';
      const cookies = parseCookies(request);
      const expectedState = cookies.oauth_state || '';
      const clearStateCookie = 'oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
      const clearRedirectCookie = 'oauth_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
      const redirectPath = (()=> {
        const raw = cookies.oauth_redirect || '';
        if (raw) {
          try{
            const decoded = decodeURIComponent(raw);
            if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
          }catch(_){}
        }
        return '/shop';
      })();
      if (!code || !state || !expectedState || state !== expectedState) {
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('Invalid OAuth state', { status:400, headers: h });
      }
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return new Response('Google OAuth not configured', {
          status:500,
          headers:{ 'Set-Cookie': clearStateCookie }
        });
      }
      try{
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${origin}/api/auth/google/callback`,
            grant_type: 'authorization_code'
          })
        });
        const tokenText = await tokenRes.text();
        let tokens = null;
        try{ tokens = JSON.parse(tokenText); }catch(_){}
        if (!tokenRes.ok || !tokens || !tokens.access_token){
          console.error('google token error', tokenRes.status, tokenText);
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('無法取得 Google token', { status:500, headers: h });
        }
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers:{ Authorization: `Bearer ${tokens.access_token}` }
        });
        const infoText = await infoRes.text();
        let profile = null;
        try{ profile = JSON.parse(infoText); }catch(_){}
        if (!infoRes.ok || !profile || !profile.sub){
          console.error('google userinfo error', infoRes.status, infoText);
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('取得使用者資訊失敗', { status:500, headers: h });
        }
        const user = {
          id: profile.sub,
          email: profile.email || '',
          name: profile.name || profile.email || '使用者',
          picture: profile.picture || '',
          provider: 'google',
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000
        };
        await ensureUserRecord(env, user);
        const token = await signSession(user, env.SESSION_SECRET || '');
        const headers = new Headers({
          'Set-Cookie': `auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        });
        // 移除可能存在的 admin session，避免一般登入沿用先前的管理員憑證
        headers.append('Set-Cookie', `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
        // 若為管理員白名單且已設定 ADMIN_JWT_SECRET，直接簽發 admin_session，免二次登入
        try{
          const allowed = parseAdminEmails(env);
          const mail = (user.email || '').toLowerCase();
          const adminSecret = getAdminSecret(env);
          if (allowed.length && allowed.includes(mail) && adminSecret){
            const adminPayload = {
              sub: user.id || mail,
              email: mail,
              name: user.name || mail,
              role: 'admin',
              exp: Date.now() + 60 * 60 * 1000 // 1 小時
            };
            const adminToken = await signSession(adminPayload, adminSecret);
            headers.append('Set-Cookie', `admin_session=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`);
          }
        }catch(_){}
        headers.append('Set-Cookie', clearStateCookie);
        headers.append('Set-Cookie', clearRedirectCookie);
        headers.append('Location', `${origin}${redirectPath}`);
        return new Response(null, { status:302, headers });
      }catch(err){
        console.error('OAuth error', err);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('OAuth error', { status:500, headers: h });
      }
    }

    // === Admin OAuth (Google) ===
    if (pathname === '/api/auth/google/admin/start') {
      if (!env.GOOGLE_ADMIN_CLIENT_ID || !env.GOOGLE_ADMIN_CLIENT_SECRET) {
        return new Response('Admin Google OAuth not configured', { status:500 });
      }
      const redirectRaw = url.searchParams.get('redirect') || '';
      let redirectPath = '/admin';
      if (redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')) {
        redirectPath = redirectRaw;
      }
      const stateSecret = env.GOOGLE_ADMIN_CLIENT_SECRET || env.OAUTH_STATE_SECRET || env.ADMIN_JWT_SECRET || env.SESSION_SECRET || '';
      const statePayload = { t: Math.floor(Date.now() / 1000), n: makeToken(12), r: redirectPath };
      let state = await makeSignedState(statePayload, stateSecret);
      if (!state) state = makeToken(24);
      const params = new URLSearchParams({
        client_id: env.GOOGLE_ADMIN_CLIENT_ID,
        redirect_uri: `${origin}/api/auth/google/admin/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        state
      });
      const headers = new Headers({
        Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      });
      headers.append('Set-Cookie', `admin_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
      headers.append('Set-Cookie', `admin_oauth_redirect=${encodeURIComponent(redirectPath)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      return new Response(null, { status:302, headers });
    }

    if (pathname === '/api/auth/google/admin/callback') {
      const code = url.searchParams.get('code') || '';
      const state = url.searchParams.get('state') || '';
      const cookies = parseCookies(request);
      const expectedState = cookies.admin_oauth_state || '';
      const clearStateCookie = 'admin_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
      const clearRedirectCookie = 'admin_oauth_redirect=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax';
      const stateSecret = env.GOOGLE_ADMIN_CLIENT_SECRET || env.OAUTH_STATE_SECRET || env.ADMIN_JWT_SECRET || env.SESSION_SECRET || '';
      const signedPayload = await verifySignedState(state, stateSecret, 600);
      const stateValid = !!expectedState && state === expectedState;
      const redirectPath = (()=> {
        const raw = cookies.admin_oauth_redirect || '';
        if (raw) {
          try{
            const decoded = decodeURIComponent(raw);
            if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
          }catch(_){}
        }
        const signedRedirect = signedPayload && signedPayload.r;
        if (signedRedirect && typeof signedRedirect === 'string' && signedRedirect.startsWith('/') && !signedRedirect.startsWith('//')){
          return signedRedirect;
        }
        return '/admin';
      })();
      if (!code || !state || (!stateValid && !signedPayload)) {
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('Invalid OAuth state', { status:400, headers: h });
      }
      if (!env.GOOGLE_ADMIN_CLIENT_ID || !env.GOOGLE_ADMIN_CLIENT_SECRET) {
        return new Response('Admin Google OAuth not configured', {
          status:500,
          headers:{ 'Set-Cookie': clearStateCookie }
        });
      }
      try{
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_ADMIN_CLIENT_ID,
            client_secret: env.GOOGLE_ADMIN_CLIENT_SECRET,
            redirect_uri: `${origin}/api/auth/google/admin/callback`,
            grant_type: 'authorization_code'
          })
        });
        const tokenText = await tokenRes.text();
        let tokens = null;
        try{ tokens = JSON.parse(tokenText); }catch(_){}
        if (!tokenRes.ok || !tokens || !tokens.id_token){
          console.error('admin google token error', tokenRes.status, tokenText);
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('無法取得 Google token', { status:500, headers: h });
        }
        const parts = String(tokens.id_token||'').split('.');
        if (parts.length < 2){
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('無法解析 id_token', { status:500, headers: h });
        }
        let profile = null;
        try{
          const payloadBytes = base64UrlDecodeToBytes(parts[1]);
          profile = JSON.parse(new TextDecoder().decode(payloadBytes));
        }catch(_){}
        if (!profile || !profile.email){
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('無法取得使用者資訊', { status:500, headers: h });
        }
        const email = (profile.email || '').toLowerCase();
        const emailVerified = profile.email_verified === true || profile.email_verified === 'true';
        const aud = profile.aud || '';
        const iss = profile.iss || '';
        const allowedIss = ['https://accounts.google.com', 'accounts.google.com'];
        const allowedEmails = parseAdminEmails(env);
        if (!emailVerified || !allowedEmails.includes(email) || aud !== env.GOOGLE_ADMIN_CLIENT_ID || !allowedIss.includes(iss)){
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('非授權的管理員帳號', { status:403, headers: h });
        }
        const adminSecret = getAdminSecret(env);
        if (!adminSecret){
          const h = new Headers();
          h.append('Set-Cookie', clearStateCookie);
          h.append('Set-Cookie', clearRedirectCookie);
          return new Response('Admin session secret missing', { status:500, headers: h });
        }
        const adminPayload = {
          sub: profile.sub || email,
          email,
          name: profile.name || email,
          role: 'admin',
          exp: Date.now() + 60 * 60 * 1000
        };
        const adminToken = await signSession(adminPayload, adminSecret);
        const headers = new Headers({
          'Set-Cookie': `admin_session=${adminToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`,
        });
        headers.append('Set-Cookie', clearStateCookie);
        headers.append('Set-Cookie', clearRedirectCookie);
        const redirectUrl = `${origin}${redirectPath}`;
        return redirectWithBody(redirectUrl, headers);
      }catch(err){
        console.error('Admin OAuth error', err);
        const h = new Headers();
        h.append('Set-Cookie', clearStateCookie);
        h.append('Set-Cookie', clearRedirectCookie);
        return new Response('OAuth error', { status:500, headers: h });
      }
    }

    if (pathname === '/api/auth/me') {
      const user = await getSessionUser(request, env);
      if (!user){
        return json({ ok:false, error:'unauthenticated' }, 401);
      }
      return json({ ok:true, user });
    }

    return null;
  }

  return { handleAuth };
}

export { createAuthHandlers };
