import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const overview = asyncHandler(async (_req, res) => {
  const [students, teachers, totalCourses, publishedCourses, pendingCourses, totalEnrollments] =
    await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true, approvalStatus: 'approved' }),
      Course.countDocuments({ approvalStatus: 'pending' }),
      Enrollment.countDocuments(),
    ]);

  const revenueAgg = await Enrollment.aggregate([
    { $group: { _id: null, revenue: { $sum: '$pricePaid' } } },
  ]);
  const revenue = revenueAgg[0]?.revenue || 0;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const trend = await Enrollment.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } },
        enrollments: { $sum: 1 },
        revenue: { $sum: '$pricePaid' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    metrics: {
      students,
      teachers,
      totalCourses,
      publishedCourses,
      pendingCourses,
      totalEnrollments,
      revenue,
    },
    trend,
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, total, page: Number(page), limit: Number(limit) });
});

export const approveTeacher = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.isApproved = true;
  await user.save();
  await Notification.create({
    user: user._id,
    type: 'system',
    title: 'Teacher account approved',
    message: 'You can now publish courses on StudyPath.',
  });
  res.json({ success: true });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.isSuspended = !user.isSuspended;
  await user.save();
  res.json({ success: true, suspended: user.isSuspended });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Cannot delete admin');
  await user.deleteOne();
  res.json({ success: true });
});

export const pendingCourses = asyncHandler(async (_req, res) => {
  const courses = await Course.find({ approvalStatus: 'pending' })
    .populate('instructor', 'name email avatar')
    .populate('category', 'name')
    .sort('-updatedAt')
    .lean();
  res.json({ success: true, courses });
});

export const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  course.approvalStatus = 'approved';
  course.isPublished = true;
  course.rejectionReason = undefined;
  await course.save();
  await Notification.create({
    user: course.instructor,
    type: 'course',
    title: `${course.title} approved`,
    message: 'Your course is approved and is now live in the catalogue.',
    link: `/teacher/courses/${course._id}`,
  });
  res.json({ success: true, course });
});

export const rejectCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  course.approvalStatus = 'rejected';
  course.rejectionReason = req.body.reason || 'Did not meet quality guidelines';
  course.isPublished = false;
  await course.save();
  await Notification.create({
    user: course.instructor,
    type: 'course',
    title: `${course.title} rejected`,
    message: course.rejectionReason,
    link: `/teacher/courses/${course._id}`,
  });
  res.json({ success: true, course });
});

export const listPublishedCourses = asyncHandler(async (_req, res) => {
  const courses = await Course.find({ isPublished: true, approvalStatus: 'approved' })
    .populate('instructor', 'name avatar')
    .populate('category', 'name')
    .sort('-isFeatured -updatedAt')
    .lean();
  res.json({ success: true, courses });
});

export const toggleFeature = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  course.isFeatured = !course.isFeatured;
  await course.save();
  res.json({ success: true, isFeatured: course.isFeatured });
});

export const broadcast = asyncHandler(async (req, res) => {
  const { title, message, role } = req.body;
  const filter = role ? { role } : {};
  const users = await User.find(filter).select('_id').lean();
  const notes = users.map((u) => ({
    user: u._id,
    title,
    message,
    type: 'announcement',
  }));
  if (notes.length) await Notification.insertMany(notes);
  res.json({ success: true, sent: notes.length });
});

export const reviewsModeration = asyncHandler(async (_req, res) => {
  const reviews = await Review.find()
    .populate('student', 'name email')
    .populate('course', 'title slug')
    .sort('-createdAt')
    .limit(100)
    .lean();
  res.json({ success: true, reviews });
});
