import path from 'path';
import { Router } from 'express';
import { uploadImage, uploadVideo, uploadFile, uploadsRoot } from '../middleware/upload.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const router = Router();

const respond = (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const relative = path.relative(uploadsRoot, req.file.path).split(path.sep).join('/');
  const url = `${req.protocol}://${req.get('host')}/uploads/${relative}`;
  res.json({
    success: true,
    file: {
      url,
      publicId: relative,
      size: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
};

router.post(
  '/image',
  requireAuth,
  uploadImage.single('file'),
  asyncHandler(async (req, res) => respond(req, res))
);

router.post(
  '/video',
  requireAuth,
  requireRoles('teacher', 'admin'),
  uploadVideo.single('file'),
  asyncHandler(async (req, res) => respond(req, res))
);

router.post(
  '/file',
  requireAuth,
  uploadFile.single('file'),
  asyncHandler(async (req, res) => respond(req, res))
);

export default router;
