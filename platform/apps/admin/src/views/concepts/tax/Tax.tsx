import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import EmptyState from '@/components/shared/EmptyState'
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi'
import { apiGetTaxConfig, apiSaveTaxConfig, type TaxConfig, type TaxRate } from '@/services/TaxService'

const slug = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tasa'

const Tax = () => {
    const { data, isLoading, mutate } = useSWR('/tax/config', apiGetTaxConfig, { revalidateOnFocus: false })
    const [cfg, setCfg] = useState<TaxConfig>({ pricesIncludeTax: true, rates: [] })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (data) setCfg(data)
    }, [data])

    const setRate = (i: number, patch: Partial<TaxRate>) =>
        setCfg((c) => ({ ...c, rates: c.rates.map((r, k) => (k === i ? { ...r, ...patch } : r)) }))
    const addRate = () =>
        setCfg((c) => ({ ...c, rates: [...c.rates, { id: `tasa${c.rates.length + 1}`, name: '', percent: 0, isDefault: false }] }))
    const removeRate = (i: number) => setCfg((c) => ({ ...c, rates: c.rates.filter((_, k) => k !== i) }))
    const setDefault = (i: number) =>
        setCfg((c) => ({ ...c, rates: c.rates.map((r, k) => ({ ...r, isDefault: k === i })) }))

    const save = async () => {
        setSaving(true)
        try {
            const clean: TaxConfig = {
                pricesIncludeTax: cfg.pricesIncludeTax,
                rates: cfg.rates
                    .filter((r) => r.name.trim())
                    .map((r) => ({ ...r, id: r.id || slug(r.name), percent: Number(r.percent) || 0 })),
            }
            if (clean.rates.length && !clean.rates.some((r) => r.isDefault)) clean.rates[0].isDefault = true
            await apiSaveTaxConfig(clean)
            await mutate()
            toast.push(<Notification type="success">Impuestos guardados</Notification>, { placement: 'top-center' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Impuestos</h3>
                    <p className="text-gray-500">
                        Definí las tasas de impuesto (IVA) y si los precios cargados ya lo incluyen.
                    </p>
                </div>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <h6 className="mb-1">Precios con impuesto incluido</h6>
                            <p className="text-sm text-gray-500">
                                Activado: el precio del producto ya incluye el IVA (modo Paraguay). Desactivado:
                                el impuesto se agrega sobre el precio.
                            </p>
                        </div>
                        <Switcher
                            checked={cfg.pricesIncludeTax}
                            onChange={(checked) => setCfg((c) => ({ ...c, pricesIncludeTax: checked }))}
                        />
                    </div>
                </Card>

                <Card>
                    <h6 className="mb-3">Tasas</h6>
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-12 gap-2 text-xs text-gray-400">
                            <span className="col-span-6">Nombre</span>
                            <span className="col-span-2">%</span>
                            <span className="col-span-3">Por defecto</span>
                            <span className="col-span-1" />
                        </div>
                        {cfg.rates.map((r, i) => (
                            <div key={i} className="grid grid-cols-12 items-center gap-2">
                                <div className="col-span-6">
                                    <Input value={r.name} onChange={(e) => setRate(i, { name: e.target.value })} placeholder="IVA 10%" />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        value={String(r.percent)}
                                        onChange={(e) => setRate(i, { percent: Number(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Switcher checked={r.isDefault} onChange={() => setDefault(i)} />
                                </div>
                                <div className="col-span-1 text-right">
                                    <Button size="xs" variant="plain" icon={<HiOutlineTrash />} onClick={() => removeRate(i)} />
                                </div>
                            </div>
                        ))}
                        {cfg.rates.length === 0 && (
                            <EmptyState compact title="Sin tasas de impuesto" description="Agregá una tasa (ej. IVA 10%) para aplicarla a tus ventas." />
                        )}
                        <div>
                            <Button size="sm" icon={<HiOutlinePlus />} onClick={addRate}>
                                Agregar tasa
                            </Button>
                        </div>
                    </div>
                </Card>

                <div>
                    <Button variant="solid" loading={saving} onClick={save}>
                        Guardar
                    </Button>
                </div>
            </div>
        </Loading>
    )
}

export default Tax
