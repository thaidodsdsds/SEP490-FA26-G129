import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  createQuotationHandler,
  sendQuotationHandler,
} from './quotations.controller.js';

const quotationsRoutes = express.Router();

quotationsRoutes.use(authenticate);

quotationsRoutes.post('/', createQuotationHandler);
quotationsRoutes.patch('/:quotationId/send', sendQuotationHandler);

export default quotationsRoutes;

