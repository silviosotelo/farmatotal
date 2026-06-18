import { useRef, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Tag from '@/components/ui/Tag'
import Loading from '@/components/shared/Loading'
import {
    apiGetMedia,
    apiUploadMedia,
    apiRegisterMedia,
    apiDeleteMedia,
    type MediaItem,
} from '@/services/MediaService'
import useSWR from 'swr'

const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = reject
        r.readAsDataURL(file)
    })

const Media = () => {
    const { data, isLoading, mutate } = useSWR(['/media'], () => apiGetMedia({ perPage: 60 }), {
        revalidateOnFocus: false,
    })
    const items = (data?.data ?? []) as MediaItem[]

    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [extUrl, setExtUrl] = useState('')
    const [copied, setCopied] = useState<string | null>(null)

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? [])
        if (!files.length) return
        setUploading(true)
        try {
            for (const f of files) {
                const dataBase64 = await fileToBase64(f)
                await apiUploadMedia({ filename: f.name, mime: f.type, dataBase64 })
            }
            await mutate()
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const register = async () => {
        if (!extUrl.trim()) return
        setUploading(true)
        try {
            await apiRegisterMedia({ url: extUrl.trim() })
            setExtUrl('')
            await mutate()
        } finally {
            setUploading(false)
        }
    }

    const remove = async (id: string) => {
        await apiDeleteMedia(id)
        await mutate()
    }

    const copy = (url: string) => {
        navigator.clipboard?.writeText(url)
        setCopied(url)
        setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500)
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Biblioteca de medios</h3>
                <p className="text-gray-500">
                    {items.length} archivos · usá las URLs en logo, banners, slides y productos.
                </p>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div>
                        <h6 className="mb-2">Subir archivo</h6>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
                            multiple
                            onChange={onPick}
                            className="text-sm"
                        />
                    </div>
                    <div className="flex-1 md:border-l md:pl-4">
                        <h6 className="mb-2">…o registrar una URL externa</h6>
                        <div className="flex gap-2">
                            <Input
                                value={extUrl}
                                onChange={(e) => setExtUrl(e.target.value)}
                                placeholder="https://cdn.ejemplo.com/img.png"
                            />
                            <Button variant="solid" loading={uploading} onClick={register}>
                                Registrar
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <Loading loading={isLoading}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                    {items.map((m) => (
                        <Card key={m.id} bodyClass="p-2">
                            <div className="aspect-square w-full overflow-hidden rounded bg-gray-50 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={m.url}
                                    alt={m.alt ?? m.filename}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-1">
                                <span className="truncate text-xs" title={m.filename}>
                                    {m.filename}
                                </span>
                                <Tag
                                    className={
                                        m.kind === 'upload'
                                            ? 'bg-sky-100 text-sky-600'
                                            : 'bg-amber-100 text-amber-600'
                                    }
                                >
                                    {m.kind === 'upload' ? 'Subida' : 'URL'}
                                </Tag>
                            </div>
                            <div className="mt-2 flex gap-1">
                                <Button size="xs" block onClick={() => copy(m.url)}>
                                    {copied === m.url ? 'Copiado' : 'Copiar URL'}
                                </Button>
                                <Button size="xs" variant="plain" onClick={() => remove(m.id)}>
                                    ✕
                                </Button>
                            </div>
                        </Card>
                    ))}
                    {items.length === 0 && (
                        <p className="col-span-full py-6 text-center text-gray-400">
                            Sin archivos todavía.
                        </p>
                    )}
                </div>
            </Loading>
        </div>
    )
}

export default Media
