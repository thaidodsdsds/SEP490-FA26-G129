import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  getDevices,
  getInventorySummary,
  getTransactions,
  postInbound,
  postOutbound,
} from './warehouse.controller.js';

const warehouseRoutes = Router();

warehouseRoutes.use(authenticate);

warehouseRoutes.get('/transactions', getTransactions);
warehouseRoutes.get('/inventory', getInventorySummary);
warehouseRoutes.get('/devices', getDevices);

// Chỉ Warehouse staff, Admin hoặc Reviewer mới thao tác kho
warehouseRoutes.post(
  '/inbound',
  authorize('Warehouse', 'WarehouseStaff', 'warehouse', 'Admin', 'admin'),
  postInbound,
);

warehouseRoutes.post(
  '/outbound',
  authorize('Warehouse', 'WarehouseStaff', 'warehouse', 'Admin', 'admin'),
  postOutbound,
);

export default warehouseRoutes;
