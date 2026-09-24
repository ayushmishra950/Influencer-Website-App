import type { FilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Influencer, type IInfluencer } from '../models/Influencer.js';
import { Category } from '../models/Category.js';
import { getQuery } from '../middleware/validate.js';
import { directorySort } from '../utils/sort.js';
import type { PublicListQuery } from '../utils/schemas.js';

const PUBLIC_FIELDS = 'name profileImage bio social category location createdAt';

/** Escapes user input before it becomes part of a RegExp. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildDirectoryFilter(query: PublicListQuery): FilterQuery<IInfluencer> {
  const filter: FilterQuery<IInfluencer> = Influencer.publicFilter();

  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { bio: rx }, { 'location.city': rx }];
  }
  if (query.category) filter.category = query.category;
  if (query.country) filter['location.country'] = query.country;
  if (query.state) filter['location.state'] = query.state;
  if (query.city) filter['location.city'] = query.city;

  return filter;
}

/** Public directory. Only approved, non-archived influencers are ever returned. */
export const listInfluencers = asyncHandler(async (req, res) => {
  const query = getQuery<PublicListQuery>(req);
  const filter = buildDirectoryFilter(query);
  const skip = (query.page - 1) * query.limit;
  const sort = directorySort(query.sort);

  const [items, total] = await Promise.all([
    Influencer.find(filter)
      .select(PUBLIC_FIELDS)
      .populate('category', 'name slug icon')
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Influencer.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + items.length < total,
    },
  });
});

export const getInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findOne({
    _id: req.params.id,
    ...Influencer.publicFilter(),
  })
    .select(PUBLIC_FIELDS)
    .populate('category', 'name slug icon')
    .lean();

  if (!influencer) throw ApiError.notFound('Influencer not found');
  res.json({ success: true, data: influencer });
});

/**
 * Categories with how many *publicly visible* influencers each holds, so the landing
 * page can show real counts and hide categories that would open onto an empty list.
 */
export const listCategories = asyncHandler(async (_req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ name: 1 }).lean(),
    Influencer.aggregate<{ _id: string; count: number }>([
      { $match: Influencer.publicFilter() },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const byId = new Map(counts.map((row) => [String(row._id), row.count]));
  res.json({
    success: true,
    data: categories.map((c) => ({ ...c, influencerCount: byId.get(String(c._id)) ?? 0 })),
  });
});

/** Headline numbers and a small spotlight set — everything the landing page opens with. */
export const getPublicStats = asyncHandler(async (_req, res) => {
  const base = Influencer.publicFilter();

  const [total, cities, categories, spotlight] = await Promise.all([
    Influencer.countDocuments(base),
    Influencer.distinct('location.city', base),
    Influencer.distinct('category', base),
    // Newest approved creators, with enough detail to render a rich card. A wider
    // slice than the landing page shows, because of the re-order below.
    Influencer.find(base)
      .select(PUBLIC_FIELDS)
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(24)
      .lean(),
  ]);

  // Profiles with a photo lead. A row of initials reads as an empty directory, and the
  // newest creator is not necessarily the one worth putting a face to first. Sort is
  // stable, so within each group the newest is still first.
  const featured = [...spotlight]
    .sort((a, b) => (a.profileImage ? 0 : 1) - (b.profileImage ? 0 : 1))
    .slice(0, 8);

  res.json({
    success: true,
    data: {
      totalCreators: total,
      totalCities: cities.length,
      totalCategories: categories.length,
      spotlight: featured,
    },
  });
});

/**
 * Location options for the filter bar, derived from live approved data so the
 * dropdowns never offer a place with no influencers in it.
 */
export const listLocations = asyncHandler(async (req, res) => {
  const { country, state } = req.query as { country?: string; state?: string };
  const base = Influencer.publicFilter();

  const [countries, states, cities] = await Promise.all([
    Influencer.distinct('location.country', base),
    country ? Influencer.distinct('location.state', { ...base, 'location.country': country }) : [],
    country && state
      ? Influencer.distinct('location.city', {
          ...base,
          'location.country': country,
          'location.state': state,
        })
      : [],
  ]);

  res.json({
    success: true,
    data: {
      countries: countries.sort(),
      states: states.sort(),
      cities: cities.sort(),
    },
  });
});
