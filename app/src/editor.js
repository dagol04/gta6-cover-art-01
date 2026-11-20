// Sunset Cover Studio — the editor: photo slots, layout/grade/size choices, panel
// selection and dragging, the live preview, and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderCover, panelsFor, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const slotsEl = document.getElementById('slots');
const panelRowsEl = document.getElementById('panelRows');

// The two sample photos shipped with the app, made with an image model.
const SAMPLES = [
  { file: 'boulevard.jpg', label: 'Sample · Boulevard' },
  { file: 'pier.jpg', label: 'Sample · Pier' },
];

const state = {
  layout: 'stack',
  grade: 'sunset',
  size: '1080x1350',
  caption: captionInput.value,
  subtitle: subtitleInput.value,
  photos: [null, null, null],
  photoNames: ['Empty', 'Empty', 'Empty'],
  panels: panelsFor('stack', []),
};

let selectedPanel = 0;

/** Loads an image from a URL and resolves once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Repaints the live preview at the chosen export size. */
function redraw() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
}

function showStatus(text) {
  statusEl.textContent = text;
}

/** Tiny DOM helper: an element with a class and children. */
function makeEl(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    node.append(child);
  }
  return node;
}

/** A small action button for a photo slot. */
function slotButton(label, onClick) {
  const btn = makeEl('button', null, label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

/** Builds the three photo slot cards: thumbnail, name, upload / sample buttons. */
function buildSlots() {
  slotsEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = makeEl('img');
    thumb.alt = `Photo ${i + 1}`;
    thumb.src = photo
      ? photo.src
      : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const name = makeEl('div', 'slot-name', `Photo ${i + 1} — ${state.photoNames[i]}`);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = `photo-file-${i}`;
    const uploadBtn = slotButton('Upload', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        state.photos[i] = await loadImage(URL.createObjectURL(file));
        state.photoNames[i] = file.name;
        assignEmpty(i);
        buildSlots();
        buildPanelRows();
        redraw();
        showStatus(`Photo ${i + 1} loaded.`);
      } catch {
        showStatus(`Could not read ${file.name}.`);
      }
    });
    const sampleBtn = slotButton('Sample', async () => {
      const sample = SAMPLES[i % SAMPLES.length];
      try {
        state.photos[i] = await loadImage(`samples/${sample.file}`);
        state.photoNames[i] = sample.label;
        assignEmpty(i);
        buildSlots();
        buildPanelRows();
        redraw();
        showStatus(`Sample photo ${i + 1} loaded.`);
      } catch {
        showStatus('Sample photo failed to load.');
      }
    });
    const actions = makeEl('div', 'slot-actions', uploadBtn, sampleBtn);
    const body = makeEl('div', 'slot-body', name, actions);
    slotsEl.append(makeEl('div', 'slot', thumb, body, fileInput));
  });
}

/** Drops a newly loaded photo into the first vacant panel, if there is one. */
function assignEmpty(photoIndex) {
  const empty = state.panels.findIndex((p) => p.photo === -1);
  if (empty !== -1) state.panels[empty].photo = photoIndex;
}

