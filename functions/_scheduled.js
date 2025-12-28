import { releaseExpiredOrderHolds } from './[[path]].handler.js';

export async function onScheduled(event, env, ctx) {
  const limit = Number(env.ORDER_RELEASE_LIMIT || 300) || 300;
  const includeWaitingVerify = String(env.ORDER_RELEASE_INCLUDE_WAITING_VERIFY || '') === '1';
  ctx.waitUntil(releaseExpiredOrderHolds(env, { limit, includeWaitingVerify }));
}
