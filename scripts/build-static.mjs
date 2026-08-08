import fs from 'node:fs';

const output = new URL('../dist/', import.meta.url);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

fs.copyFileSync(new URL('../index.html', import.meta.url), new URL('index.html', output));
fs.cpSync(new URL('../app/', import.meta.url), new URL('app/', output), { recursive: true });
fs.cpSync(new URL('../catalog/', import.meta.url), new URL('catalog/', output), { recursive: true });
fs.mkdirSync(new URL('base/', output), { recursive: true });
fs.copyFileSync(new URL('../base/base.v4.2bdebd66.glb', import.meta.url), new URL('base/base.v4.2bdebd66.glb', output));
fs.copyFileSync(new URL('../base/base.manifest.json', import.meta.url), new URL('base/base.manifest.json', output));

console.log('Static KARV 3D MVP created in dist/');
