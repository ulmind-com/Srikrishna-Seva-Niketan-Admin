/** Domain model types mirroring the backend Beanie documents. */

export interface ImageAsset {
  url: string;
  public_id?: string | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  alt?: string | null;
}

export interface FileAsset {
  url: string;
  public_id?: string | null;
  resource_type?: string | null;
  format?: string | null;
  bytes?: number | null;
  original_filename?: string | null;
}

export interface SEOMeta {
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string[];
  canonical_url?: string | null;
  og_image?: string | null;
  schema_markup?: string | null;
}

export interface BaseDoc {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export type ContentStatus = "draft" | "published" | "archived";
export type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";
export type RentalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "returned"
  | "cancelled";
export type ApplicationStatus =
  | "received"
  | "shortlisted"
  | "interview"
  | "rejected"
  | "hired";
export type ContactStatus = "new" | "read" | "replied" | "closed";

export interface User extends BaseDoc {
  name: string;
  email: string;
  phone?: string | null;
  avatar?: ImageAsset | null;
  role: string;
  extra_permissions: string[];
  /** Effective permission set (role + direct grants) from auth endpoints. */
  permissions?: string[];
  location_ids: string[];
  is_active: boolean;
  is_superuser: boolean;
  last_login_at?: string | null;
}

export interface Location extends BaseDoc {
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  order: number;
}

export type Gender = "male" | "female" | "other";
export type EmployeeStatus = "available" | "assigned" | "on_leave" | "inactive";

export interface Employee extends BaseDoc {
  code: string;
  name: string;
  phone: string;
  alt_phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  category: string;
  gender?: Gender | null;
  experience?: string | null;
  photo?: ImageAsset | null;
  signature?: ImageAsset | null;
  id_proof?: ImageAsset | null;
  id_proof_type?: string | null;
  id_proof_number?: string | null;
  location_id: string;
  status: EmployeeStatus;
  rating: number;
  daily_rate?: number | null;
  join_date?: string | null;
  notes?: string | null;
  is_active: boolean;

