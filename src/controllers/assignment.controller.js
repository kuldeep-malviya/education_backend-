import { Assignment, Submission } from '../models/Assignment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const ensureCourseOwner = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (user.role !== 'admin' && course.instructor.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Not allowed');
  }
  return course;
};

export const createAssignment = asyncHandler(async (req, res) => {
  await ensureCourseOwner(req.params.courseId, req.user);
  const assignment = await Assignment.create({ ...req.body, course: req.params.courseId });
  res.status(201).json({ success: true, assignment });
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const a = await Assignment.findById(req.params.id);
  if (!a) throw new ApiError(404, 'Assignment not found');
  await ensureCourseOwner(a.course, req.user);
  Object.assign(a, req.body);
  await a.save();
  res.json({ success: true, assignment: a });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const a = await Assignment.findById(req.params.id);
  if (!a) throw new ApiError(404, 'Assignment not found');
  await ensureCourseOwner(a.course, req.user);
  await Submission.deleteMany({ assignment: a._id });
  await a.deleteOne();
  res.json({ success: true });
});

export const listForCourse = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find({
    course: req.params.courseId,
    isPublished: true,
  }).lean();
  res.json({ success: true, assignments });
});

export const submit = asyncHandler(async (req, res) => {
  const a = await Assignment.findById(req.params.id);
  if (!a) throw new ApiError(404, 'Assignment not found');
  const enrolled = await Enrollment.exists({ course: a.course, student: req.user._id });
  if (!enrolled) throw new ApiError(403, 'Enrollment required');

  const submission = await Submission.findOneAndUpdate(
    { assignment: a._id, student: req.user._id },
    {
      assignment: a._id,
      student: req.user._id,
      text: req.body.text,
      files: req.body.files || [],
      submittedAt: new Date(),
      status: 'submitted',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ success: true, submission });
});

export const listSubmissions = asyncHandler(async (req, res) => {
  const a = await Assignment.findById(req.params.id);
  if (!a) throw new ApiError(404, 'Assignment not found');
  await ensureCourseOwner(a.course, req.user);
  const submissions = await Submission.find({ assignment: a._id })
    .populate('student', 'name email avatar')
    .sort('-submittedAt')
    .lean();
  res.json({ success: true, submissions });
});

export const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('assignment');
  if (!submission) throw new ApiError(404, 'Submission not found');
  await ensureCourseOwner(submission.assignment.course, req.user);
  submission.score = req.body.score;
  submission.feedback = req.body.feedback;
  submission.status = 'graded';
  submission.gradedAt = new Date();
  submission.gradedBy = req.user._id;
  await submission.save();
  res.json({ success: true, submission });
});

export const mySubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ student: req.user._id })
    .populate({ path: 'assignment', select: 'title course dueDate maxScore' })
    .sort('-submittedAt')
    .lean();
  res.json({ success: true, submissions });
});
