import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Textarea, Card, Badge } from "../components/ui";
import { Icons } from "../components/Icon";
import {
  KELAS_NIHAI_OPTIONS,
  STATUS_AKTIVITAS,
  unitsForGender,
  type Gender,
  type SosialMedia,
} from "@shared/constants";
import { ApiError } from "../lib/api";
import { compressImage, uploadPhoto } from "../lib/imageCompress";

// Alumni JWT is stored separately from the admin token so it never collides
// with admin auth. apiFetch({ auth: true }) injects the admin token, so we
// use a dedicated helper that injects the alumni Bearer token instead.
const ALUMNI_TOKEN_KEY = "alumni_token";

async function alumniFetch<T>(path: string, options: { method?: string; jsonBody?: unknown } = {}): Promise<T> {
  const token = localStorage.getItem(ALUMNI_TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | null | undefined = undefined;
  if (options.jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.jsonBody);
  }

  const res = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  const contentType = res.headers.get("Content-Type") || "";
  const isJson = contentType.includes("application/json");
  const data: unknown = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && typeof data === "object" && data !== null && "error" in data
      ? String((data as Record<string, unknown>).error)
      : `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

// GET /api/alumni/me returns the raw DB row (snake_case) with sosial_media
// parsed to an object. PUT /api/alumni/me expects camelCase via the zod
// schema, so we convert the loaded row into a camelCase form state.
const SNAKE_TO_CAMEL: Record<string, string> = {
  id: "id",
  nama_lengkap: "namaLengkap",
  nama_pondok: "namaPondok",
  nama_panggilan: "namaPanggilan",
  tempat_lahir: "tempatLahir",
  tanggal_lahir: "tanggalLahir",
  gender: "gender",
  unit: "unit",
  kelas_nihai: "kelasNihai",
  angkatan: "angkatan",
  tahun_lulus: "tahunLulus",
  tahun_masuk: "tahunMasuk",
  nama_angkatan: "namaAngkatan",
  alamat: "alamat",
  no_hp: "noHp",
  email: "email",
  motto: "motto",
  kesan_pesan: "kesanPesan",
  momen_berkesan: "momenBerkesan",
  foto_url: "fotoUrl",
  status_aktivitas: "statusAktivitas",
  detail_aktivitas: "detailAktivitas",
  privacy_level: "privacyLevel",
  photo_privacy: "photoPrivacy",
  pin_code: "pinCode",
  sosial_media: "sosialMedia",
};

function rowToForm(row: Record<string, unknown>): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL)) {
    if (snake in row) form[camel] = row[snake];
  }
  // sosial_media arrives as a parsed object; default to empty structure
  if (!form.sosialMedia || typeof form.sosialMedia !== "object") {
    form.sosialMedia = { instagram: "", facebook: "", linkedin: "", tiktok: "" };
  } else {
    const sm = form.sosialMedia as SosialMedia;
    form.sosialMedia = {
      instagram: sm.instagram || "",
      facebook: sm.facebook || "",
      linkedin: sm.linkedin || "",
      tiktok: sm.tiktok || "",
    };
  }
  // Numeric fields come back as strings/numbers from D1 — keep as-is for inputs
  return form;
}

export function AlumniEditPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem(ALUMNI_TOKEN_KEY);
    if (!token) {
      navigate("/alumni/login", { replace: true });
      return;
    }

    alumniFetch<{ alumni: Record<string, unknown> }>("/alumni/me")
      .then((res) => {
        setForm(rowToForm(res.alumni));
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem(ALUMNI_TOKEN_KEY);
          navigate("/alumni/login", { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : "Gagal memuat data");
        setLoading(false);
      });
  }, [navigate]);

  const update = useCallback((field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateSosial = useCallback((field: keyof SosialMedia, value: string) => {
    setForm((prev) => ({
      ...prev,
      sosialMedia: { ...(prev.sosialMedia as SosialMedia), [field]: value },
    }));
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(ALUMNI_TOKEN_KEY);
    navigate("/", { replace: true });
  }, [navigate]);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    setPhotoUploading(true);
    try {
      const { dataUrl, blob } = await compressImage(file);
      setPhotoPreview(dataUrl);
      const fileName = `alumni-${form.id || "new"}-${Date.now()}.webp`;
      const url = await uploadPhoto(blob, fileName);
      update("fotoUrl", url);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload foto gagal");
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [form.id, update]);

  // When gender changes, reset unit to first available unit for that gender
  const handleGenderChange = useCallback((newGender: Gender) => {
    const firstUnit = unitsForGender(newGender)[0];
    setForm((prev) => ({ ...prev, gender: newGender, unit: firstUnit }));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);
    setSuccessMessage("");

    try {
      // Send camelCase form state; PUT /api/alumni/me validates via zod schema.
      // Omit empty password so we don't trigger validation on optional change.
      const payload: Record<string, unknown> = { ...form };
      if (!payload.password) delete payload.password;

      const res = await alumniFetch<{ message?: string }>("/alumni/me", { method: "PUT", jsonBody: payload });
      setSuccessMessage(
        res.message || "Biodata berhasil diperbarui. Perubahan akan ditinjau oleh admin.",
      );
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem(ALUMNI_TOKEN_KEY);
        navigate("/alumni/login", { replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Gagal memperbarui data");
    } finally {
      setSubmitting(false);
    }
  }, [form, navigate]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-slate-500">Memuat data...</p>
      </div>
    );
  }

  if (error && !form.id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate("/")}>Ke Beranda</Button>
        </Card>
      </div>
    );
  }

  const gender = (form.gender as Gender) || "putra";
  const units = unitsForGender(gender);
  const sosial = (form.sosialMedia || {}) as SosialMedia;
  const fotoUrl = (form.fotoUrl as string) || photoPreview;
  const privacyLevel = (form.privacyLevel as string) || "public";
  const photoPrivacy = (form.photoPrivacy as string) || "public";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Edit Biodata Alumni</h1>
          <Badge color="blue">Mode Edit Mandiri</Badge>
        </div>
        <Button type="button" variant="outline" onClick={handleLogout}>
          <span className="inline-flex items-center gap-2"><Icons.Logout size={18} /> Keluar</span>
        </Button>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <div className="flex items-start gap-2">
            <Icons.Success size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{successMessage}</p>
              <p className="text-sm text-green-600 mt-1">Perubahan akan ditinjau oleh admin sebelum tampil di direktori publik.</p>
            </div>
          </div>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo upload */}
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Foto Profil</h2>
          <div className="flex items-center gap-4">
            <div className={`w-24 h-24 rounded-xl overflow-hidden border-4 border-white shadow-lg flex items-center justify-center flex-shrink-0 ${fotoUrl ? "" : gender === "putra" ? "bg-blue-100 text-blue-400" : "bg-pink-100 text-pink-400"}`}>
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto profil" className="w-full h-full object-cover" />
              ) : (
                <Icons.User size={36} />
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <label
                htmlFor="photo-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${photoUploading ? "bg-slate-300 text-slate-500 cursor-wait" : "bg-[#087348] text-white hover:bg-[#065f37]"}`}
              >
                {photoUploading ? "Mengunggah..." : "Pilih Foto"}
              </label>
              {photoError && <p className="text-sm text-red-600 mt-2">{photoError}</p>}
              {!photoError && (
                <p className="text-xs text-slate-400 mt-2">Format: JPG/PNG/WebP. Maks 1200x1200px, dikompres otomatis.</p>
              )}
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Identitas Diri</h2>
          <Input label="Nama Lengkap" name="namaLengkap" value={String(form.namaLengkap || "")} onChange={(e) => update("namaLengkap", e.target.value)} />
          <Input label="Nama di Pondok (jika berbeda)" name="namaPondok" value={String(form.namaPondok || "")} onChange={(e) => update("namaPondok", e.target.value)} />
          <Input label="Nama Panggilan" name="namaPanggilan" value={String(form.namaPanggilan || "")} onChange={(e) => update("namaPanggilan", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tempat Lahir" name="tempatLahir" value={String(form.tempatLahir || "")} onChange={(e) => update("tempatLahir", e.target.value)} />
            <Input label="Tanggal Lahir" name="tanggalLahir" type="date" value={String(form.tanggalLahir || "")} onChange={(e) => update("tanggalLahir", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleGenderChange("putra")}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${gender === "putra" ? "bg-[#087348] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Putra
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange("putri")}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${gender === "putri" ? "bg-[#087348] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Putri
              </button>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Data Kepesantrenan</h2>
          <Select label="Unit" name="unit" value={String(form.unit || "")} onChange={(e) => update("unit", e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Select label="Kelas Nihai" name="kelasNihai" value={String(form.kelasNihai || "")} onChange={(e) => update("kelasNihai", e.target.value)}>
            {KELAS_NIHAI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Angkatan" name="angkatan" type="number" min={1900} max={2100} placeholder="contoh: 2020" value={String(form.angkatan || "")} onChange={(e) => update("angkatan", e.target.value)} />
            <Input label="Tahun Lulus" name="tahunLulus" type="number" min={1900} max={2100} placeholder="contoh: 2024" value={String(form.tahunLulus || "")} onChange={(e) => update("tahunLulus", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tahun Masuk" name="tahunMasuk" type="number" min={1900} max={2100} placeholder="contoh: 2020" value={String(form.tahunMasuk || "")} onChange={(e) => update("tahunMasuk", e.target.value)} />
            <Input label="Nama Angkatan" name="namaAngkatan" value={String(form.namaAngkatan || "")} onChange={(e) => update("namaAngkatan", e.target.value)} />
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Kontak & Alamat</h2>
          <Input label="No HP / WhatsApp" name="noHp" value={String(form.noHp || "")} onChange={(e) => update("noHp", e.target.value)} />
          <Input label="Email" name="email" type="email" value={String(form.email || "")} onChange={(e) => update("email", e.target.value)} />
          <Textarea label="Alamat" name="alamat" value={String(form.alamat || "")} onChange={(e) => update("alamat", e.target.value)} rows={3} />

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Pesan & Kenangan</h2>
          <Textarea label="Motto" name="motto" value={String(form.motto || "")} onChange={(e) => update("motto", e.target.value)} rows={2} />
          <Textarea label="Kesan & Pesan" name="kesanPesan" value={String(form.kesanPesan || "")} onChange={(e) => update("kesanPesan", e.target.value)} rows={4} />
          <Textarea label="Momen Berkesan" name="momenBerkesan" value={String(form.momenBerkesan || "")} onChange={(e) => update("momenBerkesan", e.target.value)} rows={4} />

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Aktivitas & Sosial Media</h2>
          <Select label="Status Aktivitas" name="statusAktivitas" value={String(form.statusAktivitas || "")} onChange={(e) => update("statusAktivitas", e.target.value)}>
            <option value="">— Pilih —</option>
            {STATUS_AKTIVITAS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="Detail Aktivitas (kampus/tempat kerja/usaha)" name="detailAktivitas" value={String(form.detailAktivitas || "")} onChange={(e) => update("detailAktivitas", e.target.value)} />
          <Input label="Instagram" name="instagram" value={String(sosial.instagram || "")} onChange={(e) => updateSosial("instagram", e.target.value)} />
          <Input label="Facebook" name="facebook" value={String(sosial.facebook || "")} onChange={(e) => updateSosial("facebook", e.target.value)} />
          <Input label="LinkedIn" name="linkedin" value={String(sosial.linkedin || "")} onChange={(e) => updateSosial("linkedin", e.target.value)} />
          <Input label="TikTok" name="tiktok" value={String(sosial.tiktok || "")} onChange={(e) => updateSosial("tiktok", e.target.value)} />

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Pengaturan Privasi</h2>
          {/* Privasi Profil toggle */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium text-slate-700">Privasi Profil</p>
              <p className="text-xs text-slate-400">{privacyLevel === "public" ? "Tampil di direktori publik" : "Tersembunyi dari direktori"}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-semibold ${privacyLevel === "public" ? "text-[#087348]" : "text-slate-400"}`}>
                {privacyLevel === "public" ? "Publik" : "Privat"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={privacyLevel === "public"}
                aria-label="Privasi Profil"
                onClick={() => update("privacyLevel", privacyLevel === "public" ? "private" : "public")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#087348] focus:ring-offset-2 ${privacyLevel === "public" ? "bg-[#087348]" : "bg-slate-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${privacyLevel === "public" ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
          {/* Privasi Foto toggle */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium text-slate-700">Privasi Foto</p>
              <p className="text-xs text-slate-400">{photoPrivacy === "public" ? "Foto tampil" : "Foto tersembunyi"}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-semibold ${photoPrivacy === "public" ? "text-[#087348]" : "text-slate-400"}`}>
                {photoPrivacy === "public" ? "Publik" : "Privat"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={photoPrivacy === "public"}
                aria-label="Privasi Foto"
                onClick={() => update("photoPrivacy", photoPrivacy === "public" ? "private" : "public")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#087348] focus:ring-offset-2 ${photoPrivacy === "public" ? "bg-[#087348]" : "bg-slate-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${photoPrivacy === "public" ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Keamanan</h2>
          <Input label="Password Baru (kosongkan jika tidak diubah)" name="password" type="password" value={String(form.password || "")} onChange={(e) => update("password", e.target.value)} />

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan Perubahan"}</Button>
            <Button type="button" variant="outline" onClick={() => navigate("/")}>Batal</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
