import { useState, useEffect, useCallback } from "react";
import { Button, Input, Select, Card, Badge, Modal } from "../../components/ui";
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
                    <Badge color={a.is_active ? "green" : "red"}>{a.is_active ? "Aktif" : "Nonaktif"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggle(a.id)} className="text-xs text-blue-600 hover:underline">{a.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                      {a.id !== currentAdmin?.id && (
                        <button onClick={() => handleDelete(a.id)} className="text-xs text-red-600 hover:underline">Hapus</button>
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
    </div>
  );
}
