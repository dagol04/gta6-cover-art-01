// Fixed scenes for screenshots, driven by the page's `?shot=` query.
//   ?shot=editor — the editor with sample photos loaded.
//   ?shot=cover  — the cover alone, no editor chrome.
//   ?shot=export — the cover alone, and the real exported PNG is stored as a
//                  data URL on window.__exportedPng.
// `photo` picks the first sample (samples/<photo>.jpg), `photo2` the second;
// `caption`, `subtitle`, `layout`, `grade` and `size` set the cover; `oy0`
// slides the hero panel's photo down so a tall photo's subject stays in frame.
// window.__shotReady is set once the scene is painted.
import { panelsFor } from './cover.js';

export async function runShot(shot, query, api) {
  const { state, loadImage, redraw } = api;
  const title = query.get('caption') ?? 'Sunset Heist';
  const sub = query.get('subtitle') ?? 'Neon Boulevard';
  const layout = query.get('layout') ?? 'stack';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1350';

  await document.fonts.load('100px Anton');
  const firstPhoto = await loadImage(`samples/${query.get('photo') ?? 'pier'}.jpg`);
  const secondPhoto = await loadImage(`samples/${query.get('photo2') ?? 'boulevard'}.jpg`);
  state.photos[0] = firstPhoto;
  state.photoNames[0] = 'Sample · Pier';
  state.photos[1] = secondPhoto;
  state.photoNames[1] = 'Sample · Boulevard';
  state.caption = title;
  state.subtitle = sub;
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.panels = panelsFor(layout, []);
  // Alternate the two photos across the panels.
  state.panels.forEach((p, i) => { p.photo = i % 2; });
  const panY = Number(query.get('oy0') ?? '0');
  if (panY && state.panels[0]) state.panels[0].oy = panY;
  document.getElementById('caption').value = title;
  document.getElementById('subtitle').value = sub;
  document.querySelectorAll('#layouts .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.layout === layout));
  document.querySelectorAll('#grades .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.grade === grade));
  document.querySelectorAll('#sizes .choice').forEach((b) => b.classList.toggle('is-on', b.dataset.size === size));

  if (shot === 'cover' || shot === 'export') {
    document.body.classList.add('shot-cover');
  }
  // Rebuild the slot and panel rows so the editor scene shows the loaded photos.
  window.__setState({
    layout, grade, size, caption: title, subtitle: sub,
    photos: state.photos, photoNames: state.photoNames, panels: state.panels,
  });
  redraw();

  if (shot === 'export') {
    window.__exportedPng = await window.__exportCover();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
