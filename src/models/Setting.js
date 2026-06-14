import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true },
    hero: {
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      mediaType: {
        type: String,
        enum: ['none', 'youtube', 'video', 'image'],
        default: 'none',
      },
      youtubeId: { type: String, default: '' },
      videoUrl: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
