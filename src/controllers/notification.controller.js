import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/ApiError.js';

export const list = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id })
    .sort('-createdAt')
    .limit(50)
    .lean();
  const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ success: true, items, unread });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true }
  );
  res.json({ success: true });
});
