import { asyncHandler } from '../utils/asyncHandler.js';
import { getQuery } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { Category, slugify } from '../models/Category.js';
import { Influencer } from '../models/Influencer.js';
import type { CategoryInput, CategoryListQuery } from '../utils/schemas.js';

/** Admin view: includes inactive categories, plus how many influencers use each. */
export const listCategories = asyncHandler(async (req, res) => {
  const query = getQuery<CategoryListQuery>(req);
  const skip = (query.page - 1) * query.limit;

  const [categories, total] = await Promise.all([
    Category.find().sort({ name: 1 }).skip(skip).limit(query.limit).lean(),
    Category.countDocuments(),
  ]);

  // Count usage only for the categories on this page, not the whole collection.
  const usage = await Influencer.aggregate<{ _id: string; count: number }>([
    { $match: { category: { $in: categories.map((c) => c._id) } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const counts = new Map(usage.map((row) => [String(row._id), row.count]));

  res.json({
    success: true,
    data: categories.map((c) => ({ ...c, influencerCount: counts.get(String(c._id)) ?? 0 })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + categories.length < total,
    },
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const input = req.body as CategoryInput;
  const slug = slugify(input.name);

  if (await Category.findOne({ $or: [{ name: input.name }, { slug }] }).lean()) {
    throw ApiError.conflict('This category already exists');
  }

  const category = await Category.create({ ...input, slug });
  res.status(201).json({ success: true, message: 'Category created', data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const input = req.body as CategoryInput;
  const slug = slugify(input.name);

  const clash = await Category.findOne({
    _id: { $ne: req.params.id },
    $or: [{ name: input.name }, { slug }],
  }).lean();
  if (clash) throw ApiError.conflict('Another category already uses this name');

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { ...input, slug },
    { new: true, runValidators: true },
  );
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, message: 'Category updated', data: category });
});

/**
 * Categories in use are never deleted — that would orphan influencer records.
 * They are deactivated instead, which hides them from new sign-ups.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const inUse = await Influencer.countDocuments({ category: req.params.id });
  if (inUse > 0) {
    throw ApiError.conflict(
      `${inUse} influencer(s) use this category. Deactivate it instead of deleting.`,
    );
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, message: 'Category deleted' });
});
