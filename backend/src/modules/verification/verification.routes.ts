import { Router } from 'express';
import * as controller from './verification.controller.js';

/** Route công khai: Public Verifier không có Account nên không dùng authenticate. */
const verificationRoutes = Router();

verificationRoutes.get('/:sealCode', controller.verifySealHandler);

export default verificationRoutes;
