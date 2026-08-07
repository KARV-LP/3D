const viewer = document.querySelector('#karvViewer');
const statusPill = document.querySelector('#statusPill');
const selectedFace = document.querySelector('#selectedFace');
const collectionFilter = document.querySelector('#collectionFilter');
const fabricGrid = document.querySelector('#fabricGrid');
const applyAllButton = document.querySelector('#applyAllButton');
const catalogNotice = document.querySelector('#catalogNotice');
const catalogSummary = document.querySelector('#catalogSummary');

const LIBRARY_CATALOG_URL = 'https://raw.githubusercontent.com/KARV-LP/karv-material-library/main/catalog/fabrics.json';
const LIBRARY_COLLECTION_ID = 'karv-material-library';
const REPEAT_WRAP = 10497;
const FIXED_MATERIALS = new Set(['pezinhos', 'VIVO']);
const DISPLAY_NAMES = new Map([
  ['assento', 'Assento'], ['encosto-frt', 'Encosto frontal'], ['encosto lat', 'Encosto lateral'],
  ['encosto traseiro', 'Encosto traseiro'], ['lat ext', 'Lateral externa'], ['lat int', 'Lateral interna'],
  ['lat rr', 'Lateral traseira'], ['Material.012', 'Lateral superior'],
]);

// Calibração inicial por peça. Os valores serão refinados após validação visual na poltrona oficial.
const LIBRARY_TEXTURE_TRANSFORMS = new Map([
  ['assento', { scale: { u: 2.15, v: 2.15 }, rotation: 0 }],
  ['encosto-frt', { scale: { u: 2.05, v: 2.05 }, rotation: 0 }],
  ['encosto lat', { scale: { u: 2.3, v: 2.3 }, rotation: Math.PI / 2 }],
  ['encosto traseiro', { scale: { u: 2.05, v: 2.05 }, rotation: 0 }],
  ['lat ext', { scale: { u: 2.45, v: 2.45 }, rotation: Math.PI / 2 }],
  ['lat int', { scale: { u: 2.45, v: 2.45 }, rotation: Math.PI / 2 }],
  ['lat rr', { scale: { u: 2.25, v: 2.25 }, rotation: 0 }],
  ['Material.012', { scale: { u: 2.35, v: 2.35 }, rotation: Math.PI / 2 }],
]);

let catalog;
let selectedMaterial;
let selectedFabric;
let configurableMaterials = [];
const textureCache = new Map();

function setStatus(message, state = '') {
  statusPill.textContent = message;
  statusPill.className = `status-pill ${state}`.trim();
}

function materialLabel(material) {
  return DISPLAY_NAMES.get(material?.name) ?? material?.name ?? 'Área não identificada';
}

function selectMaterial(material) {
  if (!material || FIXED_MATERIALS.has(material.name)) {
    setStatus('Área estrutural', 'notice');
    return;
  }
  selectedMaterial = material;
  selectedFace.textContent = materialLabel(material);
  setStatus('Área selecionada', 'ready');
  applyAllButton.disabled = !selectedFabric;
}

function textureTransformFor(material, item) {
  if (item.source !== 'karv-material-library') return null;
  return LIBRARY_TEXTURE_TRANSFORMS.get(material.name) ?? { scale: { u: 2.2, v: 2.2 }, rotation: 0 };
}

async function textureFor(material, item) {
  const source = item.texture ?? item.preview;
  const cacheKey = `${item.id ?? source}:${material.name}`;
  if (!textureCache.has(cacheKey)) {
    const texture = await viewer.createTexture(source, 'image/webp');
    const transform = textureTransformFor(material, item);
    if (transform) {
      texture.sampler.setWrapS(REPEAT_WRAP);
      texture.sampler.setWrapT(REPEAT_WRAP);
      texture.sampler.setScale(transform.scale);
      texture.sampler.setRotation(transform.rotation);
      texture.sampler.setOffset({ u: 0, v: 0 });
    }
    textureCache.set(cacheKey, texture);
  }
  return textureCache.get(cacheKey);
}

async function applyFabric(material, item) {
  const texture = await textureFor(material, item);
  const pbr = material.pbrMetallicRoughness;
  pbr.baseColorTexture.setTexture(texture);
  pbr.setBaseColorFactor([1, 1, 1, 1]);
  pbr.setMetallicFactor(0);
  pbr.setRoughnessFactor(item.source === 'karv-material-library' ? 0.86 : 0.92);
}

