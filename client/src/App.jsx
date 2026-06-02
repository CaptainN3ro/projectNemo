import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import { authApi } from './api/admin';
import { useBranding } from './hooks/useBranding';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import PetList from './pages/Pets/PetList';
import PetDetail from './pages/Pets/PetDetail';
import CalendarPage from './pages/Calendar';
import PluginPage from './pages/PluginPage';
import AdminLayout from './pages/Admin/AdminLayout';
import UsersPage from './pages/Admin/UsersPage';
import PluginsPage from './pages/Admin/PluginsPage';
import SmtpPage from './pages/Admin/SmtpPage';
import SettingsPage from './pages/Admin/SettingsPage';
import BrandingPage from './pages/Admin/BrandingPage';
import Profile from './pages/Profile';

function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const user = useAuthStore(s => s.user);
  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppInner() {
  const { isAuthenticated, setUser } = useAuthStore();
  // Load branding at app root so meta tags / favicon update globally
  useBranding();

  useEffect(() => {
    if (isAuthenticated) {
      authApi.me().then(setUser).catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected app routes */}
      <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="pets" element={<PetList />} />
        <Route path="pets/:id" element={<PetDetail />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="plugin/:name" element={<PluginPage />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="smtp" element={<SmtpPage />} />
          <Route path="branding" element={<BrandingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
