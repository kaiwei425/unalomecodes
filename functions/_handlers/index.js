import { createAdminAuthHandler } from './admin-auth.js';
import { createAdminAuditHandler } from './admin-audit.js';
import { createOrdersExportHandler } from './orders-export.js';
import { createServiceOrdersExportHandler } from './service-orders-export.js';
import { createOrdersListHandler } from './orders-list.js';
import { createOrderStatusHandler } from './order-status.js';
import { createServiceOrdersListHandler } from './service-orders-list.js';
import { createServiceOrderStatusHandler } from './service-order-status.js';
import { createUploadHandler } from './upload.js';
import { createServiceResultPhotoHandler } from './service-result-photo.js';
import { createServiceOrdersLookupHandler } from './service-orders-lookup.js';
import { createAdminStatsHandler } from './admin-stats.js';
import { createInvoicesHandler } from './invoices.js';

export function createSplitHandler(deps){
  const adminAuth = createAdminAuthHandler(deps);
  const adminAudit = createAdminAuditHandler(deps);
  const ordersExport = createOrdersExportHandler(deps);
  const serviceOrdersExport = createServiceOrdersExportHandler(deps);
  const ordersList = createOrdersListHandler(deps);
  const orderStatus = createOrderStatusHandler(deps);
  const serviceOrdersList = createServiceOrdersListHandler(deps);
  const serviceOrderStatus = createServiceOrderStatusHandler(deps);
  const uploadHandler = createUploadHandler(deps);
  const serviceResultPhoto = createServiceResultPhotoHandler(deps);
  const serviceOrdersLookup = createServiceOrdersLookupHandler(deps);
  const adminStats = createAdminStatsHandler(deps);
  const invoices = createInvoicesHandler(deps);

  return {
    async handle(request, env, context){
      const res = await adminAuth(request, env, context);
      if (res) return res;
      const resAudit = await adminAudit(request, env, context);
      if (resAudit) return resAudit;
      const resOrdersExport = await ordersExport(request, env, context);
      if (resOrdersExport) return resOrdersExport;
      const resServiceOrdersExport = await serviceOrdersExport(request, env, context);
      if (resServiceOrdersExport) return resServiceOrdersExport;
      const resOrdersList = await ordersList(request, env, context);
      if (resOrdersList) return resOrdersList;
      const resOrderStatus = await orderStatus(request, env, context);
      if (resOrderStatus) return resOrderStatus;
      const resServiceOrdersList = await serviceOrdersList(request, env, context);
      if (resServiceOrdersList) return resServiceOrdersList;
      const resServiceOrderStatus = await serviceOrderStatus(request, env, context);
      if (resServiceOrderStatus) return resServiceOrderStatus;
      const resUpload = await uploadHandler(request, env, context);
      if (resUpload) return resUpload;
      const resServiceResultPhoto = await serviceResultPhoto(request, env, context);
      if (resServiceResultPhoto) return resServiceResultPhoto;
      const resServiceLookup = await serviceOrdersLookup(request, env, context);
      if (resServiceLookup) return resServiceLookup;
      const resAdminStats = await adminStats(request, env, context);
      if (resAdminStats) return resAdminStats;
      const resInvoices = await invoices(request, env, context);
      if (resInvoices) return resInvoices;
      return null;
    }
  };
}
