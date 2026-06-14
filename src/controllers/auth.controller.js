import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
} from '../utils/tokens.js';
import { sendEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(['student', 'teacher']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const issueTokens = (user) => {
  const access = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refresh = signRefreshToken({ sub: user._id.toString() });
  return { access, refresh };
};

export const schemas = { registerSchema, loginSchema };

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const requestedRole = role === 'teacher' ? 'teacher' : 'student';
  const user = new User({
    name,
    email,
    password,
    role: requestedRole,
    isApproved: requestedRole === 'student',
  });
  const verifyToken = user.createEmailVerifyToken();
  await user.save();

  try {
    await sendEmail({
      to: email,
      subject: 'Verify your StudyPath account',
      html: `<p>Hi ${name},</p><p>Welcome to StudyPath. Verify your email with this token:</p><pre>${verifyToken}</pre>`,
    });
  } catch (err) {
    logger.error('Verification email failed to send', err);
  }

  const { access, refresh } = issueTokens(user);
  user.refreshTokens.push(refresh);
  user.lastLoginAt = new Date();
  await user.save();

  res.cookie('refreshToken', refresh, refreshCookieOptions());
  res.status(201).json({
    success: true,
    accessToken: access,
    user: user.toSafeJSON(),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select(
    '+password +refreshTokens'
  );
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (user.isSuspended) throw new ApiError(403, 'Account suspended');

  const ok = await user.comparePassword(password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  if (user.role === 'teacher' && !user.isApproved) {
    throw new ApiError(403, 'Teacher account pending admin approval');
  }

  const { access, refresh } = issueTokens(user);
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refresh];
  user.lastLoginAt = new Date();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = user.streak.lastDay ? new Date(user.streak.lastDay) : null;
  if (last) last.setHours(0, 0, 0, 0);
  if (!last || last.getTime() !== today.getTime()) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    user.streak.count =
      last && last.getTime() === yesterday.getTime() ? user.streak.count + 1 : 1;
    user.streak.lastDay = today;
  }

  await user.save();

  res.cookie('refreshToken', refresh, refreshCookieOptions());
  res.json({ success: true, accessToken: access, user: user.toSafeJSON() });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !(user.refreshTokens || []).includes(token)) {
    throw new ApiError(401, 'Refresh token revoked');
  }

  const { access, refresh: newRefresh } = issueTokens(user);
  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  user.refreshTokens.push(newRefresh);
  await user.save();

  res.cookie('refreshToken', newRefresh, refreshCookieOptions());
  res.json({ success: true, accessToken: access });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub).select('+refreshTokens');
      if (user) {
        user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== token);
        await user.save();
      }
    } catch {
      /* ignore */
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'Token required');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerifyToken: hashed,
    emailVerifyExpires: { $gt: Date.now() },
  }).select('+emailVerifyToken +emailVerifyExpires');
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  res.json({ success: true });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ success: true });
  }
  const token = user.createPasswordResetToken();
  await user.save();
  await sendEmail({
    to: email,
    subject: 'Reset your StudyPath password',
    html: `<p>Use this token to reset your password (valid 30 min):</p><pre>${token}</pre>`,
  });
  res.json({ success: true });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires +refreshTokens');
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();
  res.json({ success: true });
});
