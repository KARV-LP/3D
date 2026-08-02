import fs from 'node:fs';
import crypto from 'node:crypto';

const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../base/base.manifest.json', import.meta.url), 'utf8'));
const glb = fs.readFileSync(new URL('../base/base.glb', import.meta.url));

const requiredHtml = [
  'ar-modes="webxr quick-look"',
  'ar-placement="floor"',
  'ar-scale="fixed"',
  'slot="ar-button"',
  'src="../base/base.glb"',
];
for (const token of requiredHtml) {
  if (!html.includes(token)) throw new Error(`Configuração AR ausente: ${token}`);
}
if (html.includes('scene-viewer')) throw new Error('Scene Viewer não deve estar ativo no AR MVP');
if (html.includes('ios-src=')) throw new Error('ios-src impede a geração automática do USDZ configurado');

if (glb.toString('ascii', 0, 4) !== 'glTF' || glb.readUInt32LE(4) !== 2) {
  throw new Error('base.glb não é GLB 2.0 válido');
}

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
if ((json.nodes ?? []).length !== manifest.part_count) throw new Error('Quantidade de peças diverge do manifesto');

const bounds = primitives.map((primitive) => json.accessors[primitive.attributes.POSITION]);
const min = [0, 1, 2].map((axis) => Math.min(...bounds.map((accessor) => accessor.min[axis])));
const max = [0, 1, 2].map((axis) => Math.max(...bounds.map((accessor) => accessor.max[axis])));
const dimensions = max.map((value, axis) => value - min[axis]);
if (dimensions.some((value) => value < 0.5 || value > 1.5)) throw new Error(`Escala física suspeita: ${dimensions.join(' × ')}`);

const sha256 = crypto.createHash('sha256').update(glb).digest('hex');
if (manifest.glb.sha256 !== sha256 || manifest.glb.size_bytes !== glb.length) throw new Error('Hash ou tamanho diverge do manifesto');

console.log(JSON.stringify({
  status: 'ok',
  bytes: glb.length,
  nodes: json.nodes.length,
  meshes: json.meshes.length,
  materials: json.materials.length,
  dimensions_m: dimensions.map((value) => Number(value.toFixed(3))),
  ar_modes: ['webxr', 'quick-look'],
}, null, 2));
