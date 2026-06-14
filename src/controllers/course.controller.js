import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Lecture from '../models/Lecture.js';
import Enrollment from '../models/Enrollment.js';
import Review from '../models/Review.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { uniqueSlug, slugify } from '../utils/slug.js';

const resolveSubjectCategory = async (subjectName) => {
  const name = subjectName.trim();
  const slug = slugify(name) || 'general';
  let category = await Category.findOne({ slug });
  if (!category) category = await Category.create({ name, slug });
  return category;
};

const ensureOwnerOrAdmin = (course, user) => {
  if (
    user.role !== 'admin' &&
    course.instructor.toString() !== user._id.toString()
  ) {
    throw new ApiError(403, 'Not allowed');
  }
};

export const listCourses = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    level,
    price,
    sort = '-createdAt',
    page = 1,
    limit = 12,
    featured,
  } = req.query;

  const filter = { isPublished: true, approvalStatus: 'approved' };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (price === 'free') filter.isFree = true;
  if (price === 'paid') filter.isFree = false;
  if (featured === 'true') filter.isFeatured = true;
  if (q) filter.$text = { $search: q };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Course.find(filter)
      .populate('instructor', 'name avatar headline')
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Course.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const listInstructors = asyncHandler(async (req, res) => {
  const match = { isPublished: true, approvalStatus: 'approved' };
  const grouped = await Course.aggregate([
    { $match: match },
    { $group: { _id: '$instructor', courseCount: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(
    grouped.map((g) => [g._id.toString(), g.courseCount])
  );
  const ids = grouped.map((g) => g._id);
  const teachers = await User.find({ _id: { $in: ids } })
    .select('name avatar headline subject')
    .lean();
  const result = teachers
    .map((t) => ({ ...t, courseCount: countMap[t._id.toString()] || 0 }))
    .sort((a, b) => b.courseCount - a.courseCount);
  res.json({ success: true, teachers: result });
});

export const getCourse = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const course = await Course.findOne({ slug })
    .populate('instructor', 'name avatar headline bio socials')
    .populate('category', 'name slug')
    .populate({
      path: 'sections.lectures',
      select: 'title type order isPreview video.duration youtubeId',
    })
    .lean();
  if (!course) throw new ApiError(404, 'Course not found');

  let isEnrolled = false;
  if (req.user) {
    isEnrolled = !!(await Enrollment.exists({
      student: req.user._id,
      course: course._id,
    }));
  }

  const related = await Course.find({
    category: course.category._id,
    _id: { $ne: course._id },
    isPublished: true,
    approvalStatus: 'approved',
  })
    .select('title slug thumbnail rating enrollmentCount price discountPrice')
    .limit(6)
    .lean();

  res.json({ success: true, course, isEnrolled, related });
});

export const createCourse = asyncHandler(async (req, res) => {
  const { title, subtitle, description, level, language, tags, subject } = req.body;
  if (!title || !description) {
    throw new ApiError(400, 'title and description are required');
  }
  const subjectName = (subject || req.user.subject || '').trim();
  if (!subjectName) {
    throw new ApiError(400, 'Set your subject before creating a course');
  }
  if (subject && subjectName !== req.user.subject) {
    await User.findByIdAndUpdate(req.user._id, { subject: subjectName });
  }

  const category = await resolveSubjectCategory(subjectName);
  const slug = await uniqueSlug(Course, title);
  const course = await Course.create({
    title,
    slug,
    subtitle,
    description,
    category: category._id,
    level,
    language,
    price: 0,
    isFree: true,
    tags,
    instructor: req.user._id,
    approvalStatus: 'approved',
    isPublished: true,
  });
  res.status(201).json({ success: true, course });
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);

  const editable = [
    'title',
    'subtitle',
    'description',
    'category',
    'level',
    'language',
    'tags',
    'requirements',
    'outcomes',
    'thumbnail',
    'promoVideo',
  ];
  for (const k of editable) {
    if (req.body[k] !== undefined) course[k] = req.body[k];
  }
  course.price = 0;
  course.isFree = true;
  await course.save();
  res.json({ success: true, course });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);
  await Promise.all([
    Lecture.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
    Review.deleteMany({ course: course._id }),
  ]);
  await course.deleteOne();
  res.json({ success: true });
});

export const submitForReview = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);
  if (course.totalLectures === 0) {
    throw new ApiError(400, 'Add at least one lecture before submitting');
  }
  course.approvalStatus = 'pending';
  course.rejectionReason = undefined;
  await course.save();
  res.json({ success: true, course });
});

export const togglePublish = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);
  if (course.approvalStatus !== 'approved') {
    throw new ApiError(400, 'Course must be approved before publishing');
  }
  course.isPublished = !course.isPublished;
  await course.save();
  res.json({ success: true, course });
});

export const addSection = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);
  course.sections.push({
    title: req.body.title || 'New section',
    description: req.body.description,
    order: course.sections.length,
  });
  await course.save();
  res.status(201).json({ success: true, course });
});

export const updateSection = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);
  const section = course.sections.id(req.params.sectionId);
  if (!section) throw new ApiError(404, 'Section not found');
  ['title', 'description', 'order'].forEach((k) => {
    if (req.body[k] !== undefined) section[k] = req.body[k];
  });
  await course.save();
  res.json({ success: true, course });
});

export const deleteSection = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  ensureOwnerOrAdmin(course, req.user);
  const section = course.sections.id(req.params.sectionId);
  if (!section) throw new ApiError(404, 'Section not found');
  await Lecture.deleteMany({ course: course._id, sectionId: section._id });
  section.deleteOne();
  await course.save();
  res.json({ success: true, course });
});

export const myCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id })
    .populate('category', 'name slug')
    .populate({ path: 'sections.lectures', select: 'title type youtubeId video.url' })
    .sort('-updatedAt')
    .lean();
  res.json({ success: true, courses });
});

export const teacherAnalytics = asyncHandler(async (req, res) => {
  const teacherId = new mongoose.Types.ObjectId(req.user._id);
  const courses = await Course.find({ instructor: teacherId })
    .select('_id title enrollmentCount rating price isPublished')
    .lean();

  const courseIds = courses.map((c) => c._id);
  const [enrollAgg, revenueAgg] = await Promise.all([
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: null, revenue: { $sum: '$pricePaid' } } },
    ]),
  ]);

  const enrollMap = Object.fromEntries(enrollAgg.map((e) => [e._id.toString(), e.count]));
  const totalRevenue = revenueAgg[0]?.revenue || 0;
  const totalStudents = enrollAgg.reduce((s, e) => s + e.count, 0);

  res.json({
    success: true,
    summary: {
      totalCourses: courses.length,
      totalStudents,
      totalRevenue,
      averageRating:
        courses.reduce((s, c) => s + (c.rating?.average || 0), 0) /
        (courses.length || 1),
    },
    courses: courses.map((c) => ({
      ...c,
      enrollments: enrollMap[c._id.toString()] || 0,
    })),
  });
});
