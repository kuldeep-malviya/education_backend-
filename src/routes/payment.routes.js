import { Router } from 'express';
import * as p from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/order', requireAuth, p.createOrder);
router.post('/verify', requireAuth, p.verifyAndEnroll);

export default router;
