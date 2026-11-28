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
  'Reviewer',
  'reviewer',
  'HeadTechnician',
  'headtechnician',
  'Head of Tech',
  'headoftech',
];

// Cho phép Warehouse staff, Admin hoặc Reviewer thao tác kho
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
