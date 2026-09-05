import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, Badge, Button } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { apiFetch } from "../../lib/api";
import type { AdminStats } from "@shared/constants";
import { DashboardSkeleton } from "../../components/Skeleton";

interface PendingChangeRow {
  id: string;
  alumni_id: string;
  alumni_name: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  status: string;
  created_at: string | null;
}

interface ActivityLogRow {
  id: string;
  admin_id: string | null;
  alumni_id: string | null;
  action: string;
  details: string | null;
  created_at: string | null;
  admin_name: string | null;
  alumni_name: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_ALUMNI: "Tambah Data Alumni",
  UPDATE_BIODATA: "Perbarui Biodata",
  DELETE_ALUMNI: "Hapus Data Alumni",
  VERIFY_ALUMNI: "Verifikasi Alumni",
  ALUMNI_REGISTER: "Alumni Mendaftar Diri",
  ALUMNI_EDIT_SELF: "Alumni Edit Sendiri",
  ALUMNI_EDIT_TOKEN: "Edit via Token",
  GENERATE_EDIT_LINK: "Buat Link Edit",
  IMPORT_EXCEL: "Import Excel",
  EXPORT_EXCEL: "Export Excel",
};

const FIELD_LABELS: Record<string, string> = {
  tempat_lahir: "Tempat Lahir",
  tanggal_lahir: "Tanggal Lahir",
  gender: "Jenis Kelamin",
  no_hp: "No. HP",
  angkatan: "Angkatan",
};

function formatLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<PendingChangeRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch<AdminStats>("/admin/stats", { auth: true });
      setStats(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingChanges = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: PendingChangeRow[]; pagination: { total: number } }>(
        "/admin/pending-changes?limit=5",
        { auth: true },
      );
      setPendingChanges(res.data);
      setPendingTotal(res.pagination.total);
    } catch {
      // Endpoint may not exist yet — gracefully leave empty
      setPendingChanges([]);
      setPendingTotal(0);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ActivityLogRow[] }>(
        "/admin/activity-logs?limit=5",
        { auth: true },
      );
      setActivityLogs(res.data);
    } catch {
      setActivityLogs([]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPendingChanges();
    fetchActivityLogs();
  }, [fetchStats, fetchPendingChanges, fetchActivityLogs]);

  if (loading) return <DashboardSkeleton />;
  if (!stats) return <div className="p-8"><p className="text-red-500">Gagal memuat statistik</p></div>;

  const verifTotal = stats.pending + stats.verified + stats.rejected || 1;
  const pctPending = (stats.pending / verifTotal) * 100;
  const pctVerified = (stats.verified / verifTotal) * 100;
  const pctRejected = (stats.rejected / verifTotal) * 100;

  const maxAngkatan = Math.max(...stats.perAngkatan.map((a) => a.count), 1);
  const sortedUnits = [...stats.perUnit].sort((a, b) => b.count - a.count);
  const maxUnit = Math.max(...sortedUnits.map((u) => u.count), 1);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Alumni" value={stats.total} color="blue" icon={<Icons.Chart size={22} />} />
        <StatCard label="Putra" value={stats.putra} color="blue" icon={<Icons.User size={22} />} />
        <StatCard label="Putri" value={stats.putri} color="pink" icon={<Icons.User size={22} />} />
        <StatCard label="Terverifikasi" value={stats.verified} color="green" icon={<Icons.Check size={22} />} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/admin/data-alumni" className="no-print">
          <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
            <span className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><Icons.User size={20} /></span>
            <div>
              <p className="font-medium text-slate-800 text-sm">Tambah Alumni</p>
              <p className="text-xs text-slate-500">Input data alumni baru</p>
            </div>
          </Card>
        </Link>
        <Link to="/admin/import-export" className="no-print">
          <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
            <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Icons.ImportExport size={20} /></span>
            <div>
              <p className="font-medium text-slate-800 text-sm">Import Excel</p>
              <p className="text-xs text-slate-500">Upload data massal</p>
            </div>
          </Card>
        </Link>
        <Link to="/buku-alumni" className="no-print">
          <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
            <span className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><Icons.BukuAlumni size={20} /></span>
            <div>
              <p className="font-medium text-slate-800 text-sm">Kelola Yearbook</p>
              <p className="text-xs text-slate-500">Desain & cetak buku alumni</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Two-column layout: pending approvals + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pending approvals */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Menunggu Persetujuan</h2>
            {pendingTotal > 0 && <Badge color="yellow">{pendingTotal} perubahan</Badge>}
          </div>
          {pendingChanges.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Tidak ada perubahan yang menunggu persetujuan.</p>
          ) : (
            <div className="space-y-3">
              {pendingChanges.map((pc) => (
                <div key={pc.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{pc.alumni_name ?? "Alumni"}</p>
                    <p className="text-xs text-slate-500">
                      {FIELD_LABELS[pc.field] ?? pc.field}: <span className="line-through text-slate-400">{pc.old_value ?? "—"}</span> → <span className="text-slate-700">{pc.new_value ?? "—"}</span>
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(pc.created_at)}</span>
                </div>
              ))}
              {pendingTotal > 5 && (
                <Link to="/admin/data-alumni" className="block text-center text-sm text-primary-600 hover:underline pt-2">Lihat semua ({pendingTotal})</Link>
              )}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Aktivitas Terbaru</h2>
          </div>
          {activityLogs.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Belum ada aktivitas tercatat.</p>
          ) : (
            <div className="space-y-3">
              {activityLogs.map((log) => {
                const actor = log.admin_name ?? log.alumni_name ?? "Sistem";
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0"><Icons.User size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800"><span className="font-medium">{actor}</span> — <span className="text-slate-600">{formatLabel(log.action)}</span></p>
                      <p className="text-xs text-slate-400">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <Link to="/admin/activity-logs" className="block text-center text-sm text-primary-600 hover:underline pt-2">Lihat semua aktivitas</Link>
            </div>
          )}
        </Card>
      </div>

      {/* Verification status bar */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Status Verifikasi</h2>
        <div className="flex h-8 rounded-lg overflow-hidden bg-slate-100 mb-3">
          {pctPending > 0 && (
            <div className="bg-yellow-400 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${pctPending}%` }}>
              {pctPending >= 8 ? `${Math.round(pctPending)}%` : ""}
            </div>
          )}
          {pctVerified > 0 && (
            <div className="bg-green-500 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${pctVerified}%` }}>
              {pctVerified >= 8 ? `${Math.round(pctVerified)}%` : ""}
            </div>
          )}
          {pctRejected > 0 && (
            <div className="bg-red-500 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${pctRejected}%` }}>
              {pctRejected >= 8 ? `${Math.round(pctRejected)}%` : ""}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400" /><span className="text-slate-600">Pending</span><Badge color="yellow">{stats.pending}</Badge></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500" /><span className="text-slate-600">Verified</span><Badge color="green">{stats.verified}</Badge></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /><span className="text-slate-600">Rejected</span><Badge color="red">{stats.rejected}</Badge></span>
        </div>
      </Card>

      {/* Charts: two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per angkatan chart */}
        <Card className="p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Per Angkatan</h2>
          <div className="flex items-end gap-2 h-48 overflow-x-auto">
            {stats.perAngkatan.map((a) => (
              <div key={a.angkatan} className="flex flex-col items-center gap-1 min-w-[40px] flex-1">
                <span className="text-xs font-medium text-slate-700">{a.count}</span>
                <div className="w-full bg-primary-600 rounded-t-md transition-all" style={{ height: `${(a.count / maxAngkatan) * 100}%`, minHeight: "4px" }} />
                <span className="text-xs text-slate-500">{a.angkatan}</span>
              </div>
            ))}
            {stats.perAngkatan.length === 0 && <p className="text-sm text-slate-400">Belum ada data</p>}
          </div>
        </Card>

        {/* Per unit breakdown */}
        <Card className="p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Per Unit</h2>
          <div className="space-y-2">
            {sortedUnits.map((u) => (
              <div key={u.unit} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-24 truncate">{u.unit}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                  <div className="bg-primary-600 h-full rounded-full flex items-center justify-end px-2" style={{ width: `${Math.max((u.count / maxUnit) * 100, 5)}%` }}>
                    <span className="text-xs text-white font-medium">{u.count}</span>
                  </div>
                </div>
              </div>
            ))}
            {sortedUnits.length === 0 && <p className="text-sm text-slate-400">Belum ada data</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const colorStyles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    pink: "bg-pink-50 text-pink-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-lg border border-[#F4F4F5] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorStyles[color] || colorStyles.blue}`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