/** Builds the per-panel rows: photo picker, zoom slider, centre button. */
function buildPanelRows() {
  panelRowsEl.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  state.panels.forEach((panel, i) => {
    const row = makeEl('div', `panel-row${i === selectedPanel ? ' is-selected' : ''}`);
    row.addEventListener('click', () => {
      selectedPanel = i;
      buildPanelRows();
    });
    const title = makeEl('span', 'row-title', `Panel ${letters[i]}`);
    const picker = document.createElement('select');
    picker.setAttribute('aria-label', `Photo for panel ${letters[i]}`);
    const none = document.createElement('option');
    none.value = '-1';
    none.textContent = 'No photo';
    picker.append(none);
    state.photos.forEach((photo, pi) => {
      const opt = document.createElement('option');
      opt.value = String(pi);
      opt.textContent = `Photo ${pi + 1}${photo ? '' : ' (empty)'}`;
      picker.append(opt);
    });
    picker.value = String(panel.photo);
    picker.addEventListener('change', () => {
      state.panels[i].photo = Number(picker.value);
      redraw();
    });
    const head = makeEl('div', 'row-head', title, picker);
    const zoomLabel = makeEl('span', null, 'Zoom');
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '3';
    slider.step = '0.05';
    slider.value = String(panel.zoom);
    slider.setAttribute('aria-label', `Zoom for panel ${letters[i]}`);
    slider.addEventListener('input', () => {
      state.panels[i].zoom = Number(slider.value);
      redraw();
    });
    const centre = makeEl('button', null, 'Centre');
    centre.type = 'button';
    centre.addEventListener('click', () => {
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
      state.panels[i].zoom = 1;
      buildPanelRows();
      redraw();
    });
    const zoom = makeEl('div', 'zoom', zoomLabel, slider, centre);
    row.append(head, zoom);
    panelRowsEl.append(row);
  });
}

/** Wires one group of choice buttons (layout, grade or size) to a state field. */
function wireChoices(id, field, apply) {
  const group = document.getElementById(id);
  group.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      state[field] = btn.dataset[field];
      apply();
    });
  });
}

wireChoices('layouts', 'layout', () => {
  state.panels = panelsFor(state.layout, state.panels);
  selectedPanel = 0;
  buildPanelRows();
  redraw();
});
wireChoices('grades', 'grade', redraw);
wireChoices('sizes', 'size', redraw);

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

// Click a panel to select it; drag to pan its photo inside the panel.
function panelHit(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const px = ((clientX - rect.left) / rect.width) * canvas.width;
  const py = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = LAYOUTS[state.layout];
  const i = rects.findIndex(
    (r) => px >= r.x * canvas.width && px < (r.x + r.w) * canvas.width
      && py >= r.y * canvas.height && py < (r.y + r.h) * canvas.height,
  );
  return { index: i, px, py };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelHit(e.clientX, e.clientY);
  if (hit.index === -1) return;
  selectedPanel = hit.index;
  buildPanelRows();
  canvas.setPointerCapture(e.pointerId);
  drag = { panel: state.panels[hit.index], lastX: hit.px, lastY: hit.py };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelHit(e.clientX, e.clientY);
  const panel = drag.panel;
  const rect = LAYOUTS[state.layout][state.panels.indexOf(panel)];
  panel.ox += (hit.px - drag.lastX) / (rect.w * canvas.width);
  panel.oy += (hit.py - drag.lastY) / (rect.h * canvas.height);
  drag.lastX = hit.px;
  drag.lastY = hit.py;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

/** Paints the cover at the chosen size and downloads it as a PNG. */
export function exportCover() {
  const { w, h } = SIZES[state.size];
  const out = renderCover(state, w, h);
  return new Promise((resolve) => {
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${state.size}.png`;
      a.click();
      showStatus(`Saved cover-${state.size}.png`);
      resolve(blob);
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', exportCover);

// Automation hooks used by the screenshot scenes: the real exported PNG as a
// data URL, a whole-state patch, and a sample loader.
window.__exportCover = async () => {
  const { w, h } = SIZES[state.size];
  return renderCover(state, w, h).toDataURL('image/png');
};
window.__setState = (patch) => {
  Object.assign(state, patch);
  if (patch.layout) state.panels = panelsFor(state.layout, state.panels);
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  document.querySelectorAll('#layouts .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.size === state.size));
  buildSlots();
  buildPanelRows();
  redraw();
};
window.__loadSample = async (slot, file, label) => {
  state.photos[slot] = await loadImage(`samples/${file}`);
  state.photoNames[slot] = label;
  assignEmpty(slot);
  buildSlots();
  buildPanelRows();
  redraw();
};

buildSlots();
buildPanelRows();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, loadImage, redraw, exportCover });
} else {
  // Load the display font first, so the caption uses Anton from the first paint.
  document.fonts.load('100px Anton').finally(() => redraw());
  redraw();
}
