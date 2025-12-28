export async function onScheduled(event, env, ctx) {
  const limit = Number(env.ORDER_RELEASE_LIMIT || 300) || 300;
  const includeWaitingVerify = String(env.ORDER_RELEASE_INCLUDE_WAITING_VERIFY || '') === '1';
  const secret = String(env.CRON_SECRET || env.CRON_KEY || env.ADMIN_CRON_KEY || '').trim();
  const base = String(env.CRON_BASE_URL || env.PUBLIC_SITE_URL || env.SITE_URL || env.PUBLIC_ORIGIN || '').trim();
  if (!secret || !base) return;
  const origin = base.startsWith('http') ? base : `https://${base}`;
  const url = new URL('/api/cron/release-holds', origin);
  const body = JSON.stringify({ limit, includeWaitingVerify });
  ctx.waitUntil(fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Key': secret
    },
    body
  }));
}
