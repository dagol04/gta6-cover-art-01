// Sunset Cover Studio — cover painter (rebuilt for the gta6-cover-art-01 entry).
// Paints a multi-panel GTA-style poster on a canvas: photo panels, a Vice City
// sunset strip with a slatted retro sun and palm silhouettes, plus big condensed
// caption type. All original — no Rockstar logo, artwork or font; the display
// face is Anton (SIL OFL), loaded by the page.

// Panel boxes as fractions of the cover, one array per layout.
export const LAYOUTS = {
  // A hero photo above two smaller ones.
  stack: [
    { x: 0, y: 0, w: 1, h: 0.6 },
    { x: 0, y: 0.6, w: 0.5, h: 0.4 },
    { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
  ],
  // Four equal quarters.
  grid: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  // Three tall columns.
  strip: [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ],
};

// The three post sizes the app exports.
export const SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

// Colour grades: a CSS filter for the photos, and a translucent tint washed
// over the finished cover for one unified colour mood.
export const GRADES = {
  sunset: {
    filter: 'saturate(1.35) contrast(1.08) sepia(0.18) hue-rotate(-8deg) brightness(1.02)',
    wash: 'rgba(255, 110, 60, 0.10)',
  },
  neon: {
    filter: 'saturate(1.85) contrast(1.15) hue-rotate(18deg) brightness(1.0)',
    wash: 'rgba(255, 40, 160, 0.12)',
  },
  dusk: {
    filter: 'saturate(1.1) contrast(1.06) hue-rotate(38deg) brightness(0.92)',
    wash: 'rgba(90, 40, 200, 0.14)',
  },
  noir: {
    filter: 'saturate(0.12) contrast(1.22) brightness(1.06)',
    wash: 'rgba(20, 20, 40, 0.10)',
  },
};

/** A panel holding no photo: centred, at natural zoom. */
export function blankPanel() {
  return { photo: -1, zoom: 1, ox: 0, oy: 0 };
}

/** Panels for a layout, keeping any photo choices the previous panels held. */
export function panelsFor(layout, previous) {
  const rects = LAYOUTS[layout] || LAYOUTS.stack;
  return rects.map((_, i) => {
    const old = previous && previous[i];
    return old ? { ...old } : blankPanel();
  });
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

/** Pixel boxes for a layout on a cover of w by h, with thin gaps between panels. */
function panelRects(layout, w, h) {
  const gap = Math.max(5, Math.round(w * 0.006));
  const half = gap / 2;
  return (LAYOUTS[layout] || LAYOUTS.stack).map((r) => {
    const left = r.x > 0 ? half : 0;
    const top = r.y > 0 ? half : 0;
    const right = r.x + r.w < 1 ? half : 0;
    const bottom = r.y + r.h < 1 ? half : 0;
    return {
      x: Math.round(r.x * w) + left,
      y: Math.round(r.y * h) + top,
      w: Math.round(r.w * w) - left - right,
      h: Math.round(r.h * h) - top - bottom,
    };
  });
}

/** A vacant panel: deep violet, diagonal hatch, and an ADD A PHOTO label. */
function drawEmptyPanel(ctx, rect) {
  const { x, y, w, h } = rect;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#3a1d63');
  g.addColorStop(1, '#160a2a');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  const step = Math.max(18, w * 0.09);
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `700 ${Math.max(12, w * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** A photo fitted to fill a panel, with its zoom and pan offsets applied. */
function drawPhoto(ctx, photo, rect, panel, filter) {
  const { x, y, w, h } = rect;
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const scale = Math.max(w / iw, h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan is a fraction of the panel; clamp it so the photo never leaves a gap.
  const maxOx = Math.max(0, (dw - w) / 2 / w);
  const maxOy = Math.max(0, (dh - h) / 2 / h);
  const ox = clamp(panel.ox, -maxOx, maxOx) * w;
  const oy = clamp(panel.oy, -maxOy, maxOy) * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(photo, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
  ctx.restore();
  ctx.filter = 'none';
  // A warm dusk shade climbing from the panel's foot, so panels sit together.
  const shade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  shade.addColorStop(0, 'rgba(255, 90, 60, 0)');
  shade.addColorStop(1, 'rgba(120, 20, 90, 0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** One palm silhouette: a leaning trunk and seven arcing fronds from its crown. */
function drawPalm(ctx, bx, by, size, mirror) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(mirror, 1);
  ctx.strokeStyle = '#160a24';
  ctx.fillStyle = '#160a24';
  ctx.lineCap = 'round';
  // Trunk: a gentle quadratic lean, thicker at the base.
  ctx.lineWidth = size * 0.085;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.04, -size * 0.5, size * 0.15, -size * 0.92);
  ctx.stroke();
  const crownX = size * 0.15;
  const crownY = -size * 0.92;
  // Fronds fan from the crown: each rises, then droops toward its tip.
  ctx.lineWidth = size * 0.032;
  for (let i = 0; i < 7; i++) {
    const angle = -Math.PI * (0.06 + (i / 6) * 0.88);
    const len = size * (0.5 + (i % 2) * 0.14);
    const startX = crownX + (i - 3) * size * 0.02;
    const startY = crownY + Math.abs(i - 3) * size * 0.012;
    const tipX = startX + Math.cos(angle) * len;
    const tipY = startY + Math.sin(angle) * len * 0.72 + size * 0.1;
    const ctrlX = startX + Math.cos(angle) * len * 0.55;
    const ctrlY = startY + Math.sin(angle) * len * 0.55 - size * 0.16;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  // Two coconuts tucked under the crown.
  ctx.beginPath();
  ctx.arc(crownX - size * 0.03, crownY + size * 0.05, size * 0.045, 0, Math.PI * 2);
  ctx.arc(crownX + size * 0.05, crownY + size * 0.06, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The retro sun: a warm radial disc with slats cut from its lower half. */
function drawSun(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.45, '#ffb347');
  g.addColorStop(0.8, '#ff5e8a');
  g.addColorStop(1, '#e33e7f');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: sky-coloured bars widening toward the bottom of the disc.
  ctx.fillStyle = '#2a0f45';
  let y = cy + r * 0.08;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.11;
    gap *= 1.5;
  }
  ctx.restore();
}

/** The biggest Anton size at which the caption still fits maxWidth. */
function fitText(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  return size;
}

/** The sunset strip across the foot of the cover, with its sun and palms. */
function drawSunsetBand(ctx, w, h) {
  const bandH = h * 0.22;
  const bandY = h - bandH;
  const sky = ctx.createLinearGradient(0, bandY, 0, h);
  sky.addColorStop(0, 'rgba(42, 15, 69, 0)');
  sky.addColorStop(0.35, 'rgba(42, 15, 69, 0.55)');
  sky.addColorStop(0.62, 'rgba(122, 28, 110, 0.82)');
  sky.addColorStop(1, 'rgba(255, 94, 138, 0.92)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, bandY, w, bandH);
  const sunR = bandH * 0.62;
  drawSun(ctx, w * 0.5, bandY + bandH * 0.52, sunR);
  // Palms frame the caption at the strip's edges.
  const palmH = bandH * 1.25;
  drawPalm(ctx, w * 0.045, h - bandH * 0.06, palmH, 1);
  drawPalm(ctx, w * 0.955, h - bandH * 0.06, palmH * 0.92, -1);
  return { bandH, bandY };
}

/** The caption: big condensed capitals, a sunset gradient fill, a dark edge. */
function drawCaption(ctx, w, h, bandY, bandH, caption) {
  const text = (caption || '').trim().toUpperCase();
  if (!text) return;
  const size = fitText(ctx, text, w * 0.86, h * 0.105);
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(w / 2, bandY + bandH * 0.46);
  ctx.transform(1, 0, -0.06, 1, 0, 0);
  const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  fill.addColorStop(0, '#fffbe8');
  fill.addColorStop(0.55, '#ffe9a8');
  fill.addColorStop(1, '#ff9e57');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#22083a';
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.shadowColor = 'rgba(20, 4, 40, 0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** The subtitle: small tracked capitals under the caption. */
function drawSubtitle(ctx, w, h, bandY, bandH, subtitle) {
  const text = (subtitle || '').trim().toUpperCase();
  if (!text) return;
  const subSize = Math.max(14, h * 0.021);
  ctx.font = `700 ${subSize}px system-ui, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(3, subSize * 0.32)}px`; } catch { /* older canvas: no tracking */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 240, 248, 0.95)';
  ctx.shadowColor = 'rgba(20, 4, 40, 0.6)';
  ctx.shadowBlur = subSize * 0.3;
  ctx.fillText(text, w / 2, bandY + bandH * 0.86);
  ctx.shadowBlur = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  ctx.textBaseline = 'alphabetic';
}

/**
 * Paints the whole cover on a canvas: panels, the sunset strip with its sun and
 * palms, the caption and subtitle, then the grade tint and a thin frame.
 * `state` holds layout, grade, caption, subtitle, photos and panels.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = panelRects(state.layout, w, h);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const panel = state.panels[i] || blankPanel();
    const photo = panel.photo >= 0 ? state.photos[panel.photo] : null;
    if (photo) {
      drawPhoto(ctx, photo, rect, panel, grade.filter);
    } else {
      drawEmptyPanel(ctx, rect);
    }
  });

  // The sunset strip, caption and subtitle across the foot of the cover.
  const { bandH, bandY } = drawSunsetBand(ctx, w, h);
  drawCaption(ctx, w, h, bandY, bandH, state.caption);
  drawSubtitle(ctx, w, h, bandY, bandH, state.subtitle);

  // Grade tint, then a thin white frame to finish.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Paints the cover at an export size on a fresh canvas and returns it. */
export function renderCover(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
