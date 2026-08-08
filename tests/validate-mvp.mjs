import fs from 'node:fs';
import crypto from 'node:crypto';

const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../app/configurator.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../app/styles.css', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../base/base.manifest.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(new URL('../catalog/catalog.json', import.meta.url), 'utf8'));
const glb = fs.readFileSync(new URL(`../base/${manifest.glb.file}`, import.meta.url));

for (const token of [
  'ar-modes="webxr quick-look"',
  'ar-placement="floor"',
  'ar-scale="fixed"',
  'slot="ar-button"',
  `src="../base/${manifest.glb.file}"`,
  'camera-controls',
  'disable-pan',
  'camera-target="auto auto auto"',
  'camera-orbit="35deg 72deg 2.65m"',
  'min-camera-orbit="-135deg 52deg 2.15m"',
  'max-camera-orbit="135deg 86deg 3.10m"',
  'min-field-of-view="29deg"',
  'max-field-of-view="36deg"',
  'id="catalogSummary"',
  'id="catalogNotice"',
]) {
  if (!html.includes(token)) throw new Error(`Configuração ausente: ${token}`);
}
for (const token of [
  'materialFromPoint',
  'createTexture',
  'setTexture',
  'catalog/catalog.json',
  'raw.githubusercontent.com/KARV-LP/karv-material-library/main/catalog/fabrics.json',
  'ready_for_configurator',
  'item.texture ?? item.preview',
  'LIBRARY_TEXTURE_TRANSFORMS',
  'setScale',
  'setRotation',
  'setWrapS',
  'updateCollectionContext',
  'setEmissiveFactor',
  'emissiveFactor',
  'updateHighlightedMaterial',
  'getBoundingBoxCenter',
  'getDimensions',
  'jumpCameraToGoal',
  'centerCameraOnModel',
]) {
  if (!runtime.includes(token)) throw new Error(`Runtime incompleto: ${token}`);
}
for (const token of ['.fabric-grid.library-grid', 'repeat(3, minmax(0, 1fr))']) {
  if (!styles.includes(token)) throw new Error(`Estilo ausente: ${token}`);
}
if (catalog.summary.collections !== 6 || catalog.summary.samples !== 24) throw new Error('O catálogo MVP deve conter 6 coleções e 24 tecidos');
if (catalog.usage.production_ready !== false) throw new Error('O catálogo visual não pode ser marcado como material de produção');
const items = catalog.collections.flatMap((collection) => collection.items);
if (items.length !== 24 || new Set(items.map((item) => item.id)).size !== 24) throw new Error('IDs ou quantidade de tecidos inválidos');
for (const item of items) {
  if (!fs.existsSync(new URL(item.preview, import.meta.url))) throw new Error(`Preview ausente: ${item.preview}`);
}
if (glb.toString('ascii', 0, 4) !== 'glTF' || glb.readUInt32LE(4) !== 2) throw new Error('Modelo não é GLB 2.0 válido');
if (glb.readUInt32LE(8) !== glb.length) throw new Error('Tamanho inválido no header GLB');
let offset = 12;
let json;
while (offset < glb.length) {
  const length = glb.readUInt32LE(offset);
  const type = glb.toString('ascii', offset + 4, offset + 8);
  if (type === 'JSON') json = JSON.parse(glb.toString('utf8', offset + 8, offset + 8 + length).trim());
  offset += 8 + length;
}
if (!json) throw new Error('Chunk JSON ausente no GLB');
const primitives = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
if (!primitives.every((primitive) => primitive.material !== undefined)) throw new Error('Primitiva sem material');
if (!primitives.every((primitive) => primitive.attributes?.TEXCOORD_0 !== undefined)) throw new Error('Primitiva sem UV0');
if ((json.nodes ?? []).length !== manifest.part_count) throw new Error('Peças divergem do manifesto');
const sha256 = crypto.createHash('sha256').update(glb).digest('hex');
if (manifest.glb.sha256 !== sha256 || manifest.glb.size_bytes !== glb.length) throw new Error('Hash ou tamanho diverge do manifesto');
console.log(JSON.stringify({
  status: 'ok',
  model: manifest.glb.file,
  bytes: glb.length,
  nodes: json.nodes.length,
  materials: json.materials.length,
  collections: catalog.summary.collections,
  samples: catalog.summary.samples,
  external_library: 'karv-material-library',
  texture_calibration: 'per-material',
  camera_controls: 'bounded-centered-no-under-view',
  selection_highlight: 'emissive-restorable',
  ar_modes: ['webxr', 'quick-look'],
}, null, 2));
