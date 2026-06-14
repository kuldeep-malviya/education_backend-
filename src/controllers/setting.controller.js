import Setting from '../models/Setting.js';
import { asyncHandler } from '../utils/ApiError.js';

const getOrCreate = async () => {
  let setting = await Setting.findOne({ singleton: 'main' });
  if (!setting) setting = await Setting.create({ singleton: 'main' });
  return setting;
};

export const getSettings = asyncHandler(async (_req, res) => {
  const setting = await getOrCreate();
  res.json({ success: true, settings: setting });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const setting = await getOrCreate();
  const { hero } = req.body;
  if (hero) {
    const fields = ['title', 'subtitle', 'mediaType', 'youtubeId', 'videoUrl', 'imageUrl'];
    for (const f of fields) {
      if (hero[f] !== undefined) setting.hero[f] = hero[f];
    }
  }
  await setting.save();
  res.json({ success: true, settings: setting });
});
