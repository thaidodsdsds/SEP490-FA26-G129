import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  getServiceTypes,
  validateServiceType,
} from './service-types.controller.js';

const serviceTypesRoutes = Router();

// Xác thực token đăng nhập
serviceTypesRoutes.use(authenticate);

serviceTypesRoutes.get('/', getServiceTypes);
serviceTypesRoutes.get('/:serviceTypeId/validate', validateServiceType);

export default serviceTypesRoutes;

