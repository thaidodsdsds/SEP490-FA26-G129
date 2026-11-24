import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as controller from './certificates.controller.js';

const certificatesRoutes = Router();

certificatesRoutes.use(authenticate);

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

const ISSUE_ROLES = [
  'Reviewer',
  'HeadTechnician',
  'LabManager',
  'HeadOfTech',
];

// HeadTech chỉ tạo chứng nhận ở trạng thái Draft; ký phát hành thuộc Admin/CEO.
const SIGN_ROLES = ['Reviewer', 'LabManager', 'HeadOfTech', 'Admin', 'CEO'];

certificatesRoutes.get(
  '/eligible-records',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.listEligibleCalibrationRecordsHandler,
);

certificatesRoutes.get(
  '/',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.listCertificatesHandler,
);

certificatesRoutes.post(
  '/',
  authorize(...ISSUE_ROLES),
  controller.issueCertificateHandler,
);

certificatesRoutes.get(
  '/:id',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.getCertificateDetailHandler,
);

certificatesRoutes.get(
  '/:id/file',
  authorize(...VIEW_ROLES, 'Customer'),
  controller.getCertificateFileHandler,
);

certificatesRoutes.post(
  '/:id/sign',
  authorize(...SIGN_ROLES),
  controller.signCertificateHandler,
);

export default certificatesRoutes;
