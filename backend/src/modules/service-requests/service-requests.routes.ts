import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { createServiceRequestHandler } from './service-requests.controller.js';

const serviceRequestsRoutes = Router();

// Xác thực token đăng nhập
serviceRequestsRoutes.use(authenticate);

serviceRequestsRoutes.post('/', createServiceRequestHandler);

export default serviceRequestsRoutes;

