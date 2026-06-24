import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import DataTable from '@/components/shared/DataTable'
import {
    apiGetCoupons,
    apiCreateCoupon,
    type Coupon,
} from '@/services/CouponService'
import useSWR from 'swr'
import type { ColumnDef } from '@tanstack/react-table'

const typeOptions = [
    { value: 'percent', label: '% Porcentaje' },
    { value: 'fixed', label: '₲ Monto fijo' },
]

const gs = (n: number) => '₲ ' + (n ?? 0).toLocaleString('es-PY').replace(/,/g, '.')

const Coupons = () => {
    const { data, isLoading, mutate } = useSWR(
        ['/coupons'],
        () => apiGetCoupons(),
        { revalidateOnFocus: false },
    )
    const coupons = (data?.data ?? []) as Coupon[]

    const [code, setCode] = useState('')
    const [type, setType] = useState<'percent' | 'fixed'>('percent')
    const [value, setValue] = useState('')
    const [saving, setSaving] = useState(false)

    const create = async () => {
        if (!code.trim() || !value) return
        setSaving(true)
        try {
            await apiCreateCoupon({
                code: code.trim().toUpperCase(),
                type,
                value: Number(value),
            })
            setCode('')
            setValue('')
            await mutate()
        } finally {
            setSaving(false)
        }
    }

    const columns: ColumnDef<Coupon>[] = [
        {
            header: 'Código',
            accessorKey: 'code',
            cell: (p) => <span className="font-semibold">{p.row.original.code}</span>,
        },
        {
            header: 'Tipo',
            accessorKey: 'type',
            cell: (p) => (p.row.original.type === 'percent' ? '%' : '₲'),
        },
        {
            header: 'Valor',
            accessorKey: 'value',
            cell: (p) => {
                const c = p.row.original
                return c.type === 'percent' ? `${c.value}%` : gs(c.value)
            },
        },
        {
            header: 'Mín. subtotal',
            accessorKey: 'minSubtotal',
            cell: (p) => (p.row.original.minSubtotal ? gs(p.row.original.minSubtotal) : '—'),
        },
        {
            header: 'Usos',
            accessorKey: 'usedCount',
            cell: (p) => {
                const c = p.row.original
                return `${c.usedCount}${c.maxUses ? ` / ${c.maxUses}` : ''}`
            },
        },
        {
            header: 'Estado',
            accessorKey: 'active',
            cell: (p) => (
                <Tag
                    className={
                        p.row.original.active
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                    }
                >
                    {p.row.original.active ? 'Activo' : 'Inactivo'}
                </Tag>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">Cupones</h3>
                    <p className="text-gray-500">{coupons.length} cupones</p>
                </div>

                <Card>
                    <h6 className="mb-3">Nuevo cupón</h6>
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1">
                            <FormItem label="Código">
                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="VERANO20"
                                />
                            </FormItem>
                        </div>
                        <div className="w-44">
                            <FormItem label="Tipo">
                                <Select
                                    options={typeOptions}
                                    value={typeOptions.find((o) => o.value === type)}
                                    onChange={(o) =>
                                        setType((o?.value as 'percent' | 'fixed') ?? 'percent')
                                    }
                                />
                            </FormItem>
                        </div>
                        <div className="w-36">
                            <FormItem label="Valor">
                                <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={type === 'percent' ? '20' : '25000'}
                                />
                            </FormItem>
                        </div>
                        <Button variant="solid" loading={saving} onClick={create}>
                            Crear
                        </Button>
                    </div>
                </Card>

                <Card>
                    <DataTable<Coupon>
                        columns={columns}
                        data={coupons}
                        loading={isLoading}
                        pagingData={{
                            total: coupons.length,
                            pageIndex: 1,
                            pageSize: Math.max(coupons.length, 10),
                        }}
                    />
                </Card>
            </div>
    )
}

export default Coupons
