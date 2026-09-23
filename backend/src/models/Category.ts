import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** Master data, so the directory filters on ids instead of free text. */
export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    icon: { type: String, default: 'sparkles' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function buildSlug(next) {
  if (this.name && !this.slug) this.slug = slugify(this.name);
  next();
});

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);
