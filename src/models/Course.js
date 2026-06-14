import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
    lectures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }],
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    subtitle: { type: String, maxlength: 200 },
    description: { type: String, required: true },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all'],
      default: 'all',
    },
    language: { type: String, default: 'English' },
    thumbnail: { url: String, publicId: String },
    promoVideo: { url: String, publicId: String },
    price: { type: Number, default: 0, min: 0 },
    discountPrice: { type: Number, min: 0 },
    isFree: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: String,
    tags: [{ type: String, lowercase: true, trim: true }],
    requirements: [String],
    outcomes: [String],
    sections: [sectionSchema],
    rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    enrollmentCount: { type: Number, default: 0, index: true },
    totalDuration: { type: Number, default: 0 },
    totalLectures: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courseSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Course', courseSchema);
