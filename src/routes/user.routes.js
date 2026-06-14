import { Router } from 'express';
import * as user from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.patch('/me', requireAuth, user.updateProfile);
router.post('/me/password', requireAuth, user.changePassword);
router.get('/me/wishlist', requireAuth, user.getWishlist);
router.post('/wishlist/:courseId', requireAuth, user.toggleWishlist);
router.get('/:id', user.getPublicProfile);

export default router;
