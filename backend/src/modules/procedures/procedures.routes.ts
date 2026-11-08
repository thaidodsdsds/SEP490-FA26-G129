import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  getProceduresList,
  getSingleProcedure,
  postCloneProcedure,
  postParameter,
  postProcedure,
  postPublishProcedure,
  postStep,
  postTestPoint,
  putParameter,
  putProcedure,
  putStep,
  putTestPoint,
  removeParameter,
  removeStep,
  removeTestPoint,
} from './procedures.controller.js';

const proceduresRoutes = Router();

// Xác thực token đăng nhập
proceduresRoutes.use(authenticate);

proceduresRoutes.get('/', getProceduresList);
proceduresRoutes.get('/:id', getSingleProcedure);

// Reviewer/Admin mới có quyền soạn quy trình
proceduresRoutes.post(
  '/',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postProcedure,
);
proceduresRoutes.put(
  '/:id',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  putProcedure,
);
proceduresRoutes.post(
  '/:id/publish',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postPublishProcedure,
);
proceduresRoutes.post(
  '/:id/clone',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postCloneProcedure,
);

// Steps
proceduresRoutes.post(
  '/:id/steps',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postStep,
);
proceduresRoutes.put(
  '/steps/:stepId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  putStep,
);
proceduresRoutes.delete(
  '/steps/:stepId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  removeStep,
);

// Parameters
proceduresRoutes.post(
  '/:id/parameters',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postParameter,
);
proceduresRoutes.put(
  '/parameters/:paramId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  putParameter,
);
proceduresRoutes.delete(
  '/parameters/:paramId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  removeParameter,
);

// Test Points
proceduresRoutes.post(
  '/parameters/:paramId/test-points',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  postTestPoint,
);
proceduresRoutes.put(
  '/test-points/:pointId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  putTestPoint,
);
proceduresRoutes.delete(
  '/test-points/:pointId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech'),
  removeTestPoint,
);

export default proceduresRoutes;
