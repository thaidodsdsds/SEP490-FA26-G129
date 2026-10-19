import { Router } from 'express';
import { getRoles } from './roles.controller.js';

const rolesRoutes = Router();

rolesRoutes.get('/', getRoles);

export default rolesRoutes;
