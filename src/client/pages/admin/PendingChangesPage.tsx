import { useState, useEffect, useCallback } from "react";
import { Button, Card, Badge } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { Pagination } from "../../components/Pagination";
import { apiFetch, ApiError } from "../../lib/api";
import { TableSkeleton } from "../../components/Skeleton";

interface PendingChangeRow {
  id: string;
  alumni_id: string;
  alumni_name: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  status: string;
  proposed_by: string | null;
  created_at: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Human-readable Indonesian field names
const FIELD_LABELS: Record<string, string> = {
  tempat_lahir: "Tempat Lahir",
  tanggal_lahir: "Tanggal Lahir",
  gender: "Jenis Kelamin",
  no_hp: "Nomor HP",
  angkatan: "Angkatan",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

// Render field values with human-readable formatting
function formatValue(field: string, value: string | null): string {
  if (value === null || value === "") return "—";
  if (field === "gender") return value === "putra" ? "Putra" : "Putri";
  if (field === "tanggal_lahir") {
    const d = new Date(value.replace(" ", "T"));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  return value;
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

function proposedByLabel(proposedBy: string | null): string {
  if (!proposedBy) return "—";
  if (proposedBy === "self") return "Alumni (login)";
  if (proposedBy === "token") return "Alumni (token)";
  if (proposedBy.startsWith("admin:")) return `Admin`;
  return proposedBy;
}

export function PendingChangesPage() {
  const [data, setData] = useState<PendingChangeRow[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

    try {
      const res = await apiFetch<{ data: PendingChangeRow[]; pagination: PaginationData }>(
        `/admin/pending-changes?${params}`,
        { auth: true },
      );
      setData(res.data);
      setPagination(res.pagination);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = useCallback(async (id: string) => {
    if (!confirm("Setujui perubahan ini? Nilai baru akan diterapkan ke data alumni.")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/admin/pending-changes/${id}/approve`, { method: "POST", auth: true });
      fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menyetujui perubahan");
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  const handleReject = useCallback(async (id: string) => {
    if (!confirm("Tolak perubahan ini? Nilai lama akan tetap dipertahankan.")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/admin/pending-changes/${id}/reject`, { method: "POST", auth: true });
      fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menolak perubahan");
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Menunggu Persetujuan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Perubahan data sensitif oleh alumni yang menunggu persetujuan admin.
          </p>
        </div>
        <span className="text-sm text-slate-500">{pagination.total} total</span>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : data.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Tidak ada perubahan yang menunggu persetujuan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Alumni</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Field</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Nilai Lama</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Nilai Baru</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Diajukan</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icons.User size={16} className="text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{row.alumni_name}</p>
                          <p className="text-xs text-slate-400">{proposedByLabel(row.proposed_by)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="blue">{fieldLabel(row.field)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="line-through text-slate-400">{formatValue(row.field, row.old_value)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {formatValue(row.field, row.new_value)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(row.id)}
                          disabled={actionLoading === row.id}
                          className="!bg-green-600 hover:!bg-green-700"
                        >
                          {actionLoading === row.id ? "..." : (<><Icons.Check size={14} /> Setujui</>)}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReject(row.id)}
                          disabled={actionLoading === row.id}
                        >
                          {actionLoading === row.id ? "..." : (<><Icons.Close size={14} /> Tolak</>)}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
