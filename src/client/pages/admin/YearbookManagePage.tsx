import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button, Select, Card } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { apiFetch } from "../../lib/api";
import { PUTRA_UNITS, PUTRI_UNITS } from "@shared/constants";

interface YearbookEntry {
  id: string;
  nama_lengkap: string;
  nama_panggilan: string;
  nama_pondok: string | null;
  gender: string;
  unit: string;
  kelas_nihai: string;
  angkatan: string;
  tahun_lulus: number;
  nama_angkatan: string | null;
  foto_url: string | null;
  motto: string;
  kesan_pesan: string;
  momen_berkesan: string;
  status_aktivitas: string | null;
  detail_aktivitas: string | null;
  tempat_lahir: string;
  tanggal_lahir: string;
}

type LayoutMode = "grid" | "classic" | "directory";
type PaperSize = "a4" | "b5";

export function YearbookManagePage() {
  const [data, setData] = useState<YearbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [paperSize, setPaperSize] = useState<PaperSize>("a4");
  const [perPage, setPerPage] = useState(6);
  const [filters, setFilters] = useState({ tahunLulus: "", angkatan: "", unit: "", gender: "", kelasNihai: "" });

  const allUnits = [...PUTRA_UNITS, ...PUTRI_UNITS];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.tahunLulus) params.set("tahunLulus", filters.tahunLulus);
    if (filters.angkatan) params.set("angkatan", filters.angkatan);
    if (filters.unit) params.set("unit", filters.unit);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.kelasNihai) params.set("kelasNihai", filters.kelasNihai);

    try {
      const res = await apiFetch<{ data: YearbookEntry[] }>(`/admin/yearbook-data?${params}`, { auth: true });
      setData(res.data);
    } catch { setData([]); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group data into pages
  const pages: YearbookEntry[][] = [];
  const itemsPerPage = layout === "classic" ? 2 : layout === "directory" ? 30 : perPage;
  for (let i = 0; i < data.length; i += itemsPerPage) {
    pages.push(data.slice(i, i + itemsPerPage));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 no-print">
        <h1 className="text-2xl font-bold text-slate-800">Desain & Cetak Buku Alumni</h1>
        <Button onClick={() => window.print()}><Icons.Print size={18} /> Cetak / Download PDF</Button>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6 no-print">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          <Select value={filters.tahunLulus} onChange={(e) => setFilters((f) => ({ ...f, tahunLulus: e.target.value }))}>
            <option value="">Semua Tahun</option>
            {Array.from({ length: 20 }, (_, i) => 2024 - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select value={filters.angkatan} onChange={(e) => setFilters((f) => ({ ...f, angkatan: e.target.value }))}>
            <option value="">Semua Angkatan</option>
            {Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0")).map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Select value={filters.unit} onChange={(e) => setFilters((f) => ({ ...f, unit: e.target.value }))}>
            <option value="">Semua Unit</option>
            {allUnits.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Select value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}>
            <option value="">Semua Jenis Kelamin</option>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
          </Select>
          <Select value={filters.kelasNihai} onChange={(e) => setFilters((f) => ({ ...f, kelasNihai: e.target.value }))}>
            <option value="">Semua Kelas</option>
            {["A", "B", "C", "D", "Tidak Paralel"].map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-500">Layout:</span>
            {(["grid", "classic", "directory"] as LayoutMode[]).map((m) => (
              <button key={m} onClick={() => setLayout(m)} className={`px-3 py-1 text-sm rounded-lg ${layout === m ? "bg-primary-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                {m === "grid" ? "Grid Card" : m === "classic" ? "Classic" : "Directory"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-500">Kertas:</span>
            {(["a4", "b5"] as PaperSize[]).map((s) => (
              <button key={s} onClick={() => setPaperSize(s)} className={`px-3 py-1 text-sm rounded-lg ${paperSize === s ? "bg-primary-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          {layout === "grid" && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-500">Per halaman:</span>
              <Select value={String(perPage)} onChange={(e) => setPerPage(Number(e.target.value))}>
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="12">12</option>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Print preview */}
      {loading ? (
        <p className="text-center text-slate-500 py-8">Memuat data...</p>
      ) : data.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">Belum ada data. {pages.length} halaman akan dihasilkan.</Card>
      ) : (
        <div className="bg-slate-200 p-4 rounded-lg">
          {pages.map((pageData, pageNum) => (
            <div key={pageNum} className={`bg-white shadow-lg mx-auto mb-4 ${paperSize === "a4" ? "page-a4" : "page-b5"}`}>
              {/* Page header */}
              <div className="text-center border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-slate-800">BUKU ALUMNI PONPES</h2>
                <p className="text-xs text-slate-500">
                  {[filters.angkatan && `Angkatan ${filters.angkatan}`, filters.tahunLulus && `Lulus ${filters.tahunLulus}`, filters.unit && `Unit ${filters.unit}`, filters.gender && `Jenis Kelamin: ${filters.gender === "putra" ? "Putra" : "Putri"}`].filter(Boolean).join(" • ") || "Semua Alumni"}
                </p>
              </div>

              {/* Grid layout */}
              {layout === "grid" && (
                <div className="grid grid-cols-3 gap-4 yearbook-grid">
                  {pageData.map((entry) => (
                    <div key={entry.id} className="yearbook-card text-center">
                      {entry.foto_url ? (
                        <img src={entry.foto_url} alt={entry.nama_lengkap} className="w-full aspect-square object-cover rounded-lg mb-2" />
                      ) : (
                        <div className="w-full aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center text-slate-300"><Icons.User size={48} /></div>
                      )}
                      <p className="font-semibold text-sm text-slate-800">{entry.nama_lengkap}</p>
                      <p className="text-xs text-slate-500">{entry.unit} • {entry.angkatan}</p>
                      {entry.motto && <p className="text-xs text-slate-600 italic mt-1 line-clamp-2">"{entry.motto}"</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Classic spread */}
              {layout === "classic" && (
                <div className="space-y-6">
                  {pageData.map((entry) => (
                    <div key={entry.id} className="yearbook-card flex gap-6">
                      {entry.foto_url ? (
                        <img src={entry.foto_url} alt={entry.nama_lengkap} className="w-40 h-40 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-40 h-40 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0"><Icons.User size={64} /></div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800">{entry.nama_lengkap}</h3>
                        {entry.nama_pondok && <p className="text-xs text-slate-400">Nama pondok: {entry.nama_pondok}</p>}
                        <p className="text-sm text-slate-500 mb-2">{entry.unit} • Angkatan {entry.angkatan} • Lulus {entry.tahun_lulus}</p>
                        {entry.motto && <blockquote className="border-l-4 border-primary-500 pl-3 text-sm text-slate-700 italic mb-2">"{entry.motto}"</blockquote>}
                        {entry.kesan_pesan && <p className="text-xs text-slate-600 mb-1"><span className="font-medium">Kesan:</span> {entry.kesan_pesan}</p>}
                        {entry.momen_berkesan && <p className="text-xs text-slate-600"><span className="font-medium">Momen:</span> {entry.momen_berkesan}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Directory */}
              {layout === "directory" && (
                <table className="w-full text-xs">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2">Nama</th>
                      <th className="text-left py-2">Unit</th>
                      <th className="text-left py-2">Angkatan</th>
                      <th className="text-left py-2">Lulus</th>
                      <th className="text-left py-2">Kelas</th>
                      <th className="text-left py-2">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100">
                        <td className="py-1.5 font-medium">{entry.nama_lengkap}</td>
                        <td>{entry.unit}</td>
                        <td>{entry.angkatan}</td>
                        <td>{entry.tahun_lulus}</td>
                        <td>{entry.kelas_nihai}</td>
                        <td>{entry.tempat_lahir}, {entry.tanggal_lahir}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Page footer */}
              <div className="text-center text-xs text-slate-400 mt-4 pt-2 border-t border-slate-100">
                Halaman {pageNum + 1} dari {pages.length}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