async function chooseFabric(item, button) {
  if (!selectedMaterial) return setStatus('Selecione uma área', 'notice');
  setStatus('Aplicando tecido');
  try {
    await applyFabric(selectedMaterial, item);
    selectedFabric = item;
    document.querySelectorAll('.fabric-card[aria-pressed="true"]').forEach((card) => card.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    applyAllButton.disabled = false;
    setStatus('Tecido aplicado', 'ready');
  } catch (error) {
    console.error(error);
    setStatus('Falha ao aplicar', 'error');
  }
}

function updateCollectionContext(collection) {
  const isLibrary = collection.id === LIBRARY_COLLECTION_ID;
  fabricGrid.classList.toggle('library-grid', isLibrary);
  catalogSummary.textContent = isLibrary
    ? `${collection.items.length} tecidos técnicos disponíveis.`
    : `${collection.items.length} referências visuais disponíveis.`;
  catalogNotice.textContent = isLibrary
    ? 'Teste técnico inicial com albedo e escala calibrada por peça. Normal e AO serão adicionados na etapa PBR.'
    : 'Referências visuais do MVP. Estes itens ainda não possuem escala física validada nem mapas PBR.';
}

function renderCollection(collectionId) {
  const collection = catalog.collections.find((entry) => entry.id === collectionId);
  fabricGrid.replaceChildren();
  if (!collection) {
    fabricGrid.textContent = 'Coleção indisponível.';
    return;
  }
  updateCollectionContext(collection);
  for (const item of collection.items) {
    const button = document.createElement('button');
    button.className = 'fabric-card';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<img src="${item.preview}" alt="Amostra do tecido ${item.name}" loading="lazy" width="152" height="152" /><span>${item.name}</span>`;
    button.addEventListener('click', () => chooseFabric(item, button));
    fabricGrid.append(button);
  }
}

async function loadLibraryCollection() {
  const response = await fetch(LIBRARY_CATALOG_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Biblioteca KARV indisponível: ${response.status}`);
  const library = await response.json();
  const items = (library.items ?? [])
    .filter((item) => item.ready_for_configurator && item.assets?.base_color && item.assets?.preview)
    .map((item) => ({
      id: item.id,
      name: item.name,
      preview: new URL(item.assets.preview, LIBRARY_CATALOG_URL).href,
      texture: new URL(item.assets.base_color, LIBRARY_CATALOG_URL).href,
      source: 'karv-material-library',
      pbrReady: item.pbr_ready === true,
    }));

  return {
    id: LIBRARY_COLLECTION_ID,
    name: 'Biblioteca KARV',
    items,
  };
}

async function loadCatalog() {
  const response = await fetch('../catalog/catalog.json');
  if (!response.ok) throw new Error(`Catálogo indisponível: ${response.status}`);
  catalog = await response.json();

  try {
    const libraryCollection = await loadLibraryCollection();
    if (libraryCollection.items.length) catalog.collections.unshift(libraryCollection);
  } catch (error) {
    console.warn(error);
  }

  collectionFilter.replaceChildren();
  for (const collection of catalog.collections) {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = `${collection.name} · ${collection.items.length}`;
    collectionFilter.append(option);
  }
  collectionFilter.disabled = false;
  collectionFilter.addEventListener('change', () => renderCollection(collectionFilter.value));
  renderCollection(catalog.collections[0].id);
}

viewer.addEventListener('load', () => {
  configurableMaterials = viewer.model.materials.filter((material) => !FIXED_MATERIALS.has(material.name));
  selectMaterial(configurableMaterials[0]);
  setStatus('3D pronto', 'ready');
});
viewer.addEventListener('click', (event) => {
  if (viewer.modelIsVisible) selectMaterial(viewer.materialFromPoint(event.clientX, event.clientY));
});
viewer.addEventListener('error', () => {
  setStatus('Falha no 3D', 'error');
  selectedFace.textContent = 'Modelo indisponível';
});
viewer.addEventListener('ar-status', (event) => {
  const status = event.detail.status;
  if (status === 'session-started') setStatus('AR iniciado', 'ready');
  if (status === 'object-placed') setStatus('KARV posicionada', 'ready');
  if (status === 'failed') setStatus('AR indisponível', 'error');
  if (status === 'not-presenting') setStatus('3D pronto', 'ready');
});
applyAllButton.addEventListener('click', async () => {
  if (!selectedFabric) return;
  setStatus('Aplicando em todas');
  try {
    await Promise.all(configurableMaterials.map((material) => applyFabric(material, selectedFabric)));
    setStatus('Poltrona atualizada', 'ready');
  } catch (error) {
    console.error(error);
    setStatus('Falha ao aplicar', 'error');
  }
});
loadCatalog().catch((error) => {
  console.error(error);
  collectionFilter.replaceChildren(new Option('Catálogo indisponível'));
  fabricGrid.textContent = 'Não foi possível carregar as referências de tecido.';
  catalogSummary.textContent = 'Catálogo indisponível.';
  catalogNotice.textContent = 'Recarregue a página ou tente novamente em alguns instantes.';
  setStatus('Falha no catálogo', 'error');
});
