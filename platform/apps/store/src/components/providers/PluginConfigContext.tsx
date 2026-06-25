"use client"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type PluginConfig = Record<string, unknown>

const PluginConfigContext = createContext<PluginConfig>({})

export function usePluginConfig() {
  return useContext(PluginConfigContext)
}

export function PluginConfigProvider({ children, initialConfig = {} }: { children: ReactNode; initialConfig?: PluginConfig }) {
  const [config, setConfig] = useState<PluginConfig>(initialConfig)

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || ''
    const TENANT = process.env.NEXT_PUBLIC_STORE_TENANT || 'default'
    fetch(`${API}/plugins/multi_inventory`, { headers: { 'x-tenant': TENANT } })
      .then(r => r.json())
      .then(d => setConfig(d?.values || {}))
      .catch(() => {})
  }, [])

  return (
    <PluginConfigContext.Provider value={config}>
      {children}
    </PluginConfigContext.Provider>
  )
}
