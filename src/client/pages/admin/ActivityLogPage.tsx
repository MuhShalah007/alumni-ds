import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Button, Select, Card, Badge } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { Pagination } from "../../components/Pagination";
import { apiFetch } from "../../lib/api";
import { TableSkeleton } from "../../components/Skeleton";

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
interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Human-readable Indonesian labels for action codes.
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

// Badge color per action category for quick visual scanning.
const ACTION_BADGE: Record<string, "green" | "blue" | "yellow" | "red" | "gray"> = {
  CREATE_ALUMNI: "green",
  ALUMNI_REGISTER: "green",
  UPDATE_BIODATA: "blue",
  ALUMNI_EDIT_SELF: "blue",
  ALUMNI_EDIT_TOKEN: "blue",
  VERIFY_ALUMNI: "yellow",
  GENERATE_EDIT_LINK: "gray",
  IMPORT_EXCEL: "gray",
  EXPORT_EXCEL: "gray",
  DELETE_ALUMNI: "red",
};

const ACTION_OPTIONS = Object.keys(ACTION_LABELS).sort((a, b) =>
  ACTION_LABELS[a].localeCompare(ACTION_LABELS[b], "id"),
);

function formatLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase();
}

// Friendly Indonesian rendering of known detail keys.
const DETAIL_KEY_LABELS: Record<string, string> = {
  alumniId: "ID Alumni",
  alumniName: "Nama Alumni",
  status: "Status",
  expiryHours: "Masa Berlaku (jam)",
  oneTime: "Sekali Pakai",
  imported: "Terimpor",
  updated: "Diperbarui",
  skipped: "Dilewati",
  errors: "Error",
  total: "Total",
};

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

// Parse the details JSON string and render key fields as a compact list.
function renderDetails(details: string | null): ReactNode {
  if (!details) return <span className="text-slate-400">—</span>;
  let parsed: unknown;
  try {
    parsed = JSON.parse(details);
  } catch {
    return <span className="text-slate-500 text-xs break-all">{details}</span>;
  }

  if (parsed === null || typeof parsed !== "object") {
    return <span className="text-slate-500 text-xs">{String(parsed)}</span>;
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) return <span className="text-slate-400">—</span>;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {entries.map(([key, val]) => {
        const label = DETAIL_KEY_LABELS[key] ?? key;
        let display: string;
        if (val === null) display = "—";
        else if (typeof val === "boolean") display = val ? "Ya" : "Tidak";
        else if (typeof val === "object") display = JSON.stringify(val);
        else display = String(val);
        return (
          <span key={key} className="text-slate-600">
            <span className="text-slate-400">{label}: </span>
            <span className="text-slate-700">{display}</span>
          </span>
        );
      })}
    </div>
  );
}

export function ActivityLogPage() {
  const [data, setData] = useState<ActivityLogRow[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    if (actionFilter) params.set("action", actionFilter);

    try {
      const res = await apiFetch<{ data: ActivityLogRow[]; pagination: PaginationData }>(
        `/admin/activity-logs?${params}`,
        { auth: true },
      );
      setData(res.data);
      setPagination(res.pagination);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, actionFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Log Aktivitas</h1>
          <p className="text-sm text-slate-500 mt-1">Riwayat aksi admin & alumni pada sistem.</p>
        </div>
        <span className="text-sm text-slate-500">{pagination.total} total</span>
      </div>

      {/* Filter */}
      <Card className="p-4 mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Select
              label="Filter Aksi"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            >
              <option value="">Semua Aksi</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{formatLabel(a)}</option>
              ))}
            </Select>
          </div>
          {actionFilter && (
            <Button variant="ghost" size="sm" onClick={() => { setActionFilter(""); setPagination((p) => ({ ...p, page: 1 })); }}>
              <Icons.Close size={14} /> Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : data.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Belum ada log aktivitas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Admin / Alumni</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Aksi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => {
                  const actor = row.admin_name ?? row.alumni_name ?? "Sistem";
                  const actorKind = row.admin_name ? "Admin" : row.alumni_name ? "Alumni" : "Sistem";
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.created_at ?? null)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icons.User size={16} className="text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-800">{actor}</p>
                            <p className="text-xs text-slate-400">{actorKind}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={ACTION_BADGE[row.action] ?? "gray"}>{formatLabel(row.action)}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-md">{renderDetails(row.details)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        />
      </Card>
    </div>
  );
}
