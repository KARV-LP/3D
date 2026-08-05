# Geometria base KARV

- `base.v1.fe8f015c.glb`: modelo oficial web, nomeado por versão e hash curto.
- `base.manifest.json`: peças, materiais, UV, tamanho e hash completo.

O nome versionado permite cache imutável sem manter versões antigas presas ao caminho `base.glb`.

A geometria não deve ser substituída sem nova `geometry_version`, novo hash e execução de `npm test`.
