import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  addCustomerDevice,
  assignCustomerToSalesHandler,
  bulkAssignCustomersToSalesHandler,
  createCustomerAccountHandler,
  createCustomerHandler,
  getCustomerDetailHandler,
  getCustomerDevices,
  getCustomers,
  getSalesAssignmentsHandler,
  updateCustomerHandler,
} from './customers.controller.js';

const customersRoutes = Router();

// Xác thực token đăng nhập
customersRoutes.use(authenticate);

customersRoutes.get('/', getCustomers);
customersRoutes.get('/sales-assignments', getSalesAssignmentsHandler);
customersRoutes.post('/bulk-assign-sales', bulkAssignCustomersToSalesHandler);
customersRoutes.post('/', createCustomerHandler);
customersRoutes.get('/:customerId', getCustomerDetailHandler);
customersRoutes.put('/:customerId', updateCustomerHandler);
customersRoutes.patch('/:customerId/assign-sales', assignCustomerToSalesHandler);
customersRoutes.post('/:customerId/accounts', createCustomerAccountHandler);
customersRoutes.get('/:customerId/devices', getCustomerDevices);
customersRoutes.post('/:customerId/devices', addCustomerDevice);

export default customersRoutes;
