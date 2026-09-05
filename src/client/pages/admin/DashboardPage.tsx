import { useState, useEffect, useCallback } from "react";
import { Card, Badge } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { apiFetch } from "../../lib/api";
import type { AdminStats } from "@shared/constants";

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch<AdminStats>("/admin/stats", { auth: true });
      setStats(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return <div className="p-8"><p className="text-slate-500">Memuat statistik...</p></div>;
  if (!stats) return <div className="p-8"><p className="text-red-500">Gagal memuat statistik</p></div>;

  const verifTotal = stats.pending + stats.verified + stats.rejected || 1;
  const pctPending = (stats.pending / verifTotal) * 100;
  const pctVerified = (stats.verified / verifTotal) * 100;
  const pctRejected = (stats.rejected / verifTotal) * 100;

  const maxAngkatan = Math.max(...stats.perAngkatan.map((a) => a.count), 1);
  const sortedUnits = [...stats.perUnit].sort((a, b) => b.count - a.count);
  const maxUnit = Math.max(...sortedUnits.map((u) => u.count), 1);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Alumni" value={stats.total} color="blue" icon={<Icons.Chart size={22} />} />
        <StatCard label="Putra" value={stats.putra} color="blue" icon={<Icons.User size={22} />} />
        <StatCard label="Putri" value={stats.putri} color="pink" icon={<Icons.User size={22} />} />
        <StatCard label="Terverifikasi" value={stats.verified} color="green" icon={<Icons.Check size={22} />} />
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

      {/* Per angkatan chart */}
      <Card className="p-6 mb-6">
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
