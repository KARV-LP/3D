# Arquitetura do Configurador KARV

## Estrutura aprovada

```text
karv-configurator/
├── app/
│   ├── index.html
│   ├── styles/
│   └── runtime/
├── base/
│   ├── base.glb
│   ├── base.manifest.json
│   ├── uv-templates/
│   └── designer-kit/
├── integrations/
│   ├── catalog-api.js
│   ├── pedido-netlify.js
│   └── whatsapp.js
├── schemas/
├── tests/
└── netlify.toml
```

## Separação

O Configurador controla o 3D, a seleção de faces, a aplicação de texturas e o pedido. A Biblioteca KARV permanece em repositório independente e fornece o catálogo por manifesto JSON versionado.
