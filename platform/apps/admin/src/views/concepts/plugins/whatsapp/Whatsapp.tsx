import { useState } from 'react'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { Link } from 'react-router'
import { TbArrowLeft } from 'react-icons/tb'
import useSWR from 'swr'
import PluginConfig from '../PluginConfig'
import {
    apiWaTemplates, apiWaCreateTemplate, apiWaDeleteTemplate,
    apiWaWorkflows, apiWaCreateWorkflow, apiWaDeleteWorkflow,
    apiWaLog, apiWaTest,
    type WaTemplate, type WaWorkflow, type WaLogItem,
} from '@/services/WhatsappService'

const { TabNav, TabList, TabContent } = Tabs
const notify = (m: string) => toast.push(<Notification type="success">{m}</Notification>, { placement: 'top-center' })

const TemplatesTab = () => {
    const { data, isLoading, mutate } = useSWR(['wa-tpl'], () => apiWaTemplates(), { revalidateOnFocus: false })
    const items = (data?.data ?? []) as WaTemplate[]
    const [f, setF] = useState({ name: '', category: '', content: '' })
    const create = async () => {
        if (!f.name || !f.content) return
        await apiWaCreateTemplate(f); setF({ name: '', category: '', content: '' }); await mutate(); notify('Plantilla creada')
    }
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <h6 className="mb-3">Nueva plantilla</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                    <Input placeholder="Categoría (utility/marketing)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
                    <div className="md:col-span-2">
                        <textarea className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} placeholder="Mensaje (acepta {{variables}})" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
                    </div>
                </div>
                <div className="mt-3"><Button variant="solid" onClick={create}>Crear</Button></div>
            </Card>
            <Card>
                {isLoading ? <p className="text-gray-400">Cargando…</p> : items.length === 0 ? <p className="py-6 text-center text-gray-400">Sin plantillas.</p> : (
                    <table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Nombre</th><th>Categoría</th><th>Mensaje</th><th></th></tr></thead>
                    <tbody>{items.map((t) => (
                        <tr key={t.id} className="border-b last:border-0"><td className="py-2 font-semibold">{t.name}</td><td>{t.category}</td><td className="text-gray-500 max-w-md truncate">{t.content}</td><td className="text-right"><Button size="xs" variant="plain" onClick={async () => { await apiWaDeleteTemplate(t.id); await mutate() }}>Borrar</Button></td></tr>
                    ))}</tbody></table>
                )}
            </Card>
        </div>
    )
}

const WorkflowsTab = () => {
    const { data, isLoading, mutate } = useSWR(['wa-wf'], () => apiWaWorkflows(), { revalidateOnFocus: false })
    const items = (data?.data ?? []) as WaWorkflow[]
    const [f, setF] = useState({ name: '', trigger: 'order_paid', templateName: '' })
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <h6 className="mb-3">Nuevo workflow (disparador → plantilla)</h6>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                    <Input placeholder="Disparador (order_paid, order_shipped…)" value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} />
                    <Input placeholder="Plantilla" value={f.templateName} onChange={(e) => setF({ ...f, templateName: e.target.value })} />
                </div>
                <div className="mt-3"><Button variant="solid" onClick={async () => { if (f.name) { await apiWaCreateWorkflow(f); setF({ name: '', trigger: 'order_paid', templateName: '' }); await mutate(); notify('Workflow creado') } }}>Crear</Button></div>
            </Card>
            <Card>
                {isLoading ? <p className="text-gray-400">Cargando…</p> : items.length === 0 ? <p className="py-6 text-center text-gray-400">Sin workflows.</p> : (
                    <table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Nombre</th><th>Disparador</th><th>Plantilla</th><th></th></tr></thead>
                    <tbody>{items.map((w) => (
                        <tr key={w.id} className="border-b last:border-0"><td className="py-2 font-semibold">{w.name}</td><td><Tag className="bg-sky-100 text-sky-600">{w.trigger}</Tag></td><td>{w.templateName}</td><td className="text-right"><Button size="xs" variant="plain" onClick={async () => { await apiWaDeleteWorkflow(w.id); await mutate() }}>Borrar</Button></td></tr>
                    ))}</tbody></table>
                )}
            </Card>
        </div>
    )
}

const LogsTab = () => {
    const { data, isLoading, mutate } = useSWR(['wa-log'], () => apiWaLog(), { revalidateOnFocus: false })
    const items = (data?.data ?? []) as WaLogItem[]
    const [phone, setPhone] = useState('')
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <h6 className="mb-2">Enviar prueba</h6>
                <div className="flex gap-2 max-w-md">
                    <Input placeholder="+595981..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Button onClick={async () => { if (phone) { await apiWaTest(phone); await mutate(); notify('Mensaje de prueba encolado') } }}>Enviar</Button>
                </div>
            </Card>
            <Card>
                {isLoading ? <p className="text-gray-400">Cargando…</p> : items.length === 0 ? <p className="py-6 text-center text-gray-400">Sin mensajes.</p> : (
                    <table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Fecha</th><th>Teléfono</th><th>Plantilla</th><th>Estado</th></tr></thead>
                    <tbody>{items.map((l) => (
                        <tr key={l.id} className="border-b last:border-0"><td className="py-2 text-xs text-gray-400">{new Date(l.createdAt).toLocaleString('es-PY')}</td><td>{l.toPhone}</td><td>{l.templateName}</td><td><Tag className="bg-gray-100 text-gray-600">{l.status}</Tag></td></tr>
                    ))}</tbody></table>
                )}
            </Card>
        </div>
    )
}

const Whatsapp = () => (
    <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
            <Link to="/concepts/modules" className="text-gray-400 hover:text-primary"><TbArrowLeft className="text-xl" /></Link>
            <h3 className="mb-0">WhatsApp</h3>
        </div>
        <Tabs defaultValue="config">
            <TabList>
                <TabNav value="config">Configuración</TabNav>
                <TabNav value="templates">Plantillas</TabNav>
                <TabNav value="workflows">Workflows</TabNav>
                <TabNav value="logs">Logs</TabNav>
            </TabList>
            <div className="mt-6">
                <TabContent value="config"><PluginConfig pluginKey="wh_whatsapp" embedded /></TabContent>
                <TabContent value="templates"><TemplatesTab /></TabContent>
                <TabContent value="workflows"><WorkflowsTab /></TabContent>
                <TabContent value="logs"><LogsTab /></TabContent>
            </div>
        </Tabs>
    </div>
)

export default Whatsapp
