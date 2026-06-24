import { useRef, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import EmptyState from '@/components/shared/EmptyState'
import { useTenantFlags } from '@/services/features'
import { apiSearchProducts, apiGetProductInventory, apiSetInventory, apiImportInventory, inventoryExportUrl, type ProductLite, type InventoryRow } from '@/services/InventoryService'

const { Tr, Th, Td, THead, TBody } = Table

/** Parse simple de CSV con header sku,branch_code,stock (tolera comillas básicas). */
function parseInventoryCsv(text: string): { sku: string; branchCode: string; stock: number }[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
    const iSku = header.indexOf('sku')
    const iBranch = header.findIndex((h) => h === 'branch_code' || h === 'sucursal' || h === 'branchcode')
    const iStock = header.indexOf('stock')
    if (iSku < 0 || iBranch < 0 || iStock < 0) return []
    return lines.slice(1).map((l) => {
        const c = l.split(',')
        return { sku: (c[iSku] ?? '').trim().replace(/^"|"$/g, ''), branchCode: (c[iBranch] ?? '').trim().replace(/^"|"$/g, ''), stock: Number((c[iStock] ?? '0').trim()) || 0 }
    }).filter((r) => r.sku && r.branchCode)
}

const Inventory = () => {
    const flags = useTenantFlags()
    const [q, setQ] = useState('')
    const [results, setResults] = useState<ProductLite[]>([])
    const [selected, setSelected] = useState<ProductLite | null>(null)
    const [rows, setRows] = useState<InventoryRow[]>([])
    const [loading, setLoading] = useState(false)

    const search = async () => {
        if (!q.trim()) return
        setLoading(true)
        try {
            setResults(await apiSearchProducts(q.trim()))
        } finally {
            setLoading(false)
        }
    }

    const pick = async (p: ProductLite) => {
        setSelected(p)
        setRows(await apiGetProductInventory(p.id))
    }

    const setStock = async (branchId: string, stock: number) => {
        if (!selected) return
        const res = await apiSetInventory(selected.id, branchId, stock)
        setRows((rs) =>
            rs.map((r) => (r.branchId === branchId ? { ...r, stock } : r)),
        )
        toast.push(
            <Notification type="success">
                Stock actualizado · total {res.stockCached}
            </Notification>,
            { placement: 'top-center' },
        )
    }

    const fileRef = useRef<HTMLInputElement>(null)
    const [importing, setImporting] = useState(false)
    const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImporting(true)
        try {
            const rows = parseInventoryCsv(await file.text())
            if (rows.length === 0) {
                toast.push(<Notification type="warning">CSV vacío o sin columnas sku,branch_code,stock</Notification>, { placement: 'top-center' })
                return
            }
            const res = await apiImportInventory(rows)
            toast.push(<Notification type="success">Importado: {res.ok} filas{res.failed ? ` · ${res.failed} con error` : ''}</Notification>, { placement: 'top-center' })
        } finally {
            setImporting(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    if (!flags.inventory) {
        return (
            <Card>
                <h3 className="mb-1">Inventario</h3>
                <p>Función no habilitada para esta tienda.</p>
            </Card>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h3 className="mb-1">Inventario por sucursal</h3>
                    <p className="text-gray-500">
                        Buscá un producto y ajustá su stock, o importá/exportá en lote (CSV).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="md" onClick={() => window.open(inventoryExportUrl(), '_blank')}>Exportar CSV</Button>
                    <Button size="md" variant="solid" loading={importing} onClick={() => fileRef.current?.click()}>
                        Importar CSV
                    </Button>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
                </div>
            </div>

            <Card>
                <div className="flex gap-2">
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && search()}
                        placeholder="Buscar por nombre o SKU…"
                    />
                    <Button variant="solid" loading={loading} onClick={search}>
                        Buscar
                    </Button>
                </div>
                {results.length > 0 && (
                    <div className="mt-3 flex flex-col divide-y">
                        {results.map((p) => (
                            <button
                                key={p.id}
                                className="flex items-center gap-3 py-2 text-left hover:bg-gray-50 rounded px-2"
                                onClick={() => pick(p)}
                            >
                                {p.img && (
                                    <img
                                        src={p.img}
                                        alt=""
                                        className="h-10 w-10 object-contain"
                                    />
                                )}
                                <div className="flex-1">
                                    <div className="text-sm font-medium">
                                        {p.name}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {p.productCode} · stock {p.stock}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            {!selected && results.length === 0 && (
                <Card>
                    <EmptyState
                        title="Buscá un producto para ajustar su stock"
                        description="Escribí el nombre o SKU arriba, o importá el inventario en lote con un CSV."
                    />
                </Card>
            )}

            {selected && (
                <Card>
                    <h6 className="mb-3">{selected.name}</h6>
                    <Table>
                        <THead>
                            <Tr className="text-left text-gray-400 border-b">
                                <Th className="py-2">Sucursal</Th>
                                <Th>Reservado</Th>
                                <Th className="w-40">Stock</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {rows.map((r) => (
                                <Tr
                                    key={r.branchId}
                                    className="border-b last:border-0"
                                >
                                    <Td className="py-2">{r.branchName}</Td>
                                    <Td>{r.reserved}</Td>
                                    <Td>
                                        <Input
                                            type="number"
                                            defaultValue={r.stock}
                                            onBlur={(e) =>
                                                setStock(
                                                    r.branchId,
                                                    Number(e.target.value) || 0,
                                                )
                                            }
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                    <p className="text-xs text-gray-400 mt-2">
                        El stock total del producto se recalcula automáticamente.
                    </p>
                </Card>
            )}
        </div>
    )
}

export default Inventory
