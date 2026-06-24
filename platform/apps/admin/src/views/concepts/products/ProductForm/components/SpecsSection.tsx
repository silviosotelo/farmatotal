import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { FormItem } from '@/components/ui/Form'
import { Controller, useFieldArray } from 'react-hook-form'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import {
    DEFAULT_PRODUCT_TYPE,
    useTenantProductTypes,
} from '@/services/currency'
import type { FormSectionBaseProps } from '../types'

/**
 * Ficha técnica del producto: tipo de producto (white-label, gateado por el
 * tenant) + atributos flexibles (filas etiqueta/valor).
 */
const SpecsSection = ({ control }: FormSectionBaseProps) => {
    const { options: productTypeOptions, enabled: showProductType } =
        useTenantProductTypes()
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'attributes',
    })

    return (
        <Card>
            <h4 className="mb-6">Ficha técnica</h4>

            {showProductType && (
                <FormItem label="Tipo de producto" className="w-full">
                    <Controller
                        name="productType"
                        control={control}
                        render={({ field }) => (
                            <Select
                                options={productTypeOptions}
                                value={productTypeOptions.find(
                                    (o) =>
                                        o.value ===
                                        (field.value ?? DEFAULT_PRODUCT_TYPE),
                                )}
                                onChange={(o) =>
                                    field.onChange(o?.value ?? DEFAULT_PRODUCT_TYPE)
                                }
                            />
                        )}
                    />
                </FormItem>
            )}

            <p className="text-xs text-gray-400 mb-4">
                Pares de etiqueta y valor (ej. &quot;Principio activo&quot; /
                &quot;Ibuprofeno 400mg&quot;). Las filas sin etiqueta se descartan
                al guardar.
            </p>

            <div className="flex flex-col gap-3">
                {fields.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-start">
                        <Controller
                            name={`attributes.${index}.label`}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    placeholder="Etiqueta"
                                    autoComplete="off"
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        <Controller
                            name={`attributes.${index}.value`}
                            control={control}
                            render={({ field }) => (
                                <Input
                                    placeholder="Valor"
                                    autoComplete="off"
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                        <Button
                            type="button"
                            shape="circle"
                            size="md"
                            icon={<HiOutlineTrash />}
                            aria-label="Quitar fila"
                            onClick={() => remove(index)}
                        />
                    </div>
                ))}
            </div>

            <Button
                type="button"
                size="md"
                className="mt-4"
                icon={<HiOutlinePlus />}
                onClick={() => append({ label: '', value: '' })}
            >
                Agregar fila
            </Button>
        </Card>
    )
}

export default SpecsSection
