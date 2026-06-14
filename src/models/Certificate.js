import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    serial: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    grade: String,
  },
  { timestamps: true }
);

export default mongoose.model('Certificate', certificateSchema);
