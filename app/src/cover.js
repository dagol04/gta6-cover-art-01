// Sunset Cover Studio — draws the multi-panel GTA-style cover onto a canvas.
// Own design: photo panels, a Vice City sunset band with a slatted retro sun and
// palm silhouettes, and big condensed caption lettering. No Rockstar artwork,
// logo or font is used anywhere; the display face is Anton (SIL OFL).

/** Panel rectangles, in fractions of the cover, for each layout. */
export const LAYOUTS = {
  stack: [
    { x: 0, y: 0, w: 1, h: 0.6 },
    { x: 0, y: 0.6, w: 0.5, h: 0.4 },
    { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
  ],
  grid: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  strip: [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ],
};

/** Colour grades: a canvas filter for the photos plus a warm wash over the cover. */
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

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

/** A fresh, empty panel: no photo, centred, natural zoom. */
export function blankPanel() {
  return { photo: -1, zoom: 1, ox: 0, oy: 0 };
}

/** Panels for a layout, keeping any assignments the old panels already had. */
export function panelsFor(layout, oldPanels) {
  return LAYOUTS[layout].map((_, i) => {
    const old = oldPanels && oldPanels[i];
    return old ? { ...old } : blankPanel();
  });
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPhotoInPanel(ctx, photo, rect, panel, filter) {
  const { x, y, w, h } = rect;
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a1d63');
    g.addColorStop(1, '#160a2a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = Math.max(1, w * 0.004);
    for (let i = -h; i < w; i += Math.max(18, w * 0.09)) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `700 ${Math.max(12, w * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic';
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(w / iw, h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
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
  // A warm dusk wash rising from the bottom of the panel, for cohesion.
  const shade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  shade.addColorStop(0, 'rgba(255, 90, 60, 0)');
  shade.addColorStop(1, 'rgba(120, 20, 90, 0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
}

/** A stylised palm silhouette: curved trunk, a crown of arcing fronds. */
function drawPalm(ctx, bx, by, s, lean) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(lean, 1);
  ctx.strokeStyle = '#160a24';
  ctx.fillStyle = '#160a24';
  ctx.lineCap = 'round';
  // Trunk, leaning gently, slightly thicker at the base.
  ctx.lineWidth = s * 0.085;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.04, -s * 0.5, s * 0.15, -s * 0.92);
  ctx.stroke();
  const cx = s * 0.15;
  const cy = -s * 0.92;
  // Fronds: seven arcs fanning over the top of the crown. Each rises out of
  // the crown and only droops toward its tip, so the silhouette reads as a
  // palm; each starts a touch apart along the crown so they do not fan from
  // a single point like a firework.
  ctx.lineWidth = s * 0.032;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.06 + (i / 6) * 0.88);
    const len = s * (0.5 + (i % 2) * 0.14);
    const startX = cx + (i - 3) * s * 0.02;
    const startY = cy + Math.abs(i - 3) * s * 0.012;
    const tipX = startX + Math.cos(a) * len;
    const tipY = startY + Math.sin(a) * len * 0.72 + s * 0.1;
    const ctrlX = startX + Math.cos(a) * len * 0.55;
    const ctrlY = startY + Math.sin(a) * len * 0.55 - s * 0.16;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts under the crown.
  ctx.beginPath();
  ctx.arc(cx - s * 0.03, cy + s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.05, cy + s * 0.06, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The retro sun: a gradient disc with horizontal slats cut out of its lower half. */
function drawSun(ctx, cx, cy, r, skyBottom) {
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
  // Slats: sky-coloured bars, widening toward the bottom.
  ctx.fillStyle = '#2a0f45';
  let y = cy + r * 0.08;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.11;
    gap *= 1.5;
  }
  ctx.restore();
  void skyBottom;
}

/** Fits the caption to the cover width, returning the font size to draw at. */
function fitCaptionSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  return size;
}

/**
 * Draws the whole cover: panels, sunset band with sun and palms, caption and
 * subtitle. `state` holds layout, grade, caption, subtitle, photos and panels.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = LAYOUTS[state.layout] || LAYOUTS.stack;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  const gap = Math.max(5, Math.round(w * 0.006));
  rects.forEach((r, i) => {
    const rect = {
      x: Math.round(r.x * w) + (r.x > 0 ? gap / 2 : 0),
      y: Math.round(r.y * h) + (r.y > 0 ? gap / 2 : 0),
      w: Math.round(r.w * w) - (r.x > 0 ? gap / 2 : 0) - (r.x + r.w < 1 ? gap / 2 : 0),
      h: Math.round(r.h * h) - (r.y > 0 ? gap / 2 : 0) - (r.y + r.h < 1 ? gap / 2 : 0),
    };
    const panel = state.panels[i] || blankPanel();
    const photo = panel.photo >= 0 ? state.photos[panel.photo] : null;
    drawPhotoInPanel(ctx, photo, rect, panel, grade.filter);
  });

  // The sunset band across the foot of the cover.
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
  drawSun(ctx, w * 0.5, bandY + bandH * 0.52, sunR, h);

  // Palms frame the caption at the band's edges.
  const palmH = bandH * 1.25;
  drawPalm(ctx, w * 0.045, h - bandH * 0.06, palmH, 1);
  drawPalm(ctx, w * 0.955, h - bandH * 0.06, palmH * 0.92, -1);

  // Caption: big condensed capitals with a sunset gradient and a dark edge.
  const caption = (state.caption || '').trim().toUpperCase();
  if (caption) {
    const maxW = w * 0.86;
    const size = fitCaptionSize(ctx, caption, maxW, h * 0.105);
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = bandY + bandH * 0.46;
    ctx.save();
    ctx.translate(w / 2, textY);
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    fill.addColorStop(0, '#fffbe8');
    fill.addColorStop(0.55, '#ffe9a8');
    fill.addColorStop(1, '#ff9e57');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#22083a';
    ctx.lineWidth = size * 0.09;
    ctx.strokeText(caption, 0, 0);
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(20, 4, 40, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.03;
    ctx.fillText(caption, 0, 0);
    ctx.restore();
  }

  // Subtitle: small tracked capitals under the caption.
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (subtitle) {
    const subSize = Math.max(14, h * 0.021);
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(3, subSize * 0.32)}px`; } catch { /* older canvas: no tracking */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 240, 248, 0.95)';
    ctx.shadowColor = 'rgba(20, 4, 40, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(subtitle, w / 2, bandY + bandH * 0.86);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    ctx.textBaseline = 'alphabetic';
  }

  // Grade wash and a thin frame to finish.
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Renders the cover at an export size on a fresh canvas and returns it. */
export function renderCover(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
