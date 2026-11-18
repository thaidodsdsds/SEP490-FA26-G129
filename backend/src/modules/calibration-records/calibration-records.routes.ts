import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as controller from './calibration-records.controller.js';

const router = Router();

// Review queue list - accessible by staff with review capabilities
router.get(
  '/review-queue',
  authenticate,
  authorize('reviewer', 'headtechnician', 'labmanager', 'headoftech', 'admin', 'technician'),
  controller.getReviewQueueHandler,
);

// Detail of a calibration record
router.get(
  '/:id',
  authenticate,
  authorize('reviewer', 'headtechnician', 'labmanager', 'headoftech', 'admin', 'technician'),
  controller.getCalibrationRecordDetailHandler,
);

// Perform review: Approve or Reject (requires reviewer, headtechnician, labmanager, headoftech, admin)
router.post(
  '/:id/review',
  authenticate,
  authorize('reviewer', 'headtechnician', 'labmanager', 'headoftech', 'admin'),
  controller.reviewCalibrationRecordHandler,
);

export default router;
