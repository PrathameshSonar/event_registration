// components/site/PageHero.js
// Full-bleed page hero used on every inner page (about, event, gallery, live,
// news, faq, contact, registration). Image + kicker + title + subtitle are
// admin-controlled (Settings → Page Headers); a page passes its i18n fallbacks.
// Presentational + hook-free, so it works in both server and client pages.

export default function PageHero({ image, kicker, title, subtitle, size = "md" }) {
  const minH = size === "lg" ? "min-h-[60vh]" : "min-h-[46vh]";
  return (
    <section className={`relative isolate overflow-hidden text-ivory flex items-end ${minH}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover animate-slow-zoom" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(10,60%,28%)] via-[hsl(350,45%,22%)] to-[hsl(20,55%,14%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-[hsl(20,45%,8%)]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,hsla(32,95%,55%,0.16),transparent_60%)]" />

      <div className="container-luxury relative z-10 pt-28 pb-14 md:pb-20">
        {kicker && <span className="kicker-light">{kicker}</span>}
        <h1 className="mt-4 display-hero text-ivory text-hero-shadow text-balance" style={{ fontSize: "clamp(2.3rem, 5vw, 4rem)" }}>
          {title}
        </h1>
        {subtitle && <p className="mt-5 max-w-2xl text-ivory/85 leading-[1.7] text-pretty" style={{ fontSize: "1.075rem" }}>{subtitle}</p>}
      </div>
    </section>
  );
}
