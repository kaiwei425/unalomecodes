export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if ((pathname === '/' || pathname === '') && (request.method === 'GET' || request.method === 'HEAD')) {
    const accept = String(request.headers.get('accept-language') || '').toLowerCase();
    const preferEn = accept.includes('en');
    const target = preferEn ? '/en/' : '/zh/';
    return Response.redirect(url.origin + target, 302);
  }
  return next();
}
