import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import Loading from '@/components/shared/Loading'
import { apiGetSetting, apiSetSetting } from '@/services/CmsService'
import useSWR from 'swr'

type BrandColors = {
    orange?: string
    orangeInk?: string
    yellow?: string
    blue?: string
    text?: string
    muted?: string
    gradient?: string
}
type StoreConfigValue = {
    brandName?: string
    tagline?: string
    description?: string
    logoUrl?: string
    faviconUrl?: string
    currency?: string
    locale?: string
    colors?: BrandColors
    theme?: string
}

const THEMES: { key: string; name: string; description: string; color: string }[] = [
    { key: 'base', name: 'Farmatotal', description: 'Pharmacy — default', color: '#E8590C' },
    { key: 'ekomart', name: 'Ekomart', description: 'Grocery — dense, Bootstrap', color: '#2B8A3E' },
    { key: 'anvogue', name: 'Anvogue', description: 'Fashion — minimal', color: '#E94560' },
    { key: 'grostore', name: 'Grostore', description: 'Grocery — clean, modern', color: '#00A859' },
]

const CURRENCY_OPTIONS = [
    { value: 'PYG', label: 'PYG — Guaraní paraguayo' },
    { value: 'USD', label: 'USD — Dólar estadounidense' },
    { value: 'BRL', label: 'BRL — Real brasileño' },
    { value: 'ARS', label: 'ARS — Peso argentino' },
    { value: 'EUR', label: 'EUR — Euro' },
]

const LOCALE_OPTIONS = [
    { value: 'es-PY', label: 'Español (Paraguay)' },
    { value: 'pt-BR', label: 'Portugués (Brasil)' },
    { value: 'es-AR', label: 'Español (Argentina)' },
    { value: 'en-US', label: 'English (US)' },
]

const colorFields: { key: keyof BrandColors; label: string }[] = [
    { key: 'orange', label: 'Primario' },
    { key: 'orangeInk', label: 'Primario oscuro' },
    { key: 'yellow', label: 'Acento' },
    { key: 'blue', label: 'Secundario' },
    { key: 'text', label: 'Texto' },
    { key: 'muted', label: 'Texto atenuado' },
]

