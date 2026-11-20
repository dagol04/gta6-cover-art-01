// Fixed scenes for screenshots, driven by the page's `?shot=` query.
//   ?shot=editor — the editor with sample photos loaded.
//   ?shot=cover  — the poster alone, no editor chrome.
//   ?shot=export — the poster alone, and the real exported PNG is kept as a
//                  data URL on window.__exportedPng.
// `photo` picks the first sample (samples/<photo>.jpg), `photo2` the second;
// `caption`, `subtitle`, `layout`, `grade` and `size` set the poster; `oy0`
// slides the hero panel's photo down so a tall photo's subject stays in frame.
// window.__shotReady is set once the scene has been painted.
import { layoutPanels } from './cover.js';

/** Marks the active button inside one choice group. */
function markChoice(groupId, key, value) {
  document.querySelectorAll(`#${groupId} .choice`).forEach((b) => {
    b.classList.toggle('is-on', b.dataset[key] === value);
  });
}

export async function playShot(shot, query, api) {
  const { state, loadImage, redraw } = api;
  const captionText = query.get('caption') ?? 'Sunset Heist';
  const subtitleText = query.get('subtitle') ?? 'Neon Boulevard';
  const layoutName = query.get('layout') ?? 'stack';
  const gradeName = query.get('grade') ?? 'sunset';
  const sizeName = query.get('size') ?? '1080x1350';

  await document.fonts.load('100px Anton');
  const photoA = await loadImage(`samples/${query.get('photo') ?? 'pier'}.jpg`);
  const photoB = await loadImage(`samples/${query.get('photo2') ?? 'boulevard'}.jpg`);
  state.photos[0] = photoA;
  state.photoNames[0] = 'Sample · Pier';
  state.photos[1] = photoB;
  state.photoNames[1] = 'Sample · Boulevard';
  state.caption = captionText;
  state.subtitle = subtitleText;
  state.layout = layoutName;
  state.grade = gradeName;
  state.size = sizeName;
  state.panels = layoutPanels(layoutName, []);
  // Alternate the two photos across the panels.
  state.panels.forEach((p, i) => { p.photo = i % 2; });
  const heroPan = Number(query.get('oy0') ?? '0');
  if (heroPan && state.panels[0]) state.panels[0].oy = heroPan;
  document.getElementById('caption').value = captionText;
  document.getElementById('subtitle').value = subtitleText;
  markChoice('layouts', 'layout', layoutName);
  markChoice('grades', 'grade', gradeName);
  markChoice('sizes', 'size', sizeName);

  if (shot === 'cover' || shot === 'export') {
    document.body.classList.add('shot-cover');
  }
  // Rebuild the slot and panel rows so the editor scene shows the loaded photos.
  window.__setState({
    layout: layoutName, grade: gradeName, size: sizeName,
    caption: captionText, subtitle: subtitleText,
    photos: state.photos, photoNames: state.photoNames, panels: state.panels,
  });
  redraw();

  if (shot === 'export') {
    window.__exportedPng = await window.__exportCover();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
