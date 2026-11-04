import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  approveQuotationHandler,
  createQuotationHandler,
  getQuotationDetailHandler,
  listQuotationsHandler,
  rejectQuotationHandler,
  sendQuotationHandler,
} from './quotations.controller.js';

const quotationsRoutes = express.Router();

quotationsRoutes.use(authenticate);

quotationsRoutes.get('/', listQuotationsHandler);
quotationsRoutes.post('/', createQuotationHandler);
quotationsRoutes.get('/:quotationId', getQuotationDetailHandler);
quotationsRoutes.patch('/:quotationId/send', sendQuotationHandler);
quotationsRoutes.patch('/:quotationId/approve', approveQuotationHandler);
quotationsRoutes.patch('/:quotationId/reject', rejectQuotationHandler);

export default quotationsRoutes;

