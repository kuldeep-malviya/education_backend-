export const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const uniqueSlug = async (Model, base) => {
  let slug = slugify(base);
  if (!slug) slug = 'item';
  let candidate = slug;
  let i = 1;
  while (await Model.exists({ slug: candidate })) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  return candidate;
};
