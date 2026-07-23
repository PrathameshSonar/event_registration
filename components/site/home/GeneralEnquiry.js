// components/site/home/GeneralEnquiry.js
// A single always-available "Enquire Now" on the homepage, INDEPENDENT of the
// Sevas/tiers — so interest can be collected before any Seva exists or is live.
// The section renders only when Settings → General Enquiry is enabled; the button
// opens a lightweight modal (core fields + a message) that posts to
// /api/general-enquiry and lands as a lead in the admin Enquiries pipeline.
"use client";

import { useState } from "react";
import { MessageCircle, X, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { toast } from "@/lib/uiStore";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

// The setting stores { en, hi, mr } objects, not DB `translations`, so resolve
// directly with an English fallback rather than the row-based pick().
const tr = (obj, lang) => (obj && (obj[lang] || obj.en)) || "";

export default function GeneralEnquiry({ config }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", message: "", agreedToTerms: false });

  if (!config?.enabled) return null;

  const heading = tr(config.title, lang) || t("enquiry_home_title") || "Have a question?";
  const subtitle = tr(config.subtitle, lang) || t("enquiry_home_subtitle") || "Leave your details and we'll get back to you.";
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error(t("enquiry_err_name") || "Enter your first and last name."); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").replace(/^(91|0)/, ""))) { toast.error(t("enquiry_err_phone") || "Enter a valid 10-digit Indian mobile number."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error(t("enquiry_err_email") || "Enter a valid email address."); return; }
    if (!form.agreedToTerms) { toast.error(t("enquiry_err_terms") || "Please accept the Terms & Conditions."); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/general-enquiry", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || t("enquiry_err_generic") || "Could not submit. Try again."); return; }
      setDone(true);
    } catch {
      toast.error(t("enquiry_err_generic") || "Could not submit. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    // Reset only after a successful send, so a mistyped attempt keeps its values.
    if (done) { setDone(false); setForm({ firstName: "", lastName: "", phone: "", email: "", message: "", agreedToTerms: false }); }
  };

  const input = "w-full rounded-xl border border-gold/30 bg-ivory/40 px-4 py-3 text-sm text-brown placeholder-brown/40 focus:border-vermillion focus:outline-none focus:ring-1 focus:ring-vermillion";

  return (
    <section id="enquire" className="section-y">
      <div className="container-luxury">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-gold/25 bg-gradient-to-br from-ivory to-white p-10 md:p-14 text-center shadow-luxury">
          <SectionKicker>{t("enquiry_home_kicker") || "Get in touch"}</SectionKicker>
          <LuxuryHeading className="mt-4 justify-center" main={heading} />
          <p className="mx-auto mt-4 max-w-md text-brown/70">{subtitle}</p>
          <button onClick={() => setOpen(true)} className="btn-gold mt-8 inline-flex h-12 items-center gap-2 px-8 text-[15px]">
            <MessageCircle className="h-4 w-4" /> {t("enquiry_home_cta") || "Enquire Now"}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={close}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl [color-scheme:light]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="font-display text-lg text-brown">{t("enquiry_home_cta") || "Enquire Now"}</h3>
              <button onClick={close} className="text-neutral-400 hover:text-neutral-700"><X className="h-5 w-5" /></button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center">
                <div className="mb-3 text-4xl">🙏</div>
                <p className="font-semibold text-brown">{t("enquiry_thanks_title") || "Thank you!"}</p>
                <p className="mt-2 text-sm text-brown/65">{t("enquiry_thanks_desc") || "We've received your enquiry and will get back to you soon."}</p>
                <button onClick={close} className="btn-outline-gold mt-6 h-11 px-6 text-sm">{t("enquiry_close") || "Close"}</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 px-6 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} placeholder={t("form_first_name") || "First name"} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  <input className={input} placeholder={t("form_last_name") || "Last name"} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                </div>
                <input className={input} inputMode="numeric" placeholder={t("form_mobile") || "Mobile number"} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                <input className={input} type="email" placeholder={t("form_email") || "Email"} value={form.email} onChange={(e) => set("email", e.target.value)} />
                <textarea className={input} rows={3} placeholder={t("enquiry_message_ph") || "Your question or what you're interested in (optional)"} value={form.message} onChange={(e) => set("message", e.target.value)} />
                <label className="flex items-start gap-2 text-xs text-brown/70">
                  <input type="checkbox" checked={form.agreedToTerms} onChange={(e) => set("agreedToTerms", e.target.checked)} className="mt-0.5" />
                  <span>{t("form_agree_terms") || "I agree to the Terms & Conditions."}</span>
                </label>
                <button type="submit" disabled={busy} className="btn-gold mt-1 flex h-12 w-full items-center justify-center gap-2 text-[15px] disabled:opacity-50">
                  {busy ? (t("enquiry_sending") || "Sending…") : (<>{t("enquiry_submit") || "Submit enquiry"} <ArrowRight className="h-4 w-4" /></>)}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
