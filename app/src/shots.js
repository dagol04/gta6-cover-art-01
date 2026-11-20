// Fixed scenes for screenshots, driven by the page's `?shot=` query.
//   ?shot=editor — the editor with sample photos loaded.
//   ?shot=cover  — the cover alone, no editor chrome.
//   ?shot=export — the cover alone, and the real exported PNG is stored as a
//                  data URL on window.__exportedPng.
// `photo` picks the first sample (samples/<photo>.jpg), `photo2` the second;
// `caption`, `subtitle`, `layout`, `grade` and `size` set the cover; `oy0`
// pans the hero panel's photo down so a tall photo's subject stays in frame.
// window.__shotReady is set once the scene is painted.
import { panelsFor } from './cover.js';

export async function runShot(shot, query, api) {
  const { state, loadImage, redraw } = api;
  const caption = query.get('caption') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'Neon Boulevard';
  const layout = query.get('layout') ?? 'stack';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1350';

  await document.fonts.load('100px Anton');
  const first = await loadImage(`samples/${query.get('photo') ?? 'pier'}.jpg`);
  const second = await loadImage(`samples/${query.get('photo2') ?? 'boulevard'}.jpg`);
  state.photos[0] = first;
  state.photoNames[0] = 'Sample · Pier';
  state.photos[1] = second;
  state.photoNames[1] = 'Sample · Boulevard';
  state.caption = caption;
  state.subtitle = subtitle;
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.panels = panelsFor(layout, []);
  // Alternate the two photos across the panels.
  state.panels.forEach((p, i) => { p.photo = i % 2; });
  const oy0 = Number(query.get('oy0') ?? '0');
  if (oy0 && state.panels[0]) state.panels[0].oy = oy0;
  document.getElementById('caption').value = caption;
  document.getElementById('subtitle').value = subtitle;
  document.querySelectorAll('#layouts .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.layout === layout));
  document.querySelectorAll('#grades .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.grade === grade));
  document.querySelectorAll('#sizes .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.size === size));

  if (shot === 'cover' || shot === 'export') {
    document.body.classList.add('shot-cover');
  }
  // Rebuild the slot and panel rows so the editor scene shows the loaded photos.
  window.__setState({
    layout, grade, size, caption, subtitle,
    photos: state.photos, photoNames: state.photoNames, panels: state.panels,
  });
  redraw();

  if (shot === 'export') {
    window.__exportedPng = await window.__exportCover();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
