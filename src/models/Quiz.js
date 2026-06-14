import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    options: [{ text: String, isCorrect: Boolean }],
    explanation: String,
    points: { type: Number, default: 1 },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: String,
    durationMinutes: { type: Number, default: 10 },
    passingScore: { type: Number, default: 60 },
    questions: [questionSchema],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, selected: [Number] }],
    score: Number,
    total: Number,
    percentage: Number,
    passed: Boolean,
    durationSeconds: Number,
  },
  { timestamps: true }
);

export const Quiz = mongoose.model('Quiz', quizSchema);
export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
