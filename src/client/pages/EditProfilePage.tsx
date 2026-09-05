import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { FormSkeleton } from "../components/Skeleton";

export function EditProfilePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    apiFetch<{ token: string }>(`/alumni/by-token/${token}/exchange`, { method: "POST" })
      .then((res) => {
        // Clear any existing admin token to ensure single session
        localStorage.removeItem("admin_token");
        // Set alumni token
        localStorage.setItem("alumni_token", res.token);
        // Redirect to the full-featured edit page
        navigate("/alumni/edit", { replace: true });
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Token tidak valid atau sudah kedaluwarsa");
      });
  }, [token, navigate]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => navigate("/")} className="text-[#087348] font-medium hover:underline">
          Ke Beranda
        </button>
      </div>
    );
  }

  return <FormSkeleton />;
}
