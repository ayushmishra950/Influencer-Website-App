import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { Layout } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { InfluencersPage } from '@/pages/Influencers';
import { ReviewQueuePage } from '@/pages/ReviewQueue';
import { ArchivedPage } from '@/pages/Archived';
import { CategoriesPage } from '@/pages/Categories';
import { PackagesPage } from '@/pages/Packages';
import { InfluencerDetailPage } from '@/pages/InfluencerDetail';
import { InfluencerFormPage } from '@/pages/InfluencerForm';
import { ChangePasswordPage } from '@/pages/ChangePassword';
import { ForgotPasswordPage } from '@/pages/ForgotPassword';
import { ResetPasswordPage } from '@/pages/ResetPassword';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 401 already redirects in the axios interceptor; retrying it just delays that.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Restoring session" fill="screen" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <NotificationProvider>
                <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route element={<RequireAdmin />}>
                <Route index element={<DashboardPage />} />
                <Route path="influencers" element={<InfluencersPage />} />
                <Route path="influencers/new" element={<InfluencerFormPage />} />
                <Route path="influencers/:id" element={<InfluencerDetailPage />} />
                <Route path="influencers/:id/edit" element={<InfluencerFormPage />} />
                <Route path="review" element={<ReviewQueuePage />} />
                <Route path="archived" element={<ArchivedPage />} />
                <Route path="packages" element={<PackagesPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="change-password" element={<ChangePasswordPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </NotificationProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
