import mongoose, { Schema, type Model, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ROLE_VALUES, type Role } from '../config/constants.js';

/**
 * Authentication identity — one document per person who can log in.
 * Influencer *profile* data lives in the Influencer model and links back via `user`.
 */
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(plain: string): Promise<boolean>;
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.INFLUENCER, index: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.method('comparePassword', function comparePassword(plain: string) {
  return bcrypt.compare(plain, this.password);
});

userSchema.set('toJSON', {
  transform(_doc, ret) {
    const plain = ret as Partial<Record<keyof IUser | '__v', unknown>>;
    delete plain.password;
    delete plain.__v;
    return plain;
  },
});

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
