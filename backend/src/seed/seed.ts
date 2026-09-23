/**
 * Seeds the admin account, the category master list and a set of demo influencers
 * spread across every status so the dashboard has something real to show.
 *
 * Safe to re-run: categories and the admin are upserted, demo data is replaced.
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Category, slugify } from '../models/Category.js';
import { Influencer } from '../models/Influencer.js';
import { Notification } from '../models/Notification.js';
import { Package } from '../models/Package.js';
import { CREATED_BY, ROLES, STATUS } from '../config/constants.js';

const CATEGORIES = [
  { name: 'Fashion', icon: 'shirt' },
  { name: 'Beauty', icon: 'sparkles' },
  { name: 'Fitness', icon: 'barbell' },
  { name: 'Travel', icon: 'airplane' },
  { name: 'Food', icon: 'restaurant' },
  { name: 'Technology', icon: 'hardware-chip' },
  { name: 'Gaming', icon: 'game-controller' },
  { name: 'Lifestyle', icon: 'leaf' },
  { name: 'Education', icon: 'school' },
  { name: 'Finance', icon: 'trending-up' },
  { name: 'Entertainment', icon: 'musical-notes' },
];

const DEMO = [
  ['Rahul Sharma', 'Fitness', 'India', 'Rajasthan', 'Jaipur', STATUS.APPROVED, 'Strength coach turning desk workers into lifters. 6 years, 40k+ transformations.'],
  ['Priya Singh', 'Fashion', 'India', 'Delhi', 'New Delhi', STATUS.PENDING, 'Everyday styling for Indian body types. Thrift hauls every Sunday.'],
  ['Amit Verma', 'Travel', 'India', 'Maharashtra', 'Mumbai', STATUS.APPROVED, 'Slow travel across the Konkan coast. Budget breakdowns in every video.'],
  ['Sneha Kapoor', 'Beauty', 'India', 'Karnataka', 'Bengaluru', STATUS.APPROVED, 'Dermat-backed skincare. No miracle claims, only ingredient lists.'],
  ['Arjun Mehta', 'Technology', 'India', 'Telangana', 'Hyderabad', STATUS.APPROVED, 'Hands-on reviews of phones under 30k. Bench numbers, not vibes.'],
  ['Neha Joshi', 'Food', 'India', 'Rajasthan', 'Jaipur', STATUS.PENDING, 'Rajasthani home recipes from my grandmother’s handwritten notebook.'],
  ['Karan Malhotra', 'Gaming', 'India', 'Punjab', 'Chandigarh', STATUS.REJECTED, 'Competitive Valorant. Ranked grind streams six nights a week.'],
  ['Ishita Rao', 'Lifestyle', 'India', 'Goa', 'Panaji', STATUS.APPROVED, 'Minimal living, coastal edition. Slow mornings and secondhand furniture.'],
  ['Vikram Nair', 'Finance', 'India', 'Kerala', 'Kochi', STATUS.APPROVED, 'Personal finance in Malayalam and English. SIPs, taxes, no stock tips.'],
  ['Ananya Das', 'Education', 'India', 'West Bengal', 'Kolkata', STATUS.APPROVED, 'NEET biology in 10-minute explainers. 200k students and counting.'],
  ['Rohit Gupta', 'Entertainment', 'India', 'Uttar Pradesh', 'Lucknow', STATUS.APPROVED, 'Sketch comedy about small-town Indian families.'],
  ['Meera Pillai', 'Travel', 'India', 'Tamil Nadu', 'Chennai', STATUS.APPROVED, 'Solo female travel safety guides for South India.'],
] as const;

async function seed(): Promise<void> {
  await connectDatabase();

  // --- Categories (upsert: keeps ids stable across re-runs) ---
  await Promise.all(
    CATEGORIES.map((c) =>
      Category.updateOne(
        { slug: slugify(c.name) },
        { $set: { name: c.name, icon: c.icon, isActive: true, slug: slugify(c.name) } },
        { upsert: true },
      ),
    ),
  );
  const categories = await Category.find().lean();
  const byName = new Map(categories.map((c) => [c.name, c._id]));
  console.log(`[seed] categories ready (${categories.length})`);

  // --- Admin ---
  let admin = await User.findOne({ email: env.seedAdmin.email });
  if (!admin) {
    admin = await User.create({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email,
      password: env.seedAdmin.password,
      role: ROLES.ADMIN,
    });
    console.log(`[seed] admin created -> ${admin.email} / ${env.seedAdmin.password}`);
  } else {
    console.log(`[seed] admin already exists -> ${admin.email}`);
  }

  // --- Demo influencers (replaced each run) ---
  const demoEmails = DEMO.map(([name]) => `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`);
  const stale = await Influencer.find({ email: { $in: demoEmails } }).select('user').lean();
  const staleInfluencerIds = stale.map((s) => s._id);
  const staleUserIds = stale.map((s) => s.user).filter(Boolean);

  // Everything below is scoped to the demo rows. Never widen any of these to
  // deleteMany({}) -- real creators own packages and notifications too, and a
  // reseed must leave their data untouched.
  await Package.deleteMany({ influencer: { $in: staleInfluencerIds } });
  await User.deleteMany({ _id: { $in: staleUserIds } });
  await Influencer.deleteMany({ email: { $in: demoEmails } });

  for (const [index, row] of DEMO.entries()) {
    const [name, categoryName, country, state, city, status, bio] = row;
    const email = demoEmails[index]!;
    const categoryId = byName.get(categoryName);
    if (!categoryId) continue;

    const handle = name.toLowerCase().replace(/\s+/g, '');
    const user = await User.create({ name, email, password: 'Creator@123', role: ROLES.INFLUENCER });

    await Influencer.create({
      user: user._id,
      name,
      email,
      phone: `+9198${String(10000000 + index * 137).slice(0, 8)}`,
      bio,
      profileImage: '',
      social: { instagram: `https://instagram.com/${handle}`, youtube: `https://youtube.com/@${handle}` },
      category: categoryId,
      location: { country, state, city },
      status,
      createdBy: CREATED_BY.SELF,
      ...(status !== STATUS.PENDING ? { reviewedBy: admin._id, reviewedAt: new Date() } : {}),
      ...(status === STATUS.REJECTED ? { rejectionReason: 'Audience could not be verified.' } : {}),
    });
  }
  console.log(`[seed] demo influencers created (${DEMO.length}), password: Creator@123`);

  // Packages across every status, so the review queue and a public profile both have
  // something real to show on first run.
  const withPackages = await Influencer.find({ email: { $in: demoEmails.slice(0, 4) } })
    .select('_id')
    .lean();

  const PACKAGES = [
    { title: 'Instagram Reel', description: 'One 30-second reel, scripted and shot by me.', price: 3000, deliveryDays: 5, status: STATUS.APPROVED },
    { title: 'Instagram Story set', description: 'Three connected stories with a swipe-up.', price: 1200, deliveryDays: 2, status: STATUS.APPROVED },
    { title: 'YouTube integration', description: '60-second segment inside a long-form video.', price: 12000, deliveryDays: 10, status: STATUS.PENDING },
    { title: 'Dedicated YouTube video', description: 'A full video built around your product.', price: 35000, deliveryDays: 14, status: STATUS.REJECTED },
  ] as const;

  let packageCount = 0;
  for (const [index, influencer] of withPackages.entries()) {
    // Give each of the first few influencers a different slice, so the seed is not
    // four identical profiles.
    for (const spec of PACKAGES.slice(0, index + 1)) {
      await Package.create({
        influencer: influencer._id,
        title: spec.title,
        description: spec.description,
        price: spec.price,
        currency: 'INR',
        deliveryDays: spec.deliveryDays,
        status: spec.status,
        ...(spec.status !== STATUS.PENDING
          ? { reviewedBy: admin._id, reviewedAt: new Date() }
          : {}),
        ...(spec.status === STATUS.APPROVED ? { firstApprovedAt: new Date() } : {}),
        ...(spec.status === STATUS.REJECTED
          ? { rejectionReason: 'Price needs to match your media kit.' }
          : {}),
      });
      packageCount += 1;
    }
  }
  console.log(`[seed] packages created (${packageCount})`);

  // One archived record, so the archive screen is not empty on first run.
  const toArchive = await Influencer.findOne({ email: demoEmails[11] });
  if (toArchive) {
    toArchive.isArchived = true;
    toArchive.archivedAt = new Date();
    await toArchive.save();
    console.log('[seed] archived 1 influencer for demo');
  }

  // Notifications pointing at the demo influencers we just replaced would dangle,
  // so drop those — but only those. A real user's inbox is their own data.
  const { deletedCount } = await Notification.deleteMany({
    $or: [{ influencer: { $in: staleInfluencerIds } }, { recipient: { $in: staleUserIds } }],
  });
  if (deletedCount) console.log(`[seed] cleared ${deletedCount} stale notification(s)`);

  await disconnectDatabase();
  console.log('\n[seed] done.');
  console.log(`      admin: ${env.seedAdmin.email} / ${env.seedAdmin.password}`);
  console.log(`      influencer: ${demoEmails[0]} / Creator@123`);
}

seed().catch(async (err: unknown) => {
  console.error('[seed] failed:', err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
