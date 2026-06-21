/**
 * Render compartido del motor. La MISMA función rinde en el store (SSR) y en el
 * canvas del editor → fidelidad real editor↔store. El CSS se compila aparte
 * (`compileCss`) y se inyecta como `<style>` scopeado; acá solo se produce el
 * árbol React con la clase raíz gancho (`ft-el-<id>`).
 */
import type { ReactNode } from 'react'
import type { Settings, WidgetSchema } from '../schema/types'
import { compileCss, type BreakpointConfig } from '../css/compileCss'
import { resolveBindings, type BindingContext } from '../bindings'
import { getWidget } from '../registry'

export function rootClassFor(elementId: string): string {
    return `ft-el-${elementId}`
}

/** Rinde un widget a partir de su schema y settings ya resueltos. */
export function renderWidget(schema: WidgetSchema, settings: Settings, elementId: string, children?: ReactNode): ReactNode {
    return schema.render(settings, { elementId, rootClass: rootClassFor(elementId), children })
}

/** Quita las claves de control (`_id`, `_type`, `_parent`, …) dejando settings. */
export function extractSettings(block: Record<string, unknown>): Settings {
    const out: Settings = {}
    for (const [key, value] of Object.entries(block)) {
        if (!key.startsWith('_')) out[key] = value
    }
    return out
}

export interface EngineBlockResult {
    node: ReactNode
    css: string
    type: string
}

/**
 * Resuelve un bloque del motor de punta a punta: lookup → bindings → CSS →
 * render. Devuelve `null` si el `_type` no es un widget del motor (para que el
 * store caiga a su switch legacy).
 */
export function renderEngineBlock(
    block: Record<string, unknown>,
    ctx: BindingContext,
    bp?: BreakpointConfig,
    children?: ReactNode,
): EngineBlockResult | null {
    const type = typeof block._type === 'string' ? block._type : ''
    const schema = getWidget(type)
    if (!schema) return null
    const elementId = typeof block._id === 'string' ? block._id : 'x'
    const resolved = resolveBindings(extractSettings(block), ctx)
    const css = compileCss(schema, resolved, elementId, bp)
    const node = renderWidget(schema, resolved, elementId, children)
    return { node, css, type }
}
