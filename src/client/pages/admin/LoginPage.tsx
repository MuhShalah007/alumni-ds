import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button, Input, Card } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { useAuth } from "../../hooks/useAuth";

export function LoginPage() {
  const { login, loading, admin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#087348] text-white flex items-center justify-center mx-auto mb-3">
            <Icon name="book-open-fill" size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#18181B]">Admin Login</h1>
          <p className="text-sm text-[#71717A]">Pondok Pesantren Islam Darusy Syahadah</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          <Input label="Password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memuat..." : "Login"}
          </Button>
        </form>

        <div className="text-xs text-[#A1A1AA] space-y-1 mt-4 p-3 bg-[#FAFAFA] rounded-lg border border-[#F4F4F5]">
          <p className="font-semibold text-[#71717A] mb-1">Akun Test:</p>
          <p>superadmin / admin123 (semua data)</p>
          <p>adminputri / putri123 (data putri)</p>
        </div>
      </Card>
    </div>
  );
}
