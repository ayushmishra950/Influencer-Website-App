export type Status = 'pending' | 'approved' | 'rejected';
export type Role = 'admin' | 'influencer';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  isActive: boolean;
}

export interface Location {
  country: string;
  state: string;
  city: string;
}

export interface Social {
  instagram: string;
  youtube: string;
}

/** What the public directory returns — a deliberately reduced projection. */
export interface DirectoryInfluencer {
  _id: string;
  name: string;
  profileImage: string;
  bio: string;
  social: Social;
  category: Category | null;
  location: Location;
  createdAt: string;
}

/** The signed-in influencer's own record, which carries the verification fields too. */
export interface MyProfile extends DirectoryInfluencer {
  email: string;
  phone: string;
  status: Status;
  rejectionReason: string;
  isArchived: boolean;
  canLogin: boolean;
  updatedAt: string;
}

export interface Package {
  _id: string;
  influencer: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  deliveryDays: number;
  status: Status;
  rejectionReason: string;
  firstApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The public projection carries no review fields. */
export type PublicPackage = Pick<
  Package,
  '_id' | 'title' | 'description' | 'price' | 'currency' | 'deliveryDays' | 'firstApprovedAt'
>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paged<T> {
  success: boolean;
  data: T[];
  meta: PageMeta;
}

export interface DirectoryFilters {
  q: string;
  category: string;
  country: string;
  state: string;
  city: string;
}
