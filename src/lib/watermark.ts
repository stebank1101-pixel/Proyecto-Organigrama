// Default canvas background for centers that haven't picked their own (see
// WorkCenterManagerModal's background color/image fields). A subtle, tiled corporate
// watermark — the CHEC wordmark plus two faint brand-color rings — so the chart canvas
// doesn't read as a flat blank page, without competing with the cards drawn on top of it.
const WATERMARK_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'>
  <rect width='320' height='320' fill='#ffffff'/>
  <circle cx='30' cy='290' r='150' fill='none' stroke='#1c5e9e' stroke-opacity='0.045' stroke-width='26'/>
  <circle cx='290' cy='30' r='110' fill='none' stroke='#1c5e9e' stroke-opacity='0.035' stroke-width='18'/>
  <text x='160' y='172' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-weight='800'
        font-size='42' letter-spacing='4' fill='#1c5e9e' fill-opacity='0.05' transform='rotate(-18 160 172)'>CHEC</text>
</svg>
`.trim();

export const defaultWatermarkBackground = `data:image/svg+xml,${encodeURIComponent(WATERMARK_SVG)}`;
