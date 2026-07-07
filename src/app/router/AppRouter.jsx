import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Public Pages
import LandingPage from '../../pages/public/LandingPage';
import MarketRatesPage from '../../pages/public/MarketRatesPage';
import SeedsCatalogPage from '../../pages/public/SeedsCatalogPage';
import HowItWorksPage from '../../pages/public/HowItWorksPage';
import FeaturesPage from '../../pages/public/FeaturesPage';

// Auth Pages
import Login from '../../pages/auth/Login';
import GetStarted from '../../pages/auth/GetStarted';
import ForgotPassword from '../../pages/auth/ForgotPassword';

// Farmer Pages
import FarmerLayout from '../../layouts/FarmerLayout';
import FarmerDashboard from '../../pages/farmer/Dashboard';
import CropManagement from '../../pages/farmer/CropManagement';
import SeedPurchase from '../../pages/farmer/SeedPurchase';
import BookingSlot from '../../pages/farmer/BookingSlot';
import TransactionHistory from '../../pages/farmer/TransactionHistory';
import FarmerProfile from '../../pages/farmer/Profile';

// Admin Pages
import AdminLayout from '../../layouts/AdminLayout';
import AdminDashboard from '../../pages/admin/Dashboard';
import FarmersDirectory from '../../pages/admin/Farmers';
import SeedsInventory from '../../pages/admin/SeedsInventory';
import WarehouseManagement from '../../pages/admin/Warehouse';
import AdminReports from '../../pages/admin/Reports';
import AdminBookingSlots from '../../pages/admin/BookingSlots';
import FarmVisits from '../../pages/admin/FarmVisits';
import MarketRates from '../../pages/admin/MarketRates';
import GrainSalesAdmin from '../../pages/admin/GrainSalesAdmin';
import ManagerProfile from '../../pages/admin/ManagerProfile';
import EventLogs from '../../pages/admin/EventLogs';
import CreditsAdmin from '../../pages/admin/CreditsAdmin';

// Super Admin Pages
import SuperAdminLayout from '../../layouts/SuperAdminLayout';
import SuperAdminDashboard from '../../pages/superadmin/Dashboard';
import ManageAdmins from '../../pages/superadmin/ManageAdmins';
import AllFarmers from '../../pages/superadmin/AllFarmers';

import SeedPurchases from '../../pages/admin/SeedPurchases';

import NotFound from '../../pages/shared/NotFound';

export default function AppRouter() {
  return (
    <Routes>
      {/* ===== PUBLIC — visible to everyone ===== */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/market-rates" element={<MarketRatesPage />} />
      <Route path="/seeds-catalog" element={<SeedsCatalogPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/get-started" element={<GetStarted />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* ===== FARMER PORTAL (/farmer) ===== */}
      <Route path="/farmer" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerLayout /></ProtectedRoute>}>
        <Route index element={<FarmerProfile />} />
        <Route path="crops" element={<CropManagement />} />
        <Route path="seeds" element={<SeedPurchase />} />
        <Route path="booking-slots" element={<BookingSlot />} />
        <Route path="transactions" element={<TransactionHistory />} />
      </Route>

      {/* ===== MANAGER PORTAL (/manager) ===== */}

      <Route path="/manager/dashboard" element={<ProtectedRoute allowedRoles={['manager','super_admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="farmers" element={<FarmersDirectory />} />
        <Route path="seeds" element={<SeedsInventory />} />
        <Route path="seed-purchases" element={<SeedPurchases />} />
        <Route path="warehouse" element={<WarehouseManagement />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="booking-slots" element={<AdminBookingSlots />} />
        <Route path="visits" element={<FarmVisits />} />
        <Route path="market-rates" element={<MarketRates />} />
        <Route path="grain-sales" element={<ProtectedRoute allowedRoles={['manager', 'super_admin']}><GrainSalesAdmin /></ProtectedRoute>} />
        <Route path="credits" element={<ProtectedRoute allowedRoles={['manager', 'super_admin']}><CreditsAdmin /></ProtectedRoute>} />
        <Route path="event-logs" element={<ProtectedRoute allowedRoles={['super_admin']}><EventLogs /></ProtectedRoute>} />
        <Route path="profile" element={<ManagerProfile />} />
      </Route>

      {/* ===== SUPER ADMIN PORTAL (/admin) ===== */}

      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminLayout /></ProtectedRoute>}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="managers" element={<ManageAdmins />} />
        <Route path="farmers" element={<AllFarmers />} />
        <Route path="credits" element={<CreditsAdmin />} />
        
        {/* Operational portal embedded in SuperAdmin */}
        <Route path="op" element={<AdminDashboard />} />
        <Route path="op/farmers" element={<FarmersDirectory />} />
        <Route path="op/seeds" element={<SeedsInventory />} />
        <Route path="op/seed-purchases" element={<SeedPurchases />} />
        <Route path="op/warehouse" element={<WarehouseManagement />} />
        <Route path="op/reports" element={<AdminReports />} />
        <Route path="op/booking-slots" element={<AdminBookingSlots />} />
        <Route path="op/visits" element={<FarmVisits />} />
        <Route path="op/market-rates" element={<MarketRates />} />
        <Route path="op/grain-sales" element={<GrainSalesAdmin />} />
        <Route path="op/credits" element={<CreditsAdmin />} />
        <Route path="op/event-logs" element={<EventLogs />} />
        <Route path="op/profile" element={<ManagerProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
