// components/site/pages/ContactPageContent.js — contact info + form (→ /api/contact).
"use client";

import { useState } from "react";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { InstagramIcon, YoutubeIcon, FacebookIcon } from "@/components/site/BrandIcons";
import { useLanguage } from "@/components/LanguageProvider";
import { toast } from "@/lib/uiStore";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";

export default function ContactPageContent({ event, contact, hero }) {
  const { t } = useLanguage();
  const h = hero || {};
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const phone = contact?.phone;
  const email = contact?.email;
  const venue = contact?.address || event?.venue;
  const socials = [
    { Icon: InstagramIcon, href: contact?.instagram_url, label: "instagram" },
    { Icon: YoutubeIcon, href: contact?.youtube_url, label: "youtube" },
    { Icon: FacebookIcon, href: contact?.facebook_url, label: "facebook" },
  ].filter((s) => s.href);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(t("contact_err_fields") || "Please fill in name, email and message.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || t("contact_err_generic") || "Could not send. Try again."); return; }
    setDone(true);
    toast.success(t("contact_sent") || "Message sent — we'll be in touch.");
  };

  const inputCls = "mt-2 w-full h-12 px-4 rounded-xl border border-gold/25 bg-white text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20";

  return (
    <>
      <PageHero image={h.image} kicker={h.kicker || t("contact_us_title") || "Get in touch"} title={h.title || t("contact_us_title") || "Contact Us"} subtitle={h.subtitle || t("contact_us_desc")} />

      <section className="section-y">
        <div className="container-luxury grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
          <Reveal>
            <SectionKicker>{t("footer_contact") || "Contact"}</SectionKicker>
            <h2 className="mt-5 display-section text-brown">{t("contact_reach_title") || "We'd love to hear from you"}</h2>
            <ul className="mt-8 space-y-5">
              {venue && <li className="flex items-start gap-3 text-brown/80"><MapPin className="h-5 w-5 text-vermillion mt-0.5" /><span>{venue}</span></li>}
              {phone && (
                <>
                  <li className="flex items-center gap-3 text-brown/80"><Phone className="h-5 w-5 text-vermillion" /><a href={`tel:${phone}`} className="hover:text-vermillion">{phone}</a></li>
                  <li className="flex items-center gap-3 text-brown/80"><MessageCircle className="h-5 w-5 text-vermillion" /><a href={`https://wa.me/${String(phone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-vermillion">{t("whatsapp_help") || "WhatsApp"}</a></li>
                </>
              )}
              {email && <li className="flex items-center gap-3 text-brown/80"><Mail className="h-5 w-5 text-vermillion" /><a href={`mailto:${email}`} className="hover:text-vermillion">{email}</a></li>}
            </ul>
            {socials.length > 0 && (
              <div className="mt-8 flex items-center gap-3">
                {socials.map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 text-vermillion hover:bg-gold/10 transition">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </Reveal>

          <Reveal delay={100}>
            {done ? (
              <div className="luxury-card p-10 text-center">
                <div className="text-5xl mb-3">🙏</div>
                <h3 className="font-display text-2xl text-brown mb-2">{t("contact_thanks_title") || "Message received"}</h3>
                <p className="text-brown/60 text-sm">{t("contact_thanks_desc") || "Our team will get back to you shortly."}</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="luxury-card p-8 md:p-10 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-brown/60 uppercase tracking-wider">{t("contact_name") || "Name"}</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
                  <div><label className="text-xs font-semibold text-brown/60 uppercase tracking-wider">{t("contact_email") || "Email"}</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} /></div>
                </div>
                <div><label className="text-xs font-semibold text-brown/60 uppercase tracking-wider">{t("contact_subject") || "Subject"}</label><input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className={inputCls} placeholder={t("contact_subject_ph") || "Registration query, sponsorship, seva…"} /></div>
                <div><label className="text-xs font-semibold text-brown/60 uppercase tracking-wider">{t("contact_message") || "Message"}</label><textarea rows={6} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="mt-2 w-full px-4 py-3 rounded-xl border border-gold/25 bg-white text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" placeholder={t("contact_message_ph") || "Write to us…"} /></div>
                <button type="submit" disabled={busy} className="btn-gold w-full justify-center disabled:opacity-50">{busy ? (t("contact_sending") || "Sending…") : (t("contact_send") || "Send Message")}</button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
