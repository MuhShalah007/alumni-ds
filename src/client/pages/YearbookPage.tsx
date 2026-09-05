import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button, Select, Input, Card } from "../components/ui";
import { Icons } from "../components/Icon";
import { apiFetch } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { PUTRA_UNITS, PUTRI_UNITS } from "@shared/constants";

// Check if alumni is logged in (separate from admin auth)
function getAlumniToken(): string | null {
  return localStorage.getItem("alumni_token");
}
interface YearbookEntry {
  id: string;
  nama_lengkap: string;
  nama_panggilan: string;
  gender: string;
  unit: string;
  kelas_nihai: string;
  angkatan: string;
  tahun_lulus: number;
  foto_url: string | null;
  motto: string;
}

type LayoutMode = "grid" | "classic" | "directory";

export function YearbookPage() {
  const { admin } = useAuth();
  const alumniToken = getAlumniToken();
  const isAlumni = !admin && !!alumniToken;
  const [data, setData] = useState<YearbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [filters, setFilters] = useState({ tahunLulus: "", angkatan: "", unit: "", search: "" });

  // Units are scoped by admin role or alumni gender
  const scopedUnits = useMemo(() => {
    if (isAlumni) return [...PUTRA_UNITS, ...PUTRI_UNITS]; // alumni sees their own gender data, all units for that gender
    if (!admin) return [...PUTRA_UNITS, ...PUTRI_UNITS];
    if (admin.role === "admin_putra") return PUTRA_UNITS;
    if (admin.role === "admin_putri") return PUTRI_UNITS;
    if (admin.role === "admin_unit" && admin.assignedGender === "putra") return PUTRA_UNITS;
    if (admin.role === "admin_unit" && admin.assignedGender === "putri") return PUTRI_UNITS;
    return [...PUTRA_UNITS, ...PUTRI_UNITS];
  }, [admin, isAlumni]);

  // Scope label for display
  const scopeLabel = useMemo(() => {
    if (isAlumni) return "Buku Alumni";
    if (!admin) return "";
    if (admin.role === "super_admin") return "Semua Alumni";
    if (admin.role === "admin_putra") return "Alumni Putra";
    if (admin.role === "admin_putri") return "Alumni Putri";
    if (admin.role === "admin_unit") return `Unit ${admin.assignedUnit ?? ""}`;
    return "";
  }, [admin, isAlumni]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.tahunLulus) params.set("tahunLulus", filters.tahunLulus);
    if (filters.angkatan) params.set("angkatan", filters.angkatan);
    if (filters.unit) params.set("unit", filters.unit);

    try {
      let res: { data: YearbookEntry[] };
      if (isAlumni) {
        // Alumni uses /api/alumni/yearbook (gender-scoped by own gender)
        const token = localStorage.getItem("alumni_token");
        const resp = await fetch(`/api/alumni/yearbook`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        res = await resp.json() as { data: YearbookEntry[] };
      } else {
        // Admin uses /api/admin/yearbook-data (gender-scoped by admin role)
        res = await apiFetch<{ data: YearbookEntry[] }>(`/admin/yearbook-data?${params}`, { auth: true });
      }
      let filtered = res.data;
      if (filters.tahunLulus) filtered = filtered.filter((d) => String(d.tahun_lulus) === filters.tahunLulus);
      if (filters.angkatan) filtered = filtered.filter((d) => d.angkatan === filters.angkatan);
      if (filters.unit) filtered = filtered.filter((d) => d.unit === filters.unit);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter((d) => d.nama_lengkap.toLowerCase().includes(q) || d.nama_panggilan.toLowerCase().includes(q));
      }
      setData(filtered);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters, isAlumni]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Buku Alumni</h1>
          <p className="text-sm text-slate-600">
            {data.length} alumni{scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Icons.Print size={18} /> Cetak / PDF</Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 no-print">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input placeholder="Cari nama..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          <Select value={filters.tahunLulus} onChange={(e) => setFilters((f) => ({ ...f, tahunLulus: e.target.value }))}>
            <option value="">Semua Tahun Lulus</option>
            {Array.from({ length: 20 }, (_, i) => 2024 - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select value={filters.angkatan} onChange={(e) => setFilters((f) => ({ ...f, angkatan: e.target.value }))}>
            <option value="">Semua Angkatan</option>
            {Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0")).map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select value={filters.unit} onChange={(e) => setFilters((f) => ({ ...f, unit: e.target.value }))}>
            <option value="">Semua Unit</option>
            {scopedUnits.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="text-sm text-slate-500 self-center mr-2">Layout:</span>
          {(["grid", "classic", "directory"] as LayoutMode[]).map((m) => (
            <button key={m} onClick={() => setLayout(m)} className={`px-3 py-1 text-sm rounded-lg ${layout === m ? "bg-primary-700 text-white" : "bg-slate-100 text-slate-600"}`}>
              {m === "grid" ? "Grid Card" : m === "classic" ? "Classic Spread" : "Directory"}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <p className="text-slate-500 text-center py-8">Memuat data...</p>
      ) : data.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">Belum ada data alumni untuk {scopeLabel || "kategori ini"}.</Card>
      ) : (
        <>
          {/* Grid layout */}
          {layout === "grid" && (
            <div className="yearbook-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.map((entry) => (
                <Link key={entry.id} to={`/p/${entry.id}`} className="yearbook-card bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  {entry.foto_url ? (
                    <img src={entry.foto_url} alt={entry.nama_lengkap} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className={`w-full aspect-square flex items-center justify-center ${entry.gender === "putra" ? "bg-blue-50 text-blue-300" : "bg-pink-50 text-pink-300"}`}><Icons.User size={48} /></div>
                  )}
                  <div className="p-3">
                    <p className="font-medium text-sm text-slate-800 truncate">{entry.nama_lengkap}</p>
                    <p className="text-xs text-slate-500">{entry.unit}-{entry.angkatan} {entry.kelas_nihai !== "Tidak Paralel" ? entry.kelas_nihai : ""} Th. {entry.tahun_lulus}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Classic spread layout */}
          {layout === "classic" && (
            <div className="space-y-6">
              {data.map((entry, i) => (
                <div key={entry.id} className={`yearbook-card flex gap-6 bg-white rounded-xl border border-slate-200 p-6 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
                  {entry.foto_url ? (
                    <img src={entry.foto_url} alt={entry.nama_lengkap} className="w-48 h-48 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-48 h-48 rounded-lg flex items-center justify-center flex-shrink-0 ${entry.gender === "putra" ? "bg-blue-50 text-blue-300" : "bg-pink-50 text-pink-300"}`}><Icons.User size={64} /></div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">{entry.nama_lengkap}</h3>
                    <p className="text-sm text-slate-500 mb-3">{entry.unit}-{entry.angkatan} {entry.kelas_nihai !== "Tidak Paralel" ? entry.kelas_nihai : ""} Th. {entry.tahun_lulus}</p>
                    {entry.motto && <blockquote className="border-l-4 border-primary-500 pl-4 text-slate-700 italic mb-3">"{entry.motto}"</blockquote>}
                    <Link to={`/p/${entry.id}`} className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">Lihat profil lengkap <Icons.ArrowRight size={14} /></Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Directory layout */}
          {layout === "directory" && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Nama</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Unit/Angkatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><Link to={`/p/${entry.id}`} className="text-primary-600 hover:underline font-medium">{entry.nama_lengkap}</Link></td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-medium">{entry.unit}-{entry.angkatan} {entry.kelas_nihai !== "Tidak Paralel" ? entry.kelas_nihai : ""} Th. {entry.tahun_lulus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
