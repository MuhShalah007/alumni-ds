import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Card, Modal } from "../components/ui";
import { Icons } from "../components/Icon";
import { ProfileSkeleton } from "../components/Skeleton";
import { apiFetch, ApiError } from "../lib/api";
import { generateVCard } from "../lib/vcard";

interface ProfileData {
  id: string;
  nama_lengkap: string;
  nama_panggilan: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  gender: string;
  unit: string;
  kelas_nihai: string;
  angkatan: string;
  tahun_lulus: number;
  nama_angkatan: string | null;
  alamat: string;
  no_hp: string;
  email: string | null;
  motto: string;
  kesan_pesan: string;
  momen_berkesan: string;
  foto_url: string | null;
  background_url: string | null;
  sosial_media: { instagram?: string; facebook?: string; linkedin?: string; tiktok?: string } | null;
  status_aktivitas: string | null;
  detail_aktivitas: string | null;
  privacy_level: string;
  photo_privacy: string;
}

export function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  // Persist the generated QR SVG across modal open/close so we don't
  // re-fetch from the server every time the modal is reopened.
  const qrSvgRef = useRef<string | null>(null);
  const [alumniLoggedIn, setAlumniLoggedIn] = useState(false);

  useEffect(() => {
    apiFetch<{ alumni: ProfileData }>(`/alumni/profile/${id}`)
      .then((res) => setProfile(res.alumni))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Profil tidak ditemukan");
      });
  }, [id]);
  useEffect(() => {
    setAlumniLoggedIn(!!localStorage.getItem("alumni_token"));
  }, []);

  const handleDownloadVCard = useCallback(() => {
    if (!profile) return;
    const vcf = generateVCard({
      namaLengkap: profile.nama_lengkap,
      namaPanggilan: profile.nama_panggilan,
      noHp: profile.no_hp,
      email: profile.email,
      alamat: profile.alamat,
      unit: profile.unit,
      angkatan: profile.angkatan,
      tahunLulus: profile.tahun_lulus,
    });
    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.nama_lengkap}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profile]);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/p/${profile.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.nama_lengkap, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      setShareOpen(true);
    }
  }, [profile]);

  const handleCopyLink = useCallback(async () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/p/${profile.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Fallback: select text in the input for manual copy
      const input = document.getElementById("share-url-input") as HTMLInputElement | null;
      if (input) {
        input.select();
        input.setSelectionRange(0, shareUrl.length);
      }
    }
  }, [profile]);

  const handleDownloadQr = useCallback(() => {
    if (!qrSvg || !profile) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${profile.nama_lengkap.replace(/\s+/g, "-").toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [qrSvg, profile]);

  const handleOpenQr = useCallback(async () => {
    if (!profile) return;
    setQrOpen(true);
    setQrError("");

    // Use cached SVG if available — no re-fetch on repeated modal opens.
    if (qrSvgRef.current) {
      setQrSvg(qrSvgRef.current);
      setQrLoading(false);
      return;
    }

    setQrSvg(null);
    setQrLoading(true);

    const profileUrl = `${window.location.origin}/p/${profile.id}`;

    try {
      // Call our server-side proxy to avoid browser CORS restrictions with
      // the qrcode-monkey API. The server renders the styled SVG (with the
      // logo embedded natively for scannability) and returns it directly.
      const res = await fetch(`/api/qr/styled?url=${encodeURIComponent(profileUrl)}`);
      if (!res.ok) throw new Error("QR API gagal");
      const svgText = await res.text();
      if (!svgText.startsWith("<")) throw new Error("Respon bukan SVG");
      qrSvgRef.current = svgText;
      setQrSvg(svgText);
    } catch {
      // Fallback to simple QR code via qrserver.com
      setQrError("Gagal membuat QR styled, menggunakan QR sederhana");
      setQrSvg(null);
      qrSvgRef.current = null;
    } finally {
      setQrLoading(false);
    }
  }, [profile]);

  // Force a fresh QR generation, bypassing the client-side cache.
  const handleRegenerateQr = useCallback(async () => {
    if (!profile) return;
    setQrSvg(null);
    setQrLoading(true);
    setQrError("");
    qrSvgRef.current = null;

    const profileUrl = `${window.location.origin}/p/${profile.id}`;

    try {
      // nocache=1 tells the server to skip its KV cache and regenerate
      // fresh from qrcode-monkey, then refresh the stored cache entry.
      const res = await fetch(
        `/api/qr/styled?url=${encodeURIComponent(profileUrl)}&nocache=1`,
      );
      if (!res.ok) throw new Error("QR API gagal");
      const svgText = await res.text();
      if (!svgText.startsWith("<")) throw new Error("Respon bukan SVG");
      qrSvgRef.current = svgText;
      setQrSvg(svgText);
    } catch {
      setQrError("Gagal membuat QR styled, menggunakan QR sederhana");
      setQrSvg(null);
    } finally {
      setQrLoading(false);
    }
  }, [profile]);

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-red-600 mb-4">{error}</p>
    </div>
  );

  if (!profile) return <ProfileSkeleton />;

  const profileUrl = `${window.location.origin}/p/${profile.id}`;

  // Private profile: only show name, angkatan, tahun_lulus
  if (profile.privacy_level === "private") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="overflow-hidden">
          <div className="h-24 overflow-hidden">
            {profile.background_url ? (
              profile.background_url.startsWith("http") || profile.background_url.startsWith("/") || profile.background_url.startsWith("data:") ? (
                <img src={profile.background_url} alt="Background" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: profile.background_url }} />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800" />
            )}
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              {profile.foto_url ? (
                <img src={profile.foto_url} alt={profile.nama_lengkap} className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className={`w-24 h-24 rounded-xl border-4 border-white shadow-lg flex items-center justify-center ${profile.gender === "putra" ? "bg-blue-100 text-blue-400" : "bg-pink-100 text-pink-400"}`}>
                  <Icons.User size={36} />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{profile.nama_lengkap}</h1>
            {profile.nama_panggilan && <p className="text-slate-500">{profile.nama_panggilan}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                Angkatan {profile.angkatan} — Lulus {profile.tahun_lulus}
              </span>
            </div>
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Icons.Lock size={20} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Akun di privasi</p>
                <p className="text-xs text-slate-500">Pemilik akun memilih untuk menyembunyikan informasi detailnya.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const sosmed = profile.sosial_media || {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile Card */}
      <Card className="overflow-hidden relative">
        {alumniLoggedIn && (
          <Link to="/alumni/edit" className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-[#087348] text-white flex items-center justify-center shadow-lg hover:bg-[#065f37] transition-colors no-print" title="Edit Biodata">
            <Icons.Edit size={18} />
          </Link>
        )}
        {/* Header with photo */}
        <div className="h-24 overflow-hidden">
          {profile.background_url ? (
            profile.background_url.startsWith("http") || profile.background_url.startsWith("/") || profile.background_url.startsWith("data:") ? (
              <img src={profile.background_url} alt="Background" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: profile.background_url }} />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800" />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-4">
            {profile.foto_url ? (
              <img src={profile.foto_url} alt={profile.nama_lengkap} className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className={`w-24 h-24 rounded-xl border-4 border-white shadow-lg flex items-center justify-center ${profile.gender === "putra" ? "bg-blue-100 text-blue-400" : "bg-pink-100 text-pink-400"}`}>
                <Icons.User size={36} />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-800">{profile.nama_lengkap}</h1>
          <p className="text-slate-500">{profile.nama_panggilan}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              {profile.unit}-{profile.angkatan} {profile.kelas_nihai && profile.kelas_nihai !== "Tidak Paralel" ? profile.kelas_nihai : ""} Th. {profile.tahun_lulus}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4 no-print">
            <Button size="sm" variant="outline" onClick={handleShare}><Icons.Share size={16} className="inline -mt-0.5 mr-1" /> Bagikan</Button>
            <Button size="sm" variant="outline" onClick={handleDownloadVCard}><Icons.Copy size={16} className="inline -mt-0.5 mr-1" /> Simpan Kontak (.vcf)</Button>
            <Button size="sm" variant="outline" onClick={handleOpenQr}><Icons.QrCode size={16} className="inline -mt-0.5 mr-1" /> QR Code</Button>
          </div>

          {/* Yearbook content */}
          <div className="mt-6 space-y-4">
            {profile.motto && (
              <div className="border-l-4 border-primary-500 pl-4 py-1">
                <p className="text-xs font-medium text-primary-600 mb-1">Motto Hidup</p>
                <p className="text-slate-700 italic">"{profile.motto}"</p>
              </div>
            )}

            {profile.kesan_pesan && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Kesan & Pesan</h3>
                <p className="text-sm text-slate-600">{profile.kesan_pesan}</p>
              </div>
            )}

            {profile.momen_berkesan && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Momen Berkesan</h3>
                <p className="text-sm text-slate-600">{profile.momen_berkesan}</p>
              </div>
            )}
          </div>

          {/* Activity */}
          {profile.status_aktivitas && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Aktivitas Saat Ini</h3>
              <p className="text-sm text-slate-600">
                {profile.status_aktivitas}
                {profile.detail_aktivitas && ` — ${profile.detail_aktivitas}`}
              </p>
            </div>
          )}

          {/* Social media */}
          {Object.values(sosmed).some((v) => v) && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Media Sosial</h3>
              <div className="flex flex-wrap gap-3">
                {sosmed.instagram && <a href={`https://instagram.com/${sosmed.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">Instagram</a>}
                {sosmed.facebook && <a href={sosmed.facebook} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">Facebook</a>}
                {sosmed.linkedin && <a href={sosmed.linkedin} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">LinkedIn</a>}
                {sosmed.tiktok && <a href={`https://tiktok.com/${sosmed.tiktok.replace("@", "")}`} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">TikTok</a>}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Share modal — shows URL text + explicit copy button */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Bagikan Profil">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Salin link di bawah untuk membagikan profil ini:</p>
          <div className="flex items-center gap-2">
            <input
              id="share-url-input"
              readOnly
              value={profileUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 text-sm border border-[#E4E4E7] rounded-lg bg-[#FAFAFA] text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <Button size="sm" onClick={handleCopyLink}>
              {copyFeedback ? (
                <span className="inline-flex items-center gap-1"><Icons.Check size={16} /> Tersalin</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Icons.Copy size={16} /> Salin Link</span>
              )}
            </Button>
          </div>
          {copyFeedback && (
            <p className="text-sm text-green-600">Link berhasil disalin ke clipboard!</p>
          )}
          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={() => setShareOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* QR Code modal — styled QR via qrcode-monkey with fallback */}
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="QR Code Profil">
        <div className="text-center space-y-4">
          {qrLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-[3px] border-[#087348] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Membuat QR code...</p>
            </div>
          )}

          {!qrLoading && qrSvg && (
            <>
              <div className="flex justify-center">
                <div className="rounded-2xl bg-[#FBFBFB] p-4 shadow-sm ring-1 ring-primary-200/60">
                  {/* qrcode-monkey SVGs ship with fixed px width/height; force
                      the inner svg to fill its box so it scales responsively. */}
                  <div
                    className="w-56 h-56 sm:w-64 sm:h-64 [&>svg]:block [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-600">Scan QR code untuk membuka profil ini</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={handleDownloadQr}><Icons.Download size={16} className="inline -mt-0.5 mr-1" /> Download QR</Button>
                <Button size="sm" variant="outline" onClick={handleRegenerateQr}><Icons.RefreshCw size={16} className="inline -mt-0.5 mr-1" /> Buat Ulang</Button>
                <Button size="sm" onClick={() => setQrOpen(false)}>Tutup</Button>
              </div>
            </>
          )}

          {!qrLoading && !qrSvg && (
            <>
              {qrError && <p className="text-xs text-amber-600">{qrError}</p>}
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-slate-600">Scan QR code untuk membuka profil ini</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => setQrOpen(false)}>Tutup</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
