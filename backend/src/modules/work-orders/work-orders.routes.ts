import express from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  deleteWorkOrderAssignmentHandler,
  getAssignmentResourcesHandler,
  getInitialInspectionHandler,
  getPendingInspectionConsentsHandler,
  getProcedureExecutionHandler,
  getTechnicianTasksHandler,
  getWorkOrderAssignmentsListHandler,
  getWorkOrderDetailHandler,
  listDigitalSignaturesHandler,
  listWorkOrdersHandler,
  saveCalibrationRecordHandler,
  saveInitialInspectionHandler,
  saveWorkOrderAssignmentHandler,
  submitInspectionConsentHandler,
  syncTechnicianTasksHandler,
  updateWorkOrderStatusHandler,
  verifyCalibrationSignatureHandler,
} from './work-orders.controller.js';

const workOrdersRoutes = express.Router();

workOrdersRoutes.use(authenticate);

// ==================== DEVICE ASSIGNMENT ENDPOINTS ====================
// Must be mounted before /:id routes to avoid routing collisions

workOrdersRoutes.get(
  '/assignments/resources',
  authorize(
    'Reviewer',
    'HeadTechnician',
    'LabManager',
    'Admin',
    'CEO',
    'Technician',
  ),
  getAssignmentResourcesHandler,
);

workOrdersRoutes.get(
  '/assignments',
  authorize(
    'Reviewer',
    'HeadTechnician',
    'LabManager',
    'Admin',
    'CEO',
    'Technician',
    'Sales',
  ),
  getWorkOrderAssignmentsListHandler,
);

workOrdersRoutes.post(
  '/assignments',
  authorize('Reviewer', 'HeadTechnician', 'LabManager', 'Admin', 'CEO'),
  saveWorkOrderAssignmentHandler,
);

workOrdersRoutes.delete(
  '/assignments/:id',
  authorize('Reviewer', 'HeadTechnician', 'LabManager', 'Admin', 'CEO'),
  deleteWorkOrderAssignmentHandler,
);

// ==================== TECHNICIAN MOBILE / OFFLINE ENDPOINTS ====================

workOrdersRoutes.get(
  '/technician/tasks',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'Admin', 'CEO'),
  getTechnicianTasksHandler,
);

workOrdersRoutes.post(
  '/technician/sync',
  authorize('Technician', 'HeadTechnician', 'Admin', 'CEO'),
  syncTechnicianTasksHandler,
);

workOrdersRoutes.post(
  '/initial-inspections/consent',
  authorize('Customer', 'Technician', 'HeadTechnician', 'Reviewer', 'Admin', 'CEO'),
  submitInspectionConsentHandler,
);

workOrdersRoutes.get(
  '/initial-inspections/pending-consents',
  authorize('Customer', 'Technician', 'HeadTechnician', 'Reviewer', 'Admin', 'CEO'),
  getPendingInspectionConsentsHandler,
);

workOrdersRoutes.post(
  '/initial-inspections',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'Admin', 'CEO'),
  saveInitialInspectionHandler,
);

workOrdersRoutes.get(
  '/initial-inspections/:serviceRequestItemId',
  authorize('Customer', 'Technician', 'HeadTechnician', 'Reviewer', 'Admin', 'CEO'),
  getInitialInspectionHandler,
);

// ==================== TECHNICAL PROCEDURE EXECUTION ENDPOINTS ====================

workOrdersRoutes.get(
  '/procedures/:serviceRequestItemId',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'Sales', 'Customer', 'Admin', 'CEO'),
  getProcedureExecutionHandler,
);

workOrdersRoutes.get(
  '/calibration-records/:serviceRequestItemId/verify-signature',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'Sales', 'Customer', 'Admin', 'CEO'),
  verifyCalibrationSignatureHandler,
);

workOrdersRoutes.get(
  '/calibration-records/:serviceRequestItemId',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'Sales', 'Customer', 'Admin', 'CEO'),
  getProcedureExecutionHandler,
);

workOrdersRoutes.post(
  '/calibration-records',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'Admin', 'CEO'),
  saveCalibrationRecordHandler,
);

workOrdersRoutes.get(
  '/digital-signatures',
  authorize('Technician', 'HeadTechnician', 'Reviewer', 'LabManager', 'Admin', 'CEO'),
  listDigitalSignaturesHandler,
);

// ==================== WORK ORDER CORE ENDPOINTS ====================

workOrdersRoutes.get(
  '/',
  authorize(
    'Sales',
    'Reviewer',
    'HeadTechnician',
    'Admin',
    'CEO',
    'Technician',
    'Accountant',
  ),
  listWorkOrdersHandler,
);

workOrdersRoutes.get(
  '/:id',
  authorize(
    'Sales',
    'Reviewer',
    'HeadTechnician',
    'Admin',
    'CEO',
    'Technician',
    'Accountant',
  ),
  getWorkOrderDetailHandler,
);

workOrdersRoutes.patch(
  '/:id/status',
  authorize('Reviewer', 'HeadTechnician', 'Admin', 'CEO', 'Technician', 'Sales'),
  updateWorkOrderStatusHandler,
);

export default workOrdersRoutes;

