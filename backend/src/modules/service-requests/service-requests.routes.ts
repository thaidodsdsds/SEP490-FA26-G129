import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  cancelServiceRequestHandler,
  createServiceRequestHandler,
  getServiceRequestDetailHandler,
  getServiceRequestsHandler,
  updateServiceRequestHandler,
} from './service-requests.controller.js';

const serviceRequestsRoutes = Router();

// Xác thực token đăng nhập
serviceRequestsRoutes.use(authenticate);

serviceRequestsRoutes.get('/', getServiceRequestsHandler);
serviceRequestsRoutes.post('/', createServiceRequestHandler);
serviceRequestsRoutes.get('/:id', getServiceRequestDetailHandler);
serviceRequestsRoutes.put('/:id', updateServiceRequestHandler);
serviceRequestsRoutes.patch('/:id/cancel', cancelServiceRequestHandler);

export default serviceRequestsRoutes;

