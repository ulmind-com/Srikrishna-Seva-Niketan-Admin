import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import {
  CategoriesPage,
  ServicesPage,
  EquipmentPage,
  BlogsPage,
  CareersPage,
  TestimonialsPage,
  FaqPage,
  StaffPage,
  LocationsPage,
  EmployeesPage,
  CustomersPage,
  AssignmentsPage,
  ExpensesPage,
  PaymentsPage,
} from "@/pages/resource-pages";
import { EmployeeIdCardPage } from "@/pages/EmployeeIdCardPage";
import { EmployeeDocumentsPage } from "@/pages/EmployeeDocumentsPage";
import { StaffVerificationPage } from "@/pages/StaffVerificationPage";
import { LocationStaffOverviewPage } from "@/pages/LocationStaffOverviewPage";
import { StaffDeploymentPage } from "@/pages/StaffDeploymentPage";
import { DailyShiftPage } from "@/pages/DailyShiftPage";
import { StaffLoginPage } from "@/pages/staff/StaffLoginPage";
import { StaffRegisterPage } from "@/pages/staff/StaffRegisterPage";
import { StaffOnboardingPage } from "@/pages/staff/StaffOnboardingPage";
import { StaffStatusPage } from "@/pages/staff/StaffStatusPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { VideosPage } from "@/pages/VideosPage";
import { BookingsPage } from "@/pages/bookings/BookingsPage";
import { ComprehensiveBookingsPage } from "@/pages/bookings/ComprehensiveBookingsPage";
import { PhysioRequestsPage } from "@/pages/physio/PhysioRequestsPage";
import { RentalsPage } from "@/pages/RentalsPage";
import ElderCareRequestsPage from "@/pages/ElderCareRequestsPage";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { ContactPage } from "@/pages/ContactPage";
import { MediaLibraryPage } from "@/pages/MediaLibraryPage";
import { SeoPage } from "@/pages/SeoPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { CategoryHeroesPage } from "@/pages/CategoryHeroesPage";
import { AboutPageManager } from "@/pages/AboutPageManager";
import { ComprehensiveServicesPage } from "@/pages/ComprehensiveServicesPage";
import { BookingFormManagerPage } from "@/pages/BookingFormManagerPage";
import { UsersPage } from "@/pages/UsersPage";
import { RolesPage } from "@/pages/RolesPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ActivityLogsPage } from "@/pages/ActivityLogsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { InfectionControlPage } from "@/pages/InfectionControlPage";
import { InfectionControlEnquiriesPage } from "@/pages/InfectionControlEnquiriesPage";
import { NotFoundPage } from "@/pages/ErrorPages";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* ---- Self-service staff portal (own auth, outside the admin shell) ---- */}
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff/register" element={<StaffRegisterPage />} />
      <Route path="/staff/onboarding" element={<StaffOnboardingPage />} />
      <Route path="/staff-portal" element={<StaffStatusPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/comprehensive-bookings" element={<ComprehensiveBookingsPage />} />
          <Route path="/physio" element={<PhysioRequestsPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/rentals" element={<RentalsPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id/id-card" element={<EmployeeIdCardPage />} />
          <Route path="/employees/:id/documents" element={<EmployeeDocumentsPage />} />
          <Route path="/staff-verification" element={<StaffVerificationPage />} />
          <Route path="/staff-by-branch" element={<LocationStaffOverviewPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/staff-deployment" element={<StaffDeploymentPage />} />
          <Route path="/daily-shifts" element={<DailyShiftPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/blogs" element={<BlogsPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/faqs" element={<FaqPage />} />
          <Route path="/elder-care" element={<ElderCareRequestsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/media" element={<MediaLibraryPage />} />
          <Route path="/seo" element={<SeoPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/category-heroes" element={<CategoryHeroesPage />} />
          <Route path="/about-page" element={<AboutPageManager />} />
          <Route path="/comprehensive-services-manager" element={<ComprehensiveServicesPage />} />
          <Route path="/booking-form" element={<BookingFormManagerPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/activity" element={<ActivityLogsPage />} />
          <Route path="/infection-control" element={<InfectionControlPage />} />
          <Route path="/infection-control-enquiries" element={<InfectionControlEnquiriesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
