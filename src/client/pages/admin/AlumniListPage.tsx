import { useState, useEffect, useCallback } from "react";
import { Button, Select, Input, Card, Badge, Modal } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { Pagination } from "../../components/Pagination";
import { apiFetch, ApiError } from "../../lib/api";
import { PUTRA_UNITS, PUTRI_UNITS } from "@shared/constants";
import { TableSkeleton } from "../../components/Skeleton";

interface AlumniRow {
  id: string;
  nama_lengkap: string;
  nama_panggilan: string;
  gender: string;
  unit: string;
  kelas_nihai: string;
  angkatan: string;
  tahun_lulus: number;
  no_hp: string;
  status_verifikasi: string;
  privacy_level: string;
  foto_url: string | null;
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AlumniListPage() {
  const [data, setData] = useState<AlumniRow[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ gender: "", angkatan: "", unit: "", status: "", search: "" });
  const [sort, setSort] = useState({ column: "created_at", order: "desc" as "asc" | "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailAlumni, setDetailAlumni] = useState<Record<string, unknown> | null>(null);
  const [linkEditLoading, setLinkEditLoading] = useState(false);
  const [editLink, setEditLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.angkatan) params.set("angkatan", filters.angkatan);
    if (filters.unit) params.set("unit", filters.unit);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (sort.column) params.set("sort", sort.column);
    if (sort.order) params.set("order", sort.order);

    try {
      const res = await apiFetch<{ data: AlumniRow[]; pagination: PaginationData }>(`/admin/alumni?${params}`, { auth: true });
      setData(res.data);
      setPagination(res.pagination);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [sort]);

  const handleVerify = useCallback(async (id: string, status: "pending" | "verified" | "rejected") => {
    try {
      await apiFetch(`/admin/alumni/${id}/verify`, { method: "PATCH", auth: true, jsonBody: { status } });
      fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal verifikasi");
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Yakin hapus data alumni ini?")) return;
    try {
      await apiFetch(`/admin/alumni/${id}`, { method: "DELETE", auth: true });
      fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal hapus");
    }
  }, [fetchData]);

  const handleViewDetail = useCallback(async (id: string) => {
    try {
      const res = await apiFetch<{ alumni: Record<string, unknown> }>(`/admin/alumni/${id}`, { auth: true });
      setDetailAlumni(res.alumni);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal memuat detail");
    }
  }, []);

  const handleGenerateEditLink = useCallback(async (id: string) => {
    setLinkEditLoading(true);
    try {
      const res = await apiFetch<{ link: string }>(`/admin/alumni/${id}/generate-edit-link`, {
        auth: true,
        method: "POST",
        jsonBody: { expiryHours: 72, oneTime: true },
      });
      setEditLink(res.link);
      setLinkCopied(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal membuat link edit");
    } finally {
      setLinkEditLoading(false);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!editLink) return;
    try {
      await navigator.clipboard.writeText(editLink);
    } catch {
      // Fallback for non-HTTPS or older browsers
      const input = document.getElementById("edit-link-input") as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand("copy");
      }
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [editLink]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkVerify = useCallback(async (status: "verified" | "rejected") => {
    for (const id of selected) {
      await handleVerify(id, status);
    }
    setSelected(new Set());
  }, [selected, handleVerify]);

  const allUnits = [...PUTRA_UNITS, ...PUTRI_UNITS];

  const SortHeader = ({ column, label }: { column: string; label: string }) => (
    <th className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer select-none hover:bg-slate-100" onClick={() => setSort((s) => ({ column, order: s.column === column && s.order === "asc" ? "desc" : "asc" }))}>
      {label}
      {sort.column === column && <span className="ml-1">{sort.order === "asc" ? "↑" : "↓"}</span>}
    </th>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Data Alumni</h1>
        <span className="text-sm text-slate-500">{pagination.total} total</span>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Input placeholder="Cari nama..." value={filters.search} onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }} />
          <Select value={filters.gender} onChange={(e) => { setFilters((f) => ({ ...f, gender: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
            <option value="">Semua Jenis Kelamin</option>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
          </Select>
          <Select value={filters.unit} onChange={(e) => { setFilters((f) => ({ ...f, unit: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
            <option value="">Semua Unit</option>
            {allUnits.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </Select>
          <Select value={filters.angkatan} onChange={(e) => { setFilters((f) => ({ ...f, angkatan: e.target.value })); setPagination((p) => ({ ...p, page: 1 })); }}>
            <option value="">Semua Angkatan</option>
            {Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0")).map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-lg">
          <span className="text-sm text-primary-700">{selected.size} dipilih</span>
          <Button size="sm" onClick={() => handleBulkVerify("verified")}><Icons.Check size={14} /> Verifikasi Massal</Button>
          <Button size="sm" variant="danger" onClick={() => handleBulkVerify("rejected")}><Icons.Close size={14} /> Tolak Massal</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Batal</Button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : data.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Belum ada data alumni.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(data.map((d) => d.id)) : new Set())} /></th>
                  <SortHeader column="nama_lengkap" label="Nama" />
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Jenis Kelamin</th>
                  <SortHeader column="unit" label="Unit/Angkatan" />
                  <SortHeader column="no_hp" label="No HP" />
                  <SortHeader column="status_verifikasi" label="Status" />
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.foto_url ? <img src={row.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className={`w-8 h-8 rounded-full flex items-center justify-center ${row.gender === "putra" ? "bg-blue-100 text-blue-400" : "bg-pink-100 text-pink-400"}`}><Icons.User size={16} /></div>}
                        <div>
                          <p className="font-medium text-slate-800">{row.nama_lengkap}</p>
                          <p className="text-xs text-slate-400">#{row.id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.gender === "putra" ? "Putra" : "Putri"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">{row.unit}-{row.angkatan} {row.kelas_nihai !== "Tidak Paralel" ? row.kelas_nihai : ""} Th. {row.tahun_lulus}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.no_hp}</td>
                    <td className="px-4 py-3">
                      <Badge color={row.status_verifikasi === "verified" ? "green" : row.status_verifikasi === "rejected" ? "red" : "yellow"}>
                        {row.status_verifikasi}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <button onClick={() => handleViewDetail(row.id)} className="text-xs text-blue-600 hover:underline">Lihat</button>
                        {row.status_verifikasi === "pending" && (
                          <>
                            <button onClick={() => handleVerify(row.id, "verified")} className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded" title="Verifikasi">
                              <Icons.Check size={14} /> Verifikasi
                            </button>
                            <button onClick={() => handleVerify(row.id, "rejected")} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded" title="Tolak">
                              <Icons.Close size={14} /> Tolak
                            </button>
                          </>
                        )}
                        {row.status_verifikasi === "verified" && (
                          <button onClick={() => handleVerify(row.id, "pending")} className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded" title="Batal Verifikasi">
                            Batal Verifikasi
                          </button>
                        )}
                        {row.status_verifikasi === "rejected" && (
                          <button onClick={() => handleVerify(row.id, "verified")} className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded" title="Verifikasi">
                            <Icons.Check size={14} /> Verifikasi
                          </button>
                        )}
                        <button onClick={() => handleDelete(row.id)} className="text-xs text-red-600 hover:underline">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Detail modal */}
      <Modal open={!!detailAlumni} onClose={() => setDetailAlumni(null)} title="Detail Alumni">
        {detailAlumni && (() => {
          const a = detailAlumni as Record<string, unknown>;
          const shortId = String(a.id ?? "").slice(-8).toUpperCase();
          const unit = String(a.unit ?? "");
          const angkatan = String(a.angkatan ?? "");
          const kelas = String(a.kelas_nihai ?? "");
          const tahunLulus = a.tahun_lulus ?? "";
          const unitFormat = `${unit}-${angkatan} ${kelas !== "Tidak Paralel" ? kelas : ""} Th. ${tahunLulus}`.replace(/\s+/g, " ").trim();
          const sosmed = a.sosial_media ? (typeof a.sosial_media === "string" ? JSON.parse(a.sosial_media as string) : a.sosial_media) : null;
          const fmtDate = (v: unknown) => v ? new Date(String(v)).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
          const fmtDateTime = (v: unknown) => v ? new Date(String(v).replace(" ", "T")).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
          const val = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);

          return (
            <div className="space-y-4">
              {/* Header card */}
              <div className="flex items-start gap-4">
                {a.foto_url ? (
                  <img src={String(a.foto_url)} alt={String(a.nama_lengkap)} className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300"><Icons.User size={36} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800">{val(a.nama_lengkap)}</h3>
                  {a.nama_pondok ? <p className="text-sm text-slate-500">Pondok: {val(a.nama_pondok)}</p> : null}
                  <p className="text-sm text-slate-600 mt-1">{unitFormat}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge color={a.gender === "putra" ? "blue" : "gray"}>{a.gender === "putra" ? "Putra" : "Putri"}</Badge>
                    <Badge color={a.status_verifikasi === "verified" ? "green" : a.status_verifikasi === "rejected" ? "red" : "yellow"}>{String(a.status_verifikasi)}</Badge>
                    <Badge color={a.privacy_level === "private" ? "red" : a.privacy_level === "alumni_only" ? "yellow" : "green"}>{String(a.privacy_level).replace("_", " ")}</Badge>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">ID Alumni</p><p className="font-mono text-slate-700">#{shortId}</p></div>
                <div><p className="text-xs text-slate-400">Nama Panggilan</p><p className="text-slate-700">{val(a.nama_panggilan)}</p></div>
                <div><p className="text-xs text-slate-400">Tempat, Tgl Lahir</p><p className="text-slate-700">{val(a.tempat_lahir)}, {fmtDate(a.tanggal_lahir)}</p></div>
                <div><p className="text-xs text-slate-400">Tahun Masuk</p><p className="text-slate-700">{val(a.tahun_masuk)}</p></div>
                <div><p className="text-xs text-slate-400">Nama Angkatan</p><p className="text-slate-700">{val(a.nama_angkatan)}</p></div>
                <div><p className="text-xs text-slate-400">Privasi Foto</p><p className="text-slate-700">{a.photo_privacy === "private" ? "Privat" : "Publik"}</p></div>
              </div>

              {/* Contact */}
              <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                <div className="flex gap-2"><span className="text-slate-400 w-20">No HP</span><span className="text-slate-700">{val(a.no_hp)}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-20">Email</span><span className="text-slate-700">{val(a.email)}</span></div>
                <div className="flex gap-2"><span className="text-slate-400 w-20">Alamat</span><span className="text-slate-700">{val(a.alamat)}</span></div>
              </div>

              {/* Yearbook content */}
              <div className="border-t border-slate-100 pt-3 space-y-3 text-sm">
                <div><p className="text-xs text-slate-400 mb-0.5">Motto</p><p className="text-slate-700 italic">"{val(a.motto)}"</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Kesan & Pesan</p><p className="text-slate-700">{val(a.kesan_pesan)}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Momen Berkesan</p><p className="text-slate-700">{val(a.momen_berkesan)}</p></div>
              </div>

              {/* Activity */}
              {(a.status_aktivitas || a.detail_aktivitas) && (
                <div className="border-t border-slate-100 pt-3 text-sm">
                  <p className="text-xs text-slate-400 mb-0.5">Aktivitas</p>
                  <p className="text-slate-700">{val(a.status_aktivitas)}{a.detail_aktivitas ? ` — ${val(a.detail_aktivitas)}` : ""}</p>
                </div>
              )}

              {/* Social media */}
              {sosmed && (
                <div className="border-t border-slate-100 pt-3 text-sm">
                  <p className="text-xs text-slate-400 mb-1">Sosial Media</p>
                  <div className="flex flex-wrap gap-3">
                    {sosmed.instagram && <span className="text-slate-700">IG: {sosmed.instagram}</span>}
                    {sosmed.facebook && <span className="text-slate-700">FB: {sosmed.facebook}</span>}
                    {sosmed.linkedin && <span className="text-slate-700">in: {sosmed.linkedin}</span>}
                    {sosmed.tiktok && <span className="text-slate-700">TikTok: {sosmed.tiktok}</span>}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>Dibuat: {fmtDateTime(a.created_at)}</div>
                <div>Update: {fmtDateTime(a.updated_at)}</div>
                {a.verified_at ? <div>Verifikasi: {fmtDateTime(a.verified_at)}{a.verified_by_name ? ` oleh ${a.verified_by_name}` : ""}</div> : null}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shortId); }}>
                  <Icons.Copy size={14} /> Salin ID
                </Button>
                <Button size="sm" variant="outline" disabled={linkEditLoading} onClick={() => handleGenerateEditLink(String(a.id))}>
                  <Icons.Link size={14} /> {linkEditLoading ? "Membuat..." : "Link Edit"}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit link modal */}
      <Modal open={!!editLink} onClose={() => setEditLink(null)} title="Link Edit Alumni">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Link edit berikut dapat dibagikan ke alumni untuk mengubah data mereka sendiri. Berlaku 72 jam dan hanya bisa digunakan sekali.
          </p>
          <div className="flex gap-2">
            <input
              id="edit-link-input"
              type="text"
              readOnly
              value={editLink ?? ""}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 text-sm border border-[#E4E4E7] rounded-lg bg-slate-50 text-slate-700 font-mono outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button size="sm" onClick={handleCopyLink}>
              {linkCopied ? <><Icons.Check size={14} /> Tersalin!</> : <><Icons.Copy size={14} /> Salin</>}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditLink(null)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
