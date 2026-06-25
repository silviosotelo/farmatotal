import { useState } from 'react'
import PluginConfig from '../PluginConfig'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { cn } from '@/lib/utils'

const TABS = [
    { key: 'config', label: 'Configuración del plugin' },
    { key: 'branches', label: 'Sucursales', href: '/concepts/branches' },
    { key: 'stock', label: 'Stock por sucursal', href: '/concepts/inventory' },
]

const MultiInventory = () => {
    const [active, setActive] = useState('config')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Multi-sucursal / Inventario</h3>
                <p className="text-gray-500">
                    Configurá las sucursales, stock por ubicación, costos de envío, click & collect, y más.
                </p>
            </div>

            <Card>
                <div className="flex flex-col lg:flex-row gap-0">
                    {/* Sidebar tabs */}
                    <div className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100">
                        <nav className="flex lg:flex-col overflow-x-auto">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => {
                                        if (t.href) {
                                            window.location.href = t.href
                                        } else {
                                            setActive(t.key)
                                        }
                                    }}
                                    className={cn(
                                        'px-5 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2 lg:border-b-0 lg:border-l-2 text-left',
                                        active === t.key
                                            ? 'border-primary text-primary bg-primary/5'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                        {active === 'config' && <PluginConfig pluginKey="multi_inventory" embedded layout="vertical" />}
                        {active === 'branches' && (
                            <div>
                                <p className="text-sm text-gray-500 mb-4">Gestioná las sucursales del plugin.</p>
                            </div>
                        )}
                        {active === 'stock' && (
                            <div>
                                <p className="text-sm text-gray-500 mb-4">Gestioná el stock por sucursal.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default MultiInventory
