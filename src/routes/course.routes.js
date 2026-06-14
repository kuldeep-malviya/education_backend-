import { Router } from 'express';
import * as course from '../controllers/course.controller.js';
import { requireAuth, requireRoles, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', course.listCourses);
router.get('/instructors', course.listInstructors);
router.get('/mine/list', requireAuth, requireRoles('teacher', 'admin'), course.myCourses);
router.get(
  '/mine/analytics',
  requireAuth,
  requireRoles('teacher', 'admin'),
  course.teacherAnalytics
);

router.get('/:slug', optionalAuth, course.getCourse);

router.post('/', requireAuth, requireRoles('teacher', 'admin'), course.createCourse);
router.patch('/:id', requireAuth, requireRoles('teacher', 'admin'), course.updateCourse);
router.delete('/:id', requireAuth, requireRoles('teacher', 'admin'), course.deleteCourse);

router.post(
  '/:id/submit',
  requireAuth,
  requireRoles('teacher', 'admin'),
  course.submitForReview
);
router.post(
  '/:id/publish',
  requireAuth,
  requireRoles('teacher', 'admin'),
  course.togglePublish
);

router.post(
  '/:id/sections',
  requireAuth,
  requireRoles('teacher', 'admin'),
  course.addSection
);
router.patch(
  '/:id/sections/:sectionId',
  requireAuth,
  requireRoles('teacher', 'admin'),
  course.updateSection
);
router.delete(
  '/:id/sections/:sectionId',
  requireAuth,
  requireRoles('teacher', 'admin'),
  course.deleteSection
);

export default router;
