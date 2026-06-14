import { Quiz, QuizAttempt } from '../models/Quiz.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

const stripAnswers = (quiz) => ({
  ...quiz,
  questions: (quiz.questions || []).map((q) => ({
    _id: q._id,
    text: q.text,
    points: q.points,
    options: q.options.map((o) => ({ _id: o._id, text: o.text })),
  })),
});

export const createQuiz = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not allowed');
  }
  const quiz = await Quiz.create({ ...req.body, course: courseId });
  res.status(201).json({ success: true, quiz });
});

export const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  const course = await Course.findById(quiz.course);
  if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not allowed');
  }
  Object.assign(quiz, req.body);
  await quiz.save();
  res.json({ success: true, quiz });
});

export const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  const course = await Course.findById(quiz.course);
  if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not allowed');
  }
  await quiz.deleteOne();
  res.json({ success: true });
});

export const listForCourse = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ course: req.params.courseId, isPublished: true })
    .select('title description durationMinutes passingScore questions')
    .lean();
  res.json({ success: true, quizzes: quizzes.map(stripAnswers) });
});

export const startQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz || !quiz.isPublished) throw new ApiError(404, 'Quiz not found');
  const enrolled = await Enrollment.exists({
    course: quiz.course,
    student: req.user._id,
  });
  if (!enrolled && req.user.role === 'student') throw new ApiError(403, 'Enrollment required');
  res.json({ success: true, quiz: stripAnswers(quiz) });
});

export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers, durationSeconds } = req.body;
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');

  let score = 0;
  let total = 0;
  const normalised = (answers || []).map((a) => ({
    questionId: a.questionId,
    selected: Array.isArray(a.selected) ? a.selected : [a.selected].filter((v) => v != null),
  }));

  for (const q of quiz.questions) {
    total += q.points || 1;
    const a = normalised.find((x) => x.questionId?.toString() === q._id.toString());
    if (!a) continue;
    const correctIdx = q.options
      .map((o, i) => (o.isCorrect ? i : -1))
      .filter((i) => i >= 0);
    const same =
      a.selected.length === correctIdx.length &&
      a.selected.every((s) => correctIdx.includes(s));
    if (same) score += q.points || 1;
  }

  const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
  const attempt = await QuizAttempt.create({
    quiz: quiz._id,
    student: req.user._id,
    answers: normalised,
    score,
    total,
    percentage,
    passed: percentage >= quiz.passingScore,
    durationSeconds,
  });
  res.json({ success: true, attempt });
});

export const myAttempts = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ student: req.user._id })
    .populate('quiz', 'title course')
    .sort('-createdAt')
    .lean();
  res.json({ success: true, attempts });
});
