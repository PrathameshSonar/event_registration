// components/ReminderForm.js
// Pre-event reminder opt-in (email and/or WhatsApp).
"use client";

import { useState } from "react";
import { BellRing, CheckCircle } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function ReminderForm({ eventId }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() && !phone.trim()) {
      setError(t("reminder_need_one"));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, email, phone }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(data.error || "Something went wrong.");
  };

  return (
    <section className="bg-gradient-to-br from-orange-600 to-amber-600 py-9 md:py-12">
      <div className="max-w-lg mx-auto px-4 text-center text-white">
        <BellRing className="w-7 h-7 mx-auto mb-2 text-amber-100" />
        <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight">{t("reminder_title")}</h3>
        <p className="text-amber-50/90 text-sm mt-1.5 mb-5">{t("reminder_desc")}</p>

        {done ? (
          <div className="bg-white/15 border border-white/25 rounded-2xl p-5 backdrop-blur-sm flex items-center justify-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-300" />
            <span className="font-semibold">{t("reminder_done")}</span>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl p-4 shadow-xl space-y-3 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="email" placeholder={t("reminder_email")} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-orange-500" />
              <input type="tel" placeholder={t("reminder_phone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-neutral-900 text-sm focus:outline-none focus:border-orange-500" />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-neutral-900 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg text-sm transition">
              {busy ? "…" : t("reminder_cta")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
