import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  addCustomerDevice,
  getCustomerDevices,
  getCustomers,
} from './customers.controller.js';

const customersRoutes = Router();

// Xác thực token đăng nhập
customersRoutes.use(authenticate);

customersRoutes.get('/', getCustomers);
customersRoutes.get('/:customerId/devices', getCustomerDevices);
customersRoutes.post('/:customerId/devices', addCustomerDevice);

export default customersRoutes;
