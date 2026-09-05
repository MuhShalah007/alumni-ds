import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input, Card } from "../components/ui";
import { Icon } from "../components/Icon";
import { apiFetch, ApiError } from "../lib/api";

interface AlumniLoginResponse {
  token: string;
  alumni: { id: string; namaLengkap: string };
}

export function AlumniLoginPage() {
  const navigate = useNavigate();
  const [noHp, setNoHp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<AlumniLoginResponse>("/alumni/login", {
        method: "POST",
        jsonBody: { noHp, password },
      });
      localStorage.setItem("alumni_token", res.token);
      navigate("/alumni/edit", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4 py-10">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#087348] text-white flex items-center justify-center mx-auto mb-3">
            <Icon name="book-open-fill" size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#18181B]">Masuk Alumni</h1>
          <p className="text-sm text-[#71717A]">Pondok Pesantren Islam Darusy Syahadah</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nomor WhatsApp"
            name="noHp"
            type="tel"
            placeholder="0812xxxxxxx"
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memuat..." : "Masuk"}
          </Button>
        </form>

        <div className="text-xs text-[#A1A1AA] space-y-1 p-3 bg-[#FAFAFA] rounded-lg border border-[#F4F4F5]">
          <p className="font-semibold text-[#71717A] mb-1">Akun Test:</p>
          <p>Putra: 081234567890 / alumni123</p>
          <p>Putri: 081298765432 / alumni123</p>
        </div>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-[#52525B]">
            Belum pernah mengisi biodata?{" "}
            <Link to="/form" className="text-[#2563EB] font-medium hover:underline">
              Isi biodata alumni
            </Link>
          </p>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#71717A] hover:text-[#18181B]">
            <Icon name="arrow-left-line" size={16} />
            Kembali ke beranda
          </Link>
        </div>
      </Card>
    </div>
  );
}
