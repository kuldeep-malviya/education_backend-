import { Router } from 'express';
import * as n from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, n.list);
router.post('/read-all', requireAuth, n.markAllRead);
router.post('/:id/read', requireAuth, n.markRead);

export default router;
