import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsRoot = path.resolve(__dirname, '../../uploads');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const diskStorage = (subfolder) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureDir(path.join(uploadsRoot, subfolder))),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .slice(0, 40);
      cb(null, `${Date.now()}-${base || 'file'}${ext}`);
    },
  });

export const uploadImage = multer({
  storage: diskStorage('images'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadVideo = multer({
  storage: diskStorage('videos'),
  limits: { fileSize: 500 * 1024 * 1024 },
});

export const uploadFile = multer({
  storage: diskStorage('files'),
  limits: { fileSize: 50 * 1024 * 1024 },
});
