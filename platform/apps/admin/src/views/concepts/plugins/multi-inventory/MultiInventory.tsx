import { useState } from 'react'
import PluginConfig from '../PluginConfig'
import Tabs from '@/components/ui/Tabs'
const { TabNav, TabList, TabContent } = Tabs

const MultiInventory = () => {
    const [tab, setTab] = useState('config')
    return (
        <div>
            <Tabs defaultValue="config" onChange={(v) => setTab(v as string)}>
                <TabList>
                    <TabNav value="config">Configuración</TabNav>
                    <TabNav value="branches">Sucursales</TabNav>
                    <TabNav value="stock">Stock</TabNav>
                </TabList>
                <div className="mt-4">
                    <TabContent value="config">
                        <PluginConfig pluginKey="multi_inventory" embedded />
                    </TabContent>
                    <TabContent value="branches">
                        <p className="text-sm text-gray-500 mb-4">Gestioná las sucursales del plugin Multi-sucursal / Inventario.</p>
                        <a href="/concepts/branches" className="text-sm text-blue-600 hover:underline">Abrir gestor de sucursales →</a>
                    </TabContent>
                    <TabContent value="stock">
                        <p className="text-sm text-gray-500 mb-4">Gestioná el stock por sucursal.</p>
                        <a href="/concepts/inventory" className="text-sm text-blue-600 hover:underline">Abrir gestor de inventario →</a>
                    </TabContent>
                </div>
            </Tabs>
        </div>
    )
}

export default MultiInventory
