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
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  postProcedure,
);
proceduresRoutes.put(
  '/:id',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  putProcedure,
);
proceduresRoutes.post(
  '/:id/publish',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  postPublishProcedure,
);
proceduresRoutes.post(
  '/:id/clone',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  postCloneProcedure,
);

// Steps
proceduresRoutes.post(
  '/:id/steps',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  postStep,
);
proceduresRoutes.put(
  '/steps/:stepId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  putStep,
);
proceduresRoutes.delete(
  '/steps/:stepId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  removeStep,
);

// Parameters
proceduresRoutes.post(
  '/:id/parameters',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  postParameter,
);
proceduresRoutes.put(
  '/parameters/:paramId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  putParameter,
);
proceduresRoutes.delete(
  '/parameters/:paramId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  removeParameter,
);

// Test Points
proceduresRoutes.post(
  '/parameters/:paramId/test-points',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  postTestPoint,
);
proceduresRoutes.put(
  '/test-points/:pointId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  putTestPoint,
);
proceduresRoutes.delete(
  '/test-points/:pointId',
  authorize('Reviewer', 'Admin', 'admin', 'reviewer', 'Head of Tech', 'headoftech', 'HeadTechnician', 'headtechnician'),
  removeTestPoint,
);

export default proceduresRoutes;
