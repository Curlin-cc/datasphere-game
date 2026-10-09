/**
 * MSC – Curlin's own brand, shown where SAP Datasphere has its logo (left in the shellbar).
 * Big-4 style: a heavy, tight sans-serif wordmark with one geometric symbol.
 * The symbol stands for inventive spirit: a light bulb (purple) with a filament spark, its base in wine red,
 * and an orange spark next to it – the moment an idea lights up.
 * Also used in docs/design/msc-logo.svg. Keep both in sync.
 */

export const MSC_COLORS = { purple: '#5B2A86', wine: '#7A1F3D', orange: '#F07C1A' } as const;

/** The symbol, 28 × 28 units. */
export const MSC_SYMBOL = `
  <path d="M12 3a8 8 0 0 0-4.6 14.5V20h9.2v-2.5A8 8 0 0 0 12 3z" fill="${MSC_COLORS.purple}"/>
  <path d="M9.3 12.5l1.6-2.2 1.9 2.2 1.8-2.2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="7.4" y="21" width="9.2" height="2.2" rx="1.1" fill="${MSC_COLORS.wine}"/>
  <rect x="8.8" y="24.3" width="6.4" height="2" rx="1" fill="${MSC_COLORS.wine}"/>
  <path d="M23 .5l1.3 3.2 3.2 1.3-3.2 1.3L23 9.5l-1.3-3.2-3.2-1.3 3.2-1.3z" fill="${MSC_COLORS.orange}"/>`;

/** Logo for the shellbar: wordmark as text (UI font), symbol as SVG. */
export const MSC_LOGO = `<span class="msc-logo" role="img" aria-label="MSC">
  <span class="msc-word" aria-hidden="true">MSC</span>
  <svg class="msc-mark" viewBox="0 0 28 28" aria-hidden="true">${MSC_SYMBOL}</svg>
</span>`;
