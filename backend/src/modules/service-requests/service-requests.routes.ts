import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  createServiceRequestHandler,
  getServiceRequestsHandler,
} from './service-requests.controller.js';

const serviceRequestsRoutes = Router();

// Xác thực token đăng nhập
serviceRequestsRoutes.use(authenticate);

serviceRequestsRoutes.get('/', getServiceRequestsHandler);
serviceRequestsRoutes.post('/', createServiceRequestHandler);

export default serviceRequestsRoutes;

