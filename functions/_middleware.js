export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if ((pathname === '/' || pathname === '') && (request.method === 'GET' || request.method === 'HEAD')) {
    return Response.redirect(url.origin + '/zh/', 301);
  }
  return next();
}
