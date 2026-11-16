import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
  folder: string;
  isConfigured: boolean;
}

export interface UploadFileInput {
  file: string;
  fileName?: string;
  folder?: string;
  baseUrl?: string;
}

export interface UploadFileResult {
  url: string;
  public_id: string;
  file_name: string;
  resource_type: string;
  format?: string;
  bytes?: number;
  provider: 'cloudinary' | 'local' | 'existing';
}

export interface DeleteFileInput {
  public_id?: string;
  url?: string;
  resource_type?: string;
}

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

export const getCloudinaryConfig = (): CloudinaryConfig => {
  // Reload .env so newly saved credentials take effect immediately without server restart
  dotenv.config({ override: true });

  let cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUD_NAME ||
    process.env.CLOUDINARY_NAME ||
    process.env.VITE_CLOUDINARY_CLOUD_NAME ||
    '';
  let apiKey =
    process.env.CLOUDINARY_API_KEY ||
    process.env.API_KEY ||
    process.env.CLOUDINARY_KEY ||
    '';
  let apiSecret =
    process.env.CLOUDINARY_API_SECRET ||
    process.env.API_SECRET ||
    process.env.CLOUDINARY_SECRET ||
    '';
  const uploadPreset =
    process.env.CLOUDINARY_UPLOAD_PRESET ||
    process.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
    '';
  const folder = process.env.CLOUDINARY_FOLDER || 'isocal';

  // Support CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
  const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
  if (cloudinaryUrl.startsWith('cloudinary://')) {
    try {
      const parsed = new URL(cloudinaryUrl);
      if (!cloudName && parsed.hostname) cloudName = parsed.hostname;
      if (!apiKey && parsed.username) apiKey = decodeURIComponent(parsed.username);
      if (!apiSecret && parsed.password) apiSecret = decodeURIComponent(parsed.password);
    } catch {
      // ignore invalid URL
    }
  }

  const isConfigured = Boolean(
    cloudName &&
      cloudName !== 'your_cloud_name' &&
      ((apiKey && apiSecret && apiKey !== 'your_api_key') || uploadPreset),
  );

  return {
    cloudName: cloudName.trim(),
    apiKey: apiKey.trim(),
    apiSecret: apiSecret.trim(),
    uploadPreset: uploadPreset.trim(),
    folder: folder.trim() || 'isocal',
    isConfigured,
  };
};

const sanitizeFileName = (rawName: string): string => {
  const cleaned = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || `file_${Date.now()}`;
};

const guessExtensionFromDataUri = (dataUri: string, fallbackName?: string): string => {
  if (fallbackName && path.extname(fallbackName)) {
    return path.extname(fallbackName).toLowerCase();
  }
  const match = /^data:([^;]+);base64,/i.exec(dataUri);
  const mime = match ? match[1].toLowerCase() : '';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('word') || mime.includes('officedocument.wordprocessingml')) return '.docx';
  if (mime.includes('excel') || mime.includes('spreadsheetml')) return '.xlsx';
  return '.jpg';
};

