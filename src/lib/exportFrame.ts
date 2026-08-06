import defaultLogo from "../assets/chec-logo.jpg";

const NAVY = "#123a63";
const BLUE = "#1c5e9e";
const HEADER_BG = "#eef2f6";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 64)}`));
    img.src = src;
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Composites the exported org chart under a corporate header band (diagonal brand accent,
 * logo, work-center title pill) so downloads read as a finished document rather than a bare
 * canvas screenshot. Export-only — the live editing canvas is untouched. Returns a PNG data
 * URL sized to the full composited image. */
export async function composeChartWithHeader(
  chartDataUrl: string,
  title: string,
  logoSrc?: string
): Promise<{ dataUrl: string; width: number; height: number }> {
  const [chartImg, logoImg] = await Promise.all([loadImage(chartDataUrl), loadImage(logoSrc || defaultLogo)]);

  const width = chartImg.width;
  const headerHeight = Math.max(130, Math.min(260, Math.round(width * 0.09)));
  const height = headerHeight + chartImg.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(0, 0, width, headerHeight);

  // Two-tone diagonal accent in the top-left corner, echoing the brand ribbon.
  const accent = headerHeight * 1.9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(accent, 0);
  ctx.lineTo(0, accent);
  ctx.closePath();
  ctx.fillStyle = NAVY;
  ctx.fill();
  const accent2 = accent * 0.58;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(accent2, 0);
  ctx.lineTo(0, accent2);
  ctx.closePath();
  ctx.fillStyle = BLUE;
  ctx.fill();

  // Logo, kept clear of the accent stripe.
  const logoHeight = headerHeight * 0.58;
  const logoWidth = logoHeight * (logoImg.width / logoImg.height);
  const logoX = headerHeight * 0.75;
  const logoY = (headerHeight - logoHeight) / 2 - headerHeight * 0.08;
  ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

  // Title pill with the active work center's name.
  const pillText = title.toUpperCase();
  const pillFontSize = Math.round(headerHeight * 0.22);
  ctx.font = `700 ${pillFontSize}px Arial, Helvetica, sans-serif`;
  const textWidth = ctx.measureText(pillText).width;
  const pillPaddingX = headerHeight * 0.35;
  const pillX = logoX + logoWidth + headerHeight * 0.6;
  const pillHeight = headerHeight * 0.42;
  const pillY = headerHeight * 0.18;
  const maxPillWidth = Math.max(headerHeight * 2, width - pillX - headerHeight * 0.5);
  const pillWidth = Math.min(maxPillWidth, textWidth + pillPaddingX * 2);
  roundedRectPath(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(pillText, pillX + pillWidth / 2, pillY + pillHeight / 2 + 1, pillWidth - pillPaddingX);

  // Company name under the pill.
  ctx.font = `700 ${Math.round(headerHeight * 0.13)}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = NAVY;
  ctx.textAlign = "left";
  ctx.fillText("CHINA HARBOUR ENGINEERING COMPANY LTD.", pillX, pillY + pillHeight + headerHeight * 0.22);

  // Divider between the header and the chart.
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(2, headerHeight * 0.01);
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  ctx.drawImage(chartImg, 0, headerHeight);

  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}
