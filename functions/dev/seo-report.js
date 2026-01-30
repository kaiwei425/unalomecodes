export async function onRequest({ request, env }) {
  const token = String(env && env.DEV_REPORT_TOKEN ? env.DEV_REPORT_TOKEN : '').trim();
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token') || '';
  if (!token || queryToken !== token) {
    return new Response('Unauthorized', { status: 401 });
  }
  const assetUrl = new URL('/dev/seo-report/index.html', url.origin);
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return env.ASSETS.fetch(assetUrl.toString());
  }
  return fetch(assetUrl.toString());
}
