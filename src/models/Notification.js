import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'system',
        'course',
        'assignment',
        'quiz',
        'review',
        'announcement',
        'enrollment',
        'payment',
      ],
      default: 'system',
    },
    title: { type: String, required: true },
    message: String,
    link: String,
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
