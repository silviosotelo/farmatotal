'use client'
import { Button, Badge, Input, Alert } from '@platform/ui'

export default function EcmeTestPage() {
    return (
        <div className="ft-container py-10 flex flex-col gap-8">
            <h1 className="text-2xl font-bold">Test de componentes Ecme en el store</h1>

            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Button</h2>
                <div className="flex flex-wrap gap-3">
                    <Button variant="solid">Solid (primario)</Button>
                    <Button variant="default">Default</Button>
                    <Button variant="plain">Plain</Button>
                    <Button variant="solid" loading>Cargando...</Button>
                    <Button variant="solid" disabled>Deshabilitado</Button>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Badge</h2>
                <div className="flex flex-wrap gap-3">
                    <Badge>Default</Badge>
                    <Badge innerClass="bg-primary text-white">Primario</Badge>
                    <Badge innerClass="bg-success text-white">Éxito</Badge>
                    <Badge innerClass="bg-error text-white">Error</Badge>
                    <Badge innerClass="bg-warning text-white">Warning</Badge>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Input</h2>
                <div className="flex flex-wrap gap-3 max-w-sm">
                    <Input placeholder="Input normal" />
                    <Input placeholder="Input deshabilitado" disabled />
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Alert</h2>
                <Alert type="success" showIcon>Operación exitosa</Alert>
                <Alert type="danger" showIcon>Error en la operación</Alert>
                <Alert type="warning" showIcon>Atención requerida</Alert>
                <Alert type="info" showIcon>Información</Alert>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tokens de color</h2>
                <div className="flex flex-wrap gap-2 text-xs">
                    {[
                        ['bg-primary text-white', 'primary'],
                        ['bg-primary-deep text-white', 'primary-deep'],
                        ['bg-primary-mild text-white', 'primary-mild'],
                        ['bg-primary-subtle text-primary', 'primary-subtle'],
                        ['bg-error text-white', 'error'],
                        ['bg-success text-white', 'success'],
                        ['bg-warning text-white', 'warning'],
                        ['bg-info text-white', 'info'],
                    ].map(([cls, label]) => (
                        <span key={label} className={`px-2 py-1 rounded ${cls}`}>{label}</span>
                    ))}
                </div>
            </section>
        </div>
    )
}
