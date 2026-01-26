function requireDeps(deps, names, label){
  const missing = names.filter(name => deps[name] === undefined);
  if (missing.length){
    throw new Error(`[deps] ${label} missing: ${missing.join(', ')}`);
  }
}

function createMiscApiHandlers(deps){
  requireDeps(deps, ['listStories', 'createStory', 'deleteStories', 'requireAdminWrite', 'forbidIfFulfillmentAdmin', 'getMapsKey', 'geocodePlace', 'proxyTat', 'resizeImage'], 'misc-apis.js');
  const {
    listStories,
    createStory,
    deleteStories,
    requireAdminWrite,
    forbidIfFulfillmentAdmin,
    getMapsKey,
    geocodePlace,
    proxyTat,
    resizeImage
  } = deps;

  async function handleMiscApis(request, env, url, pathname, origin){
  // Stories (reviews) endpoints
  if (pathname === "/api/stories" && request.method === "GET") {
    return listStories(request, url, env);
  }
  if (pathname === "/api/stories" && request.method === "POST") {
    // Support method override: POST + _method=DELETE
    const _m = (url.searchParams.get("_method") || "").toUpperCase();
    if (_m === "DELETE") {
      {
        const guard = await requireAdminWrite(request, env);
        if (guard) return guard;
      }
      {
        const guard = await forbidIfFulfillmentAdmin(request, env);
        if (guard) return guard;
      }
      return deleteStories(request, url, env);
    }
    return createStory(request, env);
  }
  if (pathname === "/api/stories" && request.method === "DELETE") {
    {
      const guard = await requireAdminWrite(request, env);
      if (guard) return guard;
    }
    {
      const guard = await forbidIfFulfillmentAdmin(request, env);
      if (guard) return guard;
    }
    return deleteStories(request, url, env);
  }
      if (pathname === "/api/maps-key" && request.method === "GET") {
        return getMapsKey(request, env);
      }
      if (pathname === "/api/geo" && request.method === "GET") {
        return geocodePlace(request, url, env);
      }
      if (pathname.startsWith("/api/tat") && request.method === "GET") {
        return proxyTat(request, url, env);
      }
      // Image resize proxy
      if (pathname === "/api/img" && request.method === "GET") {
        return resizeImage(url, env, origin);
      }

    return null;
  }

  return { handleMiscApis };
}

export { createMiscApiHandlers };
