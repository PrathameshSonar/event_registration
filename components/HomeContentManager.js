// components/HomeContentManager.js
// Admin editor for the devotional homepage: countdown date + helpline (on the
// event), the programme schedule, and ritual highlight cards. Scoped to one
// event via a selector. Each list item saves on its own action.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Clock, Sparkles, Phone, CalendarClock } from "lucide-react";

export default function HomeContentManager(props) {
  const events = props.events || [];
  const active = events.find((e) => e.is_active);
  const [eventId, setEventId] = useState(active?.id || events[0]?.id || "");
  const ev = events.find((e) => e.id === eventId);

  // Event-level fields
  const [startAt, setStartAt] = useState("");
  const [phone, setPhone] = useState("");
  const [evDirty, setEvDirty] = useState(false);
  const [savingEv, setSavingEv] = useState(false);

  const [schedule, setSchedule] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [busy, setBusy] = useState(false);

  // New schedule row
  const [sTime, setSTime] = useState("");
  const [sTitle, setSTitle] = useState("");
  const [sTitleHi, setSTitleHi] = useState("");
  const [sDay, setSDay] = useState("");

  // New highlight
  const [hIcon, setHIcon] = useState("🪔");
  const [hTitle, setHTitle] = useState("");
  const [hTitleHi, setHTitleHi] = useState("");
  const [hDesc, setHDesc] = useState("");

  // datetime-local wants "YYYY-MM-DDTHH:mm"
  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const loadLists = useCallback(async (id) => {
    if (!id) return;
    const [s, h] = await Promise.all([
      fetch(`/api/admin/schedule?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/highlights?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
    ]);
    setSchedule(s.items || []);
    setHighlights(h.items || []);
  }, []);

  useEffect(() => {
    setStartAt(toLocalInput(ev?.start_at));
    setPhone(ev?.contact_phone || "");
    setEvDirty(false);
    if (eventId) loadLists(eventId);
  }, [eventId, ev?.start_at, ev?.contact_phone, loadLists]);

  const saveEventFields = async () => {
    setSavingEv(true);
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: eventId,
        updates: {
          start_at: startAt ? new Date(startAt).toISOString() : null,
          contact_phone: phone.trim() || null,
        },
      }),
    });
    setEvDirty(false);
    setSavingEv(false);
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    if (!sTitle.trim()) return;
    setBusy(true);
    await fetch("/api/admin/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, time_label: sTime, title: sTitle, title_hi: sTitleHi, day_label: sDay }),
    });
    setSTime(""); setSTitle(""); setSTitleHi(""); setSDay("");
    await loadLists(eventId);
    setBusy(false);
  };

  const delSchedule = async (id) => {
    setBusy(true);
    await fetch("/api/admin/schedule", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };

  const addHighlight = async (e) => {
    e.preventDefault();
    if (!hTitle.trim()) return;
    setBusy(true);
    await fetch("/api/admin/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, icon: hIcon, title: hTitle, title_hi: hTitleHi, description: hDesc }),
    });
    setHIcon("🪔"); setHTitle(""); setHTitleHi(""); setHDesc("");
    await loadLists(eventId);
    setBusy(false);
  };

  const delHighlight = async (id) => {
    setBusy(true);
    await fetch("/api/admin/highlights", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };

  if (!events.length) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold mb-2 text-neutral-900">Home Page Content</h2>
        <p className="text-neutral-500 text-sm py-8">Create an event first.</p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm";
  const inputHiCls = "w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm";

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-2 border-b border-neutral-200 pb-4 text-neutral-900">Home Page Content</h2>
      <p className="text-sm text-neutral-500 mb-6">Countdown, helpline, schedule and ritual highlights shown on the public homepage for the selected event.</p>

      {/* Event selector */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Event</label>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-600 text-sm cursor-pointer">
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.is_active ? " ✓ (Active)" : ""}</option>)}
        </select>
      </div>

      {/* Countdown + helpline */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-4">Countdown & Helpline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Event start (for countdown)</label>
            <input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setEvDirty(true); }} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> WhatsApp helpline number</label>
            <input type="tel" placeholder="9876543210" value={phone} onChange={(e) => { setPhone(e.target.value); setEvDirty(true); }} className={inputCls} />
          </div>
        </div>
        <button onClick={saveEventFields} disabled={!evDirty || savingEv} className={`mt-4 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${evDirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}>
          <Save className="w-4 h-4" /> {evDirty ? "Save" : "Saved"}
        </button>
      </div>

      {/* Schedule */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Programme Schedule</h3>
        <div className="space-y-2 mb-4">
          {schedule.length === 0 && <p className="text-neutral-400 text-sm">No schedule items yet.</p>}
          {schedule.map((s) => (
            <div key={s.id} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg p-3">
              <span className="text-xs font-bold text-orange-700 w-20 flex-shrink-0">{s.time_label || "—"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{s.title}</p>
                {(s.title_hi || s.day_label) && <p className="text-xs text-neutral-400 truncate">{[s.day_label, s.title_hi].filter(Boolean).join(" · ")}</p>}
              </div>
              <button onClick={() => delSchedule(s.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addSchedule} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Time (e.g. 6:00 PM)" value={sTime} onChange={(e) => setSTime(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Day (e.g. Day 1)" value={sDay} onChange={(e) => setSDay(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Title (English)" value={sTitle} onChange={(e) => setSTitle(e.target.value)} className={inputCls} required />
          <input type="text" placeholder="शीर्षक (हिंदी)" value={sTitleHi} onChange={(e) => setSTitleHi(e.target.value)} className={inputHiCls} />
          <button type="submit" disabled={busy || !sTitle.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Schedule Item</button>
        </form>
      </div>

      {/* Highlights */}
      <div className="mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Ritual Highlights</h3>
        <p className="text-xs text-neutral-400 mb-3">Leave empty to show the default ritual cards (Havan, Maha Aarti, Annadān…).</p>
        <div className="space-y-2 mb-4">
          {highlights.map((h) => (
            <div key={h.id} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg p-3">
              <span className="text-2xl flex-shrink-0">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{h.title}</p>
                {h.description && <p className="text-xs text-neutral-400 truncate">{h.description}</p>}
              </div>
              <button onClick={() => delHighlight(h.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addHighlight} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Icon emoji (🔥 🪔 🌺 🍲)" value={hIcon} onChange={(e) => setHIcon(e.target.value)} className={inputCls} maxLength={4} />
          <input type="text" placeholder="Title (English)" value={hTitle} onChange={(e) => setHTitle(e.target.value)} className={inputCls} required />
          <input type="text" placeholder="शीर्षक (हिंदी)" value={hTitleHi} onChange={(e) => setHTitleHi(e.target.value)} className={inputHiCls} />
          <input type="text" placeholder="Short description (English)" value={hDesc} onChange={(e) => setHDesc(e.target.value)} className={inputCls} />
          <button type="submit" disabled={busy || !hTitle.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Highlight</button>
        </form>
      </div>
    </div>
  );
}
