import type { NextFunction, Request, Response } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import {
  deleteFileFromCloud,
  getCloudinaryConfig,
  uploadFileToCloud,
} from './uploads.service.js';

export const uploadFileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { file, fileData, fileName, file_name, folder } = req.body || {};
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 3000}`;
    const baseUrl = `${protocol}://${host}`;

    const result = await uploadFileToCloud({
      file: file || fileData || '',
      fileName: fileName || file_name,
      folder: folder || 'attachments',
      baseUrl,
    });

    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const deleteFileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { public_id, publicId, url, resource_type, resourceType } = req.body || req.query || {};
    const result = await deleteFileFromCloud({
      public_id: (public_id || publicId) as string | undefined,
      url: url as string | undefined,
      resource_type: (resource_type || resourceType) as string | undefined,
    });

    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getUploadStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const config = getCloudinaryConfig();
    res.status(200).json(
      buildSuccessResponse({
        cloudinary_configured: config.isConfigured,
        cloud_name: config.cloudName || null,
        folder: config.folder,
      }),
    );
  } catch (error) {
    next(error);
  }
};

