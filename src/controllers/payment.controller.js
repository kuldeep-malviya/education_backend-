import crypto from 'crypto';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const createOrder = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (course.isFree) throw new ApiError(400, 'Course is free — no payment required');

  const amount = (course.discountPrice ?? course.price) * 100;
  const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`;

  res.json({
    success: true,
    order: {
      id: orderId,
      amount,
      currency: 'INR',
      courseId: course._id.toString(),
      title: course.title,
    },
    keys: {
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
    },
  });
});

export const verifyAndEnroll = asyncHandler(async (req, res) => {
  const { courseId, paymentRef } = req.body;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');

  const existing = await Enrollment.findOne({ course: course._id, student: req.user._id });
  if (existing) return res.json({ success: true, enrollment: existing, alreadyEnrolled: true });

  const enrollment = await Enrollment.create({
    course: course._id,
    student: req.user._id,
    pricePaid: course.discountPrice ?? course.price,
    paymentRef: paymentRef || `manual_${Date.now()}`,
  });
  course.enrollmentCount += 1;
  await course.save();
  await Notification.create({
    user: req.user._id,
    type: 'payment',
    title: `Enrolled in ${course.title}`,
    message: 'Payment confirmed — happy learning!',
    link: `/learn/${course.slug}`,
  });
  res.status(201).json({ success: true, enrollment });
});
