import { useState, useCallback } from "react";
import { Button, Select, Card, Badge, Modal } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { apiFetch, ApiError } from "../../lib/api";
import * as XLSX from "xlsx";

interface ExportRow {
  no: number;
  namaLengkap: string;
  namaPondok: string | null;
  panggilan: string;
  jenisKelamin: string;
  unit: string;
  kelasNihai: string;
  angkatan: string;
  tahunLulus: number;
  tahunMasuk: number | null;
  ttl: string;
  alamat: string;
  noHp: string;
  email: string | null;
  motto: string;
  kesanPesan: string;
  momenBerkesan: string;
  fotoUrl: string | null;
  statusAktivitas: string | null;
  detailAktivitas: string | null;
  privacyLevel: string;
  status: string;
}

export function ExcelPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "update">("skip");
  const [filters, setFilters] = useState({ tahunLulus: "", angkatan: "", unit: "", gender: "", status: "" });

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.tahunLulus) params.set("tahunLulus", filters.tahunLulus);
      if (filters.angkatan) params.set("angkatan", filters.angkatan);
      if (filters.unit) params.set("unit", filters.unit);
      if (filters.gender) params.set("gender", filters.gender);
      if (filters.status) params.set("status", filters.status);

      const res = await apiFetch<{ data: ExportRow[] }>(`/admin/export/excel?${params}`, { auth: true });

      const ws = XLSX.utils.json_to_sheet(res.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Alumni");
      XLSX.writeFile(wb, `alumni-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Export gagal");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleDownloadTemplate = useCallback(() => {
    const template = [{
      namaLengkap: "Contoh Nama",
      namaPondok: "",
      panggilan: "Contoh",
      jenisKelamin: "putra",
      unit: "KMI",
      kelasNihai: "A",
      angkatan: "15",
      tahunLulus: 2021,
      tahunMasuk: 2018,
      tempatLahir: "Jakarta",
      tanggalLahir: "2000-01-01",
      alamat: "Jl. Contoh No. 1",
      noHp: "081234567890",
      email: "contoh@email.com",
      motto: "Contoh motto",
      kesanPesan: "Contoh kesan",
      momenBerkesan: "Contoh momen",
      statusAktivitas: "Kuliah",
      detailAktivitas: "Universitas Contoh",
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template-import-alumni.xlsx");
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const res = await apiFetch<{ inserted: number; updated: number; skipped: number; errors: string[] }>("/admin/import/excel", {
        method: "POST",
        auth: true,
        jsonBody: { rows, duplicateStrategy },
      });

      setImportResult(res);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Import gagal");
    } finally {
      setImporting(false);
    }
  }, [duplicateStrategy]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Import & Export Excel</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <Card className="p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Icons.FileExcel size={20} /> Export Data</h2>
          <p className="text-sm text-slate-600 mb-4">Download semua data alumni ke file Excel (.xlsx) dengan filter opsional.</p>

          <div className="space-y-3 mb-4">
            <Select value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">Semua Jenis Kelamin</option>
              <option value="putra">Putra</option>
              <option value="putri">Putri</option>
            </Select>
            <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>

          <Button onClick={handleExport} disabled={exporting} className="w-full">
            {exporting ? "Mengexport..." : "Download Excel"}
          </Button>
        </Card>

        {/* Import */}
        <Card className="p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Icons.FileImport size={20} /> Import Data</h2>
          <p className="text-sm text-slate-600 mb-4">Upload file Excel untuk batch import data alumni.</p>

          <Button variant="outline" onClick={handleDownloadTemplate} className="w-full mb-4">
            <Icons.FileExcel size={16} className="inline" /> Download Template
          </Button>

          <div className="space-y-3 mb-4">
            <Select value={duplicateStrategy} onChange={(e) => setDuplicateStrategy(e.target.value as "skip" | "update")}>
              <option value="skip">Skip duplikat (abaikan)</option>
              <option value="update">Update duplikat (timpa data)</option>
            </Select>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} disabled={importing} className="hidden" id="import-file" />
            <label htmlFor="import-file" className="cursor-pointer flex flex-col items-center gap-2 text-sm text-primary-600 hover:underline">
              <Icons.FileImport size={32} className="text-slate-400" />
              {importing ? "Mengimport..." : "Pilih file Excel"}
            </label>
          </div>
        </Card>
      </div>

      {/* Import result modal */}
      <Modal open={!!importResult} onClose={() => setImportResult(null)} title="Hasil Import">
        {importResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{importResult.inserted}</p>
                <p className="text-xs text-slate-600">Insert</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                <p className="text-xs text-slate-600">Update</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{importResult.skipped}</p>
                <p className="text-xs text-slate-600">Skip</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto p-3 bg-red-50 rounded-lg">
                <p className="text-xs font-medium text-red-700 mb-1">Errors ({importResult.errors.length}):</p>
                {importResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600">{err}</p>)}
              </div>
            )}
            <Button onClick={() => setImportResult(null)}>Tutup</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
