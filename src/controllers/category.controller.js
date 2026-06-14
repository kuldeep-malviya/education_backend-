import Category from '../models/Category.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { uniqueSlug } from '../utils/slug.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort('name').lean();
  res.json({ success: true, categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, color, isFeatured } = req.body;
  if (!name) throw new ApiError(400, 'name required');
  const slug = await uniqueSlug(Category, name);
  const cat = await Category.create({ name, slug, description, icon, color, isFeatured });
  res.status(201).json({ success: true, category: cat });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!cat) throw new ApiError(404, 'Category not found');
  res.json({ success: true, category: cat });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw new ApiError(404, 'Category not found');
  res.json({ success: true });
});
