const viewer = document.querySelector('#karvViewer');
const statusPill = document.querySelector('#statusPill');
const selectedFace = document.querySelector('#selectedFace');
const collectionFilter = document.querySelector('#collectionFilter');
const fabricGrid = document.querySelector('#fabricGrid');
const applyAllButton = document.querySelector('#applyAllButton');
const applyPieceButton = document.querySelector('#applyPieceButton');
const attributeFilters = document.querySelector('#attributeFilters');
const configSummary = document.querySelector('#configSummary');
const catalogNotice = document.querySelector('#catalogNotice');
const catalogSummary = document.querySelector('#catalogSummary');

const LIBRARY_CATALOG_URL = 'https://raw.githubusercontent.com/KARV-LP/karv-material-library/main/catalog/fabrics.json';
const LIBRARY_COLLECTION_ID = 'karv-material-library';
const REPEAT_WRAP = 10497;
const HIGHLIGHT_EMISSIVE = [0.11, 0.2, 0.14];
const FIXED_MATERIALS = new Set(['pezinhos', 'VIVO']);
const DISPLAY_NAMES = new Map([
  ['assento', 'Assento'], ['encosto-frt', 'Encosto frontal'], ['encosto lat', 'Encosto lateral'],
  ['encosto traseiro', 'Encosto traseiro'], ['lat ext', 'Lateral externa'], ['lat int', 'Lateral interna'],
  ['lat rr', 'Lateral traseira'], ['Material.012', 'Lateral superior'],
]);
const FAMILY_DOT = new Map([
  ['preto', '#1c1c1c'], ['cinza', '#8a8d90'], ['branco', '#e6e6e6'], ['bege', '#b09a7a'],
  ['marrom', '#6f5238'], ['verde', '#4f6b2e'], ['azul', '#3a5a8f'], ['vermelho', '#9a3b32'],
  ['amarelo', '#c9a227'], ['rosa', '#b56b86'], ['roxo', '#6b4f8f'], ['laranja', '#c07636'],
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
let highlightedMaterial;
let configurableMaterials = [];
const textureCache = new Map();
const originalEmissiveFactors = new WeakMap();
const originalBaseColorFactors = new WeakMap();
const assignments = new Map();
const activeFilters = new Set();
let currentCollection;

function setStatus(message, state = '') {
  statusPill.textContent = message;
  statusPill.className = `status-pill ${state}`.trim();
}

function materialKey(material) {
  return material?.name?.trim();
}

function materialLabel(material) {
  return DISPLAY_NAMES.get(materialKey(material)) ?? material?.name ?? 'Área não identificada';
}

function originalEmissiveFactor(material) {
  if (!originalEmissiveFactors.has(material)) {
    originalEmissiveFactors.set(material, [...(material.emissiveFactor ?? [0, 0, 0])]);
  }
  return originalEmissiveFactors.get(material);
}

function rememberBaseColor(material) {
  if (!originalBaseColorFactors.has(material)) {
    originalBaseColorFactors.set(material, [...(material.pbrMetallicRoughness.baseColorFactor ?? [1, 1, 1, 1])]);
  }
}

function clearMaterialHighlight(material) {
  if (!material) return;
  material.setEmissiveFactor(originalEmissiveFactor(material));
}

function updateHighlightedMaterial(material) {
  if (highlightedMaterial === material) return;
  clearMaterialHighlight(highlightedMaterial);
  highlightedMaterial = material;
  if (highlightedMaterial) {
    originalEmissiveFactor(highlightedMaterial);
    highlightedMaterial.setEmissiveFactor(HIGHLIGHT_EMISSIVE);
  }
}

function centerCameraOnModel() {
  const center = viewer.getBoundingBoxCenter();
  const dimensions = viewer.getDimensions();
  const targetY = center.y - dimensions.y * 0.06;
  viewer.cameraTarget = `${center.x}m ${targetY}m ${center.z}m`;
  viewer.jumpCameraToGoal();
}

function selectMaterial(material) {
  if (!material || FIXED_MATERIALS.has(material.name)) {
    selectedMaterial = undefined;
    updateHighlightedMaterial(undefined);
    selectedFace.textContent = 'Estrutura não configurável';
    setStatus('Área estrutural', 'notice');
    applyPieceButton && (applyPieceButton.disabled = true);
    return;
  }
  selectedMaterial = material;
  updateHighlightedMaterial(material);
  selectedFace.textContent = materialLabel(material);
  setStatus('Área selecionada', 'ready');
  applyAllButton.disabled = !selectedFabric;
  applyPieceButton && (applyPieceButton.disabled = !selectedFabric);
}

function textureTransformFor(material, item) {
  if (item.source !== 'karv-material-library') return null;
  return LIBRARY_TEXTURE_TRANSFORMS.get(materialKey(material)) ?? { scale: { u: 2.2, v: 2.2 }, rotation: 0 };
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
  rememberBaseColor(material);
  const texture = await textureFor(material, item);
  const pbr = material.pbrMetallicRoughness;
  pbr.baseColorTexture.setTexture(texture);
  pbr.setBaseColorFactor([1, 1, 1, 1]);
  pbr.setMetallicFactor(0);
  pbr.setRoughnessFactor(item.source === 'karv-material-library' ? 0.86 : 0.92);
  assignments.set(materialKey(material), item);
}

function resetMaterial(material) {
  const pbr = material.pbrMetallicRoughness;
  try { pbr.baseColorTexture.setTexture(null); } catch (error) { /* sem textura aplicada */ }
  const base = originalBaseColorFactors.get(material) ?? [1, 1, 1, 1];
  pbr.setBaseColorFactor(base);
  assignments.delete(materialKey(material));
}

function resetConfiguration() {
  configurableMaterials.forEach(resetMaterial);
  selectedFabric = undefined;
  document.querySelectorAll('.fabric-card[aria-pressed="true"]').forEach((card) => card.setAttribute('aria-pressed', 'false'));
  applyAllButton.disabled = true;
  applyPieceButton && (applyPieceButton.disabled = true);
  renderConfigSummary();
  setStatus('Configuração limpa', 'notice');
}

function renderConfigSummary() {
  if (!configSummary) return;
  const rows = configurableMaterials
    .map((material) => {
      const item = assignments.get(materialKey(material));
      return `<div class="config-row"><span>${materialLabel(material)}</span><strong>${item ? item.name : '—'}</strong></div>`;
    })
    .join('');
  const applied = assignments.size;
  configSummary.innerHTML = `
    <div class="config-head">
      <span class="config-title">Configuração atual</span>
      <button type="button" class="config-reset" ${applied ? '' : 'disabled'}>Resetar</button>
    </div>
    <div class="config-rows">${rows}</div>`;
  const resetBtn = configSummary.querySelector('.config-reset');
  if (resetBtn) resetBtn.addEventListener('click', resetConfiguration);
}

function metaChips(item) {
  const m = item.meta;
  if (!m) return '';
  const chips = [];
  if (m.family) {
    const dot = FAMILY_DOT.get(m.family) ?? '#8a8d90';
    const label = m.family.charAt(0).toUpperCase() + m.family.slice(1);
    chips.push(`<span class="chip"><span class="chip-dot" style="background:${dot}"></span>${label}</span>`);
  }
  if (m.pet) chips.push('<span class="chip chip-on">Pet-friendly</span>');
  if (m.water) chips.push('<span class="chip chip-on">Impermeável</span>');
  if (m.outdoor) chips.push('<span class="chip">Outdoor</span>');
  else if (m.indoor) chips.push('<span class="chip">Indoor</span>');
  if (m.durability) chips.push(`<span class="chip">${/alta/i.test(m.durability) ? 'Durab. alta' : 'Durável'}</span>`);
  return chips.length ? `<div class="chip-row">${chips.join('')}</div>` : '';
}

function passesFilters(item) {
  if (!activeFilters.size) return true;
  const m = item.meta ?? {};
  for (const f of activeFilters) {
    if (f === 'pet' && !m.pet) return false;
    if (f === 'water' && !m.water) return false;
    if (f === 'outdoor' && !m.outdoor) return false;
  }
  return true;
}

function buildFilters(isLibrary) {
  if (!attributeFilters) return;
  attributeFilters.replaceChildren();
  if (!isLibrary) { attributeFilters.hidden = true; return; }
  attributeFilters.hidden = false;
  const defs = [['pet', 'Pet-friendly'], ['water', 'Impermeável'], ['outdoor', 'Outdoor']];
  const label = document.createElement('span');
  label.className = 'filter-hint';
  label.textContent = 'Filtrar:';
  attributeFilters.append(label);
  for (const [key, text] of defs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'attr-chip';
    button.textContent = text;
    button.setAttribute('aria-pressed', activeFilters.has(key) ? 'true' : 'false');
    button.addEventListener('click', () => {
      if (activeFilters.has(key)) activeFilters.delete(key); else activeFilters.add(key);
      button.setAttribute('aria-pressed', activeFilters.has(key) ? 'true' : 'false');
      renderCards();
    });
    attributeFilters.append(button);
  }
}

function renderCards() {
  fabricGrid.replaceChildren();
  const items = currentCollection.items.filter(passesFilters);
  if (!items.length) {
    fabricGrid.innerHTML = '<p class="grid-empty">Nenhum tecido com esses filtros.</p>';
    return;
  }
  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'fabric-card';
    button.type = 'button';
    button.setAttribute('aria-pressed', selectedFabric && selectedFabric.id === item.id ? 'true' : 'false');
    button.innerHTML = `<img src="${item.preview}" alt="Amostra do tecido ${item.name}" loading="lazy" width="152" height="152" /><span>${item.name}</span>${metaChips(item)}`;
    button.addEventListener('click', () => chooseFabric(item, button));
    fabricGrid.append(button);
  }
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
    applyPieceButton && (applyPieceButton.disabled = false);
    renderConfigSummary();
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
  buildFilters(isLibrary);
}

function renderCollection(collectionId) {
  const collection = catalog.collections.find((entry) => entry.id === collectionId);
  if (!collection) {
    fabricGrid.replaceChildren();
    fabricGrid.textContent = 'Coleção indisponível.';
    return;
  }
  currentCollection = collection;
  activeFilters.clear();
  updateCollectionContext(collection);
  renderCards();
}

async function fetchFabricMeta(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const meta = await response.json();
    return {
      family: meta.color?.family ?? null,
      pet: meta.performance?.pet_friendly === true,
      water: meta.performance?.water_repellency === true,
      indoor: meta.performance?.indoor_use === true,
      outdoor: meta.performance?.outdoor_use === true,
      durability: meta.performance?.durability ?? null,
    };
  } catch (error) {
    return null;
  }
}

