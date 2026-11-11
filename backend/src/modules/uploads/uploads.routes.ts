import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  deleteFileHandler,
  getUploadStatusHandler,
  uploadFileHandler,
} from './uploads.controller.js';

const router = Router();

router.get('/status', authenticate, getUploadStatusHandler);
router.post('/', authenticate, uploadFileHandler);
router.post('/delete', authenticate, deleteFileHandler);
router.delete('/', authenticate, deleteFileHandler);

export default router;

