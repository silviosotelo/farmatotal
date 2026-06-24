import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Tabs from '@/components/ui/Tabs'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import { FormItem } from '@/components/ui/Form'
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
const { Tr, Th, Td, THead, TBody } = Table

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
                        <Input
                            textArea
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
                    <Table>
                        <THead>
                            <Tr className="text-left text-gray-400 border-b">
                                <Th className="py-2">Clave</Th><Th>Nombre</Th><Th>Asunto</Th><Th>Estado</Th><Th></Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {templates.map((t) => (
                                <Tr key={t.id} className="border-b last:border-0">
                                    <Td className="py-2 font-mono text-xs">{t.key}</Td>
                                    <Td>{t.name}</Td>
                                    <Td className="text-gray-500">{t.subject}</Td>
                                    <Td><Tag className={t.active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}>{t.active ? 'Activa' : 'Inactiva'}</Tag></Td>
                                    <Td className="text-right"><Button size="xs" variant="plain" onClick={() => remove(t.id)}>Borrar</Button></Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
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
                <Table>
                    <THead>
                        <Tr className="text-left text-gray-400 border-b">
                            <Th className="py-2">Para</Th><Th>Asunto</Th><Th>Estado</Th><Th>Intentos</Th><Th></Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {items.map((q) => (
                            <Tr key={q.id} className="border-b last:border-0">
                                <Td className="py-2">{q.toEmail}</Td>
                                <Td className="text-gray-500">{q.subject}</Td>
                                <Td><Tag className={statusTint[q.status]}>{q.status}</Tag></Td>
                                <Td>{q.attempts}</Td>
                                <Td className="text-right">{q.status === 'failed' && <Button size="xs" onClick={() => retry(q.id)}>Reintentar</Button>}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
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
                <Table>
                    <THead>
                        <Tr className="text-left text-gray-400 border-b">
                            <Th className="py-2">Fecha</Th><Th>Para</Th><Th>Asunto</Th><Th>Estado</Th><Th>Proveedor</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {items.map((l) => (
                            <Tr key={l.id} className="border-b last:border-0">
                                <Td className="py-2 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleString('es-PY')}</Td>
                                <Td>{l.toEmail}</Td>
                                <Td className="text-gray-500">{l.subject}</Td>
                                <Td><Tag className={statusTint[l.status] ?? 'bg-gray-100 text-gray-500'}>{l.status}</Tag></Td>
                                <Td>{l.provider}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
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
                <FormItem label="Proveedor">
                    <Select options={providerOptions} value={providerOptions.find((o) => o.value === cfg.provider)} onChange={(o) => setCfg({ ...cfg, provider: (o?.value as MailerConfig['provider']) ?? 'log' })} />
                </FormItem>
                <div />
                <FormItem label="Nombre remitente"><Input value={cfg.fromName} onChange={(e) => setCfg({ ...cfg, fromName: e.target.value })} /></FormItem>
                <FormItem label="Email remitente"><Input value={cfg.fromEmail} onChange={(e) => setCfg({ ...cfg, fromEmail: e.target.value })} /></FormItem>
                {cfg.provider === 'sendgrid' && (
                    <div className="md:col-span-2"><FormItem label="SendGrid API Key"><Input type="password" value={cfg.sendgridApiKey ?? ''} onChange={(e) => setCfg({ ...cfg, sendgridApiKey: e.target.value })} /></FormItem></div>
                )}
                {cfg.provider === 'smtp' && (
                    <>
                        <FormItem label="SMTP Host"><Input value={cfg.smtp?.host ?? ''} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, host: e.target.value } })} /></FormItem>
                        <FormItem label="SMTP Port"><Input type="number" value={cfg.smtp?.port ?? 587} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, port: Number(e.target.value) } })} /></FormItem>
                        <FormItem label="Usuario"><Input value={cfg.smtp?.user ?? ''} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, user: e.target.value } })} /></FormItem>
                        <FormItem label="Password"><Input type="password" value={cfg.smtp?.pass ?? ''} onChange={(e) => setCfg({ ...cfg, smtp: { ...cfg.smtp, pass: e.target.value } })} /></FormItem>
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
