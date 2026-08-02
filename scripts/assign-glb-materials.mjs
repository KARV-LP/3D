import fs from "node:fs";
import crypto from "node:crypto";

const [inputPath, manifestPath, outputPath] = process.argv.slice(2);
if (!inputPath || !manifestPath || !outputPath) {
  throw new Error("Uso: node assign-glb-materials.mjs input.glb manifest.json output.glb");
}

const input = fs.readFileSync(inputPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (input.toString("ascii", 0, 4) !== "glTF") throw new Error("GLB inválido: magic");
if (input.readUInt32LE(4) !== 2) throw new Error("GLB inválido: versão diferente de 2");
if (input.readUInt32LE(8) !== input.length) throw new Error("GLB inválido: tamanho do header");

const chunks = [];
let offset = 12;
while (offset < input.length) {
  const length = input.readUInt32LE(offset);
  const type = input.readUInt32LE(offset + 4);
  const data = input.subarray(offset + 8, offset + 8 + length);
  chunks.push({ type, data });
  offset += 8 + length;
}

const JSON_CHUNK = 0x4e4f534a;
const jsonChunk = chunks.find((chunk) => chunk.type === JSON_CHUNK);
if (!jsonChunk) throw new Error("GLB inválido: chunk JSON ausente");

const gltf = JSON.parse(jsonChunk.data.toString("utf8").replace(/[\u0000 ]+$/, ""));
const nodes = gltf.nodes ?? [];
const meshes = gltf.meshes ?? [];
const nodeByName = new Map(nodes.map((node, index) => [node.name, { node, index }]));

const materialNames = [];
for (const part of manifest.parts ?? []) {
  for (const name of part.materials ?? []) {
    if (!materialNames.includes(name)) materialNames.push(name);
  }
}
if (!materialNames.length) throw new Error("Manifesto sem materiais");

gltf.materials = materialNames.map((name) => ({
  name,
  pbrMetallicRoughness: {
    baseColorFactor: [0.8, 0.8, 0.8, 1],
    metallicFactor: 0,
    roughnessFactor: 1,
  },
}));

const materialIndex = new Map(materialNames.map((name, index) => [name, index]));
const assignments = [];

for (const part of manifest.parts ?? []) {
  const found = nodeByName.get(part.object);
  if (!found) throw new Error(`Objeto ausente no GLB: ${part.object}`);
  if (found.node.mesh == null || !meshes[found.node.mesh]) {
    throw new Error(`Mesh ausente para o objeto: ${part.object}`);
  }
  const materialName = part.materials?.[0];
  const index = materialIndex.get(materialName);
  if (index == null) throw new Error(`Material ausente no manifesto: ${part.object}`);

  for (const primitive of meshes[found.node.mesh].primitives ?? []) {
    if (!("TEXCOORD_0" in (primitive.attributes ?? {}))) {
      throw new Error(`UV TEXCOORD_0 ausente: ${part.object}`);
    }
    primitive.material = index;
  }
  assignments.push({ object: part.object, material: materialName, material_index: index });
}

const jsonBytes = Buffer.from(JSON.stringify(gltf), "utf8");
const paddedJsonLength = Math.ceil(jsonBytes.length / 4) * 4;
const paddedJson = Buffer.alloc(paddedJsonLength, 0x20);
jsonBytes.copy(paddedJson);

const outputChunks = chunks.map((chunk) =>
  chunk.type === JSON_CHUNK ? { type: chunk.type, data: paddedJson } : chunk,
);
const totalLength = 12 + outputChunks.reduce((sum, chunk) => sum + 8 + chunk.data.length, 0);
const output = Buffer.alloc(totalLength);
output.write("glTF", 0, 4, "ascii");
output.writeUInt32LE(2, 4);
output.writeUInt32LE(totalLength, 8);

offset = 12;
for (const chunk of outputChunks) {
  output.writeUInt32LE(chunk.data.length, offset);
  output.writeUInt32LE(chunk.type, offset + 4);
  chunk.data.copy(output, offset + 8);
  offset += 8 + chunk.data.length;
}

fs.writeFileSync(outputPath, output);

const nonJsonHash = (items) => crypto
  .createHash("sha256")
  .update(Buffer.concat(items.filter((chunk) => chunk.type !== JSON_CHUNK).map((chunk) => chunk.data)))
  .digest("hex");

console.log(JSON.stringify({
  output: outputPath,
  bytes: output.length,
  material_count: gltf.materials.length,
  assignments,
  geometry_chunks_sha256_before: nonJsonHash(chunks),
  geometry_chunks_sha256_after: nonJsonHash(outputChunks),
}, null, 2));
