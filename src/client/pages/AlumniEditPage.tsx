import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input, Select, Textarea, Card, Badge } from "../components/ui";
import { Icons } from "../components/Icon";
import Coloris from "@melloware/coloris";
import "@melloware/coloris/dist/coloris.css";
import {
  KELAS_NIHAI_OPTIONS,
  STATUS_AKTIVITAS,
  unitsForGender,
  type Gender,
  type SosialMedia,
} from "@shared/constants";
import { ApiError } from "../lib/api";
import { uploadPhoto } from "../lib/imageCompress";
import { ImageCrop } from "../components/ImageCrop";
import { FormSkeleton } from "../components/Skeleton";

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
  background_url: "backgroundUrl",
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

// Small badge shown next to sensitive fields that have a pending change awaiting admin approval.
function PendingBadge({ pendingValue }: { pendingValue: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
      <Icons.Warning size={12} /> Menunggu persetujuan admin
      <span className="text-amber-600 normal-case font-normal">→ {pendingValue}</span>
    </span>
  );
}

const GRADIENT_PRESETS = [
  { name: "Hijau Pesantren", value: "linear-gradient(135deg, #087348, #065f37)" },
  { name: "Biru Samudra", value: "linear-gradient(135deg, #667eea, #764ba2)" },
  { name: "Ungu Senja", value: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { name: "Emas Mewah", value: "linear-gradient(135deg, #f6d365, #fda085)" },
  { name: "Cyberpunk Neon", value: "linear-gradient(135deg, #00f5d4, #9b5de5, #f15bb5)" },
  { name: "Cyberpunk Blue", value: "linear-gradient(135deg, #0d1117, #161b22, #1f6feb)" },
  { name: "Neon Pulse", value: "linear-gradient(135deg, #ff006e, #fb5607, #ffbe0b)" },
  { name: "Biru Langit", value: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  { name: "Merah Maroon", value: "linear-gradient(135deg, #ee9ca7, #ffdde1)" },
  { name: "Gelap Elegan", value: "linear-gradient(135deg, #2c3e50, #4ca1af)" },
  { name: "Oranye Hangat", value: "linear-gradient(135deg, #f12711, #f5af19)" },
  { name: "Pink Lembut", value: "linear-gradient(135deg, #ee9ca7, #ffdde1)" },
  { name: "Hijau Tua", value: "linear-gradient(135deg, #134e5e, #71b280)" },
  { name: "Purple Night", value: "linear-gradient(135deg, #41295a, #2F0743)" },
];

const SOLID_COLORS = [
  "#087348", "#1d4ed8", "#7c3aed", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#db2777", "#475569",
  "#1e293b", "#0f172a", "#f8fafc", "#fef3c7", "#fce7f3",
];

function parseGradientColors(gradient: string): [string, string] | null {
  const match = gradient.match(/linear-gradient\([^,]+,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(.+)\)/);
  if (!match) return null;
  const color1 = match[1];
  // For 3-color gradients, take the last color
  const rest = match[2].trim();
  const colors = rest.split(",").map((c) => c.trim().replace(/\)/g, "").trim());
  const color2 = colors[colors.length - 1];
  return [color1, color2];
}

export function AlumniEditPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingFields, setPendingFields] = useState<Record<string, string>>({});
  // Photo upload state — blob stored client-side, uploaded on form save
  const photoBlobRef = useRef<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoCropFile, setPhotoCropFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Background upload state — blob stored client-side, uploaded on form save
  const bgBlobRef = useRef<Blob | null>(null);
  const [bgError, setBgError] = useState("");
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [bgMode, setBgMode] = useState<"file" | "gradient" | "solid">("file");
  const [bgDraft, setBgDraft] = useState<string | null>(null);
  const [gradColor1, setGradColor1] = useState("#087348");
  const [gradColor2, setGradColor2] = useState("#065f37");
  const gradInput1Ref = useRef<HTMLInputElement>(null);
  const gradInput2Ref = useRef<HTMLInputElement>(null);
  const solidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem(ALUMNI_TOKEN_KEY);
    if (!token) {
      navigate("/alumni/login", { replace: true });
      return;
    }

    alumniFetch<{ alumni: Record<string, unknown>; pendingChanges?: { field: string; newValue: string }[] }>("/alumni/me")
      .then((res) => {
        setForm(rowToForm(res.alumni));
        // Map pending changes by snake_case field name → new value for badge display
        const pendingMap: Record<string, string> = {};
        for (const pc of res.pendingChanges ?? []) {
          pendingMap[pc.field] = pc.newValue;
        }
        setPendingFields(pendingMap);
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

  // Derive background mode (file/gradient/solid) from the current backgroundUrl value
  useEffect(() => {
    const bg = form.backgroundUrl as string;
    if (!bg) { setBgMode("file"); return; }
    if (bg.startsWith("http") || bg.startsWith("/") || bg.startsWith("data:")) setBgMode("file");
    else if (bg.startsWith("linear-gradient")) setBgMode("gradient");
    else if (bg.startsWith("#")) setBgMode("solid");
    else setBgMode("file");
  }, [form.backgroundUrl]);


  // Initialize gradColor1/gradColor2 from existing gradient on form load
  useEffect(() => {
    const bg = form.backgroundUrl as string;
    if (bg && bg.startsWith("linear-gradient")) {
      const colors = parseGradientColors(bg);
      if (colors) {
        setGradColor1(colors[0]);
        setGradColor2(colors[1]);
      }
    }
  }, [form.backgroundUrl]);
  // Initialize coloris.js color pickers (once)
  useEffect(() => {
    Coloris.init();
    Coloris({
      el: "#coloris-solid-picker",
      format: "hex",
      selectInput: false,
      alpha: false,
      clearButton: false,
      closeButton: true,
      closeLabel: "Pilih",
      theme: "large",
      themeMode: "light",
      wrap: true,
      margin: 8,
    });
    Coloris({
      el: "#coloris-grad-1",
      format: "hex",
      alpha: false,
      closeButton: true,
      closeLabel: "Pilih",
      theme: "large",
      wrap: true,
    });
    Coloris({
      el: "#coloris-grad-2",
      format: "hex",
      alpha: false,
      closeButton: true,
      closeLabel: "Pilih",
      theme: "large",
      wrap: true,
    });
  }, []);

  // Listen for coloris pick events to update draft / gradient colors.
  // Functional updates avoid a stale closure over gradColor1/gradColor2.
  useEffect(() => {
    const handlePick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.color) return;
      const elId = detail.el?.id;
      if (elId === "coloris-solid-picker") {
        setBgDraft(detail.color);
      } else if (elId === "coloris-grad-1") {
        setGradColor1(detail.color);
        setGradColor2((prev) => {
          setBgDraft(`linear-gradient(135deg, ${detail.color}, ${prev})`);
          return prev;
        });
      } else if (elId === "coloris-grad-2") {
        setGradColor2(detail.color);
        setGradColor1((prev) => {
          setBgDraft(`linear-gradient(135deg, ${prev}, ${detail.color})`);
          return prev;
        });
      }
    };
    document.addEventListener("coloris:pick", handlePick);
    return () => document.removeEventListener("coloris:pick", handlePick);
  }, []);
  // Sync gradient coloris inputs whenever gradColor1/gradColor2 change so
  // the swatch and text reflect preset clicks and loaded gradients.
  useEffect(() => {
    if (gradInput1Ref.current) {
      gradInput1Ref.current.value = gradColor1;
      gradInput1Ref.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (gradInput2Ref.current) {
      gradInput2Ref.current.value = gradColor2;
      gradInput2Ref.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [gradColor1, gradColor2]);

  // Sync the solid coloris input with the current draft/selected color.
  useEffect(() => {
    if (solidInputRef.current) {
      const val = bgDraft && bgDraft.startsWith("#") ? bgDraft : "";
      if (solidInputRef.current.value !== val) {
        solidInputRef.current.value = val;
        if (val) solidInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }, [bgDraft]);

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

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    setPhotoCropFile(file); // Open crop modal instead of uploading
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handlePhotoCropComplete = useCallback(async (blob: Blob, dataUrl: string) => {
    setPhotoCropFile(null);
    setPhotoError("");
    setPhotoPreview(dataUrl); // Immediate client-side preview
    setPhotoUploading(true);
    try {
      const fileName = `alumni-${form.id || "new"}-${Date.now()}.webp`;
      const url = await uploadPhoto(blob, fileName);
      update("fotoUrl", url); // Server URL — auto-saved
      photoBlobRef.current = null;
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload foto gagal");
      photoBlobRef.current = blob; // Keep blob for retry on form save
    } finally {
      setPhotoUploading(false);
    }
  }, [form.id, update]);

  const handleBackgroundSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgError("");
    setCropFile(file);
    if (bgInputRef.current) bgInputRef.current.value = "";
  }, []);

  const handleBackgroundCropComplete = useCallback(async (blob: Blob, dataUrl: string) => {
    setCropFile(null);
    setBgError("");
    setBgPreview(dataUrl); // Immediate client-side preview
    setBgUploading(true);
    try {
      const fileName = `bg-${form.id || "new"}-${Date.now()}.webp`;
      const formData = new FormData();
      formData.append("photo", blob, fileName);
      const res = await fetch("/api/alumni/upload-background", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload background gagal");
      const data = await res.json() as { url: string };
      update("backgroundUrl", data.url); // Server URL — auto-saved
      bgBlobRef.current = null;
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Upload background gagal");
      bgBlobRef.current = blob; // Keep blob for retry on form save
    } finally {
      setBgUploading(false);
    }
  }, [form.id, update]);

  // When gender changes, reset unit to first available unit for that gender
  const handleGenderChange = useCallback((newGender: Gender) => {
    const firstUnit = unitsForGender(newGender)[0];
    setForm((prev) => ({ ...prev, gender: newGender, unit: firstUnit }));
  }, []);
  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);


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

      // Upload pending photo blob if exists
      if (photoBlobRef.current) {
        const fileName = `alumni-${form.id || "new"}-${Date.now()}.webp`;
        const url = await uploadPhoto(photoBlobRef.current, fileName);
        payload.fotoUrl = url;
        photoBlobRef.current = null;
      }

      // Upload pending background blob if exists
      if (bgBlobRef.current) {
        const fileName = `bg-${form.id || "new"}-${Date.now()}.webp`;
        const formData = new FormData();
        formData.append("photo", bgBlobRef.current, fileName);
        const res = await fetch("/api/alumni/upload-background", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload background gagal");
        const data = await res.json() as { url: string };
        payload.backgroundUrl = data.url;
        bgBlobRef.current = null;
      }

      const res = await alumniFetch<{ message?: string; pendingFields?: string[] }>("/alumni/me", { method: "PUT", jsonBody: payload });
      setSuccessMessage(
        res.message || "Biodata berhasil diperbarui. Perubahan akan ditinjau oleh admin.",
      );
      setToast(res.message || "Biodata berhasil diperbarui!");
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Re-fetch to update pending field badges
      try {
        const fresh = await alumniFetch<{ alumni: Record<string, unknown>; pendingChanges?: { field: string; newValue: string }[] }>("/alumni/me");
        setForm(rowToForm(fresh.alumni));
        const pendingMap: Record<string, string> = {};
        for (const pc of fresh.pendingChanges ?? []) {
          pendingMap[pc.field] = pc.newValue;
        }
        setPendingFields(pendingMap);
      } catch { /* ignore refresh error */ }
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
    return <FormSkeleton />;
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
  const backgroundUrl = (form.backgroundUrl as string) || bgPreview;
  const selectedGradient = bgDraft || (form.backgroundUrl as string) || (bgMode === "gradient" && !form.backgroundUrl ? "linear-gradient(135deg, #087348, #065f37)" : null);

  return (
    <>
    {toast && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-[#087348] text-white rounded-xl shadow-lg flex items-center gap-2 no-print">
        <Icons.Check size={20} />
        <span className="font-medium text-sm">{toast}</span>
        <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white">
          <Icons.Close size={16} />
        </button>
      </div>
    )}
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Edit Biodata Alumni</h1>
          <Badge color="blue">Mode Edit Mandiri</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/p/${form.id}`}>
            <Button type="button" variant="outline">
              <span className="inline-flex items-center gap-2"><Icons.Eye size={18} /> Lihat Profile</span>
            </Button>
          </Link>
          <Button type="button" variant="outline" onClick={handleLogout}>
            <span className="inline-flex items-center gap-2"><Icons.Logout size={18} /> Keluar</span>
          </Button>
        </div>
      </div>
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <div className="flex items-start gap-2">
            <Icons.Success size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{successMessage}</p>
              <p className="text-sm text-green-600 mt-1">Perubahan akan ditinjau oleh admin sebelum tampil di daftar alumni.</p>
            </div>
          </div>
        </div>
      )}
      {Object.keys(pendingFields).length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <div className="flex items-start gap-2">
            <Icons.Warning size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Anda memiliki perubahan yang menunggu persetujuan admin.</p>
              <p className="text-sm text-amber-700 mt-1">
                Perubahan pada data sensitif (tempat lahir, tanggal lahir, jenis kelamin, nomor HP, angkatan)
                perlu disetujui admin sebelum diterapkan. Bidang yang menunggu ditandai dengan badge di bawah.
              </p>
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
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors bg-[#087348] text-white hover:bg-[#065f37]`}
              >
                Pilih Foto
              </label>
              {photoUploading && <p className="text-sm text-[#087348] mt-2">Mengunggah foto...</p>}
              {photoError && <p className="text-sm text-red-600 mt-2">{photoError}</p>}
              {!photoError && (
                <p className="text-xs text-slate-400 mt-2">Format: JPG/PNG/WebP. Maks 1200x1200px, dikompres otomatis.</p>
              )}
            </div>
          </div>

          {/* Background Foto */}
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Background Foto</h2>
          <div className="space-y-3">
            {/* Preview — shows draft (if selecting) or current background */}
            {(() => {
              const previewBg = bgDraft || backgroundUrl;
              if (!previewBg) return null;
              return (
                <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 relative">
                  {previewBg.startsWith("http") || previewBg.startsWith("/") || previewBg.startsWith("data:") ? (
                    <img src={previewBg} alt="Background" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: previewBg }} />
                  )}
                  {bgDraft && bgDraft !== (form.backgroundUrl as string) && (
                    <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded text-[10px] bg-black/60 text-white">
                      Pratinjau (belum disimpan)
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Mode tabs */}
            <div className="flex gap-2">
              {(["file", "gradient", "solid"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setBgMode(mode)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${bgMode === mode ? "bg-[#087348] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {mode === "file" ? "Upload" : mode === "gradient" ? "Gradient" : "Solid Warna"}
                </button>
              ))}
            </div>

            {/* File mode */}
            {bgMode === "file" && (
              <div>
                <input ref={bgInputRef} id="background-upload" type="file" accept="image/*" className="hidden" onChange={handleBackgroundSelect} />
                <label htmlFor="background-upload" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors bg-[#087348] text-white hover:bg-[#065f37]">
                  Pilih Background
                </label>
                {bgUploading && <p className="text-sm text-[#087348] mt-2">Mengunggah background...</p>}
                {bgError && <p className="text-sm text-red-600 mt-2">{bgError}</p>}
                {!bgError && <p className="text-xs text-slate-400 mt-2">Gambar akan di-crop ke rasio 3:1 (1200x400px). Format: JPG/PNG/WebP.</p>}
              </div>
            )}

            {/* Gradient mode */}
            {bgMode === "gradient" && (
              <div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {GRADIENT_PRESETS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        setBgDraft(g.value);
                        const colors = parseGradientColors(g.value);
                        if (colors) {
                          setGradColor1(colors[0]);
                          setGradColor2(colors[1]);
                        }
                      }}
                      className={`h-16 rounded-lg border-2 transition-all ${selectedGradient === g.value ? "border-[#087348] ring-2 ring-[#087348]/30" : "border-transparent hover:border-slate-300"}`}
                      style={{ background: g.value }}
                      title={g.name}
                    />
                  ))}
                </div>
                {/* Custom gradient */}
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500">Atau buat gradient custom:</p>
                  <div className="flex items-center gap-2">
                    <input
                      ref={gradInput1Ref}
                      id="coloris-grad-1"
                      type="text"
                      defaultValue={gradColor1}
                      className="w-20 h-10 px-2 text-xs border border-[#E4E4E7] rounded-lg"
                      placeholder="#000000"
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      ref={gradInput2Ref}
                      id="coloris-grad-2"
                      type="text"
                      defaultValue={gradColor2}
                      className="w-20 h-10 px-2 text-xs border border-[#E4E4E7] rounded-lg"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                {bgDraft && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button type="button" size="sm" onClick={() => { update("backgroundUrl", bgDraft); setBgDraft(null); }}>
                      <span className="inline-flex items-center gap-1"><Icons.Check size={16} /> Terapkan</span>
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setBgDraft(null)}>
                      Batal
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Solid color mode */}
            {bgMode === "solid" && (
              <div>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {SOLID_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBgDraft(color)}
                      className={`h-10 rounded-lg border-2 transition-all ${(bgDraft || form.backgroundUrl) === color ? "border-[#087348] ring-2 ring-[#087348]/30 scale-110" : "border-transparent hover:border-slate-300"}`}
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
                {/* Custom color picker */}
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1.5">Atau pilih warna custom:</p>
                  <input
                    ref={solidInputRef}
                    id="coloris-solid-picker"
                    type="text"
                    defaultValue=""
                    className="w-full px-3 py-2 text-sm border border-[#E4E4E7] rounded-lg bg-white"
                    placeholder="Klik untuk pilih warna"
                  />
                </div>
                {bgDraft && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button type="button" size="sm" onClick={() => { update("backgroundUrl", bgDraft); setBgDraft(null); }}>
                      <span className="inline-flex items-center gap-1"><Icons.Check size={16} /> Terapkan</span>
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setBgDraft(null)}>
                      Batal
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Identitas Diri</h2>
          <Input label="Nama Lengkap" name="namaLengkap" value={String(form.namaLengkap || "")} onChange={(e) => update("namaLengkap", e.target.value)} />
          <Input label="Nama di Pondok (jika berbeda)" name="namaPondok" value={String(form.namaPondok || "")} onChange={(e) => update("namaPondok", e.target.value)} />
          <Input label="Nama Panggilan" name="namaPanggilan" value={String(form.namaPanggilan || "")} onChange={(e) => update("namaPanggilan", e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Tempat Lahir" name="tempatLahir" value={String(form.tempatLahir || "")} onChange={(e) => update("tempatLahir", e.target.value)} />
              {pendingFields["tempat_lahir"] && <div className="mt-1"><PendingBadge pendingValue={pendingFields["tempat_lahir"]} /></div>}
            </div>
            <div>
              <Input label="Tanggal Lahir" name="tanggalLahir" type="date" value={String(form.tanggalLahir || "")} onChange={(e) => update("tanggalLahir", e.target.value)} />
              {pendingFields["tanggal_lahir"] && <div className="mt-1"><PendingBadge pendingValue={pendingFields["tanggal_lahir"]} /></div>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Kelamin</label>
            {pendingFields["gender"] && <div className="mb-1.5"><PendingBadge pendingValue={pendingFields["gender"] === "putra" ? "Putra" : "Putri"} /></div>}
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
            <div>
              <Input label="Angkatan" name="angkatan" type="text" pattern="^\d{2}$" maxLength={2} placeholder="contoh: 20" value={String(form.angkatan || "")} onChange={(e) => update("angkatan", e.target.value)} />
              {pendingFields["angkatan"] && <div className="mt-1"><PendingBadge pendingValue={pendingFields["angkatan"]} /></div>}
            </div>
            <Input label="Tahun Lulus" name="tahunLulus" type="number" min={1900} max={2100} placeholder="contoh: 2024" value={String(form.tahunLulus || "")} onChange={(e) => update("tahunLulus", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tahun Masuk" name="tahunMasuk" type="number" min={1900} max={2100} placeholder="contoh: 2020" value={String(form.tahunMasuk || "")} onChange={(e) => update("tahunMasuk", e.target.value)} />
            <Input label="Nama Angkatan" name="namaAngkatan" value={String(form.namaAngkatan || "")} onChange={(e) => update("namaAngkatan", e.target.value)} />
          </div>

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Kontak & Alamat</h2>
          <div>
            <Input label="No HP / WhatsApp" name="noHp" value={String(form.noHp || "")} onChange={(e) => update("noHp", e.target.value)} />
            {pendingFields["no_hp"] && <div className="mt-1"><PendingBadge pendingValue={pendingFields["no_hp"]} /></div>}
          </div>
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
          {form.statusAktivitas === "Lainnya" && (
            <Input label="Detail Aktivitas Lainnya" name="detailAktivitas" value={String(form.detailAktivitas || "")} onChange={(e) => update("detailAktivitas", e.target.value)} />
          )}
          <Input label="Instagram" name="instagram" value={String(sosial.instagram || "")} onChange={(e) => updateSosial("instagram", e.target.value)} />
          <Input label="Facebook" name="facebook" value={String(sosial.facebook || "")} onChange={(e) => updateSosial("facebook", e.target.value)} />
          <Input label="LinkedIn" name="linkedin" value={String(sosial.linkedin || "")} onChange={(e) => updateSosial("linkedin", e.target.value)} />
          <Input label="TikTok" name="tiktok" value={String(sosial.tiktok || "")} onChange={(e) => updateSosial("tiktok", e.target.value)} />

          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide pt-2">Pengaturan Privasi</h2>
          {/* Privasi Profil toggle */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium text-slate-700">Privasi Profil</p>
              <p className="text-xs text-slate-400">{privacyLevel === "public" ? "Tampil di daftar alumni" : "Tersembunyi dari daftar alumni"}</p>
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
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#087348] focus:ring-offset-2 ${privacyLevel === "public" ? "bg-[#087348]" : "bg-slate-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${privacyLevel === "public" ? "translate-x-5" : "translate-x-0"}`} />
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
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#087348] focus:ring-offset-2 ${photoPrivacy === "public" ? "bg-[#087348]" : "bg-slate-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${photoPrivacy === "public" ? "translate-x-5" : "translate-x-0"}`} />
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
      {cropFile && (
        <ImageCrop
          file={cropFile}
          aspectRatio={3}
          title="Ubah Wallpaper Profile"
          confirmText="Simpan Wallpaper"
          onCropComplete={handleBackgroundCropComplete}
          onCancel={() => setCropFile(null)}
        />
      )}
      {photoCropFile && (
        <ImageCrop
          file={photoCropFile}
          aspectRatio={1}
          title="Ubah Foto Profile"
          confirmText="Simpan Foto"
          onCropComplete={handlePhotoCropComplete}
          onCancel={() => setPhotoCropFile(null)}
        />
      )}
    </div>
    </>
  );
}
