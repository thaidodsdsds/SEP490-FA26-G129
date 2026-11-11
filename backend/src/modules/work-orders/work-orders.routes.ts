import express from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  getWorkOrderDetailHandler,
  getWorkOrderLookupsHandler,
  listWorkOrdersHandler,
  updateWorkOrderAssignmentHandler,
} from './work-orders.controller.js';

const workOrdersRoutes = express.Router();

workOrdersRoutes.use(authenticate);

workOrdersRoutes.get(
  '/',
  authorize('Admin', 'CEO', 'Sales', 'Technician', 'HeadTechnician'),
  listWorkOrdersHandler,
);

workOrdersRoutes.get(
  '/lookups',
  authorize('Admin', 'CEO', 'Sales', 'Technician', 'HeadTechnician'),
  getWorkOrderLookupsHandler,
);

workOrdersRoutes.get(
  '/:workOrderId',
  authorize('Admin', 'CEO', 'Sales', 'Technician', 'HeadTechnician'),
  getWorkOrderDetailHandler,
);

workOrdersRoutes.patch(
  '/:workOrderId/assignments/:assignmentId',
  authorize('Admin', 'HeadTechnician'),
  updateWorkOrderAssignmentHandler,
);

export default workOrdersRoutes;
