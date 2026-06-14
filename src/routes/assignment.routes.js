import { Router } from 'express';
import * as a from '../controllers/assignment.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();

router.get('/course/:courseId', a.listForCourse);
router.post(
  '/course/:courseId',
  requireAuth,
  requireRoles('teacher', 'admin'),
  a.createAssignment
);
router.patch('/:id', requireAuth, requireRoles('teacher', 'admin'), a.updateAssignment);
router.delete('/:id', requireAuth, requireRoles('teacher', 'admin'), a.deleteAssignment);
router.post('/:id/submit', requireAuth, a.submit);
router.get(
  '/:id/submissions',
  requireAuth,
  requireRoles('teacher', 'admin'),
  a.listSubmissions
);
router.post(
  '/submissions/:id/grade',
  requireAuth,
  requireRoles('teacher', 'admin'),
  a.gradeSubmission
);
router.get('/submissions/me', requireAuth, a.mySubmissions);

export default router;
