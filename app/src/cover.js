// Sunset Cover Studio — paints the poster.
// Everything the cover shows is drawn here on canvas: the photo panels, a
// sunset band with a slatted retro sun and palm silhouettes, and the big
// condensed caption. The design is original — no Rockstar logo, artwork or
// font; the display face is Anton under the SIL Open Font License, loaded
// from the app's own fonts folder.

// Where each layout puts its panels, as fractions of the whole cover.
export const PANEL_LAYOUTS = {
  // A hero shot on top, two smaller shots beneath it.
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
  // Three tall columns side by side.
  strip: [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ],
};

// The post sizes the export button offers.
export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

// A grade is a CSS filter for the photos plus a translucent tint washed over
// the finished poster, so every panel shares one colour mood.
export const COLOUR_GRADES = {
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

/** A fresh panel: no photo, natural zoom, centred. */
export function emptyPanelState() {
  return { photo: -1, zoom: 1, ox: 0, oy: 0 };
}

/** The panels for a layout, carrying over photo choices from the old ones. */
export function layoutPanels(layout, previous) {
  const boxes = PANEL_LAYOUTS[layout] || PANEL_LAYOUTS.stack;
  return boxes.map((_, i) => {
    const kept = previous && previous[i];
    return kept ? { ...kept } : emptyPanelState();
  });
}

/** Clamps n into [lo, hi]. */
function clampNumber(n, lo, hi) {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Turns layout fractions into pixel boxes, leaving thin gaps between panels. */
function pixelBoxes(layout, w, h) {
  const gap = Math.max(5, Math.round(w * 0.006));
  const half = gap / 2;
  return (PANEL_LAYOUTS[layout] || PANEL_LAYOUTS.stack).map((r) => {
    const padL = r.x > 0 ? half : 0;
    const padT = r.y > 0 ? half : 0;
    const padR = r.x + r.w < 1 ? half : 0;
    const padB = r.y + r.h < 1 ? half : 0;
    return {
      x: Math.round(r.x * w) + padL,
      y: Math.round(r.y * h) + padT,
      w: Math.round(r.w * w) - padL - padR,
      h: Math.round(r.h * h) - padT - padB,
    };
  });
}

/** A panel with no photo: deep violet, diagonal hatch, ADD A PHOTO label. */
function paintEmptyPanel(ctx, box) {
  const { x, y, w, h } = box;
  const fill = ctx.createLinearGradient(x, y, x + w, y + h);
  fill.addColorStop(0, '#3a1d63');
  fill.addColorStop(1, '#160a2a');
  ctx.fillStyle = fill;
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

/** Draws one photo to fill its panel, honouring zoom and pan. */
function paintPhoto(ctx, photo, box, panel, filter) {
  const { x, y, w, h } = box;
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const scale = Math.max(w / iw, h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan is a fraction of the panel; keep it small enough that no gap appears.
  const capX = Math.max(0, (dw - w) / 2 / w);
  const capY = Math.max(0, (dh - h) / 2 / h);
  const ox = clampNumber(panel.ox, -capX, capX) * w;
  const oy = clampNumber(panel.oy, -capY, capY) * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(photo, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
  ctx.restore();
  ctx.filter = 'none';
  // A warm shade rising from the panel's foot, so the panels sit as one poster.
  const shade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  shade.addColorStop(0, 'rgba(255, 90, 60, 0)');
  shade.addColorStop(1, 'rgba(120, 20, 90, 0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** One palm silhouette: leaning trunk, seven arcing fronds, two coconuts. */
function paintPalm(ctx, baseX, baseY, size, flip) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(flip, 1);
  ctx.strokeStyle = '#160a24';
  ctx.fillStyle = '#160a24';
  ctx.lineCap = 'round';
  // Trunk leans gently, thick at the base.
  ctx.lineWidth = size * 0.085;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.04, -size * 0.5, size * 0.15, -size * 0.92);
  ctx.stroke();
  const topX = size * 0.15;
  const topY = -size * 0.92;
  // Fronds fan out from the crown, rising then drooping toward the tip.
  ctx.lineWidth = size * 0.032;
  for (let i = 0; i < 7; i++) {
    const angle = -Math.PI * (0.06 + (i / 6) * 0.88);
    const len = size * (0.5 + (i % 2) * 0.14);
    const fromX = topX + (i - 3) * size * 0.02;
    const fromY = topY + Math.abs(i - 3) * size * 0.012;
    const tipX = fromX + Math.cos(angle) * len;
    const tipY = fromY + Math.sin(angle) * len * 0.72 + size * 0.1;
    const bendX = fromX + Math.cos(angle) * len * 0.55;
    const bendY = fromY + Math.sin(angle) * len * 0.55 - size * 0.16;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(bendX, bendY, tipX, tipY);
    ctx.stroke();
  }
  // Two coconuts tucked under the crown.
  ctx.beginPath();
  ctx.arc(topX - size * 0.03, topY + size * 0.05, size * 0.045, 0, Math.PI * 2);
  ctx.arc(topX + size * 0.05, topY + size * 0.06, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The retro sun: a warm radial disc, slats cut across its lower half. */
function paintSun(ctx, cx, cy, r) {
  const disc = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
  disc.addColorStop(0, '#fff3b0');
  disc.addColorStop(0.45, '#ffb347');
  disc.addColorStop(0.8, '#ff5e8a');
  disc.addColorStop(1, '#e33e7f');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = disc;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: sky-coloured bars that widen toward the bottom of the disc.
  ctx.fillStyle = '#2a0f45';
  let y = cy + r * 0.08;
  let thick = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.11;
    thick *= 1.5;
  }
  ctx.restore();
}

/** The largest Anton size at which the caption still fits maxWidth. */
function fitCaption(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  return size;
}

/** The sunset band across the foot of the cover, sun and palms included. */
function paintSunsetBand(ctx, w, h) {
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
  paintSun(ctx, w * 0.5, bandY + bandH * 0.52, sunR);
  // Palms frame the caption at the band's edges.
  const palmH = bandH * 1.25;
  paintPalm(ctx, w * 0.045, h - bandH * 0.06, palmH, 1);
  paintPalm(ctx, w * 0.955, h - bandH * 0.06, palmH * 0.92, -1);
  return { bandH, bandY };
}

/** The caption: big condensed capitals with a sunset fill and a dark edge. */
function paintCaption(ctx, w, h, bandY, bandH, caption) {
  const text = (caption || '').trim().toUpperCase();
  if (!text) return;
  const size = fitCaption(ctx, text, w * 0.86, h * 0.105);
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

/** The subtitle: small tracked capitals sitting under the caption. */
function paintSubtitle(ctx, w, h, bandY, bandH, subtitle) {
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
 * Paints the whole poster on a canvas: the photo panels, the sunset band with
 * its sun and palms, the caption and subtitle, then the grade tint and a thin
 * frame. `cover` holds layout, grade, caption, subtitle, photos and panels.
 */
export function paintCover(canvas, cover) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = COLOUR_GRADES[cover.grade] || COLOUR_GRADES.sunset;
  const boxes = pixelBoxes(cover.layout, w, h);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  boxes.forEach((box, i) => {
    const panel = cover.panels[i] || emptyPanelState();
    const photo = panel.photo >= 0 ? cover.photos[panel.photo] : null;
    if (photo) {
      paintPhoto(ctx, photo, box, panel, grade.filter);
    } else {
      paintEmptyPanel(ctx, box);
    }
  });

  // Sunset band, caption and subtitle across the foot of the poster.
  const { bandH, bandY } = paintSunsetBand(ctx, w, h);
  paintCaption(ctx, w, h, bandY, bandH, cover.caption);
  paintSubtitle(ctx, w, h, bandY, bandH, cover.subtitle);

  // Grade tint, then a thin white frame to finish.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Paints the poster at an export size on a fresh canvas and returns it. */
export function renderExport(cover, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paintCover(canvas, cover);
  return canvas;
}
