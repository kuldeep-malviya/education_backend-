import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', getSettings);
router.patch('/', requireAuth, requireRoles('admin'), updateSettings);

export default router;
