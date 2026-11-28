import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { getDashboardOverviewHandler } from './dashboard.controller.js';

const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);
dashboardRoutes.get('/overview', getDashboardOverviewHandler);

export default dashboardRoutes;
