import { useState } from 'react'
import useSWR from 'swr'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import { FormItem } from '@/components/ui/Form'
import Tag from '@/components/ui/Tag'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Loading from '@/components/shared/Loading'

const { Tr, Th, Td, THead, TBody } = Table
import { HiOutlineTrash } from 'react-icons/hi'
import {
    apiGetUsers,
    apiCreateUser,
    apiUpdateUser,
    apiDeleteUser,
    ROLES,
    type AdminUser,
} from '@/services/UserService'

const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r
const roleColor: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-600',
    editor: 'bg-indigo-100 text-indigo-600',
    viewer: 'bg-gray-100 text-gray-600',
    customer: 'bg-emerald-100 text-emerald-600',
}

const err = (e: unknown) =>
    toast.push(
        <Notification type="danger">
            {((e as { response?: { data?: { message?: string } } })?.response?.data?.message) ||
                (e as Error)?.message ||
                'Error'}
        </Notification>,
        { placement: 'top-center' },
    )

const Users = () => {
    const { data, isLoading, mutate } = useSWR('/users', apiGetUsers, { revalidateOnFocus: false })
    const users = data?.data ?? []

    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<AdminUser['role']>('editor')
    const [creating, setCreating] = useState(false)

    const create = async () => {
        if (!email.trim() || password.length < 6) {
            toast.push(<Notification type="warning">Email y contraseña (mín. 6) requeridos</Notification>, { placement: 'top-center' })
            return
        }
        setCreating(true)
        try {
            await apiCreateUser({ email: email.trim(), password, name: name.trim() || undefined, role })
            setEmail(''); setName(''); setPassword(''); setRole('editor')
            await mutate()
            toast.push(<Notification type="success">Usuario creado</Notification>, { placement: 'top-center' })
        } catch (e) {
            err(e)
        } finally {
            setCreating(false)
        }
    }

    const changeRole = async (u: AdminUser, r: AdminUser['role']) => {
        try {
            await apiUpdateUser(u.id, { role: r })
            await mutate()
        } catch (e) {
            err(e)
        }
    }
    const toggleActive = async (u: AdminUser) => {
        try {
            await apiUpdateUser(u.id, { active: !u.active })
            await mutate()
        } catch (e) {
            err(e)
        }
    }
    const remove = async (u: AdminUser) => {
        try {
            await apiDeleteUser(u.id)
            await mutate()
            toast.push(<Notification type="success">Usuario eliminado</Notification>, { placement: 'top-center' })
        } catch (e) {
            err(e)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="mb-1">Usuarios y roles</h3>
                <p className="text-gray-500">Gestioná quién accede al panel y con qué rol.</p>
            </div>

            <Card>
                <h6 className="mb-3">Nuevo usuario</h6>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-3">
                        <FormItem label="Email">
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
                        </FormItem>
                    </div>
                    <div className="md:col-span-3">
                        <FormItem label="Nombre">
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
                        </FormItem>
                    </div>
                    <div className="md:col-span-2">
                        <FormItem label="Contraseña">
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 6" />
                        </FormItem>
                    </div>
                    <div className="md:col-span-2">
                        <FormItem label="Rol">
                            <Select
                                options={ROLES}
                                value={ROLES.find((r) => r.value === role)}
                                onChange={(opt) => opt && setRole(opt.value)}
                            />
                        </FormItem>
                    </div>
                    <div className="md:col-span-2">
                        <Button block variant="solid" loading={creating} onClick={create}>
                            Crear
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <h6 className="mb-3">Usuarios ({users.length})</h6>
                <Loading loading={isLoading}>
                    <Table>
                        <THead>
                            <Tr className="text-left text-gray-400 border-b">
                                <Th className="py-2">Usuario</Th>
                                <Th>Rol</Th>
                                <Th>Activo</Th>
                                <Th>Último acceso</Th>
                                <Th className="text-right">Acciones</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {users.map((u) => (
                                <Tr key={u.id} className="border-b last:border-0">
                                    <Td className="py-2">
                                        <div className="font-medium">{u.name || '—'}</div>
                                        <div className="text-xs text-gray-400">{u.email}</div>
                                    </Td>
                                    <Td className="w-40">
                                        <Select
                                            size="md"
                                            options={ROLES}
                                            value={ROLES.find((r) => r.value === u.role)}
                                            onChange={(opt) => opt && changeRole(u, opt.value)}
                                        />
                                    </Td>
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <Switcher checked={u.active} onChange={() => toggleActive(u)} />
                                            <Tag className={u.active ? roleColor.customer : 'bg-gray-100 text-gray-500'}>
                                                {u.active ? 'Activo' : 'Inactivo'}
                                            </Tag>
                                        </div>
                                    </Td>
                                    <Td className="text-gray-500">
                                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-PY') : '—'}
                                    </Td>
                                    <Td className="text-right">
                                        <Button size="md" variant="plain" icon={<HiOutlineTrash />} onClick={() => remove(u)} />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </Loading>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    {ROLES.map((r) => (
                        <span key={r.value} className={`rounded px-2 py-0.5 ${roleColor[r.value]}`}>
                            {roleLabel(r.value)}
                        </span>
                    ))}
                </div>
            </Card>
        </div>
    )
}

export default Users
