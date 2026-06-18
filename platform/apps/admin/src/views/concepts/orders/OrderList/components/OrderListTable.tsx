import { useMemo } from 'react'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import DataTable from '@/components/shared/DataTable'
import useOrderlist from '../hooks/useOrderlist'
import cloneDeep from 'lodash/cloneDeep'
import { useNavigate } from 'react-router'
import { TbTrash, TbEye } from 'react-icons/tb'
import dayjs from 'dayjs'
import { NumericFormat } from 'react-number-format'
import type { OnSortParam, ColumnDef } from '@/components/shared/DataTable'
import type { Order } from '../types'
import type { TableQueries } from '@/@types/common'

const orderStatusColor: Record<
    number,
    {
        label: string
        bgClass: string
        textClass: string
    }
> = {
    0: { label: 'Pendiente', bgClass: 'bg-warning-subtle', textClass: 'text-warning' },
    1: { label: 'Pagado', bgClass: 'bg-success-subtle', textClass: 'text-success' },
    2: { label: 'Procesando', bgClass: 'bg-info-subtle', textClass: 'text-info' },
    3: { label: 'Preparado', bgClass: 'bg-info-subtle', textClass: 'text-info' },
    4: { label: 'Entregado', bgClass: 'bg-success-subtle', textClass: 'text-success' },
    5: { label: 'Cancelado', bgClass: 'bg-error-subtle', textClass: 'text-error' },
    6: { label: 'Reembolsado', bgClass: 'bg-gray-100', textClass: 'text-gray-500' },
}

// Fallback defensivo por si llega un status fuera de rango.
const statusOf = (n: number) => orderStatusColor[n] ?? orderStatusColor[0]

const OrderColumn = ({ row }: { row: Order }) => {
    const navigate = useNavigate()

    const onView = () => {
        navigate(`/concepts/orders/order-details/${row.id}`)
    }

    return (
        <span
            className="cursor-pointer font-bold heading-text hover:text-primary"
            onClick={onView}
        >
            #{row.orderNumber}
        </span>
    )
}

const ActionColumn = ({ row }: { row: Order }) => {
    const navigate = useNavigate()

    const onDelete = () => {}

    const onView = () => {
        navigate(`/concepts/orders/order-details/${row.id}`)
    }

    return (
        <div className="flex justify-end text-lg gap-1">
            <Tooltip wrapperClass="flex" title="View">
                <span className={`cursor-pointer p-2`} onClick={onView}>
                    <TbEye />
                </span>
            </Tooltip>
            <Tooltip wrapperClass="flex" title="Delete">
                <span
                    className="cursor-pointer p-2 hover:text-red-500"
                    onClick={onDelete}
                >
                    <TbTrash />
                </span>
            </Tooltip>
        </div>
    )
}

const PaymentMethodImage = ({
    paymentMehod,
    className,
}: {
    paymentMehod: string
    className: string
}) => {
    switch (paymentMehod) {
        case 'visa':
            return (
                <img
                    className={className}
                    src="/img/others/img-8.png"
                    alt={paymentMehod}
                />
            )
        case 'master':
            return (
                <img
                    className={className}
                    src="/img/others/img-9.png"
                    alt={paymentMehod}
                />
            )
        case 'paypal':
            return (
                <img
                    className={className}
                    src="/img/others/img-10.png"
                    alt={paymentMehod}
                />
            )
        default:
            return <></>
    }
}

const OrderListTable = () => {
    const { orderList, orderListTotal, tableData, isLoading, setTableData } =
        useOrderlist()

    const columns: ColumnDef<Order>[] = useMemo(
        () => [
            {
                header: 'Order',
                accessorKey: 'id',
                cell: (props) => <OrderColumn row={props.row.original} />,
            },
            {
                header: 'Date',
                accessorKey: 'date',
                cell: (props) => {
                    const row = props.row.original
                    return (
                        <span className="font-semibold">
                            {dayjs.unix(row.date).format('DD/MM/YYYY')}
                        </span>
                    )
                },
            },
            {
                header: 'Customer',
                accessorKey: 'customer',
                cell: (props) => {
                    const row = props.row.original
                    return <span className="font-semibold">{row.customer}</span>
                },
            },
            {
                header: 'Status',
                accessorKey: 'status',
                cell: (props) => {
                    const { status } = props.row.original
                    const s = statusOf(status)
                    return (
                        <Tag className={s.bgClass}>
                            <span className={`capitalize font-semibold ${s.textClass}`}>
                                {s.label}
                            </span>
                        </Tag>
                    )
                },
            },
            {
                header: 'Payment Method',
                accessorKey: 'paymentMehod',
                cell: (props) => {
                    const { paymentMehod, paymentIdendifier } =
                        props.row.original
                    return (
                        <span className="flex items-center gap-2">
                            <PaymentMethodImage
                                className="max-h-[20px]"
                                paymentMehod={paymentMehod}
                            />
                            <span className="font-semibold">
                                {paymentIdendifier}
                            </span>
                        </span>
                    )
                },
            },
            {
                header: 'Total',
                accessorKey: 'totalAmount',
                cell: (props) => {
                    const { totalAmount } = props.row.original
                    return (
                        <NumericFormat
                            className="heading-text font-bold"
                            displayType="text"
                            value={(
                                Math.round(totalAmount * 100) / 100
                            ).toFixed(2)}
                            prefix={'$'}
                            thousandSeparator={true}
                        />
                    )
                },
            },
            {
                header: '',
                id: 'action',
                cell: (props) => <ActionColumn row={props.row.original} />,
            },
        ],
        [],
    )

    const handleSetTableData = (data: TableQueries) => {
        setTableData(data)
    }

    const handlePaginationChange = (page: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageIndex = page
        handleSetTableData(newTableData)
    }

    const handleSelectChange = (value: number) => {
        const newTableData = cloneDeep(tableData)
        newTableData.pageSize = Number(value)
        newTableData.pageIndex = 1
        handleSetTableData(newTableData)
    }

    const handleSort = (sort: OnSortParam) => {
        const newTableData = cloneDeep(tableData)
        newTableData.sort = sort
        handleSetTableData(newTableData)
    }

    return (
        <DataTable
            columns={columns}
            data={orderList}
            noData={!isLoading && orderList.length === 0}
            skeletonAvatarColumns={[0]}
            skeletonAvatarProps={{ width: 28, height: 28 }}
            loading={isLoading}
            pagingData={{
                total: orderListTotal,
                pageIndex: tableData.pageIndex as number,
                pageSize: tableData.pageSize as number,
            }}
            onPaginationChange={handlePaginationChange}
            onSelectChange={handleSelectChange}
            onSort={handleSort}
        />
    )
}

export default OrderListTable