const saveToLocalUploads = async (
  dataUri: string,
  fileName: string | undefined,
  subFolder: string,
  baseUrl?: string,
): Promise<UploadFileResult> => {
  const safeFolder = subFolder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'isocal';
  const targetDir = path.join(UPLOADS_ROOT, safeFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = guessExtensionFromDataUri(dataUri, fileName);
  const baseName = fileName
    ? sanitizeFileName(path.basename(fileName, path.extname(fileName)))
    : `img_${Date.now()}`;
  const finalFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${baseName}${ext}`;
  const fullPath = path.join(targetDir, finalFileName);

  const base64Data = dataUri.includes(';base64,')
    ? dataUri.split(';base64,')[1]
    : dataUri;
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.writeFile(fullPath, buffer);

  const port = process.env.PORT || 3000;
  const hostPrefix = baseUrl || `http://localhost:${port}`;
  const relativePath = `${safeFolder}/${finalFileName}`.replace(/\\/g, '/');
  const url = `${hostPrefix.replace(/\/+$/, '')}/uploads/${relativePath}`;

  return {
    url,
    public_id: `local:${relativePath}`,
    file_name: fileName || finalFileName,
    resource_type: ext === '.pdf' ? 'raw' : 'image',
    format: ext.replace('.', ''),
    bytes: buffer.byteLength,
    provider: 'local',
  };
};

export const uploadFileToCloud = async (
  input: UploadFileInput,
): Promise<UploadFileResult> => {
  const rawFile = (input.file || '').trim();
  if (!rawFile) {
    throw new AppError('Không có dữ liệu tệp để tải lên.', 400, ERROR_CODES.BAD_REQUEST);
  }

  // If already a remote HTTP(S) URL or /uploads/ URL, return as-is
  if (/^https?:\/\//i.test(rawFile) || rawFile.startsWith('/uploads/')) {
    return {
      url: rawFile,
      public_id: extractCloudinaryPublicId(rawFile) || rawFile,
      file_name: input.fileName || path.basename(rawFile),
      resource_type: 'image',
      provider: 'existing',
    };
  }

  const config = getCloudinaryConfig();
  const targetFolder = input.folder
    ? `${config.folder}/${input.folder.replace(/^isocal\/?/i, '')}`
    : config.folder;

  if (config.isConfigured) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const formData = new FormData();
      formData.append('file', rawFile);
      formData.append('folder', targetFolder);

      if (config.apiKey && config.apiSecret) {
        // Signed upload using SHA-1 signature
        const paramsToSign = `folder=${targetFolder}&timestamp=${timestamp}`;
        const signature = crypto
          .createHash('sha1')
          .update(`${paramsToSign}${config.apiSecret}`)
          .digest('hex');

        formData.append('api_key', config.apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
      } else if (config.uploadPreset) {
        // Unsigned upload preset
        formData.append('upload_preset', config.uploadPreset);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        config.cloudName,
      )}/auto/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as Record<string, any>;
      if (!response.ok || !data.secure_url) {
        const errMsg = data?.error?.message || 'Lỗi khi tải tệp lên Cloudinary';
        throw new Error(errMsg);
      }

      return {
        url: String(data.secure_url),
        public_id: String(data.public_id),
        file_name: input.fileName || data.original_filename || path.basename(String(data.secure_url)),
        resource_type: String(data.resource_type || 'image'),
        format: data.format ? String(data.format) : undefined,
        bytes: typeof data.bytes === 'number' ? data.bytes : undefined,
        provider: 'cloudinary',
      };
    } catch (err) {
      console.warn('[Cloudinary] Upload fallback to local storage:', (err as Error)?.message);
      return saveToLocalUploads(rawFile, input.fileName, targetFolder, input.baseUrl);
    }
  }

  // Fallback to local static storage when Cloudinary credentials are not set
  return saveToLocalUploads(rawFile, input.fileName, targetFolder, input.baseUrl);
};

export const extractCloudinaryPublicId = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  if (!/^https?:\/\//i.test(urlOrId)) {
    return urlOrId;
  }
  try {
    const parsed = new URL(urlOrId);
    if (!parsed.hostname.includes('cloudinary.com')) return null;
    // Example path: /<cloud_name>/image/upload/v1712345678/isocal/inspections/abc_123.jpg
    const match = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/.exec(parsed.pathname);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const deleteFileFromCloud = async (
  input: DeleteFileInput,
): Promise<{ deleted: boolean; provider: string; public_id?: string | null }> => {
  const rawTarget = input.public_id || input.url || '';
  if (!rawTarget) {
    return { deleted: false, provider: 'none', public_id: null };
  }

  // Handle local file deletion
  if (rawTarget.startsWith('local:') || rawTarget.includes('/uploads/')) {
    try {
      const relative = rawTarget.startsWith('local:')
        ? rawTarget.slice('local:'.length)
        : rawTarget.split('/uploads/')[1];
      if (relative) {
        const safeRel = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = path.join(UPLOADS_ROOT, safeRel);
        await fs.unlink(fullPath).catch(() => {});
        return { deleted: true, provider: 'local', public_id: `local:${safeRel}` };
      }
    } catch {
      // ignore error
    }
    return { deleted: false, provider: 'local', public_id: rawTarget };
  }

  const publicId = input.public_id || extractCloudinaryPublicId(rawTarget);
  const config = getCloudinaryConfig();

  if (publicId && config.isConfigured && config.apiKey && config.apiSecret) {
    try {
      const resourceType = input.resource_type || 'image';
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
      const signature = crypto
        .createHash('sha1')
        .update(`${paramsToSign}${config.apiSecret}`)
        .digest('hex');

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', config.apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);

      const destroyUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        config.cloudName,
      )}/${encodeURIComponent(resourceType)}/destroy`;

      const response = await fetch(destroyUrl, {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as Record<string, any>;
      return {
        deleted: data?.result === 'ok' || data?.result === 'not found',
        provider: 'cloudinary',
        public_id: publicId,
      };
    } catch (err) {
      console.warn('[Cloudinary] Destroy error:', (err as Error)?.message);
    }
  }

  return { deleted: true, provider: 'client', public_id: publicId };
};

/**
 * Helper used by services (e.g. InitialInspection, StepResults, CustomerConsent)
 * to automatically upload Base64 Data URIs to Cloudinary before saving to DB.
 */
export const ensureUploadedUrl = async (
  val: string | null | undefined,
  folder = 'inspections',
  fileName?: string,
): Promise<string | null> => {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:')) {
    const uploaded = await uploadFileToCloud({
      file: trimmed,
      fileName,
      folder,
    });
    return uploaded.url;
  }

  return trimmed;
};
