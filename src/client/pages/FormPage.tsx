import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Textarea, Card, Modal, Badge } from "../components/ui";
import { Icons } from "../components/Icon";
import { PUTRA_UNITS, PUTRI_UNITS, KELAS_NIHAI_OPTIONS, PRIVACY_LEVELS, STATUS_AKTIVITAS, unitsForGender, type Gender } from "@shared/constants";
import { normalizePhone } from "../lib/phone";
import { compressImage, uploadPhoto } from "../lib/imageCompress";
import { apiFetch, ApiError } from "../lib/api";

const TOTAL_STEPS = 6;
const DRAFT_KEY = "alumni_form_draft";

interface FormData {
  namaLengkap: string;
  namaPondok: string;
  namaPanggilan: string;
  tempatLahir: string;
  tanggalLahir: string;
  gender: Gender | "";
  unit: string;
  kelasNihai: string;
  angkatan: string;
  tahunLulus: string;
  tahunMasuk: string;
  namaAngkatan: string;
  alamat: string;
  noHp: string;
  email: string;
  motto: string;
  kesanPesan: string;
  momenBerkesan: string;
  fotoUrl: string;
  sosialMedia: { instagram: string; facebook: string; linkedin: string; tiktok: string };
  statusAktivitas: string;
  detailAktivitas: string;
  privacyLevel: string;
  photoPrivacy: string;
  password: string;
  pinCode: string;
}

const emptyForm: FormData = {
  namaLengkap: "", namaPondok: "", namaPanggilan: "", tempatLahir: "", tanggalLahir: "",
  gender: "", unit: "", kelasNihai: "", angkatan: "", tahunLulus: "", tahunMasuk: "",
  namaAngkatan: "", alamat: "", noHp: "", email: "", motto: "", kesanPesan: "",
  momenBerkesan: "", fotoUrl: "", sosialMedia: { instagram: "", facebook: "", linkedin: "", tiktok: "" },
  statusAktivitas: "", detailAktivitas: "", privacyLevel: "public", photoPrivacy: "public", password: "", pinCode: "",
};

