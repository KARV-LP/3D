await customElements.whenDefined('model-viewer');

const viewer = document.querySelector('#karvViewer');
const originalCreateTexture = viewer.createTexture.bind(viewer);
const ORIGINAL_LAT_TOP_SCALE = 2.35;
const ASSENTO_REFERENCE_SCALE = 2.15;

viewer.createTexture = async (...args) => {
  const texture = await originalCreateTexture(...args);
  const sampler = texture.sampler;
  const originalSetScale = sampler.setScale.bind(sampler);

  sampler.setScale = (scale) => {
    const isLatTopTransform =
      Math.abs(scale.u - ORIGINAL_LAT_TOP_SCALE) < 0.001 &&
      Math.abs(scale.v - ORIGINAL_LAT_TOP_SCALE) < 0.001;

    return originalSetScale(
      isLatTopTransform
        ? { u: ASSENTO_REFERENCE_SCALE, v: ASSENTO_REFERENCE_SCALE }
        : scale,
    );
  };

  return texture;
};
