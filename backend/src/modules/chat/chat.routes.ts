import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  getMyThreads,
  getSingleThread,
  postCreateThread,
  postSendMessage,
} from './chat.controller.js';

const chatRoutes = Router();

chatRoutes.use(authenticate);

chatRoutes.get('/threads', getMyThreads);
chatRoutes.get('/threads/:threadId', getSingleThread);
chatRoutes.post('/threads', postCreateThread);
chatRoutes.post('/threads/:threadId/messages', postSendMessage);

export default chatRoutes;