  // ---- Staff-portal fields (null for admin-created employees) ----
  email?: string | null;
  dob?: string | null;
  designation?: string | null;
  hrms_code?: string | null;
  work_history?: string | null;
  previous_employer?: string | null;
  verification_status: StaffVerificationStatus;
  submitted_at?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  document_verification?: {
    isVerified?: boolean;
    confidenceScore?: number;
    idNumberMatched?: boolean;
    nameMatched?: boolean;
    photoMatched?: boolean;
    fraudRisk?: "low" | "medium" | "high";
    fraudFlags?: string[];
    summary?: string;
    verifiedAt?: string;
  } | null;
}

/** Lifecycle of a self-registered staff member's onboarding. */
export type StaffVerificationStatus = "draft" | "pending" | "verified" | "rejected";

/** Per-branch staff counts powering the location-wise overview. */
export interface LocationStaffStat {
  location_id: string;
  location_name: string;
  location_code: string;
  city?: string | null;
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  draft: number;
  active: number;
  working?: number;
  available?: number;
  revenue?: number;
}

/** A branch as exposed to the (unauthenticated) staff signup form. */
export interface StaffBranchOption {
  id: string;
  name: string;
  code: string;
  city?: string | null;
}

export type CareType = "home" | "nursing_home" | "hospital";

export interface Customer extends BaseDoc {
  code: string;
  name: string;
  phone: string;
  alt_phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  id_proof?: ImageAsset | null;
  id_proof_type?: string | null;
  id_proof_number?: string | null;
  care_type: CareType;
  service_label?: string | null;
  duration_days?: number | null;
  one_to_one: boolean;
  location_id: string;
  /** Map pin — admin-set or geocoded from the address. */
  lat?: number | null;
  lng?: number | null;
  billing_rate?: number | null;
  notes?: string | null;
  is_active: boolean;
}

export type ShiftType = "day" | "night" | "full_24h" | "custom";
export type AssignmentStatus = "scheduled" | "active" | "completed" | "cancelled";

export type AssignmentPlace = "home" | "hospital" | "nursing_home" | "other";

export type AcceptanceStatus = "pending" | "accepted" | "declined";

export interface Assignment extends BaseDoc {
  customer_id: string;
  customer_name: string;
  employee_id: string;
  employee_name: string;
  location_id: string;
  place_type: AssignmentPlace;
  place_name?: string | null;
  address?: string | null;
  shift: ShiftType;
  start_date: string;
  end_date?: string | null;
  /** Write-only convenience input — the backend turns it into end_date. */
  duration_days?: number | null;
  status: AssignmentStatus;
  /** Nurse's response to the posting. */
  acceptance_status?: AcceptanceStatus;
  accepted_at?: string | null;
  declined_at?: string | null;
  decline_reason?: string | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  customer_rate?: number | null;
  employee_payout?: number | null;
  other_expense?: number | null;
  payment_type?: "prepaid" | "postpaid";
  payment_status?: string;
  payment_received_at?: string | null;
  payment_received_by?: string | null;
  work_completed_at?: string | null;
  notes?: string | null;
  /** Server-computed progress. Null when the engagement is open-ended. */
  total_days?: number | null;
  days_elapsed?: number;
  days_remaining?: number | null;
  progress_pct?: number | null;
}

/** One branch's deployment picture from `/assignments/deployment`. */
export interface DeploymentBranch {
  location_id: string;
  location_name: string;
  location_code: string;
  city?: string | null;
  total_staff: number;
  assigned_count: number;
  available_count: number;
  assignments: Assignment[];
  available_staff: {
    id: string;
    name: string;
    code: string;
    category: string;
    phone?: string | null;
    photo?: ImageAsset | null;
  }[];
}

/** One branch's shifts on a given day from `/assignments/daily`. */
export interface DailyRosterBranch {
  location_id: string;
  location_name: string;
  location_code: string;
  city?: string | null;
  count: number;
  assignments: Assignment[];
}

export interface DailyRoster {
  date: string;
  totals: {
    on_duty: number;
    branches: number;
    by_shift: Record<string, number>;
  };
  branches: DailyRosterBranch[];
}

export interface DeploymentOverview {
  totals: {
    total_staff: number;
    assigned_count: number;
    available_count: number;
    branches: number;
  };
  branches: DeploymentBranch[];
}

export interface Expense extends BaseDoc {
  category: string;
  amount: number;
  date: string;
  location_id: string;
  note?: string | null;
}

export type PaymentMode = "cash" | "upi" | "bank_transfer" | "card" | "cheque" | "other";
export type PaymentStatus = "pending" | "partial" | "paid";

export interface Payment extends BaseDoc {
  customer_id: string;
  customer_name: string;
  assignment_id?: string | null;
  amount: number;
  date: string;
  mode: PaymentMode;
  status: PaymentStatus;
  location_id: string;
  note?: string | null;
}

export interface Role extends BaseDoc {
  slug: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

export interface Category extends BaseDoc {
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
  image?: ImageAsset | null;
  hero_badge?: string | null;
  hero_title?: string | null;
  hero_description?: string | null;
  hero_cta_primary_text?: string | null;
  hero_cta_secondary_text?: string | null;
  hero_image?: ImageAsset | null;
  hero_images?: ImageAsset[];
  hero_images_mobile?: ImageAsset[];
  hero_stats?: HeroStat[];
  order: number;
  is_active: boolean;
}

export interface Service extends BaseDoc {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id?: string | null;
  category_name?: string | null;
  icon?: string | null;
  featured_image?: ImageAsset | null;
  gallery: ImageAsset[];
  price?: number | null;
  price_unit?: string | null;
  features: string[];
  seo: SEOMeta;
  is_featured: boolean;
  order: number;
  status: ContentStatus;
}

export interface Booking extends BaseDoc {
  reference: string;
  patient_name: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  contact_phone: string;
  contact_email?: string | null;
  whatsapp_number?: string | null;
  service_id?: string | null;
  service_name: string;
  care_required?: string | null;
  preferred_date: string;
  preferred_time?: string | null;
  address: string;
  city?: string | null;
  pincode?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  status: BookingStatus;
  payment_type?: "prepaid" | "postpaid";
  customer_id?: string | null;
  location_id?: string | null;
  source?: string | null;
  assigned_staff_id?: string | null;
  assigned_staff_name?: string | null;
  admin_notes?: string | null;
  message?: string | null;
}

export interface Equipment extends BaseDoc {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category_id?: string | null;
  category_name?: string | null;
  featured_image?: ImageAsset | null;
  gallery: ImageAsset[];
  rental_price?: number | null;
  rental_unit: string;
  security_deposit?: number | null;
  min_rental_duration?: number | null;
  max_rental_duration?: number | null;
  specifications: Record<string, string>;
  stock: number;
  is_available: boolean;
  seo: SEOMeta;
  is_featured: boolean;
  order: number;
  status: ContentStatus;
}

export interface EquipmentRental extends BaseDoc {
  reference: string;
  equipment_id: string;
  equipment_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address: string;
  start_date: string;
  end_date?: string | null;
  quantity: number;
  duration_days?: number | null;
  total_amount?: number | null;
  status: RentalStatus;
  admin_notes?: string | null;
}

export interface CareerJob extends BaseDoc {
  title: string;
  slug: string;
  category_id?: string | null;
  category_name?: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  location?: string | null;
  job_type: string;
  experience?: string | null;
  salary_range?: string | null;
  vacancies: number;
  seo: SEOMeta;
  is_featured: boolean;
  order: number;
  status: ContentStatus;
}

export interface JobApplication extends BaseDoc {
  reference: string;
  job_id?: string | null;
  job_title: string;
  full_name: string;
  email: string;
  phone: string;
  experience?: string | null;
  preferred_location?: string | null;
  qualification?: string | null;
  preferred_duty?: string | null;
  previous_employer?: string | null;
  relevant_skills?: string | null;
  certificates?: string | null;
  cover_letter?: string | null;
  resume?: FileAsset | null;
  status: ApplicationStatus;
  admin_notes?: string | null;
}

export interface Blog extends BaseDoc {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id?: string | null;
  category_name?: string | null;
  tags: string[];
  featured_image?: ImageAsset | null;
  author_name?: string | null;
  seo: SEOMeta;
  is_featured: boolean;
  views: number;
  published_at?: string | null;
  status: ContentStatus;
}

export interface Video extends BaseDoc {
  title: string;
  slug: string;
  description: string;
  category?: string | null;
  source: "youtube" | "cloudinary";
  youtube_url?: string | null;
  video_file?: FileAsset | null;
  thumbnail?: ImageAsset | null;
  is_featured: boolean;
  order: number;
  is_active: boolean;
}

export interface Testimonial extends BaseDoc {
  patient_name: string;
  designation?: string | null;
  photo?: ImageAsset | null;
  message: string;
  rating: number;
  is_featured: boolean;
  order: number;
  is_active: boolean;
}

export interface FAQ extends BaseDoc {
  question: string;
  answer: string;
  category?: string | null;
  order: number;
  is_active: boolean;
}

export interface StaffMember extends BaseDoc {
  name: string;
  photo?: ImageAsset | null;
  category: string;
  rating: number;
  service_label: string;
  price_7_days?: number | null;
  price_15_days?: number | null;
  price_30_days?: number | null;
  experience?: string | null;
  bio?: string | null;
  is_featured: boolean;
  is_active: boolean;
  order: number;
}

export interface ContactMessage extends BaseDoc {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  service_required?: string | null;
  patient_location?: string | null;
  message: string;
  status: ContactStatus;
  admin_notes?: string | null;
}

export interface WorkingHour {
  day: string;
  open_time?: string | null;
  close_time?: string | null;
  is_closed: boolean;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface FounderCard {
  name: string;
  role: string;
  image?: ImageAsset | null;
  description: string;
  address?: string | null;
}

export interface HeroSlide {
  title?: string | null;
  subtitle?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  image_desktop?: ImageAsset | null;
  image_mobile?: ImageAsset | null;
  order: number;
}

export interface ServicesHero {
  title?: string | null;
  subtitle?: string | null;
  background_image?: ImageAsset | null;
  stats?: HeroStat[];
  slides?: HeroSlide[];
}

export interface HomeHeroStat {
  value: number;
  suffix: string;
  label: string;
}

export interface HomeHero {
  trust_badge_text?: string | null;
  trust_badge_quote?: string | null;
  trust_badge_avatars?: ImageAsset[];
  slider_images?: ImageAsset[];
  slider_images_mobile?: ImageAsset[];
  stats?: HomeHeroStat[];
}

export interface CommitmentItem {
  icon: string;
  text: string;
}

export interface ComprehensiveServiceCard {
  id?: string | null;
  title: string;
  image?: ImageAsset | string | null;
  features: string[];
  button_text: string;
  button_link?: string | null;
  select_label: string;
  form_options: string[];
  order: number;
}

export interface ValueItem {
  title: string;
  body: string;
}

export interface TeamTile {
  image?: string | null;
  count: string;
  title: string;
  desc: string;
}

export interface CareTeamSlideStat {
  value: string;
  label: string;
}

export interface CareTeamSlide {
  image?: string | null;
  eyebrow: string;
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  stats: CareTeamSlideStat[];
}

export interface WhyChooseItem {
  title: string;
  detail: string;
}

export interface HomeAboutFeature {
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  icon_image?: string | ImageAsset | null;
}

export interface HomeAboutTile {
  image?: string | ImageAsset | null;
  count?: string | null;
  title?: string | null;
  description?: string | null;
  cta_label?: string | null;
  cta_link?: string | null;
}

export interface LegalSection {
  title: string;
  body: string;
}

export interface BookingFormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "date" | "time" | "number";
  placeholder?: string | null;
  required: boolean;
  options: string[];
  col_span: number;
  order: number;
}

export interface BookingFormStep {
  key: string;
  label: string;
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
  fields: BookingFormField[];
  order: number;
}

export interface BookingFormConfig {
  steps: BookingFormStep[];
  cities: string[];
  service_care_hints: Record<string, string>;
}

export interface WebsiteSettings extends BaseDoc {
  website_name: string;
  tagline?: string | null;
  logo?: ImageAsset | null;
  favicon?: ImageAsset | null;
  authorized_signature?: ImageAsset | null;
  theme_primary?: string | null;
  theme_accent?: string | null;
  font_family?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  google_map_embed?: string | null;
  google_reviews_link?: string | null;
  working_hours: WorkingHour[];
  services_hero?: ServicesHero | null;
  home_hero?: HomeHero | null;

