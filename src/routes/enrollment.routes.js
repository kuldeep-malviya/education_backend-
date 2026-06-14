import { Router } from 'express';
import * as e from '../controllers/enrollment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/free', requireAuth, e.enrollFree);
router.get('/me', requireAuth, e.myEnrollments);
router.get('/course/:courseId', requireAuth, e.getEnrollment);
router.post('/course/:courseId/certificate', requireAuth, e.issueCertificate);

export default router;
