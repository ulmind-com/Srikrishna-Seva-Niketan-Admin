import {
  BadgeCheck,
  LayoutDashboard,
  Stethoscope,
  CalendarCheck,
  Activity,
  Package,
  ClipboardList,
  Briefcase,
  FileUser,
  Newspaper,
  Video,
  Quote,
  HelpCircle,
  Mail,
  Search,
  Images,
  Settings,
  Users,
  ShieldCheck,
  Bell,
  ScrollText,
  UserCircle,
  FolderTree,
  Sparkles,
  Layers,
  FileText,
  ShieldAlert,
  Building2,
  UserPlus,
  Contact,
  CalendarClock,
  CalendarDays,
  Wallet,
  Receipt,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: string;
  badgeKey?: "notifications";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, permission: "dashboard:view" },
    ],
  },
  {
    title: "Staff Management",
    items: [
      { label: "Branches", to: "/locations", icon: Building2, permission: "locations:view" },
      { label: "Staff Register", to: "/employees", icon: UserPlus, permission: "employees:view" },
      { label: "Staff by Branch", to: "/staff-by-branch", icon: Building2, permission: "employees:view" },
      { label: "Staff Verification", to: "/staff-verification", icon: BadgeCheck, permission: "employees:view" },
      { label: "Customers", to: "/customers", icon: Contact, permission: "customers:view" },
      { label: "Assignments", to: "/assignments", icon: CalendarClock, permission: "assignments:view" },
      { label: "Staff Deployment", to: "/staff-deployment", icon: Activity, permission: "assignments:view" },
      { label: "Daily Shifts", to: "/daily-shifts", icon: CalendarDays, permission: "assignments:view" },
      { label: "Payments", to: "/payments", icon: Receipt, permission: "payments:view" },
      { label: "Expenses", to: "/expenses", icon: Wallet, permission: "expenses:view" },
      { label: "Reports", to: "/reports", icon: BarChart3, permission: "reports:view" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Bookings", to: "/bookings", icon: CalendarCheck, permission: "bookings:view" },
      { label: "Comprehensive Bookings", to: "/comprehensive-bookings", icon: Sparkles, permission: "bookings:view" },
      { label: "Physio Requests", to: "/physio", icon: Activity, permission: "bookings:view" },
      { label: "Rental Requests", to: "/rentals", icon: ClipboardList, permission: "rentals:view" },
      { label: "Job Applications", to: "/applications", icon: FileUser, permission: "applications:view" },
      { label: "Contact Messages", to: "/contact", icon: Mail, permission: "contacts:view" },
      { label: "IC Enquiries", to: "/infection-control-enquiries", icon: ShieldAlert, permission: "bookings:view" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Categories", to: "/categories", icon: FolderTree, permission: "categories:view" },
      { label: "Services", to: "/services", icon: Stethoscope, permission: "services:view" },
      { label: "Medical Equipment", to: "/equipment", icon: Package, permission: "equipment:view" },
      { label: "Careers", to: "/careers", icon: Briefcase, permission: "careers:view" },
      { label: "Our Staff", to: "/staff", icon: Users, permission: "staff:view" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Comprehensive Services", to: "/comprehensive-services-manager", icon: Sparkles, permission: "settings:view" },
      { label: "Booking Form", to: "/booking-form", icon: ClipboardList, permission: "settings:view" },
      { label: "Category Heroes", to: "/category-heroes", icon: Layers, permission: "settings:view" },
      { label: "About Page", to: "/about-page", icon: FileText, permission: "settings:view" },
      { label: "Blogs", to: "/blogs", icon: Newspaper, permission: "blogs:view" },
      { label: "Videos", to: "/videos", icon: Video, permission: "videos:view" },
      { label: "Testimonials", to: "/testimonials", icon: Quote, permission: "testimonials:view" },
      { label: "FAQ", to: "/faqs", icon: HelpCircle, permission: "faqs:view" },
      { label: "Infection Control Page", to: "/infection-control", icon: ShieldCheck, permission: "settings:view" },
      { label: "Media Library", to: "/media", icon: Images, permission: "media:view" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "SEO", to: "/seo", icon: Search, permission: "seo:view" },
      { label: "Website Settings", to: "/settings", icon: Settings, permission: "settings:view" },
      { label: "Users", to: "/users", icon: Users, permission: "users:view" },
      { label: "Roles", to: "/roles", icon: ShieldCheck, permission: "roles:view" },
      { label: "Notifications", to: "/notifications", icon: Bell, badgeKey: "notifications" },
      { label: "Activity Logs", to: "/activity", icon: ScrollText, permission: "activity_logs:view" },
      { label: "Profile", to: "/profile", icon: UserCircle },
    ],
  },
];
