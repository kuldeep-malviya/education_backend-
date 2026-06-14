import { Router } from 'express';
import * as cat from '../controllers/category.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', cat.listCategories);
router.post('/', requireAuth, requireRoles('admin'), cat.createCategory);
router.patch('/:id', requireAuth, requireRoles('admin'), cat.updateCategory);
router.delete('/:id', requireAuth, requireRoles('admin'), cat.deleteCategory);

export default router;
