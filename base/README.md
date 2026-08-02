# Geometria base KARV

Esta pasta contém a geometria oficial usada pelo Configurador KARV.

## Arquivos

- `base.glb`: modelo oficial otimizado para web e armazenado diretamente no Git.
- `base.manifest.json`: versão, partes, materiais, UVs, tamanho e hash do modelo.
- `uv-templates/`: templates vinculados à `geometry_version`.
- `designer-kit/`: kit de criação vinculado à `geometry_version`.

## Requisitos do GLB

- 11 objetos com os nomes canônicos definidos no manifesto.
- Materiais atribuídos conforme o manifesto; os dois vivos compartilham `VIVO`.
- UV principal preservada em `TEXCOORD_0`.
- Tamanho inferior a 100 MB.

O arquivo `base.glb` não deve ser compactado em ZIP, renomeado ou substituído sem validação e nova versão da geometria.
