import './studio-lighting.js';

await customElements.whenDefined('model-viewer');

const viewer = document.querySelector('#karvViewer');
const stage = document.querySelector('#viewportStage');
const gridToggle = document.querySelector('#gridToggle');
const fullscreenToggle = document.querySelector('#fullscreenToggle');
const viewLabel = document.querySelector('#viewLabel');
const viewButtons = [...document.querySelectorAll('[data-view]')];

const VIEW_PRESETS = {
  perspective: { label: 'Perspectiva', orbit: '35deg 72deg 2.65m' },
  front: { label: 'Frontal', orbit: '0deg 72deg 2.65m' },
  right: { label: 'Lateral direita', orbit: '90deg 72deg 2.65m' },
  back: { label: 'Traseira', orbit: '180deg 72deg 2.65m' },
  left: { label: 'Lateral esquerda', orbit: '-90deg 72deg 2.65m' },
};

stage.classList.add('grid-hidden');
gridToggle.setAttribute('aria-pressed', 'false');

function setActiveView(view) {
  const preset = VIEW_PRESETS[view];
  if (!preset) return;

  viewer.cameraOrbit = preset.orbit;
  viewer.fieldOfView = '32deg';
  viewer.jumpCameraToGoal();
  viewLabel.textContent = preset.label;

  for (const button of viewButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  }
}

for (const button of viewButtons) {
  button.addEventListener('click', () => setActiveView(button.dataset.view));
}

gridToggle.addEventListener('click', () => {
  const gridVisible = !stage.classList.toggle('grid-hidden');
  gridToggle.setAttribute('aria-pressed', String(gridVisible));
});

fullscreenToggle.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await stage.requestFullscreen();
    }
  } catch (error) {
    console.warn('Tela cheia indisponível', error);
  }
});

document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === stage;
  fullscreenToggle.setAttribute('aria-pressed', String(active));
  fullscreenToggle.textContent = active ? 'Sair da tela cheia' : 'Tela cheia';
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  const shortcuts = {
    Digit1: 'front',
    Digit3: 'right',
    Digit5: 'perspective',
  };
  if (shortcuts[event.code]) setActiveView(shortcuts[event.code]);
});
