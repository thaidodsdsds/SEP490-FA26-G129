import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  addCustomerDevice,
  createCustomerAccountHandler,
  createCustomerHandler,
  getCustomerDetailHandler,
  getCustomerDevices,
  getCustomers,
  updateCustomerHandler,
} from './customers.controller.js';

const customersRoutes = Router();

// Xác thực token đăng nhập
customersRoutes.use(authenticate);

customersRoutes.get('/', getCustomers);
customersRoutes.post('/', createCustomerHandler);
customersRoutes.get('/:customerId', getCustomerDetailHandler);
customersRoutes.put('/:customerId', updateCustomerHandler);
customersRoutes.post('/:customerId/accounts', createCustomerAccountHandler);
customersRoutes.get('/:customerId/devices', getCustomerDevices);
customersRoutes.post('/:customerId/devices', addCustomerDevice);

export default customersRoutes;
