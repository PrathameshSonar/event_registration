// components/AddToCalendar.js
// Hero "Add to Calendar" — Google link + .ics download for Apple/Outlook.
"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";

function stamp(d) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export default function AddToCalendar({ title, startAt, location, details }) {
  const [open, setOpen] = useState(false);
  if (!startAt) return null;
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const name = title || "Mahotsav";

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(name)}` +
    `&dates=${stamp(start)}/${stamp(end)}` +
    `&location=${encodeURIComponent(location || "")}` +
    `&details=${encodeURIComponent(details || "")}`;

  const downloadIcs = () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${name}`,
      `LOCATION:${location || ""}`,
      `DESCRIPTION:${details || ""}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${name.replace(/\s+/g, "-")}.ics`;
    a.click();
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 bg-white/10 border border-white/25 backdrop-blur-sm text-white font-semibold px-3.5 py-2 rounded-full hover:bg-white/20 transition text-xs"
      >
        <CalendarPlus className="w-3.5 h-3.5" /> Add to Calendar
      </button>
      {open && (
        <div className="absolute z-20 mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden w-48 text-left">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-neutral-700 hover:bg-orange-50 transition">📅 Google Calendar</a>
          <button onClick={downloadIcs} className="block w-full text-left px-4 py-3 text-sm text-neutral-700 hover:bg-orange-50 transition"> Apple / Outlook (.ics)</button>
        </div>
      )}
    </div>
  );
}
