import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  createDeviceHandler,
  getDeviceDetail,
  getDeviceOwnershipHistoryHandler,
  getDevices,
  transferDeviceOwnershipHandler,
  updateDeviceHandler,
} from './devices.controller.js';

const devicesRoutes = Router();

// Toàn bộ endpoint quản lý thiết bị đều yêu cầu xác thực JWT token
devicesRoutes.use(authenticate);

devicesRoutes.get('/', getDevices);
devicesRoutes.get('/:id', getDeviceDetail);
devicesRoutes.get('/:id/ownership-history', getDeviceOwnershipHistoryHandler);
devicesRoutes.post('/', createDeviceHandler);
devicesRoutes.post('/:id/transfer-ownership', transferDeviceOwnershipHandler);
devicesRoutes.put('/:id', updateDeviceHandler);

export default devicesRoutes;

