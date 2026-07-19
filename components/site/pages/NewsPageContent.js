// components/site/pages/NewsPageContent.js — full news list (published event_news).
"use client";

import { useState } from "react";
import { FileText, BellRing } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { toast } from "@/lib/uiStore";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";

export default function NewsPageContent({ items, eventId, hero }) {
  const { t, lang } = useLanguage();
  const h = hero || {};
  const list = items || [];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error(t("news_sub_err") || "Enter your email."); return; }
    setBusy(true);
    const res = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, email }) });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || t("news_sub_fail") || "Could not subscribe."); return; }
    setDone(true);
    toast.success(t("news_sub_done") || "You're subscribed — we'll keep you posted.");
  };

  return (
    <>
      <PageHero image={h.image} kicker={h.kicker || t("section_news_kicker") || "Latest News"} title={h.title || t("section_news_title") || "News & Announcements"} subtitle={h.subtitle} />
      <section className="section-y mandala-bg">
        <div className="container-luxury">
          {list.length === 0 ? (
            <p className="text-center text-brown/50">{t("news_empty") || "No announcements yet."}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((n, i) => {
                const title = pick(n, "title", lang);
                const body = pick(n, "body", lang);
                return (
                  <Reveal key={n.id || i} delay={i * 60}>
                    <article className="luxury-card h-full overflow-hidden flex flex-col">
                      {n.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.image_url} alt="" className="w-full h-44 object-cover" />
                      )}
                      <div className="p-6 flex flex-col flex-1">
                        {n.published_at && <time className="text-[11px] font-semibold uppercase tracking-wider text-mutedgold">{new Date(n.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time>}
                        <h3 className="mt-2 font-display text-xl text-brown leading-tight">{title}</h3>
                        {body && <p className="mt-3 text-brown/70 text-[15px] leading-[1.75] flex-1 whitespace-pre-wrap">{body}</p>}
                        {n.attachment_url && (
                          <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-vermillion hover:text-lotus">
                            <FileText className="h-4 w-4" /> {n.attachment_name || t("download_cta") || "Download"}
                          </a>
                        )}
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal className="mt-14">
            <div className="luxury-card mx-auto max-w-2xl p-8 md:p-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-shine text-white shadow-gold"><BellRing className="h-6 w-6" /></span>
              <h3 className="mt-5 font-display text-2xl text-brown">{t("news_sub_title") || "Never miss an update"}</h3>
              <p className="mt-2 text-brown/65 text-sm max-w-md mx-auto">{t("news_sub_desc") || "Get event announcements, schedule changes and reminders straight to your inbox."}</p>
              {done ? (
                <p className="mt-6 font-semibold text-vermillion">🙏 {t("news_sub_thanks") || "You're on the list."}</p>
              ) : (
                <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("news_sub_ph") || "you@example.com"} className="flex-1 h-12 px-4 rounded-full border border-gold/25 bg-white text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
                  <button type="submit" disabled={busy} className="btn-gold justify-center disabled:opacity-50">{busy ? (t("news_sub_busy") || "Subscribing…") : (t("news_sub_cta") || "Subscribe")}</button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
