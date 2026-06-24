import { useState } from 'react'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Table from '@/components/ui/Table'
import { FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'
import { apiGetPages, apiCreatePage, apiUpdatePage, apiDeletePage, type Page } from '@/services/CmsService'

const { Tr, Th, Td, THead, TBody } = Table
import useSWR from 'swr'
import { useNavigate } from 'react-router'

const Cms = () => {
    const navigate = useNavigate()
    const { data, isLoading, mutate } = useSWR(['/cms/pages'], () =>
        apiGetPages(),
    )
    const pages = (data?.data ?? []) as Page[]

    const [title, setTitle] = useState('')
    const [slug, setSlug] = useState('')
    const [saving, setSaving] = useState(false)

    const create = async () => {
        if (!title.trim() || !slug.trim()) return
        setSaving(true)
        try {
            await apiCreatePage({
                title: title.trim(),
                slug: slug.trim().toLowerCase(),
                blocks: [],
                published: false,
            })
            setTitle('')
            setSlug('')
            await mutate()
            toast.push(
                <Notification type="success">Página creada</Notification>,
                { placement: 'top-center' },
            )
        } finally {
            setSaving(false)
        }
    }

    const togglePublish = async (p: Page) => {
        await apiUpdatePage(p.id, { published: !p.published })
        await mutate()
    }

    const remove = async (p: Page) => {
        if (!window.confirm(`¿Eliminar la página "${p.title}"? Esta acción no se puede deshacer.`)) return
        await apiDeletePage(p.id)
        await mutate()
        toast.push(<Notification type="success">Página eliminada</Notification>, {
            placement: 'top-center',
        })
    }

    // Páginas de sistema del sitio: editables con el builder.
    const SYSTEM_PAGES = [
        { slug: 'home', title: 'Inicio (Home)' },
        { slug: 'contacto', title: 'Contacto' },
        { slug: 'sucursales', title: 'Sucursales' },
        { slug: 'sobre-nosotros', title: 'Sobre nosotros' },
        { slug: 'politica-de-privacidad', title: 'Política de privacidad' },
        { slug: 'preguntas-frecuentes', title: 'Preguntas frecuentes' },
        { slug: 'terminos-y-condiciones', title: 'Términos y condiciones' },
    ]

    // Zonas modulares (widget-areas estilo WordPress) — slugs zone-*
    const ZONES = [
        { slug: 'zone-footer-top', title: 'Zona: antes del Footer (global)' },
        { slug: 'zone-catalogo-top', title: 'Zona: arriba del Catálogo' },
        { slug: 'zone-home-top', title: 'Zona: arriba del Home' },
        { slug: 'zone-producto-top', title: 'Zona: arriba del Producto' },
    ]

    const editPageBySlug = async (slug: string, title: string) => {
        let page = pages.find((p) => p.slug === slug)
        if (!page) {
            page = await apiCreatePage({ title, slug, blocks: [], published: true })
            await mutate()
        }
        navigate(`/concepts/cms/builder/${page.id}`)
    }

    const editSystemPage = (sp: { slug: string; title: string }) =>
        editPageBySlug(sp.slug, sp.title)

    return (
        <Loading loading={isLoading}>
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="mb-1">CMS · Páginas</h3>
                    <p className="text-gray-500">
                        Todo el sitio es editable con el constructor visual.
                    </p>
                </div>

                <Card>
                    <h6 className="mb-1">Páginas del sitio</h6>
                    <p className="text-gray-500 text-sm mb-3">
                        Editá visualmente las páginas principales (se crean al
                        abrirlas si no existen).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {SYSTEM_PAGES.map((sp) => {
                            const exists = pages.find((p) => p.slug === sp.slug)
                            return (
                                <button
                                    key={sp.slug}
                                    onClick={() => editSystemPage(sp)}
                                    className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 hover:border-brand-orange hover:bg-orange-50 transition text-left"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {sp.title}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            /{sp.slug}
                                        </div>
                                    </div>
                                    <Tag
                                        className={
                                            exists
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-gray-100 text-gray-500'
                                        }
                                    >
                                        {exists ? 'Editar' : 'Crear'}
                                    </Tag>
                                </button>
                            )
                        })}
                    </div>
                </Card>

                <Card>
                    <h6 className="mb-1">Zonas modulares (widget areas)</h6>
                    <p className="text-gray-500 text-sm mb-3">
                        Bloques editables insertados en puntos fijos del sitio
                        (como los widgets de WordPress). Se muestran solo si tienen
                        contenido.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ZONES.map((z) => {
                            const exists = pages.find((p) => p.slug === z.slug)
                            return (
                                <button
                                    key={z.slug}
                                    onClick={() => editPageBySlug(z.slug, z.title)}
                                    className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 hover:border-brand-orange hover:bg-orange-50 transition text-left"
                                >
                                    <div>
                                        <div className="font-medium">{z.title}</div>
                                        <div className="text-xs text-gray-400">
                                            /{z.slug}
                                        </div>
                                    </div>
                                    <Tag
                                        className={
                                            exists
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-gray-100 text-gray-500'
                                        }
                                    >
                                        {exists ? 'Editar' : 'Crear'}
                                    </Tag>
                                </button>
                            )
                        })}
                    </div>
                </Card>

                <Card>
                    <h6 className="mb-3">Nueva página</h6>
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1">
                            <FormItem label="Título">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Quiénes somos"
                                />
                            </FormItem>
                        </div>
                        <div className="flex-1">
                            <FormItem label="Slug">
                                <Input
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="quienes-somos"
                                />
                            </FormItem>
                        </div>
                        <Button variant="solid" loading={saving} onClick={create}>
                            Crear
                        </Button>
                    </div>
                </Card>

                <Card>
                    <Table>
                        <THead>
                            <Tr className="text-left text-gray-400 border-b">
                                <Th className="py-2">Título</Th>
                                <Th>Slug</Th>
                                <Th>Bloques</Th>
                                <Th>Estado</Th>
                                <Th></Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {pages.map((p) => (
                                <Tr key={p.id} className="border-b last:border-0">
                                    <Td className="py-2 font-medium">
                                        {p.title}
                                    </Td>
                                    <Td className="text-gray-500">/{p.slug}</Td>
                                    <Td>{p.blocks?.length ?? 0}</Td>
                                    <Td>
                                        <Tag
                                            className={
                                                p.published
                                                    ? 'bg-emerald-100 text-emerald-600'
                                                    : 'bg-amber-100 text-amber-600'
                                            }
                                        >
                                            {p.published
                                                ? 'Publicada'
                                                : 'Borrador'}
                                        </Tag>
                                    </Td>
                                    <Td className="text-right whitespace-nowrap">
                                        <Button
                                            size="xs"
                                            variant="solid"
                                            className="mr-2"
                                            onClick={() =>
                                                navigate(
                                                    `/concepts/cms/builder/${p.id}`,
                                                )
                                            }
                                        >
                                            Editar (visual)
                                        </Button>
                                        <Button
                                            size="xs"
                                            className="mr-2"
                                            onClick={() => togglePublish(p)}
                                        >
                                            {p.published
                                                ? 'Despublicar'
                                                : 'Publicar'}
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            className="text-red-500"
                                            onClick={() => remove(p)}
                                        >
                                            Eliminar
                                        </Button>
                                    </Td>
                                </Tr>
                            ))}
                            {pages.length === 0 && (
                                <Tr>
                                    <Td
                                        colSpan={5}
                                        className="py-6 text-center text-gray-400"
                                    >
                                        Sin páginas todavía.
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </Table>
                </Card>
            </div>
        </Loading>
    )
}

export default Cms
