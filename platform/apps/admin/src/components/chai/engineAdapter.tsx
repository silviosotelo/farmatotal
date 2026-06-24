/**
 * Adapter motor `@platform/engine` → ChaiBuilder.
 *
 * Registra un widget del motor en el editor: genera los controles del panel a
 * partir del schema (con widgets custom para binding/responsive/color/
 * tipografía) y un componente de canvas que reusa el render + CSS del motor
 * (misma salida que el store → fidelidad real editor↔store).
 */
import { registerChaiBlock, registerChaiBlockProps } from '@chaibuilder/sdk/runtime'
import { registerChaiBlockSettingWidget } from '@chaibuilder/sdk'
import { compileCss, renderWidget, resolveBindings, registerBindingSource, coreWidgets, type PropDef, type WidgetSchema } from '@platform/engine'
import useSWR from 'swr'
import ApiService from '@/services/ApiService'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────── Contexto de binding del editor (datos reales de la tienda) ───────────
function useStoreCtx(): { store: { brandName: string; description: string } } {
    const { data } = useSWR(
        'engine-store-cfg',
        async () => {
            const res = await ApiService.fetchDataWithAxios<{ key: string; value: any }>({
                url: '/cms/settings/store_config',
                method: 'get',
            })
            return res?.value ?? {}
        },
        { revalidateOnFocus: false },
    )
    return { store: { brandName: data?.brandName || 'Mi Tienda', description: data?.description || '' } }
}

const BINDING_SOURCES: [string, string][] = [
    ['store.name', 'Nombre de la tienda'],
    ['store.description', 'Descripción de la tienda'],
]

let bindingsRegistered = false
function ensureEditorBindings(): void {
    if (bindingsRegistered) return
    bindingsRegistered = true
    registerBindingSource({ id: 'store.name', label: 'Nombre', resolver: (_a, ctx) => (ctx as any)?.store?.brandName ?? '' })
    registerBindingSource({ id: 'store.description', label: 'Descripción', resolver: (_a, ctx) => (ctx as any)?.store?.description ?? '' })
    // item.* con datos de muestra para previsualizar el template del Loop en el canvas.
    const sample: Record<string, unknown> = { title: 'Producto de ejemplo', slug: '#', image: '', priceWeb: 99000, priceNormal: 120000, sku: 'SKU-000' }
    for (const k of Object.keys(sample)) {
        registerBindingSource({ id: `item.${k}`, label: `Ítem · ${k}`, resolver: () => sample[k] })
    }
}

// ─────────────────────────── Controles custom ───────────────────────────
const inputCls = 'w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400'

function FtBinding({ value, onChange, options }: any) {
    const sources: [string, string][] = options?.sources || BINDING_SOURCES
    const isDyn = value && typeof value === 'object' && '$dynamic' in value
    const source = isDyn ? value.$dynamic.source : ''
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex gap-3 text-xs text-gray-600">
                <label className="flex items-center gap-1">
                    <input type="radio" checked={!isDyn} onChange={() => onChange('')} /> Estático
                </label>
                <label className="flex items-center gap-1">
                    <input
                        type="radio"
                        checked={!!isDyn}
                        onChange={() => onChange({ $dynamic: { source: sources[0]?.[0] } })}
                    />{' '}
                    Dinámico
                </label>
            </div>
            {isDyn ? (
                <select className={inputCls} value={source} onChange={(e) => onChange({ $dynamic: { source: e.target.value } })}>
                    {sources.map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    className={inputCls}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Texto…"
                />
            )}
        </div>
    )
}

const BPS: ['desktop', 'tablet', 'mobile'] = ['desktop', 'tablet', 'mobile']
const BP_LABEL: Record<string, string> = { desktop: 'Escritorio', tablet: 'Tablet', mobile: 'Móvil' }

