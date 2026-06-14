import Review from '../models/Review.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const recomputeRating = async (courseId) => {
  const result = await Review.aggregate([
    { $match: { course: courseId } },
    {
      $group: {
        _id: '$course',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  const stats = result[0] || { avg: 0, count: 0 };
  await Course.findByIdAndUpdate(courseId, {
    'rating.average': Math.round(stats.avg * 10) / 10,
    'rating.count': stats.count,
  });
};

export const upsertReview = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }
  const enrolled = await Enrollment.exists({ course: courseId, student: req.user._id });
  if (!enrolled) throw new ApiError(403, 'Only enrolled students can review');

  const review = await Review.findOneAndUpdate(
    { course: courseId, student: req.user._id },
    { rating, comment, course: courseId, student: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const course = await Course.findById(courseId);
  await recomputeRating(course._id);
  res.json({ success: true, review });
});

export const listReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ course: req.params.courseId })
    .populate('student', 'name avatar')
    .sort('-createdAt')
    .lean();
  res.json({ success: true, reviews });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (
    req.user.role !== 'admin' &&
    review.student.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, 'Not allowed');
  }
  const courseId = review.course;
  await review.deleteOne();
  await recomputeRating(courseId);
  res.json({ success: true });
});
