import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  getServiceTypes,
  getSingleServiceType,
  postServiceType,
  putServiceType,
  validateServiceType,
} from './service-types.controller.js';

const serviceTypesRoutes = Router();

// Xác thực token đăng nhập
serviceTypesRoutes.use(authenticate);

serviceTypesRoutes.get('/', getServiceTypes);
serviceTypesRoutes.get('/:id', getSingleServiceType);
serviceTypesRoutes.post('/', authorize('Admin', 'admin'), postServiceType);
serviceTypesRoutes.put('/:id', authorize('Admin', 'admin'), putServiceType);
serviceTypesRoutes.get('/:serviceTypeId/validate', validateServiceType);

export default serviceTypesRoutes;
