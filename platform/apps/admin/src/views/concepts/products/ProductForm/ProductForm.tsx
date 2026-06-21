import { useEffect } from 'react'
import { Form } from '@/components/ui/Form'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import GeneralSection from './components/GeneralSection'
import PricingSection from './components/PricingSection'
import ImageSection from './components/ImageSection'
import AttributeSection from './components/AttributeSection'
import ProductDetailsSection from './components/ProductDetailsSection'
import SpecsSection from './components/SpecsSection'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import isEmpty from 'lodash/isEmpty'
import type { ProductFormSchema } from './types'
import type { CommonProps } from '@/@types/common'

type ProductFormProps = {
    onFormSubmit: (values: ProductFormSchema) => void
    defaultValues?: ProductFormSchema
    newProduct?: boolean
} & CommonProps

// Validación relajada — solo lo que el backend requiere.
const validationSchema = z.object({
    name: z.string().min(1, { message: 'Nombre requerido' }),
    productCode: z.string().min(1, { message: 'SKU requerido' }),
    description: z.string().optional(),
    price: z
        .union([z.string(), z.number()])
        .refine((val) => val !== '' && val !== null && val !== undefined, {
            message: 'Precio requerido',
        }),
    taxRate: z.union([z.string(), z.number()]).optional(),
    costPerItem: z.union([z.string(), z.number()]).optional(),
    bulkDiscountPrice: z.union([z.string(), z.number()]).optional(),
    imgList: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                img: z.string(),
            }),
        )
        .optional(),
    category: z.string().optional(),
    // Campos adicionales del catálogo (opcionales)
    codInterno: z.string().optional(),
    priceNormal: z.union([z.string(), z.number()]).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    controlled: z.boolean().optional(),
    featured: z.boolean().optional(),
    onPromo: z.boolean().optional(),
    promoCode: z.string().optional(),
    unit: z.string().optional(),
    unitStep: z.union([z.string(), z.number()]).optional(),
    productType: z.enum(['physical', 'digital', 'service']).optional(),
    attributes: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .optional(),
})

const ProductForm = (props: ProductFormProps) => {
    const {
        onFormSubmit,
        defaultValues = {
            imgList: [],
        },
        children,
    } = props

    const {
        handleSubmit,
        reset,
        formState: { errors },
        control,
    } = useForm<ProductFormSchema>({
        defaultValues: {
            ...defaultValues,
        },
        resolver: zodResolver(validationSchema) as unknown as Resolver<ProductFormSchema>,
    })

    useEffect(() => {
        if (!isEmpty(defaultValues)) {
            reset(defaultValues)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(defaultValues)])

    const onSubmit = (values: ProductFormSchema) => {
        onFormSubmit?.(values)
    }

    return (
        <Form
            className="flex w-full h-full"
            containerClassName="flex flex-col w-full justify-between"
            onSubmit={handleSubmit(onSubmit)}
        >
            <Container>
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="gap-4 flex flex-col flex-auto">
                        <GeneralSection control={control} errors={errors} />
                        <PricingSection control={control} errors={errors} />
                        <ProductDetailsSection control={control} errors={errors} />
                        <SpecsSection control={control} errors={errors} />
                    </div>
                    <div className="lg:min-w-[440px] 2xl:w-[500px] gap-4 flex flex-col">
                        <ImageSection control={control} errors={errors} />
                        <AttributeSection control={control} errors={errors} />
                    </div>
                </div>
            </Container>
            <BottomStickyBar>{children}</BottomStickyBar>
        </Form>
    )
}

export default ProductForm
