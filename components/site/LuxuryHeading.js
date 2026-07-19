// components/site/LuxuryHeading.js
// The signature two-line section heading: a Cinzel main line + a Cormorant-italic
// accent second line (vermillion on light sections, gold on dark). Pass `accent=""`
// to render a single line. Matches the reference's heading style everywhere.

export default function LuxuryHeading({ main, accent, dark = false, className = "" }) {
  return (
    <h2 className={`display-section ${dark ? "text-ivory" : "text-brown"} ${className}`}>
      {main}
      {accent ? (
        <>
          <br />
          <span className={`font-cormorant italic ${dark ? "text-gold-400" : "text-vermillion"}`}>{accent}</span>
        </>
      ) : null}
    </h2>
  );
}