export function FormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoSize, setPhotoSize] = useState<string>("");
  const [duplicateModal, setDuplicateModal] = useState<{ nameInitial: string; namaPanggilan: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ id: string; editToken: string } | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setForm({ ...emptyForm, ...parsed });
        if (parsed.fotoUrl) setPhotoPreview(parsed.fotoUrl);
      } catch { /* ignore corrupt draft */ }
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const update = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const updateSosmed = useCallback((field: keyof FormData["sosialMedia"], value: string) => {
    setForm((prev) => ({ ...prev, sosialMedia: { ...prev.sosialMedia, [field]: value } }));
  }, []);

  // When gender changes, reset unit if incompatible
  const handleGenderChange = useCallback((value: string) => {
    setForm((prev) => {
      const newGender = value as Gender;
      const validUnits = unitsForGender(newGender);
      const unit = validUnits.includes(prev.unit as never) ? prev.unit : "";
      return { ...prev, gender: newGender, unit };
    });
  }, []);

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUrl, sizeKB, width, height } = await compressImage(file);
      setPhotoPreview(dataUrl);
      setPhotoSize(`${sizeKB}KB (${width}×${height})`);

      // Upload to server
      const url = await uploadPhoto(await (await fetch(dataUrl)).blob(), file.name);
      update("fotoUrl", url);
    } catch (err) {
      setErrors((prev) => ({ ...prev, fotoUrl: err instanceof Error ? err.message : "Upload gagal" }));
    }
  }, [update]);

  const checkPhone = useCallback(async () => {
    const normalized = normalizePhone(form.noHp);
    if (!normalized) {
      setErrors((prev) => ({ ...prev, noHp: "Nomor HP tidak valid" }));
      return false;
    }

    try {
      const res = await apiFetch<{ available: boolean; existing?: { nameInitial: string; namaPanggilan: string } }>("/alumni/check-phone", {
        method: "POST",
        jsonBody: { noHp: form.noHp },
      });

      if (!res.available && res.existing) {
        setDuplicateModal(res.existing);
        return false;
      }
      return true;
    } catch {
      return true; // Allow continue on network error
    }
  }, [form.noHp]);

  const validateStep = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!form.namaLengkap || form.namaLengkap.length < 2) errs.namaLengkap = "Nama lengkap minimal 2 karakter";
      if (!form.namaPanggilan) errs.namaPanggilan = "Nama panggilan wajib diisi";
      if (!form.tempatLahir) errs.tempatLahir = "Tempat lahir wajib diisi";
      if (!form.tanggalLahir) errs.tanggalLahir = "Tanggal lahir wajib diisi";
      if (!form.gender) errs.gender = "Pilih Jenis Kelamin";
    } else if (step === 2) {
      if (!form.unit) errs.unit = "Pilih unit";
      if (!form.kelasNihai) errs.kelasNihai = "Pilih kelas nihai";
      if (!/^\d{2}$/.test(form.angkatan)) errs.angkatan = "Angkatan format 2 digit (contoh: 15)";
      if (!/^\d{4}$/.test(form.tahunLulus)) errs.tahunLulus = "Tahun lulus format 4 digit (contoh: 2021)";
    } else if (step === 3) {
      if (!form.alamat) errs.alamat = "Alamat wajib diisi";
      if (!form.noHp) errs.noHp = "Nomor HP wajib diisi";
      const normalized = normalizePhone(form.noHp);
      if (form.noHp && !normalized) errs.noHp = "Format nomor HP tidak valid";
    } else if (step === 4) {
      if (!form.motto) errs.motto = "Motto wajib diisi";
      if (!form.kesanPesan) errs.kesanPesan = "Kesan & pesan wajib diisi";
      if (!form.momenBerkesan) errs.momenBerkesan = "Momen berkesan wajib diisi";
    } else if (step === 6) {
      if (!form.password || form.password.length < 6) errs.password = "Password minimal 6 karakter";
      if (form.pinCode && !/^\d{6}$/.test(form.pinCode)) errs.pinCode = "PIN harus 6 digit";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [step, form]);

  const nextStep = useCallback(async () => {
    if (!validateStep()) return;

    // Check phone on step 3 before proceeding
    if (step === 3) {
      const ok = await checkPhone();
      if (!ok) return;
    }

    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [step, validateStep, checkPhone]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    // Final phone check
    const phoneOk = await checkPhone();
    if (!phoneOk) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await apiFetch<{ success: boolean; id: string; editToken: string }>("/alumni/submit", {
        method: "POST",
        jsonBody: form,
      });

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      setSuccessModal({ id: res.id, editToken: res.editToken });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDuplicateModal({ nameInitial: "?", namaPanggilan: "Sudah terdaftar" });
      } else {
        setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, validateStep, checkPhone]);

  const units = form.gender ? unitsForGender(form.gender) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Formulir Biodata Alumni</h1>
        <p className="text-sm text-slate-600">Isi data Anda untuk masuk ke dalam Darusy Syahadah</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 no-print">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s <= step ? "bg-primary-700 text-white" : "bg-slate-200 text-slate-500"
            }`}>
              {s < step ? <Icons.Check size={14} /> : s}
            </div>
            {s < TOTAL_STEPS && (
              <div className={`flex-1 h-0.5 mx-1 ${s < step ? "bg-primary-700" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Identitas Diri */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Langkah 1: Identitas Diri</h2>
              <Input label="Nama Lengkap *" name="namaLengkap" value={form.namaLengkap} onChange={(e) => update("namaLengkap", e.target.value)} error={errors.namaLengkap} placeholder="Nama lengkap sesuai KTP" />
              <Input label="Nama Lengkap di Pondok" name="namaPondok" value={form.namaPondok} onChange={(e) => update("namaPondok", e.target.value)} placeholder="Jika berbeda dengan nama sekarang" />
              <Input label="Nama Panggilan *" name="namaPanggilan" value={form.namaPanggilan} onChange={(e) => update("namaPanggilan", e.target.value)} error={errors.namaPanggilan} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Tempat Lahir *" name="tempatLahir" value={form.tempatLahir} onChange={(e) => update("tempatLahir", e.target.value)} error={errors.tempatLahir} />
                <Input label="Tanggal Lahir *" name="tanggalLahir" type="date" value={form.tanggalLahir} onChange={(e) => update("tanggalLahir", e.target.value)} error={errors.tanggalLahir} />
              </div>
              <Select label="Jenis Kelamin *" name="gender" value={form.gender} onChange={(e) => handleGenderChange(e.target.value)} error={errors.gender}>
                <option value="">Pilih Jenis Kelamin</option>
                <option value="putra">Putra</option>
                <option value="putri">Putri</option>
              </Select>
            </div>
          )}

          {/* Step 2: Data Kepesantrenan */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Langkah 2: Data Kepesantrenan</h2>
              <Select label="Unit *" name="unit" value={form.unit} onChange={(e) => update("unit", e.target.value)} error={errors.unit} disabled={!form.gender}>
                <option value="">Pilih unit</option>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
              <Select label="Kelas Nihai (Di Nihai) *" name="kelasNihai" value={form.kelasNihai} onChange={(e) => update("kelasNihai", e.target.value)} error={errors.kelasNihai}>
                <option value="">Pilih kelas</option>
                {KELAS_NIHAI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Angkatan (DD) *" name="angkatan" value={form.angkatan} onChange={(e) => update("angkatan", e.target.value)} error={errors.angkatan} placeholder="contoh: 15" maxLength={2} />
                <Input label="Tahun Lulus (YYYY) *" name="tahunLulus" value={form.tahunLulus} onChange={(e) => update("tahunLulus", e.target.value)} error={errors.tahunLulus} placeholder="contoh: 2021" maxLength={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Tahun Masuk" name="tahunMasuk" value={form.tahunMasuk} onChange={(e) => update("tahunMasuk", e.target.value)} placeholder="contoh: 2018" maxLength={4} />
                <Input label="Nama Angkatan" name="namaAngkatan" value={form.namaAngkatan} onChange={(e) => update("namaAngkatan", e.target.value)} placeholder="contoh: Generasi 15 / Al-Farabi" />
              </div>
            </div>
          )}

          {/* Step 3: Kontak & Alamat */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Langkah 3: Kontak & Alamat</h2>
              <Input label="Nomor HP / WhatsApp *" name="noHp" value={form.noHp} onChange={(e) => update("noHp", e.target.value)} error={errors.noHp} placeholder="0812-3456-7890" />
              <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              <Textarea label="Alamat Domisili/Asal *" name="alamat" value={form.alamat} onChange={(e) => update("alamat", e.target.value)} error={errors.alamat} rows={3} />
            </div>
          )}

          {/* Step 4: Pesan & Kenangan */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Langkah 4: Pesan & Kenangan Buku Alumni</h2>
              <Textarea label="Motto Hidup *" name="motto" value={form.motto} onChange={(e) => update("motto", e.target.value)} error={errors.motto} rows={2} placeholder="Motto hidup Anda" />
              <Textarea label="Kesan & Pesan di Pondok *" name="kesanPesan" value={form.kesanPesan} onChange={(e) => update("kesanPesan", e.target.value)} error={errors.kesanPesan} rows={4} placeholder="Kesan dan pesan selama di pondok" />
              <Textarea label="Momen Paling Berkesan *" name="momenBerkesan" value={form.momenBerkesan} onChange={(e) => update("momenBerkesan", e.target.value)} error={errors.momenBerkesan} rows={4} placeholder="Momen paling berkesan di pondok" />
            </div>
          )}

          {/* Step 5: Foto & Sosial Media */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Langkah 5: Foto & Media Sosial</h2>

              {/* Photo upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Foto Terkini</label>
                <div className="flex items-start gap-4">
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-slate-200" />
                  )}
                  <div className="flex-1 space-y-2">
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                    {photoSize && <p className="text-xs text-slate-500">Ukuran: {photoSize}</p>}
                    {errors.fotoUrl && <p className="text-xs text-red-600">{errors.fotoUrl}</p>}
                    <p className="text-xs text-slate-400">Foto akan dikompresi otomatis (max 1200×1200px, &lt;300KB)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Instagram" name="instagram" value={form.sosialMedia.instagram} onChange={(e) => updateSosmed("instagram", e.target.value)} placeholder="@username" />
                <Input label="Facebook" name="facebook" value={form.sosialMedia.facebook} onChange={(e) => updateSosmed("facebook", e.target.value)} />
                <Input label="LinkedIn" name="linkedin" value={form.sosialMedia.linkedin} onChange={(e) => updateSosmed("linkedin", e.target.value)} />
                <Input label="TikTok" name="tiktok" value={form.sosialMedia.tiktok} onChange={(e) => updateSosmed("tiktok", e.target.value)} />
              </div>

              <Select label="Aktivitas Saat Ini" name="statusAktivitas" value={form.statusAktivitas} onChange={(e) => update("statusAktivitas", e.target.value)}>
                <option value="">Pilih aktivitas</option>
                {STATUS_AKTIVITAS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Detail Aktivitas (Kampus/Tempat Kerja/Usaha)" name="detailAktivitas" value={form.detailAktivitas} onChange={(e) => update("detailAktivitas", e.target.value)} />
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Langkah 6: Keamanan & Privasi</h2>
              <Input label="Password *" name="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} error={errors.password} placeholder="Minimal 6 karakter" />
              <p className="text-xs text-slate-500 -mt-2">
                Password digunakan untuk login dan mengedit biodata Anda sendiri.
              </p>
              <Select label="Tingkat Privasi Profil *" name="privacyLevel" value={form.privacyLevel} onChange={(e) => update("privacyLevel", e.target.value)}>
                <option value="public">Public — Tampil di daftar alumni</option>
                <option value="alumni_only">Alumni Only — Hanya untuk alumni</option>
                <option value="private">Private — Hanya nama, angkatan & tahun lulus</option>
              </Select>
              <Select label="Privasi Foto" name="photoPrivacy" value={form.photoPrivacy} onChange={(e) => update("photoPrivacy", e.target.value)}>
                <option value="public">Foto Tampil — Foto dapat dilihat publik</option>
                <option value="private">Foto Privat — Foto hanya untuk admin</option>
              </Select>
              <Input label="PIN Edit (6 digit, opsional)" name="pinCode" value={form.pinCode} onChange={(e) => update("pinCode", e.target.value)} error={errors.pinCode} placeholder="000000" maxLength={6} />
              <p className="text-xs text-slate-500">
                PIN alternatif untuk edit biodata tanpa login.
              </p>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={prevStep} disabled={step === 1}>
              <Icons.ArrowLeft size={16} /> Sebelumnya
            </Button>
            {step < TOTAL_STEPS ? (
              <Button type="button" onClick={nextStep}>
                Selanjutnya <Icons.ArrowRight size={16} />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : <><Icons.Check size={16} /> Kirim Biodata</>}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Duplicate phone modal */}
      <Modal open={!!duplicateModal} onClose={() => setDuplicateModal(null)} title="Nomor HP Sudah Terdaftar">
        <div className="space-y-4">
          <p className="text-slate-700">
            Nomor WhatsApp ini sudah pernah mengisi biodata atas nama{" "}
            <span className="font-semibold">{duplicateModal?.namaPanggilan}</span> ({duplicateModal?.nameInitial}).
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Jika Anda adalah orang yang sama, gunakan link edit yang dikirim saat pendaftaran pertama.
            Jika ada kesalahan, hubungi Admin Unit/Pondok.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDuplicateModal(null)}>Tutup</Button>
            <Button onClick={() => navigate("/")}>Ke Beranda</Button>
          </div>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal open={!!successModal} onClose={() => navigate(`/p/${successModal?.id}`)} title="Biodata Berhasil Disimpan!">
        {successModal && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="flex justify-center mb-2 text-primary-600"><Icons.Success size={40} /></div>
              <p className="text-slate-700">Data Anda telah berhasil disimpan dan menunggu verifikasi admin.</p>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-primary-800">Link Edit Biodata Anda:</p>
              <code className="block text-xs bg-white p-2 rounded border break-all">
                {window.location.origin}/edit/{successModal.editToken}
              </code>
              <p className="text-xs text-primary-700">Simpan link ini untuk mengedit biodata Anda di kemudian hari.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/edit/${successModal.editToken}`); }}>
                <Icons.Copy size={16} /> Salin Link Edit
              </Button>
              <Button onClick={() => navigate(`/p/${successModal.id}`)}><span>Lihat Profil</span> <Icons.ArrowRight size={16} /></Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
