import { Router } from 'express';
import * as lecture from '../controllers/lecture.controller.js';
import { requireAuth, requireRoles, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post(
  '/course/:courseId',
  requireAuth,
  requireRoles('teacher', 'admin'),
  lecture.createLecture
);
router.patch(
  '/:id',
  requireAuth,
  requireRoles('teacher', 'admin'),
  lecture.updateLecture
);
router.delete(
  '/:id',
  requireAuth,
  requireRoles('teacher', 'admin'),
  lecture.deleteLecture
);
router.get('/:id', optionalAuth, lecture.getLecture);
router.post('/:id/complete', requireAuth, lecture.markComplete);

export default router;
