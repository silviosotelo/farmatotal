import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Table from '@/components/ui/Table'
import { FormItem } from '@/components/ui/Form'
import Tag from '@/components/ui/Tag'
import Loading from '@/components/shared/Loading'
import EmptyState from '@/components/shared/EmptyState'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi'
import {
    apiGetVariants,
    apiCreateVariant,
    apiUpdateVariant,
    apiDeleteVariant,
    apiSearchProductsForVariants,
    type Variant,
} from '@/services/VariantService'
import { apiGetAttributes } from '@/services/AttributeService'
import useSWR from 'swr'
import { slug } from '@/utils/slug'

const { Tr, Th, Td, THead, TBody } = Table

type ProductLite = { id: string; title: string; sku: string }
type AttrDef = { name: string; values: string[] }

/** Firma estable de un set de atributos para deduplicar combinaciones. */
const sig = (attrs: Record<string, string> | null | undefined) =>
    Object.entries(attrs ?? {})
        .map(([k, v]) => `${k.toLowerCase()}=${String(v).toLowerCase()}`)
        .sort()
        .join(';')

/** Producto cartesiano de los valores de cada atributo. */
function cartesian(defs: AttrDef[]): Record<string, string>[] {
    const usable = defs.filter((d) => d.name.trim() && d.values.length)
    if (!usable.length) return []
    return usable.reduce<Record<string, string>[]>(
        (acc, def) =>
            acc.flatMap((combo) => def.values.map((val) => ({ ...combo, [def.name.trim()]: val }))),
        [{}],
    )
}

