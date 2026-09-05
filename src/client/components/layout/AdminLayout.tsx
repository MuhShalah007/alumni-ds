import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { Icon, Icons } from "../Icon";
import { apiFetch } from "../../lib/api";

const navItems: { path: string; label: string; icon: ReactNode; superOnly?: boolean }[] = [
  { path: "/admin/dashboard", label: "Dashboard", icon: <Icons.Dashboard size={18} /> },
  { path: "/admin/data-alumni", label: "Data Alumni", icon: <Icons.DataAlumni size={18} /> },
  { path: "/buku-alumni", label: "Buku Alumni", icon: <Icons.BukuAlumni size={18} /> },
  { path: "/admin/import-export", label: "Import/Export", icon: <Icons.ImportExport size={18} /> },
  { path: "/admin/broadcast", label: "Pengumuman", icon: <Icons.Bell size={18} /> },
  { path: "/admin/activity-logs", label: "Riwayat Aktivitas", icon: <Icon name="history-line" size={18} /> },
  { path: "/admin/manage-admins", label: "Kelola Admin", icon: <Icons.ManageAdmins size={18} />, superOnly: true },
];

export function AdminLayout() {
  const { admin, logout, restoring } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiFetch<{ count: number }>("/admin/notifications/unread-count", { auth: true });
      setUnreadCount(res.count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!restoring && !admin) navigate("/admin/login", { replace: true });
  }, [admin, restoring, navigate]);

  useEffect(() => {
    if (admin) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [admin, fetchUnread]);

  if (restoring) return <div className="min-h-screen flex items-center justify-center text-slate-400">Memuat...</div>;
  if (!admin) return null;

  const visibleItems = navItems.filter((item) => !item.superOnly || admin.role === "super_admin");

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col fixed h-full no-print">
        <div className="p-4 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">Admin Panel</div>
              <div className="text-xs text-slate-400">Darusy Syahadah</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isNotif = item.path === "/admin/broadcast";
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary-700 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center relative">
                  {item.icon}
                  {isNotif && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="px-3 py-2 text-xs text-slate-400">
            <div className="font-medium text-slate-200">{admin.namaLengkap}</div>
            <div>{admin.role.replace("admin_", "Admin ").replace("super_", "Super ")}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Icons.Logout size={18} />
              Keluar
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64">
        <Outlet />
      </div>
    </div>
  );
}
