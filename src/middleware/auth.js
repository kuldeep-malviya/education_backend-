import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';
import User from '../models/User.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');
  if (user.isSuspended) throw new ApiError(403, 'Account suspended');

  req.user = user;
  next();
});

export const requireRoles = (...roles) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Requires role: ${roles.join(', ')}`);
    }
    next();
  });

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = await User.findById(payload.sub);
  } catch {
    /* ignore */
  }
  next();
});
