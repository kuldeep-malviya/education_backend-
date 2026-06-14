import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Course from '../models/Course.js';
import Lecture from '../models/Lecture.js';
import { slugify } from './slug.js';
import { logger } from './logger.js';

const categoriesSeed = [
  { name: 'Web Development', icon: 'Code', color: '#2563eb', isFeatured: true },
  { name: 'Data Science', icon: 'BarChart3', color: '#0ea5e9', isFeatured: true },
  { name: 'Design', icon: 'Palette', color: '#ec4899' },
  { name: 'Business', icon: 'Briefcase', color: '#f97316' },
  { name: 'Marketing', icon: 'Megaphone', color: '#10b981' },
  { name: 'Mobile Apps', icon: 'Smartphone', color: '#06b6d4' },
];

const usersSeed = [
  {
    name: 'StudyPath Admin',
    email: 'kuldeepmalviya0277@gmail.com',
    password: 'Kuldeep@123',
    role: 'admin',
    isEmailVerified: true,
    headline: 'Platform administrator',
  },
  {
    name: 'Prof. Akanksha Dubey',
    email: 'akanksha@edugyaan.app',
    password: 'teacher12345',
    role: 'teacher',
    isApproved: true,
    isEmailVerified: true,
    headline: 'Computer Architecture specialist',
    bio: 'Teaches COA and digital systems with 8 years of experience.',
  },
  {
    name: 'Prof. Amit Sharma',
    email: 'amit@edugyaan.app',
    password: 'teacher12345',
    role: 'teacher',
    isApproved: true,
    isEmailVerified: true,
    headline: 'Operating Systems & Linux',
    bio: 'OS internals, kernel programming, distributed systems.',
  },
  {
    name: 'Shaikh Rajput',
    email: 'student@edugyaan.app',
    password: 'student12345',
    role: 'student',
    isEmailVerified: true,
  },
];

const courseTemplates = (instructorMap, categoryMap) => [
  {
    title: 'Complete HTML, CSS & JavaScript Bootcamp',
    subtitle: 'Build modern, responsive websites from scratch',
    description:
      'Master the fundamentals of front-end development. Includes hands-on projects, layout systems, and modern JavaScript.',
    instructor: instructorMap['amit@edugyaan.app'],
    category: categoryMap['web-development'],
    level: 'beginner',
    price: 0,
    isFree: true,
    tags: ['html', 'css', 'javascript'],
    thumbnail: {
      url: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1280',
    },
    outcomes: [
      'Build responsive websites',
      'Use Flexbox and Grid confidently',
      'Write modern ES2022 JavaScript',
    ],
    requirements: ['A computer with internet', 'Basic typing skills'],
  }
];

const run = async () => {
  await connectDB();
  logger.info('Clearing existing data');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Course.deleteMany({}),
    Lecture.deleteMany({}),
  ]);

  logger.info('Seeding categories');
  const categories = await Category.insertMany(
    categoriesSeed.map((c) => ({ ...c, slug: slugify(c.name) }))
  );
  const categoryMap = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

  logger.info('Seeding users');
  const users = [];
  for (const u of usersSeed) {
    const user = new User(u);
    await user.save();
    users.push(user);
  }
  const instructorMap = Object.fromEntries(users.map((u) => [u.email, u._id]));

  logger.info('Seeding courses');
  for (const template of courseTemplates(instructorMap, categoryMap)) {
    const slug = slugify(template.title);
    const course = await Course.create({
      ...template,
      slug,
      isPublished: true,
      approvalStatus: 'approved',
      isFeatured: true,
    });

    course.sections.push({ title: 'Introduction', order: 0 });
    course.sections.push({ title: 'Core concepts', order: 1 });
    await course.save();

    const lectures = await Lecture.insertMany([
      {
        course: course._id,
        sectionId: course.sections[0]._id,
        title: 'Welcome & roadmap',
        type: 'youtube',
        youtubeId: 'qz0aGYrrlhU',
        isPreview: true,
        order: 0,
        video: { duration: 480 },
      },
      {
        course: course._id,
        sectionId: course.sections[0]._id,
        title: 'How to use this course',
        type: 'youtube',
        youtubeId: 'qz0aGYrrlhU',
        order: 1,
        video: { duration: 360 },
      },
      {
        course: course._id,
        sectionId: course.sections[1]._id,
        title: 'Fundamentals — part 1',
        type: 'youtube',
        youtubeId: 'qz0aGYrrlhU',
        order: 0,
        video: { duration: 720 },
      },
    ]);

    course.sections[0].lectures.push(lectures[0]._id, lectures[1]._id);
    course.sections[1].lectures.push(lectures[2]._id);
    course.totalLectures = lectures.length;
    course.totalDuration = lectures.reduce((s, l) => s + (l.video?.duration || 0), 0);
    await course.save();
  }

  logger.info('Seed complete. Logins:');
  logger.info('  kuldeepmalviya0277@gmail.com / Kuldeep@123');
  logger.info('  amit@edugyaan.app / teacher12345');
  logger.info('  student@edugyaan.app / student12345');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
