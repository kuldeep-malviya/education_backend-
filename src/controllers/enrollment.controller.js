import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Certificate from '../models/Certificate.js';
import Notification from '../models/Notification.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import crypto from 'crypto';

export const enrollFree = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (!course.isPublished || course.approvalStatus !== 'approved') {
    throw new ApiError(400, 'Course is not available');
  }
  if (!course.isFree && course.price > 0) {
    throw new ApiError(400, 'Course is not free — use payment endpoint');
  }
  const existing = await Enrollment.findOne({ course: course._id, student: req.user._id });
  if (existing) return res.json({ success: true, enrollment: existing });

  const enrollment = await Enrollment.create({
    course: course._id,
    student: req.user._id,
    pricePaid: 0,
  });
  course.enrollmentCount += 1;
  await course.save();
  await Notification.create({
    user: req.user._id,
    type: 'enrollment',
    title: `Enrolled in ${course.title}`,
    link: `/learn/${course.slug}`,
  });
  res.status(201).json({ success: true, enrollment });
});

export const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({
      path: 'course',
      select: 'title slug thumbnail instructor totalLectures totalDuration rating',
      populate: { path: 'instructor', select: 'name avatar' },
    })
    .sort('-updatedAt')
    .lean();
  res.json({ success: true, enrollments });
});

export const getEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findOne({
    course: req.params.courseId,
    student: req.user._id,
  })
    .populate({
      path: 'course',
      populate: { path: 'sections.lectures' },
    })
    .lean();
  if (!enrollment) throw new ApiError(404, 'Not enrolled');
  res.json({ success: true, enrollment });
});

export const issueCertificate = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findOne({
    course: req.params.courseId,
    student: req.user._id,
  }).populate('course', 'title');
  if (!enrollment) throw new ApiError(404, 'Not enrolled');
  if (enrollment.progress < 100) throw new ApiError(400, 'Course not completed');

  let cert = await Certificate.findOne({
    student: req.user._id,
    course: enrollment.course._id,
  });
  if (!cert) {
    cert = await Certificate.create({
      student: req.user._id,
      course: enrollment.course._id,
      serial: `EDG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    });
    enrollment.certificateUrl = `/certificates/${cert.serial}`;
    await enrollment.save();
  }
  res.json({ success: true, certificate: cert });
});
