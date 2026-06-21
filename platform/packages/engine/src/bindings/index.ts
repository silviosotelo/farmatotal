/**
 * Bindings dinámicos del motor (equivalente tipado a los Dynamic Tags de
 * Elementor, sin el shortcode regex). Una prop con valor `{$dynamic:{source}}`
 * se resuelve en render contra una fuente registrada y un contexto de datos.
 */
import type { DynamicValue, Settings } from '../schema/types'

export type BindingContext = Record<string, unknown>
export type BindingResolver = (args: Record<string, unknown> | undefined, ctx: BindingContext) => unknown

export interface BindingSource {
    id: string
    label: string
    resolver: BindingResolver
}

const sources = new Map<string, BindingSource>()

export function registerBindingSource(source: BindingSource): void {
    sources.set(source.id, source)
}

export function listBindingSources(): BindingSource[] {
    return [...sources.values()]
}

export function isDynamic(v: unknown): v is DynamicValue {
    return !!v && typeof v === 'object' && '$dynamic' in (v as Record<string, unknown>)
}

/** Resuelve cada prop dinámica de `settings` contra el contexto. */
export function resolveBindings(settings: Settings, ctx: BindingContext): Settings {
    const out: Settings = {}
    for (const [key, value] of Object.entries(settings)) {
        if (isDynamic(value)) {
            const { source, args } = value.$dynamic
            const src = sources.get(source)
            out[key] = src ? src.resolver(args, ctx) : undefined
        } else {
            out[key] = value
        }
    }
    return out
}
