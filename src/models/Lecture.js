import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    sectionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: String,
    order: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ['video', 'youtube', 'pdf', 'article'],
      default: 'video',
    },
    video: { url: String, publicId: String, duration: Number },
    youtubeId: String,
    attachments: [{ name: String, url: String, publicId: String, size: Number }],
    article: String,
    isPreview: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Lecture', lectureSchema);
