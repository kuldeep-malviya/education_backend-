import { Router } from 'express';
import * as a from '../controllers/admin.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRoles('admin'));

router.get('/overview', a.overview);
router.get('/users', a.listUsers);
router.post('/users/:id/approve', a.approveTeacher);
router.post('/users/:id/suspend', a.suspendUser);
router.delete('/users/:id', a.deleteUser);

router.get('/courses/pending', a.pendingCourses);
router.get('/courses/published', a.listPublishedCourses);
router.post('/courses/:id/approve', a.approveCourse);
router.post('/courses/:id/reject', a.rejectCourse);
router.post('/courses/:id/feature', a.toggleFeature);

router.post('/broadcast', a.broadcast);
router.get('/reviews', a.reviewsModeration);

export default router;
