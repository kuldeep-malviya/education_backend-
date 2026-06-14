import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.post('/register', strict, validate(auth.schemas.registerSchema), auth.register);
router.post('/login', strict, validate(auth.schemas.loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.post('/verify-email', auth.verifyEmail);
router.post('/forgot-password', strict, auth.forgotPassword);
router.post('/reset-password', strict, auth.resetPassword);

export default router;
