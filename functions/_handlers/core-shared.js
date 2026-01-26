import { createProofUtils } from './proof-utils.js';
import { createCouponUtils } from './coupon-utils.js';
import { createOrderStatusUtils } from './order-status-utils.js';
import { createOrderUtils } from './order-utils.js';

function createCoreSharedUtils(deps){
  const coupons = createCouponUtils(deps);
  const proof = createProofUtils(Object.assign({}, deps, {
    issueWelcomeCoupon: coupons.issueWelcomeCoupon
  }));
  const orderStatus = createOrderStatusUtils(Object.assign({}, deps, {
    markCouponUsageOnce: coupons.markCouponUsageOnce,
    releaseCouponUsage: coupons.releaseCouponUsage
  }));
  const order = createOrderUtils(Object.assign({}, deps, { isAllowedFileUrl: proof.isAllowedFileUrl }));

  return {
    ...proof,
    ...coupons,
    ...orderStatus,
    ...order
  };
}

export { createCoreSharedUtils };
