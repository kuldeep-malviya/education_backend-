import { Router } from 'express';
import * as q from '../controllers/quiz.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();

router.get('/course/:courseId', q.listForCourse);
router.post(
  '/course/:courseId',
  requireAuth,
  requireRoles('teacher', 'admin'),
  q.createQuiz
);
router.patch('/:id', requireAuth, requireRoles('teacher', 'admin'), q.updateQuiz);
router.delete('/:id', requireAuth, requireRoles('teacher', 'admin'), q.deleteQuiz);
router.get('/:id/start', requireAuth, q.startQuiz);
router.post('/:id/submit', requireAuth, q.submitQuiz);
router.get('/attempts/me', requireAuth, q.myAttempts);

export default router;
