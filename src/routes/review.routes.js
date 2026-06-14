import { Router } from 'express';
import * as r from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/course/:courseId', r.listReviews);
router.post('/course/:courseId', requireAuth, r.upsertReview);
router.delete('/:id', requireAuth, r.deleteReview);

export default router;
