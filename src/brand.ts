/**
 * MSC – Curlin's own brand, shown where SAP Datasphere has its logo (left in the shellbar).
 * Big-4 style: a heavy, tight sans-serif wordmark with one geometric color accent.
 * The accent is three rising, slanted bars – a growing chart – in purple, wine red and orange.
 * Also used in docs/design/msc-logo.svg. Keep both in sync.
 */

export const MSC_COLORS = { purple: '#5B2A86', wine: '#7A1F3D', orange: '#F07C1A' } as const;

/** The three bars, 33 × 24 units, sitting on the baseline. */
export const MSC_BARS = `
  <path d="M0 24h6l3.2-8h-6z" fill="${MSC_COLORS.purple}"/>
  <path d="M9 24h6l6-15h-6z" fill="${MSC_COLORS.wine}"/>
  <path d="M18 24h6l8.8-22h-6z" fill="${MSC_COLORS.orange}"/>`;

/** Logo for the shellbar: wordmark as text (UI font), bars as SVG. */
export const MSC_LOGO = `<span class="msc-logo" role="img" aria-label="MSC">
  <span class="msc-word" aria-hidden="true">MSC</span>
  <svg class="msc-mark" viewBox="0 0 33 24" aria-hidden="true">${MSC_BARS}</svg>
</span>`;
