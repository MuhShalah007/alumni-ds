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
  { path: "/admin/manage-admins", label: "Kelola Admin", icon: <Icons.ManageAdmins size={18} />, superOnly: true },
  { path: "/admin/activity-logs", label: "Riwayat Aktivitas", icon: <Icon name="history-line" size={18} /> },
];

export function AdminLayout() {
  const { admin, logout, restoring } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiFetch<{ count: number }>("/admin/notifications/unread-count", { auth: true });
      setUnreadCount(res.count);
    } catch { /* ignore */ }
  }, []);
  const fetchPending = useCallback(async () => {
    try {
      const res = await apiFetch<{ pagination: { total: number } }>("/admin/pending-changes?limit=1", { auth: true });
      setPendingCount(res.pagination.total);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!restoring && !admin) navigate("/admin/login", { replace: true });
  }, [admin, restoring, navigate]);

  useEffect(() => {
    if (admin) {
      fetchUnread();
      fetchPending();
      const interval = setInterval(() => { fetchUnread(); fetchPending(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [admin, fetchUnread, fetchPending]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (restoring) return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="w-64 bg-slate-900 hidden md:flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-700 animate-pulse" />
            <div className="space-y-1">
              <div className="h-3 w-20 bg-slate-700 rounded animate-pulse" />
              <div className="h-2 w-16 bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-8">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-100 p-4">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-64 w-full bg-slate-200 rounded animate-pulse" />
      </div>
    </div>
  );
  if (!admin) return null;

  const visibleItems = navItems.filter((item) => !item.superOnly || admin.role === "super_admin");

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden no-print"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed on desktop, slide-in drawer on mobile */}
      <aside
        className={`w-64 bg-slate-900 text-slate-100 flex flex-col fixed inset-y-0 left-0 z-50 no-print transition-transform duration-200 md:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/favicon.svg" alt="Logo" className="w-8 h-8 rounded-lg" />
            <div className="leading-tight">
              <div className="font-semibold text-sm">Admin Panel</div>
              <div className="text-xs text-slate-400">Darusy Syahadah</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isNotif = item.path === "/admin/broadcast";
            const isPending = item.path === "/admin/pending-changes";
            const badgeCount = isNotif ? unreadCount : isPending ? pendingCount : 0;
            const showBadge = isNotif ? unreadCount > 0 : isPending ? pendingCount > 0 : false;
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
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badgeCount > 9 ? "9+" : badgeCount}
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
      <div className="flex-1 md:ml-64 min-w-0">
        {/* Mobile header with hamburger */}
        <header className="md:hidden sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center gap-3 no-print">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="p-1.5 -ml-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {drawerOpen ? <Icons.Close size={22} /> : <Icons.Menu size={22} />}
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/favicon.svg" alt="Logo" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-sm">Admin Panel</span>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
