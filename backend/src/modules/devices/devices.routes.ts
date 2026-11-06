import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  createDeviceHandler,
  getDeviceDetail,
  getDevices,
  updateDeviceHandler,
} from './devices.controller.js';

const devicesRoutes = Router();

// Toàn bộ endpoint quản lý thiết bị đều yêu cầu xác thực JWT token
devicesRoutes.use(authenticate);

devicesRoutes.get('/', getDevices);
devicesRoutes.get('/:id', getDeviceDetail);
devicesRoutes.post('/', createDeviceHandler);
devicesRoutes.put('/:id', updateDeviceHandler);

export default devicesRoutes;

