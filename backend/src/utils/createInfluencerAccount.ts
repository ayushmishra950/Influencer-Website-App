import { User } from '../models/User.js';
import { Influencer } from '../models/Influencer.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, type CreatedBy, type Status } from '../config/constants.js';
import type { HydratedDocument } from 'mongoose';
import type { IInfluencer } from '../models/Influencer.js';

export interface CreateAccountInput {
  name: string;
  email: string;
  password?: string | undefined;
  phone?: string;
  bio?: string;
  profileImage?: string;
  social?: { instagram: string; youtube: string };
  audience?: { instagram: number; youtube: number };
  /** Free text left at signup, for the reviewer. */
  message?: string;
  category: string;
  location: { country: string; state: string; city: string };
  status: Status;
  createdBy: CreatedBy;
}

/**
 * Creates the login identity and the profile as one logical unit.
 *
 * Deliberately NOT a Mongo transaction: those require a replica set, which a plain
 * local `mongod` is not. Instead the User is rolled back by hand if the profile fails —
 * there is exactly one compensating action, so this stays simple and runs anywhere.
 */
export async function createInfluencerAccount(
  input: CreateAccountInput,
): Promise<HydratedDocument<IInfluencer>> {
  const [existingUser, existingProfile, category] = await Promise.all([
    User.findOne({ email: input.email }).lean(),
    Influencer.findOne({ email: input.email }).lean(),
    Category.findById(input.category).lean(),
  ]);

  if (existingUser || existingProfile) throw ApiError.conflict('This email is already registered');
  if (!category) throw ApiError.badRequest('Select a valid category');

  // A listing with no password is directory-only: it appears publicly but cannot log in.
  const user = input.password
    ? await User.create({
        name: input.name,
        email: input.email,
        password: input.password,
        role: ROLES.INFLUENCER,
      })
    : null;

  try {
    return await Influencer.create({
      user: user?._id ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone ?? '',
      bio: input.bio ?? '',
      profileImage: input.profileImage ?? '',
      social: input.social ?? { instagram: '', youtube: '' },
      audience: input.audience ?? { instagram: 0, youtube: 0 },
      message: input.message ?? '',
      category: input.category,
      location: input.location,
      status: input.status,
      createdBy: input.createdBy,
    });
  } catch (err) {
    if (user) await User.deleteOne({ _id: user._id }).catch(() => undefined);
    throw err;
  }
}
