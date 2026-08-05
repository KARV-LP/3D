const viewer = document.querySelector('#karvViewer');
const statusPill = document.querySelector('#statusPill');
const selectedFace = document.querySelector('#selectedFace');
const collectionFilter = document.querySelector('#collectionFilter');
const fabricGrid = document.querySelector('#fabricGrid');
const applyAllButton = document.querySelector('#applyAllButton');

const FIXED_MATERIALS = new Set(['pezinhos', 'VIVO']);
const DISPLAY_NAMES = new Map([
  ['assento', 'Assento'], ['encosto-frt', 'Encosto frontal'], ['encosto lat', 'Encosto lateral'],
  ['encosto traseiro', 'Encosto traseiro'], ['lat ext', 'Lateral externa'], ['lat int', 'Lateral interna'],
  ['lat rr', 'Lateral traseira'], ['Material.012', 'Lateral superior'],
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

async function textureFor(item) {
  if (!textureCache.has(item.preview)) textureCache.set(item.preview, viewer.createTexture(item.preview, 'image/webp'));
  return textureCache.get(item.preview);
}

async function applyFabric(material, item) {
  const texture = await textureFor(item);
  const pbr = material.pbrMetallicRoughness;
  pbr.baseColorTexture.setTexture(texture);
  pbr.setBaseColorFactor([1, 1, 1, 1]);
  pbr.setMetallicFactor(0);
  pbr.setRoughnessFactor(0.92);
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

function renderCollection(collectionId) {
  const collection = catalog.collections.find((entry) => entry.id === collectionId);
  fabricGrid.replaceChildren();
  for (const item of collection.items) {
    const button = document.createElement('button');
    button.className = 'fabric-card';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<img src="${item.preview}" alt="" loading="lazy" width="152" height="152" /><span>${item.name}</span>`;
    button.addEventListener('click', () => chooseFabric(item, button));
    fabricGrid.append(button);
  }
}

async function loadCatalog() {
  const response = await fetch('../catalog/catalog.json');
  if (!response.ok) throw new Error(`Catálogo indisponível: ${response.status}`);
  catalog = await response.json();
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
  setStatus('Falha no catálogo', 'error');
});
