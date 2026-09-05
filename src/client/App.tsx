import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { HomePage } from "./pages/HomePage";
import { FormPage } from "./pages/FormPage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { ProfileDetailPage } from "./pages/ProfileDetailPage";
import { YearbookPage } from "./pages/YearbookPage";
import { AlumniLoginPage } from "./pages/AlumniLoginPage";
import { AlumniEditPage } from "./pages/AlumniEditPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { AlumniListPage } from "./pages/admin/AlumniListPage";
import { YearbookManagePage } from "./pages/admin/YearbookManagePage";
import { ExcelPage } from "./pages/admin/ExcelPage";
import { BroadcastPage } from "./pages/admin/BroadcastPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { ActivityLogPage } from "./pages/admin/ActivityLogPage";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin, restoring } = useAuth();
  if (restoring) return <div className="min-h-screen flex items-center justify-center text-slate-400">Memuat...</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

// Allows both admin and alumni to access /buku-alumni
function YearbookGuard({ children }: { children: React.ReactNode }) {
  const { admin, restoring } = useAuth();
  if (restoring) return <div className="min-h-screen flex items-center justify-center text-slate-400">Memuat...</div>;
  const alumniToken = localStorage.getItem("alumni_token");
  if (!admin && !alumniToken) return <Navigate to="/alumni/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/form" element={<FormPage />} />
            <Route path="/edit/:token" element={<EditProfilePage />} />
            <Route path="/p/:id" element={<ProfileDetailPage />} />
          </Route>

          {/* Alumni self-service routes */}
          <Route element={<PublicLayout />}>
            <Route path="/alumni/login" element={<AlumniLoginPage />} />
            <Route path="/alumni/edit" element={<AlumniEditPage />} />
          </Route>

          {/* Yearbook — accessible by admin (gender-scoped by role) or alumni (gender-scoped by own gender) */}
          <Route
            path="/buku-alumni"
            element={
              <YearbookGuard>
                <PublicLayout />
              </YearbookGuard>
            }
          >
            <Route index element={<YearbookPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin/*"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="data-alumni" element={<AlumniListPage />} />
            <Route path="yearbook-preview" element={<YearbookManagePage />} />
            <Route path="import-export" element={<ExcelPage />} />
            <Route path="broadcast" element={<BroadcastPage />} />
            <Route path="activity-logs" element={<ActivityLogPage />} />
            <Route path="manage-admins" element={<AdminUsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
