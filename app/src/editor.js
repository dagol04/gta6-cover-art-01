// Sunset Cover Studio — the editor.
// Photo slots, layout/grade/size choices, panel picking and dragging, the
// live preview, and PNG export. A `?shot=` query builds a fixed scene for a
// screenshot instead (see ./shots.js).
import { paintCover, renderExport, layoutPanels, PANEL_LAYOUTS, EXPORT_SIZES } from './cover.js';
import { playShot } from './shots.js';

const previewCanvas = document.getElementById('cover');
const captionField = document.getElementById('caption');
const subtitleField = document.getElementById('subtitle');
const statusLine = document.getElementById('status');
const slotsBox = document.getElementById('slots');
const panelRowsBox = document.getElementById('panelRows');

// The two sample photos shipped with the app, made with an image model.
const SAMPLE_PHOTOS = [
  { file: 'boulevard.jpg', label: 'Sample · Boulevard' },
  { file: 'pier.jpg', label: 'Sample · Pier' },
];

const cover = {
  layout: 'stack',
  grade: 'sunset',
  size: '1080x1350',
  caption: captionField.value,
  subtitle: subtitleField.value,
  photos: [null, null, null],
  photoNames: ['Empty', 'Empty', 'Empty'],
  panels: layoutPanels('stack', []),
};

let activePanel = 0;

/** Loads an image from a URL; resolves once it can be drawn. */
export function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Repaints the live preview at the chosen export size. */
function repaint() {
  const { w, h } = EXPORT_SIZES[cover.size];
  if (previewCanvas.width !== w || previewCanvas.height !== h) {
    previewCanvas.width = w;
    previewCanvas.height = h;
  }
  paintCover(previewCanvas, cover);
}

function setStatus(text) {
  statusLine.textContent = text;
}

/** Builds an element with a class and children. */
function el(tag, className, ...kids) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const kid of kids) {
    node.append(kid);
  }
  return node;
}

