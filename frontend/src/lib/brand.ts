// The approved brand's design tokens. Every screen and the shared component kit
// (`@/lib/ui`) reads these -- directly, as `brand.*`, and via the mirrored CSS
// custom properties in `index.css` (`--brand-*`) -- so a brand change here
// repaints the app without touching a single screen's markup.
//
// Values must match the approved brand exactly; keep this and the `:root`
// block in `index.css` in sync.
export const brand = {
  primaryColor: "#0a0a0a",
  accentColor: "#1d3fff",
  neutralColor: "#55575c",
  backgroundColor: "#f4f4f0",
  radius: "0rem",
  fontHeading: '"Barlow Condensed", "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontBody: '"Barlow", "Helvetica Neue", Helvetica, Arial, sans-serif',
  density: "Spacious, gallery margins",
} as const;