const StoreConfig = () => {
    const { data, isLoading, mutate } = useSWR(
        ['/cms/settings/store_config'],
        () => apiGetSetting<StoreConfigValue>('store_config'),
        { revalidateOnFocus: false },
    )

    const [cfg, setCfg] = useState<StoreConfigValue>({})
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (data?.value) setCfg(data.value)
    }, [data])

    const set = (k: keyof StoreConfigValue, v: string) =>
        setCfg((c) => ({ ...c, [k]: v }))
    const setColor = (k: keyof BrandColors, v: string) =>
        setCfg((c) => ({ ...c, colors: { ...(c.colors ?? {}), [k]: v } }))

    const save = async () => {
        setSaving(true)
        setSaved(false)
        try {
            // limpiar strings vacíos para que el storefront caiga a defaults
            const clean: StoreConfigValue = { ...cfg }
            ;(Object.keys(clean) as (keyof StoreConfigValue)[]).forEach((k) => {
                if (clean[k] === '') delete clean[k]
            })
            if (clean.colors) {
                const c = { ...clean.colors }
                ;(Object.keys(c) as (keyof BrandColors)[]).forEach((k) => {
                    if (!c[k]) delete c[k]
                })
                clean.colors = c
            }
            await apiSetSetting('store_config', clean)
            await mutate()
            setSaved(true)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Apariencia y marca</h3>
                    <p className="text-gray-500">
                        Identidad visual de la tienda (white-label): nombre, logo,
                        favicon y colores. Para datos del negocio, pagos y envíos
                        usá <strong>Ajustes</strong>. Dejá un campo vacío para el
                        valor por defecto.
                    </p>
                </div>

                <Card>
                    <h6 className="mb-3">Identidad</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <FormItem label="Nombre de marca">
                                <Input
                                    value={cfg.brandName ?? ''}
                                    onChange={(e) => set('brandName', e.target.value)}
                                    placeholder="Mi tienda"
                                />
                            </FormItem>
                        </div>
                        <div>
                            <FormItem label="Tagline">
                                <Input
                                    value={cfg.tagline ?? ''}
                                    onChange={(e) => set('tagline', e.target.value)}
                                    placeholder="tu farmacia online"
                                />
                            </FormItem>
                        </div>
                        <div className="md:col-span-2">
                            <FormItem label="Descripción (SEO)">
                                <Input
                                    value={cfg.description ?? ''}
                                    onChange={(e) => set('description', e.target.value)}
                                    placeholder="Tu tienda online…"
                                />
                            </FormItem>
                        </div>
                        <div>
                            <FormItem label="Logo (URL)">
                                <Input
                                    value={cfg.logoUrl ?? ''}
                                    onChange={(e) => set('logoUrl', e.target.value)}
                                    placeholder="/brand/logo.svg"
                                />
                            </FormItem>
                        </div>
                        <div>
                            <FormItem label="Favicon (URL)">
                                <Input
                                    value={cfg.faviconUrl ?? ''}
                                    onChange={(e) => set('faviconUrl', e.target.value)}
                                    placeholder="/brand/isotipo.svg"
                                />
                            </FormItem>
                        </div>
                        <div>
                            <FormItem label="Moneda">
                                <Select options={CURRENCY_OPTIONS} value={CURRENCY_OPTIONS.find((o) => o.value === (cfg.currency ?? 'PYG'))} onChange={(o) => set('currency', o?.value ?? 'PYG')} />
                            </FormItem>
                        </div>
                        <div>
                            <FormItem label="Idioma / Locale">
                                <Select options={LOCALE_OPTIONS} value={LOCALE_OPTIONS.find((o) => o.value === (cfg.locale ?? 'es-PY'))} onChange={(o) => set('locale', o?.value ?? 'es-PY')} />
                            </FormItem>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h6 className="mb-1">Tema visual</h6>
                    <p className="text-gray-500 text-sm mb-3">
                        Elegí el diseño del storefront. El tema cambia header, home y
                        layout completos (multi-rubro).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {THEMES.map((t) => {
                            const active = (cfg.theme ?? 'base') === t.key
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => set('theme', t.key)}
                                    className={`text-left rounded-xl border p-4 transition ${
                                        active
                                            ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block w-3 h-3 rounded-full"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <span className="font-semibold">{t.name}</span>
                                        </div>
                                        {active && <span className="text-indigo-600 text-sm">● Activo</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                                </button>
                            )
                        })}
                    </div>
                </Card>

                <Card>
                    <h6 className="mb-3">Colores de marca</h6>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {colorFields.map((f) => (
                            <div key={f.key}>
                                <FormItem label={f.label}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            className="h-9 w-10 rounded border border-gray-200 bg-transparent"
                                            value={cfg.colors?.[f.key] || '#000000'}
                                            onChange={(e) => setColor(f.key, e.target.value)}
                                        />
                                        <Input
                                            value={cfg.colors?.[f.key] ?? ''}
                                            onChange={(e) => setColor(f.key, e.target.value)}
                                            placeholder="#f16522"
                                        />
                                    </div>
                                </FormItem>
                            </div>
                        ))}
                        <div className="col-span-2 md:col-span-3">
                            <FormItem label="Gradiente del header (CSS completo)">
                                <Input
                                    value={cfg.colors?.gradient ?? ''}
                                    onChange={(e) => setColor('gradient', e.target.value)}
                                    placeholder="linear-gradient(100deg, #f16522 0%, #ffca05 100%)"
                                />
                            </FormItem>
                        </div>
                    </div>
                </Card>

                <div className="flex items-center gap-3">
                    <Button variant="solid" loading={saving} onClick={save}>
                        Guardar
                    </Button>
                    {saved && (
                        <span className="text-emerald-600 text-sm">
                            Guardado. El storefront aplica los cambios al revalidar.
                        </span>
                    )}
                </div>
            </div>
        </Loading>
    )
}

export default StoreConfig
