import path from 'node:path';
import os from 'node:os';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';
import { API_PREFIX } from './common/constants.js';
import { buildSuccessResponse } from './common/response.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { authenticate } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { AppError } from './common/errors.js';
import authRouter from './routes/authRouter.js';
import profileRouter from './routes/profileRouter.js';
import adminRouter from './routes/adminRouter.js';
import customerRoutes from './modules/customers/customers.routes.js';
import serviceTypesRoutes from './modules/service-types/service-types.routes.js';
import serviceRequestsRoutes from './modules/service-requests/service-requests.routes.js';
import quotationsRoutes from './modules/quotations/quotations.routes.js';
import contractsRoutes from './modules/contracts/contracts.routes.js';
import devicesRoutes from './modules/devices/devices.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/profile`, profileRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/service-types`, serviceTypesRoutes);
app.use(`${API_PREFIX}/service-requests`, serviceRequestsRoutes);
app.use(`${API_PREFIX}/quotations`, quotationsRoutes);
app.use(`${API_PREFIX}/contracts`, contractsRoutes);
app.use(`${API_PREFIX}/devices`, devicesRoutes);

app.get(`${API_PREFIX}/health`, async (req, res, next) => {
  try {
    res.status(200).json(
      buildSuccessResponse({
        status: 'ok',
        environment: env.nodeEnv,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    next(error);
  }
});

app.get(`${API_PREFIX}/system/lan-ip`, (req, res) => {
  const ifaces = os.networkInterfaces();
  let lanIp = '192.168.1.7';
  for (const dev in ifaces) {
    const list = ifaces[dev];
    if (list) {
      for (const details of list) {
        if (
          details.family === 'IPv4' &&
          !details.internal &&
          (details.address.startsWith('192.168.') ||
            details.address.startsWith('10.') ||
            details.address.startsWith('172.'))
        ) {
          lanIp = details.address;
          break;
        }
      }
    }
  }
  res.status(200).json(
    buildSuccessResponse({
      lanIp,
    }),
  );
});

app.get(`${API_PREFIX}/secure-check`, authenticate, (req, res) => {
  res.status(200).json(
    buildSuccessResponse({
      status: 'authorized',
      user: req.user,
    }),
  );
});


app.use((req, res, next) => {
  next(new AppError(`Unhandled route: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND', { path: req.originalUrl }));
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;