# Editor visual (page builder) — comparativa para el plugin "Editor visual"

Contexto: la plataforma es **React 19 + Next 16 (storefront) + Tailwind v4**, admin Ecme (React+Vite).
Hoy el page builder usa **Puck (@measured/puck)**: admin edita, clone renderiza, JSON en `pages.blocks`.
Necesitamos: bloques data-bound de comercio (ProductGrid, HomeDeals, etc.), embeber el editor en el
admin, guardar JSON propio (PostgreSQL), white-label multi-rubro, SSR en Next, y libertad estilo Elementor.

## Opciones evaluadas

### 0. Puck (actual)
- **Modelo:** bloques/slots. El dev define cada componente y SUS campos editables.
- **React-native:** sí (registrar `<ProductGrid>` etc. es trivial). SSR Next: excelente.
- **Estilo libre (Elementor):** ❌ limitado — el usuario edita los campos definidos, no padding/margin/
  color/tipografía arbitrarios por elemento.
- **Veredicto:** lo más controlado y data-bound; lo menos "diseño libre".

### 1. GrapesJS (+ wrappers React)
- **Modelo:** el rey FOSS, lo más parecido a Elementor. Style manager completo (padding, margin,
  tipografía, bg, bordes), arrastrar secciones.
- **React:** núcleo vanilla JS; se monta en `useEffect` sobre un `<div>`. Hay wrappers React pero hay
  fricción (imperativo). Registrar componentes **React data-bound** (ProductGrid) es incómodo (es
  HTML-céntrico). Exporta HTML/CSS o JSON.
- **Tailwind/SSR:** su CSS es propio (no clases Tailwind por defecto); renderizar su salida en Next
  requiere trabajo.
- **Veredicto:** máxima libertad de diseño y madurez, pero peor encaje React/Tailwind/data-binding.

### 2. Chai Builder
- **Modelo:** moderno, **React + Tailwind nativo**, pensado para **embeber** (`<ChaiBuilderEditor />`).
  Controles visuales de clases Tailwind (flex/grid/hover/estados). Lienzo libre.
- **React/Next:** componente React; registrar componentes propios del SaaS es directo. SSR factible.
- **Veredicto:** el "Elementor en React+Tailwind" — **mejor encaje técnico para este stack**. Comunidad
  más nueva/chica.

### 3. Easyblocks
- **Modelo:** framework para construir editores embebidos. SSR Next App Router nativo, historial
  (undo/redo), i18n, datos dinámicos. El dev define componentes/variantes/restricciones.
- **Veredicto:** premium-feel y muy controlado. ⚠️ Verificar mantenimiento/actividad del repo antes de
  apostar (riesgo de proyecto archivado).

## Matriz rápida

| Criterio | Puck (hoy) | GrapesJS | Chai Builder | Easyblocks |
|---|---|---|---|---|
| Libertad estilo Elementor | Baja | **Alta** | Alta | Media-Alta |
| React-native | **Sí** | Wrapper | **Sí** | **Sí** |
| Tailwind nativo | n/a | No | **Sí** | Parcial |
| Registrar bloques data-bound (ProductGrid) | **Fácil** | Difícil | **Fácil** | Medio |
| SSR Next | **Sí** | Requiere trabajo | Sí | **Sí** |
| Embeber en admin | Sí | Sí (imperativo) | **Sí** | **Sí** |
| Madurez/comunidad | Media | **Alta** | Baja-Media | Baja (⚠ mantenimiento) |
| Licencia | MIT | BSD | MIT | MIT |

## Recomendación
- **Chai Builder** = mejor balance para ESTE stack (React+Tailwind+Next, embeber, custom blocks,
  libertad de estilo). Sería el upgrade natural desde Puck.
- **GrapesJS** = si la prioridad es máxima libertad de diseño + madurez, asumiendo la fricción
  React/Tailwind/data-binding.
- **Puck** = mantener sólo si alcanza con bloques controlados (no diseño libre).
- **Easyblocks** = atractivo pero validar mantenimiento primero.

