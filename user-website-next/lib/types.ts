/** Mirrors what `/api/public/*` returns. Nothing private is ever in these shapes. */

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  influencerCount?: number;
}

export interface Location {
  country: string;
  state: string;
  city: string;
}

export interface Creator {
  _id: string;
  name: string;
  profileImage: string;
  bio: string;
  social: { instagram?: string; youtube?: string };
  category: Category | null;
  location: Location;
  createdAt: string;
}

/** A package as a visitor sees it: approved only, and with no review trail. */
export interface PublicPackage {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  deliveryDays: number;
  firstApprovedAt: string | null;
}

export interface Stats {
  totalCreators: number;
  totalCities: number;
  totalCategories: number;
  spotlight: Creator[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

export interface LocationOptions {
  countries: string[];
  states: string[];
  cities: string[];
}

/** A package as its owner sees it: every status, plus why a rejection happened. */
export interface OwnPackage extends PublicPackage {
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string;
  updatedAt?: string;
}

/** The signed-in creator's own profile — includes fields never shown publicly. */
export interface OwnProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  profileImage: string;
  status: 'pending' | 'approved' | 'rejected';
  isArchived?: boolean;
  rejectionReason?: string;
  category?: Category | null;
  location?: Location;
  social?: { instagram?: string; youtube?: string };
  createdAt?: string;
}

/** The model caps this; the form disables "Add" rather than letting the API refuse. */
export const MAX_PACKAGES = 12;
