import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Input, Select, Textarea, Card, Badge } from "../components/ui";
import { Icons } from "../components/Icon";
import { KELAS_NIHAI_OPTIONS, PRIVACY_LEVELS, STATUS_AKTIVITAS, unitsForGender, type Gender } from "@shared/constants";
import { apiFetch, ApiError } from "../lib/api";

export function EditProfilePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ alumni: Record<string, unknown> }>(`/alumni/by-token/${token}`)
      .then((res) => {
        setForm(res.alumni);
        setLoading(false);
      })
      .catch(() => {
        setError("Token tidak valid atau kedaluwarsa");
        setLoading(false);
      });
  }, [token]);

  const update = useCallback((field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await apiFetch(`/alumni/by-token/${token}`, {
        method: "PUT",
        jsonBody: form,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memperbarui data");
    } finally {
      setSubmitting(false);
    }
  }, [token, form]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8"><p className="text-slate-500">Memuat data...</p></div>;
  if (error && !form.id) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => navigate("/")}>Ke Beranda</Button>
      </Card>
    </div>
  );

  const gender = (form.gender as Gender) || "putra";
  const units = unitsForGender(gender);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Edit Biodata Alumni</h1>
        <Badge color="blue">Mode Edit Mandiri</Badge>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <span className="inline-flex items-center gap-2"><Icons.Success size={18} /> Biodata berhasil diperbarui!</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama Lengkap" name="nama_lengkap" value={String(form.nama_lengkap || "")} onChange={(e) => update("nama_lengkap", e.target.value)} />
          <Input label="Nama Panggilan" name="nama_panggilan" value={String(form.nama_panggilan || "")} onChange={(e) => update("nama_panggilan", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tempat Lahir" name="tempat_lahir" value={String(form.tempat_lahir || "")} onChange={(e) => update("tempat_lahir", e.target.value)} />
            <Input label="Tanggal Lahir" name="tanggal_lahir" type="date" value={String(form.tanggal_lahir || "")} onChange={(e) => update("tanggal_lahir", e.target.value)} />
          </div>
          <Select label="Jenis Kelamin" name="gender" value={String(form.gender || "")} onChange={(e) => update("gender", e.target.value)}>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
          </Select>
          <Select label="Unit" name="unit" value={String(form.unit || "")} onChange={(e) => update("unit", e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Select label="Kelas Nihai" name="kelas_nihai" value={String(form.kelas_nihai || "")} onChange={(e) => update("kelas_nihai", e.target.value)}>
            {KELAS_NIHAI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Angkatan" name="angkatan" value={String(form.angkatan || "")} onChange={(e) => update("angkatan", e.target.value)} maxLength={2} />
            <Input label="Tahun Lulus" name="tahun_lulus" value={String(form.tahun_lulus || "")} onChange={(e) => update("tahun_lulus", e.target.value)} maxLength={4} />
          </div>
          <Input label="No HP / WhatsApp" name="no_hp" value={String(form.no_hp || "")} onChange={(e) => update("no_hp", e.target.value)} />
          <Input label="Email" name="email" value={String(form.email || "")} onChange={(e) => update("email", e.target.value)} />
          <Textarea label="Alamat" name="alamat" value={String(form.alamat || "")} onChange={(e) => update("alamat", e.target.value)} rows={3} />
          <Textarea label="Motto" name="motto" value={String(form.motto || "")} onChange={(e) => update("motto", e.target.value)} rows={2} />
          <Textarea label="Kesan & Pesan" name="kesan_pesan" value={String(form.kesan_pesan || "")} onChange={(e) => update("kesan_pesan", e.target.value)} rows={4} />
          <Textarea label="Momen Berkesan" name="momen_berkesan" value={String(form.momen_berkesan || "")} onChange={(e) => update("momen_berkesan", e.target.value)} rows={4} />
          <Select label="Privasi" name="privacy_level" value={String(form.privacy_level || "public")} onChange={(e) => update("privacy_level", e.target.value)}>
            {PRIVACY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan Perubahan"}</Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>Batal</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
