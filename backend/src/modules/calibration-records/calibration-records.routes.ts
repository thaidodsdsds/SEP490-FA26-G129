import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as controller from './calibration-records.controller.js';

const router = Router();

// Review queue list - accessible by staff with review capabilities
router.get(
  '/review-queue',
  authenticate,
  authorize('Reviewer', 'HeadTechnician', 'LabManager', 'HeadOfTech', 'Technician'),
  controller.getReviewQueueHandler,
);

// Detail of a calibration record
router.get(
  '/:id',
  authenticate,
  authorize('Reviewer', 'HeadTechnician', 'LabManager', 'HeadOfTech', 'Technician'),
  controller.getCalibrationRecordDetailHandler,
);

// Perform review: Approve or Reject (requires reviewer, headtechnician, labmanager, headoftech, admin)
router.post(
  '/:id/review',
  authenticate,
  authorize('Reviewer', 'HeadTechnician', 'LabManager', 'HeadOfTech'),
  controller.reviewCalibrationRecordHandler,
);

export default router;
