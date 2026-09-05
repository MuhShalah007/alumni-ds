import { useState, useEffect, useCallback } from "react";
import { Button, Input, Select, Card, Badge, Modal } from "../../components/ui";
import { Icon, Icons } from "../../components/Icon";
import { apiFetch, ApiError } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_ROLES } from "@shared/constants";
import { TableSkeleton } from "../../components/Skeleton";

interface AdminUser {
  id: string;
  username: string;
  nama_lengkap: string;
  role: string;
  assigned_gender: string | null;
  assigned_unit: string | null;
  is_active: number;
  created_at: string;
}

export function AdminUsersPage() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", namaLengkap: "", role: "admin_putra", assignedGender: "putra", assignedUnit: "" });
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ namaLengkap: "", role: "admin_putra", assignedGender: "putra", assignedUnit: "" });
  const [editLoading, setEditLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: AdminUser[] }>("/admin/admins", { auth: true });
      setAdmins(res.data);
    } catch { setAdmins([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreate = useCallback(async () => {
    try {
      await apiFetch("/admin/admins", {
        method: "POST",
        auth: true,
        jsonBody: { ...newAdmin, assignedUnit: newAdmin.assignedUnit || null },
      });
      setShowCreate(false);
      setNewAdmin({ username: "", password: "", namaLengkap: "", role: "admin_putra", assignedGender: "putra", assignedUnit: "" });
      fetchAdmins();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal membuat admin");
    }
  }, [newAdmin, fetchAdmins]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Yakin hapus admin ini?")) return;
    try {
      await apiFetch(`/admin/admins/${id}`, { method: "DELETE", auth: true });
      fetchAdmins();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal hapus");
    }
  }, [fetchAdmins]);

  const handleToggle = useCallback(async (id: string) => {
    try {
      await apiFetch(`/admin/admins/${id}/toggle`, { method: "PATCH", auth: true });
      fetchAdmins();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal toggle");
    }
  }, [fetchAdmins]);

  const handleResetPassword = useCallback(async () => {
    if (!resetTarget || !newPassword || newPassword.length < 6) {
      alert("Password minimal 6 karakter");
      return;
    }
    setResetLoading(true);
    try {
      await apiFetch(`/admin/admins/${resetTarget.id}/reset-password`, {
        method: "POST",
        auth: true,
        jsonBody: { password: newPassword },
      });
      setResetTarget(null);
      setNewPassword("");
      alert("Password berhasil direset");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal reset password");
    } finally {
      setResetLoading(false);
    }
  }, [resetTarget, newPassword]);
  const openEdit = useCallback((admin: AdminUser) => {
    setEditTarget(admin);
    setEditForm({
      namaLengkap: admin.nama_lengkap,
      role: admin.role,
      assignedGender: admin.assigned_gender || "putra",
      assignedUnit: admin.assigned_unit || "",
    });
  }, []);

  const handleEdit = useCallback(async () => {
    if (!editTarget || !editForm.namaLengkap) {
      alert("Nama lengkap wajib diisi");
      return;
    }
    setEditLoading(true);
    try {
      await apiFetch(`/admin/admins/${editTarget.id}`, {
        method: "PUT",
        auth: true,
        jsonBody: { ...editForm, assignedUnit: editForm.assignedUnit || null },
      });
      setEditTarget(null);
      fetchAdmins();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal memperbarui admin");
    } finally {
      setEditLoading(false);
    }
  }, [editTarget, editForm, fetchAdmins]);

  if (currentAdmin?.role !== "super_admin") {
    return <div className="p-8"><Card className="p-6 text-center text-slate-500">Hanya Super Admin yang dapat mengelola admin.</Card></div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kelola Admin</h1>
        <Button onClick={() => setShowCreate(true)}>+ Tambah Admin</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
        <div className="p-4">
          <TableSkeleton />
        </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Username</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Scope</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.nama_lengkap}</td>
                  <td className="px-4 py-3 text-slate-600">{a.username}</td>
                  <td className="px-4 py-3"><Badge color={a.role === "super_admin" ? "blue" : "gray"}>{a.role.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {a.assigned_gender} / {a.assigned_unit || "all"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => handleToggle(a.id)} title={a.is_active ? "Nonaktifkan" : "Aktifkan"} className={`p-1.5 rounded ${a.is_active ? "text-blue-600 hover:bg-blue-50" : "text-green-600 hover:bg-green-50"}`}>
                        <Icon name={a.is_active ? "forbid-line" : "check-line"} size={16} />
                      </button>
                      <button onClick={() => openEdit(a)} title="Edit" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Icons.Edit size={16} />
                      </button>
                      {a.id !== currentAdmin?.id && (
                        <>
                          <button onClick={() => setResetTarget(a)} title="Reset Password" className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded">
                            <Icons.Lock size={16} />
                          </button>
                          <button onClick={() => handleDelete(a.id)} title="Hapus" className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                            <Icons.Trash size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tambah Admin Baru">
        <div className="space-y-4">
          <Input label="Nama Lengkap" value={newAdmin.namaLengkap} onChange={(e) => setNewAdmin((a) => ({ ...a, namaLengkap: e.target.value }))} />
          <Input label="Username" value={newAdmin.username} onChange={(e) => setNewAdmin((a) => ({ ...a, username: e.target.value }))} />
          <Input label="Password" type="password" value={newAdmin.password} onChange={(e) => setNewAdmin((a) => ({ ...a, password: e.target.value }))} />
          <Select label="Role" value={newAdmin.role} onChange={(e) => setNewAdmin((a) => ({ ...a, role: e.target.value }))}>
            {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
          </Select>
          <Select label="Jenis Kelamin" value={newAdmin.assignedGender} onChange={(e) => setNewAdmin((a) => ({ ...a, assignedGender: e.target.value }))}>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
            <option value="all">All</option>
          </Select>
          <Input label="Assigned Unit (kosongkan untuk all)" value={newAdmin.assignedUnit} onChange={(e) => setNewAdmin((a) => ({ ...a, assignedUnit: e.target.value }))} placeholder="contoh: KMI" />
          <Button onClick={handleCreate} className="w-full">Buat Admin</Button>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); setNewPassword(""); }} title={`Reset Password — ${resetTarget?.nama_lengkap ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Masukkan password baru untuk <strong>{resetTarget?.username}</strong>.</p>
          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />
          <div className="flex gap-2">
            <Button onClick={handleResetPassword} disabled={resetLoading}>
              {resetLoading ? "Menyimpan..." : "Reset Password"}
            </Button>
            <Button variant="ghost" onClick={() => { setResetTarget(null); setNewPassword(""); }}>Batal</Button>
          </div>
        </div>
      </Modal>

      {/* Edit admin modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Admin — ${editTarget?.username ?? ""}`}>
        <div className="space-y-4">
          <Input label="Nama Lengkap" value={editForm.namaLengkap} onChange={(e) => setEditForm((f) => ({ ...f, namaLengkap: e.target.value }))} />
          <Select label="Role" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
            {ADMIN_ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
          </Select>
          <Select label="Jenis Kelamin" value={editForm.assignedGender} onChange={(e) => setEditForm((f) => ({ ...f, assignedGender: e.target.value }))}>
            <option value="putra">Putra</option>
            <option value="putri">Putri</option>
            <option value="all">All</option>
          </Select>
          <Input label="Assigned Unit (kosongkan untuk all)" value={editForm.assignedUnit} onChange={(e) => setEditForm((f) => ({ ...f, assignedUnit: e.target.value }))} placeholder="contoh: KMI" />
          <div className="flex gap-2">
            <Button onClick={handleEdit} disabled={editLoading}>{editLoading ? "Menyimpan..." : "Simpan"}</Button>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Batal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
