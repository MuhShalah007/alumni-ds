import { useState, useCallback, useEffect } from "react";
import { Button, Input, Select, Textarea, Card, Badge } from "../../components/ui";
import { Icons } from "../../components/Icon";
import { apiFetch, ApiError } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

interface Notification {
  id: string;
  type: string;
  judul: string;
  pesan: string;
  target_role: string;
  target_gender: string | null;
  target_unit: string | null;
  is_pinned: number;
  created_by: string | null;
  created_by_name: string | null;
  is_read: number;
  created_at: string;
}

export function BroadcastPage() {
  const { admin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: "pengumuman",
    judul: "",
    pesan: "",
    targetRole: "all",
    targetGender: "all",
    targetUnit: "",
    isPinned: false,
  });
  const [selected, setSelected] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Notification[] }>("/admin/notifications", { auth: true });
      setNotifications(res.data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleCreate = useCallback(async () => {
    if (!form.judul.trim() || !form.pesan.trim()) {
      alert("Judul dan pesan wajib diisi");
      return;
    }
    try {
      await apiFetch("/admin/notifications", {
        method: "POST",
        auth: true,
        jsonBody: {
          type: form.type,
          judul: form.judul,
          pesan: form.pesan,
          targetRole: form.targetRole,
          targetGender: form.targetGender,
          targetUnit: form.targetUnit || undefined,
          isPinned: form.isPinned,
        },
      });
      setForm({ type: "pengumuman", judul: "", pesan: "", targetRole: "all", targetGender: "all", targetUnit: "", isPinned: false });
      setShowCreate(false);
      fetchNotifications();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal membuat notifikasi");
    }
  }, [form, fetchNotifications]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, { method: "PATCH", auth: true });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n));
    } catch { /* ignore */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await apiFetch("/admin/notifications/read-all", { method: "PATCH", auth: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch { /* ignore */ }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Hapus notifikasi ini?")) return;
    try {
      await apiFetch(`/admin/notifications/${id}`, { method: "DELETE", auth: true });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus");
    }
  }, [selected]);

  const typeLabel = (type: string) => {
    if (type === "pengumuman") return "Pengumuman";
    if (type === "chat") return "Chat";
    return "Sistem";
  };

  const typeBadgeColor = (type: string): "blue" | "green" | "gray" => {
    if (type === "pengumuman") return "blue";
    if (type === "chat") return "green";
    return "gray";
  };

  const targetLabel = (n: Notification) => {
    const parts: string[] = [];
    if (n.target_role === "all") parts.push("Semua");
    else parts.push(n.target_role.replace("admin_", "Admin "));
    if (n.target_gender && n.target_gender !== "all") parts.push(n.target_gender === "putra" ? "Putra" : "Putri");
    if (n.target_unit) parts.push(`Unit ${n.target_unit}`);
    return parts.join(" · ");
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengumuman & Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">
            {notifications.length} notifikasi{unreadCount > 0 ? ` · ${unreadCount} belum dibaca` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              <Icons.Check size={16} /> Tandai Semua Dibaca
            </Button>
          )}
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Icons.Send size={16} /> Buat Pengumuman
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Buat Pengumuman Baru</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Tipe" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="pengumuman">Pengumuman</option>
                <option value="chat">Chat</option>
                <option value="system">Sistem</option>
              </Select>
              <Select label="Target Role" value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}>
                <option value="all">Semua Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin_putra">Admin Putra</option>
                <option value="admin_putri">Admin Putri</option>
                <option value="admin_unit">Admin Unit</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Target Jenis Kelamin" value={form.targetGender} onChange={(e) => setForm((f) => ({ ...f, targetGender: e.target.value }))}>
                <option value="all">Semua</option>
                <option value="putra">Putra</option>
                <option value="putri">Putri</option>
              </Select>
              <Input label="Target Unit (opsional)" value={form.targetUnit} onChange={(e) => setForm((f) => ({ ...f, targetUnit: e.target.value }))} placeholder="KMI, KMT, dll" />
            </div>
            <Input label="Judul" value={form.judul} onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))} placeholder="Judul pengumuman" />
            <Textarea label="Pesan" value={form.pesan} onChange={(e) => setForm((f) => ({ ...f, pesan: e.target.value }))} rows={4} placeholder="Isi pesan pengumuman..." />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))} className="w-4 h-4 rounded" />
              Sematkan (pin) di atas
            </label>
            <div className="flex gap-2">
              <Button onClick={handleCreate}><Icons.Send size={16} /> Kirim</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Notification list */}
        <div className="space-y-3">
          {loading ? (
            <Card className="p-8 text-center text-slate-500">Memuat notifikasi...</Card>
          ) : notifications.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Icons.Inbox size={32} className="text-slate-300 mx-auto mb-2" />
              Belum ada notifikasi.
            </Card>
          ) : (
            notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-4 cursor-pointer transition-shadow hover:shadow-md ${!n.is_read ? "border-primary-300 bg-primary-50/30" : ""} ${selected?.id === n.id ? "ring-2 ring-primary-500" : ""}`}
              >
                <div
                  onClick={() => { setSelected(n); if (!n.is_read) handleMarkRead(n.id); }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {n.type === "pengumuman" && <Icons.Bell size={16} className="text-primary-600" />}
                      {n.type === "chat" && <Icons.Send size={16} className="text-success" />}
                      {n.type === "system" && <Icons.Warning size={16} className="text-slate-400" />}
                      <Badge color={typeBadgeColor(n.type)}>{typeLabel(n.type)}</Badge>
                      {n.is_pinned === 1 && <Icons.Lightbulb size={14} className="text-warning" />}
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-600" />}
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(n.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{n.judul}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2">{n.pesan}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{targetLabel(n)} · {n.created_by_name || "Sistem"}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      <Icons.Trash size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="sticky top-8">
          {selected ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge color={typeBadgeColor(selected.type)}>{typeLabel(selected.type)}</Badge>
                {selected.is_pinned === 1 && <Badge color="yellow">Disematkan</Badge>}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{selected.judul}</h2>
              <p className="text-xs text-slate-400 mb-4">
                {formatDate(selected.created_at)} · {selected.created_by_name || "Sistem"} · {targetLabel(selected)}
              </p>
              <div className="prose prose-sm max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">{selected.pesan}</p>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400">
              <Icons.Inbox size={40} className="mx-auto mb-3 text-slate-300" />
              <p>Pilih notifikasi untuk melihat detail</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