  // Home page hero
  hero_headline?: string | null;
  hero_subtitle?: string | null;
  hero_description?: string | null;
  hero_cta_primary_text?: string | null;
  hero_cta_secondary_text?: string | null;
  hero_image?: ImageAsset | null;
  hero_stats?: HeroStat[];

  // About page
  about_hero_badge?: string | null;
  about_hero_title?: string | null;
  about_hero_description?: string | null;
  about_hero_image?: ImageAsset | null;
  about_hero_stats?: HeroStat[];
  about_story_title?: string | null;
  about_story_text?: string | null;
  about_stats?: HeroStat[];
  about_values?: ValueItem[];
  about_commitments?: string[];
  commitment_items?: CommitmentItem[];
  commitment_image?: ImageAsset | null;
  about_founders?: FounderCard[];
  about_address_name?: string | null;
  about_address_line1?: string | null;
  about_address_line2?: string | null;
  about_map_embed_url?: string | null;
  why_choose_eyebrow?: string | null;
  why_choose_title?: string | null;
  why_choose_description?: string | null;
  commitment_subtitle?: string | null;
  commitment_badge_value?: string | null;
  commitment_badge_label?: string | null;
  about_welcome_title?: string | null;
  about_welcome_description?: string | null;
  about_welcome_image?: ImageAsset | null;

