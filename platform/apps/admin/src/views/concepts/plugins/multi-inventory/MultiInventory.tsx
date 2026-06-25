import { lazy, Suspense } from 'react'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import PluginMenu from './components/PluginMenu'
import PluginMobileMenu from './components/PluginMobileMenu'
import useResponsive from '@/utils/hooks/useResponsive'
import { usePluginStore } from './store/pluginStore'

const General = lazy(() => import('./views/General'))
const Carrito = lazy(() => import('./views/Carrito'))
const StockView = lazy(() => import('./views/StockView'))
const ClickCollect = lazy(() => import('./views/ClickCollect'))
const Producto = lazy(() => import('./views/Producto'))
const PopupView = lazy(() => import('./views/PopupView'))
const OrderFlow = lazy(() => import('./views/OrderFlow'))
const Radio = lazy(() => import('./views/Radio'))
const DeliveryCosts = lazy(() => import('./views/DeliveryCosts'))
const Texts = lazy(() => import('./views/Texts'))
const Users = lazy(() => import('./views/Users'))
const LogView = lazy(() => import('./views/LogView'))

const MultiInventory = () => {
    const { currentView } = usePluginStore()
    const { smaller, larger } = useResponsive()

    return (
        <AdaptiveCard className="h-full">
            <div className="flex flex-auto h-full">
                {larger.lg && (
                    <div className="w-[200px] xl:w-[280px]">
                        <PluginMenu />
                    </div>
                )}
                <div className="xl:ltr:pl-6 xl:rtl:pr-6 flex-1 py-2">
                    {smaller.lg && (
                        <div className="mb-6">
                            <PluginMobileMenu />
                        </div>
                    )}
                    <Suspense fallback={<></>}>
                        {currentView === 'general' && <General />}
                        {currentView === 'carrito' && <Carrito />}
                        {currentView === 'stock' && <StockView />}
                        {currentView === 'click-collect' && <ClickCollect />}
                        {currentView === 'producto' && <Producto />}
                        {currentView === 'popup' && <PopupView />}
                        {currentView === 'order-flow' && <OrderFlow />}
                        {currentView === 'radio' && <Radio />}
                        {currentView === 'delivery-costs' && <DeliveryCosts />}
                        {currentView === 'texts' && <Texts />}
                        {currentView === 'users' && <Users />}
                        {currentView === 'log' && <LogView />}
                    </Suspense>
                </div>
            </div>
        </AdaptiveCard>
    )
}

export default MultiInventory
