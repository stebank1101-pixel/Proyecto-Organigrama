// Default canvas background for centers that haven't picked their own (see
// WorkCenterManagerModal's background color/image fields). A subtle, tiled corporate
// watermark — a faint brand-color dot grid plus the CHEC wordmark — so the chart canvas
// doesn't read as a flat blank page, without competing with the cards drawn on top of it.
const TILE = 320;
const DOT_SPACING = 80;
const DOT_RADIUS = 3;
const DOT_COLOR = "#1c5e9e";
const DOT_OPACITY = 0.08;

// A staggered (brick-pattern) dot grid tiles seamlessly as long as both the row spacing
// and the tile size are multiples of DOT_SPACING — every row that would land past the
// tile edge just reappears as the same row at the top/left of the next tile.
function dotGrid(): string {
  const dots: string[] = [];
  for (let y = DOT_SPACING / 2; y < TILE; y += DOT_SPACING) {
    const rowIndex = Math.round((y - DOT_SPACING / 2) / DOT_SPACING);
    const xOffset = rowIndex % 2 === 0 ? 0 : DOT_SPACING / 2;
    for (let x = xOffset; x < TILE; x += DOT_SPACING) {
      dots.push(`<circle cx='${x}' cy='${y}' r='${DOT_RADIUS}' fill='${DOT_COLOR}' fill-opacity='${DOT_OPACITY}'/>`);
    }
  }
  return dots.join("\n  ");
}

const WATERMARK_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='${TILE}' height='${TILE}' viewBox='0 0 ${TILE} ${TILE}'>
  <rect width='${TILE}' height='${TILE}' fill='#ffffff'/>
  ${dotGrid()}
  <text x='160' y='172' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-weight='800'
        font-size='42' letter-spacing='4' fill='${DOT_COLOR}' fill-opacity='0.05' transform='rotate(-18 160 172)'>CHEC</text>
</svg>
`.trim();

export const defaultWatermarkBackground = `data:image/svg+xml,${encodeURIComponent(WATERMARK_SVG)}`;
