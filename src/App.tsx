import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Explore from "./pages/Explore";
import CreatorPage from "./pages/CreatorPage";
import NotFound from "./pages/NotFound";
import VotingPage from "./pages/VotingPage";
import UserDashboard from "./pages/UserDashboard";
import BecomeCreator from "./pages/BecomeCreator";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCreators from "./pages/admin/AdminCreators";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminDonations from "./pages/admin/AdminDonations";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminAwards from "./pages/admin/AdminAwards";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";

// Creator Pages
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatorDonations from "./pages/creator/CreatorDonations";
import CreatorWithdrawals from "./pages/creator/CreatorWithdrawals";
import CreatorLinks from "./pages/creator/CreatorLinks";
import CreatorCustomize from "./pages/creator/CreatorCustomize";
import CreatorSettings from "./pages/creator/CreatorSettings";
import CreatorEvents from "./pages/creator/CreatorEvents";
import CreatorMerchandise from "./pages/creator/CreatorMerchandise";
import CreatorDomain from "./pages/creator/CreatorDomain";
import CreatorAnalytics from "./pages/creator/CreatorAnalytics";
import CreatorCampaigns from "./pages/creator/CreatorCampaigns";
import CreatorGifts from "./pages/creator/CreatorGifts";
import CreatorPartners from "./pages/creator/CreatorPartners";

// Additional Admin Pages
import AdminMerchandise from "./pages/admin/AdminMerchandise";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminGifts from "./pages/admin/AdminGifts";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminDisabledAccounts from "./pages/admin/AdminDisabledAccounts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/vote" element={<VotingPage />} />
            <Route path="/vote/:slug" element={<VotingPage />} />
            <Route path="/become-creator" element={
              <ProtectedRoute>
                <BecomeCreator />
              </ProtectedRoute>
            } />
            {/* User Account */}
            <Route path="/account" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/creators" element={
              <ProtectedRoute requiredRole="admin">
                <AdminCreators />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute requiredRole="admin">
                <AdminCategories />
              </ProtectedRoute>
            } />
            <Route path="/admin/donations" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDonations />
              </ProtectedRoute>
            } />
            <Route path="/admin/withdrawals" element={
              <ProtectedRoute requiredRole="admin">
                <AdminWithdrawals />
              </ProtectedRoute>
            } />
            <Route path="/admin/transactions" element={
              <ProtectedRoute requiredRole="admin">
                <AdminTransactions />
              </ProtectedRoute>
            } />
            <Route path="/admin/awards" element={
              <ProtectedRoute requiredRole="admin">
                <AdminAwards />
              </ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute requiredRole="admin">
                <AdminPayments />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/merchandise" element={
              <ProtectedRoute requiredRole="admin">
                <AdminMerchandise />
              </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
              <ProtectedRoute requiredRole="admin">
                <AdminEvents />
              </ProtectedRoute>
            } />
            <Route path="/admin/campaigns" element={
              <ProtectedRoute requiredRole="admin">
                <AdminCampaigns />
              </ProtectedRoute>
            } />
            <Route path="/admin/gifts" element={
              <ProtectedRoute requiredRole="admin">
                <AdminGifts />
              </ProtectedRoute>
            } />
            <Route path="/admin/partners" element={
              <ProtectedRoute requiredRole="admin">
                <AdminPartners />
              </ProtectedRoute>
            } />
            <Route path="/admin/disabled-accounts" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDisabledAccounts />
              </ProtectedRoute>
            } />

            {/* Creator Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/donations" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorDonations />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/withdrawals" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorWithdrawals />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/events" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorEvents />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/merchandise" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorMerchandise />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/links" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorLinks />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/analytics" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/customize" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorCustomize />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/domain" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorDomain />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorSettings />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/campaigns" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorCampaigns />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/gifts" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorGifts />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/partners" element={
              <ProtectedRoute requiredRole="creator">
                <CreatorPartners />
              </ProtectedRoute>
            } />

            {/* Creator public page - must be last */}
            <Route path="/:username" element={<CreatorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
