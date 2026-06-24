import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'

export const notify = (msg: string, type: 'success' | 'danger' = 'success') =>
    toast.push(<Notification type={type}>{msg}</Notification>, {
        placement: 'top-center',
    })
