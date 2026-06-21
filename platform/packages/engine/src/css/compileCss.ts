/**
 * Compilador selectors→CSS del motor. Recorre el schema del widget, toma los
 * valores de `settings` de cada prop con `style`, y produce CSS scopeado por
 * elemento (`.ft-el-<id>`) con media queries responsive desktop-first (igual que
 * Elementor: base = desktop, tablet `@media (max-width:1024px)`, mobile 767).
 */
import type {
    Breakpoint,
    Length,
    PropDef,
    Responsive,
    Settings,
    StyleBinding,
    Typography,
    WidgetSchema,
} from '../schema/types'

export interface BreakpointConfig {
    tablet: number
    mobile: number
}

export const DEFAULT_BREAKPOINTS: BreakpointConfig = { tablet: 1024, mobile: 767 }

const ORDER: Breakpoint[] = ['desktop', 'tablet', 'mobile']

function isLength(v: unknown): v is Length {
    return !!v && typeof v === 'object' && 'value' in (v as Record<string, unknown>) && 'unit' in (v as Record<string, unknown>)
}

function isResponsive<T>(v: unknown): v is Responsive<T> {
    if (!v || typeof v !== 'object') return false
    const o = v as Record<string, unknown>
    return 'desktop' in o || 'tablet' in o || 'mobile' in o
}

/** Valor crudo → string CSS según el binding y el tipo de prop. */
function toCssValue(value: unknown, binding: StyleBinding): string | undefined {
    if (value == null || value === '') return undefined
    if (binding.format) return binding.format(value)
    if (isLength(value)) return `${value.value}${binding.unit === false ? '' : value.unit}`
    if (typeof value === 'number' || typeof value === 'string') return String(value)
    return undefined
}

type RuleMap = Record<Breakpoint, Map<string, string[]>>

function emptyRules(): RuleMap {
    return { desktop: new Map(), tablet: new Map(), mobile: new Map() }
}

function push(rules: RuleMap, bp: Breakpoint, selector: string, decl: string): void {
    const bucket = rules[bp]
    const list = bucket.get(selector)
    if (list) list.push(decl)
    else bucket.set(selector, [decl])
}

/** Expande el grupo tipografía a varias declaraciones. */
function emitTypography(t: Typography, selector: string, rules: RuleMap): void {
    if (t.fontFamily) push(rules, 'desktop', selector, `font-family: ${t.fontFamily};`)
    if (t.fontWeight) push(rules, 'desktop', selector, `font-weight: ${t.fontWeight};`)
    if (t.textTransform) push(rules, 'desktop', selector, `text-transform: ${t.textTransform};`)
    if (t.lineHeight) push(rules, 'desktop', selector, `line-height: ${t.lineHeight.value}${t.lineHeight.unit};`)
    if (t.letterSpacing) push(rules, 'desktop', selector, `letter-spacing: ${t.letterSpacing.value}${t.letterSpacing.unit};`)
    if (t.fontSize) {
        if (isResponsive<Length>(t.fontSize)) {
            for (const bp of ORDER) {
                const v = t.fontSize[bp]
                if (isLength(v)) push(rules, bp, selector, `font-size: ${v.value}${v.unit};`)
            }
        } else if (isLength(t.fontSize)) {
            push(rules, 'desktop', selector, `font-size: ${t.fontSize.value}${t.fontSize.unit};`)
        }
    }
}

function bindingsOf(def: PropDef): StyleBinding[] {
    if (!def.style) return []
    return Array.isArray(def.style) ? def.style : [def.style]
}

/** Compila el CSS de un widget. Devuelve "" si no hay estilos. */
export function compileCss(
    schema: WidgetSchema,
    settings: Settings,
    elementId: string,
    bp: BreakpointConfig = DEFAULT_BREAKPOINTS,
): string {
    const wrapper = `.ft-el-${elementId}`
    const rules = emptyRules()

    for (const [key, def] of Object.entries(schema.props)) {
        const bindings = bindingsOf(def)
        if (bindings.length === 0) continue
        const raw = settings[key]
        if (raw == null) continue

        for (const b of bindings) {
            const selector = (b.selector ?? '{{WRAPPER}}').split('{{WRAPPER}}').join(wrapper)

            if (def.$type === 'typography') {
                emitTypography(raw as Typography, selector, rules)
                continue
            }

            if (def.responsive && isResponsive(raw)) {
                for (const bpk of ORDER) {
                    const v = (raw as Responsive<unknown>)[bpk]
                    const css = toCssValue(v, b)
                    if (css !== undefined) push(rules, bpk, selector, `${b.css}: ${css};`)
                }
            } else {
                const css = toCssValue(raw, b)
                if (css !== undefined) push(rules, 'desktop', selector, `${b.css}: ${css};`)
            }
        }
    }

    return assemble(rules, bp)
}

function blockFor(bucket: Map<string, string[]>): string {
    let out = ''
    for (const [selector, decls] of bucket) {
        if (decls.length) out += `${selector}{${decls.join('')}}`
    }
    return out
}

function assemble(rules: RuleMap, bp: BreakpointConfig): string {
    let css = blockFor(rules.desktop)
    const tablet = blockFor(rules.tablet)
    if (tablet) css += `@media(max-width:${bp.tablet}px){${tablet}}`
    const mobile = blockFor(rules.mobile)
    if (mobile) css += `@media(max-width:${bp.mobile}px){${mobile}}`
    return css
}
