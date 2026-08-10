# KARV 3D — MVP histórico

> **Status: referência histórica / regressão.**
>
> Este repositório não é mais a fonte canônica do Configurador 3D KARV. Novas funcionalidades, correções funcionais, UI, contratos, materiais runtime e RA devem ser desenvolvidos em **`KARV-LP/configurador-3d`**.

## Papel atual

Este repositório é preservado para:

- histórico técnico;
- referência de regressão;
- registro dos experimentos que validaram o produto;
- consulta ao MVP que antecedeu a arquitetura canônica.

Ele **não deve receber desenvolvimento funcional paralelo** ao configurador canônico.

O histórico não será apagado. Correções necessárias apenas para manter a referência acessível ou documentar comportamento legado podem ser feitas quando explicitamente autorizadas.

## Contexto do MVP

O MVP unificado validou inicialmente:

1. carregamento da poltrona oficial;
2. seleção de área estofada diretamente no 3D;
3. aplicação de referência visual de tecido;
4. aplicação do mesmo tecido a todas as áreas;
5. abertura da configuração em realidade aumentada;
6. validação estrutural de modelo, catálogo e build por CI.

## Estrutura histórica

```text
app/        interface, configurador e AR do MVP
base/       GLB oficial versionado e manifesto
catalog/    referências visuais usadas na validação inicial
tests/      validação estrutural do MVP
scripts/    build estático
```

## Limite do catálogo legado

As imagens do catálogo local foram referências visuais para validação de navegação e aplicação no modelo. Elas não representam a Biblioteca Técnica KARV canônica nem substituem materiais PBR publicados.

A Biblioteca pública atual é mantida separadamente em `KARV-LP/karv-material-library` e consumida pela aplicação canônica `KARV-LP/configurador-3d`.

## Desenvolvimento atual

Para qualquer trabalho novo no Configurador 3D KARV, use:

`KARV-LP/configurador-3d`
