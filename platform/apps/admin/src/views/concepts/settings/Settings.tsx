import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Tabs from '@/components/ui/Tabs'
import { apiGetSetting, apiSetSetting } from '@/services/CmsService'

const { TabNav, TabList, TabContent } = Tabs

type StoreCfg = {
    name: string
    email: string
    phone: string
    address: string
    currency: string
    locale: string
}
type ShippingCfg = { deliveryFee: number; freeFrom: number; pickup: boolean }
type PaymentsCfg = {
    bancard: boolean
    bancardEnv: string
    cash: boolean
    transfer: boolean
    bankDetails: string
}
type EmailsCfg = { fromName: string; fromEmail: string; orderConfirm: boolean }

function SettingsSection<T>({
    settingKey,
    initial,
    render,
}: {
    settingKey: string
    initial: T
    render: (v: T, set: (v: T) => void) => React.ReactNode
}) {
    const [value, setValue] = useState<T>(initial)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        apiGetSetting<T>(settingKey)
            .then((r) => {
                if (r?.value) setValue({ ...initial, ...(r.value as object) } as T)
            })
            .catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const save = async () => {
        setSaving(true)
        try {
            await apiSetSetting(settingKey, value)
            toast.push(<Notification type="success">Guardado</Notification>, {
                placement: 'top-center',
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <div className="flex flex-col gap-3 max-w-xl">{render(value, setValue)}</div>
            <div className="mt-5">
                <Button variant="solid" loading={saving} onClick={save}>
                    Guardar cambios
                </Button>
            </div>
        </Card>
    )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-gray-600">{label}</label>
        <div className="w-72">{children}</div>
    </div>
)

const Settings = () => {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Ajustes</h3>
                <p className="text-gray-500">
                    Datos del negocio, pagos y envíos. Los impuestos se configuran en su propio módulo.
                </p>
            </div>

            <Tabs defaultValue="general">
                <TabList>
                    <TabNav value="general">General</TabNav>
                    <TabNav value="payments">Pagos</TabNav>
                    <TabNav value="shipping">Envíos</TabNav>
                    <TabNav value="emails">Correos</TabNav>
                </TabList>

                <div className="mt-6">
                    <TabContent value="general">
                        <SettingsSection<StoreCfg>
                            settingKey="store"
                            initial={{ name: '', email: '', phone: '', address: '', currency: 'PYG', locale: 'es-PY' }}
                            render={(v, set) => (
                                <>
                                    <Field label="Nombre del negocio">
                                        <Input value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} />
                                    </Field>
                                    <Field label="Email de contacto">
                                        <Input value={v.email} onChange={(e) => set({ ...v, email: e.target.value })} />
                                    </Field>
                                    <Field label="Teléfono">
                                        <Input value={v.phone} onChange={(e) => set({ ...v, phone: e.target.value })} />
                                    </Field>
                                    <Field label="Dirección">
                                        <Input value={v.address} onChange={(e) => set({ ...v, address: e.target.value })} />
                                    </Field>
                                    <Field label="Moneda (ISO 4217)">
                                        <Input value={v.currency} onChange={(e) => set({ ...v, currency: e.target.value })} />
                                    </Field>
                                    <Field label="Locale">
                                        <Input value={v.locale} onChange={(e) => set({ ...v, locale: e.target.value })} />
                                    </Field>
                                </>
                            )}
                        />
                    </TabContent>

                    <TabContent value="payments">
                        <SettingsSection<PaymentsCfg>
                            settingKey="payments"
                            initial={{ bancard: true, bancardEnv: 'staging', cash: true, transfer: true, bankDetails: '' }}
                            render={(v, set) => (
                                <>
                                    <Field label="Bancard (tarjeta)">
                                        <Switcher checked={v.bancard} onChange={(c) => set({ ...v, bancard: c })} />
                                    </Field>
                                    <Field label="Entorno Bancard">
                                        <Input value={v.bancardEnv} onChange={(e) => set({ ...v, bancardEnv: e.target.value })} placeholder="staging | production" />
                                    </Field>
                                    <Field label="Efectivo (contra entrega)">
                                        <Switcher checked={v.cash} onChange={(c) => set({ ...v, cash: c })} />
                                    </Field>
                                    <Field label="Transferencia bancaria">
                                        <Switcher checked={v.transfer} onChange={(c) => set({ ...v, transfer: c })} />
                                    </Field>
                                    <Field label="Datos bancarios (transferencia)">
                                        <Input value={v.bankDetails} onChange={(e) => set({ ...v, bankDetails: e.target.value })} placeholder="Banco / cuenta / titular" />
                                    </Field>
                                </>
                            )}
                        />
                    </TabContent>

                    <TabContent value="shipping">
                        <SettingsSection<ShippingCfg>
                            settingKey="shipping"
                            initial={{ deliveryFee: 12000, freeFrom: 0, pickup: true }}
                            render={(v, set) => (
                                <>
                                    <Field label="Costo de delivery (₲)">
                                        <Input type="number" value={v.deliveryFee} onChange={(e) => set({ ...v, deliveryFee: Number(e.target.value) })} />
                                    </Field>
                                    <Field label="Envío gratis desde (₲, 0 = nunca)">
                                        <Input type="number" value={v.freeFrom} onChange={(e) => set({ ...v, freeFrom: Number(e.target.value) })} />
                                    </Field>
                                    <Field label="Retiro en sucursal (gratis)">
                                        <Switcher checked={v.pickup} onChange={(c) => set({ ...v, pickup: c })} />
                                    </Field>
                                </>
                            )}
                        />
                    </TabContent>

                    <TabContent value="emails">
                        <SettingsSection<EmailsCfg>
                            settingKey="emails"
                            initial={{ fromName: '', fromEmail: '', orderConfirm: true }}
                            render={(v, set) => (
                                <>
                                    <Field label="Nombre remitente">
                                        <Input value={v.fromName} onChange={(e) => set({ ...v, fromName: e.target.value })} />
                                    </Field>
                                    <Field label="Email remitente">
                                        <Input value={v.fromEmail} onChange={(e) => set({ ...v, fromEmail: e.target.value })} />
                                    </Field>
                                    <Field label="Enviar confirmación de pedido">
                                        <Switcher checked={v.orderConfirm} onChange={(c) => set({ ...v, orderConfirm: c })} />
                                    </Field>
                                </>
                            )}
                        />
                    </TabContent>
                </div>
            </Tabs>
        </div>
    )
}

export default Settings
