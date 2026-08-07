# KARV 3D

MVP unificado do Configurador 3D KARV.

## Propósito

O repositório mantém somente o necessário para validar o produto:

1. carregar a poltrona oficial;
2. selecionar uma área estofada diretamente no 3D;
3. aplicar uma referência visual de tecido;
4. aplicar o mesmo tecido a todas as áreas;
5. abrir a configuração em realidade aumentada;
6. validar modelo, catálogo e build por CI.

## Estrutura

```text
app/        interface, configurador e AR
base/       GLB oficial versionado e manifesto
catalog/    6 coleções e 24 referências visuais
tests/      validação estrutural do MVP
scripts/    build estático
```

## Desenvolvimento

```bash
npm ci
npm run dev
npm test
npm run build
```

## Integração em validação

A branch de teste conecta o configurador ao catálogo oficial `KARV-LP/karv-material-library` e preserva o catálogo local como fallback.

## Limite do catálogo

As 24 imagens são referências visuais para validação de navegação e aplicação no modelo. Não possuem escala física validada, repetição seamless ou mapas PBR e não substituem a futura Biblioteca Técnica KARV.
