## perf(base): decima PEZINHOS <200k, escala de textura física e material `lat ext`

### Objetivo
Fechar o `over_cap_parts: ["PEZINHOS"]` e corrigir a variação visual da trama entre peças. **Supersede** a branch `fix/lat-top-texture-scale` (a lat-top passa a ser calibrada na fonte).

### Mudanças
**1. PEZINHOS abaixo do cap**
- 206.967 → **119.780 triângulos** (meshopt `simplify` com `LockBorder` + Draco). Erro métrico 0 (só redundância coplanar removida). Cena: 338.311 → 251.108 tris.

**2. Estofado preservado (regra KARV)**
- Só o PEZINHOS foi decimado. As variações em `lat ext` (−4), `lat int` (−4) e `Material.012` (−8) são faces degeneradas de área zero removidas pelo Draco. UV0 mantido em todas as peças.

**3. Escala de textura fisicamente derivada**
Substitui os valores estimados por escalas calculadas de área 3D vs área UV (1 tile = 120×60 cm):
assento 0.94 · encosto-frt 0.69 · encosto lat 0.54 · encosto traseiro 0.96 · lat ext 1.06 · lat int 0.86 · lat rr 0.31 · Material.012 1.61.

**4. Supersede `fix/lat-top-texture-scale`**
Aquela branch é um monkey-patch de runtime que forçava a lat-top (2.35) para 2.15. Aqui a lat-top é calibrada na fonte para **1.608** (valor físico). Se aquele arquivo estiver presente no merge, ele é removido (ver instrução de aplicação).

**5. Robustez / versionamento**
- Lookup de material com `.trim()` (tolera `"lat ext "`).
- GLB versionado `base.v3.0adba33a.glb`; manifesto com `sha256`, `size_bytes`, `over_cap_parts: []` e bloco `optimization`.

### Validação
- `npm test` — OK. `npm run build` — OK.

### Fora de escopo
- Distorção de UV nas laterais curvas (re-unwrap no Blender) e escala anisotrópica (u≠v).
