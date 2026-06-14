import User from '../models/User.js';
import Course from '../models/Course.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'headline', 'socials', 'avatar', 'subject'];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, user: user.toSafeJSON() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { current, next } = req.body;
  if (!current || !next || next.length < 8) {
    throw new ApiError(400, 'Invalid password input');
  }
  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  const ok = await user.comparePassword(current);
  if (!ok) throw new ApiError(401, 'Current password incorrect');
  user.password = next;
  user.refreshTokens = [];
  await user.save();
  res.json({ success: true });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  const courses = await Course.find({
    instructor: user._id,
    isPublished: true,
    approvalStatus: 'approved',
  })
    .populate('category', 'name slug')
    .populate('instructor', 'name avatar')
    .select('title slug thumbnail rating enrollmentCount category instructor')
    .lean();
  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      headline: user.headline,
      socials: user.socials,
    },
    courses,
  });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const user = await User.findById(req.user._id);
  const idx = user.wishlist.findIndex((c) => c.toString() === courseId);
  if (idx >= 0) user.wishlist.splice(idx, 1);
  else user.wishlist.push(courseId);
  await user.save();
  res.json({ success: true, wishlist: user.wishlist });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    select: 'title slug thumbnail rating enrollmentCount price discountPrice instructor',
    populate: { path: 'instructor', select: 'name avatar' },
  });
  res.json({ success: true, wishlist: user.wishlist });
});
