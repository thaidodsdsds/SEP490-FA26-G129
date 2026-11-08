import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  getMasterStandardsList,
  getSingleMasterStandard,
  postMasterStandard,
  putMasterStandard,
} from './master-standards.controller.js';

const masterStandardsRoutes = Router();

masterStandardsRoutes.use(authenticate);

masterStandardsRoutes.get('/', getMasterStandardsList);
masterStandardsRoutes.get('/:id', getSingleMasterStandard);

masterStandardsRoutes.post(
  '/',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postMasterStandard,
);

masterStandardsRoutes.put(
  '/:id',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  putMasterStandard,
);

export default masterStandardsRoutes;
