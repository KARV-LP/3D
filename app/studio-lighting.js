await customElements.whenDefined('model-viewer');

const viewer = document.querySelector('#karvViewer');

function applyStudioLighting() {
  viewer.setAttribute('environment-image', 'neutral');
  viewer.setAttribute('exposure', '1.18');
  viewer.setAttribute('shadow-intensity', '1.05');
  viewer.setAttribute('shadow-softness', '0.98');
}

applyStudioLighting();
viewer.addEventListener('load', applyStudioLighting, { once: true });
