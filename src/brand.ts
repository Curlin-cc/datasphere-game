/**
 * MSC – Curlin's own brand, shown where SAP Datasphere has its logo (left in the shellbar).
 * Big-4 style: a heavy, tight sans-serif wordmark with one geometric emblem.
 * The emblem is a lightly drawn eye – just its outline – with a modern triquetra as the pupil: three interlocking arcs
 * in purple, wine red and orange (Curlin's template, developed further). Seeing the data, three strands holding together.
 * Also used in docs/design/msc-logo.svg. Keep both in sync.
 */

export const MSC_COLORS = { purple: '#5B2A86', wine: '#7A1F3D', orange: '#F07C1A' } as const;

/** The emblem, centred on 0,0 (viewBox -22 -12 44 24). The eye outline uses currentColor. */
export const MSC_SYMBOL = `
  <path d="M-21 0Q0 -21 21 0Q0 21 -21 0Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
  <g transform="translate(0 1.9) scale(0.5)"><path transform="rotate(240)" d="M0 -15A12.2 12.2 0 0 1 0 7A12.2 12.2 0 0 1 0 -15Z" fill="none" stroke="${MSC_COLORS.orange}" stroke-width="4.8" stroke-linejoin="round"/><path transform="rotate(120)" d="M0 -15A12.2 12.2 0 0 1 0 7A12.2 12.2 0 0 1 0 -15Z" fill="none" stroke="${MSC_COLORS.wine}" stroke-width="4.8" stroke-linejoin="round"/><path transform="rotate(0)" d="M0 -15A12.2 12.2 0 0 1 0 7A12.2 12.2 0 0 1 0 -15Z" fill="none" stroke="${MSC_COLORS.purple}" stroke-width="4.8" stroke-linejoin="round"/></g>`;

/** Logo for the shellbar: wordmark as text (UI font), emblem as SVG. */
export const MSC_LOGO = `<span class="msc-logo" role="img" aria-label="MSC">
  <span class="msc-word" aria-hidden="true">MSC</span>
  <svg class="msc-mark" viewBox="-22 -12 44 24" aria-hidden="true">${MSC_SYMBOL}</svg>
</span>`;
