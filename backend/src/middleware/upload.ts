import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads'),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${id}${path.extname(file.originalname).toLowerCase()}`);
  },
});

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(ApiError.badRequest('Only JPG, PNG or WEBP images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('image');
