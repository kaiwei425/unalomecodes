function createUploadHandlers(deps){
  const {
    withCORS,
    json,
    isAllowedOrigin,
    getSessionUser,
    getAdminSession,
    getAdminRole,
    getClientIp,
    checkRateLimit,
    guessExt,
    safeExt
  } = deps;

  async function handleUpload(request, env, origin) {
    try {
      if (!env.R2_BUCKET) return withCORS(json({ ok:false, error:"R2 bucket not bound" }, 500));
      if (!isAllowedOrigin(request, env, env.UPLOAD_ORIGINS || '')) {
        return withCORS(json({ ok:false, error:"Forbidden origin" }, 403));
      }
      const uploader = await getSessionUser(request, env);
      const adminSession = await getAdminSession(request, env);
      const isAuthed = !!uploader || !!adminSession;
      const authTier = uploader ? 'user' : (adminSession ? 'admin' : 'anon');
      const adminEmail = (adminSession && adminSession.email) ? String(adminSession.email) : '';
      const adminRole = adminEmail ? await getAdminRole(adminEmail, env) : '';
      const isFulfillmentAdmin = !!adminEmail && adminRole === 'fulfillment';
      if (!isAuthed) {
        return withCORS(json({ ok:false, error:"Login required" }, 401));
      }
      const ip = getClientIp(request) || 'unknown';
      const windowSec = Math.max(30, Number(env.UPLOAD_RATE_WINDOW_SEC || 300) || 300);
      const anonLimit = Math.max(1, Number(env.UPLOAD_ANON_LIMIT || 10) || 10);
      const authLimit = Math.max(1, Number(env.UPLOAD_AUTH_LIMIT || 60) || 60);
      const limit = isAuthed ? authLimit : anonLimit;
      const ok = await checkRateLimit(env, `rl:upload:${authTier}:${ip}`, limit, windowSec);
      if (!ok){
        return withCORS(json({ ok:false, error:"Too many requests" }, 429));
      }
      const form = await request.formData();
      let files = form.getAll("files[]");
      if (!files.length) files = form.getAll("file");
      if (!files.length) return json({ ok:false, error:"No files provided" }, 400);
      const maxFiles = Math.max(1, Number(env.UPLOAD_MAX_FILES || (isAuthed ? 10 : 3)) || (isAuthed ? 10 : 3));
      if (files.length > maxFiles){
        return json({ ok:false, error:`Too many files (max ${maxFiles})` }, 400);
      }

      const allowedMimes = new Set([
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
        "image/heic",
        "image/heif",
        "application/pdf"
      ]);
      const allowedExts = new Set([
        "jpg","jpeg","png","webp","gif","avif","heic","heif","pdf"
      ]);
      const extMimeMap = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        avif: "image/avif",
        heic: "image/heic",
        heif: "image/heif",
        pdf: "application/pdf"
      };
      const out = [];
      const day = new Date();
      const y = day.getFullYear();
      const m = String(day.getMonth() + 1).padStart(2, "0");
      const d = String(day.getDate()).padStart(2, "0");

      if (!isAuthed){
        allowedMimes.delete("application/pdf");
        allowedExts.delete("pdf");
      }
      if (isFulfillmentAdmin){
        // Fulfillment: allow only image uploads, strict types.
        allowedMimes.clear();
        allowedExts.clear();
        ["image/jpeg","image/jpg","image/png","image/webp"].forEach(x=>allowedMimes.add(x));
        ["jpg","jpeg","png","webp"].forEach(x=>allowedExts.add(x));
        delete extMimeMap.pdf;
      }
      const anonMaxMb = Math.max(1, Number(env.UPLOAD_ANON_MAX_MB || env.UPLOAD_MAX_MB || 10) || 10);
      const authMaxMb = Math.max(1, Number(env.UPLOAD_AUTH_MAX_MB || env.UPLOAD_MAX_MB || 20) || 20);
      const maxBytes = (isAuthed ? authMaxMb : anonMaxMb) * 1024 * 1024;
      const fulfillmentMaxMb = Math.max(1, Number(env.UPLOAD_FULFILLMENT_MAX_MB || 10) || 10);
      const effectiveMaxBytes = isFulfillmentAdmin ? (fulfillmentMaxMb * 1024 * 1024) : maxBytes;
      for (const f of files) {
        if (typeof f.stream !== "function") continue;
        if (f.size && f.size > effectiveMaxBytes) {
          const limitMb = Math.round(effectiveMaxBytes / (1024 * 1024));
          return json({ ok:false, error:`File too large (>${limitMb}MB)` }, 413);
        }
        const mime = String(f.type || "").toLowerCase();
        const extGuess = (guessExt(mime) || safeExt(f.name) || "").toLowerCase();
        const isGenericMime = !mime || mime === "application/octet-stream";
        const mimeAllowed = mime && allowedMimes.has(mime);
        const extAllowed = extGuess && allowedExts.has(extGuess);
        if (!isGenericMime && !mimeAllowed) {
          return json({ ok:false, error:"Unsupported file type" }, 415);
        }
        if (!extAllowed && !mimeAllowed) {
          return json({ ok:false, error:"Unsupported file type" }, 415);
        }
        const ext = extGuess || "bin";
        const key = `uploads/${y}${m}${d}/${crypto.randomUUID()}.${ext}`;

        const contentType = mimeAllowed ? mime : (extMimeMap[ext] || mime || "application/octet-stream");
        await env.R2_BUCKET.put(key, f.stream(), {
          httpMetadata: {
            contentType,
            contentDisposition: "inline"
          }
        });

        const publicHost = env.FILE_HOST || env.PUBLIC_FILE_HOST || env.SITE_URL || 'https://unalomecodes.com';
        const base = publicHost.startsWith('http') ? publicHost.replace(/\/+$/,'') : `https://${publicHost.replace(/\/+$/,'')}`;
        const url = `${base}/api/file/${encodeURIComponent(key)}`;
        out.push({ url, key });
      }

      return withCORS(json({ ok:true, files: out }));
    } catch (err) {
      return withCORS(json({ ok:false, error:String(err) }, 500));
    }
  }

  async function handleUploadRoute(request, env, url, origin, pathname){
    if (pathname !== '/api/upload' || request.method !== 'POST') return null;
    return handleUpload(request, env, origin);
  }

  return { handleUploadRoute, handleUpload };
}

function createUploadHandler(deps){
  const handlers = createUploadHandlers(deps);
  return async function handleUploadRoute(request, env){
    const url = new URL(request.url);
    return handlers.handleUploadRoute(request, env, url, url.origin, url.pathname);
  };
}

export { createUploadHandlers, createUploadHandler };
