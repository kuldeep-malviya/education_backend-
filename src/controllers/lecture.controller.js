import Course from '../models/Course.js';
import Lecture from '../models/Lecture.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const requireOwnerOrAdmin = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (
    user.role !== 'admin' &&
    course.instructor.toString() !== user._id.toString()
  ) {
    throw new ApiError(403, 'Not allowed');
  }
  return course;
};

const recomputeCourseStats = async (course) => {
  const lectures = await Lecture.find({ course: course._id }).select('video.duration');
  course.totalLectures = lectures.length;
  course.totalDuration = lectures.reduce(
    (s, l) => s + (l.video?.duration || 0),
    0
  );
  await course.save();
};

export const createLecture = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await requireOwnerOrAdmin(courseId, req.user);
  const { title, sectionId, type, description, isPreview, video, youtubeId, article, attachments } =
    req.body;
  if (!sectionId) throw new ApiError(400, 'sectionId required');
  const section = course.sections.id(sectionId);
  if (!section) throw new ApiError(404, 'Section not found');

  const lecture = await Lecture.create({
    course: course._id,
    sectionId,
    title,
    type: type || 'video',
    description,
    isPreview: !!isPreview,
    order: section.lectures.length,
    video,
    youtubeId,
    article,
    attachments,
  });
  section.lectures.push(lecture._id);
  await course.save();
  await recomputeCourseStats(course);
  res.status(201).json({ success: true, lecture });
});

export const updateLecture = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  const course = await requireOwnerOrAdmin(lecture.course, req.user);
  const editable = [
    'title',
    'description',
    'type',
    'isPreview',
    'order',
    'video',
    'youtubeId',
    'article',
    'attachments',
  ];
  for (const k of editable) {
    if (req.body[k] !== undefined) lecture[k] = req.body[k];
  }
  await lecture.save();
  await recomputeCourseStats(course);
  res.json({ success: true, lecture });
});

export const deleteLecture = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  const course = await requireOwnerOrAdmin(lecture.course, req.user);
  const section = course.sections.id(lecture.sectionId);
  if (section) {
    section.lectures = section.lectures.filter(
      (id) => id.toString() !== lecture._id.toString()
    );
  }
  await course.save();
  await lecture.deleteOne();
  await recomputeCourseStats(course);
  res.json({ success: true });
});

export const getLecture = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new ApiError(404, 'Lecture not found');

  if (!lecture.isPreview) {
    if (!req.user) throw new ApiError(401, 'Enrollment required');
    if (req.user.role !== 'admin') {
      const isOwner =
        (await Course.exists({ _id: lecture.course, instructor: req.user._id })) !== null;
      const isEnrolled =
        (await Enrollment.exists({ course: lecture.course, student: req.user._id })) !==
        null;
      if (!isOwner && !isEnrolled) throw new ApiError(403, 'Enrollment required');
    }
  }

  res.json({ success: true, lecture });
});

export const markComplete = asyncHandler(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  if (!lecture) throw new ApiError(404, 'Lecture not found');
  const enrollment = await Enrollment.findOne({
    course: lecture.course,
    student: req.user._id,
  });
  if (!enrollment) throw new ApiError(403, 'Not enrolled');

  if (!enrollment.completedLectures.some((id) => id.toString() === lecture._id.toString())) {
    enrollment.completedLectures.push(lecture._id);
  }
  enrollment.lastLecture = lecture._id;

  const course = await Course.findById(lecture.course).select('totalLectures');
  const total = course?.totalLectures || 1;
  enrollment.progress = Math.min(
    100,
    Math.round((enrollment.completedLectures.length / total) * 100)
  );
  if (enrollment.progress === 100 && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
  }
  await enrollment.save();
  res.json({ success: true, enrollment });
});
