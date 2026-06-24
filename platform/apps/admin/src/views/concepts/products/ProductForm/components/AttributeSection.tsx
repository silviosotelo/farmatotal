import useSWR from 'swr'
import { apiGetCategories } from '@/services/CategoryService'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tooltip from '@/components/ui/Tooltip'
import { FormItem } from '@/components/ui/Form'
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi'
import { Controller } from 'react-hook-form'
import CreatableSelect from 'react-select/creatable'
import type { FormSectionBaseProps } from '../types'

type AttributeSectionProps = FormSectionBaseProps

type Options = {
    label: string
    value: string
}[]

const AttributeSection = ({ control, errors }: AttributeSectionProps) => {
    const { data: catData } = useSWR('/catalog/categories', () => apiGetCategories(), { revalidateOnFocus: false })
    const categories = ((catData?.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({ label: c.name, value: c.id }))
    const tags: Options = []
    return (
        <Card>
            <h4 className="mb-6">Atributos</h4>
            <FormItem
                label="Categoría"
                invalid={Boolean(errors.category)}
                errorMessage={errors.category?.message}
            >
                <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                        <Select
                            options={categories}
                            value={categories.filter(
                                (category) => category.value === field.value,
                            )}
                            onChange={(option) => field.onChange(option?.value)}
                        />
                    )}
                />
            </FormItem>
            <FormItem
                label="Etiquetas"
                extra={
                    <Tooltip
                        title="You add as many tags as you want to a product"
                        className="text-center"
                    >
                        <HiOutlineQuestionMarkCircle className="text-base mx-1" />
                    </Tooltip>
                }
            >
                <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                        <Select
                            isMulti
                            isClearable
                            value={field.value}
                            placeholder="Agregar etiquetas…"
                            componentAs={CreatableSelect}
                            options={tags}
                            onChange={(option) => field.onChange(option)}
                        />
                    )}
                />
            </FormItem>
            <FormItem
                label="Marca"
                invalid={Boolean(errors.brand)}
                errorMessage={errors.brand?.message}
            >
                <Controller
                    name="brand"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="Marca"
                            {...field}
                        />
                    )}
                />
            </FormItem>
        </Card>
    )
}

export default AttributeSection