/** A small action button for a photo slot. */
function actionButton(label, onClick) {
  const btn = el('button', null, label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

/** Renders the three photo slot cards: thumbnail, name, upload/sample buttons. */
function renderSlots() {
  slotsBox.innerHTML = '';
  cover.photos.forEach((photo, i) => {
    const thumb = el('img');
    thumb.alt = `Photo ${i + 1}`;
    thumb.src = photo
      ? photo.src
      : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const name = el('div', 'slot-name', `Photo ${i + 1} — ${cover.photoNames[i]}`);
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.id = `photo-file-${i}`;
    const uploadBtn = actionButton('Upload', () => picker.click());
    picker.addEventListener('change', async () => {
      const file = picker.files[0];
      if (!file) return;
      try {
        cover.photos[i] = await fetchImage(URL.createObjectURL(file));
        cover.photoNames[i] = file.name;
        fillFirstEmpty(i);
        renderSlots();
        renderPanelRows();
        repaint();
        setStatus(`Photo ${i + 1} loaded.`);
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    });
    const sampleBtn = actionButton('Sample', async () => {
      const sample = SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length];
      try {
        cover.photos[i] = await fetchImage(`samples/${sample.file}`);
        cover.photoNames[i] = sample.label;
        fillFirstEmpty(i);
        renderSlots();
        renderPanelRows();
        repaint();
        setStatus(`Sample photo ${i + 1} loaded.`);
      } catch {
        setStatus('Sample photo failed to load.');
      }
    });
    const actions = el('div', 'slot-actions', uploadBtn, sampleBtn);
    const body = el('div', 'slot-body', name, actions);
    slotsBox.append(el('div', 'slot', thumb, body, picker));
  });
}

/** Puts a newly loaded photo into the first empty panel, if there is one. */
function fillFirstEmpty(photoIndex) {
  const empty = cover.panels.findIndex((p) => p.photo === -1);
  if (empty !== -1) cover.panels[empty].photo = photoIndex;
}

/** Renders the per-panel rows: photo picker, zoom slider, centre button. */
function renderPanelRows() {
  panelRowsBox.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  cover.panels.forEach((panel, i) => {
    const row = el('div', `panel-row${i === activePanel ? ' is-selected' : ''}`);
    row.addEventListener('click', () => {
      activePanel = i;
      renderPanelRows();
    });
    const title = el('span', 'row-title', `Panel ${letters[i]}`);
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Photo for panel ${letters[i]}`);
    const blank = document.createElement('option');
    blank.value = '-1';
    blank.textContent = 'No photo';
    select.append(blank);
    cover.photos.forEach((photo, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = `Photo ${pi + 1}${photo ? '' : ' (empty)'}`;
      select.append(opt);
    });
    select.value = String(panel.photo);
    select.addEventListener('change', () => {
      cover.panels[i].photo = Number(select.value);
      repaint();
    });
    const head = el('div', 'row-head', title, select);
    const zoomWord = el('span', null, 'Zoom');
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '3';
    slider.step = '0.05';
    slider.value = String(panel.zoom);
    slider.setAttribute('aria-label', `Zoom for panel ${letters[i]}`);
    slider.addEventListener('input', () => {
      cover.panels[i].zoom = Number(slider.value);
      repaint();
    });
    const centreBtn = el('button', null, 'Centre');
    centreBtn.type = 'button';
    centreBtn.addEventListener('click', () => {
      cover.panels[i].ox = 0;
      cover.panels[i].oy = 0;
      cover.panels[i].zoom = 1;
      renderPanelRows();
      repaint();
    });
    const zoomRow = el('div', 'zoom', zoomWord, slider, centreBtn);
    row.append(head, zoomRow);
    panelRowsBox.append(row);
  });
}

/** Wires one group of choice buttons (layout, grade or size) to a cover field. */
function bindChoices(id, field, apply) {
  const group = document.getElementById(id);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      cover[field] = btn.dataset[field];
      apply();
    });
  });
}

bindChoices('layouts', 'layout', () => {
  cover.panels = layoutPanels(cover.layout, cover.panels);
  activePanel = 0;
  renderPanelRows();
  repaint();
});
bindChoices('grades', 'grade', repaint);
bindChoices('sizes', 'size', repaint);

captionField.addEventListener('input', () => {
  cover.caption = captionField.value;
  repaint();
});
subtitleField.addEventListener('input', () => {
  cover.subtitle = subtitleField.value;
  repaint();
});

// Click a panel to select it; drag to pan its photo inside the panel.
function hitPanel(clientX, clientY) {
  const rect = previewCanvas.getBoundingClientRect();
  const px = ((clientX - rect.left) / rect.width) * previewCanvas.width;
  const py = ((clientY - rect.top) / rect.height) * previewCanvas.height;
  const boxes = PANEL_LAYOUTS[cover.layout];
  const i = boxes.findIndex(
    (r) => px >= r.x * previewCanvas.width && px < (r.x + r.w) * previewCanvas.width
      && py >= r.y * previewCanvas.height && py < (r.y + r.h) * previewCanvas.height,
  );
  return { index: i, px, py };
}

let drag = null;
previewCanvas.addEventListener('pointerdown', (e) => {
  const hit = hitPanel(e.clientX, e.clientY);
  if (hit.index === -1) return;
  activePanel = hit.index;
  renderPanelRows();
  previewCanvas.setPointerCapture(e.pointerId);
  drag = { panel: cover.panels[hit.index], lastX: hit.px, lastY: hit.py };
});
previewCanvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = hitPanel(e.clientX, e.clientY);
  const panel = drag.panel;
  const box = PANEL_LAYOUTS[cover.layout][cover.panels.indexOf(panel)];
  panel.ox += (hit.px - drag.lastX) / (box.w * previewCanvas.width);
  panel.oy += (hit.py - drag.lastY) / (box.h * previewCanvas.height);
  drag.lastX = hit.px;
  drag.lastY = hit.py;
  repaint();
});
previewCanvas.addEventListener('pointerup', () => { drag = null; });

/** Paints the poster at the chosen size and downloads it as a PNG. */
export function downloadCover() {
  const { w, h } = EXPORT_SIZES[cover.size];
  const out = renderExport(cover, w, h);
  return new Promise((resolve) => {
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${cover.size}.png`;
      a.click();
      setStatus(`Saved cover-${cover.size}.png`);
      resolve(blob);
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', downloadCover);

// Automation hooks for the screenshot scenes: the real exported PNG as a data
// URL, a whole-state patch, and a sample loader.
window.__exportCover = async () => {
  const { w, h } = EXPORT_SIZES[cover.size];
  return renderExport(cover, w, h).toDataURL('image/png');
};
window.__setState = (patch) => {
  Object.assign(cover, patch);
  if (patch.layout) cover.panels = layoutPanels(cover.layout, cover.panels);
  captionField.value = cover.caption;
  subtitleField.value = cover.subtitle;
  document.querySelectorAll('#layouts .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.layout === cover.layout));
  document.querySelectorAll('#grades .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.grade === cover.grade));
  document.querySelectorAll('#sizes .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.size === cover.size));
  renderSlots();
  renderPanelRows();
  repaint();
};
window.__loadSample = async (slot, file, label) => {
  cover.photos[slot] = await fetchImage(`samples/${file}`);
  cover.photoNames[slot] = label;
  fillFirstEmpty(slot);
  renderSlots();
  renderPanelRows();
  repaint();
};

renderSlots();
renderPanelRows();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  playShot(shot, query, { state: cover, loadImage: fetchImage, redraw: repaint, exportCover: downloadCover });
} else {
  // Load the display font first, so the caption uses Anton from the first paint.
  document.fonts.load('100px Anton').finally(() => repaint());
  repaint();
}