  // Home About section
  home_about_heading?: string | null;
  home_about_description?: string | null;
  home_about_features?: HomeAboutFeature[];
  home_about_tiles?: HomeAboutTile[];

  videos_wall_image?: ImageAsset | null;

  how_it_works_steps?: ValueItem[];
  team_tiles?: TeamTile[];
  care_team_slides?: CareTeamSlide[];
  trust_bar_items?: string[];
  why_choose_items?: WhyChooseItem[];
  conditions_list?: string[];

  // Comprehensive Services
  comprehensive_services_eyebrow?: string | null;
  comprehensive_services_title?: string | null;
  comprehensive_services_description?: string | null;
  comprehensive_services?: ComprehensiveServiceCard[];

  // Footer
  footer_tagline?: string | null;
  footer_description?: string | null;
  footer_image?: string | null;

  // CTA
  cta_title?: string | null;
  cta_description?: string | null;

  // Legal pages
  privacy_sections?: LegalSection[];
  terms_sections?: LegalSection[];
  refund_sections?: LegalSection[];

  // Booking form config
  booking_form_config?: BookingFormConfig | null;
}

export interface SocialLinks extends BaseDoc {
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  whatsapp?: string | null;
}

export interface SEOSettings extends BaseDoc {
  page_key: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords: string[];
  canonical_url?: string | null;
  og_image?: string | null;
  schema_markup?: string | null;
}

export interface NotificationItem extends BaseDoc {
  user_id?: string | null;
  type: "booking" | "contact" | "application" | "rental" | "system";
  title: string;
  message: string;
  link?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
}

export interface ActivityLog extends BaseDoc {
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  description: string;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
}

export interface DashboardStats {
  is_scoped?: boolean;
  branch_names?: string[];
  branch_ids?: string[];
  staff?: {
    total: number;
    working: number;
    available: number;
    on_leave: number;
    verified: number;
    pending: number;
  };
  revenue?: {
    currency: string;
    total: number;
    expense?: number;
    profit?: number;
    payment_count?: number;
    note?: string;
  };
  assignments?: {
    active: number;
  };
  customers?: {
    active: number;
  };
  bookings: { total: number; pending: number; approved: number; completed: number };
  services: number;
  equipment: number;
  rentals: number;
  applications: number;
  new_contacts: number;
  blogs: number;
  branches_summary?: Array<{
    id: string;
    name: string;
    code: string;
    city?: string | null;
    total_staff: number;
    working_staff: number;
    revenue: number;
  }>;
}

export interface DashboardCharts {
  booking_status: Record<string, number>;
  bookings_trend: { date: string; count: number }[];
}
