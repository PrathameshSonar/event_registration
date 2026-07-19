// components/HomeContentManager.js
// Admin editor for the devotional homepage: countdown date + helpline (on the
// event), the programme schedule, and ritual highlight cards. Scoped to one
// event via a selector. Each list item saves on its own action.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Clock, Sparkles, CalendarClock, Image as ImageIcon, HelpCircle, BellRing, Star, Radio, Newspaper, Eye, EyeOff, FileText, Quote } from "lucide-react";
import { youtubeId } from "@/lib/youtube";
import { toast } from "@/lib/uiStore";
import MediaPicker from "@/components/MediaPicker";
import TranslatableField from "@/components/admin/TranslatableField";
import { buildTranslations } from "@/lib/i18n";

// Update one { hi:{field:v}, mr:{…} } translation map — used by every add-form here.
const mkSetTr = (setTr) => (lang, field, v) => setTr((p) => ({ ...p, [lang]: { ...(p[lang] || {}), [field]: v } }));

export default function HomeContentManager(props) {
  const events = props.events || [];
  const active = events.find((e) => e.is_active);
  const [eventId, setEventId] = useState(active?.id || events[0]?.id || "");
  const ev = events.find((e) => e.id === eventId);

  // Event-level fields
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [evDirty, setEvDirty] = useState(false);
  const [savingEv, setSavingEv] = useState(false);

  // Live stream (event-level). Kept in its OWN dirty flag + save so an admin can
  // hit "Go live" without also committing half-typed countdown/helpline edits.
  const [lsUrl, setLsUrl] = useState("");
  const [lsBanner, setLsBanner] = useState("");
  const [lsLive, setLsLive] = useState(false);
  const [lsDirty, setLsDirty] = useState(false);
  const [savingLs, setSavingLs] = useState(false);

  const [schedule, setSchedule] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [guests, setGuests] = useState([]);
  const [news, setNews] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [busy, setBusy] = useState(false);

  // New news / announcement
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [nImage, setNImage] = useState("");
  const [nAttachUrl, setNAttachUrl] = useState("");
  const [nAttachName, setNAttachName] = useState("");
  const [nTr, setNTr] = useState({});

  // New guest (English base + a `tr` map for other languages)
  const [gName, setGName] = useState("");
  const [gRole, setGRole] = useState("");
  const [gPhoto, setGPhoto] = useState("");
  const [gBio, setGBio] = useState("");
  const [gFeatured, setGFeatured] = useState(false);
  const [gBullets, setGBullets] = useState("");
  const [gQuote, setGQuote] = useState("");
  const [gTr, setGTr] = useState({});

  // New testimonial / devotee quote
  const [tName, setTName] = useState("");
  const [tLocation, setTLocation] = useState("");
  const [tQuote, setTQuote] = useState("");
  const [tTr, setTTr] = useState({});

  // New FAQ
  const [fq, setFq] = useState("");
  const [fa, setFa] = useState("");
  const [fTr, setFTr] = useState({});

  // New schedule row
  const [sTime, setSTime] = useState("");
  const [sTitle, setSTitle] = useState("");
  const [sDay, setSDay] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sTr, setSTr] = useState({});

  // New highlight (section groups it into a distinct homepage block)
  const [hIcon, setHIcon] = useState("🪔");
  const [hTitle, setHTitle] = useState("");
  const [hDesc, setHDesc] = useState("");
  const [hSection, setHSection] = useState("highlights");
  const [hImage, setHImage] = useState("");
  const [hTr, setHTr] = useState({});

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
    const [s, h, f, r, g, n, tm] = await Promise.all([
      fetch(`/api/admin/schedule?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/highlights?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/faqs?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/reminders?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/guests?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/news?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`/api/admin/testimonials?eventId=${id}`).then((r) => r.json()).catch(() => ({ items: [] })),
    ]);
    setSchedule(s.items || []);
    setHighlights(h.items || []);
    setFaqs(f.items || []);
    setReminders(r.items || []);
    setGuests(g.items || []);
    setNews(n.items || []);
    setTestimonials(tm.items || []);
  }, []);

  // ── Live stream ───────────────────────────────────────────────────────────
  const saveLivestream = async (overrides = {}) => {
    setSavingLs(true);
    const next = {
      livestream_url: lsUrl.trim() || null,
      livestream_banner: lsBanner.trim() || null,
      livestream_is_live: lsLive,
      ...overrides,
    };
    const res = await fetch("/api/admin/events", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId, updates: next }),
    });
    setSavingLs(false);
    if (!res.ok) { toast.error("Could not save the live stream settings."); return; }
    setLsDirty(false);
    if (overrides.livestream_is_live !== undefined) {
      toast.success(overrides.livestream_is_live ? "🔴 You are LIVE — the player and banner are now on the site." : "Stream ended — the player and banner are hidden.");
    } else {
      toast.success("Live stream settings saved.");
    }
  };

  // Going live needs a URL, otherwise the homepage would show an empty player.
  const toggleLive = async () => {
    const goingLive = !lsLive;
    if (goingLive && !lsUrl.trim()) { toast.error("Add the stream URL first — there's nothing to show without one."); return; }
    setLsLive(goingLive);
    await saveLivestream({ livestream_is_live: goingLive });
  };

  // ── News / announcements ──────────────────────────────────────────────────
  const addNews = async (e) => {
    e.preventDefault();
    if (!nTitle.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/news", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId, title: nTitle, body: nBody, image_url: nImage,
        attachment_url: nAttachUrl, attachment_name: nAttachName,
        is_published: true, translations: buildTranslations(nTr),
      }),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Could not add the announcement."); return; }
    setNTitle(""); setNBody(""); setNImage(""); setNAttachUrl(""); setNAttachName(""); setNTr({});
    await loadLists(eventId);
  };

  const toggleNews = async (item) => {
    setBusy(true);
    await fetch("/api/admin/news", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_published: !item.is_published }),
    });
    await loadLists(eventId);
    setBusy(false);
  };

  const delNews = async (id) => {
    setBusy(true);
    await fetch("/api/admin/news", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };

  const addGuest = async (e) => {
    e.preventDefault();
    if (!gName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/guests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId, name: gName, role: gRole, photo_url: gPhoto, bio: gBio,
        is_featured: gFeatured, quote: gQuote,
        bullets: gBullets.split("\n").map((s) => s.trim()).filter(Boolean),
        translations: buildTranslations(gTr),
      }),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Could not add guest."); return; }
    setGName(""); setGRole(""); setGPhoto(""); setGBio(""); setGFeatured(false); setGBullets(""); setGQuote(""); setGTr({});
    await loadLists(eventId);
  };
  const delGuest = async (id) => {
    setBusy(true);
    await fetch("/api/admin/guests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };
  // Mark/unmark a guest as the featured "Leadership" hero (e.g. Guruji).
  const toggleGuestFeatured = async (g) => {
    setBusy(true);
    await fetch("/api/admin/guests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: g.id, is_featured: !g.is_featured }) });
    await loadLists(eventId);
    setBusy(false);
  };

  // ── Testimonials / devotee quotes ──────────────────────────────────────────
  const addTestimonial = async (e) => {
    e.preventDefault();
    if (!tQuote.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/testimonials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, name: tName, location: tLocation, quote: tQuote, is_published: true, translations: buildTranslations(tTr) }),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Could not add testimonial."); return; }
    setTName(""); setTLocation(""); setTQuote(""); setTTr({});
    await loadLists(eventId);
  };
  const toggleTestimonial = async (item) => {
    setBusy(true);
    await fetch("/api/admin/testimonials", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, is_published: !item.is_published }) });
    await loadLists(eventId);
    setBusy(false);
  };
  const delTestimonial = async (id) => {
    setBusy(true);
    await fetch("/api/admin/testimonials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadLists(eventId);
    setBusy(false);
  };

  useEffect(() => {
    setStartAt(toLocalInput(ev?.start_at));
    setEndAt(toLocalInput(ev?.end_at));
    setHeroImage(ev?.hero_image_url || "");
    setEvDirty(false);
    setLsUrl(ev?.livestream_url || "");
    setLsBanner(ev?.livestream_banner || "");
    setLsLive(!!ev?.livestream_is_live);
    setLsDirty(false);
    if (eventId) loadLists(eventId);
  }, [eventId, ev?.start_at, ev?.end_at, ev?.hero_image_url, ev?.livestream_url, ev?.livestream_banner, ev?.livestream_is_live, loadLists]);

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
      body: JSON.stringify({ event_id: eventId, time_label: sTime, title: sTitle, day_label: sDay, description: sDesc, translations: buildTranslations(sTr) }),
    });
    setSTime(""); setSTitle(""); setSDay(""); setSDesc(""); setSTr({});
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
      body: JSON.stringify({ event_id: eventId, icon: hIcon, title: hTitle, description: hDesc, section: hSection, image_url: hImage, translations: buildTranslations(hTr) }),
    });
    setHIcon("🪔"); setHTitle(""); setHDesc(""); setHSection("highlights"); setHImage(""); setHTr({});
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
      body: JSON.stringify({ event_id: eventId, question: fq, answer: fa, translations: buildTranslations(fTr) }),
    });
    setFq(""); setFa(""); setFTr({});
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
        </div>
        <p className="text-xs text-neutral-400 mt-3">The WhatsApp helpline / contact phone and social links are managed in <span className="font-semibold text-neutral-500">Settings → Contact &amp; Social</span>.</p>
        <button onClick={saveEventFields} disabled={!evDirty || savingEv} className={`mt-4 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${evDirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}>
          <Save className="w-4 h-4" /> {evDirty ? "Save" : "Saved"}
        </button>
      </div>

      {/* Live stream */}
      <div className={`border rounded-xl p-6 mb-8 transition ${lsLive ? "bg-rose-50 border-rose-300" : "bg-neutral-50 border-neutral-200"}`}>
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 flex items-center gap-2">
            <Radio className={`w-4 h-4 ${lsLive ? "text-rose-600" : ""}`} /> Live Stream
            {lsLive && (
              <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> ON AIR
              </span>
            )}
          </h3>
          <button
            onClick={toggleLive}
            disabled={savingLs}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 ${lsLive ? "bg-neutral-900 text-white hover:bg-neutral-700" : "bg-rose-600 text-white hover:bg-rose-700"}`}
          >
            {savingLs ? "Saving…" : lsLive ? "End stream" : "🔴 Go live"}
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          {lsLive
            ? "The player and the site-wide banner are LIVE on the public site right now."
            : "Paste the stream link ahead of time, then hit Go live when you start. Nothing shows publicly until you do."}
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Stream URL</label>
            <input
              type="url"
              placeholder="YouTube link, or any provider's iframe embed URL"
              value={lsUrl}
              onChange={(e) => { setLsUrl(e.target.value); setLsDirty(true); }}
              className={inputCls}
            />
            <p className="text-xs text-neutral-400 mt-1">
              {lsUrl.trim()
                ? (youtubeId(lsUrl)
                    ? "✓ YouTube link recognised — it will be embedded automatically."
                    : "Not a YouTube link — this will be embedded as-is, so paste the provider's EMBED url (not the page url).")
                : "Paste a YouTube watch/live link (any form), or another provider's embed URL."}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Banner text (optional)</label>
            <input
              type="text"
              placeholder="e.g. Maha Aarti streaming now"
              value={lsBanner}
              onChange={(e) => { setLsBanner(e.target.value); setLsDirty(true); }}
              className={inputCls}
            />
            <p className="text-xs text-neutral-400 mt-1">Shown in the sticky bar across the site while you&rsquo;re live. Falls back to a default message if empty.</p>
          </div>
        </div>

        <button
          onClick={() => saveLivestream()}
          disabled={!lsDirty || savingLs}
          className={`mt-4 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${lsDirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}
        >
          <Save className="w-4 h-4" /> {lsDirty ? "Save" : "Saved"}
        </button>
      </div>

      {/* News / announcements */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-2"><Newspaper className="w-4 h-4" /> News &amp; Announcements</h3>
        <p className="text-xs text-neutral-400 mb-3">Short updates shown on the homepage, newest first. Hidden items stay saved but don&rsquo;t appear publicly. Leave empty to hide the section.</p>
        <div className="space-y-2 mb-4">
          {news.length === 0 && <p className="text-neutral-400 text-sm">No announcements yet.</p>}
          {news.map((n) => (
            <div key={n.id} className={`flex items-center gap-3 bg-white border rounded-lg p-3 ${n.is_published ? "border-neutral-200" : "border-neutral-200 opacity-60"}`}>
              {n.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={n.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded bg-neutral-100 flex items-center justify-center flex-shrink-0"><Newspaper className="w-4 h-4 text-neutral-400" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {n.title}
                  {!n.is_published && <span className="ml-2 text-[10px] font-bold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded align-middle">HIDDEN</span>}
                </p>
                {n.body && <p className="text-xs text-neutral-400 truncate">{n.body}</p>}
              </div>
              <button onClick={() => toggleNews(n)} disabled={busy} title={n.is_published ? "Hide from the site" : "Show on the site"} className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition">
                {n.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => delNews(n.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addNews} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
          <TranslatableField label="Headline" field="title" value={nTitle} onValue={setNTitle} tr={nTr} onTr={mkSetTr(setNTr)} placeholder="e.g. Parking & entry details announced" />
          <TranslatableField label="Details" field="body" value={nBody} onValue={setNBody} tr={nTr} onTr={mkSetTr(setNTr)} multiline rows={3} placeholder="A short paragraph of detail." />
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Image (optional)</label>
            <div className="flex gap-2">
              <input type="url" placeholder="https://… or pick from the library →" value={nImage} onChange={(e) => setNImage(e.target.value)} className={inputCls} />
              <MediaPicker onSelected={(url) => setNImage(url)} label="Library" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Attachment (optional)</label>
            {nAttachUrl ? (
              <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg p-2.5">
                <FileText className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span className="text-sm text-neutral-800 flex-1 min-w-0 truncate">{nAttachName || nAttachUrl}</span>
                <button type="button" onClick={() => { setNAttachUrl(""); setNAttachName(""); }} className="p-1 text-neutral-400 hover:text-red-600 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <MediaPicker
                kind="document"
                label="Attach a document"
                className="w-full"
                onSelected={(url, item) => { setNAttachUrl(url); setNAttachName(item?.title || item?.filename || "Download"); }}
              />
            )}
            <p className="text-xs text-neutral-400 mt-1">Readers get a download button on the announcement (e.g. a parking map PDF).</p>
          </div>
          <button type="submit" disabled={busy || !nTitle.trim()} className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Announcement</button>
        </form>
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
                {(s.translations?.hi?.title || s.day_label) && <p className="text-xs text-neutral-400 truncate">{[s.day_label, s.translations?.hi?.title].filter(Boolean).join(" · ")}</p>}
              </div>
              <button onClick={() => delSchedule(s.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addSchedule} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Time (e.g. 6:00 PM)" value={sTime} onChange={(e) => setSTime(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Day (e.g. Day 1)" value={sDay} onChange={(e) => setSDay(e.target.value)} className={inputCls} />
          <div className="md:col-span-2"><TranslatableField label="Title" field="title" value={sTitle} onValue={setSTitle} tr={sTr} onTr={mkSetTr(setSTr)} placeholder="Title" /></div>
          <input type="text" placeholder="One-line detail (optional)" value={sDesc} onChange={(e) => setSDesc(e.target.value)} className={`${inputCls} md:col-span-2`} />
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
                <p className="text-sm font-semibold text-neutral-900 truncate">{g.name}{g.is_featured && <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded align-middle">★ LEADERSHIP</span>}</p>
                {g.role && <p className="text-xs text-neutral-400 truncate">{g.role}</p>}
              </div>
              <button onClick={() => toggleGuestFeatured(g)} disabled={busy} title={g.is_featured ? "Remove from Leadership hero" : "Feature as the Leadership hero (e.g. Guruji)"} className={`p-2 rounded-lg transition ${g.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-neutral-300 hover:text-amber-500 hover:bg-amber-50"}`}><Star className="w-4 h-4" fill={g.is_featured ? "currentColor" : "none"} /></button>
              <button onClick={() => delGuest(g.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addGuest} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><TranslatableField label="Name" field="name" value={gName} onValue={setGName} tr={gTr} onTr={mkSetTr(setGTr)} placeholder="Name" /></div>
          <div><TranslatableField label="Role / title" field="role" value={gRole} onValue={setGRole} tr={gTr} onTr={mkSetTr(setGTr)} placeholder="e.g. Kathavachak, Singer" /></div>
          <div className="md:col-span-2 flex gap-2">
            <input type="url" placeholder="Photo URL — paste a link or upload →" value={gPhoto} onChange={(e) => setGPhoto(e.target.value)} className={`${inputCls} flex-1`} />
            <MediaPicker onSelected={(url) => setGPhoto(url)} />
          </div>
          <div className="md:col-span-2"><TranslatableField label="Short bio" field="bio" value={gBio} onValue={setGBio} tr={gTr} onTr={mkSetTr(setGTr)} multiline rows={2} placeholder="Short bio (optional)" /></div>
          <label className="md:col-span-2 flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700">
            <input type="checkbox" checked={gFeatured} onChange={(e) => setGFeatured(e.target.checked)} className="w-4 h-4 text-amber-600 rounded border-neutral-300 focus:ring-amber-600" />
            ★ Feature as the Leadership hero (large section above the lineup — e.g. Guruji)
          </label>
          {gFeatured && (
            <>
              <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Leadership bullet points <span className="font-normal text-neutral-400 normal-case">(one per line — shown next to the portrait)</span></label><textarea value={gBullets} onChange={(e) => setGBullets(e.target.value)} rows={4} placeholder={"Practitioner of Baglamukhi & Sri Vidya sadhana\nGuide to hundreds of Yajmaans each year"} className={inputCls} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Pull-quote <span className="font-normal text-neutral-400 normal-case">(optional — a line in their words)</span></label><textarea value={gQuote} onChange={(e) => setGQuote(e.target.value)} rows={2} placeholder="“Sadhana is not the absence of the world…”" className={inputCls} /></div>
            </>
          )}
          <button type="submit" disabled={busy || !gName.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Guest</button>
        </form>
      </div>

      {/* Testimonials / devotee quotes */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-2"><Quote className="w-4 h-4" /> Testimonials</h3>
        <p className="text-xs text-neutral-400 mb-3">Curated devotee quotes shown on the homepage. Hidden items stay saved but don&rsquo;t appear publicly. Leave empty to hide the section.</p>
        <div className="space-y-2 mb-4">
          {testimonials.length === 0 && <p className="text-neutral-400 text-sm">No testimonials yet.</p>}
          {testimonials.map((tm) => (
            <div key={tm.id} className={`flex items-start gap-3 bg-white border rounded-lg p-3 ${tm.is_published ? "border-neutral-200" : "border-neutral-200 opacity-60"}`}>
              <Quote className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-800 line-clamp-2">&ldquo;{tm.quote}&rdquo;</p>
                <p className="text-xs text-neutral-400 mt-0.5">{[tm.name, tm.location].filter(Boolean).join(" · ") || "Anonymous"}{!tm.is_published && <span className="ml-2 text-[10px] font-bold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded align-middle">HIDDEN</span>}</p>
              </div>
              <button onClick={() => toggleTestimonial(tm)} disabled={busy} title={tm.is_published ? "Hide from the site" : "Show on the site"} className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition">
                {tm.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => delTestimonial(tm.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addTestimonial} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="text" placeholder="Name (e.g. Ramesh K.)" value={tName} onChange={(e) => setTName(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Location (e.g. Pune)" value={tLocation} onChange={(e) => setTLocation(e.target.value)} className={inputCls} />
          <div className="md:col-span-2"><TranslatableField label="Quote" field="quote" value={tQuote} onValue={setTQuote} tr={tTr} onTr={mkSetTr(setTTr)} multiline rows={2} placeholder="What they said about the experience…" /></div>
          <button type="submit" disabled={busy || !tQuote.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Testimonial</button>
        </form>
      </div>

      {/* Highlights */}
      <div className="mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Highlight Cards</h3>
        <p className="text-xs text-neutral-400 mb-3">Card grids on the homepage. Pick a <strong>section</strong> per card: <em>Highlights</em> (rituals), <em>Pillars</em> (e.g. Puja / Gyan / Bhakti), or <em>Blessings</em> (benefits). Each non-empty section renders as its own block. Leave Highlights empty to show the default ritual cards.</p>
        <div className="space-y-2 mb-4">
          {highlights.map((h) => (
            <div key={h.id} className="flex items-center gap-3 bg-white border border-neutral-200 rounded-lg p-3">
              <span className="text-2xl flex-shrink-0">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">{h.title}
                  {h.section && h.section !== 'highlights' && <span className="ml-2 text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded align-middle uppercase">{h.section}</span>}
                </p>
                {h.description && <p className="text-xs text-neutral-400 truncate">{h.description}</p>}
              </div>
              <button onClick={() => delHighlight(h.id)} disabled={busy} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <form onSubmit={addHighlight} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <input type="text" placeholder="Icon emoji (🔥 🪔 🌺 🍲)" value={hIcon} onChange={(e) => setHIcon(e.target.value)} className={inputCls} maxLength={4} />
            <select value={hSection} onChange={(e) => setHSection(e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="highlights">Section: Highlights</option>
              <option value="pillars">Section: Pillars</option>
              <option value="blessings">Section: Blessings</option>
            </select>
          </div>
          <div><TranslatableField label="Title" field="title" value={hTitle} onValue={setHTitle} tr={hTr} onTr={mkSetTr(setHTr)} placeholder="Title" /></div>
          <div><TranslatableField label="Short description" field="description" value={hDesc} onValue={setHDesc} tr={hTr} onTr={mkSetTr(setHTr)} placeholder="Short description" /></div>
          <div className="md:col-span-2 flex gap-2 items-center">
            <input type="url" placeholder="Card image URL (optional — used by Pillar cards)" value={hImage} onChange={(e) => setHImage(e.target.value)} className={`${inputCls} flex-1`} />
            <MediaPicker onSelected={(url) => setHImage(url)} />
          </div>
          <button type="submit" disabled={busy || !hTitle.trim()} className="md:col-span-2 flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"><Plus className="w-4 h-4" /> Add Card</button>
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
          <div><TranslatableField label="Question" field="question" value={fq} onValue={setFq} tr={fTr} onTr={mkSetTr(setFTr)} placeholder="Question" /></div>
          <div><TranslatableField label="Answer" field="answer" value={fa} onValue={setFa} tr={fTr} onTr={mkSetTr(setFTr)} multiline rows={3} placeholder="Answer" /></div>
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
