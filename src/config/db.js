import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  const uri =
    process.env.NODE_ENV === 'production'
      ? process.env.MONGO_URI_PROD || process.env.MONGO_URI
      : process.env.MONGO_URI;

  if (!uri) throw new Error('MONGO_URI is not configured');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
};
