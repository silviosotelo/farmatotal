import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import {
    apiGetReviews,
    apiModerateReview,
    apiDeleteReview,
    type Review,
    type ReviewStatus,
} from '@/services/ReviewService'
import useSWR from 'swr'
import type { ColumnDef } from '@tanstack/react-table'

const statusOptions: { value: ReviewStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'all', label: 'Todas' },
]

const statusTag: Record<ReviewStatus, string> = {
    pending: 'bg-amber-100 text-amber-600',
    approved: 'bg-emerald-100 text-emerald-600',
    rejected: 'bg-red-100 text-red-500',
}
const statusLabel: Record<ReviewStatus, string> = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
}

const Stars = ({ n }: { n: number }) => (
    <span className="text-amber-500" aria-label={`${n} de 5`}>
        {'★★★★★'.slice(0, n)}
        <span className="text-gray-300">{'★★★★★'.slice(n)}</span>
    </span>
)

const Reviews = () => {
    const [filter, setFilter] = useState<ReviewStatus | 'all'>('pending')
    const [busy, setBusy] = useState<string | null>(null)
    const [pageIndex, setPageIndex] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const { data, isLoading, mutate } = useSWR(
        ['/reviews/all', filter],
        () => apiGetReviews(filter === 'all' ? undefined : { status: filter }),
        { revalidateOnFocus: false },
    )
    const reviews = (data?.data ?? []) as Review[]

    const moderate = async (id: string, status: ReviewStatus) => {
        setBusy(id)
        try {
            await apiModerateReview(id, status)
            await mutate()
        } finally {
            setBusy(null)
        }
    }
    const remove = async (id: string) => {
        setBusy(id)
        try {
            await apiDeleteReview(id)
            await mutate()
        } finally {
            setBusy(null)
        }
    }

    const columns = useMemo<ColumnDef<Review>[]>(
        () => [
            {
                header: 'Autor',
                accessorKey: 'author',
                cell: (props) => {
                    const r = props.row.original
                    return (
                        <div>
                            <div className="font-semibold">{r.author}</div>
                            <div className="text-xs text-gray-400">
                                {new Date(r.createdAt).toLocaleDateString('es-PY')}
                            </div>
                        </div>
                    )
                },
            },
            {
                header: 'Puntuación',
                accessorKey: 'rating',
                cell: (props) => <Stars n={Math.round(props.row.original.rating)} />,
            },
            {
                header: 'Opinión',
                accessorKey: 'body',
                cell: (props) => {
                    const r = props.row.original
                    return (
                        <div className="max-w-md">
                            {r.title && <div className="font-medium">{r.title}</div>}
                            <div className="text-gray-500">{r.body}</div>
                        </div>
                    )
                },
            },
            {
                header: 'Estado',
                accessorKey: 'status',
                cell: (props) => (
                    <Tag className={statusTag[props.row.original.status]}>
                        {statusLabel[props.row.original.status]}
                    </Tag>
                ),
            },
            {
                header: 'Acciones',
                id: 'actions',
                cell: (props) => {
                    const r = props.row.original
                    return (
                        <div className="flex justify-end gap-2">
                            {r.status !== 'approved' && (
                                <Button size="xs" variant="solid" loading={busy === r.id} onClick={() => moderate(r.id, 'approved')}>
                                    Aprobar
                                </Button>
                            )}
                            {r.status !== 'rejected' && (
                                <Button size="xs" loading={busy === r.id} onClick={() => moderate(r.id, 'rejected')}>
                                    Rechazar
                                </Button>
                            )}
                            <Button size="xs" variant="plain" loading={busy === r.id} onClick={() => remove(r.id)}>
                                Borrar
                            </Button>
                        </div>
                    )
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [busy],
    )

    const start = (pageIndex - 1) * pageSize
    const pageRows = reviews.slice(start, start + pageSize)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h3 className="mb-1">Valoraciones</h3>
                    <p className="text-gray-500">{reviews.length} valoraciones</p>
                </div>
                <div className="w-48">
                    <label className="text-sm">Estado</label>
                    <Select
                        options={statusOptions}
                        value={statusOptions.find((o) => o.value === filter)}
                        onChange={(o) => {
                            setFilter((o?.value as ReviewStatus | 'all') ?? 'pending')
                            setPageIndex(1)
                        }}
                    />
                </div>
            </div>

            <Card>
                <DataTable<Review>
                    columns={columns}
                    data={pageRows}
                    loading={isLoading}
                    pagingData={{ total: reviews.length, pageIndex, pageSize }}
                    onPaginationChange={setPageIndex}
                    onSelectChange={(size) => {
                        setPageSize(size)
                        setPageIndex(1)
                    }}
                />
            </Card>
        </div>
    )
}

export default Reviews
