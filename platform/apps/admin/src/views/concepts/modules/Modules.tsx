import { useState } from 'react'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import { apiGetModules, apiToggleModule, type PlatformModule, type ModuleCategory } from '@/services/ModuleService'
import useSWR from 'swr'
import { Link } from 'react-router'

const categoryMeta: Record<ModuleCategory, { label: string; tint: string }> = {
    core: { label: 'Core', tint: 'bg-gray-100 text-gray-600' },
    commerce: { label: 'Comercio', tint: 'bg-emerald-100 text-emerald-600' },
    content: { label: 'Contenido', tint: 'bg-sky-100 text-sky-600' },
    messaging: { label: 'Mensajería', tint: 'bg-green-100 text-green-600' },
    marketing: { label: 'Marketing', tint: 'bg-amber-100 text-amber-600' },
    payment: { label: 'Pagos', tint: 'bg-indigo-100 text-indigo-600' },
    logistics: { label: 'Logística', tint: 'bg-cyan-100 text-cyan-600' },
    infra: { label: 'Infra', tint: 'bg-violet-100 text-violet-600' },
    builder: { label: 'Builder', tint: 'bg-rose-100 text-rose-600' },
}

const ModuleCard = ({ m, onToggle, busy }: { m: PlatformModule; onToggle: (m: PlatformModule, v: boolean) => void; busy: boolean }) => (
    <Card className={m.enabled ? '' : 'opacity-60'}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h6 className="truncate">{m.name}</h6>
                    <Tag className={categoryMeta[m.category].tint}>{categoryMeta[m.category].label}</Tag>
                    {m.registersInto && <Tag className="bg-gray-100 text-gray-500">→ Pagos</Tag>}
                </div>
                <p className="mt-1 text-sm text-gray-500">{m.description}</p>
                {m.features && m.features.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {m.features.map((f) => (
                            <span key={f} className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-500 ring-1 ring-gray-100">{f}</span>
                        ))}
                    </div>
                )}
                <p className="mt-2 text-xs text-gray-400">v{m.version}</p>
            </div>
            {m.kind === 'native' ? (
                <Tag className="bg-gray-100 text-gray-500 shrink-0">Nativo</Tag>
            ) : (
                <Switcher checked={m.enabled} disabled={busy} onChange={(c) => onToggle(m, c)} />
            )}
        </div>
        {m.adminPath && (
            <div className="mt-4">
                <Link to={m.adminPath}>
                    <Button size="xs" block>{m.settingsKey ? 'Configurar' : 'Abrir'}</Button>
                </Link>
            </div>
        )}
    </Card>
)

const Modules = () => {
    const { data, isLoading, mutate } = useSWR(['/modules'], () => apiGetModules(), { revalidateOnFocus: false })
    const modules = (data?.data ?? []) as PlatformModule[]
    const [busy, setBusy] = useState<string | null>(null)

    const toggle = async (m: PlatformModule, enabled: boolean) => {
        if (m.kind === 'native') return
        setBusy(m.key)
        try {
            await apiToggleModule(m.key, enabled)
            await mutate()
        } finally {
            setBusy(null)
        }
    }

    const natives = modules.filter((m) => m.kind === 'native')
    const plugins = modules.filter((m) => m.kind === 'plugin')

    const Grid = ({ items }: { items: PlatformModule[] }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((m) => <ModuleCard key={m.key} m={m} onToggle={toggle} busy={busy === m.key} />)}
        </div>
    )

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-6">
                <div>
                    <h3 className="mb-1">Módulos y plugins</h3>
                    <p className="text-gray-500">
                        Los <strong>nativos</strong> son parte del core. Los <strong>plugins</strong> se
                        activan/desactivan por separado; las pasarelas se enchufan en <strong>Pagos</strong>.
                    </p>
                </div>
                <div>
                    <h5 className="mb-3">Nativos</h5>
                    <Grid items={natives} />
                </div>
                <div>
                    <h5 className="mb-3">Plugins</h5>
                    <Grid items={plugins} />
                </div>
            </div>
        </Loading>
    )
}

export default Modules
