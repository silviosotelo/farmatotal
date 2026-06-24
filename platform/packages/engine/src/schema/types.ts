/**
 * Motor de componentes `@platform/engine` — schema de props tipadas.
 *
 * El schema de cada widget es la ÚNICA fuente de verdad: de él se derivan el
 * render (store + editor), el CSS (selectors→CSS responsive) y el adaptador a
 * ChaiBuilder. Inspirado en el sistema atómico v4 de Elementor pero pragmático:
 * el tipo vive en el schema (no en cada valor) para mantener `settings` liviano;
 * el único wrapper explícito es `{$dynamic}` para los bindings.
 */
import type { ReactNode } from 'react'

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

/** Valor por breakpoint (responsive). `desktop` es la base. */
export type Responsive<T> = { desktop?: T; tablet?: T; mobile?: T }

/** Medida con unidad (px, %, em, rem, vw, …). */
export interface Length {
    value: number
    unit: string
}

/** Valor dinámico: se resuelve en render contra una fuente registrada. */
export interface DynamicValue {
    $dynamic: { source: string; args?: Record<string, unknown> }
}

/** Valor del grupo tipografía. `fontSize` puede ser responsive. */
export interface Typography {
    fontFamily?: string
    fontSize?: Responsive<Length> | Length
    fontWeight?: string
    lineHeight?: Length
    letterSpacing?: Length
    textTransform?: string
}

export type PropType =
    | 'string'
    | 'richtext'
    | 'number'
    | 'boolean'
    | 'enum'
    | 'color'
    | 'length'
    | 'typography'
    | 'media'
    | 'link'
    | 'categoryRef'
    | 'productRef'
    | 'productIds'

/** Mapeo control → CSS (el corazón del Style tab). */
export interface StyleBinding {
    /** Selector con `{{WRAPPER}}` (default `{{WRAPPER}}`). */
    selector?: string
    /** Propiedad CSS, p.ej. `color`, `text-align`, `font-size`. */
    css: string
    /** Para `length`: anexar la unidad. */
    unit?: boolean
    /** Transforma el valor a string CSS (override). */
    format?: (v: unknown) => string | undefined
}

export interface PropDef {
    $type: PropType
    label: string
    default?: unknown
    options?: { value: string; label: string }[]
    /** Sección del panel (≈ Content/Style/Advanced de Elementor). */
    group?: string
    /** Valor por breakpoint. */
    responsive?: boolean
    /** Admite binding dinámico. */
    dynamic?: boolean
    /** Mapeo a CSS (1 o varios). Un prop con `style` es "de estilo". */
    style?: StyleBinding | StyleBinding[]
    /** Overrides de UI para el adaptador del editor. */
    control?: Record<string, unknown>
}

export type Settings = Record<string, unknown> & {
  /** CSS personalizado del usuario para este widget (freeform). */
  customCss?: string
}

export interface RenderHelpers {
    elementId: string
    /** Clase raíz gancho del CSS: `ft-el-<id>`. */
    rootClass: string
    /** Hijos ya renderizados (para widgets contenedores). */
    children?: ReactNode
}

export interface WidgetSchema {
    type: string
    label: string
    group: string
    /** Si acepta bloques hijos (Container, Loop). El host (store/editor) los rinde. */
    acceptsChildren?: boolean
    props: Record<string, PropDef>
    render: (settings: Settings, helpers: RenderHelpers) => ReactNode
}

/** Identidad tipada: define (y valida superficialmente) un widget. */
export function defineWidget(w: WidgetSchema): WidgetSchema {
    return w
}

/** Settings por defecto derivados del schema. */
export function defaultSettings(schema: WidgetSchema): Settings {
    const out: Settings = {}
    for (const [key, def] of Object.entries(schema.props)) {
        if (def.default !== undefined) out[key] = def.default
    }
    return out
}