const VariantRow = ({
    v,
    attrNames,
    onChanged,
}: {
    v: Variant
    attrNames: string[]
    onChanged: () => void
}) => {
    const [sku, setSku] = useState(v.sku)
    const [priceWeb, setPriceWeb] = useState(String(v.priceWeb))
    const [stock, setStock] = useState(String(v.stockCached))
    const [busy, setBusy] = useState(false)

    const save = async () => {
        setBusy(true)
        try {
            await apiUpdateVariant(v.id, {
                sku,
                priceWeb: Number(priceWeb) || 0,
                stockCached: Number(stock) || 0,
            })
            toast.push(<Notification type="success">Variante guardada</Notification>, { placement: 'top-center' })
            onChanged()
        } finally {
            setBusy(false)
        }
    }
    const toggle = async () => {
        setBusy(true)
        try {
            await apiUpdateVariant(v.id, { active: !v.active })
            onChanged()
        } finally {
            setBusy(false)
        }
    }
    const remove = async () => {
        setBusy(true)
        try {
            await apiDeleteVariant(v.id)
            onChanged()
        } finally {
            setBusy(false)
        }
    }

    return (
        <Tr className="border-b last:border-0">
            {attrNames.map((name) => (
                <Td key={name} className="py-2 pr-2 text-sm">
                    {v.attributes?.[name] ? (
                        <Tag className="bg-indigo-50 text-indigo-600">{v.attributes[name]}</Tag>
                    ) : (
                        <span className="text-gray-300">—</span>
                    )}
                </Td>
            ))}
            <Td className="py-2 pr-2">
                <Input size="md" value={sku} onChange={(e) => setSku(e.target.value)} />
            </Td>
            <Td className="py-2 pr-2 w-28">
                <Input size="md" type="number" value={priceWeb} onChange={(e) => setPriceWeb(e.target.value)} placeholder="hereda" />
            </Td>
            <Td className="py-2 pr-2 w-20">
                <Input size="md" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Td>
            <Td className="py-2">
                <Tag className={v.active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}>
                    {v.active ? 'Activa' : 'Inactiva'}
                </Tag>
            </Td>
            <Td className="py-2">
                <div className="flex justify-end gap-2">
                    <Button size="md" variant="solid" loading={busy} onClick={save}>
                        Guardar
                    </Button>
                    <Button size="md" loading={busy} onClick={toggle}>
                        {v.active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button size="md" variant="plain" loading={busy} onClick={remove}>
                        <HiOutlineTrash />
                    </Button>
                </div>
            </Td>
        </Tr>
    )
}

const Variants = () => {
    const [query, setQuery] = useState('')
    const [search, setSearch] = useState('')
    const [picked, setPicked] = useState<ProductLite | null>(null)

    const [defs, setDefs] = useState<AttrDef[]>([])
    const [generating, setGenerating] = useState(false)
    const [bulkPrice, setBulkPrice] = useState('')
    const [bulkStock, setBulkStock] = useState('')
    const [bulkBusy, setBulkBusy] = useState(false)

    const { data: prodData, isLoading: searching } = useSWR(
        search ? ['variant-product-search', search] : null,
        () => apiSearchProductsForVariants(search),
        { revalidateOnFocus: false },
    )
    const products = (prodData ?? []) as ProductLite[]

    const {
        data: varData,
        isLoading: loadingVars,
        mutate,
    } = useSWR(picked ? ['variants', picked.id] : null, () => apiGetVariants(picked!.id), {
        revalidateOnFocus: false,
    })
    const variants = useMemo(() => (varData?.data ?? []) as Variant[], [varData])

    // Deriva los atributos definidos de las variantes existentes (Woo: las
    // variaciones cargan sus atributos). Pre-rellena el builder al elegir producto.
    useEffect(() => {
        if (!picked) return
        const map = new Map<string, Set<string>>()
        for (const v of variants) {
            for (const [k, val] of Object.entries(v.attributes ?? {})) {
                if (!map.has(k)) map.set(k, new Set())
                map.get(k)!.add(val)
            }
        }
        if (map.size) {
            setDefs(Array.from(map.entries()).map(([name, vals]) => ({ name, values: Array.from(vals) })))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [picked?.id, varData])

    const attrNames = useMemo(() => {
        const names = new Set<string>()
        defs.forEach((d) => d.name.trim() && names.add(d.name.trim()))
        variants.forEach((v) => Object.keys(v.attributes ?? {}).forEach((k) => names.add(k)))
        return Array.from(names)
    }, [defs, variants])

    const existingSigs = useMemo(() => new Set(variants.map((v) => sig(v.attributes))), [variants])
    const combos = useMemo(() => cartesian(defs), [defs])
    const pending = combos.filter((c) => !existingSigs.has(sig(c)))

    const { data: globalAttrs } = useSWR('/attributes', apiGetAttributes, { revalidateOnFocus: false })
    const addAttr = () => setDefs((d) => [...d, { name: '', values: [] }])
    const addGlobal = (name: string, values: string[]) =>
        setDefs((d) =>
            d.some((a) => a.name.trim().toLowerCase() === name.toLowerCase())
                ? d
                : [...d, { name, values: [...values] }],
        )
    const setAttrName = (i: number, name: string) =>
        setDefs((d) => d.map((a, k) => (k === i ? { ...a, name } : a)))
    const setAttrValues = (i: number, raw: string) =>
        setDefs((d) =>
            d.map((a, k) =>
                k === i
                    ? { ...a, values: raw.split(',').map((s) => s.trim()).filter(Boolean) }
                    : a,
            ),
        )
    const removeAttr = (i: number) => setDefs((d) => d.filter((_, k) => k !== i))

    const generate = async () => {
        if (!picked || pending.length === 0) return
        setGenerating(true)
        try {
            for (const combo of pending) {
                const values = Object.values(combo)
                await apiCreateVariant({
                    productId: picked.id,
                    title: values.join(' / '),
                    sku: `${picked.sku}-${values.map(slug).join('-')}`,
                    attributes: combo,
                    priceWeb: 0, // 0 = hereda el precio del padre
                    stockCached: 0,
                })
            }
            toast.push(
                <Notification type="success">{pending.length} variaciones generadas</Notification>,
                { placement: 'top-center' },
            )
            await mutate()
        } finally {
            setGenerating(false)
        }
    }

    const applyBulk = async (field: 'priceWeb' | 'stockCached', value: number) => {
        if (!variants.length) return
        setBulkBusy(true)
        try {
            for (const v of variants) {
                await apiUpdateVariant(v.id, { [field]: value })
            }
            toast.push(<Notification type="success">Aplicado a {variants.length} variantes</Notification>, { placement: 'top-center' })
            await mutate()
        } finally {
            setBulkBusy(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Variantes de producto</h3>
                <p className="text-gray-500">
                    Definí atributos (talle/color, mg/cantidad…) y generá la matriz de variaciones automáticamente.
                </p>
            </div>

            <Card>
                <h6 className="mb-3">1. Elegí el producto</h6>
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar por nombre o SKU…"
                            onKeyDown={(e) => e.key === 'Enter' && setSearch(query.trim())}
                        />
                    </div>
                    <Button variant="solid" onClick={() => setSearch(query.trim())}>
                        Buscar
                    </Button>
                </div>
                <Loading loading={searching} type="cover">
                    {products.length > 0 && (
                        <ul className="mt-3 divide-y">
                            {products.map((p) => (
                                <li
                                    key={p.id}
                                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 px-2 rounded"
                                    onClick={() => {
                                        setPicked(p)
                                        setDefs([])
                                    }}
                                >
                                    <span className="text-sm">{p.title}</span>
                                    <span className="text-xs text-gray-400">{p.sku}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Loading>
            </Card>

            {picked && (
                <>
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h6 className="mb-0">
                                2. Atributos de: <span className="text-indigo-600">{picked.title}</span>
                            </h6>
                            <Button size="md" variant="plain" onClick={() => setPicked(null)}>
                                Cambiar producto
                            </Button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {defs.map((a, i) => (
                                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                    <div className="md:col-span-3">
                                        <FormItem label="Atributo">
                                            <Input
                                                value={a.name}
                                                onChange={(e) => setAttrName(i, e.target.value)}
                                                placeholder="Color"
                                            />
                                        </FormItem>
                                    </div>
                                    <div className="md:col-span-8">
                                        <FormItem label="Valores (separados por coma)">
                                            <Input
                                                defaultValue={a.values.join(', ')}
                                                onBlur={(e) => setAttrValues(i, e.target.value)}
                                                placeholder="Rojo, Azul, Verde"
                                            />
                                        </FormItem>
                                    </div>
                                    <div className="md:col-span-1">
                                        <Button size="md" variant="plain" icon={<HiOutlineTrash />} onClick={() => removeAttr(i)} />
                                    </div>
                                </div>
                            ))}
                            <div className="flex flex-wrap items-center gap-2">
                                <Button size="md" icon={<HiOutlinePlus />} onClick={addAttr}>
                                    Agregar atributo
                                </Button>
                                {(globalAttrs?.attributes ?? []).length > 0 && (
                                    <>
                                        <span className="text-xs text-gray-400">del catálogo:</span>
                                        {globalAttrs!.attributes.map((g) => (
                                            <Button
                                                key={g.id}
                                                size="md"
                                                onClick={() => addGlobal(g.name, g.values)}
                                            >
                                                + {g.name}
                                            </Button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3 border-t pt-4">
                            <Button
                                variant="solid"
                                loading={generating}
                                disabled={pending.length === 0}
                                onClick={generate}
                            >
                                Generar matriz ({pending.length} nuevas de {combos.length})
                            </Button>
                            <span className="text-sm text-gray-400">
                                {combos.length > 0
                                    ? `${combos.length} combinaciones · ${existingSigs.size} ya existen`
                                    : 'Definí atributos y valores para generar variaciones'}
                            </span>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                            <h6 className="mb-0">3. Variaciones ({variants.length})</h6>
                            {variants.length > 0 && (
                                <div className="flex flex-wrap items-end gap-2">
                                    <div>
                                        <FormItem label="Precio a todas">
                                            <Input size="md" type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="w-28" />
                                        </FormItem>
                                    </div>
                                    <Button size="md" loading={bulkBusy} onClick={() => applyBulk('priceWeb', Number(bulkPrice) || 0)}>
                                        Aplicar
                                    </Button>
                                    <div className="ml-2">
                                        <FormItem label="Stock a todas">
                                            <Input size="md" type="number" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} className="w-24" />
                                        </FormItem>
                                    </div>
                                    <Button size="md" loading={bulkBusy} onClick={() => applyBulk('stockCached', Number(bulkStock) || 0)}>
                                        Aplicar
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Loading loading={loadingVars}>
                            <div className="overflow-x-auto">
                                <Table>
                                    <THead>
                                        <Tr className="text-left text-gray-400 border-b">
                                            {attrNames.map((n) => (
                                                <Th key={n} className="py-2 pr-2">{n}</Th>
                                            ))}
                                            <Th>SKU</Th>
                                            <Th>Precio web</Th>
                                            <Th>Stock</Th>
                                            <Th>Estado</Th>
                                            <Th className="text-right">Acciones</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {variants.map((v) => (
                                            <VariantRow key={v.id} v={v} attrNames={attrNames} onChanged={() => mutate()} />
                                        ))}
                                        {variants.length === 0 && (
                                            <Tr>
                                                <Td colSpan={attrNames.length + 5}>
                                                    <EmptyState
                                                        compact
                                                        title="Este producto no tiene variaciones"
                                                        description="Definí atributos arriba (color, talle, presentación…) y generá la matriz de variaciones automáticamente."
                                                    />
                                                </Td>
                                            </Tr>
                                        )}
                                    </TBody>
                                </Table>
                            </div>
                        </Loading>
                    </Card>
                </>
            )}
        </div>
    )
}

export default Variants
