import Menu from '@/components/ui/Menu'
import ScrollBar from '@/components/ui/ScrollBar'
import { usePluginStore } from '../store/pluginStore'
import {
    TbSettings,
    TbShoppingCart,
    TbPackage,
    TbBuildingStore,
    TbLayoutDashboard,
    TbMailOpened,
    TbRoute,
    TbTruckDelivery,
    TbCoin,
    TbMessage2,
    TbUsers,
    TbReportAnalytics,
    TbBuildingWarehouse,
    TbClipboardList,
} from 'react-icons/tb'
import type { ReactNode } from 'react'

const { MenuItem } = Menu

const menuList: { label: string; value: string; icon: ReactNode }[] = [
    { label: 'General', value: 'general', icon: <TbSettings /> },
    { label: 'Carrito', value: 'carrito', icon: <TbShoppingCart /> },
    { label: 'Stock', value: 'stock', icon: <TbPackage /> },
    { label: 'Click & Collect', value: 'click-collect', icon: <TbBuildingStore /> },
    { label: 'Página de producto', value: 'producto', icon: <TbLayoutDashboard /> },
    { label: 'Popup', value: 'popup', icon: <TbMailOpened /> },
    { label: 'Order Flow', value: 'order-flow', icon: <TbRoute /> },
    { label: 'Envío por radio', value: 'radio', icon: <TbTruckDelivery /> },
    { label: 'Costos de envío', value: 'delivery-costs', icon: <TbCoin /> },
    { label: 'Textos', value: 'texts', icon: <TbMessage2 /> },
    { label: 'Usuarios de inventario', value: 'users', icon: <TbUsers /> },
    { label: 'Log', value: 'log', icon: <TbReportAnalytics /> },
    { label: 'Sucursales', value: 'branches', icon: <TbBuildingWarehouse /> },
    { label: 'Stock por sucursal', value: 'inventory', icon: <TbClipboardList /> },
]

export const PluginMenu = ({ onChange }: { onChange?: () => void }) => {
    const { currentView, setCurrentView } = usePluginStore()

    const handleSelect = (value: string) => {
        setCurrentView(value as any)
        onChange?.()
    }

    return (
        <div className="flex flex-col justify-between h-full">
            <ScrollBar className="h-full overflow-y-auto">
                <Menu className="mx-2 mb-10">
                    {menuList.map((menu) => (
                        <MenuItem
                            key={menu.value}
                            eventKey={menu.value}
                            className={`mb-2 ${
                                currentView === menu.value
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : ''
                            }`}
                            isActive={currentView === menu.value}
                            onSelect={() => handleSelect(menu.value)}
                        >
                            <span className="text-2xl ltr:mr-2 rtl:ml-2">
                                {menu.icon}
                            </span>
                            <span>{menu.label}</span>
                        </MenuItem>
                    ))}
                </Menu>
            </ScrollBar>
        </div>
    )
}

export default PluginMenu
