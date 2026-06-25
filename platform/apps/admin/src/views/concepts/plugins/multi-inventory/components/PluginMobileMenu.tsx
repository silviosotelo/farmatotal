import { useRef } from 'react'
import ToggleDrawer from '@/components/shared/ToggleDrawer'
import PluginMenu from './PluginMenu'
import type { ToggleDrawerRef } from '@/components/shared/ToggleDrawer'

const PluginMobileMenu = () => {
    const drawerRef = useRef<ToggleDrawerRef>(null)

    return (
        <div>
            <ToggleDrawer ref={drawerRef} title="Configuración">
                <PluginMenu
                    onChange={() => {
                        drawerRef.current?.handleCloseDrawer()
                    }}
                />
            </ToggleDrawer>
        </div>
    )
}

export default PluginMobileMenu
