import { useState } from 'react'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import OrderForm from '../OrderForm'
import { apiCreateOrder } from '@/services/OrderService'
import { useOrderFormStore } from '../OrderForm/store/orderFormStore'
import { useNavigate } from 'react-router'
import { TbTrash } from 'react-icons/tb'
import type { OrderFormSchema } from '../OrderForm'

const OrderCreate = () => {
    const navigate = useNavigate()
    const { selectedProduct } = useOrderFormStore()

    const [discardConfirmationOpen, setDiscardConfirmationOpen] =
        useState(false)
    const [isSubmiting, setIsSubmiting] = useState(false)

    const handleFormSubmit = async (values: OrderFormSchema) => {
        setIsSubmiting(true)
        try {
            await apiCreateOrder({
                customerName: `${values.firstName} ${values.lastName}`.trim(),
                customerEmail: values.email,
                paymentMethod: values.paymentMethod,
                lines: selectedProduct.map((p) => ({
                    productId: p.id,
                    quantity: p.quantity,
                    unitPrice: p.price,
                })),
            })
            toast.push(
                <Notification type="success">Pedido creado</Notification>,
                { placement: 'top-center' },
            )
            navigate('/concepts/orders/order-list')
        } catch (e) {
            toast.push(
                <Notification type="danger">
                    {(e as Error)?.message || 'Error al crear pedido'}
                </Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setIsSubmiting(false)
        }
    }

    const handleConfirmDiscard = () => {
        setDiscardConfirmationOpen(true)
        toast.push(
            <Notification type="success">Order discarded!</Notification>,
            { placement: 'top-center' },
        )
        navigate('/concepts/orders/order-list')
    }

    const handleDiscard = () => {
        setDiscardConfirmationOpen(true)
    }

    const handleCancel = () => {
        setDiscardConfirmationOpen(false)
    }

    return (
        <>
            <OrderForm onFormSubmit={handleFormSubmit}>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <span></span>
                        <div className="flex items-center">
                            <Button
                                className="ltr:mr-3 rtl:ml-3"
                                type="button"
                                customColorClass={() =>
                                    'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'
                                }
                                icon={<TbTrash />}
                                onClick={handleDiscard}
                            >
                                Descartar
                            </Button>
                            <Button
                                variant="solid"
                                type="submit"
                                loading={isSubmiting}
                            >
                                Crear
                            </Button>
                        </div>
                    </div>
                </Container>
            </OrderForm>
            <ConfirmDialog
                isOpen={discardConfirmationOpen}
                type="danger"
                title="Discard changes"
                onClose={handleCancel}
                onRequestClose={handleCancel}
                onCancel={handleCancel}
                onConfirm={handleConfirmDiscard}
            >
                <p>
                    Are you sure you want discard this? This action can&apos;t
                    be undo.{' '}
                </p>
            </ConfirmDialog>
        </>
    )
}

export default OrderCreate