function FtRespEnum({ value, onChange, options }: any) {
    const choices: [string, string][] = options?.choices || []
    const v: Record<string, unknown> = value && typeof value === 'object' ? value : { desktop: value }
    const set = (bp: string, val: string) => onChange({ ...v, [bp]: val || undefined })
    return (
        <div className="flex flex-col gap-1.5">
            {BPS.map((bp) => (
                <div key={bp} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-gray-500">{BP_LABEL[bp]}</span>
                    <select className={inputCls} value={(v[bp] as string) ?? ''} onChange={(e) => set(bp, e.target.value)}>
                        <option value="">—</option>
                        {choices.map(([cv, cl]) => (
                            <option key={cv} value={cv}>
                                {cl}
                            </option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    )
}

function FtColor({ value, onChange }: any) {
    const v = typeof value === 'string' ? value : ''
    return (
        <div className="flex items-center gap-2">
            <input type="color" value={v || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 rounded border border-gray-200" />
            <input className={inputCls} value={v} onChange={(e) => onChange(e.target.value)} placeholder="#f16522" />
        </div>
    )
}

function FtTypography({ value, onChange }: any) {
    const v: any = value && typeof value === 'object' ? value : {}
    const fs: any = v.fontSize || {}
    const setFs = (bp: string, n: string) =>
        onChange({ ...v, fontSize: { ...fs, [bp]: n ? { value: Number(n), unit: 'px' } : undefined } })
    return (
        <div className="flex flex-col gap-1.5 text-xs">
            <div className="text-gray-500">Tamaño (px) por dispositivo</div>
            {BPS.map((bp) => (
                <div key={bp} className="flex items-center gap-2">
                    <span className="w-16 text-gray-500">{BP_LABEL[bp]}</span>
                    <input
                        type="number"
                        className={inputCls}
                        value={fs[bp]?.value ?? ''}
                        onChange={(e) => setFs(bp, e.target.value)}
                    />
                </div>
            ))}
            <div className="flex items-center gap-2">
                <span className="w-16 text-gray-500">Peso</span>
                <select className={inputCls} value={v.fontWeight ?? ''} onChange={(e) => onChange({ ...v, fontWeight: e.target.value || undefined })}>
                    <option value="">—</option>
                    {['300', '400', '500', '600', '700', '800', '900'].map((w) => (
                        <option key={w} value={w}>
                            {w}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-16 text-gray-500">Interlineado</span>
                <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    value={v.lineHeight?.value ?? ''}
                    onChange={(e) => onChange({ ...v, lineHeight: e.target.value ? { value: Number(e.target.value), unit: '' } : undefined })}
                />
            </div>
        </div>
    )
}

function FtLength({ value, onChange }: any) {
    const v: any = value && typeof value === 'object' ? value : {}
    const num = v.value ?? ''
    const unit = v.unit ?? 'px'
    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                className={inputCls}
                value={num}
                onChange={(e) => onChange({ value: Number(e.target.value), unit })}
            />
            <select
                className={inputCls}
                style={{ width: 72 }}
                value={unit}
                onChange={(e) => onChange({ value: Number(num) || 0, unit: e.target.value })}
            >
                {['px', '%', 'em', 'rem', 'vw', 'vh'].map((u) => (
                    <option key={u} value={u}>
                        {u}
                    </option>
                ))}
            </select>
        </div>
    )
}

function FtConditions({ value, onChange }: any) {
    const v: any = value && typeof value === 'object' ? value : {}
    const set = (k: string, val: any) => onChange({ ...v, [k]: val || undefined })
    return (
        <div className="flex flex-col gap-1.5 text-xs">
            <span className="text-gray-500">Mostrar en dispositivo</span>
            <select
                className={inputCls}
                value={v.device ?? 'all'}
                onChange={(e) => set('device', e.target.value === 'all' ? undefined : e.target.value)}
            >
                <option value="all">Todos</option>
                <option value="desktop">Solo escritorio</option>
                <option value="tablet">Solo tablet</option>
                <option value="mobile">Solo móvil</option>
            </select>
            <span className="text-gray-500">Según sesión</span>
            <select
                className={inputCls}
                value={v.auth ?? 'all'}
                onChange={(e) => set('auth', e.target.value === 'all' ? undefined : e.target.value)}
            >
                <option value="all">Todos</option>
                <option value="in">Solo logueados</option>
                <option value="out">Solo anónimos</option>
            </select>
            <span className="text-gray-500">Desde (opcional)</span>
            <input type="datetime-local" className={inputCls} value={v.from ?? ''} onChange={(e) => set('from', e.target.value)} />
            <span className="text-gray-500">Hasta (opcional)</span>
            <input type="datetime-local" className={inputCls} value={v.to ?? ''} onChange={(e) => set('to', e.target.value)} />
        </div>
    )
}

let widgetsRegistered = false
function ensureControlWidgets(): void {
    if (widgetsRegistered) return
    widgetsRegistered = true
    registerChaiBlockSettingWidget('ftBinding', FtBinding as any)
    registerChaiBlockSettingWidget('ftRespEnum', FtRespEnum as any)
    registerChaiBlockSettingWidget('ftColor', FtColor as any)
    registerChaiBlockSettingWidget('ftTypography', FtTypography as any)
    registerChaiBlockSettingWidget('ftLength', FtLength as any)
    registerChaiBlockSettingWidget('ftConditions', FtConditions as any)
}

// ─────────────────────────── Mapeo schema → controles ───────────────────────────
function mapProp(def: PropDef): any {
    const base: any = { title: def.label, default: def.default }
    if (def.$type === 'string' && def.dynamic) {
        return { ...base, type: 'string', ui: { 'ui:widget': 'ftBinding', 'ui:options': { sources: BINDING_SOURCES } } }
    }
    if (def.$type === 'enum' && def.responsive) {
        return {
            ...base,
            type: 'object',
            default: def.default !== undefined ? { desktop: def.default } : {},
            ui: { 'ui:widget': 'ftRespEnum', 'ui:options': { choices: (def.options || []).map((o) => [o.value, o.label]) } },
        }
    }
    if (def.$type === 'enum') {
        return { ...base, type: 'string', enum: (def.options || []).map((o) => o.value), enumNames: (def.options || []).map((o) => o.label) }
    }
    if (def.$type === 'categoryRef') return { ...base, type: 'string', ui: { 'ui:widget': 'categoryPicker' } }
    if (def.$type === 'color') return { ...base, type: 'string', ui: { 'ui:widget': 'ftColor' } }
    if (def.$type === 'typography') return { ...base, type: 'object', default: def.default ?? {}, ui: { 'ui:widget': 'ftTypography' } }
    if (def.$type === 'length') return { ...base, type: 'object', default: def.default ?? { value: 0, unit: 'px' }, ui: { 'ui:widget': 'ftLength' } }
    if (def.$type === 'richtext') return { ...base, type: 'string', ui: { 'ui:widget': 'richtext' } }
    if (def.$type === 'number') return { ...base, type: 'number' }
    if (def.$type === 'boolean') return { ...base, type: 'boolean' }
    if (def.$type === 'link' || def.$type === 'media')
        return { ...base, type: 'string', ui: { 'ui:widget': 'ftBinding', 'ui:options': { sources: BINDING_SOURCES } } }
    return { ...base, type: 'string' }
}

function makeCanvasComponent(schema: WidgetSchema) {
    const directionMap: Record<string, string> = {
        row: 'flex-row',
        col: 'flex-col',
        'row-reverse': 'flex-row-reverse',
        'col-reverse': 'flex-col-reverse',
    }
    const wrapMap: Record<string, string> = {
        nowrap: 'flex-nowrap',
        wrap: 'flex-wrap',
    }
    const alignMap: Record<string, string> = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
    }
    const justifyMap: Record<string, string> = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
    }

    return function EngineCanvas(props: any) {
        const ctx = useStoreCtx()
        const elementId = typeof props._id === 'string' ? props._id : 'preview'
        const settings: Record<string, unknown> = {}
        for (const key of Object.keys(schema.props)) settings[key] = props[key]
        const resolved = resolveBindings(settings, ctx)
        const css = compileCss(schema, resolved, elementId)
        const children = schema.acceptsChildren ? props.children : undefined

        // Apply layout classes for container widgets.
        let layoutCls = ''
        if (schema.type === 'container') {
            const layout = (props.layout as string) || 'block'
            if (layout === 'flex') {
                const dir = directionMap[(props.flexDirection as string) || 'row'] || 'flex-row'
                const wrap = wrapMap[(props.flexWrap as string) || 'nowrap'] || 'flex-nowrap'
                const align = alignMap[(props.alignItems as string) || 'stretch'] || 'items-stretch'
                const justify = justifyMap[(props.justifyContent as string) || 'start'] || 'justify-start'
                layoutCls = `flex ${dir} ${wrap} ${align} ${justify}`
            } else if (layout === 'grid') {
                const cols = (props.gridCols as string) || '3'
                const gap = (props.gap as string) || '4'
                layoutCls = `grid grid-cols-${cols} gap-${gap}`
            }
        }

        return (
            <>
                <style dangerouslySetInnerHTML={{ __html: css }} />
                {layoutCls ? (
                    <div className={layoutCls}>{renderWidget(schema, resolved, elementId, children)}</div>
                ) : (
                    renderWidget(schema, resolved, elementId, children)
                )}
            </>
        )
    }
}

/** Registra un widget del motor como bloque de ChaiBuilder. */
export function registerEngineWidget(schema: WidgetSchema): void {
    ensureEditorBindings()
    ensureControlWidgets()
    const properties: Record<string, any> = {}
    for (const [key, def] of Object.entries(schema.props)) properties[key] = mapProp(def)
    // Display conditions transversal (visibilidad por device / fechas).
    properties.conditions = { type: 'object', title: 'Visibilidad', default: {}, ui: { 'ui:widget': 'ftConditions' } }

    // CSS Grid/Flexbox layout controls for container widgets.
    if (schema.type === 'container') {
        properties.layout = {
            type: 'string',
            title: 'Layout',
            enum: ['block', 'flex', 'grid'],
            default: 'block',
        }
        properties.flexDirection = {
            type: 'string',
            title: 'Flex Direction',
            enum: ['row', 'col', 'row-reverse', 'col-reverse'],
            default: 'row',
        }
        properties.flexWrap = {
            type: 'string',
            title: 'Flex Wrap',
            enum: ['nowrap', 'wrap'],
            default: 'nowrap',
        }
        properties.gridCols = {
            type: 'string',
            title: 'Grid Columns',
            enum: ['1', '2', '3', '4', '6', '12'],
            default: '3',
        }
        properties.gap = {
            type: 'string',
            title: 'Gap',
            enum: ['0', '1', '2', '3', '4', '6', '8', '12'],
            default: '4',
        }
        properties.alignItems = {
            type: 'string',
            title: 'Align Items',
            enum: ['start', 'center', 'end', 'stretch'],
            default: 'stretch',
        }
        properties.justifyContent = {
            type: 'string',
            title: 'Justify Content',
            enum: ['start', 'center', 'end', 'between', 'around', 'evenly'],
            default: 'start',
        }
    }

    const config: any = {
        type: schema.type,
        label: schema.label,
        group: 'Motor',
        description: `Widget del motor (${schema.type}) — configurable y data-bound.`,
        props: registerChaiBlockProps({ properties }) as any,
    }
    if (schema.acceptsChildren) {
        config.canAcceptBlock = () => true
        config.blocks = () => []
    }
    registerChaiBlock(makeCanvasComponent(schema) as any, config)
}

/** Registra todos los widgets del motor en el editor (idempotente). */
let done = false
export function registerEngineWidgets(): void {
    if (done) return
    done = true
    for (const w of coreWidgets) registerEngineWidget(w)
}
/* eslint-enable @typescript-eslint/no-explicit-any */
