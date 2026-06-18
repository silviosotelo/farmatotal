import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import NumericInput from '@/components/shared/NumericInput'
import { Controller } from 'react-hook-form'
import type { FormSectionBaseProps } from '../types'

const statusOptions = [
    { value: 'published', label: 'Publicado' },
    { value: 'draft', label: 'Borrador' },
    { value: 'archived', label: 'Archivado' },
]

const ToggleRow = ({
    label,
    hint,
    children,
}: {
    label: string
    hint?: string
    children: React.ReactNode
}) => (
    <div className="flex items-center justify-between gap-4 py-2">
        <div>
            <div className="text-sm font-medium">{label}</div>
            {hint && <div className="text-xs text-gray-400">{hint}</div>}
        </div>
        {children}
    </div>
)

const ProductDetailsSection = ({ control }: FormSectionBaseProps) => {
    return (
        <Card>
            <h4 className="mb-6">Detalles del producto</h4>

            <div className="md:flex gap-4">
                <FormItem label="Código interno (ERP)" className="w-full">
                    <Controller
                        name="codInterno"
                        control={control}
                        render={({ field }) => (
                            <Input
                                placeholder="Cód. interno del ERP"
                                autoComplete="off"
                                value={field.value ?? ''}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </FormItem>
                <FormItem label="Estado" className="w-full">
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={statusOptions}
                                value={statusOptions.find((o) => o.value === field.value)}
                                onChange={(o) => field.onChange(o?.value ?? 'published')}
                            />
                        )}
                    />
                </FormItem>
            </div>

            <FormItem label="Precio normal (₲) — se muestra tachado">
                <Controller
                    name="priceNormal"
                    control={control}
                    render={({ field }) => (
                        <NumericInput
                            thousandSeparator
                            type="text"
                            inputPrefix="₲ "
                            autoComplete="off"
                            placeholder="0"
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />
            </FormItem>

            <div className="rounded-lg border border-gray-200 px-4 mt-2">
                <ToggleRow label="Destacado" hint="Aparece en 'destacados'">
                    <Controller
                        name="featured"
                        control={control}
                        render={({ field }) => (
                            <Switcher checked={!!field.value} onChange={field.onChange} />
                        )}
                    />
                </ToggleRow>
                <ToggleRow label="Controlado" hint="Medicamento controlado (requiere receta)">
                    <Controller
                        name="controlled"
                        control={control}
                        render={({ field }) => (
                            <Switcher checked={!!field.value} onChange={field.onChange} />
                        )}
                    />
                </ToggleRow>
                <ToggleRow label="En promoción" hint="Marca el producto como oferta">
                    <Controller
                        name="onPromo"
                        control={control}
                        render={({ field }) => (
                            <Switcher checked={!!field.value} onChange={field.onChange} />
                        )}
                    />
                </ToggleRow>
            </div>

            <FormItem label="Código de promoción" className="mt-4">
                <Controller
                    name="promoCode"
                    control={control}
                    render={({ field }) => (
                        <Input
                            placeholder="Ej. SUPER-ROMBO"
                            autoComplete="off"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default ProductDetailsSection
