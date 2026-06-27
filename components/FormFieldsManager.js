// components/FormFieldsManager.js
// Admin UI for the dynamic registration form. Self-contained: fetches and
// mutates /api/admin/form-fields directly. Rendered in the admin Settings tab.
"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Trash2, Plus, Lock, ArrowUp, ArrowDown } from "lucide-react";

const TYPE_LABELS = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  textarea: "Paragraph",
};

export default function FormFieldsManager() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // New custom field form
  const [label, setLabel] = useState("");
  const [labelHi, setLabelHi] = useState("");
  const [type, setType] = useState("text");
  const [optionsText, setOptionsText] = useState("");
  const [required, setRequired] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/form-fields");
    if (res.ok) {
      const d = await res.json();
      setFields(d.fields || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (id, updates) => {
    setBusy(true);
    await fetch("/api/admin/form-fields", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    await load();
    setBusy(false);
  };

  const create = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/form-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim(),
        label_hi: labelHi.trim() || null,
        field_type: type,
        is_required: required,
        options:
          type === "select"
            ? optionsText.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
      }),
    });
    if (res.ok) {
      setLabel("");
      setLabelHi("");
      setType("text");
      setOptionsText("");
      setRequired(false);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to create field.");
    }
    setBusy(false);
  };

  const remove = async (id, lbl) => {
    if (!confirm(`Delete custom field "${lbl}"? Existing answers stay in the database but the field stops appearing.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/form-fields", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Delete failed.");
    }
    await load();
    setBusy(false);
  };

  // Swap sort_order with the neighbour in the given direction.
  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const a = fields[index];
    const b = fields[target];
    setBusy(true);
    await Promise.all([
      fetch("/api/admin/form-fields", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, sort_order: b.sort_order }) }),
      fetch("/api/admin/form-fields", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, sort_order: a.sort_order }) }),
    ]);
    await load();
    setBusy(false);
  };

  if (loading) {
    return <p className="text-neutral-400 text-sm py-8">Loading form fields…</p>;
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-2 border-b border-neutral-200 pb-4 text-neutral-900">
        Registration Form Fields
      </h2>
      <p className="text-sm text-neutral-500 mb-6">
        Toggle which fields appear on the registration form and which are required.
        Name, Email and Phone are locked — payment and ticket delivery depend on them.
      </p>

      {/* Field list */}
      <div className="space-y-2 mb-10">
        {fields.map((f, i) => (
          <div
            key={f.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              f.is_visible ? "bg-white border-neutral-200" : "bg-neutral-50 border-neutral-100"
            }`}
          >
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={busy || i === 0} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={busy || i === fields.length - 1} className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 truncate">{f.label}</span>
                {f.is_core && <span title="Locked — always required"><Lock className="w-3 h-3 text-neutral-400" /></span>}
                {f.is_custom && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">CUSTOM</span>}
                <span className="text-[10px] font-bold bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded uppercase">{TYPE_LABELS[f.field_type] || f.field_type}</span>
              </div>
              {f.field_type === "select" && Array.isArray(f.options) && (
                <p className="text-xs text-neutral-400 truncate mt-0.5">Options: {f.options.join(", ")}</p>
              )}
            </div>

            {/* Required toggle */}
            <label className={`flex items-center gap-1.5 text-xs font-semibold ${f.is_core ? "opacity-50 cursor-not-allowed" : "cursor-pointer text-neutral-600"}`}>
              <input
                type="checkbox"
                checked={f.is_required}
                disabled={f.is_core || busy}
                onChange={(e) => patch(f.id, { is_required: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
              />
              Required
            </label>

            {/* Visible toggle */}
            <button
              onClick={() => !f.is_core && patch(f.id, { is_visible: !f.is_visible })}
              disabled={f.is_core || busy}
              title={f.is_core ? "Core field — always visible" : f.is_visible ? "Visible — click to hide" : "Hidden — click to show"}
              className={`p-2 rounded-lg border transition ${
                f.is_core
                  ? "border-neutral-100 text-neutral-300 cursor-not-allowed"
                  : f.is_visible
                    ? "border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                    : "border-neutral-200 text-neutral-400 hover:bg-neutral-100"
              }`}
            >
              {f.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Delete (custom only) */}
            {f.is_custom ? (
              <button onClick={() => remove(f.id, f.label)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 border border-transparent hover:border-red-200 rounded-lg hover:bg-red-50 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <span className="w-8" />
            )}
          </div>
        ))}
      </div>

      {/* Create custom field */}
      <form onSubmit={create} className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700">Add a Custom Field</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Field label (e.g. T-shirt Size)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required />
          <input type="text" placeholder="हिंदी लेबल (optional)" value={labelHi} onChange={(e) => setLabelHi(e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-600 text-sm cursor-pointer">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Dropdown</option>
            <option value="textarea">Paragraph</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-600 cursor-pointer">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" />
            Required field
          </label>
        </div>
        {type === "select" && (
          <input type="text" placeholder="Dropdown options, comma-separated (e.g. S, M, L, XL)" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" />
        )}
        <button type="submit" disabled={busy || !label.trim()} className="flex items-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition">
          <Plus className="w-4 h-4" /> Add Field
        </button>
      </form>
    </div>
  );
}