async function loadLibraryCollection() {
  const response = await fetch(LIBRARY_CATALOG_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Biblioteca KARV indisponível: ${response.status}`);
  const library = await response.json();
  const ready = (library.items ?? [])
    .filter((item) => item.ready_for_configurator && item.assets?.base_color && item.assets?.preview);
  const items = await Promise.all(ready.map(async (item) => ({
    id: item.id,
    name: item.name,
    preview: new URL(item.assets.preview, LIBRARY_CATALOG_URL).href,
    texture: new URL(item.assets.base_color, LIBRARY_CATALOG_URL).href,
    source: 'karv-material-library',
    pbrReady: item.pbr_ready === true,
    meta: item.metadata ? await fetchFabricMeta(new URL(item.metadata, LIBRARY_CATALOG_URL).href) : null,
  })));

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
  configurableMaterials.forEach(rememberBaseColor);
  centerCameraOnModel();
  renderConfigSummary();
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
if (applyPieceButton) {
  applyPieceButton.addEventListener('click', async () => {
    if (!selectedFabric || !selectedMaterial) return;
    setStatus('Aplicando na peça');
    try {
      await applyFabric(selectedMaterial, selectedFabric);
      renderConfigSummary();
      setStatus('Tecido aplicado', 'ready');
    } catch (error) {
      console.error(error);
      setStatus('Falha ao aplicar', 'error');
    }
  });
}
applyAllButton.addEventListener('click', async () => {
  if (!selectedFabric) return;
  setStatus('Aplicando em todas');
  try {
    await Promise.all(configurableMaterials.map((material) => applyFabric(material, selectedFabric)));
    renderConfigSummary();
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
