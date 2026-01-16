export function createUploadHandler(deps){
  const { handleUpload } = deps;
  return async function handleUploadRoute(request, env){
    const url = new URL(request.url);
    if (url.pathname !== '/api/upload' || request.method !== 'POST') return null;
    return handleUpload(request, env, url.origin);
  };
}
