import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as controller from './seals.controller.js';

const sealsRoutes = Router();

sealsRoutes.use(authenticate);

const VIEW_ROLES = [
  'Reviewer',
  'HeadTechnician',
  'LabManager',
  'HeadOfTech',
  'Admin',
  'CEO',
  'Sales',
  'Technician',
];

const MANAGE_ROLES = [
  'Reviewer',
  'HeadTechnician',
  'LabManager',
  'HeadOfTech',
  'Admin',
  'CEO',
];

const REVOCATION_DECISION_ROLES = ['CEO', 'Admin'];

sealsRoutes.get(
  '/eligible-certificates',
  authorize(...MANAGE_ROLES),
  controller.listEligibleCertificatesHandler,
);

sealsRoutes.get(
  '/',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.listSealsHandler,
);

sealsRoutes.post('/', authorize(...MANAGE_ROLES), controller.createSealHandler);

sealsRoutes.post(
  '/:id/revocations',
  authorize(...MANAGE_ROLES),
  controller.requestSealRevocationHandler,
);

sealsRoutes.post(
  '/:id/revocations/:revocationId/decision',
  authorize(...REVOCATION_DECISION_ROLES),
  controller.decideSealRevocationHandler,
);

sealsRoutes.get(
  '/:id',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.getSealDetailHandler,
);

sealsRoutes.get(
  '/:id/qr',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.getSealQrHandler,
);

sealsRoutes.get(
  '/:id/file',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.getSealPdfHandler,
);

export default sealsRoutes;
