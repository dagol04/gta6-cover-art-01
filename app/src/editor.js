// Sunset Cover Studio — wires the editor: photo slots, layout/grade/size choices,
// panel selection and dragging, live preview, and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderCover, panelsFor, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const slotsEl = document.getElementById('slots');
const panelRowsEl = document.getElementById('panelRows');

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

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Rebuilds the three photo slot cards (thumbnail, name, upload / sample buttons). */
function renderSlots() {
  slotsEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const thumb = document.createElement('img');
    thumb.alt = `Photo ${i + 1}`;
    thumb.src = photo
      ? photo.src
      : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const body = document.createElement('div');
    body.className = 'slot-body';
    const name = document.createElement('div');
    name.className = 'slot-name';
    name.textContent = `Photo ${i + 1} — ${state.photoNames[i]}`;
    const actions = document.createElement('div');
    actions.className = 'slot-actions';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = `photo-file-${i}`;
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.textContent = 'Upload';
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        state.photos[i] = await loadImage(URL.createObjectURL(file));
        state.photoNames[i] = file.name;
        autoAssign(i);
        renderSlots();
        renderPanelRows();
        redraw();
        setStatus(`Photo ${i + 1} loaded.`);
      } catch {
        setStatus(`Could not read ${file.name}.`);
      }
    });
    const sampleBtn = document.createElement('button');
    sampleBtn.type = 'button';
    sampleBtn.textContent = 'Sample';
    sampleBtn.addEventListener('click', async () => {
      const sample = SAMPLES[i % SAMPLES.length];
      try {
        state.photos[i] = await loadImage(`samples/${sample.file}`);
        state.photoNames[i] = sample.label;
        autoAssign(i);
        renderSlots();
        renderPanelRows();
        redraw();
        setStatus(`Sample photo ${i + 1} loaded.`);
      } catch {
        setStatus('Sample photo failed to load.');
      }
    });
    actions.append(uploadBtn, sampleBtn);
    body.append(name, actions);
    slot.append(thumb, body, fileInput);
    slotsEl.append(slot);
  });
}

/** Puts a newly loaded photo into the first empty panel, if there is one. */
function autoAssign(photoIndex) {
  const empty = state.panels.findIndex((p) => p.photo === -1);
  if (empty !== -1) state.panels[empty].photo = photoIndex;
}

/** Rebuilds the per-panel rows: photo picker, zoom slider, centre button. */
function renderPanelRows() {
  panelRowsEl.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  state.panels.forEach((panel, i) => {
    const row = document.createElement('div');
    row.className = `panel-row${i === selectedPanel ? ' is-selected' : ''}`;
    row.addEventListener('click', () => {
      selectedPanel = i;
      renderPanelRows();
    });
    const head = document.createElement('div');
    head.className = 'row-head';
    const title = document.createElement('span');
    title.className = 'row-title';
    title.textContent = `Panel ${letters[i]}`;
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
    head.append(title, picker);
    const zoom = document.createElement('div');
    zoom.className = 'zoom';
    const zoomLabel = document.createElement('span');
    zoomLabel.textContent = 'Zoom';
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
    const centre = document.createElement('button');
    centre.type = 'button';
    centre.textContent = 'Centre';
    centre.addEventListener('click', () => {
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
      state.panels[i].zoom = 1;
      renderPanelRows();
      redraw();
    });
    zoom.append(zoomLabel, slider, centre);
    row.append(head, zoom);
    panelRowsEl.append(row);
  });
}

/** Binds a group of choice buttons (layout, grade, size) to one state field. */
function bindChoices(id, field, apply) {
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

bindChoices('layouts', 'layout', () => {
  state.panels = panelsFor(state.layout, state.panels);
  selectedPanel = 0;
  renderPanelRows();
  redraw();
});
bindChoices('grades', 'grade', redraw);
bindChoices('sizes', 'size', redraw);

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

// Click selects a panel; drag pans its photo inside the panel.
function panelAt(clientX, clientY) {
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
  const hit = panelAt(e.clientX, e.clientY);
  if (hit.index === -1) return;
  selectedPanel = hit.index;
  renderPanelRows();
  canvas.setPointerCapture(e.pointerId);
  drag = { panel: state.panels[hit.index], lastX: hit.px, lastY: hit.py };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  const panel = drag.panel;
  const rect = LAYOUTS[state.layout][state.panels.indexOf(panel)];
  const dx = (hit.px - drag.lastX) / (rect.w * canvas.width);
  const dy = (hit.py - drag.lastY) / (rect.h * canvas.height);
  panel.ox += dx;
  panel.oy += dy;
  drag.lastX = hit.px;
  drag.lastY = hit.py;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

/** Exports the cover at the chosen size as a PNG file download. */
export function exportCover() {
  const { w, h } = SIZES[state.size];
  const out = renderCover(state, w, h);
  return new Promise((resolve) => {
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${state.size}.png`;
      a.click();
      setStatus(`Saved cover-${state.size}.png`);
      resolve(blob);
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', exportCover);

// Automation hooks for screenshots: the real exported PNG as a data URL.
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
  renderSlots();
  renderPanelRows();
  redraw();
};
window.__loadSample = async (slot, file, label) => {
  state.photos[slot] = await loadImage(`samples/${file}`);
  state.photoNames[slot] = label;
  autoAssign(slot);
  renderSlots();
  renderPanelRows();
  redraw();
};

renderSlots();
renderPanelRows();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, loadImage, redraw, exportCover });
} else {
  // Load the fonts, then draw once so the caption uses Anton from the start.
  document.fonts.load('100px Anton').finally(() => redraw());
  redraw();
}
