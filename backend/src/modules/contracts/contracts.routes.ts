import express from 'express';
import { authenticate, authorize } from '../../middlewares/auth.js';
import {
  approveContractHandler,
  cancelContractHandler,
  createContractHandler,
  customerSignContractHandler,
  getCompanyProfileHandler,
  getContractDetailHandler,
  getContractPrefillHandler,
  getNextContractCodeHandler,
  getSignedContractFileHandler,
  liquidateContractHandler,
  listAvailableQuotationsHandler,
  listContractsHandler,
  submitContractHandler,
  updateContractHandler,
} from './contracts.controller.js';

const contractsRoutes = express.Router();

contractsRoutes.use(authenticate);

// Dữ liệu tra cứu cho form tạo hợp đồng
contractsRoutes.get('/next-code', getNextContractCodeHandler);
contractsRoutes.get('/company-profile', getCompanyProfileHandler);
contractsRoutes.get('/available-quotations', listAvailableQuotationsHandler);
contractsRoutes.get('/prefill/:quotationId', getContractPrefillHandler);

contractsRoutes.get('/', listContractsHandler);
contractsRoutes.post('/', authorize('Sales', 'Admin'), createContractHandler);

contractsRoutes.get('/:contractId', getContractDetailHandler);
contractsRoutes.get('/:contractId/signed-file', getSignedContractFileHandler);
contractsRoutes.patch('/:contractId', updateContractHandler);
contractsRoutes.post('/:contractId/submit', authorize('Sales', 'Admin'), submitContractHandler);
contractsRoutes.post('/:contractId/approve', authorize('Admin', 'CEO'), approveContractHandler);
contractsRoutes.post('/:contractId/customer-sign', authorize('Customer'), customerSignContractHandler);
contractsRoutes.post('/:contractId/cancel', authorize('Sales', 'Admin'), cancelContractHandler);
contractsRoutes.post('/:contractId/liquidate', authorize('Accountant', 'Admin'), liquidateContractHandler);

export default contractsRoutes;
