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

const ALLOWED_WAREHOUSE_ROLES = [
  'HeadOfWarehouse',
  'headofwarehouse',
  'Head of Warehouse',
  'head of warehouse',
  'HeadWarehouse',
  'headwarehouse',
  'Warehouse',
  'WarehouseStaff',
  'warehousestaff',
  'warehouse',
  'Admin',
  'admin',
];

// Chỉ cho phép Warehouse staff, Head of Warehouse hoặc Admin thao tác kho
warehouseRoutes.get(
  '/transactions',
  authorize(...ALLOWED_WAREHOUSE_ROLES),
  getTransactions,
);
warehouseRoutes.get(
  '/inventory',
  authorize(...ALLOWED_WAREHOUSE_ROLES),
  getInventorySummary,
);
warehouseRoutes.get(
  '/devices',
  authorize(...ALLOWED_WAREHOUSE_ROLES),
  getDevices,
);

warehouseRoutes.post(
  '/inbound',
  authorize(...ALLOWED_WAREHOUSE_ROLES),
  postInbound,
);

warehouseRoutes.post(
  '/outbound',
  authorize(...ALLOWED_WAREHOUSE_ROLES),
  postOutbound,
);

export default warehouseRoutes;