**DECIDIDO (usuario): Chai Builder** para el plugin `page_builder`. Plan: instalar `@chaibuilder/sdk`,
montar `<ChaiBuilderEditor>` en una vista del admin, registrar los bloques data-bound de comercio
(ProductGrid, HomeDeals, Hero, etc.), guardar el JSON en `pages.blocks` y renderizar en el clone (SSR).
Migrar gradualmente desde Puck. (#86)

---

## Implementación (2026-06) — Chai Builder montado, Puck retirado

**Estado:** Chai Builder es el motor del plugin `page_builder`. Puck (`@measured/puck` + `puckConfig.tsx`) eliminado.

### Arquitectura admin
- `apps/admin/src/components/chai/blocks.tsx` — registra bloques data-bound en el runtime de Chai
  (`registerChaiBlock` de `@chaibuilder/sdk/runtime`), grupo **"Comercio"**: `Hero`, `ProductGrid`,
  `HomeDeals`. Cada uno con `props.schema` (RJSF) configurable y fetch real del catálogo (`/catalog/products`).
- `apps/admin/src/views/concepts/cms/PageBuilder.tsx` — editor por página: carga `pages.blocks`,
  monta `<ChaiBuilderEditor blocks onSave>`, persiste con `apiUpdatePage(id,{blocks})`. Datos viejos de
  Puck (`{content,root,zones}`) se ignoran → array vacío (migración limpia).
- `apps/admin/src/views/concepts/page-builder/PageBuilder.tsx` — landing del plugin: lista páginas + crear.

### Conflictos de dependencias resueltos (el install de Chai rompió el build: 12 → 36 errores)
1. **Doble instancia de zod** (Chai trae zod 4.3.5, app usa 4.4.3) rompía `@hookform/resolvers` (zodResolver
   veía dos zod). Fix: `pnpm.overrides.zod = 4.4.3` en `platform/package.json` → una sola instancia.
2. **Peers huérfanos** tras el reshuffle de hoisting (`shamefully-hoist=false`): `apexcharts`, `simplebar-core`
   dejaron de resolver. Fix: declararlos explícitos en admin devDeps. `apexcharts` **fijado a ^4.7.0**
   (react-apexcharts@1.7.0 espera v4; v5 cambia `ApexLegendFormatterOpts` y rompe `chart.config.ts`).
3. **Subpath `@chaibuilder/sdk/runtime`** no resolvía tipos con `moduleResolution: "Node"` (no honra `exports`).
   Fix: `paths` en `tsconfig.json` → `./node_modules/@chaibuilder/sdk/dist/runtime.d.ts`. En runtime Vite lo
   resuelve solo (esbuild honra `exports`); además se agregó a `optimizeDeps.include`.
4. `z.record(z.unknown())` (1 arg) en shared-types: zod v4 exige `(key,value)` → `z.record(z.string(), z.unknown())`.

Resultado: **tsc 0 errores** (baseline era 12), `vite build` verde, editor monta sin errores de consola,
bloques de comercio visibles en "Add Blocks → Comercio". Capturas en `_pwshot/pb-{landing,editor,addblock}.png`.

### Pendiente
- **Render SSR en el clone** (Next 16): instalar `@chaibuilder/sdk`, registrar los mismos bloques (versión
  server-friendly con `@chaibuilder/sdk/render` + `RenderChaiBlocks`), y en la ruta de página hacer fetch de
  `pages.blocks` y renderizar. Los componentes de comercio deben compartirse/duplicarse (proyecto separado).

---

## #98 — Editar el tema/home desde el ChaiBuilder (2026-06-17)

**Modelo adoptado (incremental):**
- **Header/footer = chrome del tema** (React, no editable por el builder). Se eligen con el tema activo.
- **Cuerpo del home + páginas = editable por el builder.** Los bloques data-bound del ChaiBuilder
  (Hero/ProductGrid/HomeDeals) son **theme-aware**: `ChaiRender` (clone, async server) aplica
  `themeAccentVars(getActiveTheme())` y re-tinta los bloques al tema activo (Hero `var(--brand-gradient)`,
  precios `text-brand-orange`).
- **Home builder-editable (override de contenido, NO fallback):** `(site)/page.tsx` — si existe una página CMS
  publicada slug `home` con bloques Chai (array), la renderiza con `ChaiRender` (themed) y manda sobre el home
  hardcodeado del tema. Sin esa página, se usa el home pixel-perfect del tema (EkomartHome/AnvogueHome/Puck).
  VERIFICADO: con una página `home` Chai seedeada, el `/` en tema Ekomart muestra Hero verde + grilla
  (home-builder-ekomart.png); al limpiarla, vuelve el home pixel-perfect del tema.

**Pendiente / enriquecimiento futuro (no bloqueante):**
- Ampliar el catálogo de bloques data-bound del builder con más secciones tipo tema: Banner/PromoBanner,
  CategoryShowcase, Brands, Benefits — registrarlos en admin `components/chai/blocks.tsx` (schema) y en el
  clone `components/cms/ChaiRender.tsx` (render por _type, theme-aware).
- Tematizar el bloque HomeDeals (hoy SuperRombo estilo farmatotal).
- (Opcional) exponer las secciones nativas de cada tema (slider/tabs/brands) como bloques Chai para
  recomposición total del home del tema desde el editor.
