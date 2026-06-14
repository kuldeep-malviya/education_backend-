import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { uploadsRoot } from './middleware/upload.js';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import courseRoutes from './routes/course.routes.js';
import lectureRoutes from './routes/lecture.routes.js';
import categoryRoutes from './routes/category.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import reviewRoutes from './routes/review.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import settingRoutes from './routes/setting.routes.js';

import { errorHandler, notFound } from './middleware/error.js';

const app = express();

const normalizeOrigin = (value) => value?.trim().replace(/\/+$/, '');

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://education-khaki-xi.vercel.app',
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(','),
]
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      const normalizedOrigin = normalizeOrigin(origin);
      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use('/uploads', express.static(uploadsRoot));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
