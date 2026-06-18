import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import useSWR from 'swr'
import {
    apiGetTemplates,
    apiCreateTemplate,
    apiDeleteTemplate,
    apiGetQueue,
    apiRetryQueue,
    apiProcessQueue,
    apiGetMailLog,
    apiGetMailerConfig,
    apiSaveMailerConfig,
    apiSendTestEmail,
    type EmailTemplate,
    type QueueItem,
    type LogItem,
    type MailerConfig,
} from '@/services/MailerService'

const { TabNav, TabList, TabContent } = Tabs

const notify = (msg: string, type: 'success' | 'danger' = 'success') =>
    toast.push(<Notification type={type}>{msg}</Notification>, { placement: 'top-center' })

const statusTint: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-600',
    sending: 'bg-sky-100 text-sky-600',
    sent: 'bg-emerald-100 text-emerald-600',
    failed: 'bg-red-100 text-red-500',
}

/* ── Plantillas ── */
const TemplatesTab = () => {
    const { data, isLoading, mutate } = useSWR(['/mailer/templates'], () => apiGetTemplates(), { revalidateOnFocus: false })
    const templates = (data?.data ?? []) as EmailTemplate[]
    const [form, setForm] = useState({ key: '', name: '', subject: '', bodyHtml: '' })
    const [saving, setSaving] = useState(false)

    const create = async () => {
        if (!form.key || !form.name || !form.subject || !form.bodyHtml) return
        setSaving(true)
        try {
            await apiCreateTemplate(form)
            setForm({ key: '', name: '', subject: '', bodyHtml: '' })
            await mutate()
            notify('Plantilla creada')
        } finally {
            setSaving(false)
        }
    }
    const remove = async (id: string) => {
        await apiDeleteTemplate(id)
        await mutate()
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <h6 className="mb-3">Nueva plantilla</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder="Clave (ej. order_confirmation)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
                    <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <div className="md:col-span-2">
                        <Input placeholder="Asunto (acepta {{variables}})" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <textarea
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                            rows={4}
                            placeholder="Cuerpo HTML (acepta {{variables}})"
                            value={form.bodyHtml}
                            onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                        />
                    </div>
                </div>
                <div className="mt-3">
                    <Button variant="solid" loading={saving} onClick={create}>Crear plantilla</Button>
                </div>
            </Card>
            <Card>
                {isLoading ? (
                    <p className="text-gray-400">Cargando…</p>
                ) : templates.length === 0 ? (
                    <p className="py-6 text-center text-gray-400">Sin plantillas todavía.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b">
                                <th className="py-2">Clave</th><th>Nombre</th><th>Asunto</th><th>Estado</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((t) => (
                                <tr key={t.id} className="border-b last:border-0">
                                    <td className="py-2 font-mono text-xs">{t.key}</td>
                                    <td>{t.name}</td>
                                    <td className="text-gray-500">{t.subject}</td>
                                    <td><Tag className={t.active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}>{t.active ? 'Activa' : 'Inactiva'}</Tag></td>
                                    <td className="text-right"><Button size="xs" variant="plain" onClick={() => remove(t.id)}>Borrar</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    )
}

/* ── Cola ── */
const QueueTab = () => {
    const { data, isLoading, mutate } = useSWR(['/mailer/queue'], () => apiGetQueue(), { revalidateOnFocus: false })
    const items = (data?.data ?? []) as QueueItem[]
    const [busy, setBusy] = useState(false)
    const process = async () => {
        setBusy(true)
        try {
            const r = await apiProcessQueue()
            notify(`Procesados: ${r.sent} enviados, ${r.failed} fallidos`)
            await mutate()
        } finally {
            setBusy(false)
        }
    }
    const retry = async (id: string) => { await apiRetryQueue(id); await mutate() }
    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <h6 className="mb-0">Cola de envío</h6>
                <Button size="sm" variant="solid" loading={busy} onClick={process}>Procesar ahora</Button>
            </div>
            {isLoading ? <p className="text-gray-400">Cargando…</p> : items.length === 0 ? (
                <p className="py-6 text-center text-gray-400">Cola vacía.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Para</th><th>Asunto</th><th>Estado</th><th>Intentos</th><th></th></tr></thead>
                    <tbody>
                        {items.map((q) => (
                            <tr key={q.id} className="border-b last:border-0">
                                <td className="py-2">{q.toEmail}</td>
                                <td className="text-gray-500">{q.subject}</td>
                                <td><Tag className={statusTint[q.status]}>{q.status}</Tag></td>
                                <td>{q.attempts}</td>
                                <td className="text-right">{q.status === 'failed' && <Button size="xs" onClick={() => retry(q.id)}>Reintentar</Button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    )
}

/* ── Logs ── */
const LogsTab = () => {
    const { data, isLoading } = useSWR(['/mailer/log'], () => apiGetMailLog(), { revalidateOnFocus: false })
    const items = (data?.data ?? []) as LogItem[]
    return (
        <Card>
            {isLoading ? <p className="text-gray-400">Cargando…</p> : items.length === 0 ? (
                <p className="py-6 text-center text-gray-400">Sin envíos registrados.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-400 border-b"><th className="py-2">Fecha</th><th>Para</th><th>Asunto</th><th>Estado</th><th>Proveedor</th></tr></thead>
                    <tbody>
                        {items.map((l) => (
                            <tr key={l.id} className="border-b last:border-0">
                                <td className="py-2 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleString('es-PY')}</td>
                                <td>{l.toEmail}</td>
                                <td className="text-gray-500">{l.subject}</td>
                                <td><Tag className={statusTint[l.status] ?? 'bg-gray-100 text-gray-500'}>{l.status}</Tag></td>
                                <td>{l.provider}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    )
}

/* ── Config ── */
const ConfigTab = () => {
    const { data, mutate } = useSWR(['/mailer/config'], () => apiGetMailerConfig(), { revalidateOnFocus: false })
    const [cfg, setCfg] = useState<MailerConfig>({ provider: 'log', fromName: '', fromEmail: '' })
    const [test, setTest] = useState('')
    const [saving, setSaving] = useState(false)
    useEffect(() => { if (data) setCfg(data) }, [data])
    const providerOptions = [
        { value: 'log', label: 'Log (dev, no envía)' },
        { value: 'sendgrid', label: 'SendGrid' },
        { value: 'smtp', label: 'SMTP' },
    ]
    const save = async () => {
        setSaving(true)
        try { await apiSaveMailerConfig(cfg); await mutate(); notify('Configuración guardada') } finally { setSaving(false) }
    }
    const sendTest = async () => {
        if (!test) return
        await apiSendTestEmail(test)
        notify('Email de prueba encolado y procesado')
    }
    return (
        <Card>
            <h6 className="mb-3">Proveedor de envío</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                <div>
                    <label className="text-sm">Proveedor</label>
                    <Select options={providerOptions} value={providerOptions.find((o) => o.value === cfg.provider)} onChange={(o) => setCfg({ ...cfg, provider: (o?.value as MailerConfig['provider']) ?? 'log' })} />
                </div>
                <div />
                <div><label className="text-sm">Nombre remitente</label><Input value={cfg.fromName} onChange={(e) => setCfg({ ...cfg, fromName: e.target.value })} /></div>
                <div><label className="text-sm">Email remitente</label><Input value={cfg.fromEmail} onChange={(e) => setCfg({ ...cfg, fromEmail: e.target.value })} /></div>
                {cfg.provider === 'sendgrid' && (
                    <div className="md:col-span-2"><label className="text-sm">SendGrid API Key</label><Input type="password" value={cfg.sendgridApiKey ?? ''} onChange={(e) => setCfg({ ...cfg, sendgridApiKey: e.target.value })} /></div>
                )}
                {cfg.provider === 'smtp' && (
                    <>
                        <div><label className="text-sm">SMTP Host</label><Input value={cfg.smtp?.host ?? ''} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, host: e.target.value } })} /></div>
                        <div><label className="text-sm">SMTP Port</label><Input type="number" value={cfg.smtp?.port ?? 587} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, port: Number(e.target.value) } })} /></div>
                        <div><label className="text-sm">Usuario</label><Input value={cfg.smtp?.user ?? ''} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, user: e.target.value } })} /></div>
                        <div><label className="text-sm">Password</label><Input type="password" value={cfg.smtp?.pass ?? ''} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, pass: e.target.value } })} /></div>
                    </>
                )}
            </div>
            <div className="mt-4 flex items-center gap-3">
                <Button variant="solid" loading={saving} onClick={save}>Guardar configuración</Button>
            </div>
            <div className="mt-6 border-t pt-4">
                <h6 className="mb-2">Enviar email de prueba</h6>
                <div className="flex gap-2 max-w-md">
                    <Input placeholder="email@destino.com" value={test} onChange={(e) => setTest(e.target.value)} />
                    <Button onClick={sendTest}>Enviar prueba</Button>
                </div>
            </div>
        </Card>
    )
}

const Mailer = () => (
    <div className="flex flex-col gap-4">
        <div>
            <h3 className="mb-1">Correos</h3>
            <p className="text-gray-500">Plantillas, cola de envío, logs y proveedor (SMTP / SendGrid).</p>
        </div>
        <Tabs defaultValue="templates">
            <TabList>
                <TabNav value="templates">Plantillas</TabNav>
                <TabNav value="queue">Cola</TabNav>
                <TabNav value="logs">Logs</TabNav>
                <TabNav value="config">Configuración</TabNav>
            </TabList>
            <div className="mt-6">
                <TabContent value="templates"><TemplatesTab /></TabContent>
                <TabContent value="queue"><QueueTab /></TabContent>
                <TabContent value="logs"><LogsTab /></TabContent>
                <TabContent value="config"><ConfigTab /></TabContent>
            </div>
        </Tabs>
    </div>
)

export default Mailer
