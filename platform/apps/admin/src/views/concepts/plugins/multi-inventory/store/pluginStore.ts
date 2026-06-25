import { create } from 'zustand'

type View = 'general' | 'carrito' | 'stock' | 'click-collect' | 'producto' | 'popup' | 'order-flow' | 'radio' | 'delivery-costs' | 'texts' | 'users' | 'log' | 'branches' | 'inventory'

export const usePluginStore = create<{
    currentView: View
    setCurrentView: (v: View) => void
}>((set) => ({
    currentView: 'general',
    setCurrentView: (v) => set({ currentView: v }),
}))
