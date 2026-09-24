export type Status = 'pending' | 'approved' | 'rejected';
/** An enquiry is not approved or rejected -- it is contacted or closed. */
export type EnquiryStatus = 'new' | 'contacted' | 'closed';
export type Role = 'admin' | 'influencer';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  isActive: boolean;
  influencerCount?: number;
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

export interface Influencer {
  _id: string;
  user: string | null;
  name: string;
  email: string;
  phone: string;
  profileImage: string;
  bio: string;
  social: Social;
  category: Category | null;
  location: Location;
  status: Status;
  rejectionReason: string;
  reviewedBy: { _id: string; name: string; email: string } | null;
  reviewedAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdBy: 'self' | 'admin';
  createdAt: string;
  updatedAt: string;
}

/** The dashboard's `recent` rows are projected, so they carry fewer fields than a full Influencer. */
export type RecentInfluencer = Pick<
  Influencer,
  '_id' | 'name' | 'email' | 'profileImage' | 'status' | 'location' | 'createdAt'
> & {
  category: { _id: string; name: string } | null;
};

export interface Package {
  _id: string;
  influencer: Pick<Influencer, '_id' | 'name' | 'email' | 'profileImage' | 'status' | 'isArchived'> | null;
  title: string;
  description: string;
  price: number;
  currency: string;
  deliveryDays: number;
  status: Status;
  rejectionReason: string;
  reviewedBy: { _id: string; name: string } | null;
  reviewedAt: string | null;
  firstApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
  pendingPackages: number;
  newEnquiries: number;
  recent: RecentInfluencer[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface InfluencerFilters {
  q: string;
  status: Status | 'all';
  archived: 'true' | 'false' | 'all';
  category: string;
  country: string;
  state: string;
  city: string;
  page: number;
  limit: number;
  sort: 'recent' | 'name';
}

export type BulkAction = 'approve' | 'reject' | 'archive' | 'restore' | 'delete';

/**
 * A campaign enquiry from the public website.
 *
 * Not a user: whoever filled the form in is a brand, so their contact details live on
 * the record itself. Only `status` and `note` are ours to change.
 */
export interface Enquiry {
  _id: string;
  who: string;
  budget: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  status: EnquiryStatus;
  note: string;
  handledBy: { _id: string; name: string } | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryFilters {
  status: EnquiryStatus | 'all';
  q: string;
  page: number;
  limit: number;
}
