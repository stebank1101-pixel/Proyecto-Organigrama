import { Loader2, Shield, Trash2, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { createUserProfile, deleteUserProfile, fetchUsers } from "../lib/api";
import { useT } from "../lib/i18n";
import type { UserProfile } from "../types";

export function ProfilesView() {
  const { user: currentUser } = useAuth();
  const t = useT();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" as "admin" | "viewer" });

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createUserProfile(form);
      setForm({ name: "", email: "", password: "", role: "viewer" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.profiles.createError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.profiles.deleteConfirm)) return;
    try {
      await deleteUserProfile(id);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.profiles.deleteError);
    }
  }

  function creatorName(createdBy: string | null) {
    if (!createdBy) return t.common.system;
    if (createdBy === currentUser?.id) return t.common.you;
    return users.find((u) => u.id === createdBy)?.name || "—";
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-sky-600" />
          <h2 className="text-base font-semibold text-slate-900">{t.profiles.createProfileTitle}</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          {t.profiles.createProfileDescriptionPre} <strong>{t.profiles.createProfileDescriptionAdmin}</strong>{" "}
          {t.profiles.createProfileDescriptionMid} <strong>{t.profiles.createProfileDescriptionViewer}</strong>{" "}
          {t.profiles.createProfileDescriptionPost}
        </p>

        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-600">
            {t.profiles.fullName}
            <input
              required
              className="input mt-1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t.profiles.email}
            <input
              type="email"
              required
              className="input mt-1"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t.profiles.password}
            <input
              type="password"
              required
              minLength={4}
              className="input mt-1"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t.profiles.role}
            <select
              className="input mt-1"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "viewer" }))}
            >
              <option value="viewer">{t.profiles.viewerOption}</option>
              <option value="admin">{t.profiles.adminOption}</option>
            </select>
          </label>

          {error && <p className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          <div className="col-span-2">
            <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {t.profiles.createProfile}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">{t.profiles.existingProfiles}</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    u.role === "admin" ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {u.role === "admin" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-800">
                    {u.name} {u.id === currentUser?.id && <span className="text-slate-400">{t.profiles.youSuffix}</span>}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {u.email} · {t.profiles.createdBy(creatorName(u.createdBy))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    u.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {u.role === "admin" ? t.profiles.administrator : t.profiles.viewer}
                </span>
                {u.id !== currentUser?.id && (
                  <button className="icon-btn text-rose-500 hover:bg-rose-50" title={t.profiles.deleteProfileTitle} onClick={() => handleDelete(u.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && !loading && <p className="text-xs text-slate-500">{t.profiles.noProfiles}</p>}
        </div>
      </div>
    </div>
  );
}
