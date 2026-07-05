// components/HomeContentManager.js
// Admin editor for the devotional homepage: countdown date + helpline (on the
// event), the programme schedule, and ritual highlight cards. Scoped to one
// event via a selector. Each list item saves on its own action.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Clock, Sparkles, Phone, CalendarClock, Image as ImageIcon, HelpCircle, BellRing, Star } from "lucide-react";
import { toast } from "@/lib/uiStore";

export default function HomeContentManager(props) {
  const events = props.events || [];
  const active = events.find((e) => e.is_active);
  const [eventId, setEventId] = useState(active?.id || events[0]?.id || "");
  const ev = events.find((e) => e.id === eventId);

  // Event-level fields
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [phone, setPhone] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [evDirty, setEvDirty] = useState(false);
  const [savingEv, setSavingEv] = useState(false);

  const [schedule, setSchedule] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [guests, setGuests] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [busy, setBusy] = useState(false);

  // New guest
  const [gName, setGName] = useState("");
  const [gRole, setGRole] = useState("");
  const [gPhoto, setGPhoto] = useState("");
  const [gBio, setGBio] = useState("");

  // New FAQ
  const [fq, setFq] = useState("");
  const [fqHi, setFqHi] = useState("");
  const [fa, setFa] = useState("");
  const [faHi, setFaHi] = useState("");

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
    const [s, h, f, r, g] = await Promise.all([
      fetch(`/api/admin/schedule?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/highlights?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/faqs?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/reminders?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/guests?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
    ]);
    setSchedule(s.items || []);
    setHighlights(h.items || []);
    setFaqs(f.items || []);
    setReminders(r.items || []);
    setGuests(g.items || []);
  }, []);

  const addGuest = async (e) => {
    e.preventDefault();
    if (!gName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/guests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, name: gName, role: gRole, photo_url: gPhoto, bio: gBio }),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Could not add guest."); return; }
    setGName(""); setGRole(""); setGPhoto(""); setGBio("");
    await loadLists(eventId);
  };
  const delGuest = async (id) => {
    setBusy(true);
    await fetch("/api/admin/guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };

  useEffect(() => {
    setStartAt(toLocalInput(ev?.start_at));
    setEndAt(toLocalInput(ev?.end_at));
    setPhone(ev?.contact_phone || "");
    setHeroImage(ev?.hero_image_url || "");
    setEvDirty(false);
    if (eventId) loadLists(eventId);
  }, [eventId, ev?.start_at, ev?.end_at, ev?.contact_phone, ev?.hero_image_url, loadLists]);

  const saveEventFields = async () => {
    setSavingEv(true);
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: eventId,
        updates: {
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          contact_phone: phone.trim() || null,
          hero_image_url: heroImage.trim() || null,
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

  const addFaq = async (e) => {
    e.preventDefault();
    if (!fq.trim() || !fa.trim()) return;
    setBusy(true);
    await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, question: fq, question_hi: fqHi, answer: fa, answer_hi: faHi }),
    });
    setFq(""); setFqHi(""); setFa(""); setFaHi("");
    await loadLists(eventId);
    setBusy(false);
  };

  const delFaq = async (id) => {
    setBusy(true);
    await fetch("/api/admin/faqs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };

  const exportReminders = () => {
    const rows = [["Date", "Email", "Phone"]];
    reminders.forEach((r) => rows.push([new Date(r.created_at).toLocaleString(), r.email || "", r.phone || ""]));
    const csv = rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `reminders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
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

      {/* Hero image + countdown + helpline */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-4">Hero, Countdown & Helpline</h3>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Hero background image URL</label>
          <input type="url" placeholder="https://… (deity / temple photo)" value={heroImage} onChange={(e) => { setHeroImage(e.target.value); setEvDirty(true); }} className={inputCls} />
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="hero preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-neutral-200" />
          ) : (
            <p className="text-xs text-neutral-400 mt-1">Leave empty to use the saffron gradient. Paste any image link (e.g. a Supabase Storage public URL).</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Event start (for countdown)</label>
            <input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setEvDirty(true); }} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Event end (for “Add to Calendar”)</label>
            <input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setEvDirty(true); }} className={inputCls} />
            <p className="text-xs text-neutral-400 mt-1">For a multi-day event, set the last day — the .ics will span all days.</p>
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

      {/* Guest / artist lineup */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-2"><Star className="w-4 h-4" /> Guest / Artist Lineup</h3>
        <p className="text-xs text-neutral-400 mb-3">Featured guests, artists or saints shown on the home page. Leave empty to hide the section.</p>
        <div className="space-y-2 mb-4">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg p-3">
              {g.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={g.photo_url} alt={g.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0"><Star className="w-4 h-4 text-neutral-400" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{g.name}</p>
                {g.role && <p className="text-xs text-neutral-400 truncate">{g.role}</p>}
              </div>
              <button onClick={() => delGuest(g.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addGuest} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Name" value={gName} onChange={(e) => setGName(e.target.value)} className={inputCls} required />
          <input type="text" placeholder="Role / title (e.g. Kathavachak, Singer)" value={gRole} onChange={(e) => setGRole(e.target.value)} className={inputCls} />
          <input type="url" placeholder="Photo URL (Supabase Storage / any image link)" value={gPhoto} onChange={(e) => setGPhoto(e.target.value)} className={`${inputCls} md:col-span-2`} />
          <input type="text" placeholder="Short bio (optional)" value={gBio} onChange={(e) => setGBio(e.target.value)} className={`${inputCls} md:col-span-2`} />
          <button type="submit" disabled={busy || !gName.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Guest</button>
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

      {/* FAQ */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" /> FAQ</h3>
        <div className="space-y-2 mb-4">
          {faqs.length === 0 && <p className="text-neutral-400 text-sm">No FAQs yet — the FAQ section stays hidden until you add one.</p>}
          {faqs.map((f) => (
            <div key={f.id} className="flex items-start gap-3 bg-white border border-neutral-200 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{f.question}</p>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">{f.answer}</p>
              </div>
              <button onClick={() => delFaq(f.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addFaq} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Question (English)" value={fq} onChange={(e) => setFq(e.target.value)} className={inputCls} required />
          <input type="text" placeholder="प्रश्न (हिंदी)" value={fqHi} onChange={(e) => setFqHi(e.target.value)} className={inputHiCls} />
          <textarea placeholder="Answer (English)" value={fa} onChange={(e) => setFa(e.target.value)} className={`${inputCls} resize-none h-20`} required />
          <textarea placeholder="उत्तर (हिंदी)" value={faHi} onChange={(e) => setFaHi(e.target.value)} className={`${inputHiCls} resize-none h-20`} />
          <button type="submit" disabled={busy || !fq.trim() || !fa.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add FAQ</button>
        </form>
      </div>

      {/* Reminder signups */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 flex items-center gap-2"><BellRing className="w-4 h-4" /> Reminder Signups ({reminders.length})</h3>
          {reminders.length > 0 && (
            <button onClick={exportReminders} className="text-xs font-bold text-orange-600 hover:text-orange-700 border border-orange-200 rounded-lg px-3 py-1.5 transition">↓ Export CSV</button>
          )}
        </div>
        {reminders.length === 0 ? (
          <p className="text-neutral-400 text-sm">No reminder signups yet.</p>
        ) : (
          <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-600 text-xs sticky top-0">
                <tr><th className="text-left px-4 py-2 font-semibold">Email</th><th className="text-left px-4 py-2 font-semibold">Phone</th><th className="text-left px-4 py-2 font-semibold">When</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {reminders.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-neutral-700 break-all">{r.email || "—"}</td>
                    <td className="px-4 py-2 text-neutral-700">{r.phone || "—"}</td>
                    <td className="px-4 py-2 text-neutral-400 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
