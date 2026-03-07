
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
export type TicketTypeStatus = boolean; // true = ACTIVE, false = INACTIVE
export type OrderStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type TicketStatus = 'ISSUED' | 'USED' | 'CANCELLED' | 'REFUNDED';

export const UserRole = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  ORGANIZER: 'ORGANIZER',
  ATTENDEE: 'ATTENDEE'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const normalizeUserRole = (role: unknown): UserRole | null => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ATTENDEE') return UserRole.ATTENDEE;
  if (normalized === 'USER') return UserRole.ORGANIZER;
  if (
    normalized === UserRole.ADMIN ||
    normalized === UserRole.STAFF ||
    normalized === UserRole.ORGANIZER ||
    normalized === UserRole.ATTENDEE
  ) {
    return normalized as UserRole;
  }
  return null;
};

export interface OrganizerProfile {
  organizerId: string;
  ownerUserId?: string;
  organizerName: string;
  websiteUrl?: string | null;
  bio?: string | null;
  eventPageDescription?: string | null;
  facebookId?: string | null;
  twitterHandle?: string | null;
  emailOptIn: boolean;
  profileImageUrl?: string | null;
  followersCount: number;
  eventsHostedCount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HitPaySettings {
  enabled: boolean;
  mode?: 'sandbox' | 'live' | null;
  hitpayApiKey?: string | null;
  hitpaySalt?: string | null;
  maskedHitpayApiKey?: string | null;
  maskedHitpaySalt?: string | null;
  isConfigured?: boolean;
  updatedAt?: string | null;
}

export interface HitPaySettingsResponse {
  backendReady: boolean;
  settings: HitPaySettings | null;
}

export interface AdminPlan {
  planId: string;
  name: string;
  slug?: string | null;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  trialDays: number;
  isDefault: boolean;
  isRecommended: boolean;
  isActive: boolean;
  features: {
    aiIntegration: boolean;
    branding: boolean;
    weddingSuppliers: boolean;
  };
  limits: {
    users: number | string;
    projects: number | string;
    contacts: number | string;
    accounts: number | string;
    storage: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  eventId: string;
  slug: string;
  eventName: string;
  description: string;
  startAt: string; // ISO timestamp
  endAt?: string; // ISO timestamp
  timezone?: string;
  locationType: 'ONSITE' | 'ONLINE' | 'HYBRID';
  locationText: string;
  capacityTotal: number;
  regOpenAt?: string; // date string
  regCloseAt?: string; // date string
  status: EventStatus;
  streamingPlatform?: string;

  // Audit fields from DB
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
  organizerId?: string | null;
  organizer?: OrganizerProfile | null;
  likesCount?: number;

  // Relations
  ticketTypes: TicketType[];

  // DB is jsonb, so it could be a string URL, or an object { url: '...' }
  imageUrl?: string | { url?: string; path?: string } | any;
}

export interface TicketType {
  ticketTypeId: string;
  eventId: string;
  name: string;
  description?: string;
  priceAmount: number;
  currency: string;
  quantityTotal: number;
  quantitySold: number;
  salesStartAt?: string;
  salesEndAt?: string;
  status: TicketTypeStatus;
  created_at?: string;
  updated_at?: string;
  createdBy?: string;
}

export interface Order {
  orderId: string;
  eventId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  metadata?: any;
  expiresAt?: string;
  createdAt: string;
  eventName?: string;
  locationType?: 'ONSITE' | 'ONLINE' | 'HYBRID' | null;
  locationText?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  streamingPlatform?: string | null;
  supportEmail?: string;
  organizerName?: string;
}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  ticketTypeId: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface Attendee {
  attendeeId: string;
  eventId: string;
  orderId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  notes?: string;
  consent: boolean;
  createdAt: string;
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  ticketTypeId: string;
  orderId: string;
  attendeeId: string;
  ticketCode: string;
  qrPayload: string;
  status: TicketStatus;
  issuedAt: string;
  usedAt?: string;
}

// Helper interface for the UI to display joined data (similar to the old Registration type)
export interface RegistrationView {
  id: string; // Ticket ID or Attendee ID depending on context
  ticketCode: string;
  qrPayload?: string;
  eventId: string;
  eventName: string;
  locationType?: 'ONSITE' | 'ONLINE' | 'HYBRID' | null;
  locationText?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  attendeeCompany?: string;
  ticketName: string;
  status: TicketStatus;
  paymentStatus: OrderStatus;
  orderId: string;
  amountPaid: number;
  currency: string;
  streamingPlatform?: string | null;
  checkInTimestamp?: string;
}

export interface AnalyticsSummary {
  totalRegistrations: number;
  ticketsSoldToday: number;
  totalRevenue: number;
  revenueToday: number;
  attendanceRate: number;
  paymentSuccessRate: number;
}
