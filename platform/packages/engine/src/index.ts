/**
 * `@platform/engine` — motor de componentes schema-first (paridad Elementor).
 * El schema de cada widget es la única fuente de verdad: render, CSS y el
 * adaptador del editor se derivan de él.
 */
export * from './schema/types'
export * from './css/compileCss'
export * from './bindings'
export * from './registry'
export * from './render/renderWidget'
export * from './widgets'
