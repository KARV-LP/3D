# Arquitetura reduzida — KARV 3D MVP

```text
Navegador
  ├── app/index.html
  ├── model-viewer
  ├── base/base.v1.fe8f015c.glb
  └── catalog/catalog.json + 24 previews
```

O mesmo runtime controla configuração e AR. Não há backend, API de catálogo ou repositório adicional nesta fase.

## Contrato mínimo

- `base.manifest.json` identifica a geometria e os materiais.
- `catalog.json` fornece seis coleções visuais.
- o clique no modelo resolve o material por `materialFromPoint`;
- `createTexture` e `setTexture` aplicam a referência escolhida;
- o build copia somente os ativos necessários ao deploy estático.

Recursos PBR, escala técnica, pipeline de publicação e armazenamento externo ficam fora do caminho crítico do MVP.
