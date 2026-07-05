// components/AdminUsersManager.js
// Settings → Admin Users. Create named admin / volunteer accounts, reset passwords,
// enable/disable, remove, and — for volunteers — grant granular access with
// permission checkboxes (RBAC). Named accounts let the audit log record WHO acted
// (vs. the shared-password login, which only records the role).
"use client";

import { useEffect, useState, Fragment } from "react";
import { UserPlus, Trash2, KeyRound, Power, ShieldCheck } from "lucide-react";
import { toast, confirmDialog, promptDialog } from "@/lib/uiStore";
import { PERMISSIONS } from "@/lib/permissions";

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];
const ROLE_BADGE = {
    admin: "bg-orange-50 text-orange-700 border-orange-200",
    volunteer: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// Grouped permission checkbox grid, reused by the create form and the row editor.
function PermissionPicker({ value, onChange }) {
    const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {GROUPS.map((g) => (
                <div key={g}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">{g}</p>
                    <div className="space-y-1.5">
                        {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                            <label key={p.key} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                                <input type="checkbox" checked={value.includes(p.key)} onChange={() => toggle(p.key)} className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" />
                                {p.label}
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AdminUsersManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ username: "", name: "", password: "", role: "admin" });
    const [formPerms, setFormPerms] = useState([]);
    const [busy, setBusy] = useState(false);
    const [editId, setEditId] = useState(null);     // user whose access is being edited
    const [editPerms, setEditPerms] = useState([]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json().catch(() => ({}));
            setUsers(Array.isArray(data.users) ? data.users : []);
        } catch { setUsers([]); }
        setLoading(false);
    };
    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, []);

    const create = async (e) => {
        e.preventDefault();
        setBusy(true);
        const body = { ...form, permissions: form.role === "volunteer" ? formPerms : [] };
        const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) { toast.error(data.error || "Could not create the user."); return; }
        toast.success(`Account "${form.username}" created.`);
        setForm({ username: "", name: "", password: "", role: "admin" });
        setFormPerms([]);
        load();
    };

    const patch = async (id, body, okMsg) => {
        const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(data.error || "Update failed."); return false; }
        if (okMsg) toast.success(okMsg);
        load();
        return true;
    };

    const resetPw = async (u) => {
        const pw = await promptDialog({ title: "Reset password", message: `New password for "${u.username}" (min 8 chars):`, inputType: "password", required: true, confirmLabel: "Reset" });
        if (pw === null) return;
        patch(u.id, { password: pw }, "Password reset.");
    };

    const remove = async (u) => {
        if (!(await confirmDialog({ title: "Remove account", message: `Delete "${u.username}"? They will no longer be able to sign in.`, danger: true, confirmLabel: "Delete" }))) return;
        const res = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(data.error || "Could not remove the user."); return; }
        toast.success(`Removed "${u.username}".`);
        load();
    };

    const openEdit = (u) => { setEditId(u.id); setEditPerms(Array.isArray(u.permissions) ? u.permissions : []); };
    const saveEdit = async (u) => {
        if (editPerms.length === 0) { toast.error("Select at least one permission."); return; }
        const ok = await patch(u.id, { permissions: editPerms }, "Access updated.");
        if (ok) setEditId(null);
    };

    const input = "border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-neutral-900">Admin Users &amp; Access</h3>
                <p className="text-sm text-neutral-500">Create staff logins so the audit log shows who did what. <b>Admin</b> = full access. <b>Volunteer</b> = only the boxes you tick (a view-only volunteer is effectively read-only). The shared env password still works with a blank username.</p>
            </div>

            <form onSubmit={create} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><label className="text-xs font-semibold text-neutral-500 mb-1 block">Username *</label><input className={input + " w-full"} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. priya" /></div>
                    <div><label className="text-xs font-semibold text-neutral-500 mb-1 block">Display name</label><input className={input + " w-full"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" /></div>
                    <div><label className="text-xs font-semibold text-neutral-500 mb-1 block">Password *</label><input type="password" className={input + " w-full"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8 chars" /></div>
                    <div><label className="text-xs font-semibold text-neutral-500 mb-1 block">Role</label>
                        <select className={input + " w-full"} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="admin">Admin (full)</option><option value="volunteer">Volunteer (custom)</option></select>
                    </div>
                </div>
                {form.role === "volunteer" && (
                    <div className="border-t border-neutral-200 pt-3">
                        <p className="text-xs font-semibold text-neutral-500 mb-2">Grant access — tick what this volunteer can do:</p>
                        <PermissionPicker value={formPerms} onChange={setFormPerms} />
                    </div>
                )}
                <div className="flex justify-end">
                    <button type="submit" disabled={busy} className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Create account</button>
                </div>
            </form>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                        <tr><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Access</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No named accounts yet. Add one above.</td></tr>
                        ) : users.map((u) => (
                            <Fragment key={u.id}>
                                <tr className="hover:bg-neutral-50">
                                    <td className="px-4 py-3"><span className="font-semibold text-neutral-900">{u.name || u.username}</span><span className="block text-xs text-neutral-400">@{u.username}</span></td>
                                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ${ROLE_BADGE[u.role] || ROLE_BADGE.volunteer}`}>{u.role}</span></td>
                                    <td className="px-4 py-3 text-neutral-500 text-xs">
                                        {u.role === "admin" ? "Everything" : `${(u.permissions || []).length} permission(s)`}
                                        {u.role === "volunteer" && <button onClick={() => (editId === u.id ? setEditId(null) : openEdit(u))} className="ml-2 text-orange-600 font-semibold hover:underline">{editId === u.id ? "Close" : "Edit access"}</button>}
                                    </td>
                                    <td className="px-4 py-3">{u.active ? <span className="text-green-600 font-medium">Active</span> : <span className="text-neutral-400">Disabled</span>}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => resetPw(u)} title="Reset password" className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100"><KeyRound className="w-4 h-4" /></button>
                                            <button onClick={() => patch(u.id, { active: !u.active }, u.active ? "Account disabled." : "Account enabled.")} title={u.active ? "Disable" : "Enable"} className={`p-1.5 rounded-lg border ${u.active ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}><Power className="w-4 h-4" /></button>
                                            <button onClick={() => remove(u)} title="Remove" className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                                {editId === u.id && (
                                    <tr className="bg-orange-50/30">
                                        <td colSpan={5} className="px-4 py-4">
                                            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-neutral-700"><ShieldCheck className="w-4 h-4 text-orange-600" /> Edit access for @{u.username}</div>
                                            <PermissionPicker value={editPerms} onChange={setEditPerms} />
                                            <div className="flex justify-end gap-2 mt-3">
                                                <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100">Cancel</button>
                                                <button onClick={() => saveEdit(u)} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-700">Save access</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
