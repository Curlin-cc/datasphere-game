/**
 * MSC – Curlin's own brand, shown where SAP Datasphere has its logo (left in the shellbar).
 * Big-4 style: a heavy, tight sans-serif wordmark with one geometric emblem.
 * The emblem is a modern take on the triquetra (Curlin's template): three interlocking arcs in purple, wine red and
 * orange inside a thin ring – three strands that only hold together as one. Clean strokes, no ornament.
 * Also used in docs/design/msc-logo.svg. Keep both in sync.
 */

export const MSC_COLORS = { purple: '#5B2A86', wine: '#7A1F3D', orange: '#F07C1A' } as const;

/** The emblem, centred on 0,0 in a 40 × 40 box (viewBox -20 -20 40 40). The ring uses currentColor. */
export const MSC_SYMBOL = `
  <circle r="18" fill="none" stroke="currentColor" stroke-width="1.8"/>
  <path transform="rotate(240)" d="M0 -15A12.2 12.2 0 0 1 0 7A12.2 12.2 0 0 1 0 -15Z" fill="none" stroke="${MSC_COLORS.orange}" stroke-width="3.2" stroke-linejoin="round"/><path transform="rotate(120)" d="M0 -15A12.2 12.2 0 0 1 0 7A12.2 12.2 0 0 1 0 -15Z" fill="none" stroke="${MSC_COLORS.wine}" stroke-width="3.2" stroke-linejoin="round"/><path transform="rotate(0)" d="M0 -15A12.2 12.2 0 0 1 0 7A12.2 12.2 0 0 1 0 -15Z" fill="none" stroke="${MSC_COLORS.purple}" stroke-width="3.2" stroke-linejoin="round"/>`;

/** Logo for the shellbar: wordmark as text (UI font), emblem as SVG. */
export const MSC_LOGO = `<span class="msc-logo" role="img" aria-label="MSC">
  <span class="msc-word" aria-hidden="true">MSC</span>
  <svg class="msc-mark" viewBox="-20 -20 40 40" aria-hidden="true">${MSC_SYMBOL}</svg>
</span>`;
